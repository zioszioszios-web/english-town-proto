import '../games/games.css';
import { element, action } from './dom';
import type { Level } from '../data/levels';
import { loadWords } from '../data/words/catalog';
import type { WordEntry } from '../data/words/types';
import type { MiniGame, GameResult } from '../games/types';
import type { ScoreRepository } from '../games/scores';
import { PracticeStore } from '../games/storage';
import { ScoreCounter, practicePool, MIN_PRACTICE_WORDS, selectQuestions } from '../games/rules';
import type { Speech } from './Speech';

export class MiniGameUI {
  private generation = 0;
  private game?: MiniGame;
  private finished = false;
  private readonly host = element('div', 'mini-game scroll-panel');
  constructor(private readonly shell: HTMLElement, private readonly store: PracticeStore, private readonly scores: ScoreRepository, private readonly speech: Speech, private readonly leave: () => void) {}
  async open(game: MiniGame, level: Level): Promise<void> {
    this.stop(); const generation = this.generation; this.game = game;
    this.shell.replaceChildren(this.host); this.host.replaceChildren(element('p', '', '正在準備單字……'));
    try {
      const words = await loadWords(level);
      if (generation !== this.generation) return;
      if (!words) { this.host.replaceChildren(element('p', '', '這個等級單字準備中。'), action('回到小鎮', this.leave)); return; }
      const lowerBanks: (readonly WordEntry[])[] = [];
      const eligible = (word: WordEntry): boolean => game.eligible?.(word) ?? true;
      let prepared = practicePool(words,game.topics,lowerBanks,eligible);
      for (let lower = level - 1; lower >= 1 && prepared.words.length < MIN_PRACTICE_WORDS; lower--) {
        const bank = await loadWords(lower as Level);
        if (generation !== this.generation) return;
        if (bank) lowerBanks.push(bank);
        prepared = practicePool(words,game.topics,lowerBanks,eligible);
      }
      const pool = prepared.words;
      if (pool.length < 20) { this.host.replaceChildren(element('p', '', '可用單字不足，正在準備中。'), action('回到小鎮', this.leave)); return; }
      const intro = element('div', 'game-intro');
      intro.append(element('h2', '', game.name), element('p', '', `Lv${level} · 可用單字 ${pool.length} 個`));
      if (prepared.supplementalCount) intro.append(element('p','muted',
        '本級 '+prepared.ownCount+' 字，補入較低等級同主題 '+prepared.supplementalCount+' 字；排行榜仍按 Lv'+level+' 計算。'));
      const label = element('label', '', '排行榜暱稱（最多 20 字）');
      const nickname = element('input', 'nickname-input'); nickname.type = 'text'; nickname.maxLength = 20; nickname.value = this.store.nickname;
      nickname.setAttribute('autocomplete', 'nickname'); nickname.id = 'game-nickname'; label.htmlFor = nickname.id;
      const warning = element('p', 'storage-warning');
      intro.append(label, nickname, warning, element('p', 'muted', '排行榜與練習紀錄只保存在這個瀏覽器。聲音可在設定關閉。'));
      if (!this.store.persistent) warning.textContent = '目前無法永久保存紀錄，本次仍可遊玩。';
      intro.append(action('開始遊戲', () => {
        if (!nickname.value.trim()) { warning.textContent = '請先輸入暱稱。'; nickname.focus(); return; }
        this.store.nickname = nickname.value;
        this.start(game, level, pool);
      }, 'ui-button primary'), action('回到小鎮', this.leave, 'ui-button quiet'));
      this.host.replaceChildren(intro);
      (this.store.nickname ? intro.querySelector('button') : nickname)?.focus({preventScroll:true});
    } catch {
      if (generation === this.generation) this.host.replaceChildren(element('p', '', '單字載入失敗，請檢查網路後再試。'), action('重試', () => { void this.open(game,level); }), action('回到小鎮',this.leave));
    }
  }
  private start(game: MiniGame, level: Level, pool: readonly WordEntry[]): void {
    this.finished = false;
    const generation = ++this.generation;
    const counter = new ScoreCounter(), mistakes = new Map<string, WordEntry>(), started = performance.now();
    const gameHost = element('section', 'game-stage');
    const score = element('p', 'live-score', '分數 0 · 連續答對 0');
    const toolbar = element('div','game-toolbar'); toolbar.append(score, action('離開遊戲', this.leave, 'ui-button quiet'));
    this.host.replaceChildren(toolbar, gameHost);
    const speak = (text: string): void => { if (this.store.sound) this.speech.speak(text); };
    // This real user click precedes all timer-driven speech, including iOS Safari.
    speak("Let's practice English!");
    game.start({
      host: gameHost, words: selectQuestions(pool, Math.min(20, pool.length), this.store.stats), level, speak,
      answer: (word, correct, timeBonus = 0) => {
        if (generation !== this.generation || this.finished) return;
        counter.answer(correct, timeBonus); this.store.record(word.id,correct);
        if (!correct) mistakes.set(word.id, word);
        score.textContent = `分數 ${counter.score} · 連續答對 ${counter.streak}`;
      },
      finish: (bonus = 0) => {
        if (generation !== this.generation || this.finished) return; this.finished = true; game.end(); this.speech.cancel();
        const result: GameResult = { score: counter.score + Math.max(0, Math.floor(bonus)), correct: counter.correct, wrong: counter.wrong, maxStreak: counter.maxStreak, mistakes: [...mistakes.values()], elapsedSeconds: (performance.now() - started) / 1000 };
        void this.results(game, level, pool, result, generation);
      },
    });
  }
  private async results(game: MiniGame, level: Level, pool: readonly WordEntry[], result: GameResult, generation: number): Promise<void> {
    const panel = element('div', 'game-results');
    panel.append(element('h2', '', '完成！'), element('p', 'result-score', `${result.score} 分`),
      element('p', '', `正確率 ${Math.round(result.correct / Math.max(1,result.correct + result.wrong) * 100)}% · 最高連續答對 ${result.maxStreak}`),
      element('p', 'muted', `答對 ${result.correct} 次 · 答錯 ${result.wrong} 次 · ${result.elapsedSeconds.toFixed(1)} 秒`));
    if (game.id === 'memory') panel.append(element('p','muted','配對成功記一次答對；配錯時兩張卡的單字各記一次答錯。'));
    panel.append(element('h3', '', '本次答錯的單字'));
    if (!result.mistakes.length) panel.append(element('p', '', '這次沒有答錯，做得很好！'));
    for (const word of result.mistakes) panel.append(action(`▶ ${word.word} · ${word.zh.join('、')}`, () => { if (this.store.sound) this.speech.speak(word.word); }, 'ui-button wrong-word'));
    const rank = element('p', '', '正在更新排行榜……'), board = element('ol', 'leaderboard');
    panel.append(element('h3','','Lv'+level+' 本機排行榜'),rank,board,
      action('再玩一次', () => this.start(game,level,pool), 'ui-button primary'),action('回到小鎮', this.leave, 'ui-button quiet'));
    this.host.replaceChildren(panel);
    panel.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    try {
      const saved = await this.scores.submit({ id: crypto.randomUUID(), gameId: game.id, level, nickname: this.store.nickname, score: result.score, playedAt: new Date().toISOString() });
      if (generation !== this.generation || !this.finished) return;
      rank.textContent = `本次第 ${saved.rank} 名${saved.rank > 10 ? '（未進前 10 名）' : ''}`;
      board.replaceChildren(...saved.entries.map(entry => element('li','',`${entry.nickname} · ${entry.score} 分`)));
      if (!this.store.persistent) panel.append(element('p','storage-warning','練習紀錄暫時無法永久保存。'));
    } catch { if (generation === this.generation) rank.textContent = '排行榜暫時無法更新，本局成績仍顯示在上方。'; }
  }
  stop(): void { this.generation++; this.game?.end(); this.game = undefined; this.speech.cancel(); this.finished = false; }
}

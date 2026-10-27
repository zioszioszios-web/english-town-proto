import { DIALOGUES, ALL_SCENARIOS } from '../data/dialogues';
import type { BranchReply, DialogueFile, DialogueNode, MistakeReply, Reply, Scenario, VariantReply } from '../data/dialogues/types';
import type { LocationName } from '../data/town';
import { LEVELS, LEVEL_INFO, type PlayMode } from '../data/levels';
import { gameEvents } from '../events';
import { DialogueEngine, type DialogueSummary } from './DialogueEngine';
import { TapReplyInput } from './TapReplyInput';
import { ProgressStore } from './ProgressStore';
import { Sfx } from '../games/sfx';
import { Speech } from './Speech';
import { TownControls } from './TownControls';
import { element, action } from './dom';
import './ui.css';
import { MiniGameUI } from './MiniGameUI';
import { PracticeStore } from '../games/storage';
import { LocalScoreRepository, type ScoreRepository } from '../games/scores';
import { GAME_FACTORIES, createGame } from '../games/registry';
import { wordsReady } from '../data/words/catalog';
import type { MiniGame } from '../games/types';
import { sourcesPanel } from './SourcesPanel';

export class AppUI {
  private readonly root = element('section', 'ui-overlay');
  private readonly shell = element('div', 'ui-shell');
  private readonly body = element('div', 'ui-body');
  private readonly heading = element('h1', 'ui-title');
  private readonly subtitle = element('p', 'ui-subtitle');
  private readonly speechStatus = element('p', 'speech-status');
  private readonly replyHost = element('div', 'reply-options');
  private readonly speech = new Speech();
  private readonly sfx = new Sfx();
  private readonly engine: DialogueEngine;
  private readonly controls: TownControls;
  private readonly practice = new PracticeStore();
  private readonly games: MiniGameUI;
  private readonly scores: ScoreRepository;
  private readonly unsubscribeGame: () => void;
  private history = element('div', 'dialogue-history');
  private counter = element('p');
  private location: LocationName = 'Cafe';
  private file: DialogueFile = DIALOGUES.Cafe;
  private scenario?: Scenario;
  private inside = false;
  private showTranslation = true;
  private firstSentence = true;
  private count = 0;
  private readonly unsubscribe: () => void;

  constructor(private readonly progress: ProgressStore, scores: ScoreRepository = new LocalScoreRepository()) {
    this.scores = scores;
    this.sfx.setVolume(this.practice.volume); this.speech.setVolume(this.practice.volume);
    this.games = new MiniGameUI(this.body, this.practice, scores, this.speech, this.sfx, () => this.leave());
    this.unsubscribeGame = gameEvents.on('minigame:open', ({ id }) => { this.activate(); const game = createGame(id); if (game) this.playGame(game); else { this.title('小遊戲準備中', '這個入口將在後續步驟開放。'); const panel = element('div', 'menu-panel'); panel.append(action('回到小鎮', () => this.leave())); this.show(panel); } });
    this.heading.id = 'dialogue-title'; this.root.hidden = true;
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', this.heading.id);
    const header = element('header', 'ui-header');
    header.append(element('p', 'ui-eyebrow', 'LITTLE TOWN · 英語小鎮'), this.heading, this.subtitle);
    this.speechStatus.setAttribute('role', 'status');
    this.shell.append(header, this.speechStatus, this.body); this.root.append(this.shell); document.body.append(this.root);
    this.root.addEventListener('keydown', event => this.trapFocus(event));
    for (const name of ['pointerdown', 'pointerup', 'click'] as const) this.root.addEventListener(name, event => event.stopPropagation());
    this.speech.onStatus(message => { this.speechStatus.textContent = message; });
    this.engine = new DialogueEngine(new TapReplyInput(this.replyHost), { node: node => this.appendNpc(node), reply: (reply, node) => this.appendReply(reply, node), mistake: reply => this.appendMistake(reply), complete: summary => this.finish(summary) });
    this.controls = new TownControls(progress, () => this.settings(), () => this.levels());
    this.unsubscribe = gameEvents.on('interior:open', ({ location }) => {
      this.location = location; this.file = DIALOGUES[location]; this.inside = true; this.activate(); this.menu();
    });
    this.publishProgress();
    if (!progress.mode) this.modeMenu();
  }
  private activate(): void { this.root.hidden = false; document.body.classList.add('dialogue-open'); gameEvents.emit('ui:active', true); }
  private title(heading: string, subtitle: string): void { this.heading.textContent = heading; this.subtitle.textContent = subtitle; this.speechStatus.textContent = ''; }
  private show(panel: HTMLElement): void {
    this.body.replaceChildren(panel);
    panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  private publishProgress(): void {
    const scenarios = ALL_SCENARIOS.filter(s => s.level === this.progress.currentLevel);
    gameEvents.emit('progress:changed', { completed: this.progress.completedCount(scenarios.map(s => s.id)), total: scenarios.length });
  }
  private modeMenu(): void {
    this.activate(); this.title('一座小鎮，四段旅程。', '選擇你的起點，之後可在設定中重置。');
    const panel = element('div', 'menu-panel scroll-panel');
    panel.append(element('p', 'section-intro', '走進生活裡的英文，每次練一小段。'));
    const nicknameLabel = element('label', '', '你的暱稱（排行榜顯示用，可留空）');
    const nickname = element('input', 'nickname-input'); nickname.id = 'intro-nickname'; nicknameLabel.htmlFor = nickname.id; nickname.maxLength = 20; nickname.value = this.practice.nickname;
    nickname.setAttribute('autocomplete', 'nickname'); panel.append(nicknameLabel, nickname);
    for (const [mode, title, description] of [
      ['progression', '從第一級開始破關', '從短句開始，完成目前等級的情境後，逐級解鎖。'],
      ['direct', '直接進入第四級', '從職場英文開始，Lv1～Lv4 全部可自由切換。'],
    ] as const) {
      const button = action('', () => { this.practice.nickname = nickname.value; this.chooseMode(mode); }, 'scenario-card mode-card');
      button.append(element('strong', 'scenario-title', title), element('span', 'scenario-zh', description)); panel.append(button);
    }
    for (const level of LEVELS) panel.append(element('p', 'level-description', `Lv${level} ${LEVEL_INFO[level].title} · ${LEVEL_INFO[level].description}`));
    if (!this.progress.isPersistent) panel.append(element('p', 'storage-warning', '此瀏覽器暫時無法保存進度，本次仍可遊玩。'));
    this.show(panel);
  }
  private chooseMode(mode: PlayMode): void {
    this.progress.chooseMode(mode); gameEvents.emit('level:changed', this.progress.currentLevel); this.publishProgress(); this.leave();
  }
  private levels(): void {
    this.activate(); this.title('選擇練習等級', this.progress.mode === 'direct' ? '直接第四級模式 · 四個等級都能玩' : '破關模式 · 完成情境，逐級解鎖');
    const panel = element('div', 'menu-panel scroll-panel');
    for (const level of LEVELS) {
      const unlocked = this.progress.unlocked.includes(level);
      const button = action('', () => {
        if (!this.progress.switchLevel(level)) return;
        gameEvents.emit('level:changed', level); this.publishProgress(); this.leave();
      }, 'scenario-card');
      button.disabled = !unlocked;
      button.append(element('strong', 'scenario-title', `Lv${level} ${LEVEL_INFO[level].title}${unlocked ? '' : ' · 尚未解鎖'}`), element('span', 'scenario-zh', LEVEL_INFO[level].description));
      if (level === this.progress.currentLevel) button.append(element('span', 'completion-mark', '✓ 目前等級'));
      panel.append(button);
    }
    panel.append(action('回到小鎮', () => this.leave(), 'ui-button quiet')); this.show(panel);
  }
  private settings(): void {
    this.activate(); this.title('設定', '你的選擇與進度，保存在這個瀏覽器。');
    const panel = element('div', 'menu-panel scroll-panel');
    panel.append(element('p', '', `目前模式：${this.progress.mode === 'direct' ? '直接第四級模式' : '破關模式'}`), element('p', '', `目前等級：Lv${this.progress.currentLevel} ${LEVEL_INFO[this.progress.currentLevel].title}`), element('p', 'muted', this.progress.isPersistent ? '儲存狀態：可保存' : '儲存狀態：暫時無法保存，重新整理可能遺失進度。'));
    const nicknameLabel = element('label', '', '排行榜暱稱');
    const nickname = element('input', 'nickname-input'); nickname.id = 'settings-nickname'; nicknameLabel.htmlFor = nickname.id; nickname.maxLength = 20; nickname.value = this.practice.nickname;
    panel.append(nicknameLabel, nickname, action('儲存暱稱', () => { this.practice.nickname = nickname.value; nickname.value = this.practice.nickname; }));
    const sound = action(this.practice.sound ? '小遊戲聲音：開啟' : '小遊戲聲音：關閉', () => { this.practice.sound = !this.practice.sound; sound.textContent = this.practice.sound ? '小遊戲聲音：開啟' : '小遊戲聲音：關閉'; sound.setAttribute('aria-pressed', String(this.practice.sound)); if (!this.practice.sound) this.speech.cancel(); });
    sound.setAttribute('aria-pressed', String(this.practice.sound)); panel.append(sound);
    const volumeLabel = element('label', '', '音量');
    const volume = element('input', 'volume-input'); volume.type = 'range'; volume.id = 'settings-volume'; volumeLabel.htmlFor = volume.id;
    volume.min = '0'; volume.max = '100'; volume.step = '10'; volume.value = String(this.practice.volume * 100);
    const percentage = element('span', 'volume-percentage', `${Math.round(this.practice.volume * 100)}%`);
    const volumeRow = element('div', 'volume-row'); volumeRow.append(volume, percentage);
    volume.addEventListener('input', () => {
      this.practice.volume = Number(volume.value) / 100;
      this.sfx.setVolume(this.practice.volume); this.speech.setVolume(this.practice.volume);
      percentage.textContent = `${Math.round(this.practice.volume * 100)}%`;
    });
    volume.addEventListener('change', () => { this.sfx.unlock(); this.sfx.play('correct'); });
    panel.append(volumeLabel, volumeRow, element('p', 'muted', '音效與朗讀共用此音量；iPhone 的朗讀音量請用手機音量鍵調整。'));
    panel.append(action('資料來源', () => { this.title('資料來源', '官方詞目與衍生學習內容的出處'); this.show(sourcesPanel(() => this.settings())); }), action('切換等級', () => this.levels()), action('重置所有進度', () => this.confirmReset(), 'ui-button danger'), action('回到小鎮', () => this.leave(), 'ui-button quiet'));
    this.show(panel);
  }
  private confirmReset(): void {
    this.title('確定重置所有進度？', '這會清除模式、等級、情境、單字練習與本機排行榜。');
    const panel = element('div', 'menu-panel scroll-panel');
    panel.append(element('p', '', '重置後會回到開場選擇，無法復原。'), action('取消，保留進度', () => this.settings()), action('確認重置', () => {
      this.engine.stop(); this.speech.cancel(); this.progress.reset(); this.practice.reset(); void this.scores.clear(); gameEvents.emit('level:changed', 1); this.publishProgress(); this.modeMenu();
      this.sfx.setVolume(this.practice.volume); this.speech.setVolume(this.practice.volume);
    }, 'ui-button danger'));
    this.show(panel);
  }
  private playGame(game: MiniGame): void {
    this.engine.stop(); this.speech.cancel(); this.title(`${game.location === 'School' ? '操場' : game.location} · ${game.name}`, `Lv${this.progress.currentLevel} 單字練習`);
    void this.games.open(game, this.progress.currentLevel);
  }
  private menu(gamesTab = false): void {
    this.games.stop();
    this.engine.stop(); this.speech.cancel(); this.scenario = undefined;
    const level = this.progress.currentLevel;
    this.title(`${this.location} · Lv${level}`, `${this.file.npcName} · ${this.file.npcRoleZh}，陪你練習。`);
    const panel = element('div', 'menu-panel scroll-panel');
    const tabs = element('div', 'menu-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [name, selected] of [['情境對話', false], ['小遊戲', true]] as const) { const tab = action(name, () => this.menu(selected)); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(gamesTab === selected)); tabs.append(tab); }
    panel.append(tabs);
    if (gamesTab) {
      const games = GAME_FACTORIES.map(factory => factory()).filter(game => game.location === this.location);
      if (!games.length) panel.append(element('p', '', '此地點的小遊戲將在後續步驟開放。'));
      for (const game of games) { const ready = wordsReady(level); const button = action(`${this.location === 'School' ? '操場 · ' : ''}${game.name}${ready ? ' →' : ' · 單字準備中'}`, () => this.playGame(game), 'scenario-card'); button.disabled = !ready; panel.append(button); }
      panel.append(action('回到小鎮', () => this.leave(), 'ui-button quiet')); this.show(panel); return;
    }
    const scenarios = this.file.scenarios.filter(s => s.level === level);
    if (!scenarios.length) panel.append(element('p', '', '這個地點的本級情境正在準備中，先去咖啡廳練習吧！'));
    for (const scenario of scenarios) {
      const completion = this.progress.get(scenario.id);
      const button = action('', () => this.start(scenario), 'scenario-card');
      const english = element('strong', 'scenario-title', scenario.title); english.lang = 'en';
      button.append(element('span', 'scenario-meta', completion.completed ? `✓ 已完成 ${completion.count} 次` : '尚未完成'), english, element('span', 'scenario-zh', scenario.titleZh), element('span', 'scenario-cta', '開始練習 →'));
      panel.append(button);
    }
    panel.append(action('回到小鎮', () => this.leave(), 'ui-button quiet'));
    this.show(panel);
  }
  private start(scenario: Scenario): void {
    this.scenario = scenario; this.count = 0; this.firstSentence = true;
    this.title(scenario.titleZh, `${this.file.npcName} · ${this.file.npcRole} / Lv${scenario.level}`);
    const conversation = element('div', 'conversation');
    const toolbar = element('div', 'conversation-tools');
    toolbar.append(action('← 情境選單', () => this.menu(), 'ui-button quiet'));
    const translate = action(this.showTranslation ? '隱藏翻譯' : '顯示翻譯', () => {
      this.showTranslation = !this.showTranslation; translate.textContent = this.showTranslation ? '隱藏翻譯' : '顯示翻譯';
      translate.setAttribute('aria-pressed', String(this.showTranslation));
      this.history.querySelectorAll<HTMLElement>('.npc-translation').forEach(node => { node.hidden = !this.showTranslation; });
    }, 'ui-button quiet');
    translate.setAttribute('aria-pressed', String(this.showTranslation)); toolbar.append(translate);
    this.history = element('div', 'dialogue-history scroll-panel'); this.history.tabIndex = 0;
    this.history.setAttribute('role', 'log'); this.history.setAttribute('aria-label', '對話紀錄，可向上捲動'); this.history.setAttribute('aria-live', 'polite');
    const replyPanel = element('section', 'reply-panel scroll-panel');
    this.counter = element('p', 'reply-caption', '輪到你了 · 選一句回答');
    const mic = action('🎙 麥克風 · 階段 4 開放', () => {}, 'ui-button microphone'); mic.disabled = true;
    replyPanel.append(this.counter, this.replyHost, mic); conversation.append(toolbar, this.history, replyPanel); this.body.replaceChildren(conversation);
    // First real NPC speech is inside this click, with no await or timer before speak().
    this.engine.start(scenario); translate.focus({ preventScroll: true });
  }
  private appendNpc(node: Pick<DialogueNode, 'npc' | 'npcZh'>): void {
    const bubble = element('article', 'bubble npc-bubble'); const row = element('div', 'bubble-meta');
    row.append(element('span', '', `${this.file.npcName} · ${this.file.npcRoleZh}`), action('↻ 重播', () => this.speech.speak(node.npc), 'ui-button replay'));
    const en = element('p', 'npc-english', node.npc); en.lang = 'en';
    const zh = element('p', 'npc-translation', node.npcZh); zh.hidden = !this.showTranslation;
    bubble.append(row, en, zh); this.history.append(bubble); this.history.scrollTop = this.history.scrollHeight;
    if (this.firstSentence) { this.firstSentence = false; this.speech.unlockAndSpeak(node.npc); } else this.speech.speak(node.npc);
  }
  private appendPlayer(reply: Reply): void {
    const bubble = element('article', `bubble player-bubble${reply.type === 'mistake' ? ' mistake-bubble' : ''}`); const en = element('p', '', reply.en); en.lang = 'en';
    bubble.append(element('span', 'bubble-meta', reply.type === 'mistake' ? '✗ 這樣說不太自然' : 'YOU · 你'), en, element('p', 'reply-hint', reply.zh)); this.history.append(bubble);
  }
  private appendReply(reply: BranchReply | VariantReply, node: DialogueNode): void {
    this.count++; this.counter.textContent = `已回答 ${this.count} 句 · 選一句繼續`;
    this.appendPlayer(reply);
    if (reply.type === 'variant') {
      const card = element('aside', 'feedback-card'); card.append(element('p', 'reply-note', reply.note), element('strong', '', '其他說法'));
      for (const option of node.replies) if (option.type === 'variant' && option !== reply) {
        const en = element('p', '', option.en); en.lang = 'en'; card.append(en, element('p', 'reply-hint', option.zh));
      }
      this.history.append(card);
    }
  }
  private appendMistake(reply: MistakeReply): void {
    this.appendPlayer(reply); this.appendNpc({ npc: reply.reaction.en, npcZh: reply.reaction.zh });
    const card = element('aside', 'feedback-card'), en = element('p', '', reply.correction); en.lang = 'en';
    card.append(element('strong', '', '正確說法'), en, element('strong', '', '解說'), element('p', '', reply.explain)); this.history.append(card);
    this.counter.textContent = '再選一次 · 找出比較好的說法'; this.history.scrollTop = this.history.scrollHeight;
  }
  private finish(summary: DialogueSummary): void {
    const scenario = this.scenario; if (!scenario) return;
    this.speech.cancel(); const unlocked = this.progress.complete(scenario.id); this.publishProgress();
    this.title('完成！', scenario.titleZh);
    const panel = element('div', 'completion-screen scroll-panel');
    panel.append(element('div', 'completion-icon', '✦'), element('h2', '', '又多了一點開口的勇氣。'), element('p', 'spoken-count', `本次說了 ${summary.spoken} 句`), element('p', 'completion-detail', `學到 ${summary.learned} 種說法`), element('p', 'completion-detail', `答錯 ${summary.mistakes} 次`), element('p', 'muted', '本階段為點選練習，尚未啟用麥克風。'), element('p', 'completion-detail', `✓ 已完成 ${this.progress.get(scenario.id).count} 次`));
    for (const level of unlocked) panel.append(element('p', 'unlock-notice', `已解鎖 Lv${level} ${LEVEL_INFO[level].title}！回到小鎮後可從上方切換。`));
    if (!this.progress.isPersistent) panel.append(element('p', 'storage-warning', '瀏覽器無法保存進度，目前只保留在這次遊玩期間。'));
    panel.append(action('再玩一次', () => this.start(scenario), 'ui-button primary'), action('選其他情境', () => this.menu()), action('回到小鎮', () => this.leave(), 'ui-button quiet')); this.show(panel);
  }
  private leave(): void {
    this.games.stop();
    this.engine.stop(); this.speech.cancel(); this.root.hidden = true; document.body.classList.remove('dialogue-open'); gameEvents.emit('ui:active', false);
    if (this.inside) { this.inside = false; gameEvents.emit('interior:leave', { location: this.location }); }
    document.querySelector<HTMLCanvasElement>('#game canvas')?.focus({ preventScroll: true });
  }
  private trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') { if (!this.body.querySelector('.game-stage')) event.stopPropagation(); return; }
    event.stopPropagation();
    const targets = [...this.root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input')].filter(button => button.getClientRects().length > 0);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && (document.activeElement === first || !this.root.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  destroy(): void { this.games.stop(); this.unsubscribeGame(); this.unsubscribe(); this.engine.stop(); this.speech.destroy(); this.controls.destroy(); this.root.remove(); }
}

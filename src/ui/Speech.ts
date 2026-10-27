/** All speaking happens synchronously inside a scenario/reply/replay click. */
export class Speech {
  private readonly synth: SpeechSynthesis | undefined;
  private voices: SpeechSynthesisVoice[] = [];
  private current?: SpeechSynthesisUtterance;
  private volume = .8;
  private status: (message: string) => void = () => {};
  constructor() {
    this.synth = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
    this.refreshVoices();
    this.synth?.addEventListener('voiceschanged', this.refreshVoices);
    document.addEventListener('visibilitychange', this.visibility);
  }
  onStatus(callback: (message: string) => void): void { this.status = callback; }
  setVolume(volume: number): void { this.volume = volume; }
  private refreshVoices = (): void => { this.voices = this.synth?.getVoices() ?? []; };
  private visibility = (): void => { if (document.hidden) this.cancel(); };
  /** The first real NPC sentence unlocks Safari; no timer or await before speak(). */
  unlockAndSpeak(text: string): void { this.speak(text); }
  speak(text: string): void {
    const synth = this.synth;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      this.status('此瀏覽器不支援朗讀，你仍可完成文字練習。');
      return;
    }
    try {
      this.cancel();
      this.refreshVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.volume = this.volume;
      const english = this.voices.filter(voice => /^en[-_]US$/i.test(voice.lang));
      const preferred = english.find(voice => /Samantha|Google US English/i.test(voice.name));
      const voice = preferred ?? english.find(voice => voice.default) ?? english[0];
      if (voice) utterance.voice = voice;
      utterance.onerror = event => {
        if (this.current !== utterance || ['canceled', 'interrupted'].includes(event.error)) return;
        this.status('朗讀暫時無法播放，請點「重播」再試一次；可繼續文字練習。');
      };
      utterance.onstart = () => { if (this.current === utterance) this.status(''); };
      utterance.onend = () => { if (this.current === utterance) this.current = undefined; };
      this.current = utterance; // Retain a reference for Safari until speech ends.
      synth.resume();
      synth.speak(utterance);
    } catch { this.status('朗讀暫時無法播放，請點「重播」再試一次。'); }
  }
  cancel(): void {
    this.current = undefined;
    this.synth?.cancel();
  }
  destroy(): void {
    this.cancel();
    this.synth?.removeEventListener('voiceschanged', this.refreshVoices);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}

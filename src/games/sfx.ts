export type SfxKind = 'correct' | 'wrong' | 'complete';
export class Sfx {
  private context?: AudioContext;
  unlock(): void {
    try {
      if (typeof window === 'undefined') return;
      const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      this.context ??= new Audio();
      if (this.context.state !== 'running') void this.context.resume().catch(() => {});
    } catch {}
  }
  play(kind: SfxKind): void {
    try {
      const context = this.context;
      if (!context || context.state !== 'running') return;
      const tone = (frequency: number, delay: number, duration: number, type: OscillatorType = 'sine', end?: number): void => {
        const start = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
        if (end) oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
        gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.12, start + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { try { oscillator.disconnect(); gain.disconnect(); } catch {} };
        oscillator.start(start); oscillator.stop(start + duration);
      };
      if (kind === 'correct') { tone(1046.5, 0, .08); tone(1318.5, .15, .08); }
      else if (kind === 'wrong') tone(220, 0, .22, 'triangle', 140);
      else [523.25,659.25,784,1046.5].forEach((frequency,index) => tone(frequency, index * .11, .11));
    } catch {}
  }
}

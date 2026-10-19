// Procedural audio (Web Audio): a quiet wind bed and a slow, slightly sad carol-like pad whose
// mood follows the location. Nothing is loaded from the network. Safe when audio is unavailable.

const THEMES = {
  square: { root: 196.0, scale: [0, 2, 4, 7, 9], tempo: 3.2, wind: 0.05, bright: 1 },
  inn: { root: 220.0, scale: [0, 2, 4, 7, 9], tempo: 2.8, wind: 0.015, bright: 0.9 },
  indoors: { root: 174.6, scale: [0, 3, 5, 7, 10], tempo: 3.8, wind: 0.01, bright: 0.6 },
  church: { root: 146.8, scale: [0, 2, 3, 7, 8], tempo: 4.4, wind: 0.03, bright: 0.7 },
  tower: { root: 130.8, scale: [0, 1, 5, 7, 8], tempo: 5, wind: 0.09, bright: 0.45 },
  home: { root: 164.8, scale: [0, 2, 4, 7, 9], tempo: 4.2, wind: 0.01, bright: 0.5 },
  finale: { root: 196.0, scale: [0, 2, 4, 7, 9], tempo: 3, wind: 0.03, bright: 1.2 },
};

export class GameAudio {
  constructor(ctrl) {
    this.ctrl = ctrl; this.ctx = null; this.theme = 'square'; this.timer = null; this.master = null; this.windGain = null;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.makeWind();
      this.apply();
      this.schedule();
    } catch { this.ctx = null; }
  }

  apply() {
    if (!this.master) return;
    const s = this.ctrl.settings;
    this.master.gain.value = s.muted ? 0 : s.volume * 0.5;
  }

  setTheme(name) {
    this.theme = THEMES[name] ? name : 'square';
    const t = THEMES[this.theme];
    if (this.windGain) this.windGain.gain.setTargetAtTime(t.wind, this.ctx.currentTime, 1.5);
  }

  makeWind() {
    const ctx = this.ctx, len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    this.windGain = ctx.createGain(); this.windGain.gain.value = THEMES.square.wind;
    src.connect(lp); lp.connect(this.windGain); this.windGain.connect(this.master); src.start();
  }

  note(freq, when, dur, gain, type = 'sine') {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(this.master); o.start(when); o.stop(when + dur + 0.1);
  }

  schedule() {
    const play = () => {
      if (!this.ctx) return;
      const t = THEMES[this.theme], now = this.ctx.currentTime + 0.05;
      const deg = t.scale[Math.floor(Math.random() * t.scale.length)];
      const f = t.root * Math.pow(2, deg / 12) * (Math.random() < 0.3 ? 2 : 1);
      this.note(f, now, t.tempo * 1.6, 0.05 * t.bright, 'triangle');
      this.note(t.root / 2, now, t.tempo * 2.4, 0.04, 'sine');
      if (Math.random() < 0.35) this.note(f * 3, now + 0.4, 1.8, 0.02 * t.bright, 'sine');   // distant bell shimmer
      this.timer = setTimeout(play, t.tempo * 1000 * (0.8 + Math.random() * 0.5));
    };
    play();
  }

  /** A short confirming chime for new evidence. */
  chime() {
    if (!this.ctx) return;
    const n = this.ctx.currentTime + 0.02;
    this.note(784, n, 0.9, 0.08); this.note(1175, n + 0.12, 1.1, 0.06);
  }
}

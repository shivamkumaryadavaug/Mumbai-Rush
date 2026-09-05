// audio.js — Web Audio synth SFX, volumes, run loop + procedural music
const AudioSys = {
  ctx: null, master: null, sfxGain: null, musicGain: null, noiseBuf: null,
  musicOn: true, sfxOn: true, musicVol: 0.7, sfxVol: 0.8,
  musicTimer: null, step: 0, runSrc: null, runGain: null, runFilter: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applySettings();
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applySettings() {
    const s = Storage.settings;
    this.musicOn = !!s.music; this.sfxOn = !!s.sfx;
    this.musicVol = (s.musicVol !== undefined ? s.musicVol : 70) / 100;
    this.sfxVol = (s.sfxVol !== undefined ? s.sfxVol : 80) / 100;
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVol * 0.5 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxOn ? this.sfxVol : 0;
  },
  setMusic(on)  { const s = Storage.settings; s.music = on; Storage.settings = s; this.applySettings(); },
  setSfx(on)    { const s = Storage.settings; s.sfx = on;   Storage.settings = s; this.applySettings(); },
  setMusicVol(v){ const s = Storage.settings; s.musicVol = v; Storage.settings = s; this.applySettings(); },
  setSfxVol(v)  { const s = Storage.settings; s.sfxVol = v;   Storage.settings = s; this.applySettings(); },

  tone(freq, dur, type, vol, dest, slideTo, when) {
    if (!this.ctx) return;
    if (dest !== this.musicGain && !this.sfxOn) return;
    const t = (when || this.ctx.currentTime);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur);
  },

  coin()     { this.tone(950, 0.09, 'square', 0.14); this.tone(1420, 0.14, 'square', 0.12, this.sfxGain, null, this.ctx ? this.ctx.currentTime + 0.07 : 0); },
  jump()     { this.tone(280, 0.22, 'sawtooth', 0.16, this.sfxGain, 620); },
  slide()    { this.tone(520, 0.25, 'sawtooth', 0.14, this.sfxGain, 160); },
  crash()    { this.noise(0.5, 0.5, 500); this.tone(130, 0.5, 'square', 0.3, this.sfxGain, 55); },
  power()    { const t = this.ctx ? this.ctx.currentTime : 0; [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.16, this.sfxGain, null, t + i * 0.07)); },
  nearMiss() { this.tone(1250, 0.06, 'triangle', 0.14); this.tone(1650, 0.1, 'triangle', 0.12, this.sfxGain, null, this.ctx ? this.ctx.currentTime + 0.06 : 0); },
  click()    { this.tone(700, 0.06, 'sine', 0.12); },
  shieldPop(){ this.tone(400, 0.15, 'square', 0.2, this.sfxGain, 200); this.noise(0.2, 0.2, 1200); },

  // subtle looping run/road-noise bed while playing
  startRunLoop() {
    if (!this.ctx || this.runSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start();
    this.runSrc = src; this.runGain = g; this.runFilter = f;
  },
  setRunIntensity(x) { // 0..1, tied to speed
    if (this.runGain) {
      const target = this.sfxOn ? 0.02 + x * 0.05 : 0;
      this.runGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      this.runFilter.frequency.setTargetAtTime(300 + x * 500, this.ctx.currentTime, 0.1);
    }
  },
  stopRunLoop() {
    if (this.runSrc) { try { this.runSrc.stop(); } catch (e) {} this.runSrc = null; this.runGain = null; this.runFilter = null; }
  },

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.step = 0;
    const scale = [0, 2, 4, 7, 9];
    const root = 220;
    this.musicTimer = setInterval(() => {
      if (!this.musicOn || document.hidden) { this.step++; return; }
      const st = this.step % 16, bar = Math.floor(this.step / 16) % 4;
      const t = this.ctx.currentTime + 0.05;
      if (st % 4 === 0) {
        const bass = [0, 0, -2, -4][bar];
        this.tone(root * Math.pow(2, bass / 12) / 2, 0.18, 'triangle', 0.22, this.musicGain, null, t);
      }
      if (st % 4 === 0) this.tone(120, 0.1, 'sine', 0.3, this.musicGain, 45, t);
      if (st % 2 === 1) this.tone(6000, 0.03, 'square', 0.03, this.musicGain, null, t);
      if ([0, 3, 6, 10, 12].includes(st) && Math.random() < 0.75) {
        const n = scale[Math.floor(Math.random() * scale.length)] + 12 * (Math.random() < 0.3 ? 2 : 1);
        this.tone(root * Math.pow(2, n / 12), 0.16, 'square', 0.045, this.musicGain, null, t);
      }
      this.step++;
    }, 107);
  },
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
};

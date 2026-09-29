'use strict';
/* =========================================================
   効果音（ブラウザの中で合成する）
   ========================================================= */
const SOUND = (() => {
  let ctx = null, master = null, on = true;
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, freq = 1200, q = 1, slide = 0.3) {
    if (!ctx || !on) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  const big = (s) => Math.min(1, 0.4 + s * 0.12);
  return {
    init,
    toggle() { on = !on; return on; },
    get on() { return on; },
    cast(el, s) {
      if (el === 'fire') tone(300, 0.25, 'sawtooth', 0.08, 0.5);
      else if (el === 'ice') tone(1400, 0.2, 'triangle', 0.08, 1.6);
      else tone(900, 0.1, 'square', 0.05, 0.4);
      void s;
    },
    boom(s) { noise(0.5 + Math.min(1.5, s * 0.1), 0.5 * big(s), 900, 1, 0.1); tone(90, 0.4, 'sine', 0.3 * big(s), 0.5); },
    ice(s) { tone(1800, 0.25, 'triangle', 0.1, 0.6); noise(0.25, 0.2 * big(s), 5000, 2, 0.5); },
    thunder(s) { noise(0.6 + Math.min(1.2, s * 0.1), 0.55 * big(s), 3000, 0.7, 0.05); tone(60, 0.5, 'sawtooth', 0.15, 0.6); },
    hurt() { tone(180, 0.18, 'square', 0.12, 0.6); },
    heal() { tone(660, 0.12, 'sine', 0.12); tone(880, 0.18, 'sine', 0.12, 1, 0.1); },
    coin() { tone(1200, 0.08, 'square', 0.06); tone(1600, 0.12, 'square', 0.06, 1, 0.07); },
    error() { tone(200, 0.2, 'square', 0.08); },
    talk() { tone(520 + Math.random() * 80, 0.04, 'triangle', 0.04); },
    quest() { [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, 1, i * 0.1)); },
    levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.12, 1, i * 0.09)); }
  };
})();

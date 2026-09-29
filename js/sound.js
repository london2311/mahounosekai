'use strict';
/* =========================================================
   音（効果音と音楽）— すべてブラウザの中で合成する
   ========================================================= */
const SOUND = (() => {
  let ctx = null, master, sfxBus, bgmBus, reverb, reverbSend, delay;
  const settings = { bgm: true, sfx: true, bgmVol: 0.55, sfxVol: 0.8 };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('mahounosekai_sound') || '{}')); } catch (e) { /* 既定値で動く */ }
  const saveSettings = () => { try { localStorage.setItem('mahounosekai_sound', JSON.stringify(settings)); } catch (e) { /* 無視 */ } };

  let noiseBuf = null, brownBuf = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    bgmBus = ctx.createGain(); bgmBus.connect(master);
    // 残響（ホールのような響き）
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.32;
    reverbSend.connect(reverb); reverb.connect(master);
    // やまびこ（旋律用）
    delay = ctx.createDelay(1.0); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const dOut = ctx.createGain(); dOut.gain.value = 0.25;
    delay.connect(fb); fb.connect(delay); delay.connect(dOut); dOut.connect(bgmBus);
    // 雑音の素
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const w = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
    applyVolumes();
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
    startScheduler();
  }
  function applyVolumes() {
    if (!ctx) return;
    sfxBus.gain.setTargetAtTime(settings.sfx ? settings.sfxVol : 0, ctx.currentTime, 0.05);
    bgmBus.gain.setTargetAtTime(settings.bgm ? settings.bgmVol * 0.55 : 0, ctx.currentTime, 0.3);
  }

  /* ---------- 効果音の部品 ---------- */
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, d, sustain = 0) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
  }
  function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delayS = 0, out = sfxBus, rev = 0) {
    if (!ctx || !settings.sfx && out === sfxBus) return;
    const t = now() + delayS;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(out);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(reverbSend); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  // 雑音（type: lowpass/highpass/bandpass、f0→f1 に変化）
  function noise(dur, vol, type, f0, f1, q = 1, delayS = 0, brown = false, rev = 0, attack = 0.004) {
    if (!ctx || !settings.sfx) return;
    const t = now() + delayS;
    const src = ctx.createBufferSource(); src.buffer = brown ? brownBuf : noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, attack, vol, dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(reverbSend); }
    src.start(t, Math.random() * 1.5); src.stop(t + dur + attack + 0.05);
  }
  const big = (s) => Math.min(1, 0.45 + s * 0.1);

  /* ---------- 詠唱中のうなり ---------- */
  let hum = null;
  function chargeStart(el) {
    if (!ctx || !settings.sfx || hum) return;
    const t = now();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    const base = el === 'fire' ? 110 : el === 'ice' ? 330 : 220;
    o1.type = 'sawtooth'; o2.type = 'sine';
    o1.frequency.value = base; o2.frequency.value = base * 2.01;
    f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.3);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
    const r = ctx.createGain(); r.gain.value = 0.3; g.connect(r); r.connect(reverbSend);
    o1.start(); o2.start();
    hum = { o1, o2, g, f, base };
  }
  function chargeLevel(k) {       // k: 0〜（込めた量に応じて上がる）
    if (!hum) return;
    const t = now();
    const m = 1 + Math.min(3, k) * 0.5;
    hum.o1.frequency.setTargetAtTime(hum.base * m, t, 0.1);
    hum.o2.frequency.setTargetAtTime(hum.base * 2.01 * m, t, 0.1);
    hum.f.frequency.setTargetAtTime(500 + Math.min(4000, k * 900), t, 0.1);
    hum.g.gain.setTargetAtTime(0.05 + Math.min(0.08, k * 0.02), t, 0.1);
  }
  function chargeStop() {
    if (!hum) return;
    const t = now(), h = hum; hum = null;
    h.g.gain.setTargetAtTime(0.0001, t, 0.05);
    h.o1.stop(t + 0.3); h.o2.stop(t + 0.3);
  }

  /* =========================================================
     音楽（場面ごとに作曲した曲を、その場で演奏する）
     ========================================================= */
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
  // chords: 音階の何度目から三和音を積むか / mel: 旋律（音階の番号、null=休み。1マス=8分音符）
  const SONGS = {
    title: { bpm: 72, root: 50, scale: 'major', chords: [0, 3, 5, 4], pad: 0.5, arp: 'slow', bass: 'long', lead: 'flute',
      mel: [4, null, 5, 6, 7, null, 6, 5, 4, null, null, null, 2, 3, 4, null, 5, null, 4, 3, 2, null, 1, 2, 3, null, null, null, null, null, null, null] },
    field: { bpm: 96, root: 50, scale: 'major', chords: [0, 4, 5, 3], pad: 0.4, arp: 'eighth', bass: 'half', lead: 'flute',
      mel: [7, null, 9, 8, 7, null, 4, null, 5, 6, 7, null, 6, null, null, null, 5, null, 7, 6, 5, null, 2, null, 3, 4, 5, 4, 3, null, null, null,
        7, null, 9, 8, 7, null, 11, null, 10, 9, 8, null, 7, null, null, null, 8, 7, 6, 5, 4, null, 5, 6, 7, null, 4, null, null, null, null, null] },
    town: { bpm: 108, root: 53, scale: 'major', chords: [0, 5, 3, 4], pad: 0.3, arp: 'lute', bass: 'walk', lead: 'bell',
      mel: [4, 5, 6, null, 4, null, 2, null, 3, 4, 5, null, 3, null, 1, null, 2, 3, 4, null, 5, 4, 3, 2, 1, null, 2, null, 0, null, null, null] },
    dungeon: { bpm: 64, root: 45, scale: 'minor', chords: [0, 5, 3, 4], pad: 0.55, arp: 'none', bass: 'drone', lead: 'bellDark', dark: true,
      mel: [7, null, null, null, 6, null, null, null, 5, null, 4, null, null, null, null, null, 2, null, null, null, 3, null, 4, null, 3, null, null, null, null, null, null, null] },
    battle: { bpm: 152, root: 52, scale: 'harm', chords: [0, 6, 5, 4], pad: 0.25, arp: 'fast', bass: 'drive', lead: 'saw', drums: 'battle',
      mel: [7, null, 7, 6, 7, null, 9, null, 8, null, 7, null, 6, null, 4, null, 5, null, 5, 4, 5, null, 7, null, 6, 5, 4, 3, 4, null, null, null] },
    requiem: { bpm: 58, root: 45, scale: 'minor', chords: [0, 5, 3, 4], pad: 0.6, arp: 'slow', bass: 'long', lead: 'flute', dark: true,
      mel: [4, null, null, 3, 2, null, null, null, 0, null, 1, 2, 3, null, null, null, 4, null, 5, null, 4, null, 3, 2, 1, null, null, null, null, null, null, null,
        7, null, null, 6, 5, null, 4, null, 3, null, 4, 5, 4, null, null, null, 2, null, 3, null, 2, 1, 0, null, 0, null, null, null, null, null, null, null] },
    boss: { bpm: 164, root: 48, scale: 'harm', chords: [0, 1, 0, 4], pad: 0.35, arp: 'fast', bass: 'drive', lead: 'saw', drums: 'boss', dark: true,
      mel: [7, null, 8, null, 7, null, 6, 7, 4, null, null, 4, 5, 6, 7, null, 8, null, 9, null, 8, null, 7, 6, 7, null, null, null, 11, 10, 9, 8] }
  };
  const music = { cur: null, want: null, gain: null, song: null, step: 0, next: 0, timer: null };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function degreeNote(song, deg, oct = 0) {
    const sc = SCALES[song.scale];
    const o = Math.floor(deg / 7);
    return song.root + sc[((deg % 7) + 7) % 7] + 12 * (o + oct);
  }
  function chordNotes(song, bar) {
    const d = song.chords[bar % song.chords.length];
    return [degreeNote(song, d), degreeNote(song, d + 2), degreeNote(song, d + 4)];
  }
  function voice(out, freq, t, dur, type, vol, opt = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (opt.detune) o.detune.value = opt.detune;
    if (opt.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 5.2; lg.gain.value = freq * 0.006;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.6);
    }
    let node = o;
    if (opt.lp) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(opt.lp, t);
      if (opt.lpEnd) f.frequency.exponentialRampToValueAtTime(opt.lpEnd, t + dur);
      f.Q.value = opt.q || 0.8;
      o.connect(f); node = f;
    }
    const a = opt.a || 0.01, r = opt.r || 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (opt.pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    else { g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r); }
    node.connect(g); g.connect(out);
    if (opt.rev) { const rg = ctx.createGain(); rg.gain.value = opt.rev; g.connect(rg); rg.connect(reverbSend); }
    if (opt.echo) { const eg = ctx.createGain(); eg.gain.value = opt.echo; g.connect(eg); eg.connect(delay); }
    o.start(t); o.stop(t + dur + r + 0.1);
  }
  function drum(out, kind, t, vol) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32);
    } else {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = kind === 'hat' ? 'highpass' : 'bandpass';
      f.frequency.value = kind === 'hat' ? 7000 : 1800; f.Q.value = kind === 'hat' ? 0.7 : 0.9;
      const g = ctx.createGain();
      const d = kind === 'hat' ? 0.05 : 0.18;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f); f.connect(g); g.connect(out);
      if (kind === 'snare') { const r = ctx.createGain(); r.gain.value = 0.3; g.connect(r); r.connect(reverbSend); }
      src.start(t, Math.random()); src.stop(t + d + 0.02);
    }
  }
  // 8分音符1つぶんを鳴らす
  function playStep(song, out, step, t) {
    const e = 60 / song.bpm / 2;              // 8分音符の長さ
    const bar = Math.floor(step / 8), inBar = step % 8;
    const ch = chordNotes(song, bar);
    // 和音（伸ばす）
    if (inBar === 0 && song.pad) {
      for (const n of ch) for (const dt of [-7, 7]) {
        voice(out, mtof(n), t, e * 8, 'sawtooth', 0.022 * song.pad, { detune: dt, a: 0.5, r: 0.8, lp: song.dark ? 700 : 1300, rev: 0.6 });
      }
    }
    // ベース
    const root = ch[0] - 12;
    const bassOpt = { lp: 600, a: 0.01, r: 0.08 };
    switch (song.bass) {
      case 'long': if (inBar === 0) voice(out, mtof(root), t, e * 8, 'triangle', 0.12, { a: 0.1, r: 0.5 }); break;
      case 'half': if (inBar % 4 === 0) voice(out, mtof(root), t, e * 3.6, 'triangle', 0.13, bassOpt); break;
      case 'walk': if (inBar % 2 === 0) voice(out, mtof(root + [0, 4, 7, 5][inBar / 2]), t, e * 1.8, 'triangle', 0.13, bassOpt); break;
      case 'drone': if (inBar === 0) voice(out, mtof(root - 12), t, e * 8, 'sawtooth', 0.05, { lp: 220, a: 0.8, r: 1.2 }); break;
      case 'drive': voice(out, mtof(root + (inBar === 7 ? 12 : 0)), t, e * 0.9, 'sawtooth', 0.07, { lp: 900, lpEnd: 300, pluck: true }); break;
    }
    // 分散和音
    const arpN = ch.concat([ch[0] + 12, ch[1] + 12]);
    switch (song.arp) {
      case 'slow': if (inBar % 2 === 0) voice(out, mtof(arpN[(step / 2) % 4 | 0] + 12), t, e * 3, 'triangle', 0.045, { pluck: true, rev: 0.5 }); break;
      case 'eighth': voice(out, mtof(arpN[[0, 1, 2, 3, 4, 3, 2, 1][inBar]] + 12), t, e * 1.6, 'triangle', 0.04, { pluck: true, rev: 0.35 }); break;
      case 'lute': voice(out, mtof(arpN[[0, 2, 1, 3, 0, 2, 4, 2][inBar]] + 12), t, e * 2, 'square', 0.022, { pluck: true, lp: 1800, lpEnd: 500, rev: 0.3 }); break;
      case 'fast': for (const k of [0, 1]) voice(out, mtof(arpN[(inBar * 2 + k) % 5] + 12), t + k * e / 2, e * 0.45, 'square', 0.018, { pluck: true, lp: 2500, lpEnd: 800 }); break;
    }
    // 打楽器
    if (song.drums) {
      const heavy = song.drums === 'boss';
      if (inBar % 4 === 0 || (heavy && inBar % 4 === 3)) drum(out, 'kick', t, 0.5);
      if (inBar % 4 === 2) drum(out, 'snare', t, 0.22);
      drum(out, 'hat', t, inBar % 2 ? 0.05 : 0.08);
    }
    // 旋律
    const m = song.mel[step % song.mel.length];
    if (m !== null && m !== undefined) {
      let len = 1;
      while (song.mel[(step + len) % song.mel.length] === null && len < 6) len++;
      const f = mtof(degreeNote(song, m, 1));
      switch (song.lead) {
        case 'flute': voice(out, f, t, e * len * 0.95, 'sine', 0.075, { a: 0.05, r: 0.2, vib: true, rev: 0.5, echo: 0.6 }); voice(out, f * 2, t, e * len * 0.95, 'sine', 0.012, { a: 0.05, r: 0.2 }); break;
        case 'bell': voice(out, f, t, e * 3, 'sine', 0.06, { pluck: true, rev: 0.5, echo: 0.5 }); voice(out, f * 2.76, t, e * 1.5, 'sine', 0.018, { pluck: true }); break;
        case 'bellDark': voice(out, f / 2, t, e * 6, 'sine', 0.07, { pluck: true, rev: 1, echo: 0.8 }); voice(out, f * 1.38, t, e * 3, 'sine', 0.015, { pluck: true, rev: 1 }); break;
        case 'saw': voice(out, f, t, e * len * 0.9, 'sawtooth', 0.03, { a: 0.01, r: 0.08, lp: 2600, vib: true, rev: 0.25, echo: 0.3 }); break;
      }
    }
  }
  function startScheduler() {
    if (music.timer) return;
    music.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (music.want !== music.cur) switchSong();
      if (!music.song) return;
      const e = 60 / music.song.bpm / 2;
      while (music.next < ctx.currentTime + 0.25) {
        if (settings.bgm) playStep(music.song, music.gain, music.step, music.next);
        music.step++;
        music.next += e;
      }
    }, 40);
  }
  function switchSong() {
    const t = ctx.currentTime;
    if (music.gain) {
      const g = music.gain;
      g.gain.setTargetAtTime(0.0001, t, 0.6);
      setTimeout(() => g.disconnect(), 4000);
    }
    music.cur = music.want;
    music.song = SONGS[music.cur] || null;
    if (!music.song) { music.gain = null; return; }
    music.gain = ctx.createGain();
    music.gain.gain.setValueAtTime(0.0001, t);
    music.gain.gain.linearRampToValueAtTime(1, t + 1.5);
    music.gain.connect(bgmBus);
    music.step = 0;
    music.next = t + 0.1;
  }

  /* ---------- 外から使う ---------- */
  return {
    init,
    settings,
    setMusic(name) { music.want = name; },
    get musicName() { return music.cur; },
    setBgm(on) { settings.bgm = on; applyVolumes(); saveSettings(); },
    setSfx(on) { settings.sfx = on; applyVolumes(); saveSettings(); },
    setBgmVol(v) { settings.bgmVol = v; applyVolumes(); saveSettings(); },
    setSfxVol(v) { settings.sfxVol = v; applyVolumes(); saveSettings(); },
    // 以前の「効果音オン/オフ」切替との互換
    toggle() { this.setSfx(!settings.sfx); return settings.sfx; },
    get on() { return settings.sfx; },
    chargeStart, chargeLevel, chargeStop,
    cast(el, s) {
      if (el === 'fire') { noise(0.45, 0.22, 'bandpass', 300, 2200, 1.2, 0, false, 0.2, 0.05); tone(90, 0.25, 'sine', 0.2, 0.6); }
      else if (el === 'water') { noise(0.5, 0.2, 'lowpass', 400, 2400, 1, 0, true, 0.2, 0.1); }
      else if (el === 'gravity' || el === 'dark') { tone(80, 0.5, 'sawtooth', 0.08, 0.5, 0, sfxBus, 0.4); }
      else if (el === 'wood') { noise(0.25, 0.15, 'bandpass', 600, 300, 2); }
      else if (el === 'light') { [1047, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.05, 1, i * 0.05, sfxBus, 0.6)); }
      else if (el === 'ice') { [1760, 2349, 3136].forEach((f, i) => tone(f, 0.35, 'sine', 0.05, 1.02, i * 0.03, sfxBus, 0.4)); noise(0.3, 0.08, 'highpass', 6000, 9000, 0.7); }
      else { noise(0.12, 0.12, 'highpass', 3000, 6000, 0.7); tone(1200, 0.08, 'square', 0.04, 0.5); }
      void s;
    },
    boom(s) {
      const k = big(s);
      tone(110, 0.5 + s * 0.05, 'sine', 0.5 * k, 0.35);
      noise(0.9 + Math.min(2.5, s * 0.25), 0.55 * k, 'lowpass', 1400, 90, 0.7, 0, true, 0.35, 0.006);
      noise(0.35, 0.3 * k, 'bandpass', 2500, 400, 0.8);
      for (let i = 0; i < 6; i++) noise(0.04, 0.12 * k, 'highpass', 3000, 3000, 1, 0.08 + Math.random() * 0.7);
    },
    ice(s) {
      const k = big(s);
      noise(0.2, 0.3 * k, 'highpass', 4000, 1800, 1.5);
      tone(160, 0.2, 'sine', 0.25 * k, 0.5);
      [2637, 3136, 3520, 4186, 3951].forEach((f, i) => tone(f * (0.98 + Math.random() * 0.04), 0.5, 'sine', 0.04, 1, 0.02 + i * 0.04, sfxBus, 0.6));
    },
    shatter(s) {
      const k = big(s);
      for (let i = 0; i < 7; i++) noise(0.06, 0.15 * k, 'highpass', 5000, 4000, 2, i * 0.025);
      [4186, 3520, 4699, 3951, 5274].forEach((f, i) => tone(f, 0.35, 'triangle', 0.03, 1, 0.03 + i * 0.03, sfxBus, 0.6));
    },
    thunder(s) {
      const k = big(s);
      noise(0.18, 0.7 * k, 'highpass', 1500, 600, 0.6, 0, false, 0.4, 0.001);
      noise(0.08, 0.5 * k, 'lowpass', 6000, 2000, 0.5, 0.02);
      noise(1.8 + Math.min(3, s * 0.3), 0.45 * k, 'lowpass', 400, 60, 0.8, 0.1, true, 0.5, 0.15);
      tone(55, 0.9, 'sawtooth', 0.08 * k, 0.7, 0.05);
    },
    wave(s) {
      const k = big(s);
      noise(1.6 + Math.min(1.5, s * 0.08), 0.45 * k, 'lowpass', 300, 1800, 0.7, 0, true, 0.3, 0.4);
      noise(1.2, 0.25 * k, 'highpass', 2500, 5000, 0.6, 0.3, false, 0.3, 0.3);
    },
    gravity(s) {
      const k = big(s);
      tone(70, 1.0, 'sawtooth', 0.12 * k, 0.4, 0, sfxBus, 0.5);
      tone(40, 1.1, 'sine', 0.35 * k, 0.8);
      noise(0.9, 0.2 * k, 'lowpass', 200, 900, 2, 0, true, 0.4, 0.6);
    },
    wood(s) {
      const k = big(s);
      noise(0.7, 0.45 * k, 'lowpass', 900, 120, 0.9, 0, true, 0.3, 0.01);
      for (let i = 0; i < 6; i++) noise(0.08, 0.2 * k, 'bandpass', 700 + Math.random() * 600, 300, 2, 0.05 + i * 0.06);
      tone(90, 0.4, 'sine', 0.3 * k, 0.5);
    },
    light(s) {
      const k = big(s);
      [523, 784, 1047, 1568, 2093].forEach((f, i) => tone(f, 1.6, 'sine', 0.06 * k, 1, i * 0.04, sfxBus, 0.9));
      noise(1.2, 0.18 * k, 'highpass', 4000, 8000, 0.5, 0, false, 0.6, 0.05);
    },
    dark(s) {
      const k = big(s);
      tone(55, 2.0, 'sawtooth', 0.1 * k, 0.7, 0, sfxBus, 0.8);
      tone(58, 2.0, 'sawtooth', 0.08 * k, 0.7, 0, sfxBus, 0.8);
      noise(1.8, 0.2 * k, 'lowpass', 300, 120, 3, 0, true, 0.6, 0.3);
    },
    hit() { noise(0.08, 0.2, 'bandpass', 900, 300, 1.2); tone(140, 0.08, 'sine', 0.15, 0.6); },
    enemyDie() { tone(420, 0.35, 'triangle', 0.1, 0.35); noise(0.3, 0.12, 'lowpass', 2000, 200, 1); },
    hurt() { tone(180, 0.18, 'square', 0.1, 0.6); noise(0.12, 0.2, 'bandpass', 700, 250, 1.5); },
    heal() { [660, 880, 1320].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, 1, i * 0.08, sfxBus, 0.5)); },
    coin() { tone(1319, 0.08, 'square', 0.05); tone(1760, 0.18, 'square', 0.05, 1, 0.07, sfxBus, 0.3); },
    error() { tone(200, 0.15, 'square', 0.07); tone(160, 0.2, 'square', 0.07, 1, 0.12); },
    click() { tone(900, 0.04, 'triangle', 0.05); },
    jump() { tone(300, 0.15, 'sine', 0.06, 1.8); },
    talk() { tone(620 + Math.random() * 90, 0.035, 'triangle', 0.035); },
    quest() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.08, 1, i * 0.1, sfxBus, 0.5)); },
    levelup() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, 'triangle', 0.09, 1, i * 0.08, sfxBus, 0.6));
      [1047, 1319, 1568].forEach((f) => tone(f, 1.2, 'sine', 0.05, 1, 0.45, sfxBus, 0.8));
    },
    warp() { tone(300, 0.8, 'sine', 0.08, 4, 0, sfxBus, 0.8); noise(0.8, 0.08, 'bandpass', 500, 4000, 3, 0, false, 0.6); }
  };
})();

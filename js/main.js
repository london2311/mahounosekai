'use strict';
/* =========================================================
   ゲーム全体の進行
   ========================================================= */
const GAME = { paused: true, started: false, inDungeon: false, dead: false, time: 0, ready: false };
let player = null;
const cam = { yaw: 0, pitch: CONFIG.camera.pitch, dist: CONFIG.camera.distance, lastDrag: -10, shake: 0 };

function shakeCamera(a) { cam.shake = Math.max(cam.shake, a); }

/* ---------- 移動・転移 ---------- */
function teleport(x, z) {
  player.pos.set(x, groundAt(x, z) + 0.2, z);
  player.vel.set(0, 0, 0); player.vy = 0;
  for (let i = 0; i < 12; i++) if (!updateChunks(x, z, 3)) break;
  updateCamera(0, true);
}
function warpTo(id) {
  const w = WARPS.find(v => v.id === id);
  if (!w) return;
  fadeOut(() => {
    if (GAME.inDungeon) setDungeonMode(false);
    teleport(w.x + 2.5, w.z + 2.5);
    toast(`${w.name}へ転移した`);
  }, 500);
}
function setDungeonMode(on) {
  GAME.inDungeon = on;
  sky.visible = !on; sea.visible = !on;
  scene.fog.color.set(on ? 0x0a0908 : SKY.horizon);
  scene.fog.near = on ? 6 : CONFIG.fogNear; scene.fog.far = on ? 75 : CONFIG.fogFar;
  scene.background.set(on ? 0x050505 : SKY.horizon);
  hemi.intensity = on ? 0.3 : 0.62;
  sun.intensity = on ? 0.15 : 1.05;
  const l = LIGHT_POOL[0];
  if (on) { l.color.setHex(0xffc68a); l.distance = 34; l.intensity = 1.6; }
  else { l.position.set(0, PLACE.start.fh + 1.2, 0); l.distance = 16; l.color.setHex(0xffa04a); }
  for (const c of CRYSTALS) if (!c.taken) { const inD = c.x > CONFIG.dungeonX - 1000; c.mesh.visible = c.glow.visible = inD === on; }
  cancelCast();
  FOCUS.target = null;
}
function enterDungeon(silent) {
  const go = () => {
    setDungeonMode(true);
    teleport(DUNGEON.start.x + 4, DUNGEON.start.z + 2);
    if (!silent) banner('古代遺跡・地下迷宮', '冷たい空気が肌を刺す…');
  };
  silent ? go() : fadeOut(go, 500);
}
function exitDungeon() {
  fadeOut(() => {
    setDungeonMode(false);
    const d = SPOTS.dungeonDoor;
    teleport(d.x, d.z + 3);
    toast('地上に戻った');
  }, 500);
}

/* ---------- 被ダメージ・力尽きる ---------- */
function damagePlayer(amount, src) {
  if (GAME.dead || player.hurtT > 0.35 || GAME.paused) return;
  const dmg = Math.max(1, Math.round(amount * 60 / (60 + STATE.def) * (0.9 + Math.random() * 0.2)));
  STATE.hp -= dmg;
  player.hurtT = 0.7;
  popNumber(player.pos.x, player.pos.y + 2.4, player.pos.z, fmt(dmg), '#ff5a5a', 'hurt');
  shakeCamera(0.25);
  SOUND.hurt();
  $('hurt').classList.remove('on'); void $('hurt').offsetWidth; $('hurt').classList.add('on');
  if (src && src.pos) {
    const kx = player.pos.x - src.pos.x, kz = player.pos.z - src.pos.z, kd = Math.hypot(kx, kz) || 1;
    player.vel.x += kx / kd * 6; player.vel.z += kz / kd * 6;
  }
  if (STATE.hp <= 0) die();
}
function die() {
  STATE.hp = 0;
  GAME.dead = true;
  cancelCast();
  $('dead').classList.add('show');
  setTimeout(() => {
    fadeOut(() => {
      $('dead').classList.remove('show');
      if (GAME.inDungeon) setDungeonMode(false);
      STATE.hp = STATE.maxHp; STATE.mp = STATE.aura;
      teleport(STATE.respawn.x, STATE.respawn.z);
      for (const e of ENEMIES) { e.aggro = false; if (e.alive) e.state = 'return'; }
      GAME.dead = false;
      toast('最後に休んだ場所で目を覚ました');
    }, 600);
  }, 2600);
}

/* ---------- 調べる・話す ---------- */
let interactTarget = null;
function findInteract() {
  if (GAME.dead) return null;
  const n = nearestNPC(3.4);
  let best = n ? { npc: n, d: Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z) } : null;
  for (const o of INTERACT) {
    const d = Math.hypot(o.x - player.pos.x, o.z - player.pos.z);
    if (d < o.r && (!best || d < best.d)) best = { obj: o, d, label: o.kind === 'warp' ? (STATE.warps.includes(o.ref.id) ? '転移石（地図を開く）' : o.label) : o.label };
  }
  return best;
}
function doInteract() {
  if (UI.dialog) { advanceDialog(); return; }
  if (GAME.paused || !interactTarget) return;
  const t = interactTarget;
  if (t.npc) { talkTo(t.npc); return; }
  const o = t.obj;
  if (o.kind === 'warp') activateWarp(o.ref);
  else if (o.kind === 'dungeon') enterDungeon();
  else if (o.kind === 'dungeonExit') exitDungeon();
}

/* ---------- 入力 ---------- */
const input = { x: 0, y: 0, run: false, jump: false };
const keys = new Set();
addEventListener('keydown', (e) => {
  if (!GAME.started) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys.add(e.code); return; }
  if (UI.dialog) {
    if (['Space', 'Enter', 'KeyE', 'KeyF'].includes(e.code)) advanceDialog();
    if (e.code === 'Escape' && UI.dialog.choices && UI.dialog.typing >= UI.dialog.full.length) {
      const last = UI.dialog.choices[UI.dialog.choices.length - 1]; closeDialog(); last.fn();
    }
    return;
  }
  if (UI.modal) {
    if (['Escape', 'KeyM', 'KeyI'].includes(e.code)) closePanel();
    return;
  }
  keys.add(e.code);
  switch (e.code) {
    case 'Space': input.jump = true; break;
    case 'Digit1': selectElement('fire'); break;
    case 'Digit2': selectElement('ice'); break;
    case 'Digit3': selectElement('thunder'); break;
    case 'KeyQ': toggleFocus(); break;
    case 'Tab': cycleTarget(); break;
    case 'KeyE': doInteract(); break;
    case 'KeyM': openMap(); break;
    case 'KeyI': case 'Escape': openMenu(); break;
    case 'KeyF': beginCast(); break;
  }
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'KeyF') releaseCast();
});
addEventListener('blur', () => { keys.clear(); cancelCast(); });

function readKeyboard() {
  const k = (c) => keys.has(c);
  const x = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
  const y = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  return { x, y, run: k('ShiftLeft') || k('ShiftRight') };
}
function selectElement(el) {
  if (MAGIC.charging) return;
  STATE.element = el;
  setElementUI();
  SOUND.cast(el, 0);
}
function toggleFocus() {
  FOCUS.on = !FOCUS.on;
  FOCUS.manual = false;
  if (!FOCUS.on) FOCUS.target = null;
  setFocusUI();
  toast(FOCUS.on ? 'オートフォーカス：ON（近くの敵を自動で狙う）' : 'オートフォーカス：OFF（視点の中心を狙う）');
}

const canvas = renderer.domElement;
const joyEl = $('joy'), knobEl = $('joyKnob');
const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
const drags = new Map();
let castPointer = null;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  SOUND.init();
  if (!GAME.started) return;
  if (UI.dialog) { advanceDialog(); return; }
  if (GAME.paused) return;
  canvas.setPointerCapture(e.pointerId);
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && joy.id === null) {
    joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY;
    joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
    joyEl.style.display = 'block';
    return;
  }
  drags.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.pointerType === 'mouse' && e.button === 0) { castPointer = e.pointerId; beginCast(); }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joy.x = dx / max; joy.y = -dy / max;
    knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    return;
  }
  const d = drags.get(e.pointerId);
  if (!d) return;
  cam.yaw -= (e.clientX - d.x) * 0.006;
  cam.pitch = clamp(cam.pitch + (e.clientY - d.y) * 0.004, -0.2, 1.3);
  if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 1) cam.lastDrag = GAME.time;
  d.x = e.clientX; d.y = e.clientY;
});
const endPointer = (e) => {
  if (e.pointerId === joy.id) {
    joy.id = null; joy.x = joy.y = 0;
    joyEl.style.display = 'none'; knobEl.style.transform = '';
  }
  drags.delete(e.pointerId);
  if (e.pointerId === castPointer) { castPointer = null; releaseCast(); }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.001), CONFIG.camera.minDist, maxCamDist());
}, { passive: false });
// 2本指でズーム
const pinch = { d: 0 };
canvas.addEventListener('touchmove', (e) => {
  const ts = [...e.touches].filter(t => t.clientX >= innerWidth * 0.45);
  if (ts.length === 2) {
    const d = Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    if (pinch.d) cam.dist = clamp(cam.dist * pinch.d / d, CONFIG.camera.minDist, maxCamDist());
    pinch.d = d;
  } else pinch.d = 0;
}, { passive: true });

function holdButton(el, down, up) {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); SOUND.init(); el.setPointerCapture(e.pointerId); down(); });
  const u = (e) => { e.preventDefault(); up && up(); };
  el.addEventListener('pointerup', u);
  el.addEventListener('pointercancel', u);
}
holdButton($('castBtn'), () => beginCast(), () => releaseCast());
holdButton($('jumpBtn'), () => { input.jump = true; });
holdButton($('focusBtn'), () => { if (FOCUS.on && FOCUS.target) cycleTarget(); else toggleFocus(); });
$('focusBtn').addEventListener('dblclick', () => toggleFocus());
holdButton($('talkBtn'), () => doInteract());
document.querySelectorAll('.elbtn').forEach(b => holdButton(b, () => selectElement(b.dataset.el)));
$('mapBtn').addEventListener('click', () => { if (!GAME.paused) openMap(); });
$('menuBtn').addEventListener('click', () => { if (!GAME.paused) openMenu(); });
$('dialog').addEventListener('click', () => advanceDialog());

/* ---------- カメラ ---------- */
function maxCamDist() { return CONFIG.camera.maxDist + auraRadius() * 3; }
const camTarget = new THREE.Vector3();
function updateCamera(dt, snap) {
  // オートフォーカス中は狙った敵が画面に入るよう少し回す
  const t = FOCUS.target;
  const casting = MAGIC.charging || GAME.time - (MAGIC.lastCast || -99) < 1.5;
  if (t && FOCUS.on && casting && GAME.time - cam.lastDrag > 1.2 && dt > 0) {
    const want = Math.atan2(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
    if (angleDiff(cam.yaw, want) > 0.35) cam.yaw = angleLerp(cam.yaw, want, Math.min(1, dt * 1.8));
  }
  const R = auraRadius();
  camTarget.set(player.pos.x, player.pos.y + 1.6 + Math.max(0, R - 1) * 0.3, player.pos.z);
  const dist = Math.max(cam.dist, Math.min(maxCamDist(), 3 + R * 2.2));
  const cp = Math.cos(cam.pitch);
  const want = tmpV2.set(
    camTarget.x + Math.sin(cam.yaw) * cp * dist,
    camTarget.y + Math.sin(cam.pitch) * dist,
    camTarget.z + Math.cos(cam.yaw) * cp * dist
  );
  want.y = Math.max(want.y, groundAt(want.x, want.z) + 0.6, GAME.inDungeon ? 0.6 : waterAt(want.x, want.z) + 0.3);
  if (GAME.inDungeon) want.y = Math.min(want.y, 7.2);
  if (snap) camera.position.copy(want);
  else camera.position.lerp(want, 1 - Math.exp(-14 * dt));
  camera.lookAt(camTarget);
  if (cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * cam.shake;
    camera.position.y += (Math.random() - 0.5) * cam.shake;
    cam.shake = Math.max(0, cam.shake - dt * 1.5);
  }
}

/* ---------- 目的地の印 ---------- */
const questMark = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd84a'; g.strokeStyle = '#5a3a0a'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(32, 58); g.lineTo(10, 22); g.lineTo(54, 22); g.closePath(); g.stroke(); g.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, sizeAttenuation: false, transparent: true }));
  s.scale.set(0.045, 0.045, 1);
  s.renderOrder = 20;
  scene.add(s);
  return s;
})();
function updateQuestMark(t) {
  const m = questMarker();
  if (!m || !GAME.started) { questMark.visible = false; return; }
  const s = mainStep();
  const n = s.talk ? NPC_BY_ID[s.talk] : null;
  const inD = m.x > CONFIG.dungeonX - 1000;
  questMark.visible = inD === GAME.inDungeon && (!n || n.root.visible || Math.hypot(m.x - player.pos.x, m.z - player.pos.z) > 150);
  const y = n ? n.pos.y + 3.2 : groundAt(m.x, m.z) + 4;
  questMark.position.set(m.x, y + Math.sin(t * 3) * 0.2, m.z);
}

/* ---------- ループ ---------- */
const clock = new THREE.Clock();
let titleAngle = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (GAME.ready) {
    if (GAME.started) frame(dt, t);
    else titleFrame(dt, t);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
function titleFrame(dt, t) {
  titleAngle += dt * 0.06;
  const r = 34, y = PLACE.start.fh;
  camera.position.set(Math.sin(titleAngle) * r, y + 9, Math.cos(titleAngle) * r);
  camera.lookAt(0, y + 2, 0);
  updateChunks(camera.position.x, camera.position.z, 1);
  for (const f of ANIM) f(dt, t);
  updateParticles(dt);
  sun.position.set(0, 0, 0).addScaledVector(sunDir, 150);
  sun.target.position.set(0, 0, 0);
  sky.position.copy(camera.position);
}
function frame(dt, t) {
  updateDialog(dt);
  if (!GAME.paused) {
    GAME.time += dt;
    STATE.playTime += dt;
    const kb = readKeyboard();
    input.x = GAME.dead ? 0 : clamp(kb.x + joy.x, -1, 1);
    input.y = GAME.dead ? 0 : clamp(kb.y + joy.y, -1, 1);
    input.run = kb.run || Math.hypot(joy.x, joy.y) > 0.92;
    updateCharge(dt);
    player.update(dt, input, cam.yaw, t, MAGIC.charging);
    // 自然回復
    const inCombat = ENEMIES.some(e => e.aggro && e.active);
    STATE.mp = Math.min(STATE.aura, STATE.mp + STATE.aura * (MAGIC.charging ? 0 : inCombat ? 0.035 : 0.08) * dt);
    if (!inCombat && !GAME.dead) STATE.hp = Math.min(STATE.maxHp, STATE.hp + STATE.maxHp * 0.015 * dt);
    updateFocus(dt);
    updateEnemies(dt, t);
    updateNPCs(dt, t);
    updateProjectiles(dt);
    updateEnemyShots(dt);
    for (const c of CRYSTALS) {
      if (!c.taken && Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 1.8 && Math.abs(c.y + 1.3 - player.pos.y - 1) < 3) takeCrystal(c);
    }
    interactTarget = findInteract();
    setInteractHint(interactTarget);
    // 世界の外に落ちたら戻す
    if (player.pos.y < -60) teleport(STATE.respawn.x, STATE.respawn.z);
  }
  updateCamera(dt, false);
  updateChunks(player.pos.x, player.pos.z, 1);
  updateAura(dt, t);
  updateParticles(dt);
  updateFx(dt);
  updateLights(dt);
  for (const f of ANIM) f(dt, t);
  if (GAME.inDungeon) LIGHT_POOL[0].position.set(player.pos.x, player.pos.y + 3, player.pos.z);
  sun.position.copy(player.pos).addScaledVector(sunDir, 150);
  sun.target.position.copy(player.pos);
  sky.position.copy(camera.position);
  sea.position.x = Math.round(player.pos.x / 100) * 100;
  sea.position.z = Math.round(player.pos.z / 100) * 100;
  sea.position.y = CONFIG.waterLevel + Math.sin(t * 0.8) * 0.04;
  updateHUD(dt);
  updateLabels(dt);
  updateQuestMark(t);
  // 自動記録
  GAME.autosave = (GAME.autosave || 0) + dt;
  if (GAME.autosave > 60 && !GAME.paused && !GAME.dead) { GAME.autosave = 0; saveGame(true); }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (UI.modal === 'map') drawBigMap();
});

/* ---------- はじまり ---------- */
async function boot() {
  const bar = $('loadbar'), msg = $('loadmsg');
  const progress = (p, m) => { bar.style.width = (p * 100).toFixed(1) + '%'; if (m) msg.textContent = m; };
  progress(0.02, '世界を生み出しています…');
  await new Promise(r => setTimeout(r, 30));
  await generateWorld(progress);
  progress(0.9, '町を建てています…');
  await new Promise(r => setTimeout(r, 0));
  initChunks();
  buildWaterBodies();
  buildAllPlaces();
  buildMapImage();
  progress(0.95, '人々を呼んでいます…');
  await new Promise(r => setTimeout(r, 0));
  player = new Player();
  player.pos.y = groundAt(player.pos.x, player.pos.z);
  spawnNPCs();
  spawnAllEnemies();
  computeStats();
  STATE.mp = STATE.aura; STATE.hp = STATE.maxHp;
  for (let i = 0; i < 40; i++) if (!updateChunks(0, 0, 4)) break;
  progress(1, '準備ができました');
  GAME.ready = true;
  $('loading').classList.add('done');
  $('title').classList.add('show');
  $('continueBtn').disabled = !hasSave();
  setElementUI(); setFocusUI();
}
function startGame(cont) {
  SOUND.init();
  $('title').classList.remove('show');
  $('ui').classList.add('show');
  GAME.started = true;
  GAME.paused = false;
  player.root.visible = true;
  if (cont) {
    const data = loadSave();
    if (data) applySave(data);
    else teleport(CONFIG.spawn.x, CONFIG.spawn.z);
    banner(`クエスト：${mainStep().title}`, mainStep().obj);
  } else {
    teleport(CONFIG.spawn.x, CONFIG.spawn.z);
    cam.yaw = 0;
    player.facing = Math.PI;
    banner('マホウノセカイ', 'はじまりの丘 — 焚き火のそばで目を覚ました');
  }
  setElementUI(); setFocusUI();
  updateCamera(0, true);
}
$('newBtn').addEventListener('click', () => {
  if (hasSave() && !confirm('記録が残っています。最初から始めると上書きされます。よろしいですか？')) return;
  startGame(false);
});
$('continueBtn').addEventListener('click', () => startGame(true));

requestAnimationFrame(tick);
boot().catch((err) => {
  console.error(err);
  $('loadmsg').textContent = 'エラーが発生しました：' + err.message;
});

// Claude Code などで拡張するときの入口（コンソールから触れる）
window.game = { THREE, scene, camera, renderer, CONFIG, STATE, GAME, PLACES, NPCS, ENEMIES, get player() { return player; },
  heightAt: genHeight, terrainHeight, groundAt, addCollider, teleport, warpTo, gainExp };

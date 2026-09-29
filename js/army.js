'use strict';
/* =========================================================
   帝国の大軍勢（何千人もの兵を軽く描く）・壊せる敵の建物・戦場の亡骸
   ========================================================= */

/* ---------- 血の跡のテクスチャ ---------- */
const bloodTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const R = mulberry32(31);
  g.fillStyle = 'rgba(92,6,8,0.95)';
  for (let k = 0; k < 18; k++) {
    const a = R() * 6.28, r = R() * 26;
    g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 8 + R() * 18, 0, 7); g.fill();
  }
  for (let k = 0; k < 40; k++) {
    const a = R() * 6.28, r = 30 + R() * 30;
    g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1 + R() * 4, 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(40,0,2,0.5)';
  for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(40 + R() * 48, 40 + R() * 48, 6 + R() * 10, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  return t;
})();

// 地面に貼る血の跡（静的にまとめて1つのメッシュへ）
class DecalBatch {
  constructor() { this.pos = []; this.uv = []; this.idx = []; this.n = 0; }
  add(x, z, size, rot = Math.random() * 6.28, lift = 0.05) {
    const y = groundAt(x, z) + lift + Math.random() * 0.02;
    const c = Math.cos(rot) * size, s = Math.sin(rot) * size;
    const pts = [[-c + s, -s - c], [c + s, s - c], [c - s, s + c], [-c - s, -s + c]];
    const b = this.n;
    for (const [dx, dz] of pts) this.pos.push(x + dx, y, z + dz);
    this.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    this.idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    this.n += 4;
  }
  mesh(tex = bloodTex, opacity = 0.92) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }));
    m.renderOrder = 2;
    return m;
  }
}

/* ---------- 横たわる亡骸（王都などに最初からあるもの） ---------- */
// 見た目の型ごとに InstancedMesh にまとめて描く
const CORPSE_LOOKS = {
  ally: { skin: 0xe8b88e, hair: 0x4a3222, top: 0x2a4a8a, bottom: 0x4a4a5a, armor: 0xa9b0b8, shoes: 0x2a2018, female: false, blood: true },
  enemy: { skin: 0xd9a47a, hair: 0x2a1f1a, top: 0x6a1010, bottom: 0x2a2622, armor: 0x3e3e48, hat: 'helmet', hatColor: 0x34343c, shoes: 0x1e1a16, female: false },
  civ0: { skin: 0xf0c9a0, hair: 0x4a3222, top: 0x7a4a3a, bottom: 0x4a3a2a, female: false, blood: true },
  civ1: { skin: 0xe8b88e, hair: 0x2a1f1a, top: 0x3f6a8a, dress: 0x3f6a8a, hairStyle: 'long', female: true, blood: true },
  civ2: { skin: 0xd9a47a, hair: 0x7a5230, top: 0x5d7a3a, bottom: 0x3a3228, female: false, blood: true },
  civ3: { skin: 0xf0c9a0, hair: 0xb88a4a, top: 0x9a3b3b, dress: 0x6a4a7a, hairStyle: 'bun', female: true, blood: true },
  civ4: { skin: 0xc68a5e, hair: 0x1c1c24, top: 0x8a6a3a, bottom: 0x4a4a6a, female: false, blood: true },
  civ5: { skin: 0xe8b88e, hair: 0x8a3b22, top: 0xa8743a, dress: 0xa8743a, hairStyle: 'pony', female: true, blood: true }
};
const STATIC_CORPSE = new Map();
function corpse(B, x, z, ry, o = {}) {
  const y = groundAt(x, z);
  let look;
  if (o.armor) look = o.cloth === 0x2a4a8a ? 'ally' : 'enemy';
  else look = 'civ' + (Math.abs(hashStr(String(o.cloth) + String(o.hair))) % 6);
  let v = Math.random() < 0.35 ? 4 : 0;
  const lost = o.lost || '';
  if (lost.includes('arm') || lost.includes('leg')) v = 2;
  if (o.noHead || (o.armor && Math.random() < 0.15)) v = 1;
  if (o.crushed) v = 3;
  const key = look + '_' + v;
  if (!STATIC_CORPSE.has(key)) STATIC_CORPSE.set(key, { look, v, list: [] });
  STATIC_CORPSE.get(key).list.push([x, y + 0.02, z, ry]);
  if (o.weapon) { const [ox, oz] = rotXZ(0.9, 0.2, ry); B.box(x + ox, y + 0.05, z + oz, 0.08, 0.05, 1.6, 0x9aa0a8, ry + 0.5); }
  if (o.arrows) for (let k = 0; k < o.arrows; k++) { const [ox, oz] = rotXZ((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.7, ry); B.box(x + ox, y + 0.35, z + oz, 0.03, 0.8, 0.03, 0x5a4028, 0, 0.3, 0.2); }
  // 切り離された手足がそばに転がる
  if (v === 2 || v === 1) {
    const [fx, fz] = rotXZ((Math.random() - 0.5) * 3, 1.2 + Math.random() * 1.5, ry);
    STATIC_GIBS.push([x + fx, z + fz, Math.random() * 6.28, v === 1 ? 'head' : (Math.random() < 0.5 ? 'arm' : 'leg'), look]);
  }
}
const STATIC_GIBS = [];
const CORPSE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.03 });
// 置いた亡骸を描く（王都を組み立て終えた時に呼ぶ）
function flushStaticCorpses() {
  const out = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(BODY_SCALE, BODY_SCALE, BODY_SCALE), p = new THREE.Vector3(), eu = new THREE.Euler();
  for (const { look, v, list } of STATIC_CORPSE.values()) {
    const geo = corpseGeometry(CORPSE_LOOKS[look], v);
    const m = new THREE.InstancedMesh(geo, CORPSE_MAT, list.length);
    list.forEach(([x, y, z, ry], i) => { eu.set(0, ry, 0); q.setFromEuler(eu); m.setMatrixAt(i, m4.compose(p.set(x, y, z), q, sc)); });
    m.receiveShadow = true; m.frustumCulled = false;
    scene.add(m); out.push(m);
  }
  STATIC_CORPSE.clear();
  const byKind = {};
  for (const g of STATIC_GIBS) { const k = g[3] + '_' + (g[4].startsWith('civ') ? 'civ' : g[4]); (byKind[k] = byKind[k] || []).push(g); }
  for (const [k, list] of Object.entries(byKind)) {
    const [which, look] = k.split('_');
    const geo = gibGeometryLook(look === 'civ' ? CORPSE_LOOKS.civ0 : CORPSE_LOOKS[look], which);
    const m = new THREE.InstancedMesh(geo, CORPSE_MAT, list.length);
    list.forEach(([x, z, r], i) => { eu.set(Math.PI / 2 * (which === 'head' ? 0.3 : 1), r, 0); q.setFromEuler(eu); m.setMatrixAt(i, m4.compose(p.set(x, groundAt(x, z) + 0.1, z), q, sc)); });
    m.frustumCulled = false; scene.add(m); out.push(m);
  }
  STATIC_GIBS.length = 0;
  return out;
}

/* =========================================================
   壊せる敵の建物（天幕・攻城塔・投石器・帝国の家や城壁）
   ========================================================= */
const STRUCTS = [];
// 物語の進み具合に応じた切り替え（story.js が書き換える）
const STORY_FLAGS = { liberated: false, palaceOpen: false, armyAwake: () => true };
function makeStructure(o, buildFn) {
  const B = new Builder();
  const before = scene.children.length;
  const cols = captureColliders(() => buildFn(B));
  const extras = scene.children.slice(before);        // 看板など
  const mesh = B.mesh();
  scene.add(mesh);
  const s = Object.assign({ mesh, cols, extras, alive: true, hp: 3000, r: 4, name: '帝国の建物', protect: false }, o);
  s.maxHp = s.hp;
  STRUCTS.push(s);
  return s;
}
function damageStructs(x, z, R, power) {
  let n = 0;
  for (const s of STRUCTS) {
    if (!s.alive || s.protect) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d > R + s.r) continue;
    s.hp -= power * (1 - 0.4 * clamp(d / (R + s.r), 0, 1));
    if (s.hp <= 0) { destroyStruct(s); n++; }
  }
  if (n) { STATE.structKills = (STATE.structKills || 0) + n; toast(`帝国の建物を${n}つ破壊した`, 'kill'); }
  return n;
}
function destroyStruct(s) {
  s.alive = false;
  removeColliders(s.cols);
  for (const e of s.extras) e.visible = false;
  const m = s.mesh;
  const y0 = m.position.y;
  const tilt = (Math.random() - 0.5) * 0.4;
  addFx(new THREE.Object3D(), 1.2, (t) => {
    m.position.y = y0 - t * t * s.r * 1.2;
    m.rotation.z = tilt * t;
    if (t > 0.97) m.visible = false;
  });
  const gy = groundAt(s.x, s.z);
  spray(PS, 25 + s.r * 3, s.x, gy + s.r * 0.5, s.z, { radius: s.r, speed: s.r * 1.5 + 3, up: s.r + 4, life: 1.5, size: 0.25 + s.r * 0.05,
    c0: 0x4a3a2a, c1: 0x2a221a, alpha: 0.95, grav: 12, drag: 0.4, cap: 120 });
  spray(PS, 14 + s.r * 2, s.x, gy + 1, s.z, { radius: s.r * 0.8, speed: 2, up: 2, life: 3, size: s.r * 0.6, grow: s.r * 0.4,
    c0: 0x6a6056, c1: 0x9a9088, alpha: 0.55, grav: -0.5, drag: 1.2, fade: 1, cap: 80 });
  SOUND.boom(1 + s.r * 0.2);
  // しばらく燃え続ける
  FIRES.push({ x: s.x, y: gy + 1, z: s.z, s: Math.min(4, 1 + s.r * 0.3), life: 12 + Math.random() * 8 });
  s.onDestroy && s.onDestroy(s);
}
// 一時的な炎（壊れた建物など）
const FIRES = [];
function updateTempFires(dt) {
  for (let i = FIRES.length - 1; i >= 0; i--) {
    const f = FIRES[i];
    f.life -= dt;
    if (f.life <= 0) { FIRES.splice(i, 1); continue; }
    if (Math.hypot(f.x - player.pos.x, f.z - player.pos.z) > 140) continue;
    emitFire(f.x, f.y, f.z, f.s * Math.min(1, f.life / 4), dt);
  }
}
function emitFire(x, y, z, s, dt) {
  if (Math.random() < dt * 30) PF.spawn(x + (Math.random() - 0.5) * s, y + Math.random() * s * 0.3, z + (Math.random() - 0.5) * s,
    (Math.random() - 0.5) * 0.4, 1.2 + s * 0.4, (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.4, s * (0.6 + Math.random() * 0.5),
    0xffd48a, 0x901804, 0.8, -1.5, 0.8, -s * 0.3);
  if (Math.random() < dt * 6) PS.spawn(x, y + s * 0.8, z, (Math.random() - 0.5) * 0.4, 1.4 + s * 0.2, (Math.random() - 0.5) * 0.4,
    2.8 + Math.random(), s * 0.8, 0x1e1a18, 0x5a5652, 0.5, -0.4, 0.4, s * 0.9, 1);
  if (Math.random() < dt * 4) PG.spawn(x, y + s * 0.5, z, (Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2, 1.2, 0.05, 0xffc060, 0xff4a0a, 1, -0.5, 0.5);
}

/* =========================================================
   大軍勢
   ========================================================= */
const ARMY_KINDS = {
  soldier: { name: '帝国兵', hp: 320, atk: 45, speed: 3.4, reach: 1.5, cd: 1.4, exp: 3, gold: 2 },
  heavy:   { name: '帝国重装兵', hp: 1100, atk: 110, speed: 2.6, reach: 1.8, cd: 1.8, exp: 8, gold: 5, scale: 1.08 },
  archer:  { name: '帝国弓兵', hp: 260, atk: 35, speed: 3.2, reach: 34, cd: 2.8, exp: 3, gold: 2, ranged: true },
  ally:    { name: '王国兵', hp: 1e9, atk: 0, speed: 0, reach: 1.5, cd: 1.4 }
};
function farGeo() {
  const B = new Builder();
  B.box(0, 0.9, 0, 0.62, 1.8, 0.4, 0xffffff);
  B.sphere(0, 2.0, 0, 0.26, 0xd8d8d8, 1, 1.1, 1);
  B.box(0.5, 1.6, 0, 0.06, 2.6, 0.06, 0xa0a0a0);
  return B.geometry();
}

const ARMY = {
  units: [], groups: [], kills: 0, zoneKills: {},
  cap: IS_TOUCH ? 700 : 1400, farCap: IS_TOUCH ? 2500 : 4200, near: IS_TOUCH ? 60 : 80
};
const _am = new THREE.Matrix4(), _aq = new THREE.Quaternion(), _ae = new THREE.Euler(), _ap = new THREE.Vector3(), _as = new THREE.Vector3(), _ac = new THREE.Color();

const GORE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.03 });
function initArmyMeshes() {
  const mk = (geo, n, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // 色の配列は count の数で作られるので、count を 0 にする前に全員ぶん白で埋める
    _ac.setRGB(1, 1, 1);
    for (let i = 0; i < n; i++) m.setColorAt(i, _ac);
    m.count = 0; m.castShadow = true; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  // 動く兵（手足は頂点シェーダで振る）
  const crowd = (kind, n) => {
    const geo = crowdGeometry(kind).geometry(false);
    const anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2);
    anim.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('anim', anim);
    const m = mk(geo, n, crowdMaterial());
    m.anim = anim;
    return m;
  };
  ARMY.mMelee = crowd('soldier', ARMY.cap);
  ARMY.mHeavy = crowd('heavy', Math.floor(ARMY.cap / 3));
  ARMY.mArcher = crowd('archer', Math.floor(ARMY.cap / 3));
  ARMY.mAlly = crowd('ally', 300);
  ARMY.mFar = mk(farGeo(), ARMY.farCap, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  ARMY.mFar.castShadow = false;
  // 亡骸（型ごと。古いものから使い回す）
  ARMY.corpseCap = IS_TOUCH ? 500 : 1000;
  ARMY.corpses = [0, 1, 2, 3, 4].map(v => { const m = mk(corpseGeometry('soldier', v), ARMY.corpseCap, GORE_MAT); m.castShadow = false; m.receiveShadow = true; return { m, n: 0, i: 0 }; });
  // 血の跡
  ARMY.decalCap = IS_TOUCH ? 1600 : 3200;
  const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
  ARMY.mDecal = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), ARMY.decalCap);
  ARMY.mDecal.count = 0; ARMY.mDecal.frustumCulled = false; ARMY.mDecal.renderOrder = 2;
  scene.add(ARMY.mDecal);
  ARMY.decalN = 0; ARMY.decalI = 0;
  // 吹き飛ぶ体・ちぎれた首や手足
  ARMY.flyers = [];
  ARMY.mFly = mk(crowdGeometry('soldier').geometry(false), 160, GORE_MAT);
  ARMY.gibMesh = {};
  for (const w of ['head', 'arm', 'leg', 'upper']) ARMY.gibMesh[w] = mk(gibGeometry('soldier', w), 180, GORE_MAT);
  ARMY.limbs = [];
  ARMY.founts = [];
}

function addCorpse(x, z, ry, tint, crushed, variant = 0) {
  const C = ARMY.corpses[variant];
  const i = C.i; C.i = (C.i + 1) % ARMY.corpseCap;
  C.n = Math.min(ARMY.corpseCap, C.n + 1);
  _e.set(0, ry, 0); _aq.setFromEuler(_e);
  const s = BODY_SCALE;
  _am.compose(_ap.set(x, groundAt(x, z) + 0.02, z), _aq, _as.set(s, crushed ? s * 0.35 : s, s));
  C.m.setMatrixAt(i, _am);
  C.m.setColorAt(i, _ac.setHex(tint || 0xffffff));
  C.m.count = C.n;
  C.m.instanceMatrix.needsUpdate = true;
  C.m.instanceColor.needsUpdate = true;
}
function clearCorpses() {
  for (const C of ARMY.corpses) { C.n = 0; C.i = 0; C.m.count = 0; }
  ARMY.mDecal.count = 0; ARMY.decalN = 0;
  ARMY.limbs.length = 0;
}
function addBloodDecal(x, z, size) {
  const i = ARMY.decalI; ARMY.decalI = (ARMY.decalI + 1) % ARMY.decalCap;
  ARMY.decalN = Math.min(ARMY.decalCap, ARMY.decalN + 1);
  _e.set(0, Math.random() * 6.28, 0); _aq.setFromEuler(_e);
  _am.compose(_ap.set(x, groundAt(x, z) + 0.05 + Math.random() * 0.02, z), _aq, _as.set(size, 1, size));
  ARMY.mDecal.setMatrixAt(i, _am);
  ARMY.mDecal.count = ARMY.decalN;
  ARMY.mDecal.instanceMatrix.needsUpdate = true;
}
/* ---------- 血しぶき（とがった粒で） ---------- */
const bloodDropTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 15, 0, 7); g.fill();
  return new THREE.CanvasTexture(c);
})();
const PB = new Particles(IS_TOUCH ? 2200 : 4000, THREE.NormalBlending, bloodDropTex, 10);
function bloodSpray(x, y, z, n, speed, dirx = 0, dirz = 0) {
  n = Math.min(n, 60);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, u = Math.random();
    const sp = speed * (0.3 + Math.random() * 0.9);
    PB.spawn(x, y, z, Math.cos(a) * sp * (1 - u * 0.5) + dirx * speed * 0.6, sp * (0.4 + u * 0.8), Math.sin(a) * sp * (1 - u * 0.5) + dirz * speed * 0.6,
      0.6 + Math.random() * 0.7, 0.05 + Math.random() * 0.1, 0xa00a0a, 0x4a0204, 0.95, 12, 0.3, 0.02);
  }
  // 血の霧
  if (n > 8) PS.spawn(x, y, z, 0, 0.3, 0, 0.9, 0.5 + n * 0.02, 0x8a0a0a, 0x4a0404, 0.35, -0.2, 1.5, 1.2, 1);
}
function launchFlyer(x, y, z, vx, vy, vz, tint, ry, headless) {
  if (ARMY.flyers.length >= 160) return false;
  ARMY.flyers.push({ x, y, z, vx, vy, vz, rx: 0, ry, rz: 0, sx: (Math.random() - 0.5) * 8, sz: (Math.random() - 0.5) * 8, tint, headless });
  return true;
}
// ちぎれた部位を飛ばす（which: head / arm / leg / upper）
function launchLimb(x, y, z, speed, which = 'arm', dirx = 0, dirz = 0, tint = 0xffffff) {
  if (ARMY.limbs.length >= 400) ARMY.limbs.shift();
  const a = Math.random() * 6.28;
  ARMY.limbs.push({ which, x, y, z, vx: Math.cos(a) * speed * 0.6 + dirx * speed, vy: speed * 0.7 + 3 + Math.random() * 3, vz: Math.sin(a) * speed * 0.6 + dirz * speed,
    rx: Math.random() * 6, ry: a, rz: 0, sx: (Math.random() - 0.5) * 16, sz: (Math.random() - 0.5) * 16, life: 40, rest: false, bounced: false, tint });
}
// 首や手足を失った切り口から吹き出す血
function bloodFountain(x, y, z, dirx, dirz, t = 1.6) {
  if (ARMY.founts.length > 40) ARMY.founts.shift();
  ARMY.founts.push({ x, y, z, dx: dirx, dz: dirz, t, max: t });
}

/* ---------- 部隊を置く ---------- */
function addGroup(o) {
  // o: { zone, x, z, cols, rows, gap, face, kinds:{soldier,heavy,archer}, roam, r, ally }
  const g = { zone: o.zone, x: o.x, z: o.z, r: o.r || Math.max(o.cols, o.rows) * (o.gap || 2) + 20, units: [], ally: !!o.ally, roam: !!o.roam };
  const gap = o.gap || 2.1, face = o.face || 0;
  const R = mulberry32(hashStr(o.zone + o.x + o.z));
  const kinds = o.kinds || { soldier: 1 };
  const pool = [];
  for (const [k, w] of Object.entries(kinds)) for (let i = 0; i < Math.round(w * 10); i++) pool.push(k);
  for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
    let lx = (c - (o.cols - 1) / 2) * gap, lz = (r - (o.rows - 1) / 2) * gap;
    if (o.scatter) { lx += (R() - 0.5) * o.scatter; lz += (R() - 0.5) * o.scatter; }
    const [ox, oz] = rotXZ(lx, lz, face);
    const x = o.x + ox, z = o.z + oz;
    if (o.check && !o.check(x, z)) continue;
    const kind = o.ally ? 'ally' : pool[Math.floor(R() * pool.length)];
    const K = ARMY_KINDS[kind];
    const u = { g, kind, K, x, z, y: groundAt(x, z), hx: x, hz: z, face: face + (R() - 0.5) * 0.3, hp: K.hp, alive: true,
      state: 'idle', atk: R() * K.cd, phase: R() * 10, moving: 0, lean: 0, tx: x, tz: z, wait: R() * 5 };
    g.units.push(u);
    ARMY.units.push(u);
  }
  ARMY.groups.push(g);
  return g;
}
function zoneAlive(zone) {
  let n = 0;
  for (const g of ARMY.groups) if (g.zone === zone && !g.ally) for (const u of g.units) if (u.alive) n++;
  for (const e of ENEMIES) if (e.zone === zone && e.alive && !e.T.boss) n++;
  return n;
}

/* ---------- 動き ---------- */
const _hash = new Map();
function updateArmy(dt, t) {
  const px = player.pos.x, pz = player.pos.z;
  const inD = GAME.inDungeon;
  let nMelee = 0, nArcher = 0, nAlly = 0, nFar = 0, nHeavy = 0;
  const active = [];
  _hash.clear();
  let shooters = 0;
  for (const g of ARMY.groups) {
    g.active = !inD && Math.hypot(g.x - px, g.z - pz) < g.r + 420;
    if (!g.active) continue;
    for (const u of g.units) if (u.alive) active.push(u);
  }
  // 近い兵から順に処理（近いほど細かく動かす）
  for (const u of active) u.d = Math.hypot(u.x - px, u.z - pz);
  active.sort((a, b) => a.d - b.d);
  for (const u of active) {
    const K = u.K;
    u.phase += dt;
    if (u.kind === 'ally') {
      // 味方：近くの敵へ向いて戦う
      if (u.d < 160) {
        const e = u.foe && u.foe.alive && Math.hypot(u.foe.x - u.x, u.foe.z - u.z) < 8 ? u.foe : (u.foe = nearestFoe(u, 8));
        if (e) { u.face = angleLerp(u.face, Math.atan2(e.x - u.x, e.z - u.z), Math.min(1, dt * 6)); u.lean = Math.max(0, Math.sin(u.phase * 5)) * 0.35; }
        else u.lean = 0;
      }
    } else if (u.d < 260 && !GAME.dead && !CUT.active && STORY_FLAGS.armyAwake(u.g.zone)) {
      const aggroR = K.ranged ? 58 : 44;
      if (u.state !== 'chase' && u.d < aggroR) u.state = 'chase';
      if (u.state === 'chase' && u.d > aggroR * 2.2) u.state = 'return';
      if (u.state === 'chase') {
        const dx = px - u.x, dz = pz - u.z;
        u.face = angleLerp(u.face, Math.atan2(dx, dz), Math.min(1, dt * 8));
        const stop = K.ranged ? 26 : K.reach;
        if (u.d > stop) {
          const sp = K.speed * dt;
          u.x += dx / u.d * sp; u.z += dz / u.d * sp; u.moving = 1;
        } else u.moving = 0;
        u.atk -= dt;
        if (u.atk <= 0) {
          if (K.ranged) {
            if (u.d < K.reach + 10 && shooters < 14) {
              shooters++;
              u.atk = K.cd * (0.8 + Math.random() * 0.6);
              enemyShot(new THREE.Vector3(u.x, u.y + 1.6, u.z), new THREE.Vector3(px, player.pos.y + 1, pz), 30, K.atk, 0xd8c8a0, 0.18, { pos: u });
            }
          } else if (u.d < K.reach + 0.6 && player.pos.y - u.y < 2.6) {
            u.atk = K.cd * (0.8 + Math.random() * 0.4);
            u.lean = 0.5;
            damagePlayer(K.atk, { pos: u });
          }
        }
      } else if (u.state === 'return') {
        const dx = u.hx - u.x, dz = u.hz - u.z, d = Math.hypot(dx, dz);
        if (d < 1) { u.state = 'idle'; u.moving = 0; }
        else { u.x += dx / d * K.speed * dt; u.z += dz / d * K.speed * dt; u.face = Math.atan2(dx, dz); u.moving = 1; }
      } else if (u.g.roam) {
        u.wait -= dt;
        if (u.wait <= 0) { u.wait = 3 + Math.random() * 6; const a = Math.random() * 6.28, r = Math.random() * u.g.r * 0.5; u.tx = u.g.x + Math.cos(a) * r; u.tz = u.g.z + Math.sin(a) * r; }
        const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
        if (d > 0.6) { u.x += dx / d * 1.3 * dt; u.z += dz / d * 1.3 * dt; u.face = angleLerp(u.face, Math.atan2(dx, dz), Math.min(1, dt * 4)); u.moving = 0.5; }
        else u.moving = 0;
      } else {
        // 味方と向き合っていれば斬り合う
        const e = u.foe && Math.hypot(u.foe.x - u.x, u.foe.z - u.z) < 6 ? u.foe : (u.phase % 2 < dt * 2 ? (u.foe = nearestFoe(u, 6)) : null);
        if (e) { u.face = angleLerp(u.face, Math.atan2(e.x - u.x, e.z - u.z), Math.min(1, dt * 6)); u.lean = Math.max(0, Math.sin(u.phase * 4.3)) * 0.35; }
      }
      // 押し合い（近い兵だけ）
      if (u.d < 70 && u.moving) {
        const key = Math.floor(u.x / 1.5) * 73856 + Math.floor(u.z / 1.5);
        const o = _hash.get(key);
        if (o) { const ox = u.x - o.x, oz = u.z - o.z, od = Math.hypot(ox, oz) || 0.01; if (od < 0.9) { u.x += ox / od * 0.4; u.z += oz / od * 0.4; } }
        else _hash.set(key, u);
        _ap.set(u.x, 0, u.z); resolveCollisions(_ap, 0.35); u.x = _ap.x; u.z = _ap.z;
      }
      if (u.moving) u.y = groundAt(u.x, u.z, u.y);
    }
    u.lean = Math.max(0, u.lean - dt * 1.5);
    // 描画
    if (u.d > 430) continue;
    if (u.moving) u.walk = (u.walk || 0) + dt * K.speed * 2.1 * u.moving;
    const bob = u.moving ? Math.abs(Math.sin(u.walk)) * 0.05 : 0;
    const near = u.d < ARMY.near;
    const sc = (K.scale || 1) * (near ? BODY_SCALE : 1);
    _e.set(-u.lean, u.face, 0, 'YXZ'); _aq.setFromEuler(_e);
    _am.compose(_ap.set(u.x, u.y + bob, u.z), _aq, _as.set(sc, sc, sc));
    if (near) {
      let m = null, i = 0;
      if (u.kind === 'ally') { if (nAlly < 300) { m = ARMY.mAlly; i = nAlly++; } }
      else if (u.kind === 'archer') { if (nArcher < ARMY.mArcher.instanceMatrix.count) { m = ARMY.mArcher; i = nArcher++; } }
      else if (u.kind === 'heavy') { if (nHeavy < ARMY.mHeavy.instanceMatrix.count) { m = ARMY.mHeavy; i = nHeavy++; } }
      else if (nMelee < ARMY.cap) { m = ARMY.mMelee; i = nMelee++; }
      if (m) { m.setMatrixAt(i, _am); m.anim.setXY(i, u.walk || 0, Math.min(1, u.moving * 1.2)); }
    } else if (nFar < ARMY.farCap) {
      ARMY.mFar.setMatrixAt(nFar, _am);
      ARMY.mFar.setColorAt(nFar, _ac.setHex(u.kind === 'ally' ? 0x3a5aa0 : 0x6a1a1a));
      nFar++;
    }
  }
  for (const [m, n] of [[ARMY.mMelee, nMelee], [ARMY.mHeavy, nHeavy], [ARMY.mArcher, nArcher], [ARMY.mAlly, nAlly], [ARMY.mFar, nFar]]) {
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (m.anim) m.anim.needsUpdate = true;
  }
  updateFlyers(dt);
}
function nearestFoe(u, R) {
  let best = null, bd = R;
  for (const g of ARMY.groups) {
    if (!g.active || g.ally === (u.kind === 'ally')) continue;
    if (Math.hypot(g.x - u.x, g.z - u.z) > g.r + R) continue;
    for (const o of g.units) {
      if (!o.alive) continue;
      const d = Math.hypot(o.x - u.x, o.z - u.z);
      if (d < bd) { bd = d; best = o; }
    }
  }
  return best;
}
function updateFlyers(dt) {
  let n = 0;
  const S = BODY_SCALE;
  for (let i = ARMY.flyers.length - 1; i >= 0; i--) {
    const f = ARMY.flyers[i];
    f.vy -= 22 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    f.rx += f.sx * dt; f.rz += f.sz * dt;
    if (Math.random() < 0.6) PB.spawn(f.x, f.y + 1, f.z, (Math.random() - 0.5), 0.5, (Math.random() - 0.5), 0.7, 0.08, 0xa00a0a, 0x4a0204, 0.95, 10, 0.2);
    const gy = groundAt(f.x, f.z);
    if (f.y <= gy && f.vy < 0) {
      addCorpse(f.x, f.z, f.ry, f.tint, false, f.headless ? 1 : (Math.random() < 0.5 ? 0 : 4));
      addBloodDecal(f.x, f.z, 1.8 + Math.random() * 1.2);
      bloodSpray(f.x, gy + 0.3, f.z, 14, 3);
      ARMY.flyers.splice(i, 1);
      continue;
    }
    _e.set(f.rx, f.ry, f.rz); _aq.setFromEuler(_e);
    _am.compose(_ap.set(f.x, f.y, f.z), _aq, _as.set(S, S, S));
    ARMY.mFly.setMatrixAt(n, _am);
    ARMY.mFly.setColorAt(n, _ac.setHex(f.tint || 0xffffff));
    n++;
  }
  ARMY.mFly.count = n;
  ARMY.mFly.instanceMatrix.needsUpdate = true;
  if (ARMY.mFly.instanceColor) ARMY.mFly.instanceColor.needsUpdate = true;
  // ちぎれた首・手足
  const cnt = { head: 0, arm: 0, leg: 0, upper: 0 };
  for (let i = ARMY.limbs.length - 1; i >= 0; i--) {
    const l = ARMY.limbs[i];
    l.life -= dt;
    if (l.life <= 0) { ARMY.limbs.splice(i, 1); continue; }
    if (!l.rest) {
      l.vy -= 22 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
      l.rx += l.sx * dt; l.rz += l.sz * dt;
      // 血の尾を引いて飛ぶ
      if (Math.random() < 0.85) PB.spawn(l.x, l.y, l.z, (Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6, 0.6, 0.06 + Math.random() * 0.05, 0xa00a0a, 0x4a0204, 0.95, 9, 0.2);
      const gy = groundAt(l.x, l.z) + 0.1;
      if (l.y <= gy && l.vy < 0) {
        l.y = gy;
        addBloodDecal(l.x, l.z, 0.6 + Math.random() * 0.6);
        if (!l.bounced && l.vy < -5) { l.bounced = true; l.vy *= -0.3; l.vx *= 0.5; l.vz *= 0.5; l.sx *= 0.5; l.sz *= 0.5; bloodSpray(l.x, gy, l.z, 5, 2); }
        else { l.rest = true; l.rx = Math.PI / 2 * (l.which === 'head' ? 0.3 : 1); l.rz = (Math.random() - 0.5) * 0.4; }
      }
    }
    const M = ARMY.gibMesh[l.which];
    const k = cnt[l.which]++;
    if (k >= 180) continue;
    _e.set(l.rx, l.ry, l.rz); _aq.setFromEuler(_e);
    _am.compose(_ap.set(l.x, l.y, l.z), _aq, _as.set(S, S, S));
    M.setMatrixAt(k, _am);
    M.setColorAt(k, _ac.setHex(l.tint));
  }
  for (const [w, M] of Object.entries(ARMY.gibMesh)) {
    M.count = Math.min(180, cnt[w]);
    M.instanceMatrix.needsUpdate = true;
    if (M.instanceColor) M.instanceColor.needsUpdate = true;
  }
  // 切り口から噴き出す血
  for (let i = ARMY.founts.length - 1; i >= 0; i--) {
    const f = ARMY.founts[i];
    f.t -= dt;
    if (f.t <= 0) { ARMY.founts.splice(i, 1); continue; }
    const k = f.t / f.max;
    for (let j = 0; j < 3; j++) PB.spawn(f.x, f.y, f.z, f.dx * 2.5 * k + (Math.random() - 0.5) * 0.8, 2.5 + 3.5 * k * Math.random(), f.dz * 2.5 * k + (Math.random() - 0.5) * 0.8,
      0.7, 0.05 + Math.random() * 0.06, 0xb00c0c, 0x4a0204, 0.95, 10, 0.1);
    if (Math.random() < dt * 4) addBloodDecal(f.x + f.dx * 1.2 + (Math.random() - 0.5), f.z + f.dz * 1.2 + (Math.random() - 0.5), 0.5 + Math.random() * 0.5);
  }
}

/* ---------- 魔法で薙ぎ払う（味方には決して当たらない） ---------- */
// o: { el, pull:{x,z}, push:{x,z,force}, fling }
function damageArmy(x, z, R, power, el, o = {}) {
  let killed = 0;
  const hit = [];
  for (const g of ARMY.groups) {
    if (g.ally || !g.active) continue;
    if (Math.hypot(g.x - x, g.z - z) > g.r + R + 60) continue;
    for (const u of g.units) {
      if (!u.alive) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d > R) continue;
      const dmg = power * (1 - 0.5 * d / R);
      u.hp -= dmg;
      u.state = 'chase';
      if (u.hp <= 0) { killUnit(u, el, x, z, d, R, o); killed++; }
      else hit.push(u);
    }
  }
  if (killed) {
    ARMY.kills += killed;
    STATE.kills = (STATE.kills || 0) + killed;
    let exp = 0, gold = 0;
    exp = killed * 3; gold = killed * 2;
    gainExp(exp); STATE.gold += gold;
    if (killed >= 3) popNumber(x, groundAt(x, z) + 3 + Math.min(10, R * 0.2), z, `${fmt(killed)}人 撃破`, '#ffe08a', 'weak');
    else popNumber(x, groundAt(x, z) + 2.5, z, fmt(power), ELEM[el] ? ELEM[el].css : '#fff', '');
    onArmyKilled(killed);
  }
  return killed;
}
function killUnit(u, el, cx, cz, d, R, o) {
  u.alive = false;
  const zone = u.g.zone;
  ARMY.zoneKills[zone] = (ARMY.zoneKills[zone] || 0) + 1;
  goreKill(u.x, u.y, u.z, u.face, el, cx, cz, d, R, o, u.d < 140);
}
// 人が魔法で死ぬ（焼け焦げ・凍って砕ける・押し潰される・首や手足がちぎれ飛ぶ）
function goreKill(x, y, z, face, el, cx, cz, d, R, o = {}, near = true) {
  const dx = x - cx, dz = z - cz, dd = Math.hypot(dx, dz) || 1;
  const nx = dx / dd, nz = dz / dd;
  let tint = 0xffffff, corpseLeft = true, crushed = false, variant = Math.random() < 0.5 ? 0 : 4;
  const core = d < R * 0.45;      // 爆心に近い
  switch (el) {
    case 'fire': tint = core ? 0x2a2420 : 0x6a5a50; break;
    case 'thunder': tint = 0x3a3230; break;
    case 'ice': tint = 0xa8d8ff; if (Math.random() < 0.4) { corpseLeft = false; if (near) spray(PS, 10, x, y + 1, z, { speed: 4, up: 3, life: 1.2, size: 0.2, c0: 0xdff4ff, c1: 0x9ad0f0, alpha: 0.95, grav: 12, cap: 12 }); } break;
    case 'gravity': crushed = !core; if (core) variant = 3; break;
    case 'light': corpseLeft = false; if (near) spray(PS, 6, x, y + 1, z, { speed: 1, up: 2, life: 2, size: 0.4, grow: 0.5, c0: 0x6a6660, c1: 0xb8b4ae, alpha: 0.6, grav: -0.8, fade: 1, cap: 10 }); break;
    case 'dark': corpseLeft = false; if (near) spray(PS, 6, x, y + 0.5, z, { speed: 1, life: 1.4, size: 0.5, grow: 0.3, c0: 0x2a0a3a, c1: 0x0a000a, alpha: 0.8, grav: 1.5, fade: 1, cap: 10 }); break;
  }
  const bleeding = el !== 'light' && el !== 'dark' && !(el === 'ice' && !corpseLeft);
  if (!near) {
    if (corpseLeft) { addCorpse(x, z, face + (Math.random() - 0.5), tint, crushed, variant); if (bleeding) addBloodDecal(x, z, 1.4 + Math.random()); }
    return;
  }
  if (bleeding) bloodSpray(x, y + 1.3, z, 16, 5, nx, nz);
  const sp = 5 + Math.min(18, R * 0.35);
  // ちぎれる：首・腕・脚
  const tearing = { gravity: 0.7, wood: 0.65, water: 0.55, fire: 0.5, thunder: 0.35, ice: 0.3 }[el] || 0;
  let headless = false;
  if (bleeding && corpseLeft && Math.random() < tearing * (core ? 1.3 : 0.8)) {
    const r = Math.random();
    if (core && el !== 'ice' && r < 0.3) {
      // 体が引き裂かれる：上半身だけが飛び、残りは肉塊に
      launchLimb(x, y + 1.3, z, sp, 'upper', nx, nz, tint);
      launchLimb(x, y + 0.6, z, sp * 0.8, 'leg', nx, nz, tint);
      variant = -1;
      bloodFountain(x, y + 0.9, z, nx, nz, 1.2);
      addBloodDecal(x, z, 2.6 + Math.random());
      for (let k = 0; k < 3; k++) addBloodDecal(x + nx * (k + 1) * 1.3 + (Math.random() - 0.5), z + nz * (k + 1) * 1.3 + (Math.random() - 0.5), 1 + Math.random());
    } else if (r < 0.55) {
      launchLimb(x, y + 1.95, z, sp * 1.2, 'head', nx, nz, tint);
      headless = true; variant = 1;
      bloodFountain(x, y + 0.3, z, nx, nz, 2.2);
    } else {
      launchLimb(x, y + 1.4, z, sp, 'arm', nx, nz, tint);
      if (Math.random() < 0.6) launchLimb(x, y + 0.6, z, sp * 0.8, 'leg', -nz, nx, tint);
      variant = 2;
      bloodFountain(x, y + 0.3, z, nx, nz, 1.2);
    }
  }
  // 吹き飛ばす
  const fling = o.fling || o.push;
  if (corpseLeft && variant !== -1 && variant !== 3 && fling && Math.random() < 0.5) {
    const f = (o.push ? o.push.force : 1) * (8 + R * 0.4) * (1 - d / R * 0.5);
    let vx = nx * f, vz = nz * f;
    if (o.push && o.push.dx !== undefined) { vx = o.push.dx * f; vz = o.push.dz * f; }
    if (launchFlyer(x, y + 0.5, z, vx, 5 + Math.random() * f * 0.8, vz, tint, face, headless)) corpseLeft = false;
  }
  if (corpseLeft && variant >= 0) {
    addCorpse(x, z, face + (Math.random() - 0.5), tint, crushed, variant);
    if (bleeding) { addBloodDecal(x, z, 1.6 + Math.random() * (crushed || variant === 3 ? 2.2 : 1.2)); if (Math.random() < 0.5) addBloodDecal(x + (Math.random() - 0.5) * 2, z + (Math.random() - 0.5) * 2, 0.8 + Math.random()); }
  } else if (variant === -1) addCorpse(x, z, face, tint, false, 3);
}
// 重力などで引き寄せる
function pullArmy(x, z, R, strength, dt) {
  for (const g of ARMY.groups) {
    if (g.ally || !g.active) continue;
    if (Math.hypot(g.x - x, g.z - z) > g.r + R + 60) continue;
    for (const u of g.units) {
      if (!u.alive) continue;
      const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz);
      if (d > R || d < 0.5) continue;
      const k = strength * dt * (1 - d / R * 0.5);
      u.x += dx / d * Math.min(d, k); u.z += dz / d * Math.min(d, k);
      u.y = groundAt(u.x, u.z); u.lean = 0.6;
    }
  }
}

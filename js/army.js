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

/* ---------- 横たわる亡骸（建物と一緒にまとめて描く用） ---------- */
function corpse(B, x, z, ry, o = {}) {
  const y = groundAt(x, z);
  const cloth = o.cloth || 0x3a4a6a, skin = o.skin || 0xd9a47a, pants = o.pants || 0x3a3228;
  const L = (lx, ly, lz, w, h, d, c, rx = 0, rz = 0) => { const [ox, oz] = rotXZ(lx, lz, ry); B.box(x + ox, y + ly, z + oz, w, h, d, c, ry, rx, rz); };
  const flat = o.crushed ? 0.4 : 1;
  L(0, 0.22 * flat, 0, 0.78, 0.4 * flat, 0.9, cloth);
  if (o.armor) L(0, 0.3 * flat, 0, 0.82, 0.3 * flat, 0.7, o.armor);
  // 血に染まった服
  L(0.15, 0.43 * flat, 0.1, 0.4, 0.03, 0.45, 0x5a0808);
  if (!o.noHead) { const [ox, oz] = rotXZ(0, 0.72, ry); B.sphere(x + ox, y + 0.22 * flat, z + oz, 0.3, skin, 1, flat, 1); B.sphere(x + ox, y + 0.3 * flat, z + oz - 0.02, 0.31, o.hair || 0x2a1f1a, 1, 0.6 * flat, 1); }
  const lost = o.lost || '';
  const armA = o.armAng !== undefined ? o.armAng : 0.4;
  if (!lost.includes('armL')) L(-0.58, 0.14, 0.15, 0.2, 0.2, 0.78, cloth, 0, 0);
  if (!lost.includes('armR')) { const [ox, oz] = rotXZ(0.62, 0.35, ry + armA); B.box(x + ox, y + 0.14, z + oz, 0.2, 0.2, 0.78, cloth, ry + armA); }
  if (!lost.includes('legL')) L(-0.2, 0.15, -0.85, 0.26, 0.26, 0.85, pants);
  if (!lost.includes('legR')) L(0.24, 0.15, -0.82, 0.26, 0.26, 0.85, pants, 0, 0.1);
  // 失われた手足の断面
  for (const part of ['armL', 'armR', 'legL', 'legR']) {
    if (!lost.includes(part)) continue;
    const sx = part.endsWith('L') ? -1 : 1;
    const lz = part.startsWith('arm') ? 0.35 : -0.45;
    L(sx * (part.startsWith('arm') ? 0.45 : 0.22), 0.2, lz, 0.22, 0.22, 0.12, 0x7a0a0a);
    // 少し離れたところに転がる手足
    const [fx, fz] = rotXZ(sx * (1.2 + Math.random()), lz + (Math.random() - 0.5) * 2, ry);
    const gy = groundAt(x + fx, z + fz);
    B.box(x + fx, gy + 0.11, z + fz, 0.2, 0.2, part.startsWith('arm') ? 0.7 : 0.85, part.startsWith('arm') ? cloth : pants, Math.random() * 6);
    B.box(x + fx, gy + 0.12, z + fz, 0.21, 0.21, 0.1, 0x7a0a0a, Math.random() * 6);
  }
  if (o.weapon) { const [ox, oz] = rotXZ(0.9, 0.2, ry); B.box(x + ox, y + 0.05, z + oz, 0.08, 0.05, 1.6, 0x9aa0a8, ry + 0.5); }
  if (o.arrows) for (let k = 0; k < o.arrows; k++) { const [ox, oz] = rotXZ((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.7, ry); B.box(x + ox, y + 0.6, z + oz, 0.03, 0.8, 0.03, 0x5a4028, 0, 0.3, 0.2); }
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
  heavy:   { name: '帝国重装兵', hp: 1100, atk: 110, speed: 2.6, reach: 1.8, cd: 1.8, exp: 8, gold: 5, scale: 1.22 },
  archer:  { name: '帝国弓兵', hp: 260, atk: 35, speed: 3.2, reach: 34, cd: 2.8, exp: 3, gold: 2, ranged: true },
  ally:    { name: '王国兵', hp: 1e9, atk: 0, speed: 0, reach: 1.5, cd: 1.4 }
};
function soldierGeo(kind) {
  const B = new Builder();
  const ally = kind === 'ally';
  const steel = ally ? 0xa9b0b8 : 0x3a3a44, tab = ally ? 0x2a4a8a : 0x7a1414, skin = 0xd9a47a, leg = ally ? 0x4a4a5a : 0x2a2622;
  B.box(-0.17, 0.42, 0, 0.24, 0.84, 0.26, leg); B.box(0.17, 0.42, 0, 0.24, 0.84, 0.26, leg);
  B.box(0, 1.25, 0, 0.76, 0.86, 0.44, steel);
  B.box(0, 1.05, 0.23, 0.5, 0.9, 0.04, tab);
  B.box(-0.5, 1.25, 0, 0.2, 0.76, 0.22, steel); B.box(0.5, 1.25, 0, 0.2, 0.76, 0.22, steel);
  B.sphere(0, 1.96, 0.02, 0.28, skin);
  B.sphere(0, 2.04, 0, 0.33, steel, 1, 0.85, 1);
  if (!ally) B.box(0, 2.05, 0.22, 0.4, 0.08, 0.06, 0x14141a);
  if (kind === 'archer') {
    B.torus(-0.55, 1.25, 0.25, 0.55, 0.03, 0x5a3a22, 0, Math.PI / 2);
    B.box(0.2, 1.5, -0.3, 0.15, 0.6, 0.15, 0x6a4a2a);
  } else {
    B.cyl(0.6, 1.4, 0.2, 0.03, 0.035, 2.8, 0x4a3422, 5);
    B.cone(0.6, 2.9, 0.2, 0.07, 0.3, 0xb8c0c8, 5);
    B.box(-0.62, 1.2, 0.18, 0.1, 0.9, 0.7, tab);
    B.box(-0.68, 1.2, 0.18, 0.04, 0.3, 0.3, ally ? 0xe8c04a : 0x1a1a1a);
  }
  return B.geometry();
}
function farGeo() {
  const B = new Builder();
  B.box(0, 0.9, 0, 0.7, 1.8, 0.45, 0xffffff);
  B.box(0, 2.0, 0, 0.5, 0.45, 0.5, 0xd8d8d8);
  B.box(0.55, 1.6, 0, 0.06, 2.6, 0.06, 0xa0a0a0);
  return B.geometry();
}
function bodyGeo() {
  const B = new Builder();
  corpse(B, 0, 0, 0, { cloth: 0x7a1414, armor: 0x3a3a44, pants: 0x2a2622, hair: 0x2a2a30 });
  // 原点の高さを0に（groundAtの分をもどす）
  const g = B.geometry();
  g.translate(0, -groundAt(0, 0), 0);
  return g;
}

const ARMY = {
  units: [], groups: [], kills: 0, zoneKills: {},
  cap: IS_TOUCH ? 900 : 1600, farCap: IS_TOUCH ? 2500 : 4200
};
const _am = new THREE.Matrix4(), _aq = new THREE.Quaternion(), _ae = new THREE.Euler(), _ap = new THREE.Vector3(), _as = new THREE.Vector3(), _ac = new THREE.Color();

function armyMat() { return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }); }
function initArmyMeshes() {
  const mk = (geo, n) => {
    const m = new THREE.InstancedMesh(geo, armyMat(), n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // 色の配列は count の数で作られるので、count を 0 にする前に全員ぶん白で埋める
    _ac.setRGB(1, 1, 1);
    for (let i = 0; i < n; i++) m.setColorAt(i, _ac);
    m.count = 0; m.castShadow = true; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  ARMY.mMelee = mk(soldierGeo('soldier'), ARMY.cap);
  ARMY.mArcher = mk(soldierGeo('archer'), Math.floor(ARMY.cap / 3));
  ARMY.mAlly = mk(soldierGeo('ally'), 300);
  ARMY.mFar = mk(farGeo(), ARMY.farCap);
  ARMY.mFar.castShadow = false;
  // 亡骸（古いものから使い回す）
  ARMY.corpseCap = IS_TOUCH ? 1500 : 3000;
  ARMY.mCorpse = mk(bodyGeo(), ARMY.corpseCap);
  ARMY.mCorpse.castShadow = false;
  ARMY.corpseN = 0; ARMY.corpseI = 0;
  // 血の跡
  ARMY.decalCap = IS_TOUCH ? 1200 : 2400;
  const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
  ARMY.mDecal = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), ARMY.decalCap);
  ARMY.mDecal.count = 0; ARMY.mDecal.frustumCulled = false; ARMY.mDecal.renderOrder = 2;
  scene.add(ARMY.mDecal);
  ARMY.decalN = 0; ARMY.decalI = 0;
  // 吹き飛ぶ体・ちぎれた手足
  ARMY.flyers = [];
  ARMY.mFly = mk(bodyGeo(), 160);
  const lg = new THREE.BoxGeometry(0.22, 0.22, 0.8);
  ARMY.mLimb = new THREE.InstancedMesh(lg, new THREE.MeshStandardMaterial({ color: 0x6a1a14, roughness: 0.8 }), 200);
  ARMY.mLimb.count = 0; ARMY.mLimb.frustumCulled = false; scene.add(ARMY.mLimb);
  ARMY.limbs = [];
}

function addCorpse(x, z, ry, tint, crushed) {
  const i = ARMY.corpseI; ARMY.corpseI = (ARMY.corpseI + 1) % ARMY.corpseCap;
  ARMY.corpseN = Math.min(ARMY.corpseCap, ARMY.corpseN + 1);
  _e.set(0, ry, 0); _aq.setFromEuler(_e);
  _am.compose(_ap.set(x, groundAt(x, z) + 0.02, z), _aq, _as.set(1, crushed ? 0.35 : 1, 1));
  ARMY.mCorpse.setMatrixAt(i, _am);
  ARMY.mCorpse.setColorAt(i, _ac.setHex(tint || 0xffffff));
  ARMY.mCorpse.count = ARMY.corpseN;
  ARMY.mCorpse.instanceMatrix.needsUpdate = true;
  ARMY.mCorpse.instanceColor.needsUpdate = true;
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
function bloodSpray(x, y, z, n, speed) {
  spray(PS, n, x, y, z, { speed, up: speed * 0.4, life: 0.8, size: 0.12, c0: 0x9a0a0a, c1: 0x4a0404, alpha: 0.95, grav: 11, drag: 0.8, cap: 40 });
}
function launchFlyer(x, y, z, vx, vy, vz, tint, ry) {
  if (ARMY.flyers.length >= 160) return false;
  ARMY.flyers.push({ x, y, z, vx, vy, vz, rx: 0, ry, rz: 0, sx: (Math.random() - 0.5) * 8, sz: (Math.random() - 0.5) * 8, tint });
  return true;
}
function launchLimb(x, y, z, speed) {
  if (ARMY.limbs.length >= 200) return;
  const a = Math.random() * 6.28;
  ARMY.limbs.push({ x, y, z, vx: Math.cos(a) * speed, vy: speed * 0.8 + 3, vz: Math.sin(a) * speed, r: 0, sr: (Math.random() - 0.5) * 14, ry: a, life: 12 });
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
  let nMelee = 0, nArcher = 0, nAlly = 0, nFar = 0;
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
          } else if (u.d < K.reach + 0.6) {
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
    const bob = u.moving ? Math.abs(Math.sin(u.phase * 9)) * 0.08 : Math.sin(u.phase * 1.3) * 0.01;
    const sc = K.scale || 1;
    _e.set(-u.lean, u.face, 0, 'YXZ'); _aq.setFromEuler(_e);
    _am.compose(_ap.set(u.x, u.y + bob, u.z), _aq, _as.set(sc, sc, sc));
    if (u.d < 75) {
      if (u.kind === 'ally') { if (nAlly < 300) ARMY.mAlly.setMatrixAt(nAlly++, _am); }
      else if (u.kind === 'archer') { if (nArcher < ARMY.mArcher.instanceMatrix.count) ARMY.mArcher.setMatrixAt(nArcher++, _am); }
      else if (nMelee < ARMY.cap) {
        ARMY.mMelee.setMatrixAt(nMelee, _am);
        ARMY.mMelee.setColorAt(nMelee, _ac.setHex(u.kind === 'heavy' ? 0x9a9aa8 : 0xffffff));
        nMelee++;
      }
    } else if (nFar < ARMY.farCap) {
      ARMY.mFar.setMatrixAt(nFar, _am);
      ARMY.mFar.setColorAt(nFar, _ac.setHex(u.kind === 'ally' ? 0x3a5aa0 : 0x6a1a1a));
      nFar++;
    }
  }
  for (const [m, n] of [[ARMY.mMelee, nMelee], [ARMY.mArcher, nArcher], [ARMY.mAlly, nAlly], [ARMY.mFar, nFar]]) {
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
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
  for (let i = ARMY.flyers.length - 1; i >= 0; i--) {
    const f = ARMY.flyers[i];
    f.vy -= 22 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    f.rx += f.sx * dt; f.rz += f.sz * dt;
    if (Math.random() < 0.3) PS.spawn(f.x, f.y + 0.3, f.z, 0, 0, 0, 0.6, 0.12, 0x8a0808, 0x3a0202, 0.9, 8, 0);
    const gy = groundAt(f.x, f.z);
    if (f.y <= gy && f.vy < 0) {
      addCorpse(f.x, f.z, f.ry, f.tint);
      addBloodDecal(f.x, f.z, 1.6 + Math.random());
      ARMY.flyers.splice(i, 1);
      continue;
    }
    _e.set(f.rx, f.ry, f.rz); _aq.setFromEuler(_e);
    _am.compose(_ap.set(f.x, f.y, f.z), _aq, _as.set(1, 1, 1));
    ARMY.mFly.setMatrixAt(n, _am);
    ARMY.mFly.setColorAt(n, _ac.setHex(f.tint || 0xffffff));
    n++;
  }
  ARMY.mFly.count = n;
  ARMY.mFly.instanceMatrix.needsUpdate = true;
  if (ARMY.mFly.instanceColor) ARMY.mFly.instanceColor.needsUpdate = true;
  let m = 0;
  for (let i = ARMY.limbs.length - 1; i >= 0; i--) {
    const l = ARMY.limbs[i];
    l.life -= dt;
    if (l.life <= 0) { ARMY.limbs.splice(i, 1); continue; }
    const gy = groundAt(l.x, l.z);
    if (l.y > gy + 0.1 || l.vy > 0) {
      l.vy -= 22 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt; l.r += l.sr * dt;
      if (Math.random() < 0.4) PS.spawn(l.x, l.y, l.z, 0, 0, 0, 0.5, 0.08, 0x8a0808, 0x3a0202, 0.9, 8, 0);
      if (l.y <= gy + 0.1 && l.vy < 0) { l.y = gy + 0.11; l.vy = 0; l.vx = l.vz = 0; addBloodDecal(l.x, l.z, 0.7); }
    }
    _e.set(0, l.ry, l.r); _aq.setFromEuler(_e);
    _am.compose(_ap.set(l.x, l.y, l.z), _aq, _as.set(1, 1, 1));
    ARMY.mLimb.setMatrixAt(m++, _am);
  }
  ARMY.mLimb.count = m;
  ARMY.mLimb.instanceMatrix.needsUpdate = true;
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
  const near = u.d < 140;
  const dx = u.x - cx, dz = u.z - cz, dd = Math.hypot(dx, dz) || 1;
  let tint = 0xffffff, corpseLeft = true, crushed = false;
  switch (el) {
    case 'fire': case 'thunder': tint = 0x3a2e28; break;
    case 'ice': tint = 0xa8d8ff; if (Math.random() < 0.4) { corpseLeft = false; if (near) spray(PS, 8, u.x, u.y + 1, u.z, { speed: 4, up: 3, life: 1, size: 0.18, c0: 0xdff4ff, c1: 0x9ad0f0, alpha: 0.95, grav: 12, cap: 12 }); } break;
    case 'gravity': crushed = true; break;
    case 'light': corpseLeft = false; if (near) spray(PS, 6, u.x, u.y + 1, u.z, { speed: 1, up: 2, life: 2, size: 0.4, grow: 0.5, c0: 0x6a6660, c1: 0xb8b4ae, alpha: 0.6, grav: -0.8, fade: 1, cap: 10 }); break;
    case 'dark': corpseLeft = false; if (near) spray(PS, 6, u.x, u.y + 0.5, u.z, { speed: 1, life: 1.4, size: 0.5, grow: 0.3, c0: 0x2a0a3a, c1: 0x0a000a, alpha: 0.8, grav: 1.5, fade: 1, cap: 10 }); break;
  }
  const bleeding = el !== 'light' && el !== 'dark' && !(el === 'ice' && !corpseLeft);
  if (near && bleeding) bloodSpray(u.x, u.y + 1.2, u.z, 6, 4);
  // 吹き飛ばす
  const fling = o.fling || o.push;
  if (corpseLeft && fling && near && Math.random() < 0.5) {
    const f = (o.push ? o.push.force : 1) * (8 + R * 0.4) * (1 - d / R * 0.5);
    let vx = dx / dd * f, vz = dz / dd * f;
    if (o.push && o.push.dx !== undefined) { vx = o.push.dx * f; vz = o.push.dz * f; }
    if (launchFlyer(u.x, u.y + 0.5, u.z, vx, 5 + Math.random() * f * 0.8, vz, tint, u.face)) corpseLeft = false;
  }
  if (bleeding && near && Math.random() < (el === 'gravity' || el === 'wood' || el === 'water' ? 0.45 : 0.22)) launchLimb(u.x, u.y + 1.2, u.z, 3 + Math.random() * 5);
  if (corpseLeft) { addCorpse(u.x, u.z, u.face + (Math.random() - 0.5), tint, crushed); if (bleeding) addBloodDecal(u.x, u.z, 1.4 + Math.random() * (crushed ? 2 : 1)); }
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

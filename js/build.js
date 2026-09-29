'use strict';
/* =========================================================
   建物・町・遺跡・迷宮
   ========================================================= */
const BLD = {};          // 名前つき建物（住民の配置に使う）
const ANIM = [];         // 動く飾り（風車・結晶など）
const INTERACT = [];     // 調べられる物（転移石・入口・舟など）
const WARPS = [];        // 転移石
const CRYSTALS = [];     // 魔力の結晶
const SPOTS = {};        // 名前つきの地点

function roadClear(x, z, r) {
  const rd = roadAt(x, z);
  return !rd || rd.d > ROAD_HW + r;
}
function toWorld(pl, dx, dz) { return [pl.x + dx, pl.z + dz]; }

// 道にかぶらないよう建物を少しずらす
function nudgeOffRoad(x, z, w, d, ry) {
  for (let it = 0; it < 14; it++) {
    let worst = Infinity, wx = 0, wz = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const [ox, oz] = rotXZ(a * w / 2, b * d / 2, ry);
      const px = x + ox, pz = z + oz;
      const rd = roadAt(px, pz);
      if (rd && rd.d < worst) { worst = rd.d; wx = px; wz = pz; }
    }
    const need = ROAD_HW + 1.2;
    if (worst >= need) break;
    const e = 0.7;
    const gx = (roadAt(wx + e, wz) || { d: 99 }).d - (roadAt(wx - e, wz) || { d: 99 }).d;
    const gz = (roadAt(wx, wz + e) || { d: 99 }).d - (roadAt(wx, wz - e) || { d: 99 }).d;
    const L = Math.hypot(gx, gz) || 1;
    const push = need - worst + 0.4;
    x += gx / L * push; z += gz / L * push;
  }
  return [x, z];
}

function signAt(text, x, y, z, h = 0.9, opt = {}) {
  const s = makeTextSprite(text, Object.assign({ height: h }, opt));
  s.position.set(x, y, z);
  scene.add(s);
  return s;
}

/* ---------- 基本の建物 ---------- */
function house(B, o) {
  let { x, z, ry = 0, w = 7, d = 6, h = 3.4 } = o;
  if (!o.fixed) [x, z] = nudgeOffRoad(x, z, w + 1, d + 1, ry);
  const y = o.y !== undefined ? o.y : groundAt(x, z);
  const L = (lx, ly, lz, bw, bh, bd, c) => { const [ox, oz] = rotXZ(lx, lz, ry); B.box(x + ox, y + ly, z + oz, bw, bh, bd, c, ry); };
  B.box(x, y - 0.5, z, w + 0.4, 1.6, d + 0.4, o.base || 0x6f665a, ry);
  if (o.burned) return burnedHouse(B, o, x, z, y, ry, w, d, h, L);
  L(0, h / 2 + 0.3, 0, w, h, d, o.wall || 0xe8dcc3);
  if (o.timber) {
    const t = o.timber;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L(sx * (w / 2 - 0.1), h / 2 + 0.3, sz * (d / 2 - 0.1), 0.3, h, 0.3, t);
    L(0, h * 0.55 + 0.3, d / 2 + 0.02, w, 0.22, 0.1, t);
    L(0, h * 0.55 + 0.3, -d / 2 - 0.02, w, 0.22, 0.1, t);
  }
  const roofH = o.roofH || Math.min(w, d) * 0.5;
  if (o.flat) {
    L(0, h + 0.5, 0, w + 0.4, 0.4, d + 0.4, o.roof || 0xcbb89a);
  } else {
    const [ox, oz] = [0, 0];
    B.prism(x + ox, y + h + 0.3, z + oz, w + 1.0, roofH, d + 1.0, o.roof || 0x9b4a32, ry);
  }
  L(0, 1.45, d / 2 + 0.06, 1.3, 2.3, 0.12, o.door || 0x5a3a22);
  const win = o.win || 0x2b3a4a;
  const floors = o.floors || (h > 5 ? 2 : 1);
  for (let f = 0; f < floors; f++) {
    const wy = 0.3 + (f + 0.62) * h / floors;
    if (w >= 5) { L(-w * 0.3, wy, d / 2 + 0.05, 0.9, 0.9, 0.1, win); L(w * 0.3, wy, d / 2 + 0.05, 0.9, 0.9, 0.1, win); }
    if (f > 0) L(0, wy, d / 2 + 0.05, 0.9, 0.9, 0.1, win);
    L(w / 2 + 0.05, wy, 0, 0.1, 0.9, 0.9, win);
    L(-w / 2 - 0.05, wy, 0, 0.1, 0.9, 0.9, win);
  }
  if (o.chimney) L(w * 0.25, h + roofH * 0.7, -d * 0.2, 0.7, 2.2, 0.7, 0x7a6a5a);
  if (o.awning) L(0, 2.95, d / 2 + 0.8, w * 0.8, 0.15, 1.6, o.awning);
  addBoxCollider(x, z, w / 2 + 0.1, d / 2 + 0.1, ry);
  const [dx, dz] = rotXZ(0, d / 2 + 1.9, ry);
  const info = { x, z, ry, y, w, d, h, door: { x: x + dx, z: z + dz } };
  if (o.sign) {
    const [sx, sz] = rotXZ(0, d / 2 + 0.5, ry);
    signAt(o.sign, x + sx, y + Math.min(h + 0.4, 3.6), z + sz, 0.8);
  }
  if (o.id) BLD[o.id] = info;
  return info;
}

// 焼け落ちた家（屋根が崩れ、壁は煤で黒く、窓から炎が吹く）
function burnedHouse(B, o, x, z, y, ry, w, d, h, L) {
  const R = mulberry32(hashStr(o.id || (x.toFixed(1) + z.toFixed(1))));
  const char = [0x2e2824, 0x3a322c, 0x46403a][Math.floor(R() * 3)];
  const hh = h * (0.55 + R() * 0.45);
  // 壁（ところどころ欠けた4面）
  const t = 0.35;
  L(0, hh / 2 + 0.3, d / 2 - t / 2, w, hh, t, char);
  L(0, hh * 0.35 + 0.3, -d / 2 + t / 2, w, hh * 0.7, t, char);
  L(w / 2 - t / 2, hh * 0.45 + 0.3, 0, t, hh * 0.9, d, char);
  L(-w / 2 + t / 2, hh / 2 + 0.3, 0, t, hh, d, char);
  // 焦げた梁と崩れた屋根
  for (let k = 0; k < 3; k++) {
    const [ox, oz] = rotXZ((R() - 0.5) * w * 0.6, (R() - 0.5) * d * 0.6, ry);
    B.box(x + ox, y + hh * (0.4 + R() * 0.5), z + oz, 0.25, 0.25, w * 0.9, 0x1e1a18, ry + R() * 0.6, R() * 0.9, R() * 0.5);
  }
  if (R() < 0.5) B.prism(x, y + hh * 0.5, z, w * 0.9, h * 0.3, d * 0.7, 0x2a2420, ry + 0.3);
  // 瓦礫
  for (let k = 0; k < 5; k++) {
    const [ox, oz] = rotXZ((R() - 0.5) * (w + 3), d / 2 + 0.6 + R() * 2, ry);
    B.dodeca(x + ox, y + 0.25, z + oz, 0.3 + R() * 0.5, R() < 0.5 ? 0x5a524a : 0x3a2e26, 1, 0.6, 1, R(), R(), R());
  }
  // 焼けた窓の穴・扉
  L(0, 1.45, d / 2 + 0.06, 1.3, 2.3, 0.12, 0x0c0a08);
  for (const sx of [-0.3, 0.3]) L(w * sx, hh * 0.6 + 0.3, d / 2 + 0.05, 0.9, 1.0, 0.1, 0x0c0a08);
  addBoxCollider(x, z, w / 2 + 0.1, d / 2 + 0.1, ry);
  const [dx, dz] = rotXZ(0, d / 2 + 1.9, ry);
  const info = { x, z, ry, y, w, d, h: hh, door: { x: x + dx, z: z + dz }, burned: true, firePts: [] };
  // 炎の出どころ（窓・屋根の穴）
  const nf = 1 + Math.floor(R() * 3);
  for (let k = 0; k < nf; k++) {
    const [ox, oz] = rotXZ((R() - 0.5) * w * 0.7, (R() - 0.5) * d * 0.7, ry);
    info.firePts.push({ x: x + ox, y: y + hh * (0.5 + R() * 0.6), z: z + oz, s: 0.8 + R() * 1.4 });
  }
  if (o.id) BLD[o.id] = info;
  return info;
}

function tower(B, x, z, r, h, wall, roof, y) {
  y = y !== undefined ? y : groundAt(x, z);
  B.cyl(x, y + h / 2 - 0.5, z, r, r * 1.05, h + 1, wall, 12);
  B.cyl(x, y + h + 0.4, z, r * 1.15, r * 1.15, 0.8, wall, 12);
  if (roof) B.cone(x, y + h + 0.8 + r * 1.1, z, r * 1.3, r * 2.2, roof, 12);
  else for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    B.box(x + Math.cos(a) * r, y + h + 1.3, z + Math.sin(a) * r, 0.9, 1.0, 0.9, wall, -a);
  }
  addCollider(x, z, r + 0.2);
}

function wallLine(B, x1, z1, x2, z2, h, t, color, y0) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const ry = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.ceil(L / 12));
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n;
    const ax = lerp(x1, x2, a), az = lerp(z1, z2, a), bx = lerp(x1, x2, b), bz = lerp(z1, z2, b);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const y = y0 !== undefined ? y0 : Math.min(groundAt(ax, az), groundAt(bx, bz), groundAt(mx, mz));
    B.box(mx, y + h / 2 - 1, mz, t, h + 2, L / n + 0.05, color, ry);
    const m = Math.floor(L / n / 2.4);
    for (let k = 0; k < m; k += 2) {
      const f = (k + 0.5) / m;
      B.box(lerp(ax, bx, f), y + h + 0.6, lerp(az, bz, f), t + 0.1, 1.2, 1.1, color, ry);
    }
  }
  addWallCollider(x1, z1, x2, z2, t);
}

function well(B, x, z) {
  const y = groundAt(x, z);
  B.cyl(x, y + 0.5, z, 1.2, 1.25, 1.0, 0x9a948a, 12);
  B.cyl(x, y + 0.98, z, 0.95, 0.95, 0.06, 0x2d4a5a, 12);
  B.box(x - 1.0, y + 1.8, z, 0.15, 1.8, 0.15, 0x5d4028);
  B.box(x + 1.0, y + 1.8, z, 0.15, 1.8, 0.15, 0x5d4028);
  B.prism(x, y + 2.6, z, 2.6, 0.9, 1.6, 0x8a4a2a, Math.PI / 2);
  addCollider(x, z, 1.3);
}
function fountain(B, G, x, z, s = 1) {
  const y = groundAt(x, z);
  B.cyl(x, y + 0.35, z, 4.2 * s, 4.4 * s, 0.7, 0xbab3a4, 20);
  G.cyl(x, y + 0.66, z, 3.8 * s, 3.8 * s, 0.05, 0x7fc4de, 20);
  B.cyl(x, y + 1.3, z, 0.5 * s, 0.7 * s, 2.0, 0xbab3a4, 10);
  B.cyl(x, y + 2.4, z, 1.5 * s, 0.6 * s, 0.4, 0xbab3a4, 12);
  G.sphere(x, y + 2.9, z, 0.45 * s, 0xbfe6f5);
  addCollider(x, z, 4.3 * s);
}
function stall(B, x, z, ry, awn, goods) {
  const y = groundAt(x, z);
  const L = (lx, ly, lz, w, h, d, c) => { const [ox, oz] = rotXZ(lx, lz, ry); B.box(x + ox, y + ly, z + oz, w, h, d, c, ry); };
  L(0, 0.5, 0, 3.2, 1.0, 1.4, 0x7a5634);
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.6, 0.6]) L(sx, 1.4, sz, 0.12, 2.8, 0.12, 0x5d4028);
  L(0, 2.85, 0.2, 3.6, 0.12, 2.0, awn);
  L(0, 2.6, 1.15, 3.6, 0.5, 0.05, awn);
  for (let k = 0; k < 4; k++) L(-1.1 + k * 0.72, 1.1, 0, 0.45, 0.25, 0.45, goods[k % goods.length]);
  addBoxCollider(x, z, 1.7, 0.8, ry);
  const [dx, dz] = rotXZ(0, -1.5, ry);
  return { x: x + dx, z: z + dz };
}
function tent(B, x, z, ry, color, r = 3) {
  const y = groundAt(x, z);
  B.cone(x, y + r * 0.8, z, r, r * 1.6, color, 8, ry);
  B.cyl(x, y + r * 1.75, z, 0.06, 0.06, 0.6, 0x5d4028, 4);
  const [ox, oz] = rotXZ(0, r * 0.75, ry);
  B.box(x + ox, y + 0.8, z + oz, 1.0, 1.6, 0.1, 0x3a2a1a, ry);
  addCollider(x, z, r * 0.85);
}
function fence(B, x1, z1, x2, z2, color = 0x8a6a45) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(L / 2.2));
  const ry = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i <= n; i++) {
    const x = lerp(x1, x2, i / n), z = lerp(z1, z2, i / n);
    B.box(x, groundAt(x, z) + 0.6, z, 0.16, 1.2, 0.16, color);
  }
  for (let i = 0; i < n; i++) {
    const x = lerp(x1, x2, (i + 0.5) / n), z = lerp(z1, z2, (i + 0.5) / n);
    const y = groundAt(x, z);
    B.box(x, y + 0.85, z, 0.08, 0.12, L / n, color, ry);
    B.box(x, y + 0.45, z, 0.08, 0.12, L / n, color, ry);
  }
  addWallCollider(x1, z1, x2, z2, 0.3);
}
function lamp(B, G, x, z, h = 3.2) {
  const y = groundAt(x, z);
  B.cyl(x, y + h / 2, z, 0.08, 0.12, h, 0x2d2a26, 6);
  B.box(x, y + h + 0.1, z, 0.45, 0.1, 0.45, 0x2d2a26);
  G.box(x, y + h - 0.2, z, 0.32, 0.45, 0.32, 0xffd98a);
}
function barrel(B, x, z) { const y = groundAt(x, z); B.cyl(x, y + 0.5, z, 0.4, 0.4, 1.0, 0x7a5634, 8); B.torus(x, y + 0.75, z, 0.41, 0.04, 0x3a3a3a, Math.PI / 2); addCollider(x, z, 0.45); }
function crate(B, x, z, s = 1) { const y = groundAt(x, z); B.box(x, y + 0.45 * s, z, 0.9 * s, 0.9 * s, 0.9 * s, 0x9a7a4a, x * 0.3); addCollider(x, z, 0.5 * s); }
function bench(B, x, z, ry) {
  const y = groundAt(x, z);
  const L = (lx, ly, lz, w, h, d, c) => { const [ox, oz] = rotXZ(lx, lz, ry); B.box(x + ox, y + ly, z + oz, w, h, d, c, ry); };
  L(0, 0.45, 0, 2.0, 0.1, 0.5, 0x7a5634); L(-0.8, 0.22, 0, 0.1, 0.45, 0.45, 0x5d4028); L(0.8, 0.22, 0, 0.1, 0.45, 0.45, 0x5d4028);
}
function flagPole(B, x, z, color, h = 6, y) {
  y = y !== undefined ? y : groundAt(x, z);
  B.cyl(x, y + h / 2, z, 0.08, 0.1, h, 0x4a3a2a, 6);
  B.box(x + 0.7, y + h - 1.2, z, 1.3, 2.2, 0.06, color);
  B.sphere(x, y + h + 0.15, z, 0.18, 0xd9b34a);
}
function statue(B, x, z, color = 0xb8b2a4) {
  const y = groundAt(x, z);
  B.box(x, y + 0.8, z, 2.2, 1.6, 2.2, 0x8f897d);
  B.cyl(x, y + 2.6, z, 0.4, 0.5, 2.0, color, 8);
  B.sphere(x, y + 3.9, z, 0.45, color);
  B.cone(x, y + 4.6, z, 0.5, 1.0, color, 8);
  B.cyl(x + 0.55, y + 3.2, z, 0.06, 0.06, 3.0, color, 6);
  addCollider(x, z, 1.3);
}
function pillar(B, x, z, h, broken, color = 0xc8c0ae, y) {
  y = y !== undefined ? y : groundAt(x, z);
  B.box(x, y + 0.3, z, 1.6, 0.6, 1.6, color);
  B.cyl(x, y + 0.6 + h / 2, z, 0.55, 0.62, h, color, 10);
  if (!broken) B.box(x, y + 0.9 + h, z, 1.6, 0.6, 1.6, color);
  addCollider(x, z, 0.8);
}
function boat(B, x, z, ry, len = 6, color = 0x7a5634, y = 0.15) {
  const L = (lx, ly, lz, w, h, d, c) => { const [ox, oz] = rotXZ(lx, lz, ry); B.box(x + ox, y + ly, z + oz, w, h, d, c, ry); };
  L(0, 0.2, 0, len * 0.35, 0.5, len, color);
  L(-len * 0.17, 0.6, 0, 0.12, 0.5, len, color);
  L(len * 0.17, 0.6, 0, 0.12, 0.5, len, color);
  const [ox, oz] = rotXZ(0, len * 0.55, ry);
  B.cone(x + ox, y + 0.45, z + oz, len * 0.18, len * 0.2, color, 4, ry + Math.PI / 4, Math.PI / 2);
}
function warpStone(G, B, id, name, x, z) {
  const y = groundAt(x, z);
  B.box(x, y + 0.25, z, 2.4, 0.5, 2.4, 0x6d6a66);
  B.box(x, y + 2.0, z, 0.9, 3.2, 0.9, 0x3c4a66, Math.PI / 4);
  B.cone(x, y + 3.9, z, 0.65, 0.8, 0x3c4a66, 4, Math.PI / 4);
  const rune = makeGlowSprite(0x8fd4ff, 2.2, 0.55);
  rune.position.set(x, y + 2.3, z);
  scene.add(rune);
  addCollider(x, z, 0.9);
  const w = { id, name, x, z, y, rune };
  WARPS.push(w);
  INTERACT.push({ kind: 'warp', x, z, r: 3.2, label: '転移石に触れる', ref: w });
  ANIM.push((dt, t) => { rune.material.opacity = 0.35 + 0.25 * Math.sin(t * 2 + x); });
}
function crystalAt(id, x, z, yOff = 0) {
  const y = groundAt(x, z) + yOff;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({
    color: 0x9fe8ff, emissive: 0x3aa8ff, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1, flatShading: true
  }));
  m.scale.set(1, 1.7, 1);
  m.position.set(x, y + 1.3, z);
  const glow = makeGlowSprite(0x6cc8ff, 3.2, 0.6);
  glow.position.copy(m.position);
  scene.add(m, glow);
  const c = { id, x, z, y, mesh: m, glow, taken: false };
  CRYSTALS.push(c);
  ANIM.push((dt, t) => {
    if (c.taken) return;
    m.rotation.y += dt * 1.5;
    m.position.y = y + 1.3 + Math.sin(t * 2 + x) * 0.2;
    glow.position.y = m.position.y;
  });
}
function bridge(B, br) {
  const { x, z, dir, len, w, top } = br;
  const L = (lx, ly, lz, bw, bh, bd, c) => { const [ox, oz] = rotXZ(lx, lz, dir); B.box(x + ox, ly, z + oz, bw, bh, bd, c, dir); };
  L(0, top - 0.3, 0, w, 0.6, len, 0x8a6a45);
  for (const s of [-1, 1]) {
    L(s * (w / 2 - 0.15), top + 0.6, 0, 0.2, 0.2, len, 0x6b4a2c);
    for (let k = 0; k <= 8; k++) L(s * (w / 2 - 0.15), top + 0.3, -len / 2 + k * len / 8, 0.22, 0.8, 0.22, 0x6b4a2c);
  }
  for (const f of [-0.25, 0.25]) for (const s of [-1, 1]) {
    const [ox, oz] = rotXZ(s * (w / 2 - 0.6), f * len, dir);
    const gy = terrainHeight(x + ox, z + oz);
    B.cyl(x + ox, (top + gy) / 2 - 1, z + oz, 0.35, 0.4, top - gy + 2, 0x6b5a4a, 8);
  }
  addPlatform(x, z, w / 2, len / 2, dir, top);
  // 手すり
  for (const s of [-1, 1]) {
    const [ox, oz] = rotXZ(s * (w / 2), 0, dir);
    addBoxCollider(x + ox, z + oz, 0.15, len / 2 - 3, dir);
  }
}

/* =========================================================
   場所ごとの組み立て
   ========================================================= */
function finishPlace(B, G) {
  if (!B.empty) scene.add(B.mesh());
  if (G && !G.empty) scene.add(G.mesh(MAT.glow, false));
}

function buildStart() {
  const pl = PLACE.start, B = new Builder(), G = new Builder();
  const y = pl.fh;
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.3, 0.3, 28),
    new THREE.MeshStandardMaterial({ color: 0xb5ab98, roughness: 0.95, flatShading: true }));
  plaza.position.set(0, y - 0.1, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const R = mulberry32(77);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 13, z = Math.sin(a) * 13;
    const h = 2.8 + R() * 1.8;
    if (!roadClear(x, z, 1.5)) continue;
    B.box(x, terrainHeight(x, z) + h / 2 - 0.3, z, 1.1, h, 0.8, 0xb5ab98, -a + Math.PI / 2, (R() - 0.5) * 0.12, (R() - 0.5) * 0.12);
    addCollider(x, z, 0.8);
  }
  // 焚き火
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    B.dodeca(Math.cos(a) * 0.85, y + 0.1, Math.sin(a) * 0.85, 0.22, 0xb5ab98);
  }
  for (let i = 0; i < 3; i++) B.cyl(0, y + 0.2, 0, 0.09, 0.11, 1.2, 0x5a3b24, 6, (i / 3) * Math.PI * 2, Math.PI / 2 - 0.35);
  const fo = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
  const fi = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 7), new THREE.MeshBasicMaterial({ color: 0xffe79a }));
  fo.position.set(0, y + 0.65, 0); fi.position.set(0, y + 0.5, 0);
  scene.add(fo, fi);
  const fl = LIGHT_POOL[0];
  fl.position.set(0, y + 1.2, 0); fl.distance = 16; fl.color.setHex(0xffa04a);
  ANIM.push((dt, t) => {
    const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
    fo.scale.set(1, f, 1); fi.scale.set(1, 2 - f, 1);
    if (!GAME.inDungeon) fl.intensity = 1.6 + Math.sin(t * 11) * 0.25;
  });
  addCollider(0, 0, 1.0);
  // 道しるべ
  const post = (x, z, txt, ry) => {
    const gy = groundAt(x, z);
    B.cyl(x, gy + 1.2, z, 0.08, 0.1, 2.4, 0x5d4028, 6);
    signAt(txt, x, gy + 2.5, z, 0.55);
    void ry;
  };
  post(6, 16, '↓ 風見の村', 0);
  post(-11, -9, '↖ 王都アルディア', 0);
  post(12, -6, '→ 交易都市ベルカ', 0);
  post(2, -15, '↑ 霊峰山脈・帝国', 0);
  warpStone(G, B, 'start', 'はじまりの丘', -7, 7);
  finishPlace(B, G);
}

function buildKazami() {
  const pl = PLACE.kazami, B = new Builder(), G = new Builder();
  const at = (dx, dz) => toWorld(pl, dx, dz);
  const H = (id, dx, dz, ry, o) => house(B, Object.assign({ id, x: pl.x + dx, z: pl.z + dz, ry, wall: 0xeadfc6, roof: 0x9a6a3a, timber: 0x6b4a2c, chimney: true }, o));
  H('kazami_chief', 2, -32, 0, { w: 10, d: 7, h: 4.6, roof: 0x7a3a2a, sign: '村長の家' });
  H('kazami_inn', -24, 22, Math.PI, { w: 9, d: 8, h: 5.6, roof: 0x3a5a7a, sign: '宿屋 風車亭' });
  H('kazami_item', 30, 8, -Math.PI / 2, { w: 7, d: 6, sign: '道具屋', awning: 0x5a8a4a });
  H('kazami_smith', 27, -24, -Math.PI / 2, { w: 7, d: 7, wall: 0xb8a88a, roof: 0x5a4a3a, sign: '鍛冶屋・武器', awning: 0x8a4a2a });
  H('kazami_h1', -32, -24, Math.PI / 2, { w: 6, d: 6 });
  H('kazami_h2', -8, 36, Math.PI, { w: 6, d: 5.5, roof: 0xa05a3a });
  H('kazami_h3', 28, 38, Math.PI, { w: 6.5, d: 6 });
  H('kazami_h4', -48, 4, Math.PI / 2, { w: 6, d: 6, roof: 0x7a5a3a });
  H('kazami_h5', 50, 26, -Math.PI / 2, { w: 6, d: 5 });
  H('kazami_h6', -18, -48, 0, { w: 6, d: 5.5, roof: 0x8a6a4a });
  // 炉
  const sm = BLD.kazami_smith;
  const [ax, az] = [sm.door.x, sm.door.z + 2.6];
  B.box(ax, groundAt(ax, az) + 0.45, az, 1.0, 0.9, 0.6, 0x3a3a3a);
  G.box(ax + 1.4, groundAt(ax, az) + 0.4, az, 0.7, 0.3, 0.7, 0xff7a2a);
  const [wx, wz] = at(10, -8); well(B, wx, wz);
  // 風車
  const [mx, mz] = at(-46, -44);
  const my = groundAt(mx, mz);
  B.cyl(mx, my + 5, mz, 2.2, 3.2, 10, 0xe8dcc3, 8);
  B.cone(mx, my + 11.3, mz, 3.0, 2.8, 0x8a4a2a, 8);
  addCollider(mx, mz, 3.2);
  const blades = new Builder();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    blades.box(Math.sin(a) * 3.6, Math.cos(a) * 3.6, 0, 0.9, 7, 0.1, 0xd9ccb0, 0, 0, -a);
  }
  blades.box(0, 0, 0, 0.6, 0.6, 0.6, 0x5d4028);
  const bm = blades.mesh();
  const [bx, bz] = rotXZ(0, 3.4, Math.PI / 4);
  bm.position.set(mx + bx, my + 9, mz + bz);
  bm.rotation.y = Math.PI / 4;
  scene.add(bm);
  ANIM.push((dt) => { bm.rotation.z += dt * 0.6; });
  // 畑と柵
  const [fx, fz] = at(-44, 44);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
    const x = fx - 8 + c * 3, z = fz - 8 + r * 2.4;
    if (!roadClear(x, z, 1)) continue;
    B.box(x, groundAt(x, z) + 0.25, z, 2.2, 0.5, 1.2, r % 2 ? 0x6a8a3a : 0x8aa84a);
  }
  fence(B, fx - 11, fz - 11, fx + 10, fz - 11);
  fence(B, fx - 11, fz - 11, fx - 11, fz + 9);
  // 羊の囲い
  const [px, pz] = at(52, -40);
  fence(B, px - 9, pz - 8, px + 9, pz - 8); fence(B, px + 9, pz - 8, px + 9, pz + 8);
  fence(B, px - 9, pz + 8, px + 9, pz + 8); fence(B, px - 9, pz - 8, px - 9, pz + 2);
  SPOTS.sheepPen = { x: px, z: pz };
  for (const [dx, dz] of [[-6, 12], [8, 14], [-14, -6], [12, -14]]) { const [x, z] = at(dx, dz); if (roadClear(x, z, 1)) lamp(B, G, x, z); }
  for (const [dx, dz] of [[34, 14], [35, 16], [-17, 25]]) { const [x, z] = at(dx, dz); if (roadClear(x, z, 1)) barrel(B, x, z); }
  const [sx, sz] = at(-2, -18); bench(B, sx, sz, 0);
  const [wsx, wsz] = at(-6, -12);
  warpStone(G, B, 'kazami', '風見の村', wsx, wsz);
  finishPlace(B, G);
}

function buildAcademy() {
  const pl = PLACE.academy, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  const stone = 0xd8d2e0, roof = 0x5a3a8a;
  B.box(X, y + 9, Z - 22, 36, 18, 16, stone);
  addBoxCollider(X, Z - 22, 18, 8);
  B.prism(X, y + 18, Z - 22, 38, 7, 18, roof, Math.PI / 2);
  for (let k = -3; k <= 3; k++) G.box(X + k * 4.5, y + 11, Z - 13.9, 1.2, 2.4, 0.1, 0x9ad4ff);
  B.box(X, y + 2, Z - 13.8, 4, 4, 0.2, 0x3a2a4a);
  tower(B, X - 20, Z - 26, 5, 26, stone, roof, y);
  tower(B, X + 20, Z - 26, 5, 26, stone, roof, y);
  tower(B, X + 26, Z + 10, 6, 34, stone, roof, y);
  // 中庭
  B.cyl(X, y + 0.1, Z + 8, 14, 14, 0.2, 0xc9c0d6, 24);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    const x = X + Math.cos(a) * 13, z = Z + 8 + Math.sin(a) * 13;
    if (roadClear(x, z, 1)) pillar(B, x, z, 3.5, false, 0xe6e0ec, y);
  }
  // 浮かぶ結晶
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({
    color: 0xd7b8ff, emissive: 0x8a4aff, emissiveIntensity: 0.8, flatShading: true }));
  orb.position.set(X, y + 6, Z + 8);
  const og = makeGlowSprite(0xb48aff, 9, 0.5); og.position.copy(orb.position);
  scene.add(orb, og);
  ANIM.push((dt, t) => { orb.rotation.y += dt * 0.8; orb.position.y = y + 6 + Math.sin(t) * 0.5; og.position.y = orb.position.y; });
  // 練習用のかかし
  for (let k = 0; k < 4; k++) {
    const x = X - 30 + k * 4, z = Z + 20;
    const gy = groundAt(x, z);
    B.cyl(x, gy + 1, z, 0.1, 0.12, 2, 0x6b4a2c, 6);
    B.box(x, gy + 1.5, z, 1.4, 0.15, 0.15, 0x6b4a2c);
    B.sphere(x, gy + 2.2, z, 0.35, 0xd9c28a);
    addCollider(x, z, 0.4);
  }
  const H = (id, dx, dz, ry, o) => house(B, Object.assign({ id, x: X + dx, z: Z + dz, ry, wall: stone, roof, y }, o));
  H('academy_dorm', -34, 2, Math.PI / 2, { w: 14, d: 8, h: 7, sign: '学生寮' });
  H('academy_lib', 34, -4, -Math.PI / 2, { w: 10, d: 8, h: 6, sign: '学院図書室' });
  SPOTS.academyHall = { x: X, z: Z - 10 };
  signAt('魔法学院', X, y + 5.2, Z - 13.4, 1.2);
  warpStone(G, B, 'academy', '魔法学院', X - 16, Z + 20);
  finishPlace(B, G);
}

function buildBelka() {
  const pl = PLACE.belka, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  const H = (id, dx, dz, ry, o) => house(B, Object.assign({ id, x: X + dx, z: Z + dz, ry, wall: 0xf0e2c8, roof: 0xc2653a, y }, o));
  H('belka_guild', 0, -34, 0, { w: 16, d: 10, h: 8, roof: 0x7a4a8a, sign: '商人ギルド', chimney: true });
  H('belka_weapon', -30, -20, Math.PI / 2, { w: 8, d: 7, h: 4.5, roof: 0x5a4a3a, sign: '武器屋 アイアンベル', awning: 0x6a3a2a });
  H('belka_item', 32, -18, -Math.PI / 2, { w: 8, d: 7, h: 4.5, roof: 0x3a7a5a, sign: '道具屋 七つの鞄', awning: 0x3a8a6a });
  H('belka_inn', -30, 22, Math.PI / 2, { w: 11, d: 9, h: 7.5, roof: 0xc2653a, sign: '宿屋 旅鳥の止まり木', chimney: true });
  H('belka_bar', 30, 26, -Math.PI / 2, { w: 10, d: 8, h: 5.5, roof: 0x8a4a2a, sign: '酒場 銀の天秤' });
  H('belka_bank', -4, 40, Math.PI, { w: 10, d: 8, h: 6, wall: 0xe6e0d0, roof: 0x4a5a6a, sign: '両替商' });
  const homes = [[-60, -40, 0], [-64, -8, Math.PI / 2], [-62, 40, Math.PI / 2], [62, -44, 0], [66, 0, -Math.PI / 2],
    [64, 44, -Math.PI / 2], [-30, 64, Math.PI], [36, 66, Math.PI], [-40, -64, 0], [40, -66, 0], [-80, 18, Math.PI / 2], [84, 20, -Math.PI / 2]];
  homes.forEach(([dx, dz, ry], i) => H('belka_h' + i, dx, dz, ry, { w: 7, d: 6.5, h: 5.5 + (i % 3) * 1.5, roof: [0xc2653a, 0xa84a3a, 0xd98a4a][i % 3] }));
  fountain(B, G, X + 14, Z + 4, 1);
  // 時計塔
  const tx = X - 12, tz = Z - 10;
  if (roadClear(tx, tz, 3)) {
    B.box(tx, y + 9, tz, 4.5, 18, 4.5, 0xe6d8bc);
    B.cone(tx, y + 20.5, tz, 3.6, 5, 0x6a3a2a, 4, Math.PI / 4);
    G.cyl(tx, y + 15, tz + 2.3, 1.2, 1.2, 0.1, 0xfff4d0, 16, 0, Math.PI / 2);
    addBoxCollider(tx, tz, 2.3, 2.3);
  }
  const goods = [[0xe85a4a, 0xf2d24a], [0x7ab84a, 0xc9a06a], [0x4a8ab8, 0xf4f1ea], [0xb85ac8, 0xf2a24a]];
  const awn = [0xd9a13a, 0x3a8ab8, 0xb83a4a, 0x5ab84a];
  let si = 0;
  for (const [dx, dz, ry] of [[-14, 16, 0], [-6, 18, 0], [4, 20, 0], [16, 22, Math.PI], [24, 12, -Math.PI / 2], [-16, -2, Math.PI / 2]]) {
    const x = X + dx, z = Z + dz;
    if (!roadClear(x, z, 2.2)) continue;
    const s = stall(B, x, z, ry, awn[si % 4], goods[si % 4]);
    SPOTS['belkaStall' + si] = s;
    si++;
  }
  for (const [dx, dz] of [[10, -10], [-10, 10], [22, -4], [0, 30], [-24, 6]]) { const x = X + dx, z = Z + dz; if (roadClear(x, z, 0.8)) lamp(B, G, x, z, 3.4); }
  for (const [dx, dz] of [[44, 10], [45, 12], [43, 14], [-46, -30], [-45, -28]]) { const x = X + dx, z = Z + dz; if (roadClear(x, z, 0.8)) crate(B, x, z); }
  warpStone(G, B, 'belka', '交易都市ベルカ', X - 8, Z + 30);
  finishPlace(B, G);
}

function buildOasis() {
  const pl = PLACE.oasis, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z;
  const cols = [0xd9a13a, 0xb83a4a, 0x3a7ab8, 0xe8dcc3, 0x8a4ab8];
  const tents = [[-26, -10, 0.4], [-22, 18, 1.2], [4, -30, 0], [30, -16, -0.8], [28, 20, -2], [-6, 32, 3]];
  tents.forEach(([dx, dz, ry], i) => {
    const x = X + dx, z = Z + dz;
    if (!roadClear(x, z, 3.5)) return;
    tent(B, x, z, ry, cols[i % cols.length], 3.4);
    const [ox, oz] = rotXZ(0, 5, ry);
    BLD['oasis_t' + i] = { x, z, ry, door: { x: x + ox, z: z + oz } };
  });
  house(B, { id: 'oasis_chief', x: X - 40, z: Z - 30, ry: 0.9, w: 10, d: 8, h: 4, wall: 0xdcc59a, roof: 0xc9a870, flat: true, sign: '族長の館' });
  house(B, { id: 'oasis_inn', x: X + 44, z: Z - 6, ry: -Math.PI / 2, w: 9, d: 8, h: 4.2, wall: 0xdcc59a, roof: 0xc9a870, flat: true, sign: '砂の宿' });
  const L = LAKES[1];
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2;
    const x = L.x + Math.cos(a) * (L.r + 4), z = L.z + Math.sin(a) * (L.r + 4);
    if (roadClear(x, z, 1)) palm(B, x, groundAt(x, z), z, mulberry32(k + 9));
  }
  for (const [dx, dz, ry] of [[-10, -40, 0.2], [14, 36, 3]]) {
    const x = X + dx, z = Z + dz;
    if (roadClear(x, z, 2)) SPOTS['oasisStall' + dx] = stall(B, x, z, ry, 0xb83a4a, [0xf2d24a, 0xe8a84a]);
  }
  warpStone(G, B, 'oasis', 'オアシスの集落サラ', X + 20, Z + 36);
  finishPlace(B, G);
}

function buildPass() {
  const pl = PLACE.pass, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z;
  house(B, { id: 'pass_tea', x: X - 16, z: Z + 4, ry: Math.PI / 2, w: 9, d: 7, h: 3.6, wall: 0x9a7a5a, roof: 0x4a3a2a, timber: 0x3a2a1a, sign: '峠の茶屋', awning: 0x9a2a2a });
  house(B, { id: 'pass_hut', x: X + 17, z: Z - 8, ry: -Math.PI / 2, w: 7, d: 6, h: 3.2, wall: 0x8a6a4a, roof: 0x3a3a3a, sign: '山小屋' });
  for (const [dx, dz] of [[-8, 14], [8, 12], [-6, -14], [6, -16]]) {
    const x = X + dx, z = Z + dz;
    if (!roadClear(x, z, 1)) continue;
    const gy = groundAt(x, z);
    B.box(x, gy + 0.6, z, 0.7, 1.2, 0.7, 0x8f897d);
    G.box(x, gy + 1.45, z, 0.55, 0.5, 0.55, 0xffc46a);
    B.box(x, gy + 1.9, z, 0.9, 0.3, 0.9, 0x8f897d);
  }
  const [bx, bz] = [X - 9, Z + 12]; if (roadClear(bx, bz, 1)) bench(B, bx, bz, Math.PI / 2);
  warpStone(G, B, 'pass', '霧の峠', X + 10, Z + 14);
  finishPlace(B, G);
}

function buildGate() {
  const pl = PLACE.gate, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z;
  // 道の向きに直交する柵と門
  const rs = ROAD_DATA.roads[MOUNTAIN_ROAD].samples;
  let best = rs[0];
  for (const s of rs) if (dist2(s.x, s.z, X, Z) < dist2(best.x, best.z, X, Z)) best = s;
  const i = rs.indexOf(best);
  const a = rs[Math.max(0, i - 2)], b = rs[Math.min(rs.length - 1, i + 2)];
  const dir = Math.atan2(b.x - a.x, b.z - a.z);
  const [px, pz] = rotXZ(1, 0, dir);
  const gx = best.x, gz = best.z;
  for (const s of [-1, 1]) {
    const x1 = gx + px * s * 6, z1 = gz + pz * s * 6, x2 = gx + px * s * 40, z2 = gz + pz * s * 40;
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.round(L / 0.9);
    for (let k = 0; k <= n; k++) {
      const x = lerp(x1, x2, k / n), z = lerp(z1, z2, k / n);
      const gy = groundAt(x, z);
      B.cyl(x, gy + 2.2, z, 0.35, 0.4, 4.4, 0x6b4a2c, 6);
      B.cone(x, gy + 4.7, z, 0.35, 0.6, 0x6b4a2c, 6);
    }
    addWallCollider(x1, z1, x2, z2, 0.8);
    tower(B, gx + px * s * 6.5, gz + pz * s * 6.5, 2.2, 8, 0x5a4a3a, 0x2a2a2a);
    flagPole(B, gx + px * s * 9, gz + pz * s * 9, 0x8a1a1a, 7);
  }
  B.box(gx, groundAt(gx, gz) + 8.5, gz, 13, 1.2, 1.6, 0x5a4a3a, dir + Math.PI / 2);
  signAt('ガルヴァス帝国 関所', gx, groundAt(gx, gz) + 10, gz, 1.0, { bg: 'rgba(60,16,16,0.92)' });
  SPOTS.gate = { x: gx, z: gz, dir, px, pz };
  const [hx, hz] = [gx + px * 16 - Math.sin(dir) * 8, gz + pz * 16 - Math.cos(dir) * 8];
  house(B, { id: 'gate_hut', x: hx, z: hz, ry: dir, w: 7, d: 6, h: 3.4, wall: 0x6a5a4a, roof: 0x3a2a2a });
  finishPlace(B, G);
}

function buildEmpire() {
  const pl = PLACE.empire, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh, E = 122;
  const wallC = 0x5e5a58, roofR = 0x8a1a1a;
  // 帝国の城壁・塔・家は魔法で壊せる（壁は一片ずつ）
  const EW = (x1, z1, x2, z2) => {
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / 30));
    for (let i = 0; i < n; i++) {
      const ax = lerp(x1, x2, i / n), az = lerp(z1, z2, i / n), bx = lerp(x1, x2, (i + 1) / n), bz = lerp(z1, z2, (i + 1) / n);
      makeStructure({ x: (ax + bx) / 2, z: (az + bz) / 2, r: L / n / 2, hp: 40000, name: '帝都の城壁', zone: 'empire' }, (sb) => wallLine(sb, ax, az, bx, bz, 14, 4, wallC, y));
    }
  };
  const ET = (x, z, r, h, roof, ty) => makeStructure({ x, z, r: r + 1, hp: 30000, name: '帝都の塔', zone: 'empire' }, (sb) => tower(sb, x, z, r, h, wallC, roof, ty));
  // 城壁（南に門）
  const gw = 9;
  EW(X - E, Z - E, X + E, Z - E);
  EW(X + E, Z - E, X + E, Z + E);
  EW(X - E, Z - E, X - E, Z + E);
  // 南門は道の入る位置に合わせる
  const rs = ROAD_DATA.roads[MOUNTAIN_ROAD].samples;
  let gxs = X;
  for (const s of rs) if (Math.abs(s.z - (Z + E)) < 3) gxs = s.x;
  EW(X - E, Z + E, gxs - gw, Z + E);
  EW(gxs + gw, Z + E, X + E, Z + E);
  makeStructure({ x: gxs, z: Z + E, r: 12, hp: 50000, name: '帝都の南門', zone: 'empire' }, (sb) => {
    sb.box(gxs, y + 15, Z + E, gw * 2 + 6, 3, 4.4, wallC);
    tower(sb, gxs - gw - 3, Z + E, 4.2, 20, wallC, roofR, y);
    tower(sb, gxs + gw + 3, Z + E, 4.2, 20, wallC, roofR, y);
  });
  SPOTS.empireGate = { x: gxs, z: Z + E - 14 };
  for (const [cx, cz] of [[-E, -E], [E, -E], [-E, E], [E, E], [0, -E], [-E, 0], [E, 0]]) ET(X + cx, Z + cz, 6, 22, roofR, y);
  // 宮殿
  const kz = Z - 70;
  B.box(X, y + 1.5, kz, 80, 3, 46, 0x4a4644);
  addPlatform(X, kz, 40, 23, 0, y + 3);
  for (let k = 0; k < 6; k++) {
    const sz = kz + 23.5 + (5 - k) * 0.9;
    B.box(X, y + 0.25 + k * 0.5, sz, 20, 0.5, 1.0, 0x4a4644);
    addPlatform(X, sz, 10, 0.5, 0, y + 0.5 + k * 0.5);
  }
  B.box(X, y + 17, kz - 10, 56, 28, 22, 0x6e6966);
  addBoxCollider(X, kz - 10, 28, 11);
  addBoxCollider(X - 35, kz, 5, 23); addBoxCollider(X + 35, kz, 5, 23);
  B.prism(X, y + 31, kz - 10, 58, 10, 24, roofR, Math.PI / 2);
  for (const sx of [-30, 30]) tower(B, X + sx, kz - 20, 7, 42, 0x6e6966, roofR, y + 3);
  tower(B, X, kz - 16, 8, 55, 0x6e6966, 0x2a1a1a, y + 3);
  for (let k = -3; k <= 3; k++) G.box(X + k * 7, y + 20, kz + 1.1, 1.4, 3.4, 0.1, 0xff6a3a);
  // 玉座の広間
  const ty = y + 3;
  for (const sx of [-12, -6, 6, 12]) for (const sz of [-7, 7]) pillar(B, X + sx, kz + 8 + sz, 9, false, 0x3c3836, ty);
  B.box(X, ty + 10.2, kz + 8, 28, 1, 18, 0x4a4644);
  B.prism(X, ty + 10.7, kz + 8, 29, 4, 19, roofR, Math.PI / 2);
  B.box(X, ty + 0.03, kz + 10, 3.4, 0.06, 22, 0x6a0a0a);
  B.box(X, ty + 0.5, kz + 4.2, 6, 1, 3.4, 0x2a2624);
  B.box(X, ty + 2, kz + 3.0, 2, 3.2, 0.5, 0x2a2624);
  G.box(X, ty + 3.8, kz + 3.0, 0.6, 0.6, 0.6, 0xff3a2a);
  addBoxCollider(X, kz + 3.0, 1, 0.3);
  SPOTS.emperorThrone = { x: X, z: kz + 5.2, y: ty + 1 };
  for (const sx of [-15, 15]) flagPole(B, X + sx, kz + 18, 0x8a1a1a, 9, ty);
  // 町並み
  const H = (id, dx, dz, ry, o) => {
    let info;
    makeStructure({ x: X + dx, z: Z + dz, r: Math.max(o.w || 7, o.d || 6) * 0.7, hp: 12000, name: '帝都の建物', zone: 'empire' },
      (sb) => { info = house(sb, Object.assign({ id, x: X + dx, z: Z + dz, ry, wall: 0x9a918a, roof: 0x5a2a2a, y }, o)); });
    return info;
  };
  H('empire_weapon', -32, 20, Math.PI / 2, { w: 9, d: 8, h: 5, sign: '帝国武具店', awning: 0x6a1a1a });
  H('empire_item', 30, 18, -Math.PI / 2, { w: 9, d: 8, h: 5, sign: '帝国薬舗', awning: 0x3a3a3a });
  H('empire_inn', -34, 52, Math.PI / 2, { w: 12, d: 10, h: 8, sign: '宿屋 鉄の揺り籠', chimney: true });
  H('empire_lab', 40, 52, -Math.PI / 2, { w: 14, d: 10, h: 9, wall: 0x7a7470, roof: 0x3a3a4a, sign: '魔導技術院' });
  H('empire_barracks', -70, -12, Math.PI / 2, { w: 22, d: 10, h: 6, wall: 0x7a7470, roof: 0x3a2a2a, sign: '兵舎' });
  const homes = [[-80, 40, Math.PI / 2], [-80, 70, Math.PI / 2], [-50, 96, Math.PI], [-20, 98, Math.PI], [40, 98, Math.PI],
    [70, 96, Math.PI], [86, 60, -Math.PI / 2], [86, 30, -Math.PI / 2], [80, -12, -Math.PI / 2], [-96, 96, 0], [100, 100, 0]];
  homes.forEach(([dx, dz, ry], i) => H('empire_h' + i, dx, dz, ry, { w: 8, d: 7, h: 6 + (i % 3) * 2, roof: [0x5a2a2a, 0x3a3a3a, 0x6a3a2a][i % 3] }));
  for (let k = -2; k <= 2; k++) for (const sz of [0, 40]) {
    const x = X + k * 18 + 6, z = Z + sz + 6;
    if (roadClear(x, z, 0.8)) lamp(B, G, x, z, 4);
  }
  statue(B, X - 16, Z - 34, 0x4a4644); statue(B, X + 16, Z - 34, 0x4a4644);
  // 魔導兵器（飾り）
  const mx = X + 60, mz = Z - 40;
  B.box(mx, y + 2, mz, 6, 4, 10, 0x3a3a3e);
  B.cyl(mx, y + 5, mz + 3, 0.8, 1.0, 8, 0x2a2a2e, 10, 0, 1.0);
  G.sphere(mx, y + 4.2, mz - 2, 0.9, 0xff4a2a);
  addBoxCollider(mx, mz, 3, 5);
  warpStone(G, B, 'empire', '帝都ガルヴァス', X + 12, Z + 70);
  finishPlace(B, G);
}

function buildRuins() {
  const pl = PLACE.ruins, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  const R = mulberry32(404);
  const st = 0xbfb6a2;
  // 神殿の土台
  B.box(X, y + 0.6, Z - 30, 40, 1.2, 30, 0xa89f8c);
  addPlatform(X, Z - 30, 20, 15, 0, y + 1.2);
  for (let k = 0; k < 3; k++) {
    const sz = Z - 13.5 + (2 - k) * 0.8;
    B.box(X, y + 0.2 + k * 0.4, sz, 14, 0.4, 0.8, 0xa89f8c);
    addPlatform(X, sz, 7, 0.45, 0, y + 0.4 + k * 0.4);
  }
  for (let i = -3; i <= 3; i++) for (const sz of [-12, 0]) {
    const x = X + i * 5.5, z = Z - 30 + sz + 6;
    pillar(B, x, z, R() < 0.4 ? 2 + R() * 3 : 8, R() < 0.4, st, y + 1.2);
  }
  // 地下迷宮への入口
  const ex = X, ez = Z - 38;
  B.box(ex - 4, y + 3.5, ez, 1.6, 7, 3, 0x8f877a);
  B.box(ex + 4, y + 3.5, ez, 1.6, 7, 3, 0x8f877a);
  B.box(ex, y + 7.5, ez, 10, 1.4, 3.4, 0x8f877a);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6), MAT.dark);
  portal.position.set(ex, y + 4.2, ez + 0.5);
  scene.add(portal);
  G.box(ex, y + 7.5, ez + 1.75, 4, 0.5, 0.1, 0x7affd4);
  addBoxCollider(ex - 4, ez, 0.8, 1.5); addBoxCollider(ex + 4, ez, 0.8, 1.5);
  addBoxCollider(ex, ez - 1.2, 3.4, 0.4);
  signAt('地下迷宮', ex, y + 9.2, ez + 1.2, 0.9, { bg: 'rgba(20,30,34,0.9)' });
  SPOTS.dungeonDoor = { x: ex, z: ez + 3 };
  INTERACT.push({ kind: 'dungeon', x: ex, z: ez + 2.4, r: 3.4, label: '地下迷宮に入る' });
  // 崩れた壁やアーチ
  for (let k = 0; k < 16; k++) {
    const a = R() * Math.PI * 2, r = 40 + R() * 45;
    const x = X + Math.cos(a) * r, z = Z + Math.sin(a) * r;
    if (!roadClear(x, z, 2)) continue;
    const gy = groundAt(x, z);
    if (R() < 0.5) {
      const L = 4 + R() * 8, h = 1 + R() * 4;
      B.box(x, gy + h / 2 - 0.3, z, 1.2, h, L, st, a);
      addBoxCollider(x, z, 0.6, L / 2, a);
    } else {
      B.dodeca(x, gy + 0.5, z, 1 + R() * 1.4, 0xa89f8c, 1, 0.7, 1.2, R(), R(), R());
      addCollider(x, z, 1.2);
    }
  }
  for (const [dx, dz] of [[-24, 20], [24, 20]]) {
    const x = X + dx, z = Z + dz, gy = groundAt(x, z);
    B.box(x - 3, gy + 3, z, 1.4, 6, 1.4, st); B.box(x + 3, gy + 3, z, 1.4, 6, 1.4, st);
    B.box(x, gy + 6.6, z, 8, 1.2, 1.6, st);
    addCollider(x - 3, z, 1); addCollider(x + 3, z, 1);
  }
  // 光るルーン
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2;
    const x = X + Math.cos(a) * 16, z = Z + 10 + Math.sin(a) * 16;
    G.box(x, groundAt(x, z) + 0.05, z, 1.2, 0.05, 1.2, 0x7affd4, a);
  }
  house(B, { id: 'ruins_camp', x: X + 52, z: Z + 30, ry: -Math.PI / 2, w: 6, d: 5, h: 2.8, wall: 0xc9b89a, roof: 0x7a8a5a, sign: '調査隊の野営地' });
  tent(B, X + 44, Z + 44, 0.5, 0x8a9a6a, 2.6);
  warpStone(G, B, 'ruins', '古代遺跡', X + 30, Z + 14);
  finishPlace(B, G);
}

function buildLeafe() {
  const pl = PLACE.leafe, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  // 大樹
  B.cyl(X, y + 16, Z, 3.2, 5.2, 32, 0x6b4a2c, 10);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2;
    B.cyl(X + Math.cos(a) * 4.5, y + 0.8, Z + Math.sin(a) * 4.5, 0.9, 1.6, 2.4, 0x5d4028, 6, 0, 0, 0.6);
  }
  const c = 0x3f7a3a;
  B.sphere(X, y + 34, Z, 13, c, 1, 0.7, 1, 1);
  B.sphere(X + 9, y + 29, Z + 4, 8, 0x4a8a3f, 1, 0.7, 1, 1);
  B.sphere(X - 8, y + 30, Z - 5, 9, 0x3a6f35, 1, 0.7, 1, 1);
  addCollider(X, Z, 5.4);
  // 高床の家
  const huts = [[-22, -8, 1.2], [20, -12, -1.2], [-16, 20, 2.4], [18, 18, -2.2], [0, -26, 0]];
  huts.forEach(([dx, dz, ry], i) => {
    const hx = X + dx, hz = Z + dz;
    const gy = groundAt(hx, hz);
    for (const sx of [-2, 2]) for (const sz of [-2, 2]) { const [ox, oz] = rotXZ(sx, sz, ry); B.cyl(hx + ox, gy + 1.5, hz + oz, 0.18, 0.2, 3, 0x5d4028, 6); }
    B.cyl(hx, gy + 4.8, hz, 3.2, 3.2, 3.4, 0xa88a5a, 10);
    B.cone(hx, gy + 8, hz, 4.2, 3.2, 0x5a7a3a, 10);
    const [ox, oz] = rotXZ(0, 3.2, ry);
    B.box(hx + ox, gy + 4.4, hz + oz, 1.1, 2.1, 0.12, 0x4a3222, ry);
    addCollider(hx, hz, 2.8);
    const [dx2, dz2] = rotXZ(0, 5.2, ry);
    BLD['leafe_h' + i] = { x: hx, z: hz, ry, door: { x: hx + dx2, z: hz + dz2 } };
  });
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const x = X + Math.cos(a) * 12, z = Z + Math.sin(a) * 12;
    G.sphere(x, groundAt(x, z) + 2.2 + (k % 3) * 0.6, z, 0.25, 0xaaffcc);
  }
  warpStone(G, B, 'leafe', '森の集落リーフェ', X + 10, Z + 30);
  finishPlace(B, G);
}

function buildSwamp() {
  const pl = PLACE.swamp, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z;
  const gy = groundAt(X, Z);
  for (const sx of [-2.5, 2.5]) for (const sz of [-2, 2]) B.cyl(X + sx, gy + 1.2, Z + sz, 0.2, 0.25, 2.4, 0x3a3228, 5);
  B.box(X, gy + 2.6, Z, 7, 0.4, 6, 0x4a3d2e);
  B.box(X, gy + 4.4, Z, 6, 3.4, 5, 0x5a4a3a, 0.08);
  B.prism(X, gy + 6.0, Z, 7.5, 3.6, 6.5, 0x3a4a2a, 0.12);
  B.box(X, gy + 3.9, Z + 2.55, 1.2, 2, 0.1, 0x2a1a1a);
  G.box(X - 1.8, gy + 4.8, Z + 2.55, 0.8, 0.8, 0.1, 0x9aff6a);
  for (let k = 0; k < 5; k++) B.box(X, gy + 0.3 + k * 0.5, Z + 4.4 + (4 - k) * 0.7, 1.6, 0.2, 0.7, 0x4a3d2e);
  addBoxCollider(X, Z, 3.5, 3);
  BLD.swamp_hut = { x: X, z: Z, ry: 0, door: { x: X + 1.6, z: Z + 9 } };
  // 大釜
  const cx = X - 6, cz = Z + 9, cy = groundAt(cx, cz);
  B.cyl(cx, cy + 0.6, cz, 1.1, 0.8, 1.2, 0x2a2a2a, 10);
  G.cyl(cx, cy + 1.15, cz, 0.95, 0.95, 0.08, 0x7aff4a, 10);
  G.box(cx, cy + 0.15, cz, 0.8, 0.2, 0.8, 0xff7a2a);
  addCollider(cx, cz, 1.2);
  for (let k = 0; k < 4; k++) { const a = k * 1.7; const x = X + Math.cos(a) * 9, z = Z - 4 + Math.sin(a) * 6; B.sphere(x, groundAt(x, z) + 0.2, z, 0.25, 0xe8e0cc); }
  finishPlace(B, G);
}

function buildMarina() {
  const pl = PLACE.marina, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  const H = (id, dx, dz, ry, o) => house(B, Object.assign({ id, x: X + dx, z: Z + dz, ry, wall: 0xf4f0e6, roof: 0xd9743a, y }, o));
  H('marina_harbor', 22, 40, Math.PI, { w: 10, d: 8, h: 5.5, roof: 0x3a6a9a, sign: '港務所' });
  H('marina_item', -28, 12, Math.PI / 2, { w: 8, d: 7, h: 4.4, roof: 0x3a8a8a, sign: '道具屋 潮風', awning: 0x3a9ab8 });
  H('marina_inn', 30, -6, -Math.PI / 2, { w: 11, d: 9, h: 7, sign: '宿屋 カモメの巣', chimney: true });
  H('marina_bar', -26, -24, Math.PI / 2, { w: 10, d: 8, h: 5, roof: 0x8a4a2a, sign: '酒場 錨亭' });
  H('marina_weapon', 34, -34, -Math.PI / 2, { w: 8, d: 7, h: 4.4, roof: 0x5a4a3a, sign: '武器屋 波切り', awning: 0x2a4a7a });
  const homes = [[-50, -10, Math.PI / 2], [-52, 20, Math.PI / 2], [54, 14, -Math.PI / 2], [56, -20, -Math.PI / 2], [-8, -54, 0],
    [20, -58, 0], [-40, -46, 0.5], [44, -52, -0.5]];
  homes.forEach(([dx, dz, ry], i) => H('marina_h' + i, dx, dz, ry, { w: 7, d: 6, h: 4 + (i % 2) * 2, roof: [0xd9743a, 0x3a7ab8, 0xe8b84a][i % 3] }));
  // 桟橋
  const dockTop = 1.8;
  const dk = (x, z, hx, hz) => {
    B.box(x, dockTop - 0.25, z, hx * 2, 0.5, hz * 2, 0x8a6a45);
    for (let i = -1; i <= 1; i += 2) for (let k = -1; k <= 1; k += 2) B.cyl(x + i * (hx - 0.4), -3, z + k * (hz - 0.4), 0.25, 0.25, 9.6, 0x5d4028, 6);
    addPlatform(x, z, hx, hz, 0, dockTop);
  };
  dk(X, Z + 100, 3.5, 22);
  dk(X - 14, Z + 116, 14, 3);
  dk(X + 16, Z + 110, 16, 3);
  SPOTS.ferry = { x: X + 28, z: Z + 110 };
  boat(B, X + 30, Z + 116, Math.PI / 2, 7, 0x8a5a3a);
  boat(B, X - 24, Z + 122, Math.PI / 2 + 0.2, 6, 0x5a6a8a);
  boat(B, X - 6, Z + 124, 0.3, 5, 0x7a4a3a);
  // 大きな帆船
  const sx = X + 60, sz = Z + 140;
  B.box(sx, 1.2, sz, 7, 3, 26, 0x5d4028);
  B.cone(sx, 1.2, sz + 15, 3.5, 5, 0x5d4028, 4, Math.PI / 4, Math.PI / 2);
  B.box(sx, 3, sz - 9, 7, 3, 6, 0x6b4a2c);
  B.cyl(sx, 12, sz, 0.3, 0.4, 20, 0x4a3222, 6);
  B.box(sx, 13, sz, 9, 10, 0.2, 0xf4f0e6);
  addBoxCollider(sx, sz, 3.5, 14);
  for (const [dx, dz] of [[-6, 70], [6, 70], [-12, 84], [12, 88]]) { const x = X + dx, z = Z + dz; if (roadClear(x, z, 0.8)) barrel(B, x, z); }
  for (const [dx, dz] of [[-16, 60], [14, 58], [0, 30]]) { const x = X + dx, z = Z + dz; if (roadClear(x, z, 0.8)) lamp(B, G, x, z, 3.4); }
  for (const [dx, dz, ry] of [[-14, 44, Math.PI / 2], [-14, 52, Math.PI / 2]]) {
    const x = X + dx, z = Z + dz;
    if (roadClear(x, z, 2)) SPOTS['fishStall' + dz] = stall(B, x, z, ry, 0x3a9ab8, [0xc0d8e8, 0xe8a07a]);
  }
  warpStone(G, B, 'marina', '港町マリナ', X - 10, Z + 34);
  finishPlace(B, G);
}

function buildIsland() {
  const pl = PLACE.island, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  // 神社
  const sx = X, sz = Z - 20;
  B.box(sx, y + 0.5, sz, 10, 1, 8, 0x8f877a);
  B.box(sx, y + 2.8, sz, 7, 3.6, 5.5, 0xf4efe4);
  B.prism(sx, y + 4.6, sz, 9.5, 2.6, 7.5, 0x3a3a3a, Math.PI / 2);
  B.box(sx, y + 2.2, sz + 2.8, 2.6, 2.2, 0.1, 0x9a2a2a);
  addBoxCollider(sx, sz, 5, 4);
  for (let k = 0; k < 3; k++) {
    const tz = sz + 12 + k * 7;
    const gy = groundAt(sx, tz);
    B.cyl(sx - 2.4, gy + 2.3, tz, 0.25, 0.28, 4.6, 0xc8321e, 8);
    B.cyl(sx + 2.4, gy + 2.3, tz, 0.25, 0.28, 4.6, 0xc8321e, 8);
    B.box(sx, gy + 4.8, tz, 6.6, 0.4, 0.5, 0x2a2a2a);
    B.box(sx, gy + 4.1, tz, 5.6, 0.3, 0.35, 0xc8321e);
    addCollider(sx - 2.4, tz, 0.35); addCollider(sx + 2.4, tz, 0.35);
  }
  SPOTS.shrine = { x: sx, z: sz + 7 };
  house(B, { id: 'island_h0', x: X - 26, z: Z + 8, ry: Math.PI / 2, w: 7, d: 6, h: 3.4, wall: 0xe0d6c0, roof: 0x5a6a7a });
  house(B, { id: 'island_h1', x: X + 26, z: Z + 12, ry: -Math.PI / 2, w: 7, d: 6, h: 3.4, wall: 0xe0d6c0, roof: 0x7a5a4a });
  // 灯台
  const lx = X + 78, lz = Z - 20, ly = groundAt(lx, lz);
  for (let k = 0; k < 5; k++) B.cyl(lx, ly + 2 + k * 4, lz, 2.6 - k * 0.2, 2.8 - k * 0.2, 4, k % 2 ? 0xc8321e : 0xf4f0e6, 12);
  G.cyl(lx, ly + 22.5, lz, 1.4, 1.4, 1.8, 0xfff2b0, 10);
  B.cone(lx, ly + 24.5, lz, 2.2, 2.2, 0x3a3a3a, 10);
  addCollider(lx, lz, 2.9);
  const beam = makeGlowSprite(0xfff2b0, 14, 0.7);
  beam.position.set(lx, ly + 22.5, lz);
  scene.add(beam);
  ANIM.push((dt, t) => { beam.material.opacity = 0.4 + 0.3 * Math.sin(t * 1.5); });
  SPOTS.lighthouse = { x: lx, z: lz - 5 };
  // 桟橋（本土側）
  const dx = X - 20, dz = Z - 100;
  B.box(dx, 1.55, dz, 5, 0.5, 32, 0x8a6a45);
  for (let k = -1; k <= 1; k += 2) for (let m = -1; m <= 1; m++) B.cyl(dx + k * 2.1, -3, dz + m * 14, 0.25, 0.25, 9.6, 0x5d4028, 6);
  addPlatform(dx, dz, 2.5, 16, 0, 1.8);
  SPOTS.islandDock = { x: dx, z: dz - 10 };
  boat(B, dx + 5, dz - 6, 0, 6, 0x8a5a3a);
  warpStone(G, B, 'island', '月影島', X + 14, Z + 20);
  finishPlace(B, G);
}

function buildDragon() {
  const pl = PLACE.dragon, B = new Builder(), G = new Builder();
  const X = pl.x, Z = pl.z, y = pl.fh;
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2;
    const x = X + Math.cos(a) * 36, z = Z + Math.sin(a) * 36;
    if (!roadClear(x, z, 2)) continue;
    const h = 5 + (k % 3) * 3;
    B.box(x, groundAt(x, z) + h / 2 - 0.5, z, 2.4, h, 1.6, 0x6f6a62, -a);
    addCollider(x, z, 1.3);
  }
  // 骨と巣
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9, x = X - 14 + Math.cos(a) * 5, z = Z - 12 + Math.sin(a) * 5;
    B.cyl(x, y + 1.2, z, 0.2, 0.35, 3.5, 0xe8e0cc, 6, a, 0, 0.9);
  }
  B.sphere(X - 14, y + 0.6, Z - 12, 1.2, 0xe8e0cc, 1.2, 0.9, 1);
  B.torus(X + 10, y + 0.5, Z - 8, 5, 1.2, 0x6b5a3a, Math.PI / 2);
  SPOTS.dragonNest = { x: X, z: Z - 6 };
  finishPlace(B, G);
}

function buildSpring() {
  const pl = PLACE.spring, B = new Builder(), G = new Builder();
  const L = LAKES[2];
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2;
    const x = L.x + Math.cos(a) * (L.r + 1.5), z = L.z + Math.sin(a) * (L.r + 1.5);
    B.dodeca(x, groundAt(x, z) + 0.2, z, 0.6, 0xb5ab98, 1, 0.6, 1);
    G.box(x + Math.cos(a) * 2, groundAt(x, z) + 0.2, z + Math.sin(a) * 2, 0.25, 0.25, 0.25, k % 2 ? 0xffb8f0 : 0xb8f0ff);
  }
  const sp = makeGlowSprite(0xd8b8ff, 12, 0.35);
  sp.position.set(L.x, L.level + 2, L.z);
  scene.add(sp);
  ANIM.push((dt, t) => { sp.material.opacity = 0.25 + 0.15 * Math.sin(t * 1.3); });
  void pl;
  finishPlace(B, G);
}

function buildBridges() {
  const B = new Builder();
  for (const br of BRIDGES) bridge(B, br);
  finishPlace(B);
}

function buildMarkers() {
  // 世界に散らばる魔力の結晶
  const pts = [
    ['c_spring', -330, 52], ['c_lake', -120, -512], ['c_ruins', -820, -372], ['c_desert', 900, -760],
    ['c_swamp', -760, 700], ['c_island', 878, 1040], ['c_peak', -915, -995], ['c_forest', -560, 40],
    ['c_hill', 300, 420], ['c_coast', -300, 850], ['c_east', 905, -40], ['c_north', -300, -1080],
    ['c_pass', 150, -700], ['c_belka', 700, 120], ['c_kazami', 190, 330]
  ];
  for (const [id, x, z] of pts) crystalAt(id, x, z);
}

/* =========================================================
   地下迷宮
   ========================================================= */
const DUNGEON_MAP = [
  '#########################',
  '#S....#.........#.......#',
  '#.....#...E.....#...E...#',
  '#.....#...###...#.......#',
  '#.........#C#...........#',
  '####.######.#####.#######',
  '#.......#.......#.......#',
  '#..E....#...E...#...E...#',
  '#.......#.......#.......#',
  '#.......................#',
  '####.#######.#######.####',
  '#....#.....#...#........#',
  '#.E..#..E..#.C.#..E.....#',
  '#....#.....#...#........#',
  '#...........#...........#',
  '###########...###########',
  '#.......................#',
  '#.......................#',
  '#...........B...........#',
  '#.......................#',
  '#########################'
];
const DCELL = 6;
const DUNGEON = { x0: CONFIG.dungeonX, z0: 0, start: null, boss: null, enemies: [], crystals: [] };
function dcell(c, r) { return [DUNGEON.x0 + c * DCELL, DUNGEON.z0 + r * DCELL]; }
function buildDungeon() {
  const B = new Builder(), G = new Builder();
  const rows = DUNGEON_MAP.length, cols = DUNGEON_MAP[0].length;
  const [fx, fz] = dcell((cols - 1) / 2, (rows - 1) / 2);
  B.box(fx, -0.5, fz, cols * DCELL, 1, rows * DCELL, 0x3a3834);
  const R = mulberry32(99);
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (DUNGEON_MAP[r][c] !== '#') { c++; continue; }
      let e = c;
      while (e + 1 < cols && DUNGEON_MAP[r][e + 1] === '#') e++;
      const [x1, z] = dcell(c, r), [x2] = dcell(e, r);
      const cx = (x1 + x2) / 2, w = (e - c + 1) * DCELL;
      B.box(cx, 4, z, w, 8, DCELL, 0x55504a);
      addBoxCollider(cx, z, w / 2, DCELL / 2);
      c = e + 1;
    }
    for (let k = 0; k < cols; k++) {
      const ch = DUNGEON_MAP[r][k];
      const [x, z] = dcell(k, r);
      if (ch !== '#') {
        if (R() < 0.3) B.box(x + (R() - 0.5) * 3, 0.02, z + (R() - 0.5) * 3, 2 + R() * 2, 0.04, 2 + R() * 2, 0x46423c);
        // 壁ぎわの松明
        if (ch === '.' && (r + k) % 5 === 0 && DUNGEON_MAP[r - 1] && DUNGEON_MAP[r - 1][k] === '#') {
          B.box(x, 3, z - DCELL / 2 + 0.3, 0.2, 0.8, 0.2, 0x3a2a1a);
          G.box(x, 3.55, z - DCELL / 2 + 0.3, 0.3, 0.4, 0.3, 0xffa84a);
        }
      }
      if (ch === 'S') DUNGEON.start = { x, z };
      if (ch === 'B') DUNGEON.boss = { x, z };
      if (ch === 'E') DUNGEON.enemies.push({ x, z });
      if (ch === 'C') DUNGEON.crystals.push({ x, z });
    }
  }
  // 入口の光る魔法陣（出口）
  const { x: sx, z: sz } = DUNGEON.start;
  G.torus(sx, 0.05, sz, 2, 0.12, 0x7affd4, Math.PI / 2);
  const sg = makeGlowSprite(0x7affd4, 5, 0.5);
  sg.position.set(sx, 1.2, sz);
  scene.add(sg);
  INTERACT.push({ kind: 'dungeonExit', x: sx, z: sz, r: 3, label: '地上へ戻る' });
  DUNGEON.crystals.forEach((c, i) => crystalAt('c_dungeon' + i, c.x, c.z));
  finishPlace(B, G);
}

function buildAllPlaces(progress) {
  const steps = [buildStart, buildKazami, buildCapital, buildAcademy, buildBelka, buildOasis, buildPass, buildGate,
    buildEmpire, buildRuins, buildLeafe, buildSwamp, buildMarina, buildIsland, buildDragon, buildSpring, buildBridges, buildMarkers, buildDungeon];
  steps.forEach((f, i) => { f(); progress && progress(i / steps.length); });
}

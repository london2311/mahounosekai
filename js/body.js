'use strict';
/* =========================================================
   人の体（骨格つきの滑らかな人体）
   - 部位ごとに骨を持ち、1体を1回の描画で動かす（SkinnedMesh）
   - 同じ形を、大軍勢（InstancedMesh）・亡骸・ちぎれた部位にも使う
   部位番号＝骨の番号
     0 腰  1 胸  2 首と頭  3 左上腕  4 左前腕と手  5 右上腕  6 右前腕と手
     7 左もも  8 左すねと足  9 右もも  10 右すねと足
   ========================================================= */
const BODY_SCALE = 1.2;         // 以前の人形と同じくらいの背丈にする
const PART = { hips: 0, chest: 1, head: 2, uArmL: 3, fArmL: 4, uArmR: 5, fArmR: 6, thighL: 7, shinL: 8, thighR: 9, shinR: 10 };
const PART_PARENT = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9];

// 関節の位置（立ち姿・体の中の座標、足元が y=0、正面は +Z、左は -X）
function bodyJoints(o) {
  const bw = o.bulk || 1, fem = o.female ? 1 : 0;
  const sh = (0.19 - fem * 0.02) * (0.85 + 0.15 * bw);
  const hp = (0.092 + fem * 0.012) * (0.9 + 0.1 * bw);
  return [
    [0, 0.97, 0],            // 0 腰
    [0, 1.05, 0],            // 1 胸（背骨の付け根）
    [0, 1.47, 0],            // 2 首
    [-sh, 1.42, 0],          // 3 左肩
    [-sh - 0.03, 1.13, -0.01], // 4 左ひじ
    [sh, 1.42, 0],           // 5 右肩
    [sh + 0.03, 1.13, -0.01],  // 6 右ひじ
    [-hp, 0.95, 0],          // 7 左股
    [-hp - 0.005, 0.52, 0.012], // 8 左ひざ
    [hp, 0.95, 0],           // 9 右股
    [hp + 0.005, 0.52, 0.012]   // 10 右ひざ
  ];
}

/* ---------- 法線を残したまま形をまとめる道具（頂点を共有して軽くする） ---------- */
const _sbM = new THREE.Matrix4(), _sbN = new THREE.Matrix3(), _sbQ = new THREE.Quaternion(), _sbE = new THREE.Euler();
const _sbV = new THREE.Vector3(), _sbS = new THREE.Vector3(), _sbC = new THREE.Color(), _sbP = new THREE.Vector3(), _sbU = new THREE.Vector3();
const _sbGeo = new Map();
function sbGeo(key, make) {
  let g = _sbGeo.get(key);
  if (!g) { g = make(); if (!g.index) { const n = g.attributes.position.count; g.setIndex([...Array(n).keys()]); } _sbGeo.set(key, g); }
  return g;
}
class SmoothBuilder {
  constructor(lo) { this.pos = []; this.nor = []; this.col = []; this.part = []; this.idx = []; this.p = 0; this.lo = !!lo; }
  addM(geo, m, color) {
    _sbN.getNormalMatrix(m);
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, e = m.elements, n = _sbN.elements;
    const base = this.pos.length / 3;
    const flip = m.determinant() < 0;
    _sbC.set(color);
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const a = N[i], b = N[i + 1], c = N[i + 2];
      const nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      this.nor.push(nx / l, ny / l, nz / l);
      this.col.push(_sbC.r, _sbC.g, _sbC.b);
      this.part.push(this.p);
    }
    const I = geo.index.array;
    for (let i = 0; i < I.length; i += 3) {
      if (flip) this.idx.push(base + I[i], base + I[i + 2], base + I[i + 1]);
      else this.idx.push(base + I[i], base + I[i + 1], base + I[i + 2]);
    }
    return this;
  }
  add(geo, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) {
    _sbE.set(rx, ry, rz, 'YXZ'); _sbQ.setFromEuler(_sbE);
    _sbM.compose(_sbV.set(x, y, z), _sbQ, _sbS.set(sx, sy, sz));
    return this.addM(geo, _sbM, color);
  }
  // 楕円体（detail: 0 小さな部品 / 1 ふつう / 2 大きな面）
  ellip(x, y, z, rx, ry, rz, color, ax = 0, ay = 0, az = 0, detail = 2) {
    const d = this.lo ? Math.min(detail, 1) - 1 : detail;
    const seg = [[5, 3], [6, 4], [9, 6], [13, 9]][d + 1];
    return this.add(sbGeo('s' + seg, () => new THREE.SphereGeometry(1, seg[0], seg[1])), x, y, z, rx, ry, rz, color, ax, ay, az);
  }
  box(x, y, z, w, h, d, color, ax = 0, ay = 0, az = 0) {
    return this.add(sbGeo('b', () => new THREE.BoxGeometry(1, 1, 1)), x, y, z, w, h, d, color, ax, ay, az);
  }
  // 2点を結ぶ（先細りの）円柱。r1 が a 側、r2 が b 側。端は球でふさぐ
  limb(a, b, r1, r2, color, caps = true, seg = 10) {
    if (this.lo) seg = Math.min(seg, 6);
    _sbP.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const L = _sbP.length();
    _sbU.copy(_sbP).normalize();
    _sbQ.setFromUnitVectors(_sbV.set(0, 1, 0), _sbU);
    const ratio = Math.round(r2 / r1 * 50) / 50;
    const g = sbGeo('c' + ratio + '_' + seg, () => new THREE.CylinderGeometry(ratio, 1, 1, seg, 1, true));
    _sbM.compose(_sbV.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _sbQ, _sbS.set(r1, L, r1));
    this.addM(g, _sbM, color);
    if (caps) { this.ellip(a[0], a[1], a[2], r1, r1, r1, color, 0, 0, 0, 0); this.ellip(b[0], b[1], b[2], r2, r2, r2, color, 0, 0, 0, 0); }
    return this;
  }
  cone(x, y, z, r, h, color, seg = 10, ax = 0, ay = 0, az = 0) {
    if (this.lo) seg = Math.min(seg, 6);
    return this.add(sbGeo('k' + seg, () => new THREE.ConeGeometry(1, 1, seg)), x, y, z, r, h, r, color, ax, ay, az);
  }
  cyl(x, y, z, rt, rb, h, color, seg = 12, ax = 0, ay = 0, az = 0) {
    if (this.lo) seg = Math.min(seg, 8);
    const ratio = Math.round(rt / rb * 50) / 50;
    return this.add(sbGeo('y' + ratio + '_' + seg, () => new THREE.CylinderGeometry(ratio, 1, 1, seg)), x, y, z, rb, h, rb, color, ax, ay, az);
  }
  torus(x, y, z, r, tube, color, ax = 0, ay = 0) {
    const t = Math.round(tube / r * 100) / 100;
    return this.add(sbGeo('t' + t + this.lo, () => new THREE.TorusGeometry(1, t, this.lo ? 4 : 6, this.lo ? 10 : 18)), x, y, z, r, r, r, color, ax, ay, 0);
  }
  geometry(skin) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('part', new THREE.Float32BufferAttribute(this.part, 1));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    if (skin) {
      const n = this.part.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = this.part[i]; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    }
    g.computeBoundingSphere();
    return g;
  }
  // 位置と色だけを、平らな面の Builder に写す（背景に混ぜる亡骸など）
  into(B, x, y, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const i of this.idx) {
      const j = i * 3, px = this.pos[j], py = this.pos[j + 1], pz = this.pos[j + 2];
      B.pos.push(x + px * c + pz * s, y + py, z - px * s + pz * c);
      B.col.push(this.col[j], this.col[j + 1], this.col[j + 2]);
    }
  }
}

/* ---------- 体の形 ---------- */
const EYES = [0x3a2a1a, 0x4a6a9a, 0x3a5a3a, 0x5a3a1a];
function isFemale(o) {
  if (o.female !== undefined) return o.female;
  if (o.beard) return false;
  return o.hairStyle === 'long' || o.hairStyle === 'bun' || o.hairStyle === 'pony' || o.hat === 'tiara';
}
function paintBody(S, o) {
  o.female = isFemale(o);
  const J = bodyJoints(o);
  const bw = o.bulk || 1, fem = o.female ? 1 : 0;
  const skin = o.skin || 0xe8b88e, top = o.top || 0x6a5a4a, bottom = o.bottom || 0x4a3a2a;
  const shoes = o.shoes || 0x2e2218, metal = o.armor;
  const sleeve = metal || top;
  const R = mulberry32(hashStr(String(o.top) + String(o.skin) + String(o.hair)));
  const eye = o.eyeGlow || EYES[Math.floor(R() * EYES.length)];
  const mirror = (p) => [-p[0], p[1], p[2]];

  /* 腰 */
  S.p = 0;
  S.ellip(0, 0.955, 0, 0.165 * bw + fem * 0.02, 0.12, 0.112 * bw, bottom);
  S.cyl(0, 1.02, 0, 0.158 * bw, 0.162 * bw, 0.05, o.belt || 0x2a1e14, 14);
  if (o.dress) {
    S.cyl(0, 0.62, 0.005, 0.17 * bw, 0.34 * bw + fem * 0.04, 0.78, o.dress, 18);
    S.cyl(0, 0.225, 0.005, 0.34 * bw + fem * 0.04, 0.35 * bw + fem * 0.04, 0.03, o.dressTrim || o.dress, 18);
  }
  if (o.apron) S.box(0, 0.7, 0.13 * bw, 0.28 * bw, 0.55, 0.012, o.apron);
  /* 胸 */
  S.p = 1;
  S.ellip(0, 1.13, 0, 0.148 * bw - fem * 0.01, 0.14, 0.1 * bw, top);
  S.ellip(0, 1.3, -0.005, 0.185 * bw - fem * 0.02, 0.165, 0.112 * bw, top);
  if (fem) { S.ellip(-0.058, 1.31, 0.075, 0.058, 0.055, 0.05, top); S.ellip(0.058, 1.31, 0.075, 0.058, 0.055, 0.05, top); }
  S.ellip(J[3][0] * 0.92, 1.41, 0, 0.075 * bw, 0.06, 0.07 * bw, sleeve);
  S.ellip(J[5][0] * 0.92, 1.41, 0, 0.075 * bw, 0.06, 0.07 * bw, sleeve);
  S.cyl(0, 1.44, 0, 0.07, 0.1 * bw, 0.06, top, 12);
  if (o.stripes) for (let k = 0; k < 3; k++) S.cyl(0, 1.12 + k * 0.1, 0, 0.16 * bw, 0.16 * bw, 0.025, o.stripes, 14);
  if (metal) {
    S.ellip(0, 1.29, 0.01, 0.2 * bw, 0.18, 0.13 * bw, metal);
    S.ellip(0, 1.1, 0.005, 0.165 * bw, 0.1, 0.115 * bw, metal);
    S.ellip(J[3][0] * 1.02, 1.43, 0, 0.1 * bw, 0.065, 0.1 * bw, metal);
    S.ellip(J[5][0] * 1.02, 1.43, 0, 0.1 * bw, 0.065, 0.1 * bw, metal);
    S.box(0, 1.28, 0.135 * bw, 0.02, 0.26, 0.01, 0xd8d8d8);
  }
  if (o.apron) S.box(0, 1.18, 0.105 * bw, 0.24 * bw, 0.28, 0.012, o.apron);
  if (o.shawl) S.ellip(0, 1.4, 0, 0.21 * bw, 0.07, 0.13 * bw, o.shawl);
  if (o.cape) {
    S.box(0, 0.86, -0.135 * bw, 0.42 * bw, 1.12, 0.022, o.cape, 0.07);
    S.ellip(0, 1.44, -0.03, 0.2 * bw, 0.05, 0.12 * bw, o.cape);
  }
  if (o.blood) {
    for (let k = 0; k < 9; k++) {
      const y = 0.95 + R() * 0.45, x = (R() - 0.5) * 0.28 * bw;
      S.ellip(x, y, 0.112 * bw + 0.008, 0.02 + R() * 0.05, 0.02 + R() * 0.06, 0.008, R() < 0.5 ? 0x6a0606 : 0x3a0202);
    }
  }
  /* 首と頭 */
  S.p = 2;
  const hy = 1.64, hz = 0.012;
  S.limb([0, 1.45, -0.005], [0, 1.57, 0.005], 0.052, 0.048, skin, false);
  S.ellip(0, hy, hz, 0.094, 0.118, 0.108, skin);
  S.ellip(0, hy - 0.062, hz + 0.022, 0.078 - fem * 0.008, 0.058, 0.082, skin, 0, 0, 0, 1);  // あご
  S.ellip(0, hy - 0.005, hz + 0.1, 0.016, 0.03, 0.022, skin, -0.2, 0, 0, 0);           // 鼻
  if (!S.lo) {
    S.ellip(-0.052, hy - 0.035, hz + 0.075, 0.03, 0.022, 0.02, skin, 0, 0, 0, 0);        // 頬
    S.ellip(0.052, hy - 0.035, hz + 0.075, 0.03, 0.022, 0.02, skin, 0, 0, 0, 0);
    for (const s of [-1, 1]) {
      S.ellip(s * 0.037, hy + 0.017, hz + 0.087, 0.019, 0.012, 0.01, 0xf4f0ea, 0, 0, 0, 0);  // 白目
      S.ellip(s * 0.037, hy + 0.017, hz + 0.095, 0.0095, 0.0095, 0.005, eye, 0, 0, 0, 0);    // 瞳
      S.box(s * 0.038, hy + 0.043, hz + 0.093, 0.036, 0.007 + (fem ? 0 : 0.003), 0.008, o.brow || o.hair || 0x2a1f1a, 0, 0, s * (fem ? 0.1 : 0.05));
      S.ellip(s * 0.095, hy + 0.0, hz, 0.014, 0.028, 0.02, skin, 0, 0, 0, 0);            // 耳
    }
    S.box(0, hy - 0.052, hz + 0.1, 0.036, 0.006, 0.008, fem ? 0xb04a4a : 0x8a4a3a);      // 口
  } else {
    for (const s of [-1, 1]) S.box(s * 0.037, hy + 0.017, hz + 0.093, 0.024, 0.012, 0.01, 0x1a1410);
  }
  if (o.elf) { S.cone(-0.12, hy + 0.03, hz - 0.01, 0.012, 0.09, skin, 6, 0, 0, 1.1); S.cone(0.12, hy + 0.03, hz - 0.01, 0.012, 0.09, skin, 6, 0, 0, -1.1); }
  if (o.beard) { S.ellip(0, hy - 0.075, hz + 0.05, 0.08, 0.07, 0.07, o.beard); S.ellip(0, hy - 0.035, hz + 0.1, 0.04, 0.011, 0.012, o.beard); }
  if (o.snout) S.ellip(0, hy - 0.02, hz + 0.12, 0.06, 0.05, 0.08, o.snout);
  if (o.horns) { S.cone(-0.07, hy + 0.13, hz, 0.025, 0.14, o.horns, 6, 0, 0, 0.4); S.cone(0.07, hy + 0.13, hz, 0.025, 0.14, o.horns, 6, 0, 0, -0.4); }
  if (o.eyeGlow) for (const s of [-1, 1]) S.ellip(s * 0.037, hy + 0.017, hz + 0.093, 0.02, 0.014, 0.008, o.eyeGlow, 0, 0, 0, 1);
  if (o.blood) { S.ellip(0.03, hy + 0.06, hz + 0.08, 0.03, 0.02, 0.012, 0x6a0606); S.ellip(-0.02, hy - 0.07, hz + 0.09, 0.02, 0.04, 0.01, 0x5a0404); }
  // 髪
  const hs = o.hairStyle, hair = o.hair || 0x2a1f1a;
  if (hs !== 'bald' && !(S.lo && o.hat)) {
    S.ellip(0, hy + 0.035, hz - 0.012, 0.103, 0.1, 0.115, hair);
    if (!S.lo) {
      S.ellip(0, hy + 0.075, hz + 0.055, 0.085, 0.035, 0.05, hair, 0.35, 0, 0, 1);      // 前髪
      S.ellip(-0.085, hy + 0.0, hz - 0.01, 0.025, 0.07, 0.08, hair, 0, 0, 0, 1);
      S.ellip(0.085, hy + 0.0, hz - 0.01, 0.025, 0.07, 0.08, hair, 0, 0, 0, 1);
    }
  }
  if (hs === 'long') { S.ellip(0, hy - 0.12, hz - 0.075, 0.1, 0.22, 0.045, hair); S.ellip(-0.08, hy - 0.08, hz - 0.02, 0.03, 0.14, 0.05, hair); S.ellip(0.08, hy - 0.08, hz - 0.02, 0.03, 0.14, 0.05, hair); }
  if (hs === 'bun') S.ellip(0, hy + 0.07, hz - 0.11, 0.055, 0.05, 0.05, hair);
  if (hs === 'pony') S.limb([0, hy + 0.03, hz - 0.11], [0, hy - 0.2, hz - 0.15], 0.035, 0.018, hair);
  if (o.glasses) { for (const s of [-1, 1]) S.torus(s * 0.037, hy + 0.017, hz + 0.1, 0.022, 0.003, 0x2a2a2a); S.box(0, hy + 0.02, hz + 0.1, 0.03, 0.004, 0.004, 0x2a2a2a); }
  // 帽子・兜
  const hc = o.hatColor || 0x3a3a3a;
  switch (o.hat) {
    case 'wizard': S.cyl(0, hy + 0.09, hz, 0.22, 0.22, 0.012, o.dress || hc, 20); S.cone(0, hy + 0.27, hz - 0.02, 0.11, 0.36, o.dress || hc, 14, -0.15); break;
    case 'witch': S.cyl(0, hy + 0.09, hz, 0.26, 0.26, 0.012, hc, 20); S.cone(0, hy + 0.32, hz - 0.03, 0.12, 0.45, hc, 14, -0.3); break;
    case 'crown': S.cyl(0, hy + 0.115, hz, 0.1, 0.1, 0.07, hc, 14);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; S.cone(Math.cos(a) * 0.09, hy + 0.17, hz + Math.sin(a) * 0.09, 0.018, 0.05, hc, 5); } break;
    case 'tiara': S.torus(0, hy + 0.09, hz + 0.01, 0.1, 0.008, hc, Math.PI / 2 + 0.25); S.ellip(0, hy + 0.12, hz + 0.1, 0.012, 0.016, 0.01, 0xd94a6a); break;
    case 'helmet':
      S.ellip(0, hy + 0.03, hz - 0.005, 0.118, 0.118, 0.13, hc);
      S.cyl(0, hy - 0.02, hz, 0.122, 0.126, 0.04, hc, 16);
      S.box(0, hy + 0.0, hz + 0.118, 0.018, 0.085, 0.02, hc);                            // 鼻当て
      S.box(0, hy + 0.14, hz - 0.01, 0.014, 0.05, 0.2, hc);
      break;
    case 'hood': S.ellip(0, hy + 0.02, hz - 0.02, 0.122, 0.135, 0.13, hc); S.ellip(0, hy - 0.08, hz - 0.03, 0.14, 0.06, 0.13, hc); break;
    case 'bandana': S.ellip(0, hy + 0.05, hz - 0.005, 0.108, 0.075, 0.118, hc); break;
    case 'cap': S.cyl(0, hy + 0.085, hz, 0.1, 0.11, 0.07, hc, 14); S.box(0, hy + 0.055, hz + 0.1, 0.12, 0.01, 0.07, hc); break;
    case 'straw': S.cyl(0, hy + 0.08, hz, 0.23, 0.23, 0.014, hc, 18); S.cyl(0, hy + 0.12, hz, 0.09, 0.105, 0.08, hc, 14); break;
    case 'turban': S.ellip(0, hy + 0.07, hz, 0.13, 0.1, 0.13, hc); break;
    case 'mitre': S.cone(0, hy + 0.2, hz, 0.09, 0.24, hc, 4, 0, Math.PI / 4); break;
    case 'feather': S.cyl(0, hy + 0.09, hz, 0.11, 0.125, 0.06, hc, 14); S.box(0.07, hy + 0.17, hz - 0.03, 0.012, 0.14, 0.04, 0xd94a4a, 0, 0, -0.4); break;
  }
  /* 腕 */
  const arm = (pu, pf, side) => {
    const sJ = J[side < 0 ? 3 : 5], eJ = J[side < 0 ? 4 : 6];
    const w = [eJ[0] + side * 0.012, eJ[1] - 0.27, eJ[2] + 0.025];
    S.p = pu;
    S.limb(sJ, eJ, 0.052 * bw, 0.042 * bw, sleeve);
    if (metal) S.ellip(sJ[0] + side * 0.01, sJ[1] - 0.04, sJ[2], 0.07 * bw, 0.07, 0.07 * bw, metal);
    S.p = pf;
    S.limb(eJ, w, 0.041 * bw, 0.032 * bw, o.forearm || sleeve);
    S.cyl(w[0], w[1] + 0.03, w[2], 0.036 * bw, 0.038 * bw, 0.04, metal ? 0x3a3a3a : (o.cuff || sleeve), 10);
    S.ellip(w[0], w[1] - 0.055, w[2] + 0.006, 0.026, 0.055, 0.042, o.gloves || skin, 0, 0, 0, 1);   // 手
    if (!S.lo) S.ellip(w[0] - side * 0.022, w[1] - 0.035, w[2] + 0.03, 0.012, 0.03, 0.012, o.gloves || skin, 0.4, 0, side * 0.4, 0);
    return w;
  };
  const wL = arm(3, 4, -1), wR = arm(5, 6, 1);
  /* 脚 */
  const leg = (pt, ps, side) => {
    const hJ = J[side < 0 ? 7 : 9], kJ = J[side < 0 ? 8 : 10], aJ = [kJ[0], 0.085, kJ[2] - 0.02];
    S.p = pt;
    S.limb(hJ, kJ, 0.078 * bw + fem * 0.006, 0.054 * bw, bottom);
    S.p = ps;
    S.limb(kJ, aJ, 0.052 * bw, 0.038 * bw, bottom);
    if (!S.lo) S.ellip(kJ[0], kJ[1] - 0.12, kJ[2] - 0.02, 0.05 * bw, 0.09, 0.052 * bw, bottom, 0, 0, 0, 1);    // ふくらはぎ
    S.limb([kJ[0], 0.33, kJ[2] - 0.005], [aJ[0], 0.07, aJ[2]], 0.05 * bw, 0.044, shoes, false);
    S.ellip(aJ[0], 0.045, aJ[2] + 0.05, 0.048, 0.045, 0.115, shoes, 0, 0, 0, 1);        // 足
    if (metal) S.ellip(kJ[0], kJ[1], kJ[2] + 0.03, 0.058, 0.06, 0.05, metal);
  };
  leg(7, 8, -1); leg(9, 10, 1);
  /* 持ち物（右手＝6、左手＝4） */
  const hr = [wR[0], wR[1] - 0.06, wR[2] + 0.01], hl = [wL[0], wL[1] - 0.06, wL[2] + 0.01];
  switch (o.prop) {
    case 'staff': S.p = 6; S.limb([hr[0], hr[1] - 0.5, hr[2]], [hr[0], hr[1] + 0.95, hr[2]], 0.018, 0.022, 0x6b4a2c, false, 6); S.ellip(hr[0], hr[1] + 1.0, hr[2], 0.05, 0.05, 0.05, 0x9ad4ff); break;
    case 'staffRed': S.p = 6; S.limb([hr[0], hr[1] - 0.5, hr[2]], [hr[0], hr[1] + 0.95, hr[2]], 0.018, 0.022, 0x1a1a1a, false, 6); S.ellip(hr[0], hr[1] + 1.0, hr[2], 0.055, 0.055, 0.055, 0xd8202a); break;
    case 'cane': S.p = 6; S.limb([hr[0], 0.02, hr[2] + 0.1], [hr[0], hr[1], hr[2]], 0.014, 0.014, 0x6b4a2c, false, 6); break;
    case 'spear': S.p = 6; S.limb([hr[0], hr[1] - 0.55, hr[2]], [hr[0], hr[1] + 1.25, hr[2]], 0.016, 0.016, 0x5d4028, false, 6); S.cone(hr[0], hr[1] + 1.36, hr[2], 0.03, 0.18, 0xc9ced4, 6); break;
    case 'sword': S.p = 4; S.box(hl[0], hl[1] - 0.35, hl[2] + 0.02, 0.035, 0.68, 0.01, 0xc9ced4); S.box(hl[0], hl[1] - 0.005, hl[2] + 0.02, 0.1, 0.02, 0.02, 0x8a7a3a); break;
    case 'hammer': S.p = 6; S.limb([hr[0], hr[1] - 0.35, hr[2]], [hr[0], hr[1] + 0.1, hr[2]], 0.014, 0.014, 0x5d4028, false, 6); S.box(hr[0], hr[1] - 0.38, hr[2], 0.1, 0.07, 0.07, 0x4a4a4a); break;
    case 'book': S.p = 4; S.box(hl[0] + 0.03, hl[1] + 0.04, hl[2] + 0.06, 0.03, 0.15, 0.12, 0x7a2a2a); break;
    case 'bow': S.p = 4; S.torus(hl[0], hl[1], hl[2], 0.3, 0.012, 0x6b4a2c, 0, Math.PI / 2); break;
    case 'rod': S.p = 6; S.limb([hr[0], hr[1], hr[2]], [hr[0], hr[1] + 1.1, hr[2] + 0.7], 0.012, 0.008, 0x8a6a45, false, 6); break;
    case 'club': S.p = 6; S.limb([hr[0], hr[1], hr[2]], [hr[0], hr[1] - 0.45, hr[2] + 0.1], 0.02, 0.04, 0x6b4a2c, false, 6); break;
    case 'knife': S.p = 6; S.box(hr[0], hr[1] - 0.14, hr[2] + 0.02, 0.02, 0.18, 0.035, 0xc9ced4); break;
    case 'axe': S.p = 6; S.limb([hr[0], hr[1] - 0.3, hr[2]], [hr[0], hr[1] + 0.3, hr[2]], 0.016, 0.016, 0x5d4028, false, 6);
      S.box(hr[0], hr[1] + 0.24, hr[2] + 0.08, 0.02, 0.16, 0.14, 0x9aa0a8); break;
    case 'lute': S.p = 1; S.ellip(0.05, 1.12, 0.14, 0.1, 0.12, 0.04, 0xa8743a); S.box(0.12, 1.3, 0.14, 0.03, 0.26, 0.02, 0x5d4028, 0, 0, -0.5); break;
  }
  return J;
}

/* ---------- 骨格つきの人を作る ---------- */
const SKIN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02, skinning: true });
function makeBones(J) {
  const bones = J.map(() => new THREE.Bone());
  J.forEach((p, i) => {
    const par = PART_PARENT[i];
    const q = par < 0 ? [0, 0, 0] : J[par];
    bones[i].position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (par >= 0) bones[par].add(bones[i]);
  });
  return bones;
}
function buildHumanoid(o) {
  const S = new SmoothBuilder();
  const J = paintBody(S, o);
  const geo = S.geometry(true);
  let mat = o.mat || SKIN_MAT;
  if (!mat.skinning) { mat = mat.clone(); mat.skinning = true; mat.flatShading = false; }
  const mesh = new THREE.SkinnedMesh(geo, mat);
  const bones = makeBones(J);
  mesh.add(bones[0]);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model); model.add(mesh);
  root.scale.setScalar(BODY_SCALE * (o.scale || 1));
  const B = {};
  for (const [k, i] of Object.entries(PART)) B[k] = bones[i];
  const rig = { bones: B, J, bent: o.bent ? 0.35 : 0, pose: '' };
  if (o.bent) B.chest.rotation.x = 0.35;
  return { root, model, legL: B.thighL, legR: B.thighR, body: mesh, rig, mat };
}

/* ---------- 動き ---------- */
function resetRig(rig) {
  for (const b of Object.values(rig.bones)) b.rotation.set(0, 0, 0);
  rig.bones.chest.rotation.x = rig.bent;
}
// 歩く・走る（phase は歩幅の位相、amt は 0〜1）
function animateWalk(m, phase, amt, t) {
  const b = m.rig.bones, s = Math.sin(phase), c = Math.cos(phase);
  b.thighL.rotation.x = s * 0.62 * amt; b.thighR.rotation.x = -s * 0.62 * amt;
  b.shinL.rotation.x = Math.max(0, -c) * 1.0 * amt + 0.05; b.shinR.rotation.x = Math.max(0, c) * 1.0 * amt + 0.05;
  b.uArmL.rotation.x = -s * 0.5 * amt; b.uArmR.rotation.x = s * 0.5 * amt;
  b.uArmL.rotation.z = -0.06; b.uArmR.rotation.z = 0.06;
  b.fArmL.rotation.x = -0.25 - Math.max(0, s) * 0.4 * amt; b.fArmR.rotation.x = -0.25 - Math.max(0, -s) * 0.4 * amt;
  b.chest.rotation.y = s * 0.08 * amt;
  b.chest.rotation.x = m.rig.bent + 0.06 * amt + Math.sin((t || 0) * 1.7) * 0.012;
  b.hips.rotation.y = -s * 0.06 * amt;
  b.head.rotation.x = 0; b.head.rotation.y = -s * 0.04 * amt;
}
// 決まった姿勢（stand / kneel / sit / lie / cry / kneelCry / captive / hold / fly）
function setRigPose(m, pose) {
  const r = m.rig, b = r.bones;
  resetRig(r);
  r.pose = pose || '';
  m.model.rotation.set(0, 0, 0); m.model.position.set(0, 0, 0);
  const kneel = () => { b.thighL.rotation.x = b.thighR.rotation.x = 0.05; b.shinL.rotation.x = b.shinR.rotation.x = 1.62; m.model.position.y = -0.43; };
  const cry = () => { b.head.rotation.x = 0.45; b.chest.rotation.x = r.bent + 0.25;
    b.uArmL.rotation.x = b.uArmR.rotation.x = -1.25; b.uArmL.rotation.z = 0.35; b.uArmR.rotation.z = -0.35; b.fArmL.rotation.x = b.fArmR.rotation.x = -1.75; };
  switch (pose) {
    case 'kneel': kneel(); break;
    case 'kneelCry': kneel(); cry(); break;
    case 'cry': cry(); break;
    case 'pray': b.head.rotation.x = 0.3; b.uArmL.rotation.x = b.uArmR.rotation.x = -0.55; b.uArmL.rotation.z = 0.5; b.uArmR.rotation.z = -0.5;
      b.fArmL.rotation.x = b.fArmR.rotation.x = -1.55; b.fArmL.rotation.y = 0.5; b.fArmR.rotation.y = -0.5; break;
    case 'reach': b.uArmL.rotation.x = b.uArmR.rotation.x = -1.3; b.fArmL.rotation.x = b.fArmR.rotation.x = -0.2; b.chest.rotation.x = 0.1; break;
    case 'hold': kneel(); b.chest.rotation.x = 0.45; b.head.rotation.x = 0.35;
      b.uArmL.rotation.x = b.uArmR.rotation.x = -0.9; b.uArmL.rotation.z = 0.25; b.uArmR.rotation.z = -0.25; b.fArmL.rotation.x = b.fArmR.rotation.x = -0.6; break;
    case 'sit': b.thighL.rotation.x = b.thighR.rotation.x = -1.5; b.thighL.rotation.z = -0.12; b.thighR.rotation.z = 0.12;
      b.shinL.rotation.x = b.shinR.rotation.x = 0.25; b.chest.rotation.x = r.bent + 0.15; m.model.position.y = -0.47;
      b.uArmL.rotation.x = b.uArmR.rotation.x = -0.35; b.fArmL.rotation.x = b.fArmR.rotation.x = -0.9; break;
    case 'hug': b.thighL.rotation.x = b.thighR.rotation.x = -1.9; b.shinL.rotation.x = b.shinR.rotation.x = 2.2; m.model.position.y = -0.62;
      b.chest.rotation.x = 0.5; b.head.rotation.x = 0.4; b.uArmL.rotation.x = b.uArmR.rotation.x = -1.2; b.fArmL.rotation.x = b.fArmR.rotation.x = -1.4;
      b.uArmL.rotation.z = 0.4; b.uArmR.rotation.z = -0.4; break;
    case 'lie': m.model.rotation.x = -Math.PI / 2; m.model.position.set(0, 0.13, -0.95);
      b.uArmL.rotation.z = -0.35; b.uArmR.rotation.z = 0.25; b.fArmL.rotation.x = -0.5; b.head.rotation.y = 0.35; b.head.rotation.x = -0.15;
      b.thighL.rotation.z = -0.08; b.thighR.rotation.z = 0.1; break;
    case 'captive': kneel(); b.head.rotation.x = 0.55; b.chest.rotation.x = 0.25;
      b.uArmL.rotation.x = b.uArmR.rotation.x = 0.55; b.uArmL.rotation.z = 0.2; b.uArmR.rotation.z = -0.2; b.fArmL.rotation.x = b.fArmR.rotation.x = -1.2; break;
    case 'fly': b.thighL.rotation.x = 0.35; b.thighR.rotation.x = 0.15; b.shinL.rotation.x = 0.6; b.shinR.rotation.x = 0.4;
      b.uArmL.rotation.z = -0.35; b.fArmL.rotation.x = -0.3; break;
  }
}
// 顔の前あたりの位置（涙などに）
const _headV = new THREE.Vector3();
function headWorld(m, out, fwd = 0.1, up = 0.02) {
  const h = m.rig.bones.head;
  h.updateWorldMatrix(true, false);
  return (out || _headV).set(0, 0.17 + up, 0.012 + fwd).applyMatrix4(h.matrixWorld);
}

/* =========================================================
   泣く（涙の粒）
   ========================================================= */
const CRYING = new Set();
function setCrying(m, on) { if (on) CRYING.add(m); else CRYING.delete(m); }
const _tearV = new THREE.Vector3();
function updateTears(dt, t) {
  for (const m of CRYING) {
    if (!m.root.visible) continue;
    m.tearT = (m.tearT || 0) - dt;
    // すすり泣きで肩が震える
    const b = m.rig.bones;
    b.chest.rotation.z = Math.sin(t * 17) * 0.015 * (Math.sin(t * 1.3) > 0 ? 1 : 0.3);
    if (m.tearT > 0) continue;
    m.tearT = 0.08 + Math.random() * 0.12;
    for (const s of [-1, 1]) {
      const h = b.head;
      h.updateWorldMatrix(true, false);
      _tearV.set(s * 0.037, 0.17 - 0.005, 0.012 + 0.1).applyMatrix4(h.matrixWorld);
      PS.spawn(_tearV.x, _tearV.y, _tearV.z, (Math.random() - 0.5) * 0.05, -0.08, (Math.random() - 0.5) * 0.05, 1.1, 0.045, 0xf4fbff, 0xcfe8ff, 1, 2.2, 0.5);
      PG.spawn(_tearV.x, _tearV.y - 0.01, _tearV.z, 0, -0.12, 0, 0.7, 0.03, 0xe8f6ff, 0x9ad0ff, 0.9, 2.5, 0.5);
    }
  }
}

/* =========================================================
   大軍勢用：同じ体を InstancedMesh で並べ、手足は頂点シェーダで振る
   ========================================================= */
const CROWD_J = bodyJoints({ bulk: 1 });
function crowdMaterial(extra = {}) {
  const mat = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.72, metalness: 0.05 }, extra));
  const v = (i) => `vec3(${CROWD_J[i].map(n => n.toFixed(4)).join(',')})`;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float part;
attribute vec2 anim;
vec3 rotX(vec3 p, vec3 c, float a) { p -= c; float cs = cos(a), sn = sin(a); return vec3(p.x, cs * p.y - sn * p.z, sn * p.y + cs * p.z) + c; }
vec3 rotXv(vec3 p, float a) { float cs = cos(a), sn = sin(a); return vec3(p.x, cs * p.y - sn * p.z, sn * p.y + cs * p.z); }
void crowdPose(inout vec3 p, inout vec3 n) {
  float s = sin(anim.x), c = cos(anim.x), mv = anim.y;
  float pr = part + 0.5;
  if (pr > 7.0 && pr < 11.0) {
    bool left = pr < 9.0;
    float th = (left ? s : -s) * 0.62 * mv;
    float kn = max(0.0, left ? -c : c) * 1.0 * mv + 0.05;
    vec3 hip = left ? ${v(7)} : ${v(9)};
    vec3 knee = left ? ${v(8)} : ${v(10)};
    if (pr > 8.0 && pr < 9.0 || pr > 10.0) { p = rotX(p, knee, kn); n = rotXv(n, kn); }
    p = rotX(p, hip, th); n = rotXv(n, th);
  } else if (pr > 3.0 && pr < 7.0) {
    bool left = pr < 5.0;
    float ua = (left ? -s : s) * 0.5 * mv;
    float fa = -0.25 - max(0.0, left ? s : -s) * 0.4 * mv;
    vec3 sh = left ? ${v(3)} : ${v(5)};
    vec3 el = left ? ${v(4)} : ${v(6)};
    if (pr > 4.0 && pr < 5.0 || pr > 6.0) { p = rotX(p, el, fa); n = rotXv(n, fa); }
    p = rotX(p, sh, ua); n = rotXv(n, ua);
  }
}`);
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3( normal );
vec3 crowdP = vec3(position);
crowdPose(crowdP, objectNormal);`);
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = crowdP;');
  };
  return mat;
}
// 大軍勢の兵の形（部位番号つき）
const SOLDIER_LOOKS = {
  soldier: { skin: 0xd9a47a, hair: 0x2a1f1a, top: 0x6a1010, bottom: 0x2a2622, armor: 0x3e3e48, hat: 'helmet', hatColor: 0x34343c, prop: 'spear', cape: 0x5a0c0c, shoes: 0x1e1a16, gloves: 0x2a2420 },
  heavy: { skin: 0xc68a5e, hair: 0x1a1a1a, top: 0x4a0a0a, bottom: 0x2a2622, armor: 0x5a5a66, hat: 'helmet', hatColor: 0x4a4a54, prop: 'axe', bulk: 1.25, shoes: 0x1e1a16, gloves: 0x3a3a3a },
  archer: { skin: 0xe8b88e, hair: 0x4a3222, top: 0x5a1a14, bottom: 0x3a2e24, hat: 'hood', hatColor: 0x3a1410, prop: 'bow', shoes: 0x2a1e14, forearm: 0x3a2e24 },
  ally: { skin: 0xe8b88e, hair: 0x4a3222, top: 0x2a4a8a, bottom: 0x4a4a5a, armor: 0xa9b0b8, hat: 'helmet', hatColor: 0xa9b0b8, prop: 'spear', cape: 0x2a4a8a, shoes: 0x2a2018 }
};
function crowdGeometry(kind, lo = true) {
  const S = new SmoothBuilder(lo);
  paintBody(S, Object.assign({ female: false }, SOLDIER_LOOKS[kind] || SOLDIER_LOOKS.soldier));
  return S;
}

/* ---------- 亡骸・ちぎれた部位の形 ---------- */
// 部位ごとに回した姿勢で固める（関節の階層をたどる）
const _pm = [], _pl = new THREE.Matrix4(), _pt = new THREE.Matrix4();
function posedGeometry(S, J, rots, keep, extra) {
  const mats = [];
  const back = new THREE.Matrix4();
  for (let i = 0; i < J.length; i++) {
    const par = PART_PARENT[i];
    const r = rots[i] || [0, 0, 0];
    _e.set(r[0], r[1], r[2], 'YXZ');
    _pl.makeRotationFromEuler(_e);
    // 関節まわりに回す：T(j) R T(-j)
    _pt.makeTranslation(J[i][0], J[i][1], J[i][2]).multiply(_pl).multiply(back.makeTranslation(-J[i][0], -J[i][1], -J[i][2]));
    mats[i] = par < 0 ? _pt.clone() : mats[par].clone().multiply(_pt);
  }
  const out = new SmoothBuilder(S.lo);
  const P = S.pos, N = S.nor, C = S.col, Pa = S.part, I = S.idx;
  const map = new Int32Array(Pa.length).fill(-1);
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const nms = mats.map(M => new THREE.Matrix3().getNormalMatrix(M));
  const use = (i) => {
    if (map[i] >= 0) return map[i];
    const pa = Pa[i], j = i * 3;
    v.set(P[j], P[j + 1], P[j + 2]).applyMatrix4(mats[pa]);
    n.set(N[j], N[j + 1], N[j + 2]).applyMatrix3(nms[pa]).normalize();
    map[i] = out.pos.length / 3;
    out.pos.push(v.x, v.y, v.z); out.nor.push(n.x, n.y, n.z); out.col.push(C[j], C[j + 1], C[j + 2]); out.part.push(pa);
    return map[i];
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (keep && !keep(Pa[a])) continue;
    out.idx.push(use(a), use(b), use(c));
  }
  if (extra) extra(out, mats);
  return out;
}
// 生々しい切り口（赤黒い肉と白い骨）
function stump(S, x, y, z, r, ax = 0, az = 0) {
  S.p = 0;
  S.ellip(x, y, z, r, r * 0.35, r, 0x7a0a0a, ax, 0, az, 1);
  S.ellip(x, y, z, r * 0.8, r * 0.42, r * 0.8, 0xa0201a, ax, 0, az, 1);
  S.ellip(x, y, z, r * 0.25, r * 0.5, r * 0.25, 0xe8e0d0, ax, 0, az, 1);
}
// 寝かせる（体の中の座標 → 地面に仰向け）
function layDown(S, rotY = 0) {
  const M = new THREE.Matrix4().makeRotationY(rotY).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  M.premultiply(new THREE.Matrix4().makeTranslation(0, 0.12, 0));
  const nm = new THREE.Matrix3().getNormalMatrix(M), v = new THREE.Vector3();
  for (let i = 0; i < S.pos.length; i += 3) {
    v.set(S.pos[i], S.pos[i + 1] - 0.97, S.pos[i + 2]).applyMatrix4(M);
    S.pos[i] = v.x; S.pos[i + 1] = v.y; S.pos[i + 2] = v.z;
    v.set(S.nor[i], S.nor[i + 1], S.nor[i + 2]).applyMatrix3(nm).normalize();
    S.nor[i] = v.x; S.nor[i + 1] = v.y; S.nor[i + 2] = v.z;
  }
  return S;
}
// 亡骸の型：0 大の字 1 首なし 2 手足を失う 3 胴だけ（ぐちゃぐちゃ） 4 うつ伏せで這った跡
function corpseGeometry(kind, variant) {
  const S = typeof kind === 'string' ? crowdGeometry(kind) : (() => { const b = new SmoothBuilder(true); paintBody(b, Object.assign({}, kind)); return b; })();
  const J = CROWD_J;
  const ROT = [
    [[0, 0, 0], [0.1, 0, 0], [-0.3, 0.6, 0], [0, 0, -0.9], [-0.6, 0, 0], [0, 0, 1.2], [-0.2, 0, 0], [0, 0, -0.25], [0.3, 0, 0], [0, 0, 0.15], [0.1, 0, 0]],
    [[0, 0, 0], [0.05, 0.1, 0], [0, 0, 0], [0.3, 0, -0.5], [-1.2, 0, 0], [0, 0, 0.7], [-0.4, 0, 0], [0.2, 0, -0.1], [0.9, 0, 0], [-0.1, 0, 0.3], [0.2, 0, 0]],
    [[0, 0.2, 0], [0.2, 0, 0.1], [0.4, -0.5, 0], [0, 0, -1.4], [-0.2, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [-0.4, 0, 0.2], [1.1, 0, 0]],
    [[0, 0, 0], [0.3, 0, 0.2], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
    [[0, 0, 0], [0, 0, 0], [0.5, 0.9, 0], [-2.6, 0, -0.3], [-0.4, 0, 0], [-2.2, 0, 0.4], [-0.3, 0, 0], [0.2, 0, -0.2], [0.6, 0, 0], [0.1, 0, 0.1], [0.1, 0, 0]]
  ][variant];
  const keep = [
    null,
    (p) => p !== 2,
    (p) => p !== 5 && p !== 6 && p !== 7 && p !== 8,
    (p) => p <= 1,
    null
  ][variant];
  const P = posedGeometry(S, J, ROT, keep, (out, mats) => {
    const at = (i, dy = 0) => new THREE.Vector3(J[i][0], J[i][1] + dy, J[i][2]).applyMatrix4(mats[PART_PARENT[i] < 0 ? i : PART_PARENT[i]]);
    if (variant === 1) { const n = at(2, 0.05); stump(out, n.x, n.y, n.z, 0.06); }
    if (variant === 2) { let a = at(5); stump(out, a.x, a.y, a.z, 0.055, 0, 1.2); a = at(7); stump(out, a.x, a.y - 0.03, a.z, 0.075); }
    if (variant === 3) {
      let a = at(2, 0.03); stump(out, a.x, a.y, a.z, 0.065);
      for (const i of [3, 5]) { a = at(i); stump(out, a.x, a.y, a.z, 0.055, 0, i === 3 ? -1.4 : 1.4); }
      for (const i of [7, 9]) { a = at(i); stump(out, a.x, a.y - 0.03, a.z, 0.08); }
      // はみ出した臓物
      out.p = 0;
      const R = mulberry32(77);
      for (let k = 0; k < 7; k++) out.ellip((R() - 0.5) * 0.25, 0.9 + R() * 0.15, 0.1 + R() * 0.12, 0.03 + R() * 0.04, 0.025, 0.05 + R() * 0.05, [0x8a1a2a, 0x9a3a4a, 0x6a0a14][k % 3], R(), R(), R(), 1);
    }
  });
  if (variant === 4) {
    // うつ伏せ：先に裏返す
    const M = new THREE.Matrix4().makeRotationY(Math.PI);
    const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(M);
    for (let i = 0; i < P.pos.length; i += 3) {
      v.set(P.pos[i], P.pos[i + 1], P.pos[i + 2]).applyMatrix4(M); P.pos[i] = v.x; P.pos[i + 1] = v.y; P.pos[i + 2] = v.z;
      v.set(P.nor[i], P.nor[i + 1], P.nor[i + 2]).applyMatrix3(nm).normalize(); P.nor[i] = v.x; P.nor[i + 1] = v.y; P.nor[i + 2] = v.z;
    }
  }
  return layDown(P).geometry(false);
}
// ちぎれて飛ぶ部位：head / arm / leg / upper（上半身）
function gibGeometry(kind, which) { return gibGeometryLook(SOLDIER_LOOKS[kind] || SOLDIER_LOOKS.soldier, which); }
function gibGeometryLook(look, which) {
  const S = new SmoothBuilder(true); paintBody(S, Object.assign({}, look));
  const J = CROWD_J;
  const sets = { head: [2], arm: [5, 6], leg: [9, 10], upper: [1, 2, 3, 4, 5, 6] };
  const keep = new Set(sets[which]);
  const P = posedGeometry(S, J, which === 'arm' ? [0, 0, 0, 0, 0, 0, [-0.5, 0, 0]] : [], (p) => keep.has(p), (out) => {
    if (which === 'head') stump(out, 0, 1.45, 0, 0.055);
    if (which === 'arm') stump(out, J[5][0], J[5][1], 0, 0.05, 0, 0);
    if (which === 'leg') stump(out, J[9][0], J[9][1], 0, 0.078);
    if (which === 'upper') stump(out, 0, 1.05, 0, 0.14);
  });
  // 重心を原点へ
  const c = { head: [0, 1.6, 0], arm: [J[5][0] + 0.02, 1.12, 0], leg: [J[9][0], 0.52, 0], upper: [0, 1.3, 0] }[which];
  for (let i = 0; i < P.pos.length; i += 3) { P.pos[i] -= c[0]; P.pos[i + 1] -= c[1]; P.pos[i + 2] -= c[2]; }
  return P.geometry(false);
}

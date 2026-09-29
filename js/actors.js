'use strict';
/* =========================================================
   人の姿（住民・主人公）
   ========================================================= */
const SKINS = [0xf0c9a0, 0xe8b88e, 0xd9a47a, 0xc68a5e, 0x9c6b47];
const HAIRS = [0x2a1f1a, 0x4a3222, 0x7a5230, 0xb88a4a, 0xd9c27a, 0x8a3b22, 0x1c1c24];
const CLOTHS = [0x7a4a3a, 0x3f6a8a, 0x5d7a3a, 0x8a6a3a, 0x6a4a7a, 0x9a3b3b, 0x3b5a5a, 0xc0a060, 0x4a4a6a, 0xa8743a];

// 見た目の型（役割ごと）
function lookFor(kind, seedStr, over = {}) {
  const R = mulberry32(hashStr(seedStr || kind));
  const pick = (a) => a[Math.floor(R() * a.length)];
  const L = { skin: pick(SKINS.slice(0, 4)), hair: pick(HAIRS), hairStyle: 'short', top: pick(CLOTHS), bottom: 0x4a3a2a, scale: 1, bulk: 1 };
  const k = {
    man: {}, woman: { hairStyle: R() < 0.5 ? 'long' : 'bun', dress: pick(CLOTHS) },
    elder_m: { hair: 0xc9c6bf, beard: 0xd9d6cf, bent: true, prop: 'cane', hairStyle: R() < 0.5 ? 'bald' : 'short' },
    elder_f: { hair: 0xc9c6bf, hairStyle: 'bun', dress: pick([0x6a5a7a, 0x5a6a5a, 0x7a5a4a]), bent: true, shawl: 0x9a8a7a },
    boy: { scale: 0.66, hairStyle: 'short' }, girl: { scale: 0.64, hairStyle: 'pony', dress: pick([0xe07a8a, 0xf2c94a, 0x7ac0e0]) },
    soldier: { armor: 0xa9b0b8, hat: 'helmet', hatColor: 0xa9b0b8, top: 0x3a5a9a, prop: 'spear' },
    knight: { armor: 0xc9ced4, hat: 'helmet', hatColor: 0xc9ced4, top: 0x2a4a8a, cape: 0x2a4a8a, prop: 'sword', bulk: 1.15 },
    king: { hat: 'crown', hatColor: 0xe8c04a, cape: 0x9a1f2a, dress: 0xf2ece0, top: 0x9a1f2a, beard: 0xb8b2a6, hair: 0xb8b2a6, bulk: 1.15 },
    queen: { hat: 'tiara', hatColor: 0xe8c04a, dress: 0x6a3a8a, top: 0x6a3a8a, hairStyle: 'long', cape: 0x4a2a6a },
    princess: { hat: 'tiara', hatColor: 0xe8c04a, dress: 0xf2b8c8, top: 0xf2b8c8, hairStyle: 'long', hair: 0xd9b25a },
    noble_m: { top: pick([0x5a2a6a, 0x2a4a6a, 0x6a2a2a]), cape: 0x2a2a3a, hat: 'cap', hatColor: 0x2a2a3a },
    noble_f: { dress: pick([0x9a4a7a, 0x4a6a9a, 0xc9a04a]), hairStyle: 'bun' },
    merchant: { bulk: 1.25, hat: 'cap', hatColor: pick([0x7a3a2a, 0x3a5a3a]), apron: 0xd9ccb0 },
    smith: { bulk: 1.25, top: 0x8a5a3a, apron: 0x3a2a1a, prop: 'hammer', beard: 0x4a3222 },
    innkeeper: { apron: 0xf4f0e6, bulk: 1.15 },
    wizard_m: { dress: pick([0x3a3a7a, 0x5a2a6a, 0x2a4a5a]), hat: 'wizard', prop: 'staff', beard: R() < 0.5 ? 0xd9d6cf : undefined },
    wizard_f: { dress: pick([0x6a3a8a, 0x2a5a7a, 0x7a2a4a]), hat: 'wizard', prop: 'staff', hairStyle: 'long' },
    priest: { dress: 0xf4f0e6, top: 0xf4f0e6, hat: 'mitre', hatColor: 0xf4f0e6, prop: 'book' },
    nun: { dress: 0x2a2a34, top: 0x2a2a34, hat: 'hood', hatColor: 0xf4f0e6 },
    elf_m: { elf: true, top: 0x4a7a3a, hairStyle: 'long', hair: pick([0xe8d89a, 0xc9c6bf, 0x8ab86a]), prop: 'bow' },
    elf_f: { elf: true, dress: 0x5a8a4a, hairStyle: 'long', hair: pick([0xe8d89a, 0xf4f0e6]) },
    witch: { dress: 0x3a2a4a, top: 0x3a2a4a, hat: 'witch', hatColor: 0x1a1a22, hairStyle: 'long', hair: 0x5a1a2a, prop: 'staff' },
    sailor: { hat: 'bandana', hatColor: pick([0xc8321e, 0x2a4a8a]), top: 0xe8e8e8, stripes: 0x2a4a8a, bottom: 0x2a3a5a },
    fisher: { hat: 'straw', hatColor: 0xd9c27a, top: pick([0x5a7a8a, 0x8a7a5a]), prop: 'rod' },
    imperial: { armor: 0x4a4a52, hat: 'helmet', hatColor: 0x4a4a52, top: 0x6a1a1a, cape: 0x6a1a1a, prop: 'spear' },
    officer: { armor: 0x3a3a42, top: 0x2a2a30, cape: 0x8a1a1a, prop: 'sword', hat: 'cap', hatColor: 0x2a2a30 },
    emperor: { armor: 0x2a2a30, hat: 'crown', hatColor: 0x1a1a1a, cape: 0x8a0a0a, top: 0x2a2a30, bulk: 1.25, hair: 0x1c1c24, beard: 0x1c1c24 },
    chancellor: { dress: 0x2a1a2a, top: 0x2a1a2a, hat: 'hood', hatColor: 0x1a0a1a, prop: 'staffRed', scale: 1.05, skin: 0xd8c0b0 },
    miko: { top: 0xf4f0e6, dress: 0xc8321e, hairStyle: 'long', hair: 0x1c1c24 },
    desert_m: { hat: 'turban', hatColor: pick([0xf4f0e6, 0xd9a13a]), top: 0xe8dcc3, skin: pick([0xc68a5e, 0x9c6b47]) },
    desert_f: { hat: 'hood', hatColor: pick([0xb83a4a, 0x3a7ab8]), dress: 0xe8c890, skin: pick([0xc68a5e, 0xd9a47a]) },
    bard: { hat: 'feather', hatColor: 0x3a6a3a, top: 0x9a3a5a, prop: 'lute' },
    hunter: { hat: 'hood', hatColor: 0x3a5a2a, top: 0x5a6a3a, prop: 'bow' },
    scholar: { dress: 0x6a5a3a, glasses: true, prop: 'book' },
    beggar: { top: 0x7a6a5a, bottom: 0x5a4a3a, bent: true, beard: 0x8a8a8a, hair: 0x8a8a8a, prop: 'cane' },
    clerk: { top: 0x3a3a4a, apron: 0xf4f0e6, hairStyle: 'bun' },
    maid: { dress: 0x2a2a34, apron: 0xf4f0e6, hat: 'cap', hatColor: 0xf4f0e6, hairStyle: 'bun' },
    dancer: { dress: 0xd94a6a, top: 0xd9a13a, hairStyle: 'long' },
    student: { dress: 0x3a4a7a, hat: 'cap', hatColor: 0x2a2a4a, prop: 'book', scale: 0.9 },
    farmer: { hat: 'straw', hatColor: 0xd9c27a, top: pick([0x8a6a3a, 0x6a8a4a]), bottom: 0x5a4a3a },
    ghost: { skin: 0xd8e8f0, top: 0xc8d8e8, dress: 0xc8d8e8, hairStyle: 'long', hair: 0xe8f0f8 }
  }[kind] || {};
  return Object.assign(L, k, over);
}

// 人の形を作る（体は1つにまとめ、脚だけ動かす）
function buildHumanoid(o) {
  const B = new Builder();
  const bw = o.bulk || 1;
  const bent = o.bent ? 1 : 0;
  const hy = 1.98 - bent * 0.12, hz = bent * 0.12;
  // 胴
  B.box(0, 1.25, 0, 0.78 * bw, 0.9, 0.44 * bw, o.top);
  if (o.stripes) for (let k = 0; k < 3; k++) B.box(0, 1.0 + k * 0.25, 0, 0.8 * bw, 0.07, 0.46 * bw, o.stripes);
  if (o.armor) {
    B.box(0, 1.3, 0, 0.84 * bw, 0.7, 0.5 * bw, o.armor);
    B.box(-0.5 * bw, 1.62, 0, 0.36, 0.2, 0.46, o.armor);
    B.box(0.5 * bw, 1.62, 0, 0.36, 0.2, 0.46, o.armor);
  }
  if (o.dress) B.cyl(0, 0.62, 0, 0.4 * bw, 0.62 * bw, 1.1, o.dress, 10);
  if (o.apron) B.box(0, 1.0, 0.24 * bw, 0.55 * bw, 0.9, 0.05, o.apron);
  if (o.cape) B.box(0, 1.15, -0.26 * bw, 0.82 * bw, 1.35, 0.06, o.cape, 0, -0.08);
  if (o.shawl) B.box(0, 1.55, 0, 0.84 * bw, 0.3, 0.5 * bw, o.shawl);
  if (o.blood) {
    const R = mulberry32(hashStr(String(o.top) + String(o.skin)));
    for (let k = 0; k < 6; k++) B.box((R() - 0.5) * 0.7 * bw, 0.9 + R() * 0.8, 0.23 * bw + 0.01, 0.12 + R() * 0.2, 0.1 + R() * 0.25, 0.02, R() < 0.5 ? 0x7a0808 : 0x4a0404);
    B.box(0.05, hy - 0.1, hz + 0.3, 0.12, 0.12, 0.02, 0x7a0808);
  }
  // 腕
  const sleeve = o.armor || o.top;
  B.box(-0.5 * bw, 1.25, 0.02, 0.2, 0.78, 0.22, sleeve, 0, 0, 0.1);
  B.box(0.5 * bw, 1.25, 0.02, 0.2, 0.78, 0.22, sleeve, 0, 0, -0.1);
  B.box(-0.56 * bw, 0.82, 0.03, 0.16, 0.16, 0.16, o.skin);
  B.box(0.56 * bw, 0.82, 0.03, 0.16, 0.16, 0.16, o.skin);
  // 頭
  B.sphere(0, hy, hz, 0.32, o.skin, 1, 1, 1, 1);
  B.box(-0.11, hy + 0.02, hz + 0.29, 0.06, 0.08, 0.03, 0x1a1a1a);
  B.box(0.11, hy + 0.02, hz + 0.29, 0.06, 0.08, 0.03, 0x1a1a1a);
  if (o.glasses) { B.box(0, hy + 0.03, hz + 0.31, 0.42, 0.05, 0.02, 0x3a3a3a); }
  if (o.elf) {
    B.cone(-0.33, hy + 0.08, hz, 0.06, 0.3, o.skin, 4, 0, 0, 1.2);
    B.cone(0.33, hy + 0.08, hz, 0.06, 0.3, o.skin, 4, 0, 0, -1.2);
  }
  if (o.beard) B.box(0, hy - 0.22, hz + 0.24, 0.34, 0.3, 0.14, o.beard);
  if (o.snout) B.box(0, hy - 0.08, hz + 0.34, 0.26, 0.2, 0.34, o.snout);
  if (o.horns) { B.cone(-0.2, hy + 0.35, hz, 0.07, 0.35, o.horns, 5, 0, 0, 0.4); B.cone(0.2, hy + 0.35, hz, 0.07, 0.35, o.horns, 5, 0, 0, -0.4); }
  if (o.tail) B.cyl(0, 0.7, -0.5, 0.05, 0.16, 1.1, o.tail, 6, 0, -1.0);
  if (o.eyeGlow) { B.box(-0.11, hy + 0.02, hz + 0.3, 0.09, 0.09, 0.03, o.eyeGlow); B.box(0.11, hy + 0.02, hz + 0.3, 0.09, 0.09, 0.03, o.eyeGlow); }
  // 髪
  const hs = o.hairStyle;
  if (hs !== 'bald') B.sphere(0, hy + 0.06, hz - 0.03, 0.34, o.hair, 1, 0.82, 1);
  if (hs === 'long') B.box(0, hy - 0.3, hz - 0.2, 0.6, 0.75, 0.2, o.hair);
  if (hs === 'bun') B.sphere(0, hy + 0.26, hz - 0.26, 0.16, o.hair);
  if (hs === 'pony') B.box(0, hy - 0.15, hz - 0.35, 0.14, 0.5, 0.14, o.hair);
  // 帽子
  const hc = o.hatColor || 0x3a3a3a;
  switch (o.hat) {
    case 'wizard':
      B.cyl(0, hy + 0.24, hz, 0.62, 0.62, 0.05, o.dress || hc, 14);
      B.cone(0, hy + 0.72, hz, 0.34, 0.95, o.dress || hc, 10, 0, -0.12);
      break;
    case 'witch':
      B.cyl(0, hy + 0.24, hz, 0.75, 0.75, 0.05, hc, 14);
      B.cone(0, hy + 0.85, hz - 0.05, 0.36, 1.2, hc, 10, 0, -0.25);
      break;
    case 'crown':
      B.cyl(0, hy + 0.32, hz, 0.3, 0.3, 0.24, hc, 8);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.cone(Math.cos(a) * 0.27, hy + 0.5, hz + Math.sin(a) * 0.27, 0.06, 0.16, hc, 4); }
      break;
    case 'tiara': B.torus(0, hy + 0.3, hz, 0.28, 0.04, hc, Math.PI / 2); B.sphere(0, hy + 0.34, hz + 0.28, 0.06, 0xd94a6a); break;
    case 'helmet':
      B.sphere(0, hy + 0.1, hz, 0.37, hc, 1, 0.85, 1);
      B.box(0, hy + 0.36, hz, 0.06, 0.2, 0.5, hc);
      break;
    case 'hood': B.sphere(0, hy + 0.06, hz - 0.05, 0.38, hc, 1, 1, 1.05); break;
    case 'bandana': B.sphere(0, hy + 0.12, hz - 0.02, 0.345, hc, 1, 0.7, 1); break;
    case 'cap': B.cyl(0, hy + 0.3, hz, 0.3, 0.33, 0.18, hc, 10); break;
    case 'straw': B.cyl(0, hy + 0.26, hz, 0.62, 0.62, 0.05, hc, 12); B.cyl(0, hy + 0.36, hz, 0.25, 0.3, 0.2, hc, 10); break;
    case 'turban': B.sphere(0, hy + 0.2, hz, 0.38, hc, 1, 0.75, 1); break;
    case 'mitre': B.cone(0, hy + 0.55, hz, 0.26, 0.6, hc, 4, Math.PI / 4); break;
    case 'feather': B.cyl(0, hy + 0.28, hz, 0.34, 0.38, 0.16, hc, 10); B.box(0.2, hy + 0.5, hz - 0.1, 0.04, 0.4, 0.12, 0xd94a4a, 0, 0, -0.4); break;
  }
  // 持ち物
  switch (o.prop) {
    case 'staff': B.cyl(0.62 * bw, 1.1, 0.12, 0.04, 0.05, 2.3, 0x6b4a2c, 6); B.sphere(0.62 * bw, 2.3, 0.12, 0.13, 0x9ad4ff); break;
    case 'staffRed': B.cyl(0.62 * bw, 1.1, 0.12, 0.04, 0.05, 2.3, 0x1a1a1a, 6); B.sphere(0.62 * bw, 2.3, 0.12, 0.14, 0xd8202a); break;
    case 'cane': B.cyl(0.58 * bw, 0.45, 0.25, 0.035, 0.035, 0.95, 0x6b4a2c, 5); break;
    case 'spear': B.cyl(0.6 * bw, 1.3, 0.12, 0.035, 0.035, 2.8, 0x5d4028, 5); B.cone(0.6 * bw, 2.85, 0.12, 0.08, 0.3, 0xc9ced4, 5); break;
    case 'sword': B.box(-0.45 * bw, 0.78, 0.18, 0.08, 0.9, 0.04, 0xc9ced4, 0, 0.3); break;
    case 'hammer': B.cyl(0.58 * bw, 0.9, 0.2, 0.03, 0.03, 0.7, 0x5d4028, 5); B.box(0.58 * bw, 0.6, 0.2, 0.26, 0.16, 0.16, 0x4a4a4a); break;
    case 'book': B.box(-0.45 * bw, 1.0, 0.3, 0.3, 0.38, 0.1, 0x7a2a2a); break;
    case 'bow': B.torus(-0.52 * bw, 1.2, -0.28, 0.6, 0.03, 0x6b4a2c, 0, Math.PI / 2); break;
    case 'rod': B.cyl(0.6 * bw, 1.6, 0.6, 0.02, 0.03, 2.8, 0x8a6a45, 5, 0, 0.6); break;
    case 'club': B.cyl(0.6 * bw, 0.9, 0.35, 0.09, 0.05, 1.1, 0x6b4a2c, 6, 0, 0.9); break;
    case 'knife': B.box(0.58 * bw, 0.7, 0.2, 0.05, 0.45, 0.08, 0xc9ced4); break;
    case 'axe': B.cyl(0.6 * bw, 1.0, 0.2, 0.04, 0.04, 1.3, 0x5d4028, 5); B.box(0.6 * bw, 1.55, 0.38, 0.06, 0.4, 0.35, 0x9aa0a8); break;
    case 'lute': B.sphere(0.1, 1.1, 0.3, 0.26, 0xa8743a, 1, 1.2, 0.5); B.box(0.25, 1.45, 0.3, 0.08, 0.6, 0.05, 0x5d4028, 0, 0, -0.5); break;
  }
  const body = B.mesh(o.mat || MAT.flat);
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  model.add(body);
  const legB = new Builder();
  legB.box(0, -0.38, 0, 0.26, 0.76, 0.26, o.bottom);
  legB.box(0, -0.78, 0.05, 0.28, 0.1, 0.36, o.shoes || 0x2e2218);
  const legGeo = legB.geometry();
  const legL = new THREE.Mesh(legGeo, o.mat || MAT.flat), legR = new THREE.Mesh(legGeo, o.mat || MAT.flat);
  legL.castShadow = legR.castShadow = true;
  const pL = new THREE.Group(), pR = new THREE.Group();
  pL.position.set(-0.19 * bw, 0.82, 0); pR.position.set(0.19 * bw, 0.82, 0);
  pL.add(legL); pR.add(legR);
  model.add(pL, pR);
  root.scale.setScalar(o.scale || 1);
  return { root, model, legL: pL, legR: pR, body };
}

/* =========================================================
   主人公（見習い魔法使い）
   ========================================================= */
class Player {
  constructor() {
    const box = (B, ...a) => B.box(...a);
    this.root = new THREE.Group();
    this.model = new THREE.Group();   // 正面は +Z
    this.root.add(this.model);
    // 王国魔法師団長の礼装（黒と群青の長衣、金の縁取り、白銀の髪）
    const robe = 0x161c30, trim = 0xd9b34a, skin = 0xeac4a0, hair = 0xe8ecf0;
    const B = new Builder();
    box(B, 0, 1.28, 0, 0.84, 0.95, 0.46, robe);
    B.cyl(0, 0.6, 0, 0.44, 0.62, 1.18, robe, 12);
    B.cyl(0, 0.04, 0, 0.62, 0.63, 0.08, trim, 12);
    box(B, 0, 1.18, 0.235, 0.1, 1.2, 0.02, trim);
    box(B, -0.18, 1.5, 0.235, 0.05, 0.5, 0.02, trim); box(B, 0.18, 1.5, 0.235, 0.05, 0.5, 0.02, trim);
    box(B, 0, 0.96, 0, 0.86, 0.1, 0.5, 0x3a2a1a);
    box(B, 0, 0.96, 0.26, 0.2, 0.16, 0.04, trim);
    // 肩当てと立ち襟
    box(B, -0.5, 1.72, 0, 0.42, 0.16, 0.54, 0x2a2e44); box(B, 0.5, 1.72, 0, 0.42, 0.16, 0.54, 0x2a2e44);
    box(B, -0.5, 1.79, 0, 0.44, 0.04, 0.56, trim); box(B, 0.5, 1.79, 0, 0.44, 0.04, 0.56, trim);
    B.cyl(0, 1.8, -0.02, 0.28, 0.3, 0.26, robe, 10);
    B.sphere(0, 2.02, 0, 0.3, skin, 1, 1.05, 1, 1);
    B.sphere(0, 2.1, -0.04, 0.33, hair, 1, 0.8, 1);
    box(B, 0, 1.86, -0.24, 0.5, 0.55, 0.14, hair);
    box(B, -0.24, 1.98, 0.08, 0.08, 0.4, 0.2, hair); box(B, 0.24, 1.98, 0.08, 0.08, 0.4, 0.2, hair);
    box(B, -0.1, 2.04, 0.28, 0.07, 0.05, 0.02, 0x3a6aa8);
    box(B, 0.1, 2.04, 0.28, 0.07, 0.05, 0.02, 0x3a6aa8);
    box(B, 0, 2.18, 0.26, 0.5, 0.05, 0.05, trim);
    // 外套
    box(B, 0, 1.08, -0.3, 0.98, 1.9, 0.05, 0x0c0e1a, 0, -0.07);
    box(B, 0, 0.16, -0.36, 1.0, 0.1, 0.06, trim, 0, -0.07);
    this.body = B.mesh();
    this.model.add(this.body);
    const limb = (x, y, w, h, color, extra) => {
      const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
      const L = new Builder();
      L.box(0, -h / 2, 0, w, h, w, color);
      if (extra) extra(L, h);
      const m = L.mesh(); pivot.add(m);
      return pivot;
    };
    this.armL = limb(-0.54, 1.64, 0.22, 0.8, robe, (L, h) => { L.box(0, -h + 0.1, 0, 0.26, 0.2, 0.26, trim); L.box(0, -h - 0.06, 0, 0.16, 0.16, 0.16, 0xf4f0e6); });
    this.armR = limb(0.54, 1.64, 0.22, 0.8, robe, (L, h) => { L.box(0, -h + 0.1, 0, 0.26, 0.2, 0.26, trim); L.box(0, -h - 0.06, 0, 0.16, 0.16, 0.16, 0xf4f0e6); });
    // 杖（手首を支点に回す）と先の宝珠
    this.staff = new THREE.Group();
    this.staff.position.set(0, -0.84, 0.06);
    const SB = new Builder();
    SB.cyl(0, 0.15, 0, 0.045, 0.055, 2.2, 0x1a1a24, 6);
    SB.torus(0, 1.18, 0, 0.16, 0.035, 0xd9b34a, Math.PI / 2);
    SB.torus(0, 1.3, 0, 0.22, 0.025, 0xd9b34a, 0);
    SB.cone(0, 1.55, 0, 0.05, 0.3, 0xd9b34a, 4);
    this.staff.add(SB.mesh());
    this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
    this.orb.position.set(0, 1.32, 0);
    this.orbGlow = makeGlowSprite(0xffb060, 0.9, 0.9);
    this.orb.add(this.orbGlow);
    this.staff.add(this.orb);
    this.armR.add(this.staff);
    this.legL = limb(-0.2, 0.82, 0.26, 0.8, 0x14141c);
    this.legR = limb(0.2, 0.82, 0.26, 0.8, 0x14141c);
    this.model.add(this.armL, this.armR, this.legL, this.legR);
    scene.add(this.root);

    this.pos = new THREE.Vector3(CONFIG.spawn.x, 0, CONFIG.spawn.z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.inWater = false;
    this.facing = Math.PI;
    this.phase = 0;
    this.radius = 0.45;
    this.castAnim = 0;
    this.hurtT = 0;
  }
  orbWorld(out) { this.orb.getWorldPosition(out); return out; }
  floorAt(x, z) {
    return Math.max(groundAt(x, z, this.pos.y), waterAt(x, z) - 1.05);
  }
  canStep(fromX, fromZ, toX, toZ) {
    const d = Math.hypot(toX - fromX, toZ - fromZ);
    if (d < 1e-5) return true;
    const rise = groundAt(toX, toZ, this.pos.y) - groundAt(fromX, fromZ, this.pos.y);
    return rise < 0.6 || rise / d <= CONFIG.maxSlope;
  }
  update(dt, input, camYaw, time, charging) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let mx = fx * input.y + rx * input.x, mz = fz * input.y + rz * input.x;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const g = groundAt(this.pos.x, this.pos.z, this.pos.y);
    this.inWater = waterAt(this.pos.x, this.pos.z) - g > 1.0;
    let speed = (input.run ? CONFIG.runSpeed : CONFIG.walkSpeed) * (this.inWater ? 0.55 : 1);
    if (charging) speed *= 0.45;
    speed *= STATE.speedMul || 1;
    const k = 1 - Math.exp(-(this.onGround ? 12 : 3) * dt);
    this.vel.x = lerp(this.vel.x, mx * speed, k);
    this.vel.z = lerp(this.vel.z, mz * speed, k);

    const p = this.pos;
    const nx = p.x + this.vel.x * dt, nz = p.z + this.vel.z * dt;
    const checkSlope = this.onGround && !this.inWater;
    if (!checkSlope || this.canStep(p.x, p.z, nx, nz)) { p.x = nx; p.z = nz; }
    else if (this.canStep(p.x, p.z, nx, p.z)) { p.x = nx; this.vel.z = 0; }
    else if (this.canStep(p.x, p.z, p.x, nz)) { p.z = nz; this.vel.x = 0; }
    else { this.vel.x = this.vel.z = 0; }

    resolveCollisions(p, this.radius);
    if (!GAME.inDungeon) {
      const lim = HALF - 8;
      p.x = clamp(p.x, -lim, lim);
      p.z = clamp(p.z, -lim, lim);
    }

    if (input.jump && (this.onGround || this.inWater)) { this.vy = CONFIG.jumpPower; this.onGround = false; SOUND.jump(); }
    input.jump = false;
    this.vy -= CONFIG.gravity * dt;
    p.y += this.vy * dt;
    const floor = this.floorAt(p.x, p.z);
    if (p.y <= floor || (this.onGround && this.vy <= 0 && p.y - floor < 0.6)) {
      p.y = floor; this.vy = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (this.faceTo !== undefined) {
      this.facing = angleLerp(this.facing, this.faceTo, Math.min(1, 16 * dt));
      this.faceTimer -= dt;
      if (this.faceTimer <= 0) this.faceTo = undefined;
    } else if (len > 0.05) this.facing = angleLerp(this.facing, Math.atan2(mx, mz), Math.min(1, 12 * dt));

    const hs = Math.hypot(this.vel.x, this.vel.z);
    const amt = Math.min(1, hs / CONFIG.walkSpeed);
    this.phase += hs * dt * 1.6;
    const sw = Math.sin(this.phase) * 0.9 * amt;
    this.castAnim = Math.max(0, this.castAnim - dt * 3);
    if (this.onGround) {
      this.legL.rotation.x = sw; this.legR.rotation.x = -sw;
      this.armL.rotation.x = -sw * 0.8;
      this.armL.rotation.z = 0;
      this.model.position.y = Math.abs(Math.sin(this.phase)) * 0.08 * amt + Math.sin(time * 2) * 0.01;
    } else {
      this.legL.rotation.x = 0.5; this.legR.rotation.x = -0.25;
      this.armL.rotation.z = -0.7;
      this.model.position.y = 0;
    }
    // 右腕（杖）：詠唱中は前に掲げる
    const raise = charging ? 1 : this.castAnim;
    this.armR.rotation.x = lerp(this.onGround ? sw * 0.8 : 0, -1.6, raise);
    this.armR.rotation.z = lerp(this.onGround ? 0 : 0.7, 0.15, raise);
    this.staff.rotation.x = raise * 2.9;
    if (this.inWater) this.model.position.y = -0.2 + Math.sin(time * 3) * 0.05;

    this.hurtT = Math.max(0, this.hurtT - dt);
    this.body.visible = !(this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0);
    this.root.position.copy(p);
    this.root.rotation.y = this.facing;
  }
}

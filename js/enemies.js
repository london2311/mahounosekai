'use strict';
/* =========================================================
   魔物の種類
   weak: 弱点（1.6倍）  resist: 耐性（0.5倍）
   ========================================================= */
const ETYPES = {
  slime:    { name: 'スライム',         lv: 1,  hp: 22,    atk: 4,   speed: 2.4, exp: 4,    gold: 3,   aggro: 11, reach: 1.3, cd: 1.6, weak: 'thunder', model: 'slime', color: 0x4aa3e8 },
  rabbit:   { name: '角ウサギ',         lv: 2,  hp: 28,    atk: 5,   speed: 4.6, exp: 5,    gold: 4,   aggro: 12, reach: 1.4, cd: 1.5, weak: 'fire', model: 'rabbit' },
  goblin:   { name: 'ゴブリン',         lv: 4,  hp: 55,    atk: 8,   speed: 3.7, exp: 10,   gold: 9,   aggro: 16, reach: 1.7, cd: 1.5, weak: 'fire', model: 'goblin' },
  wolf:     { name: 'ウルフ',           lv: 6,  hp: 110,   atk: 12,  speed: 6.3, exp: 20,   gold: 12,  aggro: 20, reach: 1.9, cd: 1.3, weak: 'fire', model: 'wolf', color: 0x6a625a },
  mushroom: { name: 'おばけキノコ',     lv: 5,  hp: 90,    atk: 9,   speed: 2.0, exp: 15,   gold: 8,   aggro: 14, reach: 1.5, cd: 2.2, weak: 'fire', model: 'mushroom', ranged: { range: 14, speed: 9, color: 0xb8e05a } },
  bandit:   { name: '盗賊',             lv: 8,  hp: 200,   atk: 16,  speed: 4.9, exp: 35,   gold: 40,  aggro: 18, reach: 1.8, cd: 1.3, weak: 'thunder', model: 'bandit' },
  skeleton: { name: 'スケルトン',       lv: 10, hp: 280,   atk: 20,  speed: 3.9, exp: 45,   gold: 30,  aggro: 18, reach: 1.9, cd: 1.4, weak: 'fire', resist: 'ice', model: 'skeleton' },
  golem:    { name: 'ストーンゴーレム', lv: 12, hp: 700,   atk: 34,  speed: 2.6, exp: 110,  gold: 70,  aggro: 16, reach: 2.8, cd: 2.2, weak: 'ice', resist: 'fire', model: 'golem' },
  bat:      { name: '吸血コウモリ',     lv: 9,  hp: 180,   atk: 15,  speed: 6.0, exp: 30,   gold: 18,  aggro: 18, reach: 1.6, cd: 1.2, weak: 'thunder', model: 'bat', fly: 2.2 },
  ghost:    { name: 'さまよう亡霊',     lv: 11, hp: 350,   atk: 24,  speed: 3.4, exp: 60,   gold: 35,  aggro: 16, reach: 1.8, cd: 2.0, weak: 'fire', resist: 'ice', model: 'ghost', fly: 0.8, ranged: { range: 16, speed: 10, color: 0xa88aff } },
  scorpion: { name: '砂サソリ',         lv: 13, hp: 450,   atk: 26,  speed: 4.2, exp: 70,   gold: 45,  aggro: 18, reach: 2.2, cd: 1.5, weak: 'ice', resist: 'fire', model: 'scorpion' },
  lizard:   { name: 'リザードマン',     lv: 13, hp: 500,   atk: 28,  speed: 4.6, exp: 75,   gold: 50,  aggro: 18, reach: 2.4, cd: 1.4, weak: 'ice', model: 'lizard' },
  toad:     { name: '毒ガエル',         lv: 12, hp: 380,   atk: 22,  speed: 3.0, exp: 55,   gold: 30,  aggro: 14, reach: 1.8, cd: 1.8, weak: 'fire', model: 'toad', ranged: { range: 12, speed: 8, color: 0x8ae04a } },
  icewolf:  { name: '氷狼',             lv: 15, hp: 650,   atk: 34,  speed: 6.6, exp: 90,   gold: 55,  aggro: 22, reach: 2.0, cd: 1.3, weak: 'fire', resist: 'ice', model: 'wolf', color: 0xd8e8f0 },
  harpy:    { name: 'ハーピー',         lv: 14, hp: 520,   atk: 28,  speed: 5.4, exp: 80,   gold: 50,  aggro: 22, reach: 2.0, cd: 1.6, weak: 'thunder', model: 'harpy', fly: 3.2 },
  troll:    { name: '山トロル',         lv: 16, hp: 1600,  atk: 60,  speed: 3.3, exp: 260,  gold: 120, aggro: 18, reach: 3.2, cd: 2.4, weak: 'fire', model: 'troll' },
  crab:     { name: 'ヨロイガニ',       lv: 14, hp: 600,   atk: 30,  speed: 3.6, exp: 80,   gold: 60,  aggro: 14, reach: 2.0, cd: 1.6, weak: 'thunder', resist: 'fire', model: 'crab' },
  ogre:     { name: 'オーガ',           lv: 18, hp: 2800,  atk: 75,  speed: 3.8, exp: 400,  gold: 200, aggro: 20, reach: 3.6, cd: 2.2, weak: 'ice', model: 'ogre' },
  wyvern:   { name: 'ワイバーン',       lv: 21, hp: 3600,  atk: 85,  speed: 6.5, exp: 700,  gold: 320, aggro: 30, reach: 3.5, cd: 2.4, weak: 'ice', resist: 'fire', model: 'wyvern', fly: 5, ranged: { range: 30, speed: 18, color: 0xff6a2a } },
  guardian: { name: '遺跡の番人',       lv: 10, hp: 2600,  atk: 40,  speed: 2.7, exp: 600,  gold: 500, aggro: 30, reach: 4.5, cd: 2.4, weak: 'thunder', resist: 'fire', model: 'guardian', boss: true },
  // 帝国軍（ひとりひとり動く兵）
  imp_soldier: { name: '帝国兵', lv: 30, hp: 900, atk: 90, speed: 4.2, exp: 12, gold: 8, aggro: 26, reach: 1.9, cd: 1.3, model: 'imp', human: true },
  imp_knight:  { name: '帝国騎士', lv: 38, hp: 3200, atk: 220, speed: 3.8, exp: 40, gold: 30, aggro: 26, reach: 2.2, cd: 1.6, model: 'impKnight', human: true },
  imp_mage:    { name: '帝国魔導兵', lv: 40, hp: 2200, atk: 180, speed: 3.4, exp: 40, gold: 30, aggro: 34, reach: 1.8, cd: 2.2, model: 'impMage', human: true, ranged: { range: 30, speed: 20, color: 0xb04aff } },
  // 帝国十将
  g10: { name: '第十将「嗤う屠殺者」グラウス', lv: 60, hp: 60000, atk: 900, speed: 4.6, exp: 3000, gold: 3000, aggro: 22, reach: 2.8, cd: 1.6, model: 'general', boss: true, general: 10, human: true },
  g9:  { name: '第九将「鉄壁」バルドゥル', lv: 64, hp: 180000, atk: 1500, speed: 3.2, exp: 6000, gold: 6000, aggro: 40, reach: 3.6, cd: 2.2, model: 'general', boss: true, general: 9, human: true },
  g8:  { name: '第八将「焼き払う者」イグナーツ', lv: 68, hp: 300000, atk: 1800, speed: 4.2, exp: 9000, gold: 8000, aggro: 40, reach: 3, cd: 1.9, model: 'general', boss: true, general: 8, human: true, ranged: { range: 40, speed: 24, color: 0xff5a1a } },
  g7:  { name: '第七将「魔女狩り」ヘルミーネ', lv: 72, hp: 420000, atk: 2200, speed: 4.4, exp: 12000, gold: 10000, aggro: 44, reach: 2.6, cd: 1.8, model: 'general', boss: true, general: 7, human: true, ranged: { range: 44, speed: 26, color: 0xc04aff } },
  g6:  { name: '第六将「山崩し」ドルガン', lv: 76, hp: 650000, atk: 3200, speed: 3.0, exp: 16000, gold: 12000, aggro: 40, reach: 4.8, cd: 2.4, model: 'general', boss: true, general: 6, human: true },
  g5:  { name: '第五将「双剣」レイヴン', lv: 80, hp: 560000, atk: 2600, speed: 8.5, exp: 18000, gold: 14000, aggro: 46, reach: 2.4, cd: 0.9, model: 'general', boss: true, general: 5, human: true },
  g4:  { name: '第四将「墓暴き」モルテ', lv: 74, hp: 400000, atk: 2000, speed: 3.6, exp: 14000, gold: 11000, aggro: 44, reach: 2.6, cd: 2.0, model: 'general', boss: true, general: 4, human: true, ranged: { range: 40, speed: 18, color: 0x7affc0 }, summon: 'skeleton' },
  g3:  { name: '第三将「竜騎」ジークリンデ', lv: 85, hp: 850000, atk: 3500, speed: 5.2, exp: 24000, gold: 18000, aggro: 50, reach: 3.2, cd: 1.7, model: 'general', boss: true, general: 3, human: true, ranged: { range: 48, speed: 34, color: 0xffe0a0 } },
  g2:  { name: '第二将「雷帝」アウグスト', lv: 90, hp: 1250000, atk: 4200, speed: 4.6, exp: 32000, gold: 24000, aggro: 52, reach: 3, cd: 1.8, model: 'general', boss: true, general: 2, human: true, bolt: true },
  g1:  { name: '第一将「剣聖」ヴィルヘルム', lv: 95, hp: 1900000, atk: 5200, speed: 6.2, exp: 45000, gold: 30000, aggro: 50, reach: 3.2, cd: 1.1, model: 'general', boss: true, general: 1, human: true },
  emperor: { name: 'ガルヴァス皇帝ヴァルゼル', lv: 96, hp: 1500000, atk: 4800, speed: 4.4, exp: 40000, gold: 40000, aggro: 40, reach: 3, cd: 1.6, model: 'general', boss: true, human: true },
  zenon:   { name: '宰相ゼノン（虚無の使徒）', lv: 99, hp: 3200000, atk: 6000, speed: 4.0, exp: 90000, gold: 60000, aggro: 50, reach: 3, cd: 1.6, model: 'general', boss: true, human: true, ranged: { range: 50, speed: 26, color: 0x6a1aff }, summon: 'ghost' },
  dragon:   { name: '古竜ヴァルグ',     lv: 25, hp: 25000, atk: 90,  speed: 4.2, exp: 8000, gold: 5000, aggro: 45, reach: 7.5, cd: 2.2, weak: 'ice', resist: 'fire', model: 'dragon', boss: true, ranged: { range: 40, speed: 22, color: 0xff5a1a } }
};

/* ---------- 帝国十将の姿 ---------- */
const GENERAL_LOOKS = {
  g10: { scale: 1.55, look: { skin: 0xc8a080, hairStyle: 'bald', hair: 0, top: 0x3a1a14, apron: 0x6a0a0a, armor: undefined, cape: undefined, hat: undefined, prop: 'axe', bulk: 1.5, blood: true, eyeGlow: 0xff3a2a } },
  g9:  { scale: 1.9, look: { armor: 0x4a4a52, top: 0x6a1414, hat: 'helmet', hatColor: 0x3a3a42, cape: 0x6a1414, prop: 'spear', bulk: 1.6 } },
  g8:  { scale: 1.55, look: { armor: 0x6a1a0a, top: 0x3a0a04, hat: 'helmet', hatColor: 0x5a1a0a, cape: 0xa02a0a, prop: 'staffRed', eyeGlow: 0xff8a2a } },
  g7:  { scale: 1.45, look: { dress: 0x2a0a3a, top: 0x2a0a3a, hat: 'witch', hatColor: 0x1a0a22, hairStyle: 'long', hair: 0xe8e0f0, prop: 'staffRed', skin: 0xe8d0c0, cape: undefined, armor: undefined } },
  g6:  { scale: 2.4, look: { armor: 0x5a4a3a, top: 0x3a2a1a, hat: undefined, hairStyle: 'short', hair: 0x6a3a1a, beard: 0x6a3a1a, prop: 'hammer', bulk: 1.8, cape: undefined } },
  g5:  { scale: 1.35, look: { armor: 0x1a1a22, top: 0x0a0a10, hat: 'hood', hatColor: 0x0a0a10, cape: 0x1a1a22, prop: 'sword', eyeGlow: 0xff2a2a } },
  g4:  { scale: 1.5, look: { dress: 0x2a3a2a, top: 0x2a3a2a, hat: 'hood', hatColor: 0x1a2a1a, prop: 'staffRed', skin: 0xb8c0a8, eyeGlow: 0x7affc0, bent: true } },
  g3:  { scale: 1.5, look: { armor: 0xc8c0a0, top: 0x6a1a1a, hat: 'helmet', hatColor: 0xd9b34a, hairStyle: 'long', hair: 0xe8c86a, prop: 'spear', cape: 0x8a1a1a } },
  g2:  { scale: 1.65, look: { armor: 0x2a2a3a, top: 0x1a1a4a, hat: 'crown', hatColor: 0xe8d84a, cape: 0x2a2a6a, prop: 'sword', eyeGlow: 0xfff08a, beard: 0xd8d8d8, hair: 0xd8d8d8 } },
  g1:  { scale: 1.6, look: { armor: 0xd8dce0, top: 0x2a2a30, hat: undefined, hairStyle: 'long', hair: 0xc8c8d0, cape: 0x1a1a1a, prop: 'sword', bulk: 1.1 } },
  emperor: { scale: 1.6, look: Object.assign({}, { armor: 0x2a2a30, hat: 'crown', hatColor: 0x1a1a1a, cape: 0x8a0a0a, top: 0x2a2a30, bulk: 1.25, hair: 0x1c1c24, beard: 0x1c1c24, prop: 'sword' }) },
  zenon: { scale: 1.7, look: { dress: 0x14081a, top: 0x14081a, hat: 'hood', hatColor: 0x0a0010, prop: 'staffRed', skin: 0xd8c0b0, eyeGlow: 0xb040ff } }
};

/* ---------- 魔物の姿 ---------- */
function quadruped(B, c, s, opt = {}) {
  B.box(0, 0.75 * s, 0, 0.7 * s, 0.6 * s, 1.5 * s, c);
  B.box(0, 1.0 * s, 0.9 * s, 0.5 * s, 0.5 * s, 0.55 * s, c);
  B.box(0, 0.9 * s, 1.25 * s, 0.3 * s, 0.26 * s, 0.4 * s, opt.snout || c);
  B.cone(-0.16 * s, 1.35 * s, 0.85 * s, 0.09 * s, 0.25 * s, c, 4);
  B.cone(0.16 * s, 1.35 * s, 0.85 * s, 0.09 * s, 0.25 * s, c, 4);
  B.box(-0.14 * s, 1.08 * s, 1.18 * s, 0.07 * s, 0.07 * s, 0.03, opt.eye || 0x1a1a1a);
  B.box(0.14 * s, 1.08 * s, 1.18 * s, 0.07 * s, 0.07 * s, 0.03, opt.eye || 0x1a1a1a);
  for (const [x, z] of [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]]) B.box(x * s, 0.3 * s, z * s, 0.18 * s, 0.6 * s, 0.18 * s, c);
  B.cyl(0, 0.95 * s, -0.95 * s, 0.05 * s, 0.14 * s, 0.7 * s, c, 5, 0, -1.0);
}
function wingPair(color, span, chord) {
  const mk = (sgn) => {
    const p = new THREE.Group();
    const W = new Builder();
    W.box(sgn * span / 2, 0, 0, span, 0.06, chord, color);
    W.box(sgn * span * 0.85, 0, -chord * 0.3, span * 0.4, 0.05, chord * 0.8, color);
    const m = W.mesh(); p.add(m);
    return p;
  };
  return [mk(-1), mk(1)];
}
function buildEnemyModel(type, T) {
  const B = new Builder();
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, emissive: 0x000000 });
  const r = { root, model, mat, height: 1.5, radius: 0.7, parts: {} };
  const humanoid = (look, sc) => {
    const h = buildHumanoid(Object.assign(look, { mat, scale: sc }));
    model.add(h.root);
    r.parts.legL = h.legL; r.parts.legR = h.legR; r.parts.rig = h;
    r.mat = h.mat;
    r.height = 2.2 * sc; r.radius = 0.5 * sc * (look.bulk || 1);
  };
  switch (T.model) {
    case 'slime':
      B.sphere(0, 0.45, 0, 0.62, T.color, 1, 0.75, 1, 1);
      B.sphere(0, 0.62, 0, 0.3, 0x9ad4ff, 1, 0.6, 1);
      B.box(-0.18, 0.62, 0.52, 0.1, 0.16, 0.05, 0x1a1a2a); B.box(0.18, 0.62, 0.52, 0.1, 0.16, 0.05, 0x1a1a2a);
      r.height = 1.0; r.radius = 0.65; break;
    case 'rabbit':
      B.sphere(0, 0.45, 0, 0.45, 0xe8e0d0, 1, 0.9, 1.2, 1);
      B.sphere(0, 0.75, 0.42, 0.3, 0xe8e0d0);
      B.box(-0.12, 1.15, 0.36, 0.1, 0.5, 0.06, 0xe8e0d0); B.box(0.12, 1.15, 0.36, 0.1, 0.5, 0.06, 0xe8e0d0);
      B.cone(0, 1.0, 0.66, 0.06, 0.4, 0xe8c04a, 5, 0, 1.2);
      B.box(-0.1, 0.8, 0.7, 0.06, 0.06, 0.02, 0xc8321e); B.box(0.1, 0.8, 0.7, 0.06, 0.06, 0.02, 0xc8321e);
      r.height = 1.0; r.radius = 0.55; break;
    case 'goblin':
      humanoid({ skin: 0x6a9a3a, top: 0x6a4a2a, bottom: 0x4a3a2a, hairStyle: 'bald', hair: 0, prop: 'club', eyeGlow: 0xffd84a, elf: true }, 0.72); break;
    case 'bandit':
      humanoid(lookFor('man', 'bandit' + Math.random(), { hat: 'bandana', hatColor: 0x3a3a3a, top: 0x5a4a3a, prop: 'knife', beard: 0x3a2a1a }), 1); break;
    case 'skeleton':
      humanoid({ skin: 0xe8e2d0, top: 0xd8d2c0, bottom: 0xd8d2c0, hairStyle: 'bald', hair: 0, bulk: 0.7, prop: 'sword', eyeGlow: 0xff3a2a, armor: 0x7a6a5a }, 1); break;
    case 'lizard':
      humanoid({ skin: 0x4a8a5a, top: 0x3a6a4a, bottom: 0x3a5a3a, hairStyle: 'bald', hair: 0, snout: 0x4a8a5a, tail: 0x4a8a5a, prop: 'spear', eyeGlow: 0xffe04a }, 1.15); break;
    case 'troll':
      humanoid({ skin: 0x7a8a6a, top: 0x5a4a3a, bottom: 0x4a3a2a, hairStyle: 'bald', hair: 0, bulk: 1.5, prop: 'club', snout: 0x7a8a6a }, 1.9); break;
    case 'ogre':
      humanoid({ skin: 0xb85a4a, top: 0x3a2a2a, bottom: 0x4a3a2a, hairStyle: 'short', hair: 0x1a1a1a, bulk: 1.6, prop: 'axe', horns: 0xe8e0cc, eyeGlow: 0xffe04a }, 2.3); break;
    case 'wolf':
      quadruped(B, T.color, 1, { eye: T.color === 0xd8e8f0 ? 0x3ab8ff : 0xffc83a });
      r.height = 1.4; r.radius = 0.8; break;
    case 'mushroom':
      B.cyl(0, 0.5, 0, 0.3, 0.4, 1.0, 0xe8dcc0, 8);
      B.sphere(0, 1.15, 0, 0.8, 0xc8321e, 1, 0.55, 1, 1);
      for (let k = 0; k < 6; k++) { const a = k * 1.05; B.sphere(Math.cos(a) * 0.5, 1.4, Math.sin(a) * 0.5, 0.12, 0xf4f0e6); }
      B.box(-0.12, 0.65, 0.33, 0.08, 0.12, 0.04, 0x1a1a1a); B.box(0.12, 0.65, 0.33, 0.08, 0.12, 0.04, 0x1a1a1a);
      r.height = 1.6; r.radius = 0.7; break;
    case 'toad':
      B.sphere(0, 0.6, 0, 0.8, 0x6a4a8a, 1.2, 0.75, 1.1, 1);
      B.sphere(-0.35, 1.05, 0.4, 0.2, 0xe8e04a); B.sphere(0.35, 1.05, 0.4, 0.2, 0xe8e04a);
      for (let k = 0; k < 5; k++) B.sphere(Math.cos(k) * 0.6, 0.9, Math.sin(k) * 0.5 - 0.1, 0.12, 0x9ae04a);
      r.height = 1.3; r.radius = 0.95; break;
    case 'scorpion': {
      const c = 0xb8864a;
      B.box(0, 0.5, 0, 1.0, 0.45, 1.4, c);
      B.box(0, 0.5, 0.85, 0.7, 0.35, 0.5, c);
      for (let k = 0; k < 5; k++) B.sphere(0, 0.7 + k * 0.32, -0.8 - k * 0.12 + (k > 2 ? (k - 2) * 0.25 : 0), 0.22 - k * 0.02, c);
      B.cone(0, 2.1, -0.6, 0.1, 0.4, 0x3a2a1a, 5, 0, 2.4);
      for (const s of [-1, 1]) { B.box(s * 0.75, 0.55, 1.2, 0.2, 0.2, 0.6, c); B.box(s * 0.85, 0.55, 1.6, 0.35, 0.25, 0.35, c); }
      for (let k = 0; k < 3; k++) for (const s of [-1, 1]) B.box(s * 0.7, 0.3, -0.4 + k * 0.4, 0.6, 0.08, 0.1, c, 0, 0, s * 0.5);
      r.height = 1.4; r.radius = 1.0; break;
    }
    case 'crab': {
      const c = 0xc8421e;
      B.sphere(0, 0.6, 0, 0.8, c, 1.3, 0.55, 1);
      for (const s of [-1, 1]) { B.sphere(s * 1.1, 0.8, 0.6, 0.35, c, 1.2, 0.8, 1); B.box(s * 0.25, 1.0, 0.6, 0.06, 0.3, 0.06, c); B.sphere(s * 0.25, 1.2, 0.6, 0.08, 0x1a1a1a); }
      for (let k = 0; k < 3; k++) for (const s of [-1, 1]) B.box(s * 1.0, 0.35, -0.4 + k * 0.35, 0.8, 0.08, 0.1, c, 0, 0, s * 0.6);
      r.height = 1.2; r.radius = 1.1; break;
    }
    case 'imp':
      humanoid(lookFor('imperial', 'imp' + Math.random(), { top: 0x7a1414, armor: 0x3a3a44, hatColor: 0x2a2a30, eyeGlow: undefined }), 1.05); break;
    case 'impKnight':
      humanoid(lookFor('imperial', 'impk' + Math.random(), { top: 0x5a0a0a, armor: 0x2a2a30, hatColor: 0x1a1a1e, prop: 'sword', cape: 0x5a0a0a, bulk: 1.2 }), 1.2); break;
    case 'impMage':
      humanoid(lookFor('chancellor', 'impm' + Math.random(), { dress: 0x2a0a1a, top: 0x2a0a1a, hatColor: 0x1a0a14, prop: 'staffRed', skin: 0xd9a47a }), 1.05); break;
    case 'general': {
      const L = GENERAL_LOOKS[type] || {};
      humanoid(Object.assign(lookFor('officer', type), L.look), L.scale || 1.5);
      r.height = 2.2 * (L.scale || 1.5); r.radius = 0.6 * (L.scale || 1.5);
      break;
    }
    case 'golem': case 'guardian': {
      const boss = T.model === 'guardian';
      const s = boss ? 2.6 : 1.5;
      const c = boss ? 0x8a8478 : 0x9a927e;
      B.box(0, 1.5 * s, 0, 1.3 * s, 1.1 * s, 0.8 * s, c);
      B.box(0, 2.3 * s, 0.05 * s, 0.6 * s, 0.5 * s, 0.55 * s, c);
      B.box(-0.12 * s, 2.35 * s, 0.33 * s, 0.12 * s, 0.08 * s, 0.02, boss ? 0x7affd4 : 0xffa84a);
      B.box(0.12 * s, 2.35 * s, 0.33 * s, 0.12 * s, 0.08 * s, 0.02, boss ? 0x7affd4 : 0xffa84a);
      for (const sx of [-1, 1]) { B.box(sx * 0.9 * s, 1.35 * s, 0, 0.45 * s, 1.3 * s, 0.5 * s, c); B.box(sx * 0.9 * s, 0.65 * s, 0.1 * s, 0.55 * s, 0.4 * s, 0.6 * s, c); }
      for (const sx of [-1, 1]) B.box(sx * 0.35 * s, 0.5 * s, 0, 0.45 * s, 1.0 * s, 0.5 * s, c);
      if (boss) for (let k = 0; k < 5; k++) B.box(0, 1.2 * s + k * 0.2 * s, 0.41 * s, 0.6 * s, 0.05 * s, 0.02, 0x7affd4);
      r.height = 2.6 * s; r.radius = 0.8 * s; break;
    }
    case 'bat': {
      B.sphere(0, 0, 0, 0.35, 0x3a2a3a, 1, 1, 1.2);
      B.cone(-0.15, 0.35, 0.05, 0.08, 0.25, 0x3a2a3a, 4); B.cone(0.15, 0.35, 0.05, 0.08, 0.25, 0x3a2a3a, 4);
      B.box(-0.1, 0.05, 0.32, 0.06, 0.06, 0.02, 0xff3a2a); B.box(0.1, 0.05, 0.32, 0.06, 0.06, 0.02, 0xff3a2a);
      const [wl, wr] = wingPair(0x2a1a2a, 1.1, 0.7);
      model.add(wl, wr); r.parts.wingL = wl; r.parts.wingR = wr;
      r.height = 0.8; r.radius = 0.6; break;
    }
    case 'harpy': {
      const h = buildHumanoid({ skin: 0xe8c8a0, top: 0x8a6a4a, bottom: 0x8a6a4a, hairStyle: 'long', hair: 0x5a3a8a, eyeGlow: 0xffd84a, mat });
      h.root.position.y = -1.2; r.mat = h.mat;
      model.add(h.root);
      const [wl, wr] = wingPair(0x8a6a9a, 2.0, 1.0);
      wl.position.set(0, 0.3, -0.2); wr.position.set(0, 0.3, -0.2);
      model.add(wl, wr); r.parts.wingL = wl; r.parts.wingR = wr;
      r.height = 2.2; r.radius = 0.7; break;
    }
    case 'ghost': {
      mat.transparent = true; mat.opacity = 0.7;
      B.sphere(0, 1.5, 0, 0.5, 0xd8e0f0, 1, 1.1, 1, 1);
      B.cone(0, 0.6, 0, 0.6, 1.6, 0xc8d4e8, 10, 0, Math.PI);
      B.box(-0.16, 1.55, 0.44, 0.12, 0.18, 0.04, 0x1a1a3a); B.box(0.16, 1.55, 0.44, 0.12, 0.18, 0.04, 0x1a1a3a);
      B.box(0, 1.3, 0.46, 0.18, 0.12, 0.04, 0x1a1a3a);
      for (const s of [-1, 1]) B.box(s * 0.6, 1.2, 0.2, 0.18, 0.7, 0.18, 0xd8e0f0, 0, -0.6, s * 0.4);
      r.height = 2.0; r.radius = 0.6; break;
    }
    case 'wyvern': case 'dragon': {
      const boss = T.model === 'dragon';
      const s = boss ? 3.2 : 1.6;
      const c = boss ? 0x6a2a2a : 0x4a6a3a, belly = boss ? 0xc89a5a : 0xb8b07a;
      B.sphere(0, 1.6 * s, 0, 1.0 * s, c, 1, 0.85, 1.6, 1);
      B.sphere(0, 1.4 * s, 0.2 * s, 0.8 * s, belly, 0.9, 0.7, 1.3);
      B.cyl(0, 2.3 * s, 1.5 * s, 0.3 * s, 0.45 * s, 1.4 * s, c, 8, 0, 0.8);
      B.box(0, 2.9 * s, 2.2 * s, 0.6 * s, 0.5 * s, 0.9 * s, c);
      B.box(0, 2.72 * s, 2.7 * s, 0.45 * s, 0.25 * s, 0.6 * s, c);
      B.box(-0.2 * s, 3.05 * s, 2.55 * s, 0.1 * s, 0.08 * s, 0.03, 0xffd84a); B.box(0.2 * s, 3.05 * s, 2.55 * s, 0.1 * s, 0.08 * s, 0.03, 0xffd84a);
      B.cone(-0.22 * s, 3.3 * s, 1.95 * s, 0.08 * s, 0.6 * s, 0xe8e0cc, 5, 0, -0.9); B.cone(0.22 * s, 3.3 * s, 1.95 * s, 0.08 * s, 0.6 * s, 0xe8e0cc, 5, 0, -0.9);
      for (let k = 0; k < 5; k++) B.cyl(0, 1.5 * s - k * 0.12 * s, -1.4 * s - k * 0.55 * s, 0.35 * s - k * 0.06 * s, 0.4 * s - k * 0.06 * s, 0.6 * s, c, 6, 0, Math.PI / 2);
      for (let k = 0; k < 6; k++) B.cone(0, 2.45 * s - k * 0.1 * s, 0.9 * s - k * 0.5 * s, 0.1 * s, 0.3 * s, 0xe8e0cc, 4);
      for (const [x, z] of [[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6]]) B.box(x * s, 0.55 * s, z * s, 0.35 * s, 1.1 * s, 0.4 * s, c);
      const [wl, wr] = wingPair(boss ? 0x4a1a1a : 0x3a5a2a, 3.2 * s, 1.8 * s);
      wl.position.set(0, 2.2 * s, 0.1 * s); wr.position.set(0, 2.2 * s, 0.1 * s);
      model.add(wl, wr); r.parts.wingL = wl; r.parts.wingR = wr;
      r.height = 3 * s; r.radius = 1.3 * s; r.head = 2.9 * s; r.snout = 2.9 * s;
      break;
    }
  }
  if (!B.empty) { const m = B.mesh(mat); model.add(m); }
  return r;
}

/* =========================================================
   魔物の出現場所
   ========================================================= */
const SPAWNS = [
  { x: 0, z: 0, r: 170, rmin: 42, list: [['slime', 9], ['rabbit', 5]] },
  { x: 70, z: 250, r: 170, rmin: 100, list: [['slime', 5], ['rabbit', 4]] },
  { x: -230, z: -200, r: 90, list: [['goblin', 7], ['slime', 2]] },
  { x: -380, z: 120, r: 230, rmin: 30, list: [['wolf', 5], ['mushroom', 7], ['goblin', 4]] },
  { x: 320, z: -100, r: 140, list: [['wolf', 3], ['rabbit', 4], ['bandit', 3]] },
  { x: 300, z: 520, r: 190, list: [['goblin', 4], ['wolf', 3], ['bandit', 2]] },
  { x: 700, z: -450, r: 240, list: [['scorpion', 8]] },
  { x: -650, z: 600, r: 200, rmin: 40, list: [['lizard', 5], ['toad', 5]] },
  { x: 40, z: -500, r: 140, list: [['icewolf', 3], ['harpy', 3]] },
  { x: 180, z: -760, r: 140, list: [['icewolf', 3], ['troll', 2]] },
  { x: -820, z: -330, r: 140, rmin: 25, list: [['skeleton', 6], ['golem', 2]] },
  { x: -120, z: -950, r: 220, list: [['ogre', 3], ['icewolf', 3]] },
  { x: 520, z: -880, r: 160, list: [['ogre', 2], ['troll', 1]] },
  { x: 650, z: 860, r: 160, list: [['crab', 5]] },
  { x: 800, z: 1060, r: 130, rmin: 62, list: [['crab', 4]] },
  { x: -860, z: -780, r: 150, list: [['wyvern', 3], ['troll', 1]] }
];
const ENEMIES = [];

function makeEnemy(type, x, z, opt = {}) {
  const T = ETYPES[type];
  const m = buildEnemyModel(type, T);
  const y = groundAt(x, z) + (T.fly || 0);
  m.root.position.set(x, y, z);
  scene.add(m.root);
  const en = {
    type, T, root: m.root, model: m.model, mat: m.mat, parts: m.parts, height: m.height, radius: m.radius,
    pos: m.root.position, home: { x, z }, hp: T.hp, maxHp: T.hp, alive: true, active: false,
    state: 'idle', timer: Math.random() * 3, facing: Math.random() * 6.28, aggro: false,
    wander: null, burn: 0, burnTick: 0, burnDps: 0, slow: 0, freeze: 0, stun: 0, flash: 0,
    deathT: 0, respawn: 0, dungeon: !!opt.dungeon, phase: Math.random() * 10, lastHit: -99, noRespawn: !!opt.noRespawn || !!T.human,
    zone: opt.zone || null, snout: m.snout
  };
  ENEMIES.push(en);
  return en;
}

function spawnAllEnemies() {
  const R = mulberry32(555);
  for (const z of SPAWNS) {
    for (const [type, n] of z.list) {
      let placed = 0, tries = 0;
      while (placed < n && tries++ < 200) {
        const a = R() * Math.PI * 2, r = (z.rmin || 0) + R() * (z.r - (z.rmin || 0));
        const x = z.x + Math.cos(a) * r, zz = z.z + Math.sin(a) * r;
        if (Math.abs(x) > HALF - 20 || Math.abs(zz) > HALF - 20) continue;
        const h = terrainHeight(x, zz);
        if (waterAt(x, zz) > h - 0.3) continue;
        if (inSafeZone(x, zz)) continue;
        makeEnemy(type, x, zz);
        placed++;
      }
    }
  }
  // 竜の峰の主
  const dn = SPOTS.dragonNest;
  const dragon = makeEnemy('dragon', dn.x, dn.z, { noRespawn: true });
  dragon.home = { x: dn.x, z: dn.z };
  // 地下迷宮
  const kinds = ['skeleton', 'bat', 'ghost', 'skeleton', 'bat'];
  DUNGEON.enemies.forEach((p, i) => {
    makeEnemy(kinds[i % kinds.length], p.x + 1, p.z, { dungeon: true });
    makeEnemy(kinds[(i + 2) % kinds.length], p.x - 1.5, p.z + 1.5, { dungeon: true });
  });
  makeEnemy('guardian', DUNGEON.boss.x, DUNGEON.boss.z, { dungeon: true, noRespawn: true });
}

/* =========================================================
   魔物の動き
   ========================================================= */
const aoeRings = [];
function telegraphRing(x, z, R, time) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, groundAt(x, z) + 0.12, z);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  m.add(fill);
  m.scale.setScalar(R);
  addFx(m, time, (t) => { fill.scale.setScalar(t); m.material.opacity = 0.4 + 0.3 * Math.sin(t * 30); });
}

function updateEnemies(dt, t) {
  const px = player.pos.x, pz = player.pos.z;
  for (const en of ENEMIES) {
    const dx = px - en.pos.x, dz = pz - en.pos.z;
    const dist = Math.hypot(dx, dz);
    const sameWorld = en.dungeon === GAME.inDungeon;
    const near = sameWorld && dist < 230;
    en.root.visible = near && dist < 200 && (en.alive || (en.deathT < 1.2 && !en.gibbed));
    en.active = near && en.alive;
    if (!near) {
      if (!en.alive && !en.noRespawn) { en.respawn -= dt; if (en.respawn <= 0) reviveEnemy(en); }
      continue;
    }
    if (!en.alive) {
      en.deathT += dt;
      en.model.rotation.z = Math.min(1.4, en.deathT * 3);
      en.model.position.y = -Math.max(0, en.deathT - 0.5) * 1.5;
      if (!en.noRespawn) {
        en.respawn -= dt;
        if (en.respawn <= 0 && dist > 60) reviveEnemy(en);
      }
      continue;
    }
    enemyAI(en, dt, t, dx, dz, dist);
  }
}

function reviveEnemy(en) {
  en.alive = true; en.hp = en.maxHp; en.deathT = 0; en.aggro = false; en.state = 'idle'; en.gibbed = false;
  en.burn = en.slow = en.freeze = en.stun = 0;
  en.pos.set(en.home.x, groundAt(en.home.x, en.home.z) + (en.T.fly || 0), en.home.z);
  en.model.rotation.set(0, 0, 0); en.model.position.set(0, 0, 0);
  en.root.scale.setScalar(1);
}

function enemyAI(en, dt, t, dx, dz, dist) {
  const T = en.T;
  // 状態異常
  if (en.flash > 0) en.flash -= dt;
  if (en.burn > 0) {
    en.burn -= dt; en.burnTick -= dt;
    if (Math.random() < 0.6) PF.spawn(en.pos.x + (Math.random() - 0.5) * en.radius, en.pos.y + Math.random() * en.height, en.pos.z + (Math.random() - 0.5) * en.radius,
      (Math.random() - 0.5) * 0.5, 1.5, (Math.random() - 0.5) * 0.5, 0.45, 0.4 + en.radius * 0.35, 0xffd890, 0x8a1a04, 0.85, -2, 1, -0.3);
    if (Math.random() < 0.15) PS.spawn(en.pos.x, en.pos.y + en.height, en.pos.z, 0, 1.2, 0, 1.2, 0.3 + en.radius * 0.3, 0x2a2622, 0x5a5652, 0.3, -0.5, 1, 0.8, 1);
    if (en.burnTick <= 0) { en.burnTick = 0.5; damageEnemy(en, en.burnDps * 0.5, null, null, true); if (!en.alive) return; }
  }
  if (en.slow > 0) en.slow -= dt;
  if (en.stun > 0) en.stun -= dt;
  const frozen = en.freeze > 0;
  if (frozen) en.freeze -= dt;
  const e = en.mat.emissive;
  if (en.flash > 0) e.setHex(0xffffff);
  else if (frozen) e.setHex(0x3a7ad4);
  else if (en.state === 'windup') e.setRGB(0.6 + 0.4 * Math.sin(t * 30), 0.05, 0.02);
  else if (en.burn > 0) e.setRGB(0.35 + 0.2 * Math.sin(t * 20), 0.1, 0);
  else if (en.stun > 0) e.setRGB(0.4, 0.4, 0.1);
  else if (en.slow > 0) e.setRGB(0.05, 0.15, 0.3);
  else e.setHex(0);
  if (frozen || en.stun > 0) { en.state = en.state === 'windup' ? 'recover' : en.state; en.timer = Math.max(en.timer, 0.3); animateEnemy(en, dt, t, 0, true); return; }

  if (!en.aggro && dist < T.aggro && !GAME.dead && !CUT.active && (!en.dormant || en.dormant())) {
    en.aggro = true; en.state = 'chase';
    if (T.general !== undefined || T.boss) onBossEngage(en);
  }
  if (T.summon && en.aggro) {
    en.summonT = (en.summonT ?? 6) - dt;
    if (en.summonT <= 0) {
      en.summonT = 14;
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + Math.random(); const s = makeEnemy(T.summon, en.pos.x + Math.cos(a) * 5, en.pos.z + Math.sin(a) * 5, { noRespawn: true, zone: en.zone, dungeon: en.dungeon }); s.aggro = true; s.state = 'chase'; s.summoned = true; }
      burst(en.pos.x, en.pos.y + 1, en.pos.z, 60, 6, 1, 0.6, T.ranged ? T.ranged.color : 0x7affc0, -1);
      popNumber(en.pos.x, en.pos.y + en.height + 1, en.pos.z, '召喚', '#b88aff', '');
    }
  }
  if (T.bolt && en.aggro) {
    en.boltT = (en.boltT ?? 4) - dt;
    if (en.boltT <= 0) {
      en.boltT = 3.2;
      const bx = player.pos.x, bz = player.pos.z;
      telegraphRing(bx, bz, 5, 1.0);
      setTimeout(() => {
        if (!en.alive) return;
        const p = new THREE.Vector3(bx, groundAt(bx, bz) + 0.5, bz);
        lightningFx(p.clone().add(new THREE.Vector3(0, 30, 0)), p, 0.25, 3);
        SOUND.thunder(2);
        if (Math.hypot(player.pos.x - bx, player.pos.z - bz) < 5.5) damagePlayer(T.atk * 1.2, en);
      }, 1000);
    }
  }
  const homeD = Math.hypot(en.pos.x - en.home.x, en.pos.z - en.home.z);
  if (en.aggro && (dist > T.aggro * 2.8 || homeD > (T.boss ? 60 : 75) || GAME.dead)) { en.aggro = false; en.state = 'return'; }

  const spd = T.speed * (en.slow > 0 ? 0.5 : 1);
  let mvx = 0, mvz = 0, moving = 0;
  if (en.aggro) {
    en.facing = angleLerp(en.facing, Math.atan2(dx, dz), Math.min(1, dt * 8));
    if (en.state === 'windup') {
      en.timer -= dt;
      if (en.timer <= 0) enemyAttack(en, dist);
    } else if (en.state === 'recover') {
      en.timer -= dt;
      if (en.timer <= 0) en.state = 'chase';
    } else {
      const reach = T.reach + en.radius * 0.3;
      const rg = T.ranged;
      if (dist < reach) {
        en.state = 'windup'; en.attack = 'melee';
        en.timer = T.boss ? 0.9 : 0.55;
        if (T.boss && Math.random() < 0.55) { en.attack = 'slam'; en.timer = 1.2; telegraphRing(en.pos.x, en.pos.z, T.reach * 1.6, 1.2); }
      } else if (rg && dist < rg.range && Math.random() < dt * (T.boss ? 0.8 : 0.9)) {
        en.state = 'windup'; en.attack = 'shot'; en.timer = T.boss ? 1.0 : 0.6;
      } else {
        mvx = dx / dist; mvz = dz / dist; moving = 1;
      }
    }
  } else if (en.scene) {
    // 捕虜を嬲っている間はその場を離れない
    en.facing = angleLerp(en.facing, Math.atan2(en.scene.x - en.pos.x, en.scene.z - en.pos.z), Math.min(1, dt * 4));
    en.tormentT = Math.max(0, (en.tormentT || 0) - dt);
  } else {
    if (en.state === 'return') {
      const hx = en.home.x - en.pos.x, hz = en.home.z - en.pos.z, hd = Math.hypot(hx, hz);
      if (hd < 3) en.state = 'idle';
      else { mvx = hx / hd; mvz = hz / hd; moving = 1; }
      if (en.hp < en.maxHp) en.hp = Math.min(en.maxHp, en.hp + en.maxHp * 0.2 * dt);
    } else {
      en.timer -= dt;
      if (en.timer <= 0) {
        en.timer = 2 + Math.random() * 4;
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 12;
          en.wander = { x: en.home.x + Math.cos(a) * r, z: en.home.z + Math.sin(a) * r };
        } else en.wander = null;
      }
      if (en.wander) {
        const wx = en.wander.x - en.pos.x, wz = en.wander.z - en.pos.z, wd = Math.hypot(wx, wz);
        if (wd < 1) en.wander = null;
        else { mvx = wx / wd; mvz = wz / wd; moving = 0.45; }
      }
    }
    if (moving) en.facing = angleLerp(en.facing, Math.atan2(mvx, mvz), Math.min(1, dt * 5));
  }
  if (moving) {
    let s = spd * moving;
    if (T.model === 'slime') s *= 0.5 + Math.max(0, Math.sin(en.phase * 2)) * 1.4;
    const nx = en.pos.x + mvx * s * dt, nz = en.pos.z + mvz * s * dt;
    let ok = true;
    if (!T.fly && waterAt(nx, nz) - groundAt(nx, nz) > 0.9) ok = false;
    if (!en.dungeon && !T.human && inSafeZone(nx, nz)) ok = false;
    if (ok) { en.pos.x = nx; en.pos.z = nz; }
    if (!T.boss) resolveCollisions(en.pos, en.radius * 0.6);
  }
  // 敵どうしが重ならない
  const ground = groundAt(en.pos.x, en.pos.z);
  const targetY = ground + (T.fly ? T.fly + Math.sin(t * 2 + en.phase) * 0.4 : 0);
  en.pos.y = lerp(en.pos.y, targetY, Math.min(1, dt * 10));
  en.root.rotation.y = en.facing;
  animateEnemy(en, dt, t, moving ? spd * moving : 0, false);
}

function animateEnemy(en, dt, t, speed, still) {
  if (!still) en.phase += dt * (1 + speed * 1.4);
  const T = en.T, p = en.parts, m = en.model;
  const wind = en.state === 'windup' ? 1 : 0;
  switch (T.model) {
    case 'slime': {
      const b = Math.abs(Math.sin(en.phase * 2));
      m.scale.set(1 + (1 - b) * 0.15, 0.85 + b * 0.3, 1 + (1 - b) * 0.15);
      m.position.y = b * 0.4 * (speed > 0 ? 1 : 0.3);
      break;
    }
    case 'rabbit': m.position.y = Math.abs(Math.sin(en.phase * 3)) * 0.35 * (speed > 0 ? 1 : 0.2); break;
    case 'toad': m.scale.y = 1 + Math.sin(en.phase * 2) * 0.08; break;
    case 'mushroom': m.rotation.z = Math.sin(en.phase * 2) * 0.12; break;
    case 'ghost': m.rotation.z = Math.sin(t * 1.5 + en.phase) * 0.1; break;
    case 'wolf': case 'scorpion': case 'crab':
      m.position.y = Math.abs(Math.sin(en.phase * 3)) * 0.1 * Math.min(1, speed / 3);
      m.rotation.x = -wind * 0.25;
      break;
  }
  if (p.rig) {
    animateWalk(p.rig, en.phase * 2.2, Math.min(1.1, speed / 3), t);
    const b = p.rig.rig.bones;
    // 構え・振りかぶり・嬲る腕
    const tor = en.tormentT > 0 ? Math.sin(en.tormentT / 0.35 * Math.PI) : 0;
    const swing = Math.max(wind, tor);
    b.uArmR.rotation.x = lerp(b.uArmR.rotation.x, -2.6, swing); b.fArmR.rotation.x = lerp(b.fArmR.rotation.x, -0.5, swing);
    if (en.aggro && !wind) { b.uArmR.rotation.x = -0.7; b.fArmR.rotation.x = -0.9; }
    b.chest.rotation.x += -wind * 0.25 + tor * 0.35;
    m.rotation.x = 0;
  } else if (p.legL) {
    const sw = Math.sin(en.phase * 2.2) * 0.8 * Math.min(1, speed / 3);
    p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
    m.rotation.x = -wind * 0.3 + (en.tormentT > 0 ? 0.45 * Math.sin(en.tormentT / 0.35 * Math.PI) : 0);
  }
  if (p.wingL) {
    const f = Math.sin(t * (T.model === 'bat' ? 18 : T.model === 'harpy' ? 9 : 5) + en.phase) * 0.7;
    p.wingL.rotation.z = f; p.wingR.rotation.z = -f;
  }
  if (T.boss && T.model === 'guardian') m.rotation.x = -wind * 0.25;
}

function enemyAttack(en, dist) {
  const T = en.T;
  en.state = 'recover';
  en.timer = T.cd * (0.8 + Math.random() * 0.4);
  if (en.attack === 'shot') {
    const from = new THREE.Vector3(en.pos.x, en.pos.y + (en.snout || en.height * 0.7), en.pos.z);
    const [fx, fz] = rotXZ(0, en.radius, en.facing);
    from.x += fx; from.z += fz;
    const to = new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z);
    const rg = T.ranged;
    if (T.model === 'dragon') {
      for (let k = -3; k <= 3; k++) {
        const side = new THREE.Vector3(-(to.z - from.z), 0, to.x - from.x).normalize();
        enemyShot(from, to.clone().addScaledVector(side, k * 2.5), rg.speed, T.atk * 0.6, rg.color, 1.2, en);
      }
      SOUND.boom(2);
    } else enemyShot(from, to, rg.speed, T.atk * 0.8, rg.color, T.model === 'wyvern' ? 0.8 : 0.45, en);
    return;
  }
  if (en.attack === 'slam') {
    const R = T.reach * 1.6;
    dustImpact(new THREE.Vector3(en.pos.x, groundAt(en.pos.x, en.pos.z) + 0.5, en.pos.z), R);
    shakeCamera(0.45);
    SOUND.boom(3);
    if (dist < R + 0.5 && player.pos.y - groundAt(player.pos.x, player.pos.z) < 3) damagePlayer(T.atk * 1.4, en);
    return;
  }
  const dy = Math.abs(player.pos.y - en.pos.y);
  if (dist < T.reach + en.radius * 0.3 + 1.0 && dy < 2.5 + en.height * 0.5) damagePlayer(T.atk, en);
  const [fx, fz] = rotXZ(0, en.radius + 0.6, en.facing);
  burst(en.pos.x + fx, en.pos.y + en.height * 0.5, en.pos.z + fz, 8, 3, 0.25, 0.25, 0xffffff);
}

/* =========================================================
   ダメージと撃破
   ========================================================= */
function damageEnemy(en, amount, elem, from, isDot) {
  if (!en.alive) return;
  if (en.dormant && !en.dormant()) { if (!isDot && GAME.time - (en.barrierMsg || -9) > 1) { en.barrierMsg = GAME.time; popNumber(en.pos.x, en.pos.y + en.height + 0.3, en.pos.z, '結界', '#b88aff', 'resist'); } return; }
  let mult = 1, tag = '';
  if (elem && en.T.weak === elem) { mult = 1.6; tag = 'weak'; }
  else if (elem && en.T.resist === elem) { mult = 0.5; tag = 'resist'; }
  const dmg = Math.max(1, Math.round(amount * mult * (isDot ? 1 : 0.9 + Math.random() * 0.2)));
  if (elem) en.lastEl = elem;
  if (from) en.lastFrom = { x: from.x, z: from.z };
  en.hp -= dmg;
  en.aggro = true;
  if (en.state === 'idle' || en.state === 'return') en.state = 'chase';
  en.lastHit = GAME.time;
  if (!isDot) en.flash = 0.1;
  const col = elem ? ELEM[elem].css : '#ffb07a';
  popNumber(en.pos.x, en.pos.y + en.height + 0.3, en.pos.z, fmt(dmg), col, tag, isDot);
  if (elem === 'fire') { en.burn = 3; en.burnDps = Math.max(en.burnDps * (en.burn > 0 ? 0.5 : 0), dmg * 0.12); }
  if (elem === 'ice') { en.slow = 3.5; if (dmg > en.maxHp * 0.18 || Math.random() < 0.12) { en.freeze = 1.2 + Math.min(2, dmg / en.maxHp * 3); } }
  if (elem === 'thunder') en.stun = Math.max(en.stun, 0.45);
  if (from && !en.T.boss && !isDot) {
    const kx = en.pos.x - from.x, kz = en.pos.z - from.z, kd = Math.hypot(kx, kz) || 1;
    const k = Math.min(3, amount / en.maxHp * 4);
    const nx = en.pos.x + kx / kd * k, nz = en.pos.z + kz / kd * k;
    if (en.dungeon || en.T.human || !inSafeZone(nx, nz)) { en.pos.x = nx; en.pos.z = nz; }
  }
  if (!isDot && GAME.time - (UI.lastHitSnd || 0) > 0.06) { UI.lastHitSnd = GAME.time; SOUND.hit(); }
  if (en.hp <= 0) killEnemy(en);
}

function killEnemy(en) {
  en.alive = false; en.active = false; en.deathT = 0;
  en.respawn = 50 + Math.random() * 30;
  en.mat.emissive.setHex(0);
  SOUND.enemyDie();
  if (FOCUS.target === en) { FOCUS.target = null; FOCUS.manual = false; FOCUS.timer = 0.15; }
  burst(en.pos.x, en.pos.y + en.height * 0.5, en.pos.z, 30 + en.radius * 20, 4 + en.radius * 2, 0.8, 0.4 + en.radius * 0.2, 0xfff0c0, 1);
  const T = en.T;
  // 人は魔法で無残に死ぬ
  if (T.human && !en.dungeon) {
    const f = en.lastFrom || { x: player.pos.x, z: player.pos.z };
    const d = Math.hypot(en.pos.x - f.x, en.pos.z - f.z);
    if (!T.boss) {
      en.gibbed = true; en.root.visible = false;
      goreKill(en.pos.x, en.pos.y, en.pos.z, en.facing, en.lastEl || 'fire', f.x, f.z, Math.min(d, 6), 10, { fling: true }, true);
    } else {
      const s = T.general !== undefined || en.type === 'zenon' ? 2 : 1;
      bloodSpray(en.pos.x, en.pos.y + en.height * 0.6, en.pos.z, 50, 7);
      for (let k = 0; k < 6 * s; k++) addBloodDecal(en.pos.x + (Math.random() - 0.5) * 5, en.pos.z + (Math.random() - 0.5) * 5, 1.5 + Math.random() * 2.5);
      bloodFountain(en.pos.x, en.pos.y + en.height * 0.7, en.pos.z, 0, 0, 3);
    }
  }
  gainExp(T.exp);
  STATE.gold += T.gold;
  toast(`${T.name}を倒した！  ＋${fmt(T.exp)} EXP  ＋${fmt(T.gold)} G`, 'kill');
  if (Math.random() < (T.boss ? 1 : 0.08)) { addItem(T.boss ? 'hipotion' : 'potion', T.boss ? 3 : 1); }
  onEnemyKilled(en.type);
  if (T.boss) {
    shakeCamera(0.6);
    for (let k = 0; k < 6; k++) setTimeout(() => burst(en.pos.x, en.pos.y + en.height * Math.random(), en.pos.z, 60, 10, 1.2, 1, k % 2 ? 0xffe08a : 0xffffff), k * 150);
  }
}

/* ---------- 十将・ボスとの遭遇 ---------- */
function onBossEngage(en) {
  if (en.engaged) return;
  en.engaged = true;
  const line = BOSS_LINES[en.type];
  if (line && line.intro) {
    setTimeout(() => {
      if (!en.alive) return;
      openDialog(line.intro.map(t => (Array.isArray(t) ? { who: t[0], t: t[1] } : { who: en.T.name.replace(/^.*」/, ''), role: en.T.name.match(/^[^「]*「[^」]*」/) ? en.T.name.match(/^[^「]*「[^」]*」/)[0] : '', t })), null);
    }, 200);
  }
}

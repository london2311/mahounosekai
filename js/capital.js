'use strict';
/* =========================================================
   王都アルディア（包囲され、焼かれた王都）
   中心は PLACE.aldia。北(-z)に城、南と東に帝国軍の陣。
   ========================================================= */
const CAP = {
  E: 190,                 // 外壁の半分の幅
  siegeMeshes: [],        // 解放後に片づける物（亡骸・血・陣）
  fires: [],              // 燃えている場所
  smoke: [],              // 遠くから見える煙の柱
  scenes: [],             // 捕らわれた人々と、それを嬲る兵
  shell: null,            // 城の屋根・上層（中に入ると隠す）
  keep: null
};
function capW(lx, lz) { const p = PLACE.aldia; return [p.x + lx, p.z + lz]; }

/* ---------- 城の中（6m四方のマス） ---------- */
// T:謁見の間 a:避難部屋 b:破られた部屋 c:救護室 f:破られた部屋（第十将） .:廊下 d/e:玄関広間
const CASTLE_MAP = [
  '##########################',
  '#aaaa#TTTTTTTTTTTTTT#bbbb#',
  '#aaaa#TTTTTTTTTTTTTT#bbbb#',
  '#aaaa#TTTTTTTTTTTTTT#bbbb#',
  '##.###TTTTTTTTTTTTTT###.##',
  '#....#TTTTTTTTTTTTTT#....#',
  '#....#######..#######....#',
  '#........................#',
  '###.####.###..###.####.###',
  '#cccccc#dddd..eeee#ffffff#',
  '#cccccc#dddd..eeee#ffffff#',
  '############..############'
];
const CCELL = 6, CX0 = -78, CZ0 = -180;
function castleCell(c, r) { return capW(CX0 + c * CCELL + CCELL / 2, CZ0 + r * CCELL + CCELL / 2); }
function roomCenter(ch) {
  let sx = 0, sz = 0, n = 0;
  CASTLE_MAP.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) { const [x, z] = castleCell(c, r); sx += x; sz += z; n++; } });
  return { x: sx / n, z: sz / n };
}
function insideKeep(x, z) {
  const [x0, z0] = capW(CX0, CZ0), [x1, z1] = capW(CX0 + 26 * CCELL, CZ0 + 12 * CCELL);
  return x > x0 && x < x1 && z > z0 && z < z1;
}
function inCapital(x, z) { const p = PLACE.aldia; return Math.abs(x - p.x) < CAP.E && Math.abs(z - p.z) < CAP.E; }

/* =========================================================
   組み立て
   ========================================================= */
function buildCapital() {
  const pl = PLACE.aldia, y = pl.fh, E = CAP.E;
  const B = new Builder(), G = new Builder();       // いつもある物
  const Bs = new Builder(), D = new DecalBatch();   // 包囲の爪痕（解放後に片づける）
  const R = mulberry32(1024);
  const W = capW;
  const wallC = 0xb8ae9a, roofB = 0x3b5c9a;

  /* ---- 外壁（東・西・南に門、南東に破られた穴） ---- */
  const gw = 9;
  const wl = (ax, az, bx, bz) => { const [x1, z1] = W(ax, az), [x2, z2] = W(bx, bz); wallLine(B, x1, z1, x2, z2, 14, 4, wallC, y); };
  wl(-E, -E, E, -E);
  wl(E, -E, E, 40 - gw); wl(E, 40 + gw, E, E);
  wl(-E, -E, -E, 40 - gw); wl(-E, 40 + gw, -E, E);
  wl(-E, E, -gw, E); wl(gw, E, 100, E); wl(124, E, E, E);          // 100〜124 が破られた穴
  for (const [cx, cz] of [[-E, -E], [E, -E], [-E, E], [E, E]]) { const [x, z] = W(cx, cz); tower(B, x, z, 6, 20, wallC, roofB, y); }
  for (let k = -3; k <= 3; k++) {
    if (k === 0) continue;
    for (const [cx, cz] of [[k * 50, -E], [-E, k * 50 + 20], [E, k * 50 + 20]]) {
      if (Math.abs(cz - 40) < 20 && Math.abs(cx) === E) continue;
      const [x, z] = W(cx, cz); tower(B, x, z, 3.5, 17, wallC, roofB, y);
    }
  }
  for (const [cx, cz, ry] of [[E, 40, 0], [-E, 40, 0], [0, E, Math.PI / 2]]) {
    const [x, z] = W(cx, cz);
    B.box(x, y + 15.5, z, 4.4, 3, gw * 2 + 6, wallC, ry);
    const [t1x, t1z] = rotXZ(0, gw + 3, ry);
    tower(B, x + t1x, z + t1z, 4.5, 21, wallC, roofB, y);
    tower(B, x - t1x, z - t1z, 4.5, 21, wallC, roofB, y);
  }
  // 破られた城壁：崩れた石と、壊れた門扉
  for (let k = 0; k < 26; k++) {
    const [x, z] = W(100 + R() * 24, E + (R() - 0.5) * 16);
    Bs.dodeca(x, groundAt(x, z) + 0.6, z, 0.8 + R() * 1.6, 0x9a907e, 1, 0.7, 1, R(), R(), R());
  }
  { const [x, z] = W(E + 6, 40); Bs.box(x, y + 0.3, z - 3, 1, 0.5, 8, 0x4a3422, 0.4); Bs.box(x + 3, y + 0.3, z + 4, 1, 0.5, 8, 0x4a3422, -0.9); }
  CAP.breach = { x: W(112, E)[0], z: W(112, E)[1] };

  /* ---- 城（内壁・中庭・天守） ---- */
  const IX = 100, IZ0 = -E, IZ1 = -70;
  const iw = (ax, az, bx, bz) => { const [x1, z1] = W(ax, az), [x2, z2] = W(bx, bz); wallLine(B, x1, z1, x2, z2, 10, 3, 0xcfc6b2, y); };
  iw(-IX, IZ1, -8, IZ1); iw(8, IZ1, IX, IZ1); iw(-IX, IZ0 + 4, -IX, IZ1); iw(IX, IZ0 + 4, IX, IZ1);
  for (const cx of [-IX, IX]) { const [x, z] = W(cx, IZ1); tower(B, x, z, 4, 15, 0xcfc6b2, roofB, y); }
  for (const cx of [-12, 12]) { const [x, z] = W(cx, IZ1); tower(B, x, z, 3.2, 13, 0xcfc6b2, roofB, y); }
  { const [x, z] = W(0, IZ1); B.box(x, y + 11, z, 30, 2, 3.6, 0xcfc6b2); }
  SPOTS.innerGate = { x: W(0, IZ1 + 6)[0], z: W(0, IZ1 + 6)[1] };
  SPOTS.courtyard = { x: W(0, -90)[0], z: W(0, -90)[1] };

  // 天守の内部
  const keep = { x0: W(CX0, CZ0)[0], z0: W(CX0, CZ0)[1] };
  const floorC = W(CX0 + 78, CZ0 + 36);
  B.box(floorC[0], y + 0.03, floorC[1], 156, 0.1, 72, 0x8a8478);
  const Sh = new Builder();          // 屋根と上層（中に入ると隠す）
  const rows = CASTLE_MAP.length, cols = CASTLE_MAP[0].length;
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (CASTLE_MAP[r][c] !== '#') { c++; continue; }
      let e = c;
      while (e + 1 < cols && CASTLE_MAP[r][e + 1] === '#') e++;
      const [x1, z] = castleCell(c, r), [x2] = castleCell(e, r);
      const cx = (x1 + x2) / 2, w = (e - c + 1) * CCELL;
      B.box(cx, y + 2.75, z, w, 5.5, CCELL, 0xd8d0be);
      addBoxCollider(cx, z, w / 2, CCELL / 2);
      const border = r === 0 || r === rows - 1 || c === 0 || e === cols - 1;
      if (border) Sh.box(cx, y + 5.5 + 4.5, z, w, 9, CCELL, 0xe2dccd);
      c = e + 1;
    }
  }
  // 屋根
  Sh.box(floorC[0], y + 14.6, floorC[1], 158, 1.2, 74, 0xc8c0ae);
  Sh.prism(floorC[0], y + 15.2, floorC[1] - 18, 160, 10, 38, roofB, Math.PI / 2);
  Sh.prism(floorC[0], y + 15.2, floorC[1] + 18, 160, 8, 38, roofB, Math.PI / 2);
  for (const [lx, lz] of [[CX0, CZ0], [-CX0, CZ0], [CX0, CZ0 + 72], [-CX0, CZ0 + 72]]) {
    const [x, z] = W(lx, lz); tower(B, x, z, 6, 26, 0xe2dccd, roofB, y);
  }
  { const [x, z] = W(0, CZ0 + 6); tower(B, x, z, 8, 40, 0xe2dccd, roofB, y); }
  const shell = Sh.mesh();
  scene.add(shell);
  CAP.shell = shell;

  // 謁見の間：柱・玉座・赤い絨毯・魔法陣
  const T = roomCenter('T');
  for (let k = -3; k <= 3; k++) for (const sz of [-9, 9]) { if (k === 0) continue; pillar(B, T.x + k * 11, T.z + sz, 5, false, 0xf0ead8, y); }
  B.box(T.x, y + 0.08, T.z + 6, 4, 0.06, 26, 0x8a1a22);
  const thr = castleCell(12.5, 1);
  B.box(thr[0], y + 0.5, thr[1] - 1, 7, 1, 4, 0xd9c9a0);
  B.box(thr[0], y + 2.2, thr[1] - 2.4, 2, 3, 0.5, 0x9a1f2a);
  B.box(thr[0], y + 1.3, thr[1] - 1.6, 2, 0.35, 1.4, 0xc9a13a);
  addBoxCollider(thr[0], thr[1] - 1.4, 3.5, 2);
  SPOTS.circle = { x: T.x, z: T.z + 1 };
  SPOTS.throne = { x: thr[0], z: thr[1] + 2, y: y };
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 64), new THREE.MeshBasicMaterial({ color: 0xff5a8a, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  circle.rotation.x = -Math.PI / 2; circle.position.set(SPOTS.circle.x, y + 0.12, SPOTS.circle.z);
  const circle2 = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 6), circle.material);
  circle2.rotation.x = -Math.PI / 2; circle2.position.copy(circle.position);
  scene.add(circle, circle2);
  CAP.circle = { circle, circle2 };
  ANIM.push((dt, t) => { circle.rotation.z += dt * 0.3; circle2.rotation.z -= dt * 0.6; circle.material.opacity = CAP.circleGlow !== undefined ? CAP.circleGlow : 0.25 + 0.1 * Math.sin(t * 2); });
  for (const sx of [-1, 1]) { const [x, z] = castleCell(sx < 0 ? 7 : 18, 1); flagPole(B, x, z, 0x3b5c9a, 5, y); }
  // 部屋の中
  const rA = roomCenter('a'), rB = roomCenter('b'), rC = roomCenter('c'), rF = roomCenter('f'), rH = roomCenter('d');
  SPOTS.roomA = rA; SPOTS.roomB = rB; SPOTS.roomC = rC; SPOTS.roomF = rF; SPOTS.hall = { x: (rH.x + roomCenter('e').x) / 2, z: rH.z };
  // 避難部屋：扉の前にバリケード
  const [bx, bz] = castleCell(2, 4);
  Bs.box(bx, y + 0.9, bz, 5.5, 1.8, 0.6, 0x5a4028);
  CAP.barricade = captureColliders(() => { for (let k = 0; k < 4; k++) crate(Bs, bx + (k - 1.5) * 1.2, bz + (k % 2) * 0.6, 1.1); addBoxCollider(bx, bz, 3, 1.2); });
  SPOTS.barricade = { x: bx, z: bz + 3 };
  // 救護室の寝台
  for (let k = 0; k < 6; k++) { const [x, z] = castleCell(1 + k, 9.5); B.box(x, y + 0.35, z - 1, 1.2, 0.5, 2.2, 0xe8e0cc); B.box(x, y + 0.2, z - 1, 1.3, 0.4, 2.3, 0x6a4a2a); }
  // 燭台
  for (const [c, r] of [[6, 1], [19, 1], [6, 5], [19, 5], [1, 7], [24, 7], [12, 7], [13, 7]]) {
    const [x, z] = castleCell(c, r); G.box(x, y + 3.2, z, 0.3, 0.4, 0.3, 0xffb060); B.cyl(x, y + 1.5, z, 0.08, 0.12, 3, 0x3a2a1a, 6);
  }

  /* ---- 中庭 ---- */
  for (let k = 0; k < 6; k++) { const [x, z] = W(-60 + k * 24, -100); crate(B, x, z + (k % 2) * 3, 1.2); }
  { const [x, z] = W(-40, -92); well(B, x, z); }
  { const [x, z] = W(40, -95); statue(B, x, z); }

  /* ---- 城下町 ---- */
  const plaza = { x: W(0, 40)[0], z: W(0, 40)[1] };
  SPOTS.plaza = plaza;
  // 広場：壊れた噴水と倒れた像
  { B.cyl(plaza.x, y + 0.35, plaza.z, 7, 7.3, 0.7, 0x9a9282, 20); Bs.cyl(plaza.x, y + 0.72, plaza.z, 6.4, 6.4, 0.05, 0x4a0a0a, 20); addCollider(plaza.x, plaza.z, 7.2);
    Bs.cyl(plaza.x + 3, y + 1.2, plaza.z + 1, 0.5, 0.6, 3, 0x9a9282, 8, 0.7, 1.4, 0.2); }
  // 名前つきの建物（解放後にお店になる）
  const H = (id, lx, lz, ry, o) => { const [x, z] = W(lx, lz); return house(B, Object.assign({ id, x, z, ry, wall: 0xefe6d2, roof: 0xb4553a, y }, o)); };
  H('aldia_weapon', 30, 16, 0, { w: 9, d: 8, h: 5, roof: 0x6a4a3a, sign: '武器屋 ダリオ', awning: 0x8a3a2a });
  H('aldia_item', 50, 16, 0, { w: 9, d: 8, h: 5, roof: 0x3a7a4a, sign: '道具屋 ミネルバ', awning: 0x3a8a5a });
  H('aldia_inn', -32, 14, 0, { w: 12, d: 10, h: 8, sign: '宿屋 金の獅子亭', chimney: true });
  H('aldia_guild', -54, 14, 0, { w: 10, d: 9, h: 7, roof: 0x5a4a8a, sign: '冒険者ギルド' });
  H('aldia_bar', 34, 66, Math.PI, { w: 11, d: 9, h: 6, roof: 0x8a4a2a, sign: '酒場 踊る子鹿亭', chimney: true });
  H('aldia_lib', 58, 68, Math.PI, { w: 11, d: 10, h: 7, wall: 0xd9d0bb, roof: 0x3a4a5a, sign: '王立図書館' });
  // 大聖堂（半ば焼けて、なお立つ）
  { const [x, z] = W(-40, 80); house(B, { id: 'aldia_church', x, z, ry: Math.PI, w: 18, d: 26, h: 13, wall: 0xd8d2c4, roof: 0x4a5a7a, y, sign: '大聖堂' });
    tower(B, x, z + 16, 4.5, 30, 0xd8d2c4, 0x4a5a7a, y); CAP.fires.push({ x: x + 5, y: y + 12, z: z - 6, s: 3 }, { x: x - 6, y: y + 10, z: z + 4, s: 2.5 }); }
  // 家々（多くは焼け落ちている）
  let hi = 0;
  const burnChance = (lx, lz) => clamp(0.45 + (lz + 60) / 400 + Math.max(0, lx) / 600, 0.35, 0.92);
  for (let lz = -52; lz <= 176; lz += 19) for (let lx = -176; lx <= 176; lx += 19) {
    const jx = lx + (R() - 0.5) * 5, jz = lz + (R() - 0.5) * 5;
    if (Math.abs(jx) < 15 || Math.abs(jz - 40) < 15) continue;
    if (Math.hypot(jx, jz - 40) < 40) continue;
    if (jz < -60 && Math.abs(jx) < 112) continue;
    if (Math.abs(jx) > E - 12 || jz > E - 12 || jz < -E + 12) continue;
    if (jx > -70 && jx < 70 && jz > 2 && jz < 95) continue;       // 名前つきの建物のあたり
    const [x, z] = W(jx, jz);
    if (!roadClear(x, z, 6)) continue;
    const ry = Math.abs(jx) < Math.abs(jz - 40) ? (jz > 40 ? Math.PI : 0) : (jx > 0 ? -Math.PI / 2 : Math.PI / 2);
    const burned = R() < burnChance(jx, jz);
    const info = house(B, { id: 'aldia_h' + (hi++), x, z, ry, y, w: 8 + R() * 4, d: 7 + R() * 4, h: 5 + R() * 5,
      wall: [0xefe6d2, 0xe0d4bc, 0xd8ccb4][hi % 3], roof: [0xb4553a, 0x9a4a3a, 0xc26a3a, 0x6a6a8a][hi % 4], burned, chimney: hi % 3 === 0 });
    if (burned && info.firePts && R() < 0.55) CAP.fires.push(...info.firePts);
  }
  // 街灯（倒れているものも）
  for (let k = -4; k <= 4; k++) if (k) {
    for (const s of [-1, 1]) {
      const [x, z] = W(k * 38, 40 + s * 11);
      if (R() < 0.35) Bs.cyl(x, y + 0.2, z, 0.1, 0.12, 4, 0x2d2a26, 6, R() * 3, Math.PI / 2);
      else lamp(B, G, x, z, 3.6);
    }
  }

  /* ---- 包囲の爪痕：亡骸と血 ---- */
  const CLOTH = [0x7a4a3a, 0x3f6a8a, 0x5d7a3a, 0x8a6a3a, 0x6a4a7a, 0x9a3b3b, 0x4a4a6a, 0xa8743a];
  const civ = () => ({ cloth: CLOTH[Math.floor(R() * CLOTH.length)], skin: SKINS[Math.floor(R() * 4)], hair: HAIRS[Math.floor(R() * HAIRS.length)],
    lost: R() < 0.3 ? ['armL', 'armR', 'legL', 'legR'][Math.floor(R() * 4)] : '', armAng: R() * 2 - 1 });
  const soldierBody = () => ({ cloth: 0x2a4a8a, armor: 0xa9b0b8, pants: 0x4a4a5a, hair: 0x2a1f1a, weapon: R() < 0.6,
    lost: R() < 0.35 ? ['armL', 'armR', 'legL'][Math.floor(R() * 3)] : '', arrows: R() < 0.3 ? 2 + Math.floor(R() * 3) : 0 });
  const enemyBody = () => ({ cloth: 0x7a1414, armor: 0x3a3a44, pants: 0x2a2622, hair: 0x1a1a1a });
  const bodyAt = (x, z, kind) => {
    if (!roadClear(x, z, -3) && R() < 0.2) return;
    const o = kind === 's' ? soldierBody() : kind === 'e' ? enemyBody() : civ();
    corpse(Bs, x, z, R() * 6.28, o);
    D.add(x + (R() - 0.5), z + (R() - 0.5), 1.2 + R() * 1.4);
    if (R() < 0.4) { for (let k = 1; k < 4; k++) D.add(x + k * (R() - 0.3) * 1.2, z + k * (R() - 0.3) * 1.2, 0.4 + R() * 0.4); }
  };
  // 通りに倒れた人々
  for (let k = 0; k < 130; k++) {
    const onEW = R() < 0.5;
    const lx = onEW ? (R() - 0.5) * 360 : (R() - 0.5) * 18, lz = onEW ? 40 + (R() - 0.5) * 18 : -60 + R() * 250;
    const [x, z] = W(lx, lz);
    bodyAt(x, z, R() < 0.25 ? 's' : 'c');
  }
  for (let k = 0; k < 60; k++) { const [x, z] = W((R() - 0.5) * 340, -40 + R() * 220); bodyAt(x, z, 'c'); }
  // 中庭と城の中（守った兵たち）
  for (let k = 0; k < 34; k++) { const [x, z] = W((R() - 0.5) * 180, -104 + R() * 30); bodyAt(x, z, R() < 0.7 ? 's' : 'e'); }
  const castleBodies = [['b', 5], ['f', 5], ['.', 9], ['d', 4], ['e', 4], ['T', 5]];
  for (const [ch, n] of castleBodies) {
    const cells = [];
    CASTLE_MAP.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch) cells.push([c, r]); });
    for (let k = 0; k < n; k++) {
      const [c, r] = cells[Math.floor(R() * cells.length)];
      const [x, z] = castleCell(c + (R() - 0.5) * 0.6, r + (R() - 0.5) * 0.6);
      bodyAt(x, z, ch === 'T' || ch === 'd' ? 's' : 'c');
    }
  }
  // 血の筋（引きずられた跡）
  for (let k = 0; k < 20; k++) {
    let [x, z] = W((R() - 0.5) * 300, -60 + R() * 220);
    const a = R() * 6.28;
    for (let s = 0; s < 8; s++) { D.add(x, z, 0.5 + R() * 0.3); x += Math.cos(a) * 0.9; z += Math.sin(a) * 0.9; }
  }
  // 城外の戦場
  for (let k = 0; k < 170; k++) {
    const a = R() * 6.28, r = E + 20 + R() * 160;
    const lx = Math.cos(a) * r, lz = Math.abs(Math.sin(a)) * r * (R() < 0.8 ? 1 : -0.3);
    const [x, z] = W(lx, lz);
    if (Math.abs(lx) > 330) continue;
    bodyAt(x, z, R() < 0.65 ? 's' : 'e');
  }
  // 見せしめの柵（捕虜を縛った杭と、串刺しにされた軍旗）
  for (let k = 0; k < 14; k++) {
    const [x, z] = W(-150 + k * 22, E + 30);
    const gy = groundAt(x, z);
    Bs.cyl(x, gy + 2, z, 0.12, 0.16, 4, 0x3a2a1a, 5);
    Bs.box(x + 0.5, gy + 3.2, z, 1.0, 0.7, 0.05, 0x2a4a8a, 0, 0, 0.3);
    D.add(x, z, 1.4);
  }

  finishPlace(B, G);
  const siege = Bs.mesh();
  scene.add(siege);
  const decals = D.mesh();
  scene.add(decals);
  CAP.siegeMeshes.push(siege, decals);

  /* ---- 遠くから見える煙の柱 ---- */
  for (let k = 0; k < 12; k++) {
    const [x, z] = W((R() - 0.5) * 320, -40 + R() * 220);
    const col = { x, z, y: y + 8, sprites: [], phase: R() * 10 };
    for (let s = 0; s < 7; s++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0x2a2420, transparent: true, opacity: 0.55, depthWrite: false }));
      sp.scale.setScalar(14 + s * 7);
      scene.add(sp);
      col.sprites.push(sp);
    }
    CAP.smoke.push(col);
  }

  /* ---- 転移石 ---- */
  { const [x, z] = W(14, 52); warpStone(G, B, 'aldia', '王都アルディア', x, z); }
  finishPlace(new Builder(), G);

  buildSiegeCamp();
}

/* ---------- 城外の帝国軍の陣（壊せる） ---------- */
function buildSiegeCamp() {
  const E = CAP.E, R = mulberry32(3000);
  const W = capW;
  const tentAt = (lx, lz, big) => {
    const [x, z] = W(lx, lz);
    const r = big ? 6 : 3 + R() * 1.2;
    makeStructure({ x, z, r: r + 1, hp: big ? 60000 : 2500, name: big ? '帝国軍の本陣' : '帝国軍の天幕', zone: 'siege' }, (B) => {
      tent(B, x, z, R() * 6.28, big ? 0x5a1414 : [0x6a2a1a, 0x4a3a2a, 0x5a1a1a][Math.floor(R() * 3)], r);
      if (big) { flagPole(B, x + 7, z, 0x8a1a1a, 10); flagPole(B, x - 7, z, 0x8a1a1a, 10); }
    });
  };
  // 南の陣
  for (let k = 0; k < 26; k++) tentAt(-230 + (k % 13) * 36 + (R() - 0.5) * 8, E + 120 + Math.floor(k / 13) * 40 + (R() - 0.5) * 10);
  tentAt(0, E + 200, true);
  SPOTS.siegeHQ = { x: W(0, E + 200)[0], z: W(0, E + 200)[1] };
  // 東の陣
  for (let k = 0; k < 10; k++) tentAt(E + 90 + (k % 5) * 28, -60 + Math.floor(k / 5) * 60 + (R() - 0.5) * 10);
  // 攻城塔・投石器・破城槌
  for (let k = 0; k < 4; k++) {
    const [x, z] = W(-150 + k * 80 + (k > 1 ? 40 : 0), E + 18);
    makeStructure({ x, z, r: 4, hp: 8000, name: '攻城塔', zone: 'siege' }, (B) => {
      const gy = groundAt(x, z);
      B.box(x, gy + 7, z, 6, 14, 6, 0x5a4028);
      for (let h = 2; h < 14; h += 3) B.box(x, gy + h, z + 3.05, 6.2, 0.3, 0.2, 0x3a2a1a);
      B.box(x, gy + 14.5, z, 6.6, 1, 6.6, 0x4a3422);
      for (const sx of [-2.5, 2.5]) for (const sz of [-2.5, 2.5]) B.cyl(x + sx, gy + 0.7, z + sz, 0.7, 0.7, 0.4, 0x2a1a0a, 10, 0, 0, Math.PI / 2);
      addBoxCollider(x, z, 3.2, 3.2);
    });
  }
  for (let k = 0; k < 6; k++) {
    const [x, z] = W(-200 + k * 80, E + 70);
    makeStructure({ x, z, r: 3, hp: 4000, name: '投石器', zone: 'siege' }, (B) => {
      const gy = groundAt(x, z);
      B.box(x, gy + 0.6, z, 3, 1.2, 5, 0x5a4028);
      B.box(x, gy + 3, z - 1, 0.4, 6, 0.4, 0x4a3422, 0, 0.6);
      B.box(x, gy + 1.5, z + 1.8, 1.4, 1.4, 1.4, 0x6a6a6a);
      addBoxCollider(x, z, 1.6, 2.6);
    });
  }
  {
    const [x, z] = W(0, E + 9);
    makeStructure({ x, z, r: 4, hp: 6000, name: '破城槌', zone: 'siege' }, (B) => {
      const gy = groundAt(x, z);
      B.box(x, gy + 2.2, z, 4, 0.4, 9, 0x4a3422);
      B.prism(x, gy + 2.4, z, 4.4, 2, 9.4, 0x5a4028, 0);
      B.cyl(x, gy + 1.4, z - 1, 0.6, 0.6, 9, 0x3a2a1a, 8, 0, Math.PI / 2);
      addBoxCollider(x, z, 2.2, 4.6);
    });
  }
  // 棘の柵
  for (let k = 0; k < 18; k++) {
    const [x, z] = W(-240 + k * 28, E + 95);
    makeStructure({ x, z, r: 3, hp: 1500, name: '柵', zone: 'siege' }, (B) => {
      const gy = groundAt(x, z);
      for (let s = -2; s <= 2; s++) B.box(x + s * 1.2, gy + 1, z, 0.2, 2.4, 0.2, 0x4a3422, 0, 0.5);
      B.box(x, gy + 1, z, 6, 0.2, 0.2, 0x4a3422);
    });
  }
}

/* ---------- 城と町の敵を配置 ---------- */
function spawnCapitalForces() {
  const E = CAP.E, W = capW;
  const R = mulberry32(7331);
  // 城の中（ひとりひとり動く兵）
  const castleSpots = [
    ...['.', 'd', 'e'].flatMap(ch => { const out = []; CASTLE_MAP.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === ch && (r + c) % 3 === 0) out.push([c, r]); }); return out; })
  ];
  for (const [c, r] of castleSpots) {
    const [x, z] = castleCell(c, r);
    makeEnemy(R() < 0.25 ? 'imp_knight' : 'imp_soldier', x, z, { zone: 'castle', noRespawn: true });
  }
  // 避難部屋の扉を破ろうとする兵
  for (let k = 0; k < 3; k++) { const [x, z] = castleCell(1.5 + k, 5.5); makeEnemy('imp_soldier', x, z, { zone: 'castle', noRespawn: true }); }
  // 中庭：味方の最後の守り（側近と精鋭）と、押し寄せる帝国兵
  addGroup({ zone: 'courtyard_ally', ally: true, x: W(0, -100)[0], z: W(0, -100)[1], cols: 14, rows: 3, gap: 2.4, face: Math.PI });
  addGroup({ zone: 'courtyard', x: W(0, -82)[0], z: W(0, -82)[1], cols: 24, rows: 5, gap: 1.9, face: 0, scatter: 1.2, kinds: { soldier: 0.8, heavy: 0.2 } });
  addGroup({ zone: 'courtyard', x: W(0, -58)[0], z: W(0, -58)[1], cols: 8, rows: 10, gap: 2.0, face: 0, scatter: 1.5, kinds: { soldier: 0.7, heavy: 0.15, archer: 0.15 } });
  // 城下町：うろつく兵の群れ
  const cityCheck = (x, z) => roadClear(x, z, 2) || true;
  for (let k = 0; k < 16; k++) {
    const lx = (k % 4 - 1.5) * 80 + (R() - 0.5) * 30, lz = -20 + Math.floor(k / 4) * 55 + (R() - 0.5) * 20;
    const [x, z] = W(lx, lz);
    addGroup({ zone: 'city', x, z, cols: 5, rows: 5, gap: 2.4, scatter: 3, roam: true, r: 26, face: R() * 6, kinds: { soldier: 0.75, heavy: 0.1, archer: 0.15 }, check: cityCheck });
  }
  // 城外：待ち構える三千の軍勢
  const blocks = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) blocks.push([(c - 3) * 62, E + 150 + r * 42]);
  for (const [lx, lz] of blocks) {
    const [x, z] = W(lx, lz);
    addGroup({ zone: 'siege', x, z, cols: 12, rows: 10, gap: 2.1, face: Math.PI, kinds: { soldier: 0.62, heavy: 0.18, archer: 0.2 } });
  }
  // 東門の外
  for (let k = 0; k < 3; k++) { const [x, z] = W(E + 60 + k * 30, 20 + k * 25); addGroup({ zone: 'siege', x, z, cols: 10, rows: 8, gap: 2.1, face: -Math.PI / 2, kinds: { soldier: 0.7, archer: 0.3 } }); }
}

/* ---------- 捕らわれた人々（助け出す） ---------- */
const CAPTIVES = [
  { id: 'cap_roy', spot: 'roomB', name: 'ロイ', role: '王国兵（門番）', look: ['soldier', { hat: 'none', prop: 'none' }],
    cry: ['……ころ、せ……', 'ぐ……あ……', '……姫様、は……無事、か……'],
    taunts: ['おい、まだ息があるぞ。次は左手だ', '指はあと何本残ってる？ 数えてみろよ', '門番のくせに門も守れねえのか、ははっ'],
    thanks: ['……団、長……？ 幻じゃ……ない……', '俺は……門を、守れなかった……。みんな、目の前で……', '……頼みます。あいつらを……一人残らず……'] },
  { id: 'cap_karl', spot: 'roomF', name: 'カール', role: '新米兵士', look: ['soldier', { hat: 'none', prop: 'none' }], general: true,
    cry: ['やめ……やめて……', '母さん……', '……もう、殺して……'],
    taunts: ['いい声で鳴くねェ。もう一本いこうか', '新兵ってのは長持ちしないからつまらねェんだよ'],
    thanks: ['……あ……あ……', '……ほんとに……師団長、なんですか……', '……隊長に……褒められたかったんです……。僕、ちゃんと……戦えましたか……'] },
  { id: 'cap_plaza', at: [8, 50], name: 'エドガー', role: '王国騎士', look: ['knight', { hat: 'none', prop: 'none', cape: 0x2a4a8a }],
    cry: ['……は、ははっ……殺せよ……', '……姫様に、顔向けが……'],
    taunts: ['王国の騎士様も、泣き喚けば豚と変わらねえな', '鎧を剥いだら、ただの肉だ', '見ろよ、まだ剣を探して指が動いてやがる'],
    thanks: ['……星墜とし……レグルス殿……？ 五年前に、葬儀で……', '……この広場で、何人殺されたと思いますか……。数えるのを……やめました', '……剣を。まだ、戦える……'] },
  { id: 'cap_east', at: [120, 30], name: 'マリアン', role: '仕立て屋の主人', look: ['woman', { dress: 0x6a5a4a }],
    cry: ['……子どもだけは……', '……ひっ……いや……'],
    taunts: ['泣き声も飽きてきたな。次はどこを切る？', 'ほら、叫べよ。誰も来やしねえ'],
    thanks: ['……助かった、の……？', '……娘は……城に逃がしました。……あの子、無事かしら……', '……ありがとうございます……ありがとう……ございます……'] },
  { id: 'cap_south', at: [6, 128], name: 'ゴードン', role: 'パン屋の主人', look: ['man', { bulk: 1.2, apron: 0xe8e0cc }],
    cry: ['……ぐうっ……', '……俺の店が……焼け……'],
    taunts: ['おっさん、まだ生きてんのか。しぶといな', '次は膝の皿を割ってやろうか'],
    thanks: ['……夢か……？ 生きてる……', '……街の連中、ほとんど……。朝までみんな、笑ってたのに……', '……パン、焼きます。生き残った奴らのために……'] },
  { id: 'cap_west', at: [-112, 48], name: 'ハインツ', role: '衛兵', look: ['soldier', { hat: 'none', prop: 'none' }],
    cry: ['……目が……見えな……', '……だれか……'],
    taunts: ['目ェ潰されてもまだ剣を探してやがる', '次は耳だ。音も聞こえなくしてやるよ'],
    thanks: ['……その声……団長……？ ……ああ、見えなくても分かる……', '……目は、もう……。でも、声は覚えてます……', '……俺の分まで……奴らを……'] },
  { id: 'cap_church', at: [-28, 64], name: 'ブラザー・ミカ', role: '聖堂の修道士', look: ['priest', { hat: 'none', prop: 'none' }],
    cry: ['……神よ……', '……どうか、この者たちに……赦しを……'],
    taunts: ['神様は来ねえってよ、坊さん', '祈りの途中で何本折れるか賭けようぜ'],
    thanks: ['……祈りは……届いたのですね……', '……聖堂に逃げ込んだ人たちを……守れませんでした……', '……弔いを。この街の皆を、弔わせてください……'] }
];
function spawnCaptives() {
  for (const c of CAPTIVES) {
    let x, z;
    if (c.spot) { x = SPOTS[c.spot].x + (c.spot === 'roomF' ? 4 : 0); z = SPOTS[c.spot].z; }
    else { [x, z] = capW(c.at[0], c.at[1]); }
    const [kind, over] = c.look;
    const m = buildHumanoid(lookFor(kind, c.id, Object.assign({ blood: true }, over)));
    const gy = groundAt(x, z);
    // ひざまずかされ、縛られている
    m.legL.rotation.x = m.legR.rotation.x = 1.45;
    m.root.position.set(x, gy - 0.62, z);
    m.model.rotation.x = 0.35;
    scene.add(m.root);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, flatShading: true }));
    post.position.set(x, gy + 1.5, z - 0.5);
    scene.add(post);
    addCollider(x, z - 0.5, 0.3);
    const s = { c, x, z, gy, m, post, freed: false, rescued: false, captors: [], bubbleT: 0, hitT: 1 + Math.random() * 2 };
    // 嬲る兵たち
    const n = c.general ? 0 : 3;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + 0.4;
      const e = makeEnemy(k === 0 ? 'imp_knight' : 'imp_soldier', x + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2, { zone: c.spot ? 'castle' : 'city', noRespawn: true });
      e.scene = s; e.facing = Math.atan2(x - e.pos.x, z - e.pos.z);
      s.captors.push(e);
    }
    CAP.scenes.push(s);
    INTERACT.push({ kind: 'captive', x, z, r: 3, label: `${c.name}を助け起こす`, ref: s, hidden: true });
  }
}
function captiveFree(s) { return s.captors.every(e => !e.alive) && (!s.c.general || !ENEMIES.some(e => e.type === 'g10' && e.alive)); }
function rescueCaptive(s) {
  if (s.rescued) return;
  const c = s.c;
  const lines = c.thanks.map(t => ({ who: c.name, role: c.role, t }));
  openDialog(lines, () => {
    s.rescued = true;
    STATE.rescued = STATE.rescued || [];
    if (!STATE.rescued.includes(c.id)) STATE.rescued.push(c.id);
    fadeCaptive(s);
    toast(`${c.name}を城へ逃がした（救出 ${STATE.rescued.length}人）`, 'quest');
    onCaptiveRescued();
  });
}
function fadeCaptive(s) {
  const m = s.m.root;
  addFx(new THREE.Object3D(), 1, (t) => { m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 1 - t; } }); if (t > 0.95) m.visible = false; });
}

/* ---------- 毎フレーム ---------- */
const _atm = { fog: new THREE.Color(), hz: new THREE.Color(), top: new THREE.Color() };
const SIEGE_FOG = new THREE.Color(0x5a3a2c), SIEGE_TOP = new THREE.Color(0x4a3a3a), SIEGE_HZ = new THREE.Color(0x9a5a3a);
const BASE_TOP = SKY.top.clone(), BASE_HZ = SKY.horizon.clone();
function capitalSiege() { return !STORY_FLAGS.liberated; }
function updateCapital(dt, t) {
  const px = player.pos.x, pz = player.pos.z;
  const siege = capitalSiege();
  // 城の屋根：中にいる時は隠す
  const inside = !GAME.inDungeon && insideKeep(px, pz);
  if (CAP.shell) CAP.shell.visible = !inside;
  CAP.inside = inside;
  // 空と霧（包囲中の王都のまわりは赤黒く煙る）
  const dCap = Math.hypot(px - PLACE.aldia.x, pz - PLACE.aldia.z);
  const w = siege && !GAME.inDungeon ? 1 - smooth(260, 750, dCap) : 0;
  CAP.atm = lerp(CAP.atm || 0, w, Math.min(1, dt * 1.5));
  if (!GAME.inDungeon) {
    SKY.top.copy(BASE_TOP).lerp(SIEGE_TOP, CAP.atm);
    SKY.horizon.copy(BASE_HZ).lerp(SIEGE_HZ, CAP.atm * 0.85);
    scene.fog.color.copy(BASE_HZ).lerp(SIEGE_FOG, CAP.atm * 0.9);
    scene.background.copy(scene.fog.color);
    scene.fog.far = lerp(CONFIG.fogFar, 520, CAP.atm);
    sun.color.setHex(0xfff0d6).lerp(_atm.fog.setHex(0xff9a6a), CAP.atm * 0.6);
  }
  // 煙の柱と炎
  const showSmoke = siege && !GAME.inDungeon;
  for (const col of CAP.smoke) {
    col.sprites.forEach((sp, i) => {
      sp.visible = showSmoke;
      if (!showSmoke) return;
      const k = ((t * 0.05 + i / col.sprites.length + col.phase) % 1);
      sp.position.set(col.x + Math.sin(k * 3 + col.phase) * 6 + k * 30, col.y + k * 140, col.z + k * 12);
      sp.scale.setScalar(12 + k * 70);
      sp.material.opacity = 0.6 * Math.min(1, k * 5) * (1 - k);
    });
  }
  if (siege && !GAME.inDungeon && dCap < 400) {
    let n = 0;
    for (const f of CAP.fires) {
      if (Math.abs(f.x - px) > 90 || Math.abs(f.z - pz) > 90) continue;
      if (n++ > 26) break;
      emitFire(f.x, f.y, f.z, f.s, dt);
    }
    // 舞い散る火の粉と灰
    if (inCapital(px, pz) && Math.random() < dt * 20) {
      PG.spawn(px + (Math.random() - 0.5) * 40, player.pos.y + 6 + Math.random() * 8, pz + (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 1.5, -0.4, (Math.random() - 0.5) * 1.5, 4, 0.05, 0xffa050, 0xff3010, 1, 0.1, 0.2);
      PS.spawn(px + (Math.random() - 0.5) * 40, player.pos.y + 6 + Math.random() * 8, pz + (Math.random() - 0.5) * 40,
        (Math.random() - 0.5), -0.5, (Math.random() - 0.5), 5, 0.08, 0x8a8480, 0x5a5652, 0.8, 0.1, 0.3);
    }
  }
  updateTempFires(dt);
  // 捕らわれた人々
  for (const s of CAP.scenes) {
    if (s.rescued) continue;
    const d = Math.hypot(s.x - px, s.z - pz);
    const free = captiveFree(s);
    if (free && !s.freed) { s.freed = true; const it = INTERACT.find(o => o.ref === s); if (it) it.hidden = false; }
    if (d > 60 || GAME.inDungeon) { hideBubble(s); continue; }
    s.m.model.rotation.z = Math.sin(t * 7) * 0.02 * (free ? 0.2 : 1);
    if (!free) {
      s.hitT -= dt;
      const tormentor = s.captors.find(e => e.alive && !e.aggro) || (s.c.general ? ENEMIES.find(e => e.type === 'g10' && e.alive && !e.aggro) : null);
      if (tormentor && s.hitT <= 0) {
        s.hitT = 1.6 + Math.random() * 2.2;
        tormentor.facing = Math.atan2(s.x - tormentor.pos.x, s.z - tormentor.pos.z);
        tormentor.tormentT = 0.35;
        bloodSpray(s.x, s.gy + 1.1, s.z, 6, 2.5);
        s.m.model.rotation.x = 0.7;
        if (d < 30) SOUND.hit();
        if (Math.random() < 0.3) addBloodDecal(s.x + (Math.random() - 0.5) * 1.5, s.z + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.6);
      }
      s.m.model.rotation.x = lerp(s.m.model.rotation.x, 0.35, Math.min(1, dt * 3));
      s.bubbleT -= dt;
      if (s.bubbleT <= 0 && d < 40) {
        s.bubbleT = 2.8 + Math.random() * 2;
        const cryNow = Math.random() < 0.4 || !tormentor;
        if (cryNow) showBubble(s, s.m.root.position, s.c.cry[Math.floor(Math.random() * s.c.cry.length)], 'cry', 1.6);
        else if (tormentor) showBubble(s, tormentor.pos, s.c.taunts[Math.floor(Math.random() * s.c.taunts.length)], 'taunt', tormentor.height + 0.4);
      }
    } else if (s.bubbleT !== -99) { s.bubbleT = -99; hideBubble(s); showBubble(s, s.m.root.position, '……っ', 'cry', 1.6); }
    updateBubble(s);
  }
}
function setCapitalLiberated(on) {
  STORY_FLAGS.liberated = on;
  for (const m of CAP.siegeMeshes) m.visible = !on;
  if (on) {
    removeColliders(CAP.barricade);
    for (const s of CAP.scenes) { s.m.root.visible = false; s.post.visible = false; hideBubble(s); s.rescued = true; }
    for (const col of CAP.smoke) col.sprites.forEach(sp => { sp.visible = false; });
    ARMY.mCorpse.count = 0; ARMY.corpseN = 0; ARMY.mDecal.count = 0; ARMY.decalN = 0;
  }
}

/* ---------- 吹き出し ---------- */
function showBubble(s, pos, text, kind, h) {
  if (!s.bubble) { s.bubble = document.createElement('div'); $('labels').appendChild(s.bubble); }
  s.bubble.className = 'bubble ' + kind;
  s.bubble.textContent = text;
  s.bubble.style.display = '';
  s.bubblePos = pos; s.bubbleH = h; s.bubbleLife = 2.6;
}
function hideBubble(s) { if (s.bubble) s.bubble.style.display = 'none'; s.bubbleLife = 0; }
function updateBubble(s) {
  if (!s.bubble || s.bubbleLife <= 0) return;
  s.bubbleLife -= 1 / 60;
  if (s.bubbleLife <= 0) { hideBubble(s); return; }
  const p = project(s.bubblePos.x, s.bubblePos.y + s.bubbleH + 0.6, s.bubblePos.z);
  if (!p) { s.bubble.style.display = 'none'; return; }
  s.bubble.style.display = '';
  s.bubble.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%)`;
}

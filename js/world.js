'use strict';
/* =========================================================
   世界の設計図（地名・山・川・道）
   x が東、z が南（北は -z）
   ========================================================= */
const PLACES = [
  { id: 'start',   name: 'はじまりの丘',        x: 0,    z: 0,     r: 26,  ground: 'grass', minH: 3 },
  { id: 'kazami',  name: '風見の村',            x: 70,   z: 250,   r: 78,  ground: 'dirt' },
  { id: 'aldia',   name: '王都アルディア',      x: -450, z: -290,  r: 272, ground: 'cobble', inner: 1.0, blend: 70 },
  { id: 'academy', name: '魔法学院',            x: -230, z: -600,  r: 62,  ground: 'cobble' },
  { id: 'belka',   name: '交易都市ベルカ',      x: 520,  z: -160,  r: 110, ground: 'cobble' },
  { id: 'oasis',   name: 'オアシスの集落サラ',  x: 760,  z: -640,  r: 64,  ground: 'sand' },
  { id: 'pass',    name: '霧の峠',              x: 90,   z: -660,  r: 38,  ground: 'dirt' },
  { id: 'gate',    name: '帝国の関所',          x: 130,  z: -840,  r: 34,  ground: 'dirt' },
  { id: 'empire',  name: '帝都ガルヴァス',      x: 200,  z: -1010, r: 140, ground: 'dark' },
  { id: 'ruins',   name: '古代遺跡',            x: -900, z: -250,  r: 96,  ground: 'stone' },
  { id: 'leafe',   name: '森の集落リーフェ',    x: -490, z: 210,   r: 50,  ground: 'moss' },
  { id: 'swamp',   name: '沼の魔女の庵',        x: -690, z: 640,   r: 28,  ground: 'moss' },
  { id: 'marina',  name: '港町マリナ',          x: 500,  z: 805,   r: 80,  ground: 'cobble', h: 2.6 },
  { id: 'island',  name: '月影島',              x: 800,  z: 1060,  r: 52,  ground: 'grass' },
  { id: 'dragon',  name: '竜の峰',              x: -920, z: -980,  r: 42,  ground: 'stone' },
  { id: 'spring',  name: '妖精の泉',            x: -300, z: 90,    r: 16,  ground: 'moss' }
];
const PLACE = {};
for (const p of PLACES) PLACE[p.id] = p;

// 大きな地方（場所名の表示用）
const AREAS = [
  { name: '竜の峰', x: -920, z: -980, r: 300 },
  { name: '灼熱の砂漠', x: 730, z: -480, r: 340 },
  { name: '嘆きの沼地', x: -680, z: 620, r: 250 },
  { name: '迷いの森', x: -380, z: 120, r: 270 },
  { name: '月影島', x: 800, z: 1060, r: 170 },
  { name: '風見の草原', x: 40, z: 130, r: 280 },
  { name: '東の岩山', x: 880, z: -50, r: 200 },
  { name: '鏡の湖', x: -120, z: -560, r: 90 }
];

// 山並み（折れ線に沿って盛り上がる）
const RIDGES = [
  { pts: [[-1150, -640], [-800, -700], [-450, -640], [-150, -690], [150, -650], [500, -700], [850, -640], [1150, -700]],
    w: 190, h: 115, seed: 3, pass: [90, -660] },
  { pts: [[880, -360], [905, -50], [880, 260]], w: 120, h: 58, seed: 17 }
];
const PEAKS = [
  { x: -920, z: -980, r: 320, h: 172 },
  { x: -600, z: -900, r: 170, h: 70 },
  { x: 560,  z: -900, r: 180, h: 62 },
  { x: -1000, z: 330, r: 210, h: 46 },
  { x: 300,  z: 420, r: 120, h: 18 }
];
const LAKES = [
  { id: 'mirror', name: '鏡の湖', x: -120, z: -560, r: 38, below: 1.5 },
  { id: 'oasis',  x: 772, z: -622, r: 15, below: 0.6 },
  { id: 'spring', x: -300, z: 90, r: 8, below: 0.4 }
];
// 川（鏡の湖から南の海へ）
const RIVER_PTS = [[-112, -522], [-80, -420], [40, -300], [140, -180], [185, -40], [195, 80], [178, 200],
  [210, 360], [270, 520], [340, 680], [392, 800], [420, 905], [430, 960]];
// 道（場所どうしをつなぐ）
const ROADS = [
  [[0, 0], [20, 120], [70, 250]],                                                  // 丘→風見の村
  [[0, 0], [-110, -100], [-210, -220], [-248, -250], [-450, -250]],                // 丘→王都（東門から中央広場へ）
  [[-450, -250], [-450, -375]],                                                     // 中央広場→城の内門
  [[-450, -250], [-450, -85], [-470, -40]],                                         // 中央広場→南門
  [[-450, -250], [-652, -250]],                                                     // 中央広場→西門
  [[-652, -250], [-760, -250], [-900, -250]],                                       // 西門→遺跡
  [[-248, -250], [-190, -330], [-190, -470], [-230, -600]],                         // 東門→学院
  [[0, 0], [150, -60], [330, -130], [520, -160]],                                   // 丘→ベルカ
  [[0, 0], [10, -110], [30, -220], [60, -380], [45, -500], [90, -600], [90, -660],
   [110, -760], [130, -840], [170, -920], [200, -1010]],                            // 山道→帝都
  [[70, 250], [140, 420], [260, 600], [400, 720], [500, 805]],                     // 村→港町
  [[70, 250], [-100, 240], [-300, 230], [-490, 210]],                               // 村→森の集落
  [[-490, 210], [-560, 420], [-690, 640]],                                          // 森→沼
  [[-900, -250], [-900, -470], [-790, -620], [-880, -760], [-860, -880], [-920, -980]], // 遺跡→竜の峰
  [[520, -160], [620, -330], [700, -500], [760, -640]],                             // ベルカ→オアシス
  [[520, -160], [560, 200], [540, 500], [500, 805]],                                // ベルカ→港町
  [[500, 805], [500, 880]]                                                           // 港の桟橋へ
];
const ROAD_HW = 3.2, ROAD_SHOULDER = 9;
const MOUNTAIN_ROAD = ROADS.findIndex(r => r[r.length - 1][0] === 200 && r[r.length - 1][1] === -1010);

/* =========================================================
   地形の基本形
   ========================================================= */
function landInside(x, z) {
  const atten = smooth(140, 420, Math.hypot(x - 600, z - 930));   // 港と島のあたりは海岸線を整える
  const n = (fbm(x * 0.0028 + 9, z * 0.0028 + 2, 3) * 130 + fbm(x * 0.012 - 4, z * 0.012 + 8, 2) * 35) * atten;
  return Math.min(x + 1090, 940 - x, z + 1170, 880 - z) + n;
}
function desertness(x, z) { return 1 - smooth(210, 430, Math.hypot(x - 730, z + 480)); }
function swampness(x, z) { return 1 - smooth(110, 260, Math.hypot(x + 680, z - 620)); }
function islandH(x, z) {
  const d = Math.hypot(x - 800, z - 1060);
  if (d > 190) return -99;
  return lerp(18, -22, smooth(25, 175, d)) + fbm(x * 0.03, z * 0.03, 2) * 2.5;
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function polyDist(pts, x, z) {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < m) m = d;
  }
  return m;
}

function baseH(x, z) {
  let h = 7 + fbm(x * 0.0045, z * 0.0045, 4) * 12 + fbm(x * 0.018 + 5, z * 0.018 - 3, 3) * 3.5;
  for (const R of RIDGES) {
    const d = polyDist(R.pts, x, z);
    if (d < R.w) {
      const t = 1 - d / R.w;
      let m = R.h * t * t * (3 - 2 * t) * (0.62 + 0.38 * (fbm(x * 0.01 + R.seed * 13, z * 0.01, 4) + 0.5));
      m += Math.abs(fbm(x * 0.03 + R.seed, z * 0.03, 3)) * 20 * t;
      if (R.pass) m *= lerp(0.26, 1, smooth(40, 240, Math.hypot(x - R.pass[0], z - R.pass[1])));
      h += m;
    }
  }
  for (const P of PEAKS) {
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < P.r) {
      const t = 1 - d / P.r;
      h += P.h * Math.pow(t, 1.5) * (0.82 + 0.18 * fbm(x * 0.02 + P.x, z * 0.02, 3));
    }
  }
  const ds = desertness(x, z);
  if (ds > 0) h = lerp(h, 6 + fbm(x * 0.02 + 77, z * 0.02, 3) * 4 + Math.sin(x * 0.05 + z * 0.02) * 1.2, ds * 0.85);
  const sw = swampness(x, z);
  if (sw > 0) h = lerp(h, 0.3 + fbm(x * 0.03 + 5, z * 0.03, 3) * 1.8, sw);
  const inside = landInside(x, z);
  if (inside < 60) {
    const sea = -24 + fbm(x * 0.01, z * 0.01, 2) * 5;
    h = lerp(sea, h, smooth(-70, 60, inside));
  }
  const ih = islandH(x, z);
  if (ih > h) h = ih;
  return h;
}

/* =========================================================
   町の平地・湖・道・川を重ねる
   ========================================================= */
function initPlaces() {
  for (const p of PLACES) p.fh = p.h !== undefined ? p.h : Math.max(p.minH || 2.5, baseH(p.x, p.z));
}
function placeOuter(p) { return p.blend !== undefined ? p.r + p.blend : p.r * 1.6 + 10; }
function hPlaces(x, z) {
  let h = baseH(x, z);
  for (const p of PLACES) {
    const d = Math.hypot(x - p.x, z - p.z);
    const R = placeOuter(p);
    if (d < R) h = lerp(p.fh, h, smooth(p.r * (p.inner || 0.9), R, d));
  }
  return h;
}
function initLakes() {
  for (const L of LAKES) L.level = hPlaces(L.x, L.z) - L.below;
}
function applyLakes(h, x, z) {
  for (const L of LAKES) {
    const d = Math.hypot(x - L.x, z - L.z);
    if (d > L.r + 24) continue;
    if (d > L.r) h = lerp(L.level + 0.6, h, smooth(L.r, L.r + 24, d));
    else h = Math.min(h, L.level - 0.6 - (L.r > 20 ? 5 : 1.4) * (1 - (d / L.r) ** 2));
  }
  return h;
}

// 折れ線を等間隔に区切る
function resample(pts, step) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, s: acc + L * t });
    }
    acc += L;
  }
  const last = pts[pts.length - 1];
  out.push({ x: last[0], z: last[1], s: acc });
  return out;
}

// 線分を格子に登録して近くの線分だけ調べる
const SEG_GRID = 48;
const SEG_N = Math.ceil(CONFIG.worldSize / SEG_GRID) + 2;
function makeSegGrid() { return new Array(SEG_N * SEG_N); }
function segGridAdd(grid, seg, pad) {
  const H = CONFIG.worldSize / 2;
  const x0 = Math.floor((Math.min(seg.ax, seg.bx) - pad + H) / SEG_GRID), x1 = Math.floor((Math.max(seg.ax, seg.bx) + pad + H) / SEG_GRID);
  const z0 = Math.floor((Math.min(seg.az, seg.bz) - pad + H) / SEG_GRID), z1 = Math.floor((Math.max(seg.az, seg.bz) + pad + H) / SEG_GRID);
  for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
    if (gx < 0 || gz < 0 || gx >= SEG_N || gz >= SEG_N) continue;
    const k = gx + gz * SEG_N;
    (grid[k] || (grid[k] = [])).push(seg);
  }
}
const _near = { d: 0, t: 0, seg: null };
function segGridNearest(grid, x, z) {
  const H = CONFIG.worldSize / 2;
  const gx = Math.floor((x + H) / SEG_GRID), gz = Math.floor((z + H) / SEG_GRID);
  _near.d = Infinity; _near.seg = null;
  if (gx < 0 || gz < 0 || gx >= SEG_N || gz >= SEG_N) return _near;
  const list = grid[gx + gz * SEG_N];
  if (!list) return _near;
  for (const s of list) {
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    let t = s.l2 > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / s.l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - (s.ax + dx * t), ez = z - (s.az + dz * t);
    const d = Math.sqrt(ex * ex + ez * ez);
    if (d < _near.d) { _near.d = d; _near.t = t; _near.seg = s; }
  }
  return _near;
}
function mkSeg(a, b, extra) {
  return Object.assign({ ax: a.x, az: a.z, bx: b.x, bz: b.z, l2: (b.x - a.x) ** 2 + (b.z - a.z) ** 2 }, extra);
}

const RIVER = { samples: [], grid: makeSegGrid() };
const ROAD_DATA = { roads: [], grid: makeSegGrid() };
const BRIDGES = [];

function initRiver() {
  const smp = resample(RIVER_PTS, 5);
  const lake = LAKES[0];
  let run = lake.level;
  for (const p of smp) {
    const b = hPlaces(p.x, p.z) - 1.2;
    run = Math.min(run, b);
    p.surf = Math.max(run, 0.15);
  }
  // なめらかに
  for (let pass = 0; pass < 3; pass++) {
    const c = smp.map(p => p.surf);
    for (let i = 1; i < smp.length - 1; i++) smp[i].surf = Math.min(c[i - 1], (c[i - 1] + c[i] + c[i + 1]) / 3);
  }
  smp[0].surf = lake.level;
  const total = smp[smp.length - 1].s;
  for (const p of smp) p.hw = lerp(5, 11, p.s / total);
  RIVER.samples = smp;
  for (let i = 0; i < smp.length - 1; i++) {
    segGridAdd(RIVER.grid, mkSeg(smp[i], smp[i + 1], { i, s0: smp[i].surf, s1: smp[i + 1].surf, w0: smp[i].hw, w1: smp[i + 1].hw }), 40);
  }
}
function riverAt(x, z) {
  const n = segGridNearest(RIVER.grid, x, z);
  if (!n.seg) return null;
  const s = n.seg;
  return { d: n.d, surf: lerp(s.s0, s.s1, n.t), hw: lerp(s.w0, s.w1, n.t) };
}

function segIntersect(a, b, c, d) {
  const r = { x: b.x - a.x, z: b.z - a.z }, s = { x: d.x - c.x, z: d.z - c.z };
  const den = r.x * s.z - r.z * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.z - (c.z - a.z) * s.x) / den;
  const u = ((c.x - a.x) * r.z - (c.z - a.z) * r.x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, x: a.x + r.x * t, z: a.z + r.z * t };
}

function initRoads() {
  const riv = RIVER.samples;
  for (const pts of ROADS) {
    const smp = resample(pts, 3);
    let h = smp.map(p => hPlaces(p.x, p.z));
    // 平均してなめらかに
    for (let pass = 0; pass < 3; pass++) {
      const c = h.slice();
      for (let i = 0; i < h.length; i++) {
        let s = 0, n = 0;
        for (let k = -8; k <= 8; k++) { const j = i + k; if (j >= 0 && j < h.length) { s += c[j]; n++; } }
        h[i] = s / n;
      }
    }
    // 端は町の高さに合わせる
    h[0] = hPlaces(smp[0].x, smp[0].z);
    h[h.length - 1] = hPlaces(smp[smp.length - 1].x, smp[smp.length - 1].z);
    // 橋のために川の上を持ち上げる
    const crossing = [];
    for (let i = 0; i < smp.length - 1; i++) {
      for (let k = 0; k < riv.length - 1; k++) {
        const hit = segIntersect(smp[i], smp[i + 1], riv[k], riv[k + 1]);
        if (hit) crossing.push({ i, x: hit.x, z: hit.z, surf: riv[k].surf, hw: riv[k].hw, dir: Math.atan2(smp[i + 1].x - smp[i].x, smp[i + 1].z - smp[i].z) });
      }
    }
    for (let i = 0; i < smp.length; i++) {
      const r = riverAt(smp[i].x, smp[i].z);
      if (r && r.d < r.hw + 14) h[i] = Math.max(h[i], r.surf + 2.3);
    }
    // 坂を緩やかに（上げる方向だけ）
    const g = 0.42 * 3;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < h.length; i++) h[i] = Math.max(h[i], h[i - 1] - g);
      for (let i = h.length - 2; i >= 0; i--) h[i] = Math.max(h[i], h[i + 1] - g);
    }
    // 下げる方向も（急すぎる所を削る）
    for (let i = 1; i < h.length; i++) h[i] = Math.min(h[i], h[i - 1] + g);
    for (let i = h.length - 2; i >= 0; i--) h[i] = Math.min(h[i], h[i + 1] + g);
    smp.forEach((p, i) => { p.h = h[i]; });
    const road = { samples: smp };
    ROAD_DATA.roads.push(road);
    for (let i = 0; i < smp.length - 1; i++) {
      segGridAdd(ROAD_DATA.grid, mkSeg(smp[i], smp[i + 1], { h0: smp[i].h, h1: smp[i + 1].h }), ROAD_HW + ROAD_SHOULDER + 2);
    }
    for (const c of crossing) {
      if (BRIDGES.some(b => Math.hypot(b.x - c.x, b.z - c.z) < 20)) continue;
      const top = lerp(smp[c.i].h, smp[c.i + 1].h, 0.5);
      BRIDGES.push({ x: c.x, z: c.z, dir: c.dir, len: 2 * (c.hw + 13), w: 7.5, top });
    }
  }
}
function roadAt(x, z) {
  const n = segGridNearest(ROAD_DATA.grid, x, z);
  if (!n.seg) return null;
  return { d: n.d, h: lerp(n.seg.h0, n.seg.h1, n.t) };
}

/* =========================================================
   高さの計算（地面の種類も一緒に決める）
   ========================================================= */
const S_NAT = 0, S_ROAD = 1, S_RIVER = 2, S_LAKE = 3;
const GROUND_CODE = { grass: 10, dirt: 11, cobble: 12, sand: 13, dark: 14, moss: 15, stone: 16 };
let genSurf = 0;
function genHeight(x, z) {
  let h = baseH(x, z);
  let surf = S_NAT;
  for (const p of PLACES) {
    const d = Math.hypot(x - p.x, z - p.z);
    const R = placeOuter(p);
    if (d < R) {
      h = lerp(p.fh, h, smooth(p.r * (p.inner || 0.9), R, d));
      if (d < p.r * 0.93 && surf === S_NAT) surf = GROUND_CODE[p.ground];
    }
  }
  h = applyLakes(h, x, z);
  for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r) surf = S_LAKE;
  const rd = roadAt(x, z);
  let onRoad = false;
  if (rd && rd.d < ROAD_HW + ROAD_SHOULDER) {
    if (rd.d < ROAD_HW) { h = rd.h; surf = S_ROAD; onRoad = true; }
    else { h = lerp(rd.h, h, smooth(ROAD_HW, ROAD_HW + ROAD_SHOULDER, rd.d)); onRoad = rd.d < ROAD_HW + 2; }
  }
  const rv = riverAt(x, z);
  if (rv) {
    const bank = 22;
    if (rv.d < rv.hw) {
      const k = rv.d / rv.hw;
      h = Math.min(h, rv.surf - 1.3 - 1.9 * (1 - k * k));
      surf = S_RIVER;
    } else if (rv.d < rv.hw + bank) {
      const bh = lerp(rv.surf + 0.7, h, smooth(rv.hw, rv.hw + bank, rv.d));
      h = onRoad ? Math.max(bh, rd.h) : bh;
    }
  }
  genSurf = surf;
  return h;
}

/* =========================================================
   高さ地図（格子）
   ========================================================= */
const WS = CONFIG.worldSize, HALF = WS / 2, CELL = CONFIG.cell;
const GN = WS / CELL;            // 分割数
const GV = GN + 1;               // 頂点数（一辺）
const HEIGHTS = new Float32Array(GV * GV);
const SURFS = new Uint8Array(GV * GV);
const COLORS = new Uint8Array(GV * GV * 3);

async function generateWorld(progress) {
  initPlaces();
  initLakes();
  initRiver();
  initRoads();
  let t0 = performance.now();
  for (let j = 0; j < GV; j++) {
    const z = -HALF + j * CELL;
    for (let i = 0; i < GV; i++) {
      const x = -HALF + i * CELL;
      const k = i + j * GV;
      HEIGHTS[k] = genHeight(x, z);
      SURFS[k] = genSurf;
    }
    if (performance.now() - t0 > 40) {
      progress(0.1 + 0.6 * j / GV, '大地を形づくっています…');
      await new Promise(r => setTimeout(r, 0));
      t0 = performance.now();
    }
  }
  const c = new THREE.Color();
  for (let j = 0; j < GV; j++) {
    for (let i = 0; i < GV; i++) {
      vertexColor(i, j, c);
      const k = (i + j * GV) * 3;
      COLORS[k] = c.r * 255; COLORS[k + 1] = c.g * 255; COLORS[k + 2] = c.b * 255;
    }
    if (performance.now() - t0 > 40) {
      progress(0.7 + 0.2 * j / GV, '草木に色をつけています…');
      await new Promise(r => setTimeout(r, 0));
      t0 = performance.now();
    }
  }
}

const COL = {
  lush: new THREE.Color(0x6e9a48), dry: new THREE.Color(0x9bb35c), high: new THREE.Color(0x587c42),
  forest: new THREE.Color(0x496b33), sand: new THREE.Color(0xd7bd7e), swamp: new THREE.Color(0x56603a),
  tundra: new THREE.Color(0x7f9a78), rock: new THREE.Color(0x8a8378), rock2: new THREE.Color(0x6f6a62),
  snow: new THREE.Color(0xf2f1ec), beach: new THREE.Color(0xd9c79a), seabed: new THREE.Color(0xa8976b),
  road: new THREE.Color(0x9a7b55), roadDesert: new THREE.Color(0xc4a66f), roadDark: new THREE.Color(0x5e5a55),
  riverbed: new THREE.Color(0x7d7358),
  g10: new THREE.Color(0x7aa650), g11: new THREE.Color(0x957c58), g12: new THREE.Color(0x978e7f),
  g13: new THREE.Color(0xdcc38c), g14: new THREE.Color(0x66625e), g15: new THREE.Color(0x5f7a44), g16: new THREE.Color(0x8f8a7e)
};
const _tc = new THREE.Color();
function slopeIdx(i, j) {
  const i0 = Math.max(0, i - 1), i1 = Math.min(GN, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(GN, j + 1);
  const gx = HEIGHTS[i1 + j * GV] - HEIGHTS[i0 + j * GV];
  const gz = HEIGHTS[i + j1 * GV] - HEIGHTS[i + j0 * GV];
  return Math.hypot(gx / ((i1 - i0) * CELL), gz / ((j1 - j0) * CELL));
}
function forestDensity(x, z) {
  let f = fbm(x * 0.006 + 300, z * 0.006 - 50, 3) * 0.9 + 0.12;
  f += 1.4 * (1 - smooth(110, 290, Math.hypot(x + 380, z - 120)));
  f += 0.5 * (1 - smooth(150, 420, Math.hypot(x - 150, z + 880)));
  f -= desertness(x, z) * 2;
  return clamp(f, 0, 1.3);
}
function vertexColor(i, j, c) {
  const k = i + j * GV;
  const h = HEIGHTS[k], s = SURFS[k];
  const x = -HALF + i * CELL, z = -HALF + j * CELL;
  const v = fbm(x * 0.05 + 11, z * 0.05 - 7, 2);
  if (s === S_ROAD) {
    c.copy(z < -780 ? COL.roadDark : COL.road);
    c.lerp(COL.roadDesert, desertness(x, z));
    return c.offsetHSL(0, 0, v * 0.03);
  }
  if (s === S_RIVER || s === S_LAKE) return c.copy(COL.riverbed);
  if (s >= 10) return c.copy(COL['g' + s]).offsetHSL(0, 0, v * 0.05 + (hash2(i, j) - 0.5) * 0.04);
  const slope = slopeIdx(i, j);
  if (h < -0.4) return c.copy(COL.seabed);
  if (h < 1.6 && landInside(x, z) < 110 && swampness(x, z) < 0.3) return c.copy(COL.beach);
  c.copy(COL.lush).lerp(COL.dry, clamp(v * 1.4 + 0.5, 0, 1));
  c.lerp(COL.high, smooth(14, 34, h));
  c.lerp(COL.forest, clamp(forestDensity(x, z) - 0.3, 0, 0.8));
  if (z < -760) c.lerp(COL.tundra, smooth(-760, -900, z) * 0.7);
  const ds = desertness(x, z);
  if (ds > 0) c.lerp(COL.sand, ds);
  const sw = swampness(x, z);
  if (sw > 0) c.lerp(COL.swamp, sw * 0.9);
  if (slope > 1.0 || h > 62 + v * 8) {
    _tc.copy(COL.rock).lerp(COL.rock2, clamp(v + 0.5, 0, 1));
    c.lerp(_tc, smooth(0.8, 1.2, slope) * 0.9 + smooth(56, 70, h + v * 8) * 0.9);
  }
  if (h > 98 + v * 12) c.copy(COL.snow);
  return c;
}

// 地形メッシュと完全に一致する高さ
function terrainHeight(x, z) {
  const gx = clamp((x + HALF) / CELL, 0, GN - 1e-4);
  const gz = clamp((z + HALF) / CELL, 0, GN - 1e-4);
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const fx = gx - ix, fz = gz - iz;
  const ha = HEIGHTS[ix + GV * iz], hb = HEIGHTS[ix + GV * (iz + 1)];
  const hc = HEIGHTS[ix + 1 + GV * (iz + 1)], hd = HEIGHTS[ix + 1 + GV * iz];
  if (fx + fz <= 1) return ha + (hd - ha) * fx + (hb - ha) * fz;
  return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}
function surfAt(x, z) {
  const i = clamp(Math.round((x + HALF) / CELL), 0, GN), j = clamp(Math.round((z + HALF) / CELL), 0, GN);
  return SURFS[i + j * GV];
}

// 水面の高さ（海・川・湖）
function waterAt(x, z) {
  if (x > CONFIG.dungeonX - 1000) return -1e9;
  let w = CONFIG.waterLevel;
  const r = riverAt(x, z);
  if (r && r.d < r.hw + 0.5) w = Math.max(w, r.surf);
  for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r + 0.5) w = Math.max(w, L.level);
  return w;
}

/* =========================================================
   当たり判定（円と回転した箱）・足場（橋・桟橋）
   ========================================================= */
const COLL_CELL = 8;
const colliders = new Map();
const platforms = new Map();
let COLL_CAPTURE = null;          // ここに配列を入れておくと、追加した当たり判定を記録する
function _gridInsert(map, obj, x0, z0, x1, z1) {
  if (COLL_CAPTURE) COLL_CAPTURE.push({ map, obj, x0, z0, x1, z1 });
  for (let gx = Math.floor(x0 / COLL_CELL); gx <= Math.floor(x1 / COLL_CELL); gx++)
    for (let gz = Math.floor(z0 / COLL_CELL); gz <= Math.floor(z1 / COLL_CELL); gz++) {
      const key = gx * 100003 + gz;
      let l = map.get(key);
      if (!l) map.set(key, l = []);
      l.push(obj);
    }
}
function addCollider(x, z, r) {
  _gridInsert(colliders, { t: 0, x, z, r }, x - r, z - r, x + r, z + r);
}
function addBoxCollider(x, z, hx, hz, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const ex = Math.abs(hx * c) + Math.abs(hz * s), ez = Math.abs(hx * s) + Math.abs(hz * c);
  _gridInsert(colliders, { t: 1, x, z, hx, hz, c, s }, x - ex, z - ez, x + ex, z + ez);
}
// 2点を結ぶ壁
function addWallCollider(x1, z1, x2, z2, thick) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  addBoxCollider((x1 + x2) / 2, (z1 + z2) / 2, thick / 2, L / 2, Math.atan2(x2 - x1, z2 - z1));
}
// 記録した当たり判定をまとめて消す（壊れた建物・作り直した木など）
function removeColliders(list) {
  for (const e of list) {
    for (let gx = Math.floor(e.x0 / COLL_CELL); gx <= Math.floor(e.x1 / COLL_CELL); gx++)
      for (let gz = Math.floor(e.z0 / COLL_CELL); gz <= Math.floor(e.z1 / COLL_CELL); gz++) {
        const l = e.map.get(gx * 100003 + gz);
        if (!l) continue;
        const i = l.indexOf(e.obj);
        if (i >= 0) l.splice(i, 1);
      }
  }
  list.length = 0;
}
function captureColliders(fn) {
  const prev = COLL_CAPTURE, list = [];
  COLL_CAPTURE = list;
  try { fn(); } finally { COLL_CAPTURE = prev; if (prev) prev.push(...list); }
  return list;
}
function resolveCollisions(p, radius) {
  const cx = Math.floor(p.x / COLL_CELL), cz = Math.floor(p.z / COLL_CELL);
  const seen = resolveCollisions.seen || (resolveCollisions.seen = new Set());
  seen.clear();
  let hit = false;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const list = colliders.get((cx + i) * 100003 + (cz + j));
    if (!list) continue;
    for (const o of list) {
      if (seen.has(o)) continue;
      seen.add(o);
      if (o.t === 0) {
        const dx = p.x - o.x, dz = p.z - o.z;
        const d = Math.hypot(dx, dz), min = o.r + radius;
        if (d < min && d > 1e-5) { p.x = o.x + dx / d * min; p.z = o.z + dz / d * min; hit = true; }
      } else {
        const dx = p.x - o.x, dz = p.z - o.z;
        // ローカル座標へ（回転を戻す）
        const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        const ex = o.hx + radius, ez = o.hz + radius;
        if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
          let nx = lx, nz = lz;
          if (ex - Math.abs(lx) < ez - Math.abs(lz)) nx = Math.sign(lx || 1) * ex;
          else nz = Math.sign(lz || 1) * ez;
          p.x = o.x + nx * o.c + nz * o.s;
          p.z = o.z - nx * o.s + nz * o.c;
          hit = true;
        }
      }
    }
  }
  return hit;
}
function addPlatform(x, z, hx, hz, ry, top) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const ex = Math.abs(hx * c) + Math.abs(hz * s), ez = Math.abs(hx * s) + Math.abs(hz * c);
  _gridInsert(platforms, { x, z, hx, hz, c, s, top }, x - ex, z - ez, x + ex, z + ez);
}
function platformAt(x, z, y) {
  const list = platforms.get(Math.floor(x / COLL_CELL) * 100003 + Math.floor(z / COLL_CELL));
  let best = -Infinity;
  if (!list) return best;
  for (const o of list) {
    const dx = x - o.x, dz = z - o.z;
    const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    if (Math.abs(lx) <= o.hx && Math.abs(lz) <= o.hz && (y === undefined || y > o.top - 3.2)) best = Math.max(best, o.top);
  }
  return best;
}

// 地面の高さ（橋・地下迷宮も含む）
function groundAt(x, z, y) {
  if (x > CONFIG.dungeonX - 1000) return DUNGEON_FLOOR;
  return Math.max(terrainHeight(x, z), platformAt(x, z, y));
}
const DUNGEON_FLOOR = 0;

/* =========================================================
   場所の名前
   ========================================================= */
function placeAt(x, z, pad = 1.25) {
  for (const p of PLACES) if (Math.hypot(x - p.x, z - p.z) < p.r * pad) return p;
  return null;
}
function areaName(x, z) {
  if (x > CONFIG.dungeonX - 1000) return '古代遺跡・地下迷宮';
  const p = placeAt(x, z);
  if (p) return p.name;
  if (Math.hypot(x - 800, z - 1060) < 170) return '月影島';
  if (terrainHeight(x, z) < -1.5 && waterAt(x, z) > terrainHeight(x, z)) return landInside(x, z) < 0 ? '南の海' : '水辺';
  for (const a of AREAS) if (Math.hypot(x - a.x, z - a.z) < a.r) return a.name;
  if (polyDist(RIDGES[0].pts, x, z) < 130) return '霊峰山脈';
  if (z < -780) return 'ガルヴァス帝国領';
  return 'エルディア平原';
}
// 王都を囲む帝国軍の陣（木を生やさない）
function inSiegeField(x, z) {
  const p = PLACES.find(q => q.id === 'aldia');
  const lx = x - p.x, lz = z - p.z;
  return (lz > 150 && lz < 470 && Math.abs(lx) < 340) || (lx > 180 && lx < 380 && lz > -120 && lz < 160);
}
function inSafeZone(x, z) {
  for (const p of PLACES) if (p.id !== 'ruins' && p.id !== 'dragon' && Math.hypot(x - p.x, z - p.z) < p.r * 1.05 + 4) return true;
  return false;
}

/* =========================================================
   地形の区画（近くは細かく、遠くは粗く）
   ========================================================= */
const CHUNK = CONFIG.chunkSize, CN = WS / CHUNK, CSEG = CHUNK / CELL;
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
const chunks = [];

function buildChunkGeo(ci, cj, st) {
  const segs = CSEG / st, nv = segs + 1;
  const count = nv * nv + nv * 4;
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const idx = [];
  const put = (vi, gi, gj, dy) => {
    const k = gi + gj * GV;
    pos[vi * 3] = -HALF + gi * CELL; pos[vi * 3 + 1] = HEIGHTS[k] + dy; pos[vi * 3 + 2] = -HALF + gj * CELL;
    col[vi * 3] = COLORS[k * 3] / 255; col[vi * 3 + 1] = COLORS[k * 3 + 1] / 255; col[vi * 3 + 2] = COLORS[k * 3 + 2] / 255;
  };
  const gi0 = ci * CSEG, gj0 = cj * CSEG;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nv; i++) put(i + j * nv, gi0 + i * st, gj0 + j * st, 0);
  for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) {
    const a = i + j * nv, b = i + (j + 1) * nv, c = i + 1 + j * nv, d = i + 1 + (j + 1) * nv;
    idx.push(a, b, c, c, b, d);
  }
  // すき間隠しのスカート
  let vi = nv * nv;
  const edges = [];
  for (let i = 0; i < nv; i++) edges.push([i, 0]);
  for (let j = 0; j < nv; j++) edges.push([segs, j]);
  for (let i = segs; i >= 0; i--) edges.push([i, segs]);
  for (let j = segs; j >= 0; j--) edges.push([0, j]);
  const skirtStart = vi;
  const ring = [];
  for (const [i, j] of edges) {
    if (vi >= count) break;
    put(vi, gi0 + i * st, gj0 + j * st, -6);
    ring.push([i + j * nv, vi]);
    vi++;
  }
  for (let r = 0; r < ring.length - 1; r++) {
    const [t0, b0] = ring[r], [t1, b1] = ring[r + 1];
    idx.push(t0, b0, t1, t1, b0, b1, t0, t1, b0, t1, b1, b0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, vi * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, vi * 3), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  void skirtStart;
  return g;
}

function initChunks() {
  for (let cj = 0; cj < CN; cj++) for (let ci = 0; ci < CN; ci++) {
    const lo = new THREE.Mesh(buildChunkGeo(ci, cj, 5), terrainMat);
    lo.receiveShadow = true;
    scene.add(lo);
    chunks.push({ ci, cj, x0: -HALF + ci * CHUNK, z0: -HALF + cj * CHUNK, lo, hi: null, veg: null });
  }
}
function chunkDist(ch, x, z) {
  const dx = Math.max(ch.x0 - x, 0, x - (ch.x0 + CHUNK));
  const dz = Math.max(ch.z0 - z, 0, z - (ch.z0 + CHUNK));
  return Math.hypot(dx, dz);
}
function updateChunks(x, z, budget = 1) {
  const inDungeon = x > CONFIG.dungeonX - 1000;
  const want = [];
  for (const ch of chunks) {
    const d = inDungeon ? Infinity : chunkDist(ch, x, z);
    const needHi = d < CONFIG.hiDist, needVeg = d < CONFIG.vegDist;
    if (needHi && !ch.hi) want.push([d, ch, 'hi']);
    if (needVeg && !ch.veg) want.push([d + 1, ch, 'veg']);
    if (ch.hi) {
      ch.hi.visible = needHi;
      if (d > CONFIG.hiDist + 250) { scene.remove(ch.hi); ch.hi.geometry.dispose(); ch.hi = null; }
    }
    ch.lo.visible = !inDungeon && !(ch.hi && ch.hi.visible);
    if (ch.veg) ch.veg.visible = d < CONFIG.vegDist + 30;
  }
  want.sort((a, b) => a[0] - b[0]);
  for (let n = 0; n < Math.min(budget, want.length); n++) {
    const [, ch, kind] = want[n];
    if (kind === 'hi') {
      ch.hi = new THREE.Mesh(buildChunkGeo(ch.ci, ch.cj, 1), terrainMat);
      ch.hi.receiveShadow = true;
      scene.add(ch.hi);
      ch.lo.visible = false;
    } else {
      ch.vegCols = captureColliders(() => { ch.veg = buildVegetation(ch); });
      scene.add(ch.veg);
    }
  }
  return want.length;
}

/* =========================================================
   木・岩・草むら（区画ごとに1つのメッシュへ）
   ========================================================= */
function nearAnyPlace(x, z, pad) {
  for (const p of PLACES) if (Math.hypot(x - p.x, z - p.z) < p.r + pad) return true;
  return false;
}
function buildVegetation(ch) {
  const R = mulberry32(CONFIG.seed + ch.ci * 131 + ch.cj * 7919);
  const B = new Builder();
  const cx = ch.x0 + CHUNK / 2, cz = ch.z0 + CHUNK / 2;
  const tries = 340;
  for (let n = 0; n < tries; n++) {
    const x = ch.x0 + R() * CHUNK, z = ch.z0 + R() * CHUNK;
    const h = terrainHeight(x, z);
    const s = surfAt(x, z);
    if (s !== S_NAT) continue;
    if (h < waterAt(x, z) + 0.6) continue;
    if (nearAnyPlace(x, z, 6)) continue;
    if (inCrater(x, z)) continue;
    if (inSiegeField(x, z)) continue;
    const rd = roadAt(x, z);
    if (rd && rd.d < ROAD_HW + 2.5) continue;
    const i = Math.round((x + HALF) / CELL), j = Math.round((z + HALF) / CELL);
    const slope = slopeIdx(clamp(i, 0, GN), clamp(j, 0, GN));
    if (slope > 0.9 || h > 96) continue;
    const ds = desertness(x, z), sw = swampness(x, z);
    const dens = forestDensity(x, z);
    const roll = R();
    if (ds > 0.55) {
      if (roll < 0.05) cactus(B, x, h, z, R);
      else if (roll < 0.08) rockAt(B, x, h, z, R, 0xb89c6e);
      continue;
    }
    if (sw > 0.5) {
      if (roll < 0.25) deadTree(B, x, h, z, R);
      else if (roll < 0.45) bush(B, x, h, z, R, 0x4d5a30);
      continue;
    }
    if (roll < dens * 0.85) {
      const coastal = h < 4 && landInside(x, z) < 160;
      const isle = Math.hypot(x - 800, z - 1060) < 190;
      if ((coastal || isle) && R() < 0.6) palm(B, x, h, z, R);
      else if (h > 26 || z < -700 || R() < (h > 14 ? 0.7 : 0.35)) pine(B, x, h, z, R, z < -760 || h > 60);
      else roundTree(B, x, h, z, R);
    } else if (roll < dens * 0.85 + 0.08) {
      rockAt(B, x, h, z, R, h > 40 ? 0x7f7a70 : 0x8d877c);
    } else if (roll < dens * 0.85 + 0.2 && h < 40) {
      bush(B, x, h, z, R, 0x557f34);
    } else if (roll < dens * 0.85 + 0.26 && h < 30) {
      flowers(B, x, h, z, R);
    }
  }
  // 山の上には岩を多めに
  for (let n = 0; n < 30; n++) {
    const x = ch.x0 + R() * CHUNK, z = ch.z0 + R() * CHUNK;
    const h = terrainHeight(x, z);
    if (h < 35 || nearAnyPlace(x, z, 4) || inCrater(x, z)) continue;
    const rd = roadAt(x, z);
    if (rd && rd.d < ROAD_HW + 2) continue;
    rockAt(B, x, h, z, R, h > 90 ? 0xd6d6d2 : 0x7c776d);
  }
  void cx; void cz;
  const g = new THREE.Group();
  if (!B.empty) g.add(B.mesh());
  return g;
}
function pine(B, x, h, z, R, snowy) {
  const s = 0.7 + R() * 0.8;
  const th = 1.6 * s;
  B.cyl(x, h + th / 2 - 0.1, z, 0.18 * s, 0.26 * s, th, 0x5d4028, 6);
  const leaf = snowy ? 0x3d5d4f : 0x2f5a3a;
  const c = new THREE.Color(leaf).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.08).getHex();
  B.cone(x, h + th + 1.9 * s, z, 1.9 * s, 4.2 * s, c, 7);
  B.cone(x, h + th + 3.6 * s, z, 1.3 * s, 3.0 * s, c, 7);
  if (snowy) B.cone(x, h + th + 4.7 * s, z, 0.7 * s, 1.3 * s, 0xeef2f0, 7);
  addCollider(x, z, 0.35 * s);
}
function roundTree(B, x, h, z, R) {
  const s = 0.7 + R() * 0.8;
  const th = 2.2 * s;
  B.cyl(x, h + th / 2 - 0.1, z, 0.2 * s, 0.3 * s, th, 0x5d4028, 6);
  const c = new THREE.Color(0x6a9a3f).offsetHSL((R() - 0.5) * 0.06, 0, (R() - 0.5) * 0.1).getHex();
  B.sphere(x, h + th + 1.2 * s, z, 1.9 * s, c, 1, 0.9, 1);
  B.sphere(x + 0.9 * s, h + th + 0.6 * s, z + 0.3 * s, 1.1 * s, c, 1, 0.9, 1);
  addCollider(x, z, 0.4 * s);
}
function palm(B, x, h, z, R) {
  const s = 0.8 + R() * 0.5;
  const lean = (R() - 0.5) * 0.3;
  for (let k = 0; k < 5; k++) B.cyl(x + lean * k * s, h + (k + 0.5) * 1.1 * s, z, 0.17 * s, 0.2 * s, 1.15 * s, 0x8a6a45, 6);
  const tx = x + lean * 5 * s, ty = h + 5.6 * s;
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + R();
    B.box(tx + Math.sin(a) * 1.3 * s, ty - 0.2, z + Math.cos(a) * 1.3 * s, 0.5 * s, 0.08, 2.8 * s, 0x4f8a36, a, 0.35);
  }
  addCollider(x, z, 0.3 * s);
}
function cactus(B, x, h, z, R) {
  const s = 0.8 + R() * 0.7;
  B.cyl(x, h + 1.4 * s, z, 0.3 * s, 0.35 * s, 2.8 * s, 0x5d8a4a, 7);
  B.cyl(x + 0.55 * s, h + 1.7 * s, z, 0.18 * s, 0.2 * s, 1.0 * s, 0x5d8a4a, 6);
  B.cyl(x - 0.5 * s, h + 2.1 * s, z, 0.16 * s, 0.18 * s, 0.9 * s, 0x5d8a4a, 6);
  addCollider(x, z, 0.4 * s);
}
function deadTree(B, x, h, z, R) {
  const s = 0.8 + R() * 0.6;
  B.cyl(x, h + 1.6 * s, z, 0.14 * s, 0.28 * s, 3.2 * s, 0x4a3d2e, 5, 0, (R() - 0.5) * 0.2);
  B.cyl(x + 0.4 * s, h + 2.6 * s, z, 0.06 * s, 0.1 * s, 1.4 * s, 0x4a3d2e, 5, R() * 3, 0, 0.8);
  B.cyl(x - 0.35 * s, h + 2.2 * s, z, 0.06 * s, 0.1 * s, 1.2 * s, 0x4a3d2e, 5, R() * 3, 0, -0.9);
  addCollider(x, z, 0.3 * s);
}
function rockAt(B, x, h, z, R, color) {
  const s = 0.4 + Math.pow(R(), 3) * 2.6;
  const c = new THREE.Color(color).offsetHSL(0, 0, (R() - 0.5) * 0.12).getHex();
  B.dodeca(x, h + s * 0.25, z, s, c, 0.8 + R() * 0.5, 0.6 + R() * 0.4, 0.8 + R() * 0.5, R() * 3, R() * 3, R() * 3);
  if (s > 0.8) addCollider(x, z, s * 0.8);
}
function bush(B, x, h, z, R, color) {
  const s = 0.5 + R() * 0.6;
  const c = new THREE.Color(color).offsetHSL((R() - 0.5) * 0.05, 0, (R() - 0.5) * 0.1).getHex();
  B.sphere(x, h + 0.35 * s, z, 0.8 * s, c, 1.2, 0.7, 1);
}
function flowers(B, x, h, z, R) {
  const cols = [0xf2d24a, 0xe86a7a, 0xf4f1ea, 0x9a7ae0];
  const c = cols[Math.floor(R() * cols.length)];
  for (let k = 0; k < 5; k++) {
    const a = R() * 6.28, r = R() * 1.2;
    B.box(x + Math.cos(a) * r, h + 0.18, z + Math.sin(a) * r, 0.18, 0.12, 0.18, c);
  }
}

/* =========================================================
   水（海・川・湖）
   ========================================================= */
const waterMat = new THREE.MeshStandardMaterial({ color: 0x3f86a8, transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.2 });
const riverMat = new THREE.MeshStandardMaterial({ color: 0x4a93b0, transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.15 });
const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = CONFIG.waterLevel;
scene.add(sea);

function buildWaterBodies() {
  // 川のリボン
  const smp = RIVER.samples;
  const pos = [], idx = [];
  let n = 0;
  for (let i = 0; i < smp.length; i++) {
    const a = smp[Math.max(0, i - 1)], b = smp[Math.min(smp.length - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const w = smp[i].hw + 1.2;
    const y = smp[i].surf;
    pos.push(smp[i].x - dz * w, y, smp[i].z + dx * w, smp[i].x + dz * w, y, smp[i].z - dx * w);
    if (i > 0) { const k = n - 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    n += 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const river = new THREE.Mesh(g, riverMat);
  river.material.side = THREE.DoubleSide;
  scene.add(river);
  for (const L of LAKES) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(L.r + 1.5, 32), riverMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(L.x, L.level, L.z);
    scene.add(m);
  }
}

/* =========================================================
   地図の画像
   ========================================================= */
let MAP_CANVAS = null;
function buildMapImage() {
  const c = document.createElement('canvas');
  c.width = c.height = GV;
  const g = c.getContext('2d');
  const img = g.createImageData(GV, GV);
  for (let j = 0; j < GV; j++) for (let i = 0; i < GV; i++) {
    const k = i + j * GV, o = k * 4;
    const h = HEIGHTS[k];
    const s = SURFS[k];
    let r = COLORS[k * 3], gg = COLORS[k * 3 + 1], b = COLORS[k * 3 + 2];
    if (h < 0 || s === S_RIVER || s === S_LAKE) {
      const deep = clamp(-h / 25, 0, 1);
      r = lerp(92, 40, deep); gg = lerp(160, 96, deep); b = lerp(190, 150, deep);
    } else {
      // 陰影
      const hx = HEIGHTS[Math.min(GN, i + 1) + j * GV] - h;
      const sh = clamp(1 + hx * 0.08, 0.7, 1.2);
      r *= sh; gg *= sh; b *= sh;
    }
    img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  MAP_CANVAS = c;
}

/* =========================================================
   地形を変える（大魔法のクレーター）
   自国の土地は決して変えない。帝国の土地だけ。
   ========================================================= */
const CRATERS = [];
function inCrater(x, z) { for (const c of CRATERS) if (Math.hypot(x - c.x, z - c.z) < c.r) return true; return false; }
function isEnemyLand(x, z) {
  if (z > -770 || x > CONFIG.dungeonX - 1000) return false;
  const e = PLACE.empire;
  if (!STORY_FLAGS.palaceOpen && Math.hypot(x - e.x, z - (e.z - 70)) < 95) return false;   // 宮殿は結界で守られている
  return true;
}
const _scorch = new THREE.Color(0x3a3028);
function deformCrater(cx, cz, R, depth) {
  if (!isEnemyLand(cx, cz) || R < 3) return false;
  R = Math.min(R, 170); depth = Math.min(depth, 48);
  const Rr = R * 1.3;
  const i0 = clamp(Math.floor((cx - Rr + HALF) / CELL), 0, GN), i1 = clamp(Math.ceil((cx + Rr + HALF) / CELL), 0, GN);
  const j0 = clamp(Math.floor((cz - Rr + HALF) / CELL), 0, GN), j1 = clamp(Math.ceil((cz + Rr + HALF) / CELL), 0, GN);
  const c = new THREE.Color();
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = -HALF + i * CELL, z = -HALF + j * CELL;
    const d = Math.hypot(x - cx, z - cz);
    if (d > Rr) continue;
    const k = i + j * GV;
    if (d < R) {
      HEIGHTS[k] -= depth * Math.pow(1 - (d / R) ** 2, 1.3);
      const f = 0.85 * (1 - d / R) + 0.15;
      c.setRGB(COLORS[k * 3] / 255, COLORS[k * 3 + 1] / 255, COLORS[k * 3 + 2] / 255).lerp(_scorch, f);
      COLORS[k * 3] = c.r * 255; COLORS[k * 3 + 1] = c.g * 255; COLORS[k * 3 + 2] = c.b * 255;
    } else {
      HEIGHTS[k] += depth * 0.12 * Math.sin((d - R) / (Rr - R) * Math.PI);
    }
  }
  CRATERS.push({ x: cx, z: cz, r: Rr });
  for (const ch of chunks) {
    if (ch.x0 > cx + Rr + CELL || ch.x0 + CHUNK < cx - Rr - CELL || ch.z0 > cz + Rr + CELL || ch.z0 + CHUNK < cz - Rr - CELL) continue;
    ch.lo.geometry.dispose();
    ch.lo.geometry = buildChunkGeo(ch.ci, ch.cj, 5);
    if (ch.hi) { ch.hi.geometry.dispose(); ch.hi.geometry = buildChunkGeo(ch.ci, ch.cj, 1); }
    if (ch.veg) {
      scene.remove(ch.veg);
      ch.veg.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (ch.vegCols) removeColliders(ch.vegCols);
      ch.veg = null;
    }
  }
  return true;
}

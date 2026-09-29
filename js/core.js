'use strict';
/* =========================================================
   設定（ここを変えると世界の大きさや操作感が変わる）
   ========================================================= */
const CONFIG = {
  seed: 20260929,          // 地形・配置の乱数シード
  worldSize: 2400,         // 世界の一辺（m）
  cell: 3,                 // 地形の格子の細かさ（m）
  chunkSize: 150,          // 地形を分割して描画する単位（m）
  waterLevel: 0,           // 海面の高さ
  spawn: { x: 0, z: 7 },   // 出現位置
  walkSpeed: 6,
  runSpeed: 11,
  jumpPower: 9,
  gravity: 25,
  maxSlope: 1.4,           // これより急な坂は登れない（高さ/距離）
  hiDist: 240,             // 細かい地形を出す距離
  vegDist: 420,            // 木や岩を出す距離
  fogNear: 170,
  fogFar: 1100,
  camera: { distance: 9, minDist: 3.5, maxDist: 28, pitch: 0.32 },
  dungeonX: 4000           // 地下迷宮は世界の外（東の彼方）に作る
};
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

/* =========================================================
   乱数・ノイズ・数学
   ========================================================= */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(CONFIG.seed);

function hash2(x, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ CONFIG.seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return ((a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v) * 2 - 1;
}
function fbm(x, z, oct = 5) {
  let s = 0, amp = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, z * f) * amp;
    n += amp; amp *= 0.5; f *= 2.03;
  }
  return s / n;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}
function angleDiff(a, b) {
  return Math.abs(((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
}
// Y軸まわりの回転（three.js と同じ向き）
function rotXZ(lx, lz, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [lx * c + lz * s, -lx * s + lz * c];
}
function fmt(n) { return Math.floor(n).toLocaleString('ja-JP'); }

/* =========================================================
   レンダラー・シーン
   ========================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);

const SKY = {
  top: new THREE.Color(0x5b8ec6),
  horizon: new THREE.Color(0xeadcbf),
  bottom: new THREE.Color(0xb7ccd6)
};
const sunDir = new THREE.Vector3(0.6, 0.55, -0.55).normalize();
scene.fog = new THREE.Fog(SKY.horizon.clone(), CONFIG.fogNear, CONFIG.fogFar);
scene.background = SKY.horizon.clone();

// 空（グラデーション＋太陽のにじみ）
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(3500, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: SKY.top }, horizon: { value: SKY.horizon },
      bottom: { value: SKY.bottom }, sunDir: { value: sunDir }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, min(1.0, -h * 4.0));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.86, 0.62) * (pow(s, 90.0) * 0.9 + pow(s, 6.0) * 0.18);
        gl_FragColor = vec4(col, 1.0);
      }`
  })
);
sky.renderOrder = -10;
scene.add(sky);

// 光
const hemi = new THREE.HemisphereLight(0xd3e4ef, 0x6b5a3a, 0.62);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 1.05);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 400 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// 効果用の点光源（数を固定してシェーダーの作り直しを防ぐ）
const LIGHT_POOL = [];
for (let i = 0; i < 3; i++) {
  const l = new THREE.PointLight(0xffa04a, 0, 20, 2);
  l.userData = { life: 0, max: 1, base: 0 };
  scene.add(l);
  LIGHT_POOL.push(l);
}
let lightCursor = 0;
function flashLight(pos, color, intensity, range, life) {
  const l = LIGHT_POOL[1 + (lightCursor++ % (LIGHT_POOL.length - 1))];   // 0番は常駐用
  l.position.copy(pos);
  l.color.setHex(color);
  l.distance = range;
  l.userData.life = l.userData.max = life;
  l.userData.base = intensity;
  l.intensity = intensity;
}
function updateLights(dt) {
  for (let i = 1; i < LIGHT_POOL.length; i++) {
    const l = LIGHT_POOL[i];
    if (l.userData.life > 0) {
      l.userData.life -= dt;
      l.intensity = Math.max(0, l.userData.base * (l.userData.life / l.userData.max));
    } else l.intensity = 0;
  }
}

/* =========================================================
   テクスチャ（光のにじみ・文字）
   ========================================================= */
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

function makeGlowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  s.scale.set(size, size, 1);
  return s;
}

// 看板などの文字スプライト
function makeTextSprite(text, opt = {}) {
  const font = opt.font || 700;
  const px = opt.px || 44;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `${font} ${px}px "Zen Kaku Gothic New", sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + px;
  c.width = w; c.height = Math.ceil(px * 1.6);
  const g2 = c.getContext('2d');
  g2.font = `${font} ${px}px "Zen Kaku Gothic New", sans-serif`;
  g2.fillStyle = opt.bg || 'rgba(58,40,24,0.92)';
  const r = 10;
  g2.beginPath();
  g2.moveTo(r, 0); g2.lineTo(w - r, 0); g2.quadraticCurveTo(w, 0, w, r);
  g2.lineTo(w, c.height - r); g2.quadraticCurveTo(w, c.height, w - r, c.height);
  g2.lineTo(r, c.height); g2.quadraticCurveTo(0, c.height, 0, c.height - r);
  g2.lineTo(0, r); g2.quadraticCurveTo(0, 0, r, 0); g2.fill();
  g2.strokeStyle = opt.border || 'rgba(230,200,140,0.9)'; g2.lineWidth = 4; g2.stroke();
  g2.fillStyle = opt.color || '#fbeccb';
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.fillText(text, w / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = opt.height || 0.9;
  s.scale.set(h * w / c.height, h, 1);
  return s;
}

/* =========================================================
   形をまとめて1つのメッシュにする道具（描画を軽くする）
   ========================================================= */
const _geoCache = new Map();
function unitGeo(key, make) {
  let g = _geoCache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    _geoCache.set(key, g);
  }
  return g;
}
function prismGeometry() {
  // 底辺の幅1・高さ1・奥行1の三角柱（底が y=0）
  const v = [
    [-0.5, 0, -0.5], [0.5, 0, -0.5], [0, 1, -0.5],
    [-0.5, 0, 0.5], [0.5, 0, 0.5], [0, 1, 0.5]
  ];
  const tris = [
    [0, 2, 1], [3, 4, 5],
    [0, 3, 5], [0, 5, 2],
    [1, 2, 5], [1, 5, 4],
    [0, 1, 4], [0, 4, 3]
  ];
  const pos = [];
  for (const t of tris) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _c = new THREE.Color();

class Builder {
  constructor() { this.pos = []; this.col = []; }
  add(geo, pos, rot, scl, color) {
    _e.set(rot[0], rot[1], rot[2], 'YXZ');
    _q.setFromEuler(_e);
    _m4.compose(_v3.set(pos[0], pos[1], pos[2]), _q, _s3.set(scl[0], scl[1], scl[2]));
    const p = geo.attributes.position.array, e = _m4.elements;
    _c.set(color);
    const cr = _c.r, cg = _c.g, cb = _c.b;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      this.pos.push(
        e[0] * x + e[4] * y + e[8] * z + e[12],
        e[1] * x + e[5] * y + e[9] * z + e[13],
        e[2] * x + e[6] * y + e[10] * z + e[14]
      );
      this.col.push(cr, cg, cb);
    }
    return this;
  }
  // y は中心の高さ
  box(x, y, z, w, h, d, color, ry = 0, rx = 0, rz = 0) {
    return this.add(unitGeo('box', () => new THREE.BoxGeometry(1, 1, 1)), [x, y, z], [rx, ry, rz], [w, h, d], color);
  }
  // 円柱（rt:上の半径 rb:下の半径）y は中心
  cyl(x, y, z, rt, rb, h, color, seg = 8, ry = 0, rx = 0, rz = 0) {
    const ratio = rb > 0 ? Math.round(rt / rb * 100) / 100 : 1;
    const base = rb > 0 ? rb : rt;
    const g = unitGeo('cyl' + ratio + '_' + seg, () => new THREE.CylinderGeometry(rb > 0 ? ratio : 1, rb > 0 ? 1 : 0, 1, seg));
    return this.add(g, [x, y, z], [rx, ry, rz], [base, h, base], color);
  }
  cone(x, y, z, r, h, color, seg = 8, ry = 0, rx = 0, rz = 0) {
    const g = unitGeo('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg));
    return this.add(g, [x, y, z], [rx, ry, rz], [r, h, r], color);
  }
  sphere(x, y, z, r, color, sx = 1, sy = 1, sz = 1, detail = 0) {
    const g = unitGeo('ico' + detail, () => new THREE.IcosahedronGeometry(1, detail));
    return this.add(g, [x, y, z], [0, 0, 0], [r * sx, r * sy, r * sz], color);
  }
  dodeca(x, y, z, r, color, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = unitGeo('dod', () => new THREE.DodecahedronGeometry(1, 0));
    return this.add(g, [x, y, z], [rx, ry, rz], [r * sx, r * sy, r * sz], color);
  }
  // 三角柱（屋根）y は底
  prism(x, y, z, w, h, d, color, ry = 0) {
    return this.add(unitGeo('prism', prismGeometry), [x, y, z], [0, ry, 0], [w, h, d], color);
  }
  torus(x, y, z, r, tube, color, rx = 0, ry = 0) {
    const t = Math.round(tube / r * 100) / 100;
    const g = unitGeo('tor' + t, () => new THREE.TorusGeometry(1, t, 5, 14));
    return this.add(g, [x, y, z], [rx, ry, 0], [r, r, r], color);
  }
  get empty() { return this.pos.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat = MAT.flat, shadows = true) {
    const m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }
}

const MAT = {
  flat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  glowAdd: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  dark: new THREE.MeshBasicMaterial({ color: 0x050507 })
};

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();

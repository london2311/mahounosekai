'use strict';
/* =========================================================
   粒子（光・炎・煙）
   光＝加算合成の丸い粒、炎＝加算合成のもやもや、煙＝ふつうの半透明
   ========================================================= */
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const R = mulberry32(7);
  for (let k = 0; k < 14; k++) {
    const x = 64 + (R() - 0.5) * 46, y = 64 + (R() - 0.5) * 46, r = 18 + R() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  // 端を消す
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

class Particles {
  constructor(max, blending, tex, order) {
    this.max = max; this.n = 0;
    const F = () => new Float32Array(max);
    this.keys = ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 'size', 'grow', 'grav', 'drag', 'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'a0', 'rot', 'rv', 'fade'];
    for (const k of this.keys) this[k] = F();
    const g = this.geo = new THREE.BufferGeometry();
    this.aPos = new Float32Array(max * 3); this.aCol = new Float32Array(max * 3);
    this.aSize = F(); this.aAlpha = F(); this.aRot = F();
    g.setAttribute('position', new THREE.BufferAttribute(this.aPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.aCol, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.aAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('prot', new THREE.BufferAttribute(this.aRot, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 }, map: { value: tex } },
      defines: tex ? { USE_PUFF: '' } : {},
      transparent: true, depthWrite: false, blending,
      vertexShader: `
        attribute float psize; attribute float alpha; attribute vec3 pcolor; attribute float prot;
        varying vec3 vC; varying float vA; varying float vR;
        uniform float scale;
        void main() {
          vC = pcolor; vA = alpha; vR = prot;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(psize * scale / max(-mv.z, 0.1), 1000.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vC; varying float vA; varying float vR;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
        #ifdef USE_PUFF
          float c = cos(vR), s = sin(vR);
          p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          float a = texture2D(map, p + 0.5).a;
        #else
          float d = length(p);
          if (d > 0.5) discard;
          float a = 1.0 - d * 2.0; a *= a;
        #endif
          gl_FragColor = vec4(vC, a * vA);
        }`
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = order;
    scene.add(this.points);
  }
  // c0→c1 へ色が変わる。fade: 0=だんだん消える / 1=ふわっと出てから消える
  spawn(x, y, z, vx, vy, vz, life, size, c0, c1 = c0, a0 = 1, grav = 0, drag = 0, grow = 0, fade = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = this.max[i] = life; this.size[i] = size; this.grow[i] = grow;
    this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = a0; this.fade[i] = fade;
    this.rot[i] = Math.random() * 6.28; this.rv[i] = (Math.random() - 0.5) * 1.5;
    _pc.setHex(c0); this.r0[i] = _pc.r; this.g0[i] = _pc.g; this.b0[i] = _pc.b;
    _pc.setHex(c1); this.r1[i] = _pc.r; this.g1[i] = _pc.g; this.b1[i] = _pc.b;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const j = --this.n;
        for (const k of this.keys) this[k][i] = this[k][j];
        continue;
      }
      const dr = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= dr; this.vy[i] = this.vy[i] * dr - this.grav[i] * dt; this.vz[i] *= dr;
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      this.size[i] = Math.max(0.01, this.size[i] + this.grow[i] * dt);
      this.rot[i] += this.rv[i] * dt;
      const t = 1 - this.life[i] / this.max[i];
      const i3 = i * 3;
      this.aPos[i3] = this.px[i]; this.aPos[i3 + 1] = this.py[i]; this.aPos[i3 + 2] = this.pz[i];
      this.aCol[i3] = this.r0[i] + (this.r1[i] - this.r0[i]) * t;
      this.aCol[i3 + 1] = this.g0[i] + (this.g1[i] - this.g0[i]) * t;
      this.aCol[i3 + 2] = this.b0[i] + (this.b1[i] - this.b0[i]) * t;
      this.aSize[i] = this.size[i];
      this.aRot[i] = this.rot[i];
      this.aAlpha[i] = this.a0[i] * (this.fade[i] ? Math.min(1, t * 6) * Math.min(1, (1 - t) * 1.4) : Math.min(1, (1 - t) * 1.5));
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'pcolor', 'psize', 'alpha', 'prot']) this.geo.attributes[k].needsUpdate = true;
  }
}
const _pc = new THREE.Color();
const PS = new Particles(IS_TOUCH ? 1600 : 2600, THREE.NormalBlending, puffTex, 10);   // 煙・霜・破片
const PF = new Particles(IS_TOUCH ? 2000 : 3200, THREE.AdditiveBlending, puffTex, 11); // 炎
const PG = new Particles(IS_TOUCH ? 3500 : 6000, THREE.AdditiveBlending, null, 12);    // 光の粒

function spawnP(x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 0, grow = 0) {
  PG.spawn(x, y, z, vx, vy, vz, life, size, color, color, 1, grav, drag, grow);
}
function burst(x, y, z, n, speed, life, size, color, grav = 0, spreadY = 1) {
  n = Math.min(n, 400);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1;
    const r = Math.sqrt(1 - u * u), sp = speed * (0.3 + Math.random() * 0.7);
    spawnP(x, y, z, Math.cos(a) * r * sp, u * sp * spreadY, Math.sin(a) * r * sp, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, grav, 1.5);
  }
}
// 球状にばらまく（系・数・中心・半径・速さ などをまとめて）
function spray(sys, n, x, y, z, o) {
  n = Math.min(Math.round(n), o.cap || 300);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, u = (o.upOnly ? Math.random() : Math.random() * 2 - 1);
    const r = Math.sqrt(1 - u * u);
    const dx = Math.cos(a) * r, dy = u, dz = Math.sin(a) * r;
    const off = (o.radius || 0) * Math.cbrt(Math.random());
    const sp = o.speed * (0.35 + Math.random() * 0.65);
    sys.spawn(x + dx * off, y + dy * off * (o.flatY || 1), z + dz * off,
      dx * sp, dy * sp * (o.spreadY || 1) + (o.up || 0), dz * sp,
      o.life * (0.6 + Math.random() * 0.7), o.size * (0.6 + Math.random() * 0.8),
      o.c0, o.c1 === undefined ? o.c0 : o.c1, o.alpha || 1, o.grav || 0, o.drag || 0, o.grow || 0, o.fade || 0);
  }
}
function updateParticles(dt) {
  const sc = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
  for (const P of [PS, PF, PG]) { P.update(dt); P.mat.uniforms.scale.value = sc; }
}

/* =========================================================
   一時的な演出（閃光・地面の焦げ跡・稲妻・氷の結晶など）
   ========================================================= */
const FX = [];
const fxSphereGeo = new THREE.IcosahedronGeometry(1, 2);
const crystalGeo = new THREE.OctahedronGeometry(1, 0);
function addFx(obj, life, update) {
  scene.add(obj);
  const f = { obj, life, max: life, update };
  FX.push(f);
  return f;
}
function disposeObj(o) {
  o.traverse(c => {
    if (c.geometry && c.geometry !== fxSphereGeo && c.geometry !== crystalGeo && !c.geometry.userData.keep) c.geometry.dispose();
    if (c.material) c.material.dispose();
  });
}
function updateFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i];
    f.life -= dt;
    if (f.life <= 0) {
      scene.remove(f.obj);
      disposeObj(f.obj);
      FX.splice(i, 1);
      continue;
    }
    f.update(1 - f.life / f.max, dt);
  }
}
function flashSprite(pos, color, size, life) {
  const s = makeGlowSprite(color, size, 1);
  s.position.copy(pos);
  addFx(s, life, (t) => { s.material.opacity = Math.pow(1 - t, 2); s.scale.setScalar(size * (1 + t * 0.4)); });
}
// 地面に残る跡（焦げ・霜）
function groundDecal(x, z, radius, color, opacity, life, additive) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
    map: glowTex, color, transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.random() * 6.28;
  m.position.set(x, groundAt(x, z) + 0.06, z);
  m.scale.setScalar(radius);
  addFx(m, life, (t) => { m.material.opacity = opacity * Math.min(1, (1 - t) * 3); });
}
function shockRing(x, z, radius, color, life = 0.45) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 56), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, groundAt(x, z) + 0.2, z);
  addFx(ring, life, (t) => { ring.scale.setScalar(radius * (0.2 + 1.3 * (1 - Math.pow(1 - t, 2)))); ring.material.opacity = 0.6 * (1 - t); });
}
function screenFlash(strength, color = '#eef4ff') {
  const el = document.getElementById('flash');
  if (!el) return;
  el.style.background = color;
  el.style.transition = 'none';
  el.style.opacity = Math.min(0.55, strength);
  void el.offsetWidth;
  el.style.transition = 'opacity 0.28s ease-out';
  el.style.opacity = 0;
}

// 稲妻：中点をずらして枝分かれさせる
function boltPath(a, b, rough, depth) {
  let pts = [a.clone(), b.clone()];
  let r = rough;
  for (let lv = 0; lv < depth; lv++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const L = p.distanceTo(q);
      const m = new THREE.Vector3().lerpVectors(p, q, 0.5);
      m.x += (Math.random() - 0.5) * L * r; m.y += (Math.random() - 0.5) * L * r * 0.6; m.z += (Math.random() - 0.5) * L * r;
      out.push(m, q);
    }
    pts = out;
    r *= 0.62;
  }
  return pts;
}
function boltMesh(points, width, color, opacity = 1) {
  const pos = [];
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const wa = width * (1 - 0.5 * i / points.length), wb = width * (1 - 0.5 * (i + 1) / points.length);
    d.subVectors(b, a).normalize();
    p1.crossVectors(d, Math.abs(d.y) > 0.9 ? tmpV3.set(1, 0, 0) : up).normalize();
    p2.crossVectors(d, p1).normalize();
    for (const p of [p1, p2]) {
      pos.push(a.x - p.x * wa, a.y - p.y * wa, a.z - p.z * wa, a.x + p.x * wa, a.y + p.y * wa, a.z + p.z * wa, b.x + p.x * wb, b.y + p.y * wb, b.z + p.z * wb);
      pos.push(a.x - p.x * wa, a.y - p.y * wa, a.z - p.z * wa, b.x + p.x * wb, b.y + p.y * wb, b.z + p.z * wb, b.x - p.x * wb, b.y - p.y * wb, b.z - p.z * wb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
}
function buildBolt(group, from, to, width, branches) {
  while (group.children.length) { const c = group.children.pop(); disposeObj(c); }
  const L = from.distanceTo(to);
  const main = boltPath(from, to, 0.42, 5);
  group.add(boltMesh(main, width * 5, 0x7a8cff, 0.22), boltMesh(main, width * 2.2, 0xb8d0ff, 0.6), boltMesh(main, width * 0.8, 0xffffff, 1));
  for (let b = 0; b < branches; b++) {
    const i = 3 + Math.floor(Math.random() * (main.length * 0.7));
    const p = main[Math.min(i, main.length - 2)];
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    dir.x += (Math.random() - 0.5) * 1.6; dir.z += (Math.random() - 0.5) * 1.6; dir.y *= 0.6;
    const end = p.clone().addScaledVector(dir.normalize(), L * (0.12 + Math.random() * 0.22));
    const bp = boltPath(p, end, 0.5, 4);
    group.add(boltMesh(bp, width * 1.3, 0xa8c0ff, 0.45), boltMesh(bp, width * 0.45, 0xffffff, 0.9));
  }
}
function lightningFx(from, to, width, branches = 3) {
  const g = new THREE.Group();
  buildBolt(g, from, to, width, branches);
  let next = 0.3;
  addFx(g, 0.42, (t) => {
    if (t > next) { next += 0.3; buildBolt(g, from, to, width * (1 - t * 0.5), Math.max(1, branches - 1)); }
    const flick = Math.random() < 0.25 ? 0.35 : 1;
    g.children.forEach(c => { if (c.material.userData.base === undefined) c.material.userData.base = c.material.opacity; c.material.opacity = c.material.userData.base * (1 - t) * flick; });
  });
}
// 小さな放電（着弾点のまわりでぱちぱち）
function sparkArcs(center, radius, n) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, r = radius * (0.3 + Math.random() * 0.7);
    const p = new THREE.Vector3(center.x + Math.cos(a) * r, groundAt(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r) + 0.1, center.z + Math.sin(a) * r);
    const q = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * radius * 0.4, Math.random() * radius * 0.5, (Math.random() - 0.5) * radius * 0.4));
    const g = new THREE.Group();
    const pts = boltPath(q, p, 0.6, 3);
    g.add(boltMesh(pts, 0.04 + radius * 0.012, 0xc8dcff, 0.9));
    addFx(g, 0.12 + Math.random() * 0.2, (t) => { g.children[0].material.opacity = 0.9 * (1 - t) * (Math.random() < 0.3 ? 0.3 : 1); });
  }
}
// 氷の結晶が地面から突き出て、しばらくして砕ける
function iceClusterFx(pos, s) {
  const gy = groundAt(pos.x, pos.z);
  const base = new THREE.Vector3(pos.x, Math.min(pos.y, gy + 0.3), pos.z);
  const g = new THREE.Group();
  g.position.copy(base);
  const mat = new THREE.MeshPhongMaterial({ color: 0xd8f4ff, emissive: 0x123a5a, specular: 0xffffff, shininess: 110,
    transparent: true, opacity: 0.86, flatShading: true });
  const n = Math.min(16, 7 + Math.floor(s * 3));
  const size = 0.55 + s * 1.5;
  const shards = [];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, r = size * (k === 0 ? 0 : 0.2 + Math.random() * 0.55);
    const h = size * (k === 0 ? 1.6 : 0.6 + Math.random() * 0.9);
    const m = new THREE.Mesh(crystalGeo, mat);
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    m.rotation.set(Math.sin(a) * (0.2 + r / size * 0.9), Math.random() * 3, -Math.cos(a) * (0.2 + r / size * 0.9));
    m.userData = { h, w: h * (0.22 + Math.random() * 0.1) };
    m.scale.set(0.01, 0.01, 0.01);
    g.add(m); shards.push(m);
  }
  let shattered = false;
  addFx(g, 1.35, (t) => {
    const grow = Math.min(1, t / 0.1);
    const e = 1 - Math.pow(1 - grow, 3);
    for (const m of shards) m.scale.set(m.userData.w * e, m.userData.h * e, m.userData.w * e);
    if (!shattered && t > 0.78) {
      shattered = true;
      g.visible = false;
      SOUND.shatter(s);
      for (const m of shards) {
        const w = new THREE.Vector3(); m.getWorldPosition(w);
        spray(PS, 4 + s, w.x, w.y + m.userData.h * 0.4, w.z, { speed: 3 + s * 2, up: 2, life: 0.9, size: 0.12 + s * 0.08, c0: 0xe8f8ff, c1: 0xa8d8ff, alpha: 0.95, grav: 12, drag: 0.6, cap: 40 });
        spray(PG, 3, w.x, w.y + m.userData.h * 0.4, w.z, { speed: 2, life: 0.6, size: 0.1 + s * 0.05, c0: 0xffffff, c1: 0x9adfff, cap: 10 });
      }
      spray(PS, 10 + s * 6, base.x, base.y + size * 0.4, base.z, { radius: size * 0.6, speed: 1.2 + s, life: 1.4, size: 0.5 + s * 0.6, grow: 0.8 + s * 0.5, c0: 0xf0faff, c1: 0xd0ecff, alpha: 0.4, drag: 1.5, grav: -0.3, fade: 1, cap: 60 });
    }
  });
}

/* =========================================================
   属性と詠唱
   ========================================================= */
const ELEM = {
  fire:    { name: '炎', spell: '煉獄', color: 0xff7a2a, c2: 0xffe08a, css: '#ff8a3a', mult: 2.4, key: 1 },
  water:   { name: '水', spell: '大海嘯', color: 0x2a8aff, c2: 0xbfe6ff, css: '#4aa0ff', mult: 2.2, key: 2 },
  ice:     { name: '氷', spell: '永久凍土', color: 0x7ad4ff, c2: 0xe8fbff, css: '#7ad4ff', mult: 2.1, key: 3 },
  thunder: { name: '雷', spell: '天雷', color: 0xffe45a, c2: 0xffffff, css: '#ffe45a', mult: 2.2, key: 4 },
  gravity: { name: '重', spell: '崩星', color: 0x9a6aff, c2: 0x2a0a4a, css: '#a47aff', mult: 2.6, key: 5 },
  wood:    { name: '樹', spell: '千年樹', color: 0x5ab83a, c2: 0xd8f0a0, css: '#6ac84a', mult: 2.1, key: 6 },
  light:   { name: '光', spell: '天照', color: 0xfff0a0, c2: 0xffffff, css: '#fff0a0', mult: 2.5, key: 7 },
  dark:    { name: '闇', spell: '深淵', color: 0x9a3ae8, c2: 0x1a0024, css: '#b05aff', mult: 2.5, key: 8 }
};
const ELEM_ORDER = ['fire', 'water', 'ice', 'thunder', 'gravity', 'wood', 'light', 'dark'];
const MAGIC = { charging: false, chargeE: 0, chargeT: 0, cooldown: 0, projectiles: [] };

function tapCost() { return STATE.aura * 0.03; }
// 魔法の大きさ（込めた魔力で上限なく大きくなる）
function spellScale(E) { return 0.35 * Math.pow(Math.max(E, 1) / 6, 0.45); }
// オーラの大きさ（魔力の量で上限なく大きくなる）
function auraRadius() { return 1 + 0.9 * Math.pow(Math.max(STATE.aura, 100) / 50000, 0.35); }
// 見た目の大きさ（飛んでいく魔法の玉など）
function visScale(s) { return 0.4 + Math.pow(s, 0.7) * 0.45; }

function beginCast() {
  if (GAME.paused || MAGIC.charging || GAME.dead) return;
  const c = tapCost();
  if (STATE.mp < c) { toast('魔力が足りない…（少し休むと回復する）'); return; }
  STATE.mp -= c;
  MAGIC.charging = true; MAGIC.chargeE = c; MAGIC.chargeT = 0;
  SOUND.chargeStart(STATE.element);
}
function cancelCast() {
  if (!MAGIC.charging) return;
  STATE.mp = Math.min(STATE.aura, STATE.mp + MAGIC.chargeE);
  MAGIC.charging = false; MAGIC.chargeE = 0;
  SOUND.chargeStop();
}
function releaseCast() {
  if (!MAGIC.charging) return;
  MAGIC.charging = false;
  SOUND.chargeStop();
  if (MAGIC.cooldown > 0) { STATE.mp = Math.min(STATE.aura, STATE.mp + MAGIC.chargeE); return; }
  castSpell(STATE.element, MAGIC.chargeE);
  MAGIC.lastCast = GAME.time;
  MAGIC.cooldown = 0.22;
  MAGIC.chargeE = 0;
}
function updateCharge(dt) {
  MAGIC.cooldown = Math.max(0, MAGIC.cooldown - dt);
  if (!MAGIC.charging) return;
  MAGIC.chargeT += dt;
  if (MAGIC.chargeT > 0.25 && STATE.mp > 0) {
    const add = Math.min(STATE.mp, STATE.aura * 0.6 * dt);
    STATE.mp -= add; MAGIC.chargeE += add;
  }
  // 杖に集まる光
  const o = player.orbWorld(tmpV);
  const e = ELEM[STATE.element];
  const s0 = spellScale(MAGIC.chargeE);
  SOUND.chargeLevel(Math.max(0, s0 / spellScale(tapCost()) - 1));
  const s = visScale(s0) * 0.6;
  const R = 0.6 + s * 2;
  for (let k = 0; k < 2 + Math.min(10, s * 3); k++) {
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    spawnP(o.x + Math.cos(a) * r * R, o.y + u * R, o.z + Math.sin(a) * r * R,
      -Math.cos(a) * r * R * 3, -u * R * 3, -Math.sin(a) * r * R * 3, 0.3, 0.1 + s * 0.08, Math.random() < 0.5 ? e.color : e.c2);
  }
  // 向き
  const tgt = FOCUS.target;
  if (tgt) { player.faceTo = Math.atan2(tgt.pos.x - player.pos.x, tgt.pos.z - player.pos.z); player.faceTimer = 0.3; }
  else { updateAim(); player.faceTo = Math.atan2(AIM.point.x - player.pos.x, AIM.point.z - player.pos.z); player.faceTimer = 0.3; }
}

/* =========================================================
   狙い（魔法が当たる場所）
   ========================================================= */
const AIM_NDC_Y = 0.36;            // 画面の中心より少し上を狙う（主人公に重ならないように）
const AIM = { point: new THREE.Vector3(), ground: new THREE.Vector3(), hit: false, hasTarget: false };
const _aimRay = new THREE.Raycaster();
const _aimNdc = new THREE.Vector2(0, AIM_NDC_Y);
function aoeRadius(el, s) { return el === 'fire' ? 1.4 + 2.6 * s : el === 'ice' ? 0.8 + 1.2 * s : 0.9 + 1.6 * s; }
function updateAim() {
  const t = FOCUS.target;
  if (t) {
    AIM.hasTarget = true; AIM.hit = true;
    AIM.point.set(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z);
    AIM.ground.set(t.pos.x, groundAt(t.pos.x, t.pos.z), t.pos.z);
    return;
  }
  AIM.hasTarget = false;
  _aimRay.setFromCamera(_aimNdc, camera);
  const o = _aimRay.ray.origin, d = _aimRay.ray.direction;
  const maxD = 90 + auraRadius() * 10;
  const below = (k) => o.y + d.y * k < groundAt(o.x + d.x * k, o.z + d.z * k);
  let prev = 0, hit = -1;
  for (let k = 2; k <= maxD; k += 2) {
    if (below(k)) {
      let a = prev, b = k;
      for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
      hit = b; break;
    }
    prev = k;
  }
  AIM.hit = hit > 0;
  AIM.point.copy(o).addScaledVector(d, AIM.hit ? hit : maxD);
  AIM.ground.set(AIM.point.x, groundAt(AIM.point.x, AIM.point.z), AIM.point.z);
}
function aimDirection(from, out) {
  updateAim();
  return out.copy(AIM.point).sub(from).normalize();
}

// 着弾点の輪（大きさ＝今の魔法の爆発範囲）と、杖から伸びる軌道の点線
const aimMarker = (() => {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), mat);
  const inner = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.12, 16), mat);
  ring.rotation.x = inner.rotation.x = -Math.PI / 2;
  g.add(ring, inner);
  for (let k = 0; k < 4; k++) {
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.28), mat);
    tick.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.rotation.y = k * Math.PI / 2;
    tick.position.set(0, 0, 0.8);
    holder.add(tick);
    g.add(holder);
  }
  g.renderOrder = 15;
  g.traverse(o => { o.renderOrder = 15; });
  scene.add(g);
  return { group: g, mat, ring };
})();
const AIM_DOTS = [];
for (let i = 0; i < 16; i++) {
  const d = makeGlowSprite(0xffffff, 0.35, 0.6);
  d.material.depthTest = false;
  d.renderOrder = 16;
  scene.add(d);
  AIM_DOTS.push(d);
}
const _aimFrom = new THREE.Vector3();
function updateAimFx(dt, t, show) {
  const visible = show && GAME.started && !GAME.paused && !GAME.dead;
  aimMarker.group.visible = visible && AIM.hit;
  AIM_DOTS.forEach(d => { d.visible = visible; });
  if (!visible) return;
  updateAim();
  const e = ELEM[STATE.element];
  const s = spellScale(MAGIC.charging ? MAGIC.chargeE : tapCost());
  const R = Math.max(0.7, aoeRadius(STATE.element, s));
  const strong = MAGIC.charging ? 1 : 0;
  aimMarker.mat.color.setHex(e.color);
  aimMarker.mat.opacity = (0.45 + strong * 0.35) * (0.85 + 0.15 * Math.sin(t * 6));
  aimMarker.group.position.set(AIM.ground.x, AIM.ground.y + 0.15, AIM.ground.z);
  aimMarker.group.scale.setScalar(R);
  aimMarker.group.rotation.y += dt * 0.8;
  // 軌道（杖の先から着弾点へ流れる光の点）
  player.orbWorld(_aimFrom);
  const L = _aimFrom.distanceTo(AIM.point);
  const n = AIM_DOTS.length;
  const phase = (t * 1.5) % 1;
  AIM_DOTS.forEach((d, i) => {
    const f = (i + phase) / n;
    d.position.lerpVectors(_aimFrom, AIM.point, f);
    const fade = Math.min(1, f * 6) * Math.min(1, (1 - f) * 8);
    d.material.color.setHex(i % 2 ? e.color : e.c2);
    d.material.opacity = (0.35 + strong * 0.55) * fade;
    d.scale.setScalar((0.3 + strong * 0.2) * Math.max(1, L / 40));
  });
}

function castSpell(el, E) {
  const e = ELEM[el];
  const s = spellScale(E);
  const power = E * STATE.staffMult * e.mult;
  const from = player.orbWorld(new THREE.Vector3());
  const dir = aimDirection(from, new THREE.Vector3());
  player.castAnim = 1;
  player.faceTo = Math.atan2(dir.x, dir.z); player.faceTimer = 0.35;
  const vs = visScale(s);
  flashLight(from, e.color, Math.min(6, 2 + s * 0.3), 8 + vs * 6, 0.25);
  burst(from.x, from.y, from.z, 10 + Math.min(30, s * 3), 3 + vs * 2, 0.35, 0.2 + vs * 0.15, e.c2);
  SOUND.cast(el, s);
  if (el === 'fire') {
    MAGIC.projectiles.push(makeProjectile('fire', from, dir, s, power));
  } else if (el === 'ice') {
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    for (const off of [-1, 0, 1]) {
      const d = dir.clone().addScaledVector(side, off * 0.09).normalize();
      MAGIC.projectiles.push(makeProjectile('ice', from.clone().addScaledVector(side, off * 0.3 * (1 + visScale(s))), d, s * 0.75, power / 3 * 1.1));
    }
  } else if (el === 'water') {
    castTidalWave(from, dir, s, power);
  } else {
    updateAim();
    const tgt = FOCUS.target;
    const point = tgt ? new THREE.Vector3(tgt.pos.x, tgt.pos.y + tgt.height * 0.5, tgt.pos.z)
      : AIM.hit ? AIM.ground.clone().add(new THREE.Vector3(0, 0.5, 0)) : AIM.point.clone();
    if (el === 'thunder') thunderStrike(point, s, power, 2, tgt || null, null);
    else if (el === 'gravity') castGravity(point, s, power);
    else if (el === 'wood') castWood(point, s, power);
    else if (el === 'light') castLight(point, s, power);
    else if (el === 'dark') castDark(point, s, power);
  }
}

function makeProjectile(kind, from, dir, s, power) {
  const e = kind === 'fire' ? ELEM.fire : ELEM.ice;
  let mesh;
  if (kind === 'fire') {
    // 芯は白く、外側ほど赤い火の玉
    mesh = new THREE.Group();
    const vs = visScale(s);
    const core = makeGlowSprite(0xfff6dc, 1.3 * vs, 1);
    const mid = makeGlowSprite(0xffa040, 2.6 * vs, 0.9);
    const outer = makeGlowSprite(0xff4a10, 4.4 * vs, 0.55);
    mesh.add(outer, mid, core);
    mesh.userData.sprites = [core, mid, outer];
  } else {
    mesh = new THREE.Mesh(crystalGeo, new THREE.MeshPhongMaterial({ color: 0xdff6ff, emissive: 0x1a5a8a, specular: 0xffffff, shininess: 120,
      transparent: true, opacity: 0.92, flatShading: true }));
    const vs = visScale(s) * 1.4;
    mesh.scale.set(0.22 * vs, 0.9 * vs, 0.22 * vs);
    const glow = makeGlowSprite(0x8adcff, 1.2, 0.5);
    glow.scale.set(1.6 / mesh.scale.x * (0.3 + s * 0.3), 1.6 / mesh.scale.y * (0.3 + s * 0.3), 1);
    mesh.add(glow);
  }
  mesh.position.copy(from);
  scene.add(mesh);
  const speed = kind === 'fire' ? 24 + s * 3 : 32 + s * 3;
  return { kind, mesh, pos: mesh.position, vel: dir.clone().multiplyScalar(speed), speed, s, power, life: 2.6 + s * 0.2, target: FOCUS.target, e, emit: 0 };
}

function updateProjectiles(dt) {
  const list = MAGIC.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.target && p.target.alive) {
      tmpV.set(p.target.pos.x, p.target.pos.y + p.target.height * 0.5, p.target.pos.z).sub(p.pos).normalize().multiplyScalar(p.speed);
      p.vel.lerp(tmpV, Math.min(1, dt * 6));
    }
    p.pos.addScaledVector(p.vel, dt);
    const s = visScale(p.s), x = p.pos.x, y = p.pos.y, z = p.pos.z;
    const bx = -p.vel.x * 0.08, by = -p.vel.y * 0.08, bz = -p.vel.z * 0.08;
    p.emit += dt * 60;
    const n = Math.floor(p.emit); p.emit -= n;
    if (p.kind === 'fire') {
      const fl = 1 + Math.sin(GAME.time * 40 + i) * 0.08;
      p.mesh.userData.sprites.forEach((sp, k) => { sp.material.opacity = [1, 0.9, 0.55][k] * fl; });
      for (let k = 0; k < n; k++) {
        const j = 0.25 * (0.4 + s);
        // 炎の尾（白→橙→赤→暗い赤）
        for (let m = 0; m < Math.min(6, 2 + s * 2); m++) {
          PF.spawn(x + (Math.random() - 0.5) * j, y + (Math.random() - 0.5) * j, z + (Math.random() - 0.5) * j,
            bx + (Math.random() - 0.5) * 1.5, by + 0.6 + Math.random(), bz + (Math.random() - 0.5) * 1.5,
            0.28 + Math.random() * 0.22, (0.5 + Math.random() * 0.5) * (0.4 + s), 0xffe6b0, 0xa01c04, 0.9, -2.5, 1.5, -0.6 * (0.4 + s));
        }
        // 煙
        if (Math.random() < 0.6) PS.spawn(x, y, z, bx * 0.5 + (Math.random() - 0.5), 0.8, bz * 0.5 + (Math.random() - 0.5),
          0.9 + Math.random() * 0.6, 0.3 * (0.4 + s), 0x2a2622, 0x5a5652, 0.35, -1.2, 1.2, 1.4 * (0.4 + s), 1);
        // 火の粉
        if (Math.random() < 0.5) PG.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3,
          0.5 + Math.random() * 0.4, 0.05 + s * 0.03, 0xffd080, 0xff5010, 1, 4, 0.8);
      }
    } else {
      p.mesh.quaternion.setFromUnitVectors(tmpV2.set(0, 1, 0), tmpV3.copy(p.vel).normalize());
      for (let k = 0; k < n; k++) {
        // 冷気のもや
        PS.spawn(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, z + (Math.random() - 0.5) * 0.2,
          bx * 0.3 + (Math.random() - 0.5) * 0.6, -0.3, bz * 0.3 + (Math.random() - 0.5) * 0.6,
          0.55 + Math.random() * 0.3, 0.15 + s * 0.2, 0xf4fcff, 0xc8e8ff, 0.4, 0.4, 2, 0.8 + s * 0.6, 1);
        // きらめく氷の粒
        if (Math.random() < 0.7) PG.spawn(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.8, -0.5, (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.3, 0.05 + s * 0.03, 0xffffff, 0x8adcff, 1, 1.5, 1);
      }
    }
    let hit = null;
    for (const en of ENEMIES) {
      if (!en.alive || !en.active) continue;
      const dy = (en.pos.y + en.height * 0.5) - p.pos.y;
      const d = Math.hypot(en.pos.x - p.pos.x, dy * 0.8, en.pos.z - p.pos.z);
      if (d < en.radius + visScale(p.s) * 0.8) { hit = en; break; }
    }
    const ground = groundAt(p.pos.x, p.pos.z);
    if (hit || p.pos.y < ground || p.life <= 0) {
      if (p.kind === 'fire') fireExplode(p.pos.clone(), p.s, p.power, hit);
      else iceHit(p.pos.clone(), p.s, p.power, hit);
      scene.remove(p.mesh);
      disposeObj(p.mesh);
      list.splice(i, 1);
    }
  }
}

// 爆発（火の玉がふくらみ、黒煙が立ちのぼり、火の粉が飛ぶ）
function fireExplode(pos, s, power, direct) {
  const R = aoeRadius('fire', s);
  const g = groundAt(pos.x, pos.z);
  const x = pos.x, y = Math.max(pos.y, g + R * 0.25), z = pos.z;
  flashSprite(new THREE.Vector3(x, y, z), 0xffb060, R * 1.8, 0.18);
  // 火の玉の本体（橙→黒煙へ冷えていく）
  spray(PS, 30 + s * 20, x, y, z, { radius: R * 0.3, speed: R * 2.2, up: R * 0.3, life: 1.3, size: R * 0.5, grow: R * 0.45,
    c0: 0xffa838, c1: 0x2a2420, alpha: 0.92, grav: -R * 0.6, drag: 3, cap: 200 });
  // 明るく光る部分（加算）
  spray(PF, 20 + s * 10, x, y, z, { radius: R * 0.2, speed: R * 2, up: R * 0.3, life: 0.6, size: R * 0.45, grow: R * 0.3,
    c0: 0xffd070, c1: 0xa02008, alpha: 0.5 / (1 + s * 0.35), grav: -R * 0.8, drag: 3.2, cap: 120 });
  spray(PF, 6 + s * 3, x, y, z, { radius: R * 0.1, speed: R * 0.6, life: 0.35, size: R * 0.8, grow: R * 0.4,
    c0: 0xffe0a0, c1: 0xff6a1a, alpha: 0.3 / (1 + s * 0.3), drag: 4, cap: 30 });
  spray(PS, 18 + s * 14, x, y + R * 0.2, z, { radius: R * 0.35, speed: R * 0.9, up: R * 0.7, life: 2.6, size: R * 0.45, grow: R * 0.55,
    c0: 0x1e1a18, c1: 0x6a6460, alpha: 0.6, grav: -R * 0.25, drag: 1.4, fade: 1, cap: 160 });
  spray(PG, 30 + s * 25, x, y, z, { speed: R * 4 + 4, up: R, life: 1.1, size: 0.07 + s * 0.05, c0: 0xffe0a0, c1: 0xff4a0a,
    grav: 9.8, drag: 0.6, cap: 220 });
  spray(PS, 10 + s * 6, x, g + 0.3, z, { speed: R * 2.5 + 3, up: R * 1.5 + 3, upOnly: true, life: 1.2, size: 0.12 + s * 0.08,
    c0: 0x2a2018, c1: 0x3a3028, alpha: 0.95, grav: 14, drag: 0.3, cap: 80 });
  shockRing(x, z, R * 1.6, 0xffb070);
  if (s > 6) deformCrater(x, z, R * 0.6, R * 0.16);
  damageArmy(x, z, R, power, 'fire', { fling: true });
  damageStructs(x, z, R, power);
  groundDecal(x, z, R * 0.95, 0x140c08, 0.75, 9);
  groundDecal(x, z, R * 0.6, 0xff5a10, 0.5, 1.2, true);
  flashLight(new THREE.Vector3(x, y, z), 0xff8a3a, Math.min(7, 4 + s), 16 + R * 4, 0.6);
  shakeCamera(Math.min(0.55, 0.08 + s * 0.06));
  SOUND.boom(s);
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - pos.x, en.pos.y + en.height * 0.5 - pos.y, en.pos.z - pos.z) - en.radius;
    if (en === direct || d < R) {
      const f = en === direct ? 1 : 1 - 0.5 * clamp(d / R, 0, 1);
      damageEnemy(en, power * f, 'fire', pos);
    }
  }
  scorchTrees(pos, R);
}
// 氷（結晶が突き出し、冷気が広がり、やがて砕ける）
function iceHit(pos, s, power, direct) {
  const R = aoeRadius('ice', s);
  iceClusterFx(pos, s);
  flashSprite(pos, 0xcff0ff, R * 2, 0.18);
  spray(PS, 14 + s * 10, pos.x, pos.y, pos.z, { radius: R * 0.2, speed: R * 2, life: 1.2, size: 0.35 + s * 0.5, grow: 0.8 + s * 0.8,
    c0: 0xffffff, c1: 0xc0e4ff, alpha: 0.55, drag: 2.5, grav: 0.3, fade: 1, cap: 120 });
  spray(PG, 20 + s * 12, pos.x, pos.y, pos.z, { speed: 4 + s * 3, life: 0.7, size: 0.06 + s * 0.04, c0: 0xffffff, c1: 0x7ad4ff, grav: 5, drag: 1, cap: 150 });
  shockRing(pos.x, pos.z, R * 1.4, 0x9adcff, 0.5);
  damageArmy(pos.x, pos.z, R, power, 'ice');
  damageStructs(pos.x, pos.z, R, power * 0.8);
  // 大きく込めた氷は、あたり一面を凍土に変える
  const extra = Math.min(10, Math.floor(s / 2));
  for (let k = 0; k < extra; k++) {
    const a = Math.random() * 6.28, r = R * (0.3 + Math.random() * 0.7);
    const p2 = new THREE.Vector3(pos.x + Math.cos(a) * r, 0, pos.z + Math.sin(a) * r);
    p2.y = groundAt(p2.x, p2.z);
    setTimeout(() => iceClusterFx(p2, s * 0.6), 60 + k * 50);
  }
  groundDecal(pos.x, pos.z, R * 1.1, 0xdff4ff, 0.55, 6);
  flashLight(pos, 0x7ad4ff, 2.5 + s, 10 + s * 4, 0.35);
  SOUND.ice(s);
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - pos.x, en.pos.y + en.height * 0.5 - pos.y, en.pos.z - pos.z) - en.radius;
    if (en === direct || d < R) damageEnemy(en, power * (en === direct ? 1 : 0.6), 'ice', pos);
  }
}
// 雷（枝分かれする稲妻・画面の閃光・火花・焦げ跡）
function thunderStrike(point, s, power, chains, first, from) {
  const top = from ? from.clone() : point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 26 + s * 12, (Math.random() - 0.5) * 6));
  lightningFx(top, point, 0.1 + s * 0.1, from ? 1 : 3 + Math.min(4, Math.floor(s)));
  const R = aoeRadius('thunder', s);
  spray(PG, 25 + s * 18, point.x, point.y, point.z, { speed: 7 + s * 4, up: 3, life: 0.7, size: 0.05 + s * 0.04, c0: 0xffffff, c1: 0x9ab8ff,
    grav: 12, drag: 0.8, cap: 220 });
  flashLight(point, 0xd8e4ff, Math.min(9, 6 + s), 20 + s * 8, 0.3);
  if (!from) {
    flashSprite(point, 0xe8f0ff, R * 3, 0.2);
    sparkArcs(point, R, 4 + Math.min(8, Math.floor(s * 2)));
    spray(PS, 8 + s * 5, point.x, groundAt(point.x, point.z) + 0.3, point.z, { radius: R * 0.3, speed: 1 + s * 0.5, up: 1.2, life: 1.6,
      size: 0.4 + s * 0.4, grow: 0.8 + s * 0.4, c0: 0x3a3a40, c1: 0x7a7a80, alpha: 0.45, grav: -0.6, drag: 1.5, fade: 1, cap: 60 });
    groundDecal(point.x, point.z, R * 0.8, 0x0c0c14, 0.65, 7);
    groundDecal(point.x, point.z, R * 0.7, 0x8ab0ff, 0.6, 0.5, true);
    shockRing(point.x, point.z, R * 1.4, 0xc8d8ff, 0.35);
    screenFlash(0.18 + Math.min(0.3, s * 0.05));
    shakeCamera(Math.min(0.5, 0.08 + s * 0.06));
    SOUND.thunder(s);
  }
  const hitList = [];
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - point.x, en.pos.z - point.z) - en.radius;
    if (en === first || d < R) { damageEnemy(en, power * (en === first ? 1 : 0.7), 'thunder', point); hitList.push(en); }
  }
  damageArmy(point.x, point.z, R, power, 'thunder', { fling: s > 4 });
  damageStructs(point.x, point.z, R, power * 0.7);
  // 大きく込めた雷は、雷雨となって降り注ぐ
  if (!from) {
    const extra = Math.min(14, Math.floor(s * 0.8));
    for (let k = 0; k < extra; k++) {
      setTimeout(() => {
        const a = Math.random() * 6.28, r = R * (0.4 + Math.random() * 1.4);
        const q = new THREE.Vector3(point.x + Math.cos(a) * r, 0, point.z + Math.sin(a) * r);
        q.y = groundAt(q.x, q.z) + 0.3;
        lightningFx(q.clone().add(new THREE.Vector3(0, 30 + s * 6, 0)), q, 0.08 + s * 0.04, 2);
        spray(PG, 12, q.x, q.y, q.z, { speed: 6, up: 3, life: 0.6, size: 0.08, c0: 0xffffff, c1: 0x9ab8ff, grav: 12, cap: 20 });
        groundDecal(q.x, q.z, R * 0.4, 0x0c0c14, 0.6, 6);
        damageArmy(q.x, q.z, R * 0.45, power * 0.5, 'thunder');
        for (const en of ENEMIES) if (en.alive && en.active && Math.hypot(en.pos.x - q.x, en.pos.z - q.z) < R * 0.45 + en.radius) damageEnemy(en, power * 0.4, 'thunder', q);
        if (k % 3 === 0) SOUND.thunder(s * 0.5);
      }, 90 + k * 70 + Math.random() * 60);
    }
  }
  // 連鎖
  if (chains > 0) {
    let src = hitList[0];
    if (!src) return;
    const done = new Set(hitList);
    for (let c = 0; c < chains; c++) {
      let best = null, bd = 6 + s * 3;
      for (const en of ENEMIES) {
        if (!en.alive || !en.active || done.has(en)) continue;
        const d = Math.hypot(en.pos.x - src.pos.x, en.pos.z - src.pos.z);
        if (d < bd) { bd = d; best = en; }
      }
      if (!best) break;
      done.add(best);
      const a = new THREE.Vector3(src.pos.x, src.pos.y + src.height * 0.5, src.pos.z);
      const b = new THREE.Vector3(best.pos.x, best.pos.y + best.height * 0.5, best.pos.z);
      lightningFx(a, b, 0.04 + s * 0.05, 1);
      spray(PG, 10, b.x, b.y, b.z, { speed: 5, life: 0.5, size: 0.06, c0: 0xffffff, c1: 0x9ab8ff, grav: 10, cap: 20 });
      damageEnemy(best, power * 0.6, 'thunder', b);
      src = best;
    }
  }
}
// 土煙の衝撃（大きな魔物の叩きつけなど）
function dustImpact(pos, R) {
  spray(PS, 30, pos.x, pos.y, pos.z, { radius: R * 0.3, speed: R * 2, up: R * 0.3, life: 1.6, size: R * 0.35, grow: R * 0.4,
    c0: 0x8a7a60, c1: 0xb8a888, alpha: 0.6, drag: 2.5, grav: -0.3, fade: 1, cap: 80 });
  spray(PS, 16, pos.x, pos.y, pos.z, { speed: R * 2 + 3, up: R + 3, upOnly: true, life: 1.1, size: 0.18, c0: 0x4a3a28, alpha: 0.95, grav: 14, cap: 40 });
  shockRing(pos.x, pos.z, R * 1.2, 0xffd8a0, 0.5);
  groundDecal(pos.x, pos.z, R * 0.9, 0x2a2018, 0.5, 5);
}

/* =========================================================
   オーラ（魔力の量がそのまま大きさになる）
   ========================================================= */
const auraMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(0xff9a4a) }, strength: { value: 0.5 }, time: { value: 0 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vN; varying vec3 vV; varying float vY;
    uniform float time;
    void main() {
      vec3 p = position;
      p += normal * sin(position.y * 6.0 + time * 4.0 + position.x * 3.0) * 0.04;
      vY = position.y;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 color; uniform float strength; uniform float time;
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      float f = 1.0 - abs(dot(vN, vV));
      f = pow(f, 2.2);
      float fl = 0.75 + 0.25 * sin(vY * 9.0 - time * 6.0);
      float a = f * strength * fl * smoothstep(-1.0, -0.2, vY);
      gl_FragColor = vec4(color * (1.2 + f), a);
    }`
});
const auraMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), auraMat);
auraMesh.renderOrder = 5;
scene.add(auraMesh);
const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 48), new THREE.MeshBasicMaterial({
  color: 0xff9a4a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
auraRing.rotation.x = -Math.PI / 2;
scene.add(auraRing);
let auraPulse = 0;
const _auraTarget = new THREE.Color();
function updateAura(dt, t) {
  const e = ELEM[STATE.element];
  const base = auraRadius();
  const charge = MAGIC.charging ? (visScale(spellScale(MAGIC.chargeE)) - visScale(spellScale(tapCost()))) * 1.2 : 0;
  auraPulse = Math.max(0, auraPulse - dt * 2);
  const R = base + charge + auraPulse * base * 0.4;
  const col = auraMat.uniforms.color.value;
  col.lerp(_auraTarget.setHex(e.color), Math.min(1, dt * 5));
  auraMat.uniforms.time.value = t;
  auraMat.uniforms.strength.value = 0.35 + (MAGIC.charging ? 0.4 : 0) + auraPulse * 0.5;
  const p = player.pos;
  auraMesh.visible = auraRing.visible = player.root.visible && !CUT.active;
  if (!auraMesh.visible) return;
  auraMesh.position.set(p.x, p.y + 1.1 + (R - 1) * 0.45, p.z);
  auraMesh.scale.set(R * 0.75, R * 1.35, R * 0.75);
  auraRing.position.set(p.x, groundAt(p.x, p.z, p.y) + 0.06, p.z);
  auraRing.scale.setScalar(R * 1.2);
  auraRing.material.color.copy(col);
  auraRing.material.opacity = 0.12 + (MAGIC.charging ? 0.22 : 0) + Math.sin(t * 3) * 0.04;
  // 立ちのぼる光
  const rate = (6 + R * 10) * (MAGIC.charging ? 3 : 1);
  let n = rate * dt;
  while (n > 0) {
    if (n < 1 && Math.random() > n) break;
    n--;
    const a = Math.random() * Math.PI * 2, r = R * (0.4 + Math.random() * 0.5);
    spawnP(p.x + Math.cos(a) * r, p.y + Math.random() * R * 0.8, p.z + Math.sin(a) * r,
      0, 1 + R * 0.8 + Math.random() * R, 0, 0.6 + Math.random() * 0.6, 0.12 + R * 0.06, Math.random() < 0.6 ? e.color : e.c2, 0, 0.5, -0.05);
  }
  player.orb.material.color.setHex(e.c2);
  player.orbGlow.material.color.setHex(e.color);
  player.orbGlow.scale.setScalar(0.9 + (MAGIC.charging ? visScale(spellScale(MAGIC.chargeE)) * 1.2 : 0));
}

/* =========================================================
   オートフォーカス（自動で狙いを定める）
   ========================================================= */
const FOCUS = { on: true, target: null, timer: 0 };
function focusRange() { return 34 + auraRadius() * 5; }
function focusScore(en) {
  const dx = en.pos.x - player.pos.x, dz = en.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  const camAng = cam.yaw + Math.PI;     // カメラの向いている方向
  const ang = angleDiff(Math.atan2(dx, dz), camAng);
  return d * (1 + ang * 0.9) - (en.aggro ? 6 : 0);
}
function focusCandidates() {
  const R = focusRange();
  const out = [];
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    if (Math.hypot(en.pos.x - player.pos.x, en.pos.z - player.pos.z) > R) continue;
    out.push(en);
  }
  return out;
}
function targetValid(t) {
  return t && t.alive && t.active && Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z) < focusRange() * 1.25;
}
function updateFocus(dt) {
  if (!targetValid(FOCUS.target)) FOCUS.target = null;
  if (!FOCUS.on) { if (FOCUS.manual !== true) FOCUS.target = null; return; }
  FOCUS.timer -= dt;
  if (!FOCUS.target && FOCUS.timer <= 0) {
    FOCUS.timer = 0.25;
    let best = null, bs = Infinity;
    for (const en of focusCandidates()) { const s = focusScore(en); if (s < bs) { bs = s; best = en; } }
    FOCUS.target = best;
  }
}
function cycleTarget() {
  const list = focusCandidates().sort((a, b) => focusScore(a) - focusScore(b));
  if (!list.length) { FOCUS.target = null; return; }
  const i = list.indexOf(FOCUS.target);
  FOCUS.target = list[(i + 1) % list.length];
  FOCUS.manual = true;
}

/* =========================================================
   敵の飛び道具
   ========================================================= */
const EPROJ = [];
function enemyShot(from, to, speed, dmg, color, size = 0.5, owner = null) {
  const s = makeGlowSprite(color, size * 3, 1);
  const core = new THREE.Mesh(fxSphereGeo, new THREE.MeshBasicMaterial({ color }));
  core.scale.setScalar(size * 0.6);
  s.add(core);
  s.position.copy(from);
  scene.add(s);
  const vel = to.clone().sub(from).normalize().multiplyScalar(speed);
  EPROJ.push({ obj: s, core, pos: s.position, vel, dmg, color, size, life: 4, owner });
}
function updateEnemyShots(dt) {
  for (let i = EPROJ.length - 1; i >= 0; i--) {
    const p = EPROJ[i];
    p.life -= dt;
    p.pos.addScaledVector(p.vel, dt);
    if (Math.random() < 0.6) spawnP(p.pos.x, p.pos.y, p.pos.z, 0, 0.5, 0, 0.35, p.size * 0.8, p.color);
    const d = Math.hypot(p.pos.x - player.pos.x, p.pos.y - (player.pos.y + 1), p.pos.z - player.pos.z);
    let end = p.life <= 0 || p.pos.y < groundAt(p.pos.x, p.pos.z);
    if (d < 0.8 + p.size) { damagePlayer(p.dmg, p.owner); end = true; }
    if (end) {
      burst(p.pos.x, p.pos.y, p.pos.z, 12, 3, 0.4, p.size * 0.7, p.color);
      scene.remove(p.obj);
      p.obj.material.dispose(); p.core.material.dispose();
      EPROJ.splice(i, 1);
    }
  }
}

/* =========================================================
   木に火がついたり凍ったり（ちょっとした反応）
   ========================================================= */
function scorchTrees(pos, R) {
  if (R < 3) return;
  for (let k = 0; k < Math.min(40, R * 3); k++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * R;
    const x = pos.x + Math.cos(a) * r, z = pos.z + Math.sin(a) * r;
    spawnP(x, groundAt(x, z) + 0.3, z, 0, 1.5 + Math.random() * 2, 0, 1.2 + Math.random(), 0.4 + Math.random() * 0.6, Math.random() < 0.5 ? 0xff7a2a : 0xffb04a, -0.5, 0.8);
  }
}

'use strict';
/* =========================================================
   光の粒（魔法・オーラの演出）
   ========================================================= */
const PMAX = 6000;
const PT = {
  n: 0,
  px: new Float32Array(PMAX), py: new Float32Array(PMAX), pz: new Float32Array(PMAX),
  vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX),
  life: new Float32Array(PMAX), max: new Float32Array(PMAX), size: new Float32Array(PMAX),
  grow: new Float32Array(PMAX), grav: new Float32Array(PMAX), drag: new Float32Array(PMAX),
  r: new Float32Array(PMAX), g: new Float32Array(PMAX), b: new Float32Array(PMAX)
};
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pSize = new Float32Array(PMAX), pAlpha = new Float32Array(PMAX);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcolor', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('psize', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
const pMat = new THREE.ShaderMaterial({
  uniforms: { scale: { value: 400 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float psize; attribute float alpha; attribute vec3 pcolor;
    varying vec3 vC; varying float vA;
    uniform float scale;
    void main() {
      vC = pcolor; vA = alpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = min(psize * scale / max(-mv.z, 0.1), 900.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vC; varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = 1.0 - d * 2.0;
      gl_FragColor = vec4(vC, a * a * vA);
    }`
});
const particles = new THREE.Points(pGeo, pMat);
particles.frustumCulled = false;
scene.add(particles);
const _pc = new THREE.Color();

function spawnP(x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 0, grow = 0) {
  if (PT.n >= PMAX) return;
  const i = PT.n++;
  PT.px[i] = x; PT.py[i] = y; PT.pz[i] = z;
  PT.vx[i] = vx; PT.vy[i] = vy; PT.vz[i] = vz;
  PT.life[i] = PT.max[i] = life; PT.size[i] = size; PT.grow[i] = grow;
  PT.grav[i] = grav; PT.drag[i] = drag;
  _pc.setHex(color);
  PT.r[i] = _pc.r; PT.g[i] = _pc.g; PT.b[i] = _pc.b;
}
function burst(x, y, z, n, speed, life, size, color, grav = 0, spreadY = 1) {
  n = Math.min(n, 400);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1;
    const r = Math.sqrt(1 - u * u), sp = speed * (0.3 + Math.random() * 0.7);
    spawnP(x, y, z, Math.cos(a) * r * sp, u * sp * spreadY, Math.sin(a) * r * sp, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, grav, 1.5);
  }
}
function updateParticles(dt) {
  let i = 0;
  const P = PT;
  while (i < P.n) {
    P.life[i] -= dt;
    if (P.life[i] <= 0) {
      const j = --P.n;
      for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 'size', 'grow', 'grav', 'drag', 'r', 'g', 'b']) P[k][i] = P[k][j];
      continue;
    }
    const dr = Math.exp(-P.drag[i] * dt);
    P.vx[i] *= dr; P.vy[i] = P.vy[i] * dr - P.grav[i] * dt; P.vz[i] *= dr;
    P.px[i] += P.vx[i] * dt; P.py[i] += P.vy[i] * dt; P.pz[i] += P.vz[i] * dt;
    P.size[i] += P.grow[i] * dt;
    pPos[i * 3] = P.px[i]; pPos[i * 3 + 1] = P.py[i]; pPos[i * 3 + 2] = P.pz[i];
    pCol[i * 3] = P.r[i]; pCol[i * 3 + 1] = P.g[i]; pCol[i * 3 + 2] = P.b[i];
    pSize[i] = P.size[i];
    pAlpha[i] = Math.min(1, P.life[i] / P.max[i] * 1.5);
    i++;
  }
  pGeo.setDrawRange(0, P.n);
  for (const k of ['position', 'pcolor', 'psize', 'alpha']) pGeo.attributes[k].needsUpdate = true;
  pMat.uniforms.scale.value = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
}

/* =========================================================
   一時的な演出（爆発・稲妻・氷の結晶など）
   ========================================================= */
const FX = [];
const fxSphereGeo = new THREE.IcosahedronGeometry(1, 2);
function addFx(obj, life, update) {
  scene.add(obj);
  FX.push({ obj, life, max: life, update });
}
function updateFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i];
    f.life -= dt;
    if (f.life <= 0) {
      scene.remove(f.obj);
      f.obj.traverse(o => { if (o.geometry && o.geometry !== fxSphereGeo && !o.geometry.userData.keep) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      FX.splice(i, 1);
      continue;
    }
    f.update(1 - f.life / f.max, dt);
  }
}
function explosionFx(pos, radius, color, color2) {
  const m = new THREE.Mesh(fxSphereGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos);
  const core = new THREE.Mesh(fxSphereGeo, new THREE.MeshBasicMaterial({ color: color2, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.add(core); core.scale.setScalar(0.55);
  addFx(m, 0.55, (t) => {
    const s = radius * (0.25 + 0.95 * (1 - Math.pow(1 - t, 3)));
    m.scale.setScalar(s);
    m.material.opacity = 0.8 * (1 - t);
    core.material.opacity = 0.9 * (1 - t * 1.4);
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, groundAt(pos.x, pos.z) + 0.15, pos.z);
  addFx(ring, 0.6, (t) => { ring.scale.setScalar(radius * (0.3 + 1.4 * t)); ring.material.opacity = 0.7 * (1 - t); });
}
function boltMesh(points, width, color) {
  const pos = [];
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    d.subVectors(b, a).normalize();
    p1.crossVectors(d, Math.abs(d.y) > 0.9 ? tmpV3.set(1, 0, 0) : up).normalize().multiplyScalar(width);
    p2.crossVectors(d, p1).normalize().multiplyScalar(width);
    for (const p of [p1, p2]) {
      pos.push(a.x - p.x, a.y - p.y, a.z - p.z, a.x + p.x, a.y + p.y, a.z + p.z, b.x + p.x, b.y + p.y, b.z + p.z);
      pos.push(a.x - p.x, a.y - p.y, a.z - p.z, b.x + p.x, b.y + p.y, b.z + p.z, b.x - p.x, b.y - p.y, b.z - p.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
}
function lightningFx(from, to, width) {
  const pts = [];
  const n = 12;
  const L = from.distanceTo(to);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3().lerpVectors(from, to, t);
    if (i > 0 && i < n) p.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.5, (Math.random() - 0.5)).multiplyScalar(L * 0.09));
    pts.push(p);
  }
  const g = new THREE.Group();
  g.add(boltMesh(pts, width * 2.4, 0xffd84a), boltMesh(pts, width, 0xffffff));
  addFx(g, 0.32, (t) => {
    g.children.forEach(c => { c.material.opacity = (1 - t) * (Math.random() < 0.3 ? 0.4 : 1); });
  });
}
function iceBurstFx(pos, s) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcff4ff, emissive: 0x4ab8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, flatShading: true });
  const geo = new THREE.ConeGeometry(0.25, 1.2, 5);
  for (let k = 0; k < 8; k++) {
    const m = new THREE.Mesh(geo, mat);
    const a = k / 8 * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    m.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(m);
  }
  g.position.copy(pos);
  addFx(g, 0.8, (t) => {
    g.scale.setScalar(s * 2.2 * Math.min(1, t * 6));
    mat.opacity = 0.9 * (1 - Math.max(0, t - 0.5) * 2);
  });
}

/* =========================================================
   属性と詠唱
   ========================================================= */
const ELEM = {
  fire:    { name: '炎', spell: 'ファイア', color: 0xff7a2a, c2: 0xffe08a, css: '#ff8a3a', mult: 2.4 },
  ice:     { name: '氷', spell: 'フロスト', color: 0x7ad4ff, c2: 0xe8fbff, css: '#7ad4ff', mult: 2.1 },
  thunder: { name: '雷', spell: 'スパーク', color: 0xffe45a, c2: 0xffffff, css: '#ffe45a', mult: 2.2 }
};
const MAGIC = { charging: false, chargeE: 0, chargeT: 0, cooldown: 0, projectiles: [] };

function tapCost() { return STATE.aura * 0.06; }
// 魔法の大きさ（込めた魔力で上限なく大きくなる）
function spellScale(E) { return 0.35 * Math.pow(Math.max(E, 1) / 6, 0.45); }
function auraRadius() { return 0.95 + 0.4 * (Math.sqrt(STATE.aura / 100) - 1); }

function beginCast() {
  if (GAME.paused || MAGIC.charging || GAME.dead) return;
  const c = tapCost();
  if (STATE.mp < c) { toast('魔力が足りない…（少し休むと回復する）'); return; }
  STATE.mp -= c;
  MAGIC.charging = true; MAGIC.chargeE = c; MAGIC.chargeT = 0;
}
function cancelCast() {
  if (!MAGIC.charging) return;
  STATE.mp = Math.min(STATE.aura, STATE.mp + MAGIC.chargeE);
  MAGIC.charging = false; MAGIC.chargeE = 0;
}
function releaseCast() {
  if (!MAGIC.charging) return;
  MAGIC.charging = false;
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
  const s = spellScale(MAGIC.chargeE);
  const R = 0.6 + s * 2;
  for (let k = 0; k < 2 + Math.min(10, s * 3); k++) {
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    spawnP(o.x + Math.cos(a) * r * R, o.y + u * R, o.z + Math.sin(a) * r * R,
      -Math.cos(a) * r * R * 3, -u * R * 3, -Math.sin(a) * r * R * 3, 0.3, 0.1 + s * 0.08, Math.random() < 0.5 ? e.color : e.c2);
  }
  // 向き
  const tgt = FOCUS.target;
  if (tgt) { player.faceTo = Math.atan2(tgt.pos.x - player.pos.x, tgt.pos.z - player.pos.z); player.faceTimer = 0.3; }
  else { player.faceTo = cam.yaw + Math.PI; player.faceTimer = 0.3; }
}

function aimDirection(from, out) {
  const tgt = FOCUS.target;
  if (tgt) return out.set(tgt.pos.x, tgt.pos.y + tgt.height * 0.5, tgt.pos.z).sub(from).normalize();
  camera.getWorldDirection(out);
  const far = tmpV2.copy(camera.position).addScaledVector(out, 60);
  return out.copy(far).sub(from).normalize();
}

function castSpell(el, E) {
  const e = ELEM[el];
  const s = spellScale(E);
  const power = E * STATE.staffMult * e.mult;
  const from = player.orbWorld(new THREE.Vector3());
  const dir = aimDirection(from, new THREE.Vector3());
  player.castAnim = 1;
  player.faceTo = Math.atan2(dir.x, dir.z); player.faceTimer = 0.35;
  flashLight(from, e.color, 2 + s, 8 + s * 6, 0.25);
  burst(from.x, from.y, from.z, 10 + s * 6, 3 + s * 2, 0.35, 0.2 + s * 0.2, e.c2);
  SOUND.cast(el, s);
  if (el === 'fire') {
    MAGIC.projectiles.push(makeProjectile('fire', from, dir, s, power));
  } else if (el === 'ice') {
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    for (const off of [-1, 0, 1]) {
      const d = dir.clone().addScaledVector(side, off * 0.09).normalize();
      MAGIC.projectiles.push(makeProjectile('ice', from.clone().addScaledVector(side, off * 0.3 * (1 + s)), d, s * 0.75, power / 3 * 1.1));
    }
  } else {
    let point;
    const tgt = FOCUS.target;
    if (tgt) point = new THREE.Vector3(tgt.pos.x, tgt.pos.y + tgt.height * 0.5, tgt.pos.z);
    else {
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      const r = 14 + s * 4;
      point = new THREE.Vector3(player.pos.x + fx * r, 0, player.pos.z + fz * r);
      point.y = groundAt(point.x, point.z) + 0.5;
    }
    thunderStrike(point, s, power, 2, tgt || null, null);
  }
}

function makeProjectile(kind, from, dir, s, power) {
  const e = kind === 'fire' ? ELEM.fire : ELEM.ice;
  let mesh;
  if (kind === 'fire') {
    mesh = new THREE.Mesh(fxSphereGeo, new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    mesh.scale.setScalar(s);
    mesh.add(makeGlowSprite(0xff7a2a, 4.2, 0.95));
  } else {
    mesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0xdff8ff, emissive: 0x5ac8ff, emissiveIntensity: 0.8, flatShading: true }));
    mesh.scale.setScalar(s * 1.4);
    mesh.add(makeGlowSprite(0x7ad4ff, 2.2, 0.7));
  }
  mesh.position.copy(from);
  scene.add(mesh);
  const speed = kind === 'fire' ? 24 + s * 3 : 32 + s * 3;
  return { kind, mesh, pos: mesh.position, vel: dir.clone().multiplyScalar(speed), speed, s, power, life: 2.6 + s * 0.2, target: FOCUS.target, e };
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
    if (p.kind === 'ice') p.mesh.quaternion.setFromUnitVectors(tmpV2.set(0, 1, 0), tmpV3.copy(p.vel).normalize());
    // 軌跡
    const n = 1 + Math.min(6, Math.floor(p.s * 2));
    for (let k = 0; k < n; k++) {
      const j = p.s * 0.6;
      spawnP(p.pos.x + (Math.random() - 0.5) * j, p.pos.y + (Math.random() - 0.5) * j, p.pos.z + (Math.random() - 0.5) * j,
        (Math.random() - 0.5), (Math.random() - 0.2) * (p.kind === 'fire' ? 2 : 0.5), (Math.random() - 0.5),
        p.kind === 'fire' ? 0.45 : 0.35, (0.25 + Math.random() * 0.3) * (1 + p.s), Math.random() < 0.5 ? p.e.color : p.e.c2, p.kind === 'fire' ? -1.5 : 0.5, 1);
    }
    let hit = null;
    for (const en of ENEMIES) {
      if (!en.alive || !en.active) continue;
      const dy = (en.pos.y + en.height * 0.5) - p.pos.y;
      const d = Math.hypot(en.pos.x - p.pos.x, dy * 0.8, en.pos.z - p.pos.z);
      if (d < en.radius + p.s * 0.8) { hit = en; break; }
    }
    const ground = groundAt(p.pos.x, p.pos.z);
    if (hit || p.pos.y < ground || p.life <= 0) {
      if (p.kind === 'fire') fireExplode(p.pos.clone(), p.s, p.power, hit);
      else iceHit(p.pos.clone(), p.s, p.power, hit);
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      if (p.kind === 'ice') p.mesh.geometry.dispose();
      list.splice(i, 1);
    }
  }
}

function fireExplode(pos, s, power, direct) {
  const R = 1.4 + 2.6 * s;
  explosionFx(pos, R, 0xff5a1a, 0xffc070);
  burst(pos.x, pos.y, pos.z, 30 + s * 20, 5 + s * 5, 0.7, 0.35 + s * 0.35, 0xff9a3a, -2);
  burst(pos.x, pos.y, pos.z, 12 + s * 8, 3 + s * 3, 1.0, 0.5 + s * 0.4, 0x5a4a44, -1.2);
  flashLight(pos, 0xff8a3a, 4 + s * 2, 14 + R * 3, 0.45);
  shakeCamera(Math.min(0.5, 0.06 + s * 0.05));
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
function iceHit(pos, s, power, direct) {
  iceBurstFx(pos, s);
  burst(pos.x, pos.y, pos.z, 16 + s * 10, 3 + s * 3, 0.6, 0.25 + s * 0.3, 0xcff4ff, 3);
  flashLight(pos, 0x7ad4ff, 2 + s, 10 + s * 4, 0.3);
  SOUND.ice(s);
  const R = 0.8 + 1.2 * s;
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - pos.x, en.pos.y + en.height * 0.5 - pos.y, en.pos.z - pos.z) - en.radius;
    if (en === direct || d < R) damageEnemy(en, power * (en === direct ? 1 : 0.6), 'ice', pos);
  }
}
function thunderStrike(point, s, power, chains, first, from) {
  const top = from ? from.clone() : point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 22 + s * 10, (Math.random() - 0.5) * 3));
  lightningFx(top, point, 0.08 + s * 0.12);
  burst(point.x, point.y, point.z, 18 + s * 12, 6 + s * 4, 0.45, 0.25 + s * 0.3, 0xfff08a, 4);
  flashLight(point, 0xfff0a0, 5 + s * 2, 16 + s * 6, 0.25);
  if (!from) { shakeCamera(Math.min(0.45, 0.05 + s * 0.05)); SOUND.thunder(s); }
  const R = 0.9 + 1.6 * s;
  const hitList = [];
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - point.x, en.pos.z - point.z) - en.radius;
    if (en === first || d < R) { damageEnemy(en, power * (en === first ? 1 : 0.7), 'thunder', point); hitList.push(en); }
  }
  if (!from) {
    const g = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 32), new THREE.MeshBasicMaterial({ color: 0xfff08a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(point.x, groundAt(point.x, point.z) + 0.1, point.z);
    addFx(g, 0.4, (t) => { g.scale.setScalar(R * (0.4 + t * 1.2)); g.material.opacity = 0.8 * (1 - t); });
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
      lightningFx(a, b, 0.05 + s * 0.07);
      damageEnemy(best, power * 0.6, 'thunder', b);
      src = best;
    }
  }
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
  const charge = MAGIC.charging ? spellScale(MAGIC.chargeE) * 1.6 : 0;
  auraPulse = Math.max(0, auraPulse - dt * 2);
  const R = base + charge + auraPulse * base * 0.4;
  const col = auraMat.uniforms.color.value;
  col.lerp(_auraTarget.setHex(e.color), Math.min(1, dt * 5));
  auraMat.uniforms.time.value = t;
  auraMat.uniforms.strength.value = 0.35 + (MAGIC.charging ? 0.4 : 0) + auraPulse * 0.5;
  const p = player.pos;
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
  player.orbGlow.scale.setScalar(0.9 + (MAGIC.charging ? spellScale(MAGIC.chargeE) * 3 : 0));
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

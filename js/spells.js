'use strict';
/* =========================================================
   大魔導の魔法（水・重力・樹木・光・闇）
   どの魔法も「自国の人と物は決して傷つけない」守りの術式がかかっている。
   当たるのは帝国の兵・魔物・帝国の建物だけ。
   ========================================================= */
function hurtEnemiesAround(x, z, R, power, el, o = {}) {
  let n = 0;
  for (const en of ENEMIES) {
    if (!en.alive || !en.active) continue;
    const d = Math.hypot(en.pos.x - x, en.pos.z - z) - en.radius;
    if (d > R) continue;
    damageEnemy(en, power * (1 - 0.4 * clamp(d / R, 0, 1)), el, new THREE.Vector3(x, 0, z));
    if (o.stun) en.stun = Math.max(en.stun, o.stun);
    if (o.slow) en.slow = Math.max(en.slow, o.slow);
    n++;
  }
  return n;
}

/* ---------- 水「大海嘯」：前方をすべて押し流す大波 ---------- */
function waveGeometry(w, h) {
  const g = new THREE.PlaneGeometry(1, 1, 24, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;     // u: -0.5..0.5, v: 0..1
    const curl = Math.sin(v * Math.PI * 0.85);
    p.setXYZ(i, u * w, v * h * (1 - 0.15 * Math.abs(u) * 2), curl * h * 0.55 - (1 - v) * h * 0.2);
  }
  g.computeVertexNormals();
  return g;
}
function castTidalWave(from, dir, s, power) {
  const d = new THREE.Vector3(dir.x, 0, dir.z).normalize();
  const W = 10 + s * 3.2, H = 2.5 + s * 0.7, L = 30 + s * 7, T = 1.0 + Math.min(1.2, s * 0.04);
  const ox = player.pos.x + d.x * 2, oz = player.pos.z + d.z * 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f6ab8, emissive: 0x0a2a4a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const wave = new THREE.Mesh(waveGeometry(W, H), mat);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.25), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  foam.position.set(0, H * 0.95, H * 0.4); foam.rotation.x = -0.6;
  wave.add(foam);
  wave.rotation.y = Math.atan2(d.x, d.z);
  let prev = 0;
  const hitE = new Set();
  let structT = 0;
  addFx(wave, T, (t, dt) => {
    const dist = L * t;
    const x = ox + d.x * dist, z = oz + d.z * dist;
    const gy = groundAt(x, z);
    wave.position.set(x, gy - 0.2, z);
    wave.scale.set(1, 0.7 + 0.3 * Math.sin(t * Math.PI), 1);
    mat.opacity = 0.82 * Math.min(1, (1 - t) * 4);
    // しぶき
    for (let k = 0; k < Math.min(18, 6 + s); k++) {
      const u = (Math.random() - 0.5) * W;
      const px = x - d.z * u, pz = z + d.x * u;
      PS.spawn(px, gy + H * (0.6 + Math.random() * 0.5), pz, d.x * 6 + (Math.random() - 0.5) * 3, 2 + Math.random() * 3, d.z * 6 + (Math.random() - 0.5) * 3,
        0.8, 0.3 + s * 0.08, 0xffffff, 0xa8d8ff, 0.8, 9, 0.8, 0.5);
    }
    // 通り過ぎたところにいる敵を押し流す
    const from = prev, to = dist + 2;
    prev = dist;
    damageArmyBand(ox, oz, d.x, d.z, from, to, W / 2, power, 'water');
    for (const en of ENEMIES) {
      if (!en.alive || !en.active || hitE.has(en)) continue;
      const rx = en.pos.x - ox, rz = en.pos.z - oz;
      const along = rx * d.x + rz * d.z, lat = Math.abs(-rx * d.z + rz * d.x);
      if (along > from - 1 && along < to + en.radius && lat < W / 2 + en.radius) {
        hitE.add(en);
        damageEnemy(en, power, 'water', new THREE.Vector3(x, 0, z));
        if (!en.T.boss) { en.pos.x += d.x * Math.min(12, 4 + s); en.pos.z += d.z * Math.min(12, 4 + s); }
        en.slow = Math.max(en.slow, 3);
      }
    }
    structT -= dt || 0;
    if (structT <= 0) { structT = 0.12; damageStructs(x, z, W / 2, power * 0.6); }
    if (t > 0.96) {
      spray(PS, 30 + s * 6, x, gy + H * 0.5, z, { radius: W * 0.3, speed: 6 + s, up: 5, life: 1.2, size: 0.4 + s * 0.1, c0: 0xffffff, c1: 0x9ad0f0, alpha: 0.8, grav: 10, drag: 0.8, cap: 120 });
    }
  });
  // 足元の濡れた跡
  for (let k = 0; k < 6; k++) { const f = (k + 0.5) / 6 * L; setTimeout(() => groundDecal(ox + d.x * f, oz + d.z * f, W * 0.35, 0x0a1a2a, 0.35, 6), f / L * T * 1000); }
  shakeCamera(Math.min(0.4, 0.1 + s * 0.03));
  SOUND.wave(s);
}
// 帯状の範囲（大波の通り道）にいる兵を倒す
function damageArmyBand(ox, oz, dx, dz, from, to, halfW, power, el) {
  const cx = ox + dx * (from + to) / 2, cz = oz + dz * (from + to) / 2;
  const R = Math.hypot((to - from) / 2, halfW) + 1;
  let killed = 0;
  for (const g of ARMY.groups) {
    if (g.ally || !g.active) continue;
    if (Math.hypot(g.x - cx, g.z - cz) > g.r + R + 60) continue;
    for (const u of g.units) {
      if (!u.alive) continue;
      const rx = u.x - ox, rz = u.z - oz;
      const along = rx * dx + rz * dz, lat = Math.abs(-rx * dz + rz * dx);
      if (along < from - 1 || along > to || lat > halfW) continue;
      u.hp -= power;
      if (u.hp <= 0) { killUnit(u, el, u.x - dx, u.z - dz, 0, 10, { push: { dx, dz, force: 1.4 } }); killed++; }
      else { u.x += dx * 3; u.z += dz * 3; }
    }
  }
  if (killed) {
    ARMY.kills += killed; STATE.kills = (STATE.kills || 0) + killed;
    gainExp(killed * 3); STATE.gold += killed * 2;
    if (killed >= 3) popNumber(cx, groundAt(cx, cz) + 4, cz, `${fmt(killed)}人 撃破`, '#9ad0ff', 'weak');
    onArmyKilled(killed);
  }
  return killed;
}

/* ---------- 重力「崩星」：一点に引きずり込み、押し潰す ---------- */
function castGravity(point, s, power) {
  const R = aoeRadius('fire', s) * 1.05;
  const gy = groundAt(point.x, point.z);
  const c = new THREE.Vector3(point.x, gy + Math.min(R * 0.35, 3 + s * 0.6), point.z);
  const g = new THREE.Group();
  const core = new THREE.Mesh(fxSphereGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const rim = makeGlowSprite(0x8a4aff, 1, 0.9);
  const rim2 = makeGlowSprite(0x2a0a5a, 1, 1);
  rim2.material.blending = THREE.NormalBlending;
  g.add(rim2, rim, core);
  g.position.copy(c);
  let collapsed = false;
  const vs = visScale(s);
  addFx(g, 1.35, (t, dt) => {
    const grow = Math.min(1, t / 0.6);
    core.scale.setScalar(vs * 0.9 * grow * (t > 0.7 ? Math.max(0.01, 1 - (t - 0.7) * 5) : 1));
    rim.scale.setScalar(vs * 5 * grow); rim2.scale.setScalar(vs * 3.6 * grow);
    rim.material.opacity = 0.9 * (1 - Math.max(0, t - 0.75) * 4);
    rim2.material.opacity = rim.material.opacity;
    if (!collapsed) {
      // 周りの物を引き寄せる
      pullArmy(c.x, c.z, R * 1.3, 10 + s * 2, dt || 0.016);
      for (const en of ENEMIES) {
        if (!en.alive || !en.active || en.T.boss) continue;
        const dx = c.x - en.pos.x, dz = c.z - en.pos.z, d = Math.hypot(dx, dz);
        if (d < R * 1.3 && d > 0.5) { const k = (8 + s) * (dt || 0.016); en.pos.x += dx / d * Math.min(d, k); en.pos.z += dz / d * Math.min(d, k); }
      }
      for (let k = 0; k < Math.min(10, 3 + s); k++) {
        const a = Math.random() * 6.28, r = R * (0.6 + Math.random() * 0.6);
        const px = c.x + Math.cos(a) * r, pz = c.z + Math.sin(a) * r;
        PS.spawn(px, groundAt(px, pz) + 0.3, pz, -Math.cos(a) * r * 1.2, 2 + Math.random() * 4, -Math.sin(a) * r * 1.2,
          0.8, 0.12 + s * 0.04, 0x5a4a3a, 0x2a2018, 0.95, -1, 0.6);
      }
      if (t > 0.72) {
        collapsed = true;
        gravityCollapse(c, gy, R, s, power);
      }
    }
  });
  SOUND.gravity(s);
}
function gravityCollapse(c, gy, R, s, power) {
  deformCrater(c.x, c.z, R * 0.75, R * 0.24);
  hurtEnemiesAround(c.x, c.z, R, power, 'gravity', { stun: 0.8 });
  damageArmy(c.x, c.z, R, power, 'gravity');
  damageStructs(c.x, c.z, R, power * 1.2);
  shockRing(c.x, c.z, R * 1.8, 0xa47aff, 0.6);
  spray(PS, 40 + s * 10, c.x, gy + 0.5, c.z, { radius: R * 0.8, speed: R * 1.2, up: R * 0.4, life: 2.2, size: R * 0.25, grow: R * 0.2,
    c0: 0x6a5a4a, c1: 0x9a8a78, alpha: 0.6, grav: -0.5, drag: 1.8, fade: 1, cap: 200 });
  spray(PS, 30 + s * 6, c.x, gy + 0.3, c.z, { radius: R * 0.5, speed: R, up: R * 0.8 + 6, upOnly: true, life: 1.6, size: 0.2 + s * 0.05,
    c0: 0x3a2e24, c1: 0x2a2018, alpha: 0.95, grav: 16, drag: 0.4, cap: 140 });
  flashSprite(c, 0xb08aff, R * 2, 0.25);
  groundDecal(c.x, c.z, R * 1.1, 0x0a0610, 0.7, 12);
  shakeCamera(Math.min(0.7, 0.15 + s * 0.05));
  screenFlash(0.15, '#c8a8ff');
  SOUND.boom(s * 1.3);
}

/* ---------- 樹木「千年樹」：大地から無数の根と棘が突き上がる ---------- */
function castWood(point, s, power) {
  const R = aoeRadius('ice', s) * 1.3;
  const n = Math.min(34, 9 + Math.floor(s * 2));
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.8, flatShading: true });
  const geo = new THREE.ConeGeometry(1, 1, 6);
  const roots = [];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, r = k === 0 ? 0 : R * Math.sqrt(Math.random());
    const x = point.x + Math.cos(a) * r, z = point.z + Math.sin(a) * r;
    const h = (2.5 + s * 1.1) * (k === 0 ? 2 : 0.6 + Math.random() * 0.8);
    const w = h * 0.12;
    const m = new THREE.Mesh(geo, Math.random() < 0.2 ? leaf : mat);
    m.position.set(x, groundAt(x, z), z);
    m.rotation.set((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9);
    m.userData = { h, w, delay: Math.random() * 0.15 };
    m.scale.set(w, 0.01, w);
    g.add(m); roots.push(m);
  }
  let hit = false;
  addFx(g, 3.2, (t) => {
    const T = t * 3.2;
    for (const m of roots) {
      const u = clamp((T - m.userData.delay) / 0.18, 0, 1);
      const sink = T > 2.6 ? (T - 2.6) / 0.6 : 0;
      const e = (1 - Math.pow(1 - u, 3)) * (1 - sink);
      m.scale.set(m.userData.w, Math.max(0.01, m.userData.h * e), m.userData.w);
      m.position.y = groundAt(m.position.x, m.position.z) + m.userData.h * e * 0.5 - 0.3;
    }
    if (!hit && T > 0.12) {
      hit = true;
      hurtEnemiesAround(point.x, point.z, R, power, 'wood', { stun: 2.2 });
      damageArmy(point.x, point.z, R, power, 'wood');
      damageStructs(point.x, point.z, R, power);
      spray(PS, 30 + s * 6, point.x, groundAt(point.x, point.z) + 0.5, point.z, { radius: R * 0.8, speed: 4 + s, up: 5, life: 1.3, size: 0.25 + s * 0.06,
        c0: 0x4a3a28, c1: 0x2a2018, alpha: 0.95, grav: 12, drag: 0.5, cap: 120 });
      spray(PS, 20 + s * 4, point.x, groundAt(point.x, point.z) + 2, point.z, { radius: R * 0.7, speed: 2, up: 2, life: 2.5, size: 0.15, c0: 0x6ab83a, c1: 0x3a6a1a, alpha: 0.9, grav: 1.5, drag: 1.5, cap: 80 });
      shakeCamera(Math.min(0.5, 0.1 + s * 0.04));
      SOUND.wood(s);
    }
  });
  groundDecal(point.x, point.z, R, 0x1a1208, 0.5, 10);
}

/* ---------- 光「天照」：天から降り注ぐ光の柱が、すべてを灰に変える ---------- */
function castLight(point, s, power) {
  const R = aoeRadius('fire', s) * 0.9;
  const pillars = [{ x: point.x, z: point.z, r: R * 0.55, main: true }];
  for (let k = 0; k < Math.min(8, Math.floor(s / 3)); k++) {
    const a = k / Math.max(1, Math.floor(s / 3)) * 6.28, r = R * 1.1;
    pillars.push({ x: point.x + Math.cos(a) * r, z: point.z + Math.sin(a) * r, r: R * 0.3 });
  }
  pillars.forEach((P, i) => setTimeout(() => lightPillar(P, s, power * (P.main ? 1 : 0.6), R), i * 110));
  screenFlash(0.28, '#fff6d0');
  SOUND.light(s);
}
function lightPillar(P, s, power, R) {
  const gy = groundAt(P.x, P.z);
  const g = new THREE.Group();
  const H = 260;
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(outer, inner);
  g.position.set(P.x, gy + H / 2, P.z);
  let tick = 0;
  addFx(g, 1.1, (t, dt) => {
    const open = Math.min(1, t / 0.12), close = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    outer.scale.set(P.r * open * (1 + t * 0.3), H, P.r * open * (1 + t * 0.3));
    inner.scale.set(P.r * 0.4 * open * close, H, P.r * 0.4 * open * close);
    outer.material.opacity = 0.35 * close; inner.material.opacity = 0.9 * close;
    tick -= dt || 0.016;
    if (tick <= 0 && t < 0.8) {
      tick = 0.2;
      hurtEnemiesAround(P.x, P.z, P.r * 1.3, power * 0.35, 'light');
      damageArmy(P.x, P.z, P.r * 1.3, power * 0.4, 'light');
      damageStructs(P.x, P.z, P.r * 1.3, power * 0.4);
    }
    for (let k = 0; k < 4; k++) {
      const a = Math.random() * 6.28, r = P.r * Math.random();
      PG.spawn(P.x + Math.cos(a) * r, gy + Math.random() * 2, P.z + Math.sin(a) * r, 0, 6 + Math.random() * 10, 0, 1.2, 0.12 + s * 0.02, 0xffffff, 0xffe080, 1, -2, 0.3);
    }
  });
  if (P.main) { flashSprite(new THREE.Vector3(P.x, gy + 2, P.z), 0xfff4c0, R * 2.4, 0.3); shockRing(P.x, P.z, R * 1.5, 0xfff0a0, 0.6); }
  groundDecal(P.x, P.z, P.r * 1.2, 0xfff0b0, 0.7, 1.5, true);
  groundDecal(P.x, P.z, P.r * 1.1, 0x2a2418, 0.5, 10);
  flashLight(new THREE.Vector3(P.x, gy + 4, P.z), 0xfff0c0, 6, 30 + R * 2, 0.6);
}

/* ---------- 闇「深淵」：影の底なし沼が、敵を呑み込む ---------- */
function castDark(point, s, power) {
  const R = aoeRadius('fire', s);
  const gy = groundAt(point.x, point.z);
  const g = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x050008, transparent: true, opacity: 0.92, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  pool.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.05, 48), new THREE.MeshBasicMaterial({ color: 0x9a3ae8, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2;
  g.add(pool, rim);
  g.position.set(point.x, gy + 0.12, point.z);
  const tMat = new THREE.MeshBasicMaterial({ color: 0x0a0010 });
  const tGeo = new THREE.ConeGeometry(1, 1, 5);
  const tendrils = [];
  for (let k = 0; k < Math.min(24, 8 + s); k++) {
    const m = new THREE.Mesh(tGeo, tMat);
    const a = Math.random() * 6.28, r = Math.random() * 0.85;
    m.userData = { a, r, h: (2 + s * 0.8) * (0.5 + Math.random()), ph: Math.random() * 6 };
    g.add(m); tendrils.push(m);
  }
  let tick = 0;
  addFx(g, 2.2, (t, dt) => {
    const T = t * 2.2;
    const open = Math.min(1, T / 0.3), close = T > 1.8 ? 1 - (T - 1.8) / 0.4 : 1;
    const rr = R * open * close;
    pool.scale.setScalar(Math.max(0.01, rr)); rim.scale.setScalar(Math.max(0.01, rr));
    for (const m of tendrils) {
      const u = m.userData;
      const h = u.h * open * close * (0.7 + 0.3 * Math.sin(T * 4 + u.ph));
      m.scale.set(0.15 * h, Math.max(0.01, h), 0.15 * h);
      m.position.set(Math.cos(u.a) * u.r * rr, h / 2, Math.sin(u.a) * u.r * rr);
      m.rotation.set(Math.sin(T * 3 + u.ph) * 0.4, 0, Math.cos(T * 2.6 + u.ph) * 0.4);
    }
    for (let k = 0; k < 5; k++) {
      const a = Math.random() * 6.28, r = rr * Math.random();
      PS.spawn(point.x + Math.cos(a) * r, gy + 0.3, point.z + Math.sin(a) * r, 0, 1.5 + Math.random() * 2, 0, 1.4, 0.4 + s * 0.08, 0x2a0a3a, 0x05000a, 0.7, -0.5, 0.6, 0.8, 1);
    }
    tick -= dt || 0.016;
    if (tick <= 0 && T < 1.9) {
      tick = 0.25;
      hurtEnemiesAround(point.x, point.z, rr, power * 0.28, 'dark', { slow: 2 });
      damageArmy(point.x, point.z, rr, power * 0.3, 'dark');
      damageStructs(point.x, point.z, rr, power * 0.3);
    }
  });
  flashSprite(new THREE.Vector3(point.x, gy + 1, point.z), 0x6a1aaa, R * 1.6, 0.4);
  shakeCamera(Math.min(0.35, 0.08 + s * 0.03));
  SOUND.dark(s);
}

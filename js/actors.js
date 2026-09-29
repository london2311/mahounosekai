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

/* =========================================================
   主人公（見習い魔法使い）
   ========================================================= */
class Player {
  constructor() {
    this.root = new THREE.Group();
    // 王国魔法師団長の礼装（黒と群青の長衣、金の縁取り、白銀の髪、長い外套）
    const trim = 0xd9b34a;
    const m = buildHumanoid({ skin: 0xeac4a0, hair: 0xe8ecf0, hairStyle: 'long', female: false, top: 0x161c30, bottom: 0x14141c,
      dress: 0x161c30, dressTrim: trim, cape: 0x0c0e1a, belt: 0x3a2a1a, shoes: 0x14141c, cuff: trim, brow: 0xc8ccd4, eyeGlow: undefined });
    this.m = m;
    this.model = m.model;
    this.root.add(m.root);
    this.body = m.body;
    const b = m.rig.bones;
    this.armL = b.uArmL; this.armR = b.uArmR; this.legL = b.thighL; this.legR = b.thighR;
    // 金の肩章と胸の紋章（胸の骨につける）
    const deco = new SmoothBuilder();
    for (const s of [-1, 1]) { deco.ellip(s * 0.2, 0.37, 0, 0.1, 0.045, 0.1, 0x2a2e44); deco.torus(s * 0.2, 0.395, 0, 0.1, 0.008, trim, Math.PI / 2); }
    deco.box(0, 0.22, 0.12, 0.05, 0.07, 0.01, trim);
    deco.cyl(0, 0.43, -0.01, 0.1, 0.11, 0.08, 0x161c30, 14);
    const decoMesh = new THREE.Mesh(deco.geometry(false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
    decoMesh.castShadow = true;
    b.chest.add(decoMesh);
    // 杖（右手に持つ）と先の宝珠
    this.staff = new THREE.Group();
    const hand = m.rig.J[6];
    this.staff.position.set(0.012, -0.31, 0.03);
    this.staff.scale.setScalar(0.72);
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
    b.fArmR.add(this.staff);
    void hand;
    scene.add(this.root);

    this.pos = new THREE.Vector3(CONFIG.spawn.x, 0, CONFIG.spawn.z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.inWater = false;
    this.flying = false;
    this.facing = Math.PI;
    this.phase = 0;
    this.radius = 0.45;
    this.castAnim = 0;
    this.hurtT = 0;
    this.pose = '';
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
  // 空を飛ぶ／降りる
  setFlying(on) {
    if (on === this.flying) return;
    if (on && GAME.inDungeon) { toast('ここでは飛べない'); return; }
    this.flying = on;
    this.vy = on ? 6 : 0;
    this.onGround = false;
    if (on) { SOUND.jump(); burst(this.pos.x, this.pos.y + 0.3, this.pos.z, 40, 5, 0.6, 0.3, ELEM[STATE.element].c2, -1); shockRing(this.pos.x, this.pos.z, 4, ELEM[STATE.element].color, 0.5); }
    setFlyUI();
  }
  altitude() { return this.pos.y - this.floorAt(this.pos.x, this.pos.z); }
  setPose(p) { if (this.pose === p) return; this.pose = p; setRigPose(this.m, p); }
  update(dt, input, camYaw, time, charging) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let mx = fx * input.y + rx * input.x, mz = fz * input.y + rz * input.x;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const p = this.pos;

    const g = groundAt(p.x, p.z, p.y);
    this.inWater = !this.flying && waterAt(p.x, p.z) - g > 1.0;
    let speed = (input.run ? CONFIG.runSpeed : CONFIG.walkSpeed) * (this.inWater ? 0.55 : 1);
    if (this.flying) speed = input.run ? 46 : 22;
    if (charging) speed *= 0.45;
    speed *= STATE.speedMul || 1;
    const k = 1 - Math.exp(-(this.onGround || this.flying ? (this.flying ? 4 : 12) : 3) * dt);
    this.vel.x = lerp(this.vel.x, mx * speed, k);
    this.vel.z = lerp(this.vel.z, mz * speed, k);

    const nx = p.x + this.vel.x * dt, nz = p.z + this.vel.z * dt;
    const checkSlope = this.onGround && !this.inWater && !this.flying;
    if (!checkSlope || this.canStep(p.x, p.z, nx, nz)) { p.x = nx; p.z = nz; }
    else if (this.canStep(p.x, p.z, nx, p.z)) { p.x = nx; this.vel.z = 0; }
    else if (this.canStep(p.x, p.z, p.x, nz)) { p.z = nz; this.vel.x = 0; }
    else { this.vel.x = this.vel.z = 0; }

    // 高く飛んでいる時は建物の上を越えられる
    if (!this.flying || this.altitude() < 7) resolveCollisions(p, this.radius);
    if (!GAME.inDungeon) {
      const lim = HALF - 8;
      p.x = clamp(p.x, -lim, lim);
      p.z = clamp(p.z, -lim, lim);
    }

    if (this.flying) {
      // 上昇・下降・その場に浮く
      const want = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      this.vy = lerp(this.vy, want * (input.run ? 26 : 14), 1 - Math.exp(-5 * dt));
      p.y += this.vy * dt + Math.sin(time * 2.2) * 0.004;
      const floor = this.floorAt(p.x, p.z);
      const top = floor + 260;
      if (p.y > top) { p.y = top; this.vy = Math.min(0, this.vy); }
      if (p.y <= floor + 0.05) {
        p.y = floor;
        if (input.down || want < 0) { this.setFlying(false); this.onGround = true; }
        else this.vy = Math.max(0, this.vy);
      }
      input.jump = false;
      // 風を切る光
      if (Math.random() < dt * (8 + Math.hypot(this.vel.x, this.vel.z))) {
        const e = ELEM[STATE.element];
        spawnP(p.x + (Math.random() - 0.5) * 0.8, p.y + 0.4 + Math.random() * 1.6, p.z + (Math.random() - 0.5) * 0.8, -this.vel.x * 0.3, -1, -this.vel.z * 0.3, 0.8, 0.1, Math.random() < 0.5 ? e.color : e.c2);
      }
    } else {
      if (input.jump) {
        if (this.onGround || this.inWater) { this.vy = CONFIG.jumpPower; this.onGround = false; SOUND.jump(); }
        else if (!GAME.inDungeon) this.setFlying(true);      // 空中でもう一度跳ぶと飛ぶ
      }
      input.jump = false;
      this.vy -= CONFIG.gravity * dt;
      p.y += this.vy * dt;
      const floor = this.floorAt(p.x, p.z);
      if (p.y <= floor || (this.onGround && this.vy <= 0 && p.y - floor < 0.6)) {
        p.y = floor; this.vy = 0; this.onGround = true;
      } else {
        this.onGround = false;
      }
    }

    if (this.faceTo !== undefined) {
      this.facing = angleLerp(this.facing, this.faceTo, Math.min(1, 16 * dt));
      this.faceTimer -= dt;
      if (this.faceTimer <= 0) this.faceTo = undefined;
    } else if (len > 0.05) this.facing = angleLerp(this.facing, Math.atan2(mx, mz), Math.min(1, 12 * dt));

    this.castAnim = Math.max(0, this.castAnim - dt * 3);
    const b = this.m.rig.bones;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const raise = charging ? 1 : this.castAnim;
    if (this.pose) {
      // 演出の姿勢（ひざまずく等）はそのまま
    } else if (this.flying) {
      setRigPose(this.m, 'fly'); this.m.rig.pose = '';
      const f = Math.min(1, hs / 30);
      this.model.rotation.x = f * 0.75;
      b.chest.rotation.x = -f * 0.2;
      b.head.rotation.x = -f * 0.5;
      b.uArmL.rotation.x = f * 0.6; b.uArmL.rotation.z = -0.3 - f * 0.2;
      this.model.position.y = 0;
    } else {
      this.model.rotation.x = 0;
      const amt = Math.min(1.25, hs / CONFIG.walkSpeed);
      this.phase += hs * dt * 1.25;
      if (this.onGround) {
        animateWalk(this.m, this.phase, amt, time);
        this.model.position.y = Math.abs(Math.sin(this.phase)) * 0.04 * amt;
      } else {
        resetRig(this.m.rig);
        b.thighL.rotation.x = -0.5; b.shinL.rotation.x = 0.9; b.thighR.rotation.x = 0.25; b.shinR.rotation.x = 0.4;
        b.uArmL.rotation.z = -0.7;
        this.model.position.y = 0;
      }
    }
    // 右腕（杖）：詠唱中は前に掲げる
    if (!this.pose) {
      b.uArmR.rotation.x = lerp(b.uArmR.rotation.x, -1.55, raise);
      b.uArmR.rotation.z = lerp(b.uArmR.rotation.z, 0.12, raise);
      b.fArmR.rotation.x = lerp(b.fArmR.rotation.x, -0.1, raise);
    }
    this.staff.rotation.x = raise * 1.6;
    if (this.inWater) this.model.position.y = -0.2 + Math.sin(time * 3) * 0.05;

    this.hurtT = Math.max(0, this.hurtT - dt);
    this.body.visible = !(this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0);
    this.root.position.copy(p);
    this.root.rotation.y = this.facing;
  }
}

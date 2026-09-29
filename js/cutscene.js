'use strict';
/* =========================================================
   演出（語り・カメラ・プロローグ）
   ========================================================= */
const CUT = { active: false, cam: new THREE.Vector3(), look: new THREE.Vector3(), camOn: false, music: null, skipNarr: false };
const cutWait = (ms) => new Promise(r => setTimeout(r, ms));
const say = (lines) => new Promise(r => openDialog(lines.map(([who, t]) => ({ who, t })), r));
function cutCam(x, y, z, lx, ly, lz, snap) {
  CUT.cam.set(x, y, z); CUT.look.set(lx, ly, lz); CUT.camOn = true;
  if (snap) { camera.position.copy(CUT.cam); camera.lookAt(CUT.look); }
}
function updateCutCamera(dt) {
  camera.position.lerp(CUT.cam, 1 - Math.exp(-2.2 * dt));
  const cur = camera.userData.look || (camera.userData.look = CUT.look.clone());
  cur.lerp(CUT.look, 1 - Math.exp(-3 * dt));
  camera.lookAt(cur);
  if (cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * cam.shake;
    camera.position.y += (Math.random() - 0.5) * cam.shake;
    cam.shake = Math.max(0, cam.shake - dt * 1.5);
  }
}
function beginCut(music) {
  CUT.active = true; CUT.music = music || null;
  document.body.classList.add('cut');
  $('cutbars').classList.add('on');
  cancelCast();
}
function endCut() {
  CUT.active = false; CUT.camOn = false; CUT.music = null;
  camera.userData.look = null;
  document.body.classList.remove('cut');
  $('cutbars').classList.remove('on');
  updateCamera(0, true);
}

/* ---------- 黒い画面の語り ---------- */
function narrate(lines) {
  return new Promise((resolve) => {
    const el = $('narr'), p = el.querySelector('p'), skip = el.querySelector('.skip');
    el.classList.add('show');
    let i = -1, timer = 0, done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(timer);
      el.removeEventListener('click', next); skip.removeEventListener('click', skipAll);
      p.classList.remove('on');
      setTimeout(() => { el.classList.remove('show'); resolve(); }, 900);
    };
    const next = () => {
      clearTimeout(timer);
      i++;
      if (i >= lines.length) { finish(); return; }
      p.classList.remove('on');
      setTimeout(() => {
        if (done) return;
        p.textContent = lines[i];
        p.classList.add('on');
        timer = setTimeout(next, 1800 + lines[i].length * 90);
      }, i === 0 ? 300 : 700);
    };
    const skipAll = (e) => { e.stopPropagation(); finish(); };
    el.addEventListener('click', next);
    skip.addEventListener('click', skipAll);
    next();
  });
}

/* ---------- 天を貫く光の柱（演出だけ。誰も傷つけない） ---------- */
function summonPillar(x, y, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 120, 24, 1, true), mat);
  const mat2 = mat.clone(); mat2.color.setHex(0xff8ab0);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 120, 24, 1, true), mat2);
  core.position.y = outer.position.y = 60;
  g.add(core, outer);
  g.position.set(x, y, z);
  addFx(g, 3.0, (t) => {
    const a = t < 0.12 ? t / 0.12 : 1 - Math.max(0, (t - 0.4) / 0.6);
    mat.opacity = 0.55 * a; mat2.opacity = 0.14 * a;
    core.scale.x = core.scale.z = 1 + Math.sin(t * 60) * 0.08;
    outer.rotation.y += 0.05;
    if (Math.random() < 0.8) PG.spawn(x + (Math.random() - 0.5) * 6, y + Math.random() * 3, z + (Math.random() - 0.5) * 6, 0, 6 + Math.random() * 8, 0, 1.6, 0.3, 0xfff0c8, 0xff6aa0, 1, -1, 0.2);
  });
  flashLight(new THREE.Vector3(x, y + 3, z), 0xfff0d8, 3, 30, 2.2);
  shakeCamera(0.5);
  screenFlash(0.45);
  SOUND.levelup();
  SOUND.boom(2);
}
// 守護の刻印：金色の輪が国じゅうに広がっていく
function wardRing(x, z) {
  for (let k = 0; k < 3; k++) setTimeout(() => shockRing(x, z, 60 + k * 50, 0xffd86a, 2.2), k * 350);
  burst(x, groundAt(x, z) + 1, z, 80, 6, 1.4, 0.4, 0xffe08a, -1);
  SOUND.cast('light', 4);
}

/* ---------- プロローグ ---------- */
const PROLOGUE_NARR = [
  '五年前——王国魔法師団長レグルス・アルスターは、病に倒れた。',
  '“星墜とし”と謳われたその男の死を境に、王国の英雄たちは、ひとり、またひとりと世を去った。',
  '事故。病。理由の分からない死。',
  'そして今年の春。ガルヴァス帝国は、王国の三十倍の兵をもって国境を越えた。',
  '砦は一日で落ちた。村は焼かれ、街道には骸が積まれた。',
  '十日後、帝国軍は王都アルディアを包囲した。',
  '城壁は破られ、十万の民が暮らす城下は、略奪と殺戮の坩堝と化した。',
  '逃げ遅れた者は殺され、捕らえられた者は——殺されるよりも惨い目に遭った。',
  '城に逃げ込めたのは、わずか二千。その城の扉も、ひとつ、またひとつと破られていく。',
  'その夜。王女セシリアは、王家に封じられていた禁術の書を開いた。',
  '——還魂の儀。',
  '己の命と引き換えに、死者の魂を、この世に呼び戻す術。'
];
async function playPrologue() {
  beginCut('requiem');
  const C = SPOTS.circle, T = SPOTS.throne;
  const y = T.y !== undefined ? T.y : groundAt(C.x, C.z);
  player.root.visible = false;
  teleport(C.x, C.z + 2.2);
  player.facing = Math.PI;
  const ce = NPC_BY_ID.cecilia;
  // 王女はまだ立っている
  ce.hidden = false; ce.pose = 'stand';
  ce.model.rotation.set(0, 0, 0); ce.model.position.set(0, 0, 0);
  ce.pos.set(C.x, y, C.z - 0.3); ce.face = Math.PI; ce.root.rotation.y = Math.PI;
  cutCam(C.x + 7, y + 4.5, C.z + 13, C.x, y + 1.4, C.z, true);
  CAP.circleGlow = 0.35;
  await narrate(PROLOGUE_NARR);
  cutCam(C.x + 4, y + 3, C.z + 8, C.x, y + 1.5, C.z - 1);
  await cutWait(900);
  await say([['レオンハルト', 'やめろ、セシリア！ 余の命を使え！ 余の……！'],
    ['セシリア', 'お父様の命じゃ、だめなの。王の血は、この国に残さなきゃ'],
    ['セシリア', 'セレス。お父様を……お願いね'],
    ['セレス', '……っ、姫様……'],
    ['セシリア', '……レグルス。覚えてる？ 泣いてばかりだった小さなわたしに、塔の上で星を見せてくれたこと'],
    ['セシリア', 'あなたがいなくなって、この国の空から、星が消えたの'],
    ['セシリア', 'だから……お願い。もう一度だけ、この国に星を——']]);
  CAP.circleGlow = 1;
  cutCam(C.x + 14, y + 9, C.z + 20, C.x, y + 6, C.z);
  await cutWait(700);
  summonPillar(C.x, y, C.z);
  await cutWait(1600);
  // 王女は崩れ落ち、男が還ってくる
  ce.pose = null;
  refreshNPCs();
  player.root.visible = true;
  burst(C.x, y + 1, C.z + 2.2, 120, 7, 1.4, 0.5, 0xfff0c8, -1);
  await cutWait(1400);
  CAP.circleGlow = undefined;
  cutCam(C.x + 5.5, y + 2.3, C.z + 1.6, C.x, y + 1.0, C.z + 0.8);
  await cutWait(800);
  await say([[HERO, '……ここは……謁見の間……？ 俺は、死んだはずじゃ……'],
    ['セレス', '……レグルス……！'],
    [HERO, '……セレス？ ……っ、セシリア様！'],
    [SYS, '抱き起こした王女の身体は、まだ温かかった。けれどその胸は、もう二度と動かなかった。'],
    [SYS, '口元には、小さな笑みが残っていた。'],
    ['レオンハルト', '……あの子は、己の命と引き換えに……そなたを呼んだのだ'],
    [HERO, '……陛下。これは、いったい……']]);
  shakeCamera(0.4); SOUND.boom(1.5);
  cutCam(C.x + 6, y + 3.5, C.z + 11, C.x, y + 1.5, C.z + 2);
  await say([[SYS, '城のどこかで、扉が破られる音がした。——悲鳴。嘲笑。肉を裂く、湿った音。'],
    ['セレス', '帝国軍が城に入り込んでる……！ 南東の部屋では、捕まった兵が……嬲り殺しにされてる。城下は、もっと……'],
    [HERO, '……分かった。事情は後で聞く'],
    [HERO, '陛下。姫の命、確かに受け取りました']]);
  cutCam(C.x + 1.8, y + 1.9, C.z - 2.2, C.x, y + 1.6, C.z + 2.2);
  await cutWait(600);
  wardRing(C.x, C.z + 2.2);
  await say([[HERO, '——守護の刻印、展開'],
    [HERO, 'この国の民と、この国の物に、俺の魔法は一切触れない'],
    [HERO, '瓦礫ひとつ、髪の毛一本、傷つけない。……だから'],
    [HERO, 'それ以外は、全部消し飛ばす']]);
  endCut();
  CAP.circleGlow = undefined;
  setTimeout(() => banner('序章「還魂」', mainStep().obj), 300);
  toast('魔法は味方・王国の建物には一切当たらない（守護の刻印）', 'quest');
  saveGame(true);
}

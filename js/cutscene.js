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
  releaseAllInput();
  if (player.flying) player.setFlying(false);
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
// 演出のために住民を置く
function stageNPC(id, x, z, face, pose, y) {
  const n = NPC_BY_ID[id];
  n.hidden = false; n.root.visible = true;
  n.pos.set(x, y !== undefined ? y : groundAt(x, z), z);
  n.face = face; n.root.rotation.y = face;
  n.pose = pose || 'stand';
  setRigPose(n.m, pose && pose !== 'stand' ? pose : '');
  if (pose === 'lie') n.m.model.position.set(0, 0.13, 0);
  return n;
}
function boneWorld(m, name, out = new THREE.Vector3()) { const b = m.rig.bones[name]; b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld); }
async function playPrologue() {
  beginCut('requiem');
  const C = SPOTS.circle, T = SPOTS.throne;
  const y = T.y !== undefined ? T.y : groundAt(C.x, C.z);
  player.root.visible = false;
  teleport(C.x, C.z + 0.4);
  player.pos.y = y;
  player.facing = Math.PI;
  // 王女は魔法陣の中で祈っている。王は玉座の前から叫び、セレスは泣き崩れている
  const ce = stageNPC('cecilia', C.x, C.z - 0.6, Math.PI, 'pray', y);
  const king = stageNPC('king', C.x + 2.2, C.z - 4.5, Math.PI * 0.85, 'reach', y);
  const se = stageNPC('seles', C.x - 3.4, C.z + 2.4, Math.PI * 0.8, 'kneelCry', y);
  setCrying(se.m, true); setCrying(king.m, true);
  cutCam(C.x + 7, y + 4.5, C.z + 13, C.x, y + 1.4, C.z, true);
  CAP.circleGlow = 0.35;
  await narrate(PROLOGUE_NARR);
  cutCam(C.x + 3.2, y + 2.3, C.z + 5.5, C.x, y + 1.6, C.z - 1.5);
  await cutWait(900);
  await say([['レオンハルト', 'やめろ、セシリア！ 余の命を使え！ 余の……余の命なら、いくらでも……！'],
    ['セシリア', 'お父様の命じゃ、だめなの。王の血は、この国に残さなきゃ'],
    ['セシリア', 'それにね……お父様がいなくなったら、この国の人たち、誰を信じて生きればいいの？'],
    ['セレス', '……っ、姫様……お願い……やめて……'],
    ['セシリア', 'セレス。お父様を……お願いね。あなたにしか、頼めないの']]);
  cutCam(C.x - 0.4, y + 1.75, C.z - 3.2, C.x, y + 1.9, C.z - 0.6);
  setCrying(ce.m, true);
  await cutWait(700);
  await say([['セシリア', '……レグルス。聞こえる……？ 覚えてる？ 泣いてばかりだった小さなわたしに、塔の上で星を見せてくれたこと'],
    ['セシリア', 'あなたがいなくなって、この国の空から、星が消えたの'],
    ['セシリア', 'だから……お願い。もう一度だけ、この国に星を——']]);
  CAP.circleGlow = 1;
  cutCam(C.x + 14, y + 9, C.z + 20, C.x, y + 6, C.z);
  await cutWait(700);
  summonPillar(C.x, y, C.z);
  await cutWait(1600);
  // 王女は崩れ落ち、魔法陣の中心に男がひざまずいている
  setCrying(ce.m, false);
  stageNPC('cecilia', C.x - 1.1, C.z - 1.9, Math.PI / 2 + 0.3, 'lie', y);
  player.root.visible = true;
  player.setPose('kneel');
  burst(C.x, y + 1, C.z + 0.4, 120, 7, 1.4, 0.5, 0xfff0c8, -1);
  await cutWait(1500);
  CAP.circleGlow = undefined;
  cutCam(C.x + 1.4, y + 1.2, C.z - 2.4, C.x, y + 1.1, C.z + 0.4);
  await cutWait(900);
  await say([[SYS, '光が収まったとき、魔法陣の中心に、ひとりの男がひざまずいていた。'],
    [SYS, '黒い師団長の礼装。銀の髪。五年前、国じゅうが泣いて見送った、その背中。'],
    [HERO, '……っ、は……。……息が、できる……？'],
    [HERO, '俺は……死んだはずだ。胸を焼く痛みも、冷たくなっていく指先も……全部、覚えている'],
    ['セシリア', '……レグ……ルス……']]);
  // 声のする方へ
  player.setPose('');
  const cw = boneWorld(ce.m, 'chest');
  const side = new THREE.Vector3(Math.cos(ce.face), 0, -Math.sin(ce.face));
  teleport(cw.x - side.x * 0.1 + 0.62 * Math.cos(ce.face + Math.PI / 2), cw.z + 0.62 * -Math.sin(ce.face + Math.PI / 2));
  player.pos.y = y;
  player.facing = Math.atan2(cw.x - player.pos.x, cw.z - player.pos.z);
  player.root.rotation.y = player.facing; player.root.position.copy(player.pos);
  player.setPose('hold');
  // 王女は最後の力で手を伸ばす
  const cb = ce.m.rig.bones;
  cb.uArmR.rotation.x = -1.3; cb.fArmR.rotation.x = -0.6; cb.head.rotation.y = 0.6;
  const hw = headWorld(ce.m);
  cutCam(hw.x + 1.25, hw.y + 0.75, hw.z + 0.5, hw.x - 0.1, hw.y + 0.25, hw.z);
  await cutWait(700);
  await say([[HERO, '……セシリア様？ ……なぜ、あなたが、そこに……'],
    ['セシリア', '……ほんとうに……来て、くれた……'],
    ['セシリア', '……ふふ。……ちょっと、老けた……？ ……うそ。……五年前の……まま……'],
    [HERO, '喋らないでください！ 今、治癒を——'],
    [SYS, '治癒の光を注いだ。何度も。何度も。……光は、彼女の身体を素通りしていった。'],
    ['セレス', '……無駄よ、レグルス。還魂の儀は……命と、魂を、交換する術なの……'],
    [HERO, '……交換……？ ……俺の、ために……？']]);
  setCrying(player.m, true);
  const pw = headWorld(player.m);
  cutCam(pw.x - 0.9, pw.y + 0.15, pw.z + 1.0, (pw.x + hw.x) / 2, (pw.y + hw.y) / 2 + 0.1, (pw.z + hw.z) / 2);
  await say([['セシリア', '……ちがうよ。……この国の、ために。……みんなの、ために……'],
    ['セシリア', '……それと……ちょっとだけ、わたしのため。……もう一回だけ、会いたかったの'],
    ['セシリア', '塔の上で、流れ星にお願いしたの。「レグルスが、ずっと、そばにいてくれますように」って'],
    ['セシリア', '……叶わなかったから……今度は、自分で、叶えちゃった……'],
    [HERO, '……馬鹿なことを……！ あなたは、この国の……この国の、未来で……'],
    ['セシリア', '……泣かないで。……泣き虫は、わたしの……役目、でしょう……？'],
    [SYS, 'レグルスは、自分が泣いていることに、そのとき初めて気づいた。']]);
  cutCam(hw.x + 0.9, hw.y + 0.5, hw.z - 0.6, hw.x, hw.y + 0.1, hw.z);
  await say([['セシリア', '……おかえりなさい、レグルス'],
    ['セシリア', '……みんなを……たすけて……']]);
  // 伸ばした手が、ゆっくりと落ちる
  addFx(new THREE.Object3D(), 1.6, (t) => { const k = Math.min(1, t * 1.3); cb.uArmR.rotation.x = -1.3 * (1 - k) - 0.35 * k; cb.fArmR.rotation.x = -0.6 * (1 - k) - 0.5 * k; cb.head.rotation.y = 0.6 - 0.35 * k; });
  await cutWait(1800);
  await say([[SYS, '小さな手が、レグルスの頬に触れて——そして、ゆっくりと落ちた。'],
    [SYS, '口元には、小さな笑みが残っていた。']]);
  // 王が娘にすがりつく
  { const ax = cw.x - player.pos.x, az = cw.z - player.pos.z, al = Math.hypot(ax, az) || 1;
    const kx = cw.x + ax / al * 0.75, kz = cw.z + az / al * 0.75;
    stageNPC('king', kx, kz, Math.atan2(cw.x - kx, cw.z - kz), 'kneelCry', y); }
  stageNPC('seles', C.x + 1.6, C.z + 1.4, -Math.PI * 0.75, 'cry', y);
  cutCam(C.x + 4.5, y + 3.2, C.z + 3.5, cw.x, y + 0.7, cw.z);
  await say([['レオンハルト', '……セシリア……。……セシリアぁぁ……っ！'],
    [SYS, '国王は娘の亡骸にすがりつき、声をあげて泣いた。王冠が床に転がり、乾いた音を立てた。'],
    ['セレス', '……ごめんなさい……止められなかった……。あの子、ずっと前から、決めてたの……'],
    ['セレス', 'あなたが死んでから、この国は……ずっと、負け続けてきた。英雄が、ひとり、またひとり……いなくなって'],
    ['セレス', '昨日、城門が破られた。今日、城下の半分が燃えた。明日には……この城も……'],
    ['セレス', '……もう、祈ることしか、できなかったの……っ']]);
  shakeCamera(0.4); SOUND.boom(1.5);
  cutCam(C.x - 5, y + 4, C.z + 7, C.x, y + 1.2, C.z - 1);
  await say([[SYS, '城のどこかで、扉が破られる音がした。——悲鳴。嘲笑。肉を裂く、湿った音。'],
    [SYS, '生き残った人々の、最後の、かすかな声。'],
    [HERO, '……']]);
  // 外套をかけ、立ち上がる
  setCrying(player.m, false);
  player.setPose('');
  const pw2 = headWorld(player.m);
  cutCam(pw2.x + 1.3 * Math.sin(player.facing), pw2.y - 0.1, pw2.z + 1.3 * Math.cos(player.facing), pw2.x, pw2.y - 0.05, pw2.z);
  await say([[SYS, 'レグルスは、王女の瞼をそっと閉じ、自分の外套をかけた。'],
    [SYS, '頬の涙を拭いもせず、彼は立ち上がった。'],
    [HERO, '……陛下。セレス。……泣くのは、あとにしましょう'],
    [HERO, '姫が命と引き換えに呼んだのが、俺なら——'],
    [HERO, '俺は、この国の、最後の希望でなければならない']]);
  CUT.music = 'title';
  { const f = player.facing; cutCam(player.pos.x + Math.sin(f) * 2.6 + Math.cos(f) * 0.8, y + 2.6, player.pos.z + Math.cos(f) * 2.6 - Math.sin(f) * 0.8, player.pos.x, y + 2.0, player.pos.z); }
  await cutWait(600);
  wardRing(player.pos.x, player.pos.z);
  await say([[HERO, '——守護の刻印、展開'],
    [HERO, 'この国の民と、この国の物に、俺の魔法は一切触れない'],
    [HERO, '瓦礫ひとつ、髪の毛一本、傷つけない。……だから'],
    [HERO, 'それ以外は、全部消し飛ばす'],
    ['セレス', '……っ。……おかえり、団長'],
    ['レオンハルト', '……行け、レグルス。……娘が、見ている']]);
  endCut();
  CAP.circleGlow = undefined;
  setCrying(se.m, false);
  refreshNPCs();
  setTimeout(() => banner('序章「還魂」', mainStep().obj), 300);
  toast('魔法は味方・王国の建物には一切当たらない（守護の刻印）', 'quest');
  toast('空中でもう一度跳ぶか V キーで、空を飛べる', 'quest');
  saveGame(true);
}

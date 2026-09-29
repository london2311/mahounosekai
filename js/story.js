'use strict';
/* =========================================================
   主人公の状態
   ========================================================= */
const STATE = {
  lvl: 1, exp: 0, baseAura: 100, auraMul: 1, aura: 100, mp: 100, hp: 100, maxHp: 100, def: 0, staffMult: 1,
  gold: 30, element: 'fire', items: { potion: 3 }, keys: [], equip: { staff: 'staff0', robe: 'robe0' }, owned: ['staff0', 'robe0'],
  main: 0, mainKills: 0, side: {}, warps: ['start'], met: [], crystals: [], respawn: { x: 0, z: 7 }, playTime: 0
};

const ITEMS = {
  potion:   { name: '回復薬', desc: 'HPを回復する（最大HPの25%・最低60）', price: 30 },
  hipotion: { name: '上回復薬', desc: 'HPを大きく回復する（最大HPの60%・最低250）', price: 150 },
  ether:    { name: '魔力の水', desc: '魔力を40%回復する', price: 80 },
  dango:    { name: '峠の団子', desc: 'HPを40%、魔力を20%回復する', price: 60 },
  elixir:   { name: 'エリクサー', desc: 'HPと魔力を全回復する', price: 900 }
};
const KEY_ITEMS = {
  letter:     { name: '紹介状', desc: '村長バルドが書いた、国王への紹介状。' },
  tablet:     { name: '石版の欠片', desc: '遺跡の番人が守っていた古い石版。三つの星晶について記されている。' },
  moonstar:   { name: '月の星晶', desc: '月影島の巫女から託された、淡く光る結晶。' },
  dragonstar: { name: '竜の星晶', desc: '古竜ヴァルグが守っていた、燃えるように熱い結晶。' }
};
const EQUIP = {
  staff0: { slot: 'staff', name: '見習いの杖', mult: 1.0, desc: '使い込まれた木の杖。' },
  staff1: { slot: 'staff', name: '樫の杖', mult: 1.25, price: 250, desc: '魔法の威力 ×1.25' },
  staff2: { slot: 'staff', name: '魔導の杖', mult: 1.6, price: 1500, desc: '魔法の威力 ×1.6' },
  staff3: { slot: 'staff', name: '月長石の杖', mult: 2.0, price: 4500, desc: '魔法の威力 ×2.0' },
  staff4: { slot: 'staff', name: '賢者の杖', mult: 2.6, price: 12000, desc: '魔法の威力 ×2.6' },
  staff5: { slot: 'staff', name: '星詠みの杖', mult: 3.4, price: 30000, desc: '魔法の威力 ×3.4' },
  robe0:  { slot: 'robe', name: '旅人の服', def: 0, hp: 0, desc: 'ごく普通の服。' },
  robe1:  { slot: 'robe', name: '見習いのローブ', def: 4, hp: 20, price: 150, desc: '守り+4 / 最大HP+20' },
  robe2:  { slot: 'robe', name: '魔導士のローブ', def: 10, hp: 60, price: 1000, desc: '守り+10 / 最大HP+60' },
  robe3:  { slot: 'robe', name: '砂塵のマント', def: 18, hp: 120, price: 3800, desc: '守り+18 / 最大HP+120' },
  robe4:  { slot: 'robe', name: '潮騒の外套', def: 24, hp: 180, price: 6500, desc: '守り+24 / 最大HP+180' },
  robe5:  { slot: 'robe', name: '帝国魔導衣', def: 32, hp: 260, price: 11000, desc: '守り+32 / 最大HP+260' }
};
const SHOPS = {
  kazami_item:   ['potion', 'ether'],
  kazami_weapon: ['staff1', 'robe1'],
  aldia_weapon:  ['staff1', 'staff2', 'robe1', 'robe2'],
  aldia_item:    ['potion', 'hipotion', 'ether'],
  belka_weapon:  ['staff2', 'staff3', 'robe2', 'robe3'],
  belka_item:    ['potion', 'hipotion', 'ether', 'elixir'],
  oasis_shop:    ['robe3', 'hipotion', 'ether'],
  pass_shop:     ['dango', 'potion', 'ether'],
  empire_weapon: ['staff3', 'staff4', 'staff5', 'robe5'],
  empire_item:   ['hipotion', 'ether', 'elixir'],
  leafe_shop:    ['potion', 'ether', 'elixir'],
  witch_shop:    ['ether', 'elixir'],
  marina_item:   ['potion', 'hipotion', 'ether'],
  marina_weapon: ['staff2', 'staff3', 'robe2', 'robe4']
};

function computeStats() {
  const staff = EQUIP[STATE.equip.staff], robe = EQUIP[STATE.equip.robe];
  const oldAura = STATE.aura;
  STATE.aura = STATE.baseAura * STATE.auraMul * Math.pow(1.08, STATE.crystals.length);
  STATE.maxHp = 100 + 20 * (STATE.lvl - 1) + robe.hp;
  STATE.def = robe.def;
  STATE.staffMult = staff.mult;
  if (STATE.aura > oldAura) STATE.mp += STATE.aura - oldAura;
  STATE.mp = Math.min(STATE.mp, STATE.aura);
  STATE.hp = Math.min(STATE.hp, STATE.maxHp);
}
function expNeed(l) { return Math.floor(12 * Math.pow(l, 1.8)); }
function gainExp(n) {
  STATE.exp += n;
  let up = false;
  while (STATE.exp >= expNeed(STATE.lvl)) {
    STATE.exp -= expNeed(STATE.lvl);
    STATE.lvl++;
    STATE.baseAura *= 1.12;
    up = true;
  }
  if (up) {
    computeStats();
    STATE.hp = STATE.maxHp; STATE.mp = STATE.aura;
    banner(`レベルアップ！  Lv ${STATE.lvl}`, `魔力の器が広がった（魔力 ${fmt(STATE.aura)}）`);
    auraPulse = 1.5;
    SOUND.levelup();
    burst(player.pos.x, player.pos.y + 1, player.pos.z, 80, 6, 1.2, 0.5, 0xfff0a0, -2);
  }
}
function addItem(id, n = 1) {
  STATE.items[id] = (STATE.items[id] || 0) + n;
  toast(`${ITEMS[id].name} ×${n} を手に入れた`, 'item');
}
function addKey(id) {
  if (!STATE.keys.includes(id)) STATE.keys.push(id);
  toast(`大切なもの「${KEY_ITEMS[id].name}」を手に入れた`, 'item');
}
function useItem(id) {
  if (!STATE.items[id]) return false;
  const H = STATE.maxHp, A = STATE.aura;
  switch (id) {
    case 'potion': STATE.hp = Math.min(H, STATE.hp + Math.max(60, H * 0.25)); break;
    case 'hipotion': STATE.hp = Math.min(H, STATE.hp + Math.max(250, H * 0.6)); break;
    case 'ether': STATE.mp = Math.min(A, STATE.mp + A * 0.4); break;
    case 'dango': STATE.hp = Math.min(H, STATE.hp + H * 0.4); STATE.mp = Math.min(A, STATE.mp + A * 0.2); break;
    case 'elixir': STATE.hp = H; STATE.mp = A; break;
  }
  STATE.items[id]--;
  if (STATE.items[id] <= 0) delete STATE.items[id];
  SOUND.heal();
  burst(player.pos.x, player.pos.y + 1, player.pos.z, 30, 3, 0.8, 0.3, id === 'ether' ? 0x7ad4ff : 0x9aff9a, -2);
  toast(`${ITEMS[id].name}を使った`);
  return true;
}
function equipItem(id) {
  const e = EQUIP[id];
  STATE.equip[e.slot] = id;
  computeStats();
  toast(`${e.name}を装備した`);
}
function buy(id) {
  const isEq = !!EQUIP[id];
  const def = isEq ? EQUIP[id] : ITEMS[id];
  if (isEq && STATE.owned.includes(id)) { toast('もう持っている'); return false; }
  if (STATE.gold < def.price) { toast('お金が足りない…'); SOUND.error(); return false; }
  STATE.gold -= def.price;
  SOUND.coin();
  if (isEq) {
    STATE.owned.push(id);
    const cur = EQUIP[STATE.equip[def.slot]];
    if ((def.mult || 0) > (cur.mult || 0) || (def.def || 0) > (cur.def || 0)) equipItem(id);
    else toast(`${def.name}を買った`);
  } else addItem(id, 1);
  return true;
}

/* =========================================================
   物語（第一章「灯火の魔法使い」）
   ========================================================= */
const SYS = 'システム';
const MAIN = [
  { title: '目覚め', obj: '焚き火のそばの占い師ミラに話しかけよう', talk: 'mira',
    say: [
      ['ミラ', '……ようやく目を覚ましたね。'],
      ['ミラ', '無理に思い出そうとしなくていい。君の名はルカ。…今はそれだけ覚えていれば十分さ。'],
      ['ミラ', '君の手には、炎・氷・雷。三つの小さな灯がともっている。弱い魔法だけど…君が使えば話は別だ。'],
      ['ミラ', '君のオーラ——魔力の器には、底がない。込めれば込めるほど、魔法はどこまでも大きくなる。'],
      ['ミラ', 'まずは南の『風見の村』へ行きなさい。村長のバルドが力になってくれるはずさ。'],
      [SYS, IS_TOUCH ? '左側をなぞって移動、右側をなぞって視点。「詠唱」ボタンを長押しすると魔力を込め、離すと放つ。' :
        'WASDで移動、ドラッグで視点。左クリック（またはFキー）を長押しすると魔力を込め、離すと放つ。'],
      [SYS, IS_TOUCH ? '炎・氷・雷のボタンで属性を切り替え。◎ボタンはオートフォーカス（自動で敵を狙う）。' :
        '1・2・3キーで炎・氷・雷を切り替え。Qでオートフォーカスの切替、Tabで狙いの変更。Eで話す、Mで地図、Iで持ち物。']
    ] },
  { title: '風見の村へ', obj: '南の「風見の村」で村長バルドに会おう', talk: 'bald',
    say: [
      ['バルド', 'ほう…ミラの紹介か。あの占い師が何者なのか、わしにもさっぱり分からんのじゃ。'],
      ['バルド', 'ルカ、と言ったか。記憶がない？ …ふむ、困ったもんじゃな。'],
      ['バルド', 'それより頼みがある。最近、村のまわりにスライムが増えて困っとるんじゃ。'],
      ['バルド', '3匹ほど退治してくれんか。はじまりの丘のあたりにたくさんおる。雷の魔法に弱いと聞くぞ。']
    ] },
  { title: 'スライム退治', obj: 'スライムを倒そう', kill: 'slime', n: 3, mark: { x: 20, z: 60 } },
  { title: '村長への報告', obj: '風見の村の村長バルドに報告しよう', talk: 'bald',
    say: [
      ['バルド', 'おお、本当にやってくれたか！ わしの若い頃はな…いや、今はいい。'],
      ['バルド', '礼じゃ。少ないが受け取ってくれ。'],
      ['バルド', '…それとな。お前さんの魔法、ただごとではない。王都アルディアの国王陛下にお会いするとええ。'],
      ['バルド', '紹介状を書いておいた。北西の街道を進めば、大きな城壁が見えてくるはずじゃ。']
    ], reward: { gold: 100, items: { potion: 3 }, key: 'letter' } },
  { title: '王都アルディアへ', obj: '北西の王都アルディアへ行き、城の謁見の間で国王に会おう', talk: 'king',
    say: [
      [SYS, '（紹介状を差し出した）'],
      ['レオンハルト三世', '…ふむ、風見の村のバルドからか。懐かしい名だ。'],
      ['レオンハルト三世', '旅の魔法使いルカよ。近ごろ、各地で魔物が凶暴になっておる。'],
      ['レオンハルト三世', '千年前、大魔導士アルマが『虚無の王』を封じた封印…それが揺らいでおるのやもしれぬ。'],
      ['レオンハルト三世', '王都の東、山のふもとにある魔法学院を訪ねよ。学院長セレスはこの国一の魔導士。そなたの力の正体も、きっと分かるだろう。']
    ], reward: { gold: 300 } },
  { title: '魔法学院', obj: '魔法学院の学院長セレスに会おう', talk: 'seles',
    say: [
      ['セレス', 'あなたがルカね。陛下から話は聞いています。'],
      ['セレス', '…なるほど。確かに、見たことのない種類のオーラ。'],
      ['セレス', 'でも力は、使いこなしてこそ。試練を与えましょう。'],
      ['セレス', '王都の東の街道に、ゴブリンの群れが住みついています。5体、退治してきなさい。'],
      ['セレス', '炎がよく効くはずよ。杖を掲げて長く込めれば、魔法は大きくなる。…やりすぎないようにね。']
    ] },
  { title: '学院長の試練', obj: '王都の東の街道でゴブリンを倒そう', kill: 'goblin', n: 5, mark: { x: -230, z: -200 } },
  { title: '試練の報告', obj: '魔法学院の学院長セレスに報告しよう', talk: 'seles',
    say: [
      ['セレス', 'お見事。…やはり、あなたのオーラには限界がないようね。'],
      ['セレス', 'かつて、同じ力を持つ者がいました。千年前の大魔導士アルマ。'],
      ['セレス', '伝承では、その力は『無限のオーラ』と呼ばれていた。器が大きくなるほど、弱い魔法すら天変地異になる…。'],
      ['セレス', '西の古代遺跡の地下迷宮に、封印の間があるはず。最近、遺跡の番人が目覚めたと報告がありました。'],
      ['セレス', '調べてきて。あなたなら、きっと大丈夫。']
    ], reward: { gold: 500, items: { ether: 2 } } },
  { title: '古代遺跡の地下迷宮', obj: '西の古代遺跡から地下迷宮に入り、最深部の番人を倒そう', kill: 'guardian', n: 1, mark: 'dungeon' },
  { title: '石版の謎', obj: '魔法学院の学院長セレスに石版の欠片を見せよう', talk: 'seles',
    say: [
      [SYS, '（石版の欠片を見せた）'],
      ['セレス', '…これは、封印の石版。読める部分だけ訳すわ。'],
      ['セレス', '『虚無の王を縛るは三つの星晶。月の星晶、竜の星晶、そして帝の星晶』'],
      ['セレス', '月の星晶は月影島の巫女が、竜の星晶は竜の峰の古竜が、そして帝の星晶はガルヴァス帝国が守っているはず。'],
      ['セレス', '帝国の宰相ゼノンが星晶を狙っている…という噂があるわ。まずは帝国へ。北の山道を越えて、皇帝に会って。']
    ], reward: { gold: 800 } },
  { title: '山道を越えて', obj: '北の山道と霧の峠を越え、帝都ガルヴァスの宮殿で皇帝に会おう', talk: 'emperor',
    say: [
      ['ヴァルゼル', '…王国の魔法使いか。余に何の用だ。'],
      ['ヴァルゼル', '帝の星晶だと？ …あれは、ひと月前に何者かに盗まれた。'],
      ['ゼノン', '陛下、そのようなことを他国の者にお話しになっては困りますな。くくく…。'],
      ['ヴァルゼル', '……下がれ、ゼノン。'],
      ['ヴァルゼル', '魔法使いよ。南の海の月影島へ行き、巫女を訪ねよ。…手遅れになる前にな。'],
      ['ゼノン', '（小声で）…実に興味深いオーラだ。いずれ、ゆっくりお話ししましょう。']
    ] },
  { title: '月影島の巫女', obj: '港町マリナの東の桟橋から船で月影島へ渡り、巫女ツクヨに会おう', talk: 'tsukuyo',
    say: [
      ['ツクヨ', 'お待ちしていました、ルカさん。月が、あなたの来訪を告げていました。'],
      ['ツクヨ', '昨夜、黒い衣の男がこの島に来ました。星晶を渡せと。…月の光が退けてくれましたが。'],
      ['ツクヨ', 'この月の星晶を、あなたに託します。あなたの無限のオーラなら、きっと守り抜ける。'],
      ['ツクヨ', '最後の星晶は、竜の峰の古竜ヴァルグが守っています。古竜は、力を示した者にしか星晶を渡しません。'],
      ['ツクヨ', '古竜は氷に弱いと言われています。…どうか、ご無事で。']
    ], reward: { key: 'moonstar', items: { hipotion: 2 } } },
  { title: '竜の峰', obj: '古代遺跡の北、竜の峰の頂に棲む古竜ヴァルグを倒そう', kill: 'dragon', n: 1, mark: { x: -920, z: -980 } },
  { title: '帰還', obj: '魔法学院の学院長セレスに報告しよう', talk: 'seles',
    say: [
      ['セレス', '…本当に古竜を。あなたという人は。'],
      ['セレス', '月の星晶と竜の星晶。これで封印の半分以上は取り戻せた。'],
      ['セレス', 'でも帝の星晶は、宰相ゼノンの手に…。彼こそ、虚無の王の使徒なのかもしれない。'],
      ['セレス', '…ルカ。あなたの旅は、まだ始まったばかりよ。']
    ], reward: { gold: 3000 }, end: true },
  { title: '第一章 完', obj: '世界を自由に旅しよう（第二章につづく）' }
];

function mainStep() { return MAIN[Math.min(STATE.main, MAIN.length - 1)]; }
function advanceMain() {
  STATE.main++;
  STATE.mainKills = 0;
  const s = mainStep();
  banner(`クエスト：${s.title}`, s.obj);
  SOUND.quest();
  saveGame(true);
}
function giveReward(r) {
  if (!r) return;
  if (r.gold) { STATE.gold += r.gold; toast(`${fmt(r.gold)} ゴールドを受け取った`, 'item'); }
  if (r.items) for (const [k, n] of Object.entries(r.items)) addItem(k, n);
  if (r.key) addKey(r.key);
  if (r.aura) { STATE.auraMul *= r.aura; computeStats(); auraPulse = 1.5; toast('魔力の器が広がった！', 'item'); }
}
function questMarker() {
  const s = mainStep();
  if (s.talk) { const n = NPC_BY_ID[s.talk]; return n ? { x: n.pos.x, z: n.pos.z } : null; }
  if (s.mark === 'dungeon') return GAME.inDungeon ? DUNGEON.boss : SPOTS.dungeonDoor;
  return s.mark || null;
}

function onEnemyKilled(type) {
  const s = mainStep();
  if (s.kill === type) {
    STATE.mainKills++;
    if (STATE.mainKills >= s.n) {
      if (type === 'guardian') addKey('tablet');
      if (type === 'dragon') {
        addKey('dragonstar');
        setTimeout(() => banner('古竜ヴァルグを倒した！', '竜の星晶を手に入れた'), 600);
      }
      advanceMain();
    } else toast(`${ETYPES[type].name} ${STATE.mainKills} / ${s.n}`, 'quest');
  }
  for (const n of NPCS) {
    const q = n.side;
    if (!q || q.kill !== type) continue;
    const st = STATE.side[q.id];
    if (st && st.state === 1 && st.count < q.n) {
      st.count++;
      toast(`依頼「${n.name}」 ${ETYPES[type].name} ${st.count} / ${q.n}`, 'quest');
    }
  }
}

// 話しかけたときの流れ
function talkTo(npc) {
  const d = npc.d;
  npc.talking = true;
  if (!STATE.met.includes(d.id)) STATE.met.push(d.id);
  const done = () => { npc.talking = false; };
  const s = mainStep();
  if (s.talk === d.id) {
    const lines = s.say.map(([who, t]) => ({ who, t, role: who === d.name ? d.role : '' }));
    openDialog(lines, () => {
      giveReward(s.reward);
      if (s.end) setTimeout(() => chapterEnd(), 400);
      advanceMain();
      done();
    });
    return;
  }
  const L = (t) => ({ who: d.name, role: d.role, t });
  if (d.side) {
    const q = d.side;
    const st = STATE.side[q.id];
    if (!st) {
      openDialog(q.offer.map(L), null, [
        { label: '引き受ける', fn: () => { STATE.side[q.id] = { state: 1, count: 0 }; toast(`依頼を引き受けた：${ETYPES[q.kill].name}を${q.n}体`, 'quest'); SOUND.quest(); done(); } },
        { label: 'やめておく', fn: done }
      ]);
      return;
    }
    if (st.state === 1) {
      if (st.count >= q.n) {
        openDialog(q.done.map(L), () => { st.state = 2; giveReward(q.reward); SOUND.quest(); saveGame(true); done(); });
      } else openDialog([L(q.progress[0] + `（${st.count} / ${q.n}）`)], done);
      return;
    }
  }
  const line = () => {
    let pool = d.lines;
    if (d.side && STATE.side[d.side.id] && STATE.side[d.side.id].state === 2 && npc.talkCount % 2 === 0) pool = d.side.after;
    const t = pool[npc.talkCount % pool.length];
    npc.talkCount++;
    return L(t);
  };
  if (d.shop) {
    openDialog([line()], null, [
      { label: '買い物をする', fn: () => { openShop(d); done(); } },
      { label: '話を聞く', fn: () => { done(); talkTo(npc); } },
      { label: 'さようなら', fn: done }
    ]);
    return;
  }
  if (d.inn) {
    openDialog([line()], null, [
      { label: `泊まる（${d.inn} G）`, fn: () => { restAtInn(npc); done(); } },
      { label: 'やめておく', fn: done }
    ]);
    return;
  }
  if (d.ferry) {
    const to = d.ferry === 'island' ? '月影島' : '港町マリナ';
    openDialog([line()], null, [
      { label: `${to}へ渡る（30 G）`, fn: () => { takeFerry(d.ferry); done(); } },
      { label: 'やめておく', fn: done }
    ]);
    return;
  }
  openDialog([line()], done);
}

function restAtInn(npc) {
  const price = npc.d.inn;
  if (STATE.gold < price) { toast('お金が足りない…'); SOUND.error(); return; }
  STATE.gold -= price;
  fadeOut(() => {
    STATE.hp = STATE.maxHp; STATE.mp = STATE.aura;
    const b = BLD[npc.d.bld];
    STATE.respawn = { x: b ? b.door.x : npc.pos.x, z: b ? b.door.z + 0.5 : npc.pos.z };
    saveGame();
    toast('ぐっすり眠った。HPと魔力が全回復した（記録しました）', 'item');
    SOUND.heal();
  });
}
function takeFerry(to) {
  if (STATE.gold < 30) { toast('お金が足りない…'); SOUND.error(); return; }
  STATE.gold -= 30;
  const p = to === 'island' ? SPOTS.islandDock : SPOTS.ferry;
  fadeOut(() => {
    teleport(p.x, to === 'island' ? p.z + 4 : p.z - 3);
    toast(to === 'island' ? '月影島に着いた' : '港町マリナに着いた');
  });
}
function activateWarp(w) {
  if (!STATE.warps.includes(w.id)) {
    STATE.warps.push(w.id);
    banner('転移石が目覚めた', `「${w.name}」へ、地図からいつでも転移できる`);
    SOUND.quest();
    burst(w.x, w.y + 2, w.z, 60, 5, 1, 0.4, 0x8fd4ff, -1);
    saveGame(true);
  } else {
    openMap();
  }
}
function takeCrystal(c) {
  c.taken = true;
  scene.remove(c.mesh, c.glow);
  STATE.crystals.push(c.id);
  const before = STATE.aura;
  computeStats();
  banner('魔力の結晶を手に入れた！', `魔力の器が広がった（${fmt(before)} → ${fmt(STATE.aura)}）  [${STATE.crystals.length} / ${CRYSTALS.length}]`);
  auraPulse = 2;
  SOUND.levelup();
  burst(c.x, c.y + 1.3, c.z, 80, 6, 1.2, 0.4, 0x9fe8ff, -1);
  saveGame(true);
}
function chapterEnd() {
  const el = document.getElementById('chapter');
  el.classList.add('show');
  SOUND.levelup();
  setTimeout(() => el.classList.remove('show'), 7000);
}

/* =========================================================
   記録（ブラウザに保存）
   ========================================================= */
const SAVE_KEY = 'mahounosekai_save_v1';
function saveGame(quiet) {
  try {
    const data = Object.assign({}, STATE, { pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z }, dungeon: GAME.inDungeon, v: 1,
      talk: Object.fromEntries(NPC_LIST.map(n => [n.id, n.talkCount])) });
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (!quiet) toast('記録しました');
    return true;
  } catch (e) { if (!quiet) toast('記録できませんでした（ブラウザの設定を確認してください）'); return false; }
}
function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}
function applySave(data) {
  for (const k of Object.keys(STATE)) if (data[k] !== undefined) STATE[k] = data[k];
  for (const c of CRYSTALS) if (STATE.crystals.includes(c.id)) { c.taken = true; scene.remove(c.mesh, c.glow); }
  if (data.talk) for (const n of NPC_LIST) n.talkCount = data.talk[n.id] || 0;
  computeStats();
  // 倒したボスは復活しない
  if (STATE.main > 8) for (const e of ENEMIES) if (e.type === 'guardian') { e.alive = false; e.deathT = 9; }
  if (STATE.main > 12) for (const e of ENEMIES) if (e.type === 'dragon') { e.alive = false; e.deathT = 9; }
  if (data.pos) {
    if (data.dungeon) enterDungeon(true);
    teleport(data.pos.x, data.pos.z);
  }
}
function hasSave() { return !!loadSave(); }

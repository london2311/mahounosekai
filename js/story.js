'use strict';
/* =========================================================
   主人公の状態（還魂した王国魔法師団長 レグルス・アルスター）
   ========================================================= */
const HERO = 'レグルス';
const STATE = {
  lvl: 50, exp: 0, baseAura: 50000, auraMul: 1, aura: 50000, mp: 50000, hp: 30000, maxHp: 30000, def: 0, staffMult: 1.5,
  gold: 0, element: 'fire', items: { hipotion: 5, ether: 5 }, keys: [], equip: { staff: 'staff_star', robe: 'robe_cmd' }, owned: ['staff_star', 'robe_cmd'],
  main: 0, mainKills: 0, side: {}, warps: [], met: [], crystals: [], respawn: { x: -450, z: -440 }, playTime: 0,
  generals: [], rescued: [], kills: 0, structKills: 0
};

const ITEMS = {
  potion:   { name: '回復薬', desc: 'HPを回復する（最大HPの25%）', price: 30 },
  hipotion: { name: '上回復薬', desc: 'HPを大きく回復する（最大HPの60%）', price: 150 },
  ether:    { name: '魔力の水', desc: '魔力を40%回復する', price: 80 },
  dango:    { name: '峠の団子', desc: 'HPを40%、魔力を20%回復する', price: 60 },
  elixir:   { name: 'エリクサー', desc: 'HPと魔力を全回復する', price: 900 }
};
const KEY_ITEMS = {
  tome:     { name: '還魂の禁書', desc: '王女セシリアが命と引き換えに使った禁術の書。最後の頁に、震える字で「ごめんなさい、ありがとう」と書かれている。' },
  ribbon:   { name: '王女の髪飾り', desc: 'セシリアが幼い頃から身につけていた青い髪飾り。' },
  curse:    { name: '呪詛の記録', desc: '第四将モルテが持っていた文書。五年前の「病死」が、宰相ゼノンの呪いだったことが記されている。' }
};
const EQUIP = {
  staff_star: { slot: 'staff', name: '星墜としの杖', mult: 1.5, desc: '魔法師団長の杖。五年の眠りを経ても、主を覚えていた。' },
  staff0: { slot: 'staff', name: '見習いの杖', mult: 1.0, desc: '使い込まれた木の杖。' },
  staff1: { slot: 'staff', name: '樫の杖', mult: 1.25, price: 250, desc: '魔法の威力 ×1.25' },
  staff2: { slot: 'staff', name: '魔導の杖', mult: 1.6, price: 1500, desc: '魔法の威力 ×1.6' },
  staff3: { slot: 'staff', name: '月長石の杖', mult: 2.0, price: 4500, desc: '魔法の威力 ×2.0' },
  staff4: { slot: 'staff', name: '賢者の杖', mult: 2.6, price: 12000, desc: '魔法の威力 ×2.6' },
  staff5: { slot: 'staff', name: '星詠みの杖', mult: 3.4, price: 30000, desc: '魔法の威力 ×3.4' },
  robe_cmd: { slot: 'robe', name: '師団長の礼装', def: 20, hp: 3000, desc: '守り+20 / 最大HP+3000' },
  robe0:  { slot: 'robe', name: '旅人の服', def: 0, hp: 0, desc: 'ごく普通の服。' },
  robe1:  { slot: 'robe', name: '見習いのローブ', def: 4, hp: 400, price: 150, desc: '守り+4 / 最大HP+400' },
  robe2:  { slot: 'robe', name: '魔導士のローブ', def: 10, hp: 1200, price: 1000, desc: '守り+10 / 最大HP+1200' },
  robe3:  { slot: 'robe', name: '砂塵のマント', def: 24, hp: 3600, price: 3800, desc: '守り+24 / 最大HP+3600' },
  robe4:  { slot: 'robe', name: '潮騒の外套', def: 28, hp: 4200, price: 6500, desc: '守り+28 / 最大HP+4200' },
  robe5:  { slot: 'robe', name: '帝国魔導衣', def: 36, hp: 6000, price: 11000, desc: '守り+36 / 最大HP+6000' }
};
const SHOPS = {
  kazami_item:   ['potion', 'ether'],
  kazami_weapon: ['staff1', 'robe1'],
  aldia_weapon:  ['staff2', 'staff3', 'robe2', 'robe3'],
  aldia_item:    ['potion', 'hipotion', 'ether', 'elixir'],
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
  STATE.maxHp = 2000 + 500 * STATE.lvl + robe.hp;
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
    case 'potion': STATE.hp = Math.min(H, STATE.hp + H * 0.25); break;
    case 'hipotion': STATE.hp = Math.min(H, STATE.hp + H * 0.6); break;
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
   帝国十将の言葉
   ========================================================= */
const BOSS_LINES = {
  g10: {
    intro: [['グラウス', 'なんだァ？ 新しい玩具か。いいねェ、その目。どこまで保つか試して——'],
      ['グラウス', '……待て。その顔……五年前に死んだはずの……“星墜とし”のレグルス！？'],
      [HERO, '部屋の外まで聞こえていた。あの子の悲鳴も、お前の笑い声も'],
      [HERO, '同じだけ鳴いてもらう。——いや、そんな時間はやらない']],
    defeat: [['グラウス', 'ば、化け物……帝国は……帝国には、まだ九人……'], [HERO, '数えておけ。残り九人だ']]
  },
  g9: {
    intro: [['バルドゥル', '三千の槍を前に、たった一人で何ができる。王国の亡霊め、墓に還れ！'],
      [HERO, '三千か。……この国の民は、十万いた'],
      [HERO, 'お前たちが殺した数に、到底足りない']],
    defeat: [['バルドゥル', '三千が……ひと晩で……これが、星墜とし……'], [HERO, '王都の空に、もう煙は上がらない']]
  },
  g8: {
    intro: [['イグナーツ', '燃やすのが好きでな。村ってのは、よく燃える。人もな'],
      [HERO, '風見の村の風車は、百年回っていた'],
      [HERO, '炎の本当の使い方を教えてやる']],
    defeat: [['イグナーツ', '炎で……俺が、焼かれる……？ ああ、熱い……熱い……'], [HERO, '村の者たちも、そう言ったはずだ']]
  },
  g7: {
    intro: [['ヘルミーネ', '王国の魔法使いは、みんな狩ったはずなのに。まだ残っていたのね'],
      ['ヘルミーネ', '学生たち？ 実験台にちょうどよかったわ。魔力の器を開いたら、どうなるのか'],
      [HERO, '……ここは、子供たちが魔法を学ぶ場所だ']],
    defeat: [['ヘルミーネ', 'わたしの結界を……紙みたいに……あなた、何者……'], [HERO, '王国魔法師団長。……この学院の、最初の卒業生だ']]
  },
  g4: {
    intro: [['モルテ', '千年の封印、宰相閣下のために掘り起こしてやったのさ。邪魔をするな、死に損ない'],
      ['モルテ', '……おや？ お前、呪いで死んだはずの……ひひ、閣下がお喜びになる'],
      [HERO, '呪い、だと？']],
    defeat: [['モルテ', '宰相閣下……約束が、違……う……'], ['システム', '（モルテの懐から、古い文書が落ちた）']]
  },
  g6: {
    intro: [['ドルガン', 'この峠は俺の砦だ。王国の亡霊だろうが、誰一人通さねえ'],
      [HERO, '山を崩す男だと聞いた'],
      [HERO, '俺は、星を落とす']],
    defeat: [['ドルガン', '山より……重い……'], [HERO, '峠を越える。次は帝国だ']]
  },
  g5: {
    intro: [['レイヴン', '速さなら十将一。魔法使いが詠唱する間に、首を落とす'],
      [HERO, 'やってみろ']],
    defeat: [['レイヴン', '見えな……かった……詠唱すら……'], [HERO, '詠唱なら、五年前に済ませてある']]
  },
  g3: {
    intro: [['ジークリンデ', '空は竜のものよ。地を這う魔法使いに、届くものか'],
      [HERO, '竜を無理やり従わせたな。首の鎖が見える'],
      ['ジークリンデ', '……黙れ！ ヴァルグ、焼き払え！']],
    defeat: [['ジークリンデ', 'ヴァルグ……ごめんね……わたし……'], [HERO, '竜は、鎖から解かれた。……お前もだ']]
  },
  g2: {
    intro: [['アウグスト', '雷で俺に挑むか。王国の魔法使いよ、面白い'],
      ['アウグスト', '帝都の門は、俺が立つ限り開かぬ'],
      [HERO, '門なら、もう開いている。お前の後ろだ']],
    defeat: [['アウグスト', '俺の雷が……児戯……か……'], [HERO, '宮殿まで、あと一人']]
  },
  g1: {
    intro: [['ヴィルヘルム', '……レグルス・アルスター。五年前、貴様と刃を交えたかった'],
      ['ヴィルヘルム', '貴様が病で死んだと聞いたとき、俺は落胆した。……病ではなかったのだろう？'],
      [HERO, '知っていたのか'],
      ['ヴィルヘルム', '知っていて、何もしなかった。剣しか持たぬ男の罪だ。——来い。せめて、剣士として死なせろ']],
    defeat: [['ヴィルヘルム', '……満足だ。……皇帝陛下は、宰相に……心を……奪われて……いる……'],
      ['ヴィルヘルム', '……止めて、くれ……'], ['システム', '（宮殿を覆っていた結界が、音を立てて砕けた）']]
  },
  zenon: {
    intro: [['ゼノン', 'ようこそ、星墜とし殿。いや——死に損ない殿'],
      ['ゼノン', '五年前、あなたに呪いを仕込んだのは、この私ですよ。“病死”。ええ、実に美しい響きでしょう？'],
      ['ゼノン', '王国の英雄を一人ずつ、病と事故で。三十倍の軍など、ただの後片付けです'],
      ['ゼノン', 'そして仕上げは、あの愚かな王女。己の命で、あなたを呼び戻した。……おかげで、あなたの魂を虚無の王への供物にできる'],
      [HERO, '……セシリアの命を、供物と呼んだか'],
      [HERO, 'ゼノン。お前には、呪いも、病も、事故もない'],
      [HERO, '俺が、この手で消す']],
    defeat: [['ゼノン', 'ば、馬鹿な……虚無の王の力を……弱い魔法で……いや、これは……“星”……'],
      [HERO, '還れ。お前の主のところへ'], ['ヴァルゼル', '……っ、ぐ……余は……何を……。……王国に……何ということを……']]
  },
  emperor: {
    intro: [['ヴァルゼル', '……ゼノン……ゼノン、余を……助けよ……（皇帝の瞳は、虚ろだ）']],
    defeat: [['ヴァルゼル', '……ありがとう……王国の魔法使い……ゼノンの声が……聞こえない……']]
  }
};

/* =========================================================
   物語（序章「還魂」／第一章「反撃の狼煙」／第二章「帝国侵攻」）
   ========================================================= */
const SYS = 'システム';
const MAIN = [
  { ch: '序章「還魂」', title: '城内掃討', obj: '城に入り込んだ帝国兵を一掃せよ', zone: 'castle' },
  { ch: '序章「還魂」', title: '嗤う屠殺者', obj: '南東の部屋で捕虜を嬲る第十将グラウスを討て', boss: 'g10', mark: 'roomF' },
  { ch: '序章「還魂」', title: '五年の空白', obj: '謁見の間のセレスと話す', talk: 'seles',
    weep: ['seles'],
    say: [['セレス', '……本当に、あなたなのね。……ばかみたい。泣いてる暇なんてないのに'],
      ['セレス', '五年間、毎月、あなたの墓に花を持っていったのよ。……返事なんて、来るわけないのに'],
      [HERO, '……すまない。……状況を'],
      ['セレス', '王国軍は壊滅。騎士団長ガレスは重傷。あなたの側近——ヴォルク、ユキナ、ライガが、中庭で最後の防衛線を張ってる。……もう、半日も持たない'],
      ['セレス', '城下はもっと酷い。逃げ遅れた人たちが、今も広場で……。……ごめんなさい、言葉にできない'],
      ['セレス', 'レグルス。あなたが死んでから、何もかもおかしくなったの。英雄たちが次々に「事故」や「病」で死んで……'],
      [HERO, '……その話は、後で聞く。中庭から片づける']] },
  { ch: '序章「還魂」', title: '最後の防衛線', obj: '中庭で戦う側近たちを援護し、押し寄せる帝国兵を殲滅せよ', zone: 'courtyard' },
  { ch: '序章「還魂」', title: '再会', obj: '中庭の副団長ヴォルクと話す', talk: 'volk',
    weep: ['volk', 'yukina', 'raiga'],
    say: [['ヴォルク', '……は、はは……幻か？ 死に際に見る夢ってのは、こんなに都合がいいのか'],
      [HERO, '立て、ヴォルク。副団長がそのザマでどうする'],
      ['ヴォルク', '団長……！ ……っ、団長ぉぉ！'],
      [SYS, '血と煤にまみれた大男が、子供のように声をあげて泣いた。'],
      ['ヴォルク', '俺は……俺は、あんたの隊を守れなかった……！ 百二十人いた師団は、もう、ここにいる三人だけだ……！'],
      ['ユキナ', '……五年。五年よ、団長。……遅すぎる'],
      ['ユキナ', '……泣いてない。……氷の魔法使いは、泣かないの。……泣かない、って……言ってたじゃない……っ'],
      ['ライガ', '団長……団長ぉ……！ 俺、ずっと……ずっと、待ってたんだ……！'],
      ['ライガ', '……っ、でも、泣いてる場合じゃねえ！ 城下で、奴ら、捕まえた人たちを広場や通りで……遊んでやがる！'],
      [HERO, '……よく、生きていてくれた。三人とも'],
      [HERO, '案内は要らない。悲鳴の聞こえる方へ行く。——お前たちは、城を守れ。今度は、俺が前に立つ']] },
  { ch: '序章「還魂」', title: '城下の地獄', obj: '城下町で嬲られている人々を救い出せ', rescue: 5 },
  { ch: '序章「還魂」', title: '三千の槍', obj: '城外に陣取る帝国軍を薙ぎ払い、南の本陣の第九将バルドゥルを討て', boss: 'g9', mark: 'siegeHQ' },
  { ch: '序章「還魂」', title: '弔いと誓い', obj: '謁見の間の国王レオンハルトのもとへ戻る', talk: 'king',
    weep: ['king', 'hero'],
    say: [['レオンハルト', '……終わったのか。三千の帝国兵が、たった一夜で……'],
      [HERO, '陛下。……姫を、守れませんでした'],
      ['レオンハルト', '……いや。娘は、守ったのだ。この国を。お前を呼んで'],
      [SYS, '翌朝、王都の広場で、死者たちの葬送が行われた。数えきれない棺。棺の足りない者は、布に包まれて並べられた。'],
      [SYS, '生き残った人々は、泣くことさえ忘れたように、ただ黙って土をかけ続けた。'],
      [HERO, '姫。……あなたは、泣き虫の小さな子供だったのに'],
      [HERO, 'あなたの命は、無駄にしない'],
      [HERO, '帝国十将、残り八人。皇帝ヴァルゼル。そして、この五年の裏で糸を引いた者'],
      [HERO, '一人残らず、報いを受けさせる'],
      ['レオンハルト', '……レグルス・アルスター。王国魔法師団長の任を、改めて命ずる。——征け']],
    reward: { gold: 5000, key: 'ribbon', items: { elixir: 3 } }, after: 'liberate' },
  { ch: '第一章「反撃の狼煙」', title: '燃える風車', obj: '南の風見の村を占拠する第八将イグナーツを討て', boss: 'g8', mark: 'kazami' },
  { ch: '第一章「反撃の狼煙」', title: '魔女狩り', obj: '王都の北東、魔法学院を占拠する第七将ヘルミーネを討て', boss: 'g7', mark: 'academy' },
  { ch: '第一章「反撃の狼煙」', title: '墓暴き', obj: '西の古代遺跡で封印を暴く第四将モルテを討て', boss: 'g4', mark: 'ruins', reward: { key: 'curse' } },
  { ch: '第一章「反撃の狼煙」', title: '病の正体', obj: '魔法学院のセレスに、モルテの文書を見せる', talk: 'seles',
    say: [['セレス', '……読んだわ。五年前の、あなたの「病」。あれは病じゃない。呪いよ'],
      ['セレス', '呪いの術式に刻まれた名は——宰相ゼノン'],
      [HERO, '……そうか。だから、俺は死んだのか'],
      ['セレス', 'それだけじゃない。前の騎士団長も、賢者オルフェも、宮廷魔術師ザカリアも……この五年で死んだ英雄たちは、みんな'],
      ['セレス', 'あなたを殺して、英雄を一人ずつ消して、最後に三十倍の軍で踏み潰す。……最初から、全部が一つの計画だった'],
      [HERO, '帝国へ行く。北の霧の峠を越える'],
      ['セレス', '……止めないわ。でも、約束して。今度は、ちゃんと帰ってきて']] },
  { ch: '第一章「反撃の狼煙」', title: '峠の砦', obj: '北の霧の峠に築かれた砦で、第六将ドルガンを討て', boss: 'g6', mark: 'pass' },
  { ch: '第二章「帝国侵攻」', title: '双剣', obj: '帝国の関所を守る第五将レイヴンを討て', boss: 'g5', mark: 'gate' },
  { ch: '第二章「帝国侵攻」', title: '竜騎', obj: '西の竜の峰で、古竜を駆る第三将ジークリンデを討て', boss: 'g3', mark: 'dragon' },
  { ch: '第二章「帝国侵攻」', title: '雷帝', obj: '帝都ガルヴァスの南門を守る第二将アウグストを討て', boss: 'g2', mark: 'empireGate' },
  { ch: '第二章「帝国侵攻」', title: '剣聖', obj: '宮殿の前に立つ第一将ヴィルヘルムを討て', boss: 'g1', mark: 'palace', after: 'palace' },
  { ch: '第二章「帝国侵攻」', title: '虚無の使徒', obj: '宮殿の玉座の間で、宰相ゼノンを討て', boss: 'zenon', mark: 'emperorThrone' },
  { ch: '第二章「帝国侵攻」', title: '還る場所', obj: '王都アルディアに戻り、国王に報告する', talk: 'king',
    weep: ['king', 'hero'],
    say: [['レオンハルト', '……帰ったか。……よくぞ、帰った'],
      [HERO, '帝国十将は倒れました。宰相ゼノンも。皇帝ヴァルゼルは呪縛から解かれ、和平を申し出ています'],
      ['レオンハルト', '……和平、か。失ったものは、何ひとつ戻らぬ。それでも……'],
      [HERO, 'それでも、生きている者がいます。パン屋のゴードンは、店を建て直しました。ロイは、また門に立っています'],
      [SYS, '王都の空に、久しぶりに風車の音が届いた。風見の村から運ばれてきた、新しい羽根の音だった。'],
      [HERO, '姫。……ただいま、帰りました'],
      [HERO, 'あなたが守ったこの国は、まだ、ここにあります']],
    end: true },
  { ch: '終章', title: '再建の日々', obj: '世界を自由に旅しよう（残った帝国兵や魔物もいる）' }
];
const GENERAL_OF = { kazami: 'g8', academy: 'g7', ruins: 'g4', pass: 'g6', gate: 'g5', empire: 'zenon' };
function occupied(place) { const g = GENERAL_OF[place]; return g ? !STATE.generals.includes(g) : false; }

function cityRescued() { return (STATE.rescued || []).filter(id => id !== 'cap_roy' && id !== 'cap_karl').length; }
function mainStep() { return MAIN[Math.min(STATE.main, MAIN.length - 1)]; }
function stepDone(s) {
  if (s.zone) return zoneAlive(s.zone) === 0;
  if (s.boss) return STATE.generals.includes(s.boss);
  if (s.rescue) return cityRescued() >= s.rescue;
  return false;
}
function advanceMain() {
  const prevCh = mainStep().ch;
  const prev = mainStep();
  if (prev.after === 'liberate') setCapitalLiberated(true);
  if (prev.after === 'palace') { STATORY_palace(); }
  STATE.main++;
  // すでに済んでいる目標は飛ばす
  while (STATE.main < MAIN.length - 1 && stepDone(mainStep())) STATE.main++;
  const s = mainStep();
  refreshNPCs();
  if (s.ch !== prevCh) setTimeout(() => chapterCard(prevCh, s.ch), 600);
  else banner(`${s.title}`, s.obj);
  SOUND.quest();
  saveGame(true);
}
function STATORY_palace() { STORY_FLAGS.palaceOpen = true; for (const st of STRUCTS) if (st.palace) st.protect = false; }
function checkMainProgress() {
  const s = mainStep();
  if ((s.zone || s.boss || s.rescue) && stepDone(s)) advanceMain();
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
  if (s.talk) { const n = NPC_BY_ID[s.talk]; return n && n.root.visible !== false ? { x: n.pos.x, z: n.pos.z } : null; }
  if (s.boss) {
    const e = ENEMIES.find(en => en.type === s.boss && en.alive);
    if (e && Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 300) return { x: e.pos.x, z: e.pos.z };
  }
  if (s.zone) {
    let best = null, bd = Infinity;
    for (const e of ENEMIES) if (e.zone === s.zone && e.alive) { const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z); if (d < bd) { bd = d; best = e.pos; } }
    for (const g of ARMY.groups) if (g.zone === s.zone) for (const u of g.units) if (u.alive) { const d = Math.hypot(u.x - player.pos.x, u.z - player.pos.z); if (d < bd) { bd = d; best = u; } }
    return best ? { x: best.x, z: best.z } : null;
  }
  if (s.rescue) {
    let best = null, bd = Infinity;
    for (const sc of CAP.scenes) if (!sc.rescued && !sc.c.spot) { const d = Math.hypot(sc.x - player.pos.x, sc.z - player.pos.z); if (d < bd) { bd = d; best = sc; } }
    return best;
  }
  const m = s.mark;
  if (m && SPOTS[m]) return SPOTS[m];
  if (m && PLACE[m]) return PLACE[m];
  if (m === 'palace') return { x: PLACE.empire.x, z: PLACE.empire.z - 40 };
  return null;
}
function objectiveText() {
  const s = mainStep();
  let t = s.obj;
  if (s.zone) t += `（残り ${zoneAlive(s.zone)}）`;
  if (s.rescue) t += `（${cityRescued()} / ${s.rescue}）`;
  return t;
}

/* ---------- 出来事の知らせ ---------- */
function onEnemyKilled(type) {
  const T = ETYPES[type];
  if (T && (T.general !== undefined || type === 'zenon' || type === 'emperor')) {
    if (!STATE.generals.includes(type)) STATE.generals.push(type);
    const L = BOSS_LINES[type];
    if (L && L.defeat) setTimeout(() => openDialog(L.defeat.map(([who, t]) => ({ who, t })), () => afterBoss(type)), 900);
    else afterBoss(type);
  }
  for (const n of NPCS) {
    const q = n.side;
    if (!q || q.kill !== type) continue;
    const st = STATE.side[q.id];
    if (st && st.state === 1 && st.count < q.n) { st.count++; toast(`依頼「${n.name}」 ${ETYPES[type].name} ${st.count} / ${q.n}`, 'quest'); }
  }
  setTimeout(checkMainProgress, 50);
}
function afterBoss(type) {
  if (type === 'g4') addKey('curse');
  if (type === 'g1') STATORY_palace();
  if (type === 'zenon') { const em = ENEMIES.find(e => e.type === 'emperor' && e.alive); if (em) { em.alive = false; em.deathT = 9; em.root.visible = false; } }
  for (const [place, g] of Object.entries(GENERAL_OF)) {
    if (g !== type || place === 'gate') continue;
    // 将を失った兵は逃げ出す
    let fled = 0;
    for (const gr of ARMY.groups) if (gr.zone === place || (place === 'empire' && gr.zone === 'palace')) for (const u of gr.units) if (u.alive) { u.alive = false; fled++; }
    for (const e of ENEMIES) if ((e.zone === place || (place === 'empire' && e.zone === 'palace')) && e.alive && !e.T.boss) { e.alive = false; e.deathT = 9; e.root.visible = false; fled++; }
    if (fled) toast(`${PLACE[place] ? PLACE[place].name : place}から、帝国兵が逃げ出した`, 'quest');
  }
  refreshNPCs();
  checkMainProgress();
}
function onArmyKilled() { checkMainProgress(); }
function onCaptiveRescued() { checkMainProgress(); }

/* ---------- 話しかけたとき ---------- */
function talkTo(npc) {
  const d = npc.d;
  npc.talking = true;
  if (!STATE.met.includes(d.id)) STATE.met.push(d.id);
  const done = () => { npc.talking = false; };
  const s = mainStep();
  if (s.talk === d.id) {
    const lines = s.say.map(([who, t]) => ({ who, t, role: who === d.name ? d.role : '' }));
    // 再会や弔いの場面では、みな涙を流す
    const weep = (s.weep || []).map(id => id === 'hero' ? player.m : NPC_BY_ID[id] && NPC_BY_ID[id].m).filter(Boolean);
    weep.forEach(m => setCrying(m, true));
    openDialog(lines, () => {
      weep.forEach(m => { if (m !== NPC_BY_ID.king?.m || STORY_FLAGS.liberated) setCrying(m, false); });
      giveReward(s.reward);
      if (s.end) setTimeout(() => chapterCard('第二章「帝国侵攻」', 'end'), 400);
      advanceMain();
      done();
    });
    return;
  }
  const L = (t) => ({ who: d.name, role: d.role, t });
  const siege = !STORY_FLAGS.liberated && d.siege;
  if (d.side && !siege) {
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
      if (st.count >= q.n) openDialog(q.done.map(L), () => { st.state = 2; giveReward(q.reward); SOUND.quest(); saveGame(true); done(); });
      else openDialog([L(q.progress[0] + `（${st.count} / ${q.n}）`)], done);
      return;
    }
  }
  const line = () => {
    let pool = npcLines(d);
    if (!siege && d.side && STATE.side[d.side.id] && STATE.side[d.side.id].state === 2 && npc.talkCount % 2 === 0) pool = d.side.after;
    const t = pool[npc.talkCount % pool.length];
    npc.talkCount++;
    return L(t);
  };
  if (!siege && d.shop) {
    openDialog([line()], null, [
      { label: '買い物をする', fn: () => { openShop(d); done(); } },
      { label: '話を聞く', fn: () => { done(); talkTo(npc); } },
      { label: 'さようなら', fn: done }
    ]);
    return;
  }
  if (!siege && d.inn) {
    openDialog([line()], null, [
      { label: `泊まる（${d.inn} G）`, fn: () => { restAtInn(npc); done(); } },
      { label: 'やめておく', fn: done }
    ]);
    return;
  }
  if (!siege && d.ferry) {
    const to = d.ferry === 'island' ? '月影島' : '港町マリナ';
    openDialog([line()], null, [
      { label: `${to}へ渡る（30 G）`, fn: () => { takeFerry(d.ferry); done(); } },
      { label: 'やめておく', fn: done }
    ]);
    return;
  }
  openDialog([line()], done);
}
// 物語の進み具合に合わせた台詞
function npcLines(d) {
  if (!STORY_FLAGS.liberated && d.siege && d.siege.lines) return d.siege.lines;
  if (d.occ && !occupied(d.occ) && d.freed) return d.freed.concat(d.lines);
  if (STORY_FLAGS.liberated && d.after) return d.after.concat(d.lines);
  return d.lines;
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
// 章の区切り
function chapterCard(done, next) {
  const el = document.getElementById('chapter');
  el.querySelector('.c1').textContent = done.split('「')[0];
  el.querySelector('.c2').textContent = '「' + (done.split('「')[1] || '') + ' 完';
  el.querySelector('.c3').textContent = next === 'end' ? '— そして、王国の再建が始まる —' : `— ${next} —`;
  el.classList.add('show');
  SOUND.levelup();
  setTimeout(() => el.classList.remove('show'), 6500);
}

/* =========================================================
   帝国軍の占領地（十将と部下たち）
   ========================================================= */
function spawnOccupation() {
  const P = PLACE;
  const G = (type, x, z, zone) => { const e = makeEnemy(type, x, z, { zone, noRespawn: true }); e.home = { x, z }; return e; };
  // 序章
  { const f = SPOTS.roomF; G('g10', f.x - 2, f.z, 'castle'); }
  { const h = SPOTS.siegeHQ; G('g9', h.x, h.z - 12, 'siege'); }
  // 風見の村
  G('g8', P.kazami.x, P.kazami.z, 'kazami');
  addGroup({ zone: 'kazami', x: P.kazami.x, z: P.kazami.z + 10, cols: 16, rows: 14, gap: 2.4, scatter: 3, roam: true, r: 60, kinds: { soldier: 0.7, heavy: 0.1, archer: 0.2 } });
  campTents('kazami', P.kazami.x, P.kazami.z, 70, 10);
  // 魔法学院
  G('g7', P.academy.x, P.academy.z + 8, 'academy');
  for (let k = 0; k < 8; k++) G('imp_mage', P.academy.x + Math.cos(k) * 22, P.academy.z + 10 + Math.sin(k) * 16, 'academy');
  addGroup({ zone: 'academy', x: P.academy.x, z: P.academy.z + 50, cols: 14, rows: 12, gap: 2.2, scatter: 2, kinds: { soldier: 0.7, archer: 0.3 } });
  campTents('academy', P.academy.x, P.academy.z + 60, 40, 6);
  // 古代遺跡
  G('g4', P.ruins.x, P.ruins.z - 26, 'ruins');
  addGroup({ zone: 'ruins', x: P.ruins.x + 20, z: P.ruins.z + 30, cols: 12, rows: 12, gap: 2.3, scatter: 3, roam: true, r: 50, kinds: { soldier: 0.6, heavy: 0.2, archer: 0.2 } });
  // 霧の峠の砦
  G('g6', P.pass.x, P.pass.z - 4, 'pass');
  addGroup({ zone: 'pass', x: P.pass.x, z: P.pass.z + 60, cols: 10, rows: 20, gap: 2.2, face: Math.PI, kinds: { soldier: 0.55, heavy: 0.25, archer: 0.2 } });
  addGroup({ zone: 'pass', x: P.pass.x, z: P.pass.z - 50, cols: 12, rows: 12, gap: 2.2, kinds: { soldier: 0.6, heavy: 0.2, archer: 0.2 } });
  fortWall('pass', P.pass.x, P.pass.z + 30, 60);
  // 関所
  G('g5', SPOTS.gate.x, SPOTS.gate.z - 10, 'gate');
  addGroup({ zone: 'gate', x: SPOTS.gate.x, z: SPOTS.gate.z - 40, cols: 18, rows: 14, gap: 2.2, kinds: { soldier: 0.6, heavy: 0.2, archer: 0.2 } });
  campTents('gate', SPOTS.gate.x, SPOTS.gate.z - 70, 60, 8);
  // 竜の峰（古竜は第三将の騎竜）
  G('g3', P.dragon.x + 8, P.dragon.z, 'dragon');
  const dr = ENEMIES.find(e => e.type === 'dragon'); if (dr) { dr.hp = dr.maxHp = 600000; dr.T = Object.assign({}, dr.T, { atk: 4200, name: '古竜ヴァルグ（鎖に繋がれた騎竜）', lv: 88, exp: 20000 }); }
  // 帝都
  G('g2', SPOTS.empireGate.x, SPOTS.empireGate.z, 'empire');
  G('g1', P.empire.x, P.empire.z - 30, 'palace');
  { const t = SPOTS.emperorThrone; const z = G('zenon', t.x - 3, t.z + 4, 'palace'); z.dormant = () => STORY_FLAGS.palaceOpen; const em = G('emperor', t.x + 2, t.z, 'palace'); em.dormant = () => STORY_FLAGS.palaceOpen; }
  addGroup({ zone: 'empire', x: P.empire.x, z: P.empire.z + 180, cols: 24, rows: 18, gap: 2.2, face: Math.PI, kinds: { soldier: 0.55, heavy: 0.25, archer: 0.2 } });
  addGroup({ zone: 'empire', x: P.empire.x - 60, z: P.empire.z + 40, cols: 12, rows: 12, gap: 2.2, scatter: 3, roam: true, r: 50, kinds: { soldier: 0.7, archer: 0.3 } });
  addGroup({ zone: 'empire', x: P.empire.x + 60, z: P.empire.z + 40, cols: 12, rows: 12, gap: 2.2, scatter: 3, roam: true, r: 50, kinds: { soldier: 0.7, heavy: 0.3 } });
  for (let k = 0; k < 10; k++) G('imp_knight', P.empire.x + (k - 4.5) * 8, P.empire.z - 10, 'palace');
  // 宮殿の結界（第一将が倒れるまで壊せない）
  const pal = makeStructure({ x: P.empire.x, z: P.empire.z - 70, r: 30, hp: 1e12, name: '宮殿の結界', protect: true, palace: true }, () => {});
  void pal;
}
function campTents(zone, cx, cz, R, n) {
  const Rr = mulberry32(hashStr(zone));
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + Rr(), r = R * (0.6 + Rr() * 0.4);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    makeStructure({ x, z, r: 4, hp: 2500, name: '帝国軍の天幕', zone }, (B) => { tent(B, x, z, Rr() * 6, [0x6a2a1a, 0x4a3a2a, 0x5a1a1a][k % 3], 3.2); });
  }
  const bx = cx + R * 0.3, bz = cz;
  makeStructure({ x: bx, z: bz, r: 2, hp: 1500, name: '帝国の軍旗', zone }, (B) => flagPole(B, bx, bz, 0x8a1a1a, 9));
}
function fortWall(zone, cx, cz, half) {
  for (let k = -half; k < half; k += 12) {
    const x1 = cx + k, x2 = cx + k + 12;
    if (Math.abs(k + 6) < 8) continue;          // 門
    makeStructure({ x: (x1 + x2) / 2, z: cz, r: 7, hp: 20000, name: '砦の柵', zone }, (B) => {
      for (let x = x1; x < x2; x += 0.9) { const gy = groundAt(x, cz); B.cyl(x, gy + 2.6, cz, 0.38, 0.42, 5.2, 0x5a4028, 6); B.cone(x, gy + 5.5, cz, 0.38, 0.6, 0x5a4028, 6); }
      addWallCollider(x1, cz, x2, cz, 0.9);
    });
  }
  for (const s of [-1, 1]) {
    const x = cx + s * 10;
    makeStructure({ x, z: cz, r: 4, hp: 25000, name: '砦の櫓', zone }, (B) => tower(B, x, cz, 3, 11, 0x5a4a3a, 0x3a1a1a));
  }
}

/* =========================================================
   記録（ブラウザに保存）
   ========================================================= */
const SAVE_KEY = 'mahounosekai_save_v2';
function saveGame(quiet) {
  if (!GAME.started || CUT.active) return false;
  try {
    const data = Object.assign({}, STATE, { pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z }, dungeon: GAME.inDungeon, v: 2,
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
// 記録から、倒した敵・救った人・解放した場所を元に戻す
function applyStoryState() {
  const clearZone = (zone) => { for (const g of ARMY.groups) if (g.zone === zone) for (const u of g.units) u.alive = false; for (const e of ENEMIES) if (e.zone === zone && !e.T.boss) { e.alive = false; e.deathT = 9; } };
  if (STATE.main > 0) clearZone('castle');
  if (STATE.main > 3) clearZone('courtyard');
  if (STATE.main > 6) { clearZone('city'); clearZone('siege'); for (const s of STRUCTS) if (s.zone === 'siege' && s.alive) { s.alive = false; s.mesh.visible = false; removeColliders(s.cols); } }
  for (const g of STATE.generals) {
    for (const e of ENEMIES) if (e.type === g) { e.alive = false; e.deathT = 9; }
    if (g === 'g8') clearZone('kazami');
    if (g === 'g7') clearZone('academy');
  }
  for (const s of CAP.scenes) if ((STATE.rescued || []).includes(s.c.id)) { s.rescued = true; s.m.root.visible = false; for (const e of s.captors) { e.alive = false; e.deathT = 9; } }
  if (STATE.generals.includes('g1')) STATORY_palace();
  setCapitalLiberated(STATE.main > 7);
  refreshNPCs();
}
function applySave(data) {
  for (const k of Object.keys(STATE)) if (data[k] !== undefined) STATE[k] = data[k];
  for (const c of CRYSTALS) if (STATE.crystals.includes(c.id)) { c.taken = true; scene.remove(c.mesh, c.glow); }
  if (data.talk) for (const n of NPC_LIST) n.talkCount = data.talk[n.id] || 0;
  computeStats();
  applyStoryState();
  if (data.pos) {
    if (data.dungeon) enterDungeon(true);
    teleport(data.pos.x, data.pos.z);
  }
}
function hasSave() { return !!loadSave(); }

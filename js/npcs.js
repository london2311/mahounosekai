'use strict';
/* =========================================================
   住民（名前・役割・人格・台詞）
   配置: bld=建物の入口 / spot=名前つき地点 / at=[場所, dx, dz]
   move: stand（立ち止まる）/ wander（うろうろ）/ patrol（見回り）
   ========================================================= */
const NPCS = [
  /* ---------- はじまりの丘 ---------- */
  { id: 'mira', name: 'ミラ', role: '旅の占い師', at: ['start', -2.6, -2.2],
    look: ['wizard_f', { hat: 'hood', hatColor: 0x5a3a7a, dress: 0x4a2a5a, prop: 'none' }],
    persona: '謎めいていて、未来を少しだけ知っている。穏やかで、人をからかうのが好き。',
    lines: ['焚き火は消えないよ。君がここへ戻ってくるたび、少しだけ背中を押してあげる。',
      'オーラは魔力の器。器が大きくなれば、同じ呪文でもまるで別物になる。…覚えておきな。',
      'ふふ、占い？ 今日の君の運勢は『大爆発』。…冗談さ、半分はね。',
      '杖を掲げたまま魔力を込め続けてごらん。込めた分だけ、魔法は大きくなる。上限なんてないよ。'] },

  /* ---------- 風見の村 ---------- */
  { id: 'bald', name: 'バルド', role: '風見の村 村長', bld: 'kazami_chief', look: ['elder_m', { top: 0x6a4a3a }],
    persona: '頑固だが情に厚い。口癖は「わしの若い頃はな」。',
    lines: ['わしの若い頃はな、スライムなんぞ素手で追い払ったもんじゃ。…いや、嘘じゃ。',
      '王都アルディアは北西の街道の先じゃ。高い城壁が見えたら迷わんよ。',
      'この村の風車はわしの爺さんが建てたんじゃ。百年、一度も止まらずに回り続けとる。'] },
  { id: 'emma', name: 'エマ', role: '村長の妻', bld: 'kazami_chief', off: [2.2, 0.6], look: ['elder_f', { dress: 0x7a5a4a }],
    persona: 'おおらかで世話焼き。料理自慢で、誰にでもご飯を食べさせようとする。',
    lines: ['あらあら、見ない顔ね。お腹すいてない？ 今夜は豆のスープよ。',
      'うちの人、頑固でしょう？ でも村のことは誰より考えてるのよ。',
      '旅に出るなら回復薬は多めにね。トムさんの道具屋で買えるわ。'] },
  { id: 'hanna', name: 'ハンナ', role: '宿屋「風車亭」の女将', bld: 'kazami_inn', inn: 10, look: ['innkeeper', { hairStyle: 'bun', dress: 0x9a5a3a }],
    persona: '明るく豪快。笑い声が村の端まで響く。',
    lines: ['いらっしゃい！ 風車亭へようこそ！ ベッドはふかふか、朝ごはんは大盛りだよ！',
      'あっはっは！ 疲れた顔してるねえ。泊まっていきな！'] },
  { id: 'tom', name: 'トム', role: '道具屋の主人', bld: 'kazami_item', shop: 'kazami_item', look: ['merchant', { hatColor: 0x3a6a3a }],
    persona: '商売熱心だが、おまけをつける癖が抜けない。',
    lines: ['へいらっしゃい！ 回復薬はいくつあっても困らないよ！', 'また来てくれたね！ …おまけ？ しょうがないなあ。…いや、今日はダメだ！'] },
  { id: 'glen', name: 'グレン', role: '鍛冶屋・武器屋', bld: 'kazami_smith', shop: 'kazami_weapon', look: ['smith', {}],
    persona: '無口な職人。褒められると照れて黙り込む。',
    lines: ['…杖か。魔法使いの杖も、叩けば良くなる。…たぶんな。', '……いい杖だろう。…そうだろう。'] },
  { id: 'pico', name: 'ピコ', role: '羊飼いの少年', spot: 'sheepPen', off: [-11, 0], move: 'wander', r: 5, look: ['boy', { top: 0x5a8a4a }],
    persona: '好奇心旺盛。魔法使いに強く憧れている。',
    lines: ['わあ、本物の魔法使い！？ ねえねえ、炎出して！ 氷も！ 雷も！',
      '羊のメリーはね、雷の音が大嫌いなんだ。だから村の中では撃たないでね。',
      '大きくなったら、ぼくも魔法学院に入るんだ！ 王都の北東にあるんだよ！'] },
  { id: 'josef', name: 'ヨーゼフ', role: '農夫', at: ['kazami', -44, 30], move: 'wander', r: 8, look: ['farmer', {}],
    persona: 'のんびり屋。天気の話しかしない。',
    lines: ['今日はいい天気だべ。明日もいい天気だべ。たぶん。',
      '畑を荒らす角ウサギには困ったもんだべ。炎の魔法なら一発だべか？',
      '北の山に雲がかかると、次の日は雨だべ。覚えとくとええ。'] },
  { id: 'marsa', name: 'マーサ', role: '井戸端のおばあさん', at: ['kazami', 14, -4], look: ['elder_f', { dress: 0x5a5a7a }],
    persona: '噂話が大好き。村のことなら何でも知っている。',
    lines: ['聞いたかい？ 帝国の宰相が、夜な夜な怪しい儀式をしてるって噂さ。',
      '港町マリナから月影島へは船が出てるんだとさ。島には巫女様がいるそうだよ。',
      '森の奥の妖精の泉にはね、光る石があるって話だよ。…わたしゃ見たことないけどね。'] },
  { id: 'lili', name: 'リリ', role: '村の女の子', at: ['kazami', -4, 10], move: 'wander', r: 10, look: ['girl', { dress: 0xf2c94a }],
    persona: '恥ずかしがり屋。でも花のことになると急に饒舌になる。',
    lines: ['……こ、こんにちは。', 'あのね、丘の上の黄色いお花、夜になると光るんだよ。…ほんとだよ。',
      '魔法使いさん、魔物をやっつけてくれて、ありがとう。'] },
  { id: 'kai', name: 'カイ', role: '猟師', at: ['kazami', -14, -14], look: ['hunter', {}],
    persona: '皮肉屋だが腕は確か。本当は村思い。',
    lines: ['弓一本で食っていくのも楽じゃない。魔法ってのは矢代がかからなくていいな。'],
    side: { id: 's_rabbit', kill: 'rabbit', n: 5, reward: { gold: 150, items: { potion: 2 } },
      offer: ['おい、魔法使い。ちょうどいい。畑を荒らす角ウサギを5匹ほど狩ってくれないか。', '俺の矢は昨日ぜんぶ折れちまってな。…笑うなよ。'],
      progress: ['角ウサギはまだか？ 村の周りの草原にいるはずだ。'],
      done: ['…やるじゃないか。約束の礼だ。受け取れ。', '魔法ってのも悪くないな。'],
      after: ['おかげで畑が静かになった。…ありがとな。'] } },
  { id: 'will', name: 'ウィル', role: '風車番', at: ['kazami', -38, -36], look: ['man', { top: 0x6a8aa8, hat: 'cap', hatColor: 0x3a4a5a }],
    persona: '風を読む天才。詩的な言い回しをする。',
    lines: ['風はね、遠くの出来事を運んでくるんだ。今日の風は…少し焦げ臭い。',
      '風車は止まらない。止まる時は、世界が息をひそめる時さ。'] },
  { id: 'fin', name: 'フィン', role: '吟遊詩人', bld: 'kazami_inn', off: [4, 2], move: 'wander', r: 6, look: ['bard', {}],
    persona: 'お調子者。世界中の英雄譚を集めている。',
    lines: ['♪千年前〜 大魔導士アルマは〜 虚無の王を封じたり〜♪ …どう？ いい声でしょ？',
      '君の旅も歌にしてあげるよ。ただし、かっこいい活躍をしてくれたらね！',
      '東の交易都市ベルカには、世界中の品が集まるんだって。いつか行ってみたいなあ。'] },

  /* ---------- 王都アルディア ---------- */
  { id: 'king', name: 'レオンハルト三世', role: 'アルディア国王', spot: 'throne', off: [0, 0.4], look: ['king', {}],
    persona: '威厳があり慎重。民を深く愛するが、決断には時間がかかる。',
    lines: ['余はこの国を守らねばならぬ。…そなたの力、頼りにしておるぞ。',
      '帝国とは長く緊張が続いておる。皇帝ヴァルゼル…昔は、あのような男ではなかったのだが。'] },
  { id: 'cecilia', name: 'セシリア', role: '王女', spot: 'throne', off: [4, 3], look: ['princess', {}],
    persona: 'おてんばで好奇心旺盛。城を抜け出すのが趣味。',
    lines: ['あなたが噂の魔法使い？ ねえ、城の外の話を聞かせて！',
      'お父様には内緒よ。わたし、この前こっそり森まで行ったの。…ウルフに追いかけられたけど。',
      'いつか私も旅に出たいな。窓から見る世界じゃ、狭すぎるもの。'] },
  { id: 'oswald', name: 'オズワルド', role: '大臣', spot: 'throne', off: [-4, 3], look: ['noble_m', { beard: 0x8a8a8a, hair: 0x8a8a8a, top: 0x3a2a5a }],
    persona: '神経質で心配性。数字には滅法強い。',
    lines: ['陛下への謁見は手短に願いますぞ。予定が詰まっておるのです。',
      '魔物の被害報告が先月の三倍…いや三・二倍。胃が痛い…。',
      '帝国の宰相ゼノン…あの男の目は好かん。何を考えているのか、まるで読めぬ。'] },
  { id: 'gareth', name: 'ガレス', role: '近衛騎士団長', spot: 'throne', off: [7, 16], move: 'patrol', path: [[7, 16], [-7, 16], [-7, 26], [7, 26]], look: ['knight', { cape: 0x9a1f2a }],
    persona: '豪快で義理堅い。酒と剣をこよなく愛する。',
    lines: ['わっはっは！ 魔法使いか！ 剣が届かん相手はお前さんに任せたぞ！',
      '騎士の務めは民を守ること。お前さんの魔法も、同じだろう？',
      '遺跡の地下には、大昔の番人がまだ動いているらしい。気をつけろよ。'] },
  { id: 'roy', name: 'ロイ', role: '門番の兵士', at: ['aldia', 132, -12], look: ['soldier', {}], face: -Math.PI / 2,
    persona: '真面目で融通が利かない。規則第一。',
    lines: ['ここは王都アルディア！ 規則により、城内での攻撃魔法は禁止です！',
      '…なに、あっちの壁に落書きがある？ 規則違反だ、すぐ確認する！'] },
  { id: 'ben', name: 'ベン', role: '門番の兵士', at: ['aldia', 132, 12], look: ['soldier', {}], face: -Math.PI / 2,
    persona: '居眠りの常習犯。人懐っこい。',
    lines: ['ふあぁ…あ、いや、寝てません！ 見張ってました！', 'ロイの奴、真面目すぎるんだよなぁ。…あ、これ内緒ね。'] },
  { id: 'karl', name: 'カール', role: '巡回兵士', at: ['aldia', 60, 6], move: 'patrol', path: [[60, 6], [-60, 6], [-60, -6], [60, -6]], look: ['soldier', {}],
    persona: '新米兵士。張り切りすぎて空回りしがち。',
    lines: ['巡回中！ 異常なし！ …たぶん！', '隊長に褒められたくて、毎日走り回ってます！'] },
  { id: 'marco', name: 'マルコ', role: '城の衛兵', spot: 'throne', off: [-9, 22], look: ['soldier', {}],
    persona: '冷静沈着。王女の脱走に日々頭を悩ませている。',
    lines: ['王女様がまた城を抜け出された…いえ、何でもありません。', '陛下は謁見の間におられる。階段を上がってまっすぐだ。'] },
  { id: 'anna', name: 'アンナ', role: '城の侍女', spot: 'throne', off: [9, 22], look: ['maid', {}],
    persona: '几帳面で完璧主義。紅茶の淹れ方にうるさい。',
    lines: ['紅茶は九十五度のお湯で三分。これ以上でも以下でもいけません。', '王女様の靴に泥が…またですか…。'] },
  { id: 'dario', name: 'ダリオ', role: '武器屋の主人', bld: 'aldia_weapon', shop: 'aldia_weapon', look: ['smith', { beard: 0x6a4a2a, top: 0x5a3a2a }],
    persona: '元冒険者。自慢話が長い。',
    lines: ['いらっしゃい！ この魔導の杖はな、俺が若い頃ドラゴンの巣から…まあ聞けって。'] },
  { id: 'minerva', name: 'ミネルバ', role: '道具屋の主人', bld: 'aldia_item', shop: 'aldia_item', look: ['clerk', { top: 0x3a7a5a }],
    persona: '優しく丁寧。薬草学に詳しい。',
    lines: ['いらっしゃいませ。薬草から丁寧に作った回復薬ですよ。'] },
  { id: 'boris', name: 'ボリス', role: '宿屋「金の獅子亭」の主人', bld: 'aldia_inn', inn: 30, look: ['innkeeper', { bulk: 1.35 }],
    persona: '大柄で寡黙。料理の腕は王都一。',
    lines: ['…いらっしゃい。金の獅子亭だ。飯はうまい。ベッドも広い。'] },
  { id: 'nina', name: 'ニナ', role: '冒険者ギルドの受付', bld: 'aldia_guild', look: ['clerk', { hair: 0xb88a4a }],
    persona: 'てきぱきした仕事人。笑顔の裏で計算高い。',
    lines: ['冒険者ギルドへようこそ！ 依頼のご相談はこちらです♪'],
    side: { id: 's_wolf', kill: 'wolf', n: 5, reward: { gold: 400, items: { hipotion: 1 } },
      offer: ['ちょうどよかった！ 迷いの森のウルフが増えて、旅人が困っているんです。', '5匹退治してくだされば、ギルドから報酬をお支払いしますよ♪'],
      progress: ['ウルフは迷いの森に多いですよ。炎がよく効くそうです。'],
      done: ['お疲れさまでした！ こちら報酬です。ギルドの評価、上げておきますね♪'],
      after: ['またのご利用をお待ちしてます♪ …次の依頼、もう少し高額でも大丈夫ですよね？'] } },
  { id: 'ambrose', name: 'アンブロシウス', role: '教会の神父', bld: 'aldia_church', look: ['priest', { beard: 0xd9d6cf, hair: 0xc9c6bf }],
    persona: '温厚で説教が長い。実は甘いもの好き。',
    lines: ['迷える子羊よ…いや、魔法使いよ。光の加護があらんことを。',
      '千年前、大魔導士アルマは『無限の光』で闇を封じたと伝わっています。',
      '…神父が甘いものを好きで、何が悪いのです？'] },
  { id: 'clara', name: 'クララ', role: 'シスター', bld: 'aldia_church', off: [3, 3], move: 'wander', r: 6, look: ['nun', {}],
    persona: '天然で慈愛に満ちている。よく転ぶ。',
    lines: ['あっ、こんにちは！ …きゃっ！ …えへへ、また転んじゃいました。',
      '傷ついた人を癒すのが、わたしの魔法です。…あっ、魔法じゃなくてお祈りでした。'] },
  { id: 'gino', name: 'ジーノ', role: '酒場「踊る子鹿亭」の主人', bld: 'aldia_bar', look: ['man', { apron: 0x3a2a1a, beard: 0x2a1f1a }],
    persona: '情報通。口は軽いが、肝心なことは言わない。',
    lines: ['踊る子鹿亭へようこそ。一杯どうだい？ …子どもにはミルクだ。',
      '最近、帝国の商人が妙に多い。何か嗅ぎ回ってるみたいだぜ。',
      '竜の峰の古竜？ 見た奴はみんな戻ってこねえよ。…戻った奴は話したがらねえ。'] },
  { id: 'rose', name: 'ロゼ', role: '踊り子', bld: 'aldia_bar', off: [-4, 3], move: 'wander', r: 5, look: ['dancer', {}],
    persona: '情熱的で自由奔放。',
    lines: ['あら、いい目をしてる。魔法使いさん、一曲踊っていかない？', 'オーラってね、踊りと同じ。心が燃えるほど大きくなるのよ。'] },
  { id: 'toto', name: 'トト', role: '王都の子供', at: ['aldia', 6, 30], move: 'wander', r: 12, look: ['boy', {}],
    persona: 'いたずら好き。',
    lines: ['へへーん、捕まえてみな！ …え、捕まえないの？ つまんないの。', '噴水にコインを投げると、願いがかなうんだって！'] },
  { id: 'mimi', name: 'ミミ', role: '王都の子供', at: ['aldia', -6, 32], move: 'wander', r: 10, look: ['girl', { dress: 0xe07a8a }],
    persona: '夢見がちで、お姫様に憧れている。',
    lines: ['わたし、大きくなったらお姫様になるの！ …なれないの？ 知ってるもん！'] },
  { id: 'beatrice', name: 'ベアトリス', role: '貴族の婦人', at: ['aldia', 14, 28], look: ['noble_f', { dress: 0x9a4a7a }],
    persona: '高飛車だが根は優しい。',
    lines: ['まあ、ずいぶん地味なローブですこと。…でも、目は悪くありませんわね。',
      'ベルカの商人が売る絹は最高ですのよ。帝国産は…趣味が悪いですわ。'] },
  { id: 'zacharia', name: 'ザカリア', role: '物乞いの老人', at: ['aldia', 124, 30], look: ['beggar', {}],
    persona: '実は元宮廷魔術師。飄々として、核心を突く。',
    lines: ['…小銭はいらんよ。代わりに教えてやろう。魔法は『込める』ものだ。杖を掲げたまま、長く、深く。',
      '器の大きな者ほど、込められる魔力も大きい。お前さん…底が見えんな。',
      'わしも昔は宮廷魔術師だった。…信じるかどうかは任せる。'] },
  { id: 'felix', name: 'フェリクス', role: '王立図書館の司書', bld: 'aldia_lib', look: ['scholar', {}],
    persona: '本の虫。話し始めると止まらない。',
    lines: ['静かに…ここは王立図書館です。…ところで虚無の王について知りたくありませんか？ 千年前の記録によれば…（以下三十分続く）',
      '『三つの星晶が揃うとき、封印は完全となる』…古い詩の一節です。',
      '魔力の結晶は、世界の各地に眠っていると言われています。触れれば、器が広がるとか。'] },
  { id: 'poppy', name: 'ポピー', role: '花売りの娘', at: ['aldia', -10, 46], look: ['woman', { dress: 0xf2d24a, hairStyle: 'pony' }],
    persona: '明るく健気。病気の母のために働いている。',
    lines: ['お花はいかがですか？ …あ、魔法使いさんには燃えちゃうかな？', 'お母さんの薬代、あと少しで貯まるんです。'] },

  /* ---------- 魔法学院 ---------- */
  { id: 'seles', name: 'セレス', role: '魔法学院 学院長', spot: 'academyHall', off: [0, 2], look: ['wizard_f', { dress: 0x3a2a6a, hair: 0xe8e4f0 }],
    persona: '聡明で冷静。厳しいが弟子思い。紅茶と猫が好き。',
    lines: ['魔法の基礎は、炎・氷・雷。弱い魔法ほど、術者の器がそのまま表れるのです。',
      '力に溺れてはいけません。…と言っても、あなたは溺れるほど深い器を持っているのですけれど。'] },
  { id: 'volk', name: 'ヴォルク', role: '炎の教師', at: ['academy', -28, 14], look: ['wizard_m', { dress: 0x9a2a1a, beard: 0x8a2a1a, hair: 0x8a2a1a }],
    persona: '熱血漢。何でも燃やしたがる。',
    lines: ['炎は情熱！ 情熱は炎！ 杖を掲げて、心の火を燃やせぇぇ！',
      '炎は草木の魔物や獣によく効くぞ！ 逆に、岩や甲羅の固い奴には効きが悪い！',
      '長く溜めれば溜めるほど、炎はでかくなる！ 限界？ そんなものはない！'] },
  { id: 'yukina', name: 'ユキナ', role: '氷の教師', at: ['academy', -22, 14], look: ['wizard_f', { dress: 0x5a8ab8, hair: 0xd8e8f8 }],
    persona: 'クールで無表情。実は熱いお茶が苦手。',
    lines: ['氷は静寂。相手の動きを鈍らせ、強く当てれば凍りつかせる。', '…炎の先生はうるさい。', '砂漠の魔物や、トカゲの仲間には、氷がよく効くわ。'] },
  { id: 'raiga', name: 'ライガ', role: '雷の教師', at: ['academy', 8, 10], move: 'wander', r: 8, look: ['wizard_m', { dress: 0x8a7a1a, hair: 0xe8d84a }],
    persona: 'せっかちで早口。',
    lines: ['雷は速い！ 狙った相手に一瞬で落ちる！ しかも近くの敵に連鎖する！ 便利！ 以上！', 'スライムとかコウモリには雷が効く！ 覚えとけ！ 次！'] },
  { id: 'noah', name: 'ノア', role: '学院の学生', at: ['academy', -10, 16], move: 'wander', r: 6, look: ['student', {}],
    persona: '優等生だが自信がない。',
    lines: ['ぼく、試験でいつも二番なんです…。一番の子が、すごくて。',
      'オートフォーカスって知ってますか？ 杖が自動で近くの敵を狙ってくれるんです。Tabキーで狙いを切り替えられますよ。'] },
  { id: 'elsa', name: 'エルザ', role: '学院の学生', at: ['academy', 12, 22], look: ['student', { dress: 0x7a2a4a, hairStyle: 'long', hair: 0xd9c27a }],
    persona: '負けず嫌いの天才肌。',
    lines: ['あなた、新入り？ 言っとくけど、学院で一番はあたしだから。', '……でも、あなたのオーラ、ちょっと…大きすぎない？'] },
  { id: 'popo', name: 'ポポ', role: '学院の学生', at: ['academy', -34, 12], look: ['student', { bulk: 1.3, scale: 0.8 }],
    persona: '食いしん坊でマイペース。',
    lines: ['お腹すいた…。魔法ってお腹すくよね…。', '食堂のパンは、朝いちばんが一番おいしいよ。'] },
  { id: 'olga', name: 'オルガ', role: '学院の図書係', bld: 'academy_lib', look: ['scholar', { dress: 0x4a4a6a, hairStyle: 'bun', hair: 0xc9c6bf }],
    persona: '物静かで記憶力抜群。',
    lines: ['地図を開けば、訪れた場所の転移石へ一瞬で移動できますよ。まずは石に触れておくこと。',
      '魔力の結晶は、見つけるたびに器を広げます。学院の記録では、十五以上あるとか。'] },

  /* ---------- 交易都市ベルカ ---------- */
  { id: 'malcolm', name: 'マルコム', role: '商人ギルド長', bld: 'belka_guild', look: ['merchant', { top: 0x5a2a6a, bulk: 1.4 }],
    persona: '抜け目ない商人。損得勘定が早いが、約束は必ず守る。',
    lines: ['ようこそ交易都市ベルカへ。ここでは何でも買える。…正しい値段さえ払えばな。', '帝国との交易が細っている。宰相ゼノンが関所を締めつけているのだ。'] },
  { id: 'gold', name: 'ゴルド', role: '武器屋「アイアンベル」', bld: 'belka_weapon', shop: 'belka_weapon', look: ['smith', { beard: 0xb88a4a }],
    persona: '豪快な職人。自分の作品を子供のように愛している。',
    lines: ['アイアンベルへようこそ！ うちの杖は、叩いて鍛えて祈って仕上げた自信作だ！'] },
  { id: 'sissy', name: 'シシィ', role: '道具屋「七つの鞄」', bld: 'belka_item', shop: 'belka_item', look: ['woman', { apron: 0xf4f0e6 }],
    persona: 'おしゃべりで商売上手。',
    lines: ['七つの鞄へようこそ！ 七つもないし、鞄も売ってないの、ごめんね！ 薬ならあるよ！'] },
  { id: 'paolo', name: 'パウロ', role: '宿屋「旅鳥の止まり木」', bld: 'belka_inn', inn: 40, look: ['innkeeper', {}],
    persona: '旅人の話を聞くのが何より好き。',
    lines: ['旅鳥の止まり木へようこそ。旅人の話は、宿代より価値があるんだ。'] },
  { id: 'leo', name: 'レオ', role: '酒場「銀の天秤」のマスター', bld: 'belka_bar', look: ['man', { top: 0x2a2a2a, beard: 0x5a5a5a }],
    persona: '渋い大人。昔は傭兵だった。',
    lines: ['…銀の天秤へようこそ。ここじゃ喧嘩は禁止だ。', '北の山を越える気なら、氷狼に気をつけな。炎が効く。',
      '港町マリナの東の浜には、巨大なカニが出るらしい。雷が効くそうだ。'] },
  { id: 'isaac', name: 'イザーク', role: '両替商', bld: 'belka_bank', look: ['noble_m', { glasses: true, top: 0x2a3a2a }],
    persona: '冷静で皮肉屋。数字しか信じない。',
    lines: ['金は裏切らない。人は裏切るがね。', '魔物を倒せば金貨が手に入る。…魔物がなぜ金貨を持っているのかは、誰も知らない。'] },
  { id: 'rashid', name: 'ラシード', role: '異国の商人', spot: 'belkaStall0', fb: 'belka', look: ['desert_m', {}],
    persona: '陽気で話好き。砂漠の出身。',
    lines: ['やあやあ、友よ！ 南東の砂漠のオアシス、サラの集落は私の故郷だ！', '砂サソリには氷が効く。熱い砂の上では、奴らも冷たいものが苦手なのさ！'] },
  { id: 'jean', name: 'ジャン', role: '大道芸人', at: ['belka', 8, 8], move: 'wander', r: 8, look: ['bard', { hat: 'feather', hatColor: 0xc8321e, top: 0xf2d24a }],
    persona: 'いつも笑顔。その奥に悲しみを隠している。',
    lines: ['さあさあ、ご覧あれ！ 火を吹く男！ …ごほっ、ごほっ。今日は調子が悪い。', '笑っていれば、たいていのことはなんとかなるのさ。'] },
  { id: 'hans', name: 'ハンス', role: 'ベルカの衛兵', at: ['belka', 0, -12], move: 'patrol', path: [[0, -12], [40, -12], [40, 12], [-40, 12], [-40, -12]], look: ['soldier', { top: 0x6a5a2a }],
    persona: '皮肉っぽいがお人好し。',
    lines: ['ベルカで盗みを働く奴は、俺が許さん。…財布は自分で守れよ。'] },
  { id: 'gert', name: 'ゲルト', role: 'ベルカの衛兵', at: ['belka', -44, 4], look: ['soldier', { top: 0x6a5a2a }],
    persona: '極端に無口。',
    lines: ['……異常なし。', '……。', '……良い旅を。'] },
  { id: 'rico', name: 'リコ', role: '商人の息子', at: ['belka', -6, 24], move: 'wander', r: 10, look: ['boy', { hat: 'cap', hatColor: 0x7a3a2a }],
    persona: '値切りが得意なちゃっかり者。',
    lines: ['ねえ、なんか買って！ 安くしとくよ！ …ぼくの店じゃないけど！'] },
  { id: 'camilla', name: 'カミラ', role: '仕立て屋', at: ['belka', 20, -26], move: 'wander', r: 6, look: ['woman', { dress: 0xb85ac8 }],
    persona: 'おしゃれにとても厳しい。',
    lines: ['そのローブ、裾がほつれてるわ。旅人ってみんなそうなのよね。'] },

  /* ---------- オアシスの集落サラ ---------- */
  { id: 'hasan', name: 'ハサン', role: 'サラの族長', bld: 'oasis_chief', look: ['desert_m', { beard: 0xd9d6cf, hair: 0xc9c6bf, bent: true }],
    persona: '厳格で誇り高い。砂漠の掟を重んじる。',
    lines: ['砂漠では水が命。命を粗末にする者に、砂漠は容赦しない。'],
    side: { id: 's_scorpion', kill: 'scorpion', n: 5, reward: { gold: 800, items: { ether: 2 } },
      offer: ['旅の魔法使いよ。砂サソリどもが水場を荒らしている。', '5匹を追い払ってはくれまいか。報酬は砂漠の掟にかけて払おう。'],
      progress: ['サソリは砂漠のいたる所にいる。氷の魔法が効くと聞く。'],
      done: ['見事だ。砂漠の民は恩を忘れぬ。受け取るがよい。'],
      after: ['お前はもう、この集落の友だ。'] } },
  { id: 'fara', name: 'ファラ', role: '水売り', spot: 'oasisStall-10', fb: 'oasis', look: ['desert_f', {}],
    persona: 'たくましく、値段交渉が激しい。',
    lines: ['水、水はいらんかね！ …魔法で氷が出せる？ 商売あがったりだよ！'] },
  { id: 'jamil', name: 'ジャミル', role: '砂漠の商人', bld: 'oasis_t0', shop: 'oasis_shop', look: ['desert_m', { hatColor: 0x3a2a4a, top: 0x5a3a6a }],
    persona: '神秘的。遠い国の品を扱う。',
    lines: ['砂塵のマントは、熱も魔物の爪も防ぐ。遠い国の技だ。'] },
  { id: 'layla', name: 'ライラ', role: '「砂の宿」の女主人', bld: 'oasis_inn', inn: 50, look: ['desert_f', { hatColor: 0xd9a13a }],
    persona: '穏やかで包容力がある。',
    lines: ['砂の宿へようこそ。夜の砂漠は冷えるわ。ゆっくり休んでいって。'] },
  { id: 'omar', name: 'オマル', role: '砂漠の旅人', at: ['oasis', -14, 28], move: 'wander', r: 6, look: ['desert_m', { hatColor: 0x8a6a3a }],
    persona: '冒険好き。迷子の常習犯。',
    lines: ['砂漠の東の端に、光る石が落ちてたんだ。…どこだったかな。', '星を見れば方角が分かる。…はずなんだけどなあ。'] },
  { id: 'samira', name: 'サミラ', role: '踊り子', at: ['oasis', 10, -22], look: ['dancer', { dress: 0x3a7ab8, skin: 0xc68a5e }],
    persona: '誇り高い。踊りは祈りだと信じている。',
    lines: ['オアシスの水は、星の涙から生まれたと言われているの。', '踊りは雨乞いの祈り。…魔法使いさん、雨は降らせられる？'] },

  /* ---------- 霧の峠 ---------- */
  { id: 'gen', name: 'ゲン', role: '峠の茶屋の主人', bld: 'pass_tea', shop: 'pass_shop', look: ['elder_m', { top: 0x4a5a6a, prop: 'none', bent: false }],
    persona: '江戸っ子気質。峠の生き字引。',
    lines: ['へいらっしゃい！ 峠の団子は疲れに効くよ！ …うちは回復薬も置いてるがね！'] },
  { id: 'gustav', name: 'グスタフ', role: '山の猟師', bld: 'pass_hut', look: ['hunter', { beard: 0x4a3222, hatColor: 0x5a3a2a }],
    persona: '寡黙で頼れる。山のことは何でも知っている。',
    lines: ['この先は帝国領だ。関所の兵は融通が利かん。', '山トロルは火に弱い。…が、でかい。近づかれる前に仕留めろ。'] },
  { id: 'sion', name: 'シオン', role: '巡礼者', at: ['pass', 4, 20], move: 'wander', r: 5, look: ['nun', { dress: 0x6a6a7a, hatColor: 0x6a6a7a }],
    persona: '物静かで信心深い。',
    lines: ['竜の峰へ祈りに行こうとして…諦めました。あそこは、祈る場所ではありません。'] },
  { id: 'luke', name: 'ルーク', role: '帝国の脱走兵', at: ['pass', 22, 8], look: ['man', { armor: 0x4a4a52, top: 0x6a1a1a }],
    persona: '臆病だが正直。',
    lines: ['…お、俺のことは見なかったことにしてくれ。', '宰相ゼノンは、兵士を実験に使っているんだ…。俺は、もう嫌だった。'] },

  /* ---------- 帝国の関所 ---------- */
  { id: 'dominic', name: 'ドミニク', role: '関所の帝国兵', spot: 'gate', off: [0, 0], gateSide: -1, look: ['imperial', {}],
    persona: '高圧的だが職務に忠実。',
    lines: ['止まれ！ …ふん、旅の魔法使いか。通ってよし。ただし帝都で騒ぎは起こすなよ。'] },
  { id: 'julius', name: 'ユリウス', role: '関所の帝国兵', spot: 'gate', off: [0, 0], gateSide: 1, look: ['imperial', {}],
    persona: '気さく。故郷の母親を心配している。',
    lines: ['帝都は北へまっすぐだ。…なあ、王国って平和なのか？ 母さんが心配でさ。'] },

  /* ---------- 帝都ガルヴァス ---------- */
  { id: 'emperor', name: 'ヴァルゼル', role: 'ガルヴァス皇帝', spot: 'emperorThrone', off: [0, 0.4], look: ['emperor', {}],
    persona: '冷徹で誇り高い。かつては民思いの名君だった。',
    lines: ['余に何用だ。…用がないなら去れ。', '帝国は強くあらねばならん。…そう、強く。'] },
  { id: 'zenon', name: 'ゼノン', role: '帝国宰相', spot: 'emperorThrone', off: [-4, 3], look: ['chancellor', {}],
    persona: '慇懃無礼。微笑みの裏に底知れぬ悪意を隠している。',
    lines: ['おや、王国の魔法使い殿。帝都の居心地はいかがですかな？ くくく…。', '星晶？ さて、何のことやら。…しかし、あなたのオーラ、実に興味深い。'] },
  { id: 'bram', name: 'ブラム', role: '帝国将軍', spot: 'emperorThrone', off: [6, 18], move: 'patrol', path: [[6, 18], [-6, 18], [-6, 30], [6, 30]], look: ['officer', { beard: 0x5a5a5a }],
    persona: '武人気質。皇帝への忠誠と疑念の間で揺れている。',
    lines: ['陛下は変わられた。…いや、今の言葉は忘れろ。', '我が軍は宰相の命令で、魔導兵器の開発を急いでいる。何のためかは…知らされていない。'] },
  { id: 'arno', name: 'アルノ', role: '帝国兵', at: ['empire', -20, 110], look: ['imperial', {}],
    persona: '忠誠心の塊。',
    lines: ['帝国万歳！ …あんた王国の人間か。まあいい、騒ぎは起こすなよ。'] },
  { id: 'viktor', name: 'ヴィクトル', role: '帝国兵', at: ['empire', 0, 60], move: 'patrol', path: [[0, 60], [40, 40], [0, 20], [-40, 40]], look: ['imperial', {}],
    persona: '口が悪いが面倒見がいい。',
    lines: ['この街で迷ったら宮殿を目印にしな。でかいから嫌でも見える。'] },
  { id: 'erik', name: 'エーリク', role: '宮殿の衛兵', spot: 'emperorThrone', off: [-10, 24], look: ['imperial', {}],
    persona: 'いつも眠そう。',
    lines: ['宮殿の警備は退屈だ…。宰相が夜中に地下へ降りていくのを見たって奴がいたが…。'] },
  { id: 'mattias', name: 'マティアス', role: '帝国兵', bld: 'empire_barracks', look: ['imperial', {}],
    persona: '皮肉屋。',
    lines: ['魔導技術院の連中は、また何か爆発させたらしいな。'] },
  { id: 'klaus', name: 'クラウス', role: '帝国武具店の店主', bld: 'empire_weapon', shop: 'empire_weapon', look: ['smith', { top: 0x3a3a3a }],
    persona: '腕は一流、愛想は三流。',
    lines: ['…買うのか、買わないのか。帝国の武具は世界一だ。'] },
  { id: 'helga', name: 'ヘルガ', role: '帝国薬舗の薬師', bld: 'empire_item', shop: 'empire_item', look: ['elder_f', { bent: false, dress: 0x3a4a3a }],
    persona: '厳しいが、薬の腕は確か。',
    lines: ['ちゃんと効く薬しか置いてないよ。値段も相応さ。'] },
  { id: 'otto', name: 'オットー', role: '宿屋「鉄の揺り籠」の主人', bld: 'empire_inn', inn: 80, look: ['innkeeper', { top: 0x4a4a4a }],
    persona: '用心深い。',
    lines: ['鉄の揺り籠へようこそ。…夜は外を出歩かないほうがいい。'] },
  { id: 'iris', name: 'イリス', role: '魔導技師', bld: 'empire_lab', look: ['scholar', { dress: 0x3a3a4a, hairStyle: 'pony', hair: 0xd94a4a }],
    persona: '天才肌の研究者。倫理より好奇心が勝ってしまう。',
    lines: ['魔導兵器？ ええ、わたしが設計したの。…宰相は『星晶の力』で動かすつもりみたい。', 'あなたのオーラ、測定させてくれない？ …測定器が壊れそうね。'] },
  { id: 'karasu', name: 'カラス', role: '反乱軍の密偵', at: ['empire', -60, 80], look: ['hunter', { hatColor: 0x1a1a1a, top: 0x2a2a2a }],
    persona: '冷静で用心深い。帝国の未来を憂えている。',
    lines: ['…大きな声を出すな。俺たちは宰相を追い出したいだけだ。皇帝陛下は、操られている。', '宰相は『虚無の王』とかいう存在と通じているらしい。…証拠は、まだない。'] },
  { id: 'greta', name: 'グレタ', role: '帝都の市民', at: ['empire', 30, 80], move: 'wander', r: 8, look: ['woman', { dress: 0x5a4a4a }],
    persona: '心配性の母親。',
    lines: ['最近、税がまた上がったの。子どもたちに何を食べさせればいいのかしら。'] },
  { id: 'fritz', name: 'フリッツ', role: '帝都の市民', at: ['empire', 50, 20], look: ['man', { top: 0x5a3a2a }],
    persona: '愛国者だが酒好き。',
    lines: ['帝国が一番！ 王国なんて目じゃない！ …ひっく。'] },
  { id: 'lulu', name: 'ルル', role: '帝都の子供', at: ['empire', 20, 70], move: 'wander', r: 10, look: ['girl', { dress: 0x7ac0e0 }],
    persona: '元気いっぱい。',
    lines: ['皇帝さまのお城、おっきいでしょ！ でもね、夜は怖いの。変な光が見えるの。'] },

  /* ---------- 古代遺跡 ---------- */
  { id: 'johan', name: 'ヨハン', role: '考古学者', bld: 'ruins_camp', look: ['scholar', { beard: 0x8a6a4a }],
    persona: '研究熱心。夢中になると周りが見えなくなる。',
    lines: ['この遺跡は千年前の神殿だ！ 地下迷宮の奥には封印の間があるはずなんだが…番人がいてね。',
      '入口は神殿の奥、光る文字の門だ。中は暗い。気をつけたまえ。'] },
  { id: 'mina', name: 'ミーナ', role: '考古学者の助手', bld: 'ruins_camp', off: [3, 2], look: ['woman', { top: 0x8a7a5a, hairStyle: 'pony' }],
    persona: 'しっかり者。先生のお守り役。',
    lines: ['先生、またご飯を忘れて…。あ、旅の方？ 先生の話は半分で聞いてくださいね。', 'スケルトンは炎に弱いです。ゴーレムには氷がよく効くみたい。'] },

  /* ---------- 森の集落リーフェ ---------- */
  { id: 'elwin', name: 'エルウィン', role: '森の長老', at: ['leafe', 0, 9], look: ['elf_m', { beard: 0xf4f0e6, hair: 0xf4f0e6, bent: true, prop: 'cane' }],
    persona: '千年を生きる賢者。ゆったりと話す。',
    lines: ['森は…ずっと…見ていた…。千年前の…戦いも…。', '大魔導士アルマは…わしの…友であった…。君のオーラは…彼女に…よく似ておる…。'],
    side: { id: 's_mushroom', kill: 'mushroom', n: 6, reward: { gold: 300, aura: 1.1 },
      offer: ['森が…病んで…おる…。おばけキノコが…増えすぎた…。', '6つ…払ってくれれば…森の祝福を…授けよう…。'],
      progress: ['キノコは…森の…あちこちに…おる…。炎が…よう効く…。'],
      done: ['ありがとう…。森の祝福を…君の器に…。', '（温かな光が体を包み、魔力の器が広がった）'],
      after: ['森は…君を…覚えておる…。'] } },
  { id: 'leaf', name: 'リーフ', role: '森の薬師', bld: 'leafe_h0', shop: 'leafe_shop', look: ['elf_f', {}],
    persona: '植物を愛する。人間嫌いだが、魔法使いには優しい。',
    lines: ['森の薬よ。人間の作る薬とは、効き目が違うわ。'] },
  { id: 'silva', name: 'シルヴァ', role: 'エルフの弓使い', at: ['leafe', 16, 0], move: 'patrol', path: [[16, 0], [0, 16], [-16, 0], [0, -16]], look: ['elf_m', { hair: 0x8ab86a }],
    persona: '誇り高く排他的。認めた相手には忠実。',
    lines: ['人間がこの森に何の用だ。…魔法使いか。なら、少しは話を聞いてやる。', '迷いの森の南西に、嘆きの沼地がある。魔女が住んでいるから近づくな。'] },
  { id: 'pippin', name: 'ピピン', role: 'エルフの子', at: ['leafe', -6, 12], move: 'wander', r: 8, look: ['elf_f', { scale: 0.62, dress: 0x8ae07a }],
    persona: 'いたずら好き。',
    lines: ['人間って耳が丸いんだね！ へんなのー！', '妖精の泉はね、森の東のほうにあるよ。光ってるからすぐわかるよ！'] },
  { id: 'bart', name: 'バート', role: '木こり', at: ['leafe', 26, 20], look: ['man', { prop: 'axe', top: 0x9a3b3b, beard: 0x7a5230 }],
    persona: '森に住まわせてもらっている人間。律儀。',
    lines: ['エルフの許しをもらって、枯れ木だけ切らせてもらってるんだ。', '森の中は方角がわからなくなる。地図をよく見るんだな。'] },

  /* ---------- 沼の魔女の庵 ---------- */
  { id: 'belladonna', name: 'ベラドンナ', role: '沼の魔女', bld: 'swamp_hut', shop: 'witch_shop', look: ['witch', {}],
    persona: '皮肉屋で気まぐれ。実は寂しがり屋。',
    lines: ['ひっひっひ…珍しい客だね。わたしの秘薬が欲しいのかい？', 'オーラの大きい子は嫌いじゃないよ。…からかい甲斐があるからね。',
      'リザードマンには氷。カエルには炎。覚えておきな。'] },
  { id: 'noir', name: 'ノワール', role: '魔女の黒猫', bld: 'swamp_hut', off: [-3, 1], cat: true,
    persona: '気位が高い。ご主人のことが大好き。',
    lines: ['にゃあ。（ご主人は本当はとても優しいのだ、と言っている気がする）', 'ふしゃー！ （撫でるのはまだ早い、と言っている気がする）'] },

  /* ---------- 港町マリナ ---------- */
  { id: 'bernardo', name: 'ベルナルド', role: '港長', bld: 'marina_harbor', look: ['sailor', { beard: 0xd9d6cf, hair: 0xc9c6bf, bulk: 1.3 }],
    persona: '海の男。声が大きく涙もろい。',
    lines: ['わっはっは！ マリナの港へようこそ！ 海はいいぞぉ！', '月影島へ渡りたいなら、東の桟橋の船頭に頼むといい。'],
    side: { id: 's_crab', kill: 'crab', n: 4, reward: { gold: 500, items: { hipotion: 2 } },
      offer: ['頼みがある！ 東の浜にヨロイガニが住みついて、漁に出られんのだ！', '4匹ほど追っ払ってくれんか！ 礼ははずむぞ！'],
      progress: ['カニは港の東の浜と、月影島のまわりにおる。雷が効くらしいぞ！'],
      done: ['おおお！ ありがとう！ 漁師たちも喜ぶ！ …うっ、泣けてきた。'],
      after: ['海の男は恩を忘れんぞ！'] } },
  { id: 'jonas', name: 'ヨナス', role: '船頭', spot: 'ferry', ferry: 'island', look: ['fisher', { hat: 'bandana', hatColor: 0x2a4a8a, prop: 'none' }],
    persona: '無口だが、舵取りの腕は確か。',
    lines: ['…乗るかい。月影島まで30ゴールドだ。'] },
  { id: 'pedro', name: 'ペドロ', role: '漁師', at: ['marina', -8, 66], look: ['fisher', {}],
    persona: '陽気。魚の自慢ばかりしている。',
    lines: ['今朝はこーんな大きなマグロが…いや、これくらい…いや、このくらいだったな！'] },
  { id: 'lucia', name: 'ルシア', role: '漁師の妻', spot: 'fishStall44', fb: 'marina', look: ['woman', { apron: 0xf4f0e6, hairStyle: 'bun' }],
    persona: 'しっかり者の働き者。',
    lines: ['新鮮なお魚だよ！ …魔法使いさん、炎の魔法で焼いてくれない？ 手間が省けるわ。'] },
  { id: 'nerea', name: 'ネレア', role: '道具屋「潮風」', bld: 'marina_item', shop: 'marina_item', look: ['woman', { dress: 0x3a8ab8 }],
    persona: '海が大好きなおっとりさん。',
    lines: ['潮風の香りのする道具屋へようこそ〜。'] },
  { id: 'carla', name: 'カルラ', role: '宿屋「カモメの巣」の女将', bld: 'marina_inn', inn: 35, look: ['innkeeper', { hat: 'bandana', hatColor: 0xc8321e, hairStyle: 'long' }],
    persona: '元海賊。今はすっかり丸くなった。',
    lines: ['カモメの巣へようこそ。…昔の話はしないよ。'] },
  { id: 'mateo', name: 'マテオ', role: '武器屋「波切り」', bld: 'marina_weapon', shop: 'marina_weapon', look: ['smith', { top: 0x2a4a7a }],
    persona: '海賊の武器にも詳しい、陽気な職人。',
    lines: ['波切りへようこそ！ 海風に負けない杖を揃えてるぜ！'] },
  { id: 'barbaro', name: 'バルバロ', role: '海賊風の男', bld: 'marina_bar', look: ['sailor', { beard: 0x1a1a1a, bulk: 1.3, hatColor: 0x1a1a1a }],
    persona: '豪快でほら吹き。でも憎めない。',
    lines: ['俺は七つの海を制した大海賊バルバロ様だ！ …今は酒場の常連だがな！', '月影島の巫女は、月の星晶を守ってるんだとよ。狙ってる奴もいるらしいぜ。'] },
  { id: 'nami', name: 'ナミ', role: '港の子供', at: ['marina', 0, 50], move: 'wander', r: 10, look: ['girl', { dress: 0x3ab8c8 }],
    persona: '海で泳ぐのが大好き。',
    lines: ['わたし、月影島まで泳いだことあるよ！ …途中までだけど。'] },

  /* ---------- 月影島 ---------- */
  { id: 'tsukuyo', name: 'ツクヨ', role: '月影島の巫女', spot: 'shrine', look: ['miko', {}],
    persona: '神秘的で静か。月の声を聞くことができる。',
    lines: ['月は、すべてを見ています。あなたの行く道も。', '星晶は祈りの結晶。争いの道具ではありません。'] },
  { id: 'genji', name: 'ゲンジ', role: '漁村の長老', bld: 'island_h0', look: ['elder_m', { hat: 'straw', hatColor: 0xd9c27a }],
    persona: '穏やかで昔話好き。',
    lines: ['この島は昔、月から落ちてきた石でできたと言われとる。', '巫女様は小さい頃から月と話ができた。不思議な子じゃ。'] },
  { id: 'akari', name: 'アカリ', role: '灯台守の娘', spot: 'lighthouse', look: ['woman', { hairStyle: 'pony', top: 0xc8321e, dress: 0x2a3a5a }],
    persona: '明るく一途。灯台の光を守ることに誇りを持っている。',
    lines: ['灯台の光は、どんな嵐の夜も消しちゃいけないの。父さんとの約束なんだ。', '夜の海には、昔沈んだ船の亡霊が出るって…ほんとかな？'] },
  { id: 'saburo', name: 'サブロウ', role: '島の船頭', spot: 'islandDock', ferry: 'marina', look: ['fisher', {}],
    persona: 'のんびり屋。',
    lines: ['本土に戻るかい？ 30ゴールドだよ。のんびり行こうや。'] },
  { id: 'umi', name: 'ウミ', role: '島の子供', at: ['island', 6, 10], move: 'wander', r: 10, look: ['boy', { top: 0x3a8ab8 }],
    persona: '物知り自慢。',
    lines: ['島のまわりのカニは、雷でビリビリさせると一発だよ！ …たぶん！'] }
];

/* =========================================================
   住民を動かす
   ========================================================= */
const NPC_LIST = [];
const NPC_BY_ID = {};

function catModel() {
  const B = new Builder();
  B.box(0, 0.35, 0, 0.3, 0.3, 0.6, 0x1a1a1e);
  B.box(0, 0.55, 0.35, 0.3, 0.28, 0.28, 0x1a1a1e);
  B.cone(-0.09, 0.75, 0.35, 0.06, 0.14, 0x1a1a1e, 4); B.cone(0.09, 0.75, 0.35, 0.06, 0.14, 0x1a1a1e, 4);
  B.box(-0.07, 0.58, 0.5, 0.05, 0.05, 0.02, 0xe8e04a); B.box(0.07, 0.58, 0.5, 0.05, 0.05, 0.02, 0xe8e04a);
  for (const [x, z] of [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]]) B.box(x, 0.12, z, 0.08, 0.25, 0.08, 0x1a1a1e);
  B.cyl(0, 0.55, -0.4, 0.03, 0.04, 0.5, 0x1a1a1e, 5, 0, -0.5);
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model); model.add(B.mesh());
  return { root, model };
}

function resolveNpcPos(d) {
  let x = 0, z = 0, face = 0, y;
  const off = d.off || [0, 0];
  if (d.bld && BLD[d.bld]) {
    const b = BLD[d.bld];
    const [ox, oz] = rotXZ(off[0], off[1], b.ry);
    x = b.door.x + ox; z = b.door.z + oz; face = b.ry;
  } else if (d.spot && SPOTS[d.spot]) {
    const s = SPOTS[d.spot];
    if (d.gateSide) {
      x = s.x + s.px * d.gateSide * 3.0; z = s.z + s.pz * d.gateSide * 3.0; face = s.dir + Math.PI;
    } else { x = s.x + off[0]; z = s.z + off[1]; face = 0; }
    if (s.y !== undefined && off[0] === 0 && Math.abs(off[1]) < 1) y = s.y;
  } else if (d.at) {
    const p = PLACE[d.at[0]];
    x = p.x + d.at[1]; z = p.z + d.at[2];
    face = Math.atan2(p.x - x, p.z - z);
  }
  else if (d.fb) {
    const p = PLACE[d.fb];
    const R = mulberry32(hashStr(d.id));
    x = p.x + (R() - 0.5) * 20; z = p.z + (R() - 0.5) * 20;
  }
  if (d.face !== undefined) face = d.face;
  return { x, z, face, y };
}

function spawnNPCs() {
  for (const d0 of NPCS) {
    const d = NPC_STORY[d0.id] ? Object.assign({}, d0, NPC_STORY[d0.id]) : d0;
    const p = resolveNpcPos(d);
    let m;
    if (d.cat) m = catModel();
    else {
      const [kind, over] = d.look || ['man', {}];
      m = buildHumanoid(lookFor(kind, d.id, over));
    }
    const y = p.y !== undefined ? p.y : groundAt(p.x, p.z);
    m.root.position.set(p.x, y, p.z);
    m.root.rotation.y = p.face;
    scene.add(m.root);
    const home = { x: p.x, z: p.z };
    let path = null;
    if (d.path) {
      const base = d.spot ? SPOTS[d.spot] : d.at ? PLACE[d.at[0]] : home;
      path = d.path.map(([a, b]) => ({ x: base.x + a, z: base.z + b }));
    }
    const n = { d, id: d.id, name: d.name, m: m.rig ? m : null, rig: m.rig, root: m.root, model: m.model, legL: m.legL, legR: m.legR,
      pos: m.root.position, home, face: p.face, baseFace: p.face, fixedY: p.y, target: null, wait: Math.random() * 3,
      path, pathI: 0, phase: Math.random() * 10, talkCount: 0, talking: false, speed: d.move === 'patrol' ? 1.6 : 1.1 };
    NPC_LIST.push(n);
    NPC_BY_ID[d.id] = n;
  }
}

function updateNPCs(dt, t) {
  const px = player.pos.x, pz = player.pos.z;
  for (const n of NPC_LIST) {
    const dist = Math.hypot(n.pos.x - px, n.pos.z - pz);
    n.root.visible = !n.hidden && !GAME.inDungeon && dist < 170;
    if (n.bubble && n.bubbleLife > 0 && (!n.root.visible || dist > 50 || CUT.active)) hideBubble(n);
    if (!n.root.visible || dist > 140) continue;
    let moving = false;
    // 包囲中：団長の姿を見た人々の声
    if (!STORY_FLAGS.liberated && n.d.siege && n.d.siege.greet && !n.greeted && dist < 10 && !CUT.active) {
      n.greeted = true;
      showBubble(n, n.pos, n.d.siege.greet, 'cry', (n.pose ? 1.4 : 2.3) * (n.d.look && n.d.look[1] && n.d.look[1].scale || 1));
      n.bubbleLife = 4.5;
    }
    if (n.bubble) updateBubble(n);
    if (n.pose) {
      if (n.talking && n.pose !== 'lie') n.face = angleLerp(n.face, Math.atan2(px - n.pos.x, pz - n.pos.z), Math.min(1, dt * 4));
      n.root.rotation.y = n.face;
      continue;
    }
    if (n.talking) {
      n.face = angleLerp(n.face, Math.atan2(px - n.pos.x, pz - n.pos.z), Math.min(1, dt * 8));
    } else if (n.d.move === 'wander' || n.d.move === 'patrol') {
      if (!n.target) {
        n.wait -= dt;
        if (n.wait <= 0) {
          if (n.path) { n.pathI = (n.pathI + 1) % n.path.length; n.target = n.path[n.pathI]; }
          else {
            const a = Math.random() * Math.PI * 2, r = Math.random() * (n.d.r || 5);
            const tx = n.home.x + Math.cos(a) * r, tz = n.home.z + Math.sin(a) * r;
            if (waterAt(tx, tz) - groundAt(tx, tz) < 0.2) n.target = { x: tx, z: tz };
            else n.wait = 1;
          }
        }
      } else {
        const dx = n.target.x - n.pos.x, dz = n.target.z - n.pos.z, dd = Math.hypot(dx, dz);
        if (dd < 0.4) { n.target = null; n.wait = n.path ? 0.5 + Math.random() : 2 + Math.random() * 4; }
        else {
          n.pos.x += dx / dd * n.speed * dt; n.pos.z += dz / dd * n.speed * dt;
          if (resolveCollisions(n.pos, 0.35) && Math.random() < dt * 2) n.target = null;
          n.face = angleLerp(n.face, Math.atan2(dx, dz), Math.min(1, dt * 6));
          moving = true;
        }
      }
      // プレイヤーと重ならない
      const pdx = n.pos.x - px, pdz = n.pos.z - pz, pd = Math.hypot(pdx, pdz);
      if (pd < 0.9 && pd > 0.01) { n.pos.x = px + pdx / pd * 0.9; n.pos.z = pz + pdz / pd * 0.9; }
    } else {
      // 近づくとこちらを見る
      const want = dist < 6 ? Math.atan2(px - n.pos.x, pz - n.pos.z) : n.baseFace;
      n.face = angleLerp(n.face, want, Math.min(1, dt * 3));
    }
    n.pos.y = n.fixedY !== undefined && !moving ? n.fixedY : groundAt(n.pos.x, n.pos.z);
    n.root.rotation.y = n.face;
    if (n.rig) {
      n.phase += dt * (moving ? n.speed * 4.2 : 0);
      if (moving || n.wasMoving || !(n.idleT > 0)) { animateWalk(n.m, n.phase, moving ? 0.75 : 0, t); n.idleT = 0.5; }
      else { n.idleT -= dt; n.rig.bones.chest.rotation.x = n.rig.bent + Math.sin(t * 1.6 + n.phase) * 0.015; }
      n.wasMoving = moving;
      n.model.position.y = moving ? Math.abs(Math.sin(n.phase)) * 0.03 : 0;
    } else n.model.position.y = moving ? Math.abs(Math.sin(n.phase)) * 0.05 : Math.sin(t * 1.8 + n.phase) * 0.012;
  }
}
function nearestNPC(maxD) {
  let best = null, bd = maxD;
  for (const n of NPC_LIST) {
    if (!n.root.visible || n.d.corpse) continue;
    const d = Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z);
    if (d < bd && Math.abs(n.pos.y - player.pos.y) < 3) { bd = d; best = n; }
  }
  return best;
}

/* =========================================================
   物語に合わせた住民の姿（包囲中／解放後）
   siege: 包囲中の居場所と台詞（無ければ包囲中は姿を見せない）
   occ:   帝国に占領された場所（将を倒すまで姿を見せない）
   dead:  この戦で命を落とした
   ========================================================= */
const NPC_STORY = {
  king: { role: 'アルディア国王', persona: '娘を失った父。それでも王であろうとしている。',
    siege: { spot: 'circle', off: [1.3, 0.3], pose: 'kneelCry', cry: true, lines: ['……セシリアは、最後に笑っておった。「お父様、レグルスが来てくれる」と。',
      '余は王だ。泣くのは、民がひとり残らず助かってからでよい。……行ってくれ、レグルス。'] },
    lines: ['娘の墓には、毎朝花が供えられている。……誰が置いているのか、余は知らぬふりをしておる。',
      'レグルス。この国の十万の民のうち、生き残ったのは四万に満たぬ。……それでも、国は国だ。',
      '復讐の先に何があるのか、余にも分からぬ。だが、あの子の命を無駄にはせぬ。'] },
  cecilia: { name: 'セシリア', role: '王女', corpse: true, look: ['princess', {}],
    siege: { spot: 'circle', off: [0, -0.5], pose: 'lie', lines: ['……（安らかな顔で、眠るように横たわっている）'] }, lines: ['……'] },
  oswald: { siege: { spot: 'throne', off: [-5, 4], greet: '……レグルス殿……！ あ、ああ……本当に……！', lines: ['レ、レグルス殿……本当に……。い、いや、震えてなどおりませんぞ。数字を……数を数えていないと、正気が保てんのです。',
      '城に逃げ込めた民は、およそ二千。城下には……まだ、何万と……。'] },
    lines: ['復興の予算……いえ、今は人手です。瓦礫を片づける手が、まるで足りない。', '宰相ゼノン……あの男の目が嫌いだと、私はずっと言っておったのです。……ずっと。'] },
  seles: { name: 'セレス', role: '魔法学院 学院長／王国魔法師団 元副官', look: ['wizard_f', { dress: 0x3a2a6a, hair: 0xe8e4f0, blood: true }],
    persona: 'レグルスの同期で、かつての副官。気丈だが、彼の前でだけは弱さを見せる。',
    siege: { spot: 'circle', off: [-4, 3], lines: ['中庭が破られたら終わりよ。ヴォルクたちを助けて。', 'セシリア様は……あなたを呼ぶために、自分の命を差し出した。あの子、ずっとあなたに懐いてたものね。'] },
    lines: ['五年間、あなたの墓に報告しに行ってた。学院のことも、この国のことも。……まさか返事が来るなんてね。',
      '学院の子たちは半分しか残らなかった。……それでも、また授業をするわ。あなたがそうしたように。'] },
  gareth: { role: '近衛騎士団長（重傷）', look: ['knight', { cape: 0x9a1f2a, blood: true }],
    siege: { spot: 'courtyard', off: [11, -15], pose: 'sit', greet: '……は……幻か……。俺も、もう終わりだな……', lines: ['……わっはっは……ざまぁねえ……脚をやられた……。レグルス、お前……本物か……',
      '騎士は民を守るもんだ……なのに俺は……守られてばかりだ……。……頼む、城下の連中を……'] },
    lines: ['脚は片方になっちまったが、剣は振れる。騎士団を一から鍛え直しだ。', '……レグルス。あの夜、お前が来なかったら、俺たちは全員死んでた。……酒でも奢らせろ。'] },
  volk: { name: 'ヴォルク', role: '王国魔法師団 副団長', look: ['wizard_m', { dress: 0x9a2a1a, beard: 0x8a2a1a, hair: 0x8a2a1a, blood: true }],
    persona: 'レグルスの右腕。豪胆で直情的。五年間、師団長の座を空けたまま戦い続けた。',
    siege: { spot: 'courtyard', off: [0, -13], lines: ['団長の命令を待ってる。……五年も待ったんだ、今さら急かさねえよ。'] },
    lines: ['師団長の席は、ずっと空けてあった。誰にも座らせなかった。……座ってくれ、団長。', '次の戦も、背中は俺が守る。前だけ見てろ。'] },
  yukina: { name: 'ユキナ', role: '王国魔法師団 氷結隊長', look: ['wizard_f', { dress: 0x5a8ab8, hair: 0xd8e8f8, blood: true }],
    persona: '冷静で皮肉屋。レグルスの葬儀で唯一泣かなかったが、その夜ひとりで泣いた。',
    siege: { spot: 'courtyard', off: [-6, -14], lines: ['魔力はもう残ってない。凍らせた奴らの数も、もう数えてない。', '……団長。泣いてないわよ。氷の魔法使いは泣かないの。'] },
    lines: ['凍えるほど静かな夜ね。……前は、この静けさが怖かった。', '次は帝国ね。凍らせてほしい奴がいたら、言って。'] },
  raiga: { name: 'ライガ', role: '王国魔法師団 雷撃隊長', look: ['wizard_m', { dress: 0x8a7a1a, hair: 0xe8d84a, blood: true }],
    persona: '最年少の隊長。レグルスに拾われた孤児で、兄のように慕っている。',
    siege: { spot: 'courtyard', off: [6, -14], lines: ['団長が戻ってきたんだ！ 死んでたまるかよ！', '城下で、俺の知ってる奴らが……くそっ！'] },
    lines: ['団長、今度の戦は俺も連れてってくれよ！ ……だめ？ ちぇっ。', '昔、団長に「雷は怒りで撃つな」って言われたの、やっと分かった気がする。'] },
  marco: { siege: { spot: 'roomC', off: [4, 2], greet: '……師団長……？ ……本物、なのか……', lines: ['救護室はもういっぱいです。……薬も包帯も、足りない。', '王女様が……王女様が……。すみません、職務中に。'] } },
  anna: { role: '城の侍女（救護係）', siege: { spot: 'roomC', off: [-4, 1], pose: 'kneel', cry: true, greet: '……ああ……姫様……姫様が、呼んでくださった方……', lines: ['お湯を……お湯をもっと……。血が、止まらないの……。', '王女様の紅茶は、九十五度のお湯で三分。……もう、淹れて差し上げられない。'] },
    lines: ['王女様の部屋は、そのままにしてあります。……掃除だけは、毎日。'] },
  clara: { siege: { spot: 'roomC', off: [2, -3], pose: 'kneel', greet: '……祈りが……届いた……', lines: ['神父様は、逃げ遅れた人たちを庇って……聖堂の前で……。', '……祈ることしか、できないのです。'] },
    lines: ['神父様の代わりに、弔いの祈りを続けています。……名前を、一人ずつ呼びながら。'] },
  mimi: { siege: { spot: 'roomC', off: [-2, 4], pose: 'hug', cry: true, greet: 'おかあさん……おかあさん……', lines: ['……おかあさん、どこ……？', '……おにいちゃん、魔法使い？ ……わるいひと、やっつけてくれる？'] },
    lines: ['おかあさんね、お星さまになったんだって。……だから、夜はさみしくないよ。'] },
  toto: { siege: { spot: 'roomC', off: [-1, 5], pose: 'sit', greet: '……まほうつかい、さん……？ たすけに、きたの……？', lines: ['……ぼく、泣いてないよ。ミミを守るって、とうちゃんと約束したから。'] },
    lines: ['大きくなったら、ぼく魔法師団に入る！ 団長みたいになるんだ！'] },
  beatrice: { siege: { spot: 'roomC', off: [5, -2], pose: 'cry', cry: true, greet: '……遅いのよ……どうして……もっと早く……', lines: ['宝石も屋敷も、ぜんぶ燃えましたわ。……夫も。……おかしいわね、宝石のことばかり考えてしまうの。'] } },
  roy: { lines: ['……門を、もう二度と破らせません。この命に代えても。', '団長。あの時、助けてくれて……。いえ、何でもありません。任務に戻ります。'] },
  karl: { role: '新米兵士（療養中）', lines: ['……まだ、指がうまく動かなくて。でも、剣は握れます。', '団長……僕、ちゃんと戦えてましたか？ ……そうですか。……へへ。'] },
  ben: { dead: true }, ambrose: { dead: true }, gino: { dead: true }, zacharia: { dead: true },
  dario: { after: ['店は半分焼けちまったが、金床は無事だ。……戦の杖なら、いくらでも打ってやる。'] },
  minerva: { after: ['薬草の畑は焼かれました。でも、種は残っています。……何度でも、育てます。'] },
  boris: { after: ['……飯は、生き残った奴らにタダで出してる。金はいい。……食え。'] },
  rose: { after: ['踊る子鹿亭のマスターは……もう、いないの。でも、店は閉めない。あの人が怒るもの。'] },
  poppy: { after: ['花を売るのはやめたの。今は、お墓に花を供えて回ってる。……足りないの、いくら摘んでも。'] },
  felix: { after: ['図書館の本は三割が焼けました。……でも、記録は残します。この戦で何があったのかを、すべて。'] },
  nina: { after: ['ギルドの冒険者も、たくさん死にました。……依頼の張り紙、半分は復興の手伝いです。'] },
  // 占領されていた村と学院
  bald: { occ: 'kazami', freed: ['……風車が、止まっておった。百年回り続けた風車が。……あんたが、また回してくれたんじゃな。'] },
  emma: { occ: 'kazami', freed: ['地下の食料庫に隠れておったの。……子どもたちの泣き声を、手で塞いで。'] },
  hanna: { occ: 'kazami', freed: ['あっはっは……笑ってないと、やってらんないよ。……泊まってきな。お代はいいから。'] },
  tom: { occ: 'kazami' }, glen: { occ: 'kazami' }, josef: { occ: 'kazami' }, marsa: { occ: 'kazami' }, kai: { occ: 'kazami' }, fin: { occ: 'kazami' },
  pico: { occ: 'kazami', freed: ['魔法師団長だったの！？ ……メリーはね、兵隊に食べられちゃった。……でもぼく、泣かないよ。'] },
  lili: { occ: 'kazami', freed: ['……丘の上の黄色いお花、ぜんぶ踏まれちゃった。……また、咲くかな。'] },
  will: { occ: 'kazami', freed: ['風が変わったね。……焦げ臭さが消えた。'] },
  noah: { occ: 'academy', freed: ['ヘルミーネに……友達が、何人も連れていかれて……。僕、もっと強くなります。'] },
  elsa: { occ: 'academy' }, popo: { occ: 'academy' }, olga: { occ: 'academy', freed: ['焚書されかけた魔導書を、床下に隠しておいたの。……知識は、燃やさせないわ。'] },
  johan: { occ: 'ruins' }, mina: { occ: 'ruins' },
  gen: { occ: 'pass' }, gustav: { occ: 'pass' }, sion: { occ: 'pass' },
  luke: { occ: 'pass', role: '帝国の脱走兵', freed: ['……俺も帝国兵だった。村を焼けと命じられて、逃げた。……臆病者だと笑ってくれ。', '十将は、宰相ゼノンが集めた奴らだ。皇帝陛下は、もう何年も誰とも話していないらしい。'] },
  // 帝国側（戦の間は敵）
  dominic: { dead: true }, julius: { dead: true }, emperor: { dead: true }, zenon: { dead: true }, bram: { dead: true },
  arno: { dead: true }, viktor: { dead: true }, erik: { dead: true }, mattias: { dead: true },
  klaus: { occ: 'empire' }, helga: { occ: 'empire' }, otto: { occ: 'empire' },
  iris: { occ: 'empire', freed: ['わたしの魔導兵器が、王国を焼いた。……宰相のためじゃなく、自分の好奇心のために作った。……裁いて。'] },
  karasu: { occ: 'empire', freed: ['……宰相が消えた。皇帝陛下が、十年ぶりに自分の言葉で話したそうだ。……礼を言う、王国の魔法使い。'] },
  greta: { occ: 'empire', freed: ['王国の人……？ ごめんなさい、わたしたち、何も知らなかったの。……知ろうとしなかったの。'] },
  fritz: { occ: 'empire' }, lulu: { occ: 'empire', freed: ['夜の変な光、消えたよ！ ……おにいさんがやったの？'] }
};
// 解放後に城下で暮らす、救い出した人々
NPCS.push(
  { id: 'edgar', name: 'エドガー', role: '王国騎士', libOnly: true, at: ['aldia', 10, 40], look: ['knight', { cape: 0x2a4a8a }],
    persona: '誇り高い騎士。広場で仲間を失った。', lines: ['この広場で、何人も殺されました。……ここに立つたび、思い出します。だから、ここに立つのです。'] },
  { id: 'marian', name: 'マリアン', role: '仕立て屋の主人', libOnly: true, at: ['aldia', 118, 34], look: ['woman', { dress: 0x6a5a4a }],
    persona: '娘思いの母親。', lines: ['娘、無事でした。……城の救護室で、ずっと私を待っていてくれたの。', '喪服ばかり縫っています。……早く、婚礼の衣装を縫いたいわ。'] },
  { id: 'gordon', name: 'ゴードン', role: 'パン屋の主人', libOnly: true, at: ['aldia', 8, 124], look: ['man', { bulk: 1.2, apron: 0xe8e0cc }],
    persona: '豪快なパン職人。', lines: ['パン、焼いてるぞ！ 生き残った奴らに腹いっぱい食わせるんだ。', '焼き窯だけは壊れなかった。……パン屋の神様ってのは、いるのかもな。'] },
  { id: 'heinz', name: 'ハインツ', role: '衛兵（両目を失った）', libOnly: true, at: ['aldia', -110, 50], look: ['soldier', { hat: 'none' }],
    persona: '目を失っても誇りを失わない衛兵。', lines: ['見えなくても、足音で分かります。……団長の足音は、五年前と同じだ。'] },
  { id: 'mika', name: 'ミカ', role: '聖堂の修道士', libOnly: true, at: ['aldia', -30, 60], look: ['priest', {}],
    persona: '神父アンブロシウスの弟子。', lines: ['師は、最後まで扉の前に立っておられました。……今は、私が弔いの鐘を鳴らしています。'] }
);
function npcPhasePos(n) {
  const d = n.d;
  if (d.dead) return null;
  const lib = STORY_FLAGS.liberated;
  if (d.libOnly && !lib) return null;
  if (d.corpse && lib) return null;
  if (d.occ && occupied(d.occ)) return null;
  if (!lib) {
    if (d.siege) {
      const s = SPOTS[d.siege.spot];
      return s ? { x: s.x + d.siege.off[0], z: s.z + d.siege.off[1], pose: d.siege.pose || '', y: s.y, cry: !!d.siege.cry } : null;
    }
    const inAldia = (d.at && d.at[0] === 'aldia') || (d.bld && d.bld.startsWith('aldia')) || (d.spot === 'throne');
    if (inAldia) return null;
  }
  // セレスは学院が解放されるまで城にいる
  if (d.id === 'seles' && occupied('academy')) { const s = SPOTS.throne; return { x: s.x - 6, z: s.z + 5, pose: '' }; }
  if (d.id === 'volk' || d.id === 'yukina' || d.id === 'raiga') {
    const s = SPOTS.throne, o = { volk: [5, 6], yukina: [8, 8], raiga: [-8, 8] }[d.id];
    return { x: s.x + o[0], z: s.z + o[1], pose: '' };
  }
  return { x: n.home0.x, z: n.home0.z, pose: '', y: n.fixedY0 };
}
function refreshNPCs() {
  for (const n of NPC_LIST) {
    if (!n.home0) { n.home0 = { x: n.home.x, z: n.home.z }; n.fixedY0 = n.fixedY; }
    const p = npcPhasePos(n);
    n.hidden = !p;
    if (!p) { n.root.visible = false; continue; }
    const moved = Math.hypot(p.x - n.pos.x, p.z - n.pos.z) > 0.5 || (n.pose || '') !== p.pose;
    n.pose = p.pose;
    if (n.m) setCrying(n.m, !!p.cry);
    if (moved) {
      n.home = { x: p.x, z: p.z };
      n.fixedY = p.y;
      n.target = null;
      const gy = p.y !== undefined ? p.y : groundAt(p.x, p.z);
      n.pos.set(p.x, gy, p.z);
      n.model.rotation.set(0, 0, 0); n.model.position.set(0, 0, 0);
      if (n.m) setRigPose(n.m, p.pose === 'stand' ? '' : p.pose);
      if (p.pose === 'lie') n.face = 0.3;
      n.root.rotation.y = n.face;
      if (!p.pose && n.d.path) {
        const base = n.home;
        n.path = n.d.path.map(([a, b]) => ({ x: base.x + a - n.d.path[0][0], z: base.z + b - n.d.path[0][1] }));
      }
    }
  }
}

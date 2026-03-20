/* ===========================
   定時退ピング - ゲームスクリプト
=========================== */

const STORAGE_KEY = "teijitaiping_records_v2";
const START_MINUTES = 8 * 60 + 30;   // 08:30
const END_MINUTES   = 17 * 60 + 30;  // 17:30

/* ===========================
   かなマップ（ローマ字パターン）
=========================== */
const KANA_MAP = new Map([
  // 基本五十音
  ["あ", ["a"]], ["い", ["i"]], ["う", ["u"]], ["え", ["e"]], ["お", ["o"]],
  ["か", ["ka", "ca"]], ["き", ["ki"]], ["く", ["ku", "cu"]], ["け", ["ke"]], ["こ", ["ko"]],
  ["さ", ["sa"]], ["し", ["si", "shi", "ci"]], ["す", ["su"]], ["せ", ["se", "ce"]], ["そ", ["so"]],
  ["た", ["ta"]], ["ち", ["ti", "chi"]], ["つ", ["tu", "tsu"]], ["て", ["te"]], ["と", ["to"]],
  ["な", ["na"]], ["に", ["ni"]], ["ぬ", ["nu"]], ["ね", ["ne"]], ["の", ["no"]],
  ["は", ["ha"]], ["ひ", ["hi"]], ["ふ", ["hu", "fu"]], ["へ", ["he"]], ["ほ", ["ho"]],
  ["ま", ["ma"]], ["み", ["mi"]], ["む", ["mu"]], ["め", ["me"]], ["も", ["mo"]],
  ["や", ["ya"]], ["ゆ", ["yu"]], ["よ", ["yo"]],
  ["ら", ["ra"]], ["り", ["ri"]], ["る", ["ru"]], ["れ", ["re"]], ["ろ", ["ro"]],
  ["わ", ["wa"]], ["ゐ", ["wi"]], ["ゑ", ["we"]], ["を", ["wo"]],
  ["うぃ", ["wi", "whi"]], ["うぇ", ["we", "whe"]], ["うぉ", ["wo", "who"]],
  ["ん", ["nn", "xn"]],

  // 濁音
  ["が", ["ga"]], ["ぎ", ["gi"]], ["ぐ", ["gu"]], ["げ", ["ge"]], ["ご", ["go"]],
  ["ざ", ["za"]], ["じ", ["zi", "ji"]], ["ず", ["zu"]], ["ぜ", ["ze"]], ["ぞ", ["zo"]],
  ["だ", ["da"]], ["ぢ", ["di"]], ["づ", ["du"]], ["で", ["de"]], ["ど", ["do"]],
  ["ば", ["ba"]], ["び", ["bi"]], ["ぶ", ["bu"]], ["べ", ["be"]], ["ぼ", ["bo"]],

  // 半濁音
  ["ぱ", ["pa"]], ["ぴ", ["pi"]], ["ぷ", ["pu"]], ["ぺ", ["pe"]], ["ぽ", ["po"]],

  // 小文字単独
  ["ぁ", ["la", "xa"]], ["ぃ", ["li", "xi"]], ["ぅ", ["lu", "xu"]], ["ぇ", ["le", "xe"]], ["ぉ", ["lo", "xo"]],
  ["ゃ", ["lya", "xya"]], ["ゅ", ["lyu", "xyu"]], ["ょ", ["lyo", "xyo"]],
  ["っ", ["ltu", "xtu"]],

  // きゃ行
  ["きゃ", ["kya"]], ["きゅ", ["kyu"]], ["きょ", ["kyo"]],
  ["ぎゃ", ["gya"]], ["ぎゅ", ["gyu"]], ["ぎょ", ["gyo"]],

  // しゃ行
  ["しゃ", ["sya", "sha"]], ["しゅ", ["syu", "shu"]], ["しぇ", ["sye", "she"]], ["しょ", ["syo", "sho"]],
  ["じゃ", ["zya", "ja", "jya"]], ["じゅ", ["zyu", "ju", "jyu"]], ["じぇ", ["zye", "jye"]], ["じょ", ["zyo", "jo", "jyo"]],

  // ちゃ行
  ["ちゃ", ["tya", "cya", "cha"]], ["ちゅ", ["tyu", "cyu", "chu"]], ["ちぇ", ["tye", "cye", "che"]], ["ちょ", ["tyo", "cyo", "cho"]],

  // にゃ行
  ["にゃ", ["nya"]], ["にゅ", ["nyu"]], ["にょ", ["nyo"]],

  // ひゃ行
  ["ひゃ", ["hya"]], ["ひゅ", ["hyu"]], ["ひょ", ["hyo"]],
  ["びゃ", ["bya"]], ["びゅ", ["byu"]], ["びょ", ["byo"]],
  ["ぴゃ", ["pya"]], ["ぴゅ", ["pyu"]], ["ぴょ", ["pyo"]],

  // みゃ行
  ["みゃ", ["mya"]], ["みゅ", ["myu"]], ["みょ", ["myo"]],

  // りゃ行
  ["りゃ", ["rya"]], ["りゅ", ["ryu"]], ["りょ", ["ryo"]],

  // ふゃ等
  ["ふぁ", ["fa"]], ["ふぃ", ["fi"]], ["ふぇ", ["fe"]], ["ふぉ", ["fo"]],

  // でぃ、てぃ等
  ["でぃ", ["dhi"]], ["てぃ", ["thi"]], ["でゅ", ["dhu"]], ["てゅ", ["thu"]],
  ["ゔ", ["vu"]],
]);

/* 複合かな用の小文字セット */
const SMALL_KANA = new Set(["ゃ", "ゅ", "ょ", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ"]);

/* ===========================
   トークナイザー（日本語テキスト→かなトークン列）
=========================== */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // 2文字複合かな（っ以外）
    if (i + 1 < text.length && ch !== "っ") {
      const two = ch + text[i + 1];
      if (KANA_MAP.has(two)) {
        tokens.push(two);
        i += 2;
        continue;
      }
    }
    // 単文字かな
    if (KANA_MAP.has(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    // ASCII・記号はそのままパススルー
    tokens.push(ch);
    i++;
  }
  return tokens;
}

/* ===========================
   パターン取得（っ特殊処理含む）
=========================== */
function getPatternsForToken(tokens, idx) {
  const token = tokens[idx];
  if (token === "っ") {
    const base = KANA_MAP.get("っ").slice(); // ["xtu","ltu","xtsu","ltsu"]
    // 次のかなの先頭子音を重ねるパターン
    if (idx + 1 < tokens.length) {
      const nextPatterns = getPatternsForToken(tokens, idx + 1);
      for (const np of nextPatterns) {
        const firstChar = np[0];
        if (!/[aiueo]/.test(firstChar)) {
          // 先頭子音を重ねたものを追加（っの消費として）
          base.push(firstChar);
        }
      }
    }
    return base;
  }
  if (KANA_MAP.has(token)) {
    return KANA_MAP.get(token).slice();
  }
  // ASCII など
  return [token];
}

/* ===========================
   ん の有効パターン判定
=========================== */
function getNPatterns(tokens, idx) {
  // トークンは事前に確定しているため n 単独でも常に有効
  return ["nn", "n"];
}

/* ===========================
   難易度定義
=========================== */
const DIFFICULTIES = {
  white: {
    id: "white",
    name: "ホワイト企業",
    taskCount: 8,
    gameSpeed: 5.0,               // ゲーム分/秒（リアルタイム時計速度）
    penaltyMinutes: 10,           // ミス1回あたりの加算分
    startMinutes: 10 * 60,        // 10:00
    endMinutes:   18 * 60         // 18:00
  },
  normal: {
    id: "normal",
    name: "ふつうの企業",
    taskCount: 8,
    gameSpeed: 7.0,
    penaltyMinutes: 20,
    startMinutes: 9 * 60,         // 09:00
    endMinutes:   19 * 60         // 19:00
  },
  black: {
    id: "black",
    name: "ブラック企業",
    taskCount: 8,
    taskCount: 9,
    gameSpeed: 14.0,
    penaltyMinutes: 60,
    startMinutes: 7 * 60,         // 07:00
    endMinutes:   23 * 60         // 23:00
  }
};

/* ===========================
   タスクプール（jp フィールドのみ）
=========================== */
const TASK_POOL = [
  {
    id: "commute",
    name: "出社",
    baseMinutes: 20,
    type: "commute",
    prompts: [
      { jp: "ほんじつもよろしくおねがいします",
        parts: [["本日","ほんじつ"],["もよろしくお"],["願","ねが"],["いします"]] },
      { jp: "しゅっしゃしましたじゅんじたいおうします",
        parts: [["出社","しゅっしゃ"],["しました"],["順次","じゅんじ"],["対応","たいおう"],["します"]] }
    ]
  },
  {
    id: "morning-standup",
    name: "朝会",
    baseMinutes: 36,
    type: "meeting",
    prompts: [
      { jp: "ほんじつのしんちょくをきょうゆうします",
        parts: [["本日","ほんじつ"],["の"],["進捗","しんちょく"],["を"],["共有","きょうゆう"],["します"]] },
      { jp: "ゆうせんどのたかいあんけんからちゃくしゅします",
        parts: [["優先度","ゆうせんど"],["の"],["高","たか"],["い"],["案件","あんけん"],["から"],["着手","ちゃくしゅ"],["します"]] }
    ]
  },
  {
    id: "mail-reply",
    name: "メール返信",
    baseMinutes: 54,
    type: "mail",
    prompts: [
      { jp: "おせわになっております",
        parts: [["お"],["世話","せわ"],["になっております"]] },
      { jp: "さきほどのけんしゅうせいばんをおおくりします",
        parts: [["先","さき"],["ほどの"],["件","けん"],["修正版","しゅうせいばん"],["をお"],["送","おく"],["りします"]] },
      { jp: "ねんのためさいどごかくにんください",
        parts: [["念","ねん"],["のため"],["再度","さいど"],["ご"],["確認","かくにん"],["ください"]] }
    ]
  },
  {
    id: "meeting",
    name: "会議",
    baseMinutes: 68,
    type: "meeting",
    prompts: [
      { jp: "かいぎしつがへんこうになりました",
        parts: [["会議室","かいぎしつ"],["が"],["変更","へんこう"],["になりました"]] },
      { jp: "いったんこのほうこうですすめます",
        parts: [["一旦","いったん"],["この"],["方向","ほうこう"],["で"],["進","すす"],["めます"]] },
      { jp: "ほんじつのかいぎしりょうをきょうゆうします",
        parts: [["本日","ほんじつ"],["の"],["会議資料","かいぎしりょう"],["を"],["共有","きょうゆう"],["します"]] }
    ]
  },
  {
    id: "before-lunch",
    name: "昼休憩前の作業",
    baseMinutes: 50,
    type: "document",
    prompts: [
      { jp: "こちらにんしきそごがありました",
        parts: [["こちら"],["認識","にんしき"],["齟齬","そご"],["がありました"]] },
      { jp: "すうじだけさしかえてさいそうします",
        parts: [["数字","すうじ"],["だけ"],["差","さ"],["し"],["替","か"],["えて"],["再送","さいそう"],["します"]] },
      { jp: "しきゅうかくにんおねがいします",
        parts: [["至急","しきゅう"],["確認","かくにん"],["お"],["願","ねが"],["いします"]] }
    ]
  },
  {
    id: "doc-fix",
    name: "資料修正",
    baseMinutes: 64,
    type: "document",
    prompts: [
      { jp: "しようへんこうのないようをはんえいします",
        parts: [["仕様","しよう"],["変更","へんこう"],["の"],["内容","ないよう"],["を"],["反映","はんえい"],["します"]] },
      { jp: "しゅうせいばんをごかくにんいただけますか",
        parts: [["修正版","しゅうせいばん"],["をご"],["確認","かくにん"],["いただけますか"]] },
      { jp: "さきほどのけんしゅうせいばんをおおくりします",
        parts: [["先","さき"],["ほどの"],["件","けん"],["修正版","しゅうせいばん"],["をお"],["送","おく"],["りします"]] }
    ]
  },
  {
    id: "boss-request",
    name: "上司からの依頼",
    baseMinutes: 72,
    type: "request",
    prompts: [
      { jp: "すみませんほんじつちゅうにたいおうおねがいします",
        parts: [["すみません"],["本日中","ほんじつちゅう"],["に"],["対応","たいおう"],["お"],["願","ねが"],["いします"]] },
      { jp: "ちょっといいですか",
        parts: [["ちょっといいですか"]] },
      { jp: "ほんけんせんぽうへれんけいかんりょうしました",
        parts: [["本件","ほんけん"],["先方","せんぽう"],["へ"],["連携","れんけい"],["完了","かんりょう"],["しました"]] }
    ]
  },
  {
    id: "final-task",
    name: "最終タスク",
    baseMinutes: 80,
    type: "final",
    prompts: [
      { jp: "きょうもいちにちおつかれさまでした",
        parts: [["今日","きょう"],["も"],["一日","いちにち"],["お"],["疲","つか"],["れ"],["様","さま"],["でした"]] },
      { jp: "ほんじつのぎょうむをかんりょうします",
        parts: [["本日","ほんじつ"],["の"],["業務","ぎょうむ"],["を"],["完了","かんりょう"],["します"]] },
      { jp: "おさきにしつれいいたします",
        parts: [["お"],["先","さき"],["に"],["失礼","しつれい"],["いたします"]] }
    ]
  }
];


/* ===========================
   攻略ヒント
=========================== */
const TIPS = [
  "ミスを減らして時間ロスを防ごう！",
  "速く正確に打つほど退勤が早まる。",
  "ブラック企業はスコア倍率が高い！",
  "イベント発生でゲーム内時間が増える。",
  "正確率 97% 以上でボーナス補正あり。",
  "最終タスクをこなせば退勤確定！",
  "定時前退社で「退勤の神」を狙おう。",
  "ブラック企業完走で称号「脱出者」が取れる。"
];

/* ===========================
   難易度別業務メッセージプール
   構造: difficultyMessagePools[diffId][scene][lengthType][]
   scene: early（序盤）/ middle（中盤）/ late（終盤）
   lengthType: short / medium / long
=========================== */
const difficultyMessagePools = {
  white: {
    early: {
      short: [
        { text: "出社しました",           reading: "しゅっしゃしました",           lengthType: "short" },
        { text: "確認しました",           reading: "かくにんしました",             lengthType: "short" },
        { text: "承知しました",           reading: "しょうちしました",             lengthType: "short" },
        { text: "かしこまりました",       reading: "かしこまりました",             lengthType: "short" },
        { text: "お疲れ様です",           reading: "おつかれさまです",             lengthType: "short" },
        { text: "よろしくお願いします",   reading: "よろしくおねがいします",       lengthType: "short" },
        { text: "準備できました",         reading: "じゅんびできました",           lengthType: "short" }
      ],
      medium: [
        { text: "本日もよろしくお願いします",     reading: "ほんじつもよろしくおねがいします",     lengthType: "medium" },
        { text: "ご連絡ありがとうございます",     reading: "ごれんらくありがとうございます",       lengthType: "medium" },
        { text: "会議の時間をご共有します",       reading: "かいぎのじかんをごきょうゆうします",     lengthType: "medium" },
        { text: "こちらで確認を進めます",         reading: "こちらでかくにんをすすめます",         lengthType: "medium" },
        { text: "先に状況をご報告します",         reading: "さきにじょうきょうをごほうこくします", lengthType: "medium" }
      ],
      long: [
        { text: "先ほどの件につきまして内容を整理してご共有いたします", reading: "さきほどのけんにつきましてないようをせいりしてごきょうゆういたします", lengthType: "long" },
        { text: "本件は大きな問題なくこのまま進行できそうです",         reading: "ほんけんはおおきなもんだいなくこのまましんこうできそうです",         lengthType: "long" }
      ]
    },
    middle: {
      short: [
        { text: "ご確認ください",     reading: "ごかくにんください",       lengthType: "short" },
        { text: "問題ありません",     reading: "もんだいありません",       lengthType: "short" },
        { text: "さっそく対応します", reading: "さっそくたいおうします",   lengthType: "short" },
        { text: "共有しました",       reading: "きょうゆうしました",       lengthType: "short" },
        { text: "対応中です",         reading: "たいおうちゅうです",       lengthType: "short" },
        { text: "進めております",     reading: "すすめております",         lengthType: "short" }
      ],
      medium: [
        { text: "お忙しいところすみませんでした",   reading: "おいそがしいところすみませんでした",       lengthType: "medium" },
        { text: "資料をご確認いただけますか",       reading: "しりょうをごかくにんいただけますか",       lengthType: "medium" },
        { text: "手配の方を進めてまいります",       reading: "てはいのほうをすすめてまいります",         lengthType: "medium" },
        { text: "修正版をご確認いただけますか",     reading: "しゅうせいばんをごかくにんいただけますか", lengthType: "medium" },
        { text: "念のため内容を共有します",         reading: "ねんのためないようをきょうゆうします",     lengthType: "medium" },
        { text: "本件承知いたしました",             reading: "ほんけんしょうちいたしました",             lengthType: "medium" },
        { text: "この内容で進めてまいります",       reading: "このないようですすめてまいります",         lengthType: "medium" }
      ],
      long: [
        { text: "ご確認いただけましたらこの内容で進めてまいります",       reading: "ごかくにんいただけましたらこのないようですすめてまいります",         lengthType: "long" },
        { text: "念のため修正版をお送りしますのでご確認をお願いいたします", reading: "ねんのためしゅうせいばんをおおくりしますのでごかくにんをおねがいいたします", lengthType: "long" }
      ]
    },
    late: {
      short: [
        { text: "送付しました",   reading: "そうふしました",     lengthType: "short" },
        { text: "完了しました",   reading: "かんりょうしました", lengthType: "short" },
        { text: "失礼いたします", reading: "しつれいいたします", lengthType: "short" }
      ],
      medium: [
        { text: "取り急ぎご連絡します",           reading: "とりいそぎごれんらくします",           lengthType: "medium" },
        { text: "ご確認いただきありがとうございます", reading: "ごかくにんいただきありがとうございます", lengthType: "medium" },
        { text: "対応完了しました",               reading: "たいおうかんりょうしました",           lengthType: "medium" },
        { text: "最終版を送付しました",           reading: "さいしゅうばんをそうふしました",       lengthType: "medium" }
      ],
      long: [
        { text: "お忙しい中ご確認いただきありがとうございました", reading: "おいそがしいなかごかくにんいただきありがとうございました", lengthType: "long" },
        { text: "皆様のおかげで順調に進めることができています",   reading: "みなさまのおかげでじゅんちょうにすすめることができています", lengthType: "long" }
      ]
    }
  },

  normal: {
    early: {
      short: [
        { text: "お世話になっております", reading: "おせわになっております",   lengthType: "short" },
        { text: "折り返し連絡します",     reading: "おりかえしれんらくします", lengthType: "short" },
        { text: "確認お願いします",       reading: "かくにんおねがいします",   lengthType: "short" },
        { text: "共有します",             reading: "きょうゆうします",         lengthType: "short" }
      ],
      medium: [
        { text: "本日の進捗を共有します",   reading: "ほんじつのしんちょくをきょうゆうします", lengthType: "medium" },
        { text: "会議室が変更になりました", reading: "かいぎしつがへんこうになりました",       lengthType: "medium" },
        { text: "本件先に共有しておきます", reading: "ほんけんさきにきょうゆうしておきます",   lengthType: "medium" },
        { text: "取り急ぎ状況共有します",   reading: "とりいそぎじょうきょうきょうゆうします", lengthType: "medium" },
        { text: "本日中に一度送ります",     reading: "ほんじつちゅうにいちどおくります",       lengthType: "medium" }
      ],
      long: [
        { text: "本件について先方より連絡がありましたのでご報告します",   reading: "ほんけんについてせんぽうよりれんらくがありましたのでごほうこくします",     lengthType: "long" },
        { text: "念のため関係者にも同じ内容を共有しておいてください",     reading: "ねんのためかんけいしゃにもおなじないようをきょうゆうしておいてください",   lengthType: "long" }
      ]
    },
    middle: {
      short: [
        { text: "ちょっといいですか", reading: "ちょっといいですか",   lengthType: "short" },
        { text: "至急対応します",     reading: "しきゅうたいおうします", lengthType: "short" },
        { text: "修正します",         reading: "しゅうせいします",       lengthType: "short" },
        { text: "再送します",         reading: "さいそうします",         lengthType: "short" },
        { text: "一旦送ります",       reading: "いったんおくります",     lengthType: "short" },
        { text: "反映します",         reading: "はんえいします",         lengthType: "short" }
      ],
      medium: [
        { text: "念のため再度ご確認ください",     reading: "ねんのためさいどごかくにんください",       lengthType: "medium" },
        { text: "先ほどの件修正版をお送りします", reading: "さきほどのけんしゅうせいばんをおおくりします", lengthType: "medium" },
        { text: "仕様変更の内容を反映します",     reading: "しようへんこうのないようをはんえいします",   lengthType: "medium" },
        { text: "一旦この方向で進めます",         reading: "いったんこのほうこうですすめます",           lengthType: "medium" },
        { text: "こちら認識齟齬がありました",     reading: "こちらにんしきそごがありました",             lengthType: "medium" },
        { text: "先方確認が必要です",             reading: "せんぽうかくにんがひつようです",             lengthType: "medium" },
        { text: "修正版を反映して送ります",       reading: "しゅうせいばんをはんえいしておくります",     lengthType: "medium" },
        { text: "念のため再確認します",           reading: "ねんのためさいかくにんします",               lengthType: "medium" }
      ],
      long: [
        { text: "こちら認識齟齬がありましたので再確認をお願いします",         reading: "こちらにんしきそごがありましたのでさいかくにんをおねがいします",       lengthType: "long" },
        { text: "会議内容を反映した資料を再度送付いたします",                 reading: "かいぎないようをはんえいしたしりょうをさいどそうふいたします",         lengthType: "long" },
        { text: "先ほどの内容に修正が入ったため差し替えをお願いします",       reading: "さきほどのないようにしゅうせいがはいったためさしかえをおねがいします", lengthType: "long" }
      ]
    },
    late: {
      short: [
        { text: "対応完了です",   reading: "たいおうかんりょうです",   lengthType: "short" },
        { text: "最終確認します", reading: "さいしゅうかくにんします", lengthType: "short" },
        { text: "先方へ送ります", reading: "せんぽうへおくります",     lengthType: "short" }
      ],
      medium: [
        { text: "すみません本日中に対応お願いします", reading: "すみませんほんじつちゅうにたいおうおねがいします", lengthType: "medium" },
        { text: "本件先に送付します",               reading: "ほんけんさきにそうふします",                   lengthType: "medium" },
        { text: "最終版を共有します",               reading: "さいしゅうばんをきょうゆうします",             lengthType: "medium" },
        { text: "本日中に対応完了予定です",         reading: "ほんじつちゅうにたいおうかんりょうよていです", lengthType: "medium" }
      ],
      long: [
        { text: "誤字が見つかりましたので至急修正して再送をお願いします",   reading: "ごじがみつかりましたのでしきゅうしゅうせいしてさいそうをおねがいします",   lengthType: "long" },
        { text: "先方確認が必要なため修正版を先に共有いたします",           reading: "せんぽうかくにんがひつようなためしゅうせいばんをさきにきょうゆういたします", lengthType: "long" },
        { text: "本日中の対応が必要ですので優先して進めてください",         reading: "ほんじつちゅうのたいおうがひつようですのでゆうせんしてすすめてください",   lengthType: "long" }
      ]
    }
  },

  black: {
    early: {
      short: [
        { text: "ちょっといいですか", reading: "ちょっといいですか", lengthType: "short" },
        { text: "すぐ確認して",       reading: "すぐかくにんして",   lengthType: "short" },
        { text: "先にこれやって",     reading: "さきにこれやって",   lengthType: "short" },
        { text: "今日中です",         reading: "きょうじゅうです",   lengthType: "short" }
      ],
      medium: [
        { text: "明日の朝一でお願いします",   reading: "あしたのあさいちでおねがいします",   lengthType: "medium" },
        { text: "先方がかなり急いでいます",   reading: "せんぽうがかなりいそいでいます",     lengthType: "medium" },
        { text: "この件最優先でお願いします", reading: "このけんさいゆうせんでおねがいします", lengthType: "medium" },
        { text: "今日中対応で確定しました",   reading: "きょうじゅうたいおうでかくていしました", lengthType: "medium" },
        { text: "先に修正版を出してください", reading: "さきにしゅうせいばんをだしてください", lengthType: "medium" }
      ],
      long: [
        { text: "先方が待てないと言っているので今すぐ再送してください",       reading: "せんぽうがまてないといっているのでいますぐさいそうしてください",         lengthType: "long" },
        { text: "今日中対応が前提なので他の作業は後回しにしてください",       reading: "きょうじゅうたいおうがぜんていなのでほかのさぎょうはあとまわしにしてください", lengthType: "long" }
      ]
    },
    middle: {
      short: [
        { text: "今すぐ対応して", reading: "いますぐたいおうして", lengthType: "short" },
        { text: "まだですか",     reading: "まだですか",           lengthType: "short" },
        { text: "急いでください", reading: "いそいでください",     lengthType: "short" },
        { text: "早く送って",     reading: "はやくおくって",       lengthType: "short" },
        { text: "もう見ましたか", reading: "もうみましたか",       lengthType: "short" }
      ],
      medium: [
        { text: "さっき言った修正まだですか",         reading: "さっきいったしゅうせいまだですか",         lengthType: "medium" },
        { text: "なんでまだ終わってないんですか",     reading: "なんでまだおわってないんですか",           lengthType: "medium" },
        { text: "今日中に絶対終わらせてください",     reading: "きょうじゅうにぜったいおわらせてください", lengthType: "medium" },
        { text: "緊急で会議が入りました",             reading: "きんきゅうでかいぎがはいりました",         lengthType: "medium" },
        { text: "上司がちょっと来いと言っています",   reading: "じょうしがちょっとこいといっています",     lengthType: "medium" },
        { text: "いつまで待たせれば気が済むんですか", reading: "いつまでまたせればきがすむんですか",       lengthType: "medium" },
        { text: "とりあえず先にこれ出して",           reading: "とりあえずさきにこれだして",               lengthType: "medium" },
        { text: "まだ共有されてないんですか",         reading: "まだきょうゆうされてないんですか",         lengthType: "medium" }
      ],
      long: [
        { text: "先ほど送った資料に厳しい指摘が入りました",         reading: "さきほどおくったしりょうにきびしいしてきがはいりました",     lengthType: "long" },
        { text: "お客様が怒ってるので今すぐ電話してください",       reading: "おきゃくさまがおこってるのでいますぐでんわしてください",         lengthType: "long" },
        { text: "上司が怒ってるので早急に対応してください",         reading: "じょうしがおこってるのでさっきゅうにたいおうしてください",       lengthType: "long" },
        { text: "この件まだ終わっていない理由を先に説明してください", reading: "このけんまだおわっていないりゆうをさきにせつめいしてください",   lengthType: "long" }
      ]
    },
    late: {
      short: [
        { text: "まだ終わりませんか", reading: "まだおわりませんか",   lengthType: "short" },
        { text: "先に出してください", reading: "さきにだしてください", lengthType: "short" }
      ],
      medium: [
        { text: "今日の分全部やり直してください",   reading: "きょうのぶんぜんぶやりなおしてください", lengthType: "medium" },
        { text: "もう一度確認して送り直してください", reading: "もういちどかくにんしておくりなおしてください", lengthType: "medium" },
        { text: "今から修正版を至急出してください",   reading: "いまからしゅうせいばんをしきゅうだしてください", lengthType: "medium" },
        { text: "まだ対応終わってないですよね",       reading: "まだたいおうおわってないですよね",           lengthType: "medium" }
      ],
      long: [
        { text: "先方から差し戻しが来ましたので本日中に対応してください",             reading: "せんぽうからさしもどしがきましたのでほんじつちゅうにたいおうしてください",       lengthType: "long" },
        { text: "誤字がありましたので全部修正して至急再送してください",               reading: "ごじがありましたのでぜんぶしゅうせいしてしきゅうさいそうしてください",           lengthType: "long" },
        { text: "これ頼んだのいつだと思ってるんですかまだできていないんですか",       reading: "これたのんだのいつだとおもってるんですかまだできていないんですか",               lengthType: "long" },
        { text: "さっきの会議内容を全部反映してすぐに送り直してください",             reading: "さっきのかいぎないようをぜんぶはんえいしてすぐにおくりなおしてください",         lengthType: "long" }
      ]
    }
  }
};

/* ===========================
   出題プラン（難易度ごとの lengthType 順序）
   各プレイ開始時に先頭 taskCount 個を使用する
=========================== */
const MESSAGE_PLANS = {
  white:  ["short","short","short","medium","short","medium","short","medium"],
  normal: ["short","medium","medium","short","medium","medium","long","long"],
  black:  ["medium","medium","long","medium","long","medium","long","long","long"]
};

/* ===========================
   場面マップ（タスクインデックス → early / middle / late）
   全難易度 8タスク: early 2問 / middle 3問 / late 3問
=========================== */
const SCENE_MAP = {
  white:  ["early","early","middle","middle","middle","late","late","late"],
  normal: ["early","early","middle","middle","middle","late","late","late"],
  black:  ["early","early","middle","middle","middle","late","late","late","late"]
};

/* ===========================
   ランク・称号定義
   RANK_THRESHOLDS: 定時より何分早く退勤できたか（正=早退、負=残業）
=========================== */
const RANKS = ["SSS", "SS", "S", "A", "B", "C", "D", "E", "F"];

// 定時より何分早く退勤できたか（正=早退、負=残業）で判定
const RANK_THRESHOLDS = {
  white:  [240, 180, 120, 60, 0, -60, -120, -180],
  normal: [240, 180, 120, 60, 0, -60, -120, -180],
  black:  [240, 180, 120, 60, 0, -60, -120, -180],
};

const RANK_TITLES = {
  white: {
    SSS: "爆速処理の神",
    SS:  "終業チャイム先読み勢",
    S:   "退勤スプリンター",
    A:   "ホワイト企業の優等生",
    B:   "空気の読める仕事人",
    C:   "今日も無難に労働",
    D:   "ちょっとだけ沼る人",
    E:   "雲行き怪しめ社員",
    F:   "ホワイトなのに帰れない人"
  },
  normal: {
    SSS: "退勤RTAの神",
    SS:  "残業回避ガチ勢",
    S:   "仕事さばきマシン",
    A:   "だいぶ有能な会社員",
    B:   "そこそこ頼れる社会人",
    C:   "今日も労働完了",
    D:   "定時がじわじわ逃げる人",
    E:   "帰宅申請まだ通らない人",
    F:   "まだ会社にいる人"
  },
  black: {
    SSS: "地獄突破の神",
    SS:  "終電回避の超人",
    S:   "残業破壊神",
    A:   "生還したバケモノ",
    B:   "ギリ折れてない人",
    C:   "今日も生存確認",
    D:   "帰れそうで帰れない人",
    E:   "退勤権を失った人",
    F:   "会社に住みかけの人"
  }
};

/* ===========================
   グローバル状態
=========================== */
const state = {
  selectedDifficulty: "white",
  currentScreen: "title",
  session: null,
  records: loadRecords(),
  statTimerId: null,
  masterMuted: false,
  bgmVolume: 0.5,
  seVolume: 1.0
};

/* ===========================
   DOM参照
=========================== */
const el = {
  screens: {
    title:      document.getElementById("title-screen"),
    difficulty: document.getElementById("difficulty-screen"),
    ready:      document.getElementById("ready-screen"),
    game:       document.getElementById("game-screen"),
    result:     document.getElementById("result-screen")
  },
  difficultyCards:      [...document.querySelectorAll(".ready-diff-card")],
  startButton:          document.getElementById("start-button"),
  readyDifficultyName:  document.getElementById("ready-difficulty-name"),
  readyStartBtn:        document.getElementById("ready-start-btn"),
  readyBackBtn:         document.getElementById("ready-back-btn"),
  diffBackBtn:          document.getElementById("diff-back-btn"),
  bestRecords:          document.getElementById("best-records"),
  lastResultSummary:    document.getElementById("last-result-summary"),
  currentTime:          document.getElementById("current-time"),
  timeLeft:             document.getElementById("time-left"),
  penaltyFloat:         document.getElementById("penalty-float"),
  progressFill:         document.getElementById("progress-fill"),
  taskName:             document.getElementById("task-name"),
  promptJapanese:       document.getElementById("prompt-japanese"),
  typingPreview:        document.getElementById("typing-preview"),
  gameImeInput:         document.getElementById("game-ime-input"),
  cpsValue:             document.getElementById("cps-value"),
  accuracyValue:        document.getElementById("accuracy-value"),
  missValue:            document.getElementById("miss-value"),
  gameTip:              document.getElementById("game-tip"),
  resultLeaveTime:      document.getElementById("result-leave-time"),
  resultStatus:         document.getElementById("result-status"),
  resultRank:           document.getElementById("result-rank"),
  resultTitle:          document.getElementById("result-title"),
  resultCps:            document.getElementById("result-cps"),
  resultAccuracy:       document.getElementById("result-accuracy"),
  resultMisses:         document.getElementById("result-misses"),
  resultDifficulty:     document.getElementById("result-difficulty"),
  resultBest:           document.getElementById("result-best"),
  resultHero:           document.getElementById("result-hero"),
  resultDifficultyChip: document.getElementById("result-difficulty-chip"),
  resultRecordBadge:    document.getElementById("result-record-badge"),
  rankTableInner:       document.getElementById("rank-table-inner"),
  retryButton:          document.getElementById("retry-button"),
  changeDifficultyBtn:  document.getElementById("change-difficulty-btn"),
  backButton:           document.getElementById("back-button"),
  modal:                document.getElementById("how-to-play-modal"),
  modalCloseBtn:        document.getElementById("modal-close-btn"),
  modalOkBtn:           document.getElementById("modal-ok-btn"),
  recordsModal:         document.getElementById("records-modal"),
  recordsModalCloseBtn: document.getElementById("records-modal-close-btn"),
  recordsModalOkBtn:    document.getElementById("records-modal-ok-btn"),
  settingsModal:        document.getElementById("settings-modal"),
  settingsModalCloseBtn:document.getElementById("settings-modal-close-btn"),
  settingsModalOkBtn:   document.getElementById("settings-modal-ok-btn"),
  masterMuteBtn:        document.getElementById("master-mute-btn"),
  globalMuteBtn:        document.getElementById("global-mute-btn"),
  bgmVolumeSlider:      document.getElementById("bgm-volume"),
  bgmVolumeVal:         document.getElementById("bgm-volume-val"),
  seVolumeSlider:       document.getElementById("se-volume"),
  seVolumeVal:          document.getElementById("se-volume-val"),
  mobileWarning:        document.getElementById("mobile-warning"),
  mobileWarningDismiss: document.getElementById("mobile-warning-dismiss")
};

/* ===========================
   サウンド（Web Audio API）
=========================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playKeySound(isCorrect) {
  if (state.masterMuted || state.seVolume === 0) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;

  if (isCorrect) {
    // 明るくポップなtick音
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.05);
    gain.gain.setValueAtTime(0.07 * state.seVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.start(t);
    osc.stop(t + 0.07);
  } else {
    // 小さく短い低音のbop
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    gain.gain.setValueAtTime(0.04 * state.seVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

function playTaskCompleteSound() {
  if (state.masterMuted || state.seVolume === 0) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "triangle";
    const t = audioCtx.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12 * state.seVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}

/* ===========================
   BGM（Web Audio API合成）
   企業タイプ別に3種類のBGM
=========================== */
let bgmGain = audioCtx.createGain();
bgmGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
bgmGain.connect(audioCtx.destination);
let bgmTimerId = null;

// 企業タイプ別BGM設定 [周波数(Hz), 開始拍, 長さ(拍)]
const BGM_CONFIGS = {
  // ホワイト企業: ポップ・明るい (C-G-Am-F, 148BPM, square)
  white: {
    bpm: 148, loopBeats: 16,
    melodyType: "square", bassType: "triangle",
    melodyGain: 0.05, bassGain: 0.05,
    melody: [
      // C major (拍 0-3): 明るく弾む
      [523.25, 0,    0.3], [659.25, 0.5,  0.3], [783.99, 1,    0.3], [1046.5, 1.5,  0.6],
      [880.00, 2.5,  0.3], [783.99, 3,    0.3], [659.25, 3.5,  0.3],
      // G major (拍 4-7)
      [783.99, 4,    0.3], [987.77, 4.5,  0.3], [1046.5, 5,    0.3], [987.77, 5.5,  0.6],
      [880.00, 6.5,  0.3], [783.99, 7,    0.3], [987.77, 7.5,  0.3],
      // A minor (拍 8-11)
      [880.00, 8,    0.3], [1046.5, 8.5,  0.3], [880.00, 9,    0.3], [783.99, 9.5,  0.6],
      [659.25, 10.5, 0.3], [783.99, 11,   0.3], [880.00, 11.5, 0.3],
      // F major (拍 12-15)
      [698.46, 12,   0.3], [880.00, 12.5, 0.3], [1046.5, 13,   0.3], [880.00, 13.5, 0.6],
      [783.99, 14.5, 0.3], [698.46, 15,   0.3], [659.25, 15.5, 0.3],
    ],
    bass: [
      [261.63, 0,  0.7], [261.63, 1,  0.7], [261.63, 2,  0.7], [261.63, 3,  0.7], // C3
      [196.00, 4,  0.7], [196.00, 5,  0.7], [196.00, 6,  0.7], [196.00, 7,  0.7], // G3
      [220.00, 8,  0.7], [220.00, 9,  0.7], [220.00, 10, 0.7], [220.00, 11, 0.7], // A3
      [174.61, 12, 0.7], [174.61, 13, 0.7], [174.61, 14, 0.7], [174.61, 15, 0.7], // F3
    ],
  },
  // 普通の企業: 標準 (C-Am-F-G, 130BPM, triangle)
  normal: {
    bpm: 130, loopBeats: 16,
    melodyType: "triangle", bassType: "sine",
    melodyGain: 0.08, bassGain: 0.06,
    melody: [
      // C major (拍 0-3)
      [659.25, 0,    0.4], [783.99, 0.5,  0.4], [880.00, 1,    0.4],
      [783.99, 1.5,  0.9], [659.25, 2.5,  0.4], [523.25, 3,    0.4], [587.33, 3.5,  0.4],
      // A minor (拍 4-7)
      [659.25, 4,    0.4], [880.00, 4.5,  0.4], [783.99, 5,    0.4],
      [659.25, 5.5,  0.9], [523.25, 6.5,  0.4], [440.00, 7,    0.4], [493.88, 7.5,  0.4],
      // F major (拍 8-11)
      [523.25, 8,    0.4], [698.46, 8.5,  0.4], [783.99, 9,    0.4],
      [698.46, 9.5,  0.9], [659.25, 10.5, 0.4], [587.33, 11,   0.4], [523.25, 11.5, 0.4],
      // G major (拍 12-15)
      [587.33, 12,   0.4], [783.99, 12.5, 0.4], [880.00, 13,   0.4],
      [783.99, 13.5, 0.9], [659.25, 14.5, 0.4], [587.33, 15,   0.4], [493.88, 15.5, 0.4],
    ],
    bass: [
      [130.81, 0,  1.8], [130.81, 2,  1.8], // C3
      [220.00, 4,  1.8], [220.00, 6,  1.8], // A3
      [174.61, 8,  1.8], [174.61, 10, 1.8], // F3
      [196.00, 12, 1.8], [196.00, 14, 1.8], // G3
    ],
  },
  // ブラック企業: 重い・暗い (Am-Dm-Am-E, 92BPM, sawtooth)
  black: {
    bpm: 92, loopBeats: 16,
    melodyType: "sawtooth", bassType: "sawtooth",
    melodyGain: 0.04, bassGain: 0.08,
    melody: [
      // A minor (拍 0-3): 重く引きずる
      [440.00, 0,    0.8], [392.00, 1,    0.8],
      [440.00, 2,    0.4], [466.16, 2.5,  0.4], [440.00, 3,    0.7],
      // D minor (拍 4-7)
      [440.00, 4,    0.5], [349.23, 4.5,  0.5],
      [440.00, 5,    0.8], [415.30, 6,    0.8], [392.00, 7,    0.7],
      // A minor (拍 8-11)
      [440.00, 8,    0.8], [392.00, 9,    0.8],
      [440.00, 10,   0.4], [466.16, 10.5, 0.4], [392.00, 11,   0.7],
      // E (拍 12-15): 緊張感
      [329.63, 12,   0.8], [369.99, 13,   0.8],
      [415.30, 14,   0.5], [440.00, 14.5, 0.5], [415.30, 15,   0.9],
    ],
    bass: [
      [110.00, 0,  1.8], [110.00, 2,  1.8], // A2 (重低音)
      [146.83, 4,  1.8], [146.83, 6,  1.8], // D3
      [110.00, 8,  1.8], [110.00, 10, 1.8], // A2
      [164.81, 12, 1.8], [164.81, 14, 1.8], // E3
    ],
  },
};

let currentBGMConfig = BGM_CONFIGS.normal;

function playBGMBar(startTime) {
  const cfg = currentBGMConfig;
  const b = 60 / cfg.bpm;
  cfg.melody.forEach(([freq, beatOff, durBeats]) => {
    const t = startTime + beatOff * b;
    const d = durBeats * b;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = cfg.melodyType;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(cfg.melodyGain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(g); g.connect(bgmGain);
    osc.start(t); osc.stop(t + d + 0.01);
  });
  cfg.bass.forEach(([freq, beatOff, durBeats]) => {
    const t = startTime + beatOff * b;
    const d = durBeats * b;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = cfg.bassType;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(cfg.bassGain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(g); g.connect(bgmGain);
    osc.start(t); osc.stop(t + d + 0.01);
  });
}

function startBGM(difficultyId) {
  if (state.masterMuted) return;
  currentBGMConfig = BGM_CONFIGS[difficultyId] ?? BGM_CONFIGS.normal;
  stopBGM();
  // 旧オシレーターが旧gainノードに残っているため、切断して新規ノードを作成する
  bgmGain.disconnect();
  bgmGain = audioCtx.createGain();
  bgmGain.gain.setValueAtTime(state.bgmVolume, audioCtx.currentTime);
  bgmGain.connect(audioCtx.destination);
  audioCtx.resume();
  const loopMs = currentBGMConfig.loopBeats * (60 / currentBGMConfig.bpm) * 1000;
  function loop() {
    playBGMBar(audioCtx.currentTime);
    bgmTimerId = setTimeout(loop, loopMs - 80);
  }
  loop();
}

function stopBGM() {
  if (bgmTimerId !== null) { clearTimeout(bgmTimerId); bgmTimerId = null; }
  bgmGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.12);
}

/* ===========================
   初期化
=========================== */
initialize();

function initialize() {
  checkMobile();
  bindEvents();
  renderBestRecords();
  renderLastResultSummary();
  updateDifficultySelection();
  startRealClock();
}

function startRealClock() {
  const clockEl = document.getElementById("title-real-clock");
  if (!clockEl) return;
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    clockEl.textContent = `${h}:${m}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ===========================
   モバイル警告
=========================== */
function checkMobile() {
  if (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)) {
    el.mobileWarning.hidden = false;
  }
}

/* ===========================
   イベントバインド
=========================== */
function bindEvents() {
  // 難易度選択
  el.difficultyCards.forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedDifficulty = card.dataset.difficulty;
      updateDifficultySelection();
      goToReady();
    });
  });

  // スタートボタン → 難易度選択へ
  el.startButton.addEventListener("click", goToDifficulty);

  // 難易度選択画面
  el.diffBackBtn.addEventListener("click", () => switchScreen("title"));

  // 準備画面（Space キーでスタート、クリックでも可）
  el.readyStartBtn.addEventListener("click", startGame);
  el.readyBackBtn.addEventListener("click", goToDifficulty);

  // ゲーム画面 メイン画面へ戻る／やり直す
  document.getElementById("game-back-btn").addEventListener("click", () => {
    stopStatTicker();
    stopBGM();
    hideHeaderClock();
    switchScreen("title");
    renderBestRecords();
    renderLastResultSummary();
  });
  document.getElementById("game-retry-btn").addEventListener("click", () => {
    stopStatTicker();
    stopBGM();
    goToDifficulty();
  });

  // ゲーム画面クリック時は入力欄へフォーカスを戻す（ボタン・リンクへのクリックは除く）
  document.getElementById("game-screen").addEventListener("click", (e) => {
    if (e.target.closest("button, a, input")) return;
    focusGameInput();
  });

  // 結果画面ボタン
  document.getElementById("hero-share-btn").addEventListener("click", shareResult);
  el.retryButton.addEventListener("click", goToReady);
  el.changeDifficultyBtn.addEventListener("click", goToDifficulty);
  el.backButton.addEventListener("click", () => {
    stopStatTicker();
    hideHeaderClock();
    switchScreen("title");
    renderBestRecords();
    renderLastResultSummary();
  });

  // グローバルキーダウン
  document.addEventListener("keydown", handleGlobalKeyDown);
  el.gameImeInput.addEventListener("keydown", handleGameInputKeyDown);
  el.gameImeInput.addEventListener("input", handleGameInput);
  el.gameImeInput.addEventListener("blur", (e) => {
    if (state.currentScreen === "game" && state.session) {
      // フォーカス先がボタン等のインタラクティブ要素なら奪い返さない
      const to = e.relatedTarget;
      if (to && (to.tagName === "BUTTON" || to.tagName === "A" || to.tagName === "INPUT")) return;
      requestAnimationFrame(() => focusGameInput());
    }
  });

  // 遊び方モーダル
  document.querySelectorAll(".how-to-btn").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });
  el.modalCloseBtn.addEventListener("click", closeModal);
  el.modalOkBtn.addEventListener("click", closeModal);
  el.modal.addEventListener("click", (e) => {
    if (e.target === el.modal) closeModal();
  });

  // 設定モーダル
  document.querySelectorAll(".settings-btn").forEach((btn) => {
    btn.addEventListener("click", openSettingsModal);
  });
  el.settingsModalCloseBtn.addEventListener("click", closeSettingsModal);
  el.settingsModalOkBtn.addEventListener("click", closeSettingsModal);
  el.settingsModal.addEventListener("click", (e) => {
    if (e.target === el.settingsModal) closeSettingsModal();
  });
  el.masterMuteBtn.addEventListener("click", toggleMasterMute);
  el.globalMuteBtn.addEventListener("click", toggleMasterMute);
  el.bgmVolumeSlider.addEventListener("input", () => {
    state.bgmVolume = el.bgmVolumeSlider.value / 100;
    el.bgmVolumeVal.textContent = el.bgmVolumeSlider.value;
    if (!state.masterMuted) {
      bgmGain.gain.setTargetAtTime(state.bgmVolume, audioCtx.currentTime, 0.05);
    }
  });
  el.seVolumeSlider.addEventListener("input", () => {
    state.seVolume = el.seVolumeSlider.value / 100;
    el.seVolumeVal.textContent = el.seVolumeSlider.value;
  });

  // 実績モーダル
  document.querySelectorAll(".records-btn").forEach((btn) => {
    btn.addEventListener("click", openRecordsModal);
  });
  el.recordsModalCloseBtn.addEventListener("click", closeRecordsModal);
  el.recordsModalOkBtn.addEventListener("click", closeRecordsModal);
  el.recordsModal.addEventListener("click", (e) => {
    if (e.target === el.recordsModal) closeRecordsModal();
  });

  // モバイル警告 閉じる
  el.mobileWarningDismiss.addEventListener("click", () => {
    el.mobileWarning.hidden = true;
  });
}

function handleGlobalKeyDown(e) {
  if (state.currentScreen === "game" && state.session) {
    if (e.key === "Escape") {
      // Escape は下の共通処理へ流す
    } else {
      if (e.key === "Tab" || e.code === "Space") {
        e.preventDefault();
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        focusGameInput();
      }
      return;
    }
  }

  // Escape キー処理
  if (e.key === "Escape") {
    if (!el.modal.hidden) {
      closeModal();
      return;
    }
    if (!el.recordsModal.hidden) {
      closeRecordsModal();
      return;
    }
    if (!el.settingsModal.hidden) {
      closeSettingsModal();
      return;
    }
    if (state.currentScreen === "difficulty") {
      e.preventDefault();
      switchScreen("title");
      return;
    }
    if (state.currentScreen === "game" || state.currentScreen === "ready") {
      e.preventDefault();
      stopStatTicker();
      hideHeaderClock();
      switchScreen("title");
      renderBestRecords();
      renderLastResultSummary();
      return;
    }
    if (state.currentScreen === "result") {
      e.preventDefault();
      hideHeaderClock();
      switchScreen("title");
      renderBestRecords();
      renderLastResultSummary();
      return;
    }
  }

  // Space キー
  if (e.code === "Space") {
    if (state.currentScreen === "title" && el.modal.hidden) {
      e.preventDefault();
      goToDifficulty();
      return;
    }
    if (state.currentScreen === "difficulty") {
      e.preventDefault();
      goToReady();
      return;
    }
    if (state.currentScreen === "ready") {
      e.preventDefault();
      startGame();
      return;
    }
    if (state.currentScreen === "result") {
      e.preventDefault();
      return;
    }
  }

  // Enter キー（結果画面でリトライ）
  if (e.key === "Enter" && state.currentScreen === "result") {
    e.preventDefault();
    goToReady();
    return;
  }
}

function focusGameInput({ resetValue = false } = {}) {
  if (!el.gameImeInput) return;
  if (resetValue) el.gameImeInput.value = "";
  if (document.activeElement !== el.gameImeInput) {
    el.gameImeInput.focus({ preventScroll: true });
  }
}

function handleGameInputKeyDown(event) {
  if (state.currentScreen !== "game" || !state.session) return;

  if (event.key === "Backspace") {
    event.preventDefault();
    el.gameImeInput.value = "";
    if (state.session.currentTyped.length > 0) {
      state.session.currentTyped = state.session.currentTyped.slice(0, -1);
      renderJapaneseWithColor();
      renderTypingPreview();
    }
    return;
  }

  if (event.key === "Tab" || event.code === "Space") {
    event.preventDefault();
    return;
  }

}

function handleGameInput(event) {
  const rawValue = event.target.value;
  event.target.value = "";

  if (state.currentScreen !== "game" || !state.session || !rawValue) return;

  const normalized = normalizeTypingChars(rawValue);
  for (const char of normalized) {
    processChar(char);
  }
}

function normalizeTypingChars(text) {
  const normalized = normalizeFullWidthAscii(text).toLowerCase();
  const tokens = tokenize(normalized);
  let result = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^[a-z]+$/.test(token)) {
      result += token;
      continue;
    }
    if (KANA_MAP.has(token)) {
      result += getDisplayCanonical(tokens, i);
    }
  }

  return result;
}

function normalizeFullWidthAscii(text) {
  return [...text].map((char) => {
    const code = char.charCodeAt(0);
    if ((code >= 0xFF21 && code <= 0xFF3A) || (code >= 0xFF41 && code <= 0xFF5A)) {
      return String.fromCharCode(code - 0xFEE0);
    }
    return char;
  }).join("");
}

function openModal()  { el.modal.hidden = false; }
function closeModal() { el.modal.hidden = true; }

function openSettingsModal() {
  el.masterMuteBtn.textContent    = state.masterMuted ? "🔇" : "🔊";
  el.masterMuteBtn.dataset.muted  = String(state.masterMuted);
  el.bgmVolumeSlider.value        = Math.round(state.bgmVolume * 100);
  el.bgmVolumeVal.textContent     = Math.round(state.bgmVolume * 100);
  el.seVolumeSlider.value         = Math.round(state.seVolume * 100);
  el.seVolumeVal.textContent      = Math.round(state.seVolume * 100);
  el.settingsModal.hidden = false;
}
function closeSettingsModal() { el.settingsModal.hidden = true; }

function toggleMasterMute() {
  state.masterMuted = !state.masterMuted;
  const icon = state.masterMuted ? "🔇" : "🔊";
  [el.masterMuteBtn, el.globalMuteBtn].forEach((btn) => {
    btn.textContent = icon;
    btn.dataset.muted = String(state.masterMuted);
  });
  bgmGain.gain.setTargetAtTime(state.masterMuted ? 0 : state.bgmVolume, audioCtx.currentTime, 0.05);
}

function openRecordsModal() {
  renderBestRecords();
  renderLastResultSummary();
  el.recordsModal.hidden = false;
}
function closeRecordsModal() { el.recordsModal.hidden = true; }

/* ===========================
   難易度表示更新
=========================== */
function updateDifficultySelection() {
  el.difficultyCards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.difficulty === state.selectedDifficulty);
  });
}

/* ===========================
   難易度選択画面へ
=========================== */
function goToDifficulty() {
  stopStatTicker();
  stopBGM();
  closeModal();
  updateDifficultySelection();
  hideHeaderClock();
  switchScreen("difficulty");
}

/* ===========================
   準備画面へ
=========================== */
function goToReady() {
  stopStatTicker();
  closeModal();
  const difficulty = DIFFICULTIES[state.selectedDifficulty];
  el.readyDifficultyName.textContent = difficulty.name;
  updateHeaderClock(difficulty);
  switchScreen("ready");
  startBGM(state.selectedDifficulty);
}

function updateHeaderClock(difficulty) {
  const headerClock = document.getElementById("header-clock");
  if (!headerClock) return;
  headerClock.innerHTML = `始業 ${fmtMin(difficulty.startMinutes)} &nbsp;/&nbsp; 定時 ${fmtMin(difficulty.endMinutes)}`;
  headerClock.hidden = false;
}

function hideHeaderClock() {
  const headerClock = document.getElementById("header-clock");
  if (headerClock) headerClock.hidden = true;
}

/* ===========================
   ゲーム開始
=========================== */
function startGame() {
  stopStatTicker();
  el.screens.game.classList.remove("game-overtime");
  el.timeLeft.classList.remove("is-overtime");

  const difficulty = DIFFICULTIES[state.selectedDifficulty];
  const tasks = buildTaskList(difficulty);
  const now   = performance.now();

  state.session = {
    difficulty,
    tasks,
    currentTaskIndex: 0,
    // かなエンジン状態
    tokens:       [],
    tokenIndex:   0,
    currentTyped: "",
    // 統計
    gameMinutes:    difficulty.startMinutes,
    realStartAt:    now,
    correctChars:   0,
    misses:         0,
    totalInputs:    0,
    taskStartedAt:  now,
    taskCorrectChars: 0,
    taskMisses:       0,
    speedPenaltyUntil: 0   // ミス時の時計加速ペナルティ終了時刻
  };

  switchScreen("game");
  showKisoFlash(difficulty.id);
  focusGameInput({ resetValue: true });

  if (el.gameTip) {
    el.gameTip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  renderCurrentTask();
  updateStats();
  startStatTicker();
}

function showKisoFlash(difficultyId) {
  const el = document.getElementById("kiso-flash");
  if (!el) return;
  const texts = { white: "業務開始！", normal: "業務開始", black: "業務開始..." };
  el.querySelector("span").textContent = texts[difficultyId] ?? "業務開始";
  el.style.display = "block";
  el.classList.remove("is-active");
  // リフロー強制で再アニメーション
  void el.offsetWidth;
  el.classList.add("is-active");
  setTimeout(() => {
    el.style.display = "none";
    el.classList.remove("is-active");
  }, 750);
}

/* ===========================
   タスクリスト構築
=========================== */

/**
 * 難易度・タスクインデックス・場面・lengthType に基づき
 * 未使用文言をランダムに1件選ぶ。
 * 該当バケツが枯渇した場合は同難易度内でフォールバック。
 */
function pickMessage(diffId, taskIndex, taskTotal, usedTexts) {
  const scene      = SCENE_MAP[diffId][taskIndex] ?? "middle";
  const lengthType = MESSAGE_PLANS[diffId][taskIndex] ?? "medium";
  const pool       = difficultyMessagePools[diffId];

  // 優先順: (指定scene, 指定length) → (指定scene, 他length) → (他scene, 指定length) → (他scene, 他length)
  const scenes  = ["early", "middle", "late"];
  const lengths = ["short", "medium", "long"];
  const sceneOrder  = [scene,      ...scenes.filter(s => s !== scene)];
  const lengthOrder = [lengthType, ...lengths.filter(l => l !== lengthType)];

  for (const s of sceneOrder) {
    for (const l of lengthOrder) {
      const bucket    = pool[s]?.[l] ?? [];
      const available = bucket.filter(m => !usedTexts.has(m.text));
      if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
      }
    }
  }

  // 最終フォールバック（重複を許容）
  const fallback = pool[scene]?.[lengthType] ?? [];
  return fallback[Math.floor(Math.random() * fallback.length)]
    ?? { text: "確認中です", reading: "かくにんちゅうです", lengthType: "short" };
}

/* ===========================
   漢字判定
=========================== */
function isKanjiChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
}

/* ===========================
   漢字1文字単位の読みデータ
=========================== */
const MESSAGE_KANJI_READINGS = new Map([
  ["出社しました", [["出","しゅっ"],["社","しゃ"]]],
  ["確認しました", [["確","かく"],["認","にん"]]],
  ["承知しました", [["承","しょう"],["知","ち"]]],
  ["かしこまりました", []],
  ["お疲れ様です", [["疲","つか"],["様","さま"]]],
  ["よろしくお願いします", [["願","ねが"]]],
  ["準備できました", [["準","じゅん"],["備","び"]]],
  ["本日もよろしくお願いします", [["本","ほん"],["日","じつ"],["願","ねが"]]],
  ["ご連絡ありがとうございます", [["連","れん"],["絡","らく"]]],
  ["会議の時間をご共有します", [["会","かい"],["議","ぎ"],["時","じ"],["間","かん"],["共","きょう"],["有","ゆう"]]],
  ["こちらで確認を進めます", [["確","かく"],["認","にん"],["進","すす"]]],
  ["先に状況をご報告します", [["先","さき"],["状","じょう"],["況","きょう"],["報","ほう"],["告","こく"]]],
  ["先ほどの件につきまして内容を整理してご共有いたします", [["先","さき"],["件","けん"],["内","ない"],["容","よう"],["整","せい"],["理","り"],["共","きょう"],["有","ゆう"]]],
  ["本件は大きな問題なくこのまま進行できそうです", [["本","ほん"],["件","けん"],["大","おお"],["問","もん"],["題","だい"],["進","しん"],["行","こう"]]],
  ["ご確認ください", [["確","かく"],["認","にん"]]],
  ["問題ありません", [["問","もん"],["題","だい"]]],
  ["さっそく対応します", [["対","たい"],["応","おう"]]],
  ["共有しました", [["共","きょう"],["有","ゆう"]]],
  ["対応中です", [["対","たい"],["応","おう"],["中","ちゅう"]]],
  ["進めております", [["進","すす"]]],
  ["お忙しいところすみませんでした", [["忙","いそが"]]],
  ["資料をご確認いただけますか", [["資","し"],["料","りょう"],["確","かく"],["認","にん"]]],
  ["手配の方を進めてまいります", [["手","て"],["配","はい"],["方","ほう"],["進","すす"]]],
  ["修正版をご確認いただけますか", [["修","しゅう"],["正","せい"],["版","ばん"],["確","かく"],["認","にん"]]],
  ["念のため内容を共有します", [["念","ねん"],["内","ない"],["容","よう"],["共","きょう"],["有","ゆう"]]],
  ["本件承知いたしました", [["本","ほん"],["件","けん"],["承","しょう"],["知","ち"]]],
  ["この内容で進めてまいります", [["内","ない"],["容","よう"],["進","すす"]]],
  ["ご確認いただけましたらこの内容で進めてまいります", [["確","かく"],["認","にん"],["内","ない"],["容","よう"],["進","すす"]]],
  ["念のため修正版をお送りしますのでご確認をお願いいたします", [["念","ねん"],["修","しゅう"],["正","せい"],["版","ばん"],["確","かく"],["認","にん"],["願","ねが"]]],
  ["送付しました", [["送","そう"],["付","ふ"]]],
  ["完了しました", [["完","かん"],["了","りょう"]]],
  ["失礼いたします", [["失","しつ"],["礼","れい"]]],
  ["取り急ぎご連絡します", [["取","と"],["急","いそ"],["連","れん"],["絡","らく"]]],
  ["ご確認いただきありがとうございます", [["確","かく"],["認","にん"]]],
  ["対応完了しました", [["対","たい"],["応","おう"],["完","かん"],["了","りょう"]]],
  ["最終版を送付しました", [["最","さい"],["終","しゅう"],["版","ばん"],["送","そう"],["付","ふ"]]],
  ["お忙しい中ご確認いただきありがとうございました", [["忙","いそが"],["中","なか"],["確","かく"],["認","にん"]]],
  ["皆様のおかげで順調に進めることができています", [["皆","みな"],["様","さま"],["順","じゅん"],["調","ちょう"],["進","すす"]]],
  ["お世話になっております", [["世","せ"],["話","わ"]]],
  ["折り返し連絡します", [["折","お"],["返","かえ"],["連","れん"],["絡","らく"]]],
  ["確認お願いします", [["確","かく"],["認","にん"],["願","ねが"]]],
  ["共有します", [["共","きょう"],["有","ゆう"]]],
  ["本日の進捗を共有します", [["本","ほん"],["日","じつ"],["進","しん"],["捗","ちょく"],["共","きょう"],["有","ゆう"]]],
  ["会議室が変更になりました", [["会","かい"],["議","ぎ"],["室","しつ"],["変","へん"],["更","こう"]]],
  ["本件先に共有しておきます", [["本","ほん"],["件","けん"],["先","さき"],["共","きょう"],["有","ゆう"]]],
  ["取り急ぎ状況共有します", [["取","と"],["急","いそ"],["状","じょう"],["況","きょう"],["共","きょう"],["有","ゆう"]]],
  ["本日中に一度送ります", [["本","ほん"],["日","じつ"],["中","ちゅう"],["一","いち"],["度","ど"],["送","おく"]]],
  ["本件について先方より連絡がありましたのでご報告します", [["本","ほん"],["件","けん"],["先","せん"],["方","ぽう"],["連","れん"],["絡","らく"],["報","ほう"],["告","こく"]]],
  ["念のため関係者にも同じ内容を共有しておいてください", [["念","ねん"],["関","かん"],["係","けい"],["者","しゃ"],["同","おな"],["内","ない"],["容","よう"],["共","きょう"],["有","ゆう"]]],
  ["ちょっといいですか", []],
  ["至急対応します", [["至","し"],["急","きゅう"],["対","たい"],["応","おう"]]],
  ["修正します", [["修","しゅう"],["正","せい"]]],
  ["再送します", [["再","さい"],["送","そう"]]],
  ["一旦送ります", [["一","いっ"],["旦","たん"],["送","おく"]]],
  ["反映します", [["反","はん"],["映","えい"]]],
  ["念のため再度ご確認ください", [["念","ねん"],["再","さい"],["度","ど"],["確","かく"],["認","にん"]]],
  ["先ほどの件修正版をお送りします", [["先","さき"],["件","けん"],["修","しゅう"],["正","せい"],["版","ばん"]]],
  ["仕様変更の内容を反映します", [["仕","し"],["様","よう"],["変","へん"],["更","こう"],["内","ない"],["容","よう"],["反","はん"],["映","えい"]]],
  ["一旦この方向で進めます", [["一","いっ"],["旦","たん"],["方","ほう"],["向","こう"],["進","すす"]]],
  ["こちら認識齟齬がありました", [["認","にん"],["識","しき"],["齟","そ"],["齬","ご"]]],
  ["先方確認が必要です", [["先","せん"],["方","ぽう"],["確","かく"],["認","にん"],["必","ひつ"],["要","よう"]]],
  ["修正版を反映して送ります", [["修","しゅう"],["正","せい"],["版","ばん"],["反","はん"],["映","えい"],["送","おく"]]],
  ["念のため再確認します", [["念","ねん"],["再","さい"],["確","かく"],["認","にん"]]],
  ["こちら認識齟齬がありましたので再確認をお願いします", [["認","にん"],["識","しき"],["齟","そ"],["齬","ご"],["再","さい"],["確","かく"],["認","にん"],["願","ねが"]]],
  ["会議内容を反映した資料を再度送付いたします", [["会","かい"],["議","ぎ"],["内","ない"],["容","よう"],["反","はん"],["映","えい"],["資","し"],["料","りょう"],["再","さい"],["度","ど"],["送","そう"],["付","ふ"]]],
  ["先ほどの内容に修正が入ったため差し替えをお願いします", [["先","さき"],["内","ない"],["容","よう"],["修","しゅう"],["正","せい"],["入","はい"],["差","さ"],["替","か"],["願","ねが"]]],
  ["対応完了です", [["対","たい"],["応","おう"],["完","かん"],["了","りょう"]]],
  ["最終確認します", [["最","さい"],["終","しゅう"],["確","かく"],["認","にん"]]],
  ["先方へ送ります", [["先","せん"],["方","ぽう"],["送","おく"]]],
  ["すみません本日中に対応お願いします", [["本","ほん"],["日","じつ"],["中","ちゅう"],["対","たい"],["応","おう"],["願","ねが"]]],
  ["本件先に送付します", [["本","ほん"],["件","けん"],["先","さき"],["送","そう"],["付","ふ"]]],
  ["最終版を共有します", [["最","さい"],["終","しゅう"],["版","ばん"],["共","きょう"],["有","ゆう"]]],
  ["本日中に対応完了予定です", [["本","ほん"],["日","じつ"],["中","ちゅう"],["対","たい"],["応","おう"],["完","かん"],["了","りょう"],["予","よ"],["定","てい"]]],
  ["誤字が見つかりましたので至急修正して再送をお願いします", [["誤","ご"],["字","じ"],["見","み"],["至","し"],["急","きゅう"],["修","しゅう"],["正","せい"],["再","さい"],["送","そう"],["願","ねが"]]],
  ["先方確認が必要なため修正版を先に共有いたします", [["先","せん"],["方","ぽう"],["確","かく"],["認","にん"],["必","ひつ"],["要","よう"],["修","しゅう"],["正","せい"],["版","ばん"],["先","さき"],["共","きょう"],["有","ゆう"]]],
  ["本日中の対応が必要ですので優先して進めてください", [["本","ほん"],["日","じつ"],["中","ちゅう"],["対","たい"],["応","おう"],["必","ひつ"],["要","よう"],["優","ゆう"],["先","せん"],["進","すす"]]],
  ["すぐ確認して", [["確","かく"],["認","にん"]]],
  ["先にこれやって", [["先","さき"]]],
  ["今日中です", [["今","きょ"],["日","う"],["中","じゅう"]]],
  ["明日の朝一でお願いします", [["明","あ"],["日","した"],["朝","あさ"],["一","いち"],["願","ねが"]]],
  ["先方がかなり急いでいます", [["先","せん"],["方","ぽう"],["急","いそ"]]],
  ["この件最優先でお願いします", [["件","けん"],["最","さい"],["優","ゆう"],["先","せん"],["願","ねが"]]],
  ["今日中対応で確定しました", [["今","きょ"],["日","う"],["中","じゅう"],["対","たい"],["応","おう"],["確","かく"],["定","てい"]]],
  ["先に修正版を出してください", [["先","さき"],["修","しゅう"],["正","せい"],["版","ばん"],["出","だ"]]],
  ["先方が待てないと言っているので今すぐ再送してください", [["先","せん"],["方","ぽう"],["待","ま"],["言","い"],["今","いま"],["再","さい"],["送","そう"]]],
  ["今日中対応が前提なので他の作業は後回しにしてください", [["今","きょ"],["日","う"],["中","じゅう"],["対","たい"],["応","おう"],["前","ぜん"],["提","てい"],["他","ほか"],["作","さ"],["業","ぎょう"],["後","あと"],["回","まわ"]]],
  ["今すぐ対応して", [["今","いま"],["対","たい"],["応","おう"]]],
  ["まだですか", []],
  ["急いでください", [["急","いそ"]]],
  ["早く送って", [["早","はや"],["送","おく"]]],
  ["もう見ましたか", [["見","み"]]],
  ["さっき言った修正まだですか", [["言","い"],["修","しゅう"],["正","せい"]]],
  ["なんでまだ終わってないんですか", [["終","お"]]],
  ["今日中に絶対終わらせてください", [["今","きょ"],["日","う"],["中","じゅう"],["絶","ぜっ"],["対","たい"],["終","お"]]],
  ["緊急で会議が入りました", [["緊","きん"],["急","きゅう"],["会","かい"],["議","ぎ"],["入","はい"]]],
  ["上司がちょっと来いと言っています", [["上","じょう"],["司","し"],["来","こ"],["言","い"]]],
  ["いつまで待たせれば気が済むんですか", [["待","ま"],["気","き"],["済","す"]]],
  ["とりあえず先にこれ出して", [["先","さき"],["出","だ"]]],
  ["まだ共有されてないんですか", [["共","きょう"],["有","ゆう"]]],
  ["先ほど送った資料に厳しい指摘が入りました", [["先","さき"],["送","おく"],["資","し"],["料","りょう"],["厳","きび"],["指","し"],["摘","てき"],["入","はい"]]],
  ["お客様が怒ってるので今すぐ電話してください", [["客","きゃく"],["様","さま"],["怒","おこ"],["今","いま"],["電","でん"],["話","わ"]]],
  ["上司が怒ってるので早急に対応してください", [["上","じょう"],["司","し"],["怒","おこ"],["早","さっ"],["急","きゅう"],["対","たい"],["応","おう"]]],
  ["この件まだ終わっていない理由を先に説明してください", [["件","けん"],["終","お"],["理","り"],["由","ゆう"],["先","さき"],["説","せつ"],["明","めい"]]],
  ["まだ終わりませんか", [["終","お"]]],
  ["先に出してください", [["先","さき"],["出","だ"]]],
  ["今日の分全部やり直してください", [["今","きょ"],["日","う"],["分","ぶん"],["全","ぜん"],["部","ぶ"],["直","なお"]]],
  ["もう一度確認して送り直してください", [["一","いち"],["度","ど"],["確","かく"],["認","にん"],["送","おく"],["直","なお"]]],
  ["今から修正版を至急出してください", [["今","いま"],["修","しゅう"],["正","せい"],["版","ばん"],["至","し"],["急","きゅう"],["出","だ"]]],
  ["まだ対応終わってないですよね", [["対","たい"],["応","おう"],["終","お"]]],
  ["先方から差し戻しが来ましたので本日中に対応してください", [["先","せん"],["方","ぽう"],["差","さ"],["戻","もど"],["来","き"],["本","ほん"],["日","じつ"],["中","ちゅう"],["対","たい"],["応","おう"]]],
  ["誤字がありましたので全部修正して至急再送してください", [["誤","ご"],["字","じ"],["全","ぜん"],["部","ぶ"],["修","しゅう"],["正","せい"],["至","し"],["急","きゅう"],["再","さい"],["送","そう"]]],
  ["これ頼んだのいつだと思ってるんですかまだできていないんですか", [["頼","たの"],["思","おも"]]],
  ["さっきの会議内容を全部反映してすぐに送り直してください", [["会","かい"],["議","ぎ"],["内","ない"],["容","よう"],["全","ぜん"],["部","ぶ"],["反","はん"],["映","えい"],["送","おく"],["直","なお"]]],
]);

/* ===========================
   漢字1文字単位でテキストをセグメント分割
=========================== */
function segmentPartsWithKanjiReadings(text, kanjiReadings) {
  if (!kanjiReadings || kanjiReadings.length === 0) return [[text]];

  const parts = [];
  let i = 0;
  let ki = 0; // kanjiReadings の現在インデックス

  while (i < text.length) {
    const ch = text[i];
    if (isKanjiChar(ch)) {
      if (ki < kanjiReadings.length && kanjiReadings[ki][0] === ch) {
        parts.push([ch, kanjiReadings[ki][1]]);
        ki++;
      } else {
        // データにない漢字はひらがなセグメントとして扱う
        parts.push([ch]);
      }
      i++;
    } else {
      let end = i;
      while (end < text.length && !isKanjiChar(text[end])) end++;
      parts.push([text.slice(i, end)]);
      i = end;
    }
  }
  return parts;
}

/* ===========================
   テキストを漢字/非漢字セグメントに自動分割してparts配列を生成
   漢字セグメントには reading を付与、ひらがな等は reading なし
=========================== */
function autoSegmentParts(text, reading) {
  if (!text || text === reading) return [[text]];

  const parts = [];
  let ti = 0; // text index
  let ri = 0; // reading index

  while (ti < text.length) {
    if (isKanjiChar(text[ti])) {
      // 漢字の連続を収集
      let kanjiEnd = ti;
      while (kanjiEnd < text.length && isKanjiChar(text[kanjiEnd])) kanjiEnd++;
      const kanjiSeg = text.slice(ti, kanjiEnd);

      // 漢字読みの終端: 次のひらがなセグメント全体を reading から探す（1文字だと誤マッチする場合があるため）
      let readingEnd;
      if (kanjiEnd < text.length) {
        let nextSegEnd = kanjiEnd;
        while (nextSegEnd < text.length && !isKanjiChar(text[nextSegEnd])) nextSegEnd++;
        const nextHiragana = text.slice(kanjiEnd, nextSegEnd);
        const pos = nextHiragana ? reading.indexOf(nextHiragana, ri) : -1;
        readingEnd = pos !== -1 ? pos : reading.length;
      } else {
        readingEnd = reading.length;
      }
      parts.push([kanjiSeg, reading.slice(ri, readingEnd)]);
      ti = kanjiEnd;
      ri = readingEnd;
    } else {
      // 非漢字の連続を収集（ひらがな・記号等）
      let end = ti;
      while (end < text.length && !isKanjiChar(text[end])) end++;
      const seg = text.slice(ti, end);
      parts.push([seg]);
      ti = end;
      ri += seg.length;
    }
  }
  return parts;
}

function buildTaskList(difficulty) {
  const commuteTask = TASK_POOL.find((t) => t.id === "commute");
  const finalTask   = TASK_POOL.find((t) => t.id === "final-task");
  const middle      = shuffleArray(
    TASK_POOL.filter((t) => t.id !== "commute" && t.id !== "final-task")
  );
  const chosen = [commuteTask, ...middle.slice(0, difficulty.taskCount - 2), finalTask];

  // 同一プレイ中の重複防止用セット
  const usedTexts = new Set();

  return chosen.map((task, idx) => {
    const msg    = pickMessage(difficulty.id, idx, chosen.length, usedTexts);
    usedTexts.add(msg.text);
    const hasKanji = msg.text !== msg.reading;
    const kr = MESSAGE_KANJI_READINGS.get(msg.text);
    const prompt = {
      jp:    msg.reading,
      parts: hasKanji
        ? (kr !== undefined ? segmentPartsWithKanjiReadings(msg.text, kr) : autoSegmentParts(msg.text, msg.reading))
        : [[msg.text]]
    };
    return { ...task, prompt };
  });
}

/* ===========================
   タスク描画
=========================== */
function renderCurrentTask() {
  const session = state.session;
  const task    = session.tasks[session.currentTaskIndex];

  if (!task) {
    finishGame();
    return;
  }

  session.taskStartedAt    = performance.now();
  session.taskCorrectChars = 0;
  session.taskMisses       = 0;

  // かなトークナイズ
  session.tokens       = tokenize(task.prompt.jp);
  session.tokenIndex   = 0;
  session.currentTyped = "";

  el.taskName.textContent       = task.name;

  renderJapaneseWithColor();
  renderTypingPreview();
  updateStats();
}

/* ===========================
   日本語テキストのかなカラーコーディング（漢字ルビ対応）
=========================== */
function renderJapaneseWithColor() {
  const session = state.session;
  const task    = session.tasks[session.currentTaskIndex];
  const tokens  = session.tokens;
  const idx     = session.tokenIndex;
  const jp      = task.prompt.jp;
  const parts   = task.prompt.parts;

  // jp文字列でどこまで入力済みかを文字数で計算
  let doneEnd = 0;
  for (let ti = 0; ti < idx; ti++) doneEnd += tokens[ti].length;
  const currentEnd = idx < tokens.length ? doneEnd + tokens[idx].length : doneEnd;

  el.promptJapanese.innerHTML = "";
  let pos = 0;

  for (const part of parts) {
    const text    = part[0];
    const reading = part[1]; // undefined if hiragana segment
    const segReading = reading !== undefined ? reading : text;
    const segStart = pos;
    const segEnd   = pos + segReading.length;
    pos = segEnd;

    if (reading !== undefined) {
      // 漢字セグメント: <ruby>漢字<rt>色付き読み</rt></ruby>
      // 漢字1文字ごとに span を作り、読み位置に応じて個別にカラーコーディング
      const ruby = document.createElement("ruby");
      const readingLen = segEnd - segStart;
      const kanjiLen   = text.length;
      for (let k = 0; k < kanjiLen; k++) {
        const kSpan = document.createElement("span");
        kSpan.textContent = text[k];
        const kReadStart = segStart + Math.round(k * readingLen / kanjiLen);
        const kReadEnd   = segStart + Math.round((k + 1) * readingLen / kanjiLen);
        if (kReadEnd <= doneEnd)                               kSpan.className = "kana-done";
        else if (kReadStart <= doneEnd && doneEnd < kReadEnd)  kSpan.className = "kana-current";
        else                                                   kSpan.className = "kana-pending";
        ruby.appendChild(kSpan);
      }
      const rt = document.createElement("rt");
      appendColoredKana(rt, reading, segStart, doneEnd, currentEnd);
      ruby.appendChild(rt);
      el.promptJapanese.appendChild(ruby);
    } else {
      // ひらがなセグメント: 1文字ずつ色付け
      appendColoredKana(el.promptJapanese, text, segStart, doneEnd, currentEnd);
    }
  }
}

function appendColoredKana(parent, text, startPos, doneEnd, currentEnd) {
  let pos = startPos;
  for (const ch of text) {
    const span = document.createElement("span");
    span.textContent = ch;
    if (pos < doneEnd)        span.className = "kana-done";
    else if (pos === doneEnd) span.className = "kana-current";
    else                      span.className = "kana-pending";
    parent.appendChild(span);
    pos++;
  }
}

function getDisplayCanonical(tokens, ti) {
  const token = tokens[ti];
  if (token === "っ" && ti + 1 < tokens.length) {
    const nextPatterns = getPatternsForToken(tokens, ti + 1);
    for (const np of nextPatterns) {
      if (np.length >= 1 && !/^[aiueo]/i.test(np[0])) {
        return np[0];
      }
    }
  }
  if (token === "ん") return getNPatterns(tokens, ti)[0];
  return getPatternsForToken(tokens, ti)[0];
}

/* ===========================
   タイピングプレビュー描画
=========================== */
function renderTypingPreview() {
  const session = state.session;
  const tokens  = session.tokens;
  const idx     = session.tokenIndex;
  const typed   = session.currentTyped;

  el.typingPreview.innerHTML = "";

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    const canonical = getDisplayCanonical(tokens, ti);

    if (ti < idx) {
      // 完了済み
      for (const ch of canonical) {
        const span = document.createElement("span");
        span.textContent = ch;
        span.className = "char-correct";
        el.typingPreview.appendChild(span);
      }
    } else if (ti === idx) {
      // 現在トークン：typed部分 + 残り
      for (let ci = 0; ci < canonical.length; ci++) {
        const span = document.createElement("span");
        if (ci < typed.length) {
          span.textContent = typed[ci] || canonical[ci];
          span.className = "char-correct";
        } else if (ci === typed.length) {
          span.textContent = canonical[ci];
          span.className = "char-current";
        } else {
          span.textContent = canonical[ci];
          span.className = "char-pending";
        }
        el.typingPreview.appendChild(span);
      }
    } else {
      // 未入力
      for (const ch of canonical) {
        const span = document.createElement("span");
        span.textContent = ch;
        span.className = "char-pending";
        el.typingPreview.appendChild(span);
      }
    }
  }
}

/* ===========================
   入力処理（かなエンジン）
=========================== */
// handleBeforeInput は input 要素削除により不要（handleGlobalKeyDown に統合済み）

function handleTypingKeyDown(event) {
  // この関数は input 要素削除に伴い無効化（handleGlobalKeyDown に統合済み）
  if (event.code === "Space") {
    event.preventDefault();
    return;
  }
}

function processChar(char) {
  const session = state.session;
  const tokens  = session.tokens;
  const idx     = session.tokenIndex;

  if (idx >= tokens.length) return;

  const token = tokens[idx];
  session.totalInputs++;

  // ASCII パススルー
  if (!KANA_MAP.has(token)) {
    if (char === token) {
      session.correctChars++;
      session.taskCorrectChars++;
      session.tokenIndex++;
      session.currentTyped = "";
      playKeySound(true);
      if (session.tokenIndex >= tokens.length) {
        playTaskCompleteSound();
        completeTask();
        return;
      }
      renderJapaneseWithColor();
      renderTypingPreview();
      updateStats();
    } else {
      session.misses++;
      session.taskMisses++;
      flashInputError();
      playKeySound(false);
      updateStats();
    }
    return;
  }

  const newTyped = session.currentTyped + char;

  // ん 特殊処理
  if (token === "ん") {
    // "nn" で完全確定
    if (newTyped === "nn") {
      session.correctChars++;
      session.taskCorrectChars++;
      session.tokenIndex++;
      session.currentTyped = "";
      playKeySound(true);
      if (session.tokenIndex >= tokens.length) {
        playTaskCompleteSound();
        completeTask();
        return;
      }
      renderJapaneseWithColor();
      renderTypingPreview();
      updateStats();
      return;
    }
    // currentTyped が "n" のとき次の文字が来た → n単体でん確定してから次の文字を処理
    if (session.currentTyped === "n" && char !== "n") {
      session.correctChars++;
      session.taskCorrectChars++;
      session.tokenIndex++;
      session.currentTyped = "";
      playKeySound(true);
      if (session.tokenIndex >= tokens.length) {
        playTaskCompleteSound();
        completeTask();
        return;
      }
      // 続けて次のトークンにその文字を処理（totalInputsは二重計上しない）
      session.totalInputs--;
      processChar(char);
      return;
    }
    // "n" をプレフィックスとして保持（最終トークンなら即確定）
    if (char === "n") {
      if (idx + 1 >= tokens.length) {
        // 最後のトークンなら n 単体で即確定
        session.correctChars++;
        session.taskCorrectChars++;
        session.tokenIndex++;
        session.currentTyped = "";
        playKeySound(true);
        if (session.tokenIndex >= tokens.length) {
          playTaskCompleteSound();
          completeTask();
          return;
        }
        renderJapaneseWithColor();
        renderTypingPreview();
        updateStats();
        return;
      }
      session.currentTyped = "n";
      session.correctChars++;
      session.taskCorrectChars++;
      playKeySound(true);
      renderJapaneseWithColor();
      renderTypingPreview();
      updateStats();
      return;
    }
    // ミス
    session.misses++;
    session.taskMisses++;
    flashInputError();
    playKeySound(false);
    updateStats();
    return;
  }

  // っ 特殊処理（二重子音）
  if (token === "っ") {
    const basePatterns = KANA_MAP.get("っ"); // xtu, ltu, xtsu, ltsu

    // 完全一致チェック（xtu等）
    if (basePatterns.includes(newTyped)) {
      session.correctChars++;
      session.taskCorrectChars++;
      session.tokenIndex++;
      session.currentTyped = "";
      playKeySound(true);
      if (session.tokenIndex >= tokens.length) {
        playTaskCompleteSound();
        completeTask();
        return;
      }
      renderJapaneseWithColor();
      renderTypingPreview();
      updateStats();
      return;
    }

    // プレフィックスチェック（xtu等の途中）
    if (basePatterns.some(p => p.startsWith(newTyped))) {
      session.currentTyped = newTyped;
      session.correctChars++;
      session.taskCorrectChars++;
      playKeySound(true);
      renderJapaneseWithColor();
      renderTypingPreview();
      updateStats();
      return;
    }

    // 二重子音チェック：次のかなの先頭子音と一致するか
    if (session.currentTyped === "" && idx + 1 < tokens.length) {
      const nextToken = tokens[idx + 1];
      if (KANA_MAP.has(nextToken)) {
        const nextPatterns = getPatternsForToken(tokens, idx + 1);
        for (const np of nextPatterns) {
          if (np.length >= 1 && np[0] === char && !/^[aiueo]/.test(char)) {
            // っ を消費して次のトークンへ進み、先頭子音をcurrentTypedにセット
            session.correctChars++;
            session.taskCorrectChars++;
            session.tokenIndex++; // っ完了
            session.currentTyped = char; // 次のトークンの1文字目として設定
            playKeySound(true);
            if (session.tokenIndex >= tokens.length) {
              playTaskCompleteSound();
              completeTask();
              return;
            }
            renderJapaneseWithColor();
            renderTypingPreview();
            updateStats();
            return;
          }
        }
      }
    }

    // ミス
    session.misses++;
    session.taskMisses++;
    flashInputError();
    playKeySound(false);
    updateStats();
    return;
  }

  // 通常かな処理
  const patterns = getPatternsForToken(tokens, idx);

  // 完全一致チェック
  if (patterns.includes(newTyped)) {
    session.correctChars++;
    session.taskCorrectChars++;
    session.tokenIndex++;
    session.currentTyped = "";
    playKeySound(true);
    if (session.tokenIndex >= tokens.length) {
      playTaskCompleteSound();
      completeTask();
      return;
    }
    renderJapaneseWithColor();
    renderTypingPreview();
    updateStats();
    return;
  }

  // プレフィックスチェック
  if (patterns.some(p => p.startsWith(newTyped))) {
    session.currentTyped = newTyped;
    session.correctChars++;
    session.taskCorrectChars++;
    playKeySound(true);
    renderJapaneseWithColor();
    renderTypingPreview();
    updateStats();
    return;
  }

  // ミス
  session.misses++;
  session.taskMisses++;
  flashInputError();
  playKeySound(false);
  updateStats();
}

function showPenaltyFloat(minutes) {
  const el_ = el.penaltyFloat;
  if (!el_) return;
  el_.textContent = `+${minutes}分`;
  el_.classList.remove("is-active");
  void el_.offsetWidth; // reflow で animation リセット
  el_.classList.add("is-active");
}

function flashInputError() {
  // ミスのたびに時間を直接加算 + 2秒間赤表示
  if (state.session) {
    const prev = state.session.gameMinutes;
    state.session.gameMinutes += state.session.difficulty.penaltyMinutes;
    state.session.speedPenaltyUntil = performance.now() + 800;
    showPenaltyFloat(state.session.difficulty.penaltyMinutes);
    if (prev <= state.session.difficulty.endMinutes &&
        state.session.gameMinutes > state.session.difficulty.endMinutes) {
      showMilestoneFlash("残業開始...", "overtime");
      playMilestoneSound("overtime");
    }
    if (Math.floor(prev / (24 * 60)) < Math.floor(state.session.gameMinutes / (24 * 60))) {
      showMilestoneFlash("日付が変わった...", "midnight");
    }
  }
  el.typingPreview.classList.add("input-error");
  setTimeout(() => el.typingPreview.classList.remove("input-error"), 800);
  el.typingPreview.animate(
    [
      { transform: "translateX(0)"   },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)"  },
      { transform: "translateX(0)"   }
    ],
    { duration: 160, easing: "ease-out" }
  );
}

/* ===========================
   タスク完了処理
=========================== */
function completeTask() {
  const session = state.session;
  session.currentTaskIndex += 1;

  if (session.currentTaskIndex >= session.tasks.length) {
    finishGame();
    return;
  }

  renderCurrentTask();
}


/* ===========================
   リアルタイム統計更新
=========================== */
function updateStats() {
  const session = state.session;
  if (!session) return;

  const elapsedSec = Math.max((performance.now() - session.realStartAt) / 1000, 1);
  const cps        = (session.correctChars / elapsedSec).toFixed(1);
  const accuracy   = calcAccuracy(session.correctChars, session.misses);

  const tasksDone   = session.currentTaskIndex;
  const total       = session.tasks.length;
  const currentTask = session.tasks[tasksDone];
  const inTaskProg  = currentTask && session.tokens.length > 0
    ? (session.tokenIndex / session.tokens.length) / total
    : 0;
  const pct = Math.min((tasksDone / total + inTaskProg) * 100, 100);

  el.currentTime.textContent   = fmtMin(session.gameMinutes);
  el.timeLeft.textContent      = fmtRemain(session.gameMinutes, session.difficulty.endMinutes);
  el.progressFill.style.width  = `${pct}%`;


  // マイルストーン演出
  if (!session.milestone50 && pct >= 50) {
    session.milestone50 = true;
    showMilestoneFlash("折り返し！", "half");
    playMilestoneSound("half");
  }
  if (!session.milestone80 && pct >= 80) {
    session.milestone80 = true;
    showMilestoneFlash("もうすぐ退勤！", "near");
    playMilestoneSound("near");
  }

  const pctEl = document.getElementById("progress-pct");
  if (pctEl) pctEl.textContent = pct >= 1 ? `${Math.round(pct)}%` : "";
  el.cpsValue.textContent      = (Number.isFinite(+cps) ? cps : "0.0") + "回/秒";
  el.accuracyValue.textContent = `${accuracy}%`;
  el.missValue.textContent     = String(session.misses);

  const isOvertime = session.gameMinutes > session.difficulty.endMinutes;
  el.timeLeft.classList.toggle("is-overtime", isOvertime);
  el.screens.game.classList.toggle("game-overtime", isOvertime);

  const inPenalty = performance.now() < session.speedPenaltyUntil;
  const currentTimePanel = el.currentTime.closest(".stat-panel");
  if (currentTimePanel) {
    currentTimePanel.classList.toggle("penalty-panel", inPenalty);
  }
}

/* ===========================
   ゲーム終了・結果計算
=========================== */
function finishGame() {
  const session      = state.session;
  const elapsedSec   = Math.max((performance.now() - session.realStartAt) / 1000, 1);
  const cps          = parseFloat((session.correctChars / elapsedSec).toFixed(1));
  const accuracy     = calcAccuracy(session.correctChars, session.misses);
  const leaveMinutes   = session.gameMinutes;
  const endMinutes     = session.difficulty.endMinutes;
  const overtime       = Math.max(leaveMinutes - endMinutes, 0);
  const earlyMinutes   = Math.round(endMinutes - leaveMinutes); // 正=早退、負=残業
  const rank  = resolveRank(earlyMinutes, session.difficulty.id);
  const title = resolveTitle(rank, session.difficulty.id);

  const result = {
    difficultyId:    session.difficulty.id,
    difficultyName:  session.difficulty.name,
    leaveMinutes,
    overtimeMinutes: overtime,
    earlyMinutes,
    endMinutes,
    cps:      Number.isFinite(cps) ? cps : 0,
    accuracy,
    misses:   session.misses,
    rank,
    title
  };

  // 前回結果を先に読む
  const prevResult = state.records.lastResult;

  const recordStatus = storeResult(result);
  stopStatTicker();
  renderResult(result, recordStatus, prevResult);
  renderBestRecords();
  renderLastResultSummary();
  showTallyScreen(() => switchScreen("result"));
}

/* ===========================
   結果画面描画
=========================== */
function renderResult(result, recordStatus, prevResult) {
  el.resultHero.classList.remove("is-success", "is-overtime");
  el.resultHero.classList.add(result.overtimeMinutes > 0 ? "is-overtime" : "is-success");

  el.resultLeaveTime.textContent  = fmtMin(result.leaveMinutes);
  const earlyMin = result.earlyMinutes;
  el.resultStatus.textContent     = result.overtimeMinutes > 0
    ? `残業 ${fmtDuration(result.overtimeMinutes)}`
    : earlyMin > 0
      ? `${fmtDuration(earlyMin)}早退！`
      : "ちょうど定時退社！";
  if (el.resultRank)  el.resultRank.textContent = result.rank ?? "";
  el.resultTitle.textContent      = result.title;

  // ランク別カラーを rank・title に適用
  const rankColorClasses = ["rank-color-sss","rank-color-ss","rank-color-s","rank-color-a","rank-color-b","rank-color-c","rank-color-d","rank-color-e","rank-color-f"];
  const rankColorMap = { SSS:"rank-color-sss", SS:"rank-color-ss", S:"rank-color-s", A:"rank-color-a", B:"rank-color-b", C:"rank-color-c", D:"rank-color-d", E:"rank-color-e", F:"rank-color-f" };
  const rankClass = rankColorMap[result.rank] ?? "";
  [el.resultRank, el.resultTitle].forEach(el => {
    if (!el) return;
    el.classList.remove(...rankColorClasses);
    if (rankClass) el.classList.add(rankClass);
  });
  el.resultCps.textContent        = result.cps + "回/秒";
  el.resultAccuracy.textContent   = `${result.accuracy}%`;
  el.resultMisses.textContent     = String(result.misses);
  el.resultDifficulty.textContent = result.difficultyName;

  // 難易度チップ
  if (el.resultDifficultyChip) {
    el.resultDifficultyChip.textContent = result.difficultyName;
  }

  // 記録バッジ
  if (recordStatus.isBestLeave) {
    el.resultRecordBadge.textContent = "最速退勤更新!";
    el.resultRecordBadge.hidden = false;
  } else {
    el.resultRecordBadge.hidden = true;
  }

  el.resultBest.textContent = recordStatus.isBestLeave
    ? "最速退勤更新！"
    : "変化なし";

  // ランク一覧テーブルの描画
  if (el.rankTableInner) {
    const diffId = result.difficultyId;
    const thresholds = RANK_THRESHOLDS[diffId] ?? RANK_THRESHOLDS.normal;
    const titles = RANK_TITLES[diffId] ?? RANK_TITLES.normal;
    const rankColorMap2 = {
      SSS: "rank-color-sss", SS: "rank-color-ss", S: "rank-color-s",
      A: "rank-color-a", B: "rank-color-b", C: "rank-color-c",
      D: "rank-color-d", E: "rank-color-e", F: "rank-color-f"
    };
    const endMin = result.endMinutes;
    let html = `<div class="rank-table-header"><span>ランク</span><span>称号</span><span>退勤目標</span></div>`;
    RANKS.forEach((rank, i) => {
      const colorClass = rankColorMap2[rank] ?? "";
      const isCurrent = rank === result.rank;
      let timeText;
      if (i < thresholds.length) {
        timeText = fmtMin(endMin - thresholds[i]) + "以前";
      } else {
        const lastThreshold = thresholds[thresholds.length - 1];
        timeText = fmtMin(endMin - lastThreshold + 1) + "以降";
      }
      const title = titles[rank] ?? "";
      html += `<div class="rank-table-row${isCurrent ? " is-current" : ""}">` +
        `<span class="rank-table-rank-cell ${colorClass}">${rank}</span>` +
        `<span>${title}</span>` +
        `<span class="rank-table-score-cell">${timeText}</span>` +
        `</div>`;
    });
    el.rankTableInner.innerHTML = html;
  }

}


/* ===========================
   Xシェア
=========================== */
function shareResult() {
  const last = state.records.lastResult;
  if (!last) return;

  const earlyMin = (last.endMinutes || END_MINUTES) - last.leaveMinutes;
  const statusText = last.overtimeMinutes > 0
    ? `残業 ${fmtDuration(last.overtimeMinutes)}`
    : earlyMin > 0
      ? `${fmtDuration(earlyMin)}早退！`
      : "ちょうど定時退社！";

  const text = [
    "【定時退ピング】",
    `難易度：${last.difficultyName}`,
    `退勤時刻：${fmtMin(last.leaveMinutes)}　${statusText}`,
    `速度：${last.cps}回/秒　正確率：${last.accuracy}%`,
    `${last.rank ?? ""}　${last.title}`,
    "#定時退ピング #タイピングゲーム"
  ].join("\n");

  const gameUrl = window.location.origin + window.location.pathname;
  const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(gameUrl);
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ===========================
   記録保存
=========================== */
function storeResult(result) {
  const records = state.records;
  const dr      = records.byDifficulty[result.difficultyId] || {
    bestLeaveMinutes: null, bestCps: 0, bestAccuracy: 0
  };

  const isBestLeave = dr.bestLeaveMinutes === null || result.leaveMinutes < dr.bestLeaveMinutes;

  records.byDifficulty[result.difficultyId] = {
    bestLeaveMinutes: isBestLeave ? Math.floor(result.leaveMinutes) : dr.bestLeaveMinutes,
    bestCps:          Math.max(dr.bestCps,      result.cps),
    bestAccuracy:     Math.max(dr.bestAccuracy, result.accuracy)
  };
  records.lastResult = result;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (_) { /* storage full など無視 */ }

  state.records = records;
  return { isBestLeave };
}

/* ===========================
   自己ベスト表示
=========================== */
function renderBestRecords() {
  el.bestRecords.innerHTML = "";

  Object.values(DIFFICULTIES).forEach((diff) => {
    const rec  = state.records.byDifficulty[diff.id];
    const card = document.createElement("article");
    card.className = "best-record-card";

    if (!rec) {
      card.innerHTML = `<p>${diff.name}</p><strong>未プレイ</strong>`;
    } else {
      const earlyMin = Math.floor(diff.endMinutes - rec.bestLeaveMinutes);
      const timeText = earlyMin >= 0
        ? `定時より${fmtDuration(earlyMin)}早退`
        : `残業 ${fmtDuration(Math.abs(earlyMin))}`;
      card.innerHTML = `
        <p>${diff.name}</p>
        <strong>${fmtMin(rec.bestLeaveMinutes)} 退勤</strong>
        <p>${timeText}</p>
      `;
    }

    el.bestRecords.appendChild(card);
  });
}

/* ===========================
   直近結果表示
=========================== */
function renderLastResultSummary() {
  const last = state.records.lastResult;
  if (!last) {
    el.lastResultSummary.innerHTML = "<p>まだ退勤記録がありません。</p>";
    return;
  }

  const earlyMinLast = (last.endMinutes || END_MINUTES) - last.leaveMinutes;
  const statusText = last.overtimeMinutes > 0
    ? `残業 ${fmtDuration(last.overtimeMinutes)}`
    : earlyMinLast > 0
      ? `${fmtDuration(earlyMinLast)}早退`
      : "ちょうど定時退社";

  el.lastResultSummary.innerHTML = `
    <p class="summary-emphasis">${fmtMin(last.leaveMinutes)} 退勤</p>
    <p>${statusText} / ${last.difficultyName}</p>
    <p>${last.cps}回/秒 / 称号: ${last.title}</p>
  `;
}

/* ===========================
   localStorage読み込み
=========================== */
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byDifficulty: {}, lastResult: null };
    const parsed = JSON.parse(raw);
    return {
      byDifficulty: parsed.byDifficulty || {},
      lastResult:   parsed.lastResult   || null
    };
  } catch (_) {
    return { byDifficulty: {}, lastResult: null };
  }
}

/* ===========================
   ランク・称号判定
=========================== */
function resolveRank(earlyMinutes, difficultyId) {
  const thresholds = RANK_THRESHOLDS[difficultyId] ?? RANK_THRESHOLDS.normal;
  for (let i = 0; i < thresholds.length; i++) {
    if (earlyMinutes >= thresholds[i]) return RANKS[i];
  }
  return "F";
}

function resolveTitle(rank, difficultyId) {
  return RANK_TITLES[difficultyId]?.[rank] ?? "今日もなんとか退勤";
}

/* ===========================
   ユーティリティ
=========================== */
function calcAccuracy(correct, misses) {
  const total = correct + misses;
  if (total === 0) return 100;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

function fmtMin(totalMin) {
  const t = Math.floor(totalMin) % (24 * 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDuration(min) {
  const total = Math.floor(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  return `${h}時間${m}分`;
}

function fmtRemain(currentMin, endMin) {
  const remain = (endMin || END_MINUTES) - currentMin;
  if (remain >= 0) return fmtDuration(remain);
  return `残業 ${fmtDuration(Math.abs(remain))}`;
}

/* ===========================
   集計演出オーバーレイ
=========================== */
/* ===========================
   マイルストーン演出
=========================== */
function showMilestoneFlash(text, type) {
  const flash = document.getElementById("milestone-flash");
  if (!flash) return;
  flash.textContent = text;
  flash.className = `milestone-flash milestone-flash--${type}`;
  flash.offsetHeight;
  flash.classList.add("is-show");
  setTimeout(() => {
    flash.classList.remove("is-show");
  }, 1100);
}

function playMilestoneSound(type) {
  if (state.masterMuted || state.seVolume === 0) return;
  const notes = type === "half"
    ? [[523.25, 0], [659.25, 0.13]]
    : type === "overtime"
      ? [[293.66, 0], [261.63, 0.18], [246.94, 0.36]]  // 重い下降音
      : [[523.25, 0], [659.25, 0.1], [783.99, 0.2]];
  notes.forEach(([freq, offset]) => {
    const t = audioCtx.currentTime + offset;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.07 * state.seVolume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.3);
  });
}

function showTallyScreen(onDone) {
  stopBGM();
  const overlay = document.getElementById("tally-overlay");

  overlay.offsetHeight; // reflow
  overlay.classList.add("is-visible");

  setTimeout(() => {
    overlay.classList.remove("is-visible");
    setTimeout(() => {
      onDone();
    }, 260);
  }, 640);
}

function switchScreen(name) {
  state.currentScreen = name;
  Object.entries(el.screens).forEach(([key, screen]) => {
    screen.classList.toggle("active", key === name);
  });
  const isGame = name === "game";
  const footer = document.getElementById("site-footer");
  if (footer) footer.hidden = isGame;
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startStatTicker() {
  const TICK_MS = 100;
  state.statTimerId = window.setInterval(() => {
    if (state.currentScreen !== "game" || !state.session) return;
    const session = state.session;
    const prevMinutes = session.gameMinutes;
    session.gameMinutes += session.difficulty.gameSpeed * (TICK_MS / 1000);
    // 定時を超えた瞬間に「残業開始！」
    if (prevMinutes <= session.difficulty.endMinutes &&
        session.gameMinutes > session.difficulty.endMinutes) {
      showMilestoneFlash("残業開始...", "overtime");
      playMilestoneSound("overtime");
    }
    // 24時を超えた瞬間に「日付が変わった...」
    if (Math.floor(prevMinutes / (24 * 60)) < Math.floor(session.gameMinutes / (24 * 60))) {
      showMilestoneFlash("日付が変わった...", "midnight");
    }
    updateStats();
  }, TICK_MS);
}

function stopStatTicker() {
  if (state.statTimerId !== null) {
    window.clearInterval(state.statTimerId);
    state.statTimerId = null;
  }
}

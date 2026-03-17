/* ===========================
   定時退ピング - ゲームスクリプト
=========================== */

const STORAGE_KEY = "teijitaiping_records_v1";
const START_MINUTES = 8 * 60 + 30;   // 08:30
const END_MINUTES   = 17 * 60 + 30;  // 17:30

/* ===========================
   かなマップ（ローマ字パターン）
=========================== */
const KANA_MAP = new Map([
  // 基本五十音
  ["あ", ["a"]], ["い", ["i"]], ["う", ["u"]], ["え", ["e"]], ["お", ["o"]],
  ["か", ["ka"]], ["き", ["ki"]], ["く", ["ku"]], ["け", ["ke"]], ["こ", ["ko"]],
  ["さ", ["sa"]], ["し", ["si", "shi"]], ["す", ["su"]], ["せ", ["se"]], ["そ", ["so"]],
  ["た", ["ta"]], ["ち", ["chi", "ti"]], ["つ", ["tu", "tsu"]], ["て", ["te"]], ["と", ["to"]],
  ["な", ["na"]], ["に", ["ni"]], ["ぬ", ["nu"]], ["ね", ["ne"]], ["の", ["no"]],
  ["は", ["ha"]], ["ひ", ["hi"]], ["ふ", ["fu", "hu"]], ["へ", ["he"]], ["ほ", ["ho"]],
  ["ま", ["ma"]], ["み", ["mi"]], ["む", ["mu"]], ["め", ["me"]], ["も", ["mo"]],
  ["や", ["ya"]], ["ゆ", ["yu"]], ["よ", ["yo"]],
  ["ら", ["ra"]], ["り", ["ri"]], ["る", ["ru"]], ["れ", ["re"]], ["ろ", ["ro"]],
  ["わ", ["wa"]], ["ゐ", ["wi"]], ["ゑ", ["we"]], ["を", ["wo"]],
  ["ん", ["nn", "n"]],

  // 濁音
  ["が", ["ga"]], ["ぎ", ["gi"]], ["ぐ", ["gu"]], ["げ", ["ge"]], ["ご", ["go"]],
  ["ざ", ["za"]], ["じ", ["ji", "zi"]], ["ず", ["zu"]], ["ぜ", ["ze"]], ["ぞ", ["zo"]],
  ["だ", ["da"]], ["ぢ", ["di"]], ["づ", ["du"]], ["で", ["de"]], ["ど", ["do"]],
  ["ば", ["ba"]], ["び", ["bi"]], ["ぶ", ["bu"]], ["べ", ["be"]], ["ぼ", ["bo"]],

  // 半濁音
  ["ぱ", ["pa"]], ["ぴ", ["pi"]], ["ぷ", ["pu"]], ["ぺ", ["pe"]], ["ぽ", ["po"]],

  // 小文字単独
  ["ぁ", ["xa", "la"]], ["ぃ", ["xi", "li"]], ["ぅ", ["xu", "lu"]], ["ぇ", ["xe", "le"]], ["ぉ", ["xo", "lo"]],
  ["ゃ", ["xya", "lya"]], ["ゅ", ["xyu", "lyu"]], ["ょ", ["xyo", "lyo"]],
  ["っ", ["xtu", "ltu", "xtsu", "ltsu"]],

  // きゃ行
  ["きゃ", ["kya"]], ["きゅ", ["kyu"]], ["きょ", ["kyo"]],
  ["ぎゃ", ["gya"]], ["ぎゅ", ["gyu"]], ["ぎょ", ["gyo"]],

  // しゃ行
  ["しゃ", ["sha", "sya"]], ["しゅ", ["shu", "syu"]], ["しょ", ["sho", "syo"]],
  ["じゃ", ["ja", "jya", "zya"]], ["じゅ", ["ju", "jyu", "zyu"]], ["じょ", ["jo", "jyo", "zyo"]],

  // ちゃ行
  ["ちゃ", ["cha", "tya"]], ["ちゅ", ["tyu", "chu"]], ["ちょ", ["tyo", "cho"]],

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
    multiplier: 1.0,
    eventRate: 0.15,
    taskCount: 6,
    timePressure: 0.90,
    eventPenaltyScale: 0.9,
    startMinutes: 10 * 60,        // 10:00
    endMinutes:   19 * 60         // 19:00
  },
  normal: {
    id: "normal",
    name: "ふつう企業",
    multiplier: 1.3,
    eventRate: 0.30,
    taskCount: 7,
    timePressure: 1.0,
    eventPenaltyScale: 1.05,
    startMinutes: 9 * 60,         // 09:00
    endMinutes:   18 * 60         // 18:00
  },
  black: {
    id: "black",
    name: "ブラック企業",
    multiplier: 1.8,
    eventRate: 0.50,
    taskCount: 8,
    timePressure: 1.12,
    eventPenaltyScale: 1.18,
    startMinutes: 7 * 60 + 30,    // 07:30
    endMinutes:   22 * 60         // 22:00
  }
};

/* ===========================
   タスクプール（jp フィールドのみ）
=========================== */
const TASK_POOL = [
  {
    id: "commute",
    name: "通勤",
    baseMinutes: 20,
    type: "commute",
    eventEligible: false,
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
    eventEligible: true,
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
    eventEligible: true,
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
    eventEligible: true,
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
    eventEligible: true,
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
    eventEligible: true,
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
    eventEligible: true,
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
    eventEligible: true,
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
   ランダムイベント
=========================== */
const EVENTS = [
  { message: "上司「ちょっといい？」 — 会話で 7 分消費。",         minutes: 7,  tag: "boss" },
  { message: "緊急会議が追加されました。12 分消費。",               minutes: 12, tag: "meeting" },
  { message: "修正版お願いします。差し戻しで 9 分消費。",           minutes: 9,  tag: "revision" },
  { message: "誤字が見つかりました。再送対応で 6 分消費。",         minutes: 6,  tag: "revision" },
  { message: "本日中対応の依頼が飛んできました。10 分消費。",       minutes: 10, tag: "rush" },
  { message: "昼休憩が 5 分短縮されました。",                       minutes: 5,  tag: "lunch" },
  { message: "仕様変更が入りました。調整対応で 11 分消費。",        minutes: 11, tag: "spec" }
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
        { text: "会議の時間をご共有します",       reading: "かいぎのじかんをきょうゆうします",     lengthType: "medium" },
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
        { text: "今日中です",         reading: "きょうちゅうです",   lengthType: "short" }
      ],
      medium: [
        { text: "明日の朝一でお願いします",   reading: "あしたのあさいちでおねがいします",   lengthType: "medium" },
        { text: "先方がかなり急いでいます",   reading: "せんぽうがかなりいそいでいます",     lengthType: "medium" },
        { text: "この件最優先でお願いします", reading: "このけんさいゆうせんでおねがいします", lengthType: "medium" },
        { text: "今日中対応で確定しました",   reading: "きょうちゅうたいおうでかくていしました", lengthType: "medium" },
        { text: "先に修正版を出してください", reading: "さきにしゅうせいばんをだしてください", lengthType: "medium" }
      ],
      long: [
        { text: "先方が待てないと言っているので今すぐ再送してください",       reading: "せんぽうがまてないといっているのでいますぐさいそうしてください",         lengthType: "long" },
        { text: "今日中対応が前提なので他の作業は後回しにしてください",       reading: "きょうちゅうたいおうがぜんていなのでほかのさぎょうはあとまわしにしてください", lengthType: "long" }
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
        { text: "今日中に絶対終わらせてください",     reading: "きょうちゅうにぜったいおわらせてください", lengthType: "medium" },
        { text: "緊急で会議が入りました",             reading: "きんきゅうでかいぎがはいりました",         lengthType: "medium" },
        { text: "上司がちょっと来いと言っています",   reading: "じょうしがちょっとこいといっています",     lengthType: "medium" },
        { text: "いつまで待たせれば気が済むんですか", reading: "いつまでまたせればきがすむんですか",       lengthType: "medium" },
        { text: "とりあえず先にこれ出して",           reading: "とりあえずさきにこれだして",               lengthType: "medium" },
        { text: "まだ共有されてないんですか",         reading: "まだきょうゆうされてないんですか",         lengthType: "medium" }
      ],
      long: [
        { text: "先ほど送った資料に厳しい指摘が入りました",         reading: "さきほどそうしんしたしりょうにきびしいしてきがはいりました",     lengthType: "long" },
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
  black:  ["medium","medium","long","medium","long","medium","long","long"]
};

/* ===========================
   場面マップ（タスクインデックス → early / middle / late）
   white: 6タスク / normal: 7タスク / black: 8タスク
=========================== */
const SCENE_MAP = {
  white:  ["early","early","middle","middle","late","late"],
  normal: ["early","early","middle","middle","middle","late","late"],
  black:  ["early","early","middle","middle","middle","late","late","late"]
};

/* ===========================
   ランク・称号定義
   ※ RANK_THRESHOLDS は仮設定。今後プレイ結果に応じて閾値調整予定
=========================== */
const RANKS = ["SSS", "SS", "S", "A", "B", "C", "D", "E", "F"];

const RANK_THRESHOLDS = {
  white:  [9000, 8200, 7400, 6600, 5800, 5000, 4200, 3400],
  normal: [9500, 8700, 7900, 7100, 6300, 5500, 4700, 3900],
  black:  [10000, 9200, 8400, 7600, 6800, 6000, 5200, 4400]
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
  soundEnabled: true
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
  progressText:         document.getElementById("progress-text"),
  progressFill:         document.getElementById("progress-fill"),
  taskName:             document.getElementById("task-name"),
  promptJapanese:       document.getElementById("prompt-japanese"),
  typingPreview:        document.getElementById("typing-preview"),
  wpmValue:             document.getElementById("wpm-value"),
  accuracyValue:        document.getElementById("accuracy-value"),
  missValue:            document.getElementById("miss-value"),
  eventMessage:         document.getElementById("event-message"),
  gameTip:              document.getElementById("game-tip"),
  resultLeaveTime:      document.getElementById("result-leave-time"),
  resultStatus:         document.getElementById("result-status"),
  resultRank:           document.getElementById("result-rank"),
  resultTitle:          document.getElementById("result-title"),
  resultScore:          document.getElementById("result-score"),
  resultWpm:            document.getElementById("result-wpm"),
  resultAccuracy:       document.getElementById("result-accuracy"),
  resultMisses:         document.getElementById("result-misses"),
  resultDifficulty:     document.getElementById("result-difficulty"),
  resultBest:           document.getElementById("result-best"),
  resultHero:           document.getElementById("result-hero"),
  heroShareBtn:         document.getElementById("hero-share-btn"),
  resultDifficultyChip: document.getElementById("result-difficulty-chip"),
  resultRecordBadge:    document.getElementById("result-record-badge"),
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
  soundToggle:          document.getElementById("sound-toggle"),
  mobileWarning:        document.getElementById("mobile-warning"),
  mobileWarningDismiss: document.getElementById("mobile-warning-dismiss")
};

/* ===========================
   サウンド（Web Audio API）
=========================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playKeySound(isCorrect) {
  if (!state.soundEnabled) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (isCorrect) {
    osc.type      = "square";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } else {
    osc.type      = "sawtooth";
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }
}

function playTaskCompleteSound() {
  if (!state.soundEnabled) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "triangle";
    const t = audioCtx.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.18);
  });
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
    hideHeaderClock();
    switchScreen("title");
    renderBestRecords();
    renderLastResultSummary();
  });
  document.getElementById("game-retry-btn").addEventListener("click", () => {
    stopStatTicker();
    goToDifficulty();
  });

  // ゲーム画面クリック時にフォーカスを body に戻す（input要素への誤フォーカス防止）
  document.getElementById("game-screen").addEventListener("click", () => {
    document.activeElement?.blur();
  });

  // 結果画面ボタン
  el.heroShareBtn.addEventListener("click", shareResult);
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
  el.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    el.soundToggle.textContent = state.soundEnabled ? "ON" : "OFF";
    el.soundToggle.dataset.on = String(state.soundEnabled);
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
  // ============================================================
  // ゲーム画面の入力処理（IME完全ブロック方式）
  // keydown は IME が文字を受け取る前に発火するため、
  // ここで preventDefault() を呼ぶことで IME への入力を防ぐ。
  // ============================================================
  if (state.currentScreen === "game" && state.session) {
    // IME が既に変換中の場合はブロックして無視
    if (e.isComposing || e.key === "Process") {
      e.preventDefault();
      return;
    }

    // アルファベット入力
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      processChar(e.key.toLowerCase());
      return;
    }

    // Backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      if (state.session.currentTyped.length > 0) {
        state.session.currentTyped = state.session.currentTyped.slice(0, -1);
        renderJapaneseWithColor();
        renderTypingPreview();
      }
      return;
    }

    // Tab / Space はゲーム中ブロック
    if (e.key === "Tab" || e.code === "Space") {
      e.preventDefault();
      return;
    }

    return;
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

function openModal()  { el.modal.hidden = false; }
function closeModal() { el.modal.hidden = true; }

function openSettingsModal() {
  el.soundToggle.textContent  = state.soundEnabled ? "ON" : "OFF";
  el.soundToggle.dataset.on   = String(state.soundEnabled);
  el.settingsModal.hidden = false;
}
function closeSettingsModal() { el.settingsModal.hidden = true; }

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
    eventCount:     0,
    eventLog:       [],
    taskStartedAt:  now,
    taskCorrectChars: 0,
    taskMisses:       0
  };

  switchScreen("game");
  // フォーカスを外して IME が介入できる要素をなくす
  document.activeElement?.blur();
  el.eventMessage.textContent = "静かな一日が始まりました。";

  if (el.gameTip) {
    el.gameTip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  renderCurrentTask();
  updateStats();
  startStatTicker();
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
    // text に漢字が含まれる場合は ruby 付き表示、ひらがなのみなら plain
    const hasKanji = msg.text !== msg.reading;
    const prompt = {
      jp:    msg.reading,
      parts: hasKanji ? [[msg.text, msg.reading]] : [[msg.text]]
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
  session.minutesPerToken = (task.baseMinutes * session.difficulty.timePressure) / Math.max(session.tokens.length, 1);
  session.tokenMinutesUsed = 0;

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
      const ruby = document.createElement("ruby");
      if (segEnd <= doneEnd)            ruby.className = "kana-done";
      else if (segStart >= currentEnd)  ruby.className = "kana-pending";
      else                              ruby.className = "kana-current";
      ruby.appendChild(document.createTextNode(text));
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
    if (pos < doneEnd)         span.className = "kana-done";
    else if (pos < currentEnd) span.className = "kana-current";
    else                       span.className = "kana-pending";
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
      session.gameMinutes += session.minutesPerToken;
      session.tokenMinutesUsed += session.minutesPerToken;
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
    const validPatterns = getNPatterns(tokens, idx);
    // 完全一致チェック
    if (validPatterns.includes(newTyped)) {
      session.correctChars++;
      session.taskCorrectChars++;
      session.tokenIndex++;
      session.currentTyped = "";
      session.gameMinutes += session.minutesPerToken;
      session.tokenMinutesUsed += session.minutesPerToken;
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
    if (validPatterns.some(p => p.startsWith(newTyped))) {
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
      session.gameMinutes += session.minutesPerToken;
      session.tokenMinutesUsed += session.minutesPerToken;
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
            session.gameMinutes += session.minutesPerToken;
            session.tokenMinutesUsed += session.minutesPerToken;
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
    session.gameMinutes += session.minutesPerToken;
    session.tokenMinutesUsed += session.minutesPerToken;
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

function flashInputError() {
  el.typingPreview.classList.add("input-error");
  setTimeout(() => el.typingPreview.classList.remove("input-error"), 200);
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
  const session       = state.session;
  const task          = session.tasks[session.currentTaskIndex];
  const elapsedSec    = Math.max((performance.now() - session.taskStartedAt) / 1000, 1);

  // タスクの文字数（かなトークン数をベースに計算）
  const charCount     = session.tokens.length;
  const taskWpm       = (charCount / 5) / (elapsedSec / 60);
  const taskAccuracy  = calcAccuracy(session.taskCorrectChars, session.taskMisses);

  const eventResult   = maybeTriggerEvent(task, session.difficulty);
  const speedBonus    = clamp(Math.round((taskWpm - 40) * 0.12), 0, 18);
  const accBonus      = taskAccuracy >= 97 ? 7 : taskAccuracy >= 93 ? 4 : 0;
  const missPenalty   = Math.round(Math.max(session.taskMisses * 0.75, 0));

  let spent =
    Math.round(task.baseMinutes * session.difficulty.timePressure) +
    eventResult.minutes +
    missPenalty -
    speedBonus -
    accBonus;

  const minSpent = Math.max(Math.round(task.baseMinutes * 0.45), 6);
  spent = Math.max(spent, minSpent);

  session.gameMinutes -= session.tokenMinutesUsed;
  session.gameMinutes      += spent;
  session.currentTaskIndex += 1;

  const log = eventResult.message
    ? `${task.name} 完了。${spent}分消費。正確率${taskAccuracy}%。${eventResult.message}`
    : `${task.name} 完了。${spent}分で片付きました。正確率${taskAccuracy}%。`;

  el.eventMessage.textContent = log;

  if (session.currentTaskIndex >= session.tasks.length) {
    finishGame();
    return;
  }

  renderCurrentTask();
}

/* ===========================
   ランダムイベント
=========================== */
function maybeTriggerEvent(task, difficulty) {
  if (!task.eventEligible || Math.random() > difficulty.eventRate) {
    return { minutes: 0, message: "" };
  }

  const ev      = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const minutes = Math.round(ev.minutes * difficulty.eventPenaltyScale);

  state.session.eventCount++;
  state.session.eventLog.push(ev.tag);

  return { minutes, message: ev.message };
}

/* ===========================
   リアルタイム統計更新
=========================== */
function updateStats() {
  const session = state.session;
  if (!session) return;

  const elapsedMin = Math.max((performance.now() - session.realStartAt) / 60000, 1 / 60);
  const wpm        = Math.round((session.correctChars / 5) / elapsedMin);
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
  el.progressText.textContent  = `${Math.min(tasksDone + 1, total)} / ${total}`;
  el.progressFill.style.width  = `${pct}%`;
  el.wpmValue.textContent      = String(Number.isFinite(wpm) ? wpm : 0);
  el.accuracyValue.textContent = `${accuracy}%`;
  el.missValue.textContent     = String(session.misses);

  const timePanel = el.timeLeft.closest(".stat-panel");
  if (timePanel) {
    timePanel.classList.toggle("warn-panel",     session.gameMinutes <= session.difficulty.endMinutes);
    timePanel.classList.toggle("overtime-panel", session.gameMinutes > session.difficulty.endMinutes);
  }
}

/* ===========================
   ゲーム終了・結果計算
=========================== */
function finishGame() {
  const session      = state.session;
  const elapsedMin   = Math.max((performance.now() - session.realStartAt) / 60000, 1 / 60);
  const wpm          = Math.round((session.correctChars / 5) / elapsedMin);
  const accuracy     = calcAccuracy(session.correctChars, session.misses);
  const leaveMinutes = session.gameMinutes;
  const endMinutes   = session.difficulty.endMinutes;
  const overtime     = Math.max(leaveMinutes - endMinutes, 0);
  const baseScore    = session.correctChars * (accuracy / 100);
  const score        = Math.max(
    Math.round(baseScore * session.difficulty.multiplier * 100 - overtime * 20),
    0
  );
  const rank  = resolveRank(score, session.difficulty.id);
  const title = resolveTitle(rank, session.difficulty.id);

  const result = {
    difficultyId:    session.difficulty.id,
    difficultyName:  session.difficulty.name,
    leaveMinutes,
    overtimeMinutes: overtime,
    endMinutes,
    score,
    wpm:      Number.isFinite(wpm) ? wpm : 0,
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
  switchScreen("result");
}

/* ===========================
   結果画面描画
=========================== */
function renderResult(result, recordStatus, prevResult) {
  el.resultHero.classList.remove("is-success", "is-overtime");
  el.resultHero.classList.add(result.overtimeMinutes > 0 ? "is-overtime" : "is-success");

  el.resultLeaveTime.textContent  = fmtMin(result.leaveMinutes);
  const earlyMin = (result.endMinutes || END_MINUTES) - result.leaveMinutes;
  el.resultStatus.textContent     = result.overtimeMinutes > 0
    ? `残業 ${fmtDuration(result.overtimeMinutes)}`
    : earlyMin > 0
      ? `定時より ${fmtDuration(earlyMin)}早く退社！`
      : "ちょうど定時退社！";
  if (el.resultRank)  el.resultRank.textContent = result.rank ?? "";
  el.resultTitle.textContent      = result.title;
  el.resultScore.textContent      = result.score.toLocaleString("ja-JP");
  el.resultWpm.textContent        = String(result.wpm);
  el.resultAccuracy.textContent   = `${result.accuracy}%`;
  el.resultMisses.textContent     = String(result.misses);
  el.resultDifficulty.textContent = result.difficultyName;

  // 難易度チップ
  if (el.resultDifficultyChip) {
    el.resultDifficultyChip.textContent = result.difficultyName;
  }

  // 記録バッジ
  if (recordStatus.isBestScore) {
    el.resultRecordBadge.textContent = "NEW RECORD!";
    el.resultRecordBadge.hidden = false;
  } else if (recordStatus.isBestLeave) {
    el.resultRecordBadge.textContent = "最速退勤更新!";
    el.resultRecordBadge.hidden = false;
  } else {
    el.resultRecordBadge.hidden = true;
  }

  el.resultBest.textContent = recordStatus.isBestScore
    ? "スコア更新！"
    : recordStatus.isBestLeave
      ? "最速退勤更新！"
      : "変化なし";

}

/* ===========================
   シェアテキスト構築
=========================== */
function buildShareText(result) {
  const earlyMinShare = (result.endMinutes || END_MINUTES) - result.leaveMinutes;
  const statusText = result.overtimeMinutes > 0
    ? `残業 ${fmtDuration(result.overtimeMinutes)}`
    : earlyMinShare > 0
      ? `定時より ${fmtDuration(earlyMinShare)}早く退社！`
      : "ちょうど定時退社！";

  return [
    "【定時退ピング】",
    `難易度：${result.difficultyName}`,
    `退勤時刻：${fmtMin(result.leaveMinutes)}　${statusText}`,
    `スコア：${result.score.toLocaleString("ja-JP")}　WPM：${result.wpm}　正確率：${result.accuracy}%`,
    `${result.rank ?? ""}　${result.title}`,
    "#定時退ピング #タイピングゲーム"
  ].join("\n");
}

/* ===========================
   シェア（Web Share API / Twitter フォールバック）
=========================== */
async function shareResult() {
  const last = state.records.lastResult;
  if (!last) return;
  const text = buildShareText(last);
  const gameUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = new URL("https://twitter.com/intent/tweet");
  shareUrl.searchParams.set("text", text);
  shareUrl.searchParams.set("url", gameUrl);

  // PC は Intent を即時に開き、モバイルだけ Web Share を優先する
  const canWebShare =
    navigator.share &&
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) &&
    window.isSecureContext &&
    window.location.protocol !== "file:";

  if (canWebShare) {
    try {
      await navigator.share({ title: "定時退ピング", text, url: gameUrl });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // ユーザーがキャンセル
    }
  }

  const popup = window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.href = shareUrl.toString();
  }
}

/* ===========================
   記録保存
=========================== */
function storeResult(result) {
  const records = state.records;
  const dr      = records.byDifficulty[result.difficultyId] || {
    bestScore: 0, bestLeaveMinutes: null, bestWpm: 0, bestAccuracy: 0
  };

  const isBestScore = result.score > dr.bestScore;
  const isBestLeave = dr.bestLeaveMinutes === null || result.leaveMinutes < dr.bestLeaveMinutes;

  records.byDifficulty[result.difficultyId] = {
    bestScore:        Math.max(dr.bestScore,    result.score),
    bestLeaveMinutes: isBestLeave ? result.leaveMinutes : dr.bestLeaveMinutes,
    bestWpm:          Math.max(dr.bestWpm,      result.wpm),
    bestAccuracy:     Math.max(dr.bestAccuracy, result.accuracy)
  };
  records.lastResult = result;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (_) { /* storage full など無視 */ }

  state.records = records;
  return { isBestScore, isBestLeave };
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
      card.innerHTML = `
        <p>${diff.name}</p>
        <strong>${rec.bestScore.toLocaleString("ja-JP")} 点</strong>
        <p>最速 ${fmtMin(rec.bestLeaveMinutes)}</p>
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
      ? `定時より ${fmtDuration(earlyMinLast)}早退`
      : "ちょうど定時退社";

  el.lastResultSummary.innerHTML = `
    <p class="summary-emphasis">${fmtMin(last.leaveMinutes)} 退勤</p>
    <p>${statusText} / ${last.difficultyName}</p>
    <p>スコア ${last.score.toLocaleString("ja-JP")} / WPM ${last.wpm}</p>
    <p>称号: ${last.title}</p>
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
function resolveRank(score, difficultyId) {
  const thresholds = RANK_THRESHOLDS[difficultyId] ?? RANK_THRESHOLDS.normal;
  for (let i = 0; i < thresholds.length; i++) {
    if (score >= thresholds[i]) return RANKS[i];
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
  const t = Math.floor(totalMin);
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

function switchScreen(name) {
  state.currentScreen = name;
  Object.entries(el.screens).forEach(([key, screen]) => {
    screen.classList.toggle("active", key === name);
  });
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
  state.statTimerId = window.setInterval(() => {
    if (state.currentScreen === "game" && state.session) updateStats();
  }, 250);
}

function stopStatTicker() {
  if (state.statTimerId !== null) {
    window.clearInterval(state.statTimerId);
    state.statTimerId = null;
  }
}

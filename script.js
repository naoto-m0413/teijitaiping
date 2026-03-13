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
  ["さ", ["sa"]], ["し", ["shi", "si"]], ["す", ["su"]], ["せ", ["se"]], ["そ", ["so"]],
  ["た", ["ta"]], ["ち", ["chi", "ti"]], ["つ", ["tsu", "tu"]], ["て", ["te"]], ["と", ["to"]],
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
  ["ちゃ", ["cha", "tya"]], ["ちゅ", ["chu", "tyu"]], ["ちょ", ["cho", "tyo"]],

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
  // 次のトークンのパターンが全て a/i/u/e/o/n/y で始まる場合 → nn のみ
  const nextIdx = idx + 1;
  if (nextIdx < tokens.length) {
    const nextPatterns = getPatternsForToken(tokens, nextIdx);
    const allVowelOrNY = nextPatterns.every(p => /^[aiueonny]/.test(p));
    if (allVowelOrNY) {
      return ["nn"];
    }
  }
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
    eventPenaltyScale: 0.9
  },
  normal: {
    id: "normal",
    name: "ふつう企業",
    multiplier: 1.3,
    eventRate: 0.30,
    taskCount: 7,
    timePressure: 1.0,
    eventPenaltyScale: 1.05
  },
  black: {
    id: "black",
    name: "ブラック企業",
    multiplier: 1.8,
    eventRate: 0.50,
    taskCount: 8,
    timePressure: 1.12,
    eventPenaltyScale: 1.18
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
      { jp: "ほんじつもよろしくおねがいします" },
      { jp: "しゅっしゃしましたじゅんじたいおうします" }
    ]
  },
  {
    id: "morning-standup",
    name: "朝会",
    baseMinutes: 36,
    type: "meeting",
    eventEligible: true,
    prompts: [
      { jp: "ほんじつのしんちょくをきょうゆうします" },
      { jp: "ゆうせんどのたかいあんけんからちゃくしゅします" }
    ]
  },
  {
    id: "mail-reply",
    name: "メール返信",
    baseMinutes: 54,
    type: "mail",
    eventEligible: true,
    prompts: [
      { jp: "おせわになっております" },
      { jp: "さきほどのけんしゅうせいはんをおおくりします" },
      { jp: "ねんのためさいどごかくにんください" }
    ]
  },
  {
    id: "meeting",
    name: "会議",
    baseMinutes: 68,
    type: "meeting",
    eventEligible: true,
    prompts: [
      { jp: "かいぎしつがへんこうになりました" },
      { jp: "いったんこのほうこうですすめます" },
      { jp: "ほんじつのかいぎしりょうをきょうゆうします" }
    ]
  },
  {
    id: "before-lunch",
    name: "昼休憩前の作業",
    baseMinutes: 50,
    type: "document",
    eventEligible: true,
    prompts: [
      { jp: "こちらにんしきそごがありました" },
      { jp: "すうじだけさしかえてさいそうします" },
      { jp: "しきゅうかくにんおねがいします" }
    ]
  },
  {
    id: "doc-fix",
    name: "資料修正",
    baseMinutes: 64,
    type: "document",
    eventEligible: true,
    prompts: [
      { jp: "しようへんこうのないようをはんえいします" },
      { jp: "しゅうせいはんをごかくにんいただけますか" },
      { jp: "さきほどのけんしゅうせいはんをおおくりします" }
    ]
  },
  {
    id: "boss-request",
    name: "上司からの依頼",
    baseMinutes: 72,
    type: "request",
    eventEligible: true,
    prompts: [
      { jp: "すみませんほんじつちゅうにたいおうおねがいします" },
      { jp: "ちょっといいですか" },
      { jp: "ほんけんせんぽうへれんけいかんりょうしました" }
    ]
  },
  {
    id: "final-task",
    name: "最終タスク",
    baseMinutes: 80,
    type: "final",
    eventEligible: true,
    prompts: [
      { jp: "きょうもいちにちおつかれさまでした" },
      { jp: "ほんじつのぎょうむをかんりょうします" },
      { jp: "おさきにしつれいいたします" }
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
   グローバル状態
=========================== */
const state = {
  selectedDifficulty: "white",
  currentScreen: "title",
  session: null,
  records: loadRecords(),
  statTimerId: null
};

/* ===========================
   DOM参照
=========================== */
const el = {
  screens: {
    title:  document.getElementById("title-screen"),
    ready:  document.getElementById("ready-screen"),
    game:   document.getElementById("game-screen"),
    result: document.getElementById("result-screen")
  },
  difficultyCards:      [...document.querySelectorAll(".difficulty-card")],
  startButton:          document.getElementById("start-button"),
  readyDifficultyName:  document.getElementById("ready-difficulty-name"),
  readyStartBtn:        document.getElementById("ready-start-btn"),
  readyBackBtn:         document.getElementById("ready-back-btn"),
  bestRecords:          document.getElementById("best-records"),
  lastResultSummary:    document.getElementById("last-result-summary"),
  currentTime:          document.getElementById("current-time"),
  timeLeft:             document.getElementById("time-left"),
  progressText:         document.getElementById("progress-text"),
  progressFill:         document.getElementById("progress-fill"),
  taskName:             document.getElementById("task-name"),
  difficultyChip:       document.getElementById("difficulty-chip"),
  promptJapanese:       document.getElementById("prompt-japanese"),
  typingPreview:        document.getElementById("typing-preview"),
  typingInput:          document.getElementById("typing-input"),
  wpmValue:             document.getElementById("wpm-value"),
  accuracyValue:        document.getElementById("accuracy-value"),
  missValue:            document.getElementById("miss-value"),
  eventMessage:         document.getElementById("event-message"),
  gameTip:              document.getElementById("game-tip"),
  resultLeaveTime:      document.getElementById("result-leave-time"),
  resultStatus:         document.getElementById("result-status"),
  resultTitle:          document.getElementById("result-title"),
  resultScore:          document.getElementById("result-score"),
  resultWpm:            document.getElementById("result-wpm"),
  resultAccuracy:       document.getElementById("result-accuracy"),
  resultMisses:         document.getElementById("result-misses"),
  resultDifficulty:     document.getElementById("result-difficulty"),
  resultBest:           document.getElementById("result-best"),
  resultHero:           document.getElementById("result-hero"),
  resultDifficultyChip: document.getElementById("result-difficulty-chip"),
  resultRecordBadge:    document.getElementById("result-record-badge"),
  resultCompare:        document.getElementById("result-compare"),
  shareTextBox:         document.getElementById("share-text-box"),
  copyTextButton:       document.getElementById("copy-text-button"),
  shareButton:          document.getElementById("share-button"),
  retryButton:          document.getElementById("retry-button"),
  backButton:           document.getElementById("back-button"),
  modal:                document.getElementById("how-to-play-modal"),
  modalCloseBtn:        document.getElementById("modal-close-btn"),
  modalOkBtn:           document.getElementById("modal-ok-btn"),
  mobileWarning:        document.getElementById("mobile-warning"),
  mobileWarningDismiss: document.getElementById("mobile-warning-dismiss")
};

/* ===========================
   サウンド（Web Audio API）
=========================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playKeySound(isCorrect) {
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
    });
  });

  // スタートボタン → 準備画面へ
  el.startButton.addEventListener("click", goToReady);

  // 準備画面
  el.readyStartBtn.addEventListener("click", startGame);
  el.readyBackBtn.addEventListener("click", () => switchScreen("title"));

  // タイピング入力
  el.typingInput.addEventListener("beforeinput", handleBeforeInput);
  el.typingInput.addEventListener("keydown",     handleTypingKeyDown);
  el.typingInput.addEventListener("paste",       (e) => e.preventDefault());

  // 結果画面ボタン
  el.copyTextButton.addEventListener("click", copyShareText);
  el.shareButton.addEventListener("click", shareResult);
  el.retryButton.addEventListener("click", goToReady);
  el.backButton.addEventListener("click", () => {
    stopStatTicker();
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

  // モバイル警告 閉じる
  el.mobileWarningDismiss.addEventListener("click", () => {
    el.mobileWarning.hidden = true;
  });
}

function handleGlobalKeyDown(e) {
  // Escape キー処理
  if (e.key === "Escape") {
    if (!el.modal.hidden) {
      closeModal();
      return;
    }
    if (state.currentScreen === "game" || state.currentScreen === "ready") {
      e.preventDefault();
      stopStatTicker();
      switchScreen("title");
      renderBestRecords();
      renderLastResultSummary();
      return;
    }
    if (state.currentScreen === "result") {
      e.preventDefault();
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
      goToReady();
      return;
    }
    if (state.currentScreen === "ready") {
      e.preventDefault();
      startGame();
      return;
    }
    if (state.currentScreen === "game") {
      // ゲーム中はスペースのスクロールを防ぐ（入力自体はbeforeinputで処理）
      // フォーカスがinputにある場合は通常入力として処理
      if (document.activeElement !== el.typingInput) {
        e.preventDefault();
      }
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

/* ===========================
   難易度表示更新
=========================== */
function updateDifficultySelection() {
  el.difficultyCards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.difficulty === state.selectedDifficulty);
  });
}

/* ===========================
   準備画面へ
=========================== */
function goToReady() {
  stopStatTicker();
  closeModal();
  const difficulty = DIFFICULTIES[state.selectedDifficulty];
  el.readyDifficultyName.textContent = difficulty.name;
  switchScreen("ready");
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
    gameMinutes:    START_MINUTES,
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
  el.typingInput.value = "";
  el.typingInput.focus();
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
function buildTaskList(difficulty) {
  const commuteTask = TASK_POOL.find((t) => t.id === "commute");
  const finalTask   = TASK_POOL.find((t) => t.id === "final-task");
  const middle      = shuffleArray(
    TASK_POOL.filter((t) => t.id !== "commute" && t.id !== "final-task")
  );
  const chosen = [commuteTask, ...middle.slice(0, difficulty.taskCount - 2), finalTask];

  return chosen.map((task) => {
    const prompt = task.prompts[Math.floor(Math.random() * task.prompts.length)];
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

  el.typingInput.value = "";
  el.taskName.textContent       = task.name;
  el.difficultyChip.textContent = session.difficulty.name;

  renderJapaneseWithColor();
  renderTypingPreview();
  updateStats();
}

/* ===========================
   日本語テキストのかなカラーコーディング
=========================== */
function renderJapaneseWithColor() {
  const session = state.session;
  const tokens  = session.tokens;
  const idx     = session.tokenIndex;

  el.promptJapanese.innerHTML = "";

  let ti = 0;
  for (const token of tokens) {
    const span = document.createElement("span");
    span.textContent = token;
    if (ti < idx) {
      span.className = "kana-done";
    } else if (ti === idx) {
      span.className = "kana-current";
    } else {
      span.className = "kana-pending";
    }
    el.promptJapanese.appendChild(span);
    ti++;
  }
}

/* ===========================
   ローマ字ヒント表示
=========================== */
function renderRomajiHint() {
  const session = state.session;
  const tokens  = session.tokens;
  const idx     = session.tokenIndex;
  const typed   = session.currentTyped;

  el.promptRomaji.innerHTML = "";

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    let patterns;
    if (token === "ん") {
      patterns = getNPatterns(tokens, ti);
    } else {
      patterns = getPatternsForToken(tokens, ti);
    }
    const canonical = patterns[0]; // 表示用は最初のパターン

    if (ti < idx) {
      // 入力済み：グレー
      const span = document.createElement("span");
      span.textContent = canonical;
      span.style.color = "#a0a080";
      el.promptRomaji.appendChild(span);
    } else if (ti === idx) {
      // 現在入力中：タイプ済みと残りを分けて表示
      const typedSpan = document.createElement("span");
      typedSpan.textContent = typed;
      typedSpan.style.color = "#3e7e28";
      typedSpan.style.fontWeight = "700";
      el.promptRomaji.appendChild(typedSpan);

      const remain = canonical.startsWith(typed) ? canonical.slice(typed.length) : canonical;
      const remainSpan = document.createElement("span");
      remainSpan.textContent = remain;
      remainSpan.style.color = "#1a0e06";
      remainSpan.style.background = "rgba(230,190,80,0.5)";
      remainSpan.style.borderRadius = "2px";
      el.promptRomaji.appendChild(remainSpan);
    } else {
      // 未入力：暗め
      const span = document.createElement("span");
      span.textContent = canonical;
      span.style.color = "#a09070";
      el.promptRomaji.appendChild(span);
    }
  }
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
    let patterns;
    if (token === "ん") {
      patterns = getNPatterns(tokens, ti);
    } else {
      patterns = getPatternsForToken(tokens, ti);
    }
    const canonical = patterns[0];

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
function handleBeforeInput(event) {
  if (!state.session || state.currentScreen !== "game") return;
  if (event.inputType !== "insertText" || !event.data)   return;

  event.preventDefault();

  const char = event.data;
  if (char.length === 1) processChar(char);
}

function handleTypingKeyDown(event) {
  if (!state.session || state.currentScreen !== "game") return;

  if (event.key === "Backspace") {
    event.preventDefault();
    // かなエンジン：currentTypedを1文字戻す
    if (state.session.currentTyped.length > 0) {
      state.session.currentTyped = state.session.currentTyped.slice(0, -1);
      renderJapaneseWithColor();
      renderRomajiHint();
      renderTypingPreview();
    }
    el.typingInput.value = "";
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    return;
  }
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
      renderRomajiHint();
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
      playKeySound(true);
      if (session.tokenIndex >= tokens.length) {
        playTaskCompleteSound();
        completeTask();
        return;
      }
      renderJapaneseWithColor();
      renderRomajiHint();
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
      renderRomajiHint();
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
      renderRomajiHint();
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
      renderRomajiHint();
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
            renderRomajiHint();
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
    renderRomajiHint();
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
    renderRomajiHint();
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
  el.timeLeft.textContent      = fmtRemain(session.gameMinutes);
  el.progressText.textContent  = `${Math.min(tasksDone + 1, total)} / ${total}`;
  el.progressFill.style.width  = `${pct}%`;
  el.wpmValue.textContent      = String(Number.isFinite(wpm) ? wpm : 0);
  el.accuracyValue.textContent = `${accuracy}%`;
  el.missValue.textContent     = String(session.misses);

  const timePanel = el.timeLeft.closest(".stat-panel");
  if (timePanel) {
    timePanel.classList.toggle("warn-panel",    session.gameMinutes <= END_MINUTES);
    timePanel.classList.toggle("overtime-panel", session.gameMinutes > END_MINUTES);
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
  const overtime     = Math.max(leaveMinutes - END_MINUTES, 0);
  const baseScore    = session.correctChars * (accuracy / 100);
  const score        = Math.max(
    Math.round(baseScore * session.difficulty.multiplier * 100 - overtime * 20),
    0
  );
  const title = resolveTitle({
    leaveMinutes,
    overtimeMinutes: overtime,
    accuracy,
    misses:       session.misses,
    wpm:          Number.isFinite(wpm) ? wpm : 0,
    eventCount:   session.eventCount,
    difficultyId: session.difficulty.id
  });

  const result = {
    difficultyId:    session.difficulty.id,
    difficultyName:  session.difficulty.name,
    leaveMinutes,
    overtimeMinutes: overtime,
    score,
    wpm:      Number.isFinite(wpm) ? wpm : 0,
    accuracy,
    misses:   session.misses,
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
  el.resultStatus.textContent     = result.overtimeMinutes > 0
    ? `残業 ${fmtDuration(result.overtimeMinutes)}`
    : "定時退社成功！";
  el.resultTitle.textContent      = `称号：${result.title}`;
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

  // 前回比較
  if (prevResult && prevResult.difficultyId === result.difficultyId) {
    const scoreDiff = result.score - prevResult.score;
    const timeDiff  = prevResult.leaveMinutes - result.leaveMinutes; // 正=早い
    const scoreStr  = scoreDiff >= 0 ? `前回より +${scoreDiff}` : `前回より ${scoreDiff}`;
    const timeStr   = timeDiff > 0
      ? `前回より ${timeDiff}分早い退勤`
      : timeDiff < 0
        ? `前回より ${Math.abs(timeDiff)}分遅い退勤`
        : "前回と同じ退勤時刻";

    el.resultCompare.innerHTML = `<span>${scoreStr}</span><span>${timeStr}</span>`;
    el.resultCompare.hidden = false;
  } else {
    el.resultCompare.hidden = true;
  }

  // シェアテキスト生成
  const shareText = buildShareText(result);
  el.shareTextBox.textContent = shareText;
}

/* ===========================
   シェアテキスト構築
=========================== */
function buildShareText(result) {
  const statusText = result.overtimeMinutes > 0
    ? `残業 ${fmtDuration(result.overtimeMinutes)}`
    : "定時退社成功";

  return [
    "【定時退ピング】",
    `難易度：${result.difficultyName}`,
    `退勤時刻：${fmtMin(result.leaveMinutes)}`,
    `${statusText}`,
    `スコア：${result.score.toLocaleString("ja-JP")}`,
    `WPM：${result.wpm}`,
    `正確率：${result.accuracy}%`,
    `称号：${result.title}`,
    "#定時退ピング #タイピングゲーム"
  ].join("\n");
}

/* ===========================
   テキストコピー
=========================== */
function copyShareText() {
  const text = el.shareTextBox.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.copyTextButton.textContent;
    el.copyTextButton.textContent = "コピー完了！";
    setTimeout(() => { el.copyTextButton.textContent = orig; }, 1500);
  }).catch(() => {
    alert("コピーに失敗しました。テキストを手動でコピーしてください。");
  });
}

/* ===========================
   X（Twitter）シェア
=========================== */
function shareResult() {
  const last = state.records.lastResult;
  if (!last) return;
  const text = buildShareText(last);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
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

  const statusText = last.overtimeMinutes > 0
    ? `残業 ${fmtDuration(last.overtimeMinutes)}`
    : "定時退社成功";

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
   称号判定
=========================== */
function resolveTitle({ leaveMinutes, overtimeMinutes, accuracy, misses, wpm, eventCount, difficultyId }) {
  // 完璧な一日
  if (misses <= 0 && accuracy === 100) {
    return "完璧な一日";
  }
  // 光の速さで退勤
  if (wpm >= 300) {
    return "光の速さで退勤";
  }
  // 伝説の早退
  if (leaveMinutes <= END_MINUTES - 30) {
    return "伝説の早退";
  }
  if (leaveMinutes <= END_MINUTES - 20 && accuracy >= 97 && misses <= 3) {
    return "退勤の神";
  }
  if (difficultyId === "black" && overtimeMinutes === 0) {
    return "ブラック企業の脱出者";
  }
  if (overtimeMinutes === 0 && accuracy >= 95) {
    return "定時の守護神";
  }
  if (overtimeMinutes === 0) {
    return "今日は定時で上がれた";
  }
  if (eventCount >= 4 && overtimeMinutes >= 30) {
    return "上司に捕まる人";
  }
  if (eventCount >= 2 && accuracy >= 95) {
    return "メール職人";
  }
  if (overtimeMinutes >= 120) {
    return "会社に住む人";
  }
  if (misses >= 25) {
    return "修正版に追われる人";
  }
  if (leaveMinutes >= END_MINUTES + 60) {
    return "会議で1日終わる人";
  }
  if (overtimeMinutes >= 30) {
    return "昼休憩を守れない人";
  }
  return "今日もなんとか退勤";
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
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return `${h}時間${m}分`;
}

function fmtRemain(currentMin) {
  const remain = END_MINUTES - currentMin;
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

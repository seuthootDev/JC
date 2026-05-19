/** JPLT 단어 퀴즈 — goJapan 스타일 오답 재시도 */

const KANA_TO_KO = {
  あ: "아", い: "이", う: "우", え: "에", お: "오",
  か: "카", き: "키", く: "쿠", け: "케", こ: "코",
  が: "가", ぎ: "기", ぐ: "구", げ: "게", ご: "고",
  さ: "사", し: "시", す: "스", せ: "세", そ: "소",
  ざ: "자", じ: "지", ず: "즈", ぜ: "제", ぞ: "조",
  た: "타", ち: "치", つ: "츠", て: "테", と: "토",
  だ: "다", ぢ: "지", づ: "즈", で: "데", ど: "도",
  な: "나", に: "니", ぬ: "누", ね: "네", の: "노",
  は: "하", ひ: "히", ふ: "후", へ: "헤", ほ: "호",
  ば: "바", び: "비", ぶ: "부", べ: "베", ぼ: "보",
  ぱ: "파", ぴ: "피", ぷ: "푸", ぺ: "페", ぽ: "포",
  ま: "마", み: "미", む: "무", め: "메", も: "모",
  や: "야", ゆ: "유", よ: "요",
  ら: "라", り: "리", る: "루", れ: "레", ろ: "로",
  わ: "와", ゐ: "이", ゑ: "에", を: "오", ん: "응",
  ゃ: "야", ゅ: "유", ょ: "요", っ: "",
  "ー": "",
  "・": "・",
};

const KANA_COMBOS = [
  ["きゃ", "캬"], ["きゅ", "큐"], ["きょ", "쿄"],
  ["ぎゃ", "갸"], ["ぎゅ", "규"], ["ぎょ", "교"],
  ["しゃ", "샤"], ["しゅ", "슈"], ["しょ", "쇼"],
  ["じゃ", "자"], ["じゅ", "주"], ["じょ", "조"],
  ["ちゃ", "챠"], ["ちゅ", "츄"], ["ちょ", "쵸"],
  ["にゃ", "냐"], ["にゅ", "뉴"], ["にょ", "뇨"],
  ["ひゃ", "햐"], ["ひゅ", "휴"], ["ひょ", "효"],
  ["びゃ", "뱌"], ["びゅ", "뷰"], ["びょ", "뵤"],
  ["ぴゃ", "퍄"], ["ぴゅ", "퓨"], ["ぴょ", "표"],
  ["みゃ", "먀"], ["みゅ", "뮤"], ["みょ", "묘"],
  ["りゃ", "랴"], ["りゅ", "류"], ["りょ", "료"],
  ["てゃ", "텨"], ["てゅ", "튜"], ["てょ", "툐"],
  ["でゃ", "댸"], ["でゅ", "듀"], ["でょ", "뎌"],
  ["うぃ", "위"], ["うぇ", "웨"], ["うぉ", "워"],
  ["ゔぁ", "바"], ["ゔぃ", "비"], ["ゔぇ", "베"], ["ゔぉ", "보"],
];

let roundLabel;
let headerSubtitle;
let dayGrid;
let loadHint;
let startCard;
let quizCard;
let resultCard;
let progressText;
let progressFill;
let questionLabel;
let wordDisplay;
let modeTag;
let answerForm;
let answerInput;
let answerLabelEl;
let feedback;
let feedbackStatus;
let feedbackDetail;
let meaningReveal;
let resultTitle;
let resultSummary;
let wrongList;
let retryButton;
let changeDayButton;
let backToDays;
let correctDelayInput;
let wrongDelayInput;
let manualAdvanceInput;
let correctDelayLabel;
let wrongDelayLabel;
let nextButton;
let submitButton;

const SETTINGS_KEY = "jplt-quiz-advance-settings";
const DEFAULT_SETTINGS = {
  correctDelay: 3.5,
  wrongDelay: 1.5,
  manualAdvance: false,
};

let advanceSettings = { ...DEFAULT_SETTINGS };
let advanceTimer = null;
let waitingForAdvance = false;

let vocabulary = {};
let currentDay = "";
let currentRound = 1;
let questions = [];
let wrongAnswers = [];
let currentIndex = 0;
let roundCorrectCount = 0;

function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function toHiragana(str) {
  return [...str]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }
      return ch;
    })
    .join("");
}

function kanaChunkToKo(chunk) {
  if (!chunk) return "";
  const sorted = [...KANA_COMBOS].sort((a, b) => b[0].length - a[0].length);
  let out = "";
  let i = 0;
  while (i < chunk.length) {
    if (chunk[i] === "っ" && i + 1 < chunk.length) {
      const next = kanaChunkToKo(chunk.slice(i + 1, i + 2));
      if (next) {
        const c = next[0];
        if (c && /[가-힣]/.test(c)) {
          const doubled = doubleKoInitial(c);
          out += doubled + kanaChunkToKo(chunk.slice(i + 1));
          break;
        }
      }
    }
    let matched = "";
    for (const [kana, ko] of sorted) {
      if (chunk.startsWith(kana, i)) {
        matched = ko;
        i += kana.length;
        break;
      }
    }
    if (!matched) {
      matched = KANA_TO_KO[chunk[i]] ?? chunk[i];
      i += 1;
    }
    out += matched;
  }
  return out;
}

function doubleKoInitial(ch) {
  const map = {
    카: "까", 캬: "꺄", 키: "끼", 쿠: "꾸", 케: "께", 코: "꼬",
    타: "따", 챠: "땨", 치: "띠", 츠: "쯔", 테: "떼", 토: "또",
    파: "빠", 퍄: "뺘", 피: "삐", 푸: "뿌", 페: "뻬", 포: "뽀",
    사: "싸", 샤: "빠", 시: "씨", 스: "쓰", 세: "쎄", 소: "쏘",
  };
  return map[ch] || ch;
}

function readingToKorean(reading) {
  const hira = toHiragana(reading);
  return kanaChunkToKo(hira);
}

function readingToAcceptableAnswers(reading) {
  if (!reading) return [];
  const answers = new Set();
  const parts = reading.split("・").map((p) => p.trim()).filter(Boolean);

  parts.forEach((part) => {
    const ko = readingToKorean(part);
    if (ko) answers.add(normalizeAnswer(ko));
    // よん → 요 처럼 끝 ん 생략 발음도 허용
    if (part.endsWith("ん") && part.length > 1) {
      const shortKo = readingToKorean(part.slice(0, -1));
      if (shortKo) answers.add(normalizeAnswer(shortKo));
    }
  });

  if (parts.length > 1) {
    answers.add(normalizeAnswer(parts.map((p) => readingToKorean(p)).join("")));
    answers.add(normalizeAnswer(parts.map((p) => readingToKorean(p)).join("・")));
  }

  return [...answers].filter(Boolean);
}

function isKatakanaWord(word) {
  const chars = [...word];
  if (!chars.length) return false;
  let kata = 0;
  let kanji = 0;
  for (const ch of chars) {
    const c = ch.charCodeAt(0);
    if (c >= 0x30a0 && c <= 0x30ff) kata += 1;
    if (c >= 0x4e00 && c <= 0x9fff) kanji += 1;
  }
  return kata > 0 && kanji === 0;
}

function getQuestionMode(entry) {
  if (isKatakanaWord(entry.단어)) return "meaning";
  return "reading";
}

function prepareQuestion(entry) {
  const mode = getQuestionMode(entry);
  const base = {
    번호: entry.번호,
    단어: entry.단어,
    요미가나: entry.요미가나,
    뜻: entry.뜻,
    mode,
  };

  if (mode === "meaning") {
    return {
      ...base,
      answers: [normalizeAnswer(entry.뜻)],
      displayAnswer: entry.뜻,
    };
  }

  const answers = readingToAcceptableAnswers(entry.요미가나 || "");
  const primary = answers[0] || readingToKorean(entry.요미가나 || "");
  return {
    ...base,
    answers: answers.length ? answers : [normalizeAnswer(primary)],
    displayAnswer: primary || entry.요미가나,
  };
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDelay(seconds) {
  return seconds <= 0 ? "즉시" : `${seconds}초`;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    advanceSettings = { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    advanceSettings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(advanceSettings));
}

function applySettingsToUi() {
  if (!correctDelayInput) return;
  correctDelayInput.value = String(advanceSettings.correctDelay);
  wrongDelayInput.value = String(advanceSettings.wrongDelay);
  manualAdvanceInput.checked = advanceSettings.manualAdvance;
  correctDelayLabel.textContent = formatDelay(advanceSettings.correctDelay);
  wrongDelayLabel.textContent = formatDelay(advanceSettings.wrongDelay);
  updateDelayControlsDisabled();
}

function updateDelayControlsDisabled() {
  const disabled = advanceSettings.manualAdvance;
  correctDelayInput.disabled = disabled;
  wrongDelayInput.disabled = disabled;
}

function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function setQuizInputEnabled(enabled) {
  answerInput.disabled = !enabled;
  if (submitButton) submitButton.disabled = !enabled;
}

function showNextButton(show) {
  if (nextButton) nextButton.classList.toggle("hidden", !show);
}

function resetAdvanceState() {
  waitingForAdvance = false;
  clearAdvanceTimer();
  showNextButton(false);
  setQuizInputEnabled(true);
}

function getDelayMs(isCorrect) {
  if (advanceSettings.manualAdvance) return null;
  const sec = isCorrect
    ? advanceSettings.correctDelay
    : advanceSettings.wrongDelay;
  return Math.max(0, sec * 1000);
}

function scheduleAdvance(isCorrect) {
  clearAdvanceTimer();
  waitingForAdvance = true;
  setQuizInputEnabled(false);

  if (advanceSettings.manualAdvance) {
    showNextButton(true);
    return;
  }

  const delayMs = getDelayMs(isCorrect);
  showNextButton(false);

  if (delayMs === 0) {
    moveNext();
    return;
  }

  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    moveNext();
  }, delayMs);
}

function showCard(card) {
  if (card !== "quiz") resetAdvanceState();
  startCard.classList.toggle("hidden", card !== "start");
  quizCard.classList.toggle("hidden", card !== "quiz");
  resultCard.classList.toggle("hidden", card !== "result");
}

function renderDayGrid() {
  const days = Object.keys(vocabulary).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    return na - nb;
  });

  dayGrid.innerHTML = "";
  days.forEach((day) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-button";
    btn.textContent = day.replace("DAY ", "DAY ");
    btn.dataset.day = day;
    const count = vocabulary[day].length;
    const kata = vocabulary[day].filter((e) => isKatakanaWord(e.단어)).length;
    btn.title = `${count}문제` + (kata === count ? " (뜻 입력)" : "");
    if (kata === count) btn.classList.add("katakana-day");
    btn.addEventListener("click", () => startDay(day));
    dayGrid.appendChild(btn);
  });

  loadHint.textContent = `${days.length}개 DAY · 총 ${days.reduce((s, d) => s + vocabulary[d].length, 0)}단어`;
}

function startDay(dayKey) {
  currentDay = dayKey;
  currentRound = 1;
  const entries = vocabulary[dayKey].map(prepareQuestion);
  questions = shuffle(entries);
  wrongAnswers = [];
  currentIndex = 0;
  roundCorrectCount = 0;

  roundLabel.textContent = dayKey;
  const allMeaning = entries.every((q) => q.mode === "meaning");
  headerSubtitle.textContent = allMeaning
    ? "가타카나 단어의 한국어 뜻을 입력하세요"
    : "한자·단어를 보고 요미가나 발음을 한국어로 입력하세요";

  showCard("quiz");
  renderQuestion();
}

function renderQuestion() {
  resetAdvanceState();

  const current = questions[currentIndex];
  const problemNo = currentIndex + 1;

  progressText.textContent = `문제 ${problemNo} / ${questions.length}`;
  progressFill.style.width = `${(problemNo / questions.length) * 100}%`;
  wordDisplay.textContent = current.단어;

  if (current.mode === "meaning") {
    questionLabel.textContent = "이 단어의 한국어 뜻은?";
    modeTag.textContent = "뜻 입력 (가타카나)";
    answerLabelEl.textContent = "한국어 뜻 입력";
    answerInput.placeholder = "예: 편의점";
  } else {
    questionLabel.textContent = "이 단어의 발음은?";
    modeTag.textContent = "발음 입력";
    answerLabelEl.textContent = "한국어 발음 입력";
    answerInput.placeholder = "예: 아사";
  }

  feedbackStatus.textContent = "대기중";
  feedbackDetail.textContent = "정답 확인을 누르면 결과가 표시됩니다.";
  feedback.className = "feedback";
  meaningReveal.classList.add("hidden");
  meaningReveal.textContent = "";
  answerInput.value = "";
  answerInput.focus();
}

function showRoundResult() {
  showCard("result");

  if (wrongAnswers.length === 0) {
    resultTitle.textContent = `${currentDay} 완료!`;
    resultSummary.textContent = `${currentRound}라운드에서 ${questions.length}문제를 모두 맞췄어요.`;
    wrongList.innerHTML = "";
    retryButton.textContent = "같은 DAY 다시 하기";
    retryButton.dataset.mode = "restart";
    return;
  }

  resultTitle.textContent = `${currentDay} · ${currentRound}라운드`;
  resultSummary.textContent = `정답 ${roundCorrectCount}개 / 오답 ${wrongAnswers.length}개. 틀린 문제만 다시 풉니다.`;

  wrongList.innerHTML = "";
  wrongAnswers.forEach((item) => {
    const li = document.createElement("li");
    const hint =
      item.mode === "meaning"
        ? `뜻: ${item.뜻}`
        : `발음: ${item.displayAnswer}`;
    li.textContent = `${item.단어} → ${hint} / 입력: ${item.userAnswer || "(빈칸)"}`;
    wrongList.appendChild(li);
  });

  retryButton.textContent = `오답 ${wrongAnswers.length}개 다시 풀기`;
  retryButton.dataset.mode = "retry";
}

function moveNext() {
  currentIndex += 1;
  if (currentIndex < questions.length) {
    renderQuestion();
    return;
  }
  showRoundResult();
}

function goToDaySelect() {
  showCard("start");
}

function bindEvents() {
  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (waitingForAdvance) return;

    const current = questions[currentIndex];
    const userAnswer = normalizeAnswer(answerInput.value);
    const isCorrect = current.answers.some((a) => a === userAnswer);

    meaningReveal.textContent = `뜻: ${current.뜻}`;
    meaningReveal.classList.remove("hidden");

    if (isCorrect) {
      roundCorrectCount += 1;
      feedbackStatus.textContent = "정답";
      feedbackDetail.textContent =
        current.mode === "meaning"
          ? `입력: ${userAnswer}`
          : `발음: ${userAnswer}`;
      feedback.className = "feedback ok";
    } else {
      feedbackStatus.textContent = "오답";
      const correctLabel =
        current.mode === "meaning"
          ? `정답 뜻: ${current.뜻}`
          : `정답 발음: ${current.displayAnswer}`;
      feedbackDetail.textContent = `${correctLabel} / 입력: ${userAnswer || "(빈칸)"}`;
      feedback.className = "feedback bad";
      wrongAnswers.push({ ...current, userAnswer });
    }

    scheduleAdvance(isCorrect);
  });

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (!waitingForAdvance) return;
      moveNext();
    });
  }

  if (correctDelayInput) {
    correctDelayInput.addEventListener("input", () => {
      advanceSettings.correctDelay = parseFloat(correctDelayInput.value);
      correctDelayLabel.textContent = formatDelay(advanceSettings.correctDelay);
      saveSettings();
    });
  }

  if (wrongDelayInput) {
    wrongDelayInput.addEventListener("input", () => {
      advanceSettings.wrongDelay = parseFloat(wrongDelayInput.value);
      wrongDelayLabel.textContent = formatDelay(advanceSettings.wrongDelay);
      saveSettings();
    });
  }

  if (manualAdvanceInput) {
    manualAdvanceInput.addEventListener("change", () => {
      advanceSettings.manualAdvance = manualAdvanceInput.checked;
      updateDelayControlsDisabled();
      saveSettings();
    });
  }

  retryButton.addEventListener("click", () => {
    const mode = retryButton.dataset.mode;

    if (mode === "restart") {
      currentRound = 1;
      questions = shuffle(vocabulary[currentDay].map(prepareQuestion));
    } else {
      currentRound += 1;
      questions = shuffle(
        wrongAnswers.map(({ 번호, 단어, 요미가나, 뜻 }) =>
          prepareQuestion({ 번호, 단어, 요미가나, 뜻 })
        )
      );
    }

    currentIndex = 0;
    roundCorrectCount = 0;
    wrongAnswers = [];
    showCard("quiz");
    renderQuestion();
  });

  backToDays.addEventListener("click", goToDaySelect);
  changeDayButton.addEventListener("click", goToDaySelect);
}

async function loadVocabulary() {
  loadHint.textContent = "단어장 불러오는 중… (약 300KB)";
  try {
    const res = await fetch(`jplt_vocabulary.json?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    vocabulary = await res.json();
    renderDayGrid();
  } catch (err) {
    loadHint.textContent = `불러오기 실패: ${err.message}`;
    console.error(err);
  }
}

function bindDom() {
  roundLabel = document.getElementById("roundLabel");
  headerSubtitle = document.getElementById("headerSubtitle");
  dayGrid = document.getElementById("dayGrid");
  loadHint = document.getElementById("loadHint");
  startCard = document.getElementById("startCard");
  quizCard = document.getElementById("quizCard");
  resultCard = document.getElementById("resultCard");
  progressText = document.getElementById("progressText");
  progressFill = document.getElementById("progressFill");
  questionLabel = document.getElementById("questionLabel");
  wordDisplay = document.getElementById("wordDisplay");
  modeTag = document.getElementById("modeTag");
  answerForm = document.getElementById("answerForm");
  answerInput = document.getElementById("answerInput");
  answerLabelEl = document.getElementById("answerLabel");
  feedback = document.getElementById("feedback");
  feedbackStatus = document.getElementById("feedbackStatus");
  feedbackDetail = document.getElementById("feedbackDetail");
  meaningReveal = document.getElementById("meaningReveal");
  resultTitle = document.getElementById("resultTitle");
  resultSummary = document.getElementById("resultSummary");
  wrongList = document.getElementById("wrongList");
  retryButton = document.getElementById("retryButton");
  changeDayButton = document.getElementById("changeDayButton");
  backToDays = document.getElementById("backToDays");
  correctDelayInput = document.getElementById("correctDelay");
  wrongDelayInput = document.getElementById("wrongDelay");
  manualAdvanceInput = document.getElementById("manualAdvance");
  correctDelayLabel = document.getElementById("correctDelayLabel");
  wrongDelayLabel = document.getElementById("wrongDelayLabel");
  nextButton = document.getElementById("nextButton");
  submitButton = answerForm?.querySelector('button[type="submit"]');

  if (!dayGrid || !loadHint || !answerForm) {
    throw new Error("HTML 요소를 찾지 못했습니다. index.html을 확인하세요.");
  }
}

function initApp() {
  try {
    bindDom();
    loadSettings();
    applySettingsToUi();
    bindEvents();
    showCard("start");
    loadVocabulary();
  } catch (err) {
    const hint = document.getElementById("loadHint");
    if (hint) hint.textContent = `시작 오류: ${err.message}`;
    console.error(err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

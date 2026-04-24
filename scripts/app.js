(function () {
  const config = window.MathQuizConfig;
  const questionsApi = window.MathQuizQuestions;
  const storage = window.MathQuizStorage;

  if (!config || !questionsApi || !storage) {
    return;
  }

  const state = {
    selectedMode: "classic",
    selectedDifficulty: "easy",
    session: null,
    result: null,
    reviewVisible: false,
    timerId: null
  };

  const elements = {
    startPage: document.getElementById("startPage"),
    quizPage: document.getElementById("quizPage"),
    resultPage: document.getElementById("resultPage"),
    startBtn: document.getElementById("startBtn"),
    startSummary: document.getElementById("startSummary"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    modeInputs: document.querySelectorAll('input[name="mode"]'),
    difficultyInputs: document.querySelectorAll('input[name="difficulty"]'),
    modeBadge: document.getElementById("modeBadge"),
    progressText: document.getElementById("progressText"),
    timerBox: document.getElementById("timerBox"),
    timerLabel: document.getElementById("timerLabel"),
    timerText: document.getElementById("timerText"),
    statusText: document.getElementById("statusText"),
    questionText: document.getElementById("questionText"),
    answerPanel: document.getElementById("answerPanel"),
    answerText: document.getElementById("answerText"),
    inputSection: document.getElementById("inputSection"),
    inputValue: document.getElementById("inputValue"),
    keyboard: document.getElementById("keyboard"),
    judgeSection: document.getElementById("judgeSection"),
    markCorrectBtn: document.getElementById("markCorrectBtn"),
    markWrongBtn: document.getElementById("markWrongBtn"),
    abandonBtn: document.getElementById("abandonBtn"),
    resultTitle: document.getElementById("resultTitle"),
    resultMeta: document.getElementById("resultMeta"),
    statAnswered: document.getElementById("statAnswered"),
    statCorrect: document.getElementById("statCorrect"),
    statWrong: document.getElementById("statWrong"),
    statDuration: document.getElementById("statDuration"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    backHomeBtn: document.getElementById("backHomeBtn"),
    toggleReviewBtn: document.getElementById("toggleReviewBtn"),
    reviewSection: document.getElementById("reviewSection"),
    reviewHint: document.getElementById("reviewHint"),
    reviewList: document.getElementById("reviewList"),
    resultHistoryList: document.getElementById("resultHistoryList"),
    resultHistoryEmpty: document.getElementById("resultHistoryEmpty")
  };

  const keyboardKeys = [
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "←", action: "backspace" },
    { label: "0", value: "0" },
    { label: "提交", action: "submit" }
  ];

  function init() {
    renderKeyboard();
    bindEvents();
    syncSelections();
    renderStartSummary();
    renderHistoryPanels();
    restoreProgress();
  }

  function bindEvents() {
    elements.modeInputs.forEach(function (input) {
      input.addEventListener("change", function (event) {
        state.selectedMode = event.target.value;
        renderStartSummary();
      });
    });

    elements.difficultyInputs.forEach(function (input) {
      input.addEventListener("change", function (event) {
        state.selectedDifficulty = event.target.value;
        renderStartSummary();
      });
    });

    elements.startBtn.addEventListener("click", function () {
      startNewSession(state.selectedMode, state.selectedDifficulty);
    });

    elements.markCorrectBtn.addEventListener("click", function () {
      recordJudgement("correct");
    });

    elements.markWrongBtn.addEventListener("click", function () {
      recordJudgement("wrong");
    });

    elements.abandonBtn.addEventListener("click", abandonCurrentSession);

    elements.playAgainBtn.addEventListener("click", function () {
      startNewSession(state.selectedMode, state.selectedDifficulty);
    });

    elements.backHomeBtn.addEventListener("click", function () {
      state.reviewVisible = false;
      renderStartSummary();
      renderHistoryPanels();
      setActivePage("start");
    });

    elements.toggleReviewBtn.addEventListener("click", function () {
      state.reviewVisible = !state.reviewVisible;
      renderResultPage();
    });

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
  }

  function renderKeyboard() {
    elements.keyboard.innerHTML = "";

    keyboardKeys.forEach(function (key) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = key.label;

      if (key.action) {
        button.dataset.action = key.action;
      }

      button.addEventListener("click", function () {
        handleKeyboardInput(key);
      });

      elements.keyboard.appendChild(button);
    });
  }

  function restoreProgress() {
    const stored = normalizeSession(storage.loadProgress());

    if (!stored) {
      setActivePage("start");
      return;
    }

    state.session = stored;
    state.selectedMode = stored.mode;
    state.selectedDifficulty = stored.difficulty;
    state.reviewVisible = false;
    syncSelections();

    if (shouldFinishSession(stored)) {
      finishSession("timeup");
      return;
    }

    renderQuizPage();
    setActivePage("quiz");
    startTimerLoop();
  }

  function normalizeSession(session) {
    if (!session || !config.MODES[session.mode] || !config.DIFFICULTIES[session.difficulty]) {
      return null;
    }

    const mode = config.MODES[session.mode];
    const difficulty = config.DIFFICULTIES[session.difficulty];
    const normalized = {
      version: 2,
      id: typeof session.id === "string" ? session.id : createSessionId(),
      mode: mode.id,
      difficulty: difficulty.id,
      startedAt: toTimestamp(session.startedAt),
      updatedAt: toTimestamp(session.updatedAt),
      currentIndex: toPositiveInteger(session.currentIndex),
      inputValue: typeof session.inputValue === "string" ? session.inputValue : "",
      questions: Array.isArray(session.questions) ? session.questions.filter(isValidQuestion) : []
    };

    if (!normalized.startedAt) {
      normalized.startedAt = Date.now();
    }

    if (!normalized.updatedAt) {
      normalized.updatedAt = normalized.startedAt;
    }

    if (!normalized.questions.length) {
      normalized.questions = questionsApi.createQuestions(getInitialQuestionCount(mode), difficulty.max);
    }

    if (mode.totalQuestions) {
      normalized.questions = normalized.questions.slice(0, mode.totalQuestions);
      normalized.responses = Array.isArray(session.responses) ? session.responses.slice(0, mode.totalQuestions) : [];
      while (normalized.responses.length < normalized.questions.length) {
        normalized.responses.push(null);
      }
      normalized.currentIndex = Math.min(normalized.currentIndex, mode.totalQuestions);
    } else if (mode.inputMode === "judge") {
      normalized.judgements = Array.isArray(session.judgements) ? session.judgements.slice() : [];
      while (normalized.judgements.length < normalized.questions.length) {
        normalized.judgements.push(null);
      }
      ensureTimedBuffer(normalized);
    } else {
      normalized.responses = Array.isArray(session.responses) ? session.responses.slice() : [];
      while (normalized.responses.length < normalized.questions.length) {
        normalized.responses.push(null);
      }
      ensureTimedBuffer(normalized);
    }

    if (normalized.inputValue && !/^\d+$/.test(normalized.inputValue)) {
      normalized.inputValue = "";
    }

    if (normalized.inputValue) {
      const maxValue = String(difficulty.max).length;
      normalized.inputValue = normalized.inputValue.slice(0, maxValue);
      if (Number(normalized.inputValue) > difficulty.max) {
        normalized.inputValue = "";
      }
    }

    return normalized;
  }

  function createSessionId() {
    return "math-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function toTimestamp(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  function toPositiveInteger(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  function isValidQuestion(question) {
    return question &&
      Number.isFinite(question.a) &&
      Number.isFinite(question.b) &&
      Number.isFinite(question.answer) &&
      (question.op === "+" || question.op === "-");
  }

  function getInitialQuestionCount(mode) {
    return mode.totalQuestions || config.TIMED_BATCH_SIZE;
  }

  function ensureTimedBuffer(session) {
    const mode = config.MODES[session.mode];

    if (mode.totalQuestions) {
      return false;
    }

    const beforeLength = session.questions.length;
    const changed = questionsApi.ensureTimedQuestions(
      session,
      config.DIFFICULTIES[session.difficulty].max,
      config.TIMED_BUFFER_SIZE
    );

    if (!changed) {
      return false;
    }

    const extraCount = session.questions.length - beforeLength;
    if (mode.inputMode === "judge") {
      if (!Array.isArray(session.judgements)) {
        session.judgements = [];
      }
      while (session.judgements.length < session.questions.length) {
        session.judgements.push(null);
      }
    } else {
      if (!Array.isArray(session.responses)) {
        session.responses = [];
      }
      while (session.responses.length < session.questions.length) {
        session.responses.push(null);
      }
    }

    return extraCount > 0;
  }

  function startNewSession(modeId, difficultyId) {
    if (state.session && !window.confirm("开始新的一局会清空当前进度，确定继续吗？")) {
      return;
    }

    stopTimerLoop();

    const mode = config.MODES[modeId];
    const difficulty = config.DIFFICULTIES[difficultyId];
    const questions = questionsApi.createQuestions(getInitialQuestionCount(mode), difficulty.max);

    const session = {
      version: 2,
      id: createSessionId(),
      mode: modeId,
      difficulty: difficultyId,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      currentIndex: 0,
      inputValue: "",
      questions: questions
    };

    if (mode.inputMode === "judge") {
      session.judgements = new Array(questions.length).fill(null);
    } else {
      session.responses = new Array(questions.length).fill(null);
    }

    state.session = session;
    state.result = null;
    state.reviewVisible = false;
    state.selectedMode = modeId;
    state.selectedDifficulty = difficultyId;
    syncSelections();
    persistSession();
    renderQuizPage();
    setActivePage("quiz");
    startTimerLoop();
  }

  function abandonCurrentSession() {
    if (!state.session) {
      return;
    }

    if (!window.confirm("放弃后当前进度会被清除，确定继续吗？")) {
      return;
    }

    stopTimerLoop();
    state.session = null;
    storage.clearProgress();
    renderStartSummary();
    renderHistoryPanels();
    setActivePage("start");
  }

  function persistSession() {
    if (!state.session) {
      return;
    }
    state.session.updatedAt = Date.now();
    storage.saveProgress(state.session);
  }

  function renderStartSummary() {
    const mode = config.MODES[state.selectedMode];
    const difficulty = config.DIFFICULTIES[state.selectedDifficulty];
    elements.startSummary.textContent = "当前：" + mode.label + " · " + difficulty.label + "（" + difficulty.max + "以内）";
  }

  function syncSelections() {
    elements.modeInputs.forEach(function (input) {
      input.checked = input.value === state.selectedMode;
    });

    elements.difficultyInputs.forEach(function (input) {
      input.checked = input.value === state.selectedDifficulty;
    });
  }

  function renderQuizPage() {
    if (!state.session) {
      return;
    }

    const session = state.session;
    const mode = config.MODES[session.mode];
    const difficulty = config.DIFFICULTIES[session.difficulty];

    if (mode.totalQuestions && session.currentIndex >= mode.totalQuestions) {
      finishSession("completed");
      return;
    }

    const bufferChanged = ensureTimedBuffer(session);
    if (bufferChanged) {
      persistSession();
    }

    const question = session.questions[session.currentIndex];

    if (!question) {
      finishSession("completed");
      return;
    }

    elements.modeBadge.textContent = mode.label + " · " + difficulty.label + "（" + difficulty.max + "以内）";
    elements.progressText.textContent = buildProgressText(session);
    elements.statusText.textContent = mode.description + " 当前进度会自动保存。";
    elements.timerLabel.textContent = mode.timerLabel;
    elements.questionText.textContent = questionsApi.formatQuestion(question);
    elements.answerPanel.classList.toggle("hidden", !mode.showAnswer);
    elements.answerText.textContent = String(question.answer);
    elements.inputSection.classList.toggle("hidden", mode.inputMode !== "numeric");
    elements.judgeSection.classList.toggle("hidden", mode.inputMode !== "judge");
    renderInputValue();
    updateTimerDisplay();
  }

  function buildProgressText(session) {
    const mode = config.MODES[session.mode];
    const answered = getAnsweredCount(session);

    if (mode.totalQuestions) {
      const currentNumber = Math.min(session.currentIndex + 1, mode.totalQuestions);
      return "第 " + currentNumber + " / " + mode.totalQuestions + " 题";
    }

    if (mode.inputMode === "judge") {
      return "已记录 " + answered + " 题";
    }

    return "已完成 " + answered + " 题";
  }

  function renderInputValue() {
    if (!state.session || config.MODES[state.session.mode].inputMode !== "numeric") {
      return;
    }

    elements.inputValue.textContent = state.session.inputValue || "-";
  }

  function handleKeyboardInput(key) {
    if (!state.session) {
      return;
    }

    const mode = config.MODES[state.session.mode];
    if (mode.inputMode !== "numeric") {
      return;
    }

    if (mode.durationMs && getRemainingMs(state.session) <= 0) {
      finishSession("timeup");
      return;
    }

    if (key.action === "backspace") {
      state.session.inputValue = state.session.inputValue.slice(0, -1);
      persistSession();
      renderInputValue();
      return;
    }

    if (key.action === "submit") {
      submitCurrentInput();
      return;
    }

    appendDigit(key.value);
  }

  function handleKeydown(event) {
    if (!state.session) {
      return;
    }

    const mode = config.MODES[state.session.mode];

    if (mode.inputMode !== "numeric" || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      appendDigit(event.key);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      handleKeyboardInput({ action: "backspace" });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      submitCurrentInput();
    }
  }

  function appendDigit(digit) {
    if (!state.session) {
      return;
    }

    const difficulty = config.DIFFICULTIES[state.session.difficulty];
    const currentValue = state.session.inputValue || "";
    const nextValue = (currentValue + digit).replace(/^0+(?=\d)/, "");

    if (nextValue.length > String(difficulty.max).length) {
      return;
    }

    if (Number(nextValue) > difficulty.max) {
      return;
    }

    state.session.inputValue = nextValue;
    persistSession();
    renderInputValue();
  }

  function submitCurrentInput() {
    if (!state.session) {
      return;
    }

    const raw = state.session.inputValue;
    if (!raw) {
      flashInput();
      return;
    }

    const answer = Number(raw);
    state.session.responses[state.session.currentIndex] = answer;
    state.session.currentIndex += 1;
    state.session.inputValue = "";

    const mode = config.MODES[state.session.mode];
    ensureTimedBuffer(state.session);
    persistSession();

    if (mode.totalQuestions && state.session.currentIndex >= mode.totalQuestions) {
      finishSession("completed");
      return;
    }

    if (mode.durationMs && getRemainingMs(state.session) <= 0) {
      finishSession("timeup");
      return;
    }

    renderQuizPage();
  }

  function recordJudgement(mark) {
    if (!state.session) {
      return;
    }

    const mode = config.MODES[state.session.mode];

    if (mode.inputMode !== "judge") {
      return;
    }

    if (mode.durationMs && getRemainingMs(state.session) <= 0) {
      finishSession("timeup");
      return;
    }

    state.session.judgements[state.session.currentIndex] = mark;
    state.session.currentIndex += 1;
    ensureTimedBuffer(state.session);
    persistSession();

    if (mode.durationMs && getRemainingMs(state.session) <= 0) {
      finishSession("timeup");
      return;
    }

    renderQuizPage();
  }

  function flashInput() {
    elements.inputValue.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.08)" },
        { transform: "scale(1)" }
      ],
      { duration: 180 }
    );
  }

  function getElapsedMs(session) {
    return Math.max(0, Date.now() - session.startedAt);
  }

  function getRemainingMs(session) {
    const durationMs = config.MODES[session.mode].durationMs;
    return Math.max(0, durationMs - getElapsedMs(session));
  }

  function shouldFinishSession(session) {
    const mode = config.MODES[session.mode];
    return Boolean(mode.durationMs && getRemainingMs(session) <= 0);
  }

  function startTimerLoop() {
    stopTimerLoop();
    state.timerId = window.setInterval(function () {
      if (!state.session) {
        return;
      }

      const mode = config.MODES[state.session.mode];
      if (mode.durationMs && getRemainingMs(state.session) <= 0) {
        finishSession("timeup");
        return;
      }

      if (elements.quizPage.classList.contains("is-active")) {
        updateTimerDisplay();
      }
    }, 250);
  }

  function stopTimerLoop() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    if (!state.session) {
      return;
    }

    const mode = config.MODES[state.session.mode];
    const timed = Boolean(mode.durationMs);
    const ms = timed ? getRemainingMs(state.session) : getElapsedMs(state.session);

    elements.timerLabel.textContent = mode.timerLabel;
    elements.timerText.textContent = formatClock(ms, timed);
    elements.timerBox.classList.toggle("is-warning", timed && ms <= 30000);
  }

  function formatClock(ms, roundUp) {
    const totalSeconds = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function formatDurationText(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "分" + String(seconds).padStart(2, "0") + "秒";
  }

  function getAnsweredCount(session) {
    return session.currentIndex;
  }

  function finishSession(reason) {
    if (!state.session) {
      return;
    }

    const session = state.session;
    const mode = config.MODES[session.mode];
    const difficulty = config.DIFFICULTIES[session.difficulty];
    const endedAt = mode.durationMs ? Math.min(Date.now(), session.startedAt + mode.durationMs) : Date.now();
    const answeredCount = getAnsweredCount(session);
    let correctCount = 0;
    let wrongCount = 0;
    const reviewItems = [];

    if (mode.inputMode === "judge") {
      for (let index = 0; index < answeredCount; index += 1) {
        const question = session.questions[index];
        const mark = session.judgements[index];
        const isCorrect = mark === "correct";

        if (isCorrect) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }

        reviewItems.push({
          index: index + 1,
          question: questionsApi.formatQuestion(question),
          answer: question.answer,
          mark: mark,
          correct: isCorrect
        });
      }
    } else {
      for (let index = 0; index < answeredCount; index += 1) {
        const question = session.questions[index];
        const yourAnswer = session.responses[index];
        const isCorrect = yourAnswer === question.answer;

        if (isCorrect) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }

        reviewItems.push({
          index: index + 1,
          question: questionsApi.formatQuestion(question),
          yourAnswer: yourAnswer,
          answer: question.answer,
          correct: isCorrect
        });
      }
    }

    const durationMs = mode.durationMs ? Math.min(mode.durationMs, endedAt - session.startedAt) : Math.max(0, endedAt - session.startedAt);
    const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
    const result = {
      id: session.id,
      mode: session.mode,
      modeLabel: mode.label,
      difficulty: session.difficulty,
      difficultyLabel: difficulty.label,
      difficultyMax: difficulty.max,
      startedAt: session.startedAt,
      endedAt: endedAt,
      answeredCount: answeredCount,
      correctCount: correctCount,
      wrongCount: wrongCount,
      durationMs: durationMs,
      accuracy: accuracy,
      totalQuestions: mode.totalQuestions,
      reason: reason,
      title: mode.totalQuestions ? mode.label + "完成" : mode.label + "结束",
      reviewItems: reviewItems
    };

    storage.clearProgress();
    storage.saveHistory(result);
    stopTimerLoop();
    state.session = null;
    state.result = result;
    state.selectedMode = session.mode;
    state.selectedDifficulty = session.difficulty;
    state.reviewVisible = false;
    syncSelections();
    renderHistoryPanels();
    renderResultPage();
    setActivePage("result");
  }

  function renderResultPage() {
    if (!state.result) {
      return;
    }

    const result = state.result;
    const totalText = result.totalQuestions ? result.answeredCount + " / " + result.totalQuestions : String(result.answeredCount);

    elements.resultTitle.textContent = result.title;
    elements.resultMeta.textContent = result.difficultyLabel + "（" + result.difficultyMax + "以内）加减法 · 正确率 " + result.accuracy + "%";
    elements.statAnswered.textContent = totalText;
    elements.statCorrect.textContent = String(result.correctCount);
    elements.statWrong.textContent = String(result.wrongCount);
    elements.statDuration.textContent = formatDurationText(result.durationMs);
    elements.reviewHint.textContent = result.totalQuestions ? "共 " + result.reviewItems.length + " 题" : "本局共 " + result.reviewItems.length + " 题";
    elements.toggleReviewBtn.textContent = state.reviewVisible ? "收起本局详情" : "查看本局详情";
    elements.reviewSection.classList.toggle("hidden", !state.reviewVisible);

    if (state.reviewVisible) {
      renderReviewItems();
    }
  }

  function renderReviewItems() {
    if (!state.result) {
      return;
    }

    elements.reviewList.innerHTML = "";

    if (!state.result.reviewItems.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "本局还没有可展示的题目。";
      elements.reviewList.appendChild(empty);
      return;
    }

    state.result.reviewItems.forEach(function (item) {
      const card = document.createElement("article");
      const isMarkedWrong = item.mark === "wrong";
      card.className = "review-item " + (item.correct ? "is-correct" : (isMarkedWrong ? "is-marked-wrong" : "is-wrong"));

      const top = document.createElement("div");
      top.className = "review-item__top";
      top.innerHTML = "<span class=\"review-item__title\">第 " + item.index + " 题</span><span class=\"review-item__meta\">" + item.question + "</span>";

      const stats = document.createElement("div");
      stats.className = "review-item__stats";

      if (typeof item.mark === "string") {
        stats.textContent = "答案：" + item.answer + " · 记录结果：" + (item.mark === "correct" ? "答对" : "答错");
      } else {
        stats.textContent = "你的答案：" + item.yourAnswer + " · 正确答案：" + item.answer + " · " + (item.correct ? "答对" : "答错");
      }

      card.appendChild(top);
      card.appendChild(stats);
      elements.reviewList.appendChild(card);
    });
  }

  function renderHistoryPanels() {
    const history = storage.loadHistory();
    renderHistoryList(elements.historyList, elements.historyEmpty, history);
    renderHistoryList(elements.resultHistoryList, elements.resultHistoryEmpty, history);
  }

  function renderHistoryList(container, emptyNode, history) {
    container.innerHTML = "";

    if (!history.length) {
      emptyNode.classList.remove("hidden");
      container.classList.add("hidden");
      return;
    }

    emptyNode.classList.add("hidden");
    container.classList.remove("hidden");

    history.forEach(function (record) {
      const item = document.createElement("article");
      item.className = "history-item";

      const top = document.createElement("div");
      top.className = "history-item__top";
      top.innerHTML =
        "<span class=\"history-item__title\">" + record.modeLabel + "</span>" +
        "<span class=\"history-item__meta\">" + formatDateTime(record.endedAt) + "</span>";

      const stats = document.createElement("div");
      stats.className = "history-item__stats";

      const countText = record.totalQuestions
        ? "答题 " + record.answeredCount + " / " + record.totalQuestions
        : "答题 " + record.answeredCount + " 题";

      stats.textContent =
        record.difficultyLabel + "（" + record.difficultyMax + "以内） · " +
        countText +
        " · 对 " + record.correctCount +
        " · 错 " + record.wrongCount +
        " · 用时 " + formatDurationText(record.durationMs);

      item.appendChild(top);
      item.appendChild(stats);
      container.appendChild(item);
    });
  }

  function formatDateTime(timestamp) {
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleString();
    }
  }

  function setActivePage(pageName) {
    elements.startPage.classList.toggle("is-active", pageName === "start");
    elements.quizPage.classList.toggle("is-active", pageName === "quiz");
    elements.resultPage.classList.toggle("is-active", pageName === "result");
  }

  init();
})();

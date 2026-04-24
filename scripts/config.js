(function () {
  window.MathQuizConfig = {
    PROGRESS_KEY: "math-quiz-progress-v2",
    HISTORY_KEY: "math-quiz-history-v2",
    HISTORY_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
    TIMED_BATCH_SIZE: 180,
    TIMED_BUFFER_SIZE: 24,
    MODES: {
      classic: {
        id: "classic",
        label: "100题闯关",
        description: "做完 100 题后结算用时、答对和答错数量。",
        totalQuestions: 100,
        durationMs: null,
        showAnswer: false,
        inputMode: "numeric",
        timerLabel: "已用时间"
      },
      soloTimed: {
        id: "soloTimed",
        label: "单人限时 3 分钟",
        description: "3 分钟内尽量多答，时间到自动结算。",
        totalQuestions: null,
        durationMs: 3 * 60 * 1000,
        showAnswer: false,
        inputMode: "numeric",
        timerLabel: "剩余时间"
      },
      duoTimed: {
        id: "duoTimed",
        label: "双人限时 3 分钟",
        description: "一个小朋友拿着 iPad 看题目和答案，判断对错后点一下 √ 或 ×，就会自动出下一题。",
        totalQuestions: null,
        durationMs: 3 * 60 * 1000,
        showAnswer: true,
        inputMode: "judge",
        timerLabel: "剩余时间"
      }
    },
    DIFFICULTIES: {
      easy: { id: "easy", label: "简单", max: 20 },
      medium: { id: "medium", label: "中等", max: 50 },
      hard: { id: "hard", label: "困难", max: 100 }
    }
  };
})();

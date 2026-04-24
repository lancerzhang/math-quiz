(function () {
  const config = window.MathQuizConfig;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createQuestion(maxValue) {
    const operator = Math.random() < 0.5 ? "+" : "-";

    if (operator === "+") {
      const a = randInt(0, maxValue);
      const b = randInt(0, maxValue - a);
      return { a: a, b: b, op: operator, answer: a + b };
    }

    const a = randInt(0, maxValue);
    const b = randInt(0, a);
    return { a: a, b: b, op: operator, answer: a - b };
  }

  function createQuestions(count, maxValue) {
    const items = [];

    while (items.length < count) {
      items.push(createQuestion(maxValue));
    }

    return items;
  }

  function ensureTimedQuestions(session, maxValue, minimumRemaining) {
    const remaining = session.questions.length - session.currentIndex;

    if (remaining >= minimumRemaining) {
      return false;
    }

    const extraCount = Math.max(config.TIMED_BATCH_SIZE, minimumRemaining - remaining);
    session.questions = session.questions.concat(createQuestions(extraCount, maxValue));
    return true;
  }

  function formatQuestion(question) {
    return question.op === "+" ? question.a + " + " + question.b : question.a + " - " + question.b;
  }

  window.MathQuizQuestions = {
    createQuestions: createQuestions,
    ensureTimedQuestions: ensureTimedQuestions,
    formatQuestion: formatQuestion
  };
})();

(function () {
  const config = window.MathQuizConfig;

  function readJson(key, fallbackValue) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function pruneHistory(records) {
    const cutoff = Date.now() - config.HISTORY_RETENTION_MS;

    return (Array.isArray(records) ? records : []).filter(function (record) {
      return record && typeof record.endedAt === "number" && record.endedAt >= cutoff;
    });
  }

  function loadHistory() {
    const records = pruneHistory(readJson(config.HISTORY_KEY, []));
    writeJson(config.HISTORY_KEY, records);
    return records;
  }

  function saveHistory(record) {
    const history = loadHistory().filter(function (item) {
      return item.id !== record.id;
    });

    history.unshift(record);
    const cleaned = pruneHistory(history);
    writeJson(config.HISTORY_KEY, cleaned);
    return cleaned;
  }

  function loadProgress() {
    return readJson(config.PROGRESS_KEY, null);
  }

  function saveProgress(session) {
    return writeJson(config.PROGRESS_KEY, session);
  }

  function clearProgress() {
    try {
      window.localStorage.removeItem(config.PROGRESS_KEY);
    } catch (error) {
      return;
    }
  }

  window.MathQuizStorage = {
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    clearProgress: clearProgress
  };
})();

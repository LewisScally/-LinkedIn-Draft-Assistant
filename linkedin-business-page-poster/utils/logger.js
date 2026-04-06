(function (global) {
  const MAX_LOGS = 200;
  let memoryLogs = [];

  function line(msg) {
    return `[${new Date().toISOString()}] ${msg}`;
  }

  const Logger = {
    async appendLog(message) {
      const entry = line(message);
      memoryLogs.push(entry);
      memoryLogs = memoryLogs.slice(-MAX_LOGS);

      try {
        const data = await chrome.storage.local.get(["logs"]);
        const logs = Array.isArray(data.logs) ? data.logs : [];
        logs.push(entry);
        await chrome.storage.local.set({ logs: logs.slice(-MAX_LOGS) });
      } catch (_e) {
        // Keep lightweight; ignore storage write failures.
      }

      return entry;
    },

    async getRecentLogs(limit = 50) {
      try {
        const data = await chrome.storage.local.get(["logs"]);
        const logs = Array.isArray(data.logs) ? data.logs : [];
        return logs.slice(-limit);
      } catch (_e) {
        return memoryLogs.slice(-limit);
      }
    },

    async clearLogs() {
      memoryLogs = [];
      try {
        await chrome.storage.local.set({ logs: [] });
      } catch (_e) {
        // ignore
      }
      return true;
    }
  };

  global.Logger = Logger;
})(typeof self !== "undefined" ? self : window);

(function (global) {
  const DEFAULTS = {
    reviewMode: true,
    autoPost: false,
    dryRun: false,
    drafts: [],
    lastUsedDraft: ""
  };

  const StorageUtils = {
    async getSettings() {
      const data = await chrome.storage.local.get(["settings"]);
      return { ...DEFAULTS, ...(data.settings || {}) };
    },

    async setSettings(settings) {
      await chrome.storage.local.set({ settings });
      return { ok: true };
    },

    async saveDraft(name, text) {
      try {
        const settings = await StorageUtils.getSettings();
        const drafts = Array.isArray(settings.drafts) ? settings.drafts : [];
        const cleanedName = (name || "").trim();
        if (!cleanedName) return { ok: false, message: "Draft name required." };

        const idx = drafts.findIndex((d) => d.name === cleanedName);
        const draft = { name: cleanedName, text: text || "", updatedAt: Date.now() };
        if (idx >= 0) drafts[idx] = draft;
        else drafts.unshift(draft);

        settings.drafts = drafts.slice(0, 50);
        settings.lastUsedDraft = cleanedName;
        await StorageUtils.setSettings(settings);
        return { ok: true, draft };
      } catch (error) {
        return { ok: false, message: `Storage failure: ${error.message}` };
      }
    },

    async loadDrafts() {
      try {
        const settings = await StorageUtils.getSettings();
        return { ok: true, drafts: settings.drafts || [], lastUsedDraft: settings.lastUsedDraft || "" };
      } catch (error) {
        return { ok: false, message: `Storage failure: ${error.message}`, drafts: [] };
      }
    },

    async deleteDraft(name) {
      try {
        const settings = await StorageUtils.getSettings();
        const next = (settings.drafts || []).filter((d) => d.name !== name);
        settings.drafts = next;
        if (settings.lastUsedDraft === name) settings.lastUsedDraft = "";
        await StorageUtils.setSettings(settings);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: `Storage failure: ${error.message}` };
      }
    }
  };

  global.StorageUtils = StorageUtils;
})(typeof self !== "undefined" ? self : window);

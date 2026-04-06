importScripts("utils/storage.js", "utils/logger.js");

const DEFAULT_SETTINGS = {
  reviewMode: true,
  autoPost: false,
  dryRun: false,
  drafts: [],
  lastUsedDraft: ""
};

async function ensureDefaults() {
  try {
    const current = await StorageUtils.getSettings();
    const merged = { ...DEFAULT_SETTINGS, ...current };
    await StorageUtils.setSettings(merged);
    Logger.appendLog("Background defaults ensured");
  } catch (error) {
    Logger.appendLog(`Failed to ensure defaults: ${error.message}`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

async function relayToContent(message) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return { ok: false, message: "No active tab found." };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response || { ok: false, message: "No response from content script." };
  } catch (error) {
    Logger.appendLog(`Relay error: ${error.message}`);
    return { ok: false, message: "Could not contact LinkedIn page script." };
  }
}

async function openSidePanel() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return { ok: false, message: "No active tab found." };
  }

  try {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true
    });
    await chrome.sidePanel.open({ tabId: tab.id });
    Logger.appendLog("Side panel opened");
    return { ok: true, message: "Side panel opened." };
  } catch (error) {
    Logger.appendLog(`Open side panel failed: ${error.message}`);
    return { ok: false, message: "Failed to open side panel." };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case "GET_STATUS": {
        const result = await relayToContent({ type: "GET_STATUS" });
        sendResponse(result);
        break;
      }
      case "OPEN_SIDEPANEL": {
        const result = await openSidePanel();
        sendResponse(result);
        break;
      }
      case "CREATE_POST":
      case "INSERT_DRAFT":
      case "PUBLISH_POST":
      case "DRY_RUN": {
        const result = await relayToContent(msg);
        sendResponse(result);
        break;
      }
      case "SAVE_DRAFT": {
        const result = await StorageUtils.saveDraft(msg.name, msg.text);
        if (result.ok && msg.name) {
          const settings = await StorageUtils.getSettings();
          settings.lastUsedDraft = msg.name;
          await StorageUtils.setSettings(settings);
        }
        Logger.appendLog(result.ok ? `Draft saved: ${msg.name}` : `Save draft failed: ${result.message}`);
        sendResponse(result);
        break;
      }
      case "LOAD_DRAFTS": {
        const result = await StorageUtils.loadDrafts();
        sendResponse(result);
        break;
      }
      case "DELETE_DRAFT": {
        const result = await StorageUtils.deleteDraft(msg.name);
        Logger.appendLog(result.ok ? `Draft deleted: ${msg.name}` : `Delete draft failed: ${result.message}`);
        sendResponse(result);
        break;
      }
      case "GET_SETTINGS": {
        const settings = await StorageUtils.getSettings();
        sendResponse({ ok: true, settings });
        break;
      }
      case "SET_SETTINGS": {
        const current = await StorageUtils.getSettings();
        const next = { ...current, ...msg.settings };
        await StorageUtils.setSettings(next);
        Logger.appendLog("Settings updated");
        sendResponse({ ok: true, settings: next });
        break;
      }
      case "GET_LOGS": {
        const logs = await Logger.getRecentLogs();
        sendResponse({ ok: true, logs });
        break;
      }
      case "CLEAR_LOGS": {
        await Logger.clearLogs();
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, message: "Unknown command." });
        break;
    }
  })();

  return true;
});

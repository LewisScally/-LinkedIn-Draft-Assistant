const els = {
  statusBadge: document.getElementById("statusBadge"),
  pageName: document.getElementById("pageName"),
  postText: document.getElementById("postText"),
  charCount: document.getElementById("charCount"),
  charWarn: document.getElementById("charWarn"),
  openPanelBtn: document.getElementById("openPanelBtn"),
  checkStatusBtn: document.getElementById("checkStatusBtn"),
  createPostBtn: document.getElementById("createPostBtn"),
  insertDraftBtn: document.getElementById("insertDraftBtn"),
  publishBtn: document.getElementById("publishBtn"),
  dryRunBtn: document.getElementById("dryRunBtn"),
  saveDraftBtn: document.getElementById("saveDraftBtn"),
  draftName: document.getElementById("draftName"),
  reviewModeToggle: document.getElementById("reviewModeToggle"),
  autoPostToggle: document.getElementById("autoPostToggle"),
  autoPostNote: document.getElementById("autoPostNote"),
  logPane: document.getElementById("logPane")
};

function updateCharUI() {
  const len = els.postText.value.length;
  els.charCount.textContent = `${len} chars`;
  els.charWarn.classList.toggle("hidden", len <= 3000);
}

function renderStatus(status) {
  const ok = !!status?.ok;
  els.statusBadge.textContent = ok ? "Ready" : "Blocked";
  els.statusBadge.className = `badge ${ok ? "badge-ok" : "badge-warn"}`;
  els.pageName.textContent = `Page: ${status?.pageName || "-"}`;
  addLog(status?.message || "Status updated");
}

function addLog(line) {
  if (!line) return;
  const stamp = new Date().toLocaleTimeString();
  const prev = els.logPane.textContent.split("\n").filter(Boolean).slice(-14);
  prev.push(`[${stamp}] ${line}`);
  els.logPane.textContent = prev.join("\n");
}

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

async function loadSettings() {
  const res = await send("GET_SETTINGS");
  const settings = res?.settings || {};
  els.reviewModeToggle.checked = settings.reviewMode !== false;
  els.autoPostToggle.checked = !!settings.autoPost;
  enforceSafetyToggles();
}

async function saveSettings() {
  await send("SET_SETTINGS", {
    settings: {
      reviewMode: els.reviewModeToggle.checked,
      autoPost: els.autoPostToggle.checked
    }
  });
}

function enforceSafetyToggles() {
  if (els.reviewModeToggle.checked) {
    els.autoPostToggle.checked = false;
    els.autoPostToggle.disabled = true;
    els.autoPostNote.classList.remove("hidden");
    els.autoPostNote.textContent = "Auto-post is disabled while Review Mode is on.";
  } else {
    els.autoPostToggle.disabled = false;
    els.autoPostNote.classList.remove("hidden");
    els.autoPostNote.textContent = "Warning: Auto-post will click LinkedIn Post automatically.";
  }
}

async function refreshStatus() {
  const res = await send("GET_STATUS");
  renderStatus(res);
}

function commandPayload() {
  return {
    text: els.postText.value,
    reviewMode: els.reviewModeToggle.checked,
    autoPost: els.autoPostToggle.checked,
    dryRun: false
  };
}

async function init() {
  updateCharUI();
  await loadSettings();
  await refreshStatus();
}

els.postText.addEventListener("input", updateCharUI);

els.reviewModeToggle.addEventListener("change", async () => {
  enforceSafetyToggles();
  await saveSettings();
});

els.autoPostToggle.addEventListener("change", async () => {
  if (els.autoPostToggle.checked) {
    const ok = confirm("Auto-post will publish without final manual click. Continue?");
    if (!ok) els.autoPostToggle.checked = false;
  }
  await saveSettings();
});

els.openPanelBtn.addEventListener("click", async () => {
  const res = await send("OPEN_SIDEPANEL");
  addLog(res.message);
});

els.checkStatusBtn.addEventListener("click", refreshStatus);

els.createPostBtn.addEventListener("click", async () => {
  const res = await send("CREATE_POST", commandPayload());
  addLog(res.message);
});

els.insertDraftBtn.addEventListener("click", async () => {
  const res = await send("INSERT_DRAFT", { text: els.postText.value });
  addLog(res.message);
});

els.publishBtn.addEventListener("click", async () => {
  const res = await send("PUBLISH_POST", commandPayload());
  addLog(res.message);
});

els.dryRunBtn.addEventListener("click", async () => {
  const res = await send("DRY_RUN", { text: els.postText.value });
  addLog(res.message);
});

els.saveDraftBtn.addEventListener("click", async () => {
  const name = (els.draftName.value || "").trim();
  const text = els.postText.value;
  if (!name) {
    addLog("Draft name required.");
    return;
  }
  const res = await send("SAVE_DRAFT", { name, text });
  addLog(res.ok ? `Draft saved: ${name}` : res.message);
});

init().catch((e) => addLog(`Init error: ${e.message}`));

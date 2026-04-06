const el = {
  statusBadge: document.getElementById("statusBadge"),
  pageName: document.getElementById("pageName"),
  draftSelect: document.getElementById("draftSelect"),
  loadDraftBtn: document.getElementById("loadDraftBtn"),
  deleteDraftBtn: document.getElementById("deleteDraftBtn"),
  postText: document.getElementById("postText"),
  charCount: document.getElementById("charCount"),
  charWarn: document.getElementById("charWarn"),
  draftName: document.getElementById("draftName"),
  saveDraftBtn: document.getElementById("saveDraftBtn"),
  checkStatusBtn: document.getElementById("checkStatusBtn"),
  createPostBtn: document.getElementById("createPostBtn"),
  insertDraftBtn: document.getElementById("insertDraftBtn"),
  publishBtn: document.getElementById("publishBtn"),
  dryRunBtn: document.getElementById("dryRunBtn"),
  reviewModeToggle: document.getElementById("reviewModeToggle"),
  autoPostToggle: document.getElementById("autoPostToggle"),
  autoPostWarning: document.getElementById("autoPostWarning"),
  logPane: document.getElementById("logPane")
};

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function log(message) {
  if (!message) return;
  const lines = el.logPane.textContent.split("\n").filter(Boolean).slice(-60);
  lines.push(`[${new Date().toLocaleTimeString()}] ${message}`);
  el.logPane.textContent = lines.join("\n");
}

function updateChars() {
  const len = el.postText.value.length;
  el.charCount.textContent = `${len} chars`;
  el.charWarn.classList.toggle("hidden", len <= 3000);
}

function renderStatus(status) {
  el.statusBadge.textContent = status?.ok ? "Ready" : "Blocked";
  el.statusBadge.className = `badge ${status?.ok ? "badge-ok" : "badge-warn"}`;
  el.pageName.textContent = `Page: ${status?.pageName || "-"}`;
  log(status?.message || "Status checked");
}

async function loadDrafts() {
  const res = await send("LOAD_DRAFTS");
  const drafts = res?.drafts || [];
  el.draftSelect.innerHTML = "";
  drafts.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.name;
    opt.textContent = `${d.name} (${d.text.length})`;
    el.draftSelect.appendChild(opt);
  });
  if (!drafts.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No drafts";
    el.draftSelect.appendChild(opt);
  }
}

async function loadSettings() {
  const res = await send("GET_SETTINGS");
  const settings = res?.settings || {};
  el.reviewModeToggle.checked = settings.reviewMode !== false;
  el.autoPostToggle.checked = !!settings.autoPost;
  enforceToggleRules();
}

async function saveSettings() {
  await send("SET_SETTINGS", {
    settings: {
      reviewMode: el.reviewModeToggle.checked,
      autoPost: el.autoPostToggle.checked
    }
  });
}

function enforceToggleRules() {
  if (el.reviewModeToggle.checked) {
    el.autoPostToggle.checked = false;
    el.autoPostToggle.disabled = true;
    el.autoPostWarning.textContent = "Auto-post is disabled while Review Mode is enabled.";
  } else {
    el.autoPostToggle.disabled = false;
    el.autoPostWarning.textContent = "Strong warning: Auto-post clicks LinkedIn Post automatically.";
  }
}

function actionPayload() {
  return {
    text: el.postText.value,
    reviewMode: el.reviewModeToggle.checked,
    autoPost: el.autoPostToggle.checked,
    dryRun: false
  };
}

el.postText.addEventListener("input", updateChars);

el.reviewModeToggle.addEventListener("change", async () => {
  enforceToggleRules();
  await saveSettings();
  log("Settings updated");
});

el.autoPostToggle.addEventListener("change", async () => {
  if (el.autoPostToggle.checked) {
    const confirmed = confirm("Enable Auto-post? This may publish immediately.");
    if (!confirmed) el.autoPostToggle.checked = false;
  }
  await saveSettings();
});

el.saveDraftBtn.addEventListener("click", async () => {
  const name = (el.draftName.value || "").trim();
  const text = el.postText.value;
  if (!name) return log("Draft name is required.");
  if (!text.trim()) return log("Draft text is empty.");
  const res = await send("SAVE_DRAFT", { name, text });
  log(res.ok ? `Draft saved: ${name}` : res.message);
  await loadDrafts();
});

el.loadDraftBtn.addEventListener("click", async () => {
  const name = el.draftSelect.value;
  if (!name) return;
  const res = await send("LOAD_DRAFTS");
  const draft = (res?.drafts || []).find((d) => d.name === name);
  if (!draft) return log("Draft not found.");
  el.postText.value = draft.text;
  updateChars();
  log(`Loaded draft: ${name}`);
});

el.deleteDraftBtn.addEventListener("click", async () => {
  const name = el.draftSelect.value;
  if (!name) return;
  const ok = confirm(`Delete draft "${name}"?`);
  if (!ok) return;
  const res = await send("DELETE_DRAFT", { name });
  log(res.ok ? `Deleted draft: ${name}` : res.message);
  await loadDrafts();
});

el.checkStatusBtn.addEventListener("click", async () => {
  const res = await send("GET_STATUS");
  renderStatus(res);
});

el.createPostBtn.addEventListener("click", async () => {
  const res = await send("CREATE_POST", actionPayload());
  log(res.message);
});

el.insertDraftBtn.addEventListener("click", async () => {
  const res = await send("INSERT_DRAFT", { text: el.postText.value });
  log(res.message);
});

el.publishBtn.addEventListener("click", async () => {
  const res = await send("PUBLISH_POST", actionPayload());
  log(res.message);
});

el.dryRunBtn.addEventListener("click", async () => {
  const res = await send("DRY_RUN", { text: el.postText.value });
  log(res.message);
});

(async function init() {
  updateChars();
  await loadSettings();
  await loadDrafts();
  const status = await send("GET_STATUS");
  renderStatus(status);
})();

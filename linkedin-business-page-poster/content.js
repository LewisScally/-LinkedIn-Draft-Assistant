(() => {
  const STEP_DELAY = 250;
  const MAX_WAIT = 12000;

  const SELECTORS = {
    adminContext: {
      urlHints: [/linkedin\.com\/company\//i],
      navSelectors: [
        "a[href*='/admin/']",
        "a[href*='/posts/']",
        "[data-test-id*='admin']",
        "[data-control-name*='admin']",
        "nav a"
      ],
      textHints: [/page posts/i, /admin tools/i, /manage page/i, /analytics/i]
    },
    pageNameSelectors: [
      "h1.org-top-card-summary__title",
      "h1[data-test-id*='page-name']",
      ".org-top-card-primary-content__title",
      "main h1",
      "h1"
    ],
    createPostSelectors: [
      "button[aria-label*='Start a post' i]",
      "button[aria-label*='Create post' i]",
      "button[aria-label*='New post' i]",
      "button[data-control-name*='create_post' i]",
      "button[data-test-id*='start-post' i]",
      "button[data-test-id*='create-post' i]"
    ],
    createPostTextPatterns: [/^start a post$/i, /^create post$/i, /^new post$/i, /start.*post/i],
    composerSelectors: [
      "[role='textbox'][contenteditable='true']",
      "div[contenteditable='true'][aria-label*='post' i]",
      "textarea[aria-label*='post' i]",
      ".ql-editor[contenteditable='true']",
      "div.editor-content[contenteditable='true']"
    ],
    publishSelectors: [
      "button[aria-label='Post']",
      "button[aria-label*='Post' i]",
      "button[data-control-name*='share.post' i]",
      "button[data-test-id*='share-submit' i]"
    ],
    publishTextPatterns: [/^post$/i, /^publish$/i],
    successHints: [
      "div[role='alert']",
      ".artdeco-toast-item__message",
      "[data-test-artdeco-toast-item-type='success']"
    ]
  };

  let sessionLogs = [];

  function stamp() {
    return new Date().toISOString();
  }

  function logStep(message) {
    const line = `[${stamp()}] ${message}`;
    sessionLogs.push(line);
    sessionLogs = sessionLogs.slice(-80);
    console.info("LinkedIn Business Page Poster:", line);
  }

  function normalizeText(str) {
    return (str || "").replace(/\s+/g, " ").trim();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getVisibleText(el) {
    if (!isVisible(el)) return "";
    return normalizeText(el.innerText || el.textContent || "");
  }

  function triggerInputEvents(el) {
    ["input", "change", "keyup"].forEach((eventName) => {
      el.dispatchEvent(new Event(eventName, { bubbles: true }));
    });
  }

  function clickElement(el) {
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus();
    el.click();
    return true;
  }

  async function waitForElement(findFn, timeout = MAX_WAIT, interval = 250) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const candidate = findFn();
      if (candidate) return candidate;
      await sleep(interval);
    }
    return null;
  }

  function queryFirstVisible(selectors) {
    for (const sel of selectors) {
      const all = Array.from(document.querySelectorAll(sel));
      const found = all.find(isVisible);
      if (found) return found;
    }
    return null;
  }

  function getButtonsByText(patterns) {
    const nodes = Array.from(document.querySelectorAll("button, [role='button']"));
    return nodes.filter((node) => {
      const text = getVisibleText(node);
      return text && patterns.some((pattern) => pattern.test(text));
    });
  }

  function detectPageName() {
    for (const selector of SELECTORS.pageNameSelectors) {
      const els = Array.from(document.querySelectorAll(selector));
      for (const el of els) {
        const text = getVisibleText(el);
        if (text && text.length > 1) return text;
      }
    }

    const title = normalizeText(document.title || "");
    if (title.includes("|")) return title.split("|")[0].trim();
    return title || "Unknown Page";
  }

  function detectStatus() {
    const url = window.location.href;
    const onLinkedIn = /https:\/\/www\.linkedin\.com\//i.test(url);
    const onCompanyPage = /linkedin\.com\/company\//i.test(url);

    const hasAdminNav = SELECTORS.adminContext.navSelectors.some((sel) =>
      Array.from(document.querySelectorAll(sel)).some((el) => {
        const text = getVisibleText(el);
        return SELECTORS.adminContext.textHints.some((hint) => hint.test(text)) || /\/admin\//i.test(el.getAttribute("href") || "");
      })
    );

    const hasCreatePost = !!queryFirstVisible(SELECTORS.createPostSelectors) || getButtonsByText(SELECTORS.createPostTextPatterns).length > 0;

    const isAdminContext =
      onCompanyPage &&
      (hasAdminNav || hasCreatePost || /\/admin\//i.test(url) || /\/posts\//i.test(url));

    const pageName = detectPageName();
    const canAttemptPost = onLinkedIn && onCompanyPage && isAdminContext;

    let message = "Ready";
    if (!onLinkedIn) message = "Not on LinkedIn.";
    else if (!onCompanyPage) message = "Not on a LinkedIn company page.";
    else if (!isAdminContext) message = "Admin context not detected. Open Page admin / Page posts view.";
    else message = "LinkedIn Page admin context detected.";

    return {
      ok: canAttemptPost,
      onLinkedIn,
      onCompanyPage,
      isAdminContext,
      pageName,
      canAttemptPost,
      message
    };
  }

  function findCreatePostTrigger() {
    const direct = queryFirstVisible(SELECTORS.createPostSelectors);
    if (direct) return direct;
    const textMatches = getButtonsByText(SELECTORS.createPostTextPatterns);
    return textMatches.find(isVisible) || null;
  }

  function findComposer() {
    return queryFirstVisible(SELECTORS.composerSelectors);
  }

  function getComposerText(el) {
    if (!el) return "";
    if ("value" in el) return normalizeText(el.value);
    return normalizeText(el.innerText || el.textContent || "");
  }

  function setComposerText(el, text) {
    el.focus();

    if ("value" in el) {
      el.value = text;
      triggerInputEvents(el);
      return;
    }

    if (el.isContentEditable) {
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      } catch (_e) {
        el.innerHTML = "";
        el.textContent = text;
      }
      triggerInputEvents(el);
      return;
    }

    el.textContent = text;
    triggerInputEvents(el);
  }

  function findPublishButton() {
    const direct = queryFirstVisible(SELECTORS.publishSelectors);
    if (direct) return direct;
    const textMatches = getButtonsByText(SELECTORS.publishTextPatterns);
    return textMatches.find(isVisible) || null;
  }

  async function createPostFlow() {
    logStep("Checking LinkedIn page context");
    const status = detectStatus();

    if (!status.onLinkedIn) {
      logStep("Not on LinkedIn");
      return { ok: false, ...status, message: "Not on LinkedIn." };
    }
    if (!status.onCompanyPage) {
      logStep("Not on company page");
      return { ok: false, ...status, message: "Not on LinkedIn company page." };
    }
    if (!status.isAdminContext) {
      logStep("Admin context not detected");
      return { ok: false, ...status, message: "Admin context not detected. Open Page admin / Page posts." };
    }

    logStep(`Page detected: ${status.pageName}`);
    const trigger = findCreatePostTrigger();
    if (!trigger) {
      logStep("Create post trigger not found");
      return { ok: false, ...status, message: "Start/Create post trigger not found." };
    }

    clickElement(trigger);
    logStep("Found create post trigger and clicked");
    await sleep(STEP_DELAY);

    const composer = await waitForElement(findComposer, MAX_WAIT, 300);
    if (!composer) {
      logStep("Composer not found after click");
      return { ok: false, ...status, message: "Composer not found after opening post dialog." };
    }

    logStep("Composer opened");
    return { ok: true, ...status, message: "Composer opened successfully." };
  }

  async function insertDraftFlow(text) {
    const bodyText = normalizeText(text);
    if (!bodyText) {
      return { ok: false, message: "Empty post text." };
    }

    let composer = findComposer();
    if (!composer) {
      logStep("No composer found, trying create post flow");
      const create = await createPostFlow();
      if (!create.ok) return create;
      composer = findComposer();
    }

    if (!composer) {
      logStep("Composer not found for insert");
      return { ok: false, message: "Composer not found." };
    }

    setComposerText(composer, text);
    await sleep(200);

    const inserted = getComposerText(composer);
    if (!inserted) {
      logStep("Text insertion uncertain");
      return { ok: false, message: "Failed to verify inserted text." };
    }

    logStep("Text inserted successfully");
    return { ok: true, message: "Draft inserted.", insertedLength: inserted.length };
  }

  async function publishFlow({ reviewMode = true, autoPost = false, dryRun = false } = {}) {
    const composer = findComposer();
    if (!composer) {
      logStep("Publish aborted: composer not found");
      return { ok: false, message: "Composer not found." };
    }

    const text = getComposerText(composer);
    if (!text) {
      logStep("Publish aborted: empty post text");
      return { ok: false, message: "Empty post text." };
    }

    if (dryRun) {
      logStep("Dry run enabled: publish not executed");
      return { ok: true, message: "Dry run complete. Publish skipped." };
    }

    if (reviewMode || !autoPost) {
      logStep("Review mode active, not publishing");
      return { ok: true, message: "Review mode active. Post is ready for manual review." };
    }

    const publishBtn = findPublishButton();
    if (!publishBtn) {
      logStep("Publish button not found");
      return { ok: false, message: "Publish/Post button not found." };
    }

    clickElement(publishBtn);
    logStep("Publish button clicked");
    await sleep(1200);

    const composerStillThere = !!findComposer();
    const successToast = SELECTORS.successHints.some((sel) =>
      Array.from(document.querySelectorAll(sel)).some((el) => isVisible(el) && /posted|success/i.test(getVisibleText(el)))
    );

    if (!composerStillThere || successToast) {
      logStep("Post publish likely successful");
      return { ok: true, message: "Post submitted." };
    }

    logStep("Publish confirmation uncertain");
    return {
      ok: true,
      message: "Publish was clicked, but confirmation is uncertain. Check LinkedIn UI."
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (!msg?.type) {
        sendResponse({ ok: false, message: "Missing command type." });
        return;
      }

      switch (msg.type) {
        case "GET_STATUS": {
          const status = detectStatus();
          logStep(`Status checked: ${status.message}`);
          sendResponse({ ...status, logs: sessionLogs.slice(-25) });
          break;
        }
        case "CREATE_POST": {
          const result = await createPostFlow();
          sendResponse({ ...result, logs: sessionLogs.slice(-25) });
          break;
        }
        case "INSERT_DRAFT": {
          const result = await insertDraftFlow(msg.text || "");
          sendResponse({ ...result, logs: sessionLogs.slice(-25) });
          break;
        }
        case "PUBLISH_POST": {
          const result = await publishFlow(msg);
          sendResponse({ ...result, logs: sessionLogs.slice(-25) });
          break;
        }
        case "DRY_RUN": {
          const result = await publishFlow({ reviewMode: true, autoPost: false, dryRun: true });
          sendResponse({ ...result, logs: sessionLogs.slice(-25) });
          break;
        }
        default:
          sendResponse({ ok: false, message: "Unknown content command.", logs: sessionLogs.slice(-25) });
      }
    })();

    return true;
  });
})();

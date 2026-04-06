(function (global) {
  const DomUtils = {
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    async waitForElement(fn, timeout = 10000, interval = 250) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = fn();
        if (el) return el;
        await DomUtils.sleep(interval);
      }
      return null;
    },

    clickElement(el) {
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
      el.click();
      return true;
    },

    async clickWhenReady(findFn, timeout = 10000) {
      const el = await DomUtils.waitForElement(findFn, timeout, 250);
      if (!el) return null;
      DomUtils.clickElement(el);
      return el;
    },

    getVisibleText(el) {
      if (!DomUtils.isVisible(el)) return "";
      return DomUtils.normalizeText(el.innerText || el.textContent || "");
    },

    isVisible(el) {
      if (!el || !(el instanceof Element)) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },

    getButtonsByText(patterns) {
      const nodes = Array.from(document.querySelectorAll("button, [role='button']"));
      return nodes.filter((n) => patterns.some((p) => p.test(DomUtils.getVisibleText(n))));
    },

    setContentEditableText(el, text) {
      if (!el) return false;
      el.focus();

      if ("value" in el) {
        el.value = text;
        DomUtils.triggerInputEvents(el);
        return true;
      }

      if (el.isContentEditable) {
        try {
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, text);
        } catch (_e) {
          el.textContent = text;
        }
        DomUtils.triggerInputEvents(el);
        return true;
      }

      return false;
    },

    triggerInputEvents(el) {
      ["input", "change", "keyup"].forEach((name) => {
        el.dispatchEvent(new Event(name, { bubbles: true }));
      });
    },

    normalizeText(str) {
      return (str || "").replace(/\s+/g, " ").trim();
    }
  };

  global.DomUtils = DomUtils;
})(typeof self !== "undefined" ? self : window);

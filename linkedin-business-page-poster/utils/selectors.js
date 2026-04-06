(function (global) {
  const Selectors = {
    adminDetection: {
      urlHints: [/linkedin\.com\/company\//i, /\/admin\//i, /\/posts\//i],
      ariaSelectors: [
        "[aria-label*='Page posts' i]",
        "[aria-label*='Admin tools' i]",
        "[aria-label*='Manage Page' i]"
      ],
      dataSelectors: [
        "[data-test-id*='admin']",
        "[data-control-name*='admin']",
        "[data-test-id*='page-posts']"
      ],
      roleSelectors: ["nav [role='link']", "[role='navigation'] a"],
      textPatterns: [/page posts/i, /admin tools/i, /manage page/i, /content admin/i]
    },

    pageName: {
      selectors: [
        "h1.org-top-card-summary__title",
        "h1[data-test-id*='page-name']",
        ".org-top-card-primary-content__title",
        "main h1",
        "h1"
      ]
    },

    createPost: {
      ariaSelectors: [
        "button[aria-label*='Start a post' i]",
        "button[aria-label*='Create post' i]",
        "button[aria-label*='New post' i]"
      ],
      dataSelectors: [
        "button[data-control-name*='create_post' i]",
        "button[data-test-id*='start-post' i]",
        "button[data-test-id*='create-post' i]"
      ],
      roleSelectors: ["button", "[role='button']"],
      textPatterns: [/^start a post$/i, /^create post$/i, /^new post$/i, /start.*post/i]
    },

    composer: {
      ariaSelectors: [
        "[role='textbox'][contenteditable='true']",
        "div[contenteditable='true'][aria-label*='post' i]",
        "textarea[aria-label*='post' i]"
      ],
      dataSelectors: [
        "[data-test-id*='share-box'] [contenteditable='true']",
        "[data-control-name*='editor']"
      ],
      roleSelectors: ["[contenteditable='true']", "textarea"]
    },

    publish: {
      ariaSelectors: [
        "button[aria-label='Post']",
        "button[aria-label*='Post' i]",
        "button[aria-label*='Publish' i]"
      ],
      dataSelectors: [
        "button[data-control-name*='share.post' i]",
        "button[data-test-id*='share-submit' i]"
      ],
      roleSelectors: ["button", "[role='button']"],
      textPatterns: [/^post$/i, /^publish$/i, /post now/i]
    },

    cancelClose: {
      ariaSelectors: [
        "button[aria-label*='Close' i]",
        "button[aria-label*='Dismiss' i]",
        "button[aria-label*='Cancel' i]"
      ],
      textPatterns: [/^cancel$/i, /^close$/i]
    },

    matchesText(node, patterns) {
      const text = (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
      return patterns.some((p) => p.test(text));
    }
  };

  global.LinkedInSelectors = Selectors;
})(typeof self !== "undefined" ? self : window);

# LinkedIn Business Page Poster (Chrome Extension)

## What this extension does
LinkedIn Business Page Poster helps a logged-in LinkedIn Page admin draft and publish posts using LinkedIn’s Page admin flow:

- Open a LinkedIn company page you administer
- Move to Page admin/Page posts context
- Click **Start a post/Create post**
- Insert your draft text
- Stop in **Review Mode** (default), or publish in **Auto-post mode** if explicitly enabled

The extension only operates on `linkedin.com` pages and is built with Manifest V3, plain JavaScript, HTML, and CSS.

---

## Permissions explained

- `activeTab` – interact with current LinkedIn tab
- `storage` – save settings, logs, and drafts locally
- `tabs` – query active tab and send commands
- `scripting` – support script-based tab interactions if needed
- `sidePanel` – open Chrome side panel UI
- `host_permissions: https://www.linkedin.com/*` – restrict operation to LinkedIn domain

---

## Load unpacked extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `linkedin-business-page-poster/` folder
5. Pin the extension if desired

---

## How to use the popup

1. Navigate to your LinkedIn company page (admin access required)
2. Open extension popup
3. Click **Check Status**
4. Paste/write text in the draft box
5. Click **Create Post**
6. Click **Insert Draft**
7. In default **Review Mode**, confirm post manually on LinkedIn
8. Optional: disable Review Mode and enable Auto-post (strong warning shown), then click **Publish**

Popup also supports:
- Open Side Panel
- Dry Run
- Save Draft

---

## How to use the side panel

1. Open popup and click **Open Panel**
2. Use larger editor area and draft controls
3. Load/delete named drafts
4. Check status and run posting flow:
   - **Create Post**
   - **Insert Draft**
   - **Publish** (respects Review Mode/Auto-post)
   - **Dry Run**
5. Watch activity logs for each step and error

---

## Safety defaults and behavior

- **Review Mode = ON by default**
- **Auto-post = OFF by default**
- No attempt to bypass LinkedIn authentication/authorization
- No publishing if page/admin context cannot be verified
- No publishing empty content
- Dry run logs actions without posting

If user is not a Page admin/content admin/super admin, status should be blocked with clear guidance.

---

## Known limitations

- LinkedIn UI can change frequently (DOM structure, labels, button hierarchy)
- Some page states load asynchronously and may delay selector matching
- Publish confirmation can be “best effort” (toast/composer disappearance checks)
- Browser locale differences may affect text-based button matching

---

## Why selector fallbacks are used

LinkedIn’s UI is dynamic and frequently updated. The extension uses layered selector fallback strategy:

1. ARIA-label selectors
2. Button text matching
3. Role-based scanning
4. Contenteditable detection
5. `data-*` attribute checks
6. Heuristic matching functions

This improves resilience versus relying on one brittle selector.

---

## How to maintain selectors when LinkedIn changes

1. Open LinkedIn Page admin/post composer and inspect target elements
2. Update selector candidates in:
   - `utils/selectors.js`
   - (and content flow logic in `content.js`, if needed)
3. Prefer stable accessibility labels and semantic roles first
4. Keep multiple fallback selectors/patterns
5. Re-test:
   - status detection
   - create post trigger detection
   - composer detection
   - publish button detection
6. Keep safe-failure behavior (never force post outside valid context)

---

## Project tree

```text
linkedin-business-page-poster/
  manifest.json
  background.js
  content.js
  popup.html
  popup.js
  sidepanel.html
  sidepanel.js
  styles.css
  utils/
    selectors.js
    dom.js
    storage.js
    logger.js
  README.md
```

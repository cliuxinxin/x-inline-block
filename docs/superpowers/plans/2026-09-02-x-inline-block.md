# X Inline Block Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a loadable Chrome extension that adds a direct “拉黑” action after X/Twitter post author names and completes the native block flow.

**Architecture:** A dependency-free Manifest V3 content script scans tweet articles, injects one scoped button, and orchestrates X's native menu and confirmation dialog. Exported functions are tested in a Happy DOM environment while browser startup remains automatic.

**Tech Stack:** Manifest V3, browser JavaScript, CSS, Node.js test runner, Happy DOM

**Spec:** `docs/superpowers/specs/2026-09-02-x-inline-block-design.md`

## Global Constraints

- Support `https://x.com/*` and `https://twitter.com/*`.
- Do not call private X APIs or read, store, or transmit credentials.
- Do not inject into ads, the signed-in user's own posts, or follow recommendations.
- A user click immediately completes X's native block and confirmation flow without an extension confirmation.
- Menu and confirmation lookup must fail closed when the block action cannot be identified safely.
- No production build step is required.

---

### Task 1: DOM eligibility and button injection

**Files:**
- Create: `package.json`
- Create: `src/content.js`
- Create: `tests/content.test.js`

**Interfaces:**
- Produces: `getHandle(article): string | null`, `isEligibleArticle(article, currentHandle): boolean`, `injectBlockButton(article, options): HTMLButtonElement | null`, `scan(root, options): void`

- [ ] **Step 1: Create the test harness and failing injection tests**

Define Happy DOM tweet fixtures and assertions that eligible tweets receive exactly one `.x-inline-block-button`, duplicate scans do not duplicate it, ads are skipped, and a post matching `currentHandle` is skipped.

- [ ] **Step 2: Run the injection tests and verify RED**

Run: `npm test`
Expected: FAIL because `src/content.js` does not exist or its exported functions are absent.

- [ ] **Step 3: Implement minimal eligibility, handle parsing, injection, and scan functions**

Use `article[data-testid="tweet"]` as the only article boundary, `[data-testid="User-Name"]` as the author boundary, and `/^@[A-Za-z0-9_]{1,15}$/` for handles. Mark injected articles with a button lookup rather than global state.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test`
Expected: all Task 1 tests pass with zero failures.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json src/content.js tests/content.test.js && git commit -m "feat: inject inline block buttons on X posts"`

### Task 2: Safe native block flow

**Files:**
- Modify: `src/content.js`
- Modify: `tests/content.test.js`

**Interfaces:**
- Consumes: `getHandle(article)` and the scoped tweet article
- Produces: `waitForElement(find, options): Promise<Element>`, `performNativeBlock(article, handle, deps): Promise<void>`, `handleBlockClick(button, article, options): Promise<void>`

- [ ] **Step 1: Write failing workflow tests**

Assert that a click changes the button to `处理中…`, opens only the current article's caret, accepts only a menu item with `data-testid="block"` or exact localized block text containing the same handle, clicks `confirmationSheetConfirm`, and ends at `已拉黑`. Assert missing or mismatched menu items restore `拉黑`, set an error title, and never click confirm.

- [ ] **Step 2: Run workflow tests and verify RED**

Run: `npm test`
Expected: FAIL because the workflow exports or behavior are missing.

- [ ] **Step 3: Implement the minimal fail-closed workflow**

Scope the caret lookup to `article`; poll the visible document menu and confirmation dialog with bounded timeouts; validate the block item against the target handle; set button states in a `try/catch`; prevent concurrent clicks using `button.disabled`.

- [ ] **Step 4: Run the complete suite and verify GREEN**

Run: `npm test`
Expected: all injection and workflow tests pass with zero failures.

- [ ] **Step 5: Commit**

Run: `git add src/content.js tests/content.test.js && git commit -m "feat: automate X native block flow"`

### Task 3: Dynamic startup, packaging, styling, and documentation

**Files:**
- Create: `manifest.json`
- Create: `src/content.css`
- Create: `README.md`
- Create: `tests/manifest.test.js`
- Modify: `src/content.js`
- Modify: `tests/content.test.js`

**Interfaces:**
- Consumes: `scan(document, options)`
- Produces: `start(options): { observer: MutationObserver, stop(): void }`

- [ ] **Step 1: Write failing dynamic-startup and manifest tests**

Assert that `start()` scans the initial document, injects into asynchronously added tweets, and `stop()` disconnects cleanly. Assert Manifest V3, content script/CSS existence, and exact X/Twitter match patterns.

- [ ] **Step 2: Run the new tests and verify RED**

Run: `npm test`
Expected: FAIL because startup and manifest files are missing.

- [ ] **Step 3: Implement observer startup and extension assets**

Batch mutation scans with one queued microtask, auto-start only when `document` exists outside CommonJS tests, add compact red button styles, and write Chinese load-unpacked, usage, privacy, limitation, and troubleshooting instructions.

- [ ] **Step 4: Run full verification**

Run: `npm test && node --check src/content.js && git diff --check`
Expected: all tests pass, syntax check exits 0, and no whitespace errors are reported.

- [ ] **Step 5: Commit**

Run: `git add manifest.json src/content.js src/content.css README.md tests/manifest.test.js tests/content.test.js && git commit -m "feat: package loadable X inline block extension"`

### Task 4: Final acceptance audit

**Files:**
- Modify only files with a verified acceptance gap.

**Interfaces:**
- Consumes: the complete extension directory
- Produces: a verified load-unpacked Chrome extension

- [ ] **Step 1: Check every specification requirement against files and tests**

Run: `git status --short && find manifest.json src tests -maxdepth 2 -type f -print | sort && npm test`
Expected: required files exist and the complete test suite reports zero failures.

- [ ] **Step 2: Inspect the packaged manifest and JavaScript syntax**

Run: `node -e "const m=require('./manifest.json'); if(m.manifest_version!==3) process.exit(1); console.log(m.name, m.version)" && node --check src/content.js`
Expected: extension name/version print and both commands exit 0.

- [ ] **Step 3: Verify repository cleanliness and document any manual limitation**

Run: `git diff --check && git status --short --branch`
Expected: no uncommitted implementation changes; README states that final real-account blocking verification must be performed on a logged-in X session.

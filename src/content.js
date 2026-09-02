(function xInlineBlockExtension() {
  'use strict';

  const HANDLE_PATTERN = /^@[A-Za-z0-9_]{1,15}$/;
  const BUTTON_CLASS = 'x-inline-block-button';

  function getHandle(article) {
    const author = article?.querySelector('[data-testid="User-Name"]');
    if (!author) return null;

    for (const element of author.querySelectorAll('span')) {
      const text = element.textContent.trim();
      if (HANDLE_PATTERN.test(text)) return text;
    }
    return null;
  }

  function isEligibleArticle(article, currentHandle) {
    if (!article?.matches('article[data-testid="tweet"]')) return false;
    if (article.querySelector('[data-testid="placementTracking"]')) return false;

    const handle = getHandle(article);
    if (!handle) return false;
    return !currentHandle || handle.toLowerCase() !== currentHandle.toLowerCase();
  }

  function injectBlockButton(article, options = {}) {
    if (!isEligibleArticle(article, options.currentHandle)) return null;

    const existing = article.querySelector(`.${BUTTON_CLASS}`);
    if (existing) return existing;

    const author = article.querySelector('[data-testid="User-Name"]');
    const button = article.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.textContent = '拉黑';
    button.title = `拉黑 ${getHandle(article)}`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void handleBlockClick(button, article, options);
    });
    author.append(button);
    return button;
  }

  function waitForElement(find, options = {}) {
    const timeout = options.timeout ?? 1500;
    const interval = options.interval ?? 25;
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        const element = find();
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startedAt >= timeout) {
          reject(new Error(options.message || '等待 X 页面元素超时'));
          return;
        }
        setTimeout(check, interval);
      };
      check();
    });
  }

  function findBlockMenuItem(documentRef, handle) {
    const normalizedHandle = handle.toLowerCase();
    const candidates = documentRef.querySelectorAll(
      '[data-testid="block"], [role="menuitem"]'
    );
    for (const candidate of candidates) {
      const text = candidate.textContent.trim().toLowerCase();
      const hasBlockMeaning = candidate.dataset.testid === 'block'
        || /(?:拉黑|屏蔽|block|ブロック|차단)/i.test(text);
      if (hasBlockMeaning && text.includes(normalizedHandle)) return candidate;
    }
    return null;
  }

  async function performNativeBlock(article, handle, deps = {}) {
    const documentRef = deps.document || article.ownerDocument;
    const timeout = deps.timeout ?? 1500;
    const caret = article.querySelector('[data-testid="caret"]');
    if (!caret) throw new Error('找不到该帖子的更多菜单');
    caret.click();

    const blockItem = await waitForElement(
      () => findBlockMenuItem(documentRef, handle),
      { timeout, message: `找不到 ${handle} 的拉黑菜单项` }
    );
    blockItem.click();

    const confirm = await waitForElement(
      () => documentRef.querySelector('[data-testid="confirmationSheetConfirm"]'),
      { timeout, message: '找不到 X 的拉黑确认按钮' }
    );
    confirm.click();
  }

  async function handleBlockClick(button, article, options = {}) {
    if (button.disabled) return false;
    const handle = getHandle(article);
    if (!handle) return false;

    button.disabled = true;
    button.textContent = '处理中…';
    button.title = `正在拉黑 ${handle}`;
    try {
      const operation = options.operation || performNativeBlock;
      await operation(article, handle, options);
      button.textContent = '已拉黑';
      button.title = `已拉黑 ${handle}`;
      return true;
    } catch (error) {
      button.disabled = false;
      button.textContent = '拉黑';
      button.title = `拉黑失败：${error.message}`;
      return false;
    }
  }

  function scan(root, options = {}) {
    const articles = [];
    if (root?.matches?.('article[data-testid="tweet"]')) articles.push(root);
    if (root?.querySelectorAll) {
      articles.push(...root.querySelectorAll('article[data-testid="tweet"]'));
    }
    const currentHandle = options.currentHandle ?? getCurrentHandle(
      root?.ownerDocument || root
    );
    for (const article of new Set(articles)) {
      injectBlockButton(article, { ...options, currentHandle });
    }
  }

  function getCurrentHandle(documentRef) {
    const accountSwitcher = documentRef?.querySelector(
      '[data-testid="SideNav_AccountSwitcher_Button"]'
    );
    if (!accountSwitcher) return null;
    for (const element of accountSwitcher.querySelectorAll('span')) {
      const text = element.textContent.trim();
      if (HANDLE_PATTERN.test(text)) return text;
    }
    return null;
  }

  function start(options = {}) {
    const documentRef = options.document || document;
    const Observer = options.MutationObserver || MutationObserver;
    let queued = false;
    let stopped = false;
    const runScan = () => {
      queued = false;
      if (!stopped) scan(documentRef, options);
    };
    const observer = new Observer(() => {
      if (queued || stopped) return;
      queued = true;
      queueMicrotask(runScan);
    });

    scan(documentRef, options);
    observer.observe(documentRef.documentElement, { childList: true, subtree: true });
    return {
      observer,
      stop() {
        stopped = true;
        observer.disconnect();
      }
    };
  }

  const api = {
    getHandle,
    isEligibleArticle,
    injectBlockButton,
    waitForElement,
    performNativeBlock,
    handleBlockClick,
    scan,
    getCurrentHandle,
    start
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof document !== 'undefined') start();
})();

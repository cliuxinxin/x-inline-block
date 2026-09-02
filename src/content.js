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
    author.append(button);
    return button;
  }

  function scan(root, options = {}) {
    const articles = [];
    if (root?.matches?.('article[data-testid="tweet"]')) articles.push(root);
    if (root?.querySelectorAll) {
      articles.push(...root.querySelectorAll('article[data-testid="tweet"]'));
    }
    for (const article of new Set(articles)) injectBlockButton(article, options);
  }

  const api = { getHandle, isEligibleArticle, injectBlockButton, scan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();

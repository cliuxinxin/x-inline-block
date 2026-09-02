const test = require('node:test');
const assert = require('node:assert/strict');
const { Window } = require('happy-dom');

const { getHandle, injectBlockButton, scan } = require('../src/content.js');

function makePage({ handle = '@alice', ad = false } = {}) {
  const window = new Window({ url: 'https://x.com/home' });
  window.document.body.innerHTML = `
    <article data-testid="tweet">
      <div data-testid="User-Name"><span>Alice</span><span>${handle}</span></div>
      ${ad ? '<span data-testid="placementTracking">广告</span>' : ''}
      <button data-testid="caret">更多</button>
    </article>`;
  return { window, document: window.document, article: window.document.querySelector('article') };
}

test('getHandle returns the post author handle', () => {
  const { article } = makePage();
  assert.equal(getHandle(article), '@alice');
});

test('scan injects one block button after an eligible author name', () => {
  const { document, article } = makePage();
  scan(document, { currentHandle: '@me' });
  scan(document, { currentHandle: '@me' });

  const buttons = article.querySelectorAll('.x-inline-block-button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, '拉黑');
  assert.equal(buttons[0].previousElementSibling?.textContent, '@alice');
});

test('injectBlockButton skips promoted posts', () => {
  const { article } = makePage({ ad: true });
  assert.equal(injectBlockButton(article, { currentHandle: '@me' }), null);
});

test('injectBlockButton skips the signed-in users own posts', () => {
  const { article } = makePage({ handle: '@me' });
  assert.equal(injectBlockButton(article, { currentHandle: '@ME' }), null);
});

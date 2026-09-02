const test = require('node:test');
const assert = require('node:assert/strict');
const { Window } = require('happy-dom');

const {
  getHandle,
  injectBlockButton,
  scan,
  start,
  performNativeBlock,
  handleBlockClick
} = require('../src/content.js');

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

test('performNativeBlock clicks the scoped menu item and native confirmation', async () => {
  const { document, article } = makePage();
  let confirmed = false;
  article.querySelector('[data-testid="caret"]').addEventListener('click', () => {
    const item = document.createElement('div');
    item.dataset.testid = 'block';
    item.textContent = '拉黑 @alice';
    item.addEventListener('click', () => {
      const confirm = document.createElement('button');
      confirm.dataset.testid = 'confirmationSheetConfirm';
      confirm.addEventListener('click', () => { confirmed = true; });
      document.body.append(confirm);
    });
    document.body.append(item);
  });

  await performNativeBlock(article, '@alice', { document, timeout: 100 });
  assert.equal(confirmed, true);
});

test('performNativeBlock rejects a block item for a different account', async () => {
  const { document, article } = makePage();
  let confirmed = false;
  article.querySelector('[data-testid="caret"]').addEventListener('click', () => {
    const item = document.createElement('div');
    item.dataset.testid = 'block';
    item.textContent = '拉黑 @mallory';
    item.addEventListener('click', () => { confirmed = true; });
    document.body.append(item);
  });

  await assert.rejects(
    performNativeBlock(article, '@alice', { document, timeout: 30 }),
    /找不到.*拉黑/
  );
  assert.equal(confirmed, false);
});

test('handleBlockClick exposes progress and success states', async () => {
  const { article } = makePage();
  const button = injectBlockButton(article, { currentHandle: '@me' });
  const states = [];
  const operation = async () => {
    states.push([button.textContent, button.disabled]);
  };

  await handleBlockClick(button, article, { operation });

  assert.deepEqual(states, [['处理中…', true]]);
  assert.equal(button.textContent, '已拉黑');
  assert.equal(button.disabled, true);
});

test('handleBlockClick restores the action after a safe failure', async () => {
  const { article } = makePage();
  const button = injectBlockButton(article, { currentHandle: '@me' });

  await handleBlockClick(button, article, {
    operation: async () => { throw new Error('找不到拉黑菜单项'); }
  });

  assert.equal(button.textContent, '拉黑');
  assert.equal(button.disabled, false);
  assert.match(button.title, /失败.*找不到拉黑菜单项/);
});

test('start scans initial and dynamically inserted posts', async () => {
  const window = new Window({ url: 'https://x.com/home' });
  const { document } = window;
  document.body.innerHTML = `
    <div data-testid="SideNav_AccountSwitcher_Button"><span>@me</span></div>
    <article data-testid="tweet">
      <div data-testid="User-Name"><span>Alice</span><span>@alice</span></div>
    </article>`;

  const controller = start({ document, MutationObserver: window.MutationObserver });
  assert.equal(document.querySelectorAll('.x-inline-block-button').length, 1);

  const container = document.createElement('div');
  container.innerHTML = `
    <article data-testid="tweet">
      <div data-testid="User-Name"><span>Bob</span><span>@bob</span></div>
    </article>`;
  document.body.append(container);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelectorAll('.x-inline-block-button').length, 2);

  controller.stop();
  const afterStop = document.createElement('article');
  afterStop.dataset.testid = 'tweet';
  afterStop.innerHTML = '<div data-testid="User-Name"><span>@carol</span></div>';
  document.body.append(afterStop);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(afterStop.querySelector('.x-inline-block-button'), null);
});

test('start detects the signed-in handle and skips own posts', () => {
  const window = new Window({ url: 'https://x.com/home' });
  const { document } = window;
  document.body.innerHTML = `
    <div data-testid="SideNav_AccountSwitcher_Button"><span>@me</span></div>
    <article data-testid="tweet">
      <div data-testid="User-Name"><span>Me</span><span>@me</span></div>
    </article>`;
  const controller = start({ document, MutationObserver: window.MutationObserver });
  assert.equal(document.querySelector('.x-inline-block-button'), null);
  controller.stop();
});

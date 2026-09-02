const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('manifest loads the content script and stylesheet on both X domains', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    'https://x.com/*',
    'https://twitter.com/*'
  ]);
  for (const file of [
    ...manifest.content_scripts[0].js,
    ...manifest.content_scripts[0].css
  ]) {
    assert.equal(fs.existsSync(path.join(projectRoot, file)), true, `${file} should exist`);
  }
  assert.deepEqual(manifest.permissions || [], []);
});

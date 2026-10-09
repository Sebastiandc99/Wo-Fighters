const test = require('node:test');
const assert = require('node:assert/strict');
const { validUpdate, BASE } = require('../apk-updates.js');
const update = { versionCode: 3, versionName: '1.2.0', url: BASE + 'WO-Fighters-1.2.0.apk', sha256: 'a'.repeat(64) };
test('only newer releases with matching trusted download and digest are offered', () => {
  assert.equal(validUpdate(update, 2), true);
  assert.equal(validUpdate(update, 3), false);
  assert.equal(validUpdate(update, 4), false);
  for (const change of [{ url: 'https://example.com/file.apk' }, { url: update.url + '?redirect=evil' }, { sha256: '' }, { versionCode: 3.1 }, { versionName: '../bad' }]) assert.equal(validUpdate({ ...update, ...change }, 2), false);
  assert.equal(validUpdate(null, 2), false);
});

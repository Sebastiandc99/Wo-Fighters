const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./engine-harness.cjs');

test('mobile canvas caps internal pixels while desktop retains its sharpness', () => {
  const g = game();
  g.run('window.devicePixelRatio = 3; canvas.clientWidth = 960; syncViewport()');
  assert.equal(g.run('canvas.width'), 1920);
  g.run('navigator.maxTouchPoints = 1; window.innerWidth = 960; window.innerHeight = 540; syncViewport()');
  assert.equal(g.run('canvas.width'), 1200);
  assert.equal(g.run('canvas.height'), 675);
  assert.equal(g.run('drawingScale'), 1.25);
});

test('unused fighter atlases are fetched only when used, and only once', () => {
  const g = game();
  assert.ok(g.requestedImages.includes('assets/angel-atlas-v3.webp'));
  assert.ok(!g.requestedImages.includes('assets/facu-atlas-v1.png'));
  assert.ok(!g.requestedImages.includes('assets/sergio-attack-v4.png'));
  g.run('assets.sergio.src; assets.sergio.src');
  assert.equal(g.requestedImages.filter(src => src === 'assets/sergio-attack-v4.png').length, 1);
});

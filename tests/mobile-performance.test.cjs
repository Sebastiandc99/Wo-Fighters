const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./engine-harness.cjs');

test('mobile canvas caps internal pixels while desktop retains its sharpness', () => {
  const g = game();
  g.run('window.devicePixelRatio = 3; canvas.clientWidth = 960; syncViewport()');
  assert.equal(g.run('canvas.width'), 1920);
  g.run('navigator.maxTouchPoints = 1; window.innerWidth = 960; window.innerHeight = 540; syncViewport()');
  assert.equal(g.run('canvas.width'), 960);
  assert.equal(g.run('canvas.height'), 540);
  assert.equal(g.run('drawingScale'), 1);
});

test('unused fighter atlases are fetched only when used, and only once', () => {
  const g = game();
  assert.ok(g.requestedImages.includes('assets/angel-atlas-v3.webp'));
  assert.ok(!g.requestedImages.includes('assets/facu-atlas-v1.png'));
  assert.ok(!g.requestedImages.includes('assets/sergio-attack-v4.png'));
  g.run('assets.sergio.src; assets.sergio.src');
  assert.equal(g.requestedImages.filter(src => src === 'assets/sergio-attack-v4.png').length, 1);
});

test('mobile clock keeps combat time and walking speed with fewer physics steps', () => {
  function advance(touch) {
    const g = game();
    g.run(`navigator.maxTouchPoints=${touch ? 1 : 0};syncViewport();state="playing";held.right=true;player.x=235;cpu.x=725;roundTime=90;lastTime=0;accumulator=0;`);
    g.run('for(let n=1;n<=60;n++)advanceGameClock(n*1000/60)');
    return { x:g.run('player.x'), time:g.run('roundTime'), power:g.run('player.power') };
  }
  const desktop = advance(false), mobile = advance(true);
  assert.ok(Math.abs(desktop.x - mobile.x) < 8);
  assert.ok(Math.abs(desktop.time - mobile.time) < .02);
  assert.ok(Math.abs(mobile.time - 89) < .03);
  assert.ok(Math.abs(desktop.power - mobile.power) < .1);
});

test('Hormigonazo still hits once and immobilizes the rival at 60 mobile steps', () => {
  const g = game();
  g.run('navigator.maxTouchPoints=1;window.innerWidth=960;window.innerHeight=540;gameMode="solo";startGame("peluche","angel");state="playing";player.x=260;cpu.x=570;player.power=100;aiEnabled=false;syncViewport();attack(player,"special");lastTime=0;accumulator=0;for(let n=1;n<=90;n++)advanceGameClock(n*1000/60)');
  assert.ok(g.run('cpu.health') < 100);
  assert.ok(g.run('cpu.concreteHold') > 2);
  assert.equal(g.run('projectiles.length'), 0);
});

test('menu audio avoids combat decoding; fight preloads only the playable roster', () => {
  const g = game();
  g.run(`window.AudioContext=class { state="running"; }; var loadedCues=[]; loadCombatAudio=name=>loadedCues.push(name); state="title";ensureAudio()`);
  assert.equal(g.run('loadedCues.length'), 0);
  g.run('state="intro";ensureAudio()');
  assert.ok(g.run('loadedCues.includes("voltaic") && loadedCues.includes("punchHit")'));
  assert.ok(!g.run('loadedCues.includes("boomerang") || loadedCues.includes("whip")'));
  const count = g.run('loadedCues.length');
  g.run('ensureAudio()');
  assert.equal(g.run('loadedCues.length'), count);
});

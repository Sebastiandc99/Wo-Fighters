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

test('arena raster is reused while moving, and rebuilt for another arena or density', () => {
  const g=game();
  g.run('navigator.maxTouchPoints=1;syncViewport();draw();var oldStage=stageRaster;cameraX=50;stageTime=2;draw()');
  assert.equal(g.run('stageRaster===oldStage'),true);
  g.run('stageChoice="salinas";draw()');
  assert.equal(g.run('stageRaster===oldStage'),false);
  assert.equal(g.run('stageRaster.surface.width'),1120);
  g.run('document.body.classList.remove("touch-device");navigator.maxTouchPoints=0;window.devicePixelRatio=2;canvas.clientWidth=960;syncViewport();draw()');
  assert.equal(g.run('stageRaster.surface.width'),2240);
});

test('electrical textures retain live geometry and phases with a bounded memory budget', () => {
  const g=game();
  g.run('navigator.maxTouchPoints=1;syncViewport();drawElectricArc(100,100,146,68,1,1.5,2);var savedRay=[...electricRasters.values()][0];drawElectricArc(240,200,286,168,1,1.5,2)');
  assert.equal(g.run('electricRasters.size'),1);
  assert.equal(g.run('[...electricRasters.values()][0]===savedRay'),true);
  g.run('drawElectricArc(240,200,286,168,1.1,1.5,2)');
  assert.equal(g.run('electricRasters.size'),2);
  g.run('for(let n=0;n<400;n++)drawElectricArc(0,0,162,0,n/28,5,n%4)');
  assert.ok(g.run('electricRasterPixels<=ELECTRIC_CACHE_PIXELS'));
  assert.equal(g.run('[...electricRasters.values()].reduce((sum,ray)=>sum+ray.pixels,0)===electricRasterPixels'),true);
  // Expanding/rotating arcs are drawn live instead of rounding their shape to fit a cache.
  g.run('var rayCount=electricRasters.size;drawElectricArc(0,0,75.123,200.456,4,5.123,2)');
  assert.equal(g.run('electricRasters.size===rayCount'),true);
});

test('pose warmup is limited to presentation frames and clears past opponents',()=>{
  const g=game();
  g.run('navigator.maxTouchPoints=1;syncViewport();spriteFrames.set("sergio:1",{});startGame("fernando","tren");var pending=renderWarmQueue.length;warmRenderFrame()');
  assert.equal(g.run('spriteFrames.has("sergio:1")'),false);
  assert.equal(g.run('renderWarmQueue.length'),g.run('pending-1'));
  g.run('state="paused";warmRenderFrame()');
  assert.equal(g.run('renderWarmQueue.length'),g.run('pending-1'));
  g.run('state="intro";while(renderWarmQueue.length)warmRenderFrame()');
  assert.equal(g.run('spriteFrames.has("fernando:29") && spriteFrames.has("tren:13")'),true);
});

test('unchanged HUD values cause no DOM writes; changes still update immediately',()=>{
  const g=game();g.run('updateHud()');
  const health=g.nodes.get('leftHealth').style,timer=g.nodes.get('timer');
  let healthWrites=0,timerWrites=0,healthValue=health.width,timerValue=timer.textContent;
  Object.defineProperty(health,'width',{get:()=>healthValue,set:v=>{healthWrites++;healthValue=v}});
  Object.defineProperty(timer,'textContent',{get:()=>timerValue,set:v=>{timerWrites++;timerValue=v}});
  g.run('for(let n=0;n<100;n++)updateHud()');
  assert.equal(healthWrites,0);assert.equal(timerWrites,0);
  g.run('player.health=73.25;roundTime=42;updateHud()');
  assert.equal(healthValue,'73.25%');assert.equal(timerValue,'42');
  assert.equal(healthWrites,1);assert.equal(timerWrites,1);
});

test('joystick movement measures layout once per gesture and refreshes after rotation',()=>{
  const g=game(),stick=g.joysticks[0];let measurements=0;
  stick.getBoundingClientRect=()=>{measurements++;return {left:0,top:0,width:120,height:120}};
  const event={pointerId:9,pointerType:'touch',clientX:100,clientY:60,preventDefault(){}};
  stick.listeners.pointerdown(event);
  for(let n=0;n<100;n++)stick.listeners.pointermove({...event,clientX:90+n%10});
  assert.equal(measurements,1);assert.equal(g.run('held.right'),true);
  g.run('syncViewport()');stick.listeners.pointermove(event);assert.equal(measurements,2);
  stick.listeners.pointerup(event);assert.equal(g.run('held.right'),false);
  stick.listeners.pointerdown(event);assert.equal(measurements,3);
});

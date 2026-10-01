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
  assert.equal(g.run('document.body.classList.contains("touch-device")'),true);
});

const settleAudio=()=>new Promise(resolve=>setImmediate(resolve));
test('audio decoding yields between files, prioritizes announcements and survives a failure',async()=>{
  const g=game(),pending=[],frames=[],started=[];
  g.sandbox.setTimeout=(callback,delay)=>{frames.push({callback,delay});};
  g.sandbox.decodeForTest=bytes=>{started.push(bytes);return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
  g.run('audioCtx={decodeAudioData:decodeForTest};var jobs=[decodeGameAudio("first",1).catch(()=>null),decodeGameAudio("effect",1),decodeGameAudio("round",3)]');
  await settleAudio();assert.deepEqual(started,['first']);
  pending.shift().reject(Error('bad file'));await settleAudio();
  assert.deepEqual(started,['first']);assert.equal(frames[0].delay,16);
  frames.shift().callback();await settleAudio();assert.deepEqual(started,['first','round']);
  pending.shift().resolve({duration:2});await settleAudio();
  frames.shift().callback();await settleAudio();assert.deepEqual(started,['first','round','effect']);
  pending.shift().resolve({duration:1});await g.run('Promise.all(jobs)');
  await settleAudio();frames.shift().callback();
  assert.equal(g.run('audioDecodeBusy'),false);
});

test('two fighters sharing a sound fetch and decode it once while retaining their cue settings',async()=>{
  const g=game(),frames=[];let requests=0,decodes=0;
  g.sandbox.setTimeout=callback=>frames.push(callback);
  g.sandbox.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
  g.sandbox.decodeForTest=async()=>{decodes++;return {duration:2};};
  g.run('audioCtx={state:"suspended",decodeAudioData:decodeForTest};loadCombatAudio("cable");loadCombatAudio("voltaic")');
  await g.run('Promise.all([COMBAT_AUDIO.cable.loading,COMBAT_AUDIO.voltaic.loading])');
  assert.equal(requests,1);assert.equal(decodes,1);
  assert.equal(g.run('COMBAT_AUDIO.cable.buffer===COMBAT_AUDIO.voltaic.buffer'),true);
  assert.equal(g.run('COMBAT_AUDIO.cable.volume'),1.35);
  assert.equal(g.run('COMBAT_AUDIO.voltaic.start'),.035);
  await settleAudio();frames.shift()();
});

test('failed audio fetches can retry without poisoning the shared decode cache',async()=>{
  const g=game(),frames=[];let requests=0;
  g.sandbox.setTimeout=callback=>frames.push(callback);
  g.sandbox.fetch=async()=>({ok:++requests>1,arrayBuffer:async()=>new ArrayBuffer(4)});
  g.sandbox.decodeForTest=async()=>({duration:2});
  g.run('audioCtx={state:"suspended",decodeAudioData:decodeForTest};loadCombatAudio("cable")');
  await g.run('COMBAT_AUDIO.cable.loading');
  assert.equal(g.run('COMBAT_AUDIO.cable.loading'),null);
  g.run('loadCombatAudio("cable")');await g.run('COMBAT_AUDIO.cable.loading');
  assert.equal(requests,2);assert.equal(g.run('COMBAT_AUDIO.cable.buffer.duration'),2);
  await settleAudio();frames.shift()();
});

test('steady music avoids audio parameter writes but intro transitions and tower fade still apply',()=>{
  const g=game();let writes=0,current=0;
  const gain={gain:{get value(){return Math.fround(current)},set value(value){writes++;current=value}},connect(){return this},disconnect(){}};
  g.sandbox.gainForTest=gain;
  g.run('muted=false;audioCtx={state:"running",currentTime:0,destination:{},createGain:()=>gainForTest,createBufferSource:()=>({connect(){return this},start(){},stop(){},disconnect(){}})};musicTrack={usage:"fight",buffer:{duration:30}};state="playing";for(let n=0;n<120;n++)syncMusic()');
  assert.equal(writes,1);assert.equal(current,.46);
  g.run('state="intro";syncMusic();syncMusic()');assert.equal(writes,2);assert.equal(current,.22);
  g.run('state="tower";musicTrack.usage="tower";tower={paused:false,duration:3,elapsed:2.825};syncMusic()');
  assert.ok(Math.abs(current-.23)<.00001);
  g.run('pauseMusic();state="playing";musicTrack.usage="fight";syncMusic()');assert.equal(current,.46);
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

test('menu audio avoids combat decoding; each fight preloads only its fighters', () => {
  const g = game();
  g.run(`window.AudioContext=class { state="running"; }; var loadedCues=[]; loadCombatAudio=name=>loadedCues.push(name); state="title";ensureAudio()`);
  assert.equal(g.run('loadedCues.length'), 0);
  g.run('startGame("tren","fernando");state="intro";ensureAudio()');
  assert.ok(g.run('loadedCues.includes("voltaic") && loadedCues.includes("punchHit") && loadedCues.includes("fireScream")'));
  assert.ok(!g.run('loadedCues.includes("concreteSuper") || loadedCues.includes("cable")'));
  assert.ok(!g.run('loadedCues.includes("boomerang") || loadedCues.includes("whip")'));
  const count = g.run('loadedCues.length');
  g.run('ensureAudio()');
  assert.equal(g.run('loadedCues.length'), count);
  g.run('startGame("linares","fernando");ensureAudio()');
  assert.equal(g.run('loadedCues.length'),count+2);
  assert.ok(g.run('loadedCues.includes("cable") && loadedCues.includes("transformerSuper")'));
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
  assert.equal(g.run('electricRasters.size'),1);
  assert.equal(g.run('[...electricRasters.values()][0].surface===savedRay.surface'),true);
  assert.equal(g.run('savedRay.phase'),Math.floor(1.1*28));
  g.run('for(let n=0;n<400;n++)drawElectricArc(0,0,162,0,n/28,5,n%4)');
  assert.ok(g.run('electricRasterPixels<=ELECTRIC_CACHE_PIXELS'));
  assert.equal(g.run('[...electricRasters.values()].reduce((sum,ray)=>sum+ray.pixels,0)===electricRasterPixels'),true);
  // Expanding/rotating arcs are drawn live instead of rounding their shape to fit a cache.
  g.run('var rayCount=electricRasters.size;drawElectricArc(0,0,75.123,200.456,4,5.123,2)');
  assert.equal(g.run('electricRasters.size===rayCount'),true);
});

test('successive lightning phases keep their existing surfaces instead of allocating per frame',()=>{
  const g=game();let allocations=0;
  const create=g.sandbox.document.createElement;
  g.sandbox.document.createElement=tag=>{if(tag==='canvas')allocations++;return create(tag);};
  g.run('navigator.maxTouchPoints=1;syncViewport();for(let frame=0;frame<240;frame++)for(let ray=0;ray<5;ray++)drawElectricArc(100,100,146,68,frame/60,1.5,ray)');
  assert.equal(allocations,5);
  assert.equal(g.run('electricRasters.size'),5);
  assert.equal(g.run('[...electricRasters.values()].every(ray=>ray.phase===Math.floor(239/60*28))'),true);
  g.run('prepareFightRendering()');assert.equal(g.run('electricRasterPixels'),0);
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

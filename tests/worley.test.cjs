const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(kind='angel'){
 const g=game();g.run(`startGame('${kind}','${kind==='angel'?'primitivo':'angel'}');state='playing';player.x=260;cpu.x=570;player.power=100;player.specialCooldown=0;`);return g;
}
test('the Wo roster and stages are independent',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('roster')),['angel','primitivo']);
 assert.deepEqual(Array.from(g.run('stageRoster')),['generadores','planta','salinas']);
});
test('ordinary power costs 30 and sends the matching construction attack',()=>{
 for(const [kind,style] of [['angel','beam'],['primitivo','forklift']]){
  const g=setup(kind);
  assert.equal(g.run("held.down=false;attack(player,'special')"),true);
  assert.equal(g.run('player.power'),70);
  assert.equal(g.run('player.specialStyle'),style);
  assert.equal(g.run('powerDamage(player)'),kind==='angel'?23:22);
  g.tick(.4);assert.equal(g.run('projectiles[0].style'),style);
 }
});
test('full bar and down trigger a cinematic that locks controls and lands one hit',()=>{
 for(const [kind,expected] of [['angel',34],['primitivo',35]]){
  const g=setup(kind);
  assert.equal(g.run("held.down=true;attack(player,'special')"),true);
  assert.equal(g.run('player.power'),0);
  assert.equal(g.run('workCinematic.owner.kind'),kind);
  assert.equal(g.run("attack(cpu,'punch')"),false);
  g.tick(1.2);
  assert.equal(g.run('cpu.health'),Math.round((100-expected*100/g.run('stats[cpu.kind].resistance'))*1000)/1000);
  g.tick(.8);assert.equal(g.run('workCinematic'),null);
 }
});
test('less than a full bar cannot launch the cinematic',()=>{
 const g=setup();g.run('player.power=99;held.down=true');
 assert.equal(g.run("attack(player,'special')"),false);
 assert.equal(g.run('workCinematic'),null);
 assert.equal(g.run('player.power'),99);
});
test('both fighters select distinct poses for combat actions',()=>{
 for(const kind of ['angel','primitivo']){
  const g=setup(kind);
  assert.equal(g.run('poseFor(player)'),0);
  assert.equal(g.run("attack(player,'punch');poseFor(player)"),0);
  g.tick(.1);assert.equal(g.run("poseFor(player)"),1);
  g.run('player.action="idle";player.actionTime=0;player.crouching=true');
  assert.equal(g.run('poseFor(player)'),8);
  g.run('player.crouching=false;player.action="hit";player.actionTime=.2');
  assert.equal(g.run('poseFor(player)'),3);
 }
});

function frames(g, seconds) {
 g.run(`for(let i=0;i<${Math.round(seconds*120)};i++){update(STEP);draw();updateHud();}`);
}
test('CPU construction powers render every frame and leave keyboard controls working',()=>{
 for(const kind of ['angel','primitivo']){
  const g=setup(kind);
  g.run("player.x=150;cpu.x=650;attack(cpu,'special')");
  assert.doesNotThrow(()=>frames(g,3));
  assert.equal(g.run('projectiles.length'),0);
  const before=g.run('player.x');g.key('KeyD');frames(g,.3);g.key('KeyD','keyup');
  assert.ok(g.run('player.x')>before+20);
  g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
  assert.ok(g.run('roundTime')<57);
  assert.ok(g.run('fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.animation.motion.rotation))'));
 }
});
test('CPU cinematic started inside update does not spawn an ordinary projectile or freeze animation',()=>{
 for(const kind of ['angel','primitivo']){
  const g=setup(kind);
  g.run("aiEnabled=true;let fired=false;updateAI=()=>{if(!fired){fired=true;cpu.power=100;Math.random=()=>0;attack(cpu,'special')}}");
  frames(g,.4);
  assert.equal(g.run('workCinematic.owner===cpu'),true);
  assert.equal(g.run('projectiles.length'),0);
  frames(g,1.65);assert.equal(g.run('workCinematic'),null);
  frames(g,.5);g.key('KeyW');
  assert.equal(g.run('player.grounded'),false);
  assert.equal(g.run('projectiles.length'),0);
 }
});
test('both local players regain keyboard and touch actions after a super',()=>{
 const g=setup();g.run("gameMode='versus'");
 g.key('KeyS');g.key('KeyL');g.key('KeyS','keyup');frames(g,1.3);
 g.key('KeyW');g.key('Digit7');
 assert.equal(g.run('player.grounded'),true);
 assert.equal(g.run('cpu.queuedAction'),null);
 frames(g,1.1);
 g.key('KeyJ');g.key('Digit8');
 assert.equal(g.run('player.action'),'punch');assert.equal(g.run('cpu.action'),'kick');
 frames(g,1);
 const event={pointerId:1,preventDefault(){}};
 g.taps[0].listeners.pointerdown(event);g.taps2[0].listeners.pointerdown(event);
 assert.equal(g.run('player.grounded'),false);assert.equal(g.run('cpu.grounded'),false);
});
test('a new round clears an interrupted cinematic',()=>{
 const g=setup();g.run("held.down=true;attack(player,'special');startRound()");
 assert.equal(g.run('workCinematic'),null);frames(g,5);
 g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
});
test('only click or arrows choose a fighter; hover and focus do not select',()=>{
 const g=setup();g.run('openSelection()');
 g.run("chooseFighter('angel')");
 g.nodes.get('pick-primitivo').listeners.pointerenter?.();
 g.nodes.get('pick-primitivo').listeners.focus?.();
 assert.equal(g.run('playerChoice'),'angel');
 g.nodes.get('pick-primitivo').listeners.click();assert.equal(g.run('playerChoice'),'primitivo');
 for(const code of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
  g.key(code);assert.ok(['angel','primitivo'].includes(g.run('playerChoice')));
 }
});

test('fighters turn toward each other when sides are exchanged',()=>{
 const g=setup();g.tick(.1);
 assert.equal(g.run('player.facing'),1);assert.equal(g.run('cpu.facing'),-1);
 g.run('player.x=650;cpu.x=250');g.tick(.1);
 assert.equal(g.run('player.facing'),-1);assert.equal(g.run('cpu.facing'),1);
});
test('both fighters use walk, jump, guard, sweep and uppercut animation frames',()=>{
 for(const kind of ['angel','primitivo']) {
  const g=setup(kind);g.key('KeyD');const poses=new Set();
  for(let i=0;i<45;i++){g.tick(1/120);poses.add(g.run('poseFor(player)'));}
  assert.ok(poses.has(6));assert.ok(poses.has(7));
  g.key('KeyD','keyup');g.tick(.2);g.key('KeyI');g.tick(.05);assert.equal(g.run('poseFor(player)'),9);
  g.key('KeyI','keyup');g.key('KeyW');assert.equal(g.run('poseFor(player)'),10);
  g.key('KeyK');g.tick(.1);assert.equal(g.run('poseFor(player)'),13);
  g.tick(1.3);g.key('KeyS');g.key('KeyK');g.tick(.15);assert.equal(g.run('poseFor(player)'),5);
  g.tick(.7);g.key('KeyJ');g.tick(.15);assert.equal(g.run('poseFor(player)'),12);
 }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',direction=1){const g=game();g.run(`gameMode='versus';startGame('peluche','${rival}');state='playing';player.x=480;cpu.x=480+${direction}*240;player.facing=${direction};cpu.facing=${-direction};player.power=100`);return g;}
test('Hormigonazo holds each rival in both directions with minimal damage and unchanged cost/range',()=>{
 for(const rival of ['angel','primitivo','peluche','tren'])for(const dir of [-1,1]){
  const g=setup(rival,dir);g.run("attack(player,'special')");assert.equal(g.run('player.power'),70);assert.equal(g.run('stats.peluche.powerRange'),532);
  g.tick(.65);assert.ok(g.run('cpu.concreteHold')>2.7);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,2))*1000)/1000'));
  assert.equal(g.run('renderedFighter(cpu).concrete'),true);assert.doesNotThrow(()=>g.run('draw()'));
  const x=g.run('cpu.x'),energy=g.run('cpu.power');g.key('ArrowLeft');g.key('ArrowUp');g.key('Digit7');g.key('Digit8');g.key('Digit9');g.key('Digit5');g.key('Digit0');g.tick(.5);
  assert.equal(g.run('cpu.x'),x);assert.equal(g.run('cpu.grounded'),true);assert.equal(g.run('cpu.guarding'),false);assert.equal(g.run('cpu.action'),'hit');assert.equal(g.run('cpu.queuedAction'),null);assert.ok(g.run('cpu.power')>=energy);
  g.key('ArrowLeft','keyup');g.key('Digit0','keyup');g.tick(3);assert.equal(g.run('cpu.concreteHold'),0);assert.equal(g.run('cpu.concreteCoat'),0);g.key('Digit7','keyup');g.key('Digit7');assert.equal(g.run('cpu.action'),'punch');
 }
});
test('three second hold pauses, accepts repeated damage, and hits cannot release or restart the timer',()=>{
 const g=setup();g.run('applyConcreteHold(cpu)');g.tick(1);assert.ok(Math.abs(g.run('cpu.concreteHold')-2)<1e-6);
 const x=g.run('cpu.x');g.run('hit(cpu,5,250,-420,player,{knockdown:true,attackType:"uppercut"})');assert.equal(g.run('cpu.x'),x);assert.equal(g.run('cpu.knockdown'),null);assert.equal(g.run('cpu.vx'),0);assert.equal(g.run('cpu.vy'),0);
 const hp=g.run('cpu.health');g.tick(.2);g.run('hit(cpu,5,200,0,player,{attackType:"punch"})');assert.ok(g.run('cpu.health')<hp);assert.ok(g.run('cpu.concreteHold')<2);
 g.run('togglePause()');const left=g.run('cpu.concreteHold');g.tick(4);assert.equal(g.run('cpu.concreteHold'),left);g.run('togglePause()');g.tick(2.1);assert.equal(g.run('cpu.concreteHold'),0);assert.equal(g.run('cpu.action'),'idle');
 const precise=setup();precise.run('applyConcreteHold(cpu)');precise.tick(2.99);assert.ok(precise.run('cpu.concreteHold')>0);precise.tick(.01);assert.equal(precise.run('cpu.concreteHold'),0);
});
test('blocking, invulnerability and jumping avoid the concrete hold',()=>{
 for(const defense of ['held2.guard=true','cpu.invuln=2']){
  const g=setup();g.run(defense+";attack(player,'special')");g.tick(1);assert.equal(g.run('cpu.concreteHold'),0);assert.equal(g.run('cpu.concreteCoat'),0);assert.ok(g.run('cpu.health')>99);
 }
 const jump=setup();jump.run("attack(player,'special')");jump.tick(.05);jump.run('jump(cpu)');jump.tick(.95);assert.equal(jump.run('cpu.concreteHold'),0);assert.equal(jump.run('cpu.health'),100);
});
test('Peluche CPU can immobilize player one; keyboard and touch recover and round reset clears the hold',()=>{
 const g=setup();g.run("gameMode='solo';startGame('tren','peluche');state='playing';player.x=480;cpu.x=700;player.facing=1;cpu.facing=-1;cpu.power=40;attack(cpu,'special')");g.tick(.65);assert.ok(g.run('player.concreteHold')>0);
 g.taps[0].listeners.pointerdown({pointerId:1,preventDefault(){}});assert.equal(g.run('player.grounded'),true);g.key('KeyJ');assert.equal(g.run('player.action'),'hit');
 g.tick(3.1);g.key('KeyJ','keyup');g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
 g.run('applyConcreteHold(player);startRound()');assert.equal(g.run('player.concreteHold'),0);assert.equal(g.run('player.concreteCoat'),0);
});
test('KO during a hold resolves normally and cannot leave a gray frozen fighter in the next round',()=>{
 const g=setup();g.run('applyConcreteHold(cpu);cpu.health=.1;hit(cpu,5,100,0,player)');assert.equal(g.run('state'),'roundOver');assert.equal(g.run('cpu.concreteHold'),0);g.run('startRound()');assert.equal(g.run('cpu.health'),100);assert.equal(g.run('cpu.concreteHold'),0);
});
test('Angel uses lower / raise / lower signals in sync with the hook and regains controls',()=>{
 const g=setup();g.run("startGame('angel','tren');state='playing';player.power=100;held.down=true;attack(player,'special')");assert.equal(g.run('poseFor(player)'),16);
 g.tick(.5);assert.equal(g.run('poseFor(player)'),17);assert.doesNotThrow(()=>g.run('draw()'));g.tick(.4);assert.equal(g.run('poseFor(player)'),16);
 g.tick(1);assert.equal(g.run('workCinematic'),null);g.run('held.down=false');g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
});
test('selection and pause communicate minimal damage and three-second immobilization',()=>{
 const g=setup();g.run("chooseFighter('peluche');togglePause()");assert.match(g.nodes.get('selectionGuide').innerHTML,/INMÓVIL · 3 s/);assert.match(g.nodes.get('pausePowers1').innerHTML,/Inmoviliza 3 s/);
});

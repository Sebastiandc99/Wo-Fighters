const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',direction=1){const g=game();g.run(`gameMode='versus';startGame('gabriel','${rival}');state='playing';player.x=480;cpu.x=480+${direction}*260;player.facing=${direction};cpu.facing=${-direction};player.power=100;`);return g;}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud();}`);}
test('Gabriel attributes, relative height, selection, atlas and tournament',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.gabriel.normalDamage,stats.gabriel.resistance,stats.gabriel.agility,stats.gabriel.meleeReach,stats.gabriel.recovery,stats.gabriel.powerDamage,stats.gabriel.superDamage]')),[8,94,7,5,.56,23,34]);
 assert.ok(g.run('stats.peluche.size<stats.gabriel.size && stats.gabriel.size<stats.linares.size && stats.peluche.height<stats.gabriel.height && stats.gabriel.height<stats.linares.height'));
 g.run("openModeSelection();gameMode='solo';openSelection()");g.nodes.get('pick-gabriel').listeners.click();assert.equal(g.run('playerChoice'),'gabriel');assert.match(g.nodes.get('selectionGuide').innerHTML,/Camino Crítico/);assert.match(g.nodes.get('selectionGuide').innerHTML,/Gantt Impacto/);
 g.run('beginGame()');g.tick(g.run('tower.duration')+.05);assert.deepEqual(Array.from(g.run('campaign.opponents')).sort(),['angel','fernando','german','linares','peluche','primitivo','tren']);
 assert.doesNotThrow(()=>g.run('for(let pose=0;pose<=18;pose++)drawSpriteFrame({...renderedFighter(player),pose,fromPose:pose,mix:1})'));
 assert.ok(g.requestedImages.includes('assets/gabriel-atlas-v1.webp'));
});
test('critical path reuses Jairo schedule, launch timing and original sounds, costs30 and damages23 once',()=>{
 for(const rival of ['angel','primitivo','peluche','tren','linares','gabriel','fernando','german'])for(const d of [-1,1]){
  const g=setup(rival,d);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),70);
  assert.deepEqual(Array.from(g.run('[player.moveSpec.startup,player.moveSpec.active,player.moveSpec.recovery]')),[.22,.05,.56]);
  frames(g,.24);assert.equal(g.run('projectiles[0].style'),'critical');assert.equal(g.run('projectiles[0].sound.name'),'critical');
  frames(g,.45);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,23))*1000)/1000'));
  const hp=g.run('cpu.health');frames(g,1.1);assert.equal(g.run('cpu.health'),hp);assert.equal(g.run('projectiles.length'),0);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');assert.ok(g.run('player.moveSpec.recovery<.3'));
 }
 const g=setup();assert.equal(g.run('COMBAT_AUDIO.critical.src'),'assets/jairo-critical-v1.mp3');assert.equal(g.run('COMBAT_AUDIO.crash.src'),'assets/jairo-crash-v1.mp3');
});
test('critical path requires energy, respects 8/10 reach, guard and jump',()=>{
 const low=setup();low.run('player.power=29');assert.equal(low.run("attack(player,'special')"),false);
 const far=setup();far.run("player.x=200;cpu.x=900;attack(player,'special')");frames(far,1.5);assert.equal(far.run('cpu.health'),100);
 const guard=setup();guard.run("held2.guard=true;attack(player,'special')");frames(guard,.8);assert.equal(guard.run('cpu.health'),guard.run('Math.round((100-damageTaken(cpu,1))*1000)/1000'));
 const jump=setup();jump.key('ArrowUp');jump.run("attack(player,'special')");frames(jump,.45);assert.equal(jump.run('cpu.health'),100);frames(jump,.5);assert.ok(jump.run('cpu.health')<100); // Jairo's sustained line can catch the landing.
});
test('Gantt costs100, locks both controls, delivers four hits totalling34 and final knockdown',()=>{
 for(const d of [-1,1]){
  const g=setup('primitivo',d);g.run('held.down=true;player.power=99');assert.equal(g.run("attack(player,'special')"),false);
  g.run('player.power=100');assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);assert.equal(g.run('poseFor(player)'),17);assert.equal(g.run("attack(cpu,'punch')"),false);
  frames(g,1.1);assert.equal(g.run('cpu.health'),100);assert.equal(g.run('workCinematic.sound.name'),'crash');
  for(const [step,raw,hits] of [[.1,6,1],[.3,12,2],[.3,20,3],[.3,34,4]]){frames(g,step);assert.equal(g.run('workCinematic.hits'),hits);assert.ok(Math.abs(g.run('cpu.health')-g.run(`100-damageTaken(cpu,${raw})`))<.003);}
  const hp=g.run('cpu.health');g.run('togglePause()');const t=g.run('workCinematic.elapsed');frames(g,.3);assert.equal(g.run('workCinematic.elapsed'),t);g.run('togglePause()');frames(g,.3);assert.ok(g.run('cpu.knockdown'));assert.equal(g.run('cpu.knockdown.direction'),d);
  frames(g,2.6);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.health'),hp);g.run('held.down=false');g.key('KeyJ');g.key('Digit7');assert.equal(g.run('player.action'),'punch');assert.equal(g.run('cpu.action'),'punch');
 }
 const far=setup();far.run('cpu.x=player.x+700;held.down=true');assert.equal(far.run("attack(player,'special')"),false);assert.equal(far.run('player.power'),100);
});
test('Gantt supports CPU and 2P touch, deterministic drawing, KO and menu cleanup',()=>{
 const g=setup();g.run("gameMode='solo';startGame('angel','gabriel');state='playing';cpu.power=100;Math.random=()=>0;attack(cpu,'special')");assert.equal(g.run('workCinematic.owner'),g.run('cpu'));frames(g,.8);
 g.run('const before=JSON.stringify([workCinematic.elapsed,cpu.power,player.health]);draw();draw()');assert.equal(g.run('before===JSON.stringify([workCinematic.elapsed,cpu.power,player.health])'),true);
 g.run('mainMenu()');assert.equal(g.run('combatSounds.size'),0);assert.equal(g.run('workCinematic'),null);
 const touch=setup('gabriel');touch.run('held2.down=true;cpu.power=100');touch.taps2[3].listeners.pointerdown({pointerId:1,preventDefault(){}});assert.equal(touch.run('workCinematic.owner'),touch.run('cpu'));frames(touch,4);
 const ko=setup();ko.run("cpu.health=2;held.down=true;attack(player,'special')");frames(ko,1.4);assert.notEqual(ko.run('state'),'playing');assert.equal(ko.run('cpu.health'),0);assert.equal(ko.run('workCinematic'),null);
});

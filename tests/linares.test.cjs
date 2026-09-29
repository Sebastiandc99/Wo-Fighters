const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',d=1){const g=game();g.run(`gameMode='versus';startGame('linares','${rival}');state='playing';player.x=480;cpu.x=480+${d}*260;player.facing=${d};cpu.facing=${-d};player.power=100;`);return g;}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud();}`);}
test('Linares selection, attributes, atlas and solo tournament are integrated',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.linares.normalDamage,stats.linares.resistance,stats.linares.agility,stats.linares.meleeReach,stats.linares.recovery,stats.linares.powerDamage,stats.linares.superDamage]')),[8,90,8,6,.54,23,34]);
 g.run("openModeSelection();gameMode='solo';openSelection()");g.nodes.get('pick-linares').listeners.click();assert.equal(g.run('playerChoice'),'linares');
 assert.match(g.nodes.get('selectionGuide').innerHTML,/Descarga de Transformador/);
 g.run('beginGame()');assert.deepEqual(Array.from(g.run('campaign.opponents')).sort(),['angel','gabriel','peluche','primitivo','tren']);
 assert.doesNotThrow(()=>g.run('for(let pose=0;pose<=18;pose++)drawSpriteFrame({...renderedFighter(player),pose,fromPose:pose,mix:1})'));
});
test('cable costs 30, hits each opponent once in both directions and returns without locking controls',()=>{
 for(const rival of ['angel','primitivo','peluche','tren','linares'])for(const d of [-1,1]){
  const g=setup(rival,d);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),70);assert.equal(g.run('player.moveSpec.recovery'),.54);
  frames(g,.55);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,23))*1000)/1000'));assert.ok(g.run('cpu.electricCoat')>0);
  const hp=g.run('cpu.health');frames(g,1.1);assert.equal(g.run('cpu.health'),hp);assert.equal(g.run('projectiles.length'),0);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
 }
});
test('cable has bounded reach, requires energy, can be guarded, jumped and evaded',()=>{
 const low=setup();low.run('player.power=29');assert.equal(low.run("attack(player,'special')"),false);
 const far=setup();far.run("player.x=200;cpu.x=900;attack(player,'special')");frames(far,1.4);assert.equal(far.run('cpu.health'),100);
 const guard=setup();guard.run("held2.guard=true;attack(player,'special')");frames(guard,.8);assert.equal(guard.run('cpu.health'),guard.run('Math.round((100-damageTaken(cpu,1))*1000)/1000'));
 const jump=setup();jump.key('ArrowUp');jump.run("attack(player,'special')");frames(jump,.8);assert.equal(jump.run('cpu.health'),100);
 const evade=setup();evade.run("cpu.x=player.x+175;attack(cpu,'roll');attack(player,'special')");frames(evade,.6);assert.equal(evade.run('cpu.health'),100);
});
test('transformer uses full energy, range 9/10, freezes opponent, hits once and restores controls',()=>{
 for(const d of [-1,1]){
  const g=setup('primitivo',d);g.run('held.down=true;player.power=99');assert.equal(g.run("attack(player,'special')"),false);
  g.run('player.power=100');assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);assert.equal(g.run('poseFor(player)'),17);assert.equal(g.run("attack(cpu,'punch')"),false);
  frames(g,1.9);assert.equal(g.run('cpu.health'),100);const x=g.run('cpu.x');g.key('ArrowLeft');frames(g,.1);assert.equal(g.run('cpu.x'),x);g.key('ArrowLeft','keyup');
  frames(g,.1);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,34))*1000)/1000'));const hp=g.run('cpu.health');assert.equal(g.run('hitStop'),0);
  g.run('togglePause()');const t=g.run('workCinematic.elapsed');frames(g,.3);assert.equal(g.run('workCinematic.elapsed'),t);g.run('togglePause()');frames(g,.5);assert.ok(g.run('cpu.knockdown'));
  frames(g,2.6);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.health'),hp);g.run('held.down=false');g.key('KeyJ');g.key('Digit7');assert.equal(g.run('player.action'),'punch');assert.equal(g.run('cpu.action'),'punch');
 }
 const far=setup();far.run('cpu.x=player.x+700;held.down=true');assert.equal(far.run("attack(player,'special')"),false);assert.equal(far.run('player.power'),100);
});
test('CPU and mobile Linares attacks render and clean up; draw does not change simulation',()=>{
 const g=setup();g.run("gameMode='solo';startGame('angel','linares');state='playing';cpu.power=100;Math.random=()=>0;attack(cpu,'special')");assert.equal(g.run('workCinematic.owner'),g.run('cpu'));frames(g,.8);
 g.run('const before=JSON.stringify([workCinematic.elapsed,cpu.power,player.health]);draw();draw()');assert.equal(g.run('before===JSON.stringify([workCinematic.elapsed,cpu.power,player.health])'),true);
 frames(g,3.6);g.run('mainMenu()');assert.equal(g.run('combatSounds.size'),0);
 const mobile=setup();mobile.run('navigator.maxTouchPoints=1;syncViewport();attack(player,"special");for(let i=0;i<90;i++){update(1/60);draw()}');assert.ok(mobile.run('cpu.health')<100);assert.equal(mobile.run('projectiles.length'),0);
});

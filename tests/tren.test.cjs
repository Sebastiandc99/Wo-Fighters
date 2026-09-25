const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',direction=1){const g=game();g.run(`gameMode='versus';startGame('tren','${rival}');state='playing';player.x=480;cpu.x=480+${direction}*260;player.facing=${direction};cpu.facing=${-direction};player.power=100;`);return g;}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud()}`);}
test('Tren has requested attributes, taller proportions, clickable selection and arcade guide',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.tren.normalDamage,stats.tren.resistance,stats.tren.agility,stats.tren.meleeReach,stats.tren.recovery,stats.tren.powerDamage,stats.tren.superDamage]')),[8,88,8,6,.52,24,34]);
 assert.ok(g.run('stats.peluche.size<stats.angel.size && stats.angel.size<stats.tren.size && stats.tren.size<stats.primitivo.size'));
 g.run("openModeSelection();gameMode='solo';openSelection();chooseFighter('angel')");const tile=g.nodes.get('pick-tren');tile.listeners.pointerenter?.();assert.equal(g.run('playerChoice'),'angel');tile.listeners.click();assert.equal(g.run('playerChoice'),'tren');
 const guide=g.nodes.get('selectionGuide').innerHTML;assert.match(guide,/Arco Voltaico/);assert.match(guide,/Tormenta Eléctrica/);assert.match(guide,/tren-voltaic.svg/);assert.match(guide,/aria-valuenow="88"/);
 g.run('beginGame()');assert.deepEqual(Array.from(g.run('campaign.opponents')).sort(),['angel','peluche','primitivo']);
});
test('Arco Voltaico costs 30, hits each fighter once in either direction, and releases controls',()=>{
 for(const rival of ['angel','primitivo','peluche','tren'])for(const d of [-1,1]){
  const g=setup(rival,d);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),70);assert.equal(g.run('player.moveSpec.recovery'),.52);
  frames(g,.2);assert.equal(g.run('projectiles[0].damage'),24);assert.equal(g.run('projectiles[0].sound.name'),'voltaic');
  frames(g,.35);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,24))*1000)/1000'));assert.ok(g.run('cpu.electricCoat')>0);
  const health=g.run('cpu.health');frames(g,.9);assert.equal(g.run('cpu.health'),health);assert.equal(g.run('projectiles.length'),0);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
 }
});
test('fast electrical sweep detects a crossed rival; range cannot exceed 8/10',()=>{
 const g=setup();g.run("spawnVoltaic(player);updateVoltaic(projectiles[0],.18)");assert.ok(g.run('cpu.health')<100);
 const far=setup();far.run("player.x=300;cpu.x=1050;attack(player,'special')");frames(far,1.4);assert.equal(far.run('cpu.health'),100);assert.equal(far.run('projectiles.length'),0);
});
test('common bolt can be blocked, jumped and evaded',()=>{
 const guard=setup();guard.run("held2.guard=true;attack(player,'special')");frames(guard,.7);assert.equal(guard.run('cpu.health'),guard.run('Math.round((100-damageTaken(cpu,1))*1000)/1000'));
 const jump=setup();jump.key('ArrowUp');jump.run("attack(player,'special')");frames(jump,.7);assert.equal(jump.run('cpu.health'),100);
 const evade=setup();evade.run("cpu.x=player.x+175;attack(cpu,'roll');attack(player,'special')");frames(evade,.6);assert.equal(evade.run('cpu.health'),100);
});
test('storm needs full energy and range; shows both arms up, locks controls, hits once then knocks down',()=>{
 for(const d of [-1,1]){
  const g=setup('primitivo',d);g.run('held.down=true;player.power=99');assert.equal(g.run("attack(player,'special')"),false);
  g.run('player.power=100');assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);assert.equal(g.run('poseFor(player)'),17);assert.equal(g.run("attack(cpu,'punch')"),false);
  frames(g,1.8);assert.equal(g.run('cpu.health'),100);const x=g.run('cpu.x');g.key('ArrowLeft');frames(g,.1);assert.equal(g.run('cpu.x'),x);g.key('ArrowLeft','keyup');
  frames(g,.1);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,34))*1000)/1000'));assert.equal(g.run('hitStop'),0);assert.ok(Math.abs(g.run('workCinematic.elapsed-workCinematic.sound.elapsed'))<1e-6);
  const hp=g.run('cpu.health');g.run('togglePause()');const t=g.run('workCinematic.elapsed');frames(g,.3);assert.equal(g.run('workCinematic.elapsed'),t);g.run('togglePause()');frames(g,.5);assert.ok(g.run('cpu.knockdown'));assert.equal(g.run('cpu.knockdown.direction'),d);
  frames(g,2.6);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.knockdown'),null);assert.equal(g.run('cpu.health'),hp);g.key('KeyS','keyup');g.run('held.down=false');g.key('KeyJ');g.key('Digit7');assert.equal(g.run('player.action'),'punch');assert.equal(g.run('cpu.action'),'punch');
 }
 const far=setup();far.run('cpu.x=player.x+700;held.down=true');assert.equal(far.run("attack(player,'special')"),false);assert.equal(far.run('player.power'),100);
});
test('CPU storm, all atlas poses and guide render; pause and menu clear electrical audio',()=>{
 const g=setup();g.run("gameMode='solo';startGame('peluche','tren');state='playing';cpu.power=100;Math.random=()=>0;attack(cpu,'special')");assert.equal(g.run('workCinematic.owner'),g.run('cpu'));
 frames(g,.6);g.run('updatePauseGuide()');assert.match(g.nodes.get('pausePowers2').innerHTML,/Tormenta Eléctrica/);
 assert.doesNotThrow(()=>g.run('for(let pose=0;pose<=18;pose++)drawSpriteFrame({...renderedFighter(cpu),pose,fromPose:pose,mix:1})'));
 g.run('const before=JSON.stringify([workCinematic.elapsed,cpu.power,player.health]);draw();draw()');assert.equal(g.run('before===JSON.stringify([workCinematic.elapsed,cpu.power,player.health])'),true);
 frames(g,3.9);assert.equal(g.run('workCinematic'),null);g.key('KeyW');assert.equal(g.run('player.grounded'),false);g.run('mainMenu()');assert.equal(g.run('combatSounds.size'),0);
});

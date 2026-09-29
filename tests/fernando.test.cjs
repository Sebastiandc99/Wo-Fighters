const {test}=require('node:test');const assert=require('node:assert/strict');const {game}=require('./engine-harness.cjs');
function setup(rival='angel',d=1){const g=game();g.run(`gameMode='versus';startGame('fernando','${rival}');state='playing';player.x=480;cpu.x=480+${d}*260;player.facing=${d};cpu.facing=${-d};player.power=100`);return g;}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud()}`);}
test('Fernando keeps facing his opponent during frontal hit reactions on both sides',()=>{
 for(const d of [-1,1]){
  const g=setup('linares',d);
  g.run(`hit(player,8,${-d}*65,0,cpu,{sourceX:cpu.x,direction:cpu.facing,x:player.x,y:player.y-100})`);
  frames(g,.10);
  assert.equal(g.run('player.action'),'hit');assert.equal(g.run('player.facing'),d);
  assert.equal(g.run('poseFor(player)'),3);
  assert.equal(g.run('assets.fernandoHit.src'),'assets/fernando-hit-v2.webp');
 }
});
test('common flame impacts persist briefly without repeated damage and clear on menu exit',()=>{
 const g=setup();g.run("attack(player,'special')");frames(g,.54);
 assert.ok(g.run('projectiles.some(p=>p.cigarettes.some(c=>c.done && c.impact && p.age-c.doneAt<.24))'));
 const hp=g.run('cpu.health');g.run('draw();draw()');assert.equal(g.run('cpu.health'),hp);
 frames(g,.7);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,21))*1000)/1000'));
 assert.equal(g.run('projectiles.length'),0);
 g.run("player.power=100;attack(player,'special')");frames(g,.19);g.run('mainMenu()');
 assert.equal(g.run('projectiles.length'),0);assert.equal(g.run('combatSounds.size'),0);
});
test('Fernando stats, stature, selection and six-rival tournament',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.fernando.normalDamage,stats.fernando.resistance,stats.fernando.agility,stats.fernando.meleeReach,stats.fernando.recovery,stats.fernando.powerDamage,stats.fernando.superDamage]')),[9,98,6,5,.60,21,33]);assert.equal(g.run('stats.fernando.height'),g.run('stats.linares.height'));
 g.run("openModeSelection();gameMode='solo';openSelection()");g.nodes.get('pick-fernando').listeners.click();assert.equal(g.run('playerChoice'),'fernando');assert.match(g.nodes.get('selectionGuide').innerHTML,/Lluvia de Cigarrillos/);assert.match(g.nodes.get('selectionGuide').innerHTML,/Incendio de Obra/);
 g.run('beginGame()');assert.equal(g.run('campaign.opponents.length'),6);assert.equal(g.run("campaign.opponents.includes('fernando')"),false);
 assert.doesNotThrow(()=>g.run('for(let pose=0;pose<=19;pose++)drawSpriteFrame({...renderedFighter(player),pose,fromPose:pose,mix:1})'));
});
test('three consecutive cigarettes cost30, total21 damage, are fast and do not hit twice',()=>{
 for(const rival of ['angel','primitivo','peluche','tren','linares','gabriel','fernando'])for(const d of [-1,1]){
  const g=setup(rival,d);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),70);assert.equal(g.run('player.moveSpec.startup'),.14);assert.equal(g.run('player.moveSpec.recovery'),.60);
  frames(g,.18);assert.equal(g.run('projectiles[0].cigarettes.length'),3);assert.equal(g.run('projectiles[0].sound.name'),'cigarettes');frames(g,1.1);
  assert.ok(Math.abs(g.run('cpu.health')-g.run('100-damageTaken(cpu,21)'))<.003,`${rival} direction ${d}`);
  const hp=g.run('cpu.health');frames(g,.6);assert.equal(g.run('cpu.health'),hp);assert.equal(g.run('projectiles.length'),0);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');assert.ok(g.run('player.moveSpec.recovery<.3'));
 }
});
test('cigarettes require energy, respect7/10 range and can be blocked or jumped',()=>{
 const low=setup();low.run('player.power=29');assert.equal(low.run("attack(player,'special')"),false);
 const far=setup();far.run("player.x=200;cpu.x=850;attack(player,'special')");frames(far,1.7);assert.equal(far.run('cpu.health'),100);
 const guard=setup();guard.run("held2.guard=true;attack(player,'special')");frames(guard,1.2);assert.ok(Math.abs(guard.run('cpu.health')-guard.run('100-3*damageTaken(cpu,1)'))<.003);
 const jump=setup();jump.key('ArrowUp');jump.run("attack(player,'special')");frames(jump,1.2);assert.equal(jump.run('cpu.health'),100);
});
test('fire super costs100, respects8/10 range, freezes input, hits33 once and knocks down',()=>{
 for(const d of [-1,1]){
  const g=setup('primitivo',d);g.run('held.down=true;player.power=99');assert.equal(g.run("attack(player,'special')"),false);g.run('player.power=100');assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);assert.equal(g.run('poseFor(player)'),17);
  assert.equal(g.run("attack(cpu,'punch')"),false);g.key('ArrowLeft');const x=g.run('cpu.x');frames(g,1.8);assert.equal(g.run('cpu.x'),x);assert.equal(g.run('cpu.health'),100);
  frames(g,.1);assert.equal(g.run('cpu.health'),g.run('Math.round((100-damageTaken(cpu,33))*1000)/1000'));const hp=g.run('cpu.health');assert.equal(g.run('hitStop'),0);assert.equal(g.run('workCinematic.sound.name'),'fireSuper');
  g.run('togglePause()');const age=g.run('workCinematic.elapsed');const sound=g.run('workCinematic.sound.elapsed');frames(g,.5);assert.equal(g.run('workCinematic.elapsed'),age);assert.equal(g.run('workCinematic.sound.elapsed'),sound);g.run('togglePause()');g.key('ArrowLeft','keyup');frames(g,.4);assert.ok(g.run('cpu.knockdown'));frames(g,2.8);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.health'),hp);g.run('held.down=false');g.key('KeyJ');g.key('Digit7');assert.equal(g.run('player.action'),'punch');assert.equal(g.run('cpu.action'),'punch');
 }
 const far=setup();far.run('cpu.x=player.x+650;held.down=true');assert.equal(far.run("attack(player,'special')"),false);assert.equal(far.run('player.power'),100);
});
test('Fernando standing and crouching guard differs from idle; two-player touch attacks work',()=>{
 const g=setup('fernando');g.key('KeyI');g.key('Digit0');frames(g,.2);assert.equal(g.run('poseFor(player)'),9);assert.equal(g.run('poseFor(cpu)'),9);g.key('KeyS');g.key('ArrowDown');frames(g,.2);assert.equal(g.run('poseFor(player)'),19);assert.equal(g.run('poseFor(cpu)'),19);assert.ok(g.run('fighterMotion(player).scaleY>.9'));
 g.key('KeyI','keyup');g.key('KeyS','keyup');g.key('Digit0','keyup');g.key('ArrowDown','keyup');frames(g,.2);assert.equal(g.run('poseFor(player)'),0);
 g.run('held2.down=true;cpu.power=100');g.taps2[3].listeners.pointerdown({pointerId:1,preventDefault(){}});assert.equal(g.run('workCinematic.owner'),g.run('cpu'));frames(g,4);
});
test('CPU fire, deterministic draw, KO and menu stop all owned cues',()=>{
 const g=setup();g.run("gameMode='solo';startGame('angel','fernando');state='playing';cpu.power=100;Math.random=()=>0;attack(cpu,'special')");assert.equal(g.run('workCinematic.owner'),g.run('cpu'));frames(g,.6);g.run('const before=JSON.stringify([workCinematic.elapsed,cpu.power,player.health]);draw();draw()');assert.equal(g.run('before===JSON.stringify([workCinematic.elapsed,cpu.power,player.health])'),true);g.run('mainMenu()');assert.equal(g.run('combatSounds.size'),0);assert.equal(g.run('workCinematic'),null);
 const ko=setup();ko.run("cpu.health=1;held.down=true;attack(player,'special')");frames(ko,2);assert.equal(ko.run('cpu.health'),0);assert.equal(ko.run('workCinematic'),null);
});

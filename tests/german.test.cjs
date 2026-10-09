const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',dir=1,slot=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?'german':rival}','${slot===2?'german':rival}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=480;target.x=480+${dir}*260;owner.facing=${dir};target.facing=${-dir};owner.power=100;`);return g;
}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud();}`);}
test('Germán attributes, selection, portraits and seven-rival tower are integrated',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.german.normalDamage,stats.german.resistance,stats.german.agility,stats.german.meleeReach,stats.german.recovery,stats.german.powerDamage,stats.german.superDamage,stats.german.powerRange,stats.german.superRange]')),[10,116,4,6,.7,22,34,608,608]);
 g.run("gameMode='solo';openSelection()");g.nodes.get('pick-german').listeners.click();assert.equal(g.run('playerChoice'),'german');assert.match(g.nodes.get('selectionGuide').innerHTML,/german-stop.svg/);
 g.run('beginGame()');assert.equal(g.run('campaign.opponents.length'),7);assert.equal(g.run('new Set(campaign.opponents).size'),7);assert.equal(g.run("campaign.opponents.includes('german')"),false);
 for(let i=0;i<7;i++)g.run(`campaign.index=${i};showTournamentTower();drawTournamentTower();`);
 assert.equal(g.run('tower.final'),true);assert.equal(g.run('difficulty().name'),'LEYENDA');assert.equal(g.run('TOWER_FLOORS.every(Number.isFinite)'),true);
});
test('chain costs 30, reaches every stature both ways once and releases the restrained target',()=>{
 for(const rival of ['angel','primitivo','peluche','tren','linares','gabriel','fernando','german'])for(const dir of [-1,1])for(const slot of [1,2]){
  const g=setup(rival,dir,slot);assert.equal(g.run("attack(owner,'special')"),true);assert.equal(g.run('owner.power'),70);assert.equal(g.run('owner.moveSpec.recovery'),.7);
  frames(g,.40);assert.ok(g.run('target.safetyHold')>0);const hp=g.run('target.health');assert.equal(hp,g.run('Math.round((100-damageTaken(target,22))*1000)/1000'));
  const x=g.run('target.x');g.run("(target===player?held:held2).left=true");frames(g,.12);assert.equal(g.run('target.x'),x);assert.equal(g.run("attack(target,'punch')"),false);
  g.run('(target===player?held:held2).left=false');frames(g,3.25);assert.equal(g.run('target.health'),hp);assert.equal(g.run('target.safetyHold'),0);assert.equal(g.run('projectiles.length'),0);assert.equal(g.run("attack(target,'punch')"),true);
 }
});
test('chain respects energy, range, guard, jump and roll without applying restraint on defense',()=>{
 const low=setup();low.run('owner.power=29');assert.equal(low.run("attack(owner,'special')"),false);
 const far=setup();far.run("owner.x=100;target.x=800;attack(owner,'special')");frames(far,1.4);assert.equal(far.run('target.health'),100);
 const guard=setup();guard.run("held2.guard=true;attack(owner,'special')");frames(guard,.8);assert.equal(guard.run('target.health'),guard.run('Math.round((100-damageTaken(target,1))*1000)/1000'));assert.equal(guard.run('target.safetyHold'),0);
 const jump=setup();jump.key('ArrowUp');jump.run("attack(owner,'special')");frames(jump,.85);assert.equal(jump.run('target.health'),100);
 const roll=setup();roll.run("target.x=owner.x+175;attack(target,'roll');attack(owner,'special')");frames(roll,.6);assert.equal(roll.run('target.health'),100);
});
test('Parada Total needs 100 and range 8/10, locks controls, hits once and resumes after pause',()=>{
 for(const dir of [-1,1])for(const slot of [1,2]){
  const g=setup('primitivo',dir,slot);g.run('(owner===player?held:held2).down=true;owner.power=99');assert.equal(g.run("attack(owner,'special')"),false);g.run('owner.power=100');assert.equal(g.run("attack(owner,'special')"),true);assert.equal(g.run('owner.power'),0);assert.equal(g.run('poseFor(owner)'),16);
  frames(g,.55);assert.equal(g.run('poseFor(owner)'),17);assert.equal(g.run("attack(target,'punch')"),false);const x=g.run('target.x');g.run('(target===player?held:held2).right=true');frames(g,.25);assert.equal(g.run('target.x'),x);
  g.run('togglePause()');const time=g.run('workCinematic.elapsed');frames(g,.5);assert.equal(g.run('workCinematic.elapsed'),time);g.run('togglePause()');frames(g,1.20);assert.equal(g.run('target.health'),100);
  frames(g,.15);const hp=g.run('target.health');assert.equal(hp,g.run('Math.round((100-damageTaken(target,34))*1000)/1000'));frames(g,.35);assert.ok(g.run('target.knockdown'));
  frames(g,2.4);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('target.health'),hp);g.run('(owner===player?held:held2).down=false');assert.equal(g.run("attack(owner,'punch')"),true);
 }
 const far=setup();far.run('owner.x=100;target.x=800;held.down=true');assert.equal(far.run("attack(owner,'special')"),false);assert.equal(far.run('owner.power'),100);
});
test('Parada Total reduces damage against guard and keeps draw deterministic',()=>{
 const g=setup();g.run("held2.guard=true;held.down=true;attack(owner,'special')");frames(g,2.4);assert.equal(g.run('workCinematic.blocked'),true);assert.ok(Math.abs(g.run('100-target.health')-g.run('damageTaken(target,34)*.3'))<.004);
 const snapshot=g.run('JSON.stringify([workCinematic.elapsed,target.health,owner.power])');g.run('draw();draw()');assert.equal(g.run('JSON.stringify([workCinematic.elapsed,target.health,owner.power])'),snapshot);frames(g,1);assert.equal(g.run('workCinematic'),null);
});
test('CPU, touch, mobile sprites, knockouts and menu cleanup support Germán',()=>{
 const cpu=setup('angel',1,2);cpu.run("gameMode='solo';Math.random=()=>0;attack(owner,'special')");assert.equal(cpu.run('workCinematic.owner===cpu'),true);frames(cpu,3.4);cpu.run('mainMenu()');assert.equal(cpu.run('workCinematic'),null);assert.equal(cpu.run('combatSounds.size'),0);
 const touch=setup();touch.taps[3].listeners.pointerdown({pointerId:22,preventDefault(){}});assert.equal(touch.run('owner.specialStyle'),'safetyChain');frames(touch,3.4);
 touch.run('navigator.maxTouchPoints=1;syncViewport();for(let pose=0;pose<=21;pose++)spriteFrame({kind:"german",pose});');assert.equal(touch.run('mobileRendering'),true);
 const ko=setup();ko.run("target.health=1;attack(owner,'special')");frames(ko,.6);assert.equal(ko.run('state'),'roundOver');assert.equal(ko.run('target.safetyHold'),0);frames(ko,3.8);assert.equal(ko.run('cpu.health'),100);
});
test('three-second chain hold freezes pose and position through hits, pressure and pause',()=>{
 const g=setup();g.run('applySafetyHold(target)');const x=g.run('target.x'),y=g.run('target.y');
 const pose=g.run('JSON.stringify(renderedFighter(target))');
 g.key('ArrowLeft');g.key('ArrowUp');g.key('Digit0');g.key('Digit7');g.key('Digit8');
 frames(g,.7);assert.equal(g.run('target.x'),x);assert.equal(g.run('target.y'),y);assert.equal(g.run('target.guarding'),false);assert.equal(g.run('target.queuedAction'),null);assert.equal(g.run('JSON.stringify(renderedFighter(target))'),pose);
 g.run('hit(target,5,250,-420,owner,{knockdown:true,attackType:"uppercut"})');assert.equal(g.run('target.knockdown'),null);assert.equal(g.run('target.vx'),0);assert.equal(g.run('target.vy'),0);const hp=g.run('target.health');
 frames(g,.2);assert.equal(g.run('target.health'),hp);assert.ok(g.run('target.safetyHold')<2.4);assert.equal(g.run('JSON.stringify(renderedFighter(target))'),pose);
 g.run('owner.x=target.x-10;separateFighters()');assert.equal(g.run('target.x'),x);
 g.run('togglePause()');const left=g.run('target.safetyHold');frames(g,4);assert.equal(g.run('target.safetyHold'),left);g.run('togglePause()');frames(g,2.6);assert.equal(g.run('target.safetyHold'),0);assert.equal(g.run("attack(target,'punch')"),true);
 const precise=setup();precise.run('applySafetyHold(target)');precise.tick(2.99);assert.ok(precise.run('target.safetyHold')>0);precise.tick(.01);assert.equal(precise.run('target.safetyHold'),0);
});
test('selection and pause explain the complete three-second immobilization',()=>{
 const g=setup();g.run('updateSelectionGuide("german");updatePauseGuide()');assert.match(g.nodes.get('selectionGuide').innerHTML,/INMÓVIL · 3 s/);assert.match(g.nodes.get('pausePowers1').innerHTML,/helicoidal.*inmoviliza 3 s/);
});

const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='primitivo',direction=1,slot=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?'matias':rival}','${slot===2?'matias':rival}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=400;target.x=400+${direction}*270;owner.facing=${direction};target.facing=${-direction};owner.power=100`);return g;
}
function frames(g,seconds){g.run(`for(let n=0;n<${Math.round(seconds*120)};n++){update(STEP);draw();}`);}
test('Matías exact attributes, selection, artwork, eight-rival tower and keyboard grid',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.matias.normalDamage,stats.matias.resistance,stats.matias.agility,stats.matias.meleeReach,stats.matias.recovery,stats.matias.powerDamage,stats.matias.superDamage,stats.matias.powerRange,stats.matias.superRange]')),[8,92,7,6,.54,22,34,608,608]);
 g.run("gameMode='solo';openSelection()");g.nodes.get('pick-matias').listeners.click();assert.equal(g.run('playerChoice'),'matias');assert.match(g.nodes.get('selectionGuide').innerHTML,/matias-whirlwind.svg/);g.key('ArrowUp');assert.equal(g.run('playerChoice'),'gabriel');
 g.run("playerChoice='matias';beginGame()");assert.equal(g.run('campaign.opponents.length'),8);assert.equal(g.run('campaign.opponents.includes("matias")'),false);assert.equal(g.run('TOURNAMENT_DIFFICULTIES.every(d=>Object.values(d).every(v=>typeof v==="string"||Number.isFinite(v)))'),true);
});
test('residue burst costs 30 and hits every worker stature only once in either direction and player slot',()=>{
 for(const rival of ['angel','peluche','primitivo','german','matias'])for(const d of [-1,1])for(const slot of [1,2]){
  const g=setup(rival,d,slot);assert.equal(g.run("attack(owner,'special')"),true);assert.equal(g.run('owner.power'),70);frames(g,.8);
  assert.equal(g.run('target.health'),g.run('Math.round((100-damageTaken(target,22))*1000)/1000'));const hp=g.run('target.health');frames(g,.8);assert.equal(g.run('target.health'),hp);assert.equal(g.run('projectiles.length'),0);
 }
});
test('common power enforces energy and range, lets well-timed jumps evade, and guard takes normal projectile chip',()=>{
 let g=setup();g.run('owner.power=29');assert.equal(g.run("attack(owner,'special')"),false);
 g=setup();g.run("owner.x=100;target.x=780;attack(owner,'special')");frames(g,1.4);assert.equal(g.run('target.health'),100);
 g=setup();g.run("held2.guard=true;attack(owner,'special')");frames(g,.9);assert.equal(g.run('target.health'),g.run('Math.round((100-damageTaken(target,1))*1000)/1000'));
 g=setup('angel');g.run("attack(owner,'special')");frames(g,.24);g.run("jump(target)");frames(g,1.1);assert.equal(g.run('target.health'),100);
});
test('whirlwind needs 100 energy and range 8, lifts and spins before one ground-impact damage event',()=>{
 for(const d of [-1,1])for(const slot of [1,2]){
  const g=setup('primitivo',d,slot);g.run('(owner===player?held:held2).down=true;owner.power=99');assert.equal(g.run("attack(owner,'special')"),false);
  g.run('owner.power=100');assert.equal(g.run("attack(owner,'special')"),true);assert.equal(g.run('owner.power'),0);assert.equal(g.run('poseFor(owner)'),16);
  frames(g,1.6);assert.ok(g.run('environmentalLift(workCinematic)')>160);assert.equal(g.run('target.health'),100);assert.equal(g.run("attack(target,'punch')"),false);assert.equal(g.run('jump(target)'),false);
  g.run('(target===player?held:held2).guard=true');frames(g,.3);assert.equal(g.run('target.guarding'),false);
  const snapshot=g.run('JSON.stringify([workCinematic.elapsed,target,owner,projectiles])');g.run('draw();draw()');assert.equal(g.run('JSON.stringify([workCinematic.elapsed,target,owner,projectiles])'),snapshot);
  g.run('togglePause()');const elapsed=g.run('workCinematic.elapsed');frames(g,.6);assert.equal(g.run('workCinematic.elapsed'),elapsed);g.run('togglePause()');
  frames(g,.95);assert.equal(g.run('target.health'),100);frames(g,.10);assert.equal(g.run('target.y'),g.run('FLOOR'));assert.ok(g.run('target.knockdown'));
  const hp=g.run('target.health');assert.equal(hp,g.run('Math.round((100-damageTaken(target,34))*1000)/1000'));frames(g,1.5);assert.equal(g.run('target.health'),hp);assert.equal(g.run('workCinematic'),null);
  g.run('(owner===player?held:held2).down=false;(target===player?held:held2).guard=false');assert.equal(g.run("attack(owner,'punch')"),true);assert.equal(g.run("attack(target,'punch')"),true);
 }
 const far=setup();far.run('owner.x=100;target.x=800;held.down=true');assert.equal(far.run("attack(owner,'special')"),false);assert.equal(far.run('owner.power'),100);
});
test('guard before capture reduces super to 30 percent damage and prevents lift',()=>{
 const g=setup();g.run("held2.guard=true;held.down=true;attack(owner,'special')");frames(g,1.5);assert.equal(g.run('workCinematic.windCaught'),false);assert.equal(g.run('environmentalLift(workCinematic)'),0);
 frames(g,1.5);assert.equal(g.run('workCinematic.blocked'),true);assert.ok(Math.abs(g.run('100-target.health')-g.run('damageTaken(target,34)*.3'))<.004);frames(g,1);assert.equal(g.run('workCinematic'),null);
});
test('CPU super, mobile controls, all sprite poses, KO and menu cancellation recover cleanly',()=>{
 const cpu=setup('angel',1,2);cpu.run("gameMode='solo';Math.random=()=>0;attack(owner,'special')");assert.equal(cpu.run('workCinematic.owner===cpu'),true);frames(cpu,.8);cpu.run('mainMenu()');assert.equal(cpu.run('workCinematic'),null);assert.equal(cpu.run('combatSounds.size'),0);
 const touch=setup();touch.taps[3].listeners.pointerdown({pointerId:22,preventDefault(){}});assert.equal(touch.run('owner.specialStyle'),'residues');frames(touch,.9);
 touch.run('navigator.maxTouchPoints=1;syncViewport();for(let pose=0;pose<=19;pose++)spriteFrame({kind:"matias",pose});');assert.equal(touch.run('mobileRendering'),true);
 const ko=setup();ko.run("target.health=1;held.down=true;attack(owner,'special')");frames(ko,3.02);assert.equal(ko.run('state'),'roundOver');assert.equal(ko.run('workCinematic'),null);frames(ko,3);assert.equal(ko.run('cpu.health'),100);
});
test('common attack emits a separated horizontal row with a new random sequence per cast',()=>{
 const g=setup();g.run(`let seed=971;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};owner.x=100;target.x=800;spawnResidues(owner);const shot=projectiles[0];`);
 assert.equal(g.run('shot.items.length'),8);assert.equal(g.run('new Set(shot.items.map(i=>i.type)).size'),6);
 const first=g.run('JSON.stringify(shot.items)');g.run('spawnResidues(owner)');assert.notEqual(g.run('JSON.stringify(projectiles[1].items)'),first);
 g.run('shot.age=.5;shot.prevAge=.49');const positions=g.run('shot.items.map(i=>residueItemFrame(shot,i))');
 assert.ok(positions.every(Boolean));assert.ok(Math.max(...positions.map(p=>p.y))-Math.min(...positions.map(p=>p.y))<=5);
 for(let i=1;i<positions.length;i++)assert.ok(Math.abs(positions[i-1].x-positions[i].x)>=35.9,'objects must remain separated in one row');
 const frozen=g.run('JSON.stringify(shot)');g.run('renderAlpha=.5;drawResidues(shot);drawResidues(shot)');assert.equal(g.run('JSON.stringify(shot)'),frozen,'drawing must not reshuffle debris or advance the row');
 assert.equal(g.run('residueItemFrame(shot,shot.items[7],.10)'),null,'later objects launch progressively');
});
test('the tail continues after first contact but cannot deal another hit or pass through the target',()=>{
 const g=setup('german');g.run("attack(owner,'special')");frames(g,.52);
 const hp=g.run('target.health');assert.ok(hp<100);assert.equal(g.run('projectiles[0].contactDone'),true);
 assert.equal(g.run('projectiles[0].items.filter(i=>residueItemFrame(projectiles[0],i)).length>0'),true);
 frames(g,.65);assert.equal(g.run('target.health'),hp);assert.equal(g.run('projectiles.length'),0);
});

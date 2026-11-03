const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='gabriel',direction=1,slot=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?'dario':rival}','${slot===2?'dario':rival}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=${direction===1?100:860};target.x=owner.x+${direction}*270;owner.facing=${direction};target.facing=${-direction};owner.power=100`);return g;
}
function frames(g,s){g.run(`for(let i=0;i<${Math.round(s*120)};i++){update(STEP);draw()}`)}
test('Darío matches the requested stats and Gabriel height, with a broader body and a full selection/tournament entry',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('[stats.dario.normalDamage,stats.dario.resistance,stats.dario.agility,stats.dario.meleeReach,stats.dario.recovery,stats.dario.powerDamage,stats.dario.superDamage,stats.dario.powerRange,stats.dario.superRange]')),[9,102,6,5,.62,22,35,608,684]);
 assert.equal(g.run('stats.dario.height'),g.run('stats.gabriel.height'));assert.equal(g.run('stats.dario.size'),g.run('stats.gabriel.size'));assert.ok(g.run('stats.dario.bodyWidth>stats.gabriel.bodyWidth'));
 g.run("gameMode='solo';openSelection()");g.nodes.get('pick-dario').listeners.click();assert.equal(g.run('playerChoice'),'dario');assert.match(g.nodes.get('selectionGuide').innerHTML,/dario-bus-v1.webp/);g.key('ArrowUp');assert.equal(g.run('playerChoice'),'linares');
 g.run("playerChoice='dario';beginGame()");assert.equal(g.run('campaign.opponents.length'),9);assert.equal(g.run('campaign.opponents.includes("dario")'),false);assert.ok(g.run('TOURNAMENT_DIFFICULTIES.every(d=>Object.values(d).every(v=>typeof v==="string"||Number.isFinite(v)))'));
});
test('bus hits once and keeps crossing after impact, with exact cost, knockback, directions, slots and all heights',()=>{
 for(const rival of ['angel','peluche','gabriel','primitivo','german','matias','dario'])for(const d of [-1,1])for(const slot of [1,2]){
  const g=setup(rival,d,slot);assert.equal(g.run("attack(owner,'special')"),true);assert.equal(g.run('owner.power'),70);assert.equal(g.run('poseFor(owner)'),4);frames(g,.7);
  const hp=g.run('target.health');assert.equal(hp,g.run('Math.round((100-damageTaken(target,22))*1000)/1000'));assert.ok(g.run('projectiles[0].contactDone'));assert.ok(g.run(`(target.x-(owner.x+${d}*270))*${d}>0`));
  const x=g.run('projectiles[0].x');frames(g,.1);assert.ok(g.run(`(projectiles[0].x-${x})*${d}>0`));frames(g,2);assert.equal(g.run('target.health'),hp);assert.equal(g.run('projectiles.length'),0);
 }
});
test('bus range and energy are bounded, guard chips, jumps can evade, pause freezes vehicle and sound',()=>{
 let g=setup();g.run('owner.power=29');assert.equal(g.run("attack(owner,'special')"),false);
 g=setup();g.run("target.x=800;attack(owner,'special')");frames(g,2.8);assert.equal(g.run('target.health'),100);
 g=setup();g.run("held2.guard=true;attack(owner,'special')");frames(g,.8);assert.equal(g.run('target.health'),g.run('Math.round((100-damageTaken(target,1))*1000)/1000'));
 g=setup();g.run("attack(owner,'special')");frames(g,.15);g.run('jump(target)');frames(g,1);assert.equal(g.run('target.health'),100);
 g=setup();g.run("attack(owner,'special')");frames(g,.3);g.run('togglePause()');const snap=g.run('JSON.stringify(projectiles)');frames(g,.4);assert.equal(g.run('JSON.stringify(projectiles)'),snap);g.run('togglePause()');frames(g,3);assert.equal(g.run('projectiles.length'),0);
});
test('plane locks input during the radio/flyby, hits once for 35, respects guard and restores both players',()=>{
 for(const d of [-1,1])for(const slot of [1,2])for(const guard of [false,true]){
  const g=setup('german',d,slot);g.run(`(owner===player?held:held2).down=true;(target===player?held:held2).guard=${guard};attack(owner,'special')`);
  assert.equal(g.run('owner.power'),0);assert.equal(g.run('poseFor(owner)'),16);frames(g,1);
  assert.equal(g.run('target.health'),100);assert.equal(g.run("attack(target,'punch')"),false);assert.equal(g.run('jump(target)'),false);
  const before=g.run('JSON.stringify(workCinematic)');g.run('draw();draw()');assert.equal(g.run('JSON.stringify(workCinematic)'),before);
  g.run('togglePause()');const time=g.run('workCinematic.elapsed');frames(g,.4);assert.equal(g.run('workCinematic.elapsed'),time);g.run(`togglePause();(target===player?held:held2).guard=${guard}`);
  frames(g,1.5);assert.ok(Math.abs(g.run('100-target.health')-g.run(`damageTaken(target,35)*${guard?.3:1}`))<.004);
  const hp=g.run('target.health');frames(g,2);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('target.health'),hp);
  g.run('(owner===player?held:held2).down=false;(target===player?held:held2).guard=false');frames(g,.5);
  assert.equal(g.run('isLocked(target)'),false);assert.equal(g.run("attack(target,'punch')"),true);assert.equal(g.run("attack(owner,'punch')"),true);
 }
});
test('super enforces full energy/range and clears on menu, KO or a new round, including mobile CPU use',()=>{
 for(const init of ['owner.power=99','target.x=810']){const g=setup();g.run(`${init};held.down=true`);assert.equal(g.run("attack(owner,'special')"),false);assert.equal(g.run('workCinematic'),null)}
 for(const cleanup of ['mainMenu()','startRound()']){const g=setup();g.run("held.down=true;attack(owner,'special')");frames(g,1);g.run(cleanup);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('[...combatSounds].some(v=>v.name==="flightSuper")'),false)}
 const g=setup('gabriel',-1,2);g.run("navigator.maxTouchPoints=1;syncViewport();held2.down=true");g.taps2[3].listeners.pointerdown({pointerId:4,preventDefault(){}});assert.equal(g.run('workCinematic.owner===cpu'),true);g.run('target.health=1');frames(g,2.5);assert.equal(g.run('state'),'roundOver');assert.equal(g.run('workCinematic'),null);
});
test('all atlas poses map to real cells and plane descends at impact without changing clocks when drawing',()=>{
 const g=setup();g.run('for(let pose=0;pose<=19;pose++)spriteFrame({kind:"dario",pose});held.down=true;attack(owner,"special")');
 g.run('workCinematic.elapsed=1.55');const high=g.run('flightPlaneFrame(workCinematic)');g.run('workCinematic.elapsed=2.4');const low=g.run('flightPlaneFrame(workCinematic)');assert.ok(low.y>high.y+150);assert.equal(low.x,g.run('workCinematic.impactX-cameraX-workCinematic.direction*205'));assert.ok(low.width>high.width);
});

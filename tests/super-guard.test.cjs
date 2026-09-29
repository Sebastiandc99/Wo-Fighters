const {test}=require('node:test');const assert=require('node:assert/strict');const {game}=require('./engine-harness.cjs');
const kinds=['angel','primitivo','peluche','tren','linares','gabriel','fernando'];
function setup(kind,slot=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?kind:'linares'}','${slot===2?kind:'linares'}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.power=100;`);return g;
}
test('every super deals 30% damage against standing or crouching guard on both player slots',()=>{
 for(const kind of kinds)for(const slot of [1,2])for(const down of [false,true]){
  const g=setup(kind,slot);g.run(`const defense=target===player?held:held2;defense.guard=true;defense.down=${down};updateHuman(target,defense);(owner===player?held:held2).down=true;attack(owner,'special')`);
  assert.ok(g.run('workCinematic'));const duration=g.run('workCinematic.duration');
  g.tick(duration-.1);
  const expected=g.run(`damageTaken(target,fighterPowers[owner.kind].superDamage)*.30`);
  assert.ok(Math.abs(g.run('100-target.health')-expected)<.004,`${kind}, slot ${slot}`);
  assert.equal(g.run('workCinematic.blocked'),true);assert.equal(g.run('target.grounded'),true);assert.equal(g.run('target.knockdown'),null);
  assert.equal(g.run('poseFor(target)'),down?19:9);
  g.tick(.2);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('target.action'),'idle');
 }
});
test('keyboard and touch can raise or release guard during the charge while attacks stay locked',()=>{
 for(const touch of [false,true]){
  const g=setup('gabriel');g.run("held.down=true;attack(owner,'special')");g.tick(.4);
  if(touch)g.holds2[3].listeners.pointerdown({pointerId:8,preventDefault(){}});else g.key('Digit0');
  g.tick(.2);assert.equal(g.run('target.guarding'),true);assert.equal(g.run("attack(target,'punch')"),false);
  g.tick(.7);assert.equal(g.run('workCinematic.blocked'),true);
  if(touch)g.holds2[3].listeners.pointerup({pointerId:8,preventDefault(){}});else g.key('Digit0','keyup');
  g.tick(.3);assert.equal(g.run('workCinematic.defenseBroken'),true);
  const health=g.run('target.health');g.key('Digit0');g.tick(.6);
  assert.ok(g.run('target.health')<health);assert.equal(g.run('workCinematic.blocked'),false);
 }
});
test('unguarded specials retain full damage and airborne or interrupted fighters cannot block',()=>{
 for(const kind of kinds){
  const g=setup(kind);g.run("held.down=true;attack(owner,'special')");g.tick(g.run('workCinematic.duration')-.1);
  assert.ok(Math.abs(g.run('100-target.health')-g.run('damageTaken(target,fighterPowers[owner.kind].superDamage)'))<.004);
 }
 for(const unavailable of ["target.grounded=false;target.y-=60","target.action='punch'","target.concreteHold=2"]){
  const g=setup('tren');g.run(`${unavailable};held2.guard=true;held.down=true;attack(owner,'special')`);g.tick(2.1);
  assert.equal(g.run('workCinematic.blocked'),false);
 }
});
test('CPU defense uses one difficulty-based decision and pause freezes the cinematic',()=>{
 const g=setup('tren');g.run("gameMode='solo';aiEnabled=true;Math.random=()=>0;held.down=true;attack(owner,'special')");g.tick(.4);
 assert.equal(g.run('target.guarding'),true);g.run('togglePause()');const time=g.run('workCinematic.elapsed');g.tick(.8);
 assert.equal(g.run('workCinematic.elapsed'),time);g.run('togglePause()');g.tick(1.8);assert.equal(g.run('workCinematic.blocked'),true);
});

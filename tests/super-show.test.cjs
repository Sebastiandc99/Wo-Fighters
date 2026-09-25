const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(kind='peluche') {const g=game();g.run(`gameMode='versus';startGame('${kind}','angel');state='playing';player.x=300;cpu.x=600;`);return g;}
test('full energy takes 25 seconds from the initial 40; costs stay 30 and 100',()=>{
 const g=setup();g.tick(18.75);assert.ok(Math.abs(g.run('player.power')-85)<.001);
 g.tick(6.26);assert.equal(g.run('player.power'),100);
 g.run('held.down=true');assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);
 const common=setup();common.run("attack(player,'special')");assert.equal(common.run('player.power'),10);
});
test('damage and blocking also grant 25 percent less energy',()=>{
 const g=setup();g.run('player.power=cpu.power=0;hit(cpu,10,0,0,player)');
 const damage=g.run('100-cpu.health');
 assert.ok(Math.abs(g.run('cpu.power')-damage*.8*.75)<.001);
 assert.ok(Math.abs(g.run('player.power')-damage*.7*.75)<.001);
 const guard=setup();guard.run('cpu.guarding=true;cpu.power=0;hit(cpu,10,0,0,player)');assert.equal(guard.run('cpu.power'),3);
});
test('all super climaxes keep audio running, draw without altering simulation and pause together',()=>{
 for(const kind of ['angel','primitivo','peluche'])for(const direction of [-1,1]){
  const g=setup(kind);g.run(`player.x=600;cpu.x=600+${direction}*220;player.facing=${direction};cpu.facing=${-direction};player.power=100;held.down=true;attack(player,'special');`);
  const impact=g.run('workCinematic.impactAt');
  g.run(`for(let i=0;i<${Math.ceil((impact+.1)*120)};i++){update(STEP);draw()}`);
  assert.equal(g.run('workCinematic.impact'),true);assert.equal(g.run('hitStop'),0);
  assert.ok(Math.abs(g.run('workCinematic.elapsed-workCinematic.sound.elapsed'))<.00001);
  assert.ok(g.run('COMBAT_AUDIO[workCinematic.sound.name].src.endsWith("-v2.mp3")'));
  const hp=g.run('cpu.health');g.run('const before=JSON.stringify([workCinematic.elapsed,particles,effects,player.power,cpu.health]);draw();draw()');
  assert.equal(g.run('JSON.stringify([workCinematic.elapsed,particles,effects,player.power,cpu.health])===before'),true);
  g.run('togglePause()');const time=g.run('workCinematic.elapsed');g.tick(.5);assert.equal(g.run('workCinematic.elapsed'),time);
  g.run('togglePause()');g.tick(1.2);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.health'),hp);
  g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
 }
});

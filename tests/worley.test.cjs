const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(kind='angel'){
 const g=game();g.run(`startGame('${kind}','${kind==='angel'?'primitivo':'angel'}');state='playing';player.x=260;cpu.x=570;player.power=100;player.specialCooldown=0;`);return g;
}
test('the Worley roster and stages are independent',()=>{
 const g=setup();assert.deepEqual(Array.from(g.run('roster')),['angel','primitivo']);
 assert.deepEqual(Array.from(g.run('stageRoster')),['generadores','planta','salinas']);
});
test('ordinary power costs 30 and sends the matching construction attack',()=>{
 for(const [kind,style] of [['angel','beam'],['primitivo','forklift']]){
  const g=setup(kind);
  assert.equal(g.run("held.down=false;attack(player,'special')"),true);
  assert.equal(g.run('player.power'),70);
  assert.equal(g.run('player.specialStyle'),style);
  assert.equal(g.run('powerDamage(player)'),kind==='angel'?23:22);
  g.tick(.4);assert.equal(g.run('projectiles[0].style'),style);
 }
});
test('full bar and down trigger a cinematic that locks controls and lands one hit',()=>{
 for(const [kind,expected] of [['angel',34],['primitivo',35]]){
  const g=setup(kind);
  assert.equal(g.run("held.down=true;attack(player,'special')"),true);
  assert.equal(g.run('player.power'),0);
  assert.equal(g.run('workCinematic.owner.kind'),kind);
  assert.equal(g.run("attack(cpu,'punch')"),false);
  g.tick(1.2);
  assert.equal(g.run('cpu.health'),Math.round((100-expected*100/g.run('stats[cpu.kind].resistance'))*1000)/1000);
  g.tick(.8);assert.equal(g.run('workCinematic'),null);
 }
});
test('less than a full bar cannot launch the cinematic',()=>{
 const g=setup();g.run('player.power=99;held.down=true');
 assert.equal(g.run("attack(player,'special')"),false);
 assert.equal(g.run('workCinematic'),null);
 assert.equal(g.run('player.power'),99);
});

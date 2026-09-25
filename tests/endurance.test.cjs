const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
test('all damage is scaled once to 70%, with resistance and 90-second rounds',()=>{
 const g=game();
 for(const kind of ['angel','primitivo','peluche'])for(const damage of [1,3,5,22,23,34,35]){
  const actual=g.run(`damageTaken({kind:'${kind}'},${damage})`);
  const expected=Math.round(damage*.7*100000/g.run(`stats.${kind}.resistance`))/1000;
  assert.equal(actual,expected);
 }
 g.run("startGame('angel','peluche');state='playing'");assert.equal(g.run('roundTime'),90);
 g.run("hit(cpu,34,0,0,player,{projectile:true});cpu.invuln=0;hit(cpu,34,0,0,player,{projectile:true});");
 assert.ok(g.run('cpu.health')>55);assert.equal(g.run('state'),'playing');
 g.run('togglePause()');const remaining=g.run('roundTime');g.tick(3);assert.equal(g.run('roundTime'),remaining);
});
test('selection cards follow all fighters and separate damage from energy cost',()=>{
 const g=game();
 for(const [kind,common,superName,damage] of [['angel','Carga suspendida','Gancho maestro','16,1%'],['primitivo','Descarga express','Lanzamiento de contenedor','15,4%'],['peluche','Hormigonazo','Colado masivo','1,4%']]){
  g.run(`chooseFighter('${kind}',false)`);const card=g.nodes.get('selectionGuide').innerHTML;
  for(const text of [common,superName,damage,'30%','100%','Resistencia','Velocidad','Fuerza','role="meter"','skill-art'])assert.ok(card.includes(text),text);
 }
});
test('pause shows both selected fighters and matchup damage, with second-player keys only in versus',()=>{
 const g=game();g.run("gameMode='versus';startGame('peluche','primitivo');state='playing';togglePause()");
 assert.equal(g.nodes.get('pauseMenu').hidden,false);assert.equal(g.nodes.get('pauseControls2').hidden,false);
 assert.ok(g.nodes.get('pausePowers1').innerHTML.includes('Hormigonazo'));
 assert.ok(g.nodes.get('pausePowers1').innerHTML.includes('1,3%'));
 assert.ok(g.nodes.get('pausePowers2').innerHTML.includes('Lanzamiento de contenedor'));
 g.run("togglePause();gameMode='solo';togglePause()");assert.equal(g.nodes.get('pauseControls2').hidden,true);
 assert.ok(g.nodes.get('pausePowers2').innerHTML.includes('CPU'));
 g.run('togglePause()');assert.equal(g.nodes.get('pauseMenu').hidden,true);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
});

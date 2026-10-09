const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
const roster=['angel','primitivo','peluche','tren','linares','gabriel','fernando','german'];
function setup(kind,rival,slot,dir){
 const g=game();
 g.run(`gameMode='versus';startGame('${slot===1?kind:rival}','${slot===1?rival:kind}');state='playing';var owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=480;target.x=480+${dir}*65;owner.facing=${dir};target.facing=${-dir};target.guarding=true;`);
 return g;
}
test('every fighter loses a small amount to correctly blocked punches, kicks, uppercuts and low strikes',()=>{
 for(const kind of roster)for(const rival of roster)for(const slot of [1,2])for(const dir of [-1,1])for(const [type,low,down] of [['punch',false,false],['kick',false,false],['uppercut',false,true],['kick',true,true]]){
  const g=setup(kind,rival,slot,dir);
  g.run(`target.crouching=${down};hit(target,${type==='uppercut'?5:3},100,-420,owner,{sourceX:owner.x,attackType:'${type}',low:${low},knockdown:true})`);
  const loss=g.run('100-target.health');
  const full=g.run(`damageTaken(target,${type==='uppercut'?5:3})`);
  assert.ok(loss>0&&loss<full*.06,`${kind} vs ${rival}: ${type}, ${slot}P/${dir}`);
  assert.ok(Math.abs(loss-full*.05)<=.00051);
  assert.equal(g.run('target.action'),'block');assert.equal(g.run('target.knockdown'),null);
  assert.equal(g.run('owner.attackConnected'),false);assert.equal(g.run('owner.combo'),0);
 }
});
test('real keyboard punches cause chip once and blocking still interrupts the combo',()=>{
 for(const kind of roster)for(const slot of [1,2])for(const dir of [-1,1]){
  const g=setup(kind,'primitivo',slot,dir);
  g.key(slot===1?'Digit0':'KeyI');
  g.key(slot===1?'KeyJ':'Digit7');g.tick(.4);
  const health=g.run('target.health');assert.ok(health<100&&health>99);
  assert.equal(g.run('owner.meleeChain'),null);assert.equal(g.run('owner.combo'),0);
  g.tick(.3);assert.equal(g.run('target.health'),health);
 }
});
test('damage respects correct guard direction, low attacks, airborne targets, evasion and pause',()=>{
 for(const setupDefense of ['target.facing=owner.facing','target.grounded=false;target.y-=80','target.guarding=false']){
  const g=setup('angel','primitivo',1,1);g.run(setupDefense+';hit(target,10,100,0,owner,{sourceX:owner.x,attackType:"punch"})');
  assert.ok(Math.abs(g.run('100-target.health')-g.run('damageTaken(target,10)'))<.00001);
 }
 const low=setup('angel','primitivo',1,1);low.run('hit(target,10,100,0,owner,{sourceX:owner.x,attackType:"kick",low:true})');
 assert.ok(Math.abs(low.run('100-target.health')-low.run('damageTaken(target,10)'))<.00001);
 for(const defense of ['target.invuln=1','state="paused"']){
  const g=setup('angel','primitivo',1,1);g.run(defense+';hit(target,10,100,0,owner,{sourceX:owner.x,attackType:"punch"})');assert.equal(g.run('target.health'),100);
 }
});
test('chip can finish a nearly defeated rival once and the next round resets life and guard',()=>{
 for(const slot of [1,2]){
  const g=setup('gabriel','linares',slot,-1);g.run('target.health=.01;hit(target,3,100,0,owner,{sourceX:owner.x,attackType:"punch"})');
  assert.equal(g.run('target.health'),0);assert.equal(g.run('state'),'roundOver');
  assert.equal(g.run(slot===1?'match.playerWins':'match.cpuWins'),1);
  g.run('hit(target,3,100,0,owner,{sourceX:owner.x,attackType:"punch"})');assert.equal(g.run(slot===1?'match.playerWins':'match.cpuWins'),1);
  g.run('startRound()');assert.equal(g.run('player.health'),100);assert.equal(g.run('cpu.health'),100);assert.equal(g.run('player.guarding||cpu.guarding'),false);
 }
});

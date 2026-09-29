const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
const fighters=['angel','primitivo','peluche','tren','linares','gabriel','fernando'];
function setup(kind,slot=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?kind:'angel'}','${slot===2?kind:'angel'}');state='playing';player.x=300;cpu.x=900;player.facing=1;cpu.facing=-1;const subject=${slot===1?'player':'cpu'};const input=${slot===1?'held':'held2'};`);return g;
}
test('all seven fighters recover promptly from every melee variant for both players',()=>{
 for(const kind of fighters)for(const slot of [1,2])for(const [variant,type,limit,prepare] of [
  ['punch','punch',.40,''],['kick','kick',.54,''],
  ['uppercut','punch',.57,'input.down=true;'],['lowKick','kick',.51,'input.down=true;'],
  ['volley','kick',.68,'input[subject.facing===1?"left":"right"]=true;'],
  ['airKick','kick',.53,'subject.grounded=false;subject.y=FLOOR-600;subject.vy=-100;']
 ]){
  const g=setup(kind,slot);g.run(prepare);
  assert.equal(g.run(`attack(subject,'${type}')`),true,`${kind} ${variant} 2P=${slot}`);
  assert.ok(g.run('subject.actionDuration')<limit,`${kind} ${variant} must not inherit the power recovery`);
  assert.ok(g.run('subject.moveSpec.recovery')<.30,`${kind} ${variant} recovery`);
  g.tick(limit+.02);assert.equal(g.run('subject.action'),'idle',`${kind} ${variant} unlocks`);
  g.run('input.down=input.left=input.right=false;');
  assert.equal(g.run("attack(subject,'punch')"),true,`${kind} ${variant} accepts the next strike`);
 }
});
test('a buffered repeat punch starts on recovery completion without an extra pause',()=>{
 for(const kind of fighters)for(const slot of [1,2]){
  const g=setup(kind,slot);g.run("attack(subject,'punch')");
  g.tick(g.run('subject.actionDuration')-.10);
  assert.equal(g.run("attack(subject,'punch')"),false);assert.equal(g.run('subject.queuedAction'),'punch');
  g.tick(.12);
  assert.equal(g.run('subject.action'),'punch');assert.equal(g.run('subject.queuedAction'),null);
  assert.ok(g.run('subject.actionTime > subject.actionDuration-.04'),`${kind} repeated punch starts immediately`);
 }
});
test('ordinary strikes retain their active window and cannot be restarted early on a whiff',()=>{
 for(const kind of fighters){
  const g=setup(kind);g.run("attack(subject,'punch')");g.tick(.08);
  assert.equal(g.run("attack(subject,'punch')"),false);
  assert.equal(g.run('subject.attackLanded'),false);assert.equal(g.run('subject.action'),'punch');
  assert.ok(g.run('subject.actionDuration-subject.actionTime')>.07);
 }
});
test('common powers retain their separate character recovery',()=>{
 for(const [kind,recovery] of [['peluche',.64],['tren',.52],['linares',.54],['gabriel',.56],['fernando',.60]]){
  const g=setup(kind);g.run('subject.power=100;');assert.equal(g.run("attack(subject,'special')"),true);
  assert.equal(g.run('subject.moveSpec.recovery'),recovery,kind);
 }
});

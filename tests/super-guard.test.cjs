const {test}=require('node:test');const assert=require('node:assert/strict');const {game}=require('./engine-harness.cjs');
const kinds=['angel','primitivo','peluche','tren','linares','gabriel','fernando','german'];
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
function enableMusic(g){
 const sources=[];
 g.sandbox.testAudio={state:'running',currentTime:10,destination:{},
  createGain:()=>({gain:{value:0},connect(){return this},disconnect(){}}),
  createBufferSource:()=>{const source={connect(){return this},disconnect(){},start(when,offset){this.offset=offset;this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;}
 };
 g.run('tone=()=>{};audioCtx=testAudio;muted=false;musicTrack={usage:"fight",buffer:{duration:90,music:true}};musicElapsed=12.25;for(const cue of Object.values(COMBAT_AUDIO))cue.buffer={duration:8};syncMusic();audioCtx.currentTime=11.5');
 return sources;
}
test('all eight supers silence only background music and resume the same track and position',()=>{
 for(const kind of kinds)for(const slot of [1,2]){
  const g=setup(kind,slot),sources=enableMusic(g),first=sources.find(s=>s.buffer.music);
  g.run("(owner===player?held:held2).down=true;attack(owner,'special')");const track=g.run('musicTrack');
  assert.equal(first.stopped,true,kind);assert.equal(g.run('musicSource'),null);assert.equal(g.run('musicElapsed'),13.75);
  g.tick(.4);g.run('syncMusic();togglePause()');g.tick(.7);g.run('togglePause();syncMusic()');
  assert.equal(g.run('musicSource'),null);assert.equal(sources.filter(s=>s.buffer?.music&&s.started).length,1);
  if(kind==='german')assert.ok(g.run('workCinematic.sound.source'), 'power sound continues while music is silent');
  g.run('audioCtx.currentTime=18');g.tick(g.run('workCinematic.duration')+.2);
  assert.equal(g.run('workCinematic'),null);assert.equal(g.run('musicTrack'),track);assert.ok(g.run('musicSource'));
  assert.equal(sources.filter(s=>s.buffer?.music&&s.started).length,2);assert.equal(g.run('musicSource.offset'),13.75);
 }
});
test('common powers keep music and a muted super never re-enables it at the end',()=>{
 const common=setup('german'),sources=enableMusic(common);common.run("attack(owner,'special')");common.tick(.5);assert.equal(sources[0].stopped,undefined);assert.ok(common.run('musicSource'));
 const muted=setup('german');enableMusic(muted);muted.run("held.down=true;attack(owner,'special');toggleSound()");muted.tick(3.5);assert.equal(muted.run('workCinematic'),null);assert.equal(muted.run('musicSource'),null);assert.equal(muted.run('muted'),true);
});

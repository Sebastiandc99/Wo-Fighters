const test=require('node:test'),assert=require('node:assert/strict');
const{game}=require('./engine-harness.cjs');
function setup(slot=1,direction=1){
 const g=game();g.run(`gameMode='versus';startGame('${slot===1?'matias':'german'}','${slot===2?'matias':'german'}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=400;target.x=400+${direction}*54;owner.facing=${direction};target.facing=${-direction};Math.random=()=>0;`);return g;
}
function uppercut(g){return g.run("hit(target,5,owner.facing*145,-420,owner,{attackType:'uppercut',knockdown:true})");}
test('a connected uppercut can trigger the photo for either fighter and direction even with an unlucky roll, without changing damage or recovery',()=>{
 for(const slot of [1,2])for(const d of [-1,1]){
  const g=setup(slot,d);g.run("Math.random=()=>.999");uppercut(g);
  assert.ok(g.run('cornerCameo'));assert.equal(g.run('target.health'),g.run('Math.round((100-damageTaken(target,5))*1000)/1000'));
  assert.equal(g.run('workCinematic'),null);assert.equal(g.run('owner.action'),'idle');assert.ok(g.run('target.knockdown'));
  g.tick(.2);assert.equal(g.run('cornerCameo.voiceStarted'),true);assert.equal(g.run('[...combatSounds].filter(v=>v.name==="cornerCameo").length'),1);
  assert.equal(g.run("attack(owner,'punch')"),true,'the cameo must not lock the attacker');
 }
});
test('misses, blocked attacks, projectiles, KO and cinematic bites cannot produce a cameo',()=>{
 const miss=setup();miss.run("target.x=800;held.down=true;attack(owner,'punch')");miss.tick(.8);assert.equal(miss.run('cornerCameo'),null);
 const guard=setup();guard.run("target.guarding=true");uppercut(guard);assert.equal(guard.run('cornerCameo'),null);
 for(const contact of ["{attackType:'special'}","{projectile:true,attackType:'uppercut'}","{projectile:true,super:true}"]){
  const g=setup();g.run(`hit(target,5,0,0,owner,${contact})`);assert.equal(g.run('cornerCameo'),null);
 }
 const ko=setup();ko.run('target.health=1');uppercut(ko);assert.equal(ko.run('cornerCameo'),null);assert.equal(ko.run('state'),'roundOver');
 const superHit=setup();superHit.run('workCinematic={owner,target};hit(target,5,0,0,owner,{attackType:"uppercut"})');assert.equal(superHit.run('cornerCameo'),null);
});
test('chance thresholds and cooldown keep the cameo occasional and prevent overlaps',()=>{
 const no=setup();no.run('cornerCameoShown=true;Math.random=()=>.40');uppercut(no);assert.equal(no.run('cornerCameo'),null);
 const yes=setup();yes.run('cornerCameoShown=true;Math.random=()=>.399');uppercut(yes);assert.ok(yes.run('cornerCameo'));
 const first=yes.run('cornerCameo');assert.equal(yes.run("maybeCornerCameo({attackType:'uppercut'})"),false);assert.equal(yes.run('cornerCameo'),first);
 yes.tick(2);assert.equal(yes.run('cornerCameo'),null);assert.equal(yes.run('[...combatSounds].some(v=>v.name==="cornerCameo")'),false);
 assert.equal(yes.run("maybeCornerCameo({attackType:'uppercut'})"),false);yes.tick(13);assert.equal(yes.run("maybeCornerCameo({attackType:'uppercut'})"),true);
 const finisher=setup();finisher.run('cornerCameoShown=true;Math.random=()=>.249;hit(target,5,0,0,owner,{attackType:"kick",chainFinisher:true})');assert.ok(finisher.run('cornerCameo'));
 const rare=setup();rare.run('cornerCameoShown=true;Math.random=()=>.25;hit(target,5,0,0,owner,{attackType:"kick",chainFinisher:true})');assert.equal(rare.run('cornerCameo'),null);
});
test('the short screen-corner animation and sound freeze on pause and drawing cannot change their clocks',()=>{
 const g=setup();uppercut(g);g.tick(.3);g.run('togglePause()');
 const frozen=g.run('JSON.stringify([cornerCameo,cornerCameoCooldown])');g.tick(.8);g.run('draw();draw()');
 assert.equal(g.run('JSON.stringify([cornerCameo,cornerCameoCooldown])'),frozen);
 g.run('togglePause()');g.tick(1.4);assert.equal(g.run('cornerCameo'),null);
 assert.ok(g.run('cornerCameoFrame(0).slide')>=360);assert.equal(g.run('cornerCameoFrame(.12).slide'),0);
 assert.equal(g.run('cornerCameoFrame(1.45).visible'),false);
});
test('menu, next round, KO and another cinematic immediately clear photo, bubble and voice',()=>{
 for(const finish of ['mainMenu()','startRound()','finishRound(owner,"K.O.")',"held.down=true;owner.power=100;attack(owner,'special')"]){
  const g=setup();uppercut(g);g.tick(.25);assert.ok(g.run('cornerCameo.sound'));
  g.run(finish);assert.equal(g.run('cornerCameo'),null);assert.equal(g.run('[...combatSounds].some(v=>v.name==="cornerCameo")'),false);
 }
});
test('provided short audio is one-shot, stays aligned with photo, respects mute and leaves music playing',()=>{
 const g=setup(),sources=[];
 g.sandbox.audioStub={state:'running',currentTime:10,destination:{},
  createGain:()=>({gain:{value:0},connect(){return this},disconnect(){}}),
  createBufferSource:()=>{const s={connect(){return this},disconnect(){},start(when,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};sources.push(s);return s;}};
 g.run('tone=()=>{};audioCtx=audioStub;muted=false;COMBAT_AUDIO.cornerCameo.buffer={duration:.73};musicTrack={usage:"fight",buffer:{duration:90,music:true}};syncMusic();maybeCornerCameo({attackType:"uppercut"});updateCornerCameo(.23)');
 const voice=g.run('cornerCameo.sound');assert.ok(voice.source);assert.equal(voice.source.loop,false);assert.ok(Math.abs(voice.source.offset-.13)<1e-9);
 const music=sources.find(s=>s.buffer.music);assert.equal(music.stopped,undefined);
 g.run('toggleSound()');assert.equal(voice.source,null);const t=g.run('cornerCameo.elapsed');g.run('updateCornerCameo(.1)');assert.ok(g.run('cornerCameo.elapsed')>t);
 g.run('toggleSound()');assert.ok(voice.source);g.tick(1.5);assert.equal(g.run('cornerCameo'),null);assert.equal(g.run('combatSounds.has(cornerCameo?.sound)'),false);
 assert.ok(g.run('musicSource'));
});

test('real keyboard and touch uppercuts reveal the cameo on the first connected hit for both player slots',()=>{
 for(const slot of [1,2])for(const touch of [false,true]){
  const g=setup(slot);g.run('Math.random=()=>.999');
  if(touch){
   const holds=slot===1?g.holds:g.holds2,taps=slot===1?g.taps:g.taps2;
   holds[2].listeners.pointerdown({pointerId:1,preventDefault(){}});taps[1].listeners.pointerdown({pointerId:2,preventDefault(){}});
  }else{g.key(slot===1?'KeyS':'ArrowDown');g.key(slot===1?'KeyJ':'Digit7');}
  g.tick(.25);
  assert.ok(g.run('target.health<100'),'the real uppercut must connect');assert.ok(g.run('cornerCameo'));
  assert.equal(g.run('cornerCameoShown'),true);
 }
});
test('six ordinary connected keyboard punches reveal the photo even with the worst possible random rolls',()=>{
 for(const slot of [1,2])for(const direction of [-1,1]){
  const g=setup(slot,direction);g.run('Math.random=()=>.999');
  for(let n=1;n<=6;n++){
   g.run(`owner.x=400;target.x=400+${direction}*54;owner.facing=${direction};target.facing=${-direction};target.vx=target.vy=0;target.y=FLOOR;target.grounded=true;target.invuln=0;target.knockdown=null;target.action="idle";target.actionTime=0`);
   const health=g.run('target.health'),key=slot===1?'KeyJ':'Digit7';g.key(key);g.key(key,'keyup');g.tick(.9);
   assert.ok(g.run('target.health')<health,'only connected attacks count');
   assert.equal(g.run('cornerCameo!==null'),n===6);
  }
  assert.equal(g.run('cornerCameoHits'),0);g.run('startRound()');
  assert.equal(g.run('cornerCameoHits'),0);assert.equal(g.run('cornerCameoShown'),false);
 }
});

const test=require('node:test'),assert=require('node:assert/strict');
const{game}=require('./engine-harness.cjs');
function setup(slot=1,direction=1){
 const g=game();g.run(`assets.cornerCameo.naturalWidth=512;assets.cornerCameo.naturalHeight=479;gameMode='versus';startGame('${slot===1?'matias':'german'}','${slot===2?'matias':'german'}');state='playing';const owner=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};owner.x=400;target.x=400+${direction}*54;owner.facing=${direction};target.facing=${-direction};Math.random=()=>0;`);return g;
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
function mobileLayoutFixture({portrait=false,twoPlayers=false}={}){
 const g=setup();
 g.run(`navigator.maxTouchPoints=1;window.innerWidth=${portrait?390:844};window.innerHeight=${portrait?844:390};gameMode='${twoPlayers?'versus':'solo'}';syncViewport()`);
 const surface=twoPlayers?{left:155,top:5,width:533,height:300}:{left:80,top:5,width:684,height:384};
 const rect=portrait?{left:surface.top,top:surface.left,width:surface.height,height:surface.width}:surface;
 const controls=twoPlayers?[{x:-30,y:426,w:365,h:120},{x:625,y:418,w:365,h:120}]:[{x:10,y:382,w:180,h:150},{x:710,y:370,w:235,h:150}];
 let reads=0;
 const project=box=>portrait?{
  left:rect.left+rect.width-(box.y+box.h)/540*rect.width,top:rect.top+box.x/960*rect.height,width:box.h/540*rect.width,height:box.w/960*rect.height
 }:{left:rect.left+box.x/960*rect.width,top:rect.top+box.y/540*rect.height,width:box.w/960*rect.width,height:box.h/540*rect.height};
 const buttons=controls.map(box=>({offsetWidth:70,offsetHeight:70,getBoundingClientRect(){reads++;return project(box)}}));
 // A hidden second-player control must not push the cameo into the HUD.
 buttons.push({hidden:true,offsetWidth:0,offsetHeight:0,getBoundingClientRect(){throw Error('hidden control measured')}});
 g.nodes.get('game').getBoundingClientRect=()=>rect;
 const query=g.sandbox.document.querySelectorAll;g.sandbox.document.querySelectorAll=selector=>selector==='.touch-btn, .joystick'?buttons:query(selector);
 return {g,controls,reads:()=>reads};
}
test('mobile photo and speech bubble fit between or above controls in landscape, rotated portrait and two-player layouts',()=>{
 for(const portrait of [false,true])for(const twoPlayers of [false,true]){
  const {g,controls}=mobileLayoutFixture({portrait,twoPlayers});
  const layout=g.run('cornerCameoLayout(assets.cornerCameo)');
  assert.equal(layout.mobile,true);assert.ok(layout.y>135,'keep the photo below the HUD');
  assert.ok(layout.x-154>=0 && layout.x+layout.width<=960,'photo and left-hand balloon stay on screen');
  assert.ok(Math.abs((layout.x-154+layout.x+layout.width)/2-480)<.001,'centre the photo and bubble together');
  const relevant=controls.filter(c=>c.x+c.w>layout.x-154-12 && c.x<layout.x+layout.width+12);
  if(relevant.length)assert.ok(layout.y+layout.height<=Math.min(...relevant.map(c=>c.y))-11.9,'clear overlapping controls vertically');
  else assert.equal(layout.bottom,540,'use the bottom edge when the centre gap is free');
  assert.ok(layout.y+85<layout.bottom,'the full speech balloon and tail must also fit');
  g.run('maybeCornerCameo({attackType:"uppercut"});updateCornerCameo(.3);draw();togglePause();draw()');
  assert.ok(g.run('cornerCameo'),'layout changes must not cancel the active cameo');
 }
});
test('control layout is measured once and refreshed after viewport changes, without per-frame document reads',()=>{
 const {g,controls,reads}=mobileLayoutFixture();
 g.run('maybeCornerCameo({attackType:"uppercut"});updateCornerCameo(.3);for(let i=0;i<20;i++)draw()');
 assert.equal(reads(),2);const old=g.run('cornerCameoLayoutCache.bottom');controls[1].x=600;controls[1].y-=40;
 g.run('syncViewport();draw()');assert.equal(reads(),4);assert.ok(g.run('cornerCameoLayoutCache.bottom')<old-39);
 g.run('for(let i=0;i<20;i++)draw()');assert.equal(reads(),4);
});
test('desktop retains its lower-right placement and the mobile fallback stays above the lower control area',()=>{
 const g=setup();g.run('window.innerWidth=1440;window.innerHeight=900;syncViewport()');
 const desktop=g.run('cornerCameoLayout(assets.cornerCameo)');
 assert.equal(desktop.mobile,false);assert.equal(desktop.x+desktop.width,960);assert.equal(desktop.y,398);assert.equal(desktop.bottom,540);
 g.run('navigator.maxTouchPoints=1;syncViewport()');g.nodes.get('game').getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
 const fallback=g.run('cornerCameoLayout(assets.cornerCameo)');assert.equal(fallback.mobile,true);assert.ok(fallback.bottom<370);assert.ok(fallback.y>200);
});

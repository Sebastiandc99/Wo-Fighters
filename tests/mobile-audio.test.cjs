const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(initial='suspended'){
 const g=game(),control={allow:false,contexts:[]};
 g.sandbox.navigator.audioSession={type:'auto'};
 g.sandbox.window.AudioContext=class {
  constructor(){this.state=initial;this.currentTime=10;this.sampleRate=48000;this.destination={};this.sources=[];this.calls=[];control.contexts.push(this);}
  createBuffer(channels,length,rate){return {silent:true,channels,length,rate,duration:length/rate};}
  createBufferSource(){const s={connect(){return this;},disconnect(){this.disconnected=true;},start(...args){this.started=args;},stop(){this.stopped=true;}};this.sources.push(s);return s;}
  createGain(){return {gain:{value:0},connect(){return this;},disconnect(){}};}
  resume(){this.calls.push('resume');if(!control.allow)return new Promise(()=>{});this.state='running';this.onstatechange?.();return Promise.resolve();}
  suspend(){this.calls.push('suspend');this.state='suspended';this.onstatechange?.();return Promise.resolve();}
 };
 g.run('muted=false;state="title";musicTrack={usage:"title",buffer:{duration:60}};musicElapsed=0;ensureAudio()');
 return {g,control,context:control.contexts[0]};
}
for(const release of ['pointerup','touchend','click']){
 test(release+' unlocks audio even when initial resume and touch start remain blocked',async()=>{
  const {g,control,context}=setup();
  g.nodes.get('document').listeners.pointerdown({pointerType:'touch'});
  assert.equal(context.state,'suspended');assert.equal(g.run('musicSource'),null);
  control.allow=true;g.nodes.get('document').listeners[release]();await settle();
  assert.equal(context.state,'running');assert.ok(g.run('musicSource'));
  assert.equal(g.sandbox.navigator.audioSession.type,'playback');
  assert.ok(context.sources.some(s=>s.buffer?.silent&&s.buffer.length===1&&s.started));
  const calls=context.calls.length,sources=context.sources.length;
  g.nodes.get('document').listeners.pointerdown({pointerType:'touch'});
  g.nodes.get('document').listeners[release]();
  assert.equal(context.calls.length,calls);assert.equal(context.sources.length,sources);
 });
}
test('interruption reconnects music at its previous position and restores active effects',async()=>{
 const {g,control,context}=setup('running');control.allow=true;
 g.run('state="playing";musicTrack.usage="fight";COMBAT_AUDIO.safetySuper.buffer={duration:8};var voice=startCombatSound("safetySuper")');
 const music=g.run('musicSource'),effect=g.run('voice.source');
 context.currentTime=12.5;context.state='interrupted';context.onstatechange();
 assert.equal(g.run('musicSource'),null);assert.equal(g.run('voice.source'),null);
 assert.equal(music.stopped,true);assert.equal(effect.stopped,true);
 g.nodes.get('document').listeners.pointerup();await settle();
 assert.deepEqual(context.calls.slice(-2),['suspend','resume']);
 assert.equal(g.run('musicSource.started[1]'),2.5);
 assert.ok(g.run('voice.source'));assert.notEqual(g.run('voice.source'),effect);
});
test('recovering an interrupted special leaves background music silent',async()=>{
 const {g,control,context}=setup('running');control.allow=true;
 g.run('state="playing";musicTrack.usage="fight";COMBAT_AUDIO.safetySuper.buffer={duration:8};var voice=startCombatSound("safetySuper");workCinematic={owner:player};syncMusic()');
 const offset=g.run('musicElapsed');
 context.state='interrupted';context.onstatechange();
 g.nodes.get('document').listeners.touchend();await settle();
 assert.equal(g.run('musicSource'),null);assert.ok(g.run('voice.source'));
 g.run('workCinematic=null;syncMusic()');
 assert.equal(g.run('musicSource.started[1]'),offset);
});
test('leaving the page retains game pause and sound returns only after resuming play',async()=>{
 const {g,control,context}=setup('running');control.allow=true;
 g.run('state="playing";musicTrack.usage="fight"');
 g.sandbox.document.hidden=true;g.nodes.get('document').listeners.visibilitychange();
 assert.equal(g.run('state'),'paused');assert.equal(context.state,'suspended');
 assert.equal(g.run('musicSource'),null);
 g.sandbox.document.hidden=false;g.nodes.get('document').listeners.visibilitychange();await settle();
 assert.equal(context.state,'running');assert.equal(g.run('state'),'paused');
 assert.equal(g.run('musicSource'),null);
 g.run('togglePause()');assert.equal(g.run('state'),'playing');assert.ok(g.run('musicSource'));
});
test('mute remains respected by every gesture, and explicit unmute primes iOS audio',async()=>{
 const {g,control,context}=setup();g.run('muted=true');
 const before=context.calls.length;
 for(const event of ['pointerup','touchend','click'])g.nodes.get('document').listeners[event]();
 assert.equal(context.calls.length,before);assert.equal(g.run('musicSource'),null);
 control.allow=true;g.nodes.get('soundBtn').listeners.click();await settle();
 assert.equal(g.run('muted'),false);assert.ok(g.run('musicSource'));
 assert.ok(context.sources.some(s=>s.buffer?.silent&&s.started));
});
test('a closed context is replaced without discarding decoded music',async()=>{
 const {g,control,context}=setup('running');control.allow=true;
 const buffer=g.run('musicTrack.buffer');
 context.state='closed';context.onstatechange();
 g.nodes.get('document').listeners.click();await settle();
 assert.equal(control.contexts.length,2);assert.equal(g.run('musicTrack.buffer'),buffer);
 assert.notEqual(g.run('audioCtx'),context);assert.ok(g.run('musicSource'));
});
test('optional Audio Session failures never block sound',async()=>{
 const {g,control,context}=setup();control.allow=true;context.state='closed';
 Object.defineProperty(g.sandbox.navigator.audioSession,'type',{set(){throw Error('unsupported');}});
 g.nodes.get('document').listeners.touchend();await settle();
 assert.equal(g.run('audioCtx.state'),'running');assert.ok(g.run('musicSource'));
});

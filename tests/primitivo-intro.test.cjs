const {test}=require('node:test');const assert=require('node:assert/strict');const {game}=require('./engine-harness.cjs');
function setup(round=1,slot=1,mode='versus'){
 const g=game();g.run(`gameMode='${mode}';startGame('${slot===1?'primitivo':'angel'}','${slot===2?'primitivo':'angel'}');match.round=${round};startRound();const subject=${slot===1?'player':'cpu'};`);return g;
}
test('Primitivo stands upright, points and speaks during all three round announcements on either side',()=>{
 for(const round of [1,2,3])for(const slot of [1,2])for(const mode of ['solo','versus']){
  const g=setup(round,slot,mode);
  assert.equal(g.run('poseFor(subject)'),20);assert.equal(g.run('roundIntroSpeaking(subject)'),false);
  assert.equal(g.run('subject.facing'),slot===1?1:-1);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.voice')+.18);
  assert.equal(g.run('poseFor(subject)'),21);assert.equal(g.run('roundIntroSpeaking(subject)'),true);
  assert.equal(g.run('fighterMotion(subject).rotation'),0);
  const x=g.run('subject.x');assert.equal(g.run("attack(subject,'punch')"),false);
  assert.doesNotThrow(()=>g.run('draw();draw()'));
  assert.equal(g.run('subject.x'),x);assert.equal(g.run('subject.health'),100);
  assert.equal(g.run('roundTime'),90);assert.equal(g.run('combatSounds.size'),0);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.fight-introElapsed')+.01);
  assert.equal(g.run('roundIntroSpeaking(subject)'),false);assert.equal(g.run('poseFor(subject)'),0);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.end-introElapsed')+.02);
  assert.equal(g.run('state'),'playing');assert.equal(g.run("attack(subject,'punch')"),true);
 }
});
test('the presentation freezes with pause and repeats after restarting a round',()=>{
 const g=setup();g.tick(1.4);assert.equal(g.run('roundIntroSpeaking(subject)'),true);
 g.run('togglePause()');const t=g.run('introElapsed');g.tick(.7);
 assert.equal(g.run('introElapsed'),t);assert.equal(g.run('poseFor(subject)'),21);
 assert.equal(g.run('roundIntroSpeaking(subject)'),true);g.run('togglePause()');
 g.tick(3);assert.equal(g.run('state'),'playing');assert.equal(g.run('roundIntroPose(subject)'),null);
 g.run('match.repeat=true;startRound()');assert.equal(g.run('poseFor(player)'),20);
 g.tick(1.4);assert.equal(g.run('roundIntroSpeaking(player)'),true);
});
test('two Primitivos present independently, other fighters and combat poses remain normal',()=>{
 const g=setup();g.run("match.cpuKind='primitivo';startRound()");g.tick(1.4);
 assert.equal(g.run('fighters.filter(roundIntroSpeaking).length'),2);assert.doesNotThrow(()=>g.run('draw()'));
 g.run("match.playerKind='linares';match.cpuKind='tren';startRound()");g.tick(1.4);
 assert.equal(g.run('fighters.some(roundIntroSpeaking)'),false);
 assert.equal(g.run('poseFor(player)'),0);assert.equal(g.run('poseFor(cpu)'),0);
 assert.ok(g.requestedImages.includes('assets/primitivo-intro-v1.webp'));
});
test('slow-loading intro art keeps the fighter visible and switches when ready',()=>{
 const g=setup();g.run('assets.primitivoIntro.complete=false;');
 assert.ok(g.run("atlasSpriteFrame({kind:'primitivo',pose:20})"));
 assert.equal(g.run("spriteFrames.has('primitivo:20')"),false);
 g.run('assets.primitivoIntro.complete=true;');assert.ok(g.run("atlasSpriteFrame({kind:'primitivo',pose:20})"));
 assert.equal(g.run("spriteFrames.has('primitivo:20')"),true);
});

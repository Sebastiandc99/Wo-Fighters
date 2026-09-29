const {test}=require('node:test');const assert=require('node:assert/strict');const {game}=require('./engine-harness.cjs');
function setup(round=1,slot=1,mode='versus'){
 const g=game();g.run(`gameMode='${mode}';startGame('${slot===1?'gabriel':'angel'}','${slot===2?'gabriel':'angel'}');match.round=${round};startRound();const subject=${slot===1?'player':'cpu'};`);return g;
}
test('Gabriel points and says the requested phrase during every round announcement from either side',()=>{
 for(const round of [1,2,3])for(const slot of [1,2])for(const mode of ['solo','versus']){
  const g=setup(round,slot,mode);
  assert.equal(g.run("ROUND_TAUNTS.gabriel.lines.join(' ')"),'Planifiqué derrotarte!');
  assert.equal(g.run('poseFor(subject)'),20);assert.equal(g.run('roundIntroSpeaking(subject)'),false);
  assert.equal(g.run('subject.facing'),slot===1?1:-1);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.voice')+.18);
  assert.equal(g.run('poseFor(subject)'),21);assert.equal(g.run('roundIntroSpeaking(subject)'),true);
  assert.equal(g.run('fighterMotion(subject).rotation'),0);
  assert.equal(g.run("attack(subject,'punch')"),false);assert.doesNotThrow(()=>g.run('draw();draw()'));
  assert.equal(g.run('subject.health'),100);assert.equal(g.run('roundTime'),90);assert.equal(g.run('combatSounds.size'),0);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.fight-introElapsed')+.01);
  assert.equal(g.run('roundIntroSpeaking(subject)'),false);assert.equal(g.run('poseFor(subject)'),0);
  g.tick(g.run('ROUND_AUDIO[match.round].timing.end-introElapsed')+.02);
  assert.equal(g.run('state'),'playing');assert.equal(g.run("attack(subject,'punch')"),true);
 }
});
test('Gabriel shares timing with both other speakers and pause preserves the presentation',()=>{
 for(const rival of ['peluche','primitivo']){
  const g=game();g.run(`gameMode='versus';startGame('gabriel','${rival}')`);g.tick(1.4);
  assert.equal(g.run('fighters.filter(roundIntroSpeaking).length'),2);assert.doesNotThrow(()=>g.run('draw()'));
  g.run('togglePause()');const t=g.run('introElapsed');g.tick(.7);
  assert.equal(g.run('introElapsed'),t);assert.equal(g.run('poseFor(player)'),21);
  g.run('togglePause()');g.tick(3);assert.equal(g.run('fighters.some(roundIntroSpeaking)'),false);
  g.run('match.repeat=true;startRound()');assert.equal(g.run('poseFor(player)'),20);
 }
});
test('Gabriel intro art has a normal-pose fallback while loading',()=>{
 const g=setup();g.run('assets.gabrielIntro.complete=false;');
 assert.ok(g.run("atlasSpriteFrame({kind:'gabriel',pose:21})"));assert.equal(g.run("spriteFrames.has('gabriel:21')"),false);
 g.run('assets.gabrielIntro.complete=true;');assert.ok(g.run("atlasSpriteFrame({kind:'gabriel',pose:21})"));
 assert.equal(g.run("spriteFrames.has('gabriel:21')"),true);
 assert.ok(g.requestedImages.includes('assets/gabriel-intro-v1.webp'));
});

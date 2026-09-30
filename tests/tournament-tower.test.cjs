const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function tournament(kind='angel') {
 const g=game();g.run(`gameMode='solo';playerChoice='${kind}';beginGame()`);return g;
}
function win(g) {g.run(`state='playing';match.playerWins=1;finishRound(player,'TIEMPO')`);}
test('all seven fighters get a fixed tower of six unique rivals, excluding themselves',()=>{
 for(const kind of ['angel','primitivo','peluche','tren','linares','gabriel','fernando']) {
  const g=tournament(kind),rivals=Array.from(g.run('campaign.opponents'));
  assert.equal(rivals.length,6);assert.equal(new Set(rivals).size,6);assert.ok(!rivals.includes(kind));
  assert.equal(g.run('state'),'tower');assert.equal(g.run('musicTrack.usage'),'tower');
  g.key('Enter');g.nodes.get('towerScreen').listeners.pointerdown({target:{tagName:'CANVAS'}});
  assert.equal(g.run('tower.skip'),null);g.tick(6.2);assert.equal(g.run('state'),'tower');
  assert.doesNotThrow(()=>g.run('drawTournamentTower()'));
  g.tick(1.4);assert.equal(g.run('state'),'intro');assert.equal(g.run('cpu.kind'),rivals[0]);
  assert.deepEqual(Array.from(g.run('campaign.opponents')),rivals);
  assert.equal(g.run('musicTrack.usage'),'fight');
 }
});
test('camera visibly traverses upper and intermediate floors before settling at level one',()=>{
 const g=tournament();
 const wide=g.run('towerCameraAt(.1)'),top=g.run('towerCameraAt(1.8)'),middle=g.run('towerCameraAt(3.24)'),end=g.run('towerCameraAt(4.86)');
 assert.equal(wide.zoom,.29);assert.equal(top.y,272);assert.ok(middle.y>top.y&&middle.y<end.y);
 assert.equal(end.y,1127);assert.equal(end.zoom,1.32);
 // Smoothstep joins have small velocity at arrival, rather than a camera teleport.
 assert.ok(g.run('Math.abs(towerCameraAt(4.86).y-towerCameraAt(4.85).y)')<1);
 g.tick(g.run('towerSettleAt()')+.26);assert.equal(g.run('tower.settled'),true);
 g.tick(1.99);assert.equal(g.run('state'),'tower');assert.equal(g.run('towerCameraAt(tower.elapsed).y'),1127);
 g.tick(.4);assert.equal(g.run('state'),'intro');
});
test('only full match victories advance, preserving all six difficulty names, score and opponent order',()=>{
 const g=tournament('linares');g.tick(g.run('tower.duration')+.05);
 const rivals=Array.from(g.run('campaign.opponents'));let score=0;
 for(let i=0;i<6;i++) {
  assert.equal(g.run('cpu.kind'),rivals[i]);assert.equal(g.run('campaign.index'),i);
  assert.equal(g.run('difficulty().name'),['NORMAL','MEDIA','AVANZADA','DIFÍCIL','EXPERTO','MAESTRO'][i]);
  assert.equal(g.run('match.scores[0]'),score);
  g.run(`state='playing';finishRound(player,'TIEMPO')`);g.tick(2.7);
  assert.equal(g.run('state'),'intro');assert.equal(g.run('campaign.index'),i);assert.equal(g.run('campaign.defeated.length'),i);
  g.run(`state='playing';finishRound(player,'TIEMPO')`);score=g.run('match.scores[0]');
  g.tick(.9);assert.equal(g.nodes.get('resultPanel').hidden,false);assert.equal(g.run('state'),'finished');
  assert.equal(g.run('campaign.defeated.length'),i+1);g.tick(1.8);
  assert.equal(g.run('state'),'tower');assert.deepEqual(Array.from(g.run('campaign.opponents')),rivals);
  assert.doesNotThrow(()=>g.run('drawTournamentTower()'));
  if(i<5) {
   const before=g.run('towerCameraAt(0).y');g.tick(1);
   assert.ok(g.run('towerCameraAt(tower.elapsed).y')<before);
   g.tick(g.run('tower.duration-tower.elapsed')+.05);assert.equal(g.run('state'),'intro');
  }else {
   assert.equal(g.run('tower.champion'),true);assert.equal(g.run('campaign.completed'),true);
   g.tick(g.run('tower.duration')+.05);assert.equal(g.run('state'),'finished');assert.equal(g.run('match.endShown'),true);
   assert.equal(g.nodes.get('winnerForm').hidden,false);
   assert.equal(g.run('campaign.score'),score);assert.equal(g.run('match.scores[0]'),score);
  }
 }
});
test('Enter, mobile touch and controller Start shorten later presentations but hold the correct opponent',()=>{
 for(const input of ['key','touch','start']) {
  const g=tournament();g.tick(g.run('tower.duration')+.05);win(g);g.tick(2.7);
  assert.equal(g.run('tower.first'),false);
  const before=g.run('towerCameraAt(tower.elapsed).y');
  if(input==='key')g.key('Enter');
  if(input==='touch')g.nodes.get('towerScreen').listeners.pointerdown({target:{tagName:'CANVAS'}});
  if(input==='start'){g.sandbox.navigator.getGamepads=()=>[{buttons:Array.from({length:10},(_,i)=>({pressed:i===9}))}];g.run('loop(0)');}
  assert.ok(g.run('tower.skip'));assert.equal(g.run('towerCameraAt(tower.elapsed).y'),before);
  g.tick(.15);assert.ok(g.run('towerCameraAt(tower.elapsed).y')<before);
  g.tick(.25);assert.equal(g.run('state'),'tower');assert.equal(g.run('tower.settled'),true);
  g.tick(1.99);assert.equal(g.run('state'),'tower');g.tick(.7);assert.equal(g.run('state'),'intro');assert.equal(g.run('cpu.kind'),g.run('campaign.opponents[1]'));
 }
});
test('final presentation is slower and an exhausted life keeps the usual score-entry flow',()=>{
 const g=tournament();g.tick(g.run('tower.duration')+.05);
 g.run(`campaign.index=5;showTournamentTower()`);
 assert.equal(g.run('tower.final'),true);assert.equal(g.run('tower.duration'),g.run('towerSettleAt()+.25+2+.35'));
 g.tick(g.run('tower.duration')+.05);g.run(`campaign.extraLives=0;state='playing';addScore(player,100);match.cpuWins=1;finishRound(cpu,'TIEMPO')`);
 const score=g.run('match.scores[0]');assert.equal(g.run('campaign'),null);
 g.tick(2.3);assert.equal(g.run('state'),'finished');assert.equal(g.nodes.get('winnerForm').hidden,false);
 assert.equal(g.run('match.scores[0]'),score);
});
test('main menu cancels the tower, background pauses it, and two-player matches bypass it',()=>{
 const g=tournament();g.tick(.2);const t=g.run('tower.elapsed');
 g.sandbox.window.listeners.blur();g.tick(2);assert.equal(g.run('tower.elapsed'),t);
 g.sandbox.window.listeners.focus();g.tick(.2);assert.ok(g.run('tower.elapsed')>t);
 g.nodes.get('towerMenuBtn').listeners.click();assert.equal(g.run('state'),'title');assert.equal(g.run('campaign'),null);assert.equal(g.run('tower'),null);
 g.run(`gameMode='versus';beginGame()`);assert.equal(g.run('state'),'intro');assert.equal(g.run('campaign'),null);
});
test('tower music uses the attachment, fades before combat, and honors its mute button',()=>{
 const g=tournament();
 g.run(`muted=false;audioCtx={state:'running',currentTime:0,destination:{},createBufferSource(){return {connect(){return this},disconnect(){},start(){},stop(){}}},createGain(){return {gain:{value:0},connect(){return this},disconnect(){}}}};EXTRA_AUDIO.tower.buffer={duration:91};syncMusic()`);
 assert.equal(g.run('musicTrack.src'),'assets/tournament-tower-v1.mp3');assert.equal(g.run('musicGain.gain.value'),.46);
 g.run('tower.elapsed=tower.duration-.175;syncMusic()');assert.ok(Math.abs(g.run('musicGain.gain.value')-.23)<.001);
 g.nodes.get('towerSoundBtn').listeners.click();assert.equal(g.run('muted'),true);assert.equal(g.run('musicSource'),null);
 g.nodes.get('towerSoundBtn').listeners.click();assert.equal(g.run('muted'),false);assert.ok(g.run('musicSource'));
});
test('mobile landscape retains camera timing and uses the new tournament difficulty progression',()=>{
 const g=tournament();g.run('navigator.maxTouchPoints=1;window.innerWidth=740;window.innerHeight=416;syncViewport();lastTime=0;accumulator=0;for(let n=1;n<=180;n++)advanceGameClock(n*1000/60)');
 assert.equal(g.run('state'),'tower');assert.ok(Math.abs(g.run('tower.elapsed')-3)<.03);
 assert.doesNotThrow(()=>g.run('drawTournamentTower()'));
 assert.deepEqual(Array.from(g.run('DIFFICULTIES.slice(0,6).map(d=>d.reaction)')),[.23,.19,.15,.12,.09,.08]);
 assert.deepEqual(Array.from(g.run('TOURNAMENT_DIFFICULTIES.map(d=>d.reaction)')),[.23,.18,.135,.095,.065,.04]);
 g.run('for(let n=181;n<=480;n++)advanceGameClock(n*1000/60)');assert.equal(g.run('state'),'intro');
});

test('an embedded browser without controller permissions can still render the tower',()=>{
 const g=tournament();g.sandbox.navigator.getGamepads=()=>{throw Error('Gamepad permission disabled')};
 assert.doesNotThrow(()=>g.run('loop(0)'));assert.equal(g.run('state'),'tower');
});

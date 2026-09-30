const {test}=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function tournament(){const g=game();g.run("gameMode='solo';playerChoice='gabriel';stageChoice='salinas';beginGame()");g.tick(g.run('tower.duration')+.05);return g;}
function lose(g,reason='K.O.'){g.run(`state='playing';match.cpuWins=1;finishRound(cpu,'${reason}')`);g.tick(2.3);}
function win(g){g.run("state='playing';match.playerWins=1;finishRound(player,'TIEMPO')");g.tick(2.7);g.tick(g.run('tower.duration')+.05);}
test('first opponent is identical while later opponents become harder with wider speed and power gaps',()=>{
 const g=tournament();
 assert.equal(g.run('difficulty()===DIFFICULTIES[0]'),true);
 const levels=JSON.parse(g.run('JSON.stringify(TOURNAMENT_DIFFICULTIES)'));
 const old=JSON.parse(g.run('JSON.stringify(DIFFICULTIES)'));
 for(let i=1;i<6;i++){
  assert.ok(levels[i].reaction<old[i].reaction);assert.ok(levels[i].guard>old[i].guard);
  assert.ok(levels[i].tactics>old[i].tactics);assert.ok(levels[i].speed>old[i].speed);assert.ok(levels[i].power>old[i].power);
  if(i>1)for(const key of ['speed','power'])assert.ok(levels[i][key]-levels[i-1][key]>levels[i-1][key]-levels[i-2][key]);
 }
 g.run("gameMode='versus'");assert.equal(g.run('difficulty()===DIFFICULTIES[3]'),true);
});
test('later CPU defenses and power decisions use the increased settings in real combat',()=>{
 for(const [index,guard] of [[0,false],[3,true]]){
  const g=tournament();g.run(`state='playing';campaign.index=${index};player.x=450;cpu.x=550;player.action='punch';aiClock=0;Math.random=()=>.8;updateAI(.01)`);
  assert.equal(g.run('cpu.guarding'),guard);
 }
 for(const [index,power] of [[0,40],[5,10]]){
  const g=tournament();g.run(`state='playing';campaign.index=${index};player.x=300;cpu.x=650;cpu.power=40;aiClock=0;Math.random=()=>.7;updateAI(.01)`);
  assert.equal(g.run('cpu.power'),power);
 }
});
test('one lost round does not consume a life; first full defeat offers one retry with frozen controls',()=>{
 const g=tournament();g.run("state='playing';finishRound(cpu,'TIEMPO')");assert.equal(g.run('state'),'roundOver');assert.equal(g.run('campaign.extraLives'),1);
 g.tick(2.7);g.run("state='playing';addScore(player,123);finishRound(cpu,'TIEMPO')");g.tick(2.3);
 assert.equal(g.run('state'),'continue');assert.equal(g.nodes.get('resultKicker').textContent,'TE QUEDA 1 VIDA');
 assert.equal(g.nodes.get('winnerForm').hidden,true);assert.equal(g.nodes.get('continuePanel').hidden,false);
 const health=g.run('player.health'),score=g.run('campaign.score');g.key('KeyL');g.tick(5);
 assert.equal(g.run('player.health'),health);assert.equal(g.run('campaign.score'),score);assert.equal(g.run('state'),'continue');
});
test('same fighter retries the current enemy with score, stage and progress; the second defeat ends the run',()=>{
 const g=tournament();win(g);g.run('addScore(player,200)');
 const index=g.run('campaign.index'),rival=g.run('cpu.kind'),score=g.run('campaign.score'),defeated=Array.from(g.run('campaign.defeated'));
 lose(g);g.nodes.get('continueSameBtn').listeners.click();
 assert.equal(g.run('state'),'tower');assert.equal(g.run('campaign.extraLives'),0);assert.equal(g.run('tower.retry'),true);
 g.tick(g.run('tower.duration')+.05);
 assert.equal(g.run('player.kind'),'gabriel');assert.equal(g.run('cpu.kind'),rival);assert.equal(g.run('campaign.index'),index);
 assert.equal(g.run('match.scores[0]'),score);assert.equal(g.run('stageChoice'),'salinas');assert.deepEqual(Array.from(g.run('campaign.defeated')),defeated);
 assert.equal(g.run('player.health'),100);assert.equal(g.run('match.cpuWins'),0);assert.equal(g.run('match.playerWins'),0);
 win(g);assert.equal(g.run('campaign.extraLives'),0);assert.equal(g.run('campaign.index'),index+1);
 const finalScore=g.run('campaign.score');lose(g,'TIEMPO');
 assert.equal(g.run('campaign'),null);assert.equal(g.run('state'),'finished');assert.equal(g.nodes.get('winnerForm').hidden,false);
 assert.equal(g.run('match.scores[0]'),finalScore);assert.equal(g.nodes.get('continuePanel').hidden,true);
});
test('changing fighter preserves the ladder, supports mirror choice and allows backing out before spending a life',()=>{
 const g=tournament();lose(g);const rivals=Array.from(g.run('campaign.opponents')),rival=g.run('cpu.kind');
 g.key('ArrowRight');g.key('Enter');assert.equal(g.run('state'),'select');assert.match(g.nodes.get('selectionPrompt').textContent,/TE QUEDA 1 VIDA/);
 g.run("chooseFighter('fernando')");g.key('Escape');assert.equal(g.run('state'),'continue');assert.equal(g.run('playerChoice'),'gabriel');assert.equal(g.run('campaign.extraLives'),1);
 g.nodes.get('continueChangeBtn').listeners.click();g.run(`chooseFighter('${rival}')`);g.nodes.get('confirmBtn').listeners.click();
 assert.equal(g.run('state'),'tower');assert.equal(g.run('campaign.extraLives'),0);g.tick(g.run('tower.duration')+.05);
 assert.equal(g.run('player.kind'),rival);assert.equal(g.run('cpu.kind'),rival);assert.deepEqual(Array.from(g.run('campaign.opponents')),rivals);
 assert.equal(g.run('stageChoice'),'salinas');assert.equal(g.run('campaign.index'),0);
});
test('menu cancels the pending continue and a new tournament starts with its one extra life',()=>{
 const g=tournament();lose(g);g.nodes.get('continueMenuBtn').listeners.click();
 assert.equal(g.run('campaign'),null);assert.equal(g.run('state'),'title');assert.equal(g.nodes.get('continuePanel').hidden,true);
 g.run("gameMode='solo';beginGame()");assert.equal(g.run('campaign.extraLives'),1);assert.equal(g.run('campaign.continuePending'),false);
 g.run("mainMenu();gameMode='versus';startGame('gabriel','angel')");lose(g);
 assert.equal(g.run('campaign'),null);assert.equal(g.run('state'),'finished');assert.equal(g.nodes.get('continuePanel').hidden,true);
});

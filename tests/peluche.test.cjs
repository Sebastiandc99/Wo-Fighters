const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(rival='angel',direction=1){const g=game();g.run(`gameMode='versus';startGame('peluche','${rival}');state='playing';player.x=480;cpu.x=480+${direction}*260;player.facing=${direction};cpu.facing=${-direction};player.power=100;`);return g;}
function frames(g,t){g.run(`for(let i=0;i<${Math.round(t*120)};i++){update(STEP);draw();updateHud();}`);}
test('Peluche selection, attributes and complete two-opponent tournament',()=>{
 const g=setup();g.run("openModeSelection();gameMode='solo';openSelection();chooseFighter('angel')");
 const tile=g.nodes.get('pick-peluche');tile.listeners.pointerenter?.();assert.notEqual(g.run('playerChoice'),'peluche');
 tile.listeners.click();assert.equal(g.run('playerChoice'),'peluche');g.run("beginGame()");
 assert.deepEqual(Array.from(g.run('campaign.opponents')).sort(),['angel','primitivo']);
 assert.deepEqual(Array.from(g.run('[stats.peluche.normalDamage,stats.peluche.resistance,stats.peluche.agility,stats.peluche.meleeReach,stats.peluche.recovery]')),[9,110,5,4,.64]);
 assert.ok(g.run('stats.peluche.speed>stats.primitivo.speed && stats.peluche.speed<stats.angel.speed'));
 g.run("state='playing';match.playerWins=1;finishRound(player,'TIEMPO');nextOpponent();state='playing';match.playerWins=1;finishRound(player,'TIEMPO')");assert.equal(g.run('campaign.completed'),true);assert.equal(g.run('campaign.wins'),2);
});
test('Hormigonazo costs 30, arcs, hits once for base 22 and coats all rival sizes in both directions',()=>{
 for(const rival of ['angel','primitivo','peluche'])for(const dir of [-1,1]){
  const g=setup(rival,dir);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),70);
  assert.equal(g.run('player.moveSpec.recovery'),.64);frames(g,.22);
  assert.equal(g.run('projectiles[0].style'),'concrete');assert.equal(g.run('projectiles[0].damage'),22);
  assert.ok(g.run('projectiles[0].vy<0'));assert.equal(g.run('player.attackSound'),null);
  frames(g,.65);assert.ok(g.run('cpu.concreteCoat')>0);
  const hp=g.run('cpu.health');assert.ok(Math.abs(hp-(100-22*.6*100/g.run('stats[cpu.kind].resistance')))<.002);
  frames(g,1.5);assert.equal(g.run('cpu.health'),hp);assert.equal(g.run('projectiles.length'),0);assert.equal(g.run('cpu.concreteCoat'),0);
 }
});
test('Hormigonazo expires at medium range and respects guard and evasion',()=>{
 const g=setup();g.run("cpu.x=1140;attack(player,'special')");frames(g,1.8);assert.equal(g.run('cpu.health'),100);assert.equal(g.run('projectiles.length'),0);
 for(const defense of ['held2.guard=true','cpu.invuln=2']){
  const g=setup();g.run(defense+";attack(player,'special')");frames(g,1.1);assert.ok(g.run('cpu.health')>90);
 }
});
test('Colado Masivo needs 100 and range 8/10, locks both players, hits once at the break and releases controls',()=>{
 for(const dir of [-1,1]){
  const g=setup('primitivo',dir);g.run('player.power=99;held.down=true');assert.equal(g.run("attack(player,'special')"),false);
  g.run('player.power=100;cpu.x=player.x-660');assert.equal(g.run("attack(player,'special')"),false);assert.equal(g.run('player.power'),100);
  g.run(`cpu.x=player.x+${dir}*260`);assert.equal(g.run("attack(player,'special')"),true);assert.equal(g.run('player.power'),0);
  assert.equal(g.run('poseFor(player)'),17);g.key('KeyW');g.key('Digit7');assert.equal(g.run('player.grounded'),true);assert.equal(g.run('cpu.queuedAction'),null);
  frames(g,1.85);assert.equal(g.run('cpu.health'),100);frames(g,.1);
  const hp=g.run('cpu.health');assert.ok(Math.abs(hp-(100-34*.6*100/110))<.002);
  frames(g,1.2);assert.equal(g.run('workCinematic'),null);assert.equal(g.run('cpu.health'),hp);
  g.key('KeyS','keyup');g.key('KeyW');g.key('Digit8');assert.equal(g.run('player.grounded'),false);assert.equal(g.run('cpu.action'),'kick');
  frames(g,1.2);const event={pointerId:1,preventDefault(){}};g.taps[0].listeners.pointerdown(event);g.taps2[0].listeners.pointerdown(event);
  assert.equal(g.run('player.grounded'),false);assert.equal(g.run('cpu.grounded'),false);
 }
});
test('Peluche CPU can use a cinematic without spawning a second projectile or freezing the next round',()=>{
 const g=setup();g.run("gameMode='solo';startGame('angel','peluche');state='playing';aiEnabled=true;let fired=false;updateAI=()=>{if(!fired){fired=true;cpu.power=100;Math.random=()=>0;attack(cpu,'special')}}");
 frames(g,.4);assert.equal(g.run('workCinematic.owner===cpu'),true);assert.equal(g.run('projectiles.length'),0);
 frames(g,3.0);assert.equal(g.run('workCinematic'),null);g.key('KeyW');assert.equal(g.run('player.grounded'),false);
 g.run('startRound()');frames(g,4);g.key('KeyJ');assert.equal(g.run('player.action'),'punch');
});
test('Peluche melee, movement and every pose render without invalid coordinates',()=>{
 for(const rival of ['angel','primitivo','peluche'])for(const dir of [-1,1]){
  const g=setup(rival,dir);g.run(`cpu.x=480+${dir}*60;attack(player,'punch')`);frames(g,.5);assert.ok(g.run('cpu.health')<100);
  assert.doesNotThrow(()=>g.run("for(let pose=0;pose<=18;pose++)drawSpriteFrame({...renderedFighter(player),pose,fromPose:pose,mix:1})"));
  frames(g,.7);g.key('KeyW');g.key('KeyK');frames(g,.25);assert.equal(g.run('poseFor(player)'),13);
  frames(g,1.3);g.key('KeyO');frames(g,.1);assert.equal(g.run('poseFor(player)'),18);
 }
});
test('all six powers have distinct audio; cinematic sound follows pause/resume and is removed on exit',()=>{
 for(const [kind,common,superName] of [['angel','beam','hookSuper'],['primitivo','forklift','containerSuper'],['peluche','concrete','concreteSuper']]){
  const g=setup();g.run(`startGame('${kind}','angel');state='playing';player.power=100;attack(player,'special')`);frames(g,.25);
  assert.equal(g.run('projectiles[0].sound.name'),common);g.run('stopAllCombatSounds();player.action="idle";player.actionTime=0;player.specialCooldown=0;player.power=100;held.down=true');
  g.run("attack(player,'special')");assert.equal(g.run('workCinematic.sound.name'),superName);frames(g,.5);
  const elapsed=g.run('workCinematic.sound.elapsed');assert.ok(elapsed>=.49);
  g.run('togglePause()');frames(g,.5);assert.equal(g.run('workCinematic.sound.elapsed'),elapsed);
  g.run('togglePause()');frames(g,.2);assert.ok(g.run('workCinematic.sound.elapsed')>elapsed);
  g.run('mainMenu()');assert.equal(g.run('combatSounds.size'),0);assert.equal(g.run('workCinematic'),null);
 }
});
test('one-shot audio voices expire instead of accumulating after repeated hits',()=>{
 const g=setup();g.run("for(const cue of Object.values(COMBAT_AUDIO))cue.buffer={duration:.6};for(let i=0;i<30;i++)startCombatSound('concreteImpact');advanceCombatSounds(.7)");assert.equal(g.run('combatSounds.size'),0);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
function setup(a='peluche',b='angel',dir=1){
 const g=game();g.run(`gameMode='versus';startGame('${a}','${b}');state='playing';player.x=600;cpu.x=600+${dir}*58;player.facing=${dir};cpu.facing=${-dir};`);return g;
}
function uppercut(g){g.key('KeyS');g.key('KeyJ');g.key('KeyJ','keyup');g.key('KeyS','keyup');g.tick(.22);}
test('Peluche is shorter than Ángel in sprite size and collision height',()=>{
 const g=setup();assert.ok(g.run('stats.peluche.size < stats.angel.size && stats.peluche.height < stats.angel.height'));
});
test('uppercuts launch every fighter backwards, land on the back once, then restore control',()=>{
 for(const a of ['angel','primitivo','peluche'])for(const b of ['angel','primitivo','peluche'])for(const dir of [-1,1]){
  const g=setup(a,b,dir);g.run('let landings=0;const soundBefore=startCombatSound;startCombatSound=name=>{if(name==="bodyFall")landings++;return soundBefore(name)}');
  uppercut(g);assert.equal(g.run('cpu.knockdown?.phase'),'air',`${a} vs ${b} direction ${dir}`);
  const health=g.run('cpu.health');assert.ok(health<100);assert.ok(g.run(`cpu.vx*${dir}>0 && cpu.vy<0 && !cpu.grounded`));
  g.key('ArrowUp');g.key('Digit7');g.tick(.3);assert.equal(g.run('cpu.action'),'hit');assert.ok(g.run('Math.abs(fighterMotion(cpu).rotation)>1.4'));
  g.tick(.5);assert.equal(g.run('cpu.knockdown?.phase'),'down');assert.equal(g.run('cpu.y'),g.run('FLOOR'));assert.equal(g.run('landings'),1);
  g.tick(.9);assert.equal(g.run('cpu.knockdown'),null);assert.equal(g.run('cpu.health'),health);
  g.key('Digit7','keyup');g.key('Digit7');assert.equal(g.run('cpu.action'),'punch');
  g.tick(.9);g.taps2[0].listeners.pointerdown({pointerId:1,preventDefault(){}});assert.equal(g.run('cpu.grounded'),false);
 }
});
test('blocking an uppercut prevents knockdown and impact cue',()=>{
 const g=setup();g.key('Digit0');uppercut(g);assert.equal(g.run('cpu.knockdown'),null);assert.equal(g.run('cpu.health'),100);
 assert.equal(g.run('[...combatSounds].some(v=>v.name==="uppercutHit")'),false);
});
test('whiffs have only swing audio; punch, kick and uppercut use different contact sounds',()=>{
 for(const type of ['punch','kick','uppercut']){
  const g=setup();g.run('cpu.x=1000');if(type==='uppercut')g.key('KeyS');g.key(type==='kick'?'KeyK':'KeyJ');g.tick(.35);
  assert.equal(g.run('[...combatSounds].some(v=>v.name.endsWith("Hit"))'),false);
  const close=setup();if(type==='uppercut')close.key('KeyS');close.key(type==='kick'?'KeyK':'KeyJ');close.tick(.25);
  assert.ok(close.run(`[...combatSounds].some(v=>v.name==='${type}Hit')`),type);
 }
});
test('knockdown pauses, survives corners and KO, and resets on the next round',()=>{
 const g=setup('angel','primitivo');uppercut(g);g.run('togglePause()');const age=g.run('cpu.knockdown.age');g.tick(.8);assert.equal(g.run('cpu.knockdown.age'),age);
 g.run('togglePause();cpu.x=FIGHTER_RIGHT-1');g.tick(1.8);assert.equal(g.run('cpu.knockdown'),null);assert.ok(g.run('cpu.x<=FIGHTER_RIGHT'));
 const ko=setup('primitivo','peluche');ko.run('cpu.health=1');uppercut(ko);assert.equal(ko.run('state'),'roundOver');ko.tick(1.8);
 assert.equal(ko.run('cpu.knockdown.phase'),'down');assert.equal(ko.run('cpu.health'),0);assert.equal(ko.run('cpu.y'),ko.run('FLOOR'));
 ko.run('startRound()');assert.equal(ko.run('cpu.knockdown'),null);
});
test('contact voices obey pause and finish without looping or leaking to next round',()=>{
 const g=setup();g.run('for(const name of ["punchHit","kickHit","uppercutHit","bodyFall","meleeSwing"])COMBAT_AUDIO[name].buffer={duration:.45};');
 g.key('KeyJ');g.tick(.2);g.run('togglePause()');const elapsed=g.run('[...combatSounds].find(v=>v.name==="punchHit").elapsed');
 g.tick(.8);assert.equal(g.run('[...combatSounds].find(v=>v.name==="punchHit").elapsed'),elapsed);
 g.run('togglePause()');g.tick(.8);assert.equal(g.run('combatSounds.size'),0);
 g.run('startCombatSound("kickHit");startRound()');assert.equal(g.run('combatSounds.size'),0);
});

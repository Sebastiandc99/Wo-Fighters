const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');
const roster=['angel','primitivo','peluche','tren','linares','gabriel','fernando'];
const routes=JSON.parse(game().run('JSON.stringify(MELEE_COMBOS)'));
function setup(kind='angel',rival='primitivo',slot=1,dir=1,corner=false){
  const g=game();
  g.run(`gameMode='versus';startGame('${slot===1?kind:rival}','${slot===2?kind:rival}');state='playing';
    const subject=${slot===1?'player':'cpu'},target=${slot===1?'cpu':'player'};
    subject.x=480;target.x=480+${dir}*58;subject.facing=${dir};target.facing=${-dir};
    ${corner?`target.x=${dir===1?'FIGHTER_RIGHT':'FIGHTER_LEFT'};subject.x=target.x - (${dir})*58;`:''}
    let contacts=[];const realHit=hit;
    hit=(...args)=>{const before=target.health,result=realHit(...args);
      if(args[4]===subject&&args[0]===target&&target.health<before&&subject.attackConnected)
        contacts.push({type:args[5].attackType,low:args[5].low,finisher:args[5].chainFinisher,
          damage:before-target.health,time:90-roundTime});return result;};
  `);
  return g;
}
function press(g,token,slot=1,dir=1,touch=false,repeat=false){
  const punch=slot===1?'KeyJ':'Digit7',kick=slot===1?'KeyK':'Digit8';
  const down=slot===1?'KeyS':'ArrowDown';
  const back=slot===1?(dir===1?'KeyA':'KeyD'):(dir===1?'ArrowLeft':'ArrowRight');
  const mod=['U','D'].includes(token)?down:token==='B'?back:null;
  if(mod)g.key(mod);
  if(touch){
    const button=(slot===1?g.taps:g.taps2)[['P','U'].includes(token)?1:2];
    button.listeners.pointerdown({pointerId:41,preventDefault(){}});
    button.listeners.pointerup({pointerId:41});
  }else{
    const key=['P','U'].includes(token)?punch:kick;
    g.key(key,'keydown',repeat);g.key(key,'keyup');
  }
  if(mod)g.key(mod,'keyup');
}
function enter(g,route,slot=1,dir=1,touch=false,spacing=.035){
  for(const token of route.tokens){press(g,token,slot,dir,touch);g.tick(spacing);}
}
test('fourteen strings connect once per press against every stature on both player slots and sides',()=>{
  let cases=0;
  for(const kind of roster)for(const [i,route] of routes[kind].entries())for(const rival of roster){
    const slot=cases%2+1,dir=cases++%3===0?-1:1;
    const g=setup(kind,rival,slot,dir);
    enter(g,route,slot,dir);g.tick(.72);
    const contacts=g.run('contacts');
    assert.equal(contacts.length,route.tokens.length,`${kind}/${route.name} against ${rival} ${slot}P/${dir}`);
    assert.equal(contacts.filter(c=>c.finisher).length,1);
    assert.equal(g.run('subject.comboName'),route.name);
    assert.equal(g.run('subject.combo'),route.tokens.length);
    assert.ok(Math.abs(100-g.run('target.health')-g.run(`comboDamage('${kind}',MELEE_COMBOS.${kind}[${i}],'${rival}')`))<.002);
    assert.equal(g.run('subject.meleeChain'),null);
    assert.ok(g.run('subject.power')>=40,'melee uses no energy');
    assert.equal(g.run('contacts.filter(c=>c.low).length'),route.tokens.filter(t=>t==='D').length,'directions are captured on press');
    g.tick(2);assert.equal(g.run('subject.action'),'idle');
  }
});
test('keyboard and touch accept fast or paced entries and preserve relative back on either side',()=>{
  for(const kind of roster)for(const route of routes[kind])for(const slot of [1,2])for(const dir of [-1,1]){
    const g=setup(kind,'primitivo',slot,dir);
    enter(g,route,slot,dir,true,.08);g.tick(.65);
    assert.equal(g.run('contacts.length'),route.tokens.length,`${kind} touch ${slot}P/${dir}`);
    assert.equal(g.run('subject.comboName'),route.name);
    if(route.tokens.at(-1)==='U')assert.ok(g.run('target.knockdown'));
  }
});
test('a whiff or a correctly guarded opening discards the entire buffered string',()=>{
  for(const kind of roster)for(const route of routes[kind])for(const mode of ['whiff','standGuard','lowGuard']){
    const g=setup(kind);
    if(mode==='whiff')g.run('target.x=subject.x+550');
    else{g.key('Digit0');if(mode==='lowGuard')g.key('ArrowDown');}
    enter(g,route);g.tick(1.3);
    if(mode==='whiff')assert.equal(g.run('target.health'),100,`${kind} ${mode}`);
    else assert.ok(g.run('target.health')<=100&&g.run('target.health')>98,`${kind} ${mode} chip or high-strike miss`);
    assert.equal(g.run('contacts.length'),0);
    assert.equal(g.run('subject.meleeChain'),null);
    assert.equal(g.run('subject.comboName'),'');
  }
});
test('interruptions, guard requests and wrong sequences stop queued continuation',()=>{
  for(const kind of roster){
    const g=setup(kind);enter(g,routes[kind][0]);
    g.run('hit(subject,3,-80,0,target,{sourceX:target.x,attackType:"punch"})');g.tick(1);
    assert.ok(g.run('contacts.length')<=1,kind);assert.equal(g.run('subject.meleeChain'),null);
    const guard=setup(kind);enter(guard,routes[kind][0]);guard.key('KeyI');guard.tick(.8);
    assert.ok(guard.run('contacts.length')<=1,kind);assert.equal(guard.run('subject.meleeChain'),null);
    const wrong=setup(kind);press(wrong,'P');wrong.tick(.025);press(wrong,'U');wrong.tick(.5);
    assert.ok(wrong.run('contacts.length')<=1,kind);assert.equal(wrong.run('subject.comboName'),'');
  }
});
test('holding or autorepeating one button never supplies missing combination inputs',()=>{
  const g=setup('tren');press(g,'P');g.tick(.08);
  for(let i=0;i<5;i++){press(g,'K',1,1,false,true);g.tick(.08);}
  g.tick(.6);assert.equal(g.run('contacts.length'),1);assert.equal(g.run('subject.comboName'),'');
  const justOne=setup('primitivo');press(justOne,'P');justOne.tick(.8);
  assert.equal(justOne.run('contacts.length'),1);assert.equal(justOne.run('subject.action'),'idle');
});
test('pause freezes pending inputs and resume completes the same string; rounds and KO clear it',()=>{
  for(const kind of roster){
    const g=setup(kind);enter(g,routes[kind][0]);g.run('togglePause()');
    const saved=g.run('JSON.stringify([subject.meleeChain,subject.actionTime,target.health])');
    g.tick(2);assert.equal(g.run('JSON.stringify([subject.meleeChain,subject.actionTime,target.health])'),saved);
    g.run('togglePause()');g.tick(1);assert.equal(g.run('contacts.length'),routes[kind][0].tokens.length);
    const ko=setup(kind);ko.run('target.health=1');enter(ko,routes[kind][0]);ko.tick(.8);
    assert.equal(ko.run('state'),'roundOver');assert.equal(ko.run('subject.meleeChain'),null);
    assert.equal(ko.run('contacts.length'),1);assert.equal(ko.run('subject.comboDamage'),1);
    ko.run('startRound()');assert.equal(ko.run('player.meleeChain'),null);
    assert.equal(ko.run('player.comboName'),'');assert.equal(ko.run('player.comboDamage'),0);
  }
});
test('finishers cannot loop in either corner and allow the defender to cover or get up',()=>{
  for(const kind of roster)for(const route of routes[kind])for(const dir of [-1,1]){
    const g=setup(kind,'primitivo',1,dir,true);enter(g,route,1,dir);g.tick(.80);
    const before=g.run('target.health');g.key('Digit0');
    for(let i=0;i<18;i++){press(g,'P',1,dir);g.tick(.11);}
    assert.ok(g.run('target.health')<=before&&before-g.run('target.health')<4,`${kind} ${dir} escape/guard chip`);
    assert.equal(g.run('contacts.length'),route.tokens.length);
    assert.ok(g.run('Number.isFinite(subject.x)&&Number.isFinite(target.x)'));
  }
});
test('combo tuning rewards distinct styles while remaining below full-bar specials',()=>{
  const g=setup();
  assert.ok(g.run('COMBO_PROFILES.primitivo.impact>COMBO_PROFILES.tren.impact'));
  assert.ok(g.run('COMBO_PROFILES.tren.tempo>COMBO_PROFILES.primitivo.tempo'));
  const referenceDamage=Object.fromEntries(roster.map(kind=>[kind,routes[kind].map((_,i)=>g.run(`comboDamage('${kind}',MELEE_COMBOS.${kind}[${i}])`))]));
  for(const [kind,totals] of Object.entries(referenceDamage))for(const total of totals){
    assert.ok(total>=7.5&&total<=14.5,`${kind} balanced damage ${total}`);
    assert.ok(total<g.run(`fighterPowers.${kind}.superDamage*DAMAGE_SCALE`));
  }
  assert.ok(referenceDamage.primitivo[0]>referenceDamage.tren[0]);
});
test('CPU uses its own sequences progressively without adding combos to the first tournament rival',()=>{
  for(const kind of roster){
    const g=setup(kind,'angel',2,-1);
    g.run(`gameMode='solo';aiEnabled=true;campaign={index:5};Math.random=()=>0;
      cpu.moveIntent=0;player.x=cpu.x-58;cpu.facing=-1;player.facing=1;attack(cpu,'punch');`);
    g.tick(.9);
    assert.ok(g.run('cpu.comboName.length>0'),kind);
    assert.equal(g.run('cpu.meleeChain'),null);
    const first=setup(kind,'angel',2,-1);
    first.run("gameMode='solo';campaign={index:0};Math.random=()=>0;attack(cpu,'punch')");
    assert.equal(first.run('cpu.meleeChain.aiRoute'),null);
    assert.equal(first.run('comboChance()'),0);
  }
});
test('selection and pause show actual character strings, keys and resistance-adjusted damage',()=>{
  const g=setup('tren','primitivo');g.run('updateSelectionGuide("tren");updatePauseGuide()');
  assert.match(g.nodes.get('selectionGuide').innerHTML,/Tormenta de golpes/);
  assert.match(g.nodes.get('selectionGuide').innerHTML,/COMBOS/);
  assert.match(g.nodes.get('pausePowers1').innerHTML,/Secuencia de arco/);
  assert.match(g.nodes.get('pausePowers1').innerHTML,/7,5%/);
  assert.match(g.nodes.get('pausePowers2').innerHTML,/Puños de acero/);
});

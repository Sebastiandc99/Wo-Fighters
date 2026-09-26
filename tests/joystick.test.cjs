const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./engine-harness.cjs');

const pointer=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}});

test('stick steers continuously, jumps on the upward edge and returns to center',()=>{
  const g=game(),stick=g.joysticks[0];
  stick.listeners.pointerdown(pointer(1,60,60));
  assert.equal(g.run('held.left || held.right || held.down'),false);
  stick.listeners.pointermove(pointer(1,110,60));
  assert.equal(g.run('held.right'),true);
  g.tick(.04);
  assert.ok(g.run('player.vx')>0);
  stick.listeners.pointermove(pointer(1,110,10));
  assert.equal(g.run('held.right'),true);
  assert.ok(g.run('player.vy')<0);
  stick.listeners.pointermove(pointer(1,60,60));
  assert.equal(g.run('held.right || held.down'),false);
  stick.listeners.pointerup(pointer(1,60,60));
  assert.equal(g.run('joystickDirections.size'),0);
  assert.equal(g.nodes.get('joystickKnob1').style.transform,'translate(-50%, -50%)');
});

test('down diagonals retain crouch and enable touch uppercuts and supers',()=>{
  const g=game();g.run('startGame("peluche","tren");state="playing";player.power=100');
  const stick=g.joysticks[0];
  stick.listeners.pointerdown(pointer(2,100,100));
  assert.equal(g.run('held.right && held.down'),true);
  g.taps[1].listeners.pointerdown(pointer(3,120,120));
  assert.equal(g.run('player.action'),'uppercut');
  g.tick(.7);
  g.run('player.action="idle";player.actionTime=0;player.specialCooldown=0;player.power=100');
  g.taps[3].listeners.pointerdown(pointer(4,120,120));
  assert.equal(g.run('player.specialStyle'),'concreteSuper');
  stick.listeners.pointercancel(pointer(2,100,100));
  assert.equal(g.run('held.down || held.right'),false);
});

test('both sticks remain independent; pause and rotated portrait release all input',()=>{
  const g=game();g.run('gameMode="versus"');
  const [a,b]=g.joysticks;
  a.listeners.pointerdown(pointer(11,110,10));
  b.listeners.pointerdown(pointer(12,10,110));
  assert.equal(g.run('held.right && !held.down && held2.left && held2.down'),true);
  b.listeners.pointercancel(pointer(12,10,110));
  assert.equal(g.run('held2.left || held2.down'),false);
  g.run('document.body.classList.add("phone-portrait")');
  b.listeners.pointerdown(pointer(13,20,100)); // Screen down/right maps to game right/down after rotation.
  assert.equal(g.run('held2.right && held2.down'),true);
  g.key('Space');
  assert.equal(g.run('joystickDirections.size'),0);
  assert.equal(g.run('held.right || held2.right || held2.down'),false);
  assert.equal(b.classList.contains('active'),false);
  assert.equal(g.nodes.get('joystickKnob2').style.transform,'translate(-50%, -50%)');
});

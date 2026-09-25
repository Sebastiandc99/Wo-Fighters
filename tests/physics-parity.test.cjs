const {test}=require('node:test');
const assert=require('node:assert/strict');
const {trace}=require('./physics-trace.cjs');
const reference=require('./fixtures/kp-physics.json');
// Unblocked uppercuts intentionally differ: their full knockdown is covered in melee.test.cjs.
for(const kind of ['angel','primitivo']) test(`${kind}: movement, jumping, guarded attacks, roll and turning match KP frame by frame`,()=>{
  assert.deepEqual(trace(kind),reference.traces[kind]);
});

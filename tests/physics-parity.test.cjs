const {test}=require('node:test');
const assert=require('node:assert/strict');
const {trace}=require('./physics-trace.cjs');
const reference=require('./fixtures/kp-physics.json');
for(const kind of ['angel','primitivo']) test(`${kind}: movement, jumping, attacks, guard, roll and turning match KP frame by frame`,()=>{
  assert.deepEqual(trace(kind),reference.traces[kind]);
});

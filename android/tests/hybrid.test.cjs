
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createWoRankingStore}=require('../hybrid-ranking.js');
const sample={id:'match-123456',name:'Seba',score:171817,mode:'solo',character:'german'};
function setup(initial={}) {
  let clock=100000, connected=false;
  const bytes=new Map(Object.entries(initial));
  const calls=[];
  const storage={getItem:k=>bytes.get(k)||null,setItem:(k,v)=>bytes.set(k,v)};
  const remote=new Map();
  const transport={
    save:async e=>{ calls.push(['save',e]); if(!remote.has(e.id))remote.set(e.id,{...e,createdAt:clock}); },
    load:async()=>{calls.push(['load']);return [...remote.values()];}
  };
  const options={storage,online:()=>connected,transport,now:()=>clock};
  return {store:createWoRankingStore(options),options,bytes,calls,remote,
    connect:()=>{connected=true}, disconnect:()=>{connected=false},tick:()=>{clock+=31000}};
}
test('Offline first launch never contacts ranking',async()=>{
  const h=setup(); await h.store.refresh(); await h.store.flush();
  assert.equal(h.calls.length,0); assert.equal(h.store.list().entries.length,0);
});
test('Offline results survive closing and reopening',()=>{
  const h=setup();h.store.queue(sample);
  const reopened=createWoRankingStore(h.options);
  assert.equal(reopened.list().pending,1);assert.equal(reopened.list().entries[0].score,171817);
});
test('Repeated submission uses the same game ID',async()=>{
  const h=setup();h.store.queue(sample);h.store.queue(sample);
  assert.equal(h.store.list().entries.length,1);
  h.connect();await Promise.all([h.store.flush(),h.store.flush()]);
  assert.equal(h.calls.filter(e=>e[0]==='save').length,1);
  assert.equal(h.store.list().pending,0);
});
test('Timeout after server insert safely retries without duplicates',async()=>{
  const h=setup();h.store.queue(sample);h.connect();
  const original=h.options.transport.save;let first=true;
  h.options.transport.save=async e=>{await original(e);if(first){first=false;throw new Error('timeout')}};
  await h.store.flush();assert.equal(h.store.list().pending,1);
  h.tick();await h.store.flush();assert.equal(h.remote.size,1);assert.equal(h.store.list().pending,0);
});
test('Unavailable server preserves local entries and avoids retry storms',async()=>{
  const h=setup();h.store.queue(sample);h.connect();
  h.options.transport.save=async()=>{h.calls.push(['failure']);throw new Error('unavailable')};
  await h.store.refresh();await h.store.refresh();await h.store.flush();
  assert.equal(h.calls.length,1);assert.equal(h.store.list().pending,1);
  assert.equal(h.store.list().entries.length,1);
});
test('Reconnection resets backoff and refreshes global ranking',async()=>{
  const h=setup();h.store.queue(sample);h.connect();await h.store.reconnect();
  assert.equal(h.store.list().pending,0);assert.equal(h.store.list().cachedAt,100000);
  h.disconnect();await h.store.refresh();assert.equal(h.calls.length,2);
});
test('Out of bounds score, unknown fighter and modified duplicate are rejected',()=>{
  const h=setup();
  for(const bad of [{...sample,score:1000001},{...sample,score:-1},{...sample,score:1.5},
    {...sample,character:'hacker'},{...sample,name:'\u0000x'}])assert.throws(()=>h.store.queue(bad));
  h.store.queue(sample);assert.throws(()=>h.store.queue({...sample,score:3}));
});
test('Storage full never reports a result as saved',()=>{
  const h=setup();h.options.storage.setItem=()=>{throw new Error('quota')};
  assert.throws(()=>h.store.queue(sample));assert.equal(h.store.list().pending,0);
});
test('New results queued while syncing are preserved',async()=>{
  const h=setup();h.store.queue(sample);h.connect();
  const original=h.options.transport.save;
  h.options.transport.save=async e=>{h.store.queue({...sample,id:'match-654321'});await original(e)};
  await h.store.flush();assert.equal(h.store.list().pending,1);
  assert.equal(h.store.list().entries.length,2);
});
test('Global and local copies merge by ID and cached ranking works offline',async()=>{
  const h=setup();h.store.queue(sample);
  h.remote.set(sample.id,{...sample,createdAt:90000});
  h.remote.set('match-other',{...sample,id:'match-other',score:200000,createdAt:80000});
  h.connect();await h.store.refresh();h.disconnect();
  assert.equal(h.store.list().entries.length,2);
  assert.equal(h.store.list().entries[0].score,200000);
  assert.equal(h.store.list().entries[1].createdAt,90000);
});

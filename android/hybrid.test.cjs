const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/hybrid.js','utf8');
const record=(id='record-123')=>({id,name:'Seba',score:171817,mode:'solo',character:'linares'});
function boot(storage={value:''},network={online:false},write=true) {
 const events={},timers=[],document={visibilityState:'visible',addEventListener:(k,v)=>events[k]=v};
 const window={document,navigator:{onLine:network.online},WONative:{
  online:()=>network.online,read:()=>storage.value,write:v=>{if(!write)return false;storage.value=v;return true}
 },addEventListener:(k,v)=>events[k]=v,setTimeout:f=>{timers.push(f);return timers.length},clearTimeout(){}};
 vm.runInNewContext(source,{window,Date,Set,Map,Promise});
 return {h:window.WOHybrid,storage,network,timers,events};
}
test('offline persists across restart without network',async()=>{
 const b=boot(),calls=[];b.h.start({send:async r=>calls.push(r),read:async()=>{calls.push('read');return []},refresh(){}});
 b.h.enqueue(record());await b.h.sync();assert.equal(calls.length,0);assert.equal(b.h.pending(),1);
 const restarted=boot(b.storage);assert.equal(restarted.h.entries()[0].score,171817);assert.equal(restarted.h.pending(),1);
});
test('reconnect sends stable id once and refreshes global ranking',async()=>{
 const b=boot(),sent=[];b.h.enqueue(record());b.h.start({send:async r=>sent.push(r),read:async()=>[record('global-123')],refresh(){}});
 b.network.online=true;b.h.connectionChanged();await b.h.sync();assert.equal(sent.length,1);
 assert.equal(sent[0].id,'record-123');assert.equal(b.h.pending(),0);assert.equal(b.h.entries().length,2);
 await b.h.sync();assert.equal(sent.length,1);
});
test('lost acknowledgement retries same id with server deduplication',async()=>{
 const b=boot(),server=new Map(),calls=[];let drop=true;b.h.enqueue(record());b.network.online=true;
 b.h.start({send:async r=>{calls.push(r.id);server.set(r.id,r);if(drop){drop=false;throw new Error('lost acknowledgement');}},read:async()=>[...server.values()],refresh(){}});
 await b.h.sync();assert.equal(b.h.pending(),1);await b.h.sync();assert.equal(b.h.pending(),0);
 assert.deepEqual(calls,['record-123','record-123']);assert.equal(server.size,1);
});
test('outage preserves local score and global cache across restart',async()=>{
 const b=boot();b.network.online=true;b.h.start({send:async()=>{},read:async()=>[record('global-123')],refresh(){}});await b.h.sync();
 b.network.online=false;b.h.enqueue(record());b.network.online=true;const restarted=boot(b.storage,b.network);
 restarted.h.start({send:async()=>{throw new Error('503');},read:async()=>{throw new Error('503');},refresh(){}});
 await restarted.h.sync();assert.equal(restarted.h.entries().length,2);assert.equal(restarted.h.pending(),1);
});
test('duplicate altered score and invalid fields rejected',()=>{
 const b=boot();b.h.enqueue(record());b.h.enqueue(record());assert.equal(b.h.entries().length,1);
 assert.throws(()=>b.h.enqueue({...record(),score:4}),/otro resultado/);
 for(const changed of [{score:1000001},{score:2.5},{character:'fake'},{mode:'online'},{name:'\u0001'},{id:'bad'}])
  assert.throws(()=>b.h.enqueue({...record('record-456'),...changed}),/no son válidos/);
});
test('failed write never marks score saved',()=>{
 const b=boot({value:''},{online:false},false);assert.throws(()=>b.h.enqueue(record()),/guardar en el teléfono/);assert.equal(b.h.pending(),0);
});
test('permanent rejection stays local without infinite retry',async()=>{
 const b=boot();b.h.enqueue(record());b.network.online=true;let count=0;
 b.h.start({send:async()=>{count++;throw Object.assign(new Error('invalid'),{status:400});},read:async()=>[],refresh(){}});
 await b.h.sync();await b.h.sync();assert.equal(count,1);assert.equal(b.h.entries().length,1);
});
test('parallel save during sync retains both results',async()=>{
 const b=boot();b.h.enqueue(record());b.network.online=true;let resolve;
 const waiting=new Promise(r=>resolve=r),sent=[];
 b.h.start({send:async r=>{sent.push(r.id);await waiting;},read:async()=>[],refresh(){}});
 b.h.enqueue(record('record-456'));resolve();await b.h.sync();await b.h.sync();
 assert.equal(b.h.entries().length,2);assert.equal(b.h.pending(),0);assert.equal(sent.length,2);
});

/* APK-only ranking. No network dependency during game startup. */
(function (root) {
  'use strict';
  const kinds = new Set(['angel','primitivo','peluche','tren','linares','gabriel','fernando','german']);
  const empty = () => ({version:1,records:[],cache:[],cachedAt:0});
  const valid = r => r && typeof r.id==='string' && /^[a-zA-Z0-9_-]{8,100}$/.test(r.id) &&
    typeof r.name==='string' && r.name.length>=1 && r.name.length<=20 &&
    r.name===r.name.trim() && !/[\u0000-\u001f\u007f-\u009f]/.test(r.name) &&
    Number.isSafeInteger(r.score) && r.score>=0 && r.score<=1000000 &&
    ['solo','versus'].includes(r.mode) && kinds.has(r.character);
  const native = root.WONative;
  let db=empty(), api=null, running=null, timer=null, retryDelay=30000, refresh=null, lastOnline=null;
  const online=()=> {
    try { return native ? native.online() : root.navigator.onLine!==false; } catch (_) { return false; }
  };
  try {
    const raw=native?native.read():root.localStorage.getItem('wo-hybrid-v1');
    if (raw) {
      const saved=JSON.parse(raw);
      if(saved.version===1 && Array.isArray(saved.records) && Array.isArray(saved.cache)) {
        db={version:1,records:saved.records.filter(valid),cache:saved.cache.filter(valid),cachedAt:saved.cachedAt||0};
      }
    }
  } catch (_) {}
  function persist(next) {
    const raw=JSON.stringify(next);
    if(native) { if(!native.write(raw)) throw new Error('No se pudo guardar en el teléfono. Liberá espacio y reintentá.'); }
    else root.localStorage.setItem('wo-hybrid-v1',raw);
    db=next;
  }
  function entries() {
    const rows=new Map();
    // Without internet, show this phone's scores only. Online cache remains available during outages.
    if(online()) db.cache.forEach(r=>rows.set(r.id,r));
    db.records.forEach(r=> {if(!rows.has(r.id)) rows.set(r.id,{...r,createdAt:r.localAt});});
    return [...rows.values()].sort((a,b)=>b.score-a.score||(a.createdAt||0)-(b.createdAt||0)||a.id.localeCompare(b.id));
  }
  function enqueue(record) {
    if(!valid(record)) throw new Error('Los datos de la partida no son válidos.');
    const existing=db.records.find(r=>r.id===record.id);
    if(existing) {
      if(['name','score','mode','character'].some(k=>existing[k]!==record[k])) throw new Error('Esta partida ya tiene otro resultado guardado.');
      return;
    }
    persist({...db,records:[...db.records,{...record,localAt:Date.now(),pending:true}]});
    if(refresh) refresh();
    void sync();
  }
  function schedule() {
    if(timer) root.clearTimeout(timer);
    timer=null;
    if(!api || !online()) return;
    timer=root.setTimeout(()=>{timer=null;void sync();},retryDelay);
    retryDelay=Math.min(retryDelay*2,300000);
  }
  function sync() {
    if(running) return running;
    if(!api || !online()) return Promise.resolve();
    running=(async()=>{
      try {
        for(const r of db.records.filter(x=>x.pending && !x.rejected)) {
          if(!online()) break;
          const {id,name,score,mode,character}=r;
          try {
            await api.send({id,name,score,mode,character});
            persist({...db,records:db.records.map(x=>x.id===id?{...x,pending:false}:x)});
          } catch(error) {
            if([400,401,403,422].includes(error.status)) {
              // Keep the local record; do not loop on permanently rejected data.
              persist({...db,records:db.records.map(x=>x.id===id?{...x,rejected:true}:x)});
            } else throw error;
          }
        }
        if(online()) {
          const rows=await api.read();
          persist({...db,cache:rows.filter(valid),cachedAt:Date.now()});
          retryDelay=30000;
        }
      } catch(_) {
        // Connectivity and server outages never interrupt gameplay or discard a score.
      } finally {
        if(refresh) refresh();
      }
    })().finally(()=>{running=null;schedule();});
    return running;
  }
  function connectionChanged() {
    const current=online();
    if(lastOnline===current) return;
    lastOnline=current;retryDelay=30000;
    if(timer) root.clearTimeout(timer);
    timer=null;
    if(refresh) refresh();
    if(current) void sync();
  }
  function start(callbacks) {
    api=callbacks;refresh=callbacks.refresh;lastOnline=online();
    root.addEventListener('online',()=>{lastOnline=null;connectionChanged();});
    root.addEventListener('offline',()=>{lastOnline=null;connectionChanged();});
    root.document.addEventListener('visibilitychange',()=>{
      if(root.document.visibilityState==='visible') {lastOnline=null;connectionChanged();}
    });
    void sync();
  }
  root.WOHybrid={online,entries,enqueue,sync,start,connectionChanged,
    status:()=>!online()?'PUNTAJES DE ESTE TELÉFONO':db.records.some(r=>r.pending&&!r.rejected)?'PUNTAJES LOCALES · SINCRONIZACIÓN PENDIENTE':db.cachedAt?'RANKING GLOBAL · PUNTAJES LOCALES':'PUNTAJES LOCALES',
    pending:()=>db.records.filter(r=>r.pending&&!r.rejected).length};
})(window);

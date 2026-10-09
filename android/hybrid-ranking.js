
(function(root) {
"use strict";
function createWoRankingStore(options) {
  const storage = options.storage;
  const key = "wo-ranking-hybrid-v1";
  const online = options.online;
  const transport = options.transport;
  const now = options.now || Date.now;
  const changed = options.changed || (() => {});
  const characters = ["angel","primitivo","peluche","tren","linares","gabriel","fernando","german"];
  let busy = null, refreshing = null, retryAt = 0;
  function valid(e) {
    return e && typeof e.id === "string" && e.id.length >= 8 && e.id.length <= 100
      && typeof e.name === "string" && e.name.length >= 1 && e.name.length <= 20
      && e.name === e.name.trim() && !/[\u0000-\u001f\u007f-\u009f]/.test(e.name)
      && Number.isSafeInteger(e.score) && e.score >= 0 && e.score <= 1000000
      && ["solo","versus"].includes(e.mode) && characters.includes(e.character);
  }
  function read() {
    const raw = storage.getItem(key);
    if (!raw) return {local:[],pending:[],cache:[],cachedAt:0};
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.local) || !Array.isArray(data.pending) || !Array.isArray(data.cache)) throw new Error("Ranking local inválido");
    return {local:data.local.filter(valid), pending:data.pending.filter(valid), cache:data.cache.filter(valid), cachedAt:Number(data.cachedAt)||0};
  }
  function write(data) { storage.setItem(key, JSON.stringify(data)); changed(); }
  function payload(e) { return {id:e.id,name:e.name,score:e.score,mode:e.mode,character:e.character}; }
  function queue(entry) {
    if (!valid(entry)) throw new Error("Resultado inválido");
    const data = read();
    const previous = data.local.find(e => e.id === entry.id);
    if (previous) {
      if (JSON.stringify(payload(previous)) !== JSON.stringify(payload(entry))) throw new Error("La partida ya tiene otro resultado");
      return previous;
    }
    const saved = {...payload(entry),createdAt:now()};
    data.local.push(saved); data.pending.push(saved);
    write(data);
    return saved;
  }
  function list() {
    const data = read(), entries = new Map();
    data.local.forEach(e => entries.set(e.id,e));
    data.cache.forEach(e => entries.set(e.id,e));
    return {entries:[...entries.values()].sort((a,b) => b.score-a.score || a.createdAt-b.createdAt || a.id.localeCompare(b.id)),
      pending:data.pending.length, cachedAt:data.cachedAt};
  }
  async function flush() {
    if (busy) return busy;
    if (!online() || now() < retryAt) return false;
    busy = (async () => {
      for (const entry of read().pending) {
        if (!online()) break;
        try {
          await transport.save(payload(entry));
          // Re-read after each await, preserving newly queued results.
          const data = read();
          data.pending = data.pending.filter(e => e.id !== entry.id);
          write(data); retryAt = 0;
        } catch (_) { retryAt = now()+30000; return false; }
      }
      return read().pending.length === 0;
    })();
    try { return await busy; } finally { busy = null; }
  }
  async function refresh() {
    if (refreshing) return refreshing;
    if (!online() || now() < retryAt) return false;
    refreshing = (async () => {
      await flush();
      if (!online() || now() < retryAt) return false;
      try {
        const entries = await transport.load();
        if (!Array.isArray(entries) || entries.some(e => !valid(e))) throw new Error("Respuesta inválida");
        const data = read();
        data.cache = entries; data.cachedAt = now(); write(data); retryAt = 0;
        return true;
      } catch (_) { retryAt = now()+30000; return false; }
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }
  function reconnect() { retryAt = 0; return refresh(); }
  return {queue,list,flush,refresh,reconnect,valid};
}
root.createWoRankingStore = createWoRankingStore;
if (typeof module !== "undefined") module.exports = {createWoRankingStore};
})(typeof globalThis !== "undefined" ? globalThis : this);

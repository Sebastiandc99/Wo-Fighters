const RANKING_API = "https://paidalaojrkplnkucmwl.supabase.co/rest/v1/wo_scores";
const RANKING_PUBLIC_KEY = "sb_publishable_FRjdw2pLXnN4CoUwiebbfQ_tFO9YQct";
let rankingRequest = 0;

async function rankingFetch(url, options = {}) {
  // The public scoreboard only grants insert/read; existing results cannot be edited or removed.
  const after = new URL(url).searchParams.get('after');
  const offset = after === null ? 0 : Number(after);
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Página de ranking inválida.');
  const endpoint = new URL(RANKING_API);
  const saving = options.method === 'POST';
  if (saving) endpoint.searchParams.set('on_conflict','id');
  else {
    endpoint.searchParams.set('select','id,name,score,mode,character,created_at');
    endpoint.searchParams.set('order','score.desc,created_at.asc,id.asc');
    endpoint.searchParams.set('limit','101');endpoint.searchParams.set('offset',String(offset));
  }
  const headers = {...options.headers, apikey:RANKING_PUBLIC_KEY};
  if(saving) headers.Prefer='resolution=ignore-duplicates,return=representation';
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 15000) : null;
  try {
    const response = await fetch(endpoint.href, {...options, headers, signal: controller?.signal, credentials: "omit", cache: "no-store"});
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const error = new Error(data?.message || "El servicio de ranking no pudo completar la solicitud.");
      error.status = response.status;
      throw error;
    }
    if(!Array.isArray(data)) throw new Error('Respuesta de ranking inválida.');
    if(saving) return {entry:data[0] || {id:JSON.parse(options.body).id}};
    return {entries:data.slice(0,100).map(row=>({...row,createdAt:row.created_at})),next:data.length>100?String(offset+100):null};
  } finally { if (timeout) clearTimeout(timeout); }
}


function apkOnline() {
  try { if (window.WoNative) return window.WoNative.isOnline(); } catch (_) {}
  return navigator.onLine !== false;
}
let apkHighlight = null;
const apkRanking = createWoRankingStore({
  storage: localStorage,
  online: apkOnline,
  transport: {
    save: entry => rankingFetch(RANKING_API, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(entry)}),
    load: async () => {
      const entries = new Map(), cursors = new Set();
      let cursor = null;
      do {
        if (!apkOnline()) throw new Error("offline");
        const page = await rankingFetch(RANKING_API + (cursor ? "?after="+encodeURIComponent(cursor) : ""));
        page.entries.forEach(entry => entries.set(entry.id,entry));
        cursor = page.next;
        if (cursor && cursors.has(cursor)) throw new Error("Página repetida");
        cursors.add(cursor);
      } while (cursor);
      return [...entries.values()];
    }
  },
  changed: () => { if (state === "ranking") renderApkRanking(); }
});
function renderApkRanking() {
  if (state !== "ranking") return;
  const data = apkRanking.list();
  const rows = document.getElementById("rankingRows");
  rows.replaceChildren();
  for (const [index,entry] of data.entries.entries()) {
    const row = document.createElement("tr");
    if (entry.id === apkHighlight) row.classList.add("new-record");
    for (const [column,value] of [rankingPosition(index+1),String(entry.score),entry.name].entries()) {
      const cell = document.createElement("td");
      const lettering = document.createElement("span");
      lettering.classList.add("ranking-lettering"); lettering.textContent = String(value); cell.appendChild(lettering);
      if (column===2 && entry.name.length>9) cell.classList.add("long-name");
      row.appendChild(cell);
    }
    rows.appendChild(row);
  }
  const source = data.cachedAt ? "GLOBAL GUARDADO + LOCAL" : "LOCAL";
  document.getElementById("rankingStatus").textContent = data.entries.length
    ? data.entries.length + " RESULTADOS · " + source + (data.pending ? " · "+data.pending+" POR SINCRONIZAR" : "")
    : "Todavía no hay resultados. ¡El primero puede ser tuyo!";
  document.getElementById("rankingRetryBtn").hidden = true;
}
async function saveWinner(event) {
  event.preventDefault();
  if (state !== "finished" || !match.complete || !match.endShown || match.saved || match.saving || (gameMode==="solo" && match.winner!==0 && !match.campaignRun)) return;
  const input=document.getElementById("winnerName");
  const name=input.value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g,"").replace(/\s+/g," ").trim();
  const message=document.getElementById("saveError");
  if (!name || name.length>20) { message.textContent="Escribí un nombre de 1 a 20 caracteres."; input.focus?.(); return; }
  const result=match, button=document.getElementById("saveScoreBtn");
  result.saving=true; button.disabled=true;
  try {
    apkRanking.queue({id:result.id,name,score:result.scores[result.recordSlot??result.winner],
      mode:gameMode==="online"?"versus":gameMode,
      character:(result.recordSlot??result.winner)===0?result.playerKind:result.cpuKind});
    result.saved=true; message.textContent="Puntaje guardado en el teléfono.";
    if (state==="finished" && match===result) await showRanking(result.id);
  } catch (_) { message.textContent="No se pudo guardar en el teléfono. Conservá esta pantalla y reintentá."; }
  finally { result.saving=false; button.disabled=false; }
}
async function showRanking(highlight=null) {
  if (online?.active) online.leave(false);
  ++rankingRequest; state="ranking"; apkHighlight=typeof highlight==="string"?highlight:null;
  clearHeld(); stopAllCombatSounds(); stopRoundVoice(); stopMusic(); setPauseUI(false);
  showScreen(ui.rankingScreen);
  renderApkRanking();
  // Rendering never waits for a network request, including a failed server.
  apkRanking.refresh().then(ok => {
    if (ok && state==="ranking") {
      renderApkRanking();
      const data=apkRanking.list();
      document.getElementById("rankingStatus").textContent=data.entries.length+" RESULTADOS · GLOBAL + LOCAL"+(data.pending?" · "+data.pending+" POR SINCRONIZAR":"");
    }
  }).catch(() => {});
}
window.addEventListener("online", () => apkRanking.reconnect().catch(() => {}));
window.addEventListener("focus", () => { if(apkOnline()) apkRanking.refresh().catch(() => {}); });
setInterval(() => { if(!document.hidden && apkOnline()) apkRanking.flush().catch(() => {}); },30000);
setTimeout(() => { if(apkOnline()) apkRanking.flush().catch(() => {}); },0);


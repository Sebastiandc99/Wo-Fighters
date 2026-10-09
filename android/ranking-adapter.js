let apkHighlight = null;
async function saveWinner(event) {
  event.preventDefault();
  if (state !== "finished" || !match.complete || !match.endShown || match.saved || match.saving || (gameMode === "solo" && match.winner !== 0 && !match.campaignRun)) return;
  const input=document.getElementById("winnerName");
  const name=input.value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g,"").replace(/\s+/g," ").trim();
  const message=document.getElementById("saveError");
  if(!name || name.length>20) { message.textContent="Escribí un nombre de 1 a 20 caracteres.";input.focus?.();return; }
  const result=match,button=document.getElementById("saveScoreBtn"),slot=result.recordSlot??result.winner;
  result.saving=true;button.disabled=true;
  try {
    window.WOHybrid.enqueue({id:result.id,name,score:result.scores[slot],mode:gameMode==="online"?"versus":gameMode,character:slot===0?result.playerKind:result.cpuKind});
    result.saved=true;
    message.textContent="Puntaje guardado en el teléfono.";
    if(state==="finished"&&match===result) await showRanking(result.id);
  } catch(error) { message.textContent=error.message; }
  finally {result.saving=false;button.disabled=false;}
}
function renderApkRanking() {
  if(state!=="ranking") return;
  const rows=document.getElementById("rankingRows"),sorted=window.WOHybrid.entries();
  rows.replaceChildren();
  sorted.forEach((entry,index)=>{
    const row=document.createElement("tr");
    if(entry.id===apkHighlight) row.classList.add("new-record");
    [rankingPosition(index+1),String(entry.score),entry.name].forEach((value,column)=>{
      const cell=document.createElement("td"),lettering=document.createElement("span");
      lettering.classList.add("ranking-lettering");lettering.textContent=String(value);cell.appendChild(lettering);
      if(column===2&&entry.name.length>9) cell.classList.add("long-name");
      row.appendChild(cell);
    });
    rows.appendChild(row);
  });
  document.getElementById("rankingStatus").textContent=window.WOHybrid.status()+(sorted.length?" · "+sorted.length+" RESULTADOS":" · Todavía no hay resultados.");
  document.getElementById("rankingRetryBtn").hidden=true;
}
async function showRanking(highlight=null) {
  if(online?.active) online.leave(false);
  apkHighlight=typeof highlight==="string"?highlight:null;
  ++rankingRequest;state="ranking";
  clearHeld();stopAllCombatSounds();stopRoundVoice();stopMusic();setPauseUI(false);showScreen(ui.rankingScreen);
  renderApkRanking();
  void window.WOHybrid.sync();
}

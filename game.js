"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", {alpha:false});
ctx.imageSmoothingEnabled = false;
const VIEW_WIDTH = 960;
const STAGE_LEFT = -180;
const STAGE_RIGHT = VIEW_WIDTH + 180;
const FIGHTER_LEFT = STAGE_LEFT + 52;
const FIGHTER_RIGHT = STAGE_RIGHT - 52;
const MAX_FIGHTER_DISTANCE = 760;
let cameraX = 0;
const VIEW_HEIGHT = 540;
const FIGHTER_SCALE = .9;
const spriteFrames = new Map();
const poseBlendSurfaces = new Map();
let drawingScale = 1;
let mobileRendering = false;
// Reuse raster work at the existing resolution; animation clocks and effect counts stay intact.
let stageRaster = null;
const electricRasters = new Map();
let electricRasterPixels = 0;
const ELECTRIC_CACHE_PIXELS = 1024 * 1024;
const superAuras = new Map();
let renderWarmQueue = [];
const comboDamageFormat = new Intl.NumberFormat("es-AR", {maximumFractionDigits:1});

let online = null;
let onlineSoundId = 0;

const ui = {
  onlineScreen: document.getElementById("onlineScreen"),
  titleScreen: document.getElementById("titleScreen"),
  modeScreen: document.getElementById("modeScreen"),
  rankingScreen: document.getElementById("rankingScreen"),
  selectScreen: document.getElementById("selectScreen"),
  stageScreen: document.getElementById("stageScreen"),
  gameScreen: document.getElementById("gameScreen"),
  towerScreen: document.getElementById("towerScreen"),
  startBtn: document.getElementById("startBtn"),
  confirmBtn: document.getElementById("confirmBtn"),
  announcement: document.getElementById("announcement"),
  speech: document.getElementById("speechBubble"),
  resultPanel: document.getElementById("resultPanel"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  leftName: document.getElementById("leftName"),
  rightName: document.getElementById("rightName"),
  leftHealth: document.getElementById("leftHealth"),
  rightHealth: document.getElementById("rightHealth"),
  leftPower: document.getElementById("leftPower"),
  rightPower: document.getElementById("rightPower"),
  timer: document.getElementById("timer"),
  flash: document.getElementById("flash"),
  soundBtn: document.getElementById("soundBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  abilityBtn: document.getElementById("abilityBtn")
};

const hudNodes={
  leftScore:document.getElementById("leftScore"),rightScore:document.getElementById("rightScore"),
  roundLabel:document.getElementById("roundLabel"),campaignStatus:document.getElementById("campaignStatus"),
  leftRounds:[...document.querySelectorAll("#leftRounds i")],rightRounds:[...document.querySelectorAll("#rightRounds i")],
  special:document.querySelector('[data-tap="special"]'),ability2:document.getElementById("abilityBtn2")
};
function hudValue(node,property,value){if(node[property]!==value)node[property]=value;}
function hudClass(node,name,enabled){if(node.classList.contains(name)!==enabled)node.classList.toggle(name,enabled);}

const stages = {
  generadores: { name: "GENERADORES DE RINCÓN", src: "assets/escenario-generadores-v4.webp", description: "Generadores y paneles solares al pie de la cordillera." },
  planta: { name: "PLANTA DE PROCESO", src: "assets/escenario-planta.webp", description: "Estructuras de proceso bajo el cielo de la Puna." },
  salinas: { name: "SALINAS", src: "assets/escenario-salinas.webp", description: "Piletas de salmuera en el Salar del Rincón." }
};
const stageRoster = Object.keys(stages);
const stageImages = Object.fromEntries(stageRoster.map(key => [key, loadImage(stages[key].src)]));

const assets = {
  primitivoIntro: loadImage("assets/primitivo-intro-v1.webp"),
  pelucheIntro: loadImage("assets/peluche-intro-v1.webp"),
  gabrielIntro: loadImage("assets/gabriel-intro-v2.webp"),
  gabrielGuards: loadImage("assets/gabriel-guards-v2.webp"),
  angelIntro: loadImage("assets/angel-intro-v1.webp"),
  fernando: loadImage("assets/fernando-atlas-v1.webp"),
  fernandoHit: loadImage("assets/fernando-hit-v2.webp"),
  fernandoSuper: loadImage("assets/fernando-super-v3.webp"),
  workerGuards: loadImage("assets/worker-guards-v1.webp"),
  gabriel: loadImage("assets/gabriel-atlas-v1.webp"),
  linares: loadImage("assets/linares-atlas-v1.webp"),
  transformer: loadImage("assets/linares-transformer-v1.webp"),
  angelSignals: loadImage("assets/angel-signals-v1.webp"),
  angelLowerLoad: loadImage("assets/angel-lowerload-v1.webp"),
  tren: loadImage("assets/tren-atlas-v2.webp"),
  peluche: loadImage("assets/peluche-atlas-v2.webp"),
  pelucheSpecial: loadImage("assets/peluche-special-v2.webp"),
  concrete: loadImage("assets/concrete-v1.webp"),
  concreteSplash: loadImage("assets/concrete-splash-v1.webp"),
  concreteHose: loadImage("assets/concrete-hose-v1.webp"),
  concreteShell: loadImage("assets/concrete-shell-v1.webp"),
  forklift: loadImage("assets/forklift-v4.webp"),
  container: loadImage("assets/container-v4.webp"),
  hook: loadImage("assets/hook-v4.webp"),
  load: loadImage("assets/load-v4.webp"),
  angel: loadImage("assets/angel-atlas-v3.webp"),
  primitivo: loadImage("assets/primitivo-atlas-v4.webp")
};
// Keep artwork for legacy matches, but load it only when a legacy fighter uses it.
for (const [key, src] of Object.entries({
  jairo: "assets/jairo-atlas-v1.webp", paula: "assets/paula-atlas-v1.webp",
  padrino: "assets/padrino-atlas-v2.webp", dachshund: "assets/padrino-dog-v1.webp",
  galante: "assets/galante-atlas-v3.webp", kicksA: "assets/kicks-classic-a-v1.png",
  kicksB: "assets/kicks-classic-b-v1.png", flor: "assets/flor-atlas-v1.png",
  facu: "assets/facu-atlas-v1.png", uppercuts: "assets/uppercuts-v1.png",
  arena: "assets/arena.jpg", sergio: "assets/sergio-attack-v4.png",
  blotta: "assets/blotta-atlas-v2-clean.png", tunki: "assets/tunki-attack-v1.png",
  marechal: "assets/marechal-attack-v1.png", sergioMotion: "assets/sergio-motion-v4.png",
  blottaMotion: "assets/blotta-motion-v3.png", tunkiMotion: "assets/tunki-motion-v1.png",
  marechalMotion: "assets/marechal-motion-v1.png"
})) {
  Object.defineProperty(assets, key, { configurable: true, get() {
    const image = loadImage(src);
    Object.defineProperty(assets, key, { value: image, enumerable: true });
    return image;
  }});
}

const POSES = {
  fernando: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  gabriel: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  linares: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  tren: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  peluche: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  angel: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  primitivo: {idle:0,punch:1,kick:2,hit:3,power:4,sweep:5},
  jairo: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  paula: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  padrino: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  galante: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  flor: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  facu: {idle:0, punch:1, kick:2, hit:3, power:4, sweep:5},
  sergio: { idle: 0, punch: 1, kick: 2, hit: 3, meat: 4, bottle: 5 },
  blotta: { idle: 0, punch: 1, kick: 2, sweep: 3, hit: 4, power: 5 },
  tunki: { idle: 0, punch: 1, kick: 2, hit: 3, power: 4, slam: 5 },
  marechal: { idle: 0, punch: 1, kick: 2, hit: 3, power: 4, sweep: 5 }
};

const stats = {
  fernando: {name:"FERNANDO", normalDamage:9, resistance:98, powerDamage:21, superDamage:33, agility:6, speed:262, jump:605, defaultFace:1, size:254, height:200, width:24, bodyWidth:.99, recovery:.60, meleeReach:5, powerRange:532, superRange:608, description:"LLUVIA DE CIGARRILLOS (30%) · ↓ + PODER: INCENDIO DE OBRA (100%)", ability:null},
  gabriel: {name:"GABRIEL", normalDamage:8, resistance:94, powerDamage:23, superDamage:34, agility:7, speed:274, jump:615, defaultFace:1, size:249, height:196, width:23, bodyWidth:.94, recovery:.56, meleeReach:5, powerRange:608, superRange:684, description:"CAMINO CRÍTICO (30%) · ↓ + PODER: GANTT IMPACTO (100%)", ability:null},
  linares: {name:"J. LINARES", normalDamage:8, resistance:90, powerDamage:23, superDamage:34, agility:8, speed:286, jump:620, defaultFace:1, size:254, height:200, width:23, bodyWidth:.94, recovery:.54, meleeReach:6, powerRange:608, superRange:684, description:"CABLE DE ALTA TENSIÓN (30%) · ↓ + PODER: DESCARGA DE TRANSFORMADOR (100%)", ability:null},
  tren: {name:"TREN VALENCIA", normalDamage:8, resistance:88, powerDamage:24, superDamage:34, agility:8, speed:286, jump:620, defaultFace:1, size:254, height:200, width:25, recovery:.52, meleeReach:6, powerRange:608, superRange:684, description:"ARCO VOLTAICO (30%) · ↓ + PODER: TORMENTA ELÉCTRICA (100%)", ability:null},
  peluche: {name:"PELUCHE", normalDamage:9, resistance:110, powerDamage:2, superDamage:34, agility:5, speed:250, jump:605, defaultFace:1, size:204, height:154, width:26, recovery:.64, meleeReach:4, powerRange:532, superRange:608, description:"HORMIGONAZO (30%) · ↓ + PODER: COLADO MASIVO (100%)", ability:null},
  angel: { name:"ÁNGEL", normalDamage:9, resistance:98, powerDamage:23, agility:7, speed:274, jump:615, defaultFace:1, size:220, height:166, width:23, description:"CARGA SUSPENDIDA (30%) · ↓ + PODER: GANCHO MAESTRO (100%)", ability:null },
  primitivo: { name:"PRIMITIVO", normalDamage:10, resistance:110, powerDamage:22, agility:4, speed:238, jump:595, defaultFace:1, size:282, height:214, width:40, bodyWidth:1.10, description:"DESCARGA EXPRESS (30%) · ↓ + PODER: LANZAMIENTO DE CONTENEDOR (100%)", ability:null },
  jairo: { name: "JAIRO", normalDamage: 8, resistance: 98, powerDamage: 26, agility: 7, speed: 274, jump: 615, defaultFace: 1, size: 226, height: 198, width: 25, description: "PODER: LÍNEA ROJA · ↓ + PODER: BARRAS", ability: null },
  paula: { name: "PAULA", normalDamage: 8, resistance: 92, powerDamage: 27, agility: 7, speed: 274, jump: 620, defaultFace: 1, size: 220, height: 194, width: 24, description: "HYDRO BLAST · CHORRO DE AGUA", ability: null },
  padrino: { name: "EL PADRINO", normalDamage: 9, resistance: 102, powerDamage: 25, agility: 6, speed: 262, jump: 605, defaultFace: 1, size: 210, height: 184, width: 27, description: "PERROS SALCHICHA · RODADA", ability: null },
  galante: { name: "GALANTE", normalDamage: 8, resistance: 120, powerDamage: 23, agility: 3, speed: 226, jump: 595, defaultFace: 1, size: 210, height: 184, width: 34, description: "LÁTIGO CON PINCHES · EVASIÓN DE HUMO", ability: null },
  flor: { name: "FLOR", normalDamage: 10, resistance: 92, powerDamage: 24, agility: 9, speed: 298, jump: 610, defaultFace: 1, size: 199, height: 165, width: 23, description: "BOCHA DE HOCKEY", ability: null },
  facu: { name: "FACU", normalDamage: 9, resistance: 95, powerDamage: 25, agility: 8, speed: 286, jump: 615, defaultFace: 1, size: 222, height: 188, width: 25, description: "BIGOTE BOOMERANG", ability: null },
  sergio: { name: "SERGIO", normalDamage: 10, resistance: 116, powerDamage: 22, agility: 4, speed: 238, jump: 595, defaultFace: 1, size: 210, height: 184, width: 32, description: "PANZAZO · ASADO · FERNET", ability: null },
  blotta: { name: "BLOTTA", normalDamage: 11, resistance: 90, powerDamage: 24, agility: 9, speed: 298, jump: 620, defaultFace: -1, size: 214, height: 180, width: 25, description: "KARATE · ENERGÍA · HUMO", ability: "teleport" },
  tunki: { name: "LA TUNKI", normalDamage: 8, resistance: 122, powerDamage: 25, agility: 2, speed: 214, jump: 605, defaultFace: 1, size: 202, height: 174, width: 32, description: "FLORES · SALTO APLASTANTE", ability: "slam" },
  marechal: { name: "MARECHAL", normalDamage: 8, resistance: 88, powerDamage: 28, agility: 7, speed: 274, jump: 620, defaultFace: 1, size: 242, height: 202, width: 23, description: "ARTES MARCIALES · RAYOS", ability: null }
};

// Reference strong hit 10 maps to the existing 5-point uppercut; bars stay normalized.
const powerDamage = f => ["angel","primitivo","peluche","tren","linares","gabriel","fernando"].includes(f.kind) ? stats[f.kind].powerDamage : stats[f.kind].powerDamage * .5;
const mobilityTempo = f => .82 + stats[f.kind].agility * .035;
const DAMAGE_SCALE = .70;
const ROUND_SECONDS = 90;
const ENERGY_GAIN_SCALE = .75;
const damageTaken = (f, damage) => Math.round(damage * DAMAGE_SCALE * 100000 / stats[f.kind].resistance) / 1000;
const fighterPowers = {
  fernando: {common:"Lluvia de Cigarrillos", super:"Incendio de Obra", superDamage:33, profile:"Ingeniero civil · media distancia, fuego y humo"},
  gabriel: {common:"Camino Crítico", super:"Gantt Impacto", superDamage:34, profile:"Control de Proyecto · técnico, de media/larga distancia"},
  linares: {common:"Cable de Alta Tensión", super:"Descarga de Transformador", superDamage:34, profile:"Ingeniero eléctrico · rápido, técnico y de media/larga distancia"},
  tren: {common:"Arco Voltaico", super:"Tormenta Eléctrica", superDamage:34, profile:"Eléctrico · rápido y técnico"},
  angel: {common:"Carga suspendida", super:"Gancho maestro", superDamage:34, profile:"Ágil · control aéreo"},
  primitivo: {common:"Descarga express", super:"Lanzamiento de contenedor", superDamage:35, profile:"Robusto · golpes pesados"},
  peluche: {common:"Hormigonazo", super:"Colado masivo", superDamage:34, profile:"Técnico · inmoviliza con hormigón"}
};
// P/K are the existing punch/kick buttons; U/D/B are down+punch,
// down+kick and away+kick. Every queued token still needs its own press.
const MELEE_COMBOS = {
  angel: [
    {name:"Maniobra de izaje", tokens:["P","K","U"], effect:"Gancho y derribo"},
    {name:"Descarga lateral", tokens:["K","P","B"], effect:"Volea para ganar espacio"}
  ],
  primitivo: [
    {name:"Puños de acero", tokens:["P","P","K"], effect:"Tres golpes pesados"},
    {name:"Descarga pesada", tokens:["K","P","U"], effect:"Gancho contundente"}
  ],
  peluche: [
    {name:"Compactadora", tokens:["P","D","K"], effect:"Barrida y empuje cercano"},
    {name:"Base firme", tokens:["K","D","P","U"], effect:"Barrida y gancho final"}
  ],
  tren: [
    {name:"Secuencia de arco", tokens:["K","K","B"], effect:"Patadas rápidas y volea"},
    {name:"Tormenta de golpes", tokens:["P","K","P","K","B"], effect:"Cinco golpes ágiles"}
  ],
  linares: [
    {name:"Fase cruzada", tokens:["P","K","B"], effect:"Golpes rápidos y distancia"},
    {name:"Trifásico", tokens:["K","P","K","U"], effect:"Cuatro golpes y derribo"}
  ],
  gabriel: [
    {name:"Camino directo", tokens:["P","P","U"], effect:"Doble puño y gancho"},
    {name:"Ruta crítica", tokens:["K","P","D","B"], effect:"Barrida y volea técnica"}
  ],
  fernando: [
    {name:"Golpe de obra", tokens:["P","P","B"], effect:"Doble puño y volea"},
    {name:"Remate civil", tokens:["P","D","P","K"], effect:"Cuatro golpes con empuje"}
  ]
};
const COMBO_PROFILES = {
  angel:{tempo:1.10, impact:1.07, advance:92, finishKnock:380},
  primitivo:{tempo:.91, impact:1.25, advance:64, finishKnock:440},
  peluche:{tempo:.96, impact:1.17, advance:72, finishKnock:405},
  tren:{tempo:1.24, impact:1.00, advance:116, finishKnock:360},
  linares:{tempo:1.20, impact:1.03, advance:110, finishKnock:370},
  gabriel:{tempo:1.10, impact:1.08, advance:90, finishKnock:380},
  fernando:{tempo:1.04, impact:1.14, advance:82, finishKnock:410}
};
function comboMove(token) {
  return {P:"punch",K:"kick",U:"uppercut",D:"lowKick",B:"volley"}[token];
}
function comboStepSpec(kind, token, index, final) {
  const profile=COMBO_PROFILES[kind], base=timedMove({kind},MOVES[comboMove(token)],false,comboMove(token));
  if(index===1)return base;
  return {...base,
    startup:Math.max(.045,base.startup*(token==="B"?.78:.66)/profile.tempo),
    active:base.active/profile.tempo,
    recovery:final ? .32/profile.tempo : base.recovery/profile.tempo,
    damage:base.damage*profile.impact*(final?1.65:1.15)*.94**(index-2),
    knock:final?profile.finishKnock:72,
    chainStep:index, chainFinisher:final
  };
}
function comboDamage(kind, route, rivalKind) {
  const resistance=rivalKind?stats[rivalKind].resistance:100;
  return route.tokens.reduce((total,token,i)=>{
    const raw=comboStepSpec(kind,token,i+1,i===route.tokens.length-1).damage*stats[kind].normalDamage/10;
    return total+Math.round(raw*DAMAGE_SCALE*100000/resistance)/1000;
  },0);
}
function comboGuide(kind, rivalKind, compact=false) {
  if(!MELEE_COMBOS[kind])return "";
  const labels={P:"G",K:"P",U:"↓G",D:"↓P",B:"←P"};
  const words={P:"golpe",K:"patada",U:"abajo más golpe",D:"abajo más patada",B:"atrás más patada"};
  const entries=MELEE_COMBOS[kind].map(route=>{
    const sequence=route.tokens.map(token=>`<b>${labels[token]}</b>`).join('<i aria-hidden="true">›</i>');
    const damage=comboDamage(kind,route,rivalKind).toLocaleString("es-AR",{maximumFractionDigits:1});
    return `<div class="combo-entry"><strong>${route.name}</strong><span class="combo-sequence" role="img" aria-label="${route.tokens.map(token=>words[token]).join(', ')}">${sequence}</span>${compact?"":`<span class="combo-detail">${route.tokens.length} golpes · ${damage}% · ${route.effect}</span>`}</div>`;
  }).join("");
  return `<div class="combo-guide${compact?' compact-combos':''}"><h4>COMBOS</h4>${entries}<p class="combo-legend">G: golpe · P: patada · ←: atrás</p>${compact?'<p class="combo-tip">Combinaciones rápidas · guía en PAUSA</p>':'<p class="combo-tip">Pulsá en orden y cerca del rival. ↓ y atrás se mantienen sólo en el golpe indicado.</p>'}</div>`;
}
function powerGuide(kind, rivalKind) {
  const s=stats[kind], p=fighterPowers[kind];
  if (!p) return "";
  const resistance=rivalKind ? stats[rivalKind].resistance : 100;
  const percent=damage=>(damage*DAMAGE_SCALE*100/resistance).toLocaleString("es-AR",{maximumFractionDigits:1})+"%";
  return `<div class="power-entry"><strong>${p.common}</strong><span>Daño <b>${percent(s.powerDamage)}</b> · Energía <b>30%</b></span>${kind==="peluche"?'<span class="hold-note">Inmoviliza 3 s · permite golpear al rival</span>':''}</div>`
    + `<div class="power-entry"><strong>${p.super}</strong><span>Daño <b>${percent(p.superDamage)}</b> · Energía <b>100%</b></span></div>`;
}
function updateSelectionGuide(kind) {
  const s=stats[kind],p=fighterPowers[kind];
  const panel=document.getElementById("selectionGuide");
  panel.dataset.kind=kind;
  if(!p){panel.innerHTML="";return;}
  const art={fernando:["fernando-cigarettes.svg","fernando-fire.svg"],gabriel:["gabriel-critical.svg","gabriel-gantt.svg"],linares:["linares-cable.svg","linares-transformer-v1.webp"],tren:["tren-voltaic.svg","tren-storm.svg"],angel:["load-v4.webp","hook-v4.webp"],primitivo:["forklift-v4.webp","container-v4.webp"],peluche:["concrete-v1.webp","concrete-hose-v1.webp"]}[kind];
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${{
    shield:"M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Z M12 6v11",
    bolt:"m14 2-9 12h6l-1 8 9-13h-6Z",
    fist:"M5 12V7l4-2 3 1 3-1 4 2v7l-4 7H8l-3-6H3v-5l3-1 4 4 M9 6v5 M13 6v5 M17 7v5",
    hit:"m12 2 2 6 6-3-3 6 5 3-7 1-1 7-4-6-7 3 3-7-4-3 7-1Z"
  }[name]}"/></svg>`;
  const powers=[p.common,p.super].map((name,i)=>{
    const damage=((i?p.superDamage:s.powerDamage)*DAMAGE_SCALE).toLocaleString("es-AR",{maximumFractionDigits:1});
    const energy=i?100:30;
    const details=`${name}: daño ${damage}% contra resistencia 100; energía ${energy}%${kind==="peluche"&&!i?"; inmoviliza 3 segundos":""}`;
    return `<div class="skill-medal ${i?"super-medal":""}" role="img" aria-label="${details}" title="${details}"><span class="skill-type">${i?"SÚPER":"COMÚN"}</span><div class="skill-art"><img src="assets/${art[i]}" alt="" draggable="false"></div><span class="skill-damage">${icon("hit")}<b>${damage}%</b></span><span class="skill-cost">${icon("bolt")}${energy}%</span>${kind==="peluche"&&!i?'<span class="skill-effect">INMÓVIL · 3 s</span>':''}</div>`;
  }).join("");
  const meters=[["shield","RESIST.","Resistencia",s.resistance,200],["bolt","VELOC.","Velocidad",s.agility,10],["fist","FUERZA","Fuerza",s.normalDamage,10]].map(([symbol,label,name,value,max])=>
    `<div class="arcade-stat" title="${name}: ${value}${max===10?'/10':''}"><span class="stat-symbol">${icon(symbol)}</span><span class="stat-body"><span class="stat-label">${label}</span><span class="stat-meter" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><i style="width:${value/max*100}%"></i></span></span></div>`).join("");
  panel.innerHTML=`<div class="arcade-guide-head"><span>PODERES</span><i>★</i></div><div class="skill-medals">${powers}</div><div class="skill-key">${icon("hit")} DAÑO <span>·</span> ${icon("bolt")} ENERGÍA</div><div class="arcade-stats">${meters}</div>${comboGuide(kind,null,true)}`;
}
function updatePauseGuide() {
  for (const [id,f,rival] of [["pausePowers1",player,cpu],["pausePowers2",cpu,player]]) {
    if (!f || !rival) continue;
    document.getElementById(id).innerHTML=`<h3>${f===player?"1P":gameMode==="versus"?"2P":"CPU"} · ${stats[f.kind].name}</h3>${powerGuide(f.kind,rival.kind)}${comboGuide(f.kind,rival.kind)}<p class="guide-note">Daño contra ${stats[rival.kind].name}, sin cubrirse.</p>`;
  }
  document.getElementById("pauseControls2").hidden=gameMode!=="versus";
  document.getElementById("pauseControls2Title").hidden=gameMode!=="versus";
}
function timedMove(f, spec, evasion=false, action=null) {
  const tempo=mobilityTempo(f);
  // Character recovery attributes belong to powers; melee follows each move's normal tempo.
  const fixedRecovery = action==="special" && Number.isFinite(stats[f.kind].recovery);
  return {...spec, reach: f.kind==="peluche" && spec.reach ? spec.reach*.82 : ["gabriel","fernando"].includes(f.kind) && spec.reach ? spec.reach*5/6 : spec.reach, startup:spec.startup/(evasion?tempo:1), active:spec.active/(evasion?tempo:1), recovery:fixedRecovery && !evasion ? stats[f.kind].recovery : spec.recovery/tempo};
}

const roster = ["angel", "primitivo", "peluche", "tren", "linares", "gabriel", "fernando"];
const FLOOR = 448;
const STEP = 1 / 120;
const JUMP_BOOST = 1.25;
// Cues follow the measured speech onsets in each supplied MP3, including leading silence.
const INTRO = { voice: 1.10, title: 1.338, fight: 3.144, end: 3.80 };
const ROUND_AUDIO = {
  1: { src: "assets/round-1.mp3", title: "ROUND 1", timing: INTRO, buffer: null, loading: null },
  2: { src: "assets/round-2.mp3", title: "ROUND 2", timing: { voice: .35, title: .412, fight: 2.206, end: 2.75 }, buffer: null, loading: null },
  3: { src: "assets/final-round.mp3", title: "FINAL ROUND", timing: { voice: .35, title: .520, fight: 2.304, end: 3.00 }, buffer: null, loading: null }
};
const MOVES = {
  punch: { startup: .085, active: .095, recovery: .18, reach: 77, damage: 3, knock: 160 },
  kick: { startup: .12, active: .16, recovery: .23, reach: 106, damage: 4, knock: 235 },
  airKick: { startup: .10, active: .22, recovery: .18, reach: 105, damage: 4, knock: 200 },
  volley: { startup: .18, active: .17, recovery: .28, reach: 118, damage: 4, knock: 250 },
  uppercut: { startup: .105, active: .17, recovery: .26, reach: 76, damage: 5, knock: 145, lift: -420 },
  lowKick: { startup: .13, active: .14, recovery: .22, reach: 102, damage: 4, knock: 210 },
  special: { startup: .19, active: .04, recovery: .29 },
  roll: { startup: .04, active: .32, recovery: .14 },
  teleport: { startup: .16, active: .28, recovery: .23 },
  slam: { startup: .12, active: 1.55, recovery: .33, damage: 18, knock: 290 }
};

const KO_AUDIO = {src:"assets/ko.mp3", start:.179, duration:1.24, buffer:null, loading:null};
// Keep the supplied KO recording with the engine so a separate failed/cached request cannot silence it.
const KO_AUDIO_BASE64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAA9AABOuQADCgoPEhIVFRgaGiEhJioqLi4yNzc7QEBFRUlOTlNTWF1dYWFma2twdHR5eX6Dg4iIjJCQlZWZnZ2ioqarq6+zs7e3vMDAxMTJzc3Q0NXZ2d3i4ubm6u7u8/P3+fn6+v3+/v8AAAAATGF2YzYwLjMxAAAAAAAAAAAAAAAAJARAAAAAAAAATrmvrRS3AAAAAAAAAAAAAAAAAAAAAP/7EGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABBcJhKJQ6HAoAgAAAAAP9AInqfNZoKbv+gPQHmLxUYLEn+3R1B4RAIG4jwdYDqC05XHeTANzgsEHH+aEQM3Eeh0IoAb///ugZCIAAAAAf4UAAAgAAA/woAABDYybH7nIgAAAAD/DAAAAz6DMmK2IuSI5JOf/ny8meLpz9IVAJH/hUAkWO/9aWAGK//9aWAFh4qoJdQZmZW2HcSSAbcKWAPEMmMqXW6brXZkmR1pUukpbGLVCov/7nM51Zj1P0/9fIf/J75E/6rvJ5X6+9/+f/6uzM7V726I/c+js5yAzmmGIRkAIVP///////8n99f//6v/u/+2tPk/f/6ez0RVdZPX9UbtDkSj0+g8zHQzAFFGgFjSJB7kS8gr+zfr+AIfkf//8/4ISLLbJwok0UC9YjW/TiHdlpUtjYnIqddi/MYmcmO5rl/+X8l0/dCP0XKz+wr3b3RuVlI3oaDBhBAHQVSEpmWXMv////fFPssPz1YhSE3lKnhIfNGpWwstCQic9odzPO+3Z8L/jHkRnD59s/JPy6TR23RDN/oz1EAAFlAgraJAPpGv/9mr6Zf/1//zz3JD/b9rNgVrw6lYtVNIgl+rlSl0ou3QyF6yZtptuyOy0y01f/7Xoq+90Z0uEh2AR4VSf/+X//ImOdpA/9/V0UxPqVymahlQEtYp5pSKyurMmpxVSnIR0dDvXs+rFt3Ptqv//uis0pUamOCH6d2UcUCgAC2uNJBWYvGOl9mehf6+bvrrYv/3sRmVnd2qqDvLVj0RGUXXIWqXmeqq6+zVR//uAZN6AgoRkyv9MQAoprIjS4AgAShmdJ6mEceD2M6NkAI545tnTV1LHRb2Xs19jf/fgyo2Sd0EIJwxgbAG4A20B//FcUatwHN//tW95A7Hk5xR2DQSew9AAuCoKgMiebkw+t5VzhT//8MknljTFsOoVMAAAANyMEHqpN/11/t/qyzMkhDFPUyKcp+RkYiyMZTmFlrTorNdRTElZLO1iv///////Q2hiAocioAAAEEAEcTA/4gIZAk3//yB69Nyxg4VKBEgFwTKvNekXqLyDBo8GjY4Igkkf///JLAjlNKh5wAACAWRAFqyKkP/9euRdi4QPgoDEVFzzWG0D2OJMAxmLKMDY16epj///lnoAEAAEsgH///m/3q5J3oyOylolZ5WeprxjydkDWOSUCYlGFUodj3////I0qiAAAACoAdUkf//6ytpDtrdM5CkTL/JSzq00Y9mDMhJb9PmsmAAAAFAAFtgH/xZ///+o0Wb/+2Bk/oCCHGdJ6kEUeD+MaNYEAsJJPZ0pqABNINGAY6gAAADtfMH4dSYeTPFSyRwJAAGToeYw7cYbDDAb///8phgAA5GATydV/////6yyBXcZDRN8KweUCx6kuVG117C6yym////+YJJCoE7L/n5gCf/8Xr7MZ7NkJ+Qi3mcqbPzKewljBR4BaOgEKIP1I9+P8423DFXUAAABqQHSkVV///9arfrTZu+zH7rb1Z3neVp7z3yEeyna2n/r8pK6f21t2//goUEYeAAAYAAcjH////790TP68qmfZku6o4igYWCgos6Ve8OngUYSl6Me84Bzj+5/HfqFACri+XlDkEQQQV//////+2Bk7gKBy2NH0mAS8jVgCP0AAAAFkLcjqgBRgKuc5HQQCmD/////////9U+m6Xm1snSdndGHJJACAAEQu0mj/8sBXFf+IgaBpZhWdmqGhWJmIfDpglAGCAiZHWHMaFAaMmhBppL7Z6HCZqpecWOkCNvMzkjCDswprPDI7fmcRKYSFxosXmJyf+eTqGGwQZMLhp0nmRKAYDEmGWNsyACjEYcMzG4yQDg4imPRsYlKJhcQv3csWMxICDAUMUAoy8IGbjQ1FgMFwiYhFYoFM7evz8wYBDEoXMHgdEdY6w4FEocVjDg4GAQXkDBB////8XaxAlOgkMCAgOAkoYgzVmqGiUQ8Df//+1Bk+wTBHkBISgAb9izgCS0AAAAFAAMhTAAAALIdoogAiqjnd59/cCvsriEv3KAEI2yNMLUkQTXmYBAbFlvAgMAQAKWfh/d8///0R2sUUYlljmGGfhgSqtAjb93ud3hEP//////////zz7vP7b7v24YNAJftd7vxSX7n48sSHFB0j1Mk4BIAiMEA0BmBQH//////////////////8+7lj+d//////////////9t4Enb05qqiuulYxAkzCkIqLNZmIAsEJRo1BUizQINNBPRm//tAZP4G8Y1mxsqAE3ItR2kKBAKoBrUVGzUxAAAAAD/CgAAEbAYIc6KtQCJqW4XRQTuTBBiOc6PkXkPMYxD9DjFvZUiXFSG4PWB8P1DwaAGsHgnBIjJKAxj0JOIeANvE+2RniFmmPYelRIawiPkrQCjHAtgHgvFczH5KdavZ5oCIS8Q7DoNBcsBqPoLhtk1hbfqLG5FAQhi2lFC1RyBDcQ0tlznXd3GPFrnUF/t/Gbq0+////87/+6Bk/IAKUoVP/m+EgAAAD/DAAAAcHaNh/YeAIAAANIOAAASxWFeks1fAvnE3vrG2yeXW56slo8Wd1BRZP0WpTSUhL04SMOdVQCBjBJGqkooGlEND7Crde8+HRRAAIBrFqiECPotdsSRYyB1wqBD5RIOM3z4MTXJBr8QqVytujAXwZU1tyyG8V3GkMvgBjWJRMJp0XXQrBghPCUIaw4uwXzN6YooXXezdgRK2EOW3IWo2pK0qi1aCoi4xkwWZaDg4cgwQgVlG0Ock0OxZsiv6m6u///f7/nriupgdKw1Uj1xVx6FwpqQiHGwHgdliOg0SgsMBcB4AYPDhCF1l3sv9qWUgCmwa2gkpQy5ZxHwFAFiMySHMwUcXMgWWs9fucaAjQ1IoDgR0UHMpY6uUSExp78dRGSEOK88zHFubYfnHuZ1FfQ5KFmKiohMS2zLRBSlmDUj3qJn17YdRRSJQ04SC5Y4dMnCGIIf1b0LqlO1JPz/x6TjUeePmeDviZ+v/jmrjpqmHYggGwlWjhGCI4H7NstmZ+8dBIhOtOwECAQkGuDw5iQGFICgGKlBbGi67so8MEQ7QM/61DRUlK4dDZ+BE4ysagphNUbZjmVziaGtOh48ekqNHoEFSnAdtC6KPSecrUdO6r75FGY/TMx2qU/bLllRqmz0WS0onndFwmF3s9bxlglRbfG/79vr/+5Bk2YD1MGfZewxEwgAADSAAAAESeZdx7DEPIAAANIAAAATVn8VDt43/v/3qI8bfTDqhcSSMRJHBV9sDIjErtU0zPdypgASTaeswLFJevujiXXDAJbgqyEpItEtUtEypkJxzEo1QQOHQ6rFuYXsopXKB6zBpJYWUKWyoclOKbcRkeCC6Kyyza0ijOZ2kv+XLml//o2U6QQXGbnjx3LevNvP+srOTmNZSOuZRtwjT1f9bevEXOw2U+KT2o7ZDI+H925oEZQhL0MLIkBtDsQhTzj0QqraWiHUiEIpouNMAe+i6BFJZAw5tumgXPETRGJOZkaTTeguO4fCAVy3QTTXXZbXu+1RK+dti8jRYBwjhKXfAjs1Ww6ink5h5sPVmZIq42B+t1Eb3M1fPcpunS/19rLTlRk1dZwyk3u3tKaxC3BuR0nNxU6kS6f/zN475nrtyKyxeF5Hw7pKlw5N7ujZKOiSmmMBIJOMgsMejMDgEg0FSHK+SsSLSh4WGkbRuCqWS6Cp2WCaYgs2qVMs3WXemi8yifWVUpW6QLZBqSvM0gNz/+3Bk+wD0tWZbeywz0AAADSAAAAESPZlv7DDMgAAANIAAAASGDRyw0WIcF0KnFr1NEzDsqDouUVVxskQ1NFJKxDz9o5l7jih4jaRLRKPYhMx5yz/DRVFmzXf//NOlN8dIwuQK0IQ8dMXZz4+yQdRhbsZKipPWdCp1EUDbkSbEVgdUtWLDYIi62IlENHlgGIj2ppAzagVEg1fuOK1DWDsVS1AfGZ6ytQvdu4ZGCRk6eXT+Q0TM1Z+9G21JsstbW+O7GjdprbmOr84cjr1akA+kTztt1F3jZpqHpENat8NdQvaU3VXXNfNV1r//teT//xDECypDk20lOtsqZveOOpfPit1MQIlnEUmPRB5xQskLfjpC8z6lvSgsNlzlkJfrVkcgXktPPCUuOOMGzWqaRYgiNWMBRC0iGGks//twZPEA9GJlW/sMQ0AAAA0gAAABEjWXcewxDWAAADSAAAAExZQMRur/ckmChdnM970nHzUP/9zx2acl/TYcVNPW/+f99a76ftIXT6kPt9qfgvKCw43fvbCvuwi6b9v///+zu33/+GpNAQeHh0u/bU5WhYETo2yZ++Z1SmcBYzyMAqCUOSs4d5egyJkAspWxPJOhaztyViouJgEpU+WpsOgu955WU6T+RUCMOt1mK2KmqHJIGcHZHWWxOoVl+2u4hj+q4V799V5Tt2aQ5lF7HjxyMPjSooYUP4dpGEMccv/vPjuxzAsKt+2JUOQtFxTXUhKgdy0fz1z8vH//tULcxXHayyigoebQjjK3896H3PWMsMiNq40MEMgmVNlbKRFWwdD0BktAFVjLGMduVIkoQJUrLUEGg3XrK//7cGTsgPRPZNt7DENwAAANIAAAARHlkXHsMM6oAAA0gAAABCDIc7NXC65jCoE3dfzE2Z8EqBYi5m7VhtWtZxo19bLS1BjJFRPlR7SLLNBgOMLNsZvAjahR4Wd5pm2v8XrB1i3ri9Z8wt19K1+vaFmz2QqkpWNAYyOHTNKOhdgoMN3uLZbf9as2rX//tr1pTrq3y9zC3NCVY1rl72XKmfe9zLQa8il9DfrrPHowOHyxAAQUDDxIBCBcgjBQ5CFm424Fdbi0eNjTmGrcCgBw78O0+kcLANfa9oOd9tnZW/F9fjzGxgndzGKRBnFWhl1CzWTRGNA2p5vubD2JxZzbo0efJ7dMXey4r84bKoNuG04629RtjU8ZgZsyh0RTCyNFSMGoFxaQYwNb2rE6Mb/6siuKzTz71OQle4P/+4Bk6oD032Vbew9DegAADSAAAAEVBZVl7L1zyAAANIAAAARmUZT1ZFvurFwzOnQp1EVR8jAAI+oloujBw58AiJBd2iFgl+0hIkWnhys8LBUOrb6o25gEb226ZhTN+zOwUae3rrvd4bEFXVvelQn9qlPF8TUOK1nXaJSDS08O89N4c3B9aR75cVja+/4MfeZ6Z9YUO2NSU+PrNPqDlkgma4R4eM4n9mPfs/fw8ZGih8CWixHkn8+Vkh/J89PN//TjMHR5DNqIDCqUIsuDL2p9xoXV5Y5DIFDmVe18GnkhOrxwkgA3DDo0CpUuc1XpaTYcpHZCGBiFI8SaRvVhYajFVitUWRjvJui/41OP8AoKrOzypU1ZpoFGrWrFi5K+xKCHZnI5HgXGq2uNX8qqJvcrTPUjm48qbPaW3Km7GDxa6k6latFSR4mh4WcsgyKzU3umUkUVmpHvLVrQ+o+v9f1rRs/taaz6JMSWpkK6kv/7gGTtAPTWZNr7Cz66AAANIAAAARVxk2fsPRXoAAA0gAAABEdFaR6W5c/KOJszJqGMhsIyQiYODiTLCflyS6aqC7yyq7ocJTSuKBTKVLmyooG5TsaBgcWjOTZGTYXdFqlm2uaffO1lEhYe1mMFBvMMAua7Cd+Jm5bUdQ06I6mmpz/LGnRAtTxsbqS/ZXVTR8AuOPNRYqTUhSPjPIOnoxMm04+1/7MPI8/dmz0c36JmIs4zLHqCenwI2jrogYicEaXtyi56Q1Y6aAAHlr1iwNEkQA2RoIwsCdMicGLhGDOw4sCwV+24wBNFAqvZgoxIb/pm5CQfUWskA1oOeNea1M4PGTDp7CIf6joxIkgGm6RtYMelnCmsO9YkgxLx+w3zXe/5ta+MyR9tmsW73X8Ob59NQ/nHX9lWE1tnm7t2PZxDYi6qWLoexu6Ke2bIpndMm/vj9++BHPuZ/9JSySStzC8rw4zp0GmRVmA+ugtK//uAZO4A9Mhk2fsLbqIAAA0gAAABEtGVZ+ydOYgAADSAAAAE2flh9WhLF1XGCJCKHJCETgGAUmpqa6fBLM/QzcjWYSBrAZJUwmqRDcrR1wZ35Q3ceCy5fTtge93bw7pJpDqxqzctavWa8QbnCLNtiV1KLOtbHipFnSJ548htXerfVPIlr1uWKXUm2UUBwF4EqFoPjhPBycjKOHSagjtZx2y4ndKGVtyJ+///9rm7UfvUf6/c1+sL8d7ZI6AMuRW/iAZ5NUQ6RAAEYpYELVDVBcpj0CBhybh9JGMK/7spvrhUGdlGcKCLOodrwN4p1X/kJVOyqH4zTiJKhdJWtP5nL5xAsrlYp5dBTdJDLXLfltIBcCgl/9xZHCdVak7bsf2R4YZY4a1hhrdrLmf2t390l/KxXkNrG3jRa58vyj2dyl47UUhko5OQBfivpMwCro3z3ZpbxGxANk0NZxXNKyHTh4FnKyaa/FxrHmZJ91P/+4Bk+oD1Y2Zae09eSgAADSAAAAETPZNp7LUayAAANIAAAATBuBkOVbV3rMZs8H3V+96hs1nrnZY+dskFcpRqKuaFR4M/vwJmldIPdAQTHgCzksCAhgCLClzDhh00C1ZlKWpOiuxfjqwGgKZJdnH+MTBGidPllC4WLNw2AKc8OJvNekR+s85L30jPaHh9LLlueRLobDl1dmoNgWUwhxxkrE7zvcJ3It1cA8d9//xcMyiCFwH0MIDwdVuGBo5Q7kdGPBhruJM46FnKBLnmvmu39DcTjnT+ba0XQXiZEE+B6DeXZBBHFCwjtRb+uxuLM0I+rABQ2FkgZil73FZRSAJbDpnAHbTBda6FSypyiAkwyG3VxSeKD6hqYKEQN3CRDEj49W0WUX7nAEBLgcaLV5uIcZHKZVF/LxpfgExjsU6ueTRZbQZk8u9rNm/T7c0+P/vMXFc7x91iwHldZzA1XV/WBDmMGxemhPk3MIsepP/7gGT7gPZ6Zlh7OHz6AAANIAAAARSVmW3tPRMgAAA0gAAABOp4pCDyABRFgYWOaYidYGBvT4uWrT0g/CVLG/6aWxYYDodKSHCJAsdJECwG2HIFqAeSFu+7FqtBECbUIIbCpwDoNcFDMufYGKgomoTJlzQW4gA5EaqlspwxLwdF1Fpj6tIPVrtU0nrGXy+OKKX2oS5YcXxHzrv3HTM2FkNe0OvrJii4ja91O6jST0pWa7I7j5aljJQ4jJvX9MOkI/YZjZj0dChNEtrKK49exD5/y//p7zP79jjlLM0iLTziroOuDBIaBWPFhoHvaxtaUAAaiAADrCEZZQQwQ8jicZq4mmAZiOCTEmjI4YtMI0IaNjAY2zVdtaQTTFe5PIcbWE3GIjvCvfMA4dtK6gkRAa5LLlLA26mEGz3OY0yn62t6/92GHkqS6aVuetUqaWe4lmUaaPqP0uxNk8IcijAKGc2ZlqPGao+lPWO1adzi//uAZOYA9bBmWvsPRPoAAA0gAAABEn2Xa+w9T8gAADSAAAAEV/OqUW0Ff262mTVN2atkUkTy3U5ZqZJSUe4yTqjQdx5X+1DLWYgBHBJ6YqwwQohE5jegWsCgbQm+ITrRRZQuVw0VILKC87tyWNwJnUbuHKnsY7BrZ+3KGhL9WojjDAZEqKUSk2aucAXH40yUBADVNhmfZBDpdGpZMdNifUfy9kzUJbWSY+pBFq5xzEN6VmpqPJFGcQQMZiN83pG76vVqz9/++tp31a3VpIl9p5x/ZbLU9jAYU0J5RMBPT2T/jS1LEAIiSAALfBQIJG2ZOYegAljOWjEWQbGHubFis+LhJEQapPuP3CI/MMB0si5jWV461WlpXSTzrUbPBQr3t6t+Sw5V2/0AtMpiDWBLMudilEAu2D0RR32lWs7SeqWMtaeol11qtoOpllp0IMoGJRQGSy1KLx5RoZiWLMXlK61Nf11v/9b/9XvpqJX/+4Bk5YH1FWZYewhvEAAADSAAAAETaZdj7C24yAAANIAAAARzM8smTtRQmbk4pKLGEIaGZ/5KBcFAAAAAICKEwuAABRkNoKRYYBLwckSiP/9YmCbOsljpUBtwP/aVizO55/jUlNceISJ9ThckMocqQjRwrGqOREVBC7ZOxY0tc+E4SjBzIck2ckeSDpH9W1LLNZx3ljv4SmK0titM8+zNW8Ltd6PrUlZiEuqZ0tjLJ/Kaiw1Zy3c1hF40wlYdYMHOImyp9nnik7CKg6LldRzHxGQNLF5PlQZfexpbG8KHuftunzjP/z84pKya1jOqY/vu+aI1UafPi5OaRX2sFYsl2fRyawrOY+zgekNYwCc7kjue/Y1nnWQQKrAYiCAMG9RccQDbZYELElxdxbtqVEBS4Rc0v4WlFXoCpqzCA2EiTluFUSq1mAPDq/bE03PYA+BakNbVKu11hru4UOFih2C/ZUXiKWS8liapYh1MRP/7kGTrAPTyZlj7CG6gAAANIAAAARuRm1PM6feAAAA0gAAABGhKCzJknINPrvdH1/7a3Ww3NhfF247Z+yBj5eX8RNz56fljrrfdzf792rH/HffLfP2yIt7rMTtGWH+VFmmFEhYlh6Jazv+Ne3tFBCOsGMKCGBLCBZBfRxn8IBUplCEVdv2fpWu2ie4qwLUJZapVL3jhj5hXre5RxKRdsJwuw3AE7/WhOvPCBd1nGFMtft+J/y2sUNCtRIyffdotTya3UXQtTSYK9dX3t/x/xCCGefePKomBBCD8RgvNTN/p/93x9/CRXWtNH1MxfE5NJezHishKHNkjQVCM4qaKB2xQckh+ff+LKFkAABUIVVFIzQDMhcFDRkMAEJNIqmNDsCmxUFhiyC+aApZET37x1G+uSRKqWwimehE9Imcom5y+LTkMM1dGOvqyhetLbxw53eiYkWdIjsRs4sosXDkv0qnnOlxhlQ8JcTLzV2rRbcJRIKBRw+OE8ch2NgHAFg0aIhoNG8cY1SLadtzTrS/xF9/BiTI7m+qlV1UqyarKYmbMqP/7gGTsAPUAZlp7D1xAAAANIAAAARN1l2vsJRiAAAA0gAAABCMdWxAZxFM8WDUmjdd8YnmYAABLHBCi3INUPEcxKQeqzAUcDjJwYOa3vMHwdhqeHyGPRagTkYiobG2Bo9KZYR+LONhdhifnWBzjIwdFBQ4zCCCH1J6G6qLk0ZcEGj9mlvdLR21th71iqXNT2rSylbh/P5OKs6OixGGJrQpuzhiSyIXktRv/Y34sX8+OjsPdftvoON192iNSSOoeMLiYfFnkchSCqnBUBXQq/btbYgAAHQ5BKtSGRBAxxXA0sCxLpgmLOl3vPQMXuQw60qfOpdwfTka+nZlMwLLHdZezl3XAcFsUNUrhyCWRcHQwHoMKR1cZUWd1EIIqnmqagoUcVLNDT1KXwbQqXxVd93f6XdjzB5wdCPBYuIp7wEr1dOOo20r6j/4nK+/+ff6i77pvr3+l8mkpONJE5WChVEKmQ2wRTVN6qfkn6lAk//uAZPKB9UVm1/MoTtAAAA0gAAABE5GZYcwkuUAAADSAAAAEjAAAIADDNI6XFqgqtT8oEgKcrab1X0w/qvoq1yA3sd/OoxNLN5oxBTqPTEpQspOVEpry8l2FvmQy98myF7Yw8K61VJ7rzyqnlv1qQPO0vjJhB4IuGSonuylu2rdZ6Kl92aInKIZ60hUvTenJpmelWvlkuHoMlomE/akNMWhJd4PHoXjlcyzdJF+7bNmZi9Tr//2/f1b1rj67+YWtlGxLcfLztgjJPIdF0E9IWmh0oeOq+ncZUAAAAAA6iAFiU4O4M4UGQGlVjdDUMiau5YZKsWO8z4VW0fN24Fh5pbMFZFhgL9+EvU0FOg6wQdkIjAKJHAESXvbMwZmD6KAgcyZEKAJRvB0wMKh/WsVpjP1+KjllvFfYHj8wlmZUO6Nr9dMkrKzyR3NIPLQEtKpkPWcSx4+YMbbZPiCqBbjrQ1WDxXDmehvFeLgkzbP/+4Bk9AD03mZY8whOYAAADSAAAAEWcZlXzDF7CAAANIAAAAQpjYUGOs5bK80mRPPsR2yHfE0L1jf5tmu///8/X/zuktPfde3nN3TomklOZCklWgRFRAIpqUycFAlQonzNUI9M/uXWFEQABAF44UBjyg4ZNHNVZEBPEvUDhSFOZIxm78RB27UxDrgMuhy6qulo/EbiamDDEInAZmr9vVqo6TSj8Ct1lK1h6T0yiTSnKzO63MEJ2v06ibccOXkp5p4omtbe7n1uuk4WwPwlU7mV0/Pw/Xur+12MoDUDVpFEfrniEFyMJLHSgXZmVDiNLrrzjP3COz//h//KH2trMuFTy0s++N035IE+2KYQXRkqAWLtjaZqnqtA+Aia/+ioYyMAAkwoTMEwKTrAgACh23wBQwqMdApwqkoFyFj8dARLZ0PxHH2q10rLaHQJA2fQiWDUmGxPLKwmchaGZLUXZ+nXnjOkYeZjhYe8kqg4b//7kGTwgvbCZlNzD2ZiAAANIAAAARbRl1XMMTrIAAA0gAAABH13V2XIUKKIIsk41zi42/4vaZFSg2XA1bDl4AiUJRhdw05Kck33w9cce1Rf3Xd2VWTT/K//x9zDNdkoza2ZQ8lYaxVX854t2IAAKaCqAIy9S+QqUnC5MXJSpxq3qOJVqfh6A2Yt/AMQbnR3xbe9yzTpywqdMSUfE5LFGX4REKA4eQJJogfl/4cqYkyDIssoNLlc+lVMt8dna9jvOmY2P//+3lHzkIlr8JjSCcYtm+QQ/u3fH//Z932/be/85Gft9/+fPTbHqIb54NZ90izL8iBVrJBSav38t7QkQCSwzxwxJQ4NDssGpoqYkKpYROZY1iJlwisnFoAgrLYeYZrnkpx7b+TLzaopOwWWmQjlJsRwoKLJafXIVKc/myS5Q8kTirCyklVBxnQ0yIqBWKumuLsZXx9p18cIHodkicfiIIwQwDuNhB5oyf6Fx0Vx9qPRph3qHjiBu023A110lMwSyPbhx0VZJcOXnmFEsA8eEIoYn3ympgACAACCERJFfv/7gGTngPSuZdd7DENiAAANIAAAARIRmV3sMM8AAAA0gAAABACSIRF+VHgcCdSpMYoYjKHJOSXwYX/LOM1VuVI5s9L3Dj1/5fRSB9F4y1KZqbguqxDgMOFAIUpbIlJOKvcrN7+Hn+F7L2q5mnzLd9tyi4i5pW9N6vT6mvrOL/efH99bpWSJnHhYykFaaIh6UcmSEiCKCG44T6hZ7q4l7FkmEBVb2Uq+I/5uv03x/y9jD9mkqwmeQQqTkns+e0C2CHtIqoEkdoAZKPG7Kvz3plACMAxsKHxY0tGRCoSzFwZKwMRHMEwFkIW15Q4t7etBaSgLw8U6EKu7dAYasDexq90baoZI8M0xhgwlE7ai++tr/f8DRtqFxLFku6i4fxJt2hcznmyinxR99y0jav/+fiWECxojBgPzx1kyNBJbLJ3W5tiGJEMJjrm3MHFW39bz1EIOWK+RLLXA+RBZebp+O6UZbqzmKKgoBqJCAcM3//uAZPiA9Ntm2XsMQ2AAAA0gAAABFn2bV8w9eQAAADSAAAAE4tEEAEAGQQuGDhjgyzo1esOCClx5kyphCxkjaWGkhSoLG1+TSJilSmiTb8wuQ9AliUvwy+Oy6ngSvAoJIqilkoEQkzIMWD//8WjWiQqV3uXv4T+15/vMK8TGdYtredw5/re/rNL//ec4/y17SMqNLYSFFMNqFyygkl6h/7ZqkaiNFgKLR6J2VlZ92v/PMhB/h/ib1ocDcoom4/+v4PtJZdYPPLmCMVEoJxDa+mgjEAAQAAQ80jDJDggKmIAoOcgFDA0Rxk31zkgQ0Y0q0FnzVgFjKkrL5xDGiXjX3XxVhs227CFJ7IcdF0nKnV4wWLlNPcmPtXoLkQj92j9W8soXO1BSstUMaeaSPO7fSal0qgkqgX8fO2CBreqVtHhQNa2bsyhUhABAVk34KEQ3UdVKl5NJNjNq4rAU/VCKTgImK92sZ9bSOPi/FbX/+4Bk9QD1AmZZew9DYAAADSAAAAEVaZVfzD05CAAANIAAAAQg6tv7tFxXWYjc5No9DFK5tdt539Y1Au3xnyXbHNwiJ2CsC6YbnJf/y0kwJiAJTAgIwlgzkRDxQquXpUFESQhRnkyQAIWBkuYcgh1Qeyl+pm/6DKP7pMniTyZfUe69uPXk+I5IH/Ig6WmZi8rvgFRiEGbWYMf7KP2CDxk/3Yy5nEkdpV8zqRlhIdFMOs7YqKNf/+4O8vBNo2CTbmhgGKegO2HVDeupuDTM2FQWa7LjRxpaM2vaazreuglMlBeyMgCfZDwGRknE/P/upkWXPs8TmwcYQkbd/ItoMGQgLgg2VgUKZYRbEdCclZQNJMgFCwBAoUAkKH5uCYJF6y4REUnGqmRapW1GqX12IsOacsz9V0o01c/JQjxPlepBSt9zPL6cdTR4zK6gdrfUPb+o9Rf2FXfK0stzf/3VsqmGzxW9E8O4k0ioe65rm//7kGTzgPYoZlXzKX6iAAANIAAAARXVlWHspXkIAAA0gAAABJdUPzSysLWZZsw81BWK/a45OfruzZV1Dwg8soeyEYt0//5+HHao9mq5IggGr/ItLIFcwEpAWCIyBAMTmVihCw4XQQC0FhFDiATZ4NwdE8EYEyQvEQiZlGHWQYxws6afu9i3H+ZtHitRossW5EQyTiXZUUetv2UMV/9ZlLkyzMi2y2n7rNst7TSe3Ss8wZl/f9/pRJ01aTS/IazryTS8Syfe9kNkl5AhCjPHw5DuZr5vtiC7L3MeZMJxlRbYivdVRfz/O3k7S+kfcdMUKv++fCBVUBytGgmIscDmMMDyt+lQHwJrOtYMaSiKioVZpyARuOmGg89CwT24ytu1funLYdv5huW8l98JmLJCbN0cl0CBlFRNbfwp491rb3sd8xoc9IeHD13GnmjXz76pA3iuKb9tz5+64+NW3mSaBeGVkCaCqc0vafds13nHxuFTLJupEYi7H8164tMu5ObTs08z4INc3kgQuk+wwuF9/83/xxKlqzMySCn5fxhgyqRZIf/7gGT4APT+ZVjzL1wwAAANIAAAARPNk2fsJXjAAAA0gAAABD0AyWGquEQYOGe4RFCqJFKwEukIhhkaimvTeJvkkSIZ5UExWucpf533Nkz/nSMgYkMz049nmF2uS+GppvI2y22ct5Qm9qFKNh5AGzF4NFD+tKUPiDRizyS+FzRZV1V/96UdIMUpo9uppEvp75r+ai9y2eWSBnNoBATd6tkYntRIXN07lMhpKycNyZ4dg/JEdUE8sSM3vuomP+uVJzFhiaOMXCL9flpQFjDZCCUtXwIFRBKxpY/oNqDlntSQLkjTS11Gbr9kSSndJkIAXbcdoSAm19dmbtZYQRB8gqXS2bz3aQqBUd+VN0VDCJylfydysx1JipBggdqpJztaHe9eIirlN7WGBxvDXblq+f4ZWbH1DsAJNXefERkMPu1abl68qhqiGAvawNftHaIy6+OVmFOGCFBajDlEU0rkeo6lnlpWWPKQCxdSSwiY//uAZP0A9Udk2fsPXXIAAA0gAAABFV2VZ+y9cQgAADSAAAAEr9zHphRDIbbCpEin2DlQKEXLKCWugJYrWcdghVHGZxbNYm0lwm9MmGrockMnXDev0LrcUyM+ihBiGWcAs2p4Jk220RRdkOdhZhrfnd0rKVm53ZxHEVyq67Pn7fpX5hXx89ctUa/MTV2H1b0Urvjne+WOaRVxaCVZjIJLIRdEPNHsnba1s4IpwPhi0lEwiVAhzFQ7/4+a5ynHlBdJE3UYC//dfGBWhiXYDojCsEBmFnpQXrgMtGPPnVTpFGKhFKHus9GlKOtdWDea1NWmIwPL9MiufhUtOyOD0p2o8QgOx3+/dqTfqkLbW0ddn0pB/WIP+1NpkuZBXr+kQnNzXL9T/+1R0tlG6//Z2dQzuBIGCMWNNG44NyZrjdFFCjg3hYsFAlMDIIjzFQHOlWS/ppcxzyLRQd+5RSAAQgAQgEGAwNNINGOwEjiQT+H/+4Bk94D1NGXX8ytGsAAADSAAAAET7Zdn7LFxSAAANIAAAARsRYC29SKAJGtUsBGJEzJPpESNYgQz0ORz+E7qfKO/udoxliCBNk5Zn56IXPJh7B951VhAOG1bQ+EQTnUHcWg1AmoQB7VPA+Jg3/g0wWeF43vZWD2BQSgCoWC8xYsy/RO67phjiOQC6seDtQPvm+/lProveShhwii+BYQq7ty/H1Dxxn2eHtEEq2Wq34dWEAIwAUgIHXATS9gEGRCynxxAjC+cTGBByGgVZabeI0vlMSEeb2EiFVWVMZtqVocPDnKGZsDROrdiMPbUas4+MNpB6LUdh2T1oQPj4o0/fV89ONLQeSmzM2x0r/0zno7ko0eYgWWRR2Pz9t3P52oaJircAK8wTzFyaDIuIpzbYiw41c45RpMAjPGlmI4hjyRds2fd/E3KzTJcoM7vM/naOEAEIB0AMKwQB9CEIqYQugUFLKD1U1hkp0RKTP/7cGT5APSbZNv7DD1QAAANIAAAARP5mV/svQ9AAAA0gAAABEYkgOS0W4WmRHKtS+03um6XM8rr+2NSuQ2rdxNlPGWRsACDkOC9Rz3LwJMU5HcSqHCBNKkDntWtl+ij44maeknp5pp2KeSiQoMCUAY0ZsfVDBixUV1veIVjhguF0oQbvr/5///59CR5dgWWc8mNGj/V+bFq1E2LA1HQHjX6hEQQARAmCAYOFwWcDII1BlDAyOCjocgAZXEgZuWM7PlqT/DyX7m72/tFzGXUPNvHIe3F5w7P23cIgoz1Wde1mrE4tZs6/rwRTvLKGIQ3tLlxUXmv0tRQw+3olL25J9l7n3b2yxQ4i9cQMDtaF1uTDXkxljpa2Wuho7kCPIhBPfR4+oratcW3qPXbO1Q+kPB42kdJOzMxWn7/+4Bk6YD1AGZYew9b0AAADSAAAAETNZlhzGkLgAAANIAAAARV/Y7eoufa6sYJMszZ/XD0QmxsK2FREgS3FcoSPQpZaO3GsRJ7AhAkjdRDvBl6gaOj9O8+LouoiVS2sYvAID8wg2KmphFM3UhE3tmdtyEatbBWpWDV3QnxWrkZEzzwQM40Ogjmtuf0xtRIPIqCCO4x2833da1zjOcsLdSFLvua46upSbqibItw7Kug+pbr7//nj5lBy0KG2QFq/aaWQCYwBZAaU6yoFtxC5CGAMSUoLLAVksCLQxidIS7vbU7idlIvHL+9bldr8wGuSNZ6bcQPGXChZqcs4+D4upSRcclDkd0REnGvuY6WnoYSOnMl/0aQygviphe6oVS7N/saXuYBQxCoIoaiTGYw5ztUNNU5xcKxwbHoGKOXf6/SedMYuUxlf22p1BUIAOsGIRlKoEwAooSS3CWkPyM6m8hBLUVH7bGVKwHhFhEl9//7gGTxAPUvZldzJl6gAAANIAAAARGRlWvsMREIAAA0gAAABLRaHg2RyDraqpbBVJZAIKoxaOTgnoazlf35Bb8ejlDxOyiKKlQyLZAmWG41JpUXWt545/25DoxDBUewmq1gQPZ/+Y/q5gfAC8DBoxZjlqev/i+yD4EATCYD2EgvVzd91/1FdwNNFUCW1twuHxkV/NOBQSMwHigLkgqdwzDOBYqy6pAWPdt3qkJI9hXT2BVia1ykFBoGtVUbDFqgGaksJm8Imb1wyLkpqwxmF8A0KyYfdcVy39nDFn8EO9YlLZ5B/N1Dzz+Jp2fh8rXWzv/jZLi0qMT4g0pJRcmSQ+ELDemxbqv5aVIFyYgB+QJg7Ur0Nvf//vhyT4OJkJlA/Uqr3H1//LGlPbjrHqlGW/uPKsavCAuiUQGABoaDaB40YX5h8DAD0y08AQKNWwO2Y4yiKDc6XjVZnMKee7rYYHw7hLcd12LRXVsQU2IA//twZPwA9Dpl2vsMPDAAAA0gAAABEqWbZ+wtEQAAADSAAAAE2sUy1a//bdqTVnnKrF5ow1LDddIye/a1sumqesxW6lVD2M+p6/SNC/D8bjw4qc5B2ToIoet7JIJomkKw0TKDm6Ev1K/1GapimgWEsMHGgl1qRd1J/qddEwZbuRTdjNwt/OWnQChaBfE6S8RQBkZAlgKB0wSYBaFSP8BRJA4OgAItBwUpZJXi6G2+P3mveVEKlKbToZTH1ncimhNcODA9bf9mw7Jqm2moJIFI9nSTJ1qaztdrv+lb5mafczH/VcWkSw+m9NK6trXXBO3rXM1XumknnR20CGMEz5sSYWQjZHDPmnn4TQVs0eJZIhHuWT9f/+9sVH7aY9Qr1+7kIAxkCSoNg4GC5yEahJiI/ofcpKyDAqjiuP/7gGT4APTnZdhzL1wwAAANIAAAARO9lWnsrbdIAAA0gAAABDAzqtcc4wBVTLAVPr/bf15muA4OXyvbibMkvBII4b0r/qxDRsreRHTX6i5UbPkWZVvejWSIxwx6rn//ebBeUhQdmJD3ZY3qP+//5pMOApIoaNtWnpOnn//EShDFhICxQA4nZw6hLpKev4SCBl5EHbCUTUUP/cN0AAQ2DJAaTFNJAUbxCMLBlBewoCPA2Wi287SiZvTQNqDHsx5cpqtBHbV/kMymu+jiJy06Z+XmNXgeQLoK64rtU82ZaoktNrmp1OLh6bkN7HVTc5ZrMx/NX/1tLhNe5jSQOKJpTvVrrqTTOOoesjissYcnCfnZ8ppnnWuuoe7qY+MlZBG4agV+DyU3JZBM8t1NW+ujS5kmplrY1/rW0ABIQA2wKhLYhUWwB0iEM83UTkCbjrFoDTLdcdOZYtcmnafmXZ0072bNmwgivJEHcDR0bIM0//twZP8A9MdlWnsPW7IAAA0gAAABEgWbZ+wxDwAAADSAAAAE3E48YCUgGDsPffvijlshyUwakSKmL5i7N1oo5zDqo4a/+z+Y/6sreeOoNlc/q3pBvn/F/v//WbafOVypX9pZndPYKndytvth9q26RZ38ONtVIWXwcmy/oLTJLBz/8b+//uPFYaxfikPPiMIp+LCzAAEAGQg2owtsgLKhkKmRZVBgkhMeEFmKbQ8Vk0bFZoC0OTKkBKeXas5P7guvb+jq35Q7MTjXXyjmURpV+RNIbcdhhi+Wff79LzV5SoeWKyg+R42LVGWKKmWbOYbPVbcXyvfKiCcCkkVCglOMW6vZXDEfW97znG/B3qCzsjmYJZUVsdk3V601fZhbh/clsQrJHw2KOqjhXZcEtAxLF89t///7znGL2v/7gGT1APTmZll7K23AAAANIAAAARSBl2HsLfPIAAA0gAAABPJExqOvP3L5xLgBBRAEtSiGhHJfoCFFngYGtoPKELQZODUlQ4VAMIofRV1j03a9WmRAr8NmbrodbNazRV0nJ6Yl0Dy7vmZ9H45hqIgowSiqDsnI8ZTU9jB7DTUlBXZpXm/qeaJAREA4aGZWhRMo+uOP+v2pTjRggicNHikjZOO31ukx5TSYQcXBgMWB4gNR7e/P8XN90lTccDLJhIr69cUjNzQO+b1RcSW8SMUsStQbDbsAI5io2SVVsLBgBXKZLGMRwdqHRF20Vl0usnyV20tWgWWuYC370mZmaLm1icZDMHcEJnKKCh4i1Z9nLzrNnRd91P188yMIcBuPxyu1NlI0P2t9fY2qpRs2CDB2KIeJWm6uv5XHQL3Uh4LsBEuhris3dx/TV5TjDotmHGBoPTw/LfOrbAhsrT2ysaHrKLwOJL3lyBmEIiR7//uAZPkA9YBmVnNIfrAAAA0gAAABEq2XY+yxEQgAADSAAAAER6HjULcmwDXj0EhKtZbor3KRiTtivc3st5FOPKhhkmDR7ALiAIgXkf/fSa0N9i6DsIkMmzkcihFtR5BIos23YXLn24///gpqFREpIvsQDA6BiZbpdZzYpFLMIE4OAb8REhT7i+/qMgU7gQJsCTw+dPf///4z2i10pDlq+/XZA1ZGVZCU2YA5ENiZmGA1pBmVAbCOQfdUtxQx3sY+2w71VlI2XoyVZNMWx3aFp/zmyyfWfIhZOHTL57Jm9M6vf+TlucXf7+RpnVyd6RcarJanck389fEfw1kihYwTmyUf2zo5kx/PF399IcfAKjmPhYG3/fHPGxMtIyRIGjCqtLR7/auaJyRFiKtSRpDhpZ/RydQETECYBMEZhlIAiFWhUY0BCIRhhKqbpawsBi4Q8kxEFMpGL5tZioR4jBBvK+31Vi8dxrO4XXJPi9T/+3Bk+oD0p2ZaewxDYgAADSAAAAESNZln7L0LSAAANIAAAAQA2DRe++PnTunoPlVzWsZK7E0NixrQSjqcSNLe4hJZ///pBwegDGmg1HwORMgW///XnaahBCYSgNE7tptf191/pE6G0DgOmGWNrV+PmuZmjb+4kY48DRELRfXDdAElQBRwIoLlPBBQXHRjEGJrqDSrpmgcLFV0P3SUg8a6najLc70pE4M0BCqapj0emcDDN0dyBdyBkbITf356aaiUt3ehYbMvFu463mh4s5djzIgcl2qt3///7iCKv1M9EQD4jqNbr+I/mkdBFEMQQtMw9lf1f/FcP/FnC4whmn///m3Rw7Ol9tjVXGfGIzgRsqaszigYSvRwzJWBRx0IEVqkXgEunSQaLiLcUpM1s/qnl4yEsMd/AeQY//twZPGA9I5mWvsMQ/oAAA0gAAABEp2ZWcy9DYAAADSAAAAEvk+UgV2WeJCw5PW9HOnBNO/vXz/r057h2ouZJca6HxZwhCYyhey4giZnpK///qw9Fy2F0qVQfQghZ+9vrnhqrIFgbyBA1uK6Hf//H8cPQucDZh0jW///+N5E1rvSnTQ3FvZVVQAVMgt1RQxgQdKxshBpxFQHYygcGK0GlonkQ60Gms6pp1xreFWitwNqRuMbZTDZWkLvT4slBscJxgk37/l/7C/83qrNz8X2sUdDNSEAgJ8Npa2SxV+vhd//1/6gsQXoeQyU87NVYUkjU72vxVYdZSCwVwGgP/iGf//c9fWnsWxgI4BJHOa7s+f//9tHuSp+8PIoWO6O+5SbAaupKrZIaGxK1jYONokEF2KQQ4M5WMWtDP/7gGTogPRtZVf7KURCAAANIAAAARHpmWXsvQvIAAA0gAAABINQVHkPAWFAOECNBHWmnVZOH7LVPGNHHJsdI2B8CEDxcyq1+aduducgQRFfiEHqoxx6iIKilC1ySIiM/PNd8NxERI0RsBqRdWMOyTyavr4+fmoFmUPQ6cWW3SL//5/H/eMLkPQ5XikGskfH1LipMiKQn4dOD9Au+CABABEgA1CgjKFGzwgAGlwKYYQQLMoZF83bCpCW6FrcEH486p8LBaxZVydFezLMF2xUcafu4t1YX14wMDm/Xv/uzbHqnZNkSTWx3JP7uxwYXc2QOUKeO2f/P/2zGzhL2WZurKqEBicKt9/f6tik6QMAYMAiFwhPxHv///8unPZztULErOu8de/9u8cjZ5xpyvytw5CJ9AECADIgRHUyyGIg0KGQJ6FDkTnQGgpEKrkwCEqT7qtBd640Z66WaApteszIL1yMx3r2tiA2msC1Qat///twZP6A9MFnWHspNPAAAA0gAAABElWVZewxC6gAADSAAAAE/E9RUTu/Y859xmLlGwQWNEcoaLQTRh0m/X///qwvRIQxI64GuhzA8Oav+oqWomJkK0DYJZJRHczjv/hnvNkVPIIDwwWqSqzev/ut4Uc93wNQoPrmIDIBFSKlmbNkQUCECYlAZtTBCsgOa3VDiwBzl6SkGZrxIebVaUz79ve2NLoA/NNKjTTdtxleYFZdm9PS16/zYt4UyD902Zzku1BQWAT0X1QQuPrx977//+3fKQjGbHNW4IDGZ/n/Z+7SbbwkJHx/NMr///9rg2Vy6WlDaPzDc9eU6yopJJMECzykNZItHHSy8wAQAAMAKkBHQAoBi0aiUZk25IG+NJVGXiYEdShjVhAaLxIlLtG+qWw/3em2xmRAPv/7cGTzgPSwZVZ7LDPCAAANIAAAARHZl13sJRDAAAA0gAAABFiKSGuWLzwY7mdpxwtH88U5kbLjas8GpoelwOiDTVMepHnDd8vCZrub/mPv+KH0cLkykwwoocCgRBSr9P+LGxMUU0gMmoUDbH3x/7MceNOw4sQhWyDsfH/KL98YeCcU4jiK4H3yACEBFBAcbaCEABOeVQmzqLloZGApVdDIK+0nDKBUjCi2ehZcODZ8II15SbSzBaRyBYqDPwfFbpnlaDsObb+Wyi41xEFxAMESpnmHOcVLKIQ13rGmEIMMIW+O1q+v5hyXIQ2upLQQiQnFR37Tc/I1IeoEg7ES7lR6f/88JjbQ9xJBx8JcGdfen0JRAOFxHHIV+5hHbUkYUR0C2urFZAMIGEYDAQre6aw4am0ULCiMF/T/+4Bk64D0iGZX+wwzYgAADSAAAAESlZdTzD0NQAAANIAAAARKKAXWbpCHVpYhaoR5Wq1ja7sQoasFpqx8mm23q6MalmPZ3s3ZgnI/mG7C+FFOXfOH7J1zdm4aOvqIKvqfpvXr36x/2vw0B2tLwskkFBcb/6/y3+OhRdRE/z////qE5aT6D0TuVcDon2lfkuGEAQ4PK60JggroQFMkd2M3shFcsK/D9pTDxRZai6ayV6PzuoCC9ydF9P+BakQwJBQLqqM/zgtZMCREZsWRZcKpYE0a647VhhpVrjhcYcZkHCuS0CKW0D4G0MmokUpYgz64aFWon9GGLESklNVCCX/f/X/8XY4hhtQfQdV8f/jZx9VBsC4mGiz+XcJ3yMeThDB0PQ8KzOBsKUIGUWZkE9lYFesLvU8WAQsdGVTIBiMURCCRL8rmShvN4xaiZNF3BnyYkUurh0cIkZg9IES7ll5uUA0wTswYejnL2f8Muv/7cGT9APSeZNX7LENCAAANIAAAARI1lV/ssRHIAAA0gAAABC9wh2p69dtSE0bUGJs6arIbjFRbfVRv//+7/2FNXKH6+x1tFH5/////lbJNzxKnbEJiESXsKz501KEBFOS1KohIN6sho5rd5lspIpmjZOISpVdeE8srcxEkBlgxftvDpssFZOWAPcOxA0UIVYUZEfEwEJby6ZDXaLHow706yuLR6nmnyXcJmhQsUbvRdAlWqHwQ4xlHbIQYIwyix7yYMsUFJEMoSsWYND88ZUVRki5aond3eq/WXVKK8yLO1AzxEm7+f7/bdS0tNyos/pY7t//mXPPuY1pvR4044XY2q3zdql8itIekWWaQs7cMQIIOzMP8qwHSiJrCDCZxjQl6RaLwiFMAoBmp9wa82sSPDYFHQYxSKqf/+3Bk9ID0dGHY+wlDygAADSAAAAETbYVf7GUnKAAANIAAAARqNJoQXEoaWKCtgmVfEiahjKijkTVBenk9ZDYUWeZnaXW7NSHYk4G5Z5BRD44sVIiJ4x7/311K9bBzECpFil6f9/9/8NYnPJsSDxI8RxNSkjDhAYQoRjVlP65TnOnoVPEMoIxx9eNdSoUgZBpoQb2XAR0gBB7wANk4YoLIhlRMSow5L5e2V6Itq03GAnbqXn9tTW+dzu7p4In7GIBm7yjDGTR1NBk1Eh+fldiaRhngtK3MSOyXqHco8GtzxmY8mgBu42ziaTkMsqzk9YbBI0zKQQ7LESv///7/jlmKmAX2lK3O0DWFwvxUitE1371X1DPECcYCAWHJZc7UYdABEJ2hh7JYBKwQKOhpr5KAm1JgwTX2BI8J//uAZOoA9KdhV3sIXPIAAA0gAAABEjmPXewlD2AAADSAAAAENRXrI2fvxBkCv3GBCjZXYepcVRCGWhOePoV8Web8Y0xkpUmrX9XdnW4euklqKossIUKvijW1JE0WSau5ER16v+06ezmblnqzKy7dpuu81/////7vs6eg2s1NnNrq9r6aPhdTqs9Vzd8smPuYh6RmbCY3MqXPAQftjAQlmw8ibIUwIhpTgLCAgg4CRpfWyYjdmhIHqY1GAVrpgfNrSsP1FquY27zEPkQcMiIEapwSI/J1M7nW4OeeW9uX485Y1Fbqd0Fe5lmL8eRk4ay7fEWhst8FtvVY33IXsrZTZcw6iNpnBPP8y+etiv3OtEPLzMro1KBK01mG6kkU+gYj8dVWKGTSBzm+Gdz/7siOIIi4W0ugEZJUSp/suY2IXItsKroCqYaONDfItUxJYZTepSh4IJ4Ix+ZLFgbOnP5t4d5vTumlrXnmUV2PIQT/+3Bk+wD0lmJXewZF2AAADSAAAAESSYlb7CVx4AAANIAAAARiDUQUTGVEHFwut+PUXlTtddUy1hYulkcYxzWa1jzokfEQ8awUsDLIEhQSCM0z38VH1x25NrkuliNf//3iMRqqrY8VfGjv9zb5PZqBwUB4REJHQT5OZArm2Y8aaAc0CktdIDLOIpkhhIyehEl0jENDkxO9BMSYtEG3lczDMi7h+6+VSvlDsJciigZi0gel1JTOz1I5JxIm40mq0qN1AHJJ5pR5pphDaU0sSh5wSSfTSv0qLq7mn5LUZxpvv/2NQ1jgyKmnL46+a4v++Lk4XptWHoitVbD5pdyRqfECcmESQ5dJvEQ26mrfJxxuuHooLy2ycbKQGTILQyn2W1qVStLRkMzCdryUaQxaYIQSIVIeCwcgqPmg//twZPMA9L1g1WsMW/gAAA0gAAABEcWRXewxDWAAADSAAAAEFbc61Ylp3GuH9n1khWY/7jAV7C2aQ+0CktyRkwQQCJ3DtGHsk1MGEqxBv3XNQKdlSPuDRo0x1sdUFh4icwoyvv1NjkQgaDBBdvrn75/uOUHJScLz/xMcP1UwfM/d988TEpIxRho0J4PqUwNmNnhB9JEhFZzWELzlln3JBRMdOdgooGlstpVdXEZYVKZ6HGgyecsgExiql1k3Ch40fMoIiJAFhMu0Qt+bhMUNo6uVM+d1GeKKnHTVnbPSe+21TGlK8HlL7ryyqjJ/fUXfcOcSLBAPGCJ139/Efq5sPVMYgSCKs3+yuPIDysdMrB8a/+0DqbJaFEMIhUI5YgEmWiYJ/fatdD44RAyRSfVGwF1SxogKMjUgFf/7gGTqgPTxYlPrBl5KAAANIAAAARFViVHsPQnAAAA0gAAABMlD9YjMoZkIcBwV3RIVPf/KXEi5lx8ltA0KHrtsg5SGknKF0V3sjF6FSLWKl5HzC245JHLeY634yEqZpUUw+J0lJkueZWlEWhpg2f//r/ekLpG1QWE7xf61TUHw/rrxGHDXW/zIuuS2kQjQ2xRkhTUpMGIlRzVlcsViROISCS1VyIFqkQhTBAhYuoqs1/WhNhZS3oLgqYaoCrj9U2TI+EBkQSYQQ5KYwgMpU1SVFSRI7mEIeaYKFzCD/Jb5tJbP9xV4lKrmYstFeoe7ip13h0Z4JFsPqMNaPiZ26QrGjqX/D+K//jnhaTgeojA1JHs0cpEVuPlmCh5G5WQdFBlNIhBJHGTS+pmUDjMqeQGiVO5qwYOM76hqcEAyFYZ3p5iL6SGMSmnk2e7KrkJF78GECzrmUUjLlPSPjpHXXNPZUQv9FnPZuhLl6ty7//twZPqA9IJhVXspRGoAAA0gAAABEWWHXewlDyAAADSAAAAEyp3u8tsifuiXnavN/m8iGOaYk+VEM3+fjra41a1se0xJp3T/HKmUJHrayJJEwfQeMWFu/pUOMcFBoeClblBpNkKlNnZBrJbX9rDgLMNNMEQQQp10yC0rrsNVWV7KlbIvLWswW+sohnsOSa6RdFmdgaBpEBpEFBMECtMVbFV2t9MyoY2cyOXmNEtae5i/rNqmyUKhGseotZ6xl9zLPETcuHpQsKzTXHwm31KkUPKHXjuhH7n/mKo43v4cPyDCBoyhsw47nkVOsWFiwhaKTxlarAQxEqka3JYqrKawE1xAtq48Ueq849Igm19AuGVSv01efthm3lVSQ8Ku/S8trUzx30MEQRi40PRBeX7idxaS3Vz0blR+cP/7cGT3APRSYVP7CUPAAAANIAAAARGxhVHsGRPgAAA0gAAABNID/zJIGwY8mKhCpHTTQ7iLp5o6rdJo5Upos5nUOGJHMs/w0/FPdDEFF+WRRG5n/48V/7ymEJYN++b+4p6NIOPrSv8chH4YJ/1vz41uC8uxlJJtGF9xYKiAXAm+IwEQVdJIGOCMoMPKUyIDSAZPB8YfHpGIKtSYvOLZiSkw2u82ctgXOwLuoyumIZNnXaEbhKai+6LmB52MRQxJC0bPyi5PQPyNhUIxDQZhWVfn+zXztG6kj+2//N8f7dYKre7xav///2dks//5hxo2Uks3Pv+n7C3IUWSmxrKmzgAdhMwpRtwHxU8heZ6na3nO5lP/cEd3Mu7nUfn2//////3AmNEmTI7olYjFTFli2Sd40UvcjklUoCj/+3Bk9YCUfWTT+wZE4gAAD/AAAAERSZVL7DEOwCCAI1QAAASil6oC3r7M6d6OhJgRBp4VEpbZItksRBqaGZmMa7KFmtpq0KHEWGMoCJzONxvjeqqqxhKzwokqxoKuUAhNJVKMxJS/88tmNS8sv/hxqqqqlVUi4f3v6rSL2ARXmm/k1zECzNv81KoAGIdqDPKAAlMK3MPWOlr935jWv/3xRgUrf/7WT293on/06//v//9/bT///Tb//6XmK5UUaQTEqgmZiZmZjfaRIgptxQ9g6QipS1SxWGue8ipHhUVY9DUMtghF9+ovbhiXUxAbATRyT0W4KgJUjqytO2oxK4ci5hIVOm1mOjM5rJVVvmFFlMzkKMRkc78NmZli0gc6GiIInUjwFW4OiANxGJrFtd0Fj3pf6dIdUbAB//uQZO8ABHdg0OsMM7IjwBmtAAAAD4lZNYwkb0jdMmX0AJTdriFQAh9LY0dRP8/qgKyMX+hjGNXRDL//RqUe/dP/2+3//Sb///r////b/0p2KFDO4ZClUKQxxgmJh5d3f76MAAnliicqm3r/KKqCpAI0BIPhxAac1s6nNelqCMCHaGjwul1/ILKGIKWGMEKWWD1mHRKVevXpV+z///s+v85GrJPnVf/wDHDKy5///2fZmOT+VL1dE2d2SyT56ojzHdFU56Hoh3a1tb9/f///+TWRUsECkVFxzicNMNsQWCgAAD4qlFDA6dtUzUf50FLTTPzpIkHQeEv/////////UTeL8oNQAAMAeZgpiP/A/////////////6EWgAAACgAAAE4sRQgG///Cof/9//9f9zX0+tLnlO+3J7NZ+1SNvT116u6/////orI5qi2FtgyAPAB9mH//6t3///////////+n/X8v9/k+vp2+pC2etFJpuR7s7J1SjlNc/pfdn3R//////toph42YwAAAfO//2KI////////////61/3X//if//twZPoAk6w5S/sGHNg4jKjZAGJMCPh7LewwZuDcsaJEAJ47///z9ef/+S1MsPm0iZ0lIwgOZBaHKyKno+h27uc85keyz6Z6t/////nzx94VyXEzB1gQW12ABSZDCTu/a34T+yyRWv+qcGz7m70NG+ygGP+OH//ll///de3V0m3kZDfa1DHRnoYuy5tcG1p2rUsyU/////9pIvKqaSSpYAABpks06WRO25oJFUDIJFWGla1UZEgmZWXZRB8RjpNzLQ5ioYrVzGfMVC////+j+vdE0b9+ren9F0eldf//7vmXT6v/6PqUMwAAAED/cWNSzwoMYV/////////////VTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVf/7IGTuA/FLAchrQgAAAAAP8AAAAQKsCSiJmAAAAAA/wAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+yBk/YXwjAJJ6wIACCRMaLAEAm4CYAUhKYAAAJ0w4oAQCmBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tAZPSBkJcAyZIAAAQ1THiQBCeeA0ALJagEQCi1L6KUAIn4VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+yBk9Y/yYV9EywkRcBbB+OQAwmIAAAH+AAAAIAAAP8AAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZN2P8AAAf4AAAAgAAA/wAAABAAAB/gAAACAAAD/AAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=";
let koVoice = null;

const COMBAT_AUDIO = {
  cigarettes: {src:"assets/wo-cigarettes-v2.mp3",volume:1.0,start:0,loop:false},
  emberImpact: {src:"assets/wo-emberImpact-v2.mp3",volume:1.0,start:0,loop:false},
  fireSuper: {src:"assets/wo-fireSuper-v3.mp3",volume:.82,start:0,loop:false},
  fireScream: {src:"assets/wo-fireScream-v2.mp3",volume:.80,start:0,end:1.25,loop:false},
  // Common electric attacks use the exact Marechal lightning clip and playback settings.
  ...Object.fromEntries(["cable","voltaic"].map(name=>[name,{src:"assets/poder-rayo.mp3",volume:1.35,start:.035,end:1.69}])),
  transformerSuper: {src:"assets/wo-transformerSuper-v1.mp3",volume:.9,start:0,loop:false},
  stormSuper: {src:"assets/wo-stormSuper-v1.mp3",volume:.92,start:0,loop:false},
  ...Object.fromEntries(["punchHit","kickHit","uppercutHit","bodyFall","meleeSwing"].map(name=>[name,{src:"assets/wo-"+name+"-v1.mp3",volume:name==="meleeSwing"?.28:.9,start:0,loop:false}])),
  ...Object.fromEntries(["beam","forklift","concrete","beamImpact","forkliftImpact","concreteImpact","hookSuper","containerSuper","concreteSuper"].map(name=>[name,{src:"assets/wo-"+name+"-v1.mp3",volume:.82,start:0,loop:false}])),
  ...Object.fromEntries(["hookSuper","containerSuper","concreteSuper"].map(name=>[name,{src:"assets/wo-"+name+"-v2.mp3",volume:.92,start:0,loop:false}])),
  ...Object.fromEntries(["punchHit","kickHit"].map(name=>[name,{src:"assets/wo-"+name+"-v2.mp3",volume:1.0,start:0,loop:false}])),
  uppercutHit: {src:"assets/wo-uppercutPunch-v1.wav",volume:1,start:0,loop:false},
  bodyFall: {src:"assets/wo-bodyThud-v2.wav",volume:1.15,start:0,loop:false},
  critical: {src: "assets/jairo-critical-v1.mp3", volume: .8, start: 0, end: .95, loop: false},
  crash: {src: "assets/jairo-crash-v1.mp3", volume: .8, start: 0, end: 1.8, loop: false},
  water: {src: "assets/paula-water-v2.mp3", volume: .85, start: 0, end: 2.5, loop: false},
  dog: {src: "assets/padrino-bark-v1.wav", volume: 1.15, start: 0, end: .58},
  whip: {src: "assets/whip-v2.wav", volume: 1.35, start: 0, end: .52},
  hockey: {src: "assets/hockey-hit.wav", volume: 1.35, start: 0, end: .8},
  boomerang: {src: "assets/boomerang.wav", volume: 1.1, start: 0, end: 1},
  // Skip measured leading silence so even a close-range jab is audible.
  general: { src: "assets/golpe-general.mp3", volume: .32, start: .18, end: .59 },
  belly: { src: "assets/panzazo-sergio.mp3", volume: .36, start: .035 },
  lightning: { src: "assets/poder-rayo.mp3", volume: 1.35, start: .035, end: 1.69 },
  meat: { src: "assets/poder-sergio-carne.mp3", volume: 1.35, start: 0 },
  flowers: { src: "assets/flores-tunki.mp3", volume: 1.35, start: .025, end: 2.42 }
};
// Each attack/projectile owns its own voice; removing one never stops another.
const combatSounds = new Set();
const EXTRA_AUDIO = {
  title: {src: "assets/title-menu-v1.mp3", usage: "title"},
  tower: {src: "assets/tournament-tower-v1.mp3", usage: "tower"},
  music: [{src: "assets/fighter-1.mp3", usage: "fight"}, {src: "assets/fighter-2.mp3", usage: "fight"}],
  selection: {src: "assets/seleccion-v2.mp3?v=20260907g", usage: "selection"}
};
const soundTails = new Set();
let musicTrack = null;
let musicElapsed = 0;
let musicSource = null;
let musicGain = null;
let musicStartedAt = 0;

let state = "title";
let playerChoice = "angel";
let opponentChoice = "primitivo";
let gameMode = "solo";
let campaign = null;
let selectionPlayer = 1;
let modeChoice = "solo";
let stageChoice = "generadores";
let match = { round: 1, playerWins: 0, cpuWins: 0, complete: false, repeat: false };
let resolvingContacts = false;
let player = null;
let cpu = null;
let fighters = [];
let projectiles = [];
let workCinematic = null;
let particles = [];
let afterimages = [];
let effects = [];
let held = { left: false, right: false, down: false, guard: false };
const held2 = { left: false, right: false, down: false, guard: false };
let roundTime = ROUND_SECONDS;
let lastTime = performance.now();
let aiClock = 0;
let screenShake = 0;
let stageTime = 0;
let muted = false;
const synthVoices = new Set();
let soundGeneration = 0;
let audioCtx = null;
let roundVoiceSource = null;
let roundVoiceStarted = false;
let accumulator = 0;
let renderAlpha = 1;
let introElapsed = 0;
let resultElapsed = 0;
let announcementTime = 0;
let hitStop = 0;
let pauseFrom = "playing";
let aiEnabled = true;
const keyHolds = new Set();
const touchHolds = new Map();
const joystickDirections = new Map();
let joystickGeometry = new WeakMap();

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function mobileInput() {
  return !!(window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0
    || document.body.classList.contains("touch-device"));
}

function syncViewport() {
  joystickGeometry = new WeakMap();
  mobileRendering = mobileInput();
  const sideways = mobileRendering && window.innerHeight > window.innerWidth;
  document.body.classList.toggle("phone-portrait", sideways);
  document.body.classList.toggle("two-touch", gameMode === "versus" && (mobileRendering || window.innerWidth <= 820));
  // Fewer canvas pixels leave mobile GPUs time for input, animation and sound.
  const density = Math.min(mobileRendering ? 1 : 2,
    Math.max(1, (canvas.clientWidth || VIEW_WIDTH) * (window.devicePixelRatio || 1) / VIEW_WIDTH));
  const width = Math.round(VIEW_WIDTH * density);
  const height = Math.round(VIEW_HEIGHT * density);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  drawingScale = width / VIEW_WIDTH;
  ctx.imageSmoothingEnabled = false;
}

async function requestMobileLandscape() {
  if (!mobileInput()) return;
  try {
    if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch (_) { /* The rotated layout also works outside fullscreen. */ }
  try { await window.screen?.orientation?.lock?.("landscape"); } catch (_) { /* CSS handles orientation-lock restrictions. */ }
  syncViewport();
}

function clearHeld() {
  keyHolds.clear();
  touchHolds.clear();
  joystickDirections.clear();
  document.querySelectorAll('.joystick').forEach(stick => {
    stick.activePointer = null;
    stick.classList.remove('active');
    document.getElementById('joystickKnob' + stick.dataset.player).style.transform = 'translate(-50%, -50%)';
  });
  Object.keys(held).forEach(key => { held[key] = false; });
  Object.keys(held2).forEach(key => { held2[key] = false; });
  document.querySelectorAll("[data-hold].active").forEach(button => button.classList.remove("active"));
}

function humanFighter(f) { return f.isPlayer || gameMode === "versus" || !!online?.active; }
function fighterInput(f) { return f === cpu ? held2 : held; }
function fighterLabel(f) { return (f === player ? "1P" : gameMode === "versus" || online?.active ? "2P" : "CPU") + " · " + stats[f.kind].name; }

function mainMenu() {
  if (online) online.leave();
  document.body.classList.remove("online-mode");
  ui.confirmBtn.disabled = false;
  stopRoundVoice(); stopAllCombatSounds();
  clearHeld();
  campaign = null; tower = null;
  document.getElementById("continuePanel").hidden=true;
  document.getElementById("woEndActions").hidden=false;
  ui.resultPanel.classList.remove("continue-mode");
  fighters = []; player = cpu = null; workCinematic = null;
  projectiles = []; particles = []; afterimages = []; effects = [];
  hitStop = screenShake = accumulator = 0;
  state = "title";
  selectMusic("title");
  ui.resultPanel.hidden = true;
  document.getElementById("winnerForm").hidden = true;
  setPauseUI(false);
  showScreen(ui.titleScreen);
  document.body.classList.remove("versus-mode");
  document.body.classList.remove("two-touch");
  ui.startBtn.focus?.();
}

function openModeSelection() {
  mainMenu();
  state = "mode";
  showScreen(ui.modeScreen);
  chooseMode(modeChoice);
  ensureAudio();
}

function chooseMode(mode) {
  modeChoice = mode === "versus" ? "versus" : "solo";
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.classList.toggle("selected", button.dataset.mode === modeChoice);
    button.setAttribute("aria-pressed", String(button.dataset.mode === modeChoice));
  });
}

function startMode(mode) {
  gameMode = mode;
  modeChoice = mode;
  selectionPlayer = 1;
  document.body.classList.toggle("versus-mode", gameMode === "versus");
  openSelection();
}

function confirmFighter() {
  if (online?.active) { online.confirm(); return; }
  if(gameMode==="solo" && campaign?.retrySelecting){retryTournament();return;}
  if (gameMode === "versus" && selectionPlayer === 1) {
    selectionPlayer = 2;
    chooseFighter(opponentChoice, false);
  } else openStageSelection();
}

function backFromFighters() {
  if (online?.active) { mainMenu(); return; }
  if(campaign?.retrySelecting){playerChoice=match.playerKind;campaign.retrySelecting=false;showCampaignContinue();return;}
  if (gameMode === "versus" && selectionPlayer === 2) { selectionPlayer = 1; chooseFighter(playerChoice, false); }
  else openModeSelection();
}

function makeFighter(kind, x, isPlayer) {
  const f = {
    kind, x, y: FLOOR, prevX: x, prevY: FLOOR, vx: 0, vy: 0, health: 100, power: 40,
    isPlayer, grounded: true, action: "idle", actionTime: 0,
    actionDuration: 0, animClock: Math.random() * 4, trailClock: 0,
    mustacheAway: false, specialSpawned: false, specialStyle: "ki",
    queuedAction: null, queueTime: 0,
    crouching: false, guarding: false, guardTime: 0, crouchTime: 0,
    aiEscapeCooldown: 0, teleportDone: false, teleportSmokeStarted: false, teleportTarget: x,
    slamLaunched: false, slamDiving: false, slamLanded: false, slamFromAir: false,
    landingSquash: 0, concreteCoat:0, concreteHold:0, concretePose:3, electricCoat:0, knockdown:null,
    attackLanded: false, invuln: 0, specialCooldown: 0,
    projectileToggle: 0, facing: x < 480 ? 1 : -1, flash: 0,
    moveSpec: null, lowAttack: false, airAttack: false, kickStyle: null, moveIntent: 0, attackSound: null,
    walkPhase: 0, combo: 0, comboTime: 0, comboDamage:0, comboName:"", guardFlash: 0,
    meleeChain:null, chainCooldown:0, attackConnected:false
  };
  const motion = fighterMotion(f);
  f.animation = { pose: POSES[kind].idle, fromPose: POSES[kind].idle, mix: 1, prevMix: 1,
    duration: .055, facing: f.facing, motion, prevMotion: { ...motion } };
  return f;
}

function showScreen(screen) {
  [ui.titleScreen, ui.modeScreen, ui.selectScreen, ui.stageScreen, ui.gameScreen, ui.rankingScreen, ui.onlineScreen, ui.towerScreen].forEach(node => {
    node.classList.toggle("active", node === screen);
  });
}

function chooseFighter(kind, playSound = true) {
  if (online?.active && online.ready) return;
  if(kind === "random") kind=roster[Math.floor(Math.random()*roster.length)];
  if (!stats[kind]) return;
  if (selectionPlayer === 2) opponentChoice = kind;
  else playerChoice = kind;
  document.getElementById("selectionPlayer").textContent = selectionPlayer + "P";
  document.getElementById("selectionPrompt").textContent = campaign?.retrySelecting ? "TE QUEDA 1 VIDA · ELIGE TU LUCHADOR" : "JUGADOR " + selectionPlayer + " · ELIGE TU LUCHADOR";
  document.querySelectorAll(".p1-arrow small").forEach(node => { node.textContent = selectionPlayer + "P"; });
  ui.selectScreen.classList.toggle("selecting-p2", selectionPlayer === 2);
  ui.confirmBtn.textContent = campaign?.retrySelecting ? "VOLVER A LA TORRE" : online?.active ? "CONFIRMAR PERSONAJE" : gameMode === "versus" && selectionPlayer === 1 ? "CONFIRMAR JUGADOR 1" : "ELEGIR ESCENARIO";
  document.querySelectorAll("[data-pick]").forEach(button => {
    button.classList.toggle("selected", button.dataset.pick === kind);
    button.setAttribute("aria-pressed", String(button.dataset.pick === kind));
  });
  document.getElementById("selectionName").textContent = stats[kind].name;
  document.getElementById("selectionMoves").textContent = fighterPowers[kind]?.profile.toUpperCase() || stats[kind].description;
  updateSelectionGuide(kind);
  document.querySelectorAll("[data-portrait]").forEach(portrait => {
    portrait.classList.toggle("selected", portrait.dataset.portrait === kind);
  });
  if (online?.active) online.choose(kind);
  if (playSound) sfx("move");
}

function openSelection() {
  stopRoundVoice();
  stopAllCombatSounds();
  state = "select";
  selectMusic("selection");
  clearHeld();
  ui.resultPanel.hidden = true;
  ui.speech.hidden = true;
  setPauseUI(false);
  showScreen(ui.selectScreen);
  chooseFighter(selectionPlayer === 2 ? opponentChoice : playerChoice, false);
  ensureAudio();
  sfx("start");
}

function chooseStage(key, playSound = true) {
  if (!stages[key]) return;
  stageChoice = key;
  document.getElementById("stagePreview").src = stages[key].src;
  document.getElementById("stageName").textContent = stages[key].name;
  document.getElementById("stageDescription").textContent = stages[key].description;
  document.querySelectorAll("[data-stage]").forEach(button => {
    button.classList.toggle("selected", button.dataset.stage === key);
    button.setAttribute("aria-pressed", String(button.dataset.stage === key));
  });
  if (playSound) sfx("move");
}

function openStageSelection() {
  state = "stage";
  selectMusic("selection");
  clearHeld();
  showScreen(ui.stageScreen);
  document.getElementById("stageFighter").textContent = stats[playerChoice].name + (gameMode === "versus" ? " VS " + stats[opponentChoice].name : " · TORNEO DE " + (roster.length-1) + ((roster.length-1)===1 ? " RIVAL" : " RIVALES"));
  chooseStage(stageChoice, false);
  ensureAudio();
}

const DIFFICULTIES = [
 {name:"NORMAL", reaction:.23, guard:.49, attack:.83, speed:.87, power:.29, tactics:.49},
 {name:"MEDIA", reaction:.19, guard:.57, attack:.88, speed:.90, power:.34, tactics:.58},
 {name:"AVANZADA", reaction:.15, guard:.65, attack:.93, speed:.93, power:.38, tactics:.67},
 {name:"DIFÍCIL", reaction:.12, guard:.73, attack:.96, speed:.96, power:.42, tactics:.75},
 {name:"EXPERTO", reaction:.09, guard:.81, attack:.99, speed:.99, power:.46, tactics:.82},
 {name:"MAESTRO", reaction:.08, guard:.84, attack:1, speed:1, power:.49, tactics:.87},
 {name:"LEYENDA", reaction:.07, guard:.86, attack:1, speed:1, power:.51, tactics:.89},
 {name:"ÉLITE", reaction:.06, guard:.88, attack:1, speed:1, power:.53, tactics:.91},
 {name:"SUPREMO", reaction:.05, guard:.90, attack:1, speed:1, power:.55, tactics:.93}
];
// Keep the first opponent intact, then increase the pressure with widening steps.
const TOURNAMENT_DIFFICULTIES=Array.from({length:6},(_,i)=>i===0?DIFFICULTIES[0]:{
  name:DIFFICULTIES[i].name,
  reaction:[.23,.18,.135,.095,.065,.04][i],
  guard:[.49,.63,.75,.85,.93,.98][i],attack:Math.min(1,.83+.07*i),
  speed:.87+.04*i+.01*i*i,
  power:.29+.07*i+.01*i*i,tactics:[.49,.62,.74,.85,.94,.99][i]
});
function difficulty() { return campaign && gameMode==="solo" ? TOURNAMENT_DIFFICULTIES[Math.min(campaign.index,5)] : DIFFICULTIES[3]; }
// Tournament presentation shares the campaign's fixed opponents and difficulty index.
const towerCanvas = document.getElementById("towerCanvas");
const towerCtx = towerCanvas.getContext("2d");
const towerArtwork = loadImage("assets/tournament-tower-v1.webp");
const towerPortraits = Object.fromEntries(Object.entries({
  angel:"assets/angel-cutout-v2.webp", primitivo:"assets/primitivo-cutout-v4.webp",
  peluche:"assets/peluche-presentation-v3.webp", tren:"assets/tren-presentation-v3.webp",
  linares:"assets/linares-portrait-v1.webp", gabriel:"assets/gabriel-portrait-v1.webp",
  fernando:"assets/fernando-portrait-v1.webp"
}).map(([kind,src])=>[kind,loadImage(src)]));
const TOWER_FLOORS = [1127,950,775,610,438,272];
const TOWER_TIMING_SCALE = 1.8; // More time to follow the camera and read the rival.
const TOWER_RIVAL_HOLD_SECONDS = 2;
let tower = null;

function towerCameraAt(t) {
  const target=TOWER_FLOORS[campaign.index];
  const wide={y:768,zoom:.29};
  const focus={y:target,zoom:1.32};
  const blend=(a,b,q)=>({y:lerp(a.y,b.y,smoothstep(q)),zoom:lerp(a.zoom,b.zoom,smoothstep(q))});
  if(tower.skip) return blend(tower.skip.from,tower.champion?wide:focus,(t-tower.skip.at)/.30);
  t /= TOWER_TIMING_SCALE;
  if(tower.champion) return blend({y:TOWER_FLOORS[5],zoom:1.32},wide,t/1.55);
  if(tower.retry)return blend({y:target,zoom:1.12},focus,(t-.20)/.90);
  if(tower.first) {
    if(t<.45)return wide;
    if(t<1.0)return blend(wide,{y:TOWER_FLOORS[5],zoom:.82},(t-.45)/.55);
    return blend({y:TOWER_FLOORS[5],zoom:.82},focus,(t-1.0)/1.70);
  }
  const from={y:TOWER_FLOORS[Math.max(0,campaign.index-1)],zoom:1.32};
  return blend(from,focus,(t-.40)/(tower.final?1.75:1.20));
}

function showTournamentTower(champion=false) {
  stopRoundVoice(); stopAllCombatSounds(); clearHeld();
  ui.resultPanel.hidden=true;
  state="tower"; accumulator=0;
  tower={elapsed:0,loadingElapsed:0,first:campaign.index===0&&!champion&&!campaign.retry,
    final:campaign.index===5&&!champion,champion,retry:!!campaign.retry,settled:false,movePlayed:false,skip:null};
  campaign.retry=false;
  // Finish the highlight fade-in, hold the rival for two seconds, then fade out.
  tower.duration=champion?3.8*TOWER_TIMING_SCALE:towerSettleAt()+.25+TOWER_RIVAL_HOLD_SECONDS+.35;
  document.getElementById("towerSkipBtn").disabled=tower.first;
  document.getElementById("towerSkipBtn").textContent=tower.first?"RECORRIENDO TORRE…":"ENTER / START / TOCAR · CONTINUAR";
  document.getElementById("towerSoundBtn").textContent=muted?"SONIDO OFF":"SONIDO ON";
  const names=campaign.opponents.map((kind,i)=>"Nivel "+(i+1)+": "+stats[kind].name+(campaign.defeated.includes(kind)?", KO":""));
  document.getElementById("towerAnnouncement").textContent=(champion?"CAMPEÓN DEL TORNEO: "+stats[playerChoice].name:
    (tower.final?"COMBATE FINAL. ":"PRÓXIMO COMBATE. ")+stats[playerChoice].name+" contra "+stats[campaign.opponents[campaign.index]].name)+". "+names.join(". ");
  showScreen(ui.towerScreen);
  selectMusic("tower");
  drawTournamentTower();
}

function skipTournamentTower() {
  if(state!=="tower" || !tower || tower.first || tower.skip)return;
  // Short smooth travel, then hold the opponent card; never jump directly into combat.
  tower.skip={at:tower.elapsed,from:towerCameraAt(tower.elapsed)};
  tower.duration=towerSettleAt()+.25+TOWER_RIVAL_HOLD_SECONDS+.35;
  document.getElementById("towerSkipBtn").disabled=true;
}

function towerSettleAt() {
  return tower.skip?tower.skip.at+.30:(tower.champion?1.55:tower.retry?1.10:tower.first?2.70:tower.final?2.15:1.60)*TOWER_TIMING_SCALE;
}

function updateTournamentTower(dt) {
  if(document.hidden || tower.paused)return;
  tower.loadingElapsed+=dt;
  const ready=towerArtwork.complete&&towerArtwork.naturalWidth&&campaign.opponents.every(kind=>towerPortraits[kind]?.complete);
  // Preloaded during menus. A failed image still has a drawn industrial fallback.
  if(!ready && tower.loadingElapsed<2)return;
  tower.elapsed+=dt;
  if(!tower.movePlayed && tower.elapsed>=.40*TOWER_TIMING_SCALE){tower.movePlayed=true;sfx("towerPan");}
  if(!tower.settled && tower.elapsed>=towerSettleAt()) {
    tower.settled=true;sfx("towerStop");sfx("confirm");
  }
  if(tower.elapsed<tower.duration)return;
  const champion=tower.champion;
  stopMusic();stopSynthSounds();tower=null;
  if(champion) {
    state="finished";showScreen(ui.gameScreen);ui.resultPanel.hidden=false;
    showGameOver();
  } else {
    startGame(playerChoice,campaign.opponents[campaign.index],true);
    ui.gameScreen.classList.add("tower-entry");
  }
}

function towerText(text,x,y,size,color="#fff1c2",align="left",maxWidth) {
  const c=towerCtx;c.save();
  c.font=size+'px "KP Display", Impact, sans-serif';c.textAlign=align;
  c.lineJoin="round";c.lineWidth=Math.max(2,size*.13);c.strokeStyle="#030916";
  c.shadowColor="rgba(0,0,0,.85)";c.shadowBlur=4;c.shadowOffsetX=2;c.shadowOffsetY=3;
  if(maxWidth)c.strokeText(text,x,y,maxWidth);else c.strokeText(text,x,y);
  c.shadowOffsetX=c.shadowOffsetY=c.shadowBlur=0;c.fillStyle=color;
  if(maxWidth)c.fillText(text,x,y,maxWidth);else c.fillText(text,x,y);
  c.restore();
}

function towerPortrait(kind,x,y,w,h) {
  const img=towerPortraits[kind];
  if(!img?.complete || !img.naturalWidth)return;
  const iw=img.naturalWidth,ih=img.naturalHeight||iw;
  // Crop the upper half of the existing presentation to keep faces readable.
  const sh=ih*.57,sw=Math.min(iw,sh*w/h);
  towerCtx.drawImage(img,(iw-sw)/2,0,sw,sh,x,y,w,h);
}

function drawTowerPanel(kind,index) {
  const c=towerCtx,y=TOWER_FLOORS[index]-55;
  const defeated=campaign.defeated.includes(kind);
  const active=!tower.champion&&index===campaign.index&&tower.settled;
  c.save();
  c.globalAlpha=defeated?.47:active?1:.70;
  c.fillStyle="#061125";c.fillRect(360,y,302,110);
  const glow=c.createLinearGradient(360,y,662,y+110);
  glow.addColorStop(0,active?"#144b79":"#102740");glow.addColorStop(1,"#030b17");
  c.fillStyle=glow;c.fillRect(362,y+2,298,106);
  towerPortrait(kind,373,y+3,127,104);
  towerText(stats[kind].name,503,y+49,26,active?"#ffe58a":"#e3ebef","left",153);
  c.fillStyle=active?"#e5ad43":"#37566b";c.fillRect(505,y+57,135,2);
  towerText(defeated?"DERROTADO":active?(tower.final?"GRAN FINAL":"PRÓXIMO RIVAL"):"EN LA TORRE",505,y+78,14,defeated?"#a3b0bd":"#80c4df","left",150);
  c.strokeStyle=active?"#ffe88b":"#716337";c.lineWidth=active?4:1;c.strokeRect(359,y-1,304,112);
  c.restore();
  if(defeated) {
    c.save();c.translate(548,y+83);c.rotate(-.12);c.fillStyle="#410e0e";c.fillRect(-26,-23,66,32);
    c.strokeStyle="#ed7762";c.lineWidth=2;c.strokeRect(-26,-23,66,32);
    towerText("KO",6,2,28,"#ffbbaa","center");c.restore();
  }
}

function drawTournamentTower() {
  if(!tower || !campaign)return;
  const c=towerCtx,t=tower.elapsed,cam=towerCameraAt(t);
  c.save();c.imageSmoothingEnabled=true;
  const backdrop=c.createLinearGradient(0,0,0,540);
  backdrop.addColorStop(0,"#101e35");backdrop.addColorStop(1,"#020610");
  c.fillStyle=backdrop;c.fillRect(0,0,960,540);
  c.save();c.beginPath();c.rect(0,0,960,540);c.clip();
  // The tower uses the entire viewport and stays centered throughout the camera path.
  c.translate(480,270);c.scale(cam.zoom,cam.zoom);c.translate(-512,-cam.y);
  if(towerArtwork.complete&&towerArtwork.naturalWidth)c.drawImage(towerArtwork,0,0,1024,1536);
  else {
    c.fillStyle="#0c1a31";c.fillRect(0,0,1024,1536);
    c.fillStyle="#b68a28";c.fillRect(328,150,20,1120);c.fillRect(677,150,20,1120);
    for(const y of TOWER_FLOORS){c.fillRect(328,y+65,370,12);c.fillRect(328,y-68,370,12);}
  }
  campaign.opponents.forEach(drawTowerPanel);
  c.restore();
  const fog=c.createLinearGradient(0,400,0,540);
  fog.addColorStop(0,"rgba(137,165,185,0)");fog.addColorStop(1,"rgba(100,126,145,.20)");
  c.fillStyle=fog;c.fillRect(0,400,960,140);
  c.fillStyle="rgba(1,5,13,.75)";c.fillRect(0,0,960,48);
  towerText("WO FIGHTERS",22,31,24,"#ffdc79");
  towerText("TORRE DEL TORNEO",480,35,33,"#fff0be","center");
  towerText(tower.champion?"CAMPEÓN":(campaign.extraLives+1)+((campaign.extraLives+1)===1?" VIDA":" VIDAS"),937,31,22,"#ffce67","right");
  if(tower.final) {
    c.globalAlpha=.08+.04*Math.sin(t*4);c.fillStyle="#ffb632";c.fillRect(0,48,960,440);c.globalAlpha=1;
  }
  const rival=campaign.opponents[campaign.index];
  const settle=smoothstep((t-towerSettleAt())/.25);
  if(settle>0) {
    c.globalAlpha=settle;
    const banner=c.createLinearGradient(120,0,840,0);
    banner.addColorStop(0,"rgba(2,5,13,0)");banner.addColorStop(.20,"rgba(2,5,13,.91)");banner.addColorStop(.80,"rgba(2,5,13,.91)");banner.addColorStop(1,"rgba(2,5,13,0)");
    c.fillStyle=banner;c.fillRect(120,417,720,87);
    c.strokeStyle="#dba83e";c.lineWidth=2;
    for(const d of [-1,1]){c.beginPath();c.moveTo(480+d*115,431);c.lineTo(480+d*255,431);c.lineTo(480+d*274,421);c.stroke();}
    towerText(tower.champion?"CAMPEÓN DEL TORNEO":tower.retry?"ÚLTIMA OPORTUNIDAD":tower.final?"GRAN FINAL":"PRÓXIMO COMBATE",480,445,22,"#ffce67","center");
    if(tower.champion)towerText(stats[playerChoice].name,480,486,40,"#fff2c6","center",590);
    else {
      towerText(stats[playerChoice].name,433,483,35,"#fff2c6","right",268);
      towerText("VS",480,480,29,"#ff7e51","center");
      towerText(stats[rival].name,527,483,35,"#fff2c6","left",268);
    }
    c.globalAlpha=1;
  }
  const fade=Math.max(0,1-(tower.duration-t)/.35);
  if(fade>0){c.fillStyle="rgba(0,0,0,"+fade+")";c.fillRect(0,0,960,540);}
  c.restore();
}

function beginGame() {
  if(gameMode!=="solo") { startGame(playerChoice); return; }
  const opponents=roster.filter(kind=>kind!==playerChoice);
  for(let i=opponents.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opponents[i],opponents[j]]=[opponents[j],opponents[i]];}
  campaign={opponents,index:0,wins:0,score:0,completed:false,defeated:[],extraLives:1,continuePending:false,retrySelecting:false};
  showTournamentTower();
}
function nextOpponent() {
  if(!campaign || !match.nextOpponent)return;
  campaign.index++;
  showTournamentTower();
}
let continueChoice=0;
function chooseContinue(choice){
  continueChoice=choice===1?1:0;
  for(const [i,id] of [[0,"continueSameBtn"],[1,"continueChangeBtn"]]){
    const button=document.getElementById(id);button.classList.toggle("selected",i===continueChoice);
    button.setAttribute("aria-pressed",String(i===continueChoice));
  }
}
function showCampaignContinue(){
  if(!campaign?.continuePending)return;
  state="continue";clearHeld();stopRoundVoice();stopAllCombatSounds();stopMusic();
  setPauseUI(false);showScreen(ui.gameScreen);ui.resultPanel.hidden=false;
  ui.resultPanel.classList.add("continue-mode");
  ui.resultKicker.textContent="TE QUEDA 1 VIDA";ui.resultTitle.textContent="VOLVÉ A LA TORRE";
  document.getElementById("continuePrompt").textContent="MISMO RIVAL: "+stats[campaign.opponents[campaign.index]].name+" · CONSERVÁS TU AVANCE Y PUNTAJE";
  document.getElementById("continueSameBtn").textContent="SEGUIR CON "+stats[match.playerKind].name;
  document.getElementById("continuePanel").hidden=false;document.getElementById("woEndActions").hidden=true;
  document.getElementById("winnerForm").hidden=true;document.getElementById("cpuResultNote").hidden=true;
  chooseContinue(0);
}
function continueTournament(change=false){
  if(state!=="continue" || !campaign?.continuePending)return;
  playerChoice=match.playerKind;
  if(change){campaign.retrySelecting=true;selectionPlayer=1;openSelection();}
  else retryTournament();
}
function retryTournament(){
  if(!campaign?.continuePending || campaign.extraLives<1)return;
  campaign.extraLives--;campaign.continuePending=false;campaign.retrySelecting=false;campaign.retry=true;
  document.getElementById("continuePanel").hidden=true;document.getElementById("woEndActions").hidden=false;
  ui.resultPanel.classList.remove("continue-mode");
  showTournamentTower();
}
function startGame(choice, opponentKind = null, keepCampaign = false) {
  if(!keepCampaign)campaign=null;
  accumulator = 0;
  playerChoice = choice;
  const opponents = roster.filter(kind => kind !== choice);
  match = { round: 1, playerWins: 0, cpuWins: 0, complete: false, repeat: false, scores: [keepCampaign ? campaign.score : 0, 0], campaignRun: keepCampaign, winner: null, saved: false, saving: false,
    id: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    playerKind: choice, cpuKind: gameMode === "versus" || online?.active ? (stats[opponentKind] ? opponentKind : opponentChoice) : keepCampaign && stats[opponentKind] ? opponentKind : opponents.includes(opponentKind) ? opponentKind : opponents[Math.floor(Math.random() * opponents.length)] };
  selectMusic();
  startRound();
}

function startRound() {
  ui.gameScreen.classList.remove("tower-entry");
  ui.resultPanel.classList.remove("continue-mode");
  document.getElementById("continuePanel").hidden=true;document.getElementById("woEndActions").hidden=false;
  workCinematic = null;
  stopRoundVoice();
  stopAllCombatSounds();
  roundVoiceStarted = false;
  player = makeFighter(match.playerKind, 235, true);
  cpu = makeFighter(match.cpuKind, 725, false);
  fighters = [player, cpu];
  projectiles = [];
  particles = [];
  afterimages = [];
  effects = [];
  clearHeld();
  roundTime = ROUND_SECONDS;
  aiClock = 0;
  cameraX = 0;
  screenShake = 0;
  stageTime = 0;
  introElapsed = 0;
  resultElapsed = 0;
  hitStop = 0;
  state = "intro";
  showScreen(ui.gameScreen);
  syncViewport();
  prepareFightRendering();
  setPauseUI(false);
  ui.resultPanel.hidden = true;
  document.getElementById("roundNotice").hidden = true;
  ui.leftName.textContent = stats[player.kind].name;
  ui.rightName.textContent = stats[cpu.kind].name;
  document.getElementById("rightRole").textContent = gameMode === "versus" || online?.active ? "2P" : "CPU";
  document.getElementById("touchControls2").hidden = gameMode !== "versus";
  document.body.classList.toggle("versus-mode", gameMode === "versus");
  const ability2 = stats[cpu.kind].ability;
  document.getElementById("abilityBtn2").hidden = ability2 !== "slam";
  document.getElementById("abilityLabel2").textContent = ability2 === "slam" ? "APLASTAR" : "HUMO";
  document.getElementById("abilityIcon2").textContent = ability2 === "slam" ? "▼" : "☁";
  document.getElementById("abilityBtn2").setAttribute("aria-label", ability2 === "slam" ? "Salto aplastante del Jugador 2" : "Humo del Jugador 2");
  document.getElementById("winnerForm").hidden = true;
  document.getElementById("cpuResultNote").hidden = true;
  for(const [slot,f] of [[1,player],[2,cpu]]){
    const evadeName=["blotta","galante"].includes(f.kind)?"HUMO":f.kind==="tren"?"RAYOS":"RODAR";
    document.getElementById("evadeLabel"+slot).textContent=evadeName;
    document.getElementById("evadeBtn"+slot).setAttribute("aria-label",(f.kind==="tren"?"Desaparecer con rayos y avanzar":evadeName==="HUMO"?"Humo":"Rodar")+" sin gastar energía, Jugador "+slot);
  }
  const ability = stats[player.kind].ability;
  ui.abilityBtn.hidden = ability !== "slam";
  document.getElementById("abilityHelp").hidden = !ability;
  document.getElementById("abilityLabel").textContent = ability === "slam" ? "APLASTAR" : "HUMO";
  document.getElementById("abilityKeyLabel").textContent = ability === "slam" ? "APLASTAR" : "HUMO";
  document.getElementById("abilityIcon").textContent = ability === "slam" ? "▼" : "☁";
  ui.abilityBtn.setAttribute("aria-label", ability === "slam" ? "Salto aplastante" : "Desaparecer con humo");
  document.querySelector(".desktop-help").setAttribute("aria-hidden", "false");
  canvas.setAttribute("aria-label", "Combate: " + stats[player.kind].name + " contra " + stats[cpu.kind].name);
  updateHud();
  beginIntro();
  ensureAudio();
  syncMusic();
  sfx("start");
  if (online?.active) configureOnlineControls();
}

function beginIntro() {
  introElapsed = 0;
  ui.speech.hidden = true;
  positionSpeech();
  ui.announcement.classList.remove("show");
  announcementTime = 0;
}

function announce(text, duration = 0) {
  ui.announcement.textContent = text;
  ui.announcement.classList.toggle("show", !!text);
  announcementTime = duration / 1000;
}

function positionSpeech() {
  const blotta = fighters.find(f => f.kind === "blotta");
  if (!blotta) return;
  ui.speech.style.left = ((blotta.x-cameraX) / VIEW_WIDTH * 100) + "%";
  ui.speech.style.top = "36%";
}

function update(dt) {
  if (online?.guest && online.started) { updateOnlineGuest(dt); return; }
  if (["title", "mode", "select", "stage", "tower", "intro", "playing", "roundOver"].includes(state)) advanceMusic(dt);
  if (state === "tower") { updateTournamentTower(dt); return; }
  if (!["intro", "playing", "roundOver", "finished"].includes(state)) return;
  fighters.forEach(f => {
    f.prevX = f.x; f.prevY = f.y;
    if(f.fernandoBurn>0)f.fernandoBurn=Math.max(0,f.fernandoBurn-dt);
    f.animation.prevMotion = { ...f.animation.motion };
    f.animation.prevMix = f.animation.mix;
  });
  projectiles.forEach(p => { p.prevX = p.x; p.prevY = p.y; p.prevSpin = p.spin; });
  particles.forEach(p => { p.prevX = p.x; p.prevY = p.y; });
  stageTime += dt;
  if (announcementTime > 0) {
    announcementTime -= dt;
    if (announcementTime <= 0) ui.announcement.classList.remove("show");
  }
  if (state === "intro") {
    const timing = ROUND_AUDIO[match.round].timing;
    const before = introElapsed;
    introElapsed += dt;
    fighters.forEach(f => { f.animClock += dt; updateAnimation(f, dt); });
    if (before < timing.title && introElapsed >= timing.title) {
      ui.speech.hidden = true;
      announce(ROUND_AUDIO[match.round].title, (timing.fight - timing.title - .15) * 1000);
    }
    syncRoundVoice();
    if (before < timing.fight && introElapsed >= timing.fight) {
      announce("¡PELEA!", 600);
      if (!roundVoiceStarted) sfx("fight");
    }
    if (introElapsed >= timing.end) { stopRoundVoice(); state = "playing"; syncMusic(); }
    return;
  }
  if (state === "finished" || state === "roundOver") {
    advanceCombatSounds(dt);
    resultElapsed += dt;
    if(koVoice){
      // Allow a short decode/resume delay without consuming the spoken announcement.
      if(!koVoice.started && !muted && koVoice.waited < 1){
        koVoice.waited+=dt; announcementTime=KO_AUDIO.duration;
        ui.announcement.classList.add("show");
      }else koVoice.elapsed+=dt;
      if(koVoice.elapsed>=KO_AUDIO.duration)stopKOAudio();else syncKOAudio();
    }
    updateCamera(dt);
    updateParticles(dt);
    updateAfterimages(dt);
    updateEffects(dt);
    screenShake = Math.max(0, screenShake - dt * 32);
    fighters.forEach(f => {
      f.actionTime = Math.max(0, f.actionTime - dt);
      f.flash = Math.max(0, f.flash - dt);
      if (f.knockdown) updateKnockdown(f, dt);
      else if (!f.grounded) integrateBody(f, dt);
      updateAnimation(f, dt);
    });
    if (state === "finished" && resultElapsed >= .8) ui.resultPanel.hidden = false;
    if (state === "finished" && match.nextOpponent && resultElapsed >= 2.65) { nextOpponent(); return; }
    if(state==="finished" && campaign?.continuePending && resultElapsed>=2.2){showCampaignContinue();return;}
    if (state === "finished" && campaign?.completed && !match.towerShown && resultElapsed >= 2.65) {
      match.towerShown=true;showTournamentTower(true);return;
    }
    if (state === "finished" && !match.nextOpponent && (!campaign?.completed || match.towerShown) && resultElapsed >= 2.2 && !match.endShown) showGameOver();
    if (state === "finished" && resultElapsed >= 3.8 && match.winner === 1 && gameMode === "solo" && !match.campaignRun) showRanking();
    if (state === "roundOver" && resultElapsed >= .8) document.getElementById("roundNotice").hidden = false;
    if (state === "roundOver" && resultElapsed >= 2.65) {
      match.round = match.playerWins + match.cpuWins + 1;
      startRound();
    }
    return;
  }
  if (workCinematic) { updateWorkCinematic(dt); return; }
  if (hitStop > 0) {
    suspendCombatSounds(false);
    hitStop = Math.max(0, hitStop - dt);
    return;
  }

  advanceCombatSounds(dt);

  roundTime = Math.max(0, roundTime - dt);
  if (roundTime <= 0) {
    finishRound(player.health === cpu.health ? null : player.health > cpu.health ? player : cpu, "TIEMPO");
    return;
  }
  fighters.forEach(f => {
    for (const name of ["invuln", "aiEscapeCooldown", "specialCooldown", "flash", "landingSquash", "guardTime", "crouchTime", "queueTime", "comboTime", "guardFlash", "concreteCoat", "electricCoat", "chainCooldown"]) {
      f[name] = Math.max(0, f[name] - dt);
    }
    if (!f.queueTime) f.queuedAction = null;
    if (!f.comboTime) {f.combo = 0;f.comboDamage=0;f.comboName="";}
    tickConcreteHold(f,dt);
    f.animClock += dt;
    f.power = Math.min(100, f.power + dt * 3.2 * ENERGY_GAIN_SCALE);
    // Freeze attack direction through active/recovery frames.
    const other = f === player ? cpu : player;
    if (f.action === "idle" || f.action === "block") f.facing = other.x >= f.x ? 1 : -1;
  });
  updatePlayer(dt);
  if (gameMode === "versus" || online?.active) updateHuman(cpu, held2);
  else if (aiEnabled) updateAI(dt);
  // A CPU super can start during updateAI: suspend regular attacks immediately.
  if (workCinematic) { updateWorkCinematic(dt); return; }
  fighters.forEach(f => updateFighter(f, dt));
  separateFighters();
  updateCamera(dt);
  // Capture both contacts before resolving so simultaneous hits can trade.
  const contacts = fighters.map(f => attackContact(f, f === player ? cpu : player)).filter(Boolean);
  resolvingContacts = true;
  contacts.forEach(contact => {
    contact.attacker.attackLanded = true;
    stopFighterSound(contact.attacker);
    hit(contact.target, contact.damage, contact.direction * contact.knock, contact.lift, contact.attacker, contact);
  });
  resolvingContacts = false;
  if (player.health <= 0 || cpu.health <= 0) {
    finishRound(player.health <= 0 && cpu.health <= 0 ? null : player.health > 0 ? player : cpu, "K.O.");
  }
  if (state === "playing") updateProjectiles(dt);
  fighters.forEach(f => updateAnimation(f, dt));
  updateParticles(dt);
  updateAfterimages(dt);
  updateEffects(dt);
  screenShake = Math.max(0, screenShake - dt * 32);
}

function setStance(f, down, guard) {
  const available = !f.concreteHold && f.grounded && (f.action === "idle" || f.action === "block");
  f.crouching = available && down;
  f.guarding = available && guard;
}

function updatePlayer() {
  if (!player) return;
  updateHuman(player, held);
}

function updateHuman(f, input) {
  if(f.concreteHold>0){f.moveIntent=0;f.crouching=f.guarding=false;return;}
  setStance(f, input.down, input.guard);
  f.moveIntent = Number(input.right) - Number(input.left);
}

function updateAI(dt) {
  const dx = player.x - cpu.x;
  const distance = Math.abs(dx);
  const toward = Math.sign(dx) || 1;
  setStance(cpu, cpu.crouchTime > 0, cpu.guardTime > 0);
  if(updateAICombo(cpu,dt))return;
  if (isLocked(cpu) && cpu.action!=="block") return;
  aiClock -= dt;
  if (aiClock > 0) return;
  const level=difficulty();
  aiClock = level.reaction + Math.random() * level.reaction * .65;
  const cornered=(cpu.x < FIGHTER_LEFT+125 && player.x>cpu.x) ||
    (cpu.x > FIGHTER_RIGHT-125 && player.x<cpu.x);
  if(cornered && distance<155 && cpu.grounded && cpu.aiEscapeCooldown===0 &&
      Math.random()<.65+level.tactics*.3){
    if(evade(cpu)){
      cpu.guardTime=cpu.crouchTime=0;
      cpu.aiEscapeCooldown=2.4;
      return;
    }
  }
  if (isLocked(cpu)) return;
  if (Math.random() > level.attack) { cpu.moveIntent=0; return; }
  if (cpu.guarding || cpu.crouching) { cpu.moveIntent = 0; return; }
  const incoming = projectiles.some(p => p.owner === player && Math.abs(p.x - cpu.x) < 220 && (cpu.x - p.x) * p.vx > 0);
  const threatened = distance < 140 && ["punch", "uppercut", "kick"].includes(player.action);
  if (!player.grounded && cpu.grounded && distance < 105 && player.y > FLOOR - 185 && Math.random() < level.tactics * .65) {
    cpu.crouchTime = .45;
    setStance(cpu, true, false);
    attack(cpu, "punch");
    return;
  }
  if ((incoming || threatened) && cpu.grounded && Math.random() < level.guard) {
    cpu.guardTime = .26 + Math.random() * .22;
    cpu.crouchTime = player.lowAttack ? cpu.guardTime : 0;
    setStance(cpu, cpu.crouchTime > 0, true);
    cpu.moveIntent = 0;
    return;
  }
  if (cpu.kind === "blotta" && distance < 260 && Math.random() < level.tactics * .18) {
    attack(cpu, "teleport");
    return;
  }
  if (cpu.kind === "tunki" && cpu.power >= 30 && cpu.specialCooldown === 0 && distance < 220 && cpu.grounded && Math.random() < level.tactics * .3) {
    attack(cpu, "slam");
    return;
  }
  if (distance > 120 * FIGHTER_SCALE) {
    cpu.moveIntent = toward;
    if (distance > 235 && cpu.power >= 30 && cpu.specialCooldown === 0 && Math.random() < level.power) attack(cpu, "special");
    else if (distance < 215 && cpu.grounded && Math.random() < level.tactics * .2) jump(cpu);
    return;
  }
  cpu.moveIntent = distance < 62 * FIGHTER_SCALE && Math.random() < .2 ? -toward : 0;
  // Choose a low attack against a standing guard, but still allow reaction mistakes.
  if (player.guarding && !player.crouching && cpu.grounded && Math.random() < level.tactics) {
    cpu.crouchTime = .42;
    setStance(cpu, true, false);
    attack(cpu, "kick");
    return;
  }
  const roll = Math.random();
  const punchReach = (MOVES.punch.reach + stats[player.kind].width) * FIGHTER_SCALE - 4;
  if (roll < .37) attack(cpu, distance <= punchReach ? "punch" : "kick");
  else if (roll < .73) attack(cpu, "kick");
  else if (roll < .86 && cpu.grounded) {
    cpu.crouchTime = .42;
    setStance(cpu, true, false);
    attack(cpu, "kick");
  } else if (roll < .92) jump(cpu);
  else cpu.guardTime = .35;
}

function integrateBody(f, dt) {
  const wasOnFloor = f.grounded;
  if (!f.grounded) f.vy += 1650 * (f.action === "slam" || f.knockdown ? 1 : mobilityTempo(f) ** 2) * dt;
  const other=f===player?cpu:player;
  f.x = Math.max(FIGHTER_LEFT, other.x-MAX_FIGHTER_DISTANCE,
    Math.min(FIGHTER_RIGHT, other.x+MAX_FIGHTER_DISTANCE, f.x + f.vx * dt));
  f.y += f.vy * dt;
  if (f.y >= FLOOR) {
    f.y = FLOOR;
    f.vy = 0;
    f.grounded = true;
    if (!wasOnFloor) {
      if (f.knockdown?.phase === "air") {
        f.knockdown.phase = "down"; f.knockdown.phaseTime = 0;
        f.vx = 0; screenShake = Math.max(screenShake, 5);
        dustBurst(f.x, FLOOR, 18);
        debrisBurst(f.x, FLOOR, 12);
        addEffect("crack", f.x, FLOOR + 1, "#342a20", 78, .55);
        addEffect("ground", f.x, FLOOR + 2, "#dfbe87", 85, .38);
        if (["playing", "roundOver", "finished"].includes(state)) startCombatSound("bodyFall");
      }
      if(f.action==="kick" && f.kickStyle==="airKick"){
        stopFighterSound(f);f.action="idle";f.actionTime=f.actionDuration=0;f.moveSpec=null;f.kickStyle=null;f.airAttack=false;
      }
      f.landingSquash = .12;
      dustBurst(f.x, FLOOR, 7);
      addEffect("ground", f.x, FLOOR + 2, "#e4c38a", 44, .28);
      if (f.action === "slam") {
        f.slamLanded = true;
        f.actionTime = f.actionDuration = MOVES.slam.recovery / mobilityTempo(f);
        f.vx *= .15;
        f.landingSquash = .22;
        screenShake = 7;
        dustBurst(f.x, FLOOR, 24);
        burst(f.x, FLOOR - 12, "#ff77bc", 15);
        addEffect("ground", f.x, FLOOR, "#ff82cf", 130, .48);
        addEffect("impact", f.x, FLOOR - 12, "#ffb6e1", 75, .3);
        sfx("slam");
      }
    }
  } else f.grounded = false;
}

// Uppercuts keep the victim in hit reaction until the entire fall/get-up finishes.
function beginKnockdown(f, knockX) {
  const direction = Math.sign(knockX) || -f.facing;
  f.knockdown = {direction, phase:"air", age:0, phaseTime:0};
  f.vx = direction * 300; f.vy = -690; f.grounded = false;
  f.moveSpec = null; f.kickStyle = null; f.airAttack = false;
  f.action = "hit"; f.actionTime = f.actionDuration = 2;
}

function updateKnockdown(f, dt) {
  const fall = f.knockdown;
  fall.age += dt; fall.phaseTime += dt;
  f.action = "hit"; f.actionTime = 2;
  f.invuln = Math.max(f.invuln, .04);
  f.queuedAction = null; f.queueTime = 0; f.moveIntent = 0;
  if (fall.phase === "air") integrateBody(f, dt);
  else if (state === "playing" && f.health > 0) {
    if (fall.phase === "down" && fall.phaseTime >= .40) {
      fall.phase = "rise"; fall.phaseTime = 0;
    } else if (fall.phase === "rise" && fall.phaseTime >= .28) {
      f.knockdown = null; f.action = "idle";
      f.actionTime = f.actionDuration = 0; f.vx = f.vy = 0;
      f.invuln = .12;
    }
  }
}

function updateFighter(f, dt) {
  if(f.concreteHold>0){
    f.vx=0;f.moveIntent=0;f.knockdown=null;f.action="hit";f.actionTime=f.concreteHold;
    f.queuedAction=null;f.queueTime=0;f.crouching=f.guarding=false;
    if(!f.grounded){f.vy=Math.max(0,f.vy);integrateBody(f,dt);}
    return;
  }
  if (f.knockdown) { updateKnockdown(f, dt); return; }
  const other = f === player ? cpu : player;
  if (f.action === "idle") {
    const speed = stats[f.kind].speed * (humanFighter(f) ? 1 : difficulty().speed);
    const desired = f.crouching || f.guarding ? 0 : f.moveIntent * speed;
    const acceleration = f.grounded ? (desired ? 29 : 36) : 3.5;
    f.vx += (desired - f.vx) * (1 - Math.exp(-acceleration * dt));
  } else if (f.grounded) {
    f.vx *= Math.exp(-7 * dt);
  }
  if (f.action === "roll") {
    const elapsed=f.actionDuration-f.actionTime;
    f.vx=elapsed < .36 / mobilityTempo(f) ? f.rollDirection*580*mobilityTempo(f) : 0;
    if(elapsed < .34 / mobilityTempo(f)) f.invuln=Math.max(f.invuln,.02);
    if(f.kind!=="tren" && Math.floor(elapsed*30)!==Math.floor((elapsed+dt)*30))dustBurst(f.x,FLOOR,2);
  }
  if (f.action === "teleport") f.vx = f.vy = 0;
  if (f.action === "slam" && !f.slamLanded) {
    const elapsed = f.actionDuration - f.actionTime;
    if (!f.slamLaunched && elapsed >= MOVES.slam.startup) {
      f.slamLaunched = true;
      f.grounded = false;
      f.vy = f.slamFromAir ? 180 : -800;
      f.vx = Math.max(-320, Math.min(320, (other.x - f.x) * 2.6));
      dustBurst(f.x, f.y, 8);
    }
    if (f.slamLaunched && f.vy >= 0 && !f.slamDiving) {
      f.slamDiving = true;
      f.vy = 850;
      f.vx *= .35;
    }
  }
  integrateBody(f, dt);
  // A full stride follows distance travelled; backsteps play the cycle in reverse.
  if (f.grounded && f.action === "idle" && !f.crouching && !f.guarding) {
    const previousStep = Math.floor(f.walkPhase);
    f.walkPhase = ((f.walkPhase + f.vx * f.facing * dt / 35) % 4 + 4) % 4;
    if (Math.abs(f.vx) > 90 && Math.floor(f.walkPhase) !== previousStep) dustBurst(f.x - Math.sign(f.vx) * 15, FLOOR, 2);
  }

  if (f.actionTime > 0) {
    f.actionTime = Math.max(0, f.actionTime - dt);
    const elapsed = f.actionDuration - f.actionTime;
    if (f.kind === "tren" && f.action === "roll" && !f.trenEvadeArrived && elapsed >= .36 / mobilityTempo(f)) {
      f.trenEvadeArrived = true;
      burst(f.x, f.y - 105, "#b1f3ff", 13);
      addEffect("ring", f.x, f.y - 105, "#d8fbff", 42, .22);
      sfx("electricEvadeLand");
    }
    if (f.action === "special" && elapsed >= f.moveSpec.startup && !f.specialSpawned) {
      f.specialSpawned = true;
      spawnProjectile(f, f.specialStyle);
    }
    if (f.action === "teleport") {
      if (elapsed >= .10 / mobilityTempo(f) && !f.teleportSmokeStarted) {
        f.teleportSmokeStarted = true;
        smokeBurst(f.x, FLOOR - 70, 20);
        addEffect("ring", f.x, FLOOR - 80, "#b9a8ff", 60, .32);
      }
      if (elapsed >= .31 / mobilityTempo(f) && !f.teleportDone) {
        f.teleportDone = true;
        const direction = f.teleportDirection;
        let destination = direction ? f.x + direction * 235 : other.x + (f.x < other.x ? 110 : -110);
        destination = Math.max(STAGE_LEFT+65, Math.min(STAGE_RIGHT-65, destination));
        if (Math.abs(destination - other.x) < 68) destination = other.x < (STAGE_LEFT+STAGE_RIGHT)/2 ? other.x + 110 : other.x - 110;
        f.x = f.prevX = Math.max(STAGE_LEFT+65, Math.min(STAGE_RIGHT-65, destination));
        f.facing = other.x >= f.x ? 1 : -1;
        smokeBurst(f.x, FLOOR - 70, 22);
        addEffect("ring", f.x, FLOOR - 80, "#cddcff", 70, .32);
      }
    }
    if (f.actionTime === 0) {
      stopFighterSound(f);
      if(f.action==="roll"){f.vx=0;f.animation.motion.rotation=0;f.animation.motion.dx=0;f.animation.motion.dy=0;f.animation.prevMotion={...f.animation.motion};}
      f.action = "idle";
      f.actionDuration = 0;
      f.moveSpec = null;
      f.lowAttack = f.airAttack = false;
      f.kickStyle = null;
      setStance(f, humanFighter(f) ? fighterInput(f).down : f.crouchTime > 0, humanFighter(f) ? fighterInput(f).guard : f.guardTime > 0);
    }
  }
  advanceMeleeChain(f,dt);
  if (f.queuedAction && f.queueTime > 0) {
    // A connected punch can cancel into a kick or special; other inputs wait for recovery.
    const canCancel = f.action === "punch" && (MELEE_COMBOS[f.kind]?f.attackConnected:f.attackLanded)
      && (MELEE_COMBOS[f.kind]?f.queuedAction==="special":["kick","special"].includes(f.queuedAction));
    if (!isLocked(f) || canCancel) {
      const queued = f.queuedAction;
      if (queued !== "jump" || f.grounded) {
        f.queuedAction = null;
        f.queueTime = 0;
        if (canCancel) { stopFighterSound(f); f.action = "idle"; f.actionTime = 0; }
        if (queued === "jump") jump(f);
        else attack(f, queued);
      }
    }
  }
  const progress = actionProgress(f);
  if ((f.action === "slam" && f.slamDiving && !f.slamLanded) || (f.action === "uppercut" && progress > .18 && progress < .6) || (f.action === "kick" && progress > .2 && progress < .72) || (f.action === "special" && progress > .3 && progress < .65)) {
    f.trailClock -= dt;
    if (f.trailClock <= 0) { addAfterimage(f); f.trailClock = .06; }
  } else f.trailClock = 0;
}

function hurtBox(f) {
  const low = f.crouching || f.lowAttack;
  const rise = f.action === "uppercut" ? uppercutRise(f) : 0;
  const height = (f.action === "uppercut" ? lerp(124, stats[f.kind].height, rise) : low ? 124 : stats[f.kind].height) * FIGHTER_SCALE;
  const width = stats[f.kind].width * FIGHTER_SCALE;
  return { left: f.x - width, right: f.x + width, top: f.y - height, bottom: f.y - 4 };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isVanished(f) {
  if (f.kind === "tren" && f.action === "roll") {
    const elapsed = f.actionDuration - f.actionTime;
    return elapsed >= .08 / mobilityTempo(f) && elapsed < .34 / mobilityTempo(f);
  }
  if (f.action !== "teleport") return false;
  const elapsed = f.actionDuration - f.actionTime;
  return elapsed >= .16 / mobilityTempo(f) && elapsed < .45 / mobilityTempo(f);
}

function attackContact(f, target) {
  if (f.action === "slam") return slamContact(f, target);
  if (f.attackLanded || !["punch", "uppercut", "kick"].includes(f.action) || isVanished(target) || target.invuln > 0) return null;
  const spec = f.moveSpec;
  const elapsed = f.actionDuration - f.actionTime;
  if (elapsed < spec.startup || elapsed > spec.startup + spec.active) return null;
  const front = f.x + f.facing * spec.reach * FIGHTER_SCALE;
  const low = f.lowAttack;
  const rising = f.action === "uppercut";
  const diagonal=f.action==="kick" && f.kickStyle==="airKick";
  const centerY = diagonal ? f.y-105*FIGHTER_SCALE+Math.min(spec.reach*FIGHTER_SCALE,Math.max(0,(target.x-f.x)*f.facing))*.85 : f.y - (rising ? lerp(93, 218, smoothstep((elapsed - spec.startup) / spec.active)) : low ? 34 : (f.action === "punch" ? (f.kind === "sergio" ? 88 : 145) : 120)) * FIGHTER_SCALE;
  const thickness = (rising ? 25 : f.action === "punch" ? 14 : 20) * FIGHTER_SCALE;
  const box = { left: Math.min(f.x, front), right: Math.max(f.x, front), top: centerY - thickness, bottom: centerY + thickness };
  if (!overlaps(box, hurtBox(target))) return null;
  return {
    attacker: f, target, damage: (spec.damage + (f.kind === "sergio" && f.action === "punch" ? 2 : 0)) * stats[f.kind].normalDamage / 10,
    knock: spec.knock, lift: rising ? spec.lift : diagonal ? 0 : f.airAttack ? -120 : 0, direction: f.facing, low, overhead: diagonal,
    sourceX: f.x, projectile: false, attackType:f.action, knockdown:rising,
    chainStep:spec.chainStep||1, chainFinisher:spec.chainFinisher||false, chainName:spec.chainName||"",
    x: (front + target.x) / 2, y: centerY
  };
}

function slamContact(f, target) {
  if (f.attackLanded || !f.slamDiving || isVanished(target) || target.invuln > 0) return null;
  if (f.slamLanded && f.actionTime < .24 / mobilityTempo(f)) return null;
  const radius = (f.slamLanded ? 100 : 49) * FIGHTER_SCALE;
  const box = { left: f.x - radius, right: f.x + radius, top: f.y - 65 * FIGHTER_SCALE, bottom: f.y + 5 };
  if (!overlaps(box, hurtBox(target))) return null;
  const direction = Math.sign(target.x - f.x) || f.facing;
  return { attacker: f, target, damage: powerDamage(f) * 1.4, knock: MOVES.slam.knock, lift: -180,
    direction, sourceX: f.x, low: false, overhead: true, projectile: false, x: target.x, y: Math.min(f.y, target.y - 80) };
}

function separateFighters() {
  if (fighters.some(f=>isVanished(f)||f.action==="roll")) return;
  if (!overlaps(hurtBox(player), hurtBox(cpu))) return;
  const dx = cpu.x - player.x;
  const spacing = (stats[player.kind].width + stats[cpu.kind].width) * FIGHTER_SCALE + 2;
  const overlap = spacing - Math.abs(dx);
  if (overlap <= 0) return;
  const sign = Math.sign(dx) || 1;
  player.x = Math.max(FIGHTER_LEFT, Math.min(FIGHTER_RIGHT, player.x - sign * overlap / 2));
  cpu.x = Math.max(FIGHTER_LEFT, Math.min(FIGHTER_RIGHT, cpu.x + sign * overlap / 2));
  // Transfer the unfulfilled push when a fighter is already against the stage edge.
  if (Math.abs(cpu.x - player.x) < spacing) {
    if (player.x === FIGHTER_LEFT || player.x === FIGHTER_RIGHT) cpu.x = player.x + sign * spacing;
    else player.x = cpu.x - sign * spacing;
  }
}

function queueAction(f, type) {
  f.queuedAction = type;
  f.queueTime = .18;
}

function resetMeleeChain(f) { if(f)f.meleeChain=null; }
function comboStarterHop(f) {
  return f.meleeChain?.step===1&&f.meleeChain.tokens[0]==="K"&&f.action==="kick"
    &&f.kickStyle===null&&f.y>=FLOOR-48;
}
function meleeToken(f,type) {
  if(!["punch","kick"].includes(type)||(!f.grounded&&!comboStarterHop(f)))return null;
  const input=humanFighter(f)?fighterInput(f):null;
  const down=input?input.down:f.crouching;
  const direction=input?Number(input.right)-Number(input.left):f.moveIntent;
  return type==="punch" ? down?"U":"P" : down?"D":direction*f.facing<0?"B":"K";
}
function comboChance() {
  return campaign&&gameMode==="solo" ? [0,.12,.22,.36,.48,.62][Math.min(campaign.index,5)] : .30;
}
function startMeleeChain(f,token) {
  if(f.chainCooldown>0||!MELEE_COMBOS[f.kind]||!f.grounded)return;
  const candidates=MELEE_COMBOS[f.kind].flatMap((route,i)=>route.tokens[0]===token?[i]:[]);
  if(!candidates.length)return;
  f.meleeChain={tokens:[token],pending:[],candidates,step:1,age:0,lastPress:0,aiRoute:null,aiWait:0};
  if(!humanFighter(f)&&Math.random()<comboChance()){
    f.meleeChain.aiRoute=candidates[Math.floor(Math.random()*candidates.length)];
  }
}
function bufferMeleeToken(f,token,type) {
  const chain=f.meleeChain;
  if(!chain||chain.age>2.4||(!f.grounded&&!comboStarterHop(f))||!token)return false;
  const candidates=chain.candidates.filter(i=>MELEE_COMBOS[f.kind][i].tokens[chain.tokens.length]===token);
  if(!candidates.length)return false;
  chain.tokens.push(token);chain.pending.push(token);chain.candidates=candidates;chain.lastPress=chain.age;
  // A deliberately buffered string brings the opening hop down sooner.
  // Unbuffered standing kicks and real aerial kicks retain their original arc.
  if(comboStarterHop(f)){f.vy=Math.max(f.vy,-80);f.airAttack=false;}
  // Preserve the ordinary short buffer as a fallback if this opening misses.
  if(humanFighter(f))queueAction(f,type);
  return true;
}
function advanceMeleeChain(f,dt) {
  const chain=f.meleeChain;
  if(!chain)return;
  chain.age+=dt;
  const target=f===player?cpu:player;
  if(humanFighter(f)&&fighterInput(f).guard){
    resetMeleeChain(f);f.queuedAction=null;f.queueTime=0;return;
  }
  if(chain.age>2.4||(!f.grounded&&!comboStarterHop(f))||f.concreteHold>0||f.knockdown||["hit","block","roll","special","teleport"].includes(f.action)){
    resetMeleeChain(f);return;
  }
  const elapsed=f.actionDuration-f.actionTime, move=f.moveSpec;
  if((f.attackLanded&&!f.attackConnected)||(!f.attackLanded&&move&&elapsed>move.startup+move.active)){
    resetMeleeChain(f);return;
  }
  if(!f.attackConnected)return;
  if(target.health<=0||target.knockdown||target.action!=="hit"){
    resetMeleeChain(f);return;
  }
  if(!chain.pending.length)return;
  if(!f.grounded)return;
  if(move&&elapsed<move.startup+.05/COMBO_PROFILES[f.kind].tempo)return;
  const token=chain.pending.shift();chain.step++;
  const route=chain.candidates.map(i=>MELEE_COMBOS[f.kind][i]).find(r=>r.tokens.length===chain.step);
  stopFighterSound(f);f.action="idle";f.actionTime=0;
  attack(f,["P","U"].includes(token)?"punch":"kick",{token,index:chain.step,route});
}
function updateAICombo(f,dt) {
  const chain=f.meleeChain;
  if(!chain||chain.aiRoute===null||f.concreteHold>0||f.knockdown)return false;
  const route=MELEE_COMBOS[f.kind][chain.aiRoute];
  if(chain.tokens.length>=route.tokens.length)return isLocked(f);
  if(chain.pending.length)return true;
  if(chain.step>1&&!f.attackConnected)return false;
  chain.aiWait+=dt;
  if(chain.aiWait<.025+difficulty().reaction*.30)return true;
  const token=route.tokens[chain.tokens.length];chain.aiWait=0;
  attack(f,["P","U"].includes(token)?"punch":"kick",null,token);
  return true;
}

function jump(f) {
  if(f?.concreteHold>0)return false;
  if (workCinematic) return false;
  if (state !== "playing" || !f) return false;
  resetMeleeChain(f);
  if (!f.grounded || isLocked(f)) {
    if (humanFighter(f)) queueAction(f, "jump");
    return false;
  }
  f.crouching = f.guarding = false;
  f.vy = -stats[f.kind].jump * JUMP_BOOST * mobilityTempo(f);
  f.vx = f.moveIntent * stats[f.kind].speed * .92;
  f.grounded = false;
  dustBurst(f.x, FLOOR, 4);
  addEffect("ground", f.x, FLOOR, powerColor(f.kind), 40, .25);
  sfx("jump");
  return true;
}

function evade(f) {
  if(state!=="playing" || !f || !f.grounded || !["idle","block"].includes(f.action))return false;
  if(f.action==="block"){f.action="idle";f.actionTime=0;}
  return attack(f,["blotta","galante"].includes(f.kind)?"teleport":"roll");
}
function attack(f, type, chainStep=null, forcedToken=null) {
  if(f?.concreteHold>0)return false;
  if (workCinematic) return false;
  if (state !== "playing" || !f || !["punch", "kick", "special", "teleport", "slam", "roll"].includes(type)) return false;
  if (type === "teleport" && !["blotta","galante"].includes(f.kind)) return false;
  if (["roll","teleport"].includes(type) && (!f.grounded || (type==="roll" && ["blotta","galante"].includes(f.kind)))) return false;
  if (type === "slam" && f.kind !== "tunki") return false;
  const token=chainStep?.token||forcedToken||meleeToken(f,type);
  if(!chainStep&&MELEE_COMBOS[f.kind]){
    if(f.meleeChain&&["punch","kick"].includes(type)&&bufferMeleeToken(f,token,type))return false;
    resetMeleeChain(f);
  }
  if (isLocked(f)) {
    if (humanFighter(f)) queueAction(f, type);
    return false;
  }
  if (type === "special" && f.kind === "facu" && f.mustacheAway) return false;
  const workFighter = ["angel", "primitivo", "peluche", "tren", "linares", "gabriel", "fernando"].includes(f.kind);
  const workSuper = workFighter && type === "special" && (humanFighter(f) ? fighterInput(f).down : f.power >= 100 && Math.random() < .55);
  const crash = f.kind === "jairo" && type === "special" && (humanFighter(f) ? fighterInput(f).down : f.power >= 45 && Math.random() < .45);
  const cost = type === "special" ? (workFighter ? workSuper ? 100 : 30 : crash ? 45 : 35) : type === "slam" ? 30 : 0;
  if (cost && (f.power < cost || f.specialCooldown > 0 || (!f.grounded && type !== "slam"))) {
    if (humanFighter(f)) sfx("empty");
    return false;
  }
  if(workSuper && stats[f.kind].superRange && Math.abs((f===player?cpu:player).x-f.x)>stats[f.kind].superRange) { if(humanFighter(f)) sfx("empty"); return false; }
  const low = ["punch","kick"].includes(type) && f.grounded && ((chainStep||forcedToken)?["U","D"].includes(token):(humanFighter(f) ? fighterInput(f).down : f.crouching)) && !cost;
  if (low && type === "punch") type = "uppercut";
  stopFighterSound(f);
  const directionInput=humanFighter(f) ? Number(fighterInput(f).right)-Number(fighterInput(f).left) : f.moveIntent;
  f.kickStyle=type!=="kick" || low ? null : !f.grounded ? "airKick" : (chainStep||forcedToken)?token==="B"?"volley":null : directionInput*f.facing<0 ? "volley" : null;
  f.moveSpec = ["jairo","gabriel"].includes(f.kind) && type === "special" ? {...MOVES.special, startup:crash?.32:.22, active:.05, recovery:crash?.62:.42} : f.kind === "paula" && type === "special" ? {...MOVES.special, startup:.24, active:.06, recovery:.70} : MOVES[f.kickStyle || (low && type === "kick" ? "lowKick" : type)];
  if(f.kind==="fernando" && type==="special")f.moveSpec={...MOVES.special,startup:.14,active:.05,recovery:.60};
  f.moveSpec = timedMove(f, f.moveSpec, ["roll","teleport"].includes(type), type);
  if(chainStep){
    f.moveSpec=comboStepSpec(f.kind,token,chainStep.index,!!chainStep.route);
    if(chainStep.route)f.moveSpec.chainName=chainStep.route.name;
    f.vx=f.facing*COMBO_PROFILES[f.kind].advance;
  }
  if(f.kind === "padrino" && type === "special") f.moveSpec.startup = .28;
  f.action = type;
  f.actionDuration = f.moveSpec.startup + f.moveSpec.active + f.moveSpec.recovery;
  f.actionTime = f.actionDuration;
  f.attackLanded = false;
  f.attackConnected = false;
  f.lowAttack = low && type !== "uppercut";
  f.airAttack = !f.grounded;
  f.crouching = f.lowAttack;
  f.guarding = false;
  f.queuedAction = null;
  f.queueTime = 0;
  f.power -= cost;
  if(!chainStep&&["punch","kick"].includes(type)&&token)startMeleeChain(f,token);
  if (workSuper) {
    f.specialStyle = f.kind === "fernando" ? "fireSuper" : f.kind === "gabriel" ? "ganttSuper" : f.kind === "linares" ? "transformerSuper" : f.kind === "tren" ? "stormSuper" : f.kind === "peluche" ? "concreteSuper" : f.kind === "angel" ? "hookSuper" : "containerSuper";
    f.vx = 0;
    startWorkCinematic(f);
    return true;
  }
  if (cost) f.specialCooldown = ["jairo","gabriel"].includes(f.kind) ? (crash ? 2 : 1.3) : type === "special" ? .7 : 1.35;
  if (type === "roll") {
    const other=f===player?cpu:player;
    const input=humanFighter(f)?Number(fighterInput(f).right)-Number(fighterInput(f).left):0;
    f.rollDirection=f.x<FIGHTER_LEFT+88?1:f.x>FIGHTER_RIGHT-88?-1:input || Math.sign(other.x-f.x) || f.facing;
    f.invuln=Math.max(f.invuln,.34/mobilityTempo(f));f.vx=f.rollDirection*580*mobilityTempo(f);
    if (f.kind === "tren") {
      f.rollStartX = f.x;
      f.trenEvadeArrived = false;
      burst(f.x, f.y - 105, "#89e9ff", 12);
      addEffect("ring", f.x, f.y - 105, "#9feeff", 38, .22);
      sfx("electricEvade");
    }
  } else if (type === "slam") {
    f.slamLaunched = f.slamDiving = f.slamLanded = false;
    f.slamFromAir = !f.grounded;
    f.vx = 0;
    if (!f.grounded) f.vy = -90;
  } else if (type === "teleport") {
    f.teleportDirection = humanFighter(f) ? Number(fighterInput(f).right) - Number(fighterInput(f).left) : 0;
    f.teleportDone = f.teleportSmokeStarted = false;
    f.vx = f.vy = 0;
  } else if (type === "special") {
    f.specialSpawned = false;
    f.specialStyle = f.kind === "fernando" ? "cigarettes" : f.kind === "gabriel" ? "critical" : f.kind === "linares" ? "cable" : f.kind === "tren" ? "voltaic" : f.kind === "peluche" ? "concrete" : f.kind === "angel" ? "beam" : f.kind === "primitivo" ? "forklift" : f.kind === "jairo" ? (crash ? "crash" : "critical") : f.kind === "paula" ? "water" : f.kind === "padrino" ? "dog" : f.kind === "galante" ? "whip" : f.kind === "flor" ? "hockey" : f.kind === "facu" ? "boomerang" : f.kind === "sergio" ? (f.projectileToggle++ % 2 ? "bottle" : "meat") : f.kind === "tunki" ? "flowers" : f.kind === "marechal" ? "lightning" : "ki";
    if (COMBAT_AUDIO[f.specialStyle]) f.attackSound = startCombatSound(f.specialStyle);
    f.vx = 0;
  } else if (f.kickStyle === "volley") {
    f.vx=chainStep?f.facing*COMBO_PROFILES[f.kind].advance:-f.facing*65;
  } else if (type === "kick" && !low && f.grounded && !chainStep) {
    f.vy = -260 * mobilityTempo(f);
    f.vx = f.facing * 260;
    f.grounded = false;
    f.airAttack = true;
  } else if (f.grounded) {
    f.vx = f.facing * (chainStep?COMBO_PROFILES[f.kind].advance:low ? 35 : f.kind === "sergio" ? 180 : 105);
  }
  if (["punch", "uppercut", "kick"].includes(type)) {
    f.attackSound = startCombatSound(roster.includes(f.kind) ? "meleeSwing" : f.kind === "sergio" && type === "punch" ? "belly" : "general");
  } else if ((type !== "special" || !COMBAT_AUDIO[f.specialStyle]) && !(f.kind === "tren" && type === "roll")) sfx(type);
  return true;
}

function spawnProjectile(owner, style) {
  if(style==="cigarettes") {spawnCigarettes(owner);return;}
  if(style==="cable") {spawnCable(owner);return;}
  if(style==="voltaic") { spawnVoltaic(owner); return; }
  if(style==="concrete") { spawnConcrete(owner); return; }
  if (["beam","forklift"].includes(style)) { spawnWorkProjectile(owner,style); return; }
  if (["critical", "crash"].includes(style)) { spawnSchedule(owner, style); return; }
  if (style === "whip") { strikeWhip(owner); return; }
  if (style === "boomerang") { spawnBoomerang(owner); return; }
  const config = style === "water" ? { speed: 760, damage: 13, radius: 24 } : style === "dog" ? { speed: 500, damage: 13, radius: 23 } : style === "hockey" ? { speed: 570, damage: 13, radius: 12 } : style === "ki" ? { speed: 470, damage: 13, radius: 16 } :
    style === "lightning" ? { speed: 560, damage: 13, radius: 15 } :
    style === "flowers" ? { speed: 405, damage: 14, radius: 20 } :
    style === "bottle" ? { speed: 425, damage: 12, radius: 16 } : { speed: 395, damage: 10, radius: 19 };
  const x = owner.x + owner.facing * 58 * FIGHTER_SCALE;
  const y = owner.y - (style === "hockey" ? 74 : style === "dog" ? 111 : 143) * FIGHTER_SCALE;
  addEffect("ring", x, y, powerColor(owner.kind), 36, .22);
  burst(x, y, powerColor(owner.kind), 5);
  const sound = COMBAT_AUDIO[style] ? owner.attackSound || startCombatSound(style) : null;
  if (sound === owner.attackSound) owner.attackSound = null;
  projectiles.push({
    sound,
    owner, style, x, y, prevX: x, prevY: y, prevSpin: 0,
    vx: owner.facing * config.speed, vy: style === "water" || style === "dog" || style === "ki" || style === "lightning" || style === "hockey" ? 0 : -42,
    damage: powerDamage(owner) * (owner.kind === "sergio" ? style === "bottle" ? 12/11 : style === "meat" ? 10/11 : 1 : 1), radius: config.radius * FIGHTER_SCALE, life: 2.5, spin: 0, trailTime: 0, trail: []
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if(p.style==="cigarettes") {updateCigarettes(p,dt);if(state!=="playing")return;continue;}
    if(p.style==="cable") {updateCable(p,dt);if(state!=="playing")return;continue;}
    if(p.style==="voltaic") {updateVoltaic(p,dt);if(state!=="playing")return;continue;}
    if (["critical", "crash"].includes(p.style)) { updateSchedule(p, dt); if (state !== "playing") return; continue; }
    if(p.style==="concrete") { updateConcrete(p,dt); if(state!=="playing")return; continue; }
    if (["beam","forklift"].includes(p.style)) { updateWorkProjectile(p,dt); if (state !== "playing") return; continue; }
    if (p.style === "boomerang") { updateBoomerang(p, dt); if (state !== "playing") return; continue; }
    p.life -= dt;
    p.x += p.vx * dt;
    p.spin += dt * 8;
    if (p.style !== "water" && p.style !== "dog" && p.style !== "ki" && p.style !== "lightning" && p.style !== "hockey") { p.vy += 82 * dt; p.y += p.vy * dt; }
    p.trailTime -= dt;
    if (p.trailTime <= 0) {
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 9) p.trail.pop();
      p.trailTime = .025;
      if (p.style === "flowers") burst(p.x, p.y, "#ff81c5", 1);
      if (p.style === "lightning") burst(p.x, p.y, "#91eaff", 1);
    }
    const target = p.owner === player ? cpu : player;
    // End as soon as the leading edge reaches the visible screen boundary.
    if (p.life <= 0 || (p.vx < 0 ? p.x - p.radius <= STAGE_LEFT : p.x + p.radius >= STAGE_RIGHT) || p.y + p.radius >= FLOOR) {
      stopCombatSound(p.sound);
      projectiles.splice(i, 1);
      continue;
    }
    const box = { left: p.x - p.radius, right: p.x + p.radius, top: p.y - p.radius, bottom: p.y + p.radius };
    if (!isVanished(target) && target.invuln <= 0 && overlaps(box, hurtBox(target))) {
      stopCombatSound(p.sound);
      hit(target, p.damage, Math.sign(p.vx) * 180, 0, p.owner,
        { direction: Math.sign(p.vx), sourceX: p.x - Math.sign(p.vx) * p.radius, projectile: true, low: false, x: p.x, y: p.y });
      if (p.style === "water") { burst(p.x, p.y, "#96ecff", 24); addEffect("ring", p.x, p.y, "#e5fbff", 55, .25); }
      if (p.style === "flowers") burst(p.x, p.y, "#ff72bb", 15);
      if (p.style === "lightning") burst(p.x, p.y, "#a8edff", 14);
      projectiles.splice(i, 1);
      if (state !== "playing") return;
    }
  }
}

function hit(target, damage, knockX, knockY, attacker, contact = {}) {
  if (target.invuln > 0 || isVanished(target) || state !== "playing") return false;
  damage = damageTaken(target, damage);
  const healthBefore=target.health;
  const sourceX = contact.sourceX ?? attacker.x;
  const inFront = (sourceX - target.x) * target.facing >= 0;
  const blocking = target.guarding && target.grounded && inFront && (!contact.low || target.crouching)
    && (!contact.overhead || !target.crouching)
    && ["idle", "block"].includes(target.action);
  if(contact.attackType&&!contact.projectile)attacker.attackConnected=!blocking;
  if (blocking) {
    resetMeleeChain(attacker);
    addScore(target, 25);
    const chipDamage = contact.super ? damage * .30 : contact.projectile ? damageTaken(target,1) : 0;
    target.health = Math.max(0, Math.round((target.health - chipDamage) * 1000) / 1000);
    target.power = Math.min(100, target.power + 4 * ENERGY_GAIN_SCALE);
    target.action = "block";
    target.actionDuration = .15;
    target.actionTime = .15;
    target.vx = knockX * .24;
    target.invuln = .08;
    target.guardFlash = .20;
    burst(target.x + target.facing * 32 * FIGHTER_SCALE, target.y - (target.crouching ? 65 : 134) * FIGHTER_SCALE, "#8cecff", 6);
    addEffect("ring", target.x + target.facing * 32 * FIGHTER_SCALE, target.y - (target.crouching ? 65 : 134) * FIGHTER_SCALE, "#8cecff", 38, .24);
    hitStop = .025;
    sfx("block");
  } else {
    stopFighterSound(target);
    resetMeleeChain(target);
    addScore(attacker, Math.min(damage, target.health) * 10);
    target.health = Math.max(0, Math.round((target.health - damage) * 1000) / 1000);
    target.power = Math.min(100, target.power + damage * .8 * ENERGY_GAIN_SCALE);
    attacker.power = Math.min(100, attacker.power + damage * .7 * ENERGY_GAIN_SCALE);
    const continuing=attacker.comboTime>0&&(!MELEE_COMBOS[attacker.kind]||target.action==="hit");
    attacker.combo = continuing ? attacker.combo + 1 : 1;
    attacker.comboDamage=(continuing?attacker.comboDamage||0:0)+Math.min(damage,healthBefore);
    if(!continuing)attacker.comboName="";
    attacker.comboTime = .72;
    target.invuln = .09;
    target.action = "hit";
    target.actionDuration = .23 + damage * .005;
    target.actionTime = target.actionDuration;
    target.vx = knockX;
    target.vy = knockY;
    target.grounded = knockY === 0 && target.y >= FLOOR;
    target.crouching = target.guarding = target.lowAttack = false;
    target.queuedAction = null;
    target.queueTime=0;
    if(target.concreteHold>0 && target.health>0){
      target.vx=target.vy=0;target.knockdown=null;target.actionTime=target.concreteHold;
    } else if (contact.knockdown && !contact.projectile) beginKnockdown(target, knockX);
    target.flash = .13;
    screenShake = damage > 11 ? 4 : 2.5;
    hitStop = damage > 11 ? .055 : .035;
    burst(contact.x ?? target.x, contact.y ?? target.y - 104, "#ffd55b", 11);
    addEffect("impact", contact.x ?? target.x, contact.y ?? target.y - 104, powerColor(attacker.kind), damage > 11 ? 57 : 38, .25);
    if (contact.attackType && !contact.projectile) startCombatSound(contact.attackType + "Hit");
    else sfx("hit");
    if(contact.chainFinisher){
      attacker.comboName=contact.chainName;attacker.comboTime=1.10;
      attacker.chainCooldown=.45;
      target.invuln=Math.max(target.invuln,.32);
      resetMeleeChain(attacker);
      burst(contact.x??target.x,contact.y??target.y-104,"#fff0a5",16);
      addEffect("ring",contact.x??target.x,contact.y??target.y-104,powerColor(attacker.kind),62,.32);
      screenShake=Math.max(screenShake,4);
    }
    if (navigator.vibrate) navigator.vibrate(15);
  }
  suspendCombatSounds(false);
  if (target.health <= 0 && !resolvingContacts) finishRound(attacker, "K.O.");
  return true;
}

function finishRound(winner, reason) {
  if (state !== "playing") return;
  fighters.forEach(f=>{f.concreteHold=0;f.concreteCoat=0;resetMeleeChain(f);f.queuedAction=null;f.queueTime=0;});
  if (winner === player) match.playerWins++;
  else if (winner === cpu) match.cpuWins++;
  match.repeat = !winner;
  match.complete = match.playerWins >= 2 || match.cpuWins >= 2;
  if (winner) addScore(winner, 1000 + Math.ceil(roundTime) * 5 + Math.round(winner.health) * 10);
  if (match.complete) {
    match.winner = winner === player ? 0 : 1;
    addScore(winner, 2000);
    if(campaign && gameMode==="solo"){
      if(winner===player){
        campaign.wins++;
        if(!campaign.defeated.includes(cpu.kind))campaign.defeated.push(cpu.kind);
        addScore(player,2000*(campaign.index+1));
        match.nextOpponent=campaign.index+1<campaign.opponents.length;
        campaign.completed=!match.nextOpponent;
        if(campaign.completed)addScore(player,10000);
      }else campaign.continuePending=campaign.extraLives>0;
      match.recordSlot=0;
    }
    stopMusic();
  }
  state = match.complete ? "finished" : "roundOver";
  hitStop = 0;
  resultElapsed = 0;
  stopRoundVoice();
  stopAllCombatSounds();
  setPauseUI(false);
  clearHeld();
  ui.resultKicker.textContent = match.playerWins + " — " + match.cpuWins;
  ui.resultTitle.textContent = winner ? fighterLabel(winner) + " GANA" : "EMPATE";
  document.getElementById("finalScore").textContent = winner ? "PUNTAJE FINAL · " + match.scores[winner === player ? 0 : 1].toLocaleString("es-AR") : "";
  document.getElementById("roundNotice").textContent = !winner ? "EMPATE · SE REPITE EL ROUND" :
    fighterLabel(winner) + " GANA EL ROUND · " + match.playerWins + " — " + match.cpuWins;
  if(match.complete && campaign){
    document.getElementById("finalScore").textContent="PUNTAJE · "+match.scores[0].toLocaleString("es-AR")+" · "+campaign.wins+"/"+campaign.opponents.length+" VICTORIAS";
    if(match.nextOpponent)ui.resultKicker.textContent="SIGUIENTE RIVAL · "+stats[campaign.opponents[campaign.index+1]].name;
    else if(campaign.completed)ui.resultTitle.textContent=fighterLabel(player)+" · CAMPEÓN";
  }
  updateHud();
  document.getElementById("woEndActions").hidden=!!campaign?.continuePending;
  announce(reason, winner && reason==="K.O." ? KO_AUDIO.duration*1000 : 750);
  if(winner && reason==="K.O."){koVoice={elapsed:0,waited:0,started:false,source:null,gain:null};loadKOAudio();syncKOAudio();}
  sfx(match.complete ? winner === player ? "win" : "lose" : "confirm");
  if(match.complete && campaign && winner!==player && !campaign.continuePending)campaign=null;
}

function addScore(f, points) {
  if (!f || !match.scores) return;
  const slot = f === player ? 0 : 1;
  const multiplier=campaign && gameMode==="solo" && slot===0 ? 1+campaign.index*.25 : 1;
  match.scores[slot] = Math.min(1000000, match.scores[slot] + Math.max(0, Math.round(points*multiplier)));
  if(campaign && slot===0)campaign.score=match.scores[0];
}

function showGameOver() {
  match.endShown = true;
  ui.resultKicker.textContent = "GAME OVER";
  if (online?.active) document.getElementById("onlineEndActions").hidden = false;
  const humanWinner = online?.active ? match.winner === (online.guest ? 1 : 0) : match.campaignRun || match.winner === 0 || gameMode === "versus";
  document.getElementById("winnerForm").hidden = !humanWinner;
  document.getElementById("cpuResultNote").hidden = humanWinner || !!online?.active;
  if (humanWinner) {
    const input = document.getElementById("winnerName");
    input.value = "";
    document.getElementById("saveError").textContent = "";
    document.getElementById("saveScoreBtn").disabled = false;
    // Mobile players tap the field deliberately, preventing a sudden keyboard resize.
    if (!mobileInput()) input.focus?.();
  }
}

function rankingPosition(position) {
  const lastTwo = position % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "TH" : ({1:"ST", 2:"ND", 3:"RD"}[position % 10] || "TH");
  return position + suffix;
}

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

async function saveWinner(event) {
  event.preventDefault();
  if (state !== "finished" || !match.complete || !match.endShown || match.saved || match.saving || (gameMode === "solo" && match.winner !== 0 && !match.campaignRun)) return;
  const input = document.getElementById("winnerName");
  const name = input.value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim();
  const message = document.getElementById("saveError");
  if (!name || name.length > 20) { message.textContent = "Escribí un nombre de 1 a 20 caracteres."; input.focus?.(); return; }
  const result = match;
  const button = document.getElementById("saveScoreBtn");
  result.saving = true; button.disabled = true; message.textContent = "Guardando puntaje…";
  try {
    await rankingFetch(RANKING_API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({
      id: result.id, name, score: result.scores[result.recordSlot ?? result.winner], mode: gameMode === "online" ? "versus" : gameMode,
      character: (result.recordSlot ?? result.winner) === 0 ? result.playerKind : result.cpuKind
    })});
    result.saved = true;
    if (state === "finished" && match === result) await showRanking(result.id);
  } catch (error) {
    if (match === result) {
      const reason = error.status === 400 ? "El ranking rechazó los datos de la partida."
        : error.status === 429 ? "El ranking recibió demasiados intentos; esperá un momento."
        : error.status ? "El servicio de ranking no pudo guardar la partida."
        : "No se pudo contactar con el servicio de ranking.";
      message.textContent = reason + " Tu nombre y puntaje siguen acá; volvé a intentar.";
    }
  } finally { result.saving = false; button.disabled = false; }
}

async function showRanking(highlight = null) {
  if (online?.active) online.leave(false);
  const requestId = ++rankingRequest;
  state = "ranking";
  clearHeld(); stopAllCombatSounds(); stopRoundVoice(); stopMusic();
  setPauseUI(false);
  showScreen(ui.rankingScreen);
  const rows = document.getElementById("rankingRows");
  rows.replaceChildren();
  const status = document.getElementById("rankingStatus");
  status.textContent = "Cargando ranking completo…";
  document.getElementById("rankingRetryBtn").hidden = true;
  try {
    let cursor = null;
    const entries = new Map();
    const cursors = new Set();
    do {
      const data = await rankingFetch(RANKING_API + (cursor ? "?after=" + encodeURIComponent(cursor) : ""));
      if (state !== "ranking" || requestId !== rankingRequest) return;
      if (!Array.isArray(data.entries)) throw new Error("Invalid ranking response");
      data.entries.forEach(entry => { if (entry && typeof entry.name === "string" && Number.isSafeInteger(entry.score)) entries.set(entry.id, entry); });
      cursor = data.next || null;
      if (cursor && cursors.has(cursor)) throw new Error("Repeated ranking page");
      cursors.add(cursor);
    } while (cursor);
    const sorted = [...entries.values()].sort((a,b) => b.score - a.score || a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)));
    for (const [index,entry] of sorted.entries()) {
      const row = document.createElement("tr");
      if (entry.id === highlight) row.classList.add("new-record");
      for (const [column,value] of [rankingPosition(index + 1), String(entry.score), entry.name].entries()) {
        const cell = document.createElement("td");
        const lettering = document.createElement("span"); lettering.classList.add("ranking-lettering");
        lettering.textContent = String(value); cell.appendChild(lettering);
        if (column === 2 && entry.name.length > 9) cell.classList.add("long-name");
        row.appendChild(cell);
      }
      rows.appendChild(row);
    }
    status.textContent = sorted.length ? sorted.length + " RESULTADOS · DESLIZÁ PARA VER TODOS" : "Todavía no hay resultados. ¡El primero puede ser tuyo!";
  } catch (_) {
    if (state !== "ranking" || requestId !== rankingRequest) return;
    status.textContent = "No se pudo cargar el ranking. Revisá la conexión y reintentá.";
    document.getElementById("rankingRetryBtn").hidden = false;
  }
}

function isLocked(f) {
  return f.concreteHold>0 || (f.action !== "idle" && f.actionTime > 0);
}

function actionProgress(f) {
  if (!f.actionDuration) return 0;
  return Math.max(0, Math.min(1, 1 - f.actionTime / f.actionDuration));
}

function uppercutRise(f) {
  const elapsed = f.actionDuration - f.actionTime;
  return smoothstep((elapsed - MOVES.uppercut.startup * .5) / (MOVES.uppercut.startup * .5 + MOVES.uppercut.active))
    * (1 - smoothstep((elapsed - MOVES.uppercut.startup - MOVES.uppercut.active) / MOVES.uppercut.recovery));
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 230;
    particles.push({ x, y, prevX: x, prevY: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .35 + Math.random() * .25, color, size: 2 + Math.random() * 4, spark: true });
  }
}

function dustBurst(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - .5) * 44,
      y,
      vx: (Math.random() - .5) * 95,
      vy: -20 - Math.random() * 75,
      gravity: 105,
      life: .28 + Math.random() * .22,
      color: Math.random() > .5 ? "#d7b26c" : "#7f6844",
      size: 3 + Math.random() * 7
    });
  }
}

function debrisBurst(x, y, count) {
  const colors=["#c6aa78", "#766c5f", "#ab8e62", "#544e47"];
  for (let i=0;i<count;i++) {
    const size=3+Math.random()*5;
    const life=.38+Math.random()*.26;
    const offset=(Math.random()-.5)*60;
    particles.push({x:x+offset,y:y-size,prevX:x+offset,prevY:y-size,
      vx:(Math.random()-.5)*290,vy:-115-Math.random()*165,gravity:720,
      life,maxLife:life,color:colors[i%colors.length],size,debris:true});
  }
}

function smokeBurst(x, y, count) {
  for (let i = 0; i < count; i++) {
    const life = .4 + Math.random() * .38;
    particles.push({
      x: x + (Math.random() - .5) * 78, y: y + (Math.random() - .5) * 132,
      vx: (Math.random() - .5) * 95, vy: -22 - Math.random() * 58,
      gravity: -12, life, maxLife: life, smoke: true,
      color: ["#d9d5ed", "#8d88ab", "#bbb5d5"][i % 3], size: 18 + Math.random() * 22
    });
  }
}

function addAfterimage(f) {
  afterimages.push({
    kind: f.kind, mustacheAway: f.mustacheAway,
    pose: poseFor(f),
    x: f.x,
    y: f.y,
    facing: f.facing,
    motion: fighterMotion(f),
    life: .18,
    maxLife: .18
  });
}

function updateAfterimages(dt) {
  for (let i = afterimages.length - 1; i >= 0; i--) {
    afterimages[i].life -= dt;
    if (afterimages[i].life <= 0) afterimages.splice(i, 1);
  }
}

function updateParticles(dt) {
  if (particles.length > 220) particles.splice(0, particles.length - 220);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity ?? 620) * dt;
    if(p.debris && p.vy>0 && p.y >= FLOOR-p.size){p.y=FLOOR-p.size;p.vy=p.vy>40?-p.vy*.24:0;p.vx*=.8;}
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function powerColor(kind) {
  return { fernando:"#ff9b42", gabriel:"#ff426b", linares:"#8eeaff", tren:"#8eeaff", peluche:"#d9e1df", angel: "#ffe269", primitivo: "#ffb65b", jairo: "#ff426b", paula: "#60d9ff", padrino: "#ff902e", galante: "#ffdb43", flor: "#d7ff99", facu: "#ffe47a", sergio: "#ffc650", blotta: "#76daff", tunki: "#ff8bd5", marechal: "#a5eaff" }[kind] || "#ffe47a";
}

function addEffect(type, x, y, color, radius, life) {
  if (effects.length >= 48) effects.shift();
  effects.push({ type, x, y, color, radius, life, maxLife: life });
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) effects.splice(i, 1);
  }
}

function drawEffect(effect) {
  const age = 1 - effect.life / effect.maxLife;
  const radius = effect.radius * (.15 + smoothstep(age) * .85);
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.globalAlpha = (1 - age) * .85;
  ctx.strokeStyle = effect.color;
  ctx.lineWidth = Math.max(1, 5 * (1 - age));
  if (effect.type === "ground") {
    ctx.scale(1, .22);
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha *= .4;
    ctx.beginPath(); ctx.arc(0, 0, radius * .7, 0, Math.PI * 2); ctx.stroke();
  } else if (effect.type === "crack") {
    ctx.lineWidth = 2.5 * (1 - age) + 1;
    for (const direction of [-1,1]) {
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.lineTo(direction*radius*.25,-2);
      ctx.lineTo(direction*radius*.49,2);
      ctx.lineTo(direction*radius*.76,-1);
      ctx.lineTo(direction*radius,1);
      ctx.stroke();
      ctx.beginPath();ctx.moveTo(direction*radius*.49,2);
      ctx.lineTo(direction*radius*.66,7);ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    if (effect.type === "impact") {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + .2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * .25, Math.sin(angle) * radius * .25);
        ctx.lineTo(Math.cos(angle) * radius * (i % 2 ? .75 : 1.2), Math.sin(angle) * radius * (i % 2 ? .75 : 1.2));
        ctx.stroke();
      }
      ctx.fillStyle = "#fff7d8";
      ctx.globalAlpha *= 1 - age;
      ctx.beginPath(); ctx.arc(0, 0, 12 * (1 - age), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function updateCamera(dt) {
  const left=Math.min(player.x,cpu.x),right=Math.max(player.x,cpu.x);
  const target=Math.max(STAGE_LEFT,Math.min(STAGE_RIGHT-VIEW_WIDTH,(left+right)/2-VIEW_WIDTH/2));
  cameraX+=(target-cameraX)*(1-Math.exp(-7*dt));
  // Keep both fighters visible even after a teleport or a fast roll.
  cameraX=Math.max(STAGE_LEFT,Math.min(STAGE_RIGHT-VIEW_WIDTH,
    Math.max(right-(VIEW_WIDTH-90),Math.min(left-90,cameraX))));
}

function drawStage(image, parallaxX) {
  if (!image.complete || !image.naturalWidth) { ctx.fillStyle = "#16263a"; ctx.fillRect(0, 0, 960, 540); paintStageLighting(ctx,VIEW_WIDTH); return; }
  const width=image.naturalWidth,height=image.naturalHeight || width*9/16;
  const drawWidth=VIEW_WIDTH+160,drawHeight=550;
  if(!stageRaster || stageRaster.image!==image || stageRaster.scale!==drawingScale || stageRaster.sourceWidth!==width || stageRaster.sourceHeight!==height) {
    const surface=document.createElement("canvas");
    surface.width=Math.round(drawWidth*drawingScale);surface.height=Math.round(drawHeight*drawingScale);
    const paint=surface.getContext("2d",{alpha:false});
    paint.imageSmoothingEnabled=false;
    const scale=Math.max(drawWidth/width,drawHeight/height);
    const cropWidth=drawWidth/scale,cropHeight=drawHeight/scale;
    paint.drawImage(image,(width-cropWidth)/2,(height-cropHeight)*.6,cropWidth,cropHeight,0,0,surface.width,surface.height);
    paint.setTransform(drawingScale,0,0,drawingScale,0,5*drawingScale);
    paintStageLighting(paint,drawWidth);
    // Only the current arena is retained, including after a tournament stage change.
    stageRaster={image,scale:drawingScale,sourceWidth:width,sourceHeight:height,surface};
  }
  ctx.drawImage(stageRaster.surface,-80-cameraX*.35+parallaxX,-5,drawWidth,drawHeight);
}

function paintStageLighting(paint,width) {
  // Both gradients are independent of horizontal camera movement, so bake them into the arena.
  const vignette=paint.createLinearGradient(0,0,0,540);
  vignette.addColorStop(0,"rgba(5,10,22,.12)");vignette.addColorStop(.75,"rgba(5,8,14,0)");vignette.addColorStop(1,"rgba(2,3,8,.5)");
  paint.fillStyle=vignette;paint.fillRect(0,0,width,540);
  const floorShade=paint.createLinearGradient(0,405,0,540);
  floorShade.addColorStop(0,"rgba(4,8,15,0)");floorShade.addColorStop(1,"rgba(2,4,10,.28)");
  paint.fillStyle=floorShade;paint.fillRect(0,400,width,140);
}

function prepareFightRendering() {
  const kinds=new Set(fighters.map(f=>f.kind));
  // Release past opponents' derived images, without unloading the original artwork.
  for(const key of spriteFrames.keys())if(![...kinds].some(kind=>key.startsWith(kind+":") || key.startsWith("classic:"+kind+":")))spriteFrames.delete(key);
  for(const key of poseBlendSurfaces.keys())if(!kinds.has(key))poseBlendSurfaces.delete(key);
  for(const key of concreteSprites.keys())if(![...kinds].some(kind=>key.startsWith(kind+":")))concreteSprites.delete(key);
  electricRasters.clear();electricRasterPixels=0;
  renderWarmQueue=[];
  if(mobileRendering)for(const kind of kinds)if(roster.includes(kind)) {
    const poses=[...new Set([...Object.values(POSES[kind]),...Array.from({length:15},(_,i)=>i),16,17,
      ...(["angel","linares","gabriel"].includes(kind)?[19]:[]),...(ROUND_TAUNTS[kind]?[20,21]:[]),...(kind==="fernando"?[24,25,26,27,28,29]:[])])];
    for(const pose of poses)renderWarmQueue.push({kind,pose});
  }
}

function warmRenderFrame() {
  // One small pose per presentation frame avoids a first-use hitch during a strike.
  if(state!=="intro" || !renderWarmQueue.length)return;
  const frame=renderWarmQueue.shift();
  if(!spriteFrame(frame))renderWarmQueue.push(frame);
}

function draw() {
  ctx.setTransform(drawingScale, 0, 0, drawingScale, 0, 0);
  const shakeX = screenShake ? (Math.random() - .5) * screenShake : 0;
  const shakeY = screenShake ? (Math.random() - .5) * screenShake * .55 : 0;
  const parallaxX = Math.sin(stageTime * .55) * 2;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawStage(stageImages[stageChoice], parallaxX);

  ctx.translate(-cameraX, 0);
  drawShadow(player);
  drawShadow(cpu);
  afterimages.forEach(drawAfterimage);
  if(player.x<=cpu.x){drawFighter(player);drawFighter(cpu);}else{drawFighter(cpu);drawFighter(player);}
  projectiles.forEach(p => { drawProjectileTrail(p); drawProjectile(p); });
  particles.forEach(drawParticle);
  effects.forEach(drawEffect);
  fighters.forEach(drawRoundIntroSpeech);
  ctx.restore();
  if (workCinematic) drawWorkCinematic();
  fighters.forEach(drawComboHud);
}

function drawComboHud(f) {
  if(f.combo<2||f.comboTime<=0)return;
  ctx.save();
  const x=f===player?30:VIEW_WIDTH-30;
  ctx.textAlign=f===player?"left":"right";
  ctx.font='400 30px "KP Display", Impact, sans-serif';
  ctx.fillStyle="#ffe47a";ctx.strokeStyle="#080e1c";ctx.lineWidth=4;
  const label=`${f.combo} GOLPES · ${comboDamageFormat.format(f.comboDamage||0)}%`;
  ctx.strokeText(label,x,133);ctx.fillText(label,x,133);
  if(f.comboName){
    ctx.font='400 20px "KP Display", Impact, sans-serif';ctx.fillStyle=powerColor(f.kind);
    ctx.strokeText(f.comboName.toUpperCase(),x,156);ctx.fillText(f.comboName.toUpperCase(),x,156);
  }
  ctx.restore();
}

function poseFor(f) {
  const introduction=roundIntroPose(f);
  if(introduction!==null)return introduction;
  if(f.concreteHold>0)return f.concretePose;
  if(workCinematic?.owner===f && f.kind==="angel")return workCinematic.elapsed<.38 || workCinematic.elapsed>=.78 ? 16 : 17;
  if(workCinematic?.owner===f && f.kind==="fernando")return fernandoSuperPose(workCinematic);
  if (workCinematic?.owner === f && ["linares","gabriel","fernando"].includes(f.kind)) return 17;
  if(["linares","gabriel","fernando"].includes(f.kind) && f.action==="special")return f.specialSpawned?16:4;
  if (workCinematic?.owner === f) return ["peluche","tren"].includes(f.kind) ? 17 : POSES[f.kind].power;
  if(f.kind==="angel" && f.action==="special")return 18+Math.floor((f.actionDuration-f.actionTime)*12)%2;
  if(f.kind==="peluche" && f.action==="roll")return 18;
  if(f.kind==="tren" && f.action==="roll")return POSES.tren.idle;
  if(["peluche","tren"].includes(f.kind) && f.action==="special") return f.specialSpawned ? 16 : 4;
  if(f.kind === "galante" && state === "intro" && introElapsed < ROUND_AUDIO[match.round].timing.fight) return 15;
  if(f.action==="roll")return 8;
  const progress = actionProgress(f);
  if (f.kind === "jairo" && f.action === "special") return f.specialStyle === "crash" ? 11 : 4;
  if (f.kind === "paula" && f.action === "special") {
    const elapsed=f.actionDuration-f.actionTime;
    return elapsed<f.moveSpec.startup?11:elapsed<.86?4:15;
  }
  if (f.action === "hit") return POSES[f.kind].hit;
  if (f.action === "uppercut") {
    const elapsed = f.actionDuration - f.actionTime;
    return elapsed < MOVES.uppercut.startup * .65 || elapsed > MOVES.uppercut.startup + MOVES.uppercut.active + MOVES.uppercut.recovery * .6 ? 8 : 12;
  }
  // Frames 6–11 come from the movement atlas, with separate jump and guard poses.
  if (f.action === "teleport") return 11;
  if (f.action === "slam") return f.slamLanded ? 11 : f.slamDiving ? POSES.tunki.slam : f.slamLaunched ? 10 : 8;
  if (f.guarding || f.action === "block") return f.crouching && ["linares","gabriel","fernando"].includes(f.kind) ? 19 : 9;
  if (["punch", "kick", "special"].includes(f.action) && f.moveSpec) {
    const elapsed = f.actionDuration - f.actionTime;
    if (elapsed > f.moveSpec.startup + f.moveSpec.active + f.moveSpec.recovery * .58) {
      return f.lowAttack ? 8 : !f.grounded ? 10 : POSES[f.kind].idle;
    }
  }
  if(f.action==="kick" && f.kickStyle==="airKick")return progress<.12?10:13;
  if(f.action==="kick" && f.kickStyle==="volley")return progress<.19?POSES[f.kind].idle:14;
  if (["angel", "primitivo", "peluche", "tren", "linares", "gabriel", "fernando"].includes(f.kind) && f.lowAttack && f.action === "kick") return POSES[f.kind].sweep;
  if (f.kind === "flor" && f.lowAttack && f.action === "kick") return POSES.flor.sweep;
  if (f.kind === "facu" && f.lowAttack && f.action === "kick") return POSES.facu.sweep;
  if (f.kind === "marechal" && f.lowAttack && f.action === "kick") return POSES.marechal.sweep;
  if (f.kind === "jairo" && f.lowAttack && f.action === "kick") return POSES.jairo.sweep;
  if (f.kind === "paula" && f.lowAttack && f.action === "kick") return POSES.paula.sweep;
  if (f.kind === "padrino" && f.lowAttack && f.action === "kick") return POSES.padrino.sweep;
  if (f.kind === "galante" && f.lowAttack) return POSES.galante.sweep;
  if (f.lowAttack) return f.kind === "blotta" && f.action === "kick" ? POSES.blotta.sweep : 8;
  if (f.action === "punch") {
    return progress < .16 || progress > .86 ? POSES[f.kind].idle : f.kind === "sergio" ? 11 : POSES[f.kind].punch;
  }
  if (f.action === "kick") return progress < .12 ? POSES[f.kind].idle : POSES[f.kind].kick;
  if (f.action === "special") {
    if (progress < .15) return POSES[f.kind].idle;
    if (["angel", "primitivo", "peluche", "tren", "linares", "gabriel", "fernando"].includes(f.kind)) return POSES[f.kind].power;
    if (f.kind === "blotta") return POSES.blotta.power;
    if (f.kind === "tunki") return POSES.tunki.power;
    if (f.kind === "padrino") return POSES.padrino.power;
    if (f.kind === "galante") return POSES.galante.power;
    if (f.kind === "flor") return POSES.flor.power;
    if (f.kind === "facu") return POSES.facu.power;
    if (f.kind === "marechal") return POSES.marechal.power;
    return f.projectileToggle % 2 ? POSES.sergio.meat : POSES.sergio.bottle;
  }
  if (f.crouching) return 8;
  if (!f.grounded) return 10;
  if (f.kind === "marechal" && f.landingSquash > .08 && f.action === "idle") return 11;
  if (Math.abs(f.vx) > 22) return [6, 0, 7, 0][Math.floor(f.walkPhase) % 4];
  return POSES[f.kind].idle;
}

function drawShadow(f) {
  if (isVanished(f)) return;
  const lift = Math.max(0, FLOOR - lerp(f.prevY, f.y, renderAlpha));
  ctx.save();
  const radius = Math.max(18, (stats[f.kind].width + 15) * FIGHTER_SCALE - lift * .035);
  const x = f.prevX + (f.x - f.prevX) * renderAlpha;
  ctx.translate(x, FLOOR + 3);
  ctx.scale(1, .2);
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
  shadow.addColorStop(0, "rgba(0,0,0,.65)");
  shadow.addColorStop(.5, "rgba(0,0,0,.28)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = Math.max(.25, 1 - lift / 360);
  ctx.fillStyle = shadow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function fighterMotion(f) {
  const motion = { dx: 0, dy: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  if(roundIntroPose(f)!==null){motion.dy=-Math.sin(introElapsed*3.7)*.65;return motion;}
  if(workCinematic?.owner===f && f.kind==="fernando"){
    const t=workCinematic.elapsed;
    motion.dy=t<1.05?-Math.abs(Math.sin(t*32))*3:0;
    return motion;
  }
  if (f.knockdown) {
    const fall = f.knockdown;
    const tilt = fall.phase === "air" ? smoothstep(fall.age / .32)
      : fall.phase === "rise" ? 1 - smoothstep(fall.phaseTime / .28) : 1;
    motion.rotation = fall.direction * Math.PI / 2 * tilt;
    motion.dx = -Math.sin(motion.rotation) * stats[f.kind].height * FIGHTER_SCALE * .45;
    motion.dy = -Math.abs(Math.sin(motion.rotation)) * 28;
    return motion;
  }
  const progress = actionProgress(f);
  if(f.action==="roll"){
    if(f.kind==="tren")return motion;
    const angle=progress*Math.PI*2*f.rollDirection,radius=stats[f.kind].size*FIGHTER_SCALE*.16;
    motion.rotation=angle;motion.dx=-radius*Math.sin(angle);motion.dy=radius*(Math.cos(angle)-1);
    motion.scaleX=motion.scaleY=.8;return motion;
  }
  const moving = f.grounded && f.action === "idle" && !f.crouching && !f.guarding && Math.abs(f.vx) > 1;

  if (f.action === "idle") {
    if(f.kind === "galante" && state === "intro" && introElapsed < ROUND_AUDIO[match.round].timing.fight){motion.dy=Math.sin(introElapsed*20)*1.4;motion.rotation=Math.sin(introElapsed*14)*.009;}
    if (moving) {
      const weight = Math.min(1, Math.abs(f.vx) / stats[f.kind].speed);
      const step = Math.sin(f.walkPhase * Math.PI / 2);
      const lift = (1 - Math.cos(f.walkPhase * Math.PI)) * .5;
      motion.dy -= lift * 2.6 * weight;
      motion.rotation = (step * .014 - f.vx / 18000) * weight;
      motion.scaleX += lift * .009 * weight;
      motion.scaleY -= lift * .008 * weight;
    } else if (f.grounded) {
      const breath = Math.sin(f.animClock * 3.7);
      motion.dy -= 1.4 + breath * 1.15;
      motion.scaleX -= breath * .01;
      motion.scaleY += breath * .014;
    }
  }

  if (!f.grounded && f.action === "idle") {
    const lift = Math.min(1, Math.abs(f.vy) / stats[f.kind].jump);
    motion.scaleY += .035 * lift;
    motion.scaleX -= .018 * lift;
    motion.rotation -= Math.max(-.045, Math.min(.045, f.vx / 5000));
  }
  if (f.crouching && (f.guarding || f.action === "block") && !["linares","gabriel","fernando"].includes(f.kind)) {
    motion.scaleY = .69;
    motion.scaleX = 1.04;
  }
  if (f.guarding) {
    motion.rotation = f.facing * .025;
    motion.dx -= f.facing * (2 + f.guardFlash * 22);
  }

  const wave = Math.sin(Math.PI * progress);
  const elapsed = f.actionDuration - f.actionTime;
  const move = f.moveSpec;
  const windup = move ? Math.sin(Math.PI * Math.min(1, elapsed / move.startup)) : 0;
  const extension = move ? smoothstep((elapsed - move.startup * .45) / (move.startup * .55))
    * (1 - smoothstep((elapsed - move.startup - move.active) / move.recovery)) : 0;
  if (f.action === "uppercut") {
    const rise = uppercutRise(f);
    motion.dx += f.facing * (10 * rise - 3 * windup);
    motion.rotation -= f.facing * .035 * rise;
    motion.scaleY = .80 + .20 * rise;
    motion.scaleX = 1.03 - .03 * rise;
  } else if (f.action === "punch") {
    motion.dx += f.facing * (-5 * windup + 15 * extension);
    motion.rotation += f.facing * (.018 * windup - .038 * extension);
    motion.scaleX += .035 * extension;
    motion.scaleY -= .02 * extension;
  } else if (f.action === "kick") {
    motion.dx += f.facing * (-3 * windup + 10 * extension);
    motion.dy -= 6 * extension;
    motion.rotation += f.facing * (.025 * windup - .06 * extension);
    motion.scaleX += .035 * extension;
    motion.scaleY -= .02 * extension;
    if(f.kickStyle==="airKick") {motion.rotation=0;motion.dx=f.facing*4*extension;motion.dy=0;}
    if(f.kickStyle==="volley") {motion.scaleX *= 1-.24*Math.sin(progress*Math.PI*2)**2;motion.rotation+=f.facing*.08*wave;}
  } else if (f.action === "special") {
    motion.dx += f.facing * (-4 * windup + 7 * extension);
    motion.rotation += f.facing * (.018 * windup - .022 * extension);
    motion.scaleY += .015 * extension;
  } else if (f.action === "hit") {
    motion.dx -= f.facing * 11 * wave;
    motion.rotation -= f.facing * .095 * wave;
    motion.scaleX -= .04 * wave;
    motion.scaleY += .025 * wave;
  }

  if (f.landingSquash > 0) {
    const impact = f.landingSquash / .16;
    motion.scaleX += .09 * impact;
    motion.scaleY -= .12 * impact;
    motion.dy += 3 * impact;
  }

  return motion;
}

function lerp(a, b, amount) { return a + (b - a) * amount; }

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function updateAnimation(f, dt) {
  const animation = f.animation;
  const pose = poseFor(f);
  if (animation.facing !== f.facing || isVanished(f)) {
    animation.pose = animation.fromPose = pose;
    animation.mix = animation.prevMix = 1;
    animation.facing = f.facing;
  } else if (pose !== animation.pose) {
    animation.fromPose = animation.mix >= .5 ? animation.pose : animation.fromPose;
    animation.pose = pose;
    animation.mix = animation.prevMix = 0;
    // Brief transitions retain crisp strikes while easing steps and stance changes.
    animation.duration = roundIntroPose(f)!==null ? .12 : f.action === "hit" ? .018 : f.action === "idle" ? .065 : .035;
  }
  animation.mix = Math.min(1, animation.mix + dt / animation.duration);
  const target = fighterMotion(f);
  const follow = 1 - Math.exp(-(f.action === "hit" ? 65 : 42) * dt);
  for (const key of Object.keys(target)) animation.motion[key] = f.action==="roll" ? target[key] : lerp(animation.motion[key], target[key], follow);
}

function renderedFighter(f) {
  const animation = f.animation;
  if(f.concreteHold>0)return {kind:f.kind,x:lerp(f.prevX,f.x,renderAlpha),y:lerp(f.prevY,f.y,renderAlpha),facing:f.facing,pose:f.concretePose,fromPose:f.concretePose,mix:1,concrete:true,motion:{dx:0,dy:0,scaleX:1,scaleY:1,rotation:0}};
  const motion = {};
  for (const key of Object.keys(animation.motion)) {
    motion[key] = lerp(animation.prevMotion[key], animation.motion[key], renderAlpha);
  }
  return { kind: f.kind, mustacheAway: f.mustacheAway, x: lerp(f.prevX, f.x, renderAlpha), y: lerp(f.prevY, f.y, renderAlpha),
    facing: f.facing, pose: animation.pose, fromPose: animation.fromPose,
    mix: smoothstep(lerp(animation.prevMix, animation.mix, renderAlpha)), motion };
}

function drawMotionLines(f, motion) {
  const progress = actionProgress(f);
  if (f.action === "uppercut" && progress > .15 && progress < .75) {
    ctx.save();
    ctx.translate(f.x + motion.dx, f.y - 120 * FIGHTER_SCALE);
    ctx.scale(f.facing * FIGHTER_SCALE, FIGHTER_SCALE);
    ctx.strokeStyle = powerColor(f.kind);
    ctx.globalAlpha = .65 * Math.sin(Math.PI * progress);
    ctx.lineCap = "round";
    for (const [radius, width] of [[72, 5], [83, 2]]) {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 1.15, 0, -.1 - smoothstep(progress / .6) * 1.4, .7, false);
      ctx.stroke();
    }
    ctx.restore();
  }
  const active = (f.action === "kick" && progress > .16 && progress < .78)
    || (f.action === "punch" && progress > .2 && progress < .65);

  if (active) {
    ctx.save();
    ctx.globalAlpha = .28 * Math.sin(Math.PI * progress);
    ctx.strokeStyle = f.kind === "sergio" ? "#ffe165" : f.kind === "tunki" ? "#ff88ce" : "#8fe5ff";
    ctx.lineCap = "square";
    for (let i = 0; i < 4; i++) {
      const y = f.y - (55 + i * 18) * FIGHTER_SCALE + motion.dy;
      const front = f.x + motion.dx - f.facing * (34 + i * 5);
      ctx.lineWidth = 5 - i * .7;
      ctx.beginPath();
      ctx.moveTo(front, y);
      ctx.lineTo(front - f.facing * (42 + i * 13), y + i * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (f.action === "kick") {
      ctx.save();
      ctx.translate(f.x + motion.dx, f.y - (f.kickStyle==="airKick" ? 52 : f.lowAttack ? 28 : 88) * FIGHTER_SCALE);
      ctx.scale(f.facing, 1);
      ctx.globalAlpha = .5 * Math.sin(Math.PI * progress);
      ctx.strokeStyle = powerColor(f.kind);
      ctx.lineCap = "round";
      for (const [radius, width] of [[64, 5], [76, 2]]) {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * FIGHTER_SCALE, radius * .72 * FIGHTER_SCALE, -.35, -1.35, .1 + progress * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  if (f.action === "special" && progress > .1 && progress < .72) {
    ctx.save();
    ctx.globalAlpha = .34;
    ctx.strokeStyle = f.kind === "blotta" || f.kind === "marechal" ? "#69dbff" : f.kind === "tunki" ? "#ff88ce" : "#ffbf3d";
    ctx.lineWidth = 3;
    const radius = 48 + Math.sin(progress * Math.PI * 5) * 8;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y - 82 * FIGHTER_SCALE, radius * FIGHTER_SCALE, radius * .68 * FIGHTER_SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(f.x + f.facing * 52 * FIGHTER_SCALE, f.y - 143 * FIGHTER_SCALE);
    const charge = Math.sin(Math.PI * Math.min(1, progress / .72));
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 32);
    glow.addColorStop(0, powerColor(f.kind));
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.globalAlpha = charge * .65;
    ctx.fillRect(-32, -32, 64, 64);
    ctx.fillStyle = "#fff6dc";
    for (let i = 0; i < 4; i++) {
      const angle = stageTime * 12 + i * Math.PI / 2;
      const radius = 22 - charge * 10;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (f.kind === "marechal" && f.action === "special" && progress > .12 && progress < .78) {
    ctx.save();
    ctx.translate(f.x + f.facing * 51 * FIGHTER_SCALE, f.y - 143 * FIGHTER_SCALE);
    ctx.scale(f.facing * FIGHTER_SCALE, FIGHTER_SCALE);
    ctx.strokeStyle = "#c5f4ff";
    ctx.shadowColor = "#219cff";
    ctx.shadowBlur = 9;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-17, side * 12);
      ctx.lineTo(-6, side * (20 + Math.sin(stageTime * 35) * 4));
      ctx.lineTo(0, side * 5);
      ctx.lineTo(10, side * 15);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function spriteFrame(frame) {
  if(["angel", "primitivo", "peluche", "tren", "linares", "gabriel", "fernando", "galante", "padrino", "paula", "jairo"].includes(frame.kind)) return atlasSpriteFrame(frame);
  if(frame.pose===13 || frame.pose===14)return classicKickFrame(frame);
  if (frame.kind === "flor") return florSpriteFrame(frame);
  if (frame.kind === "facu") return facuSpriteFrame(frame);
  const key = frame.kind + ":" + frame.pose;
  if (spriteFrames.has(key)) return spriteFrames.get(key);
  const uppercut = frame.pose === 12;
  const movement = frame.pose >= 6 && !uppercut;
  const image = uppercut ? assets.uppercuts : assets[frame.kind + (movement ? "Motion" : "")];
  if (!image.complete || !image.naturalWidth) return null;
  const pose = uppercut ? roster.indexOf(frame.kind) : frame.pose % 6;
  const cell = 270;
  const surface = document.createElement("canvas");
  surface.width = surface.height = cell;
  const paint = surface.getContext("2d");
  const baseline = uppercut || movement || frame.kind !== "blotta" ? 260 : (pose === 4 ? 265 : 269);
  const columns = uppercut ? 2 : 3;
  paint.drawImage(image, (pose % columns) * cell, Math.floor(pose / columns) * cell, cell, cell, 0, 260 - baseline, cell, cell);
  // Stage lighting is applied once, preserving every original silhouette and detail.
  paint.globalCompositeOperation = "source-atop";
  const light = paint.createLinearGradient(0, 0, cell * .4, cell);
  light.addColorStop(0, "rgba(255,244,218,.12)");
  light.addColorStop(.45, "rgba(255,235,210,.025)");
  light.addColorStop(1, "rgba(10,21,40,.11)");
  paint.fillStyle = light;
  paint.fillRect(0, 0, cell, cell);
  spriteFrames.set(key, surface);
  return surface;
}

function blendedSprite(frame) {
  const current = spriteFrame(frame);
  if (!current || frame.mix == null || frame.mix >= 1 || frame.fromPose === frame.pose) return current;
  const previous = spriteFrame({ kind: frame.kind, pose: frame.fromPose, mustacheAway: frame.mustacheAway });
  if (!previous) return current;
  let surface = poseBlendSurfaces.get(frame.kind);
  if (!surface) {
    surface = document.createElement("canvas");
    surface.width = surface.height = 270;
    poseBlendSurfaces.set(frame.kind, surface);
  }
  const paint = surface.getContext("2d");
  paint.clearRect(0, 0, 270, 270);
  paint.globalCompositeOperation = "source-over";
  paint.globalAlpha = 1 - frame.mix;
  paint.drawImage(previous, 0, 0);
  // Premultiplied blending keeps shared opaque pixels solid during a transition.
  paint.globalCompositeOperation = "lighter";
  paint.globalAlpha = frame.mix;
  paint.drawImage(current, 0, 0);
  paint.globalAlpha = 1;
  paint.globalCompositeOperation = "source-over";
  return surface;
}

// The generated sheet has clean-shaven faces. The detachable piece is composited
// into each pose before blending, so it follows crouches, hits and jumps exactly.
// Full silhouettes include the hockey stick in every pose.
const CLASSIC_KICK_FRAMES = {
 facu: [[60,16,520,536,285,124],[662,13,563,562,850,114]],
 flor: [[18,585,551,558],[600,586,627,616]],
 sergio: [[61,15,397,339],[576,18,413,359]],
 blotta: [[69,385,409,348],[568,389,418,381]],
 tunki: [[50,747,435,369],[563,770,430,377]],
 marechal: [[35,1126,451,374],[566,1148,430,383]]
};
function classicKickFrame(frame) {
  const key="classic:"+frame.kind+":"+frame.pose+":"+!!frame.mustacheAway;
  if(spriteFrames.has(key))return spriteFrames.get(key);
  const second=["facu","flor"].includes(frame.kind),image=assets[second?"kicksB":"kicksA"];
  if(!image.complete || !image.naturalWidth)return null;
  const rect=CLASSIC_KICK_FRAMES[frame.kind][frame.pose-13], [x,y,w,h]=rect;
  const surface=document.createElement("canvas");surface.width=surface.height=270;
  const paint=surface.getContext("2d"),scale=frame.kind==="flor" ? .37 : second ? .40 : .57;
  paint.imageSmoothingEnabled=false;
  paint.drawImage(image,x,y,w,h,135-w*scale/2,260-h*scale,w*scale,h*scale);
  clearSheetMatte(paint);
  if(frame.kind==="facu" && !frame.mustacheAway){
    const [mx,my]=rect.slice(4);drawMustache(paint,135+(mx-x-w/2)*scale,260+(my-y-h)*scale,22,0);
  }
  if(frame.kind==="blotta"){
    const mirrored=document.createElement("canvas");mirrored.width=mirrored.height=270;
    const brush=mirrored.getContext("2d");brush.translate(270,0);brush.scale(-1,1);brush.drawImage(surface,0,0);
    spriteFrames.set(key,mirrored);return mirrored;
  }
  spriteFrames.set(key,surface);return surface;
}
const FLOR_FRAMES = [
 [32,16,300,339], [405,12,313,343], [725,5,379,350], [1112,31,286,324],
 [37,407,416,308], [450,405,304,309], [786,367,250,348], [1157,370,252,345],
 [41,827,342,248], [409,724,302,352], [810,724,280,276], [1080,723,342,354]
];
function florSpriteFrame(frame) {
  const pose=frame.pose===12?11:Math.min(10,frame.pose),key="flor:"+pose;
  if(spriteFrames.has(key))return spriteFrames.get(key);
  const image=assets.flor;if(!image.complete || !image.naturalWidth)return null;
  const surface=document.createElement("canvas");surface.width=surface.height=270;
  const paint=surface.getContext("2d"),[x,y,w,h]=FLOR_FRAMES[pose];
  paint.imageSmoothingEnabled=false;
  paint.drawImage(image,x,y,w,h,135-w*.31,260-h*.62,w*.62,h*.62);
  clearSheetMatte(paint);spriteFrames.set(key,surface);return surface;
}
const FACU_FRAMES = [
  [32,10,284,354,197,85,0], [377,14,324,349,545,89,0],
  [734,3,379,359,832,72,0], [1168,25,259,335,1251,86,-.2],
  [12,378,352,339,175,456,0], [372,475,343,239,489,543,0],
  [776,367,240,345,915,433,0], [1161,368,243,342,1300,434,0],
  [46,833,232,236,197,910,0], [407,727,265,348,548,803,0],
  [785,716,210,292,927,783,0], [1187,708,170,377,1275,807,-.25]
];
function facuPose(pose) { return pose === 12 ? 11 : Math.min(10, pose); }
function facuFace(pose) {
  if(pose===13 || pose===14){
    const [x,y,w,h,mx,my]=CLASSIC_KICK_FRAMES.facu[pose-13];
    return {x:135+(mx-x-w/2)*.4,y:260+(my-y-h)*.4,angle:0};
  }
  const [x,y,w,h,mx,my,angle] = FACU_FRAMES[facuPose(pose)];
  return {x:135+(mx-x-w/2)*.66, y:260+(my-y-h)*.66, angle};
}
function drawMustache(paint, x, y, width, angle = 0) {
  paint.save(); paint.translate(x,y); paint.rotate(angle); paint.scale(width/40,width/40);
  paint.fillStyle="#1c0e0b"; paint.beginPath();
  paint.moveTo(0,-2); paint.bezierCurveTo(-7,-9,-12,4,-20,-5);
  paint.bezierCurveTo(-21,9,-6,12,0,3); paint.bezierCurveTo(6,12,21,9,20,-5);
  paint.bezierCurveTo(12,4,7,-9,0,-2); paint.fill();
  paint.strokeStyle="#69402a"; paint.lineWidth=1.6; paint.beginPath();
  paint.moveTo(-17,1);paint.quadraticCurveTo(-9,6,-2,0);
  paint.moveTo(2,0);paint.quadraticCurveTo(9,6,17,1);paint.stroke();paint.restore();
}
function clearSheetMatte(paint) {
  const pixels=paint.getImageData?.(0,0,270,270);
  if (!pixels?.data) return; // lightweight headless rendering adapter
  const data=pixels.data, seen=new Uint8Array(270*270), queue=[];
  const visit=index=>{
    if(seen[index])return;seen[index]=1;const n=index*4;
    const hi=Math.max(data[n],data[n+1],data[n+2]),lo=Math.min(data[n],data[n+1],data[n+2]);
    if(data[n+3]===0 || (lo>170 && hi-lo<24)){queue.push(index);data[n+3]=0;}
  };
  for(let n=0;n<270;n++){visit(n);visit(269*270+n);visit(n*270);visit(n*270+269);}
  for(let k=0;k<queue.length;k++){const n=queue[k],x=n%270,y=Math.floor(n/270);if(x)visit(n-1);if(x<269)visit(n+1);if(y)visit(n-270);if(y<269)visit(n+270);}
  paint.putImageData(pixels,0,0);
}
function facuSpriteFrame(frame) {
  const pose=facuPose(frame.pose), key="facu:"+pose+":"+!!frame.mustacheAway;
  if(spriteFrames.has(key))return spriteFrames.get(key);
  const image=assets.facu;if(!image.complete || !image.naturalWidth)return null;
  const surface=document.createElement("canvas");surface.width=surface.height=270;
  const paint=surface.getContext("2d"),[x,y,w,h]=FACU_FRAMES[pose];
  paint.imageSmoothingEnabled=false;
  paint.drawImage(image,x,y,w,h,135-w*.33,260-h*.66,w*.66,h*.66);
  clearSheetMatte(paint);
  if(!frame.mustacheAway){const face=facuFace(frame.pose);drawMustache(paint,face.x,face.y,22,face.angle);}
  spriteFrames.set(key,surface);return surface;
}
function facuMouth(f) {
  const face=facuFace(poseFor(f)), size=stats.facu.size*FIGHTER_SCALE/270;
  const motion=fighterMotion(f),flip=f.facing===stats.facu.defaultFace?1:-1;
  const x=(face.x-135)*size*flip*motion.scaleX, y=(face.y-260)*size*motion.scaleY;
  return {x:f.x+motion.dx+x*Math.cos(motion.rotation)-y*Math.sin(motion.rotation),y:f.y+motion.dy+x*Math.sin(motion.rotation)+y*Math.cos(motion.rotation)};
}
function spawnBoomerang(owner) {
  if(owner.mustacheAway)return;
  const mouth=facuMouth(owner),sound=owner.attackSound || startCombatSound("boomerang");
  owner.attackSound=null;owner.mustacheAway=true;
  projectiles.push({owner,style:"boomerang",sound,x:mouth.x,y:mouth.y,prevX:mouth.x,prevY:mouth.y,
    vx:owner.facing*500,vy:0,damage:powerDamage(owner),radius:19,life:6,age:0,returning:false,contactDone:false,
    spin:0,prevSpin:0,trailTime:0,trail:[]});
}
function catchBoomerang(p) {
  p.owner.mustacheAway=false;stopCombatSound(p.sound);
  const index=projectiles.indexOf(p);if(index>=0)projectiles.splice(index,1);
}
function updateBoomerang(p,dt) {
  p.age+=dt;p.life-=dt;p.spin+=dt*18;
  const mouth=facuMouth(p.owner);
  const edge=p.vx<0?Math.max(STAGE_LEFT,cameraX)+p.radius:Math.min(STAGE_RIGHT,cameraX+VIEW_WIDTH)-p.radius;
  if(!p.returning && (p.vx<0?p.x<=edge:p.x>=edge))p.returning=true;
  if(p.returning){
    const dx=mouth.x-p.x,dy=mouth.y-p.y,distance=Math.hypot(dx,dy),speed=690;
    if(distance<=speed*dt+8 || p.life<=0){catchBoomerang(p);return;}
    p.vx=dx/distance*speed;p.vy=dy/distance*speed;
  }
  p.x=p.returning?p.x+p.vx*dt:p.vx<0?Math.max(edge,p.x+p.vx*dt):Math.min(edge,p.x+p.vx*dt);p.y+=p.vy*dt;
  p.trailTime-=dt;
  if(p.trailTime<=0){p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>9)p.trail.pop();p.trailTime=.025;}
  const target=p.owner===player?cpu:player;
  const box={left:p.x-p.radius,right:p.x+p.radius,top:p.y-p.radius,bottom:p.y+p.radius};
  if(!p.contactDone && !isVanished(target) && target.invuln<=0 && overlaps(box,hurtBox(target))){
    p.contactDone=true;p.returning=true;
    hit(target,p.damage,Math.sign(p.vx)*180,0,p.owner,{direction:Math.sign(p.vx),sourceX:p.x-Math.sign(p.vx)*p.radius,projectile:true,low:false,x:p.x,y:p.y});
    burst(p.x,p.y,"#ffe47a",10);
  }
}

function drawSpriteFrame(frame, alpha = 1, ghost = false) {
  const sprite = frame.concrete ? concreteSprite(frame) : blendedSprite(frame);
  if (!sprite) return;
  const cell = 270;
  const size = stats[frame.kind].size * FIGHTER_SCALE;
  const needsFlip = frame.facing !== stats[frame.kind].defaultFace;
  const motion = frame.motion;

  ctx.save();
  ctx.translate(frame.x + motion.dx, frame.y + motion.dy);
  ctx.rotate(motion.rotation);
  ctx.scale((needsFlip ? -1 : 1) * motion.scaleX * (stats[frame.kind].bodyWidth || 1), motion.scaleY);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = mobileRendering ? "low" : "high";
  if (ghost) ctx.globalCompositeOperation = "screen";
  else if (!mobileRendering) {
    ctx.shadowColor = "rgba(4,10,22,.65)";
    ctx.shadowBlur = 1.5 * drawingScale;
    ctx.shadowOffsetY = drawingScale;
  }
  ctx.drawImage(sprite, -size / 2, -size * 260 / cell, size, size);
  ctx.restore();
}

function drawAfterimage(ghost) {
  drawSpriteFrame(ghost, (ghost.life / ghost.maxLife) * .16, true);
}

function drawLowerLoadCue(f,frame) {
  const elapsed=f.actionDuration-f.actionTime;
  const x=frame.x-f.facing*43*FIGHTER_SCALE;
  const y=frame.y-67*FIGHTER_SCALE;
  ctx.save();
  ctx.strokeStyle="#ffe57c";
  ctx.lineWidth=2;
  ctx.globalAlpha=.7;
  ctx.beginPath();
  ctx.ellipse(x,y,15*FIGHTER_SCALE,5*FIGHTER_SCALE,0,elapsed*18,elapsed*18+Math.PI*1.4);
  ctx.stroke();
  ctx.restore();
}

function drawFighter(f) {
  const frame = renderedFighter(f);
  if (workCinematic?.target === f && workCinematic.owner.kind === "angel" && !f.guarding && !workCinematic.blocked) frame.y -= workHookLift(workCinematic.elapsed);
  const { motion, x, y } = frame;
  drawMotionLines({ ...f, x, y }, motion);
  const flashing = f.flash > 0 && Math.floor(f.flash * 40) % 2 === 0;
  let opacity = flashing ? .55 : 1;
  if (f.action === "teleport") {
    const elapsed = (f.actionDuration - f.actionTime) * mobilityTempo(f);
    opacity *= elapsed < .16 ? 1 - elapsed / .16 : elapsed < .45 ? 0 : Math.min(1, (elapsed - .45) / .18);
  }
  if(f.kind==="tren" && f.action==="roll"){
    const elapsed=(f.actionDuration-f.actionTime)*mobilityTempo(f);
    opacity*=elapsed<.08?1-elapsed/.08:elapsed<.34?0:Math.min(1,(elapsed-.34)/.07);
    if(elapsed>.025 && elapsed<.4){
      const centerY=y-100;
      const origin=f.rollStartX ?? x;
      const trailX=elapsed<.34?x:origin+(x-origin)*.65;
      drawElectricArc(origin,centerY-12,trailX,centerY+7,elapsed,1.45,1);
      drawElectricArc(x-11,centerY-25,x+14,centerY+24,elapsed,1.2,2);
    }
  }
  drawSpriteFrame(frame, opacity);
  if(f.kind==="angel" && f.action==="special" && !workCinematic) drawLowerLoadCue(f,frame);
  if(f.kind === "galante") drawGalanteProps(f, frame, opacity);
  if(f.kind === "paula") drawWaterCharge(f);
  if(f.kind === "peluche") drawConcreteCharge(f);
  if(f.kind === "tren") drawVoltaicCharge(f,frame);
  if(f.kind==="fernando" && workCinematic?.owner!==f)drawSmokingFernando(f,frame);
  if(f.fernandoBurn>0)drawFernandoBurn(f,frame);
  if(f.electricCoat>0) drawElectricCoat(f,frame);
  if(f.concreteCoat>0) drawConcreteCoat(f,frame);
  if (f.guarding || f.guardFlash > 0) {
    ctx.save();
    ctx.globalAlpha = .35 + f.guardFlash * 2;
    ctx.strokeStyle = "#8ddfff";
    ctx.lineWidth = f.guardFlash > 0 ? 4 : 2;
    ctx.beginPath();
    const centerY = y - (f.crouching ? 72 : 136) * FIGHTER_SCALE;
    ctx.arc(x + f.facing * 20 * FIGHTER_SCALE, centerY, 35 * FIGHTER_SCALE, f.facing > 0 ? -1.2 : Math.PI - 1.2, f.facing > 0 ? 1.2 : Math.PI + 1.2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawProjectileTrail(p) {
  if (["water", "critical", "crash", "beam", "forklift", "concrete", "voltaic", "cable"].includes(p.style)) return;
  if (!p.trail || p.trail.length < 2) return;
  const x = lerp(p.prevX, p.x, renderAlpha);
  const y = lerp(p.prevY, p.y, renderAlpha);
  const tail = p.trail[p.trail.length - 1];
  const tint = powerColor(p.owner.kind);
  ctx.save();
  const gradient = ctx.createLinearGradient(tail.x, tail.y, x, y);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, tint);
  ctx.strokeStyle = gradient;
  ctx.lineCap = "round";
  for (const [width, alpha] of [[23, .16], [10, .28], [3, .65]]) {
    ctx.lineWidth = width * FIGHTER_SCALE;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(x, y);
    p.trail.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectile(p) {
  if(p.style==="cigarettes") {drawCigarettes(p);return;}
  if(p.style==="cable") {drawCable(p);return;}
  if(p.style==="voltaic") {drawVoltaic(p);return;}
  if(p.style==="concrete") { drawConcrete(p); return; }
  if (["beam","forklift"].includes(p.style)) { drawWorkProjectile(p); return; }
  if (["critical", "crash"].includes(p.style)) { drawSchedule(p); return; }
  if (p.style === "water") { drawWaterJet(p); return; }
  ctx.save();
  ctx.translate(lerp(p.prevX, p.x, renderAlpha), lerp(p.prevY, p.y, renderAlpha));
  ctx.scale(FIGHTER_SCALE, FIGHTER_SCALE);
  ctx.rotate(p.style === "dog" || p.style === "ki" || p.style === "lightning" ? 0 : lerp(p.prevSpin, p.spin, renderAlpha) * Math.sign(p.vx));
  if (p.style === "dog") {
    ctx.scale(Math.sign(p.vx) || 1, 1);
    ctx.shadowColor = "#ff902e"; ctx.shadowBlur = 8 * drawingScale;
    if (assets.dachshund.complete && assets.dachshund.naturalWidth) ctx.drawImage(assets.dachshund, -39, -19, 78, 38);
  } else if (p.style === "hockey") {
    ctx.shadowColor = "#d8ff82"; ctx.shadowBlur = 9 * drawingScale;
    ctx.fillStyle = "#8994aa"; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fafbff"; ctx.beginPath(); ctx.arc(-2,-2,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#c6cedc";
    for (const [x,y] of [[-4,-4],[3,-5],[-5,3],[3,3]]) ctx.fillRect(x,y,2,2);
  } else if (p.style === "boomerang") {
    ctx.shadowColor = "#ffe171"; ctx.shadowBlur = 9 * drawingScale;
    drawMustache(ctx, 0, 0, 54, 0);
  } else if (p.style === "lightning") {
    ctx.scale(Math.sign(p.vx) || 1, 1);
    ctx.lineJoin = "miter";
    ctx.shadowColor = "#139bff";
    ctx.shadowBlur = 14 * drawingScale;
    const flicker = Math.sin(stageTime * 55) * 4;
    for (const [width, color] of [[9, "#1584f0"], [5, "#76dfff"], [2, "#ffffff"]]) {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(-67, -5);
      ctx.lineTo(-47, 8 + flicker);
      ctx.lineTo(-37, -9);
      ctx.lineTo(-21, 6 - flicker);
      ctx.lineTo(-9, -6);
      ctx.lineTo(15, 0);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#bef4ff";
    ctx.beginPath();
    ctx.moveTo(-38, -8);
    ctx.lineTo(-44, -20);
    ctx.lineTo(-54, -16);
    ctx.moveTo(-19, 5);
    ctx.lineTo(-31, 20);
    ctx.lineTo(-43, 15);
    ctx.stroke();
  } else if (p.style === "ki") {
    const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 31);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(.3, "#75e4ff");
    glow.addColorStop(.7, "#167ceb");
    glow.addColorStop(1, "rgba(15,70,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -34, 68, 68);
    ctx.strokeStyle = "#bdf6ff";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(stageTime * 18)*2, 0, Math.PI*2); ctx.stroke();
  } else if (p.style === "flowers") {
    // Pixel flowers share one bouquet-shaped projectile and shed petals on impact.
    for (const [x, y, color] of [[-10, -8, "#ff4fa0"], [11, -3, "#ffb8e5"], [0, 12, "#ec4adc"]]) {
      ctx.fillStyle = "#12391c";
      ctx.fillRect(x - 3, y, 6, 19);
      ctx.fillStyle = "#74cc55";
      ctx.fillRect(x, y + 8, 10, 4);
      ctx.fillStyle = "#582345";
      ctx.fillRect(x - 13, y - 7, 26, 14);
      ctx.fillRect(x - 7, y - 13, 14, 26);
      ctx.fillStyle = color;
      ctx.fillRect(x - 11, y - 5, 22, 10);
      ctx.fillRect(x - 5, y - 11, 10, 22);
      ctx.fillStyle = "#ffe876";
      ctx.fillRect(x - 4, y - 4, 8, 8);
    }
  } else if (p.style === "meat") {
    // Grilled strips use the same drawn style on every browser, including phones.
    ctx.fillStyle = "#321713";
    ctx.beginPath(); ctx.moveTo(-27, -10); ctx.lineTo(-10, -15); ctx.lineTo(28, -6); ctx.lineTo(25, 9); ctx.lineTo(7, 14); ctx.lineTo(-28, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#bd673b";
    ctx.beginPath(); ctx.moveTo(-24, -8); ctx.lineTo(-10, -11); ctx.lineTo(24, -4); ctx.lineTo(21, 6); ctx.lineTo(7, 10); ctx.lineTo(-24, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#542317"; ctx.lineWidth = 3;
    for (let x = -16; x < 24; x += 9) { ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x - 4, 7); ctx.stroke(); }
    ctx.strokeStyle = "#efb673"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, 3); ctx.lineTo(8, 9); ctx.lineTo(23, 4); ctx.stroke();
  } else {
    ctx.fillStyle = "#111d12";
    ctx.fillRect(-6, -28, 12, 17);
    ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-13, -6); ctx.lineTo(-13, 27); ctx.lineTo(13, 27); ctx.lineTo(13, -6); ctx.lineTo(6, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#315b31"; ctx.fillRect(-9, -4, 18, 27);
    ctx.fillStyle = "#ab8b49"; ctx.fillRect(-6, -29, 12, 6);
    ctx.fillStyle = "#f1d9a0"; ctx.fillRect(-10, 3, 20, 13);
    ctx.fillStyle = "#9f292c"; ctx.fillRect(-10, 3, 20, 3);
    ctx.fillStyle = "#32442a"; ctx.fillRect(-7, 9, 14, 2); ctx.fillRect(-5, 12, 10, 2);
    ctx.fillStyle = "#bad296"; ctx.fillRect(-7, -6, 2, 7);
  }
  ctx.restore();
}

function drawParticle(p) {
  ctx.save();
  const x = lerp(p.prevX ?? p.x, p.x, renderAlpha);
  const y = lerp(p.prevY ?? p.y, p.y, renderAlpha);
  ctx.globalAlpha = Math.min(1, p.life * 4);
  ctx.fillStyle = p.color;
  if (p.smoke) {
    const age = 1 - p.life / p.maxLife;
    ctx.globalAlpha = Math.min(1, p.life * 4) * .72;
    const radius = p.size * (.6 + age * .8);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.arc(x + radius * .6, y + radius * .2, radius * .68, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.debris) {
    ctx.fillRect(x,y,p.size,p.size);
    ctx.fillStyle="#f1deb0";
    ctx.fillRect(x,y,Math.max(1,p.size*.4),Math.max(1,p.size*.3));
  } else if (p.spark) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, p.size * .6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * .025, y - p.vy * .025); ctx.stroke();
  } else ctx.fillRect(x, y, p.size, p.size);
  ctx.restore();
}

function updateHud() {
  if (!player || !cpu) return;
  for(const [node,value] of [[ui.leftHealth,player.health],[ui.rightHealth,cpu.health],[ui.leftPower,player.power],[ui.rightPower,cpu.power]])hudValue(node.style,"width",`${value}%`);
  hudValue(ui.timer,"textContent",String(Math.ceil(roundTime)).padStart(2,"0"));
  hudValue(hudNodes.leftScore,"textContent",String(match.scores?.[0]||0).padStart(6,"0"));
  hudValue(hudNodes.rightScore,"textContent",String(match.scores?.[1]||0).padStart(6,"0"));
  hudValue(hudNodes.roundLabel,"textContent",ROUND_AUDIO[match.round].title+" · "+match.playerWins+" — "+match.cpuWins);
  hudValue(hudNodes.campaignStatus,"hidden",!campaign);
  hudValue(hudNodes.campaignStatus,"textContent",campaign?"RIVAL "+(campaign.index+1)+"/"+campaign.opponents.length+" · "+difficulty().name+" · "+(campaign.extraLives+1)+((campaign.extraLives+1)===1?" VIDA":" VIDAS")+" · PUNTOS ×"+(1+campaign.index*.25):"");
  hudNodes.leftRounds.forEach((dot,index)=>hudClass(dot,"won",index<match.playerWins));
  hudNodes.rightRounds.forEach((dot,index)=>hudClass(dot,"won",index<match.cpuWins));
  const controlled=online?.guest?cpu:player;
  const powerCost=roster.includes(controlled.kind)?(fighterInput(controlled).down?100:30):controlled.kind==="jairo"&&held.down?45:35;
  hudClass(hudNodes.special,"ready",controlled.power>=powerCost&&controlled.specialCooldown===0&&!controlled.mustacheAway);
  hudClass(ui.abilityBtn,"ready",controlled.power>=30&&controlled.specialCooldown===0);
  hudClass(hudNodes.ability2,"ready",cpu.power>=30&&cpu.specialCooldown===0);
}

function setPauseUI(paused) {
  if (paused) updatePauseGuide();
  ui.pauseBtn.textContent = paused ? "SEGUIR" : "PAUSA";
  ui.pauseBtn.classList.toggle("resume", paused);
  ui.pauseBtn.setAttribute("aria-label", paused ? "Reanudar juego" : "Pausar juego");
  ui.gameScreen.classList.toggle("paused", paused);
  document.getElementById("pauseMenu").hidden = !paused;
  document.getElementById("pauseHelp").hidden = !paused;
}

function togglePause(remote = false) {
  if (online?.active && remote !== true) { online.pause(state !== "paused"); return; }
  if (state === "playing" || state === "intro" || state === "roundOver" || (state === "finished" && match.nextOpponent)) {
    pauseFrom = state;
    state = "paused";
    stopRoundVoice();
    suspendCombatSounds();
    pauseMusic();
    clearHeld();
    fighters.forEach(f => { f.queuedAction = null; });
    setPauseUI(true);
    ui.announcement.classList.remove("show");
    document.getElementById("resumeBtn").focus?.();
  } else if (state === "paused") {
    state = pauseFrom;
    syncCombatSounds();
    syncKOAudio();
    syncMusic();
    clearHeld();
    lastTime = performance.now();
    accumulator = 0;
    setPauseUI(false);
    ui.announcement.classList.remove("show");
    if(koVoice && announcementTime>0)announce("K.O.",announcementTime*1000);
    if (state === "intro") {
      const timing = ROUND_AUDIO[match.round].timing;
      syncRoundVoice();
      if (introElapsed >= timing.fight) announce("¡PELEA!", (timing.end - introElapsed) * 1000);
      else if (introElapsed >= timing.title) announce(ROUND_AUDIO[match.round].title, Math.max(0, timing.fight - introElapsed - .15) * 1000);
    }
  }
}

function advanceGameClock(now) {
  now = Math.max(lastTime, now);
  const dt = Math.max(0, Math.min(.1, (now - lastTime) / 1000));
  lastTime = now;
  accumulator += dt;
  // Physics uses seconds everywhere; 60 steps save half the CPU work on phones.
  const step = mobileRendering ? STEP * 2 : STEP;
  while (accumulator >= step) {
    update(step);
    accumulator -= step;
  }
}

let lastHudUpdate = -Infinity;
let lastHudState = null;
function loop(now) {
  advanceGameClock(now);
  renderAlpha = online?.guest ? Math.min(1, (performance.now()-online.lastFrame)/online.renderInterval) : state === "paused" ? 1 : accumulator / (mobileRendering ? STEP * 2 : STEP);
  if(state === "tower") {
    let startPressed=false;
    try {startPressed=Array.from(navigator.getGamepads?.()||[]).some(pad=>pad?.buttons?.[9]?.pressed);} catch (_) { /* Embedded browsers can disable controllers. */ }
    if(startPressed&&!tower.startHeld)skipTournamentTower();
    tower.startHeld=startPressed;
    drawTournamentTower();
  }
  if (["intro", "playing", "paused", "roundOver", "finished", "continue"].includes(state)) {
    if (state !== "paused") draw();
    // The bars and clock need a few updates per second, not a DOM rewrite every frame.
    if (state !== "paused" && (now - lastHudUpdate >= 80 || lastHudState !== state)) {
      updateHud();
      lastHudUpdate = now;
    }
  }
  lastHudState = state;
  warmRenderFrame();
  requestAnimationFrame(loop);
}

let rosterAudioPreloaded = false;
function ensureAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  if (!audioCtx) audioCtx = new Audio();
  if (audioCtx.state === "suspended") audioCtx.resume().then(() => { syncKOAudio(); syncMusic(); }).catch(() => {});
  if (["intro", "playing", "roundOver", "finished"].includes(state)) {
    loadKOAudio();
    loadRoundVoice(match.round);
    if (!rosterAudioPreloaded) {
      // Decode current roster cues during the round intro instead of every menu tap.
      for (const name of ["punchHit", "kickHit", "uppercutHit", "bodyFall", "meleeSwing",
        "cable", "transformerSuper", "voltaic", "stormSuper", "beam", "beamImpact",
        "forklift", "forkliftImpact", "concrete", "concreteImpact",
        "hookSuper", "containerSuper", "concreteSuper", "critical", "crash", "cigarettes", "emberImpact", "fireSuper", "fireScream"]) loadCombatAudio(name);
      rosterAudioPreloaded = true;
    }
  }
  if (["title", "mode", "select", "stage"].includes(state)) loadMusic(EXTRA_AUDIO.selection);
  if (gameMode === "solo" && ["select", "stage"].includes(state)) loadMusic(EXTRA_AUDIO.tower);
  if (musicTrack) loadMusic(musicTrack);
}

function loadKOAudio() {
  if(!audioCtx || KO_AUDIO.buffer || KO_AUDIO.loading || typeof atob!=="function")return;
  KO_AUDIO.loading=Promise.resolve().then(()=>{
    const bytes=Uint8Array.from(atob(KO_AUDIO_BASE64),c=>c.charCodeAt(0));
    return audioCtx.decodeAudioData(bytes.buffer);
  }).then(buffer=>{KO_AUDIO.buffer=buffer;syncKOAudio();})
    .catch(()=>{}).finally(()=>{KO_AUDIO.loading=null;});
}

function disconnectKOAudio() {
  if(!koVoice)return;
  if(koVoice.source){koVoice.source.onended=null;try{koVoice.source.stop();}catch(_){}koVoice.source.disconnect();koVoice.source=null;}
  if(koVoice.gain){koVoice.gain.disconnect();koVoice.gain=null;}
}
function stopKOAudio(){disconnectKOAudio();koVoice=null;}
function syncKOAudio() {
  if(!koVoice || koVoice.source || muted || !["roundOver","finished"].includes(state) || !KO_AUDIO.buffer || !audioCtx || audioCtx.state!=="running")return;
  const offset=KO_AUDIO.start+koVoice.elapsed;
  const remaining=Math.min(KO_AUDIO.duration-koVoice.elapsed,KO_AUDIO.buffer.duration-offset);
  if(remaining<=0){stopKOAudio();return;}
  const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();source.buffer=KO_AUDIO.buffer;
  gain.gain.value=1.5;source.connect(gain).connect(audioCtx.destination);koVoice.source=source;koVoice.gain=gain;koVoice.started=true;
  source.start(0,offset,remaining);
}

function loadCombatAudio(name) {
  const cue = COMBAT_AUDIO[name];
  if (!audioCtx || cue.buffer || cue.loading || typeof fetch !== "function") return;
  cue.loading = fetch(cue.src)
    .then(response => { if (!response.ok) throw new Error("Combat audio unavailable"); return response.arrayBuffer(); })
    .then(bytes => audioCtx.decodeAudioData(bytes))
    .then(buffer => { cue.buffer = buffer; syncCombatSounds(); })
    .catch(() => { /* A missing sound must never interrupt combat. */ });
}

function startCombatSound(name) {
  const voice = { name, elapsed: 0, source: null, gain: null, audibleAt: null };
  voice.netId = ++onlineSoundId;
  online?.audio("combat", name, voice.netId);
  combatSounds.add(voice);
  ensureAudio();
  loadCombatAudio(name);
  syncCombatSounds();
  return voice;
}

function disconnectCombatVoice(voice) {
  if (voice.source) {
    voice.source.onended = null;
    try { voice.source.stop(); } catch (_) { /* Already stopped. */ }
    voice.source.disconnect();
    voice.source = null;
  }
  if (voice.gain) { voice.gain.disconnect(); voice.gain = null; }
}

function stopCombatSound(voice, immediate = false) {
  if (!voice) return;
  online?.audio("stop", voice.name, voice.netId);
  combatSounds.delete(voice);
  const minAudible = voice.name === "cigarettes" ? .65 : ["critical", "crash"].includes(voice.name) ? .4 : voice.name === "water" ? .4 : voice.name === "dog" ? .5 : ["lightning", "voltaic", "cable", "meat", "flowers", "boomerang", "hockey", "whip"].includes(voice.name) ? .08 : 0;
  const heard = voice.audibleAt === null ? 0 : Math.max(0, (audioCtx?.currentTime ?? voice.elapsed) - voice.audibleAt);
  if (voice.name === "water" && !immediate && voice.source && !muted && state === "playing") {
    const now=audioCtx.currentTime ?? 0,fadeStart=now+Math.max(0,.4-heard),end=fadeStart+.18;
    soundTails.add(voice);voice.source.loop=false;
    voice.gain?.gain.setValueAtTime?.(voice.gain.gain.value,fadeStart);
    voice.gain?.gain.linearRampToValueAtTime?.(0,end);
    voice.source.onended=()=>{soundTails.delete(voice);disconnectCombatVoice(voice);};
    voice.source.stop(end);return;
  }
  if (!immediate && voice.source && minAudible > heard && !muted && state === "playing") {
    // At point-blank range retain only a short attack transient, never the whole clip.
    soundTails.add(voice);
    voice.source.loop = false;
    voice.source.onended = () => { soundTails.delete(voice); disconnectCombatVoice(voice); };
    voice.source.stop((audioCtx.currentTime ?? 0) + minAudible - heard);
    return;
  }
  disconnectCombatVoice(voice);
  soundTails.delete(voice);
}

function stopFighterSound(f) {
  stopCombatSound(f.attackSound);
  f.attackSound = null;
}

function stopAllCombatSounds() {
  stopKOAudio();
  stopSynthSounds();
  projectiles = projectiles.filter(p => p.style !== "boomerang");
  for (const voice of [...combatSounds, ...soundTails]) stopCombatSound(voice, true);
  fighters.forEach(f => { f.attackSound = null; f.mustacheAway = false; });
}

function suspendCombatSounds(includeTails = true) {
  if(includeTails)disconnectKOAudio();
  if (includeTails) stopSynthSounds();
  if (includeTails) for (const voice of soundTails) stopCombatSound(voice, true);
  for (const voice of combatSounds) disconnectCombatVoice(voice);
}

function syncCombatSounds() {
  if (hitStop > 0 || muted || !audioCtx || audioCtx.state !== "running") return;
  for (const voice of combatSounds) {
    if(state !== "playing" && !(["bodyFall","fireScream"].includes(voice.name) && ["roundOver", "finished"].includes(state)))continue;
    const cue = COMBAT_AUDIO[voice.name];
    if (voice.source || !cue.buffer) continue;
    if (cue.loop === false && voice.elapsed >= Math.min(cue.end ?? cue.buffer.duration,cue.buffer.duration)-cue.start) continue;
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = cue.buffer;
    // Loops cover long flights. The owning attack ends the sound, never a timeout.
    source.loop = cue.loop !== false;
    source.loopStart = cue.start;
    source.loopEnd = Math.min(cue.end ?? cue.buffer.duration, cue.buffer.duration);
    gain.gain.value = cue.volume;
    source.connect(gain).connect(audioCtx.destination);
    voice.source = source;
    voice.gain = gain;
    voice.audibleAt = audioCtx.currentTime ?? voice.elapsed;
    source.start(0, cue.start + (cue.loop === false ? voice.elapsed : voice.elapsed % (source.loopEnd - cue.start)));
  }
}

function advanceCombatSounds(dt) {
  for (const voice of combatSounds) {
    voice.elapsed += dt;
    if(voice.name==="fireScream" && voice.elapsed>=1.25){stopCombatSound(voice,true);continue;}
    const cue=COMBAT_AUDIO[voice.name];
    if(cue.loop===false && cue.buffer && voice.elapsed>=Math.min(cue.end??cue.buffer.duration,cue.buffer.duration)-cue.start) stopCombatSound(voice,true);
  }
  syncCombatSounds();
}

function loadRoundVoice(round = match.round) {
  const cue = ROUND_AUDIO[round];
  if (!audioCtx || !cue.src || cue.loading || cue.buffer || typeof fetch !== "function") return;
  cue.loading = fetch(cue.src)
    .then(response => { if (!response.ok) throw new Error("Round audio unavailable"); return response.arrayBuffer(); })
    .then(bytes => audioCtx.decodeAudioData(bytes))
    .then(buffer => { cue.buffer = buffer; syncRoundVoice(); })
    .catch(() => { /* Keep the round playable with the synthesized cue if loading fails. */ });
}

function selectMusic(usage = "fight") {
  if (["title", "selection"].includes(usage) && musicTrack?.usage === usage) { ensureAudio(); syncMusic(); return; }
  stopMusic();
  musicTrack = usage === "title" ? EXTRA_AUDIO.title : usage === "selection" ? EXTRA_AUDIO.selection : usage === "tower" ? EXTRA_AUDIO.tower : EXTRA_AUDIO.music[Math.floor(Math.random() * EXTRA_AUDIO.music.length)];
  ensureAudio();
  syncMusic();
}

function loadMusic(track) {
  if (!track || !audioCtx || track.buffer || track.loading || typeof fetch !== "function") return track?.loading;
  if (performance.now() < (track.retryAt || 0)) return;
  track.loading = Promise.resolve().then(() => fetch(track.src)).then(response => {
    if (!response.ok) throw new Error("Music unavailable");
    return response.arrayBuffer();
  }).then(bytes => audioCtx.decodeAudioData(bytes)).then(buffer => {
    track.buffer = buffer;
    track.retryAt = 0;
  }).catch(() => {
    // A failed preload must not permanently silence later selection screens.
    track.retryAt = performance.now() + 2000;
  }).finally(() => {
    track.loading = null;
    if (track.buffer && track === musicTrack) syncMusic();
  });
  return track.loading;
}

function syncMusic() {
  const allowed = musicTrack?.usage === "title" ? ["title", "mode"] : musicTrack?.usage === "selection" ? ["select", "stage"] : musicTrack?.usage === "tower" ? ["tower"] : ["intro", "playing", "roundOver"];
  if (state === "tower" && tower?.paused)return;
  if (!allowed.includes(state) || muted || !audioCtx || audioCtx.state !== "running" || !musicTrack) return;
  if (!musicTrack.buffer) { loadMusic(musicTrack); return; }
  const volume=musicTrack.usage === "tower" ? .46 * Math.min(1,Math.max(0,(tower.duration-tower.elapsed)/.35)) : state === "intro" ? .22 : musicTrack.usage === "selection" ? .52 : .46;
  if (musicGain) musicGain.gain.value = volume;
  if (musicSource) return;
  musicSource = audioCtx.createBufferSource();
  musicGain = audioCtx.createGain();
  musicSource.buffer = musicTrack.buffer;
  musicSource.loop = true;
  musicGain.gain.value = volume;
  musicSource.connect(musicGain).connect(audioCtx.destination);
  musicSource.start(0, musicElapsed % musicTrack.buffer.duration);
  musicStartedAt = audioCtx.currentTime || 0;
}

function pauseMusic() {
  if (musicSource) {
    if (Number.isFinite(audioCtx.currentTime)) musicElapsed += Math.max(0, audioCtx.currentTime - musicStartedAt);
    try { musicSource.stop(); } catch (_) {} musicSource.disconnect(); musicSource = null;
  }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}

function stopMusic() { pauseMusic(); musicTrack = null; musicElapsed = 0; }
function advanceMusic(dt) {
  if (!Number.isFinite(audioCtx?.currentTime)) musicElapsed += dt;
  syncMusic();
}

function stopRoundVoice() {
  if (roundVoiceSource) {
    roundVoiceSource.onended = null;
    try { roundVoiceSource.stop(); } catch (_) { /* It may have just ended. */ }
    roundVoiceSource.disconnect();
    roundVoiceSource = null;
  }
  roundVoiceStarted = false;
}

function syncRoundVoice() {
  const cue = ROUND_AUDIO[match.round];
  if (state !== "intro" || muted || !audioCtx || audioCtx.state !== "running" || !cue.src || !cue.buffer || roundVoiceStarted) return;
  const offset = introElapsed - cue.timing.voice;
  if (offset < 0 || offset >= cue.buffer.duration) return;
  const source = audioCtx.createBufferSource();
  source.buffer = cue.buffer;
  source.connect(audioCtx.destination);
  source.onended = () => { source.disconnect(); if (roundVoiceSource === source) roundVoiceSource = null; };
  source.start(0, offset);
  roundVoiceSource = source;
  roundVoiceStarted = true;
}

function stopSynthSounds() {
  soundGeneration++;
  for (const voice of synthVoices) { try { voice.osc.stop(); } catch (_) {} voice.osc.disconnect(); voice.gain.disconnect(); }
  synthVoices.clear();
}

function tone(freq, duration, type = "square", volume = .045, slide = 0) {
  if (muted || state === "paused") return;
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  const voice = {osc, gain}; synthVoices.add(voice);
  osc.onended = () => { synthVoices.delete(voice); osc.disconnect(); gain.disconnect(); };
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function sfx(name) {
  online?.audio("sfx", name);
  if (muted || state === "paused") return;
  const generation = soundGeneration;
  const later = (callback, delay) => setTimeout(() => { if (generation === soundGeneration) callback(); }, delay);
  const sounds = {
    towerPan: () => { tone(110,.45,"sawtooth",.02,220);tone(220,.42,"triangle",.018,-120); },
    towerStop: () => { tone(470,.10,"triangle",.04,-300);tone(93,.18,"square",.018,-45); },
    start: () => { tone(130, .12); later(() => tone(195, .18), 110); },
    move: () => tone(290, .055, "square", .025, 70),
    confirm: () => { tone(330, .08, "square", .035); later(() => tone(660, .14, "square", .035), 70); },
    fight: () => { tone(260, .12, "sawtooth", .05, 380); later(() => tone(520, .18), 100); },
    jump: () => tone(170, .11, "square", .025, 180),
    punch: () => tone(95, .08, "sawtooth", .018, -40),
    kick: () => tone(130, .12, "sawtooth", .02, -80),
    hit: () => { tone(62, .13, "square", .03, -22); tone(145, .05, "sawtooth", .015, -80); },
    special: () => { tone(220, .23, "sawtooth", .085, 380); later(() => tone(540, .12, "square", .06, -100), 80); },
    lightning: () => { tone(960, .16, "sawtooth", .038, -720); tone(140, .2, "square", .026, 510); },
    roll: () => { tone(170, .12, "triangle", .045, -90); },
    electricEvade: () => { tone(1030,.12,"sawtooth",.035,-800);tone(410,.14,"triangle",.03,340); },
    electricEvadeLand: () => { tone(790,.09,"sawtooth",.028,-550);tone(165,.11,"triangle",.025,-80); },
    teleport: () => { tone(400, .23, "sine", .08, -330); tone(95, .36, "triangle", .06, 620); },
    slam: () => { tone(88, .22, "triangle", .075, -60); tone(48, .14, "sawtooth", .045, -20); },
    block: () => tone(720, .07, "triangle", .025, -370),
    empty: () => tone(70, .08, "square", .025),
    win: () => [0, 130, 260].forEach((d, i) => later(() => tone([330, 440, 660][i], .24), d)),
    lose: () => { tone(220, .25, "sawtooth", .04, -100); later(() => tone(105, .45, "square", .04, -55), 180); }
  };
  (sounds[name] || (() => {}))();
}

ui.startBtn.addEventListener("click", () => { requestMobileLandscape(); openModeSelection(); });
document.getElementById("soloBtn").addEventListener("click", () => startMode("solo"));
document.getElementById("versusBtn").addEventListener("click", () => startMode("versus"));
document.getElementById("modeBackBtn").addEventListener("click", mainMenu);
document.getElementById("fighterBackBtn").addEventListener("click", backFromFighters);
document.querySelectorAll("[data-pick]").forEach(btn => {
  btn.addEventListener("click", () => chooseFighter(btn.dataset.pick));
});
ui.confirmBtn.addEventListener("click", () => { requestMobileLandscape(); sfx("confirm"); confirmFighter(); });
document.querySelectorAll("[data-stage]").forEach(button => button.addEventListener("click", () => chooseStage(button.dataset.stage)));
document.getElementById("stageBackBtn").addEventListener("click", openSelection);
document.getElementById("stageConfirmBtn").addEventListener("click", () => { requestMobileLandscape(); beginGame(); });
document.getElementById("towerSkipBtn").addEventListener("click",skipTournamentTower);
ui.towerScreen.addEventListener("pointerdown",event=>{if(event.target?.tagName!=="BUTTON")skipTournamentTower();});
document.getElementById("towerMenuBtn").addEventListener("click",mainMenu);
document.getElementById("towerSoundBtn").addEventListener("click",()=>{
  toggleSound();
  document.getElementById("towerSoundBtn").textContent=muted?"SONIDO OFF":"SONIDO ON";
  document.getElementById("towerSoundBtn").setAttribute("aria-label",muted?"Activar sonido":"Desactivar sonido");
});
ui.pauseBtn.addEventListener("click", togglePause);
document.getElementById("resumeBtn").addEventListener("click", () => { if (state === "paused") togglePause(); });
document.getElementById("quitBtn").addEventListener("click", mainMenu);
document.getElementById("woAgainBtn").addEventListener("click", openModeSelection);
document.getElementById("woMenuBtn").addEventListener("click", mainMenu);
document.getElementById("continueSameBtn").addEventListener("click",()=>continueTournament(false));
document.getElementById("continueChangeBtn").addEventListener("click",()=>continueTournament(true));
document.getElementById("continueMenuBtn").addEventListener("click",mainMenu);
document.getElementById("titleRankingBtn").addEventListener("click", showRanking);
document.getElementById("rankingMenuBtn").addEventListener("click", mainMenu);
document.getElementById("newGameBtn").addEventListener("click", openModeSelection);
document.getElementById("rankingRetryBtn").addEventListener("click", showRanking);
document.getElementById("winnerForm").addEventListener("submit", saveWinner);
function toggleSound() {
  muted = !muted;
  if (muted) { stopRoundVoice(); suspendCombatSounds(); pauseMusic(); }
  ui.soundBtn.textContent = muted ? "🔇" : "🔊";
  ui.soundBtn.setAttribute("aria-label", muted ? "Activar sonido" : "Desactivar sonido");
  if (!muted) { ensureAudio(); syncRoundVoice(); syncCombatSounds(); syncKOAudio(); syncMusic(); }
}
ui.soundBtn.addEventListener("click", toggleSound);

const HOLD_KEYS = {
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  KeyS: "down", ArrowDown: "down", KeyI: "guard", ShiftLeft: "guard", ShiftRight: "guard"
};
const TAP_KEYS = { KeyW: "jump", ArrowUp: "jump", KeyJ: "punch", KeyK: "kick", KeyL: "special", KeyH: "ability", KeyO: "evade" };
const P2_HOLD_KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", Digit0: "guard", Numpad0: "guard", ControlRight: "guard" };
const P2_TAP_KEYS = { ArrowUp: "jump", Digit7: "punch", Numpad1: "punch", Digit8: "kick", Numpad2: "kick", Digit9: "special", Numpad3: "special", Digit6: "ability", Numpad4: "ability", Digit5: "evade", Numpad5: "evade" };
function keyBinding(code) {
  if (gameMode === "versus" && (code in P2_HOLD_KEYS || code in P2_TAP_KEYS)) return {slot: 2, hold: P2_HOLD_KEYS[code], tap: P2_TAP_KEYS[code]};
  return {slot: 1, hold: HOLD_KEYS[code], tap: TAP_KEYS[code]};
}
function refreshHeld() {
  [held,held2].forEach((input,index) => {
    if (index === 1 && online?.active) return;
    Object.keys(input).forEach(action => {
      input[action] = [...keyHolds].some(code => { const b = keyBinding(code); return b.slot === index + 1 && b.hold === action; })
        || [...touchHolds.values()].some(value => (value.slot || 1) === index + 1 && (value.action || value) === action)
        || [...joystickDirections.values()].some(value => value.slot === index + 1 && value[action]);
    });
  });
}
function refreshHumans() {
  if (online?.active) online.input(held);
  if (online?.guest) return;
  updatePlayer(); if (cpu && (gameMode === "versus" || online?.active)) updateHuman(cpu, held2);
}
function performAction(action, slot = 1, remote = false) {
  if (workCinematic) return;
  if (online?.active && !remote) { if (slot !== 1) return; online.input(held, action); if (online.guest) return; }
  if (state !== "playing" || (slot === 2 && gameMode !== "versus" && !online?.active)) return;
  const f = slot === 2 ? cpu : player;
  if (!f) return;
  refreshHumans();
  if (action === "jump") jump(f);
  else if(action==="evade" || (action==="ability" && f.kind==="blotta"))evade(f);
  else if (action === "ability") attack(f, stats[f.kind].ability);
  else attack(f, action);
}
window.addEventListener("keydown", event => {
  if (["title", "mode"].includes(state)) ensureAudio();
  // Name entry and native buttons keep their own keyboard behavior.
  if (event.target?.tagName === "INPUT" || event.target?.tagName === "TEXTAREA" || state === "ranking") return;
  const code = event.code || (event.key === " " ? "Space" : event.key.length === 1 ? "Key" + event.key.toUpperCase() : event.key);
  if (state === "paused") {
    if (["Space", "Escape"].includes(code)) { event.preventDefault(); if (!event.repeat) togglePause(); }
    return;
  }
  const binding = keyBinding(code);
  if (binding.hold || binding.tap || ["Space", "Enter", "Escape"].includes(code)) event.preventDefault();
  if (event.repeat) return;
  if(state==="continue"){
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"].includes(code))chooseContinue(1-continueChoice);
    if(["Enter","Space","KeyJ"].includes(code))continueTournament(continueChoice===1);
    if(code==="Digit1")continueTournament(false);
    if(code==="Digit2")continueTournament(true);
    if(code==="Escape")mainMenu();
    return;
  }
  if (state === "tower") {
    if (["Enter", "Space", "GamepadStart"].includes(code))skipTournamentTower();
    if (code === "Escape")mainMenu();
    return;
  }
  if (state === "title") { if (["Enter", "Space"].includes(code)) openModeSelection(); return; }
  if (state === "mode") {
    if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(code)) chooseMode(modeChoice === "solo" ? "versus" : "solo");
    if (["Enter", "Space"].includes(code)) startMode(modeChoice);
    if (code === "Digit1") startMode("solo");
    if (code === "Digit2") startMode("versus");
    if (code === "Escape") mainMenu();
    return;
  }
  if (state === "select") {
    const offsets={KeyA:-1,ArrowLeft:-1,KeyD:1,ArrowRight:1,KeyW:-4,ArrowUp:-4,KeyS:4,ArrowDown:4};
    if (code in offsets) {
      const selected = selectionPlayer === 2 ? opponentChoice : playerChoice;
      const choices=roster;
      chooseFighter(choices[((roster.indexOf(selected)+offsets[code])%choices.length+choices.length)%choices.length]);
    }
    if (["Enter", "Space", "KeyJ", "Numpad1"].includes(code)) confirmFighter();
    if (code === "Escape") backFromFighters();
    return;
  }
  if (state === "stage") {
    if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(code)) {
      const direction = code === "KeyA" || code === "ArrowLeft" ? -1 : 1;
      chooseStage(stageRoster[(stageRoster.indexOf(stageChoice) + direction + stageRoster.length) % stageRoster.length]);
    }
    if (["Enter", "Space", "KeyJ"].includes(code)) beginGame();
    if (code === "Escape") openSelection();
    return;
  }
  if (code === "Space" || code === "Escape") { togglePause(); return; }
  if (state !== "playing") return;
  if (binding.hold) { keyHolds.add(code); refreshHeld(); refreshHumans(); }
  if (binding.tap) performAction(binding.tap, binding.slot);
});
window.addEventListener("keyup", event => {
  const code = event.code || (event.key.length === 1 ? "Key" + event.key.toUpperCase() : event.key);
  keyHolds.delete(code); refreshHeld();
  if (online?.active) online.input(held);
  if (state === "playing") refreshHumans();
});
function pauseOnLeave() {
  clearHeld();
  if(state === "tower") { tower.paused=true;pauseMusic();return; }
  if (online?.active) { online.input(held); return; }
  if (state === "playing" || state === "intro" || state === "roundOver" || (state === "finished" && match.nextOpponent)) togglePause();
}
window.addEventListener("blur", pauseOnLeave);
function resumeTowerOnReturn() {
  if(state!=="tower" || document.hidden)return;
  tower.paused=false;lastTime=performance.now();accumulator=0;syncMusic();
}
window.addEventListener("focus",resumeTowerOnReturn);
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseOnLeave(); else resumeTowerOnReturn(); });
// A captured pointer controls each stick. Holding down also works with action buttons.
function moveJoystick(stick, event) {
  let geometry=joystickGeometry.get(stick);
  if(!geometry){geometry={rect:stick.getBoundingClientRect(),radius:stick.offsetWidth*.34};joystickGeometry.set(stick,geometry);}
  const {rect,radius}=geometry;
  const screenX = event.clientX - (rect.left + rect.width / 2);
  const screenY = event.clientY - (rect.top + rect.height / 2);
  // Portrait phones rotate the entire cabinet clockwise; undo that for controls.
  const portrait = document.body.classList.contains('phone-portrait');
  const x = portrait ? screenY : screenX;
  const y = portrait ? -screenX : screenY;
  const distance = Math.hypot(x, y);
  const scale = distance > radius ? radius / distance : 1;
  const dx = x * scale, dy = y * scale;
  const slot = Number(stick.dataset.player);
  const previous = joystickDirections.get(event.pointerId);
  const next = {slot, left:dx < -radius * .35, right:dx > radius * .35,
    down:dy > radius * .35, up:dy < -radius * .35};
  joystickDirections.set(event.pointerId, next);
  document.getElementById('joystickKnob' + slot).style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  if (!previous || next.left !== previous.left || next.right !== previous.right
    || next.up !== previous.up || next.down !== previous.down) {
    refreshHeld(); refreshHumans();
  }
  if (next.up && !previous?.up) performAction('jump', slot);
}
document.querySelectorAll('.joystick').forEach(stick => {
  const slot = Number(stick.dataset.player);
  stick.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (state !== 'playing' || (slot === 2 && gameMode !== 'versus') || stick.activePointer != null) return;
    if (event.pointerType === 'touch') document.body.classList.add('touch-device');
    joystickGeometry.delete(stick);
    stick.activePointer = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    stick.classList.add('active');
    moveJoystick(stick, event);
  });
  stick.addEventListener('pointermove', event => {
    if (stick.activePointer !== event.pointerId || state !== 'playing') return;
    event.preventDefault();
    moveJoystick(stick, event);
  });
  const release = event => {
    if (stick.activePointer !== event.pointerId) return;
    stick.activePointer = null;
    joystickGeometry.delete(stick);
    joystickDirections.delete(event.pointerId);
    stick.classList.remove('active');
    document.getElementById('joystickKnob' + slot).style.transform = 'translate(-50%, -50%)';
    refreshHeld();
    if (online?.active) online.input(held);
    if (state === 'playing') refreshHumans();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => stick.addEventListener(name, release));
});
document.querySelectorAll("[data-hold]").forEach(btn => {
  const slot = Number(btn.dataset.player || 1);
  btn.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state !== "playing" || (slot === 2 && gameMode !== "versus")) return;
    if (event.pointerType === "touch") document.body.classList.add("touch-device");
    btn.setPointerCapture(event.pointerId);
    touchHolds.set(event.pointerId, {slot, action: btn.dataset.hold});
    refreshHeld(); refreshHumans(); btn.classList.add("active");
  });
  const release = event => {
    touchHolds.delete(event.pointerId); refreshHeld();
    if (online?.active) online.input(held);
    if (state === "playing") refreshHumans();
    btn.classList.toggle("active", [...touchHolds.values()].some(v => v.slot === slot && v.action === btn.dataset.hold));
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => btn.addEventListener(name, release));
});
document.querySelectorAll("[data-tap]").forEach(btn => {
  btn.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state !== "playing") return;
    btn.setPointerCapture(event.pointerId); btn.classList.add("active");
    performAction(btn.dataset.tap, Number(btn.dataset.player || 1));
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => btn.addEventListener(name, () => btn.classList.remove("active")));
});

document.addEventListener("pointerdown", event => {
  if (["title", "mode"].includes(state)) ensureAudio();
  if (event.pointerType === "touch") {
    document.body.classList.add("touch-device");
    syncViewport();
  }
}, { passive: true });

document.addEventListener("contextmenu", event => {
  if (state !== "title" && state !== "select") event.preventDefault();
});

window.addEventListener("resize", syncViewport);
window.addEventListener("orientationchange", syncViewport);
document.addEventListener("fullscreenchange", syncViewport);
syncViewport();
selectMusic("title");
requestAnimationFrame(loop);

// Generated 4x4 atlases share normalized cells for attacks and movement.
function atlasSpriteFrame(frame) {
  const key=frame.kind+':'+frame.pose;
  if(spriteFrames.has(key)) return spriteFrames.get(key);
  const workerGuard=["linares","gabriel"].includes(frame.kind) && [9,19].includes(frame.pose);
  if(workerGuard && frame.kind==="gabriel" && (!assets.gabrielGuards.complete || !assets.gabrielGuards.naturalWidth))return atlasSpriteFrame({...frame,pose:frame.pose===19?8:0});
  const fernandoHit=frame.kind==="fernando" && frame.pose===3;
  const fernandoSuper=frame.kind==="fernando" && frame.pose>=24 && frame.pose<=29;
  if(fernandoSuper && (!assets.fernandoSuper.complete || !assets.fernandoSuper.naturalWidth))return atlasSpriteFrame({...frame,pose:17});
  const introSheet=ROUND_TAUNTS[frame.kind] && [20,21].includes(frame.pose) ? assets[ROUND_TAUNTS[frame.kind].asset] : null;
  if(introSheet && (!introSheet.complete || !introSheet.naturalWidth))return atlasSpriteFrame({...frame,pose:POSES[frame.kind].idle});
  const angelLower=frame.kind==="angel" && [18,19].includes(frame.pose);
  const special=["peluche","angel"].includes(frame.kind) && [16,17].includes(frame.pose);
  const image=introSheet || (fernandoSuper?assets.fernandoSuper:fernandoHit?assets.fernandoHit:workerGuard?(frame.kind==="gabriel"?assets.gabrielGuards:assets.workerGuards):angelLower?assets.angelLowerLoad:special?(frame.kind==="angel"?assets.angelSignals:assets.pelucheSpecial):assets[frame.kind]);
  const pose=angelLower?frame.pose-18:frame.kind==="angel" && special ? frame.pose-16 : ["linares","gabriel"].includes(frame.kind) ? [0,1,2,3,4,5,6,7,8,0,9,8,11,10,12,13,14,15,8][frame.pose] : frame.kind==="tren" ? [0,1,2,3,4,5,6,7,8,9,10,8,12,11,13,3,14,15,8][frame.pose] : frame.kind==="peluche" ? special ? frame.pose-16 : [0,1,2,3,4,5,6,7,8,12,14,8,9,10,11,15,0,0,13][frame.pose] : frame.pose;
  if(!image.complete || !image.naturalWidth) return null;
  const surface=document.createElement('canvas');surface.width=surface.height=270;
  const paint=surface.getContext('2d');paint.imageSmoothingEnabled=false;
  const column=fernandoSuper?(frame.pose-24)%3:introSheet?frame.pose-20:fernandoHit?0:workerGuard?(frame.pose===19?1:0):pose%4;
  const row=fernandoSuper?Math.floor((frame.pose-24)/3):introSheet||fernandoHit||workerGuard?0:Math.floor(pose/4);
  paint.drawImage(image,column*270,row*270,270,270,0,0,270,270);
  spriteFrames.set(key,surface);return surface;
}

// Two visual-only poses share the existing round-announcement clock, including pause/online.
const ROUND_TAUNTS={
  primitivo:{asset:'primitivoIntro',lines:['Qué se haga agua','el helado']},
  peluche:{asset:'pelucheIntro',lines:['Te llenaré','de hormigon!']},
  gabriel:{asset:'gabrielIntro',lines:['Planifiqué','derrotarte!']},
  angel:{asset:'angelIntro',lines:['Te derrotaré','marico!']}
};
function roundIntroPose(f) {
  if(!ROUND_TAUNTS[f.kind] || !(state==="intro" || state==="paused" && pauseFrom==="intro"))return null;
  const timing=ROUND_AUDIO[match.round].timing;
  if(introElapsed>=timing.fight-.10)return null;
  return introElapsed<timing.voice || introElapsed>=timing.fight-.36 ? 20 : 21;
}
function roundIntroSpeaking(f) {
  return roundIntroPose(f)===21 && introElapsed>=ROUND_AUDIO[match.round].timing.voice+.12;
}
function drawRoundIntroSpeech(f) {
  if(!roundIntroSpeaking(f))return;
  const frame=renderedFighter(f),width=244,height=64;
  const mouthX=frame.x+f.facing*25;
  const x=Math.max(cameraX+12,Math.min(cameraX+VIEW_WIDTH-width-12,mouthX-width/2));
  // Keep short fighters' bubbles above the central ROUND announcement as well.
  const y=Math.min(frame.y-stats[f.kind].height*FIGHTER_SCALE-122,136);
  const tipX=Math.max(x+20,Math.min(x+width-20,mouthX));
  ctx.save();ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='#211b14';ctx.fillStyle='#fff9e7';
  ctx.shadowColor='rgba(0,0,0,.36)';ctx.shadowBlur=0;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;
  ctx.beginPath();ctx.roundRect(x,y,width,height,10);ctx.fill();ctx.stroke();
  ctx.shadowOffsetX=ctx.shadowOffsetY=0;
  ctx.beginPath();ctx.moveTo(tipX-10,y+height-1);ctx.lineTo(tipX,y+height+18);ctx.lineTo(tipX+10,y+height-1);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fff9e7';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(tipX-9,y+height-1);ctx.lineTo(tipX+9,y+height-1);ctx.stroke();
  ctx.fillStyle='#211b14';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 21px Arial, sans-serif';
  const lines=ROUND_TAUNTS[f.kind].lines;
  ctx.fillText(lines[0],x+width/2,y+22);ctx.fillText(lines[1],x+width/2,y+46);
  ctx.restore();
}

// Schedule attacks use the same world clock, collision rules and audio lifecycle as projectiles.
function spawnSchedule(owner, style) {
  const target=owner===player?cpu:player;
  const originX=owner.x+owner.facing*45, y=owner.y-125;
  const sound=owner.attackSound || startCombatSound(style);owner.attackSound=null;
  projectiles.push({owner,style,sound,x:originX,y,prevX:originX,prevY:y,spin:0,prevSpin:0,
    vx:owner.facing*1800,originX,direction:owner.facing,age:0,life:style==="crash"?1.6:.85,trail:[],
    hitTarget:false,bars:style==="crash"?[-60,-20,20,60].map((offset,i)=>({
      x:Math.max(FIGHTER_LEFT,Math.min(FIGHTER_RIGHT,target.x+offset)),y:-35,
      delay:.28+i*.13,width:92-i*8,color:["#46caff","#53ed9c","#ffce45","#ff426b"][i],done:false
    })):[]});
}

function updateSchedule(p,dt) {
  p.age+=dt;p.life-=dt;
  const target=p.owner===player?cpu:player;
  if(p.style==="critical") {
    p.x=Math.max(STAGE_LEFT,Math.min(STAGE_RIGHT,p.originX+p.direction*Math.min(p.age*2200,stats[p.owner.kind].powerRange ? stats[p.owner.kind].powerRange-45 : Infinity)));
    const box={left:Math.min(p.originX,p.x),right:Math.max(p.originX,p.x),top:p.y-12,bottom:p.y+12};
    if(!p.hitTarget && overlaps(box,hurtBox(target)) && target.invuln<=0 && !isVanished(target)) {
      p.hitTarget=hit(target,powerDamage(p.owner),p.direction*45,0,p.owner,{sourceX:p.originX,direction:p.direction,projectile:true,x:target.x,y:p.y});
      if(p.hitTarget && target.action==="hit" && state==="playing") {
        target.actionTime=target.actionDuration=.62;target.vx=0;
      }
    }
  } else {
    for(const bar of p.bars) {
      if(bar.done || p.age<bar.delay)continue;
      const previousY=bar.y;bar.y+=1050*dt;
      const box={left:bar.x-bar.width/2,right:bar.x+bar.width/2,top:previousY-12,bottom:bar.y+12};
      if(target.invuln<=0 && !isVanished(target) && overlaps(box,hurtBox(target))) {
        hit(target,powerDamage(p.owner)*1.35/4,p.direction*55,0,p.owner,{sourceX:p.originX,direction:p.direction,projectile:true,overhead:true,x:bar.x,y:bar.y});
        bar.done=true;burst(bar.x,bar.y,bar.color,9);
        if(state!=="playing")return;
      } else if(bar.y>=FLOOR) {bar.done=true;burst(bar.x,FLOOR,bar.color,6);}
    }
  }
  if(p.life<=0) {stopCombatSound(p.sound);const i=projectiles.indexOf(p);if(i>=0)projectiles.splice(i,1);}
}

function drawSchedule(p) {
  ctx.save();ctx.globalAlpha=Math.min(1,p.life*5);
  if(p.style==="critical") {
    // A small blue grid and linked red steps read as a Gantt chart without labels.
    ctx.translate(p.originX,p.y);ctx.scale(p.direction,1);
    const length=Math.abs(p.x-p.originX);
    ctx.strokeStyle="#42caff";ctx.lineWidth=1;ctx.globalAlpha*=.25;
    for(let x=0;x<Math.min(length,260);x+=26){ctx.beginPath();ctx.moveTo(x,-66);ctx.lineTo(x,38);ctx.stroke();}
    for(let y=-66;y<=38;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(Math.min(length,260),y);ctx.stroke();}
    ctx.globalAlpha=Math.min(1,p.life*5);
    for(let i=0;i<5;i++){ctx.fillStyle="#42caff";ctx.fillRect(i*37,-57+i*13,Math.min(32,Math.max(0,length-i*37)),7);}
    const path=()=>{ctx.beginPath();ctx.moveTo(0,-22);for(let x=0;x<length;x+=72){ctx.lineTo(Math.min(x+48,length),-22+(Math.floor(x/72)%2)*22);ctx.lineTo(Math.min(x+48,length),-22+((Math.floor(x/72)+1)%2)*22);}ctx.lineTo(length,0);};
    ctx.shadowColor="#ff244f";ctx.shadowBlur=15;ctx.strokeStyle="#ff244f";ctx.lineWidth=11;path();ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle="#fff0d9";ctx.lineWidth=3;path();ctx.stroke();
    ctx.fillStyle="#ff426b";ctx.beginPath();ctx.moveTo(length+13,0);ctx.lineTo(length-9,-14);ctx.lineTo(length-9,14);ctx.closePath();ctx.fill();
  } else {
    for(const bar of p.bars) {
      if(bar.done)continue;
      ctx.fillStyle=bar.color;ctx.strokeStyle=bar.color;
      if(p.age<bar.delay) {
        ctx.globalAlpha=.25+.15*Math.sin(p.age*30);ctx.fillRect(bar.x-bar.width/2,FLOOR-4,bar.width,4);
        ctx.globalAlpha=.7;ctx.beginPath();ctx.moveTo(bar.x-6,78);ctx.lineTo(bar.x,86);ctx.lineTo(bar.x+6,78);ctx.stroke();continue;
      }
      ctx.globalAlpha=.2;ctx.fillRect(bar.x-bar.width/2,bar.y-85,bar.width,80);
      ctx.globalAlpha=1;ctx.shadowColor=bar.color;ctx.shadowBlur=12;
      ctx.fillRect(bar.x-bar.width/2,bar.y-12,bar.width,24);ctx.shadowBlur=0;
      ctx.strokeStyle="#ecfaff";ctx.lineWidth=2;ctx.strokeRect(bar.x-bar.width/2,bar.y-12,bar.width,24);
      ctx.fillStyle="#15314c";for(let x=8;x<bar.width;x+=15)ctx.fillRect(bar.x-bar.width/2+x,bar.y-6,2,12);
    }
  }
  ctx.restore();
}

function strikeWhip(owner) {
  const target=owner===player?cpu:player;
  const x=owner.x+owner.facing*(MAX_FIGHTER_DISTANCE+80),y=owner.y-105*FIGHTER_SCALE;
  owner.whipEnd={x,y};
  const box={left:Math.min(owner.x,x),right:Math.max(owner.x,x),top:y-14,bottom:y+14};
  if(target.invuln<=0 && !isVanished(target) && overlaps(box,hurtBox(target))) {
    hit(target,powerDamage(owner),owner.facing*230,0,owner,{direction:owner.facing,sourceX:owner.x,projectile:true,low:false,x:target.x,y});
  }
}

function drawGalanteProps(f,frame,opacity) {
  const {x,y}=frame;
  ctx.save();ctx.globalAlpha=opacity;
  // The intro clock freezes with pause; sandwich is gone before FIGHT finishes.
  if(state==='intro' && introElapsed<ROUND_AUDIO[match.round].timing.fight) {
    // The sandwich is part of pose 15; only the falling crumbs are procedural.
    ctx.translate(x,y);ctx.scale(f.facing*FIGHTER_SCALE,FIGHTER_SCALE);
    ctx.fillStyle='#ebbe70';
    for(let i=0;i<3;i++)ctx.fillRect(27+i*3,-128+((introElapsed*45+i*9)%25),2,2);
    ctx.restore();return;
  }
  const active=f.action==='special',progress=actionProgress(f);
  const origin={x:x+frame.motion.dx,y:y+frame.motion.dy};
  const hand={x:origin.x+f.facing*(active?95:39)*FIGHTER_SCALE,y:origin.y-(active?145:123)*FIGHTER_SCALE};
  const extension=active?Math.sin(Math.min(1,progress/.38)*Math.PI/2)*(progress>.65?Math.max(0,(1-progress)/.35):1):0;
  const tip={x:hand.x+f.facing*(active?extension*(MAX_FIGHTER_DISTANCE+30):23),y:active?origin.y-105*FIGHTER_SCALE:origin.y-14};
  drawWhipStrand(hand,tip,active?Math.sin(progress*17)*(1-extension*.6)*55:25,active);
  // The second barbed end hangs behind the fist instead of being a detached club.
  drawWhipStrand(hand,{x:hand.x-f.facing*(active?42:56),y:origin.y-22},active?22:31,false);
  ctx.restore();
}

function drawWhipStrand(start,end,bend,extended) {
  const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
  const count=Math.max(12,Math.ceil(length/7));
  const points=Array.from({length:count+1},(_,i)=>{const t=i/count;return {x:start.x+dx*t,y:start.y+dy*t+Math.sin(t*Math.PI)*bend};});
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const [color,width] of [['#15151b',6],['#786b59',3.6],['#c0af8c',1.2]]){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  }
  for(let i=1;i<points.length;i++){
    const p=points[i],prev=points[i-1],angle=Math.atan2(p.y-prev.y,p.x-prev.x);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
    ctx.strokeStyle=i%2?'#29272a':'#b9afa0';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,0,3,1.7,0,0,Math.PI*2);ctx.stroke();
    if(i%7===0 && i>3)drawWhipSpike(extended?7:5);
    ctx.restore();
  }
  const prev=points[points.length-2];ctx.save();ctx.translate(end.x,end.y);ctx.rotate(Math.atan2(end.y-prev.y,end.x-prev.x));
  ctx.fillStyle='#282831';ctx.fillRect(-11,-5,21,10);ctx.fillStyle='#a8a6aa';ctx.fillRect(-9,-4,3,8);ctx.fillRect(4,-4,3,8);
  drawWhipSpike(13);ctx.beginPath();ctx.moveTo(9,-4);ctx.lineTo(24,0);ctx.lineTo(9,4);ctx.closePath();ctx.fillStyle='#dce1e8';ctx.fill();ctx.restore();
}

function drawWhipSpike(size) {
  for(const side of [-1,1]){
    ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(1,side*size);ctx.lineTo(5,0);ctx.closePath();ctx.fillStyle='#cdd1da';ctx.fill();ctx.strokeStyle='#353640';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.moveTo(1,side*size);ctx.lineTo(1,0);ctx.lineTo(5,0);ctx.closePath();ctx.fillStyle='#707683';ctx.fill();
  }
}


// A tapered body of moving water, foam streaks and dispersed spray.
function drawWaterJet(p) {
  const dir=Math.sign(p.vx),fx=lerp(p.prevX,p.x,renderAlpha),fy=lerp(p.prevY,p.y,renderAlpha);
  const hx=lerp(p.owner.prevX,p.owner.x,renderAlpha)+dir*58*FIGHTER_SCALE;
  const hy=lerp(p.owner.prevY,p.owner.y,renderAlpha)-143*FIGHTER_SCALE;
  const length=Math.max(1,(fx-hx)*dir),steps=Math.max(12,Math.ceil(length/8));
  const center=t=>lerp(hy,fy,t)+Math.sin(t*12-stageTime*18)*3*t;
  const radius=t=>(5+14*Math.sqrt(t))*(.88+.12*Math.sin(t*31-stageTime*26));
  ctx.save();ctx.lineCap="round";
  const fill=ctx.createLinearGradient(hx,hy-20,hx,hy+20);
  fill.addColorStop(0,"rgba(156,239,255,.72)");fill.addColorStop(.4,"rgba(36,170,235,.88)");fill.addColorStop(1,"rgba(12,91,194,.45)");ctx.fillStyle=fill;
  ctx.beginPath();
  for(let i=0;i<=steps;i++){const t=i/steps,x=hx+dir*length*t,y=center(t)-radius(t);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  for(let i=steps;i>=0;i--){const t=i/steps;ctx.lineTo(hx+dir*length*t,center(t)+radius(t));}ctx.closePath();ctx.fill();
  // Short longitudinal highlights travel outward rather than rotating like a beam.
  for(let i=0;i<28;i++){
    const t=(i*.137+stageTime*(1.1+i%3*.13))%1,back=Math.max(0,t-.04-(i%4)*.012);
    const offset=Math.sin(i*8.1)*radius(t)*.78;
    ctx.strokeStyle=i%3?"rgba(210,250,255,.78)":"#ffffff";ctx.lineWidth=i%4===0?2.6:1.3;
    ctx.beginPath();ctx.moveTo(hx+dir*length*back,center(back)+offset);ctx.lineTo(hx+dir*length*t,center(t)+offset);ctx.stroke();
  }
  for(let i=0;i<25;i++){
    const phase=(stageTime*1.8+i*.173)%1,t=.15+.85*phase;
    const spread=(i%2?1:-1)*(radius(t)+4+(i%5)*2)*phase;
    ctx.fillStyle=i%3?"rgba(162,230,255,.75)":"#efffff";
    ctx.beginPath();ctx.ellipse(hx+dir*length*t,center(t)+spread,1.3+(i%3),.8+(i%2),dir*.2,0,Math.PI*2);ctx.fill();
  }
  // Uneven foamy front and outward spray, without a rigid circular outline.
  for(let i=0;i<12;i++){
    const a=i*2.4+stageTime*5,r=5+(i%4)*4;
    ctx.fillStyle=i%2?"rgba(233,253,255,.88)":"rgba(93,199,248,.78)";
    ctx.beginPath();ctx.ellipse(fx+Math.cos(a)*r*.5,fy+Math.sin(a)*r,4+i%3,2+i%4,a,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawWaterCharge(f) {
  if(f.action!=="special" || f.specialSpawned)return;
  const t=Math.min(1,(f.actionDuration-f.actionTime)/f.moveSpec.startup);
  const x=lerp(f.prevX,f.x,renderAlpha)+f.facing*40*FIGHTER_SCALE,y=lerp(f.prevY,f.y,renderAlpha)-135*FIGHTER_SCALE;
  ctx.save();ctx.strokeStyle="#8eeeff";ctx.lineWidth=2.5;ctx.shadowColor="#159fff";ctx.shadowBlur=10*drawingScale;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x,y,5+t*17+i*3,stageTime*16+i*2,stageTime*16+i*2+4.3);ctx.stroke();}ctx.restore();
}


// WO FIGHTERS: sprites and special attacks use the supplied character concepts.
// Transparent props share a grounded silhouette and readable scale.
function drawWorkProp(key,x,y,width,angle=0,direction=1,alpha=1) {
  const image=assets[key];
  if(!image?.complete || !image.naturalWidth) return;
  const height=width*(image.naturalHeight || image.naturalWidth)/image.naturalWidth;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(direction,1);
  ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(image,-width/2,-height,width,height);ctx.restore();
}
function drawWorkDust(x,y,time,direction=1,strength=1) {
  ctx.save();
  for(let i=0;i<9;i++) {
    const phase=(time*2.6+i/9)%1;
    ctx.globalAlpha=(1-phase)*.30*strength;ctx.fillStyle=i%2?"#e3c599":"#ad895f";
    ctx.beginPath();ctx.ellipse(x-direction*phase*115,y-8-phase*(12+i%3*5),8+phase*24,4+phase*12,0,0,Math.PI*2);ctx.fill();
  }ctx.restore();
}
function spawnWorkProjectile(owner,style) {
  const target=owner===player?cpu:player,direction=owner.facing;
  const x=style==="beam"?target.x:owner.x+direction*75;
  const y=style==="beam"?-100:FLOOR-54;
  const sound=owner.attackSound||startCombatSound(style);owner.attackSound=null;
  projectiles.push({owner,style,sound,x,y,prevX:x,prevY:y,direction,
    vx:direction*(style==="beam"?0:620),vy:style==="beam"?850:0,
    radius:style==="beam"?66:78,damage:powerDamage(owner),life:2.8,age:0,
    warning:style==="beam"?.28:0,contactDone:false,impactAge:0});
  addEffect("ring",x,style==="beam"?FLOOR-5:y,"#ffd15a",64,.3);

}
function updateWorkProjectile(p,dt) {
  p.age+=dt;p.life-=dt;p.prevX=p.x;p.prevY=p.y;
  if(p.contactDone) p.impactAge+=dt;
  else if(p.age>=p.warning) {
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    const target=p.owner===player?cpu:player;
    // Sweep between frames so a fast vehicle or falling load cannot pass through a fighter.
    const box={left:Math.min(p.prevX,p.x)-p.radius,right:Math.max(p.prevX,p.x)+p.radius,
      top:Math.min(p.prevY,p.y)-(p.style==="beam"?35:57),bottom:Math.max(p.prevY,p.y)+54};
    const touches=target.invuln<=0 && overlaps(box,hurtBox(target));
    if(touches || (p.style==="beam" && p.y>=FLOOR-30)) {
      p.contactDone=true;p.vx=p.vy=0;stopCombatSound(p.sound);
      if(state==="playing") startCombatSound(p.style+"Impact");
      if(touches) hit(target,p.damage,p.direction*(p.style==="beam"?320:370),p.style==="beam"?-210:-110,p.owner,
        {sourceX:p.x,direction:p.direction,projectile:true,overhead:p.style==="beam",x:p.x,y:p.y});
      burst(p.x,Math.min(FLOOR-12,p.y),"#ffd15a",28);dustBurst(p.x,FLOOR,16);
      addEffect("impact",p.x,p.y,"#ffe0a0",76,.28);screenShake=Math.max(screenShake,6);
    }
  }
  if(p.impactAge>.28 || p.life<=0 || p.x<STAGE_LEFT-150 || p.x>STAGE_RIGHT+150){
    stopCombatSound(p.sound);const i=projectiles.indexOf(p);if(i>=0)projectiles.splice(i,1);
  }
}
function drawWorkProjectile(p) {
  const x=lerp(p.prevX,p.x,renderAlpha),y=lerp(p.prevY,p.y,renderAlpha);
  const alpha=p.contactDone?Math.max(0,1-p.impactAge/.28):1;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.ellipse(x,FLOOR+2,p.style==="beam"?66:87,9,0,0,Math.PI*2);ctx.fill();
  if(p.style==="beam") {
    if(!p.contactDone){
      ctx.strokeStyle="rgba(255,199,65,.75)";ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(x,FLOOR,68,12,0,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle="#cbd3dc";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,-100);ctx.lineTo(x,y-90);ctx.stroke();
    }
    drawWorkProp("load",x,y+54,166,Math.sin(p.age*7)*.025);
  } else {
    drawWorkDust(x-p.direction*35,FLOOR,p.age,p.direction);
    const bounce=p.contactDone?-Math.sin(p.impactAge*20)*4:Math.sin(p.age*42)*1.5;
    drawWorkProp("forklift",x,FLOOR+bounce,218,p.contactDone?-p.direction*.08:0,p.direction);
    // A rotating spoke on each hub makes the vehicle roll instead of slide.
    ctx.save();ctx.translate(x,FLOOR+bounce);ctx.scale(p.direction,1);
    for(const wheel of [{x:-89,y:-21,r:11},{x:-23,y:-19,r:13}]){
      ctx.save();ctx.translate(wheel.x,wheel.y);ctx.rotate(p.age*24);
      ctx.strokeStyle="#9ba8b5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-wheel.r,0);ctx.lineTo(wheel.r,0);ctx.moveTo(0,-wheel.r);ctx.lineTo(0,wheel.r);ctx.stroke();ctx.restore();
    }ctx.restore();
  }ctx.restore();
}
function workHookLift(t) {
  if(t<.38)return 0;
  if(t<.78)return 76*smoothstep((t-.38)/.4);
  if(t<1.12)return 76*(1-((t-.78)/.34)**2);
  return 0;
}
function startWorkCinematic(owner) {
  const target=owner===player?cpu:player;
  const duration=owner.kind==="fernando"?4.9:owner.kind==="gabriel"?2.85:owner.kind==="linares"?3.1:owner.kind==="tren"?2.8:owner.kind==="peluche"?2.65:1.85;
  const impactAt=owner.kind==="fernando"?3.35:owner.kind==="gabriel"?2.05:owner.kind==="linares"?2.05:owner.kind==="tren"?1.95:owner.kind==="peluche"?1.90:1.12;
  workCinematic={owner,target,elapsed:0,duration,impactAt,impact:false,originX:owner.x,impactX:target.x,direction:owner.facing,
    guardEligible:target.grounded && !target.concreteHold && ["idle","block"].includes(target.action),initialGuard:target.guarding,
    sound:owner.kind==="gabriel"?null:startCombatSound(owner.specialStyle)};
  if(owner.kind==="fernando"){
    const c=workCinematic;c.direction=Math.sign(target.x-owner.x)||owner.facing;owner.facing=c.direction;
    c.approachX=owner.x+c.direction*Math.max(0,Math.abs(target.x-owner.x)-128);
    c.throwX=c.approachX+c.direction*82;c.dustAt=0;
  }
  owner.action="special";owner.actionTime=owner.actionDuration=duration;
  owner.specialSpawned=true;owner.specialCooldown=.7;
  target.action="hit";target.actionTime=target.actionDuration=duration;
  target.knockdown=null;target.concreteHold=0;target.concreteCoat=0;
  target.vx=target.vy=0;target.guarding=false;target.crouching=false;
  for(const f of [owner,target]){f.queuedAction=null;f.queueTime=0;f.moveIntent=0;resetMeleeChain(f);}
  updateWorkGuard(workCinematic);
  screenShake=4;
}
function updateWorkGuard(c) {
  if(!c.guardEligible || c.defenseBroken || c.impact)return;
  const t=c.target,human=t===player || gameMode==="versus" || online?.active;
  if(!human && aiEnabled && !c.aiGuardDecided && c.elapsed>=difficulty().reaction) {
    c.aiGuardDecided=true;c.aiGuard=Math.random()<difficulty().guard;
  }
  const input=t===player?held:held2;
  t.guarding=human?input.guard:!!(c.initialGuard || c.aiGuard);
  t.crouching=t.guarding && (human?input.down:false);
  t.action=t.guarding?"block":"idle";t.actionTime=t.actionDuration=c.duration-c.elapsed;
}
function hitWorkCinematic(c,damage,knock,lift) {
  const t=c.target;
  updateWorkGuard(c);
  t.action=t.guarding?"block":"idle";t.actionTime=0;t.invuln=0;
  hit(t,damage,c.direction*knock,lift,c.owner,
    {sourceX:c.originX,direction:c.direction,projectile:true,super:true,x:t.x,y:t.y-95});
  c.blocked=t.action==="block";
  if(!c.blocked)c.defenseBroken=true;
}
function updateWorkCinematic(dt) {
  const c=workCinematic;c.elapsed+=dt;advanceCombatSounds(dt);
  updateWorkGuard(c);
  updateParticles(dt);updateEffects(dt);screenShake=Math.max(0,screenShake-dt*24);
  c.owner.animClock+=dt;c.target.animClock+=dt;
  if(c.owner.kind==="fernando")updateFernandoFireSuper(c,dt);
  // Sustained pressure builds before the impact; the simulation/audio clocks stay together.
  if(c.elapsed>.38 && c.elapsed<c.impactAt) {
    const pressure=Math.min(1,(c.elapsed-.38)/(c.impactAt-.38));
    screenShake=Math.max(screenShake,(c.owner.kind==="peluche"?2:1)+pressure*4);
  }
  if(c.owner.kind==="gabriel") updateGanttCinematic(c);
  if(c.owner.kind!=="gabriel" && !c.impact && c.elapsed>=c.impactAt) {
    const t=c.target,o=c.owner;
    hitWorkCinematic(c,fighterPowers[o.kind].superDamage,240,-140);
    c.impact=true;
    burst(t.x,t.y-95,c.owner.kind==="peluche"?"#e5eadb":"#ffdc62",44);dustBurst(t.x,FLOOR,32);
    if(o.kind==="fernando"){
      smokeBurst(t.x,t.y-85,18);burst(t.x,t.y-95,"#ff6032",40);
      if(!c.blocked){t.fernandoBurn=1.45;c.scream=startCombatSound("fireScream");}
    }
    if(o.kind==="peluche" && !c.blocked)t.concreteCoat=1.1;
    if(["tren","linares"].includes(o.kind)) {if(!c.blocked)t.electricCoat=1.35;burst(t.x,t.y-100,"#81dcff",40);}
    screenShake=18;
    // The cinematic already owns time. Ordinary melee hit-stop used to mute its climax.
    hitStop=0;syncCombatSounds();
  }
  if(!c.blocked && ["tren","linares","gabriel","fernando"].includes(c.owner.kind) && c.impact && state==="playing" && c.elapsed>c.impactAt+(c.owner.kind==="fernando"?.80:.24)) {
    if(!c.launched){c.launched=true;beginKnockdown(c.target,c.direction*300);}
    if(c.target.knockdown)updateKnockdown(c.target,dt);
  }
  if(c.elapsed>=c.duration || state!=="playing") {
    stopCombatSound(c.sound,true);
    if(state==="playing")stopCombatSound(c.scream,true);
    c.owner.action="idle";c.owner.actionTime=c.owner.actionDuration=0;c.owner.moveSpec=null;
    if(c.target.action==="hit" && c.target.actionTime>0)c.target.actionTime=Math.min(c.target.actionTime,.25);
    if(c.target.action==="block"){c.target.action="idle";c.target.actionTime=c.target.actionDuration=0;}
    workCinematic=null;
  }
  fighters.forEach(f=>updateAnimation(f,dt));
}
function drawWorkCinematic() {
  const c=workCinematic,t=c.elapsed,owner=c.owner,target=c.target;
  if(owner.kind==="fernando") {drawFireCinematic(c);return;}
  if(owner.kind==="gabriel") {drawGanttCinematic(c);return;}
  if(owner.kind==="linares") {drawTransformerCinematic(c);return;}
  if(owner.kind==="tren") {drawStormCinematic(c);return;}
  if(owner.kind==="peluche") {drawConcreteCinematic(c);return;}
  ctx.save();
  ctx.fillStyle="rgba(3,9,27,"+(t<.25?.56:.30)+")";ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  const color=owner.kind==="angel"?"#ffe269":"#ffb65b";
  ctx.textAlign="center";ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fillStyle=color;
  ctx.font="italic bold 34px Arial";ctx.fillText(owner.kind==="angel"?"GANCHO MAESTRO":"LANZAMIENTO DE CONTENEDOR",480,92);
  ctx.font="bold 16px Arial";ctx.fillStyle="#fff";ctx.fillText(owner.kind==="angel"?"IZAR · ELEVAR · IMPACTAR":"CARGAR · LANZAR · IMPACTAR",480,121);
  ctx.shadowBlur=0;
  const x=c.impactX-cameraX,fade=t>1.55?Math.max(0,(1.85-t)/.3):1;
  if(owner.kind==="angel") {
    const head=target.y-stats[target.kind].height*FIGHTER_SCALE;
    const bottom=t<.38?lerp(-20,head+55,smoothstep(t/.38)):head+55-workHookLift(t);
    ctx.strokeStyle="#394452";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,-10);ctx.lineTo(x,bottom-167);ctx.stroke();
    ctx.strokeStyle="#d7e6f2";ctx.lineWidth=3;ctx.stroke();
    if(t>.30 && t<1.12) {
      ctx.save();ctx.globalCompositeOperation="screen";ctx.strokeStyle="#a8edff";ctx.lineWidth=2;ctx.shadowColor="#72daff";ctx.shadowBlur=12;
      for(let side of [-1,1]) {ctx.beginPath();ctx.moveTo(x+side*12,0);for(let yy=20;yy<bottom-25;yy+=20)ctx.lineTo(x+side*(12+Math.sin(yy*.4+t*21)*7),yy);ctx.stroke();}
      ctx.restore();
    }
    drawWorkProp("hook",x,bottom,72,Math.sin(t*9)*.025,1,fade);
  } else {
    const travel=Math.max(0,Math.min(1,(t-.30)/.82));
    const start=c.originX-cameraX+c.direction*80;
    const boxX=lerp(start,x,travel);
    const baseline=FLOOR-6-104*Math.sin(Math.PI*travel)-(t<.30?28*smoothstep(t/.30):0);
    const bounce=t>1.12?-Math.abs(Math.sin((t-1.12)*13))*12*Math.max(0,1-(t-1.12)/.4):0;
    ctx.fillStyle="rgba(0,0,0,.4)";ctx.beginPath();ctx.ellipse(boxX,FLOOR+3,137,13,0,0,Math.PI*2);ctx.fill();
    if(travel>0 && travel<1) {
      ctx.strokeStyle="rgba(181,221,255,.42)";ctx.lineWidth=3;
      for(let i=0;i<5;i++){const sy=baseline-35-i*24;ctx.beginPath();ctx.moveTo(boxX-c.direction*150,sy);ctx.lineTo(boxX-c.direction*(195+i*10),sy+8);ctx.stroke();}
    }
    if(travel>0 && travel<1)for(let i=3;i>0;i--)drawWorkProp("container",boxX-c.direction*i*23,baseline+i*7,310,c.direction*(-.10+travel*.16),c.direction,.055*(4-i));
    drawWorkProp("container",boxX,baseline+bounce,310,c.direction*(-.10+travel*.16),c.direction,fade);
    drawWorkDust(boxX,FLOOR,t,c.direction,t>=1.12?1.8:.45);
  }
  if(t>=1.12 && t<1.55) {
    const p=(t-1.12)/.43;
    ctx.globalAlpha=1-p;ctx.strokeStyle="#fff2b0";ctx.lineWidth=7*(1-p)+1;
    ctx.beginPath();ctx.ellipse(x,FLOOR-2,35+150*p,9+22*p,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<14;i++) {const a=i*Math.PI*2/14;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*30,FLOOR-55+Math.sin(a)*25);ctx.lineTo(x+Math.cos(a)*(40+105*p),FLOOR-55+Math.sin(a)*(35+85*p));ctx.stroke();}
  }
  if(t>=1.12 && t<1.23){ctx.globalAlpha=1;ctx.fillStyle="rgba(255,240,177,"+(.34*(1-(t-1.12)/.11))+")";ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
  drawSuperImpact(c);
  ctx.restore();
}

// Deterministic cinematic effects: paused frames hold still and draw never changes gameplay.
function superPalette(kind) {
  return kind==="fernando" ? ["#ff8a32","#ff4230","#fff2ad"] : kind==="gabriel" ? ["#ff426b","#46caff","#ffffff"] : ["tren","linares"].includes(kind) ? ["#81dcff","#8c91ff","#ffffff"] : kind==="angel" ? ["#fff0a3","#82dfff","#ffffff"]
    : kind==="primitivo" ? ["#ffaf48","#ff663e","#ffe6a1"]
    : ["#e9efbd","#b1c9bf","#ffffff"];
}
function drawSuperAtmosphere(c) {
  const t=c.elapsed,colors=superPalette(c.owner.kind),x=c.impactX-cameraX;
  const entry=Math.min(1,t/.12),exit=Math.min(1,(c.duration-t)/.22);
  ctx.save();ctx.globalAlpha=entry*exit;
  ctx.fillStyle="#020510";ctx.fillRect(0,0,VIEW_WIDTH,18);ctx.fillRect(0,VIEW_HEIGHT-20,VIEW_WIDTH,20);
  const focusX=t<.38?c.owner.x-cameraX:x,focusY=FLOOR-100;
  const auraKey=colors[0]+colors[1]+":"+drawingScale;
  let aura=superAuras.get(auraKey);
  if(!aura) {
    aura=document.createElement("canvas");aura.width=aura.height=Math.round(520*drawingScale);
    const brush=aura.getContext("2d");brush.scale(drawingScale,drawingScale);
    const glow=brush.createRadialGradient(260,260,8,260,260,260);
    glow.addColorStop(0,colors[0]+"75");glow.addColorStop(.4,colors[1]+"25");glow.addColorStop(1,"transparent");
    brush.fillStyle=glow;brush.fillRect(0,0,520,520);
    // At most one palette per selected fighter; discard old density/palette surfaces.
    if(superAuras.size>=2)superAuras.delete(superAuras.keys().next().value);
    superAuras.set(auraKey,aura);
  }
  ctx.drawImage(aura,focusX-260,focusY-260,520,520);
  ctx.globalCompositeOperation="screen";
  // One expanding activation burst, followed by converging speed trails.
  const launch=Math.max(0,1-t/.48);
  if(launch>0) {
    ctx.strokeStyle=colors[0];ctx.lineWidth=3;
    ctx.globalAlpha=launch;
    ctx.beginPath();ctx.arc(focusX,focusY,25+t*340,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<18;i++) {
      const angle=i*Math.PI/9,r=35+t*170;
      ctx.beginPath();ctx.moveTo(focusX+Math.cos(angle)*r,focusY+Math.sin(angle)*r);
      ctx.lineTo(focusX+Math.cos(angle)*(r+60),focusY+Math.sin(angle)*(r+60));ctx.stroke();
    }
  }
  if(t<c.impactAt)for(let i=0;i<22;i++) {
    const a=i*2.39996,phase=(t*1.8+i*.137)%1,r=170+phase*430;
    ctx.globalAlpha=(1-phase)*.32*entry;ctx.strokeStyle=colors[i%2];ctx.lineWidth=1+i%3;
    ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,focusY+Math.sin(a)*r*.62);
    ctx.lineTo(x+Math.cos(a)*(r+45),focusY+Math.sin(a)*(r+45)*.62);ctx.stroke();
  }
  // Rising construction sparks/dust announce the impending release.
  if(t>.25 && t<c.impactAt)for(let i=0;i<20;i++) {
    const phase=(t*.9+i*.193)%1;
    ctx.globalAlpha=(1-phase)*.7;ctx.fillStyle=colors[i%3];
    ctx.fillRect(x+Math.sin(i*8.4)*100*(1-phase),FLOOR-phase*210,2+i%3,5+i%5);
  }
  ctx.restore();
}
function drawSuperImpact(c) {
  const age=c.elapsed-c.impactAt;if(age<0 || age>.73)return;
  const colors=superPalette(c.owner.kind),x=c.impactX-cameraX,y=FLOOR-65,q=age/.73;
  ctx.save();ctx.globalCompositeOperation="screen";
  // Broad flash decays once; it does not strobe or hide the fighters for the sequence.
  if(age<.14) {ctx.globalAlpha=.55*(1-age/.14);ctx.fillStyle=colors[0];ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
  const glow=ctx.createRadialGradient(x,y,5,x,y,100+q*240);
  glow.addColorStop(0,colors[2]+"cc");glow.addColorStop(.3,colors[0]+"88");glow.addColorStop(1,"transparent");
  ctx.globalAlpha=(1-q)*.8;ctx.fillStyle=glow;ctx.fillRect(x-350,y-350,700,700);
  for(let j=0;j<3;j++) {
    const wave=q-j*.12;if(wave<0)continue;
    ctx.globalAlpha=(1-q)*(.9-j*.18);ctx.strokeStyle=colors[j];ctx.lineWidth=5*(1-q)+1;
    ctx.beginPath();ctx.ellipse(x,FLOOR-3,25+wave*340,8+wave*65,0,0,Math.PI*2);ctx.stroke();
  }
  for(let i=0;i<32;i++) {
    const a=i*2.39996,r=25+q*(170+i%5*28),length=(1-q)*(25+i%3*17);
    ctx.strokeStyle=colors[i%3];ctx.globalAlpha=1-q;ctx.lineWidth=1+i%3;
    ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.7);
    ctx.lineTo(x+Math.cos(a)*(r+length),y+Math.sin(a)*(r+length)*.7);ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";
  for(let i=0;i<24;i++) {
    const a=Math.PI+(i+.5)/24*Math.PI,r=q*(130+i%6*33);
    ctx.save();ctx.globalAlpha=1-q;ctx.translate(x+Math.cos(a)*r,y+Math.sin(a)*r+q*q*135);ctx.rotate(q*(i%2?-7:7));
    ctx.fillStyle=colors[i%3];ctx.strokeStyle="#26303b";ctx.lineWidth=1.5;
    const size=3+i%4*2;ctx.fillRect(-size,-size,size*2,size);ctx.strokeRect(-size,-size,size*2,size);ctx.restore();
  }
  ctx.restore();
}

// Peluche's concrete uses the same fixed simulation clock as the fight.
function spawnConcrete(owner) {
  const direction=owner.facing,x=owner.x+direction*58,y=owner.y-122;
  const sound=owner.attackSound||startCombatSound('concrete');owner.attackSound=null;
  projectiles.push({owner,style:'concrete',sound,direction,x,y,prevX:x,prevY:y,originX:owner.x,
    vx:direction*640,vy:-90,age:0,life:1.4,radius:27,damage:powerDamage(owner),contactDone:false,impactAge:0});
}

// Electrical projectiles sweep their traveled segment: fast bolts cannot tunnel through a rival.
function spawnVoltaic(owner) {
  const direction=owner.facing,x=owner.x+direction*58,y=owner.y-118;
  const sound=owner.attackSound||startCombatSound('voltaic');owner.attackSound=null;
  projectiles.push({owner,style:'voltaic',sound,direction,x,y,prevX:x,prevY:y,originX:owner.x,
    vx:direction*1700,vy:0,age:0,life:1,radius:14,damage:powerDamage(owner),spin:0,prevSpin:0,contactDone:false,impactAge:0});
}
function updateVoltaic(p,dt) {
  p.age+=dt;p.life-=dt;p.prevX=p.x;p.prevY=p.y;
  if(p.contactDone){p.impactAge+=dt;if(p.impactAge>.24)removeConcrete(p);return;}
  const remaining=stats.tren.powerRange-Math.abs(p.x-p.originX)-p.radius;
  if(remaining<=0 || p.life<=0){removeConcrete(p);return;}
  p.x+=p.direction*Math.min(1700*dt,remaining);
  const target=p.owner===player?cpu:player;
  const box={left:Math.min(p.prevX,p.x)-p.radius,right:Math.max(p.prevX,p.x)+p.radius,top:p.y-p.radius,bottom:p.y+p.radius};
  if(target.invuln<=0 && !isVanished(target) && overlaps(box,hurtBox(target))) {
    p.contactDone=true;p.x=target.x;p.vx=0;stopCombatSound(p.sound);
    hit(target,p.damage,p.direction*185,0,p.owner,{sourceX:p.owner.x,direction:p.direction,projectile:true,x:p.x,y:p.y});
    if(target.action==='hit')target.electricCoat=.6;
    burst(p.x,p.y,'#8cefff',20);addEffect('ring',p.x,p.y,'#d5fbff',44,.22);
  } else if(p.x<STAGE_LEFT || p.x>STAGE_RIGHT) removeConcrete(p);
}
// Deterministic jagged branches animate from game time and therefore freeze on pause.
function drawElectricArc(x1,y1,x2,y2,time,width=3,seed=0) {
  const dx=x2-x1,dy=y2-y1;
  const reusable=mobileRendering && (dy===0 || dx===46 && dy===-32 || dx===25 && dy===49);
  if(!reusable){paintElectricArc(ctx,x1,y1,x2,y2,time,width,seed);return;}
  const key=[dx,dy,Math.floor(time*28),width,seed,drawingScale].join(":");
  let entry=electricRasters.get(key);
  if(!entry) {
    // Include every branch, all three luminous layers and the full blur extent.
    const padding=64+width*20,left=Math.floor(Math.min(0,dx)-padding),top=Math.floor(Math.min(0,dy)-padding);
    const w=Math.ceil((Math.abs(dx)+padding*2)*drawingScale),h=Math.ceil((Math.abs(dy)+padding*2)*drawingScale);
    if(w*h>ELECTRIC_CACHE_PIXELS){paintElectricArc(ctx,x1,y1,x2,y2,time,width,seed);return;}
    const surface=document.createElement("canvas");surface.width=w;surface.height=h;
    const brush=surface.getContext("2d");brush.scale(drawingScale,drawingScale);brush.translate(-left,-top);
    paintElectricArc(brush,0,0,dx,dy,time,width,seed);
    entry={surface,left,top,pixels:w*h};
    while(electricRasterPixels+entry.pixels>ELECTRIC_CACHE_PIXELS) {
      const oldest=electricRasters.keys().next().value;electricRasterPixels-=electricRasters.get(oldest).pixels;electricRasters.delete(oldest);
    }
    electricRasters.set(key,entry);electricRasterPixels+=entry.pixels;
  } else {
    electricRasters.delete(key);electricRasters.set(key,entry);
  }
  ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.drawImage(entry.surface,x1+entry.left,y1+entry.top,entry.surface.width/drawingScale,entry.surface.height/drawingScale);ctx.restore();
}

function paintElectricArc(brush,x1,y1,x2,y2,time,width=3,seed=0) {
  const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
  const count=Math.max(5,Math.ceil(length/24)),points=[];
  for(let i=0;i<=count;i++) {
    const q=i/count,j=i===0||i===count?0:Math.sin(i*17.13+Math.floor(time*28)*2.7+seed)*Math.min(22,length*.12);
    points.push([x1+dx*q+nx*j,y1+dy*q+ny*j]);
  }
  brush.save();brush.lineJoin='miter';brush.shadowColor='#159bff';brush.shadowBlur=12;
  for(const [scale,color,alpha] of [[4,'#168bff',.22],[1.8,'#62d8ff',.8],[.65,'#f4ffff',1]]) {
    brush.strokeStyle=color;brush.globalAlpha=alpha;brush.lineWidth=width*scale;
    brush.beginPath();points.forEach(([x,y],i)=>i?brush.lineTo(x,y):brush.moveTo(x,y));brush.stroke();
  }
  brush.shadowBlur=4;brush.lineWidth=Math.max(1,width*.55);brush.strokeStyle='#9deaff';brush.globalAlpha=.85;
  for(let i=2;i<count;i+=3){const [x,y]=points[i],sign=i%2?1:-1;brush.beginPath();brush.moveTo(x,y);brush.lineTo(x+nx*sign*22-dx/count*.4,y+ny*sign*22-dy/count*.4);brush.lineTo(x+nx*sign*35,y+ny*sign*35);brush.stroke();}
  brush.restore();
}
function drawVoltaic(p) {
  const x=lerp(p.prevX,p.x,renderAlpha),length=Math.min(150,Math.abs(x-p.originX));
  if(p.contactDone){
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=18+p.impactAge*190;drawElectricArc(p.x,p.y,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,p.age,2,i);}
    return;
  }
  drawElectricArc(x-p.direction*length,p.y,x+p.direction*12,p.y,p.age,5);
}
function drawVoltaicCharge(f,frame) {
  if(f.action!=='special' || f.specialSpawned || workCinematic)return;
  const t=f.actionDuration-f.actionTime,q=Math.min(1,t/f.moveSpec.startup),x=frame.x+f.facing*20,y=frame.y-118;
  ctx.save();const glow=ctx.createRadialGradient(x,y,1,x,y,34);glow.addColorStop(0,'#ffffff');glow.addColorStop(.22,'#9cfaff');glow.addColorStop(1,'rgba(20,120,255,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,10+24*q,0,Math.PI*2);ctx.fill();ctx.restore();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+t*13;drawElectricArc(x,y,x+Math.cos(a)*(20+q*18),y+Math.sin(a)*27,t,2,i);}
}
function drawElectricCoat(f,frame) {
  const t=workCinematic?.elapsed??f.animClock;
  for(let i=0;i<5;i++){const y=frame.y-35-i*26,x=frame.x+Math.sin(i*6+t*32)*20;drawElectricArc(x-22,y,x+24,y-32,t,1.5,i);}
}
function drawStormCinematic(c) {
  const t=c.elapsed,x=c.impactX-cameraX,ownerX=c.owner.x-cameraX,age=t-c.impactAt;
  ctx.save();ctx.fillStyle=t<.18?'rgba(1,4,22,.72)':'rgba(1,4,22,.48)';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  // Crown and raised hands lead the eye up to the storm.
  if(t<c.impactAt){
    for(let i=0;i<3;i++)drawElectricArc(ownerX-60+i*60,FLOOR-205,ownerX+Math.sin(t*10+i)*70,FLOOR-260-i*12,t,2.5,i);
    for(let i=0;i<3;i++){const a=t-(.65+i*.3);if(a>=0 && a<.22)drawElectricArc(x+(i-1)*92,-20,x+(i-1)*70,FLOOR-12,t,4,i+9);}
    // A brief dark hold before the main bolt adds anticipation without stopping the audio clock.
    if(t>1.65){ctx.fillStyle='rgba(1,3,15,.20)';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
  }
  if(age>=0 && age<.68) {
    const width=age<.15?19:Math.max(2,13*(1-age/.68));
    drawElectricArc(x-35,-20,x,FLOOR-12,t,width,2);
    drawElectricArc(x+65,-20,x,FLOOR-12,t,width*.55,5);
    if(age<.18){ctx.fillStyle=`rgba(212,248,255,${.58*(1-age/.18)})`;ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
    for(let i=0;i<6;i++)drawElectricArc(x,FLOOR-12,x+(i-2.5)*72,FLOOR+Math.sin(i*8+t*12)*7,t,3,i);
  }
  drawSuperImpact(c);
  ctx.textAlign='center';ctx.shadowBlur=15;ctx.shadowColor='#36b9ff';ctx.fillStyle='#d4faff';ctx.font='italic bold 32px Arial';ctx.fillText('TORMENTA ELÉCTRICA',VIEW_WIDTH/2,84);
  ctx.restore();
}
function removeConcrete(p) {
  stopCombatSound(p.sound);const i=projectiles.indexOf(p);if(i>=0)projectiles.splice(i,1);
}
function applyConcreteHold(f) {
  stopFighterSound(f);
  f.concreteHold=3;f.concreteCoat=3;f.concretePose=POSES[f.kind].hit;
  f.knockdown=null;f.action="hit";f.actionTime=f.actionDuration=3;f.moveSpec=null;
  f.vx=0;f.vy=Math.max(0,f.vy);f.moveIntent=0;f.crouching=f.guarding=false;
  f.queuedAction=null;f.queueTime=0;f.kickStyle=null;f.airAttack=false;
  f.specialSpawned=true;f.lowAttack=false;
}
function tickConcreteHold(f,dt) {
  if(f.concreteHold<=0)return;
  f.concreteHold=Math.max(0,f.concreteHold-dt);
  if(f.concreteHold<.000001)f.concreteHold=0;
  f.concreteCoat=f.concreteHold;
  if(f.concreteHold===0){
    f.action="idle";f.actionTime=f.actionDuration=0;f.moveSpec=null;
    f.queuedAction=null;f.queueTime=0;
    burst(f.x,f.y-80,"#babfbb",16);
  }
}
// Coat the actual fighter silhouette, preserving face/limb detail under gray mix.
const concreteSprites=new Map();
function concreteSprite(frame) {
  const key=frame.kind+":"+frame.pose;
  if(concreteSprites.has(key))return concreteSprites.get(key);
  const original=spriteFrame(frame);if(!original)return null;
  const surface=document.createElement("canvas");surface.width=surface.height=270;
  const paint=surface.getContext("2d");
  paint.filter="grayscale(1) contrast(.72) brightness(1.35)";
  paint.drawImage(original,0,0);paint.filter="none";
  paint.globalCompositeOperation="source-atop";
  paint.fillStyle="rgba(170,176,172,.65)";paint.fillRect(0,0,270,270);
  for(let i=0;i<95;i++){
    paint.fillStyle=i%3?"rgba(76,85,80,.22)":"rgba(245,247,238,.36)";
    paint.fillRect((i*73)%268,(i*47)%268,2+i%4,2+i%3);
  }
  paint.strokeStyle="rgba(76,84,80,.45)";paint.lineWidth=1.4;
  for(let i=0;i<8;i++){const x=72+(i*37)%132,y=60+i*25;paint.beginPath();paint.moveTo(x,y);paint.lineTo(x+9,y+8);paint.lineTo(x+3,y+16);paint.stroke();}
  concreteSprites.set(key,surface);return surface;
}
function updateConcrete(p,dt) {
  p.age+=dt;p.life-=dt;p.prevX=p.x;p.prevY=p.y;
  if(p.contactDone) {p.impactAge+=dt;if(p.impactAge>.34)removeConcrete(p);return;}
  const remaining=stats.peluche.powerRange-Math.abs(p.x-p.originX)-p.radius;
  if(remaining<=0 || p.life<=0){removeConcrete(p);return;}
  p.x+=p.direction*Math.min(Math.abs(p.vx)*dt,remaining);p.vy+=190*dt;p.y+=p.vy*dt;
  const target=p.owner===player?cpu:player;
  const box={left:Math.min(p.prevX,p.x)-p.radius,right:Math.max(p.prevX,p.x)+p.radius,
    top:Math.min(p.prevY,p.y)-p.radius,bottom:Math.max(p.prevY,p.y)+p.radius};
  if((target.invuln<=0 && overlaps(box,hurtBox(target))) || p.y+p.radius>=FLOOR) {
    p.contactDone=true;p.vx=p.vy=0;stopCombatSound(p.sound);
    if(overlaps(box,hurtBox(target)) && target.invuln<=0) {
      const landed=hit(target,p.damage,0,0,p.owner,{sourceX:p.owner.x,direction:p.direction,projectile:true,x:p.x,y:p.y});
      if(landed && target.action==="hit" && target.health>0 && state==="playing")applyConcreteHold(target);
    }
    if(state==='playing')startCombatSound('concreteImpact');
    burst(p.x,p.y,'#c6cbc8',22);burst(p.x,p.y,'#f0f0e8',8);
    addEffect('impact',p.x,p.y,'#d7dbd9',48,.22);screenShake=Math.max(screenShake,4);
  }
}
function drawConcrete(p) {
  const x=lerp(p.prevX,p.x,renderAlpha),y=lerp(p.prevY,p.y,renderAlpha);
  if(p.contactDone){drawWorkProp('concreteSplash',x,y+65,140+p.impactAge*100,0,p.direction,Math.max(0,1-p.impactAge/.34));return;}
  drawWorkProp('concrete',x,y+27,96,Math.atan2(p.vy,Math.abs(p.vx))*.4,p.direction);
  ctx.save();
  for(let i=0;i<8;i++) {
    const t=(p.age*3+i*.13)%1;
    ctx.fillStyle=i%2?'#e3e3d8':'#909994';ctx.globalAlpha=(1-t)*.8;
    ctx.fillRect(x-p.direction*(35+t*55),y+8+t*t*35+Math.sin(i*8)*10,4+i%3,3+i%4);
  }ctx.restore();
}
function drawConcreteCharge(f) {
  if(f.action!=='special' || f.specialSpawned || workCinematic)return;
  const t=Math.min(1,(f.actionDuration-f.actionTime)/f.moveSpec.startup);
  drawWorkProp('concrete',f.x-f.facing*37,f.y-104,18+32*t,-.1,f.facing);
}
function drawConcreteCoat(f,frame) {
  ctx.save();ctx.globalAlpha=Math.min(.85,f.concreteCoat);
  drawWorkProp('concreteSplash',frame.x+f.facing*5,frame.y-45,62,0,f.facing);
  drawWorkProp('concreteSplash',frame.x+f.facing*10,frame.y-111,25,.2,f.facing);
  if(f.concreteHold>0){ctx.globalAlpha=1;ctx.textAlign="center";ctx.font="bold 12px Arial";ctx.fillStyle="#f1f2e7";ctx.strokeStyle="#29312e";ctx.lineWidth=3;const label=Math.ceil(f.concreteHold)+" s";ctx.strokeText(label,frame.x,frame.y-stats[f.kind].height*FIGHTER_SCALE-10);ctx.fillText(label,frame.x,frame.y-stats[f.kind].height*FIGHTER_SCALE-10);}
  ctx.restore();
}
function drawConcreteCinematic(c) {
  const t=c.elapsed,x=c.impactX-cameraX,impact=c.impactAt;
  ctx.save();ctx.fillStyle='rgba(3,9,27,.42)';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  const arrival=smoothstep(Math.min(1,Math.max(0,(t-.22)/.28)));
  if(t<1.5) {
    drawWorkProp('concreteHose',x-85,205-(1-arrival)*290,205,0,1,Math.min(1,(1.5-t)*5));
    if(t>.45) {
      const bottom=lerp(205,FLOOR,Math.min(1,(t-.45)/.20));
      // Continuous wet stream, textured with the generated concrete artwork.
      ctx.save();ctx.beginPath();
      const streamWidth=yy=>18+Math.sin(t*27+yy*.08)*3+Math.sin(yy*.17-t*18)*2;
      for(let yy=200;yy<=bottom+12;yy+=12){const px=x-streamWidth(yy);yy===200?ctx.moveTo(px,yy):ctx.lineTo(px,yy);}
      for(let yy=bottom+12;yy>=200;yy-=12)ctx.lineTo(x+streamWidth(yy),yy);
      ctx.closePath();ctx.fillStyle='#aeb8b0';ctx.fill();ctx.clip();
      const flow=(t*240)%42;
      for(let i=-2;i<9;i++)drawWorkProp('concrete',x-24,200+i*42+flow,100,Math.PI/2,1);
      ctx.restore();
      for(let i=0;i<18;i++){
        const phase=(t*3+i*.137)%1,spread=Math.sin(i*7)*90*phase;
        ctx.fillStyle=i%2?'#e2e4db':'#939f9a';ctx.fillRect(x+spread,FLOOR-8-75*Math.sin(phase*Math.PI),5+i%5,5+i%3);
      }
    }
  }
  if(t>.62 && t<impact) {
    const fill=smoothstep(Math.min(1,(t-.62)/.65));
    drawWorkProp('concreteSplash',x,FLOOR+6,100+100*fill,0,1);
    drawWorkProp('concreteShell',x,FLOOR+3,65+135*fill,0,1,Math.max(0,Math.min(1,(t-.85)*3)));
    if(t>1.4){ctx.strokeStyle='#eff1df';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x+(i-2)*28,FLOOR-120);ctx.lineTo(x+(i-2)*22+Math.sin(t*80)*3,FLOOR-55);ctx.stroke();}}
  }
  if(t>=impact) {
    const q=(t-impact)/.75;ctx.globalAlpha=Math.max(0,1-q);
    drawWorkProp('concreteSplash',x,FLOOR+20,210+q*130,0,1,.5);
    for(let i=0;i<16;i++) {
      const a=Math.PI+(i/15)*Math.PI,travel=q*(120+i%4*35);
      const px=x+Math.cos(a)*travel,py=FLOOR-60+Math.sin(a)*travel+q*q*100;
      ctx.save();ctx.translate(px,py);ctx.rotate(q*(i%2?-5:5));
      ctx.fillStyle=i%3?'#b7c1b9':'#edf0e4';ctx.strokeStyle='#495450';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(5,-11);ctx.lineTo(13,3);ctx.lineTo(-5,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    if(q<.16){ctx.globalAlpha=1;ctx.fillStyle='rgba(245,247,227,'+(.5*(1-q/.16))+')';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
  }
  drawSuperImpact(c);
  ctx.globalAlpha=1;
  ctx.fillStyle='rgba(3,9,27,.72)';ctx.fillRect(215,58,530,78);
  ctx.textAlign='center';ctx.fillStyle='#eef1df';ctx.shadowColor='#e5eb99';ctx.shadowBlur=15;
  ctx.font='italic bold 38px Arial';ctx.fillText('COLADO MASIVO',480,92);
  ctx.font='bold 16px Arial';ctx.fillText(t<.38?'¡PREPARAR EL COLADO!':t<1.35?'DESCARGAR · ATRAPAR':t<impact?'COMPACTAR · ENDURECER':'¡ROTURA TOTAL!',480,122);ctx.shadowBlur=0;

  ctx.restore();
}


// Linares keeps the cable anchored to his hand; only its electrified tip collides.
function spawnCable(owner) {
  const x=owner.x+owner.facing*48,y=owner.y-118;
  const sound=owner.attackSound||startCombatSound('cable');owner.attackSound=null;
  projectiles.push({owner,style:'cable',sound,direction:owner.facing,x,y,prevX:x,prevY:y,
    originX:owner.x,age:0,life:.70,radius:14,damage:powerDamage(owner),contactDone:false,impactAge:0});
}
function updateCable(p,dt) {
  p.age+=dt;p.life-=dt;p.prevX=p.x;p.prevY=p.y;
  if(p.life<=0){removeConcrete(p);return;}
  const reach=stats[p.owner.kind].powerRange-p.radius;
  const extend=Math.min(1,p.age/.30),retract=p.age>.36?Math.max(0,1-(p.age-.36)/.34):1;
  p.x=p.originX+p.direction*(48+(reach-48)*extend*retract);
  if(p.contactDone || p.age>.36)return;
  const target=p.owner===player?cpu:player;
  const box={left:Math.min(p.prevX,p.x)-p.radius,right:Math.max(p.prevX,p.x)+p.radius,top:p.y-p.radius,bottom:p.y+p.radius};
  if(target.invuln<=0 && !isVanished(target) && overlaps(box,hurtBox(target))) {
    p.contactDone=true;
    hit(target,p.damage,p.direction*210,0,p.owner,{sourceX:p.originX,direction:p.direction,projectile:true,x:target.x,y:p.y});
    if(target.action==='hit')target.electricCoat=.65;
    stopCombatSound(p.sound);
    burst(target.x,p.y,'#95edff',20);addEffect('ring',target.x,p.y,'#d5fbff',40,.22);
  }
}
function drawCable(p) {
  const x=lerp(p.prevX,p.x,renderAlpha),handX=p.owner.x+p.direction*48,handY=p.owner.y-118;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  for(const [width,color] of [[8,'#08131c'],[4,'#52616f'],[1,'#abb8c4']]) {
    ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(handX,handY);
    for(let i=1;i<=24;i++){const q=i/24;ctx.lineTo(lerp(handX,x,q),lerp(handY,p.y,q)+Math.sin(q*7-p.age*20)*Math.sin(q*Math.PI)*26);}
    ctx.stroke();
  }
  for(let i=0;i<4;i++){const a=p.age*13+i*Math.PI/2;drawElectricArc(x,p.y,x+Math.cos(a)*30,p.y+Math.sin(a)*30,p.age,2,i);}
  ctx.restore();
}
function drawTransformerCinematic(c) {
  const t=c.elapsed,age=t-c.impactAt,ownerX=c.owner.x-cameraX,targetX=c.impactX-cameraX;
  const tx=Math.max(185,Math.min(VIEW_WIDTH-185,ownerX-c.direction*95));
  const fade=Math.min(1,Math.max(0,(t-.25)/.30),Math.max(0,(c.duration-t)/.32));
  const vibration=t>.65?Math.sin(t*87)*Math.min(3,(t-.65)*2):0;
  ctx.save();ctx.fillStyle='rgba(1,6,22,.50)';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  drawWorkProp('transformer',tx+vibration,FLOOR,340,0,c.direction,fade);
  ctx.save();ctx.translate(-cameraX,0);drawFighter(c.owner);ctx.restore();
  // Arcs originate from the high voltage bushings, never from the sky.
  const bushX=tx-c.direction*35,bushY=FLOOR-294;
  if(t>.45 && age<.65){
    drawElectricArc(ownerX+c.direction*32,FLOOR-128,bushX,bushY,t,2.5,2);
    for(let i=0;i<3;i++)drawElectricArc(bushX+c.direction*i*38,bushY+i*10,bushX+c.direction*(i+1)*38,bushY+8,t,2+i*.4,i+7);
  }
  if(age>=0 && age<.70){
    for(let i=0;i<3;i++)drawElectricArc(bushX,bushY+i*10,targetX,FLOOR-105+(i-1)*26,t,8-i*2,i+11);
    if(age<.12){ctx.fillStyle='rgba(190,237,255,'+(.45*(1-age/.12))+')';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
    drawWorkDust(targetX,FLOOR,age,c.direction,1.5);
  }
  drawSuperImpact(c);
  ctx.fillStyle='#d5faff';ctx.textAlign='center';ctx.font='italic bold 27px Arial';
  ctx.fillText('DESCARGA DE TRANSFORMADOR',480,78);
  ctx.font='bold 14px Arial';ctx.fillText('ENERGIZAR · CANALIZAR · DESCARGAR',480,103);
  ctx.restore();
}

// Jairo's original schedule palette and bar artwork, projected horizontally for Gabriel.
const GANTT_HITS = [
  {at:1.15,damage:6,color:"#46caff",width:92},
  {at:1.45,damage:6,color:"#53ed9c",width:84},
  {at:1.75,damage:8,color:"#ffce45",width:76},
  {at:2.05,damage:14,color:"#ff426b",width:112}
];
function updateGanttCinematic(c) {
  if(!c.sound && c.elapsed>=.6)c.sound=startCombatSound("crash");
  c.hits ??= 0;
  while(c.hits<GANTT_HITS.length && c.elapsed>=GANTT_HITS[c.hits].at && state==="playing") {
    const bar=GANTT_HITS[c.hits++],t=c.target,final=c.hits===GANTT_HITS.length;
    hitWorkCinematic(c,bar.damage,final?240:55,final?-140:0);
    burst(t.x,t.y-95,bar.color,final?36:12);
    if(final){c.impact=true;dustBurst(t.x,FLOOR,24);}
    screenShake=final?18:7;hitStop=0;syncCombatSounds();
  }
}
function drawGanttCinematic(c) {
  const t=c.elapsed,origin=c.originX-cameraX+c.direction*45,impact=c.impactX-cameraX;
  ctx.save();ctx.fillStyle="rgba(3,9,27,.36)";ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  ctx.textAlign="center";ctx.font="italic bold 34px Arial";ctx.fillStyle="#ff426b";
  ctx.shadowColor="#ff244f";ctx.shadowBlur=15;ctx.fillText("GANTT IMPACTO",480,92);ctx.shadowBlur=0;
  ctx.translate(origin,c.owner.y-125);ctx.scale(c.direction,1);
  const length=Math.max(70,(impact-origin)*c.direction),charge=Math.min(1,t/.6);
  ctx.globalAlpha=charge*Math.max(0,Math.min(1,(2.6-t)/.5));
  ctx.fillStyle="#091d36";ctx.fillRect(-18,-100,260,152);ctx.strokeStyle="#42caff";ctx.lineWidth=1;
  for(let x=-18;x<=242;x+=26){ctx.beginPath();ctx.moveTo(x,-100);ctx.lineTo(x,52);ctx.stroke();}
  for(let y=-100;y<=52;y+=26){ctx.beginPath();ctx.moveTo(-18,y);ctx.lineTo(242,y);ctx.stroke();}
  GANTT_HITS.forEach((bar,i)=>{
    const release=bar.at-.42,progress=Math.max(0,Math.min(1,(t-release)/.42));
    if(t>=bar.at)return;
    const start=i*32,y=lerp(-76+i*32,25,progress),x=lerp(start,length-bar.width/2,progress);
    ctx.globalAlpha=charge;ctx.fillStyle=bar.color;
    if(progress>0){ctx.globalAlpha=.2;ctx.fillRect(x-75,y-12,75,24);ctx.globalAlpha=1;}
    ctx.shadowColor=bar.color;ctx.shadowBlur=12;ctx.fillRect(x,y-12,bar.width,24);ctx.shadowBlur=0;
    ctx.strokeStyle="#ecfaff";ctx.lineWidth=2;ctx.strokeRect(x,y-12,bar.width,24);
    ctx.fillStyle="#15314c";for(let n=8;n<bar.width;n+=15)ctx.fillRect(x+n,y-6,2,12);
  });
  ctx.restore();
  if(c.impact)drawSuperImpact(c);
}

// One attack owns three independently swept cigarettes: 7+7+7 raw damage.
function spawnCigarettes(owner) {
  const x=owner.x+owner.facing*45,y=owner.y-118;
  const sound=owner.attackSound||startCombatSound('cigarettes');owner.attackSound=null;
  projectiles.push({owner,style:'cigarettes',sound,x,y,prevX:x,prevY:y,prevSpin:0,spin:0,
    originX:owner.x,direction:owner.facing,age:0,life:1.08,trail:[],
    cigarettes:[-8,0,8].map((offset,i)=>({delay:i*.13,x,prevX:x,y:y+offset,done:false,doneAt:0,impact:false,trail:[]}))});
}
function updateCigarettes(p,dt) {
  p.age+=dt;p.life-=dt;
  const target=p.owner===player?cpu:player,reach=stats[p.owner.kind].powerRange;
  for(const c of p.cigarettes) {
    if(c.done || p.age<c.delay)continue;
    c.prevX=c.x;
    const travel=Math.min(reach-45,Math.max(0,p.age-c.delay)*1050);
    c.x=p.originX+p.direction*(45+travel);
    c.trail.unshift({x:c.x,y:c.y});if(c.trail.length>20)c.trail.pop();
    const box={left:Math.min(c.prevX,c.x)-8,right:Math.max(c.prevX,c.x)+8,top:c.y-9,bottom:c.y+9};
    if(target.invuln<=0 && !isVanished(target) && overlaps(box,hurtBox(target))) {
      c.done=true;c.doneAt=p.age;c.impact=true;c.impactX=target.x;
      hit(target,powerDamage(p.owner)/3,p.direction*65,0,p.owner,
        {sourceX:p.originX,direction:p.direction,projectile:true,x:target.x,y:c.y});
      burst(target.x,c.y,'#ff7632',12);addEffect('ring',target.x,c.y,'#ffb34e',28,.18);
      if(state!=='playing')return;
      startCombatSound('emberImpact');
    }else if(travel>=reach-45 || c.x<STAGE_LEFT || c.x>STAGE_RIGHT){c.done=true;c.doneAt=p.age;}
  }
  // Keep the visual ember burst briefly after contact; spent cigarettes cannot collide again.
  if(p.life<=0 || p.cigarettes.every(c=>c.done && p.age-c.doneAt>=.24))removeConcrete(p);
}
function drawLitCigarette(x,y,direction,angle=0,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(direction*scale,scale);
  ctx.fillStyle='#24190f';ctx.fillRect(-18,-4,29,8);
  ctx.fillStyle='#f2e5cf';ctx.fillRect(-16,-2,22,4);
  ctx.fillStyle='#ba7835';ctx.fillRect(-16,-2,7,4);
  ctx.shadowColor='#ff5621';ctx.shadowBlur=10;ctx.fillStyle='#e7391f';ctx.fillRect(6,-3,5,6);
  ctx.fillStyle='#fff0a1';ctx.fillRect(8,-1,3,2);ctx.restore();
}
function drawCigarettes(p) {
  ctx.save();
  for(const [index,c] of p.cigarettes.entries()) {
    if(p.age<c.delay)continue;
    const tailFade=c.done?Math.max(0,1-(p.age-c.doneAt)/.24):1;
    c.trail.forEach((point,i)=>{
      const fade=(1-i/20)*tailFade,size=5+i*.55;
      ctx.globalAlpha=fade*.54;ctx.fillStyle=i<5?'#f0d7b9':'#c8c6c0';
      ctx.fillRect(point.x-size/2,point.y-size/2-i*.7,size,size);
      if(i<9){ctx.globalAlpha=fade*.85;ctx.fillStyle=i<3?'#ffe796':'#ee6b26';ctx.fillRect(point.x-p.direction*5,point.y-1,7,3);}
      if(i%3===0){ctx.globalAlpha=fade;ctx.fillStyle='#ffc45b';ctx.fillRect(point.x,point.y+Math.sin(p.age*24+i+index)*9,3,3);}
    });
    ctx.globalAlpha=1;
    if(!c.done){
      const x=lerp(c.prevX,c.x,renderAlpha);
      ctx.save();ctx.translate(x+p.direction*9,c.y);ctx.scale(p.direction,1);
      ctx.shadowColor='#ff721f';ctx.shadowBlur=18;ctx.fillStyle='#f36b22';
      ctx.beginPath();ctx.moveTo(4,-6);ctx.lineTo(-16,-4);ctx.lineTo(-28-Math.sin(p.age*42+index)*4,0);ctx.lineTo(-14,5);ctx.lineTo(4,6);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffd45b';ctx.fillRect(-9,-4,13,8);ctx.fillStyle='#fff2b5';ctx.fillRect(0,-3,5,6);ctx.restore();
      drawLitCigarette(x,c.y,p.direction,Math.sin(p.age*14+index)*.08,1.12);
    }else if(c.impact && tailFade>0){
      const q=(p.age-c.doneAt)/.24;
      ctx.globalAlpha=tailFade;
      drawSiteFlame(c.impactX,c.y+14,48*(1-q*.6),38,p.age,index);
      ctx.fillStyle='#fff1ae';ctx.fillRect(c.impactX-4,c.y-5,8*tailFade,10*tailFade);
      for(let j=0;j<7;j++){
        const a=j*Math.PI*2/7,r=10+q*38;
        ctx.fillStyle=j%2?'#ffd96b':'#ff7230';ctx.fillRect(c.impactX+Math.cos(a)*r,c.y+Math.sin(a)*r,3,4);
      }
    }
  }
  ctx.restore();
}
function drawSmokingFernando(f,frame) {
  if(f.action!=='idle' && !f.guarding && f.action!=='block')return;
  const scale=stats[f.kind].size*FIGHTER_SCALE/270;
  const x=frame.x+f.facing*28*scale,y=frame.y-(f.crouching?99:174)*scale;
  ctx.save();ctx.fillStyle='#c1bfbc';
  for(let i=0;i<7;i++){
    const rise=(f.animClock*19+i*6)%42;
    ctx.globalAlpha=.24*(1-rise/45);
    ctx.fillRect(x+Math.sin(rise*.17+i)*4,y-rise,3+i%2,5);
  }
  ctx.restore();
}
// Pixel-shaped flames and smoke use the simulation clock, including during pause.
function drawSiteFlame(x,y,height,width,t,seed) {
  ctx.save();
  for(const [scale,color] of [[1,'#d73720'],[.76,'#ff8b2a'],[.45,'#ffe16a']]) {
    const h=height*scale,w=width*scale;
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-w/2,y);
    for(let i=0;i<=6;i++) {
      const q=i/6,tip=(i%2?.55:1)*(1+.15*Math.sin(t*15+seed+i*2.3));
      ctx.lineTo(Math.round((x-w/2+q*w)/3)*3,Math.round((y-h*tip*Math.sin(Math.PI*q))/3)*3);
    }
    ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
// Dedicated poses follow the simulation clock, including during pause.
function fernandoSuperPose(c) {
  const t=c.elapsed;
  if(t<1.05)return 24+Math.floor(Math.max(0,t-.20)*11)%2;
  return t<2.20?26:t<2.85?27:t<3.14?28:29;
}
function updateFernandoFireSuper(c,dt) {
  const t=c.elapsed,o=c.owner;
  if(t<=1.05)o.x=lerp(c.originX,c.approachX,smoothstep((t-.20)/.85));
  else o.x=c.approachX; // The dropped can stays planted through lighting and ignition.
  o.vx=o.vy=0;o.facing=c.direction;
  if(t>.20 && t<1.05 && t>=c.dustAt){dustBurst(o.x-c.direction*25,FLOOR,3);c.dustAt=t+.13;}
  if(c.impact)c.target.flash=Math.max(0,c.target.flash-dt);
  updateCamera(dt);
}
function drawFernandoBurn(f,frame) {
  const age=1.45-f.fernandoBurn,fade=Math.min(1,f.fernandoBurn/.30);
  const h=f.knockdown?75:stats[f.kind].height*FIGHTER_SCALE;
  ctx.save();ctx.globalAlpha=fade;
  const glow=ctx.createRadialGradient(frame.x,frame.y-h*.5,8,frame.x,frame.y-h*.5,h*.8);
  glow.addColorStop(0,'rgba(255,188,61,.34)');glow.addColorStop(1,'rgba(245,70,18,0)');
  ctx.fillStyle=glow;ctx.fillRect(frame.x-h,frame.y-h*1.6,h*2,h*1.8);
  for(let i=0;i<5;i++)drawSiteFlame(frame.x+(i-2)*19,frame.y+2,h*(.78+.10*Math.sin(age*19+i)),37,age,i+7);
  for(let i=0;i<12;i++){
    const rise=(age*130+i*19)%210;
    ctx.globalAlpha=fade*(1-rise/230)*.65;ctx.fillStyle=i%3?'#ffb544':'#fff1bb';
    ctx.fillRect(frame.x+Math.sin(age*7+i*3)*50,frame.y-rise,3,5);
  }
  for(let i=0;i<6;i++){
    const rise=(age*85+i*31)%180;
    ctx.globalAlpha=fade*(1-rise/210)*.32;ctx.fillStyle='#777b80';
    ctx.fillRect(frame.x+Math.sin(i+age*2)*36-17,frame.y-h-rise,34+rise*.15,24+rise*.12);
  }
  ctx.restore();
}
function drawFireCinematic(c) {
  const t=c.elapsed,dir=c.direction,impact=c.impactX-cameraX;
  ctx.save();ctx.fillStyle='rgba(20,6,4,.32)';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
  drawSuperAtmosphere(c);
  // Foreground actors keep the red can and hand gestures clear through the atmosphere.
  ctx.save();ctx.translate(-cameraX,0);
  if(t>.20 && t<1.05){
    const frame=renderedFighter(c.owner);
    for(let i=3;i>=1;i--)drawSpriteFrame({...frame,x:frame.x-dir*i*20},.06*(4-i),true);
  }
  drawFighter(c.target);drawFighter(c.owner);ctx.restore();
  if(t>1.10 && t<3.35){
    const pour=Math.min(1,(t-1.10)/.45),fade=t>2.20?Math.max(0,1-(t-2.20)/1.15):1;
    ctx.globalAlpha=fade;
    if(t<2.20){
      const nozzle=c.approachX-cameraX+dir*91,ny=FLOOR-118;
      const endY=FLOOR-Math.min(130,stats[c.target.kind].height*FIGHTER_SCALE*.65);
      ctx.lineCap='round';
      for(const [width,color] of [[10,'rgba(225,186,87,.35)'],[5,'#e6ce86'],[2,'#fff1bb']]){
        ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(nozzle,ny);
        ctx.quadraticCurveTo(lerp(nozzle,impact,.5),ny-26+Math.sin(t*25)*4,lerp(nozzle,impact,pour),lerp(ny,endY,pour));ctx.stroke();
      }
    }
    for(let i=0;i<14;i++){
      const fall=(t*125+i*19)%145;
      ctx.globalAlpha=fade*.70;ctx.fillStyle=i%3?'#ddcc85':'#fff4c5';
      ctx.fillRect(impact+Math.sin(i*2+t*3)*25,FLOOR-130+fall,3,7+i%4);
    }
    ctx.globalAlpha=fade*.62;ctx.fillStyle='#bdad6b';ctx.beginPath();ctx.ellipse(impact,FLOOR+3,30+pour*24,6,0,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(t>=2.85 && t<3.35){
    const q=(t-2.85)/.50,x=lerp(c.throwX-cameraX,impact,q),y=lerp(FLOOR-140,FLOOR-106,q)-Math.sin(q*Math.PI)*25;
    for(let i=5;i>=1;i--){ctx.globalAlpha=(1-i/6)*.5;ctx.fillStyle='#e7d7bf';ctx.fillRect(x-dir*i*9,y-i*2,6+i,4+i);}
    ctx.globalAlpha=1;drawLitCigarette(x,y,dir,q*3,1.1);ctx.fillStyle='#ffeeb0';ctx.fillRect(x+dir*11,y-7,3,3);
  }
  if(c.impact){
    const age=t-c.impactAt;
    if(age<.12){ctx.fillStyle='rgba(255,209,112,'+(.42*(1-age/.12))+')';ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);}
    const strength=c.blocked?.30:1;
    for(let i=-2;i<=2;i++)drawSiteFlame(impact+i*24,FLOOR,Math.max(15,(125-Math.abs(i)*18)*strength*Math.max(0,1-age/1.4)),48,t,i+19);
    drawSuperImpact(c);
    if(!c.blocked && age<.90){
      ctx.font='italic bold 25px Arial';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#44120c';ctx.fillStyle='#fff2c1';
      const labelY=Math.max(145,c.target.y-stats[c.target.kind].height*FIGHTER_SCALE-28);
      ctx.strokeText('¡AAAAAH!',impact,labelY);ctx.fillText('¡AAAAAH!',impact,labelY);
    }
  }
  ctx.fillStyle='rgba(20,8,4,.80)';ctx.fillRect(250,48,460,65);
  ctx.textAlign='center';ctx.font='italic bold 32px Arial';ctx.fillStyle='#ffbd6b';ctx.fillText('INCENDIO DE OBRA',480,79);
  ctx.font='bold 14px Arial';ctx.fillStyle='#ffe5c0';
  ctx.fillText(t<1.05?'A TODA VELOCIDAD':t<2.20?'BIDÓN ROJO · COMBUSTIBLE':t<2.85?'ENCENDIENDO EL CIGARRILLO':t<3.35?'CIGARRILLO ENCENDIDO':c.blocked?'¡GUARDIA!':'¡FUEGO! · HUMO · BRASAS',480,101);
  ctx.restore();
}

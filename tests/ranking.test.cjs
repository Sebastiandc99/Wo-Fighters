const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {game}=require('./engine-harness.cjs');

test('ranking is visible on the title screen and stores a Wo result in its own endpoint',async()=>{
 const html=readFileSync(join(__dirname,'..','index.html'),'utf8');
 assert.match(html,/<button id="titleRankingBtn"[^>]*>RANKING<\/button>/);
 const g=game();
 g.run("gameMode='solo';startGame('angel','peluche');state='finished';match.complete=true;match.winner=0;match.campaignRun=true;match.recordSlot=0;match.scores=[7300,1200];showGameOver()");
 assert.equal(g.nodes.get('winnerForm').hidden,false);
 const calls=[];
 g.sandbox.fetch=async (url, options={})=>{
  calls.push({url,options});
  return {ok:true,async json(){return options.method==='POST'?[{id:'record-123'}]:[{id:'record-123',name:'Seba',score:7300,created_at:1}]}};
 };
 g.nodes.get('winnerName').value='Seba';
 await g.run('saveWinner({preventDefault(){}})');
 assert.equal(g.run('state'),'ranking');
 assert.equal(calls.length,2);
 for(const call of calls){assert.match(call.url,/\/rest\/v1\/wo_scores\?/);assert.ok(call.options.headers.apikey.startsWith('sb_publishable_'));}
 const sent=JSON.parse(calls[0].options.body);
 assert.equal(sent.character,'angel');assert.equal(sent.score,7300);
 assert.equal(g.nodes.get('rankingRows').children[0].children[2].children[0].textContent,'Seba');
});

test('a rejected score is reported as a server validation error and preserves the result for retry',async()=>{
 const g=game();g.run("gameMode='solo';startGame('linares','peluche');state='finished';match.complete=true;match.winner=0;match.campaignRun=true;match.recordSlot=0;match.scores=[171817,0];showGameOver()");
 g.nodes.get('winnerName').value='Seba';
 g.sandbox.fetch=async()=>({ok:false,status:400,async json(){return {error:'Invalid result'}}});
 await g.run('saveWinner({preventDefault(){}})');
 assert.match(g.nodes.get('saveError').textContent,/rechazó los datos/);
 assert.doesNotMatch(g.nodes.get('saveError').textContent,/revisá la conexión/);
 assert.equal(g.nodes.get('winnerName').value,'Seba');assert.equal(g.run('match.scores[0]'),171817);
 assert.equal(g.run('match.saved'),false);assert.equal(g.run('match.saving'),false);
 assert.equal(g.nodes.get('saveScoreBtn').disabled,false);
 g.sandbox.fetch=async()=>({ok:true,status:200,async json(){return []}});
 await g.run('saveWinner({preventDefault(){}})');assert.equal(g.run('match.saved'),true);
});

test('all eight characters keep their names and scores and retries use insert-only deduplication',async()=>{
 for(const kind of ['angel','primitivo','peluche','tren','linares','gabriel','fernando','german']){
  const g=game();g.run(`gameMode='solo';startGame('${kind}','peluche');state='finished';match.complete=true;match.winner=0;match.campaignRun=true;match.recordSlot=0;match.scores=[171817,0];showGameOver()`);
  g.nodes.get('winnerName').value='Seba';const calls=[];
  g.sandbox.fetch=async(url,options={})=>{calls.push({url,options});return {ok:true,status:200,async json(){return []}}};
  await g.run('saveWinner({preventDefault(){}})');
  const body=JSON.parse(calls[0].options.body);assert.equal(body.character,kind);assert.equal(body.name,'Seba');assert.equal(body.score,171817);
  assert.match(calls[0].options.headers.Prefer,/ignore-duplicates/);assert.equal(new URL(calls[0].url).searchParams.get('on_conflict'),'id');assert.equal(g.run('match.saved'),true);
 }
});
test('the complete ranking is paginated with stable server ordering',async()=>{
 const g=game(),calls=[];
 g.sandbox.fetch=async url=>{const query=new URL(url);calls.push(query);const offset=Number(query.searchParams.get('offset'));return {ok:true,status:200,async json(){return Array.from({length:offset?2:101},(_,i)=>({id:'entry-'+(offset+i),name:'Jugador '+(offset+i),score:1000-offset-i,created_at:offset+i}))}}};
 await g.run('showRanking()');assert.equal(calls.length,2);assert.equal(calls[1].searchParams.get('offset'),'100');
 assert.equal(calls[0].searchParams.get('order'),'score.desc,created_at.asc,id.asc');assert.equal(g.nodes.get('rankingRows').children.length,102);
});

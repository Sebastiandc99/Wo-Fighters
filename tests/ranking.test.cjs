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
  return {ok:true,async json(){return options.method==='POST'?{entry:{id:'record-123'}}:{entries:[{id:'record-123',name:'Seba',score:7300,createdAt:1}],next:null}}};
 };
 g.nodes.get('winnerName').value='Seba';
 await g.run('saveWinner({preventDefault(){}})');
 assert.equal(g.run('state'),'ranking');
 assert.equal(calls.length,2);
 for(const call of calls){assert.match(call.url,/\/api\/wo-ranking/);assert.doesNotMatch(call.url,/\/api\/ranking(?:\?|$)/)}
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
 g.sandbox.fetch=async(url,options={})=>({ok:true,status:200,async json(){return options.method==='POST'?{entry:{}}:{entries:[],next:null}}});
 await g.run('saveWinner({preventDefault(){}})');assert.equal(g.run('match.saved'),true);
});

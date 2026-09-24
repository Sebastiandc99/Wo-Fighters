const {game}=require('./engine-harness.cjs');
function trace(kind, source, reference=false) {
  const g=game(source), opponent=kind==='angel'?'primitivo':'angel';
  const a=reference?'jairo':kind,b=reference?'sergio':opponent;
  const profiles={angel:{speed:274,jump:615,agility:7,width:25,height:198,normalDamage:9,resistance:98},primitivo:{speed:238,jump:595,agility:4,width:32,height:184,normalDamage:10,resistance:110}};
  g.run(`Object.assign(stats.${a},${JSON.stringify(profiles[kind])});Object.assign(stats.${b},${JSON.stringify(profiles[opponent])});startGame('${a}','${b}');state='playing';gameMode='versus';player.x=220;cpu.x=750;`);
  const frames=[];
  function advance(seconds){for(let i=0;i<Math.round(seconds*120);i++){
    g.tick(1/120);
    frames.push(JSON.parse(g.run(`JSON.stringify(fighters.map(f=>({x:f.x,y:f.y,vx:f.vx,vy:f.vy,grounded:f.grounded,facing:f.facing,action:f.action,time:f.actionTime,health:f.health,guard:f.guarding})),(k,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v)`)));
  }}
  g.key('KeyD');advance(.35);g.key('KeyD','keyup');advance(.3);
  g.key('KeyW');advance(.25);g.key('KeyK');advance(1);
  g.run('player.x=430;cpu.x=500;player.vx=cpu.vx=0;');g.key('KeyJ');advance(.7);
  g.run('player.x=430;cpu.x=500;player.vx=cpu.vx=0;held2.guard=true;');g.key('KeyK');advance(.8);
  g.key('KeyS');g.key('KeyK');advance(.65);g.key('KeyJ');advance(.8);g.key('KeyS','keyup');
  g.key('KeyO');advance(.75);
  g.run('player.x=650;cpu.x=250;player.vx=cpu.vx=0;');advance(.1);
  return frames;
}
module.exports={trace};

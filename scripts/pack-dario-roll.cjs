// Pack four genuine somersault drawings at one fixed scale and a shared ground line.
// Usage: node scripts/pack-dario-roll.cjs transparent-strip.png assets/dario-roll-v2.webp
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),components=[];
 for(let start=0;start<w*h;start++){
  if(labels[start]||data[start*4+3]<=20)continue;
  const id=components.length+1,queue=[start];labels[start]=id;
  let l=w,r=0,t=h,b=0;
  for(let n=0;n<queue.length;n++){
   const at=queue[n],x=at%w,y=Math.floor(at/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1])if(next>=0&&!labels[next]&&data[next*4+3]>20){labels[next]=id;queue.push(next)}
  }
  components.push({id,left:l,top:t,width:r-l+1,height:b-t+1,count:queue.length});
 }
 const sprites=components.sort((a,b)=>b.count-a.count).slice(0,4).sort((a,b)=>a.left-b.left);
 if(sprites.length!==4)throw Error('Expected four separate somersault frames');
 const scale=Math.min(150/sprites[0].height,208/Math.max(...sprites.map(s=>s.height)),250/Math.max(...sprites.map(s=>s.width))),tiles=[];
 for(const [i,s] of sprites.entries()){
  const raw=Buffer.alloc(s.width*s.height*4);
  for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
   const src=(s.top+y)*w+s.left+x;if(labels[src]===s.id)data.copy(raw,(y*s.width+x)*4,src*4,src*4+4);
  }
  const width=Math.round(s.width*scale),height=Math.round(s.height*scale);
  const input=await sharp(raw,{raw:{width:s.width,height:s.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  tiles.push({input,left:i*270+Math.floor((270-width)/2),top:260-height});
 }
 await sharp({create:{width:1080,height:270,channels:4,background:'#00000000'}}).composite(tiles).webp({lossless:true}).toFile(process.argv[3]);
 console.log('Packed four grounded frames',sprites.map(s=>[s.width,s.height]),'scale',scale);
})().catch(e=>{console.error(e);process.exitCode=1});

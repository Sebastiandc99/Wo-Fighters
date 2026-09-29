// Pack generated upright/pointing poses with a fixed scale and aligned feet.
// Usage: NODE_PATH=... node scripts/pack-primitivo-intro.cjs input.png output.webp
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),components=[];
 for(let start=0;start<w*h;start++){
  if(labels[start]||data[start*4+3]<=20)continue;
  const id=components.length+1,q=[start];labels[start]=id;let l=w,r=0,t=h,b=0;
  for(let k=0;k<q.length;k++){
   const n=q[k],x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const a of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(a>=0&&!labels[a]&&data[a*4+3]>20){labels[a]=id;q.push(a);}
  }components.push({id,l,t,width:r-l+1,height:b-t+1,count:q.length});
 }
 const poses=components.sort((a,b)=>b.count-a.count).slice(0,2).sort((a,b)=>a.l-b.l),tiles=[];
 if(poses.length!==2)throw Error('Two connected sprites required');
 const scale=208/poses[0].height;
 for(let i=0;i<poses.length;i++){
  const p=poses[i],raw=Buffer.alloc(p.width*p.height*4);let footLeft=p.width,footRight=0;
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
   const n=(p.t+y)*w+p.l+x;if(labels[n]!==p.id)continue;
   data.copy(raw,(y*p.width+x)*4,n*4,n*4+4);
   if(y>=p.height*.85){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
  }
  const width=Math.round(p.width*scale),height=Math.round(p.height*scale);
  const left=Math.round(135-(footLeft+footRight)/2*scale);
  if(left<0||left+width>270)throw Error('Sprite would clip');
  const input=await sharp(raw,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  tiles.push({input,left:i*270+left,top:260-height});
 }
 await sharp({create:{width:540,height:270,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true}).toFile(process.argv[3]);
 console.log(process.argv[3],poses);
})().catch(e=>{console.error(e);process.exitCode=1;});

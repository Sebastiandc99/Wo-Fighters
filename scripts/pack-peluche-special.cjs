// Pack the two generated full-body poses by connected component, avoiding grid-edge clipping.
const sharp=require('sharp');
const pixel=process.argv.includes('--pixel');
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
 for(let i=0;i<poses.length;i++){
  const p=poses[i],raw=Buffer.alloc(p.width*p.height*4);
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
   const n=(p.t+y)*w+p.l+x;if(labels[n]===p.id)data.copy(raw,(y*p.width+x)*4,n*4,n*4+4);
  }
  const height=208,width=Math.round(p.width*height/p.height);
  const input=await sharp(raw,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:pixel?'nearest':'lanczos3'}).png().toBuffer();
  tiles.push({input,left:i*270+Math.floor((270-width)/2),top:260-height});
 }
 await sharp({create:{width:540,height:270,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({quality:94,alphaQuality:100,lossless:pixel}).toFile(process.argv[3]);
 console.log(poses);
})().catch(e=>{console.error(e);process.exitCode=1;});

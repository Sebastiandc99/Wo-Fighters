// Package generated artwork with one scale per sheet and aligned feet; preserve alpha.
// Usage: node scripts/build-german-assets.cjs combat.png signals.png
const sharp=require('sharp');
async function figures(file,count,rows){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,labels=new Int32Array(w*h),parts=[];
 for(let at=0;at<w*h;at++){
  if(labels[at]||data[at*4+3]<=20)continue;
  const id=parts.length+1,q=[at];labels[at]=id;let l=w,r=0,t=h,b=0;
  for(let n=0;n<q.length;n++){
   const p=q[n],x=p%w,y=Math.floor(p/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const v of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(v>=0&&!labels[v]&&data[v*4+3]>20){labels[v]=id;q.push(v);}
  }parts.push({id,l,t,width:r-l+1,height:b-t+1,count:q.length});
 }
 const selected=parts.sort((a,b)=>b.count-a.count).slice(0,count);
 if(selected.length!==count)throw Error('Missing sprites');
 selected.sort((a,b)=>Math.floor((a.t+a.height/2)/(h/rows))-Math.floor((b.t+b.height/2)/(h/rows))||a.l-b.l);
 return Promise.all(selected.map(async p=>{
  const raw=Buffer.alloc(p.width*p.height*4);
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
   const from=(p.t+y)*w+p.l+x;if(labels[from]===p.id)data.copy(raw,(y*p.width+x)*4,from*4,from*4+4);
  }
  return {input:await sharp(raw,{raw:{width:p.width,height:p.height,channels:4}}).png().toBuffer(),...p};
 }));
}
async function sheet(parts,out,columns,scale){
 const tiles=[];
 for(let i=0;i<parts.length;i++){
  const p=parts[i],w=Math.round(p.width*scale),h=Math.round(p.height*scale);
  if(w>270||h>260)throw Error('Clipped sprite');
  tiles.push({input:await sharp(p.input).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:i%columns*270+Math.floor((270-w)/2),top:Math.floor(i/columns)*270+260-h});
 }
 await sharp({create:{width:270*columns,height:270*Math.ceil(parts.length/columns),channels:4,background:'#00000000'}}).composite(tiles).webp({lossless:true}).toFile(out);
}
(async()=>{
 const combat=await figures(process.argv[2],16,4),signals=await figures(process.argv[3],4,2);
 const scale=Math.min(208/combat[0].height,254/Math.max(...combat.map(p=>p.width)));
 await sheet(combat,'assets/german-atlas-v1.webp',4,scale);
 await sheet(signals,'assets/german-signals-v1.webp',4,193/signals[0].height);
 await sharp(signals[2].input).resize(512,784,{fit:'contain',position:'bottom',background:'#00000000',kernel:'nearest'}).extend({top:16,bottom:0,left:0,right:0,background:'#00000000'}).webp({lossless:true}).toFile('assets/german-portrait-v1.webp');
 console.log('Germán: 16 combat poses, 4 signals and portrait packed without clipping.');
})().catch(e=>{console.error(e);process.exitCode=1;});

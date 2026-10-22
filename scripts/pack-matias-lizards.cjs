// Pack the approved, generated 2x2 pose sheet. Usage: node scripts/pack-matias-lizards.cjs sheet.png
const sharp=require('sharp'),path=require('node:path');
(async()=>{
 const input=process.argv[2];if(!input)throw new Error('Provide the transparent 2x2 source sheet');
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames=[];
 for(let i=0;i<4;i++){
  const left=i%2*Math.floor(info.width/2),top=Math.floor(i/2)*Math.floor(info.height/2);
  const width=Math.floor(info.width/2),height=Math.floor(info.height/2);
  const rgba=Buffer.alloc(width*height*4);let minX=width,minY=height,maxX=0,maxY=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const src=((top+y)*info.width+left+x)*4,dst=(y*width+x)*4;
   data.copy(rgba,dst,src,src+4);if(rgba[dst+3]<=20)rgba[dst+3]=0;
   if(rgba[dst+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
  frames.push({rgba,width,height,bounds:{left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}});
 }
 const scale=Math.min(144/Math.max(...frames.map(f=>f.bounds.width)),80/Math.max(...frames.map(f=>f.bounds.height)));
 const poses=await Promise.all(frames.map(async f=>{
  const w=Math.round(f.bounds.width*scale),h=Math.round(f.bounds.height*scale);
  return {input:await sharp(f.rgba,{raw:{width:f.width,height:f.height,channels:4}}).extract(f.bounds).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:Math.round((160-w)/2),top:Math.round((96-h)/2)};
 }));
 const root=path.join(__dirname,'..','assets');
 await sharp({create:{width:640,height:96,channels:4,background:'#00000000'}}).composite(poses.map((p,i)=>({...p,left:p.left+i*160}))).webp({lossless:true}).toFile(path.join(root,'matias-lizards-v1.webp'));
 await sharp({create:{width:160,height:96,channels:4,background:'#00000000'}}).composite([poses[0]]).webp({lossless:true}).toFile(path.join(root,'matias-lizard-icon-v1.webp'));
 console.log('Packed 4 green poses, 640x96, icon 160x96');
})().catch(error=>{console.error(error);process.exitCode=1;});

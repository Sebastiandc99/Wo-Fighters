// Normalize the generated right-facing hit sprite to the existing 270px cell/baseline.
// Usage: NODE_PATH=... node scripts/pack-fernando-hit.cjs input.png output.webp
const sharp=require('sharp');
async function pack(input,output){
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const sprite=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize({height:200,kernel:'nearest'}).png().toBuffer();
  const size=await sharp(sprite).metadata();
  await sharp({create:{width:270,height:270,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:sprite,left:Math.floor((270-size.width)/2),top:260-size.height}]).webp({lossless:true}).toFile(output);
  console.log(output,size.width,size.height);
}
pack(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1;});

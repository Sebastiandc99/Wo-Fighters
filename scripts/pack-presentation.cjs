// Fit an approved transparent character into the existing selection portrait frame.
// Usage: node scripts/pack-presentation.cjs input.png output.webp [--pixel]
const sharp=require('sharp');
(async()=>{
  const [input,output]=process.argv.slice(2),pixel=process.argv.includes('--pixel');
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<=left||bottom<=top)throw new Error('Empty character silhouette');
  await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize(512,784,{fit:'contain',position:'bottom',background:'#00000000',kernel:pixel?'nearest':'lanczos3'})
    .extend({top:16,bottom:0,left:0,right:0,background:'#00000000'})
    .webp({lossless:true,alphaQuality:100}).toFile(output);
  console.log(output);
})().catch(e=>{console.error(e);process.exitCode=1;});

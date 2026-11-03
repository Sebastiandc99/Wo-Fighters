// Usage: node scripts/build-dario-assets.cjs combat.png presentation.png vehicles.png
// Source images: approved Darío design and generated transparent derivatives (docs/dario.md).
const {execFileSync}=require('node:child_process'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const [combat,presentation,vehicles]=process.argv.slice(2);
 execFileSync(process.execPath,[path.join(__dirname,'pack-fighter-atlas.cjs'),combat,'assets/dario-atlas-v1.webp','--pixel'],{stdio:'inherit'});
 execFileSync(process.execPath,[path.join(__dirname,'pack-presentation.cjs'),presentation,'assets/dario-presentation-v1.webp','--pixel'],{stdio:'inherit'});
 const m=await sharp(vehicles).metadata();
 for(const [name,top,height,width] of [['bus',0,499,800],['plane',500,387,1000]]){
  const part=await sharp(vehicles).extract({left:0,top,width:m.width,height}).png().toBuffer();
  await sharp(part).trim({threshold:20}).resize({width,kernel:'nearest'}).webp({lossless:true}).toFile(`assets/dario-${name}-v1.webp`);
 }
})().catch(e=>{console.error(e);process.exitCode=1});

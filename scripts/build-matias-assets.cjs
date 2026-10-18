// Pack the generated 4x4 transparent combat sheet with fixed scale and aligned feet.
// Usage: node scripts/build-matias-assets.cjs path/to/combat-source.png [path/to/standing-presentation.png]
const {execFileSync}=require('node:child_process');
const path=require('node:path'),sharp=require('sharp');
(async()=>{
 execFileSync(process.execPath,[path.join(__dirname,'pack-fighter-atlas.cjs'),process.argv[2],'assets/matias-atlas-v1.webp','--pixel'],{stdio:'inherit'});
 if(process.argv[3])await sharp(process.argv[3]).trim({threshold:8}).resize({width:512,height:800,fit:'contain',position:'bottom',background:'#00000000',kernel:'nearest'}).webp({lossless:true}).toFile('assets/matias-presentation-v3.webp');
 await sharp('assets/matias-atlas-v1.webp').extract({left:0,top:0,width:270,height:270}).trim().resize({width:512,height:784,fit:'contain',position:'bottom',background:'#00000000',kernel:'nearest'}).extend({top:16,bottom:0,left:0,right:0,background:'#00000000'}).webp({lossless:true}).toFile('assets/matias-portrait-v1.webp');
})().catch(e=>{console.error(e);process.exitCode=1});

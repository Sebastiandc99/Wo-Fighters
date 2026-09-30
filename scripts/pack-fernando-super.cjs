// Pack the generated 3x2 poses at one scale, preserving transparent pixels.
const sharp=require('sharp');
async function pack(input,output){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cw=info.width/3,ch=info.height/2,boxes=[];
 for(let i=0;i<6;i++){
  const ox=i%3*cw,oy=Math.floor(i/3)*ch;let l=cw,r=0,t=ch,b=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>20){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  boxes.push({left:ox+l,top:oy+t,width:r-l+1,height:b-t+1,localLeft:l});
 }
 const scale=204/boxes[0].height,tiles=[];
 for(let i=0;i<6;i++){
  const b=boxes[i],w=Math.round(b.width*scale),h=Math.round(b.height*scale);
  const sprite=await sharp(input).extract(bWithoutLocal(b)).resize(w,h,{kernel:'nearest'}).png().toBuffer();
  const x=Math.round(135+(b.localLeft-cw/2)*scale),y=260-h;
  if(x<0||x+w>270||y<0)throw Error('Pose clipped: '+i);
  tiles.push({input:sprite,left:i%3*270+x,top:Math.floor(i/3)*270+y});
 }
 await sharp({create:{width:810,height:540,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true}).toFile(output);
 console.log('Packed six super poses',boxes.map(b=>[b.width,b.height]));
}
function bWithoutLocal({left,top,width,height}){return {left,top,width,height};}
pack(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1;});

// Pack generated, transparent sprites without changing their painted pixels.
// Usage: NODE_PATH=... node scripts/pack-fighter-atlas.cjs input.png output.webp
const sharp = require('sharp');
async function pack(input, output) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info, labels=new Int32Array(w*h), components=[];
  for(let start=0;start<w*h;start++) {
    if(labels[start] || data[start*4+3]<=20) continue;
    const id=components.length+1, queue=[start]; labels[start]=id;
    let left=w,right=0,top=h,bottom=0;
    for(let n=0;n<queue.length;n++) {
      const at=queue[n],x=at%w,y=Math.floor(at/w);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const next of [x>0?at-1:-1,x<w-1?at+1:-1,y>0?at-w:-1,y<h-1?at+w:-1]) {
        if(next>=0 && !labels[next] && data[next*4+3]>20) {labels[next]=id;queue.push(next);}
      }
    }
    components.push({id,left,top,width:right-left+1,height:bottom-top+1,count:queue.length});
  }
  const sprites=components.sort((a,b)=>b.count-a.count).slice(0,4);
  // Sort by sprite center, then row and column; generation can cross grid boundaries.
  sprites.sort((a,b)=>Math.floor((a.top+a.height/2)/(h/2))-Math.floor((b.top+b.height/2)/(h/2)) || a.left-b.left);
  const names=['concrete','concrete-splash','concrete-hose','concrete-shell'];
  for(let i=0;i<sprites.length;i++) {
    const s=sprites[i],raw=Buffer.alloc(s.width*s.height*4);
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++) {
      const source=(s.top+y)*w+s.left+x,dest=(y*s.width+x)*4;
      if(labels[source]===s.id) data.copy(raw,dest,source*4,source*4+4);
    }
    const dest=output+'/'+names[i]+'-v1.webp';
    await sharp(raw,{raw:{width:s.width,height:s.height,channels:4}}).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:94,alphaQuality:100}).toFile(dest);
    console.log(dest,s.width,s.height);
  }

}
pack(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1;});

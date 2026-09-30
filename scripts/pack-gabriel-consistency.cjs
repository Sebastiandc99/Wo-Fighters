// Pack four generated poses at the canonical combat sprite's scale and groundline.
// Usage: node scripts/pack-gabriel-consistency.cjs generated-sheet.png
const sharp=require('sharp'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {data,info}=await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info,labels=new Int32Array(w*h),components=[];
  for(let start=0;start<w*h;start++){
    if(labels[start]||data[start*4+3]<=20)continue;
    const id=components.length+1,q=[start];labels[start]=id;let l=w,r=0,t=h,b=0;
    for(let k=0;k<q.length;k++){
      const n=q[k],x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
      for(const a of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1]){
        if(a>=0&&!labels[a]&&data[a*4+3]>20){labels[a]=id;q.push(a);}
      }
    }
    components.push({id,l,t,width:r-l+1,height:b-t+1,count:q.length});
  }
  const selected=components.sort((a,b)=>b.count-a.count).slice(0,4).sort((a,b)=>a.t-b.t);
  if(selected.length!==4)throw Error('Four connected sprites required');
  const poses=[...selected.slice(0,2).sort((a,b)=>a.l-b.l),...selected.slice(2).sort((a,b)=>a.l-b.l)];
  const ref=await sharp(path.join(root,'assets/gabriel-atlas-v1.webp')).extract({left:0,top:0,width:270,height:270}).ensureAlpha().raw().toBuffer();
  let top=270,bottom=0;
  for(let y=0;y<270;y++)for(let x=0;x<270;x++)if(ref[(y*270+x)*4+3]>20){top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const scale=(bottom-top+1)/poses[2].height,tiles=[];
  for(const p of poses){
    const raw=Buffer.alloc(p.width*p.height*4);let footLeft=p.width,footRight=0;
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const n=(p.t+y)*w+p.l+x;if(labels[n]!==p.id)continue;
      data.copy(raw,(y*p.width+x)*4,n*4,n*4+4);
      if(y>=p.height*.85){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
    }
    const width=Math.round(p.width*scale),height=Math.round(p.height*scale);
    const left=Math.round(135-(footLeft+footRight)/2*scale);
    if(left<0||left+width>270||height>260)throw Error('Pose would clip');
    tiles.push({input:await sharp(raw,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer(),left,top:260-height});
  }
  for(const [file,start] of [['gabriel-guards-v2.webp',0],['gabriel-intro-v2.webp',2]]){
    await sharp({create:{width:540,height:270,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
      .composite(tiles.slice(start,start+2).map((tile,i)=>({...tile,left:tile.left+i*270})))
      .webp({lossless:true}).toFile(path.join(root,'assets',file));
  }
  console.log('Packed Gabriel guard and intro poses',poses.map(p=>[p.width,p.height]),'scale',scale);
})().catch(e=>{console.error(e);process.exitCode=1;});

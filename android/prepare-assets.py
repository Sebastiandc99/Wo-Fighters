from pathlib import Path
import shutil, json, hashlib, re
root=Path(__file__).resolve().parent.parent
target=root/'android/app/src/main/assets/www'
target.mkdir(parents=True,exist_ok=True)
shutil.copytree(root/'assets',target/'assets',dirs_exist_ok=True)
for name in ['index.html','style.css','game.js']:
    shutil.copy2(root/name,target/name)
html=(target/'index.html').read_text()
html=html.replace('<script src="game.js','<script src="hybrid.js"></script>\n  <script src="game.js',1)
(target/'index.html').write_text(html)
shutil.copy2(root/'android/hybrid.js',target/'hybrid.js')
source=(root/'game.js').read_text()
start=source.index('async function saveWinner(')
end=source.index('\nfunction isLocked(',start)
source=source[:start]+(root/'android/ranking-adapter.js').read_text()+source[end:]
source+="""
window.WOHybrid.start({
  send: async record => rankingFetch(RANKING_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)}),
  read: async () => {
    const entries=new Map(), cursors=new Set();let cursor=null;
    do {
      const page=await rankingFetch(RANKING_API+(cursor?'?after='+encodeURIComponent(cursor):''));
      page.entries.forEach(row=>entries.set(row.id,row));
      cursor=page.next;
      if(cursor&&cursors.has(cursor)) throw new Error('Repeated ranking page');
      if(cursor)cursors.add(cursor);
    } while(cursor && window.WOHybrid.online());
    if(cursor)throw new Error('Offline');
    return [...entries.values()];
  },
  refresh:renderApkRanking
});
"""
(target/'game.js').write_text(source)
files=[p for p in (root/'assets').rglob('*') if p.is_file()]
manifest=[]
for p in files:
    q=target/p.relative_to(root)
    digest=lambda x:hashlib.sha256(x.read_bytes()).hexdigest()
    assert digest(p)==digest(q),p
    manifest.append({'path':str(p.relative_to(root)),'size':p.stat().st_size,'sha256':digest(p)})
# All literal references must resolve; dynamic names are covered by copying the entire assets directory.
for name in ['index.html','style.css','game.js']:
    text=(target/name).read_text()
    for relative in re.findall(r'assets/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|jpeg|mp3|wav|ogg|woff)',text):
        assert (target/relative).is_file(),relative
(root/'android/assets-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'{len(files)} recursos incluidos y verificados sin cambios de calidad.')

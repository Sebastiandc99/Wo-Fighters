from pathlib import Path
import shutil, re, hashlib, json
root = Path(__file__).resolve().parent.parent
dest = root / 'android/app/src/main/assets'
dest.mkdir(parents=True, exist_ok=True)
for name in ('index.html','style.css','game.js'):
    shutil.copy2(root/name, dest/name)
shutil.copytree(root/'assets',dest/'assets',dirs_exist_ok=True)
game = (dest/'game.js').read_text()
start = game.index('const RANKING_API =')
end = game.index('function isLocked(f)',start)
game = game[:start] + (root/'android/ranking-adapter.js').read_text() + '\n' + game[end:]
(dest/'game.js').write_text(game)
html = (dest/'index.html').read_text()
html = html.replace('  <script src="game.js', '  <script src="hybrid-ranking.js"></script>\n  <script src="apk-updates.js" defer></script>\n  <script src="game.js')
(dest/'index.html').write_text(html)
shutil.copy2(root/'android/hybrid-ranking.js',dest/'hybrid-ranking.js')
# Every runtime asset reference must exist locally; no recompression/resizing.
for name in ('index.html','style.css','game.js'):
    text = (dest/name).read_text()
    for relative in re.findall(r"""assets/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|mp3|wav|ogg|woff|svg)""",text):
        assert (dest/relative).is_file(), (name,relative)
    if name != 'game.js':
        assert not re.search(r"""(?:src|href)=["']https?://|url\(["']?https?://""",text), name
hashes={}
for path in (root/'assets').rglob('*'):
    if path.is_file():
        relative=path.relative_to(root).as_posix()
        original=hashlib.sha256(path.read_bytes()).hexdigest()
        assert original==hashlib.sha256((dest/relative).read_bytes()).hexdigest()
        hashes[relative]=original
(dest/'bundled-assets.json').write_text(json.dumps(hashes,sort_keys=True))
print(f'Included {len(hashes)} original assets with identical SHA-256 hashes')


shutil.copy2(root/'android/apk-updates.js',dest/'apk-updates.js')

from pathlib import Path
import zipfile, hashlib, json, os, subprocess
root=Path(__file__).resolve().parent
apk=root/'app/build/outputs/apk/debug/app-debug.apk'
with zipfile.ZipFile(apk) as z:
    hashes=json.loads(z.read('assets/bundled-assets.json'))
    for name,digest in hashes.items():
        assert hashlib.sha256(z.read('assets/'+name)).hexdigest()==digest, name
    for name in ('index.html','game.js','style.css','hybrid-ranking.js'):
        assert len(z.read('assets/'+name))>0
sdk=Path(os.environ['ANDROID_HOME'])
signers=sorted((sdk/'build-tools').glob('*/apksigner'))
assert signers, 'Missing apksigner'
subprocess.run([str(signers[-1]),'verify','--verbose',str(apk)],check=True)
output=apk.with_name('WO-Fighters-1.0.0.apk')
apk.rename(output)
print(f'Verified APK: {output.name}, {output.stat().st_size} bytes; {len(hashes)} original assets')

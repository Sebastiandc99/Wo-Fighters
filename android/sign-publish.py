"""Sign a workflow release with the private backup, verify it, then publish.
Usage: python3 android/sign-publish.py RELEASE_DIR PRIVATE_BACKUP_DIR OUTPUT_DIR
The private directory must stay outside the repository.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import sys, subprocess, hashlib, json, re, zipfile

release, private, output = map(lambda value: Path(value).resolve(), sys.argv[1:])
root = Path(__file__).resolve().parent
config = (root/'app/build.gradle').read_text()
version = re.search(r"versionName '([^']+)'", config)[1]
code = int(re.search(r'versionCode (\d+)', config)[1])
output.mkdir(parents=True, exist_ok=True)
apk = output/f'WO-Fighters-{version}.apk'
signer = ['java', '-jar', str(release/'apksigner.jar')]
subprocess.run(signer+['sign', '--ks', str(private/'wo-fighters.jks'), '--ks-key-alias', 'wofighters', '--ks-pass', 'file:'+str(private/'password.txt'), '--key-pass', 'file:'+str(private/'password.txt'), '--out', str(apk), str(release/'app-release-unsigned.apk')], check=True)
subprocess.run(signer+['verify', '--verbose', '--print-certs', str(apk)], check=True)
with zipfile.ZipFile(apk) as archive:
    hashes=json.loads(archive.read('assets/bundled-assets.json'))
    for name, digest in hashes.items():
        assert hashlib.sha256(archive.read('assets/'+name)).hexdigest()==digest, name
    assert archive.read('assets/apk-updates.js')==(root/'apk-updates.js').read_bytes()
    assert b'WoNative' in archive.read('assets/game.js')
base='https://paidalaojrkplnkucmwl.supabase.co'
manifest={'versionCode':code,'versionName':version,'url':base+'/storage/v1/object/public/wo-apk-updates/'+apk.name,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()}
(output/'latest.json').write_text(json.dumps(manifest, indent=2)+'\n')
token=(private/'publisher-token.txt').read_text().strip()
def post(route, body, mime):
    request=Request(base+'/functions/v1/wo-apk-publish/'+route, data=body, headers={'Authorization':'Bearer '+token, 'Content-Type':mime}, method='POST')
    with urlopen(request, timeout=180) as response:
        assert response.status==200
post('upload?name='+apk.name, apk.read_bytes(), 'application/vnd.android.package-archive')
with urlopen(manifest['url'],timeout=180) as response:
    assert hashlib.sha256(response.read()).hexdigest()==manifest['sha256'], 'Published APK differs'
post('manifest', json.dumps(manifest).encode(), 'application/json')
with urlopen(base+'/storage/v1/object/public/wo-apk-updates/latest.json',timeout=30) as response:
    assert json.load(response)==manifest
print(f'Published {apk.name}; {len(hashes)} original assets verified')

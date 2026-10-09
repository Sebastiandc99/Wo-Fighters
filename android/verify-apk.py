from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parent
apk=root/'app/build/outputs/apk/release/app-release.apk'
with zipfile.ZipFile(apk) as z:
    manifest=json.loads((root/'assets-manifest.json').read_text())
    for item in manifest:
        data=z.read('assets/www/'+item['path'])
        assert hashlib.sha256(data).hexdigest()==item['sha256'],item['path']
    assert 'assets/www/hybrid.js' in z.namelist()
    assert 'classes.dex' in z.namelist()
print(f'APK: {apk.stat().st_size/1048576:.1f} MiB; {len(manifest)} recursos originales verificados.')

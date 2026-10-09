"""Keep release identity. Private key is never committed to Git."""
import os,json,urllib.request,zipfile,io
from pathlib import Path
out=Path('android/signing');out.mkdir(parents=True,exist_ok=True)
token=os.environ['GH_TOKEN'];repo=os.environ['GITHUB_REPOSITORY']
def request(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}))
with request('https://api.github.com/repos/'+repo+'/actions/artifacts?name=wo-fighters-signing-backup&per_page=100') as res:
    candidates=[a for a in json.load(res)['artifacts'] if not a['expired']]
if candidates:
    with request(candidates[0]['archive_download_url']) as res:
        with zipfile.ZipFile(io.BytesIO(res.read())) as z:
            for name in ['wo-fighters.jks','password.txt']: (out/name).write_bytes(z.read(name))
    print('Existing release signing identity recovered.')
else:
    with request('https://api.github.com/repos/'+repo+'/actions/artifacts?name=WO-Fighters-Android&per_page=1') as res:
        previous=json.load(res)['artifacts']
    if previous: raise SystemExit('Signing backup unavailable. Restore original key before generating an update.')
    import secrets,subprocess
    password=secrets.token_urlsafe(48);(out/'password.txt').write_text(password)
    subprocess.run(['keytool','-genkeypair','-keystore',str(out/'wo-fighters.jks'),'-storetype','JKS','-storepass',password,'-keypass',password,'-alias','wofighters','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=WO Fighters, O=Sebastian De Castanos, C=AR'],check=True,capture_output=True)
    print('New private release signing identity created.')

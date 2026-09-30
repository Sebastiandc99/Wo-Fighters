"""Original arcade cues: footsteps, pour, lighter, ignition and a voiced AAH scream."""
from pathlib import Path
import subprocess,tempfile,wave
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parents[1]
RATE=44100
rng=np.random.default_rng(39105)
def band(n,lo,hi):
 x=sosfilt(butter(2,[lo,hi],btype='bandpass',fs=RATE,output='sos'),rng.standard_normal(n))
 return x/max(np.std(x),1e-8)
def add(out,at,x):
 at=round(at*RATE);n=min(len(x),len(out)-at)
 if n>0:out[at:at+n]+=x[:n]
def save(name,x):
 x=np.tanh(x*1.3);x*=.88/max(np.max(np.abs(x)),1e-8)
 x[:220]*=np.linspace(0,1,220);x[-2205:]*=np.linspace(1,0,2205)
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'cue.wav'
  with wave.open(str(p),'wb') as f:
   f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((x*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-codec:a','libmp3lame','-q:a','2',str(ROOT/'assets'/name)],check=True)
 print(name,round(len(x)/RATE,2),'seconds')
def crackle(seconds):
 x=np.zeros(round(seconds*RATE))
 for at in rng.uniform(0,seconds-.08,round(seconds*52)):
  t=np.arange(round(.06*RATE))/RATE
  add(x,at,band(len(t),650,6200)*np.exp(-t/.01)*rng.uniform(.06,.22))
 return x
x=np.zeros(round(4.9*RATE))
t=np.arange(round(.17*RATE))/RATE
add(x,0,(np.sin(2*np.pi*(1350*t-2100*t*t))*.15+band(len(t),1500,6200)*.04)*np.exp(-t/.055))
for at in [.24,.42,.60,.78,.94]:
 t=np.arange(round(.11*RATE))/RATE
 add(x,at,(band(len(t),75,750)*.11+np.sin(2*np.pi*95*t)*.1)*np.exp(-t/.036))
t=np.arange(round(1.12*RATE))/RATE
pour=(band(len(t),95,900)*.095+band(len(t),850,3100)*.05)*np.sin(np.pi*t/1.12)**.45
pour*=.72+.25*np.sin(t*34)+.11*np.sin(t*61)
add(x,1.08,pour)
for at in [2.25,2.33]:
 t=np.arange(round(.055*RATE))/RATE;add(x,at,band(len(t),1300,7300)*np.exp(-t/.006)*.2)
t=np.arange(round(.38*RATE))/RATE
add(x,2.88,band(len(t),280,4300)*np.sin(np.pi*t/.38)**1.5*.09)
t=np.arange(round(1.55*RATE))/RATE
fire=(band(len(t),60,620)*.28+band(len(t),450,3800)*.10+crackle(1.55))*(1-np.exp(-t/.012))*np.exp(-t/.95)
fire+=np.sin(2*np.pi*(78*t-12*t*t))*np.exp(-t/.2)*.38
add(x,3.35,fire)
save('wo-fireSuper-v3.mp3',x)
# A voiced open /a/ with moving formants, rough breath and pitch strain;
# its separate voice starts only when the rival is actually ignited.
t=np.arange(round(1.25*RATE))/RATE
f0=185+90*np.sin(np.pi*np.clip(t/.9,0,1))+16*np.sin(2*np.pi*7.5*t)
phase=2*np.pi*np.cumsum(f0)/RATE
v=np.zeros(len(t))
for k in range(1,34):
 hz=k*f0
 weight=(np.exp(-.5*((hz-850)/180)**2)+.8*np.exp(-.5*((hz-1250)/230)**2)+.3*np.exp(-.5*((hz-2850)/430)**2))/k**.38
 v+=np.sin(k*phase)*weight
v/=max(np.std(v),1e-8)
v=np.tanh(v*1.3)*.36+band(len(t),650,3800)*.07
env=np.minimum(1,t/.04)*np.minimum(1,(1.25-t)/.28)*(.84+.16*np.sin(t*35))
x=v*env
add(x,.075,x.copy()[:-round(.075*RATE)]*.12)
save('wo-fireScream-v1.mp3',x)

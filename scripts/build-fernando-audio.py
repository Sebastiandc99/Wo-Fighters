"""Original fire, ember and construction-fire cues for Fernando, deterministic and timeline matched."""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt
ROOT=Path(__file__).resolve().parents[1]
RATE=44100
rng=np.random.default_rng(1756)
def noise(n,low,high):
    x=sosfilt(butter(2,[low,high],btype='bandpass',fs=RATE,output='sos'),rng.standard_normal(n))
    return x/max(np.std(x),1e-8)
def burn(seconds,strength=1):
    n=int(seconds*RATE);t=np.arange(n)/RATE
    # Broad combustion hiss with low roaring air and many irregular tiny ember pops.
    x=(noise(n,500,8500)*.12+noise(n,65,520)*.08)*( .75+.25*np.sin(t*7.7)**2 )
    for start in rng.integers(0,max(1,n-2000),size=int(seconds*58)):
        count=min(n-start,int(rng.uniform(.004,.025)*RATE));q=np.arange(count)/RATE
        pop=noise(count,1200,11000)*np.exp(-q/rng.uniform(.002,.010))*rng.uniform(.2,.7)
        x[start:start+count]+=pop
    return x*strength

def add(out,start,sound):
    at=int(start*RATE);count=min(len(sound),len(out)-at)
    if count>0:out[at:at+count]+=sound[:count]

def whoosh(seconds,strength):
    n=int(seconds*RATE);t=np.arange(n)/RATE;q=t/seconds
    return noise(n,180,5000)*np.sin(np.pi*q)**1.8*strength

def save(name,x):
    x=np.tanh(x*1.25);x*=.88/max(np.max(np.abs(x)),1e-8)
    x[:int(.008*RATE)]*=np.linspace(0,1,int(.008*RATE));x[-int(.025*RATE):]*=np.linspace(1,0,int(.025*RATE))
    with tempfile.TemporaryDirectory() as folder:
        wav=Path(folder)/'cue.wav'
        with wave.open(str(wav),'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((x*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','3',str(ROOT/'assets'/f'wo-{name}-v1.mp3')],check=True)
    print(name,round(len(x)/RATE,2),'s',round(float(np.sqrt(np.mean(x*x))),3),'RMS')
# Draw/throw at .14 seconds, three consecutive throws, then embers remain audible.
x=burn(1.15,.85);env=np.minimum(1,np.arange(len(x))/RATE/.03)*np.minimum(1,(1.15-np.arange(len(x))/RATE)/.18);x*=env
for at in [.14,.27,.40]:add(x,at,whoosh(.14,.32))
save('cigarettes',x)
x=burn(.46,.9);t=np.arange(len(x))/RATE;x*=np.exp(-t/.22);add(x,0,whoosh(.085,.32));save('emberImpact',x)
x=burn(2.85,1.2);t=np.arange(len(x))/RATE
x*=np.minimum(1,t/.18)*(.40+.6*np.minimum(1,np.maximum(0,t-.42)/.55))*np.minimum(1,(2.85-t)/.25)
q=np.arange(int(.35*RATE))/RATE;add(x,0,np.sin(2*np.pi*(1200*q+2400*q*q))*np.exp(-q/.1)*.12)
for at in [.25,.36,.47]:add(x,at,whoosh(.15,.20))
add(x,.65,whoosh(1.20,.55))
q=np.arange(int(.95*RATE))/RATE
explosion=(noise(len(q),45,1600)*.50+np.sin(2*np.pi*(63*q-12*q*q))*.65)*np.exp(-q/.24)
add(x,1.85,explosion);add(x,1.85,whoosh(.55,.55));save('fireSuper',x)

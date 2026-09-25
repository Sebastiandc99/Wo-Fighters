"""Original electrical cues, synchronized to .19 s launch / 1.95 s super impact."""
from pathlib import Path
import tempfile, subprocess
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write
ROOT=Path(__file__).resolve().parents[1]
RATE=32000
rng=np.random.default_rng(880824)

def build(name,duration,events):
    out=np.zeros(round(RATE*duration))
    for at,length,kind,gain in events:
        t=np.arange(round(RATE*length))/RATE
        noise=rng.uniform(-1,1,len(t))
        band=sosfilt(butter(2,[450,5800],btype='band',fs=RATE,output='sos'),noise)
        low=sosfilt(butter(2,240,fs=RATE,output='sos'),noise)
        if kind=='buzz':
            phase=2*np.pi*(85*t+180*t*t/length)
            v=sum(np.sin(phase*k)/k for k in [1,2,3,5,7])*.23+band*.35
            v*=.15+.85*(t/length)**.7
        elif kind=='zap':
            v=band*.65*np.exp(-t*13)+np.sin(2*np.pi*(180*t+22*(1-np.exp(-t*75))))*.4*np.exp(-t*11)
        elif kind=='thunder':
            v=low*2.8*np.exp(-t*3)+band*np.exp(-t*18)+.55*np.sin(2*np.pi*(39*t+2*(1-np.exp(-t*25))))*np.exp(-t*5)
        elif kind=='shing':
            v=sum(np.sin(2*np.pi*f*t)*np.exp(-t*(6+i*2)) for i,f in enumerate([1220,1931,2837]))*.2
        else:
            v=band*np.exp(-t*45)+np.sin(2*np.pi*2200*t)*np.exp(-t*55)*.2
        v*=np.minimum(1,t/.002)*np.minimum(1,(length-t)/.025)*gain
        start=round(RATE*at);n=min(len(v),len(out)-start);out[start:start+n]+=v[:n]
    dry=out.copy()
    for delay,gain in [(.047,.15),(.103,.09)]:
        shift=round(delay*RATE);out[shift:]+=dry[:-shift]*gain
    out=np.tanh(out*1.45);out*=.9/max(.001,np.max(abs(out)))
    with tempfile.TemporaryDirectory() as folder:
        wav=Path(folder)/'cue.wav';write(wav,RATE,(out*32767).astype(np.int16))
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(ROOT/f'assets/wo-{name}-v1.mp3')],check=True)
    print(name,duration,'seconds, peak',round(float(np.max(abs(out))),3))

if __name__=='__main__':
    build('voltaic',.8,[(0,.19,'buzz',.9),(.19,.36,'zap',1.2),(.35,.09,'spark',.35),(.47,.09,'spark',.2)])
    build('voltaicImpact',.6,[(0,.35,'zap',1.1),(0,.45,'thunder',.55),(.19,.12,'spark',.7),(.34,.12,'spark',.4)])
    build('stormSuper',2.8,[(0,.45,'shing',.9),(.18,1.45,'buzz',.9),(.65,.48,'thunder',.5),(.95,.48,'thunder',.65),(1.25,.48,'thunder',.8),(1.95,.85,'thunder',1.4),(1.95,.65,'zap',1.3),(2.19,.16,'spark',.6),(2.42,.2,'spark',.45),(2.63,.16,'spark',.25)])

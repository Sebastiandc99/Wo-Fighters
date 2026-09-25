"""Original, reproducible construction power cues. No external sound recordings."""
from pathlib import Path
import subprocess, tempfile, sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write
RATE=32000
ROOT=Path(__file__).resolve().parents[1]
rng=np.random.default_rng(250925)

def build(name,duration):
    out=np.zeros(round(duration*RATE))
    def add(at,length,kind,gain=1):
        n=round(length*RATE);t=np.arange(n)/RATE
        noise=rng.uniform(-1,1,n)
        low=sosfilt(butter(2,600,fs=RATE,output='sos'),noise)
        band=sosfilt(butter(2,[250,3600],btype='band',fs=RATE,output='sos'),noise)
        if kind=='shing':
            v=sum(np.sin(2*np.pi*f*t)*np.exp(-t*(7+i)) for i,f in enumerate([1250,1873,2671]))*.20
        elif kind=='steel':
            v=sum(np.sin(2*np.pi*f*t)*np.exp(-t*(5+i*2)) for i,f in enumerate([171,379,673,1071,1837]))*.14+band*.35*np.exp(-t*28)
        elif kind=='thud':
            v=.65*np.sin(2*np.pi*(48*t+1.7*(1-np.exp(-22*t))))*np.exp(-t*12)+low*2*np.exp(-t*18)
        elif kind=='engine':
            phase=2*np.pi*(57*t+15*t*t);v=sum(np.sin(phase*k)/k for k in [1,2,3,5,7])*.12
            v+=low*.5+np.sin(2*np.pi*1350*t)*.065*(np.sin(2*np.pi*5*t)>.5)
        elif kind=='cable':
            v=.20*np.sin(2*np.pi*(180*t+160*t*t))+.08*np.sin(2*np.pi*790*t)+band*.28
            v+=.22*np.sin(2*np.pi*2150*t)*np.exp(-((t%.095)/.010))
        elif kind=='whoosh':
            v=band*(.3+np.sin(np.pi*t/length))*.65+low*.4
        elif kind=='wet':
            v=low*1.8+band*.24
            for start in np.arange(.015,length,.043):
                u=np.maximum(0,t-start);v+=.25*np.sin(2*np.pi*(130*u+2*(1-np.exp(-u*70))))*np.exp(-u*55)*(t>=start)
        elif kind=='pour':
            v=low*2.2+band*.7;v*=.78+.22*np.sin(t*39)
        elif kind=='crack':
            v=band*.85*np.exp(-t*5)+low*1.2
            v*=.4+.6*(np.sin(t*125)>0)
        elif kind=='rumble':
            v=low*1.5*np.exp(-t*5)+.7*np.sin(2*np.pi*(38*t+.6*(1-np.exp(-t*25))))*np.exp(-t*8)
        elif kind=='riser':
            v=(band*.4+low*.5+np.sin(2*np.pi*(80*t+170*t*t))*.2)*(t/length)**1.5
        env=np.minimum(1,t/.004)*np.minimum(1,(length-t)/.035)
        if kind in ['engine','cable','pour']:env*=np.minimum(1,t/.035)
        i=round(at*RATE);count=min(n,len(out)-i)
        out[i:i+count]+=v[:count]*env[:count]*gain
    if name=='concrete':
        add(0,.19,'wet',.85);add(.16,.25,'whoosh',.85);add(.22,.65,'wet',.45)
    elif name=='concreteImpact':
        add(0,.28,'wet',1.3);add(0,.24,'thud',.8);add(.17,.35,'wet',.55)
    elif name=='beam':
        add(0,.35,'cable');add(.28,.55,'whoosh',.7)
    elif name=='forklift':
        add(0,1.45,'engine');add(.04,.12,'steel',.4)
    elif name=='beamImpact':
        add(0,.7,'steel');add(0,.35,'thud',.8);add(.15,.36,'steel',.5)
    elif name=='forkliftImpact':
        add(0,.40,'thud');add(.015,.60,'steel',.9)
    elif name=='hookSuper':
        add(0,.32,'shing',1.1);add(0,.35,'rumble',.5);add(.20,.85,'cable',1.1);add(.38,.72,'riser',.6)
        add(.78,.32,'whoosh',1.1);add(1.12,.65,'steel',1.3);add(1.12,.50,'thud',1.2);add(1.12,.65,'rumble',1.1)
        add(1.30,.26,'steel',.45);add(1.48,.28,'steel',.3)
    elif name=='containerSuper':
        add(0,.30,'shing');add(0,.38,'rumble',.6);add(.14,.30,'steel',.85);add(.30,.80,'whoosh',1.1);add(.32,.77,'riser',.7)
        add(1.12,.65,'steel',1.5);add(1.12,.55,'thud',1.5);add(1.12,.68,'rumble',1.5);add(1.30,.40,'crack',.8)
    elif name=='concreteSuper':
        add(0,.30,'shing',1.1);add(0,.38,'rumble',.6);add(.40,.22,'whoosh',1.0);add(.45,.90,'pour',1.35);add(.64,.65,'wet',.9)
        add(1.35,.49,'crack',1.0);add(1.37,.50,'riser',.7);add(1.90,.65,'crack',1.3);add(1.90,.55,'thud',1.6)
        add(1.90,.68,'rumble',1.4);add(2.28,.30,'thud',1.0);add(2.10,.45,'wet',.6)
    is_super=name.endswith('Super')
    if is_super:
        dry=out.copy()
        for delay,gain in [(.043,.15),(.087,.10),(.139,.06)]:
            shift=round(delay*RATE);out[shift:]+=dry[:-shift]*gain
    out=np.tanh(out*(1.6 if is_super else 1.25));out*=(.88 if is_super else .78)/max(.001,np.max(abs(out)))
    with tempfile.TemporaryDirectory() as td:
        wav=Path(td)/'cue.wav';write(wav,RATE,(out*32767).astype(np.int16))
        dest=ROOT/f'assets/wo-{name}-v{2 if is_super else 1}.mp3'
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','112k',str(dest)],check=True)
    print(name,duration,'s',round(float(np.sqrt(np.mean(out*out))),3),'RMS')
if __name__=='__main__':
    for name,duration in [('concrete',.95),('concreteImpact',.58),('beam',.90),('forklift',1.5),('beamImpact',.8),('forkliftImpact',.7),('hookSuper',1.85),('containerSuper',1.85),('concreteSuper',2.65)]:
        if '--supers' not in sys.argv or name.endswith('Super'):build(name,duration)

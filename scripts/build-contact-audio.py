"""Dry punch and boot impacts from the game's existing recorded contact sample.

No oscillators: preserve the recorded slap, cloth and body transient instead of
the synthetic noise burst in v1. Source remains unchanged.
"""
from pathlib import Path
import subprocess, tempfile
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly
from scipy.io.wavfile import write

ROOT=Path(__file__).resolve().parents[1]
RATE=44100
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/'assets/golpe-general.mp3'),'-f','f32le','-ac','1','-ar',str(RATE),'-'])
recording=np.frombuffer(raw,dtype=np.float32).astype(float)
source=recording[round(.18*RATE):round(.59*RATE)].copy()
source-=np.mean(source)
# Remove only inaudible leading silence, leaving the entire attack intact.
onset=np.flatnonzero(np.abs(source)>max(.001,np.max(abs(source))*.035))
if len(onset):source=source[max(0,onset[0]-round(.001*RATE)):]

def band(signal,lo,hi):
    return sosfilt(butter(2,[lo,hi],btype='band',fs=RATE,output='sos'),signal)

for name,duration in [('punchHit',.24),('kickHit',.34)]:
    contact=source if name=='punchHit' else resample_poly(source,6,5)
    n=round(duration*RATE)
    contact=np.pad(contact,(0,max(0,n-len(contact))))[:n]
    t=np.arange(n)/RATE
    body=band(contact,75,420)
    snap=band(contact,1100,6500)
    cloth=band(contact,350,2000)
    if name=='punchHit':
        out=band(contact,90,7500)*.85+body*.85+snap*.5*np.exp(-t*32)
    else:
        out=band(contact,65,6000)*.85+body*1.65+cloth*.45
        # A tightly spaced second compression adds weight to the boot contact.
        delay=round(.008*RATE)
        out[delay:]+=body[:-delay]*.32
    out*=np.minimum(1,t/.0005)*np.minimum(1,(duration-t)/.045)
    out/=max(.001,np.max(abs(out)))
    out=np.tanh(out*1.2)
    out*=.87/max(.001,np.max(abs(out)))
    with tempfile.TemporaryDirectory() as folder:
        wav=Path(folder)/'contact.wav';write(wav,RATE,(out*32767).astype(np.int16))
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','160k',str(ROOT/f'assets/wo-{name}-v2.mp3')],check=True)
    print(name,'duration',duration,'peak',round(float(np.max(abs(out))),3),'rms',round(float(np.sqrt(np.mean(out*out))),3))

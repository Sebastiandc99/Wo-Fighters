"""Layer real CC0 field/foley recordings. No synthesized cartoon tones.
Rebuilds offline from the credited source excerpts already in assets/audio-source.
"""
from pathlib import Path
import subprocess, tempfile
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly
from scipy.io.wavfile import write
ROOT=Path(__file__).resolve().parents[1]
RATE=32000

def source(name):
    path=next((ROOT/'assets/audio-source').glob('matias-'+name+'-cc0.*'))
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar',str(RATE),'-'])
    v=np.frombuffer(raw,np.float32).astype(float);v-=v.mean();return v/max(.001,np.max(abs(v)))
samples={key:source(key) for key in ['wind','leaves','paper','plastic','bottle','can']}

def clip(name,length,offset=0):
    v=samples[name];start=round(offset*RATE)%len(v);n=round(length*RATE)
    return np.resize(np.concatenate((v[start:],v[:start])),n).copy()
def add(out,v,at,gain=1):
    start=round(at*RATE);n=min(len(v),len(out)-start)
    if n<=0:return
    t=np.arange(len(v))/RATE
    fade=np.minimum(1,t/.008)*np.minimum(1,(len(v)/RATE-t)/.045)
    out[start:start+n]+=v[:n]*fade[:n]*gain

def render(name,duration,events):
    out=np.zeros(round(duration*RATE))
    for key,at,length,gain,offset in events:add(out,clip(key,length,offset),at,gain)
    out=sosfilt(butter(2,[65,11000],btype='bandpass',fs=RATE,output='sos'),out)
    out*=.87/max(.001,np.max(abs(out)))
    with tempfile.TemporaryDirectory() as folder:
        wav=Path(folder)/'mix.wav';write(wav,RATE,(out*32767).astype(np.int16))
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(ROOT/f'assets/wo-{name}-v1.mp3')],check=True)
    print(name,duration,'s, real recording layers, peak',round(float(np.max(abs(out))),3))
render('residues',1.10,[('wind',0,.8,.35,1),('paper',0,.8,.65,.2),('plastic',.04,.7,.65,.1),('bottle',.15,.60,.65,.1),('can',.28,.55,.40,0),('leaves',.03,.8,.35,1)])
render('residuesImpact',.48,[('bottle',0,.43,.9,.12),('can',.02,.4,.58,.05),('plastic',0,.32,.65,.3)])
events=[('wind',0,3.25,1,2),('leaves',.12,2.98,.45,.2)]
for i,at in enumerate([.28,.61,.94,1.25,1.52,1.80,2.02,2.25,2.53]):
    events += [('paper',at,.42,.30, i*.17),('plastic',at+.04,.36,.26,i*.11)]
for i,at in enumerate([.49,.92,1.34,1.76,2.17,2.54]):events += [('bottle',at,.32,.26,i*.09),('can',at+.10,.25,.16,i*.05)]
render('environmentalSuper',3.65,events)
# A short human cry reuses the existing CC0 professional performance, not fire/electric effects.
path=ROOT/'assets/audio-source/fernando-scream-cc0.wav'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),'-t','0.72','-af','highpass=f=180,lowpass=f=6200,afade=t=in:d=0.025,afade=t=out:st=0.56:d=0.16','-ar',str(RATE),'-ac','1','-b:a','128k',str(ROOT/'assets/wo-environmentalCry-v1.mp3')],check=True)

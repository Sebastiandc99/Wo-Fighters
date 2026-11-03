"""Mix CC0 field recordings for Darío, aligned to the 2.40 s plane impact.
Usage: python scripts/build-dario-audio.py [source-cache-directory]
Sources and credits: docs/dario.md. Existing project thuds supply impact layers.
"""
from pathlib import Path
import subprocess,sys,urllib.request
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/'dario-audio-source'
CACHE.mkdir(parents=True,exist_ok=True)
RATE=32000
sources={
 'bus':'https://cdn.freesound.org/previews/803/803766_10594370-hq.mp3',
 'plane':'https://cdn.freesound.org/previews/239/239918_985466-hq.mp3',
 'radio':'https://cdn.freesound.org/previews/100/100416_336074-hq.mp3'}
def decode(path):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(RATE),'-f','f32le','-']),dtype='<f4').copy()
def excerpt(signal,length):
 n=int(RATE*length)
 # Choose a continuous recorded passage with the most energy, never synthesize a voice.
 if len(signal)<n:return np.resize(signal,n)
 starts=range(0,len(signal)-n+1,RATE//4)
 at=max(starts,key=lambda k:np.mean(signal[k:k+n]**2))
 return signal[at:at+n].copy()
def normalize(x,peak=.8):return x*(peak/max(.001,float(np.max(abs(x)))))
def envelope(x,fade=.04):
 n=min(int(fade*RATE),len(x)//2);x=x.copy();x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n);return x
def write(name,x):
 x=normalize(np.tanh(x),.88)
 subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(RATE),'-ac','1','-i','-','-codec:a','libmp3lame','-b:a','112k',str(ROOT/'assets'/('wo-'+name+'-v1.mp3'))],input=x.astype('<f4').tobytes(),check=True)
 print(name,round(len(x)/RATE,3),'seconds')
recordings={}
for name,url in sources.items():
 path=CACHE/(name+'.mp3')
 if not path.exists():path.write_bytes(urllib.request.urlopen(url,timeout=30).read())
 recordings[name]=decode(path)
bus=envelope(normalize(excerpt(recordings['bus'],2.25),.72),.06)
# Soft rolling grit is filtered from the original field recording, not a cartoon sweep.
bus+=sosfilt(butter(2,[900,4500],btype='band',fs=RATE,output='sos'),bus)*.2
write('personnelBus',bus)
thud=decode(ROOT/'assets/wo-bodyThud-v2.wav')
metal=decode(ROOT/'assets/wo-forkliftImpact-v1.mp3')
impact=np.zeros(int(RATE*.78))
for sig,gain in [(thud,.8),(metal,.65)]:
 n=min(len(sig),len(impact));impact[:n]+=sig[:n]*gain
write('personnelBusImpact',envelope(impact,.008))
flight=np.zeros(int(3.65*RATE))
radio=envelope(normalize(excerpt(recordings['radio'],.85),.44),.035)
radio=sosfilt(butter(2,[400,3100],btype='band',fs=RATE,output='sos'),radio)
at=int(.08*RATE);flight[at:at+len(radio)]+=radio
plane=envelope(normalize(excerpt(recordings['plane'],1.85),.8),.13)
plane*=np.linspace(.25,1,len(plane));at=int(.55*RATE);flight[at:at+len(plane)]+=plane
# The large recorded metal/body impact begins on the exact engine impact frame.
crash=decode(ROOT/'assets/wo-containerSuper-v2.mp3')[int(1.12*RATE):]
at=int(2.40*RATE);n=min(len(crash),len(flight)-at);flight[at:at+n]+=crash[:n]*1.05
at=int(2.40*RATE);n=min(len(impact),len(flight)-at);flight[at:at+n]+=impact[:n]*.7
write('flightSuper',envelope(flight,.015))

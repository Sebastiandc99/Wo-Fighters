"""Original safety-chain snap and synchronized industrial siren/closure impact."""
import math, random, struct, wave
from pathlib import Path
rate=22050
def write(name,duration,sample):
    random.seed(1904)
    values=[]
    for n in range(round(rate*duration)):
        t=n/rate
        values.append(struct.pack('<h',round(math.tanh(sample(t))*28000)))
    with wave.open(str(Path('assets')/name),'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(values))
def chain(t):
    swoosh=random.uniform(-1,1)*math.sin(math.pi*min(1,t/.32))**2*.25 if t<.32 else 0
    a=max(0,t-.27)
    return swoosh+(random.uniform(-1,1)*.9*math.exp(-a*55)+math.sin(2*math.pi*1500*a)*.16*math.exp(-a*20) if t>.27 else 0)
def stop(t):
    # Alternating two-tone warning stops at the measured barrier impact.
    env=min(1,t/.08)*max(0,min(1,(2.12-t)/.14))
    freq=620 if int(t/.23)%2 else 880
    siren=(math.sin(2*math.pi*freq*t)+.15*math.sin(6*math.pi*freq*t))*.24*env
    a=t-2.10
    thud=(.8*random.uniform(-1,1)*math.exp(-a*15)+.65*math.sin(2*math.pi*75*a)*math.exp(-a*6)) if a>=0 else 0
    return siren+thud
write('wo-safetyChain-v1.wav',.82,chain)
write('wo-safetySuper-v1.wav',3.25,stop)

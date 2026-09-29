"""Original layered flame cues, with three throws and the super impact at 1.85s."""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
rng = np.random.default_rng(17562)

def band(n, low, high):
    x = sosfilt(butter(2, [low, high], btype='bandpass', fs=RATE, output='sos'), rng.standard_normal(n))
    return x / max(np.std(x), 1e-8)

def add(out, at, sound):
    start = round(at * RATE)
    count = min(len(sound), len(out) - start)
    if count > 0:
        out[start:start + count] += sound[:count]

def crackle(seconds, density=34):
    out = np.zeros(round(seconds * RATE))
    for at in rng.uniform(0, max(.001, seconds - .06), round(seconds * density)):
        length = rng.uniform(.012, .055)
        t = np.arange(round(length * RATE)) / RATE
        # Small irregular wood/ember snaps, each with a body and a softer airy tail.
        env = (1 - np.exp(-t / .0008)) * np.exp(-t / rng.uniform(.004, .016))
        pop = (band(len(t), 600, 5500) * .42 + np.sin(2*np.pi*rng.uniform(230, 620)*t) * .18) * env
        add(out, at, pop * rng.uniform(.3, 1))
    return out

def flame(seconds, strength=1):
    n = round(seconds * RATE); t = np.arange(n) / RATE
    # Irregular low turbulence under the recognisable crackle, without constant sharp fizz.
    turbulence = .65 + .18*np.sin(t*23 + .8*np.sin(t*7)) + .12*np.sin(t*41)
    x = (band(n, 70, 620)*.13 + band(n, 380, 3400)*.075) * turbulence
    return (x + crackle(seconds)) * strength

def flaming_throw(seconds, strength=1):
    n = round(seconds * RATE); t = np.arange(n) / RATE; q = t / seconds
    envelope = np.sin(np.pi*q)**1.35
    # Fast ignition snap followed by a descending, breathing flame whoosh.
    x = (band(n, 150, 2100)*.38 + band(n, 1200, 5200)*.11*(1-q)) * envelope
    x += np.sin(2*np.pi*(190*t - 90*t*t/seconds)) * envelope * .10
    x += crackle(seconds, 55) * .7
    return x * strength

def save(name, x):
    x = np.tanh(x * 1.45)
    x *= .90 / max(np.max(np.abs(x)), 1e-8)
    x[:round(.005*RATE)] *= np.linspace(0,1,round(.005*RATE))
    x[-round(.04*RATE):] *= np.linspace(1,0,round(.04*RATE))
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder)/'cue.wav'
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
            w.writeframes((x*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','2',str(ROOT/'assets'/f'wo-{name}-v2.mp3')],check=True)
    print(name, f'{len(x)/RATE:.2f}s', f'RMS {np.sqrt(np.mean(x*x)):.3f}', f'peak {np.max(np.abs(x)):.3f}')

x = np.zeros(round(.95*RATE))
add(x, .035, flaming_throw(.09, .32))  # packs and first ignition
for at, gain in [(.14, 1), (.27, .95), (.40, 1.08)]:
    add(x, at, flaming_throw(.18, gain))
tail = flame(.46, .38); tail *= np.linspace(1,0,len(tail))
add(x, .49, tail)
save('cigarettes', x)

t = np.arange(round(.42*RATE))/RATE
x = flame(.42, .65) * np.exp(-t/.16)
add(x, 0, flaming_throw(.13, .85))
x += np.sin(2*np.pi*(145*t-85*t*t)) * np.exp(-t/.045) * .24
save('emberImpact', x)

t = np.arange(round(2.85*RATE))/RATE
x = flame(2.85, 1.15) * np.minimum(1,t/.15) * (.22 + .78*np.clip((t-.50)/1.35,0,1))
q = np.arange(round(.24*RATE))/RATE
add(x, 0, (np.sin(2*np.pi*(1450*q-1800*q*q))*.10 + band(len(q),2000,6000)*.035)*np.exp(-q/.06))
for at in [.25,.36,.47]:
    add(x, at, flaming_throw(.16,.35))
add(x, .65, flaming_throw(1.20, 1.15))  # expanding fire front
q = np.arange(round(1.0*RATE))/RATE
boom = (band(len(q),45,1300)*.48 + np.sin(2*np.pi*(80*q-22*q*q))*.56) * np.exp(-q/.23)
add(x, 1.85, boom)
add(x, 1.85, flaming_throw(.62,1.4))
x *= np.minimum(1,(2.85-t)/.20)
save('fireSuper', x)

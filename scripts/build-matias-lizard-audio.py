"""Lizard rain foley from the existing credited CC0 recordings; no downloads.

Produces only the new special sounds, leaving Descarga de Residuos untouched.
"""
from pathlib import Path
import subprocess
import tempfile
import numpy as np
from scipy.io.wavfile import write
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
rng = np.random.default_rng(221026)


def recording(name):
    path = next((ROOT / 'assets/audio-source').glob(f'matias-{name}-cc0.*'))
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'])
    sound = np.frombuffer(raw, np.float32).astype(float)
    sound -= sound.mean()
    return sound / max(.001, np.max(abs(sound)))


sources = {key: recording(key) for key in ['wind', 'leaves', 'paper', 'plastic']}


def layer(out, name, at, duration, gain, offset=0, rate=1):
    source = sources[name]
    positions = (offset * RATE + np.arange(round(duration * RATE)) * rate) % len(source)
    sound = np.interp(positions, np.arange(len(source)), source)
    t = np.arange(len(sound)) / RATE
    envelope = np.minimum(1, t / .008) * np.minimum(1, (duration - t) / .035)
    start = round(at * RATE)
    count = min(len(sound), len(out) - start)
    if count > 0:
        out[start:start + count] += sound[:count] * envelope[:count] * gain


def save(name, sound, rms_db):
    sound = sosfilt(butter(2, [180, 8500], btype='bandpass', fs=RATE, output='sos'), sound)
    sound = np.tanh(sound * 2)
    sound *= 10 ** (rms_db / 20) / max(.001, np.sqrt(np.mean(sound * sound)))
    sound *= min(1, .88 / max(.001, np.max(abs(sound))))
    t = np.arange(len(sound)) / RATE
    sound *= np.minimum(1, t / .009) * np.minimum(1, (len(sound) / RATE - t) / .035)
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'mix.wav'
        write(wav, RATE, (sound * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-codec:a', 'libmp3lame',
                        '-b:a', '128k', str(ROOT / f'assets/wo-{name}-v1.mp3')], check=True)
    print(name, 'duration', round(len(sound) / RATE, 2), 'RMS dB',
          round(float(20 * np.log10(np.sqrt(np.mean(sound * sound)))), 1),
          'peak', round(float(np.max(abs(sound))), 3))


rain = np.zeros(round(4.15 * RATE))
# Seven small throwing swishes, then dry scrambling on clothing.
for n in range(7):
    layer(rain, 'wind', .22 + n*.065, .34, .34, 1.7 + n*.11, 1.2)
    layer(rain, 'leaves', .92 + n*.08, .19, .20, .3 + n*.21, 1.3)
for n, at in enumerate(np.arange(1.5, 3.43, .11)):
    layer(rain, ['paper','plastic','leaves'][n%3], float(at), .095,
          .12, float(rng.uniform(.2, 3.5)), float(rng.uniform(.9, 1.3)))
for n in range(7):
    layer(rain, 'leaves', 3.50 + n*.035, .22, .20, 1.1+n*.13, 1.15)
save('lizardRain', rain, -21)

bite = np.zeros(round(.19 * RATE))
layer(bite, 'plastic', 0, .13, .46, 1.27, 1.15)
layer(bite, 'paper', .018, .15, .35, .61, .83)
layer(bite, 'leaves', .035, .13, .22, 2.3, 1.3)
save('lizardBite', bite, -19)

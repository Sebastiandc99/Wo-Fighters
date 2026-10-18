"""Dense travelling litter: layered CC0 recordings, reproducible without downloads.

The sources and their licenses are credited in assets/audio-source/matias-sources.md.
This only builds the common power; the environmental super remains unchanged.
"""
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from scipy.io.wavfile import write
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
rng = np.random.default_rng(5302)


def recording(name):
    path = next((ROOT / 'assets/audio-source').glob(f'matias-{name}-cc0.*'))
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'])
    sound = np.frombuffer(raw, np.float32).astype(float)
    sound -= sound.mean()
    return sound / max(.001, np.max(abs(sound)))


sources = {key: recording(key) for key in ['wind', 'leaves', 'paper', 'plastic', 'bottle', 'can']}


def layer(out, name, at, duration, gain, offset=0, rate=1):
    source = sources[name]
    positions = (offset * RATE + np.arange(round(duration * RATE)) * rate) % len(source)
    sound = np.interp(positions, np.arange(len(source)), source)
    t = np.arange(len(sound)) / RATE
    envelope = np.minimum(1, t / .009) * np.minimum(1, (duration - t) / .055)
    start = round(at * RATE)
    count = min(len(sound), len(out) - start)
    if count > 0:
        out[start:start + count] += sound[:count] * envelope[:count] * gain


def save(name, sound):
    sound = sosfilt(butter(2, [100, 10000], btype='bandpass', fs=RATE, output='sos'), sound)
    # Gentle compression brings out the many small rustles without an oversized impact.
    sound = np.tanh(sound * 1.8)
    sound *= .86 / max(.001, np.max(abs(sound)))
    t = np.arange(len(sound)) / RATE
    sound *= np.minimum(1, t / .012) * np.minimum(1, (len(sound) / RATE - t) / .09)
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'mix.wav'
        write(wav, RATE, (sound * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-codec:a', 'libmp3lame',
                        '-b:a', '128k', str(ROOT / f'assets/wo-{name}-v2.mp3')], check=True)
    print(name, 'duration', round(len(sound) / RATE, 2), 'RMS dB',
          round(float(20 * np.log10(np.sqrt(np.mean(sound * sound)))), 1))


wave = np.zeros(round(1.65 * RATE))
layer(wave, 'wind', 0, 1.60, .24, 1.7)
layer(wave, 'leaves', .025, 1.50, .48, .7)
layer(wave, 'paper', .02, 1.48, .46, .18)
layer(wave, 'plastic', .06, 1.42, .47, .12)
# Irregular overlapping rattles follow the full movement, rather than one opening clunk.
for n, at in enumerate(np.arange(.08, 1.38, .075)):
    name = ['bottle', 'plastic', 'can', 'paper'][n % 4]
    layer(wave, name, float(at + rng.uniform(-.014, .014)), float(rng.uniform(.12, .26)),
          .38 if name == 'can' else .46, float(rng.uniform(0, len(sources[name]) / RATE)),
          float(rng.uniform(.91, 1.08)))
wave *= .72 + .28 * np.sin(np.linspace(0, np.pi, len(wave)))
save('residues', wave)

impact = np.zeros(round(.48 * RATE))
for name, at, length, gain, offset in [
    ('bottle', 0, .31, .86, .12), ('can', .025, .27, .47, .05),
    ('plastic', .012, .36, .70, .3), ('paper', .035, .34, .45, .1),
    ('leaves', .02, .31, .28, .8),
]:
    layer(impact, name, at, length, gain, offset)
save('residuesImpact', impact)

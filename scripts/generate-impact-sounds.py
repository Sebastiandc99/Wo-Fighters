"""Rebuild the uppercut and body landing cues from dry punch and soft impacts."""
from pathlib import Path
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 24000
rng = np.random.default_rng(246)


def filtered_noise(length, low, high=None):
    sound = rng.standard_normal(length)
    if high:
        sound = sosfilt(butter(2, [low, high], btype='bandpass', fs=RATE, output='sos'), sound)
    else:
        sound = sosfilt(butter(2, low, btype='lowpass', fs=RATE, output='sos'), sound)
    return sound / max(np.max(np.abs(sound)), 1e-8)


def envelope(t, attack, decay):
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay)


def write(name, samples):
    samples = np.tanh(samples * 1.2)
    samples *= .89 / max(np.max(np.abs(samples)), 1e-8)
    with wave.open(str(ROOT / 'assets' / name), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes((samples * 32767).astype('<i2').tobytes())


# A low, dry fist impact. The existing punch recording gives it a recognisable
# glove-on-body attack; short air/noise and a low transient add uppercut weight.
source = subprocess.run([
    'ffmpeg', '-v', 'error', '-i', str(ROOT / 'assets/wo-punchHit-v2.mp3'),
    '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'
], check=True, capture_output=True).stdout
recording = np.frombuffer(source, dtype='<f4')
length = int(.35 * RATE)
t = np.arange(length) / RATE
punch = np.zeros(length)
punch[:min(length, len(recording))] = recording[:length]
punch = sosfilt(butter(3, 2300, fs=RATE, output='sos'), punch)
punch /= max(np.max(np.abs(punch)), 1e-8)
body = filtered_noise(length, 70, 430) * envelope(t, .002, .065)
low = np.sin(2 * np.pi * (86 * t - 36 * t*t)) * envelope(t, .002, .074)
air = filtered_noise(length, 480, 1650) * envelope(t, .001, .042)
write('wo-uppercutPunch-v1.wav', .68 * punch + .39 * body + .33 * low + .23 * air)

# A character hitting the ground: short low thump with a broad, damped scrape.
length = int(.47 * RATE)
t = np.arange(length) / RATE
low = np.sin(2 * np.pi * (73*t - 24*t*t)) * envelope(t, .003, .105)
mid = filtered_noise(length, 55, 390) * envelope(t, .004, .10)
scuff = filtered_noise(length, 270, 1500) * envelope(np.maximum(0,t-.025), .005, .095) * (t >= .025)
write('wo-bodyThud-v1.wav', .82*low + .5*mid + .23*scuff)

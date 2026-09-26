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


def write(name, samples, drive=1.2):
    samples = np.tanh(samples * drive)
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

# A character hitting the ground: a dry midrange slap remains audible on phone
# speakers, followed by a short earth-and-cloth scatter and a low weighty thump.
length = int(.52 * RATE)
t = np.arange(length) / RATE
low = np.sin(2 * np.pi * (93*t - 35*t*t)) * envelope(t, .002, .125)
mid = filtered_noise(length, 140, 850) * envelope(t, .002, .11)
slap = filtered_noise(length, 350, 1950) * envelope(t, .001, .045)
scuff = filtered_noise(length, 480, 2100) * envelope(np.maximum(0,t-.055), .004, .10) * (t >= .055)
write('wo-bodyThud-v2.wav', .54*low + .76*mid + .48*slap + .27*scuff, drive=2.5)

"""Build a sampled retro arcade scream from the credited CC0 human performance.

Run from any directory: python scripts/build-fire-scream-v2.py
Dependencies: numpy, scipy, ffmpeg. No network access is required.
"""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 11025
DURATION = 1.25
SOURCE = ROOT / "assets/audio-source/fernando-scream-cc0.wav"
OUTPUT = ROOT / "assets/wo-fireScream-v2.mp3"

source_rate, samples = wavfile.read(SOURCE)
voice = samples.astype(np.float64) / 32768
# Sample playback at 92% pitch, retaining the actor's natural breath and rasp.
voice = resample_poly(voice, 25, 23)
voice = resample_poly(voice, RATE, source_rate)
voice = sosfilt(butter(2, [140, 3700], btype="bandpass", fs=RATE,
                      output="sos"), voice)
presence = sosfilt(butter(1, 1000, btype="highpass", fs=RATE,
                         output="sos"), voice)
voice += presence * .30
# Gentle saturation and 11-bit sample texture; keep the voice recognizable.
voice = np.tanh(voice * 4.8)
voice = np.round(voice * 1024) / 1024
dry = np.zeros(round(DURATION * RATE))
dry[:min(len(voice), len(dry))] = voice[:len(dry)]
mixed = dry.copy()
for delay, gain in [(0.041, .11), (0.083, .06), (0.121, .035)]:
    offset = round(delay * RATE)
    mixed[offset:] += dry[:-offset] * gain
mixed[:round(.012 * RATE)] *= np.linspace(0, 1, round(.012 * RATE))
mixed[-round(.14 * RATE):] *= np.linspace(1, 0, round(.14 * RATE))
# Leave headroom for MP3 reconstruction peaks as well as the in-game fire cue.
mixed *= .78 / max(np.max(np.abs(mixed)), 1e-8)

with tempfile.TemporaryDirectory() as directory:
    wav = Path(directory) / "fire-scream.wav"
    with wave.open(str(wav), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes((mixed * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav),
                    "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "2",
                    str(OUTPUT)], check=True)
print(f"{OUTPUT.name}: {DURATION:.2f}s, human voice, mono retro sample")

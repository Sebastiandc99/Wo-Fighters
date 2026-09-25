"""Original dry contact Foley: layered filtered noise, skin slap and body resonance."""
from pathlib import Path
import subprocess
import tempfile
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

RATE = 44100
ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(250926)

for name, duration, weight in [("punchHit", .24, 1), ("kickHit", .32, 1.3),
                               ("uppercutHit", .38, 1.5), ("bodyFall", .45, 1.8),
                               ("meleeSwing", .15, .4)]:
    t = np.arange(round(duration * RATE)) / RATE
    noise = rng.normal(0, 1, len(t))
    def band(lo, hi):
        return sosfilt(butter(2, [lo, hi], btype="band", fs=RATE, output="sos"), noise)
    if name == "meleeSwing":
        out = band(600, 3600) * np.sin(np.pi * t / duration) ** 2
    else:
        # Brief irregular snap plus a broad chest/boot thump, without electronic beeps.
        body = band(65, 650) * 3.2 * np.exp(-t * 36 / weight)
        slap = band(900, 7200) * np.exp(-t * 180 / weight) * 1.15
        crunch = band(250, 1800) * np.exp(-t * 65 / weight) * .8
        phase = 2 * np.pi * (65 * t + .7 * (1 - np.exp(-45 * t)))
        resonance = np.sin(phase) * np.exp(-t * 65 / weight) * .28
        out = body + slap + crunch + resonance
        if name == "bodyFall":
            out += band(90, 1400) * np.exp(-np.maximum(0, t - .025) * 24) * (t >= .025)
        # One small reflected transient gives density without a long arcade echo.
        delay = round(.009 * RATE)
        out[delay:] += out[:-delay].copy() * .15
    out *= np.minimum(1, t / .0007) * np.minimum(1, (duration - t) / .018)
    out = np.tanh(out * 1.7)
    out *= (.55 if name == "meleeSwing" else .92) / max(.001, np.max(abs(out)))
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / "impact.wav"
        write(wav, RATE, (out * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                        "-codec:a", "libmp3lame", "-b:a", "128k",
                        str(ROOT / f"assets/wo-{name}-v1.mp3")], check=True)
    print(name, duration, "seconds; peak", round(float(np.max(abs(out))), 2))

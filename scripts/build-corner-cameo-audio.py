"""Extract one Toasty! from the user-supplied reference montage, without changing its voice.
Usage: python scripts/build-corner-cameo-audio.py /path/to/reference.mp4
"""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-vn',
 '-af','atrim=start=0.35:end=1.08,asetpts=PTS-STARTPTS,highpass=f=65,afade=t=in:d=0.008,afade=t=out:st=0.70:d=0.03,alimiter=limit=0.92:level=false',
 '-ac','1','-ar','32000','-codec:a','libmp3lame','-b:a','96k',str(root/'assets/wo-corner-cameo-v1.mp3')],check=True)

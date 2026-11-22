"""Tempo, first-beat phase, energy map and section rises of a music track.

decode first (Remotion ships ffmpeg, no install needed — run inside the project):
  npx remotion ffmpeg -y -loglevel error -i public/music/x.mp3 -ac 1 -ar 22050 out/x.wav
then:
  python analyze_music.py out/x.wav

Use the output to fill src/timeline.ts: BEAT = period, beat(0) = first beat,
and put scene cuts on beats nearest the "biggest energy rises" seconds.
BPM may be reported at half/double — that's fine for cutting.
"""
import numpy as np, wave, sys
f = sys.argv[1]
w = wave.open(f); sr = w.getframerate(); n = w.getnframes()
x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
hop = 512; win = 1024
frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
logs = np.log1p(spec * 10)
flux = np.maximum(0, np.diff(logs, axis=0)).sum(1)
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
fps = sr / hop
# tempo via autocorrelation
ac = np.correlate(flux, flux, 'full')[len(flux)-1:]
lo, hi = int(fps*60/180), int(fps*60/70)
lag = lo + np.argmax(ac[lo:hi]); bpm = 60*fps/lag
print(f"duration {n/sr:.2f}s  bpm~{bpm:.1f}")
# beat phase: best offset
period = lag
best = max(range(period), key=lambda o: flux[o::period].sum())
print(f"first beat ~{best/fps:.3f}s  period {period/fps:.4f}s")
# energy per second (RMS)
rms = np.sqrt(np.mean(frames**2, axis=1))
sec = int(n/sr)
per = [rms[int(i*fps):int((i+1)*fps)].mean() for i in range(sec)]
mx = max(per)
line = ''.join(' .:-=+*#%@'[min(9,int(p/mx*9.99))] for p in per)
for i in range(0, sec, 60): print(f"{i:3d}s |{line[i:i+60]}|")
# big onsets (section changes): largest jumps in 2s-smoothed energy
sm = np.convolve(per, np.ones(2)/2, 'same')
d = np.diff(sm)
idx = np.argsort(d)[-8:]
print("biggest energy rises at:", sorted(int(i)+1 for i in idx))

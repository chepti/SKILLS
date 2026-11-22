"""Build contact sheets from rendered review stills so a whole cut can be
eyeballed in 1-2 image reads.

usage: python sheet.py <stills_dir> [prefix]     (run from the video project)
  landscape stills -> 3x3 grids of 640x360; vertical stills -> rows of 9 at 320x569
Writes out/sheet-<prefix>-N.jpg and prints the paths.
"""
import sys, glob, os
from PIL import Image, ImageDraw

d = sys.argv[1] if len(sys.argv) > 1 else 'out/stills'
prefix = sys.argv[2] if len(sys.argv) > 2 else ''
files = sorted(glob.glob(os.path.join(d, f'{prefix}*.jpg')))
if not files:
    sys.exit('no stills found')
w0, h0 = Image.open(files[0]).size
vertical = h0 > w0
cols, W, H = (9, 320, 569) if vertical else (3, 640, 360)
per = 9
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (min(cols, len(chunk)) * W, rows * H), 'black')
    for i, f in enumerate(chunk):
        im = Image.open(f).resize((W, H))
        dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, 64, 20], fill='black')
        dr.text((4, 4), os.path.basename(f)[-8:-4], fill='yellow')
        sheet.paste(im, ((i % cols) * W, (i // cols) * H))
    out = f'out/sheet-{prefix or "all"}-{s // per}.jpg'
    sheet.save(out, quality=85)
    print(out)

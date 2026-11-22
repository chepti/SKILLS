"""Split an AI-generated contact-sheet (grid of images with white gutters and
filename captions) into separate tiles.

usage: python crop_grid.py <grid.jpg> <out_dir> [name1 name2 ...] [--prefix v2-]

Tiles are detected by scanning for non-white row bands, then non-white column
bands inside each row; captions are excluded because they sit in their own
white gap. Names are applied in reading order (left→right, top→bottom); missing
names fall back to tile-NN.
"""
import sys, os
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
prefix = ''
if '--prefix' in sys.argv:
    prefix = sys.argv[sys.argv.index('--prefix') + 1]
    args = [a for a in args if a != prefix]
src, out = args[0], args[1]
names = args[2:]
os.makedirs(out, exist_ok=True)

im = Image.open(src).convert('RGB')
W, H = im.size
px = im.convert('L').load()
WHITE = 243

def white_row(y, x0, x1):
    return all(px[x, y] > WHITE for x in range(x0, x1, 3))

def white_col(x, y0, y1):
    return all(px[x, y] > WHITE for y in range(y0, y1, 3))

def runs(flags, min_len=200):
    out, start = [], None
    for i, f in enumerate(flags + [False]):
        if f and start is None:
            start = i
        if not f and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out

k = 0
for y0, y1 in runs([not white_row(y, 0, W) for y in range(H)]):
    for x0, x1 in runs([not white_col(x, y0, y1) for x in range(W)]):
        name = names[k] if k < len(names) else f'tile-{k + 1:02d}'
        if not name.lower().endswith(('.jpg', '.png')):
            name += '.jpg'
        tile = im.crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2))
        tile.save(os.path.join(out, prefix + name), quality=95)
        print(prefix + name, tile.size)
        k += 1
print(f'{k} tiles')

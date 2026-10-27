"""Sample the supplied cat image into a square chart using the existing 20 bead colors.

No dithering or random pixels. The original image is preserved byte-for-byte.
"""
import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT/'docs/levels/cat_garden/source.png')
parser.add_argument('--size', type=int, default=80, choices=(50, 80))
args = parser.parse_args()
size = args.size

script = (ROOT/'assets/scripts/RowModel.ts').read_text(encoding='utf-8')
block = re.search(r'export const PALETTE:.*?= \[(.*?)\n\];', script, re.S).group(1)
colors = re.findall(r"hex:\s*'(#[0-9A-Fa-f]{6})'", block)
assert len(colors) == 20
palette = [tuple(bytes.fromhex(c[1:])) for c in colors]

def lab(rgb):
    linear = []
    for c in rgb:
        c /= 255
        linear.append(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4)
    r, g, b = linear
    values = [(r*.4124564 + g*.3575761 + b*.1804375)/.95047,
              r*.2126729 + g*.7151522 + b*.0721750,
              (r*.0193339 + g*.1191920 + b*.9503041)/1.08883]
    x, y, z = [v ** (1/3) if v > .008856 else 7.787037*v + 16/116 for v in values]
    return 116*y-16, 500*(x-y), 200*(y-z)

reference = [lab(c) for c in palette]
original = Image.open(args.source).convert('RGB')
assert original.width == original.height, 'Use the supplied square cat image without stretching.'
sampled = original.resize((size,size), Image.Resampling.LANCZOS)
ids = []
for rgb in sampled.getdata():
    point = lab(rgb)
    ids.append(min(range(20), key=lambda i: sum((a-b)**2 for a,b in zip(point, reference[i]))))
digits = '0123456789abcdefghij'
rows = [''.join(digits[c] for c in ids[y*size:(y+1)*size]) for y in range(size)]
output = f'/** Cat garden: {size}x{size} samples of docs/levels/cat_garden/source.png. Base36 IDs 0..j. */\n'
output += "export const PICTURE_NAME = '\u5c0f\u732b\u7684\u82b1\u56ed';\n"
output += f'export const PICTURE_WIDTH = {size};\nexport const PICTURE_HEIGHT = {size};\nexport const PICTURE_CODES = [\n'
output += ''.join('    "'+row+'",\n' for row in rows) + '];\n'
(ROOT/'assets/scripts/PictureData.ts').write_text(output, encoding='utf-8')

# Data previews are QA artifacts, not replacement UI images or a modified source.
out = ROOT/'temp/cat-garden'; out.mkdir(parents=True, exist_ok=True)
preview = Image.new('RGB',(size,size)); preview.putdata([palette[c] for c in ids])
preview.resize((700,700),Image.Resampling.NEAREST).save(out/'chart-preview.png')
preview.resize((800,800),Image.Resampling.NEAREST).save(out/f'chart-{size}.png')
(out/'sampling-report.json').write_text(json.dumps(dict(source=str(args.source),sourceSize=original.size,
    width=size,height=size,cells=len(ids),usedColors={str(k+1):v for k,v in sorted(Counter(ids).items())}),indent=2),encoding='utf-8')
print(f'Cat chart ready: {size*size} cells, existing 20-color palette, '+str(len(set(ids)))+' colors used.')
subprocess.run([sys.executable,str(ROOT/'tools/bake-picture.py')],check=True)

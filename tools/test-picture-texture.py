"""Verify every baked cell against the real matrix and supplied bead texture."""
import json
import re
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
data=(ROOT/'assets/scripts/PictureData.ts').read_text(encoding='utf-8')
rows=re.findall(r'"([0-9a-j]+)"',data)
colors=re.findall(r"hex:\s*'(#[0-9A-Fa-f]{6})'",(ROOT/'assets/scripts/RowModel.ts').read_text(encoding='utf-8'))
actual=Image.open(ROOT/'assets/resources/levels/cat-garden/board.png').convert('RGBA')
assert actual.size==(800,800)
w,h=800//len(rows[0]),800//len(rows)
bead=Image.open(ROOT/'assets/resources/ui-v3/bead_white.png').convert('RGBA').resize((w,h),Image.Resampling.LANCZOS)
tiles=[ImageChops.multiply(bead,Image.new('RGBA',bead.size,c)).tobytes() for c in colors]
for y,row in enumerate(rows):
    for x,c in enumerate(row): assert actual.crop((x*w,y*h,(x+1)*w,(y+1)*h)).tobytes()==tiles[int(c,36)],(y,x)
meta=json.loads((ROOT/'assets/resources/levels/cat-garden/board.png.meta').read_text())
assert meta['subMetas']['f9941']['userData']['width']==800
assert not meta['subMetas']['f9941']['userData']['packable']
print(f'PASS all {len(rows)*len(rows[0])} baked cells exactly match the played matrix and original tinted bead texture.')

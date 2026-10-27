"""Bake the exact level matrix with the existing bead sprite; no artwork substitution."""
import json
import re
import uuid
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
data = (ROOT/'assets/scripts/PictureData.ts').read_text(encoding='utf-8')
rows = re.findall(r'"([0-9a-j]+)"', data)
model = (ROOT/'assets/scripts/RowModel.ts').read_text(encoding='utf-8')
colors = re.findall(r"hex:\s*'(#[0-9A-Fa-f]{6})'", model)
assert len(colors) == 20 and rows and all(len(r) == len(rows[0]) for r in rows)
size = 800
assert size % len(rows) == size % len(rows[0]) == 0
cw, ch = size//len(rows[0]), size//len(rows)
source = Image.open(ROOT/'assets/resources/ui-v3/bead_white.png').convert('RGBA').resize((cw,ch),Image.Resampling.LANCZOS)
tiles = [ImageChops.multiply(source,Image.new('RGBA',source.size,c)) for c in colors]
canvas = Image.new('RGBA',(size,size))
for y,row in enumerate(rows):
    for x,c in enumerate(row): canvas.paste(tiles[int(c,36)],(x*cw,y*ch))
out = ROOT/'assets/resources/levels/cat-garden/board.png'
out.parent.mkdir(parents=True,exist_ok=True)
canvas.save(out,optimize=True)
# Stable image/texture/SpriteFrame metadata, derived from the current project's importer.
meta = json.loads((ROOT/'assets/resources/ui-v3/bead_white.png.meta').read_text(encoding='utf-8'))
old = meta['uuid']; uid = str(uuid.uuid5(uuid.NAMESPACE_URL,'beads/levels/cat-garden/board'))
meta = json.loads(json.dumps(meta).replace(old,uid).replace('bead_white','board'))
f = meta['subMetas']['f9941']['userData']
f.update(width=size,height=size,rawWidth=size,rawHeight=size,trimX=0,trimY=0,offsetX=0,offsetY=0,packable=False)
f['vertices'] = dict(rawPosition=[-400,-400,0,400,-400,0,-400,400,0,400,400,0],
    indexes=[0,1,2,2,1,3],uv=[0,800,800,800,0,0,800,0],nuv=[0,0,1,0,0,1,1,1],minPos=[-400,-400,0],maxPos=[400,400,0])
Path(str(out)+'.meta').write_text(json.dumps(meta,indent=2),encoding='utf-8')
for folder in [out.parent.parent,out.parent]:
    path=Path(str(folder)+'.meta')
    if not path.exists(): path.write_text(json.dumps(dict(ver='1.2.0',importer='directory',imported=True,
        uuid=str(uuid.uuid5(uuid.NAMESPACE_URL,'beads/'+str(folder.relative_to(ROOT)))),files=[],subMetas={},userData={}),indent=2),encoding='utf-8')
print(f'Baked {len(rows[0])}x{len(rows)} exact beads into one 800x800 texture ({out.stat().st_size} bytes).')

"""Copy supplied V3 artwork unchanged; create stable Creator 3.8 SpriteFrame metadata."""
import json
import shutil
import uuid
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/bead_cocos_v3/bead_cocos_v3/assets'
DEST = ROOT / 'assets/resources/ui-v3'
DEST.mkdir(parents=True, exist_ok=True)
NS = uuid.UUID('19e97020-4d4e-48ab-99d2-594cfa76d148')

def save_meta(path, data):
    Path(str(path) + '.meta').write_text(json.dumps(data, indent=2), encoding='utf-8')

save_meta(DEST, dict(ver='1.2.0', importer='directory', imported=True,
    uuid=str(uuid.uuid5(NS, 'ui-v3')), files=[], subMetas={}, userData={}))

for source in SOURCE.glob('*.png'):
    target = DEST / source.name
    shutil.copy2(source, target)
    with Image.open(source) as im:
        w, h = im.size
        alpha = 'A' in im.getbands()
    uid = str(uuid.uuid5(NS, source.name))
    texture = dict(ver='1.0.22', importer='texture', imported=True, uuid=uid+'@6c48a',
        displayName=source.stem, id='6c48a', name='texture', files=['.json'], subMetas={},
        userData=dict(wrapModeS='clamp-to-edge', wrapModeT='clamp-to-edge', minfilter='linear',
            magfilter='linear', mipfilter='none', premultiplyAlpha=False, anisotropy=0,
            isUuid=True, imageUuidOrDatabaseUri=uid, visible=False))
    frame = dict(ver='1.0.12', importer='sprite-frame', imported=True, uuid=uid+'@f9941',
        displayName=source.stem, id='f9941', name='spriteFrame', files=['.json'], subMetas={},
        userData=dict(trimType='none', trimThreshold=1, rotated=False, offsetX=0, offsetY=0,
            trimX=0, trimY=0, width=w, height=h, rawWidth=w, rawHeight=h, borderTop=0,
            borderBottom=0, borderLeft=0, borderRight=0, packable=True, isUuid=True,
            imageUuidOrDatabaseUri=uid+'@6c48a', atlasUuid='', pixelsToUnit=100, pivotX=.5,
            pivotY=.5, meshType=0, vertices=dict(rawPosition=[-w/2,-h/2,0,w/2,-h/2,0,-w/2,h/2,0,w/2,h/2,0],
                indexes=[0,1,2,2,1,3], uv=[0,h,w,h,0,0,w,0], nuv=[0,0,1,0,0,1,1,1], minPos=[-w/2,-h/2,0], maxPos=[w/2,h/2,0])))
    save_meta(target, dict(ver='1.0.27', importer='image', imported=True, uuid=uid,
        files=['.json','.png'], subMetas={'6c48a':texture,'f9941':frame},
        userData=dict(type='sprite-frame', hasAlpha=alpha, redirect=uid+'@6c48a', fixAlphaTransparencyArtifacts=True)))

print(f'Imported {len(list(SOURCE.glob("*.png")))} original PNGs with stable SpriteFrame metadata.')

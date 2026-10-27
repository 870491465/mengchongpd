"""Rasterize recorded production UI commands for layout review, not GPU verification.

Original PNG files are only read, tinted and composited; source assets are never modified.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'temp/v3-ui'
CACHE = {}

def rgba(c):
    return tuple(int(c.get(k, 255)) for k in ('r', 'g', 'b', 'a'))

def paint(data):
    canvas = Image.new('RGBA', (data['width'], data['height']), '#FFF8EB')
    for item in data['items']:
        if item['type'] == 'sprite':
            key = (item['file'], rgba(item['color']), round(item['w']), round(item['h']), item.get('grayscale', False))
            if key not in CACHE:
                image = Image.open(item['file']).convert('RGBA')
                image = ImageChops.multiply(image, Image.new('RGBA', image.size, rgba(item['color'])))
                if item.get('grayscale'):
                    gray = ImageOps.grayscale(image.convert('RGB'))
                    image = Image.merge('RGBA', (gray, gray, gray, image.getchannel('A')))
                CACHE[key] = image.resize((max(1, round(item['w'])), max(1, round(item['h']))), Image.Resampling.LANCZOS)
            image = CACHE[key]
            x, y = round(item['x'] - item['w']/2), round(item['y'] - item['h']/2)
            if item.get('clip'):
                image = image.copy()
                c = item['clip']; mask = Image.new('L', image.size)
                ImageDraw.Draw(mask).rectangle((c['x']-x,c['y']-y,c['x']+c['w']-x,c['y']+c['h']-y), fill=255)
                image.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
            canvas.alpha_composite(image, (x,y))
        elif item['type'] == 'text':
            font_path = 'C:/Windows/Fonts/msyhbd.ttc' if item.get('bold') else 'C:/Windows/Fonts/msyh.ttc'
            font = ImageFont.truetype(font_path, round(item['size']))
            draw = ImageDraw.Draw(canvas)
            box = draw.textbbox((0,0), item['text'], font=font)
            draw.text((item['x']-(box[2]-box[0])/2-box[0], item['y']-(box[3]-box[1])/2-box[1]), item['text'], font=font, fill=rgba(item['color']))
        else:
            color = rgba(item['color']); p = item['position']
            if item['kind'] == 'rect':
                x = p['x']+item['x']+432; y = 768-p['y']-item['y']-item['h']
                w,h=item['w'],item['h']; radius=min(item.get('r',0),w/2,h/2)
                # Alpha fills need a temporary small patch to match compositing.
                if color[3]<255 and item['mode']=='fill':
                    patch=Image.new('RGBA',(math.ceil(w)+3,math.ceil(h)+3))
                    ImageDraw.Draw(patch).rounded_rectangle((1,1,w+1,h+1),radius=radius,fill=color)
                    canvas.alpha_composite(patch,(round(x)-1,round(y)-1))
                else:
                    draw=ImageDraw.Draw(canvas)
                    args={'fill':color} if item['mode']=='fill' else {'outline':color,'width':max(1,round(item['lineWidth']))}
                    draw.rounded_rectangle((x,y,x+w,y+h),radius=radius,**args)
            else:
                points=[(p['x']+x+432,768-p['y']-y) for x,y in item['points']]
                if len(points)>1:ImageDraw.Draw(canvas).line(points,fill=color,width=max(1,round(item['lineWidth'])),joint='curve')
    return canvas.convert('RGB')

for name in ['start-state','reference-state','settings-state','palette-all-20']:
    data=json.loads((OUT/(name+'.json')).read_text(encoding='utf-8'))
    rendered = paint(data)
    rendered.save(OUT/(name+'.png'))
    if name == 'palette-all-20': rendered.crop((8,1136,856,1206)).save(OUT/'palette20-all.png')
    if name == 'start-state': rendered.crop((8,1136,856,1206)).save(OUT/'palette20-current-row.png')
source=Image.open(ROOT/'docs/bead_cocos_v3/bead_cocos_v3/reference/approved_ui.png').convert('RGB').resize((864,1536),Image.Resampling.LANCZOS)
actual=Image.open(OUT/'reference-state.png')
compare=Image.new('RGB',(1728,1536),'white');compare.paste(source,(0,0));compare.paste(actual,(864,0));compare.save(OUT/'comparison.png')
compare.crop((0,1080,1728,1536)).save(OUT/'dock-comparison.png')
print('Code-rendered layout captures and normalized comparisons saved in temp/v3-ui/. GPU preview remains separate.')

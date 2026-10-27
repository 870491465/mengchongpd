"""Reproducible scene metadata + explicitly temporary, soft PCM effects. No packages needed."""
import base64
import json
import math
from pathlib import Path
import random
import struct
import uuid
import wave

ROOT = Path(__file__).resolve().parents[1]
ENGINE = Path('D:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine')
NS = uuid.UUID('b9b5b920-d7b1-44b4-a0ad-998f5a90bead')

def uid(name):
    return str(uuid.uuid5(NS, name.replace('\\', '/')))

def meta(path, importer, version, files):
    Path(str(path) + '.meta').write_text(json.dumps(dict(ver=version, importer=importer,
        imported=True, uuid=uid(str(path.relative_to(ROOT))), files=files, subMetas={}, userData={}), indent=2), encoding='utf-8')

for directory in ['assets/scripts', 'assets/scenes', 'assets/resources', 'assets/resources/audio']:
    path = ROOT / directory
    path.mkdir(parents=True, exist_ok=True)
    meta(path, 'directory', '1.2.0', [])
for path in (ROOT / 'assets/scripts').glob('*.ts'):
    meta(path, 'typescript', '4.0.24', [])

scene = json.loads((ENGINE / 'editor/assets/default_file_content/scene/scene-2d.scene').read_text())
scene[0]['_name'] = scene[1]['_name'] = 'RowPrototype'
scene[2]['_lpos']['x'], scene[2]['_lpos']['y'] = 360, 640
scene[3]['_lpos']['z'] = 1000
scene[4]['_color'].update(r=17, g=28, b=36)
scene[5]['_contentSize'].update(width=720, height=1280)
script_uuid = uid('assets/scripts/RowPrototype.ts').replace('-', '')
# Cocos non-minimal compressed script class ID: first five hex characters, then base64 pairs.
alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
compressed = script_uuid[:5]
for i in range(5, 32, 3):
    n = int(script_uuid[i:i+3], 16)
    compressed += alphabet[n >> 6] + alphabet[n & 63]
scene[2]['_components'].append({'__id__': len(scene)})
scene.append({'__type__': compressed, '_name': '', '_objFlags': 0, 'node': {'__id__': 2},
    '_enabled': True, '__prefab': None, '_id': uid('row-component')})
path = ROOT / 'assets/scenes/RowPrototype.scene'
path.write_text(json.dumps(scene, indent=2), encoding='utf-8')
meta(path, 'scene', '1.1.50', ['.json'])

random.seed(42)
for name, duration, freq, gain in [('lock', .075, 620, .25), ('feed', .06, 740, .20),
        ('shot', .075, 390, .28), ('hit', .10, 520, .24), ('eject', .055, 560, .14), ('complete', .22, 660, .18)]:
    path = ROOT / 'assets/resources/audio' / (name + '.wav')
    data = []
    for i in range(int(duration * 44100)):
        t = i / 44100
        env = min(1, t / .006) * math.exp(-t * 45) * min(1, (duration - t) / .015)
        # Rounded, low-pass-like tones; a second quieter tap on contact.
        tone = math.sin(2 * math.pi * (freq * t - 900 * t*t))
        if name == 'hit' and t > .035:
            tone += .45 * math.sin(2 * math.pi * 720 * (t - .035)) * math.exp(-(t - .035) * 55)
        if name in ('lock', 'feed', 'eject'):
            tone += random.uniform(-.12, .12)
        data.append(struct.pack('<h', int(max(-.8, min(.8, tone * env * gain)) * 32767)))
    with wave.open(str(path), 'wb') as out:
        out.setparams((1, 2, 44100, 0, 'NONE', 'not compressed'))
        out.writeframes(b''.join(data))
    meta(path, 'audio-clip', '1.0.0', ['.json', '.wav'])
print('Scene, stable metadata and six temporary WAV effects created.')

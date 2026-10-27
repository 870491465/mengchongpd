"""Resample the supplied V3 matrix, keeping its original ten colors plus ten shades.

No rainbow beads are injected to force palette usage: colors absent from the
source picture may legitimately remain gray. Each source color has two shades.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT/'docs/bead_cocos_v3/bead_cocos_v3/data/level_chick.json').read_text(encoding='utf-8'))
digits = '0123456789abcdefghij'
rows = []
for y in range(50):
    row = []
    for x in range(50):
        color = source['cells'][y * source['rows'] // 50][x * source['cols'] // 50] - 1
        # Deterministic mild tone variation, preserving source shapes and color families.
        shade = 10 if (x + y * 3) % 7 < 2 else 0
        row.append(digits[color + shade])
    rows.append(''.join(row))
output = '/** 50x50 V3 chick chart. Base-36 IDs 0..j refer to the 20-color palette. */\n'
output += "export const PICTURE_NAME = '\u5c0f\u9e21\u7684\u82b1\u56ed';\n"
output += 'export const PICTURE_WIDTH = 50;\nexport const PICTURE_HEIGHT = 50;\nexport const PICTURE_CODES = [\n'
output += ''.join('    "' + row + '",\n' for row in rows) + '];\n'
(ROOT/'assets/scripts/PictureData.ts').write_text(output, encoding='utf-8')
print('50x50 V3 picture rebuilt with 20-color IDs; original geometry retained.')

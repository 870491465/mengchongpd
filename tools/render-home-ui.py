"""CPU layout evidence only; Creator/device rendering must be checked separately."""
import json
import runpy
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
paint = runpy.run_path(str(ROOT / 'tools/render-v3-ui.py'))['paint']
out = ROOT / 'temp/home-ui'
actual = paint(json.loads((out / 'home.json').read_text(encoding='utf-8')))
actual.save(out / 'home.png')
source = Image.open(ROOT / 'docs/bead_home_ui/bead_home_ui/reference/home_approved.png').convert('RGB').resize((864,1536), Image.Resampling.LANCZOS)
pair = Image.new('RGB', (1728,1536))
pair.paste(source, (0,0)); pair.paste(actual, (864,0)); pair.save(out / 'comparison.png')
pair.crop((0,0,1728,300)).save(out / 'header-comparison.png')
pair.crop((0,1020,1728,1536)).save(out / 'buttons-comparison.png')

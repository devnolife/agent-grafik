#!/usr/bin/env python3
"""Contact sheet of browser renders: python3 scripts/montage.py output/<slug> [--cols=2] [--width=640] [--out=path]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
folder = Path(args[0])
cols = int(opts.get("cols", 2))
width = int(opts.get("width", 640))
source = opts.get("from", "browser")
files = sorted((folder / source).glob("slide-*.png"))
if not files:
    sys.exit(f"no slides in {folder / source}")
height = round(width * 9 / 16)
gap = 12
rows = -(-len(files) // cols)
sheet = Image.new("RGB", (cols * width + (cols + 1) * gap, rows * height + (rows + 1) * gap), (24, 24, 27))
draw = ImageDraw.Draw(sheet)
for i, file in enumerate(files):
    tile = Image.open(file).convert("RGB").resize((width, height), Image.LANCZOS)
    x = gap + (i % cols) * (width + gap)
    y = gap + (i // cols) * (height + gap)
    sheet.paste(tile, (x, y))
    draw.rectangle((x, y, x + 34, y + 22), fill=(0, 0, 0))
    draw.text((x + 6, y + 5), f"{i + 1:02d}", fill=(255, 255, 255))
out = Path(opts.get("out", folder / "contact-sheet.png"))
sheet.save(out)
print(out, sheet.size)

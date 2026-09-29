# SPDX-License-Identifier: MPL-2.0
"""Regenerate the bundled dino GIF from its editable source poses (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
sprites = [Image.open(ROOT / 'dino-source' / f'dino-pose-{i}.png').convert('RGBA') for i in range(1, 5)]
frames = []
for n in range(160):
    im = Image.new('RGB', (232, 50), (8, 12, 17))
    draw = ImageDraw.Draw(im)
    for tile in range(-1, 4):
        x = tile * 80 + 16 - (n // 2) % 80
        draw.line([(x, 11), (x+3, 11), (x+3, 8), (x+7, 8), (x+7, 6), (x+12, 6), (x+12, 8), (x+16, 8), (x+16, 11), (x+20, 11)], fill=(70, 85, 93), width=1)
    draw.line((0, 43, 231, 43), fill=(93, 111, 118), width=1)
    for tile in range(-1, 5):
        x = tile * 80 - n % 80
        for dx, dy, length in [(4, 47, 4), (23, 46, 2), (47, 48, 5), (65, 46, 2)]:
            draw.line((x+dx, dy, x+dx+length, dy), fill=(58, 74, 81), width=1)
    x = round(-32 + n * 264 / 160)
    pose = (n // 3) % 4
    y = 13 - (1 if pose in (1, 3) else 0)
    im.paste(sprites[pose], (x, y), sprites[pose])
    frames.append(im)
frames = frames[60:] + frames[:60]
palette = Image.new('P', (1, 1))
colours = [(8, 12, 17), (238, 242, 235), (70, 85, 93), (93, 111, 118), (58, 74, 81)]
palette.putpalette(sum((list(c) for c in colours), []) + [0] * (768 - 3 * len(colours)))
frames = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
frames[0].save(ROOT / 'neo-dino-runner.gif', save_all=True, append_images=frames[1:], duration=50, loop=0, optimize=False, disposal=2)

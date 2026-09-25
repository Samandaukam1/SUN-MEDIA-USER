#!/usr/bin/env python3
"""
SUN MEDIA brand asset generator.

Single source of truth for the vector logo (traced from the official artwork): writes
components/brand/logo-geometry.json (drawn in-app with react-native-svg) and renders the
native app icon, Android adaptive icon, splash image and favicon from the same geometry.

Usage: python3 scripts/brand/generate.py   (requires Pillow)
"""
import json
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

INK = (26, 26, 27)
SILVER_TOP = (244, 244, 245)
SILVER_BOTTOM = (168, 168, 172)
LIME = (212, 252, 24)
WALL_TOP = (246, 246, 247)
WALL_BOTTOM = (214, 214, 217)
DARK_BG = (10, 10, 11)

VIEW_W, VIEW_H = 470, 206
BOX = {'x': 1, 'y': 0, 'w': 468, 'h': 122, 'r': 3}
SUN_STROKE = 17
# Centre lines of the squared "S", "U" and lowercase "n" (round joins, butt caps).
SUN = [
    [[129, 30.5], [44.5, 30.5], [44.5, 54], [123.5, 54], [123.5, 85.5], [38, 85.5]],
    [[193, 22], [193, 85], [276.5, 85], [276.5, 22]],
    [[334.5, 94], [334.5, 30.5], [429, 30.5], [429, 94]],
]
TAGLINE = {'text': 'BAKHADIROVICH', 'x': 235, 'y': 110, 'size': 8.6, 'spacing': 4.1}


def arc(cx, cy, r, start_deg, end_deg, steps=8):
    return [
        [round(cx + r * math.cos(math.radians(a)), 2), round(cy + r * math.sin(math.radians(a)), 2)]
        for a in (start_deg + (end_deg - start_deg) * i / steps for i in range(steps + 1))
    ]


# "MEDIA": polygons; shapes with a counter use two rings (even-odd fill).
M = [[0, 134], [34, 134], [55, 170], [76, 134], [110, 134], [110, 206], [87, 206], [87, 162], [62, 200], [48, 200], [23, 162], [23, 206], [0, 206]]
E = [[130, 134], [210, 134], [210, 150], [153, 150], [153, 161], [199, 161], [199, 174], [153, 174], [153, 190], [210, 190], [210, 206], [130, 206]]
D_OUTER = [[226, 134]] + arc(300, 150, 16, -90, 0) + arc(300, 190, 16, 0, 90) + [[226, 206]]
D_INNER = [[248, 150], [293, 150], [293, 190], [248, 190]]
A_OUTER = [[365, 206], [401, 134], [435, 134], [470, 206], [444, 206], [437, 193], [398, 193], [391, 206]]
A_INNER = [[418, 150], [433, 178], [403, 178]]
I_BAR = {'x': 334, 'y': 134, 'w': 23, 'h': 72}

GEOMETRY = {
    'viewBox': [VIEW_W, VIEW_H],
    'box': BOX,
    'sunStroke': SUN_STROKE,
    'sun': SUN,
    'tagline': TAGLINE,
    'media': [[M], [E], [D_OUTER, D_INNER], [A_OUTER, A_INNER]],
    'accentBar': I_BAR,
    'colors': {
        'ink': '#%02X%02X%02X' % INK,
        'silverTop': '#%02X%02X%02X' % SILVER_TOP,
        'silverBottom': '#%02X%02X%02X' % SILVER_BOTTOM,
        'lime': '#%02X%02X%02X' % LIME,
    },
}


def vertical_gradient(size, top, bottom):
    w, h = size
    grad = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        grad.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return grad.resize((w, h))


def render_logo(width, on_dark=False):
    """RGBA logo of the given pixel width (4x supersampled for smooth edges)."""
    ss = 4
    scale = width * ss / VIEW_W
    W, H = round(VIEW_W * scale), round(VIEW_H * scale)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    p = lambda pts: [(x * scale, y * scale) for x, y in pts]

    box_fill = (30, 30, 33) if on_dark else INK
    d.rounded_rectangle(
        [BOX['x'] * scale, BOX['y'] * scale, (BOX['x'] + BOX['w']) * scale, (BOX['y'] + BOX['h']) * scale],
        radius=BOX['r'] * scale,
        fill=box_fill,
        outline=(58, 58, 62) if on_dark else None,
        width=max(1, round(1.2 * scale)) if on_dark else 0,
    )

    # Silver letters: draw a mask, then fill it with a vertical gradient.
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    stroke = SUN_STROKE * scale
    for line in SUN:
        pts = p(line)
        md.line(pts, fill=255, width=round(stroke), joint='curve')
    silver = vertical_gradient((W, H), SILVER_TOP, SILVER_BOTTOM)
    img.paste(silver, (0, 0), mask)

    font_path = os.path.join(ROOT, 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf')
    font = ImageFont.truetype(font_path, round(TAGLINE['size'] * scale))
    letters = TAGLINE['text']
    advance = [d.textlength(ch, font=font) + TAGLINE['spacing'] * scale for ch in letters]
    total = sum(advance) - TAGLINE['spacing'] * scale
    x = TAGLINE['x'] * scale - total / 2
    for ch, adv in zip(letters, advance):
        d.text((x, TAGLINE['y'] * scale), ch, font=font, fill=(200, 200, 204), anchor='ls')
        x += adv

    media_fill = (244, 244, 245) if on_dark else INK
    for rings in GEOMETRY['media']:
        shape = Image.new('L', (W, H), 0)
        sd = ImageDraw.Draw(shape)
        sd.polygon(p(rings[0]), fill=255)
        for hole in rings[1:]:
            sd.polygon(p(hole), fill=0)
        img.paste(Image.new('RGBA', (W, H), media_fill + (255,)), (0, 0), shape)
    b = I_BAR
    d.rectangle([b['x'] * scale, b['y'] * scale, (b['x'] + b['w']) * scale, (b['y'] + b['h']) * scale], fill=LIME)
    return img.resize((width, round(VIEW_H * width / VIEW_W)), Image.LANCZOS)


def centered(canvas, logo, dy=0):
    x = (canvas.width - logo.width) // 2
    y = (canvas.height - logo.height) // 2 + dy
    canvas.alpha_composite(logo, (x, y)) if canvas.mode == 'RGBA' else canvas.paste(logo, (x, y), logo)
    return canvas


def main():
    with open(os.path.join(ROOT, 'components/brand/logo-geometry.json'), 'w') as f:
        json.dump(GEOMETRY, f, indent=1)
        f.write('\n')

    assets = os.path.join(ROOT, 'assets')
    # iOS icon: the logo on the brand's light wall, as in the official artwork (no alpha allowed).
    icon = vertical_gradient((1024, 1024), WALL_TOP, WALL_BOTTOM).convert('RGBA')
    centered(icon, render_logo(760))
    icon.convert('RGB').save(os.path.join(assets, 'icon.png'))

    # Android adaptive foreground: keep inside the 66% safe zone; background colour is set in app config.
    adaptive = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    centered(adaptive, render_logo(600))
    adaptive.save(os.path.join(assets, 'adaptive-icon.png'))

    # Splash: light logo on the dark launch background.
    splash = Image.new('RGBA', (1200, 526), (0, 0, 0, 0))
    centered(splash, render_logo(1200, on_dark=True))
    splash.save(os.path.join(assets, 'splash-icon.png'))

    favicon = vertical_gradient((196, 196), WALL_TOP, WALL_BOTTOM).convert('RGBA')
    centered(favicon, render_logo(170))
    favicon.convert('RGB').save(os.path.join(assets, 'favicon.png'))
    print('brand assets written')


if __name__ == '__main__':
    main()

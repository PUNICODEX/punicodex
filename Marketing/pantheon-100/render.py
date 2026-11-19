#!/usr/bin/env python3
"""Render 300 brand materials (3 cards x 100 flagship temples) for PuniCodex.

Card types per temple:
  1. patronage  - sponsorship promotion
  2. lore       - myth display image
  3. pattern    - myth-to-market modern connections

Data: marketing/pantheon-100/data.json (built by build-data.js from canonical sources)
Output: marketing/pantheon-100/cards/{id}-1-patronage.png etc.
"""
import json
import math
import os
import re
import sys

from fontTools.ttLib import TTCollection, TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'cards')

import matplotlib

MPL_FONTS = os.path.join(os.path.dirname(matplotlib.__file__), 'mpl-data', 'fonts', 'ttf')


def _find_runtime_fonts():
    here = os.path.dirname(sys.executable)
    for _ in range(6):
        cand = os.path.join(here, 'fonts')
        if os.path.exists(os.path.join(cand, 'NotoSansCJKsc-Regular.otf')):
            return cand
        here = os.path.dirname(here)
    return None


RUNTIME_FONTS = _find_runtime_fonts()
WIN = r'C:\Windows\Fonts'

FONT_PATHS = {
    'serif': os.path.join(MPL_FONTS, 'DejaVuSerif.ttf'),
    'serif_bold': os.path.join(MPL_FONTS, 'DejaVuSerif-Bold.ttf'),
    'serif_italic': os.path.join(MPL_FONTS, 'DejaVuSerif-Italic.ttf'),
    'sans': os.path.join(MPL_FONTS, 'DejaVuSans.ttf'),
    'sans_bold': os.path.join(MPL_FONTS, 'DejaVuSans-Bold.ttf'),
    'mono': os.path.join(MPL_FONTS, 'DejaVuSansMono.ttf'),
    'cjk': os.path.join(RUNTIME_FONTS, 'NotoSansCJKsc-Regular.otf') if RUNTIME_FONTS else None,
    'cjk_bold': os.path.join(RUNTIME_FONTS, 'NotoSansCJKsc-Bold.otf') if RUNTIME_FONTS else None,
    'devanagari': os.path.join(WIN, 'Nirmala.ttc'),
    'historic': os.path.join(WIN, 'seguihis.ttf'),
    'avestan': os.path.join(WIN, 'SansSerifCollection.ttf'),
    'noto': os.path.join(WIN, 'NotoSans-Regular.ttf'),
}

# Order matters: first font covering every char of the string wins.
SCRIPT_STACK = ['serif', 'cjk', 'devanagari', 'historic', 'avestan', 'noto', 'sans']

W, H = 1080, 1350
BG = (13, 11, 18)
IVORY = (240, 234, 220)
MUTED = (168, 160, 148)
FAINT = (110, 104, 96)

_font_cache = {}
_cmap_cache = {}


def font_path(key):
    p = FONT_PATHS.get(key)
    return p if p and os.path.exists(p) else None


def load_font(key, size):
    ck = (key, size)
    if ck in _font_cache:
        return _font_cache[ck]
    p = font_path(key)
    if not p:
        p = font_path('sans')
    f = ImageFont.truetype(p, size)
    _font_cache[ck] = f
    return f


def font_covers(key, text):
    """True if font's cmap covers every non-space char of text."""
    if key not in _cmap_cache:
        p = font_path(key)
        if not p:
            _cmap_cache[key] = set()
        else:
            try:
                if p.lower().endswith('.ttc'):
                    cmap = TTCollection(p).fonts[0].getBestCmap()
                else:
                    cmap = TTFont(p).getBestCmap()
                _cmap_cache[key] = set(cmap.keys())
            except Exception:
                _cmap_cache[key] = set()
    cmap = _cmap_cache[key]
    return all(ord(c) in cmap for c in text if not c.isspace())


def script_font_key(text):
    for key in SCRIPT_STACK:
        if font_covers(key, text):
            return key
    return None


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255


def text_w(draw, s, font, tracking=0):
    if not s:
        return 0
    w = draw.textlength(s, font=font)
    return w + tracking * max(0, len(s) - 1)


def draw_tracked(draw, xy, s, font, fill, tracking=0, anchor_center_x=None):
    x, y = xy
    if anchor_center_x is not None:
        x = anchor_center_x - text_w(draw, s, font, tracking) / 2
    for ch in s:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x


def wrap_text(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_font(draw, text, key, max_w, start, minimum, tracking=0):
    size = start
    while size > minimum:
        f = load_font(key, size)
        if text_w(draw, text, f, tracking) <= max_w:
            return f, size
        size -= 2
    return load_font(key, minimum), minimum


def ellipsize(draw, text, font, max_w):
    if draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + '…', font=font) > max_w:
        text = text[:-1].rstrip()
    return text + '…'


def fit_prose(draw, text, font, max_w, max_lines):
    """Return lines that fit max_lines, trimming at sentence boundary first."""
    lines = wrap_text(draw, text, font, max_w)
    if len(lines) <= max_lines:
        return lines
    # drop trailing sentences until it fits
    parts = [p for p in re.split(r'(?<=[.!?])\s+', text) if p]
    while len(parts) > 1:
        parts.pop()
        cand = ' '.join(parts)
        if len(wrap_text(draw, cand, font, max_w)) <= max_lines:
            return wrap_text(draw, cand, font, max_w)
    # last resort: ellipsize the final visible line
    kept = lines[:max_lines]
    kept[-1] = ellipsize(draw, kept[-1] + ' ' + lines[max_lines].split()[0], font, max_w)
    return kept


def truncate_chars(s, n):
    if len(s) <= n:
        return s
    cut = s[:n]
    sp = cut.rfind(' ')
    return cut[: sp if sp > n * 0.6 else n].rstrip(' ,;') + '…'


def radial_glow(img, center, radius, color, peak_alpha=90):
    scale = 0.25
    sw, sh = int(img.size[0] * scale), int(img.size[1] * scale)
    glow = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy, r = center[0] * scale, center[1] * scale, radius * scale
    steps = 22
    for i in range(steps, 0, -1):
        rr = r * i / steps
        a = int(peak_alpha * (1 - i / steps) ** 1.6)
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(15))
    glow = glow.resize(img.size, Image.BILINEAR)
    img.alpha_composite(glow)


def vignette(img):
    scale = 0.25
    sw, sh = int(W * scale), int(H * scale)
    v = Image.new('L', (sw, sh), 0)
    vd = ImageDraw.Draw(v)
    vd.rectangle([0, 0, sw, sh], fill=70)
    vd.ellipse([-50, -40, sw + 50, sh + 40], fill=0)
    v = v.filter(ImageFilter.GaussianBlur(30))
    v = v.resize(img.size, Image.BILINEAR)
    dark = Image.new('RGBA', img.size, (0, 0, 0, 255))
    img.paste(dark, (0, 0), v)


def load_mascot(path, box):
    try:
        m = Image.open(path).convert('RGBA')
    except Exception:
        return None
    m.thumbnail((box, box), Image.LANCZOS)
    # Mostly-opaque art (paintings, photos) gets a soft circular mask so it
    # stays inside medallions; character art with real transparency is left as-is.
    alpha = m.getchannel('A')
    hist = alpha.histogram()
    opaque = sum(hist[250:]) / max(1, m.size[0] * m.size[1])
    if opaque > 0.5:
        mask = Image.new('L', m.size, 0)
        md = ImageDraw.Draw(mask)
        md.ellipse([0, 0, m.size[0] - 1, m.size[1] - 1], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))
        m.putalpha(mask)
    return m


def frame(draw, primary):
    draw.rectangle([26, 26, W - 26, H - 26], outline=(255, 255, 255, 26), width=1)
    tick = 26
    for cx, cy, dx, dy in [
        (26, 26, 1, 1), (W - 26, 26, -1, 1), (26, H - 26, 1, -1), (W - 26, H - 26, -1, -1),
    ]:
        draw.line([cx, cy, cx + dx * tick, cy], fill=primary, width=3)
        draw.line([cx, cy, cx, cy + dy * tick], fill=primary, width=3)


def header(draw, primary):
    f = load_font('sans', 21)
    draw_tracked(draw, (0, 52), 'PUNICODEX', f, IVORY, tracking=8, anchor_center_x=W / 2 - 90)
    w_brand = text_w(draw, 'PUNICODEX', f, 8)
    f2 = load_font('sans', 21)
    draw_tracked(
        draw, (W / 2 - 90 + w_brand + 26, 52), 'THE UNICODE PANTHEON', f2, MUTED,
        tracking=6,
    )
    y = 92
    draw.line([W / 2 - 160, y, W / 2 - 24, y], fill=primary, width=1)
    draw.line([W / 2 + 24, y, W / 2 + 160, y], fill=primary, width=1)
    d = 5
    draw.polygon(
        [(W / 2, y - d), (W / 2 + d, y), (W / 2, y + d), (W / 2 - d, y)], fill=primary
    )


def footer(draw, entry, primary):
    y = H - 66
    draw.line([70, y - 18, W - 70, y - 18], fill=(255, 255, 255, 22), width=1)
    f = load_font('mono', 20)
    draw.text((70, y), f"punicodex.com/{entry['id']}", font=f, fill=MUTED)
    dom = entry.get('domainUnicode')
    if dom:
        f2 = load_font('mono', 20)
        w = draw.textlength(dom, font=f2)
        draw.text((W - 70 - w, y), dom, font=f2, fill=primary)


def script_line(draw, cx, y, entry, primary, size=44):
    script = entry.get('originalScript')
    label = entry.get('originalScriptLabel') or 'Original script'
    if script:
        key = script_font_key(script)
        if key:
            f = load_font(key, size)
            w = draw.textlength(script, font=f)
            draw.text((cx - w / 2, y), script, font=f, fill=primary)
            # exotic fonts carry tall metrics; give them extra clearance
            advance = int(size * 1.6) if key not in ('serif', 'serif_bold') else size + 10
            return y + advance
        # graceful fallback: name the script tradition instead of tofu
        f = load_font('serif_italic', 26)
        t = f'— {label} —'
        w = draw.textlength(t, font=f)
        draw.text((cx - w / 2, y + 6), t, font=f, fill=MUTED)
        return y + 44
    return y


def big_name(draw, cx, y, name, max_w, start=92, key=None, fill=IVORY):
    key = key or ('serif_bold' if font_covers('serif_bold', name) else script_font_key(name) or 'sans_bold')
    f, size = fit_font(draw, name, key, max_w, start, 40)
    w = draw.textlength(name, font=f)
    draw.text((cx - w / 2, y), name, font=f, fill=fill)
    return y + int(size * 1.12)


def kicker(draw, cx, y, text, primary, size=24):
    f = load_font('sans_bold', size)
    draw_tracked(draw, (0, y), text.upper(), f, primary, tracking=5, anchor_center_x=cx)
    return y + size + 14


def new_card(entry):
    img = Image.new('RGBA', (W, H), BG + (255,))
    primary = hex_rgb(entry['colors']['primary'])
    secondary = hex_rgb(entry['colors'].get('secondary', entry['colors']['primary']))
    radial_glow(img, (W // 2, int(H * 0.38)), 620, primary, peak_alpha=46)
    radial_glow(img, (W // 2, H + 120), 700, secondary, peak_alpha=30)
    vignette(img)
    return img, primary, secondary


# ---------------------------------------------------------------- card 1
def card_patronage(entry):
    img, primary, secondary = new_card(entry)
    draw = ImageDraw.Draw(img)
    frame(draw, primary)
    header(draw, primary)

    y = kicker(draw, W / 2, 128, f"Temple Patronage · Tier {entry['tier']}", primary)
    y = big_name(draw, W / 2, y + 6, entry['name'], W - 160, start=96)
    y = script_line(draw, W / 2, y + 2, entry, primary, size=42)
    if entry['tagline']:
        f = load_font('serif_italic', 30)
        lines = wrap_text(draw, entry['tagline'], f, W - 300)
        for ln in lines[:2]:
            w = draw.textlength(ln, font=f)
            draw.text((W / 2 - w / 2, y + 4), ln, font=f, fill=MUTED)
            y += 38
    y += 8

    # mascot medallion
    medallion_d = 320
    cx, cy = W // 2, y + medallion_d // 2
    radial_glow(img, (cx, cy), medallion_d // 2 + 60, primary, peak_alpha=110)
    mascot = load_mascot(entry['mascot'], medallion_d - 38) if entry.get('mascot') else None
    if mascot:
        img.alpha_composite(
            mascot, (cx - mascot.size[0] // 2, cy - mascot.size[1] // 2)
        )
    ring = Image.new('RGBA', img.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse(
        [cx - medallion_d // 2, cy - medallion_d // 2,
         cx + medallion_d // 2, cy + medallion_d // 2],
        outline=primary + (200,), width=3,
    )
    rd.ellipse(
        [cx - medallion_d // 2 - 10, cy - medallion_d // 2 - 10,
         cx + medallion_d // 2 + 10, cy + medallion_d // 2 + 10],
        outline=(255, 255, 255, 30), width=1,
    )
    img.alpha_composite(ring)
    y = cy + medallion_d // 2 + 22

    # domains of influence + industry seats
    f_lab = load_font('sans_bold', 20)
    f_val = load_font('serif', 27)
    draw_tracked(draw, (0, y), 'DOMAIN OF INFLUENCE', f_lab, MUTED, tracking=4,
                 anchor_center_x=W / 2)
    y += 30
    gloss_lines = wrap_text(draw, entry['domainGloss'], f_val, W - 260)
    for ln in gloss_lines[:2]:
        w = draw.textlength(ln, font=f_val)
        draw.text((W / 2 - w / 2, y), ln, font=f_val, fill=IVORY)
        y += 36
    y += 10

    seats = entry['industries'][:3]
    if seats:
        draw_tracked(draw, (0, y), 'SEATS OF INDUSTRY', f_lab, MUTED, tracking=4,
                     anchor_center_x=W / 2)
        y += 30
        f_seat = load_font('sans', 24)
        for s in seats:
            chip = hex_rgb(s['sectorColor'])
            name = s['name']
            cw = draw.textlength(name, font=f_seat)
            bx = W / 2 - cw / 2 - 18
            draw.rounded_rectangle([bx, y - 3, bx + 8, y + 25], radius=4, fill=chip)
            draw.text((W / 2 - cw / 2 + 10, y), name, font=f_seat, fill=IVORY)
            y += 37
    y += 6

    # domain band
    dom = entry.get('domainUnicode')
    puny = entry.get('domainPunycode')
    if dom:
        band_h = 96
        band = Image.new('RGBA', img.size, (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        bd.rounded_rectangle([90, y, W - 90, y + band_h], radius=14,
                             fill=(255, 255, 255, 10), outline=primary + (120,), width=1)
        img.alpha_composite(band)
        f_dom = load_font('serif_bold', 38)
        f_dom, _ = fit_font(draw, dom, 'serif_bold', W - 260, 38, 24)
        w = draw.textlength(dom, font=f_dom)
        dom_y = y + 10 if puny else y + 26
        draw.text((W / 2 - w / 2, dom_y), dom, font=f_dom, fill=primary)
        if puny:
            f_p = load_font('mono', 20)
            w = draw.textlength(puny, font=f_p)
            draw.text((W / 2 - w / 2, y + 58), puny, font=f_p, fill=MUTED)
        y += band_h + 16

    # CTA
    cta = f"BECOME A PATRON OF {entry['name'].upper()}"
    f_cta = load_font('sans_bold', 26)
    tw = text_w(draw, cta, f_cta, 3)
    pad_x = 40
    bx0, by0 = W / 2 - tw / 2 - pad_x, min(y, H - 185)
    bx1, by1 = W / 2 + tw / 2 + pad_x, by0 + 62
    text_rgb = (13, 11, 18) if luminance(primary) > 0.45 else IVORY
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=31, fill=primary)
    draw_tracked(draw, (0, by0 + 16), cta, f_cta, text_rgb, tracking=3,
                 anchor_center_x=W / 2)

    footer(draw, entry, primary)
    return img


# ---------------------------------------------------------------- card 2
def card_lore(entry):
    img, primary, secondary = new_card(entry)
    draw = ImageDraw.Draw(img)
    frame(draw, primary)
    header(draw, primary)

    y = kicker(draw, W / 2, 128, 'Lore & Myth · The Scholarly Record', primary)

    # hero portrait
    portrait_d = 400
    cx, cy = W // 2, y + portrait_d // 2 + 10
    radial_glow(img, (cx, cy), portrait_d // 2 + 90, primary, peak_alpha=130)
    mascot = load_mascot(entry['mascot'], portrait_d) if entry.get('mascot') else None
    if mascot:
        img.alpha_composite(mascot, (cx - mascot.size[0] // 2, cy - mascot.size[1] // 2))
    y = cy + portrait_d // 2 + 28

    y = big_name(draw, W / 2, y, entry['name'], W - 160, start=82)
    y = script_line(draw, W / 2, y + 2, entry, primary, size=38)

    if entry['tagline']:
        f = load_font('serif_italic', 27)
        for ln in wrap_text(draw, entry['tagline'], f, W - 300)[:1]:
            w = draw.textlength(ln, font=f)
            draw.text((W / 2 - w / 2, y + 4), ln, font=f, fill=MUTED)
            y += 36
    y += 10

    myth = entry['myths'][0] if entry['myths'] else None
    body = myth['text'] if myth else entry['mythLead']
    has_symbols = bool(entry['symbols'])
    sym_y = H - 262
    if myth:
        f_tag = load_font('sans_bold', 20)
        draw_tracked(draw, (0, y), myth['tag'].upper(), f_tag, primary, tracking=4,
                     anchor_center_x=W / 2)
        y += 28
        f_title = load_font('serif_bold', 32)
        for ln in wrap_text(draw, myth['title'], f_title, W - 220)[:1]:
            w = draw.textlength(ln, font=f_title)
            draw.text((W / 2 - w / 2, y), ln, font=f_title, fill=IVORY)
            y += 40
        y += 4
    f_body = load_font('serif', 26)
    budget = max(2, (sym_y - 24 - y) // 37) if has_symbols else 7
    for ln in fit_prose(draw, body, f_body, W - 220, budget):
        w = draw.textlength(ln, font=f_body)
        draw.text((W / 2 - w / 2, y), ln, font=f_body, fill=(208, 200, 186))
        y += 37

    syms = entry['symbols'][:3]
    if syms:
        y = sym_y
        col_w = (W - 200) / len(syms)
        f_sn = load_font('sans_bold', 23)
        f_sm = load_font('serif_italic', 21)
        for i, s in enumerate(syms):
            sx = 100 + col_w * i + col_w / 2
            d = 6
            draw.polygon([(sx, y - 14 - d), (sx + d, y - 14), (sx, y - 14 + d),
                          (sx - d, y - 14)], fill=primary)
            sname = ellipsize(draw, s['name'].split(' (')[0], f_sn, col_w - 20)
            w = draw.textlength(sname, font=f_sn)
            draw.text((sx - w / 2, y), sname, font=f_sn, fill=primary)
            m_lines = wrap_text(draw, truncate_chars(s['meaning'], 88), f_sm,
                                col_w - 24)[:3]
            my = y + 34
            for ln in m_lines:
                w = draw.textlength(ln, font=f_sm)
                draw.text((sx - w / 2, my), ln, font=f_sm, fill=MUTED)
                my += 28

    footer(draw, entry, primary)
    return img


# ---------------------------------------------------------------- card 3
def card_pattern(entry):
    img, primary, secondary = new_card(entry)
    draw = ImageDraw.Draw(img)
    frame(draw, primary)
    header(draw, primary)

    y = kicker(draw, W / 2, 128, 'From Myth to Market · Modern Patterns', primary)
    y = big_name(draw, W / 2, y + 4, entry['name'], W - 200, start=72)
    if entry['tagline']:
        f = load_font('serif_italic', 27)
        for ln in wrap_text(draw, entry['tagline'], f, W - 300)[:2]:
            w = draw.textlength(ln, font=f)
            draw.text((W / 2 - w / 2, y + 2), ln, font=f, fill=MUTED)
            y += 35
    y += 8

    # small mascot seal, left of the gloss (skip gloss if it duplicates the tagline)
    gloss = entry['domainGloss']
    if gloss and gloss.lower() in (entry['tagline'] or '').lower():
        gloss = ''
    f_gloss = load_font('serif', 28)
    lines = wrap_text(draw, gloss, f_gloss, W - 380) if gloss else []
    if not lines:
        y -= 20
    mascot = load_mascot(entry['mascot'], 120) if entry.get('mascot') else None
    if mascot and lines:
        radial_glow(img, (160, y + 45), 110, primary, peak_alpha=90)
        img.alpha_composite(mascot, (100, y - 10))
    gy = y
    for ln in lines[:3]:
        draw.text((260, gy), ln, font=f_gloss, fill=IVORY)
        gy += 38
    y = max(gy, y + 130) + 16 if lines else y + 16

    if entry['pronunciation']:
        f_p = load_font('serif_italic', 23)
        for ln in wrap_text(draw, f"Sounds like: {entry['pronunciation']}", f_p, W - 260)[:2]:
            w = draw.textlength(ln, font=f_p)
            draw.text((W / 2 - w / 2, y), ln, font=f_p, fill=MUTED)
            y += 32
    y += 12

    draw_tracked(draw, (0, y), 'WHERE THE NAME LIVES TODAY', load_font('sans_bold', 20),
                 MUTED, tracking=4, anchor_center_x=W / 2)
    y += 34

    seats = entry['industries'][:4]
    f_ind = load_font('sans_bold', 26)
    f_why = load_font('serif', 23)
    for s in seats:
        chip = hex_rgb(s['sectorColor'])
        row_y = y
        draw.rounded_rectangle([90, row_y, 98, row_y + 30], radius=4, fill=chip)
        sector = s['sectorName'].upper()
        f_sec = load_font('sans', 17)
        sw = draw.textlength(sector, font=f_sec)
        name_max_w = W - 90 - sw - 28 - 114
        name = ellipsize(draw, s['name'], f_ind, name_max_w)
        draw.text((114, row_y), name, font=f_ind, fill=IVORY)
        draw.text((W - 90 - sw, row_y + 6), sector, font=f_sec, fill=FAINT)
        why = s['why']
        if why.lower().startswith('primary seat:'):
            why = why.split(':', 1)[1].strip()
        why = why[0].upper() + why[1:] if why else ''
        wy = row_y + 38
        for ln in wrap_text(draw, why, f_why, W - 230)[:2]:
            draw.text((114, wy), ln, font=f_why, fill=(190, 182, 168))
            wy += 31
        y = wy + 18
        if y > H - 300:
            break

    dom = entry.get('domainUnicode')
    if dom:
        y = H - 240
        f_dom = load_font('serif_bold', 34)
        f_dom, _ = fit_font(draw, dom, 'serif_bold', W - 300, 34, 22)
        label = 'Own the name'
        f_l = load_font('serif_italic', 24)
        lw = draw.textlength(label, font=f_l)
        dw = draw.textlength(dom, font=f_dom)
        total = lw + 18 + dw
        x0 = W / 2 - total / 2
        draw.text((x0, y + 10), label, font=f_l, fill=MUTED)
        draw.text((x0 + lw + 18, y), dom, font=f_dom, fill=primary)

    footer(draw, entry, primary)
    return img


CARDS = [('1-patronage', card_patronage), ('2-lore', card_lore), ('3-pattern', card_pattern)]


def main():
    only = set(sys.argv[1:])
    with open(os.path.join(HERE, 'data.json'), encoding='utf-8') as fh:
        entries = json.load(fh)
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for e in entries:
        if only and e['id'] not in only:
            continue
        for suffix, fn in CARDS:
            out_path = os.path.join(OUT, f"{e['id']}-{suffix}.png")
            img = fn(e)
            img.convert('RGB').save(out_path, 'PNG', optimize=True)
            n += 1
        print(f"rendered {e['id']}")
    print(f'total: {n}')


if __name__ == '__main__':
    main()

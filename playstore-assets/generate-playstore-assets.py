#!/usr/bin/env python3
"""
Generate Play Store assets for PuniCodex Keyboard.

All colours, dimensions, and shapes are pulled directly from:
  - android/app/src/main/res/values/styles.xml
  - android/app/src/main/res/values/dimens.xml
  - android/app/src/main/res/layout/keyboard_view.xml
  - android/app/src/main/res/drawable/*.xml

The keyboard is rendered at 4x density so it is crisp for screenshots.
Brand assets are loaded from assets/brand/.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math
import textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'playstore-assets')
BRAND_DIR = os.path.join(ROOT, 'assets', 'brand')

# Real app colours from styles.xml / drawables
BG = '#080808'
KEY_BG_TOP = '#3a3a3a'
KEY_BG_BOTTOM = '#262626'
KEY_STROKE = '#444444'
SPECIAL_KEY_TOP = '#2a2a2a'
SPECIAL_KEY_BOTTOM = '#1a1a1a'
SPECIAL_KEY_STROKE = '#333333'
PRESSED_BG = '#151515'
PRESSED_STROKE = '#D4AF37'
GOLD = '#D4AF37'
TEXT_LIGHT = '#e0e0e0'
TEXT_DIM = '#cccccc'
SUGGESTION_BG = '#222222'
SUGGESTION_STROKE = '#80D4AF37'
DIVIDER = '#151515'
CHIP_TEXT = '#D4AF37'
CHIP_SUB = '#888888'
POPUP_BG = '#1a1a1a'
POPUP_STROKE = '#444444'
ACCENT_CELL_BG = '#2a2a2a'

# Curated long-press accents from PunyKeyboardService.java
ACCENT_MAP = {
    'a': ['á', 'à', 'â', 'ä', 'ã', 'å', 'ā', 'ă', 'ǎ'],
    'b': ['ḃ', 'ḅ', 'ḇ', 'ƀ', 'β'],
    'c': ['ç', 'ć', 'ĉ', 'č', 'ċ', 'ḉ'],
    'd': ['đ', 'ď', 'ð', 'ḍ', 'ḏ', 'ḑ'],
    'e': ['é', 'è', 'ê', 'ë', 'ē', 'ĕ', 'ė', 'ę', 'ə'],
    'f': ['ḟ', 'ƒ'],
    'g': ['ğ', 'ĝ', 'ģ', 'ġ', 'ǵ', 'ḡ'],
    'h': ['ĥ', 'ḥ', 'ḫ', 'ẖ', 'ħ', 'ɦ'],
    'i': ['í', 'ì', 'î', 'ï', 'ī', 'ĭ', 'į', 'ı', 'ǐ'],
    'j': ['ĵ', 'ɉ'],
    'k': ['ḱ', 'ḳ', 'ḵ', 'ƙ'],
    'l': ['ł', 'ľ', 'ĺ', 'ļ', 'ḷ', 'ŀ'],
    'm': ['ḿ', 'ṁ', 'ṃ', 'ɱ'],
    'n': ['ñ', 'ń', 'ņ', 'ň', 'ṇ', 'ṉ'],
    'o': ['ó', 'ò', 'ô', 'ö', 'õ', 'ō', 'ŏ', 'ø', 'ǒ'],
    'p': ['ṕ', 'ṗ', 'ƥ', 'ᵽ'],
    'q': ['ʠ'],
    'r': ['ŕ', 'ř', 'ŗ', 'ṛ', 'ṙ', 'ṟ'],
    's': ['ś', 'ŝ', 'ş', 'š', 'ṣ', 'ß', 'ṡ'],
    't': ['ţ', 'ť', 'ṭ', 'þ', 'ṯ', 'ṱ'],
    'u': ['ú', 'ù', 'û', 'ü', 'ū', 'ŭ', 'ů', 'ų', 'ǔ'],
    'v': ['ṽ', 'ṿ'],
    'w': ['ẃ', 'ẁ', 'ŵ', 'ẅ', 'ẇ', 'ẉ'],
    'x': ['ẋ', 'ẍ'],
    'y': ['ý', 'ỳ', 'ŷ', 'ÿ', 'ỹ', 'ẏ'],
    'z': ['ź', 'ẑ', 'ż', 'ž', 'ẓ', 'ẕ'],
}

# Real dimensions from dimens.xml
DP = 4  # render density
KEY_HEIGHT = 58 * DP
ROW_GAP = 5 * DP
KEY_MARGIN = 3 * DP
H_PADDING = 10 * DP
V_PADDING_TOP = 6 * DP
SUGGESTION_HEIGHT = 58 * DP
BOTTOM_SPACER = 16 * DP
CORNER_RADIUS = 7 * DP


def load_font(size):
    """Best-effort sans-serif font. DejaVu Sans preferred on Windows for broad Unicode coverage."""
    candidates = [
        'C:/Windows/Fonts/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_key(draw, x, y, w, h, label, font, special=False, gold_text=False, pressed=False):
    """Draw a single key matching the app's key_bg / key_special_bg."""
    margin = KEY_MARGIN
    x1, y1 = x + margin, y + margin
    x2, y2 = x + w - margin, y + h - margin

    if pressed:
        rounded_rect(draw, (x1, y1, x2, y2), CORNER_RADIUS, PRESSED_BG, PRESSED_STROKE, max(1, int(1.5 * DP)))
    elif special:
        # vertical gradient approximation
        for i in range(int(y2 - y1)):
            ratio = i / max(1, (y2 - y1))
            r = int(int(SPECIAL_KEY_TOP[1:3], 16) * (1 - ratio) + int(SPECIAL_KEY_BOTTOM[1:3], 16) * ratio)
            g = int(int(SPECIAL_KEY_TOP[3:5], 16) * (1 - ratio) + int(SPECIAL_KEY_BOTTOM[3:5], 16) * ratio)
            b = int(int(SPECIAL_KEY_TOP[5:7], 16) * (1 - ratio) + int(SPECIAL_KEY_BOTTOM[5:7], 16) * ratio)
            draw.line([(x1, y1 + i), (x2, y1 + i)], fill=(r, g, b))
        rounded_rect(draw, (x1, y1, x2, y2), CORNER_RADIUS, None, SPECIAL_KEY_STROKE, max(1, int(0.5 * DP)))
    else:
        for i in range(int(y2 - y1)):
            ratio = i / max(1, (y2 - y1))
            r = int(int(KEY_BG_TOP[1:3], 16) * (1 - ratio) + int(KEY_BG_BOTTOM[1:3], 16) * ratio)
            g = int(int(KEY_BG_TOP[3:5], 16) * (1 - ratio) + int(KEY_BG_BOTTOM[3:5], 16) * ratio)
            b = int(int(KEY_BG_TOP[5:7], 16) * (1 - ratio) + int(KEY_BG_BOTTOM[5:7], 16) * ratio)
            draw.line([(x1, y1 + i), (x2, y1 + i)], fill=(r, g, b))
        rounded_rect(draw, (x1, y1, x2, y2), CORNER_RADIUS, None, KEY_STROKE, max(1, int(0.5 * DP)))

    # text
    color = GOLD if gold_text else (TEXT_DIM if special else TEXT_LIGHT)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x + w // 2 - tw // 2
    ty = y + h // 2 - th // 2
    draw.text((tx, ty), label, fill=color, font=font)


def draw_keyboard(width, state='normal', long_press_key=None, suggestion_word=None):
    """Render the keyboard portion of the app at the given width.

    state: 'normal' | 'suggesting' | 'symbols'
    long_press_key: label of the key currently long-pressed (accent popup rendered above it)
    """
    if state == 'symbols':
        rows_data = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
            ['⇧', ':', ';', '"', "'", '/', '?', '<', '>', '⌫'],
            ['ABC', 'Ω', ',', ' ', '.', '↵'],
        ]
        special_positions = {
            (2, 0): 'shift', (2, 9): 'backspace',
            (3, 0): 'symbols', (3, 1): 'puni', (3, 2): 'punct', (3, 3): 'space', (3, 4): 'punct', (3, 5): 'return'
        }
        row_weights = [
            [1.0] * 10,
            [1.0] * 10,
            [1.4] + [1.0] * 8 + [1.4],
            [1.4, 1.4, 1.0, 4.5, 1.0, 1.4],
        ]
        row_offsets = [0, 0, 16 * DP, 0]  # side inset for row 3 (matching XML paddingStart/End 16dp)
    else:
        rows_data = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
            ['123', 'Ω', ',', ' ', '.', '?', '↵'],
        ]
        special_positions = {
            (2, 0): 'shift', (2, 8): 'backspace',
            (3, 0): 'symbols', (3, 1): 'puni', (3, 2): 'punct', (3, 3): 'space', (3, 4): 'punct', (3, 5): 'punct', (3, 6): 'return'
        }
        row_weights = [
            [1.0] * 10,
            [1.0] * 9,
            [1.4] + [1.0] * 7 + [1.4],
            [1.4, 1.4, 1.0, 4.5, 1.0, 1.0, 1.4],
        ]
        row_offsets = [0, 0, 0, 0]

    # compute total keyboard height
    num_rows = len(rows_data)
    height = SUGGESTION_HEIGHT + ROW_GAP + num_rows * KEY_HEIGHT + (num_rows - 1) * ROW_GAP + V_PADDING_TOP + BOTTOM_SPACER

    img = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(img)

    # suggestion bar
    suggestion_bar_y = V_PADDING_TOP
    draw.rectangle((H_PADDING, suggestion_bar_y, width - H_PADDING, suggestion_bar_y + SUGGESTION_HEIGHT), fill=BG)
    hint_font = load_font(15 * DP)
    if state == 'suggesting' and suggestion_word:
        draw.text((H_PADDING + 8 * DP, suggestion_bar_y + SUGGESTION_HEIGHT // 2 - 7 * DP),
                  suggestion_word.lower(), fill='#555555', font=hint_font)
        chip_x = H_PADDING + 110 * DP
        chip_h = SUGGESTION_HEIGHT - 8 * DP
        chip_y = suggestion_bar_y + 4 * DP
        rounded_rect(draw, (chip_x, chip_y, chip_x + 140 * DP, chip_y + chip_h), 8 * DP, SUGGESTION_BG, SUGGESTION_STROKE, DP)
        chip_font = load_font(18 * DP)
        draw.text((chip_x + 14 * DP, chip_y + 6 * DP), suggestion_word, fill=CHIP_TEXT, font=chip_font)
        sub_font = load_font(10 * DP)
        draw.text((chip_x + 14 * DP, chip_y + 30 * DP), 'Verified · 4 forms', fill=CHIP_SUB, font=sub_font)
    else:
        draw.text((H_PADDING + 8 * DP, suggestion_bar_y + SUGGESTION_HEIGHT // 2 - 7 * DP),
                  'PuniCodex', fill='#555555', font=hint_font)

    # divider
    div_y = suggestion_bar_y + SUGGESTION_HEIGHT + 4 * DP
    draw.rectangle((H_PADDING, div_y, width - H_PADDING, div_y + DP), fill=DIVIDER)

    # keyboard rows
    content_top = div_y + DP + ROW_GAP
    available_width = width - 2 * H_PADDING

    key_positions = []  # track for long-press popup placement

    for r_idx, row in enumerate(rows_data):
        y = content_top + r_idx * (KEY_HEIGHT + ROW_GAP)
        offset = row_offsets[r_idx]
        row_width = available_width - 2 * offset
        weights = row_weights[r_idx]
        total_weight = sum(weights)
        unit = row_width / total_weight
        x = H_PADDING + offset

        for c_idx, label in enumerate(row):
            w = unit * weights[c_idx]
            special = special_positions.get((r_idx, c_idx)) is not None
            gold = special_positions.get((r_idx, c_idx)) == 'puni'
            pressed = long_press_key and long_press_key == label
            ix, iy, iw, ih = int(x), int(y), int(w), KEY_HEIGHT
            draw_key(draw, ix, iy, iw, ih, label, load_font(22 * DP if not special else 18 * DP),
                     special=special, gold_text=gold, pressed=pressed)
            key_positions.append({
                'label': label, 'x': ix, 'y': iy, 'w': iw, 'h': ih,
                'row': r_idx, 'col': c_idx
            })
            x += w

    # long-press accent popup
    if long_press_key:
        key_info = next((k for k in key_positions if k['label'] == long_press_key), None)
        if key_info:
            accents = ACCENT_MAP.get(long_press_key, [])
            if accents:
                img = render_accent_popup(img, key_info, accents)

    return img


def render_accent_popup(base_img, key_info, accents):
    """Render the Android accent popup above the given key, matching accent_popup_bg.xml.

    Scaled slightly smaller than the live 48dp cells so the whole popup fits
    comfortably inside a 1080x1920 marketing screenshot.
    """
    cols = 5
    rows = math.ceil(len(accents) / cols)
    cell = 36 * DP
    margin = 3 * DP
    padding = 6 * DP
    popup_w = padding * 2 + cols * cell + (cols - 1) * margin
    popup_h = padding * 2 + rows * cell + (rows - 1) * margin + cell + margin  # accents + '+' row

    popup = Image.new('RGBA', (popup_w, popup_h), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(popup)

    # background
    pdraw.rounded_rectangle((0, 0, popup_w, popup_h), 9 * DP, fill=POPUP_BG, outline=POPUP_STROKE, width=max(1, DP))

    # accent grid
    font = load_font(18 * DP)
    for i, ch in enumerate(accents):
        r, c = divmod(i, cols)
        cx = padding + c * (cell + margin)
        cy = padding + r * (cell + margin)
        pdraw.rounded_rectangle((cx, cy, cx + cell, cy + cell), 4 * DP, fill=ACCENT_CELL_BG, outline='#444444', width=max(1, int(0.5 * DP)))
        bbox = pdraw.textbbox((0, 0), ch, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pdraw.text((cx + (cell - tw) // 2, cy + (cell - th) // 2), ch, fill=GOLD, font=font)

    # '+' row
    plus_y = padding + rows * (cell + margin)
    pdraw.rounded_rectangle((padding, plus_y, padding + cols * cell + (cols - 1) * margin, plus_y + cell),
                            4 * DP, fill=ACCENT_CELL_BG, outline='#444444', width=max(1, int(0.5 * DP)))
    plus_font = load_font(20 * DP)
    bbox = pdraw.textbbox((0, 0), '+', font=plus_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pdraw.text((padding + (cols * cell + (cols - 1) * margin - tw) // 2, plus_y + (cell - th) // 2),
               '+', fill='#888888', font=plus_font)

    # position popup centered above key, clamped to screen edges
    px = key_info['x'] + key_info['w'] // 2 - popup_w // 2
    gap = 16 * DP
    py = max(0, key_info['y'] - popup_h - gap)
    px = max(H_PADDING, min(base_img.width - popup_w - H_PADDING, px))

    base_img = base_img.convert('RGBA')
    base_img.paste(popup, (px, py), popup)
    return base_img


def fit_font(draw, text, max_width, start_size):
    """Return the largest font <= start_size whose text fits within max_width."""
    size = start_size
    while size > 20:
        font = load_font(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_width:
            return font, size
        size -= 2
    return load_font(20), 20


def render_screenshot(filename, state='normal', long_press_key=None, suggestion_word=None, overlay_text=None, overlay_sub=None, top_content=None):
    """Create a 1080x1920 phone screenshot with rendered keyboard."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), '#111111')
    draw = ImageDraw.Draw(img)

    # fake app header / text field
    header_h = 180
    draw.rectangle((0, 0, w, header_h), fill='#1a1a1a')
    draw.text((40, 70), 'Notes', fill=TEXT_LIGHT, font=load_font(48))

    # text field area
    field_y = header_h + 40
    draw.rectangle((40, field_y, w - 40, field_y + 140), fill='#0a0a0a', outline='#333333', width=2)
    if top_content:
        draw.text((60, field_y + 40), top_content, fill=TEXT_LIGHT, font=load_font(40))

    # keyboard
    kb = draw_keyboard(w, state=state, long_press_key=long_press_key, suggestion_word=suggestion_word)
    kb_h = kb.height
    img.paste(kb, (0, h - kb_h))

    # overlay text
    if overlay_text:
        max_text_width = w - 80
        overlay_font, _ = fit_font(draw, overlay_text, max_text_width, 56)
        bbox = draw.textbbox((0, 0), overlay_text, font=overlay_font)
        tw = bbox[2] - bbox[0]
        tx = w // 2 - tw // 2
        # dark backing for readability
        back_w = tw + 60
        back_h = 90
        draw.rounded_rectangle((tx - 30, 360, tx + back_w - 30, 360 + back_h), 20, fill=(0, 0, 0, 180))
        draw.text((tx, 380), overlay_text, fill=GOLD, font=overlay_font)
        if overlay_sub:
            sub_font, _ = fit_font(draw, overlay_sub, max_text_width, 32)
            bbox2 = draw.textbbox((0, 0), overlay_sub, font=sub_font)
            tw2 = bbox2[2] - bbox2[0]
            draw.text((w // 2 - tw2 // 2, 470), overlay_sub, fill=TEXT_DIM, font=sub_font)

    img.save(os.path.join(OUT_DIR, filename), quality=95)
    print(f'Wrote {filename}')


def generate_icon():
    """512x512 Play Store icon using real emblem glyph."""
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # rounded black background
    radius = 96
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=BG)

    # subtle gold radial glow
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(180, 0, -1):
        alpha = int(8 * (1 - i / 180))
        glow_draw.ellipse([size // 2 - i, size // 2 - i, size // 2 + i, size // 2 + i],
                          fill=(212, 175, 55, alpha))
    img = Image.alpha_composite(img, glow)

    # emblem glyph
    emblem_path = os.path.join(BRAND_DIR, '01-logos', 'punicodex-emblem-glyph-gold.webp')
    if os.path.exists(emblem_path):
        emblem = Image.open(emblem_path).convert('RGBA')
        emblem_size = int(size * 0.55)
        emblem = emblem.resize((emblem_size, emblem_size), Image.LANCZOS)
        ex = (size - emblem_size) // 2
        ey = (size - emblem_size) // 2 - 8
        img.paste(emblem, (ex, ey), emblem)

    img.save(os.path.join(OUT_DIR, 'ic_launcher-playstore-512x512.png'))
    print('Wrote ic_launcher-playstore-512x512.png')


def generate_feature_graphic():
    """1024x500 feature graphic using real brand assets only."""
    w, h = 1024, 500
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)

    # subtle radial glow
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(350, 0, -1):
        alpha = int(10 * (1 - i / 350))
        glow_draw.ellipse([w - i - 80, h // 2 - i, w + i - 80, h // 2 + i],
                          fill=(212, 175, 55, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), glow)

    # wordmark
    wordmark_path = os.path.join(BRAND_DIR, '01-logos', 'punicodex-wordmark-ivory.png')
    if os.path.exists(wordmark_path):
        wm = Image.open(wordmark_path).convert('RGBA')
        wm_w = 360
        wm_h = int(wm.height * (wm_w / wm.width))
        wm = wm.resize((wm_w, wm_h), Image.LANCZOS)
        img.paste(wm, (70, 160), wm)

    # emblem glyph on right
    emblem_path = os.path.join(BRAND_DIR, '01-logos', 'punicodex-emblem-glyph-gold.webp')
    if os.path.exists(emblem_path):
        emblem = Image.open(emblem_path).convert('RGBA')
        em_size = 260
        emblem = emblem.resize((em_size, em_size), Image.LANCZOS)
        img.paste(emblem, (w - em_size - 100, (h - em_size) // 2 - 20), emblem)

    # floating real unicode characters
    chars = ['Ω', 'þ', 'ð', 'Á', 'é', 'ṛ', 'μ', '☿']
    positions = [(520, 120), (620, 90), (750, 110), (850, 160), (540, 360), (660, 390), (790, 370), (900, 340)]
    char_font = load_font(44)
    for ch, (cx, cy) in zip(chars, positions):
        draw.text((cx, cy), ch, fill=(212, 175, 55, 90), font=char_font)

    # tagline
    tag_font = load_font(30)
    draw.text((70, 260), 'Unicode Keyboard · 1,600+ Symbols · Zero Keylogging', fill=TEXT_DIM, font=tag_font)

    # greek key strip bottom
    strip_path = os.path.join(BRAND_DIR, '03-ornaments', 'punicodex-greek-key-strip.webp')
    if os.path.exists(strip_path):
        strip = Image.open(strip_path).convert('RGBA')
        strip_h = 28
        strip = strip.resize((w, strip_h), Image.LANCZOS)
        img.paste(strip, (0, h - strip_h), strip)

    img.convert('RGB').save(os.path.join(OUT_DIR, 'feature-graphic-1024x500.png'))
    print('Wrote feature-graphic-1024x500.png')


def generate_picker_overlay():
    """Render the Unicode picker dialog as it appears in the app."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), '#111111')
    draw = ImageDraw.Draw(img)

    # background keyboard dim
    kb = draw_keyboard(w)
    kb_h = kb.height
    img.paste(kb, (0, h - kb_h))
    # dim overlay over the area above the keyboard
    dim = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_dim = ImageDraw.Draw(dim)
    draw_dim.rectangle((0, 0, w, h - kb_h), fill=(0, 0, 0, 160))
    img = Image.alpha_composite(img.convert('RGBA'), dim)

    # dialog
    dw = w - 60
    dh = 1100
    dx = 30
    dy = (h - kb_h) // 2 - dh // 2
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((dx, dy, dx + dw, dy + dh), 24, fill=BG, outline='#333333', width=2)

    # search bar
    sb_x, sb_y = dx + 24, dy + 24
    sb_w, sb_h = dw - 48, 48 * DP
    draw.rounded_rectangle((sb_x, sb_y, sb_x + sb_w, sb_y + sb_h), 8, fill='#1a1a1a')
    draw.text((sb_x + 20, sb_y + 14), 'Search symbols…', fill='#666666', font=load_font(16 * DP))

    # category chips
    chip_y = sb_y + sb_h + 20
    categories = ['All', 'Greek', 'Latin', 'Cyrillic', 'Runic', 'Math']
    cx = sb_x
    chip_h = 34 * DP
    for i, cat in enumerate(categories):
        selected = i == 0
        cw = len(cat) * 18 * DP + 28 * DP
        fill = GOLD if selected else '#2a2a2a'
        text_col = '#000000' if selected else GOLD
        draw.rounded_rectangle((cx, chip_y, cx + cw, chip_y + chip_h), chip_h // 2, fill=fill,
                               outline='#555555' if not selected else None, width=max(1, int(0.5 * DP)))
        draw.text((cx + 14 * DP, chip_y + 7 * DP), cat[0].upper() + cat[1:], fill=text_col, font=load_font(12 * DP))
        cx += cw + 8 * DP

    # grid of symbols
    grid_y = chip_y + chip_h + 24
    cols = 5
    cell_w = (dw - 48) // cols
    cell_h = 64 * DP
    symbols = ['Á', 'Æ', 'È', 'É', 'Ê', 'Ì', 'Í', 'Î', 'Ò', 'Ó', 'à', 'á', 'â', 'ä', 'ã', 'Å', 'ā', 'ă', 'ǎ', 'æ']
    for i, sym in enumerate(symbols[:20]):
        col = i % cols
        row = i // cols
        cx = sb_x + col * cell_w
        cy = grid_y + row * cell_h
        draw.rounded_rectangle((cx + 4, cy + 4, cx + cell_w - 4, cy + cell_h - 4), 6, fill='#2a2a2a', outline='#444444', width=1)
        draw.text((cx + cell_w // 2 - 14, cy + 8), sym, fill=GOLD, font=load_font(26 * DP))

    img.convert('RGB').save(os.path.join(OUT_DIR, 'screenshot-04-picker.png'))
    print('Wrote screenshot-04-picker.png')


if __name__ == '__main__':
    generate_icon()
    generate_feature_graphic()
    render_screenshot('screenshot-01-qwerty.png', state='normal',
                      overlay_text='The keyboard that knows mythology',
                      overlay_sub='Tap Ω to browse 1,600+ Unicode symbols')
    render_screenshot('screenshot-02-suggestions.png', state='suggesting', suggestion_word='Apóllōn',
                      overlay_text='Scholarly autocorrect',
                      overlay_sub='Type Apollo, get Apóllōn with correct diacritics')
    render_screenshot('screenshot-03-longpress.png', long_press_key='a',
                      overlay_text='Every accent, instantly',
                      overlay_sub='Long-press any letter for curated diacritics')
    generate_picker_overlay()
    render_screenshot('screenshot-05-symbols.png', state='symbols',
                      overlay_text='Numbers, symbols & Roman numerals',
                      overlay_sub='Switch to the 123 layout for math and punctuation')

    print('All assets generated in', OUT_DIR)

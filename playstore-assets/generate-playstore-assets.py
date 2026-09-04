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


def draw_status_bar(draw, w, y, time_text='9:41'):
    """Draw a minimal, premium status bar."""
    sb_h = 52
    tf = load_font(22)
    bbox = draw.textbbox((0, 0), time_text, font=tf)
    draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, y + (sb_h - (bbox[3] - bbox[1])) // 2),
              time_text, fill=TEXT_DIM, font=tf)


def draw_app_header(draw, w, y, title='Notes'):
    """Draw a clean, centered app header."""
    hh = 96
    tf = load_font(40)
    bbox = draw.textbbox((0, 0), title, font=tf)
    draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, y + (hh - (bbox[3] - bbox[1])) // 2),
              title, fill=TEXT_LIGHT, font=tf)
    # subtle divider
    draw.line([(w // 4, y + hh - 1), (w * 3 // 4, y + hh - 1)], fill='#1a1a1a', width=1)
    return hh


def draw_note_body(draw, x, y, w, h, title=None, hint=None, typed=None):
    """Draw a clean note card with title and body."""
    draw.rounded_rectangle((x, y, x + w, y + h), 24, fill='#0f0f0f', outline='#222222', width=1)
    pad = 32
    cy = y + pad
    if title:
        tf = load_font(30)
        draw.text((x + pad, cy), title, fill=GOLD, font=tf)
        cy += 48
    if typed:
        tf = load_font(32)
        draw.text((x + pad, cy), typed, fill=TEXT_LIGHT, font=tf)
        cy += 50
    elif hint:
        tf = load_font(32)
        draw.text((x + pad, cy), hint, fill='#555555', font=tf)
        cy += 50
    # body lines
    line_font = load_font(24)
    while cy < y + h - 36:
        draw.line([(x + pad, cy + 18), (x + w - pad, cy + 18)], fill='#1a1a1a', width=1)
        cy += 44


def render_screenshot(filename, state='normal', long_press_key=None, suggestion_word=None, overlay_text=None, overlay_sub=None, title=None, typed_text=None, hint_text='Start typing…'):
    """Create a 1080x1920 premium, minimal screenshot."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), '#050505')
    draw = ImageDraw.Draw(img)

    # soft ambient glow behind keyboard area
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(700, 0, -1):
        alpha = int(14 * (1 - i / 700))
        glow_draw.ellipse([w // 2 - i, h - 650 - i, w // 2 + i, h - 650 + i], fill=(212, 175, 55, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), glow)
    draw = ImageDraw.Draw(img)

    # elegant caption at top
    caption_h = 0
    if overlay_text:
        max_w = w - 80
        cap_font, _ = fit_font(draw, overlay_text, max_w, 44)
        bbox = draw.textbbox((0, 0), overlay_text, font=cap_font)
        tw = bbox[2] - bbox[0]
        draw.text((w // 2 - tw // 2, 56), overlay_text, fill=GOLD, font=cap_font)
        caption_h = bbox[3] - bbox[1] + 28
        if overlay_sub:
            sub_font, _ = fit_font(draw, overlay_sub, max_w, 28)
            bbox2 = draw.textbbox((0, 0), overlay_sub, font=sub_font)
            tw2 = bbox2[2] - bbox2[0]
            draw.text((w // 2 - tw2 // 2, 56 + caption_h), overlay_sub, fill=TEXT_DIM, font=sub_font)
            caption_h += bbox2[3] - bbox2[1] + 16

    # status bar
    sb_h = 52
    status_y = 56 + caption_h + 20 if caption_h else 40
    draw_status_bar(draw, w, status_y)

    # app header
    header_y = status_y + sb_h
    hh = draw_app_header(draw, w, header_y, title='Notes')

    # note body card
    body_margin = 50
    body_y = header_y + hh + 32
    body_h = 380
    draw_note_body(draw, body_margin, body_y, w - 2 * body_margin, body_h, title=title, hint=hint_text, typed=typed_text)

    # keyboard shadow
    kb = draw_keyboard(w, state=state, long_press_key=long_press_key, suggestion_word=suggestion_word)
    kb_h = kb.height
    shadow = Image.new('RGBA', (w, kb_h + 60), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(40):
        alpha = int(80 * (1 - i / 40))
        sd.line([(0, i), (w, i)], fill=(0, 0, 0, alpha))
    img.paste(shadow, (0, h - kb_h - 40), shadow)
    img.paste(kb, (0, h - kb_h))

    img.convert('RGB').save(os.path.join(OUT_DIR, filename), quality=95)
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
    """1024x500 minimalist feature graphic using real brand assets only."""
    w, h = 1024, 500
    img = Image.new('RGB', (w, h), '#050505')
    draw = ImageDraw.Draw(img)

    # soft gold radial glow behind emblem
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(300, 0, -1):
        alpha = int(18 * (1 - i / 300))
        glow_draw.ellipse([w // 2 - i, h // 2 - 90 - i, w // 2 + i, h // 2 - 90 + i],
                          fill=(212, 175, 55, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), glow)
    draw = ImageDraw.Draw(img)

    # emblem glyph (centered, medium)
    emblem_path = os.path.join(BRAND_DIR, '01-logos', 'punicodex-emblem-glyph-gold.webp')
    em_size = 160
    if os.path.exists(emblem_path):
        emblem = Image.open(emblem_path).convert('RGBA')
        emblem = emblem.resize((em_size, em_size), Image.LANCZOS)
        img.paste(emblem, (w // 2 - em_size // 2, 70), emblem)

    # wordmark
    wordmark_path = os.path.join(BRAND_DIR, '01-logos', 'punicodex-wordmark-ivory.png')
    if os.path.exists(wordmark_path):
        wm = Image.open(wordmark_path).convert('RGBA')
        wm_w = 420
        wm_h = int(wm.height * (wm_w / wm.width))
        wm = wm.resize((wm_w, wm_h), Image.LANCZOS)
        img.paste(wm, (w // 2 - wm_w // 2, 250), wm)

    # tagline
    tag_font = load_font(30)
    tag = 'The Unicode Keyboard for Scholars'
    bbox = draw.textbbox((0, 0), tag, font=tag_font)
    tw = bbox[2] - bbox[0]
    draw.text((w // 2 - tw // 2, 330), tag, fill=TEXT_LIGHT, font=tag_font)

    sub_font = load_font(22)
    sub = '1,600+ symbols · Mythological autocorrect · Zero keylogging'
    bbox2 = draw.textbbox((0, 0), sub, font=sub_font)
    tw2 = bbox2[2] - bbox2[0]
    draw.text((w // 2 - tw2 // 2, 378), sub, fill=TEXT_DIM, font=sub_font)

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
    """Render the Unicode picker dialog full-screen with a dimmed app behind it."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), '#050505')
    draw = ImageDraw.Draw(img)

    # ambient glow
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for i in range(700, 0, -1):
        alpha = int(10 * (1 - i / 700))
        glow_draw.ellipse([w // 2 - i, h // 2 - i, w // 2 + i, h // 2 + i], fill=(212, 175, 55, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), glow)
    draw = ImageDraw.Draw(img)

    # captions at top
    caption = '1,600+ Unicode symbols'
    sub = 'Tap Ω on the keyboard to open the palette picker'
    max_w = w - 80
    cap_font, _ = fit_font(draw, caption, max_w, 44)
    bbox = draw.textbbox((0, 0), caption, font=cap_font)
    tw = bbox[2] - bbox[0]
    draw.text((w // 2 - tw // 2, 56), caption, fill=GOLD, font=cap_font)
    subf, _ = fit_font(draw, sub, max_w, 28)
    bbox2 = draw.textbbox((0, 0), sub, font=subf)
    tw2 = bbox2[2] - bbox2[0]
    draw.text((w // 2 - tw2 // 2, 56 + (bbox[3] - bbox[1]) + 20), sub, fill=TEXT_DIM, font=subf)
    top_h = 56 + (bbox[3] - bbox[1]) + 20 + (bbox2[3] - bbox2[1]) + 24

    # status bar + header
    sb_h = 52
    draw_status_bar(draw, w, top_h)
    hh = draw_app_header(draw, w, top_h + sb_h, title='Symbols')

    # dim the area below header
    dim = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_dim = ImageDraw.Draw(dim)
    draw_dim.rectangle((0, top_h + sb_h + hh, w, h), fill=(0, 0, 0, 140))
    img = Image.alpha_composite(img.convert('RGBA'), dim)
    draw = ImageDraw.Draw(img)

    # dialog centered
    dw = w - 80
    dh = 1180
    dx = 40
    dy = top_h + sb_h + hh + 60
    draw.rounded_rectangle((dx, dy, dx + dw, dy + dh), 28, fill='#0d0d0d', outline='#2a2a2a', width=1)

    # dialog header
    hf = load_font(38)
    draw.text((dx + 28, dy + 28), 'Unicode Palette', fill=TEXT_LIGHT, font=hf)
    subf = load_font(24)
    draw.text((dx + 28, dy + 78), 'Greek, Latin, Cyrillic, Runic & more', fill=TEXT_DIM, font=subf)

    # search bar
    sb_x, sb_y = dx + 24, dy + 130
    sb_w, sb_h = dw - 48, 44 * DP
    draw.rounded_rectangle((sb_x, sb_y, sb_x + sb_w, sb_y + sb_h), 10, fill='#1a1a1a', outline='#2a2a2a', width=1)
    draw.text((sb_x + 24, sb_y + 12), 'Search symbols…', fill='#666666', font=load_font(14 * DP))

    # category chips
    chip_y = sb_y + sb_h + 24
    categories = ['All', 'Greek', 'Latin', 'Cyrillic', 'Runic', 'Math']
    cx = sb_x
    chip_h = 30 * DP
    for i, cat in enumerate(categories):
        selected = i == 0
        cw = len(cat) * 16 * DP + 26 * DP
        fill = GOLD if selected else '#2a2a2a'
        text_col = '#000000' if selected else GOLD
        draw.rounded_rectangle((cx, chip_y, cx + cw, chip_y + chip_h), chip_h // 2, fill=fill,
                               outline='#3a3a3a' if not selected else None, width=max(1, int(0.5 * DP)))
        draw.text((cx + 13 * DP, chip_y + 6 * DP), cat[0].upper() + cat[1:], fill=text_col, font=load_font(11 * DP))
        cx += cw + 8 * DP

    # grid of symbols
    grid_y = chip_y + chip_h + 28
    cols = 5
    cell_w = (dw - 48) // cols
    cell_h = 64 * DP
    symbols = ['Á', 'Æ', 'È', 'É', 'Ê', 'Ì', 'Í', 'Î', 'Ò', 'Ó', 'à', 'á', 'â', 'ä', 'ã', 'Å', 'ā', 'ă', 'ǎ', 'æ']
    for i, sym in enumerate(symbols[:20]):
        col = i % cols
        row = i // cols
        cx = sb_x + col * cell_w
        cy = grid_y + row * cell_h
        draw.rounded_rectangle((cx + 5, cy + 5, cx + cell_w - 5, cy + cell_h - 5), 8, fill='#222222', outline='#3a3a3a', width=1)
        sf = load_font(24 * DP)
        bbox = draw.textbbox((0, 0), sym, font=sf)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((cx + (cell_w - tw) // 2, cy + (cell_h - th) // 2 - 4), sym, fill=GOLD, font=sf)

    img.convert('RGB').save(os.path.join(OUT_DIR, 'screenshot-04-picker.png'))
    print('Wrote screenshot-04-picker.png')


if __name__ == '__main__':
    generate_icon()
    generate_feature_graphic()
    render_screenshot('screenshot-01-qwerty.png', state='normal',
                      overlay_text='The keyboard that knows mythology',
                      overlay_sub='Tap Ω to browse 1,600+ Unicode symbols',
                      title='New note',
                      hint_text='Start typing a mythological name…')
    render_screenshot('screenshot-02-suggestions.png', state='suggesting', suggestion_word='Apóllōn',
                      overlay_text='Scholarly autocorrect',
                      overlay_sub='Type Apollo, get Apóllōn with correct diacritics',
                      title='Apollo',
                      typed_text='apollo')
    render_screenshot('screenshot-03-longpress.png', long_press_key='a',
                      overlay_text='Every accent, instantly',
                      overlay_sub='Long-press any letter for curated diacritics',
                      title='Note',
                      typed_text='a')
    generate_picker_overlay()
    render_screenshot('screenshot-05-symbols.png', state='symbols',
                      overlay_text='Numbers, symbols & Roman numerals',
                      overlay_sub='Switch to the 123 layout for math and punctuation',
                      title='Math class',
                      hint_text='Type numbers, math and punctuation…')

    print('All assets generated in', OUT_DIR)

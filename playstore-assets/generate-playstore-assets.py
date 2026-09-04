#!/usr/bin/env python3
"""
Generate premium Play Store assets for PuniCodex Keyboard.

Design language:
  - Real brand assets only (emblem, wordmark, lockup, glow, laurel).
  - Screenshots are framed inside a realistic modern smartphone silhouette
    with titanium bezel, rounded corners, dynamic island, reflection sheen
    and soft shadow — no fake "Notes" app chrome.
  - Dark cinematic backgrounds with controlled gold lighting.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'playstore-assets')
BRAND_DIR = os.path.join(ROOT, 'assets', 'brand')

# App palette (from styles.xml / drawables)
BG = '#050505'
PHONE_BODY = '#121212'
PHONE_BEZEL = '#0a0a0a'
SCREEN_BG = '#000000'
KEY_BG_TOP = '#3a3a3a'
KEY_BG_BOTTOM = '#262626'
KEY_STROKE = '#555555'
SPECIAL_KEY_TOP = '#2a2a2a'
SPECIAL_KEY_BOTTOM = '#1a1a1a'
SPECIAL_KEY_STROKE = '#3a3a3a'
PRESSED_BG = '#151515'
PRESSED_STROKE = '#D4AF37'
GOLD = '#D4AF37'
IVORY = '#f0f0f0'
TEXT_LIGHT = '#e8e8e8'
TEXT_DIM = '#999999'
SUGGESTION_BG = '#1c1c1c'
SUGGESTION_STROKE = '#D4AF37'
DIVIDER = '#1a1a1a'
CHIP_TEXT = '#D4AF37'
CHIP_SUB = '#777777'
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

# Keyboard dimensions at 4x density
DP = 4
KEY_HEIGHT = 58 * DP
ROW_GAP = 5 * DP
KEY_MARGIN = 3 * DP
H_PADDING = 10 * DP
V_PADDING_TOP = 6 * DP
SUGGESTION_HEIGHT = 58 * DP
BOTTOM_SPACER = 16 * DP
CORNER_RADIUS = 7 * DP


def load_font(size, bold=False):
    """Best-effort sans-serif font with broad Unicode coverage."""
    candidates = []
    if bold:
        candidates += [
            'C:/Windows/Fonts/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            'C:/Windows/Fonts/segoeuib.ttf',
            'C:/Windows/Fonts/arialbd.ttf',
        ]
    candidates += [
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
    margin = KEY_MARGIN
    x1, y1 = x + margin, y + margin
    x2, y2 = x + w - margin, y + h - margin

    if pressed:
        rounded_rect(draw, (x1, y1, x2, y2), CORNER_RADIUS, PRESSED_BG, PRESSED_STROKE, max(1, int(1.5 * DP)))
    elif special:
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

    color = GOLD if gold_text else (TEXT_DIM if special else TEXT_LIGHT)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x + w // 2 - tw // 2
    ty = y + h // 2 - th // 2
    draw.text((tx, ty), label, fill=color, font=font)


def draw_keyboard(width, state='normal', long_press_key=None, suggestion_word=None):
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
        row_offsets = [0, 0, 16 * DP, 0]
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

    num_rows = len(rows_data)
    height = SUGGESTION_HEIGHT + ROW_GAP + num_rows * KEY_HEIGHT + (num_rows - 1) * ROW_GAP + V_PADDING_TOP + BOTTOM_SPACER

    img = Image.new('RGB', (width, height), SCREEN_BG)
    draw = ImageDraw.Draw(img)

    suggestion_bar_y = V_PADDING_TOP
    draw.rectangle((H_PADDING, suggestion_bar_y, width - H_PADDING, suggestion_bar_y + SUGGESTION_HEIGHT), fill=SCREEN_BG)
    hint_font = load_font(15 * DP)
    if state == 'suggesting' and suggestion_word:
        draw.text((H_PADDING + 8 * DP, suggestion_bar_y + SUGGESTION_HEIGHT // 2 - 7 * DP),
                  suggestion_word.lower(), fill='#555555', font=hint_font)
        chip_h = 44 * DP
        chip_y = suggestion_bar_y + (SUGGESTION_HEIGHT - chip_h) // 2
        chip_font = load_font(min(18 * DP, max(18, width // 20)))
        sub_font = load_font(min(10 * DP, max(12, width // 36)))
        main_bbox = draw.textbbox((0, 0), suggestion_word, font=chip_font)
        sub_bbox = draw.textbbox((0, 0), 'Verified · 4 forms', font=sub_font)
        chip_inner_w = max(main_bbox[2] - main_bbox[0], sub_bbox[2] - sub_bbox[0]) + 28
        chip_w = min(chip_inner_w + 20, width // 2 - H_PADDING)
        chip_x = width - H_PADDING - chip_w
        rounded_rect(draw, (chip_x, chip_y, chip_x + chip_w, chip_y + chip_h), 8 * DP, SUGGESTION_BG, SUGGESTION_STROKE, DP)
        draw.text((chip_x + 14, chip_y + 10), suggestion_word, fill=CHIP_TEXT, font=chip_font)
        draw.text((chip_x + 14, chip_y + 10 + (main_bbox[3] - main_bbox[1]) + 4), 'Verified · 4 forms', fill=CHIP_SUB, font=sub_font)
    else:
        draw.text((H_PADDING + 8 * DP, suggestion_bar_y + SUGGESTION_HEIGHT // 2 - 7 * DP),
                  'PuniCodex', fill='#444444', font=hint_font)

    div_y = suggestion_bar_y + SUGGESTION_HEIGHT + 4 * DP
    draw.rectangle((H_PADDING, div_y, width - H_PADDING, div_y + DP), fill=DIVIDER)

    content_top = div_y + DP + ROW_GAP
    available_width = width - 2 * H_PADDING

    key_positions = []

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

    if long_press_key:
        key_info = next((k for k in key_positions if k['label'] == long_press_key), None)
        if key_info:
            accents = ACCENT_MAP.get(long_press_key, [])
            if accents:
                img = render_accent_popup(img, key_info, accents)

    return img


def render_accent_popup(base_img, key_info, accents):
    cols = 4
    rows = math.ceil(len(accents) / cols)
    cell = 32 * DP
    margin = 3 * DP
    padding = 6 * DP
    popup_w = padding * 2 + cols * cell + (cols - 1) * margin
    popup_h = padding * 2 + rows * cell + (rows - 1) * margin + cell + margin

    popup = Image.new('RGBA', (popup_w, popup_h), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(popup)

    pdraw.rounded_rectangle((0, 0, popup_w, popup_h), 9 * DP, fill=POPUP_BG, outline=POPUP_STROKE, width=max(1, DP))

    font = load_font(18 * DP)
    for i, ch in enumerate(accents):
        r, c = divmod(i, cols)
        cx = padding + c * (cell + margin)
        cy = padding + r * (cell + margin)
        pdraw.rounded_rectangle((cx, cy, cx + cell, cy + cell), 4 * DP, fill=ACCENT_CELL_BG, outline='#444444', width=max(1, int(0.5 * DP)))
        bbox = pdraw.textbbox((0, 0), ch, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pdraw.text((cx + (cell - tw) // 2, cy + (cell - th) // 2), ch, fill=GOLD, font=font)

    plus_y = padding + rows * (cell + margin)
    pdraw.rounded_rectangle((padding, plus_y, padding + cols * cell + (cols - 1) * margin, plus_y + cell),
                            4 * DP, fill=ACCENT_CELL_BG, outline='#444444', width=max(1, int(0.5 * DP)))
    plus_font = load_font(20 * DP)
    bbox = pdraw.textbbox((0, 0), '+', font=plus_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pdraw.text((padding + (cols * cell + (cols - 1) * margin - tw) // 2, plus_y + (cell - th) // 2),
               '+', fill='#888888', font=plus_font)

    px = key_info['x'] + key_info['w'] // 2 - popup_w // 2
    gap = 16 * DP
    py = max(0, key_info['y'] - popup_h - gap)
    px = max(H_PADDING, min(base_img.width - popup_w - H_PADDING, px))

    base_img = base_img.convert('RGBA')
    base_img.paste(popup, (px, py), popup)
    return base_img


def fit_font(draw, text, max_width, start_size, bold=False):
    size = start_size
    while size > 20:
        font = load_font(size, bold=bold)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_width:
            return font, size
        size -= 2
    return load_font(20, bold=bold), 20


def load_brand_asset(path):
    full = os.path.join(BRAND_DIR, path)
    if os.path.exists(full):
        return Image.open(full).convert('RGBA')
    return None


def apply_glow(img, cx, cy, radius, color=(212, 175, 55), intensity=18):
    """Soft radial glow composited onto an RGBA image."""
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(radius, 0, -1):
        alpha = int(intensity * (1 - i / radius))
        gd.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(*color, alpha))
    return Image.alpha_composite(img, glow)


def draw_phone_frame(screen_img):
    """Wrap a screen image inside a premium, thin-bezel smartphone silhouette."""
    bezel = 14
    radius = 58
    outer_w = screen_img.width + bezel * 2
    outer_h = screen_img.height + bezel * 2

    # Device shadow
    shadow = Image.new('RGBA', (outer_w + 120, outer_h + 120), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(80, 0, -1):
        alpha = int(45 * (1 - i / 80))
        sd.rounded_rectangle(
            (60 - i // 4, 60 + i, 60 + outer_w + i // 4, 60 + outer_h + i),
            radius=radius + 10, fill=(0, 0, 0, alpha)
        )

    # Device body — subtle warm-to-cool metallic gradient
    body = Image.new('RGBA', (outer_w, outer_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    for y in range(outer_h):
        ratio = y / max(1, outer_h - 1)
        r = int(28 * (1 - ratio) + 12 * ratio)
        g = int(26 * (1 - ratio) + 12 * ratio)
        b = int(22 * (1 - ratio) + 12 * ratio)
        bd.line([(0, y), (outer_w, y)], fill=(r, g, b, 255))
    mask = Image.new('L', (outer_w, outer_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, outer_w, outer_h), radius=radius, fill=255)
    body.putalpha(mask)

    # Screen with inner rounded corners
    screen = Image.new('RGBA', (outer_w, outer_h), (0, 0, 0, 0))
    sc = ImageDraw.Draw(screen)
    inner_radius = radius - 8
    sc.rounded_rectangle((bezel, bezel, outer_w - bezel, outer_h - bezel), radius=inner_radius, fill=(0, 0, 0, 255))
    screen.paste(screen_img.convert('RGBA'), (bezel, bezel))

    # Dynamic island
    island_w, island_h = 110, 30
    ix = outer_w // 2 - island_w // 2
    iy = 14
    sc.rounded_rectangle((ix, iy, ix + island_w, iy + island_h), radius=island_h // 2, fill=(5, 5, 5, 255))

    # Reflection sheen on left edge
    sheen = Image.new('RGBA', (outer_w, outer_h), (0, 0, 0, 0))
    shd = ImageDraw.Draw(sheen)
    for i in range(60):
        alpha = int(22 * (1 - i / 60))
        shd.line([(i, 0), (i, outer_h)], fill=(255, 255, 255, alpha))
    sheen_mask = Image.new('L', (outer_w, outer_h), 0)
    smd = ImageDraw.Draw(sheen_mask)
    smd.rounded_rectangle((0, 0, outer_w, outer_h), radius=radius, fill=255)
    sheen.putalpha(ImageChops.multiply(sheen.split()[3], sheen_mask))

    # Compose: shadow + body + screen + sheen
    composite = Image.new('RGBA', (outer_w + 120, outer_h + 120), (0, 0, 0, 0))
    composite = Image.alpha_composite(composite, shadow)
    composite.paste(body, (60, 60), body)
    composite.paste(screen, (60, 60), screen)
    composite.paste(sheen, (60, 60), sheen)

    return composite


def render_screenshot(filename, state='normal', long_press_key=None, suggestion_word=None,
                      headline=None, subhead=None, title=None, typed_text=None, hint_text='Start typing…'):
    """Create a 1080x1920 premium screenshot with a realistic phone frame."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)

    # Background ambient glow
    img = img.convert('RGBA')
    img = apply_glow(img, w // 2, h // 2 + 100, 900, color=(212, 175, 55), intensity=10)
    draw = ImageDraw.Draw(img)

    # Headline + subhead at top
    top_margin = 90
    if headline:
        max_w = w - 120
        hf, _ = fit_font(draw, headline, max_w, 54, bold=True)
        bbox = draw.textbbox((0, 0), headline, font=hf)
        tw = bbox[2] - bbox[0]
        draw.text((w // 2 - tw // 2, top_margin), headline, fill=GOLD, font=hf)
        top_margin += (bbox[3] - bbox[1]) + 20
    if subhead:
        max_w = w - 160
        sf, _ = fit_font(draw, subhead, max_w, 30)
        bbox = draw.textbbox((0, 0), subhead, font=sf)
        tw = bbox[2] - bbox[0]
        draw.text((w // 2 - tw // 2, top_margin), subhead, fill=TEXT_DIM, font=sf)
        top_margin += (bbox[3] - bbox[1]) + 50

    # Render screen content (phone-sized)
    screen_w, screen_h = 800, 1700
    screen = Image.new('RGB', (screen_w, screen_h), SCREEN_BG)
    sd = ImageDraw.Draw(screen)

    # Status bar
    sb_h = 64
    tf = load_font(26)
    bbox = sd.textbbox((0, 0), '9:41', font=tf)
    sd.text((screen_w // 2 - (bbox[2] - bbox[0]) // 2, (sb_h - (bbox[3] - bbox[1])) // 2),
            '9:41', fill=TEXT_DIM, font=tf)
    # signal / battery indicators
    dot_r = 5
    right_x = screen_w - 30
    cy = sb_h // 2
    sd.ellipse([right_x - 36, cy - dot_r, right_x - 26, cy + dot_r], fill=TEXT_DIM)
    sd.ellipse([right_x - 24, cy - dot_r, right_x - 14, cy + dot_r], fill=TEXT_DIM)
    sd.rounded_rectangle([right_x - 10, cy - 7, right_x, cy + 7], radius=2, fill=TEXT_DIM)

    # Minimal input area
    input_y = sb_h + 40
    input_h = 150
    input_margin = 44
    sd.rounded_rectangle((input_margin, input_y, screen_w - input_margin, input_y + input_h),
                         radius=20, fill='#0c0c0c', outline='#1c1c1c', width=1)
    pad = 32
    cy = input_y + pad
    if title:
        tf = load_font(26)
        sd.text((input_margin + pad, cy), title, fill=GOLD, font=tf)
        cy += 44
    if typed_text:
        tf = load_font(30)
        sd.text((input_margin + pad, cy), typed_text, fill=TEXT_LIGHT, font=tf)
    elif hint_text:
        tf = load_font(30)
        sd.text((input_margin + pad, cy), hint_text, fill='#555555', font=tf)

    # Keyboard
    kb = draw_keyboard(screen_w, state=state, long_press_key=long_press_key, suggestion_word=suggestion_word)
    kb_h = kb.height
    screen.paste(kb, (0, screen_h - kb_h))

    # Wrap in phone frame
    phone = draw_phone_frame(screen)
    pw, ph = phone.size
    px = w // 2 - pw // 2
    py = top_margin + (h - top_margin - ph) // 2
    img = Image.alpha_composite(img, Image.new('RGBA', (w, h), (0, 0, 0, 0)))
    img.paste(phone, (px, py), phone)

    # Optional footer badge
    badge_text = None
    if state == 'normal':
        badge_text = '1,600+ Unicode symbols'
    elif state == 'suggesting':
        badge_text = 'Scholarly autocorrect'
    elif long_press_key:
        badge_text = 'Long-press accents'
    elif state == 'symbols':
        badge_text = 'Math, symbols & Roman numerals'

    if badge_text:
        bf = load_font(24)
        bbox = draw.textbbox((0, 0), badge_text, font=bf)
        tw = bbox[2] - bbox[0]
        draw.text((w // 2 - tw // 2, h - 90), badge_text, fill=TEXT_DIM, font=bf)

    img.convert('RGB').save(os.path.join(OUT_DIR, filename), quality=95)
    print(f'Wrote {filename}')


def generate_icon():
    """512x512 Play Store icon."""
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = 96
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill='#080808')

    img = apply_glow(img, size // 2, size // 2, 180, color=(212, 175, 55), intensity=10)

    emblem = load_brand_asset('01-logos/punicodex-emblem-glyph-gold.webp')
    if emblem:
        emblem_size = int(size * 0.55)
        emblem = emblem.resize((emblem_size, emblem_size), Image.LANCZOS)
        ex = (size - emblem_size) // 2
        ey = (size - emblem_size) // 2 - 8
        img.paste(emblem, (ex, ey), emblem)

    img.save(os.path.join(OUT_DIR, 'ic_launcher-playstore-512x512.png'))
    print('Wrote ic_launcher-playstore-512x512.png')


def generate_feature_graphic():
    """1024x500 cinematic feature graphic using real brand lockup."""
    w, h = 1024, 500
    img = Image.new('RGB', (w, h), BG)

    # Subtle gold radial glow behind the lockup
    img = img.convert('RGBA')
    img = apply_glow(img, w // 2, h // 2 - 10, 420, color=(212, 175, 55), intensity=16)

    # Stacked lockup
    lockup = load_brand_asset('01-logos/punicodex-lockup-stacked-gold.png')
    if lockup:
        lockup_w = 480
        ratio = lockup_w / lockup.width
        lockup_h = int(lockup.height * ratio)
        lockup = lockup.resize((lockup_w, lockup_h), Image.LANCZOS)
        lx = w // 2 - lockup_w // 2
        ly = h // 2 - lockup_h // 2 - 10
        img.paste(lockup, (lx, ly), lockup)
    else:
        # fallback
        emblem = load_brand_asset('01-logos/punicodex-emblem-glyph-gold.webp')
        if emblem:
            emblem = emblem.resize((160, 160), Image.LANCZOS)
            img.paste(emblem, (w // 2 - 80, 90), emblem)
        draw = ImageDraw.Draw(img)
        tf = load_font(48, bold=True)
        bbox = draw.textbbox((0, 0), 'PUNICODEX', font=tf)
        draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, 280), 'PUNICODEX', fill=GOLD, font=tf)

    draw = ImageDraw.Draw(img)
    sub = 'The Unicode Keyboard for Scholars · 1,600+ symbols · Zero keylogging'
    sf = load_font(22)
    bbox = draw.textbbox((0, 0), sub, font=sf)
    draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, 430), sub, fill=TEXT_DIM, font=sf)

    img.convert('RGB').save(os.path.join(OUT_DIR, 'feature-graphic-1024x500.png'))
    print('Wrote feature-graphic-1024x500.png')


def generate_picker_overlay():
    """Screenshot 4: full-screen Unicode palette picker inside phone frame."""
    w, h = 1080, 1920
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)

    img = img.convert('RGBA')
    img = apply_glow(img, w // 2, h // 2 + 100, 900, color=(212, 175, 55), intensity=10)
    draw = ImageDraw.Draw(img)

    headline = '1,600+ Unicode symbols'
    subhead = 'Tap Ω on the keyboard to open the palette picker'
    top_margin = 90

    hf, _ = fit_font(draw, headline, w - 120, 54, bold=True)
    bbox = draw.textbbox((0, 0), headline, font=hf)
    tw = bbox[2] - bbox[0]
    draw.text((w // 2 - tw // 2, top_margin), headline, fill=GOLD, font=hf)
    top_margin += (bbox[3] - bbox[1]) + 20

    sf, _ = fit_font(draw, subhead, w - 160, 30)
    bbox = draw.textbbox((0, 0), subhead, font=sf)
    tw = bbox[2] - bbox[0]
    draw.text((w // 2 - tw // 2, top_margin), subhead, fill=TEXT_DIM, font=sf)
    top_margin += (bbox[3] - bbox[1]) + 50

    # Screen content
    screen_w, screen_h = 800, 1700
    screen = Image.new('RGB', (screen_w, screen_h), SCREEN_BG)
    sd = ImageDraw.Draw(screen)

    sb_h = 64
    tf = load_font(26)
    bbox = sd.textbbox((0, 0), '9:41', font=tf)
    sd.text((screen_w // 2 - (bbox[2] - bbox[0]) // 2, (sb_h - (bbox[3] - bbox[1])) // 2),
            '9:41', fill=TEXT_DIM, font=tf)
    dot_r = 5
    right_x = screen_w - 30
    cy = sb_h // 2
    sd.ellipse([right_x - 36, cy - dot_r, right_x - 26, cy + dot_r], fill=TEXT_DIM)
    sd.ellipse([right_x - 24, cy - dot_r, right_x - 14, cy + dot_r], fill=TEXT_DIM)
    sd.rounded_rectangle([right_x - 10, cy - 7, right_x, cy + 7], radius=2, fill=TEXT_DIM)

    # Dim app behind
    sd.rectangle((0, sb_h, screen_w, screen_h), fill='#000000')

    # Dialog
    dw = screen_w - 80
    dh = 1080
    dx = 40
    dy = sb_h + 60
    sd.rounded_rectangle((dx, dy, dx + dw, dy + dh), 28, fill='#0d0d0d', outline='#2a2a2a', width=1)

    hf = load_font(38)
    sd.text((dx + 28, dy + 28), 'Unicode Palette', fill=IVORY, font=hf)
    subf = load_font(24)
    sd.text((dx + 28, dy + 78), 'Greek, Latin, Cyrillic, Runic & more', fill=TEXT_DIM, font=subf)

    sb_x, sb_y = dx + 24, dy + 130
    sb_w, sb_h2 = dw - 48, 44 * DP
    sd.rounded_rectangle((sb_x, sb_y, sb_x + sb_w, sb_y + sb_h2), 10, fill='#1a1a1a', outline='#2a2a2a', width=1)
    sd.text((sb_x + 24, sb_y + 12), 'Search symbols…', fill='#666666', font=load_font(14 * DP))

    # Category chips — scaled to fit the dialog width
    chip_y = sb_y + sb_h2 + 20
    categories = ['All', 'Greek', 'Latin', 'Cyrillic', 'Runic', 'Math']
    chip_h = 22 * DP
    chip_font = load_font(11 * DP)
    gap = 8
    cx = sb_x
    for i, cat in enumerate(categories):
        selected = i == 0
        text = cat[0].upper() + cat[1:]
        tb = sd.textbbox((0, 0), text, font=chip_font)
        cw = (tb[2] - tb[0]) + 28
        fill = GOLD if selected else '#2a2a2a'
        text_col = '#000000' if selected else GOLD
        sd.rounded_rectangle((cx, chip_y, cx + cw, chip_y + chip_h), chip_h // 2, fill=fill,
                             outline='#3a3a3a' if not selected else None, width=max(1, int(0.5 * DP)))
        sd.text((cx + 14, chip_y + (chip_h - (tb[3] - tb[1])) // 2), text, fill=text_col, font=chip_font)
        cx += cw + gap

    # Symbol grid
    grid_y = chip_y + chip_h + 24
    cols = 5
    cell_w = (dw - 48) // cols
    cell_h = 44 * DP
    symbols = ['Á', 'Æ', 'È', 'É', 'Ê', 'Ì', 'Í', 'Î', 'Ò', 'Ó', 'à', 'á', 'â', 'ä', 'ã', 'Å', 'ā', 'ă', 'ǎ', 'æ']
    for i, sym in enumerate(symbols[:20]):
        col = i % cols
        row = i // cols
        cx = sb_x + col * cell_w
        cy = grid_y + row * cell_h
        sd.rounded_rectangle((cx + 5, cy + 5, cx + cell_w - 5, cy + cell_h - 5), 8, fill='#222222', outline='#3a3a3a', width=1)
        sf = load_font(22 * DP)
        bbox = sd.textbbox((0, 0), sym, font=sf)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        sd.text((cx + (cell_w - tw) // 2, cy + (cell_h - th) // 2 - 4), sym, fill=GOLD, font=sf)

    # Wrap in phone frame
    phone = draw_phone_frame(screen)
    pw, ph = phone.size
    px = w // 2 - pw // 2
    py = top_margin + (h - top_margin - ph) // 2
    img.paste(phone, (px, py), phone)

    bf = load_font(24)
    badge = 'Browse every alphabet in one tap'
    bbox = draw.textbbox((0, 0), badge, font=bf)
    tw = bbox[2] - bbox[0]
    draw.text((w // 2 - tw // 2, h - 90), badge, fill=TEXT_DIM, font=bf)

    img.convert('RGB').save(os.path.join(OUT_DIR, 'screenshot-04-picker.png'))
    print('Wrote screenshot-04-picker.png')


if __name__ == '__main__':
    generate_icon()
    generate_feature_graphic()
    render_screenshot('screenshot-01-qwerty.png', state='normal',
                      headline='The keyboard that knows mythology',
                      subhead='Tap Ω to browse 1,600+ Unicode symbols',
                      title='New note',
                      hint_text='Start typing a mythological name…')
    render_screenshot('screenshot-02-suggestions.png', state='suggesting', suggestion_word='Apóllōn',
                      headline='Scholarly autocorrect',
                      subhead='Type Apollo, get Apóllōn with correct diacritics',
                      title='Apollo',
                      typed_text='apollo')
    render_screenshot('screenshot-03-longpress.png', long_press_key='a',
                      headline='Every accent, instantly',
                      subhead='Long-press any letter for curated diacritics',
                      title='Note',
                      typed_text='a')
    generate_picker_overlay()
    render_screenshot('screenshot-05-symbols.png', state='symbols',
                      headline='Numbers, symbols & Roman numerals',
                      subhead='Switch to the 123 layout for math and punctuation',
                      title='Math class',
                      hint_text='Type numbers, math and punctuation…')

    print('All assets generated in', OUT_DIR)

#!/usr/bin/env python3
"""Comprehensive scan for mojibake across all site temples."""

from pathlib import Path

patterns = {
    b'\xc3\x84\xe2\x80\x9c': 'HÄ" -> Hē',
    b'\xc3\x98\xc2\xb9': 'Ø¹ -> ع',
    b'\xc3\x8a\xc2\xbf': 'Ê¿ -> ʿ',
    b'\xc3\xa2\xc2\xb2\xc2\xa5': 'â²¥ -> ⲥ',
    b'\xc3\xa2\xc2\xb2\xe2\x80\x9c': 'â²" -> ⲓ',
    b'\xc3\xa2\xc2\xb2\xc2\x81': 'â² -> ⲁ',
    b'\xc3\x98\xc2\xb4': 'Ø´ -> ش',
    b'\xc3\x99\xcb\x86': 'Ùˆ -> و',
    b'\xc3\x98\xc2\xb1': 'Ø± -> ر',
    b'\xc3\x97\xc2\xa9': '×© -> ש',
    b'\xc3\x96\xc2\xb5': 'Öµ -> ֵ',
    b'\xc3\x97\xe2\x80\x9a': '×‚ -> ւ',
    b'\xc3\x97\xe2\x80\xba': '×› -> כ',
    b'\xc3\x96\xc2\xb6': 'Ö¶ -> ֶ',
    b'\xc3\x97\xc5\x93': '×œ -> ל',
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d': 'â€" -> —',
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x98': 'â€\' -> ‑',
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x99': 'â€™ -> \'',
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c': 'â€œ -> "',
    b'\xc3\x8b\xcb\x86': 'Ëˆ -> ˈ',
    b'\xc3\x8b\xc2\x90': 'Ë -> ː',
    b'\xc3\x8a\xe2\x80\xa2': 'Ê• -> ʕ',
    b'\xc3\xaa\xc5\x93\xc2\xa5': 'êœ¥ -> ꜥ',
    b'\xc3\xaa\xc5\x93\xc2\xa3': 'êœ£ -> ꜣ',
    b'\xc3\xa1\xc2\xb8\xc2\xab': 'á¸« -> ḫ',
}

sites_dir = Path('sites')
found_any = False
for site_dir in sorted(sites_dir.iterdir()):
    if not site_dir.is_dir():
        continue
    path = site_dir / 'index.html'
    if not path.exists():
        continue
    content = path.read_bytes()
    for pat, desc in patterns.items():
        count = content.count(pat)
        if count > 0:
            found_any = True
            print(f'{site_dir.name}: {desc} ({count}x)')

if not found_any:
    print('ALL 268 SITES ARE CLEAN — no known mojibake patterns found.')

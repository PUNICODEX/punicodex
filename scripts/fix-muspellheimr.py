#!/usr/bin/env python3
"""Fix mojibake corruptions in muspellheimr."""

from pathlib import Path

fixes = {
    b'\xc3\x9a': b'\x55',                     # Ú -> U (in PUNYCODEX)
    b'\xc3\x8b\xcb\x86': b'\xcb\x88',        # Ëˆ -> ˈ (primary stress)
    b'\xc3\x8b\xc5\x92': b'\xcb\x8c',        # ËŒ -> ˌ (secondary stress)
    b'\xc3\x89\xe2\x80\xba': b'\xc9\x9b',   # É› -> ɛ (open-mid front vowel)
    b'\xc3\x8c\xc2\xa9': b'\xcc\xa9',       # Ì© -> ̩ (combining vertical line below)
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d': b'\xe2\x80\x94',  # â€" -> —
}

path = Path('sites/muspellheimr/index.html')
content = path.read_bytes()
original = content
total = 0
for bad, good in fixes.items():
    count = original.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        total += count
        print(f'  {bad.hex()} -> {good.hex()} ({count}x)')

if content != original:
    path.write_bytes(content)
    print(f'muspellheimr: {total} total replacements')
else:
    print('muspellheimr: no changes')

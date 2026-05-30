#!/usr/bin/env python3
"""Fix additional double-mojibake corruptions in Egyptian temple files."""

from pathlib import Path

fixes = {
    # Hēlios (line 368)
    b'\xc3\x84\xe2\x80\x9c': b'\xc4\x93',

    # Arabic ع (ain)
    b'\xc3\x98\xc2\xb9': b'\xd8\xb9',

    # IPA ʿ (modifier letter left half ring)
    b'\xc3\x8a\xc2\xbf': b'\xca\xbf',

    # Coptic ⲥⲓⲁ
    b'\xc3\xa2\xc2\xb2\xc2\xa5': b'\xe2\xb2\xa5',   # ⲥ
    b'\xc3\xa2\xc2\xb2\xe2\x80\x9c': b'\xe2\xb2\x93', # ⲓ
    b'\xc3\xa2\xc2\xb2\xc2\x81': b'\xe2\xb2\x81',   # ⲁ

    # Arabic شعور
    b'\xc3\x98\xc2\xb4': b'\xd8\xb4',   # ش
    b'\xc3\x99\xcb\x86': b'\xd9\x88',   # و
    b'\xc3\x98\xc2\xb1': b'\xd8\xb1',   # ر

    # Hebrew שֵׂכֶל
    b'\xc3\x97\xc2\xa9': b'\xd7\xa9',   # ש
    b'\xc3\x96\xc2\xb5': b'\xd6\xb5',   # ֵ
    b'\xc3\x97\xe2\x80\x9a': b'\xd7\x82', # ւ
    b'\xc3\x97\xe2\x80\xba': b'\xd7\x9b', # כ
    b'\xc3\x96\xc2\xb6': b'\xd6\xb6',   # ֶ
    b'\xc3\x97\xc5\x93': b'\xd7\x9c',   # ל
}

sites = ['ab', 'akh', 'maa', 'sia']
for site in sites:
    path = Path(f'sites/{site}/index.html')
    content = path.read_bytes()
    original = content
    total = 0
    for bad, good in fixes.items():
        count = original.count(bad)
        if count > 0:
            content = content.replace(bad, good)
            total += count
            print(f'  {site}: {bad.hex()} -> {good.hex()} ({count}x)')
    if content != original:
        path.write_bytes(content)
        print(f'{site}: {total} total replacements')
    else:
        print(f'{site}: no changes')

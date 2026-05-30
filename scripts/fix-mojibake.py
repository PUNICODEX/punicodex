#!/usr/bin/env python3
"""Fix double-mojibake corruptions in Egyptian temple files."""

from pathlib import Path

fixes = {
    # IPA characters corrupted through Windows-1252 misinterpretation
    b'\xc3\x8b\xcb\x86': b'\xcb\x88',   # Ëˆ -> ˈ (primary stress)
    b'\xc3\x8b\xc2\x90': b'\xcb\x90',   # Ë + control -> ː (vowel length)
    b'\xc3\x8a\xe2\x80\xa2': b'\xca\x95',  # Ê• -> ʕ (pharyngeal fricative)

    # Dash/hyphen corruptions through Windows-1252 misinterpretation
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d': b'\xe2\x80\x94',  # â€\" -> — (em dash)
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x98': b'\xe2\x80\x91',  # â€' -> ‑ (non-breaking hyphen)

    # Quote corruptions
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x99': b'\xe2\x80\x99',  # â€™ -> ' (right single quote)
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c': b'\xe2\x80\x9c',  # â€œ -> " (left double quote)
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d': b'\xe2\x80\x9d',  # â€\" -> " (right double quote)
    b'\xc3\xa2\xe2\x82\xac\xe2\x80\x98': b'\xe2\x80\x98',  # â€' -> ' (left single quote)
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

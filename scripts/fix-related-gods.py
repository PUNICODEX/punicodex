#!/usr/bin/env python3
"""Fix corrupted Greek names in related-names sections of flagship pages."""

import os
import re

# Mapping of corrupted patterns to correct Greek names
# Only apply to patterns inside Greek-name HTML elements
GREEK_REPLACEMENTS = {
    '?e??': 'Ζεύς',
    '??a': 'Ἥρα',
    '??se?d??': 'Ποσειδῶν',
    '??µ?t??': 'Δημήτηρ',
    '???t?': 'Ἑκάτη',
    '?p?????': 'Ἀπόλλων',
    '??teµ??': 'Ἄρτεμις',
    '????': 'Ἄρης',
    '?f??d?t?': 'Ἀφροδίτη',
    '?fa?st??': 'Ἥφαιστος',
    '??µ??': 'Ἑρμῆς',
    '?????s??': 'Διόνυσος',
    '??d??': 'Ἅιδης',
    '?????': 'Ἀθήνᾶ',
}

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    if 'temple-base.css' in text or 'PUNYCODEX Base Temple' in text:
        return False
    
    original = text
    
    # Replace inside specific HTML elements that contain Greek names
    for old, new in GREEK_REPLACEMENTS.items():
        # Match inside span/p elements with greek-related classes or styles
        patterns = [
            rf'(<[^>]*greek[^>]*>)\s*{re.escape(old)}\s*(</[^>]*>)',
            rf'(<[^>]*italic[^>]*>)\s*{re.escape(old)}\s*(</[^>]*>)',
            rf'(<[^>]*olympian[^>]*>)\s*{re.escape(old)}\s*(</[^>]*>)',
        ]
        for pat in patterns:
            text = re.sub(pat, rf'\1{new}\2', text)
    
    if text != original:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        return True
    return False

temple_dir = 'sites'
fixed_count = 0

for name in sorted(os.listdir(temple_dir)):
    path = os.path.join(temple_dir, name, 'index.html')
    if not os.path.exists(path):
        continue
    if fix_file(path):
        print(f'Fixed related gods: {name}')
        fixed_count += 1

print(f'\nFixed {fixed_count} flagship pages.')

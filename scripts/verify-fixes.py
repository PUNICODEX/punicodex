from pathlib import Path

for site in ['ab', 'akh', 'maa', 'muspellheimr']:
    f = Path(f'sites/{site}/index.html')
    content = f.read_bytes()
    text = content.decode('utf-8', errors='replace')
    
    print(f'=== {site} ===')
    
    # Check for correct bytes
    checks = [
        (b'\xe2\xb2\x89', 'Coptic eie (U+2C89)'),
        (b'\xe2\xb2\x83', 'Coptic vida (U+2C83)'),
        (b'\xe2\xb2\x8f', 'Coptic hori (U+2C8F)'),
        (b'\xe2\xb2\x98', 'Coptic MI (U+2C98)'),
        (b'\xe2\xb2\x88', 'Coptic EIE (U+2C88)'),
        (b'\xe1\xb9\xa3', 's with dot below (U+1E63)'),
        (b'\xe1\xb8\xa4', 'H with dot below (U+1E24)'),
        (b'\xe1\xb8\x8e', 'D with line below (U+1E0E)'),
        (b'\xe1\xb8\xa5', 'h with dot below (U+1E25)'),
        (b'\xc5\xab', 'u with macron (U+016B)'),
        (b'\xc7\xab', 'o with ogonek (U+01EB)'),
    ]
    
    for pat, name in checks:
        if pat in content:
            print(f'  OK: {name}')
    
    if 'PUNYCODEX' in text:
        print('  OK: PUNYCODEX')
    
    # Check for remaining corruption
    corrupt_patterns = [
        b'\xc3\xa2\xc2\xb2', b'\xc3\xa1\xc2\xb8', b'\xc3\xa1\xc2\xb9',
        b'\xc3\x85\xc2\xab', b'\xc3\x87\xc2\xab', b'\xc3\x84\xc2\x93',
        b'\xc3\x9a',
    ]
    corrupt = 0
    for pat in corrupt_patterns:
        corrupt += content.count(pat)
    if corrupt > 0:
        print(f'  WARNING: {corrupt} remaining corruption patterns')
    else:
        print('  OK: No remaining corruption patterns')
    print()

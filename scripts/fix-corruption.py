#!/usr/bin/env python3
"""Fix Windows-1252 corrupted bytes in HTML files across the project.

Many files were saved with Windows-1252 encoding but declared as UTF-8.
This script fixes the corrupted bytes by:
1. Scanning byte-by-byte and detecting valid UTF-8 sequences
2. Replacing invalid bytes with their Windows-1252 equivalents
3. Writing back as proper UTF-8
"""

import os
import sys

# Windows-1252 to Unicode mapping
WIN1252 = {
    0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A', 0x83: '\u0192',
    0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021',
    0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039',
    0x8C: '\u0152', 0x8D: '\u008D', 0x8E: '\u017D', 0x8F: '\u008F',
    0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
    0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
    0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A',
    0x9C: '\u0153', 0x9D: '\u009D', 0x9E: '\u017E', 0x9F: '\u0178',
    # Latin-1 supplement (0xA0-0xFF) — same in Windows-1252
    0xA0: '\u00A0', 0xA1: '\u00A1', 0xA2: '\u00A2', 0xA3: '\u00A3',
    0xA4: '\u00A4', 0xA5: '\u00A5', 0xA6: '\u00A6', 0xA7: '\u00A7',
    0xA8: '\u00A8', 0xA9: '\u00A9', 0xAA: '\u00AA', 0xAB: '\u00AB',
    0xAC: '\u00AC', 0xAD: '\u00AD', 0xAE: '\u00AE', 0xAF: '\u00AF',
    0xB0: '\u00B0', 0xB1: '\u00B1', 0xB2: '\u00B2', 0xB3: '\u00B3',
    0xB4: '\u00B4', 0xB5: '\u00B5', 0xB6: '\u00B6', 0xB7: '\u00B7',
    0xB8: '\u00B8', 0xB9: '\u00B9', 0xBA: '\u00BA', 0xBB: '\u00BB',
    0xBC: '\u00BC', 0xBD: '\u00BD', 0xBE: '\u00BE', 0xBF: '\u00BF',
    0xC0: '\u00C0', 0xC1: '\u00C1', 0xC2: '\u00C2', 0xC3: '\u00C3',
    0xC4: '\u00C4', 0xC5: '\u00C5', 0xC6: '\u00C6', 0xC7: '\u00C7',
    0xC8: '\u00C8', 0xC9: '\u00C9', 0xCA: '\u00CA', 0xCB: '\u00CB',
    0xCC: '\u00CC', 0xCD: '\u00CD', 0xCE: '\u00CE', 0xCF: '\u00CF',
    0xD0: '\u00D0', 0xD1: '\u00D1', 0xD2: '\u00D2', 0xD3: '\u00D3',
    0xD4: '\u00D4', 0xD5: '\u00D5', 0xD6: '\u00D6', 0xD7: '\u00D7',
    0xD8: '\u00D8', 0xD9: '\u00D9', 0xDA: '\u00DA', 0xDB: '\u00DB',
    0xDC: '\u00DC', 0xDD: '\u00DD', 0xDE: '\u00DE', 0xDF: '\u00DF',
    0xE0: '\u00E0', 0xE1: '\u00E1', 0xE2: '\u00E2', 0xE3: '\u00E3',
    0xE4: '\u00E4', 0xE5: '\u00E5', 0xE6: '\u00E6', 0xE7: '\u00E7',
    0xE8: '\u00E8', 0xE9: '\u00E9', 0xEA: '\u00EA', 0xEB: '\u00EB',
    0xEC: '\u00EC', 0xED: '\u00ED', 0xEE: '\u00EE', 0xEF: '\u00EF',
    0xF0: '\u00F0', 0xF1: '\u00F1', 0xF2: '\u00F2', 0xF3: '\u00F3',
    0xF4: '\u00F4', 0xF5: '\u00F5', 0xF6: '\u00F6', 0xF7: '\u00F7',
    0xF8: '\u00F8', 0xF9: '\u00F9', 0xFA: '\u00FA', 0xFB: '\u00FB',
    0xFC: '\u00FC', 0xFD: '\u00FD', 0xFE: '\u00FE', 0xFF: '\u00FF',
}

def decode_mixed(raw):
    """Decode a mix of ASCII, valid UTF-8, and Windows-1252 bytes."""
    result = []
    i = 0
    n = len(raw)
    
    while i < n:
        b = raw[i]
        
        # ASCII: pass through
        if b < 0x80:
            result.append(chr(b))
            i += 1
            continue
        
        # Try to decode a valid UTF-8 sequence
        # Determine expected sequence length from first byte
        if 0xC2 <= b <= 0xDF:
            expected_len = 2
        elif 0xE0 <= b <= 0xEF:
            expected_len = 3
        elif 0xF0 <= b <= 0xF4:
            expected_len = 4
        else:
            # 0x80-0xBF, 0xC0-0xC1, 0xF5-0xFF: never valid UTF-8 start bytes
            result.append(WIN1252.get(b, chr(b)))
            i += 1
            continue
        
        # Check if we have enough bytes and all are valid continuation bytes
        if i + expected_len > n:
            # Not enough bytes for a complete sequence
            result.append(WIN1252.get(b, chr(b)))
            i += 1
            continue
        
        valid = True
        for j in range(1, expected_len):
            if not (0x80 <= raw[i + j] <= 0xBF):
                valid = False
                break
        
        if valid:
            try:
                ch = raw[i:i + expected_len].decode('utf-8')
                result.append(ch)
                i += expected_len
                continue
            except UnicodeDecodeError:
                pass
        
        # Invalid UTF-8 sequence: treat first byte as Windows-1252
        result.append(WIN1252.get(b, chr(b)))
        i += 1
    
    return ''.join(result)

def fix_file(path, dry_run=True):
    with open(path, 'rb') as f:
        raw = f.read()
    
    # Handle UTF-16 BOM
    if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
        encoding = 'utf-16-le' if raw.startswith(b'\xff\xfe') else 'utf-16-be'
        text = raw.decode(encoding)
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        if not dry_run:
            with open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(text)
        return 'utf16'
    
    # Check for any bytes >= 0x80
    has_high = any(b >= 0x80 for b in raw)
    if not has_high:
        return None
    
    fixed_text = decode_mixed(raw)
    fixed_text = fixed_text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Check if anything changed
    try:
        original_text = raw.decode('utf-8', errors='replace')
    except Exception:
        original_text = raw.decode('latin-1')
    
    if fixed_text == original_text.replace('\r\n', '\n').replace('\r', '\n'):
        return None
    
    if not dry_run:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(fixed_text)
    
    return 'fixed'

def main():
    dry_run = '--apply' not in sys.argv
    mode = 'APPLY' if not dry_run else 'DRY RUN'
    
    corrupted = []
    total = 0
    
    for root, dirs, files in os.walk('.'):
        skip_dirs = {'node_modules', '.git', '.vercel', 'android', 'platform'}
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for name in files:
            if not name.endswith('.html'):
                continue
            path = os.path.join(root, name)
            result = fix_file(path, dry_run=dry_run)
            if result:
                corrupted.append((path, result))
            total += 1
    
    print(f"Mode: {mode}")
    print(f"Scanned {total} HTML files")
    print(f"Found {len(corrupted)} files needing fix\n")
    
    for path, reason in sorted(corrupted)[:50]:
        print(f"  [{reason}] {path}")
    
    if len(corrupted) > 50:
        print(f"  ... and {len(corrupted) - 50} more")
    
    if dry_run and corrupted:
        print(f"\nRun with --apply to fix {len(corrupted)} files.")

if __name__ == '__main__':
    main()

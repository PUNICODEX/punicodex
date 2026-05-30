from pathlib import Path
from collections import Counter

for site in ['akh', 'maa']:
    f = Path(f'sites/{site}/index.html')
    content = f.read_bytes()
    patterns = Counter()
    for prefix in [b'\xc3\xa1\xc2\xb8', b'\xc3\xa1\xc2\xb9']:
        idx = 0
        while True:
            idx = content.find(prefix, idx)
            if idx == -1:
                break
            # Get up to 8 bytes after the 4-byte prefix
            tail = content[idx+4:idx+12]
            patterns[(prefix + tail[:2]).hex()] += 1
            # Also check if it's a longer pattern
            if len(tail) >= 4 and tail[2] == 0xc3:
                patterns[(prefix + tail[:4]).hex()] += 1
            idx += 1
    
    print(f'=== {site} ===')
    for pat, count in patterns.most_common():
        print(f'  {pat}: {count} times')

import re
from pathlib import Path

ids = ['zeus', 'prometheus', 'poseidon', 'atlas']
for id in ids:
    css = Path(f'sites/{id}/styles.css').read_text(encoding='utf-8')
    print(f'\n=== {id} ===')
    # Find all nowrap occurrences
    for i, line in enumerate(css.split("\n"), 1):
        if 'nowrap' in line.lower():
            print(f'  nowrap {i}: {line.strip()}')
    # Find width rules that might cause overflow
    for m in re.finditer(r'width:\s*(\d+px|\d+%|[\d.]+rem)', css):
        start = max(0, m.start() - 200)
        snippet = css[start:m.end()+50]
        lines = snippet.split('\n')
        selector = ''
        for l in reversed(lines[:10]):
            if '{' in l:
                selector = l.strip()
                break
        print(f'  width {css[:m.start()].count(chr(10))+1}: {selector} {m.group(0)}')

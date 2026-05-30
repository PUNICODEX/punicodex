import re
from pathlib import Path

ids = ['zeus', 'prometheus', 'poseidon', 'atlas']
patterns = ['nowrap', 'overflow', 'white-space', 'min-width', 'width:', 'grid-template']

for id in ids:
    path = Path(f'sites/{id}/index.html')
    content = path.read_text(encoding='utf-8')
    print(f'\n=== {id} ===')
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        if any(p in line.lower() for p in patterns):
            stripped = line.strip()
            if len(stripped) > 120:
                stripped = stripped[:120] + '...'
            print(f'  {i}: {stripped}')

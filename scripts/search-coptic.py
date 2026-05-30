from pathlib import Path
import re

results = []
for f in Path('.').rglob('*'):
    if f.is_file() and f.stat().st_size < 1000000:
        try:
            text = f.read_text(encoding='utf-8')
        except:
            continue
        if 'Coptic' in text:
            for entry in ['ab', 'maa']:
                idx = text.find(entry)
                if idx >= 0:
                    ctx = text[max(0,idx-100):idx+200]
                    coptic = re.findall(r'[\u2C80-\u2CFF]+', ctx)
                    if coptic:
                        results.append(f'{f}: near {entry}: {coptic}')

with open('scripts/coptic-search-results.txt', 'w', encoding='utf-8') as out:
    for r in results:
        out.write(r + '\n')

print(f'Found {len(results)} matches, written to scripts/coptic-search-results.txt')

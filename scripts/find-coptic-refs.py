from pathlib import Path
import re

lexicon = Path('type/js/lexicon.js')
if lexicon.exists():
    content = lexicon.read_text(encoding='utf-8')
    for entry in ['ab', 'maa']:
        idx = content.find("id: '" + entry + "'")
        if idx >= 0:
            snippet = content[idx:idx+800]
            # Find Coptic characters (U+2C80-U+2CFF)
            coptic = re.findall(r'[\u2C80-\u2CFF]+', snippet)
            print(f'{entry}: Coptic found: {coptic}')
            # Also find the line with copticScript
            for line in snippet.split('\n'):
                if 'copticScript' in line or 'Coptic' in line:
                    print(f'  {line.strip()}')
            print()

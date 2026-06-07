#!/usr/bin/env python3
"""Fix corrupted Greek names in flagship temple pages."""

import json
import os
import re
import subprocess

# Load lexicon using Node.js (since it's a JS file)
result = subprocess.run(
    ['node', '-e', '''
const { LEXICON } = require("./type/js/lexicon.js");
const data = {};
for (const e of LEXICON) {
    data[e.id] = { greek: e.greek || "", unicode: e.unicode || "" };
}
console.log(JSON.stringify(data));
'''],
    capture_output=True, text=True, encoding='utf-8'
)
entries = json.loads(result.stdout) if result.returncode == 0 else {}

temple_dir = 'sites'
fixed_count = 0

for name in sorted(os.listdir(temple_dir)):
    path = os.path.join(temple_dir, name, 'index.html')
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Skip base temples
    if 'temple-base.css' in text or 'PUNYCODEX Base Temple' in text:
        continue
    
    entry = entries.get(name)
    if not entry:
        continue
    
    correct_greek = entry['greek']
    if not correct_greek:
        continue
    
    # Extract corrupted Greek from title
    m = re.search(r'<title>(.*?)\s*—', text)
    if not m:
        continue
    
    corrupted_greek = m.group(1).strip()
    if '?' not in corrupted_greek and corrupted_greek == correct_greek:
        continue  # Already correct
    
    original_text = text
    text = text.replace(corrupted_greek, correct_greek)
    
    if text != original_text:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print(f'Fixed {name}')
        fixed_count += 1

print(f'\nFixed {fixed_count} flagship pages.')

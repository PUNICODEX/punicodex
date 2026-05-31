import re, sys
sys.stdout.reconfigure(encoding='utf-8')
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    content = f.read()
pattern = r'id:\s*"([^"]+)",.*?domainUnicode:\s*"([^"]+)"'
for m in re.finditer(pattern, content, re.DOTALL):
    print(f'{m.group(1)} -> {m.group(2)}')

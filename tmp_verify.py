import re, sys
sys.stdout.reconfigure(encoding='utf-8')
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    c = f.read()

print("=== DOMAIN UNICODE ===")
for m in re.finditer(r'id:\s*"([^"]+)",.*?domainUnicode:\s*"([^"]+)"', c, re.DOTALL):
    print(f'{m.group(1)} -> {m.group(2)}')

print("\n=== DOMAIN ALT ===")
for m in re.finditer(r'id:\s*"([^"]+)",.*?domainAlt:\s*(\[[^\]]*\])', c, re.DOTALL):
    print(f'{m.group(1)} -> {m.group(2)}')

print("\n=== CHECK FOR ASCII IN domainAlt ===")
for m in re.finditer(r'id:\s*"([^"]+)",.*?domainAlt:\s*(\[[^\]]*\])', c, re.DOTALL):
    alt = m.group(2)
    if 'com' in alt and not any(x in alt for x in ['ā','ē','ī','ō','ô','ú','á','í','ó','ð','þ','ǫ','ꜥ','ꜣ','ḫ','š','Ś','Î','Ô']):
        print(f'WARNING: {m.group(1)} has potentially ASCII domainAlt: {alt}')

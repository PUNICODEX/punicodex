import re, json

with open('mobile/shared/unicode-dir.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Try to find the array
m = re.search(r'const\s+UNICODE_DIR\s*=\s*(\[.*?\]);', text, re.DOTALL)
if m:
    try:
        data = eval(m.group(1))
        cats = {}
        for entry in data:
            cat = entry.get('category', 'unknown')
            cats[cat] = cats.get(cat, 0) + 1
        print('Categories in unicode-dir.js:')
        for c, count in sorted(cats.items()):
            print(f'  {c}: {count}')
    except Exception as e:
        print(f'Error parsing: {e}')
else:
    print('Could not find UNICODE_DIR array')
    # Try regex on raw text
    cats = set(re.findall(r'"category"\s*:\s*"([^"]+)"', text))
    if not cats:
        cats = set(re.findall(r"'category'\s*:\s*'([^']+)'", text))
    if not cats:
        cats = set(re.findall(r'category\s*:\s*"([^"]+)"', text))
    print('Regex fallback categories:')
    for c in sorted(cats):
        print(f'  {c}')

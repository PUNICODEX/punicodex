import sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

html_refs = []
for root, dirs, files in os.walk('sites'):
    for f in files:
        if f == 'index.html':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read()
            matches = re.findall(r'src="([^"]+\.png)"', content)
            if matches:
                html_refs.append((path, matches))

print(f'Temple HTML files with PNG refs: {len(html_refs)}')
for path, matches in html_refs[:15]:
    print(f'  {path}: {matches}')

# Check archetypes
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    arc = f.read()
arc_matches = re.findall(r'("[^"]*_mascot[^"]*\.png"|"[^"]*_logomark[^"]*\.png"|"[^"]*_logolockup[^"]*\.png")', arc)
print(f'\nArchetype PNG refs: {len(arc_matches)}')
for m in arc_matches[:10]:
    print(f'  {m}')

# Check main JS files
for jsfile in ['js/home.js', 'js/pantheon.js', 'js/tiers.js']:
    if os.path.exists(jsfile):
        with open(jsfile, 'r', encoding='utf-8') as f:
            content = f.read()
        matches = re.findall(r'[^"]*\.png', content)
        if matches:
            print(f'\n{jsfile} PNG refs: {len(matches)}')
            for m in matches[:5]:
                print(f'  {m}')

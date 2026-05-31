import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

HTML_UPDATED = []

# Update temple HTML files
for root, dirs, files in os.walk('sites'):
    if 'index.html' not in files:
        continue
    path = os.path.join(root, 'index.html')
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    def replacer(m):
        full = m.group(0)
        src = m.group(1)
        if not src.endswith('.png'):
            return full
        webp_src = src[:-4] + '.webp'
        webp_path = os.path.join(root, webp_src)
        if not os.path.exists(webp_path):
            return full
        return f'<picture><source srcset="{webp_src}" type="image/webp">{full}</picture>'
    
    new_content = re.sub(r'<img\s+src="([^"]+\.png)"([^>]*)>', replacer, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        HTML_UPDATED.append(path)

print(f'HTML files updated: {len(HTML_UPDATED)}')

# Update archetype data
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    arc = f.read()
arc_new = re.sub(r'("[^"]*_mascot[^"]*)\.png"', r'\1.webp"', arc)
arc_new = re.sub(r'("[^"]*_logomark[^"]*)\.png"', r'\1.webp"', arc_new)
arc_new = re.sub(r'("[^"]*_logolockup[^"]*)\.png"', r'\1.webp"', arc_new)
if arc_new != arc:
    with open('js/archetypes-v2.js', 'w', encoding='utf-8') as f:
        f.write(arc_new)
    print('Archetypes updated')
else:
    print('Archetypes: no changes')

# Update main JS files
for jsfile in ['js/home.js', 'js/pantheon.js', 'js/tiers.js']:
    if not os.path.exists(jsfile):
        continue
    with open(jsfile, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(r'("[^"]*_mascot[^"]*)\.png"', r'\1.webp"', content)
    new_content = re.sub(r'("[^"]*_logomark[^"]*)\.png"', r'\1.webp"', new_content)
    new_content = re.sub(r'("[^"]*_logolockup[^"]*)\.png"', r'\1.webp"', new_content)
    if new_content != content:
        with open(jsfile, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated: {jsfile}')
    else:
        print(f'No changes: {jsfile}')

# Check CSS
print('\nCSS files with PNG refs:')
for root, dirs, files in os.walk('css'):
    for f in files:
        if not f.endswith('.css'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        if '.png' in content:
            matches = re.findall(r'url\([^)]*\.png[^)]*\)', content)
            if matches:
                print(f'  {path}: {matches}')

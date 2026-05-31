import os
import re
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

CONVERTED = []
FAILED = []
HTML_UPDATED = []

# ── 1. Convert all PNGs in sites/*/assets/ to WebP ──
print("═══ Converting PNG assets to WebP ═══\n")
for root, dirs, files in os.walk('sites'):
    if not root.endswith('/assets') and not root.endswith('\\assets'):
        continue
    for f in files:
        if not f.lower().endswith('.png'):
            continue
        png_path = os.path.join(root, f)
        webp_path = png_path[:-4] + '.webp'
        try:
            img = Image.open(png_path)
            # Preserve transparency if present
            if img.mode in ('RGBA', 'P'):
                img.save(webp_path, 'WEBP', quality=95, method=6)
            else:
                img.save(webp_path, 'WEBP', quality=95, method=6)
            png_size = os.path.getsize(png_path) / 1024
            webp_size = os.path.getsize(webp_path) / 1024
            CONVERTED.append((f, png_size, webp_size))
        except Exception as e:
            FAILED.append((png_path, str(e)))

print(f"Converted: {len(CONVERTED)}")
print(f"Failed: {len(FAILED)}")
if CONVERTED:
    total_png = sum(x[1] for x in CONVERTED)
    total_webp = sum(x[2] for x in CONVERTED)
    print(f"Total PNG: {total_png/1024:.1f} MB -> WebP: {total_webp/1024:.1f} MB ({(1-total_webp/total_png)*100:.1f}% smaller)\n")
if FAILED:
    for path, err in FAILED[:5]:
        print(f"  FAIL: {path} -> {err}")

# ── 2. Update temple HTML files ──
print("\n═══ Updating temple HTML files ═══\n")

def replace_img_with_picture(html):
    # Pattern: <img src="assets/NAME.png" ...>
    # Replace with: <picture><source srcset="assets/NAME.webp" type="image/webp"><img src="assets/NAME.png" ...></picture>
    def replacer(m):
        full = m.group(0)
        src = m.group(1)
        if not src.endswith('.png'):
            return full
        webp_src = src[:-4] + '.webp'
        # Only replace if the webp file exists
        return f'<picture><source srcset="{webp_src}" type="image/webp">{full}</picture>'
    
    # Match <img src="...png" ...>
    new_html = re.sub(r'<img\s+src="([^"]+\.png)"([^>]*)>', replacer, html)
    return new_html

for root, dirs, files in os.walk('sites'):
    if 'index.html' not in files:
        continue
    path = os.path.join(root, 'index.html')
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    new_content = replace_img_with_picture(content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        HTML_UPDATED.append(path)

print(f"HTML files updated: {len(HTML_UPDATED)}")

# ── 3. Update archetype data ──
print("\n═══ Updating archetype data ═══\n")
with open('js/archetypes-v2.js', 'r', encoding='utf-8') as f:
    arc = f.read()

# Replace .png with .webp in path strings
arc_new = re.sub(r'("[^"]*_mascot[^"]*)\.png"', r'\1.webp"', arc)
arc_new = re.sub(r'("[^"]*_logomark[^"]*)\.png"', r'\1.webp"', arc_new)
arc_new = re.sub(r'("[^"]*_logolockup[^"]*)\.png"', r'\1.webp"', arc_new)

if arc_new != arc:
    with open('js/archetypes-v2.js', 'w', encoding='utf-8') as f:
        f.write(arc_new)
    print("Archetypes updated")
else:
    print("No archetype changes needed")

# ── 4. Update main JS files ──
print("\n═══ Updating main JS files ═══\n")
for jsfile in ['js/home.js', 'js/pantheon.js', 'js/tiers.js', 'js/main.js']:
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
        print(f"  Updated: {jsfile}")
    else:
        print(f"  No changes: {jsfile}")

# ── 5. Check CSS files ──
print("\n═══ Checking CSS files ═══\n")
css_changes = []
for root, dirs, files in os.walk('css'):
    for f in files:
        if not f.endswith('.css'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        if '.png' in content:
            print(f"  PNG refs in: {path}")

print("\n═══ DONE ═══")

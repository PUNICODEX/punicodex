import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITES_DIR = ROOT / 'sites'

def find_pngs_without_webp():
    targets = []
    for path in SITES_DIR.rglob('*.png'):
        if '.backup' in path.parts:
            continue
        webp = path.with_suffix('.webp')
        if not webp.exists():
            targets.append(path)
    return targets

def main():
    targets = find_pngs_without_webp()
    print(f'Converting {len(targets)} PNG files without WebP counterparts...')
    converted = 0
    for png in targets:
        webp = png.with_suffix('.webp')
        try:
            before = png.stat().st_size
            img = Image.open(png)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGBA')
            else:
                img = img.convert('RGB')
            img.save(webp, 'WEBP', quality=85, method=4)
            after = webp.stat().st_size
            converted += 1
            print(f'✓ {webp.relative_to(ROOT)} ({before/1024/1024:.2f}MB → {after/1024/1024:.2f}MB)')
        except Exception as e:
            print(f'✗ {png.relative_to(ROOT)}: {e}', file=sys.stderr)
    print(f'Converted {converted}/{len(targets)} files.')

if __name__ == '__main__':
    main()

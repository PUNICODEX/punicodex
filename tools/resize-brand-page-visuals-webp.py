#!/usr/bin/env python3
"""
One-off companion to tools/resize-brand-page-visuals.js: mint WebP siblings
(quality 85, method=6 — identical to scripts/convert-images-to-webp.py) for
the freshly resized assets/brand/13-page-visuals PNGs, plus the small set of
already-copied brand PNGs that the body-content wave references through
<picture> blocks (tier badges, official seal, empty portrait).

Prints one line per file: "<webp KB> <relative path>".
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WEBP_QUALITY = 85

TARGET_DIRS = [ROOT / "assets" / "brand" / "13-page-visuals"]
TARGET_FILES = [
    ROOT / "assets" / "brand" / "03-ornaments" / "punicodex-empty-portrait.png",
    ROOT / "assets" / "brand" / "04-badges" / "punicodex-badge-tier-1.png",
    ROOT / "assets" / "brand" / "04-badges" / "punicodex-badge-tier-2.png",
    ROOT / "assets" / "brand" / "04-badges" / "punicodex-badge-dual-tier.png",
    ROOT / "assets" / "brand" / "08-seals-stamps" / "punicodex-official-seal.png",
]


def to_webp(src: Path) -> None:
    dst = src.with_suffix(".webp")
    with Image.open(src) as im:
        im = im.convert("RGBA") if im.mode in ("RGBA", "P") else im.convert("RGB")
        im.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"  {dst.stat().st_size // 1024} KB webp  {dst.relative_to(ROOT)}")


def main() -> None:
    for d in TARGET_DIRS:
        for src in sorted(d.rglob("*.png")):
            to_webp(src)
    for src in TARGET_FILES:
        if src.exists():
            to_webp(src)


if __name__ == "__main__":
    main()

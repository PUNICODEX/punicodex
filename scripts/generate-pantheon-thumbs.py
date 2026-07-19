#!/usr/bin/env python3
"""
PuniCodex — Generate small pantheon card thumbnails.

Reads js/archetypes-v2.js, finds each archetype's mascot/logomark source image,
and writes a 160 px (fit-within) WebP thumbnail to
assets/images/mascots/thumbs/small/{id}_thumb.webp.

Run: python scripts/generate-pantheon-thumbs.py
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as e:
    print(json.dumps({"error": f"Pillow not available: {e}"}), file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILE = ROOT / "js" / "archetypes-v2.js"
OUTPUT_DIR = ROOT / "assets" / "images" / "mascots" / "thumbs" / "small"
MAX_SIZE = 320
WEBP_QUALITY = 85


def parse_archetypes(path):
    """Extract id and mascotPath fields from archetypes-v2.js."""
    text = path.read_text(encoding="utf-8")
    # Each archetype object starts with { and ends with }; split roughly.
    entries = []
    # Regex for id and mascotPath inside object blocks.
    for block in re.split(r"(?=\{\s*\n\s*id:\s*['\"])", text):
        id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", block)
        path_match = re.search(r"mascotPath:\s*['\"]([^'\"]+)['\"]", block)
        if id_match and path_match:
            entries.append({
                "id": id_match.group(1),
                "mascotPath": path_match.group(1),
            })
    return entries


def find_source_image(preferred_path):
    """Resolve a source image, preferring the .webp sibling if it exists."""
    preferred = ROOT / preferred_path.lstrip("/")
    if preferred.exists() and preferred.stat().st_size > 0:
        return preferred

    # Try .webp version of .png source.
    if preferred.suffix.lower() == ".png":
        webp = preferred.with_suffix(".webp")
        if webp.exists() and webp.stat().st_size > 0:
            return webp

    # Try the base id asset patterns: mascot then logomark.
    id_dir = preferred.parent
    base = preferred.stem.split("_")[0]
    for kind in ("mascot", "logomark"):
        for ext in (".webp", ".png"):
            candidate = id_dir / f"{base}_{kind}{ext}"
            if candidate.exists() and candidate.stat().st_size > 0:
                return candidate
    return None


def generate_thumb(entry):
    src = find_source_image(entry["mascotPath"])
    if not src:
        return None, "no source image found"

    dst = OUTPUT_DIR / f"{entry['id']}_thumb.webp"

    # Skip if up-to-date.
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return str(dst.relative_to(ROOT)), "up-to-date"

    try:
        with Image.open(src) as im:
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")

            # Square cover-crop at MAX_SIZE, matching the cards'
            # `object-fit: cover; object-position: center 12%` so the
            # circle shows the same framing as the home-page portraits.
            w, h = im.size
            scale = MAX_SIZE / min(w, h)
            im = im.resize(
                (max(MAX_SIZE, round(w * scale)), max(MAX_SIZE, round(h * scale))),
                Image.LANCZOS,
            )
            w2, h2 = im.size
            left = (w2 - MAX_SIZE) // 2
            top = int((h2 - MAX_SIZE) * 0.12)
            im = im.crop((left, top, left + MAX_SIZE, top + MAX_SIZE))

            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        return str(dst.relative_to(ROOT)), "generated"
    except Exception as e:
        return None, str(e)


def main():
    if not SOURCE_FILE.exists():
        print(json.dumps({"error": f"Source file not found: {SOURCE_FILE}"}), file=sys.stderr)
        sys.exit(1)

    entries = parse_archetypes(SOURCE_FILE)
    generated = []
    skipped = []
    errors = []

    for entry in entries:
        path, status = generate_thumb(entry)
        if status == "generated":
            generated.append({"id": entry["id"], "thumb": path.replace("\\", "/")})
        elif status == "up-to-date":
            skipped.append({"id": entry["id"], "thumb": path.replace("\\", "/")})
        else:
            errors.append({"id": entry["id"], "reason": status})

    print(
        json.dumps(
            {
                "total": len(entries),
                "generated": len(generated),
                "up_to_date": len(skipped),
                "errors": len(errors),
                "error_details": errors[:20],
                "output_dir": str(OUTPUT_DIR.relative_to(ROOT)).replace("\\", "/"),
            },
            indent=2,
        )
    )

    if errors:
        sys.exit(2)


if __name__ == "__main__":
    main()

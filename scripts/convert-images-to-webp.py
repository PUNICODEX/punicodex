#!/usr/bin/env python3
"""
PuniCodex — WebP image conversion helper.

Converts raster images to WebP (quality 85) while preserving originals as
fallbacks. Also renders the OG default SVG to PNG/WebP.

This script is spawned by scripts/convert-images-to-webp.js. It prints JSON
metadata about converted files to stdout.
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    print(json.dumps({"error": f"Pillow not available: {e}"}), file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
WEBP_QUALITY = 85


def draw_letter_spaced_text(draw, pos, text, font, fill, spacing):
    """Draw text with custom letter spacing; Pillow lacks native support."""
    x, y = pos
    total_width = sum(draw.textlength(ch, font=font) for ch in text)
    total_width += spacing * max(0, len(text) - 1)
    start_x = x - total_width / 2
    cursor = start_x
    for ch in text:
        draw.text((cursor, y), ch, fill=fill, font=font, anchor="lm")
        cursor += draw.textlength(ch, font=font) + spacing


def render_og_default():
    """Render assets/images/og-default.svg to PNG + WebP."""
    svg_path = ROOT / "assets" / "images" / "og-default.svg"
    png_path = ROOT / "assets" / "images" / "og-default.png"
    webp_path = ROOT / "assets" / "images" / "og-default.webp"

    if not svg_path.exists():
        return []

    if (
        png_path.exists()
        and webp_path.exists()
        and png_path.stat().st_mtime >= svg_path.stat().st_mtime
        and webp_path.stat().st_mtime >= svg_path.stat().st_mtime
    ):
        return []

    width, height = 1200, 630
    img = Image.new("RGB", (width, height), "#0A0A0A")
    draw = ImageDraw.Draw(img)

    # Gradient background (#0A0A0A -> #1A1200)
    pixels = img.load()
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(10 + (26 - 10) * t)
        g = int(10 + (18 - 10) * t)
        b = int(10 + 0 * t)
        for x in range(width):
            pixels[x, y] = (r, g, b)

    # Radial glow approximation (gold, 15% -> 0% opacity)
    import math

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    cx, cy = width // 2, int(height * 0.4)
    max_r = int(min(width, height) * 0.5)
    glow_pixels = glow.load()
    for y in range(height):
        for x in range(width):
            d = math.hypot(x - cx, y - cy)
            if d < max_r:
                alpha = int(38 * (1 - d / max_r))  # 0.15 * 255 ≈ 38
                glow_pixels[x, y] = (212, 175, 55, alpha)
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    def load_font(size):
        candidates = [
            "C:/Windows/Fonts/georgia.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        for c in candidates:
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                continue
        return ImageFont.load_default()

    font_title = load_font(120)
    font_subtitle = load_font(28)
    font_meta = load_font(16)

    draw_letter_spaced_text(
        draw, (600, 260), "PuniCodex", font_title, "#D4AF37", 8
    )
    draw_letter_spaced_text(
        draw, (600, 340), "THE UNICODE PANTHEON", font_subtitle, "#A0A0A0", 12
    )
    draw.line([(500, 390), (700, 390)], fill="#D4AF37", width=1)
    draw_letter_spaced_text(
        draw,
        (600, 430),
        "26 DOMAINS · 24 ARCHETYPES · ONE MISSION",
        font_meta,
        "#666666",
        2,
    )

    png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(png_path, "PNG")
    img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
    return [str(png_path.relative_to(ROOT)), str(webp_path.relative_to(ROOT))]


def convert_image(src: Path):
    """Convert a single raster image to WebP if missing or stale."""
    ext = src.suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg"):
        return None

    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return None

    try:
        with Image.open(src) as im:
            # Preserve transparency for PNG
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        return str(dst.relative_to(ROOT))
    except Exception as e:
        print(
            json.dumps({"error": f"Failed to convert {src}: {e}"}),
            file=sys.stderr,
        )
        return None


def scan_and_convert():
    converted = []

    # Public mascot PNGs
    mascot_dir = ROOT / "assets" / "images" / "mascots"
    if mascot_dir.exists():
        for src in sorted(mascot_dir.glob("*.png")):
            if "thumb" in src.name:
                continue
            result = convert_image(src)
            if result:
                converted.append(result)

    # Site assets (logolockup, logomark, mascot)
    sites_dir = ROOT / "sites"
    if sites_dir.exists():
        for ext in ("*.png", "*.jpg", "*.jpeg"):
            for src in sorted(sites_dir.glob(f"*/assets/{ext}")):
                # Merch composites are print-only masters (never referenced in
                # HTML) — multi-GB canvases that must not be re-encoded here.
                if "_comp-" in src.name:
                    continue
                result = convert_image(src)
                if result:
                    converted.append(result)

    # Root page referenced images
    for ext in ("*.png", "*.jpg", "*.jpeg"):
        for src in sorted((ROOT / "assets" / "images").glob(ext)):
            result = convert_image(src)
            if result:
                converted.append(result)

    # Brand kit assets (page visuals, ornaments, badges, seals) — plan §7.1
    brand_dir = ROOT / "assets" / "brand"
    if brand_dir.exists():
        for ext in ("*.png", "*.jpg", "*.jpeg"):
            for src in sorted(brand_dir.rglob(ext)):
                result = convert_image(src)
                if result:
                    converted.append(result)

    # OG default SVG -> PNG/WebP
    converted.extend(render_og_default())

    return converted


def main():
    converted = scan_and_convert()
    # Normalize Windows paths to forward slashes for JSON consumers.
    converted = [c.replace("\\", "/") for c in converted]
    print(json.dumps({"converted": converted, "count": len(converted)}))


if __name__ == "__main__":
    main()

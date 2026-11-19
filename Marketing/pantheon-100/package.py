#!/usr/bin/env python3
"""Build contact sheets (3 x 100 thumbnails), manifest.csv, and index.html."""
import csv
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, 'cards')
MPL = os.path.join(os.path.dirname(__import__('matplotlib').__file__),
                   'mpl-data', 'fonts', 'ttf')

with open(os.path.join(HERE, 'data.json'), encoding='utf-8') as fh:
    entries = json.load(fh)

TYPES = [('1-patronage', 'PATRONAGE'), ('2-lore', 'LORE & MYTH'), ('3-pattern', 'MODERN PATTERN')]

# ---- manifest.csv
with open(os.path.join(HERE, 'manifest.csv'), 'w', newline='', encoding='utf-8') as fh:
    wcsv = csv.writer(fh)
    wcsv.writerow(['id', 'name', 'pantheon', 'tier', 'domain_unicode', 'domain_punycode',
                   'temple_url', 'card_patronage', 'card_lore', 'card_pattern'])
    for e in entries:
        wcsv.writerow([
            e['id'], e['name'], e['pantheon'], e['tier'],
            e.get('domainUnicode') or '', e.get('domainPunycode') or '',
            e['url'],
            f"cards/{e['id']}-1-patronage.png",
            f"cards/{e['id']}-2-lore.png",
            f"cards/{e['id']}-3-pattern.png",
        ])

# ---- contact sheets: one per card type, 10x10 grid
f_lab = ImageFont.truetype(os.path.join(MPL, 'DejaVuSans-Bold.ttf'), 60)
tw, th = 216, 270
pad = 8
cols, rows = 10, 10
for suffix, label in TYPES:
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad) + pad + 90),
                      (13, 11, 18))
    d = ImageDraw.Draw(sheet)
    d.text((pad + 10, 18), f'PUNICODEX · PANTHEON 100 — {label} (100 cards)',
           font=f_lab, fill=(240, 234, 220))
    for i, e in enumerate(entries):
        p = os.path.join(CARDS, f"{e['id']}-{suffix}.png")
        im = Image.open(p).convert('RGB')
        im.thumbnail((tw, th), Image.LANCZOS)
        x = pad + (i % cols) * (tw + pad)
        y = 90 + pad + (i // cols) * (th + pad)
        sheet.paste(im, (x, y))
    out = os.path.join(HERE, f'contact-sheet-{suffix}.png')
    sheet.save(out, 'PNG', optimize=True)
    print('wrote', out)

# ---- index.html gallery
rows_html = []
for e in entries:
    rows_html.append(f"""<section class="temple" id="{e['id']}">
  <h2><a href="https://punicodex.com/{e['id']}">{e['name']}</a>
    <span class="meta">{e['pantheon']} · tier {e['tier']}{' · ' + e['domainUnicode'] if e.get('domainUnicode') else ''}</span></h2>
  <div class="cards">
    <figure><img loading="lazy" src="cards/{e['id']}-1-patronage.png" alt="{e['name']} patronage card"><figcaption>Patronage</figcaption></figure>
    <figure><img loading="lazy" src="cards/{e['id']}-2-lore.png" alt="{e['name']} lore card"><figcaption>Lore &amp; Myth</figcaption></figure>
    <figure><img loading="lazy" src="cards/{e['id']}-3-pattern.png" alt="{e['name']} pattern card"><figcaption>Modern Pattern</figcaption></figure>
  </div>
</section>""")

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PuniCodex — Pantheon 100 · Marketing Materials</title>
<style>
  body {{ background:#0d0b12; color:#f0eadc; font-family:Georgia,'Times New Roman',serif; margin:0; padding:40px 24px; }}
  h1 {{ text-align:center; letter-spacing:.35em; font-size:22px; font-weight:normal; }}
  p.sub {{ text-align:center; color:#a8a094; margin-bottom:48px; }}
  .temple {{ max-width:1200px; margin:0 auto 56px; }}
  .temple h2 {{ font-size:26px; margin:0 0 12px; border-bottom:1px solid #2a2532; padding-bottom:8px; }}
  .temple h2 a {{ color:#f0eadc; text-decoration:none; }}
  .temple .meta {{ font-size:14px; color:#a8a094; letter-spacing:.1em; margin-left:12px; }}
  .cards {{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }}
  figure {{ margin:0; }}
  img {{ width:100%; border-radius:8px; display:block; }}
  figcaption {{ text-align:center; color:#a8a094; font-size:13px; letter-spacing:.2em; text-transform:uppercase; margin-top:8px; }}
  .toc {{ max-width:1200px; margin:0 auto 48px; columns:4; font-size:14px; }}
  .toc a {{ color:#c9a44a; text-decoration:none; }}
</style></head><body>
<h1>PUNICODEX · PANTHEON 100</h1>
<p class="sub">300 marketing materials — patronage, lore &amp; myth, modern pattern — generated from canonical lexicon, lore catalog and industry seats.</p>
<nav class="toc">{''.join(f'<div><a href="#{e["id"]}">{e["name"]}</a></div>' for e in entries)}</nav>
{''.join(rows_html)}
</body></html>"""
with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write(html)
print('wrote index.html and manifest.csv')

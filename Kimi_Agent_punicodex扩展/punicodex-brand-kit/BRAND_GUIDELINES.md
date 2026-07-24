# PuniCodex — Brand Guidelines

**Version 1.0 · 2026 · The Unicode Pantheon**

---

## 1. Brand idea

PuniCodex restores the original Unicode names of myth — the macrons, accents, eths and
thorns that ASCII erased. The brand behaves like a temple archive: dark stone, gold leaf,
inscriptional type, and scholarly restraint. Nothing playful, nothing neon, nothing
rounded-and-friendly. Enterprise antiquity.

**Voice principles:** reverent, precise, scholarly. Short declaratives. Latin-grave
confidence. (Existing copy — "The gods have returned. Their names are restored." — is
already on-brand; keep it.)

---

## 2. The logo system

### 2.1 Wordmark
`PUNICODEX` set in **Cinzel** (Trajan-class inscriptional caps), tracked +0.16em,
filled with the gold metal gradient. Primary asset:
`01-logos/punicodex-wordmark-gold.png`.

Variants and when to use them:

| Variant | Use |
|---|---|
| `wordmark-gold` | Default, on obsidian/dark |
| `wordmark-gold-solid` | Small sizes (<140px wide), embroidery-style contexts |
| `wordmark-ivory` | Over imagery or busy gold backgrounds |
| `wordmark-obsidian` | On light/ivory surfaces (print, docs) |
| `wordmark-camel-gold` | Editorial contexts ("PuniCodex Type" product naming) |

### 2.2 The emblem — "The Restored Column"
Column + floating mark + double ring. Meaning:
- **Fluted column** → the temples, structure, permanence.
- **Floating diamond** → the restored diacritic; the mark above the letter.
- **Double ring** → the pantheon medallion, the seal of the archive.

Use `emblem-gold` for hero and ceremonial placements, `emblem-glyph-gold` (ringless)
below ~48px, `punicodex-emblem.svg` anywhere vector is supported.

### 2.3 Lockups
- **Stacked** (`lockup-stacked-gold`): footer, OG derivatives, title pages.
- **Horizontal** (`lockup-horizontal-gold`): header, email signatures, document headers.

### 2.4 Clearspace & minimum sizes
- Clearspace = height of the floating diamond on all sides (≈ 8% of emblem width).
- Wordmark minimum: 120px digital / 30mm print.
- Emblem minimum: 32px digital (use ringless glyph below 48px).
- Never stretch, recolor outside the approved variants, add effects, or set the
  wordmark in any other typeface. Never place gold gradient on gold backgrounds.

---

## 3. Colour

| Token | Hex | Role |
|---|---|---|
| Obsidian | `#0A0A0C` | Page background |
| Temple Black | `#121216` | Cards, panels |
| Temple Raise | `#1A1A20` | Hover/raised surfaces |
| Pantheon Gold | `#D4AF37` | Primary accent, kickers, rules |
| Gold Highlight | `#F5E3A8` | Gradient top, glows |
| Gold Mid | `#C9A23F` | Gradient middle |
| Deep Temple Gold | `#8C6A22` | Gradient base, deep strokes |
| Ivory Inscription | `#F4EFE4` | Primary text |
| Ash | `#9A968C` | Secondary text |
| Ash Dim | `#6B685F` | Captions, meta |

**Gold metal gradient:** `linear-gradient(180deg, #F5E3A8 0%, #C9A23F 45%, #8C6A22 100%)` —
used on wordmark fills, CTAs, seals, and ornament art. Ratio discipline: obsidian covers
~85% of any view; gold is precious — cap it near 8%; ivory text fills the rest.

---

## 4. Typography

| Role | Face | Treatment |
|---|---|---|
| Display / wordmark | Cinzel 400–700 | ALL CAPS, +0.16em tracking |
| Kickers | Cormorant Garamond 500 | ALL CAPS, +0.42em tracking, gold |
| Editorial headings | Cormorant Garamond 500–600 | Title case, ivory or gold |
| Body / UI | Inter 400–600 | Sentence case, ivory/ash |
| Numerals / seals | Cinzel 600 | Roman numerals preferred |

Fonts bundled in `07-fonts/` under the SIL Open Font License (OFL.txt included).

---

## 5. Ornament system

- **Greek key frieze** — borders for hero bases, footer tops, section breaks. Tile horizontally only.
- **Diamond divider** — between major sections; centered; never more than one per viewport.
- **Laurel wreath** — achievement/collaboration contexts (Scholars, Patrons, university sponsorship).
- **Medallion frame** — overlays deity portraits; ring studs at cardinal points.
- **Empty portrait** — stand-in art for temples awaiting portraits; keep the dim gold glyph.
- **Gold glow + dust** — atmosphere layers for heroes only, never on content pages.

---

## 6. Tier seals

`TIER I`, `TIER II`, `DUAL-TIER` medallion seals for the Tier System page, appraisal
certificates, and authenticity badges. Always gold-on-obsidian; never recolor per tier —
the metal is the rank.

---

## 7. Iconography & imagery rules

- Logos contain **ASCII only**. Unicode glyphs live in *content* (deity names,
  transliterations), never in brand marks.
- Portraits: circular medallion crop, gold ring, obsidian background.
- No drop shadows on logos. No outlines. No gradients other than the approved gold metal.

---

## 8. File discipline

Serve from `/assets/brand/…`. Reference `06-code/punicodex-tokens.css` and
`tokens.json` rather than hard-coding values. Snippets for favicons, OG tags,
header/footer swaps, and empty states are in `06-code/integration-snippets.html`.

---

## 9. Addendum v1.1 — seals, motion & print

- **Official seal** (`08-seals-stamps/`) — reserved for certificates, the
  Authenticity page, appraisal documents and sponsorship papers. Never decorate
  page chrome with it; its scarcity is its authority.
- **Awaiting Restoration stamp** — may be rotated (±8°) and overlaid on unbuilt
  temple cards at 60–90% opacity.
- **Tessellation** (`09-patterns/`) — backgrounds only, at shipped opacity. Never
  under body text smaller than 14px without raising obsidian overlay above it.
- **Loader & motion** (`10-motion/`) — the loader shows once per session
  (gate with sessionStorage if you want it rarer). All motion ships with
  `prefers-reduced-motion` fallbacks; do not remove them.
- **Certificates** (`11-print/`) — A4 landscape, 300dpi, fill the gold rules
  digitally (Cormorant) or by hand. Seal sits bottom-center by design.
- **Business card / letterhead** — 300dpi print-ready. Dark stock + gold foil is
  the intended physical finish; ask the printer for "foil stamp, satin gold."

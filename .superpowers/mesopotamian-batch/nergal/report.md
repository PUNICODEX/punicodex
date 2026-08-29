# Nergal flagship source material — completion report

## Files produced

| File | Purpose |
|------|---------|
| `lore.json` | Full lore-catalog object for `nergal` (pronunciation, domains, symbols, mythology, syncretism, legacy, sources, archaeology). |
| `effect.js` | Bespoke hero canvas module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`. |
| `effect-registry.json` | Single-entry registry patch for `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | 4 industry assignments drawn from existing `INDUSTRY_GROUPS`. |
| `report.md` | This summary. |

## Lore highlights

- **Pronunciation note** explains the Tier-2 classification: the restored form `Nergal` contains no distinctive diacritic or non-ASCII letter; it is a transparent transliteration of the cuneiform name.
- **Domains** frame Nergal as lord of Kutha, with four cards: the Lion, the Plague-Arrow, the Underworld Throne, and the Epic of Erra.
- **Mythology** covers:
  1. *Nergal and Ereshkigal* (Standard Babylonian descent and shared kingship of the dead)
  2. *The Epic of Erra* (plague/war unleashed and restrained by Ishum)
  3. *Enlil and Ninlil* (his birth at the underworld gate)
  4. The cult of the Lion of Kutha.
- Sources cite ETCSL, CAD, AHw, Black & Green, Dalley, Foster, and the primary texts.

## Canvas effect

`effect.js` renders an underworld furnace: a dark radial glow, drifting embers, slow smoke, faint floating cuneiform glyphs, and a pair of pulsing lion eyes. It respects `prefers-reduced-motion` by drawing a single static frame. The module is UMD-wrapped so it can be used as `module.exports` in Node/build tools or as `window.nergalEffect` in the browser.

## Industry assignments

- `defense` — weight 2 (primary)
- `funerary-memorial` — weight 2 (primary)
- `healthcare-pharma` — weight 1
- `disaster-resilience` — weight 1

All names are taken from `type/js/industry-patterns.js` `INDUSTRY_GROUPS`.

## Caveats

- This is a **domainless** promotion; the ASCII `.com` is unregistrable, so no owned-domain claim appears in the lore.
- The cuneiform forms in the pronunciation kin are scholarly conventions; the reading of `dGÌR.UNUG.GAL` follows standard Assyriological practice.
- The canvas effect assumes a `<canvas>` element is passed to `init()`; the parent agent must wire the canvas ID through `templates/flagship/effects/effects.json`.

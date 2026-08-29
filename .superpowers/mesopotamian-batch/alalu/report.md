# Alalu Flagship Source Material — Batch Report

## Files Produced

All files are isolated under `.superpowers/mesopotamian-batch/alalu/` and are intended for parent-agent merge into the canonical flagship pipeline.

| File | Purpose |
|------|---------|
| `lore.json` | Lore-catalog object for `alalu`: pronunciation, domains, symbols, mythology, syncretism, cultural legacy, sources, archaeology. |
| `effect.js` | Bespoke hero-canvas module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`. |
| `effect-registry.json` | Single-object registry patch for `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | Array of 4 industry assignments for `type/js/industry-patterns.js`. |

## Lexicon Facts

- **id:** `alalu`
- **ascii:** `alalu`
- **unicode:** `Alalu`
- **pantheon:** `hittite` (the user's prompt calls it Mesopotamian, but the canonical source lists Hittite)
- **tier:** `2` (Tier 2)
- **domain:** "Primordial King, Heaven"
- **meaning:** "Unknown"

## Lore Content Summary

The `lore.json` entry treats Alalu as the first king of heaven in Hittite/Hurrian mythology, drawing on the *Kingship in Heaven* myth (CTH 344).

- **Pronunciation:** Conservative `/ˈa.la.lu/` with a Tier-2 note explaining that the restoration preserves no distinctive diacritic and that the original Hittite/Hurrian pronunciation is unknown.
- **Domains:** Four cards — The Nine-Year Reign, The Servant Who Succeeded, The Dark Earth Below, The Storm-God's Ancestry — each with a 64×64-style SVG `iconPath`.
- **Mythology:** Four myths covering the first reign, Anu's overthrow, Alalu's descent, and the succession line Alalu → Anu → Kumarbi → Teššub.
- **Sources:** CTH 344, CHD, Hoffner's *Hittite Myths*, Haas's *Geschichte der hethitischen Religion*, and the relevant KUB tablets.
- **Archaeology:** Notes the Hattusa/Boğazköy provenance of the Hittite tablets.

## Visual Effect Summary

`effect.js` implements a **Celestial Throne** canvas:

- Dark indigo/purple ambient gradient.
- Rising golden motes with `lighter` compositing.
- Drifting cuneiform-style glyph symbols (using Unicode cuneiform block characters).
- A faint, pulsing throne silhouette in the lower-center.
- A central pole-star radiance with diffraction cross.
- Respects `prefers-reduced-motion`.
- Exports: `init(canvas)`, `resize()`, `draw()`, `destroy()`, and `metadata` with `name`, `description`, and `primaryColors`.

The export shape follows the user's explicit module-style request rather than the older IIFE-only pattern found in `templates/flagship/effects/`.

## Industry Assignments

| Industry | Weight | Rationale |
|----------|--------|-----------|
| `leadership` | 2 | Primordial kingship and succession. |
| `history-archives` | 2 | Survival of the myth only in Hittite cuneiform tablets. |
| `mythic-restoration` | 2 | Obscure figure whose story is recovered by scholarship. |
| `education` | 1 | Comparative religion / ancient Near East curriculum. |

All industry names exist in `type/js/industry-patterns.js` `INDUSTRY_GROUPS`.

## Caveats for Parent Agent

1. **Pantheon mismatch:** The user calls Alalu "Mesopotamian," but the canonical lexicon assigns it to the `hittite` pantheon. The `lore.json` content is written from the Hittite/Hurrian perspective; do not overwrite the lexicon pantheon without review.
2. **Domainless flagship:** No owned domain is claimed. The lore text does not assert domain ownership.
3. **Effect integration:** The module expects a canvas with id `alalu-throne-canvas` by default, or accepts one passed to `init()`. The parent agent should add the corresponding entry to `templates/flagship/effects/effects.json` using `effect-registry.json` and ensure the temple template includes a matching `<canvas>` element.
4. **Tier 2 only:** The pronunciation note explicitly states that Alalu is Tier 2 because the restoration lacks distinctive diacritics or non-ASCII letters.
5. **JSON validity:** `lore.json` is a single object value (no outer wrapper keyed by `alalu`); the parent agent should merge it as `scripts/lore-catalog.json["alalu"] = <contents>`.

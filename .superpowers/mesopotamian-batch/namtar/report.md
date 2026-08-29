# Namtar Flagship Source Material — Report

## Files Produced

| File | Purpose |
|------|---------|
| `lore.json` | Canonical lore-catalog entry for `namtar` (pronunciation, domains, symbols, mythology, sources, syncretism, cultural legacy, archaeology). |
| `effect.js` | CommonJS hero-canvas module exporting `init`, `resize`, `draw`, `destroy`, and a `metadata` object. Theme: underworld dust, falling cuneiform wedges, drifting tablet fragments, and sickly green decreelight pulses. |
| `effect-registry.json` | Single-object registry patch for `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | Five industry assignments (two weight-2 primaries: funerary-memorial and healthcare-pharma; three weight-1: cybersecurity, insurance, occult-esoteric). |

## Lore Summary

- **Pronunciation**: Reconstructed `/namˈtar/` with a Tier-2 note explaining that the plain transliteration preserves no distinctive diacritic or non-ASCII letter.
- **Domains**: Emphasizes Namtar's role as Ereškigal's vizier, the etymology *nam* + *tar* ('cut destiny'), the Tablet of Destinies, the Hand of Namtar (plague), and the Cut Thread.
- **Mythology**: Four myths covering (1) the etymology of the name, (2) the embassy in *Nergal and Ereškigal*, (3) the sixty diseases in the *Descent of Ištar*, and (4) the 'hand of Namtar' in incantations and medical omens.
- **Sources**: ETCSL, CAD, AHw, Black & Green, Jacobsen, Foster, Dalley, and specific compositions (*Nergal and Ereškigal*, *Descent of Ištar*, *Lament for Ur*, SA.GIG / udug-hul incantations).

## Effect Design

- **Visual identity**: Charcoal/umber background with a faint underworld glow from below, drifting dust, falling cuneiform wedges, tablet fragments with stylized line markings, and occasional radial pulses in sickly green.
- **Respects accessibility**: Detects `prefers-reduced-motion` and renders a static background when active.
- **Integration**: `init` accepts a canvas element, an element ID string, or a container element; `destroy` cleans up listeners and animation frames.

## Industry Fit

Assignments were chosen from existing `INDUSTRY_GROUPS` slugs in `type/js/industry-patterns.js`:

- `funerary-memorial` (2) — end-of-life services and memorial platforms.
- `healthcare-pharma` (2) — disease tracking, therapeutics, clinical risk.
- `cybersecurity` (1) — threat/incident metaphors.
- `insurance` (1) — actuarial fate and risk underwriting.
- `occult-esoteric` (1) — underworld/esoteric publishing.

## Caveats / Notes for Parent Agent

1. **Domainless promotion**: No domain claim is made in the lore. The `archetypes-v2.js` promotion step will need to omit a `domain` or flag it as unowned; this batch only supplies the narrative/effect/industry material.
2. **Effect registry patch**: `effect-registry.json` contains only the `namtar` key. The parent agent should merge it into `templates/flagship/effects/effects.json` (adding `"namtar": { "canvasId": "namtar-canvas" }`) rather than replacing the file.
3. **Industry patch**: `industry-patterns.json` is a standalone array to be merged into the `entries` array of the relevant industry groups in `type/js/industry-patterns.js`.
4. **Lore patch**: `lore.json` is the object value only; it should be inserted into `scripts/lore-catalog.json` as `"namtar": { ... }`.
5. **Gallery not included**: This batch did not produce `gallery-data.json` entries. The flywheel completeness gate will require either curated gallery images or an `_honestZero` exemption — the parent agent should handle that separately.
6. **Effect file name**: The registry references `namtar.js`; the parent agent may rename the provided `effect.js` to `namtar.js` when copying it into `templates/flagship/effects/`.

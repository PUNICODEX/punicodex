# Marduk Flagship Source Material — Report

Isolated directory: `.superpowers/mesopotamian-batch/marduk/`

## Files produced

1. `lore.json` — canonical lore-catalog object for `marduk` (no outer wrapper).
2. `effect.js` — bespoke hero canvas effect module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`.
3. `effect-registry.json` — single-object registry entry for `templates/flagship/effects/effects.json`.
4. `industry-patterns.json` — 4 industry assignments (2× weight-2, 2× weight-1).
5. `report.md` — this file.

## Lexicon facts used

- `id`: marduk
- `unicode`: Marduk
- `ascii`: marduk
- `tier`: 2 (Tier 2 / plain ASCII-canonical)
- `domain`: Creation, Babylon, Storms
- `meaning`: Solar calf (Akkadian Marduk)
- `pantheon`: mesopotamian

## Lore content

The `lore.json` object follows the established schema (`pronunciation`, `domains`, `symbols`, `mythology`, `syncretism`, `culturalLegacy`, `extendedMeditation`, `sources`) and uses the same HTML-wrapped paragraph style as other Mesopotamian entries (e.g., `enlil`, `ishtar`).

Key scholarly choices:
- Pronunciation is given as a conventional Akkadian reading `/marˈduk/` rather than a speculative reconstruction; the note explicitly explains the Tier 2 classification (plain Latin form, no preserved diacritic or distinctive letter).
- The name's etymology is treated as the logographic compound 𒀭𒀫𒌓 (<em>dAMAR.UTU</em>), "calf of the sun," consistent with CAD/AHw treatments.
- Mythology centers on the <em>Enuma Elish</em>, the Fifty Names, the Code of Hammurabi prologue, and the <em>Erra Epic</em> — all primary or near-primary sources.
- Syncretism notes Marduk's absorption of Enlil, Ea/Enki, and Šamaš functions, as well as the Hellenistic Zeus Belos identification and the later Bel and the dragon tradition.
- Cultural legacy ties Marduk to the Ishtar Gate, Etemenanki, and the Tower of Babel narrative.

## Visual effect

`effect.js` renders a Babylonian-themed canvas (`marduk-hero-canvas`):
- Deep lapis-blue radial background with a silhouetted ziggurat/temple horizon.
- Central winged solar disc with pulsing halo and downward royal beam.
- Four rotating wind streams (Marduk's winds from the Enuma Elish).
- Drifting cuneiform-wedge sparks.
- Occasional lightning flashes.
- Subtle pointer parallax on non-touch devices.
- Respects `prefers-reduced-motion`.

The module uses a UMD-style wrapper so it can be loaded as a browser script (`window.mardukEffect`) or required as CommonJS (`module.exports`).

## Industry patterns

All industries are existing entries in `type/js/industry-patterns.js`:
- `leadership` (weight 2)
- `legal-justice` (weight 2)
- `architecture-design` (weight 1)
- `defense` (weight 1)

## Caveats / follow-up for parent agent

- No domain ownership claim is made in the lore; this is a domainless flagship promotion per instructions.
- `effect-registry.json` should be merged into `templates/flagship/effects/effects.json` as `"marduk": { "canvasId": "marduk-hero-canvas" }`.
- `industry-patterns.json` should be merged into the relevant industry groups in `type/js/industry-patterns.js` by adding `{ id: 'marduk', weight: N, why: '...' }` entries.
- `lore.json` should be merged into `scripts/lore-catalog.json` under the `"marduk"` key.
- `effect.js` should be copied to `templates/flagship/effects/marduk.js` (no file currently exists there despite the directory listing showing it in some contexts).
- Gallery images and `rentalTier` assignment are out of scope for this batch and remain for the parent agent / `promote-to-flagship.js` workflow.
- The Tier 2 note in the pronunciation section was written to match the lexicon's `tier: "2"`; if the parent agent later assigns a reconstructed macron form (e.g., Mardūk), the note must be updated.

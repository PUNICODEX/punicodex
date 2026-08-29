# Kingu Flagship Source Material — Batch Report

Generated canonical source snippets for the PuniCodex entry `kingu` (Mesopotamian pantheon). All files are isolated in `.superpowers/mesopotamian-batch/kingu/` for the parent agent to merge into the shared canonical files.

## Files Produced

| File | Purpose | Merge Target |
|------|---------|--------------|
| `lore.json` | Lore catalog object value for `kingu` | `scripts/lore-catalog.json` under the `"kingu"` key |
| `effect.js` | Bespoke hero canvas module | `templates/flagship/effects/kingu.js` |
| `effect-registry.json` | Effect registry entry | `templates/flagship/effects/effects.json` (append `"kingu": { "canvasId": "kingu-canvas" }`) |
| `industry-patterns.json` | 4 industry assignments | `type/js/industry-patterns.js` (add `kingu` entries to the relevant `INDUSTRY_GROUPS`) |
| `report.md` | This summary | None |

## Lore Notes

- **Tier 2 justification** is explicit in the pronunciation note: `Kingu` is the plain ASCII/canonical capitalized form with no preserved diacritic or distinctive letter. The entry avoids inventing reconstructed vowel length.
- **Etymology** is honestly marked as unknown, following Black-Green.
- **Primary sources** cited: Enuma Elish (Tablets I–VI), CAD, Dalley, Foster, Black-Green.
- **Mythology** covers elevation, the Tablet of Destinies, Marduk's defeat, and the creation of humankind from Kingu's blood — the four narrative beats of the Enuma Elish account.
- **Domain cards** use 64×64-style SVG path strings themed around dragon, tablet, blood, and monster host.

## Effect Notes

- Export shape: `{ init, resize, draw, destroy, metadata }`.
- `metadata.name`, `metadata.description`, and `metadata.primaryColors` are provided.
- Visual theme: crimson nebula, coiling dragon silhouette of glowing vertebrae, pulsing golden Tablet of Destinies, falling blood droplets that ignite into tiny human-shaped stars.
- Respects `prefers-reduced-motion` with a static fallback.
- Auto-initializes on `document.getElementById('kingu-canvas')` if present, but can be driven manually via `init(canvasElement)`.

## Industry Assignments

- **cybersecurity** (weight 2): primary fit — organized threats, stolen authority (Tablet of Destinies), monster host.
- **biotech-longevity** (weight 1): humans created from Kingu's blood.
- **defense** (weight 1): strategic command of Tiamat's army.
- **gaming-entertainment** (weight 1): dragon-general boss archetype.

## Caveats

- No owned domain is claimed; this is a **domainless flagship promotion**. The temple should display `Kingu` as the canonical form without a domain ownership section.
- The effect registry snippet provided here is the richer `name/description/file/tags` object requested in the task. The parent agent may need to map this to the existing `templates/flagship/effects/effects.json` schema (`{ "canvasId": "kingu-canvas" }`) when merging.
- Gallery images are **not** included in this batch. The parent agent will still need to curate ≥2 gallery images (or an `_honestZero` exemption) and ensure the flagship completeness gate passes.
- Pronunciation is reconstructed from standard Akkadian values; the name's actual historical phonology is uncertain.

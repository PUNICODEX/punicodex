# Pazuzu flagship source batch report

## Files produced

All files live in `.superpowers/mesopotamian-batch/pazuzu/` and are intended to be merged by the parent agent into the canonical flagship pipeline.

| File | Purpose |
|------|---------|
| `lore.json` | Lore-catalog object for `pazuzu`: pronunciation, domains, symbols, mythology, syncretism, cultural legacy, sources, archaeology. |
| `effect.js` | Bespoke hero canvas module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`. |
| `effect-registry.json` | Single-entry registry for merging into `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | 4 industry assignments (1 weight-2 primary, 3 weight-1 resonant). |
| `report.md` | This summary. |

## Lore highlights

- **Tier handling**: The pronunciation note explicitly states that `Pazuzu` is Tier 2 because the Unicode restoration is plain ASCII letters and preserves no distinctive diacritic or non-ASCII letter.
- **Scholarly basis**: Lore draws on the Akkadian amulet formula "I am Pazuzu, son of Ḫanbi, king of the evil wind-demons," the Lamashtu apotropaic corpus, and the Louvre bronze head (AO 19931).
- **Mythology**: 4 sections — royal self-presentation, apotropaic warding, iconography/archaeology, and the southwest-wind legacy.
- **Sources**: Black & Green; Wiggermann's RlA entry; Louvre AO 19931; Akkadian Lamashtu incantations; Utukkū Lemnūtu series.

## Effect design

`effect.js` renders a dry, demon-wind scene:
- Southwest-wind dust motes drift from the lower-left across the canvas.
- A faint horned sigil (Pazuzu's leonine/demonic mask) hovers at the centre.
- Occasional bronze-amulet glints appear around the sigil.
- Respects `prefers-reduced-motion` and page-visibility pausing.

## Industry patterns

- `wind-energy` (weight 2) — primary, literal domain match.
- `cybersecurity`, `disaster-resilience`, `occult-esoteric` (weight 1 each) — secondary resonances.

## Caveats / merge notes

- This is a **domainless promotion**: no owned domain is claimed. The parent agent should not add a domain set for `pazuzu` in `js/archetypes-v2.js` or `platform/db/owned-domains.json`.
- `effect-registry.json` uses `file: "pazuzu.js"`; the parent agent should align the `canvasId` in the merged effects registry with the canvas element rendered by `create-flagship.js` (convention: `"pazuzu-canvas"`).
- The effect module is CommonJS (`module.exports`) to match the project's build tooling.
- No shared canonical files were edited.

## Validation performed

- `lore.json` parses as valid JSON.
- `effect.js` passes `node --check`.
- `effect-registry.json` and `industry-patterns.json` parse as valid JSON.

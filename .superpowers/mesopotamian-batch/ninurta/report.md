# Ninurta Flagship Source Batch

Isolated directory: `.superpowers/mesopotamian-batch/ninurta/`

## Files Produced

| File | Purpose |
|------|---------|
| `lore.json` | Lore-catalog object value for `ninurta` (no outer wrapper). |
| `effect.js` | Bespoke hero canvas module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`. |
| `effect-registry.json` | Single-entry registry snippet for merging into `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | 4 industry assignments for merging into `type/js/industry-patterns.js`. |

## Lore Summary

- **Pronunciation**: Sumerian/Akkadian reconstruction `/niˈnur.ta/` with a Tier-2 note explaining that the Unicode restoration preserves only the capitalized ASCII form and no distinctive diacritic/letter.
- **Domains**: War, Agriculture, Storms — framed around the mace Sharur, the plough, the Anzû slaying, and the ordered stones of *Lugal-e*.
- **Symbols**: Mace Sharur, thunderbolt/storm-wind, plough/furrow, mountain/stone, lion/bird-griffin.
- **Mythology**: 4 myths drawn from primary sources — the *Anzû Epic*, *Lugal-e*, *Angimdimma*, and the Ninurta/Ningirsu syncretism with Gudea Cylinder references.
- **Scholarly sources**: ETCSL, CAD, AHw, Black & Green, Jacobsen, and specific cuneiform texts.

## Effect Summary

`ninurta.js` renders:
- A bronze octagonal mace at the visual center, surrounded by slow storm radiance.
- A four-armed cyclone drawn behind the mace.
- Stones from the defeated Kur drifting outward and settling into plough furrows at the bottom of the viewport.
- Fine dust/spark motes for atmosphere.

The module is UMD-wrapped and exposes:

```js
{
  metadata: { name, description, primaryColors },
  init(elementOrSelector),
  resize(),
  draw(),
  destroy()
}
```

It respects `prefers-reduced-motion: reduce` and cleans up its RAF and resize listener on `destroy`.

## Industry Assignments

- `agriculture-food` — weight 2
- `defense` — weight 2
- `storm-forecasting` — weight 1
- `manufacturing-craft` — weight 1

All use existing industry keys from `type/js/industry-patterns.js`.

## Caveats

- This is a **domainless flagship promotion**. No domain is claimed in any file; the temple displays the canonical ASCII form `Ninurta` as a Tier-2 entry.
- The `lore.json` contains **only** the object value for `ninurta`; the parent agent must merge it as the value of the `"ninurta"` key in `scripts/lore-catalog.json`.
- The `effect-registry.json` entry must be merged into `templates/flagship/effects/effects.json` under the `ninurta` key.
- The `industry-patterns.json` array must be appended to the existing `entries` arrays for the four named industries in `type/js/industry-patterns.js`.
- No shared canonical files were edited.

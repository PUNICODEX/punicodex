# Lahmu flagship source material — completion report

## Files produced

| File | Purpose |
|------|---------|
| `lore.json` | Lore-catalog object value for `lahmu` (no outer wrapper), ready to merge into `scripts/lore-catalog.json`. |
| `effect.js` | Bespoke hero canvas effect module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`. |
| `effect-registry.json` | Single-object registry entry for `lahmu` to merge into `templates/flagship/effects/effects.json`. |
| `industry-patterns.json` | Array of 4 industry assignments to merge into `type/js/industry-patterns.js`. |

## Lore content summary

- **Pronunciation**: Reconstructed Akkadian `/ˈlax.mu/`; explains that the central consonant is the voiceless velar fricative written ḫ in scholarly transliteration. The Tier-2 note states that the canonical registrable form `Lahmu` is plain ASCII and therefore preserves no distinctive diacritic or non-Latin letter.
- **Domains**: Title "LAHMU — The Hairy Guardian"; four cards covering primordial firstborn, gate guardian, the hairy form, and the paired cult with Lahamu. Each card has a 64×64-style SVG `iconPath`.
- **Symbols**: Hairy body/beard, doorpost/gate, curled locks, Apsû-Tiāmat parentage.
- **Mythology**: Four myths — cosmogonic firstborn in *Enuma Elish* I:1–10, apotropaic doorkeeper role, six-curled iconography, and the Lahmu/Lahamu pair.
- **Sources**: *Enuma Elish*, Black & Green, CAD, Wiggermann, Jacobsen, Foster, George.
- **Syncretism / cultural legacy / archaeology**: Draws connections to cherubim/lamassu/gargoyle gatekeeper traditions and notes Neo-Assyrian gateway evidence (Khorsabad, Nineveh).

## Effect summary

`effect.js` renders:
- A warm, silt-toned radial background.
- Swaying, hair-like bezier strands that evoke Lahmu's shaggy form.
- A faint golden gate silhouette (two posts + lintel) pulsing at the threshold.
- Drifting dust/silt motes.
- Pointer-driven wind shift on non-touch devices.
- Reduced-motion and visibility-change handling.

Export shape:
```js
module.exports = { init, resize, draw, destroy, metadata };
```

## Industry patterns

| Industry | Weight | Rationale |
|----------|--------|-----------|
| `defense` | 2 | Threshold guardian archetype. |
| `architecture-design` | 1 | Doorway/gate as sacred architectural unit. |
| `history-archives` | 1 | Reconstruction from cuneiform and archaeology. |
| `manufacturing-craft` | 1 | Clay figurines and glazed reliefs as apotropaic craft. |

## Caveats / merge notes

- This is a **domainless promotion**: the ASCII `.com` is unregistrable, so no owned-domain claim is made and the temple displays the plain canonical form `Lahmu`.
- No shared canonical files were edited. The parent agent must merge:
  - `lore.json` into `scripts/lore-catalog.json` under key `"lahmu"`.
  - `effect-registry.json` into `templates/flagship/effects/effects.json`.
  - `industry-patterns.json` entries into the `INDUSTRY_GROUPS` arrays in `type/js/industry-patterns.js`.
  - `effect.js` into `templates/flagship/effects/lahmu.js`.
- The effect module does not register itself; the generator/loader is expected to call `init(canvasOrId)` and `destroy()`.
- All JSON files have been syntax-checked with `node`.

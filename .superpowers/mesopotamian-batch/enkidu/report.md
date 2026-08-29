# Enkidu Flagship Source Material — Production Report

**Entry ID:** `enkidu`  
**Pantheon:** Mesopotamian  
**Unicode form:** `Enkidu` (Tier 2, ASCII-only plain form)  
**Promotion type:** Domainless flagship (ASCII `.com` unregistrable)  
**Work directory:** `.superpowers/mesopotamian-batch/enkidu/`

## Files Produced

| File | Purpose | Size |
|------|---------|------|
| `lore.json` | Object value to merge under `scripts/lore-catalog.json["enkidu"]` | ~12 KB |
| `effect.js` | Bespoke hero canvas module (`init`, `resize`, `draw`, `destroy`, `metadata`) | ~10.5 KB |
| `effect-registry.json` | Snippet to merge into `templates/flagship/effects/effects.json` | ~300 B |
| `industry-patterns.json` | Array of 5 industry assignments to merge into `type/js/industry-patterns.js` | ~1.2 KB |
| `report.md` | This summary | — |

## Lore Content (`lore.json`)

- **Pronunciation:** Sumerian/Akkadian reconstruction `/ˈen.ki.du/` with a Tier-2 note explaining that the plain Latin form is used because cuneiform gives no registrable distinctive diacritic/letter.
- **Domains:** Four cards (Wild Man, Friend and Brother, Guardian of the Cedar Forest, Mortality's Witness) with custom SVG `iconPath` strings.
- **Symbols:** Six symbols tied to canonical motifs (clay body, animal pelts, watering hole, cedar door, bull's thigh, dust and silence).
- **Mythology:** Six myths covering creation by Aruru, Shamhat's civilizing seduction, the wrestling match, the Cedar Forest/Humbaba, the Bull of Heaven, and the death dream — all wrapped in `<p class='myth-text'>`.
- **Sources:** Real citations only: Standard Babylonian Epic of Gilgamesh (Tablets I–VIII), ETCSL, CAD, Black & Green, George's critical edition, Foster, Jacobsen, Tigay, and the relevant Sumerian poems.
- **Caveat:** The traditional etymology "lord of the pleasant place" is presented but flagged as disputed, matching current Assyriological caution.

## Canvas Effect (`effect.js`)

- **Module shape:** CommonJS export with `init(canvas)`, `resize()`, `draw(timestamp)`, `destroy()`, and `metadata`.
- **Theme:** "Wild Man at the Watering Hole" — a night-steppe scene with:
  - Star field
  - Reflective watering hole
  - Swaying reeds
  - Running gazelle silhouettes
  - Rising clay/dust motes
  - A faint twin-pulse bond evoking Gilgamesh
- **Accessibility:** Honors `prefers-reduced-motion` by rendering one static frame and not scheduling further animation.
- **Robustness:** No-op if canvas/context missing; cancels `requestAnimationFrame` on destroy.

## Effect Registry (`effect-registry.json`)

Single merge object:

```json
{
  "enkidu": {
    "name": "Wild Man at the Watering Hole",
    "description": "...",
    "file": "enkidu.js",
    "tags": ["mesopotamian", "wilderness", "friendship", "clay", "watering-hole", "gazelle", "epic"]
  }
}
```

## Industry Patterns (`industry-patterns.json`)

Five assignments using existing industry names from `type/js/industry-patterns.js`:

1. `forestry-conservation` — weight 2 (Cedar Forest / Humbaba)
2. `mental-health` — weight 2 (grief, transformation, mortality)
3. `publishing-media` — weight 1 (oldest written epic)
4. `gaming-entertainment` — weight 1 (iconic companion archetype)
5. `sports-athletics` — weight 1 (wrestling match with Gilgamesh)

## Validation

- `lore.json` — valid JSON (checked with `node -e JSON.parse`).
- `effect.js` — syntax passes `node --check`.
- `effect-registry.json` — valid JSON.
- `industry-patterns.json` — valid JSON.

## Merge Instructions for Parent Agent

1. Insert the object inside `lore.json` as the value of `scripts/lore-catalog.json["enkidu"]`.
2. Copy `effect.js` to `templates/flagship/effects/enkidu.js`.
3. Merge the single object from `effect-registry.json` into `templates/flagship/effects/effects.json` (add `"enkidu"` entry with the given fields).
4. Append the five objects from `industry-patterns.json` to the appropriate groups in `type/js/industry-patterns.js` under the matching `industry` keys.
5. Run `npm run generate` and `npm test` before committing.

## Caveats

- The effect module uses the export shape requested in the prompt (`init`, `resize`, `draw`, `destroy`, `metadata`) rather than the IIFE pattern used by most existing effects. The parent agent may need to wrap or adapt it if the build pipeline expects the IIFE style.
- No gallery images or OG card assets are included in this batch; the parent agent will need to run the gallery curator separately.
- No domain wiring is required because this is a domainless promotion.

# Adad Canonical Flagship Source — Batch Report

This directory contains standalone source material for the domainless flagship promotion of `adad` (Mesopotamian pantheon). No shared canonical files were edited; the parent agent should merge these snippets into the appropriate shared registries.

## Files produced

- `lore.json` — Lore-catalog object for `adad` (no outer wrapper). Includes pronunciation, domains, symbols, mythology, syncretism, cultural legacy, extended meditation, sources, and archaeology.
- `effect.js` — Complete bespoke hero canvas effect module. Exports `init`, `resize`, `draw`, `destroy`, and `metadata` (CommonJS + UMD fallback). Visual theme: forked lightning, driving rain, churning storm clouds, and thunder-pulse ambience.
- `effect-registry.json` — Single-object registry patch: `{"adad": {...}}` with `name`, `description`, `file`, and `tags`.
- `industry-patterns.json` — Array of 4 industry assignments (1 weight-2 primary + 3 weight-1 secondaries) drawn from `type/js/industry-patterns.js`.
- `report.md` — This summary.

## Lexicon facts

- `id`: `adad`
- `unicode`: `Adad`
- `ascii`: `adad`
- `pantheon`: `mesopotamian`
- `tier`: `2` / `Tier 2`
- `domain`: `Storm, Thunder`
- `meaning`: `The thunderer`

## Lore content notes

- Tier classification is explained in `pronunciation.note`: Adad is Tier 2 because the restoration preserves only capitalization and no distinctive diacritic/letter; standard Assyriology writes `Adad` identically.
- The page is framed as a **domainless flagship**: the ASCII `.com` is unregistrable, so no domain ownership is claimed.
- Myths draw on the Akkadian Hymn to Adad, *Epic of Gilgamesh* Tablet XI, the West Semitic/Addu-of-Aleppo tradition, and *Enuma Elish* Tablet VII (Marduk's name Ramman).
- Sources are real scholarly references (ETCSL, CAD, Black & Green, Foster, Dalley, Enuma Elish, Gilgamesh XI, Atrahasis, Mari archives).

## Effect module notes

- Canvas ID is left to the consumer; `init(canvas)` wires the context and starts the animation loop.
- Respects `prefers-reduced-motion: reduce` by hiding the canvas.
- Includes resize handling and a `destroy()` method that cancels the animation frame and cleans up listeners/state.

## Industry assignments

1. **Meteorology & Weather Intelligence** — weight 2 (primary)
2. Agriculture, Food & Harvest — weight 1
3. Disaster Resilience & Recovery — weight 1
4. Insurance & Protection Services — weight 1

All names come from the project's `INDUSTRY_GROUPS` array.

## Merge instructions for parent agent

1. Append the contents of `lore.json` as the value for key `"adad"` in `scripts/lore-catalog.json`.
2. Copy `effect.js` to `templates/flagship/effects/adad.js`.
3. Merge `effect-registry.json` into `templates/flagship/effects/effects.json` (add `adad` entry with `canvasId`, e.g. `adad-storm-canvas`).
4. Append the objects in `industry-patterns.json` to the `adad` assignment list in `type/js/industry-patterns.js` / wherever industry patterns are stored.
5. Run `npm run generate` and `npm test` before committing.

## Caveats

- The effect module is written in the requested modular export shape rather than the older IIFE style used by some existing effects; the parent agent should verify compatibility with the current `flagship-canvas.js` loader.
- No gallery images or `_honestZero` exemption are included here; the parent agent will need to curate or exempt gallery assets via the standard `scripts/curate-gallery-images.js` workflow.
- The ASCII `.com` registrability was not independently verified beyond the user's statement; treat as a domainless promotion.

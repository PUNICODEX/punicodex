# Dumuzid Flagship Source Material — Report

Generated canonical source snippets for the PuniCodex entry `dumuzid` (Mesopotamian pantheon) in the isolated directory `.superpowers/mesopotamian-batch/dumuzid/`. No shared canonical files were edited.

## Files produced

- `lore.json` — Full lore-catalog object for `dumuzid`.
- `effect.js` — Bespoke hero canvas effect module (`init`, `resize`, `draw`, `destroy`, `metadata`).
- `effect-registry.json` — Single-entry registry object for merging into `templates/flagship/effects/effects.json`.
- `industry-patterns.json` — Four industry assignments for merging into `type/js/industry-patterns.js`.
- `report.md` — This summary.

## Lore content

The lore follows the established `lore-catalog.json` schema and the Mesopotamian examples (`anu`, `enlil`, `apsu`, `tiamat`, `ishtar`):

- **Pronunciation** — Sumerian/Akkadian reconstruction `/duˈmu.zid/`, with kin forms in cuneiform (`𒌉𒍣`) and Akkadian/Biblical Tammuz. The note explicitly explains the Tier 2 classification: the canonical Latin form has no distinctive diacritic or non-ASCII letter.
- **Domains** — "The Faithful Son" with cards for the sheepfold, date palm/garden, sacred marriage, and descent-and-return.
- **Symbols** — Shepherd's crook, milk pail, date palm, wool, wedding ring.
- **Mythology** — Four myths:
  1. *Dumuzi and Enkimdu* (shepherd vs. farmer courtship).
  2. Sacred-marriage songs (bridegroom of Inanna, royal legitimation).
  3. *Descent of Inanna* (Dumuzid as underworld substitute, Geshtinanna's sharing).
  4. The weeping for Tammuz (Sumerian laments and Ezekiel 8:14).
- **Syncretism / cultural legacy / extended meditation** — Covers the Dumuzid → Tammuz trajectory, the Jewish month Tammuz, the Adonis parallel, and the theological meaning of seasonal loss.
- **Original-script note** — Explains the cuneiform signs and the Tier-2 rationale.
- **Sources** — ETCSL, Black & Green, Jacobsen, Kramer, Foster, *Epic of Gilgamesh* Tablet VI, *Descent of Inanna*, *Dumuzi and Enkimdu*, *Death of Dumuzid*, Ezekiel 8:14.
- **Archaeology** — Tablet corpora from Nippur/Ur/Uruk, Neo-Assyrian/Late Babylonian Tammuz liturgies, and the biblical witness.

## Canvas effect

`effect.js` exports a CommonJS module with the requested shape:

```js
module.exports = { init, resize, draw, destroy, metadata };
```

Visual concept: a dawn/dusk pastoral scene with rolling green-gold hills, a low golden sun, twinkling stars, drifting sheep, swaying grass, date-palm silhouettes, and a slow underworld shadow veil that periodically rises from the bottom of the canvas. When the veil deepens, faint golden "lament" motes drift upward. The effect respects `prefers-reduced-motion` by rendering a single static frame.

`effect-registry.json` registers the effect as `dumuzid.js` with tags: `mesopotamian`, `shepherd`, `vegetation`, `pastoral`, `seasonal`, `canvas`.

## Industry patterns

Four assignments using existing `INDUSTRY_GROUPS` slugs:

| Industry | Weight | Reason |
|----------|--------|--------|
| `agriculture-food` | 2 | Primary fit: shepherd, vegetation, date palms, fertility. |
| `food-hospitality` | 1 | Pastoral produce and sacred-marriage feast. |
| `wine-hospitality` | 1 | Date-palm wine / beer in wedding and New Year liturgy. |
| `funerary-memorial` | 1 | Underworld descent and Tammuz laments. |

## Caveats / merge notes

- The ASCII `.com` is unregistrable, so no domain is claimed. The temple will display the canonical plain-Latin form.
- `effect.js` is a standalone module; the parent agent will need to wire it into the flagship build exactly like other effect files (e.g., copy to `templates/flagship/effects/dumuzid.js` and add/merge the registry entry into `templates/flagship/effects/effects.json`).
- `lore.json` contains only the object value for `dumuzid`; it should be inserted into `scripts/lore-catalog.json` under the key `"dumuzid"`.
- `industry-patterns.json` entries should be appended to the matching `INDUSTRY_GROUPS` groups in `type/js/industry-patterns.js`.
- Gallery data and owned-domain wiring are intentionally outside this batch; this promotion is domainless and will need an `_honestZero` gallery exemption or a separate gallery curation pass.

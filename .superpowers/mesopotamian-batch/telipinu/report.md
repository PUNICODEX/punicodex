# Telipinu Flagship Source Material — Report

## Scope
Generated canonical source material for the PuniCodex entry `telipinu` in the isolated directory `.superpowers/mesopotamian-batch/telipinu/`. No shared canonical files were edited.

## Important Correction
The task description calls Telipinu a "Mesopotamian" figure, but the lexicon (`type/js/lexicon.js`) correctly lists `telipinu` under the **Hittite** pantheon. Telipinu is an Anatolian (Hittite/Hattic) god of agriculture and vegetation, attested at Ḫattuša in the CTH 324 myth cycle. The material below is written for the Hittite entry.

## Files Produced

### `lore.json`
- Full lore object for `telipinu` matching the `scripts/lore-catalog.json` schema.
- Pronunciation reconstructed as `/teliˈpiːnu/` with Hittite cuneiform attestation.
- Tier-2 note explicitly justified: the canonical Unicode form `Telipinu` preserves only capitalization, no distinctive diacritic or non-Latin letter.
- Domains section framed around the "vanishing god" motif and ritual restoration.
- Four domain cards with SVG path strings: The Vanishing God, Famine & Forgetfulness, The Bee Messenger, Ritual Return.
- Five symbols: plough, bee, pine/staff, reversed shoes, wagon/chariot.
- Four myths drawn from CTH 324 with primary-source citations (Hoffner, CHD, KBo/KUB).
- Includes `syncretism`, `culturalLegacy`, `extendedMeditation`, `sources`, and `archaeology` fields.

### `effect.js`
- CommonJS module exporting `init`, `resize`, `draw`, `destroy`, and `metadata`.
- Visual concept: an Anatolian grain field whose color palette oscillates between fertile gold-green and withdrawn brown, with wandering path-motes and a bee-messenger that traces a lazy figure-eight above the field.
- Respects `prefers-reduced-motion` and page visibility.
- `metadata` includes `name`, `description`, and `primaryColors`.

### `effect-registry.json`
- Single registry object for `telipinu` with `name`, `description`, `file`, and `tags`.

### `industry-patterns.json`
- Three industry assignments using existing industry names from `type/js/industry-patterns.js`:
  - `agriculture-food` weight 2 (primary)
  - `water-utilities` weight 1
  - `mental-health` weight 1

## Caveats
- The Hittite pronunciation is uncertain; vowel length and accent are reconstructions, as noted in the Tier-2 explanation.
- The effect module expects a canvas element, selector string, or options object with a `canvas` property. If no input is provided, it falls back to `#telipinu-canvas` or `#hero-canvas`. The parent agent should ensure the flagship template wires the correct canvas ID.
- This is a **domainless** promotion per the task brief; the ASCII `.com` is treated as unregistrable and no domain ownership is claimed in the lore.

## Verification
- JSON syntax was visually checked.
- Effect module was read back and confirmed to export the required functions and metadata object.
- All industry names were verified against `type/js/industry-patterns.js`.

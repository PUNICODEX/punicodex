# Norse Batch — Integration Curation Rationale

Staged curation for the six new flagship temples: **fafnir, bifrost, mjolnir, mani, sigurd, skadi**.
Companion patch: `norse-curation-patch.json`. Nothing in the repo tree was modified;
both sources were read-only (`type/js/industry-patterns.js`, `type/js/similarity-groups.js`).
Every referenced industry id, group relationship string, and lexicon id was validated
programmatically against the live canonical files (validation script output: ALL VALID).

## 1. Industry seats (21 total)

All six temples currently hold **zero** industry seats, so the
"every built flagship holds at least 3 industries" test will fail without this patch.

### fafnir (4 seats)
- **gaming-entertainment** (2) — the archetypal hoard-guarding dragon; Smaug and every
  treasure-vault boss descend from him. Weight 2 matches the precedent for iconic licensed
  monsters (tiamat 2, leviathan 2, jormungandr 2).
- **finance-commerce** (1) — the cursed hoard of Andvari as greed/capital allegory
  (Wagner's Ring reading). Resonant, not direct.
- **music-arts** (1) — Wagner's *Siegfried* / Ring cycle.
- **publishing-media** (1) — Vǫlsunga saga / Nibelungenlied heroic-literature tradition.

### sigurd (3 seats)
- **gaming-entertainment** (1) — the hero-versus-dragon archetype as a standing
  character class (cf. houyi 1).
- **publishing-media** (1) — the North's great hero; the dragon-slayer plot.
- **music-arts** (1) — Wagner's Siegfried, two nights of the Ring.
- No weight-2 seat: no industry is a direct expression of "dragon-slayer hero."
  All-resonant seating mirrors how non-deity heroes are treated elsewhere.

### mjolnir (4 seats)
- **defense** (2) — the hammer *is* the gods' defense against the giants; the direct
  weapon-domain fit (parallels thor 2 in the same industry).
- **gems-jewelry** (2) — the Þórr's-hammer amulet is the most-worn pendant of the
  Viking Age; the artifact's primary archaeological attestation *is* jewelry, which
  justifies 2 over the 1 given to ankh/wadjet (signs worn as amulets rather than
  objects whose chief surviving form is the amulet).
- **gaming-entertainment** (1) — Marvel / God of War franchise iconography.
- **manufacturing-craft** (1) — forged by Sindri and Brokkr; the masterwork of
  divine smithcraft.

### bifrost (4 seats, all resonant)
- **gaming-entertainment** (1) — the portal level of every Norse game; MCU Bifröst.
- **photography-optics** (1) — the rainbow as visible-spectrum architecture.
- **construction-engineering** (1) — the bridge between two worlds; infrastructure's myth.
- **telecom-logistics** (1) — the link between worlds, sentry on the endpoint
  (Heimdallr); parallels iris (2, rainbow messenger).
- **Rejected: lgbtq/identity** — no such industry exists in `INDUSTRY_GROUPS`
  (all 53 ids enumerated; the closest, `dating-relationships`, does not fit).
  The rainbow reading is carried by photography-optics + telecom-logistics instead.

### mani (3 seats)
- **space-astronomy** (2) — the moon personified; direct-domain fit matching
  change (2) and selene (2).
- **sleep-recovery** (1) — the night watch (selene precedent, 1).
- **horology** (1) — moon/month share his name's Germanic root; the first calendar
  counted by his phases (selene precedent, 1).

### skadi (3 seats)
- **forestry-conservation** (2) — the ski-borne huntress of the winter mountains;
  the industry is literally "Forestry, Conservation & **Outdoor Industries**" and her
  domain is the wild winter range (artemis precedent, 2).
- **sports-athletics** (1) — the ǫndurdís ("ski-lady") epithet; winter sports' patron.
- **travel-tourism** (1) — Norwegian ski/mountain tourism (jotunheimr precedent, 2).

## 2. Similarity groups (2 adds)

- **'Moon / lunar'** += `mani` — joins selene, tsukuyomi, change, hati (his pursuer),
  khonsu, etc. Exact existing relationship string.
- **'Guardian / protector'** += `fafnir` — the monstrous sentinel over the hoard;
  joins `andvari`, the hoard's first owner, already seated there.

**Rejected: fafnir → 'Chaos / primordial / world serpent'.** That group's note is
explicitly "primordial oceans, world-encircling serpents, cosmic disorder"
(jormungandr, nidhogg, tiamat). Fáfnir is a dwarf *transformed* by greed into a
hoard-guardian — a narrative-role sentinel, not a primordial force. The Norse-serpent
reading is carried by the fafnir↔jormungandr curated pair instead.

**Note: no heroes group exists.** There is no 'Culture hero' FUNCTION_GROUP, so sigurd
is seated via curated pairs only (herakles pair + Vǫlsunga cluster).

**Note: skadi is already in 'Hunt / wild'** (verified) — no group add needed.

## 3. Curated pairs (11)

### Vǫlsunga cycle cluster (item 3 of the brief)
No myth-cycle group type exists in the schema, so the cycle is expressed as a
four-node pair cluster, mirroring how the Chinese elixir cycle
(change↔houyi, xiwangmu↔houyi) was seated at strength 2:

- **sigurd↔fafnir** — slayer and hoard-dragon, the cycle's core.
- **sigurd↔brynhildr** — the sworn lovers, betrothed and betrayed.
- **fafnir↔reginn** — brothers divided by the cursed hoard.
- **sigurd↔reginn** — foster-father/foster-son; Gram reforged, murder plotted.

All four ids (sigurd, fafnir, brynhildr, reginn) verified present in the lexicon.

### Cross-cultural parallels
- **sigurd↔herakles** (2) — culture hero / monster-slayer; mirrors the existing
  houyi↔herakles pair.
- **fafnir↔jormungandr** (2) — the two great Norse serpents (hoard-dragon vs
  world-serpent).
- **mani↔selene** (2) — moon personified; mirrors the change↔selene pair's note shape.
- **mani↔tsukuyomi** (2) — the rarer *male* moon deities across traditions.
- **bifrost↔iris** (2) — the rainbow as passage between gods and mortals: the bridge
  walked and the messenger who walks it.
- **bifrost↔heimdallr** (2) — the watchman and the bridge (Himinbjǫrg at the bridge's head).
- **mjolnir↔draupnir** (2) — Sindri and Brokkr's masterworks from the same wager.
  **Rejected alternatives:** gungnir, vajra, excalibur, gram are **not in the lexicon**
  (verified), so no weapon-artifact pair beyond draupnir was possible; no
  weapon-artifact FUNCTION_GROUP exists.

### Already present / rejected
- **skadi↔artemis** — **already exists** in CURATED_PAIRS (strength 3, 'Hunt /
  wilderness'). No action; confirmed, not duplicated.
- **fafnir↔smaug** — rejected; Tolkien's Smaug is not a lexicon entry.
- **sigurd↔herakles existed?** — checked: only houyi↔herakles exists; the new pair
  is not a duplicate.

## Validation

```
seats per temple: { fafnir: 4, sigurd: 3, mjolnir: 4, bifrost: 4, mani: 3, skadi: 3 }
total seats: 21 | group adds: 2 | pairs: 11
ALL VALID
```

Checks run: every industryId ∈ INDUSTRY_GROUPS, every entryId/pair id ∈ LEXICON,
weights ∈ {1,2}, why-lines ≥ 40 chars, group relationship strings match exactly,
no addId already present in its group, no curated pair duplicates an existing pair
(in either direction).

## Application notes for the integrator

- `industrySeats` entries append to the matching `entries` arrays in
  `type/js/industry-patterns.js` as `{ id, weight, why }`.
- `similarityGroups` addIds append to the `ids` arrays of the named FUNCTION_GROUPS.
- `curatedPairs` append to CURATED_PAIRS; add `bidirectional: true` on write to match
  house style (omitted from the patch since all existing pairs share it).
- After applying: `npm run generate && npm test` (divergence gate + the
  ≥3-industries test cover this).

# Tier System Archive (removed 2026-10-29)

This archive preserves the **lexicon tier system** (Dual-Tier / Tier-1 / Tier-2) that was
removed from PuniCodex on 2026-10-29. Everything needed to understand, audit, or restore
the system is in this folder. Nothing here is wired into the build.

## Contents

- `README.md` — this file
- `doctrine-from-AGENTS.md` — the "Definitive Tier System" section as it appeared in AGENTS.md
- `reclassify-tiers.js` — the mechanical classifier tool (from `tools/new-domains/`;
  note: its `--dry-run` flag was unhandled and it could crash mid-apply — one reason it was retired)
- `fix-tier-contradictions.js` — one-off repair tool (from `tools/`)
- `lexicon-snapshot/tier-fields.json` — the full `tier` / `tierLabel` / `variants` values for
  all 983 lexicon entries at removal time
- `tiers-page/` — the public `/tiers/` feature page (`index.html`, `tiers.js`, data JSONs),
  removed from the site root

## Why it was removed

1. **The badge could overclaim.** Tier was computed from the *Greek original's* features,
   but displayed as a claim about the *restoration shown*. 66 of 205 Greek Tier-1 entries
   displayed forms preserving only one (or zero) of the features the badge implied.
2. **Display-level inconsistency.** 79 Greek Tier-2 entries (Ártemis, Diónysos, Krónos…)
   displayed forms with exactly the same feature count as Tier-1 Zeús — the only difference
   was invisible original data.
3. **Maintenance exceeded value.** A 90-line classifier tool, a reviewed-exceptions list
   (`asia`, `rhea`, `atlas`), live rule/data drift (iphigeneia, keraunos stored Tier-2
   against their own rule; pallas questionable), validator asserts, and a public doctrine
   page — for a badge users could not interpret and a ranking nudge largely subsumed by
   `is_flagship DESC`.

## What replaced it

- **"Does the restoration preserve anything ASCII loses"** is computable on demand from the
  displayed form (NFD decomposition) — nothing stored, nothing to drift.
- **Multi-form ownership display** (e.g. the Apollo/Hekate/Nike dual-name presentation) was
  always derived from owned domains, not from the tier field, and is unchanged.
- Ranking keeps `is_flagship DESC`; appraisal no longer applies a tier multiplier.

## NOT part of this system (still live, do not confuse)

- **API pricing tiers** (Free / Hobby / Pro / Enterprise) — rate limiting, `api-auth.js`
- **Authenticity severity tiers** — `platform/api/tier-definitions.js`, `trust_tier` DB column
- **`rentalTier`** (S/A/B/SSS inventory grades on archetypes) — the leasing product
- **Analytics `tier_id`** — patron price points in cents, event properties

## Restore procedure (if ever needed)

1. Re-add `tier` / `tierLabel` fields to `type/js/lexicon.js` from `lexicon-snapshot/tier-fields.json`
   (matched by entry `id`).
2. Restore the tools from this folder into `tools/new-domains/`.
3. Re-add `tier` to `js/archetypes-v2.js` entries, `platform/db/init.js` schema,
   and the consumers listed in the removal commit (see git history, `git log --oneline --grep=tier`).

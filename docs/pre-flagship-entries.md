# PuniCodex — Plain-ASCII Pre-Flagship Entries (the promotion queue)

**Status: FULFILLED — 2026-11 batch complete.** The 50-entry queue this file
tracked has been promoted: 49 converted to flagship temples on 2 November 2026
(materials: `extended flagship materials/ascii-restoration-batch-2026-11/`, via
`scripts/promote-flagship-batch.js`), and one entry deliberately skipped.

The single remaining pure-ASCII non-flagship entry is:

| id | restoration | note |
|---|---|---|
| surt | Surt | **Intentionally not promoted.** Duplicate of the Norse fire giant Surtr — the project keeps the Old Norse form (`surtr`, flagship) rather than the anglicised spelling. Do not queue again unless a distinct tradition attaches to this form. |

Regenerate check: pure-ASCII filter = `/^[\x00-\x7F]+$/` on `unicode`, excluding
`built` archetypes from `js/archetypes-v2.js`. As of 2026-11-02 the filter
returns exactly the one row above.

For any FUTURE entries that land in this queue: prepare brand materials
(mascot / logomark / logolockup PNGs), then run
`node scripts/promote-flagship-batch.js --check` for the full readiness gate
(lore, scholars thresholds, bespoke effect, gallery, industry seats) and
`--activate <ids>` to flip. The 2026-11 batch pipeline is documented in
AGENTS.md (Safe-edit scripts).

# New-Flagship Integration Audit — nezha, change, houyi, longwang, xiwangmu

Date: 2026-08-19. Branch: master @ a17e7d62. Scope: integration completeness of the
5 temples promoted to flagship on 2026-08-18, compared against established flagships
(zeus, apollon) and established chinese/taoist flagships (guanyin, long, taichi, sunwukong).
READ-ONLY audit; nothing was modified.

Exclusions (handled separately, not counted): (1) pronunciation engine has no
chinese/taoist module → no "Say it right" panel (pre-existing, affects all
chinese/taoist flagships); (2) herald-beacon/cookie-consent injection (fixed in
a17e7d62). Already verified PRESENT by the earlier pass and not re-reported in
detail: OG cards, sitemap, FR1 cards (4 editions each), ink downloads/index,
renderer lexicon hasFlagship=1, extension/mobile/android lexicon copies,
middleware domain routes, scholars sections/manifests/content, blog posts +
blog sub-pages (canonical/resonance/restoration), industry-pattern seats,
store products (65, Printful-synced).

Legend: PRESENT / PARTIAL / MISSING / N-A, with new-gap vs pre-existing classification.

---

## 1. Temple page structure — PRESENT

`sites/{id}/index.html` full-file diff vs `sites/zeus/index.html` (name-stripped):
the ONLY structural delta is the `pronunciation-section` / `say-it-right` panel
(zeus lines ~219–245), which is the known excluded gap. Everything else — head/meta/OG/
JSON-LD, `main-nav tab-nav`, `temple-breadcrumb`, hero canvas, patron-mascot picture,
spaces section (13 slots + full-page takeover, slot 14 `data-bundle="1"`), how-it-works,
booking modals, my-bookings modal, university-collaborators strip, footer (24 footer
refs each) — is byte-identical in structure. Line counts: nezha/change/houyi/xiwangmu
781, longwang 784, zeus 810 (delta ≈ the pronunciation panel).

All 8 tabs exist and are non-stub for all 5 (bytes; zeus in parens):
lore 39.0–39.9 KB (45.3), gallery 19.7–19.8 KB (23.0), patterns 51.0–69.6 KB (49.8),
scholars 86.4–88.9 KB (88.3), blog 42.2–43.5 KB (44.8), creatives ~12.0 KB (12.0),
patron ~21.5 KB (21.5), dashboard ~22.3 KB (22.3). Size deltas vs zeus are content
depth, not missing sections — lore heading inventory is identical:
"The Authentic Name / Original Script & Provenance / Name Variations / Pronunciation /
{deity-specific} / Mythology / Related Names / Extended Lore".

Flywheel-validator placeholder markers (`scripts/validate-flywheel.js:557` —
'todo', 'fixme', 'lorem ipsum', 'placeholder'): the only "placeholder" hits in the 5
temples are HTML form-input attributes (`placeholder="you@company.com"` etc.) and
`placeholder-dims/logo/text` CSS classes — identical in zeus (51 hits there). No real
placeholder text.

"In the Texts & Everyday Words" lore band: all 5 render the empty
`<!-- In the Texts & Everyday Words -->` comment — the generator
(`scripts/create-flagship.js:2623` `buildCrossLinkBand`) silently omits when a temple
has no texts-xref or everyday-word mapping. Same state as established `long`/`taichi`
(only `guanyin` has the section, via `platform/texts/lotus-sutra/xref.json`).
Content curation, not an integration gap.

Canvas effects assigned to all 5 (`data-effect`: nezha=particles, change=stars,
houyi=sun, longwang=water, xiwangmu=mountain). Canvas `data-primary/#D4AF37` defaults
match established-flagship behavior (guanyin's canvas also carries the default despite
custom archetype colors). Archetype records complete (e.g. nezha: rentalTier S,
domainUnicode nézhā.com, punycode xn--nzh-bma6j.com, mascot/logomark paths, built:true).

## 2. Global nav / menus / footer — PRESENT

Full-file diff vs zeus shows zero nav/menu/footer deltas: same `main-nav tab-nav`,
same `temple-mobile-menu` mobile menu, same footer block. Injection markers present
in all 5 identical to zeus: PUNICODEX-ANALYTICS (START/END), PUNICODEX-COOKIE-CONSENT,
PUNICODEX-HERALD-BEACON, PUNICODEX-UNIVERSITY-COLLABORATORS (HEAD+BODY) — 2 of each
per file pair. (Temples carry the temple nav, not the root desktop-nav block; the
desktop-nav sync covers non-temple root pages only, per AGENTS.md.)

## 3. Pantheon / lexicon / tiers hub pages — PRESENT

Each of the 5 appears in:
- `pantheon/index.html` (static `px-temple-index` block + JS grid driven by the
  canonical archetypes; taoist filter pill exists at line ~500 for xiwangmu)
- `lexicon/index.html` (PUNICODEX-TEMPLE-INDEX marker block, line 615)
- `tiers/index.html` (built-flagship static index)
grep count = 1 reference each per page (the collapsed details index), matching how
every other temple appears.

## 4. Oracle / connections / everyday / game

- Oracle — PRESENT by construction. `platform/api/oracle.js` is fully dynamic
  (DB + canonical lexicon `lexiconOrder()` line 610 + lore-catalog); no hardcoded
  roster. `data/corpus/oracle-examples.jsonl` and `eval.jsonl` already contain the 5.
- Connections / similarities graph — PARTIAL (pre-existing curation).
  `platform/api/similarities.json` is a curated 230-node graph from FUNCTION_GROUPS +
  CURATED_PAIRS in `scripts/generate-similarities.js`. Only 5 chinese entries are in
  the graph at all (tianhou, zhurong, mazu, erlang, sunwukong); established flagships
  guanyin, long, taichi are also absent. The new 5 join an existing curation tail —
  NOT a new-temple-specific gap.
- Everyday words — N-A (pre-existing curation). Zero of the 72 cards in
  `type/js/everyday-words.js` map to ANY chinese/taoist entry; guanyin/long/taichi
  have none either.
- Game (Mythic Duel) — PRESENT. `game/cards.json`: 4 printings each
  (common/holo/full-art/secret), same as zeus. Pantheon hero powers exist for both
  chinese and taoist (`game/fx/hero-powers.js:68,75`); starter archive and packs are
  derived dynamically from the cards data.

## 5. APIs — PRESENT

- `/api/v1/names/:id` reads the canonical lexicon directly
  (`platform/api/names-service.js:16`, `entriesById.get(id)` line 258) — change/houyi
  resolvable the moment they entered `type/js/lexicon.js` (verified: both present,
  tier "1", correct unicode/pantheon/domain).
- `/api/entry/:id` and search are DB-backed; the local built DB
  (`platform/db/punicodex.db`, rebuilt by `npm run db-init`) contains all 5 with
  `has_flagship=1`, correct tier/pantheon, and FTS rows (5/5). Flagship count in
  DB = 287.
- `platform/api/canonical-register.json`: all 5 present with canonical form, temple
  and blog paths (count 287 = actual 287).
- `/api/flagships` is DB-driven (`platform/api/search.js:398` getFlagships,
  `WHERE e.has_flagship = 1`) — includes the 5 automatically.

## 6. Search/crawler DB seeds — PRESENT

`platform/db/init.js:103` seeds `entries` from the canonical lexicon and derives
`has_flagship` from `js/archetypes-v2.js` (`ARCHETYPES.filter(a => a.built)`), so the
seed can never drift from the flywheel roster. Verified against the built DB (see §5).
No per-temple hardcoding anywhere in the crawler/matching path.

## 7. Corpus exports — PRESENT, one PARTIAL

- `data/corpus/entries.jsonl`: 926 records; all 5 present (change/houyi also appear
  in 49 sibling records' related-entry arrays — generated consistently).
- pretrain / instructions / instructions-train / chat-train / oracle-examples /
  eval / benchmark: all contain the 5 (spot-counted; counts comparable to guanyin).
- `data/corpus/pronunciation.jsonl` — PARTIAL (pre-existing seeder gap):
  913 records; change + houyi are 2 of 13 missing entries. Root cause: both lack
  rows in `type/js/pronunciation-atlas.js` (atlas-sourced records like nezha's carry
  `"source":"atlas"`). The other 11 missing (tiandi, tian, guandi, pluto, ceres,
  papatuanuku, yam, perkunas, orun, oba, ashavahista) are pre-existing entries — 24
  established flagships lack atlas rows, so this is the pre-existing seeder-coverage
  tail, not a new-temple-specific omission. Same story for `type/js/glyph-atlas.js`:
  change/houyi absent, but 73 built flagships are absent (manannan, quetzalcoatl,
  pangu, mengpo, …). Re-running `scripts/seed-pronunciation-atlas.js` /
  `seed-glyph-atlas.js` would close change/houyi along with the existing tail.

## 8. Blog index + feeds — PRESENT / N-A

`blog/index.html` lists all 5 posts (12 references each, same as every flagship).
Per-temple blog tabs + canonical/resonance/restoration sub-pages exist for all 5.
No RSS/atom feed exists anywhere in the repo (no feed files, no feed handlers, no
feed link tags) — N-A for all flagships, not a new gap.

## 9. Store — PRESENT

`store/index.html` collections grid references all 5 collection pages (2 refs each).
`store/{id}/index.html` exists for all 5 with full product grids (22 grid refs each)
and all 13 product-type directories (canvas, cap, crewneck, …). Products already
verified Printful-synced in the earlier pass.

## 10. Admin portal + leasing slots — PRESENT / N-A

`ad_slots` are 14 GLOBAL slot definitions seeded once
(`platform/db/migrate-booking.js:137-165` + bundle_members for slot 14) — slots are
not per-temple, so there is nothing per-flagship to seed; bookings reference the
temple at booking time. The admin portal leasing UI is fully dynamic
(`platform/public/admin-portal/leasing/index.html` mentions zeus/apollon only as
input placeholder examples, lines 69/151). Command-dashboard decision queues are
DB queries. Nothing hardcoded per-flagship.

## 11. vercel.json / middleware — PRESENT

Asset proxy is a single generic rewrite covering every temple:
`vercel.json:12-13` `/sites/:path*/assets/:file* → punycodex-masters.vercel.app/...`.
34 rewrites total, no duplicate keys. `middleware.js` DOMAIN_MAP routes all 5 with
Unicode + punycode + www variants (e.g. chángé.com:62, www.chángé.com:378,
www.xn--chng-6na4c.com:704, xn--chng-6na4c.com:1048 → /sites/change).

## 12. data-version.json — PRESENT

`2.0.102`; counts entries 926, pantheons 25, flagships 287, originalScripts 117,
sourceCatalog 211, pronunciationAtlas 903, glyphAtlas 672 — internally consistent
with the post-promotion state (287 = 282 + 5 new).

---

## Additional finding (flagged, low impact)

**`change` absent from `js/owned-entries.js` (OWNED_ENTRY_IDS, 283 ids).**
Root cause: `scripts/generate-owned-entries.js` matches owned domains to entries by
exact normalized label equality against {unicode, ascii, variant unicodes}. The owned
domain `chángé.com` normalizes to `chángé`, which matches neither the entry unicode
`Cháng'é` (apostrophe — not valid in DNS) nor the ascii `change`. `Cháng'é` is the
only apostrophe-bearing unicode in the lexicon. Three established entries share the
defect class (wadjet/wꜣḏ.com, theia/theía.com, athiratu/aṯiratu.com; 22 owned domains
overall fail label-matching), so the generator weakness is pre-existing — but `change`
is newly affected, and chángé.com is its only owned domain. Impact is minor: the set
only feeds the /lexicon/ default-view filter for plain-ASCII names, and Cháng'é has
diacritics so it displays anyway. Cleanest fix: add an `owned`-type variant
`Chángé` to the lexicon entry (also future-proofs crawler/availability label matching).

---

## Summary table

| # | Surface | Status | New-gap? |
|---|---------|--------|----------|
| 1 | Temple page structure (index + 8 tabs) | PRESENT | no (only excluded pronunciation panel differs) |
| 2 | Nav / mobile menu / footer / injections | PRESENT | no |
| 3 | pantheon / lexicon / tiers hub indexes | PRESENT | no |
| 4a | Oracle | PRESENT (dynamic) | no |
| 4b | Connections/similarities graph | PARTIAL | no — pre-existing curation (guanyin/long/taichi absent too) |
| 4c | Everyday words | N-A | no — zero chinese/taoist cards exist at all |
| 4d | Game roster / hero powers | PRESENT | no |
| 5 | APIs (v1 names, entry, flagships, canonical-register) | PRESENT | no |
| 6 | DB seeds (entries, FTS, has_flagship) | PRESENT | no |
| 7 | Corpus exports | PRESENT; pronunciation.jsonl PARTIAL | no — pre-existing atlas-seeder tail (24 flagships lack rows) |
| 8 | Blog index | PRESENT; RSS/atom N-A (no feed exists site-wide) | no |
| 9 | Store grid + collection/product pages | PRESENT | no |
| 10 | Admin portal / ad_slots | PRESENT / N-A (slots are global) | no |
| 11 | vercel.json asset proxy / middleware routes | PRESENT | no |
| 12 | data-version.json counts (926/25/287) | PRESENT | no |
| * | owned-entries.js label matching | PARTIAL | **change newly affected** (pre-existing defect class, 3 established entries share it) |

**Real new-temple-specific gaps: 1** — `change` missing from `js/owned-entries.js`
(apostrophe label mismatch; low impact, shared defect class with wadjet/theia/athiratu).
Everything else is either fully present or a pre-existing curation/seeder tail that
established chinese flagships (and many others) already share.

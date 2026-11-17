# Extended Lore Rubric (v2.0 — post-rebuild)

The Extended page (`/sites/{id}/lore/extended/`) is the deep scholarly
companion to a flagship temple's main lore page. It exists for visitors who
finished the main lore and want more. Every extended page must clear this
rubric. Enforced by `scripts/validate-extended-lore.js` (read-only; run
standalone as `node scripts/validate-extended-lore.js [id...]` — no args
checks every built flagship in ~3s).

## 0. Layer ownership — every fact renders ONCE

The three temple layers target DISTINCT search intents; duplication between
them is a hard failure, not a style issue:

- **Main temple** (`/sites/{id}/`): entity/commercial intent — hero, domain,
  ad slot, restoration claim.
- **Lore page** (`/sites/{id}/lore/`): narrative intent — mythology cards,
  symbols, pronunciation (IPA, phonemes, approximation, preservation), name
  mechanics (variations, provenance). Pronunciation renders here ONLY.
- **Extended page** (`/sites/{id}/lore/extended/`): scholarly-reference
  intent — everything below.

## 1. Canonical structure

Section order is canonical — regenerate via `create-flagship.js`, never
hand-reorder.

Always-present (CORE) sections:

1. At a Glance (`#at-a-glance`) — slim fact strip only; short values, no
   prose paragraphs, no pronunciation panel (that lives on the lore page)
2. Etymology & Word Family (`#etymology`) — kin and variants live here ONLY
3. Character Breakdown (`#character-breakdown`)
4. Cult (`#cult`)
5. Iconography (`#iconography`)
6. Reception (`#reception`)
7. The Meditation (`#meditation`) — omitted only when the catalog has none
8. Scholarly Sources (`#sources`)

Data-driven sections — render ONLY when their data exists, counted as extra
when present:

- Parallels & Equivalents (`#parallels-equivalents`) — syncretic parallels
- The Name in the Modern World (`#modern-world`) — cultural legacy
- Places Bearing the Name (`#places`) — toponyms
- Original Script Note (`#original-script-note`) — script provenance; the
  "Original Script" label only for genuine writing systems
  (`type/js/original-scripts.js` getOriginalScriptLabel), never for
  Latin-with-diacritics

Retired from the extended page: the Quick Facts grid (replaced by the
slim At a Glance strip), the Unicode Variants list, and any tier
classification vocabulary (the tier system was retired 2026-10-29;
ownership/prominence/ASCII-canonicity are display facts, never
classification criteria).

## 1a. Hard structural floors (validator-enforced)

- **Section floor**: ≥5 of the 7 CORE sections present. Data-driven sections
  count toward the reported total but can never substitute for the core.
- **Prose floor**: ≥3,000 characters of visible prose (tags stripped,
  hard failure); target 5,000–10,000 for major entries (below 5,000 warns).
  The floors were recalibrated down from 4,000/6,000 when the boilerplate
  Quick Facts/Unicode-Variants blocks were removed; they still catch
  stub-shipped pages because real cult/iconography/reception scholarship
  cannot fit under 3,000 characters.
- **Dead-end guard**: the page must link onward to ≥4 DISTINCT other temple
  surfaces (`/{id}/` or `/sites/{id}/` of real lexicon entries). An
  extended page the crawler can leave only via "Back to Lore" is a
  structural failure.

## 1b. Duplication guard (validator-enforced)

The extended page must not repeat the lore page's prose. The duplication-prone
regions — the FAQ and the At a Glance strip — are checked verbatim against
the same temple's `lore/index.html`:

- Both pages are stripped of script/style, nav, footer (incl. the `tf-hub`
  columns), and comments; the FAQ and At a Glance `<section>` blocks of the
  extended page are then compared as normalized word shingles.
- ANY shared run of ≥12 consecutive words is a hard failure (the FAQ region
  is reported with example runs). Note that shared *fact values* of under 12
  words — a name, a gloss, a domain form — are fine; only prose sentences
  and long concatenated lists trip the guard.
- The FAQ is deep-dive-only: it may tease a myth or a fact and link back
  (`../#mythology`), never re-tell it. Any FAQPage JSON-LD in the head must
  match the visible FAQ exactly.

## 2. Accuracy (non-negotiable)

- Same standard as the Scholarly Edition CONTENT-RUBRIC: every factual
  claim attested; uncertainty named explicitly; honest statements of
  absence instead of invention.
- `platform/scholars/content/{id}.json` is the pre-verified grounding layer
  — prefer its claims and citations over memory. Cross-check against
  `scripts/lore-catalog.json`, `type/js/lexicon.js`, and
  `type/js/original-scripts.js`.
- The pronunciation engine (`type/js/pronunciation-rules.js`
  derivePronunciation) is the canonical IPA derivation — never hand-write
  competing IPA on the extended page.
- Precise citations: author + work + book/line or chapter (e.g. "Pausanias
  2.36–37", "Theogony 313–318"), not vague "ancient sources say".

## 3. Structure and chrome (non-negotiable)

- The page's chrome is untouchable: everything in `<head>` (meta, JSON-LD,
  styles), the injected marker blocks (`PUNICODEX-ANALYTICS-*`,
  `PUNICODEX-UNIVERSITY-COLLABORATORS-*`), global nav, canvas/hero scripts,
  and the footer stay byte-identical.
- Edit only the content inside the page's `<section>` blocks (and the
  hero's inner copy where it is generic). Never whole-file rewrites —
  targeted, section-scoped edits only.
- Keep the existing CSS class system (`section`, `section-header`,
  `section-number`, `reveal-up`, etc.) — new content must use the same
  classes so the design stays coherent.
- Section numbers stay sequential after any restructure.

## 4. Voice

- Scholarly but readable — a gifted lecturer, not a marketing page.
- No hype, no filler, no repetition of the hero copy inside sections.
- ASCII-form entries: displayed plain-ASCII names must never be described
  as recovering lost diacritics or requiring Punycode ("canonical spelling",
  "scholarly transliteration", "attested form" instead) —
  `scripts/lib/ascii-editorial.js` is the shared guard.
- Cross-link sibling temples (`/sites/{id}/`) only where genuinely relevant
  and only to real lexicon entries.

## Changelog

- **v2.0** (2026-11 extended-lore rebuild): slim At a Glance strip replaces
  Quick Facts; deep-dive-only FAQ; Unicode Variants list removed; new
  data-driven sections (Parallels & Equivalents, The Name in the Modern
  World, Places Bearing the Name, Original Script Note); section floor
  redefined as ≥5 of 7 CORE sections; prose floors recalibrated to
  3,000/5,000; duplication guard + dead-end guard added; tier vocabulary
  ban restated (tier system retired 2026-10-29).
- **v1.0** (2026-09 lore restructure): original ownership matrix and depth
  floors.

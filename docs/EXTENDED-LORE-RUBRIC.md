# Extended Lore Rubric (v1.0)

The Extended page (`/sites/{id}/lore/extended/`) is the deep scholarly
companion to a flagship temple's main lore page. It exists for visitors who
finished the main lore and want more. Every extended page must clear this
rubric.

## 1. Relationship to the main lore page

- The extended page MUST NOT re-tell the main lore page's core myths. It
  goes deeper into categories the main page does not cover.
- Choose depth categories that fit the entry, e.g.: cult practice and
  ritual detail; festival calendars; sanctuary topography; primary-source
  close readings (with precise book/line citations); comparative mythology
  across traditions; reception history (late antiquity → medieval →
  Renaissance → modern); philological deep-dives; iconographic programs;
  epigraphic/archaeological evidence; historiography (how scholarship on
  this figure changed).

## 1a. Canonical structure (since the 2026-09 lore restructure)

The generated section order is canonical — regenerate via `create-flagship.js`,
never hand-reorder:

1. Quick Facts (`#quick-facts`)
2. Etymology & Word Family (`#etymology`) — kin and variants live here ONLY
3. Unicode Character Breakdown (`#unicode-breakdown`)
4. Cultural Significance (`#cultural-significance`) — syncretism, modern
   legacy, and the archaeology card ("In the Earth")
5. The Meditation (`#meditation`) — the catalog `extendedMeditation` essay;
   omitted when the catalog has none
6. Screen & Culture (`#screen-appearances`) — conditional; cards carry the
   screen-index relevance summary
7. FAQ (`#faq`)
8. Scholarly Sources (`#sources`)

Ownership rules that prevent lore/extended duplication:

- Pronunciation (IPA, phonemes, approximation, tier rule) lives on the LORE
  page (`#pronunciation`) ONLY — the extended page must not re-render it.
- Etymological kin lives in extended Etymology ONLY.
- The mythology cards live on the lore page ONLY; extended FAQ may tease a
  myth but links back instead of re-telling it.
- `domains.lead` renders on the lore page ONLY (Domains & Symbols section).

## 2. Accuracy (non-negotiable)

- Same standard as the Scholarly Edition CONTENT-RUBRIC: every factual
  claim attested; uncertainty named explicitly; honest statements of
  absence instead of invention.
- `platform/scholars/content/{id}.json` is the pre-verified grounding layer
  — prefer its claims and citations over memory. Cross-check against
  `scripts/lore-catalog.json`, `type/js/lexicon.js`, and
  `type/js/original-scripts.js`.
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

## 4. Depth floors

- At least 6 content sections after elevation.
- At least 4,000 characters of visible prose (tags stripped); target
  6,000–10,000 for major entries.
- FAQ section, if present, must contain real, specific questions with
  substantive answers (not generic filler), and any FAQPage JSON-LD in the
  head must be updated to match the visible FAQ exactly.

## 5. Voice

- Scholarly but readable — a gifted lecturer, not a marketing page.
- No hype, no filler, no repetition of the hero copy inside sections.
- Cross-link sibling temples (`/sites/{id}/`) only where genuinely relevant
  and only to real lexicon entries.

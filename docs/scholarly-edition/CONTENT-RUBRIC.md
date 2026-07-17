# Scholarly Edition Content Rubric (v1.0)

The Scholarly Edition is the permanent, citable scholarly layer of PuniCodex.
Every section must read as if written for a university reference work. This
rubric is the bar a section must clear before any student or university ever
edits it. It binds all content in `platform/scholars/content/{id}.json`.

## 1. Voice

- Encyclopedic, precise, third person. Present tense for attested facts.
- No marketing language, hype, or editorializing ("epic", "incredible",
  "amazing", "must-see"). No first person. No rhetorical questions.
- Define technical terms on first use (e.g. "apotropaic", "syncretism").
- Dense, information-rich prose. No filler sentences, no restating the
  section heading, no throat-clearing openings.

## 2. Accuracy (non-negotiable)

- Every factual claim must be attested in a cited source or in the
  universally accepted standard reference for the tradition.
- Never invent: dates, epithets, cult sites, genealogies, hymn numbers,
  museum inventory numbers, quotations, or transliterations.
- Where scholarship is uncertain or divided, say so explicitly and name the
  positions ("the etymology is disputed; Beekes considers a Pre-Greek
  origin probable, whereas…").
- Where no attested record exists for a section's topic, write an honest
  scholarly statement (e.g. "No archaeological record of a dedicated cult
  is attested for this figure.") rather than fabricating content. An honest
  absence is a valid section; an invented fact is a defect.
- Transliterations must match the canonical sources (lexicon,
  original-scripts) exactly.

## 3. Depth floors

- Major narrative sections (overview, mythology, the-name, pronunciation,
  syncretism, cultural-legacy, and pantheon-kit sections such as
  homeric-hymns, epithets, iconography): target 700–1,400 characters.
- Structural sections (domains, symbols, scholarly-sources, meditation,
  original-script, archaeology): target 400–900 characters.
- Absolute floor: 250 characters. Below that is a hard failure.

## 4. Citations

- Every section carries at least one source in its `sources` array.
- Major claims are tied to sources with `[^n]` markers in the body;
  marker `[^n]` refers to the n-th entry (1-based) of the section's
  `sources` array. Every marker must resolve; every source should be used.
- Prefer primary sources (Homer, Hesiod, Pausanias, the Eddas, Rig Veda,
  Popol Vuh, Pyramid Texts…) plus standard reference works (LSJ, Beekes,
  Chantraine, LIMC, canonical editions).
- Citation format: `"Author or Work, identifying detail (edition, book/line
  or chapter where useful)."` with a stable `url` when one genuinely exists
  (Perseus, archive.org, publisher pages). Never invent URLs.
- Sources are objects: `{ "citation": "…", "url": "…" }` (url optional).

## 5. Crosslinks

- Link sibling temples only where genuinely relevant
  (genealogy, shared cult, direct syncretism).
- Format: `[Display Name](/sites/{id}/)` — the id must be a real lexicon
  entry. Never link a temple that does not exist.

## 6. Form

- Markdown only. No raw HTML anywhere in a body.
- Preserve the JSON structure exactly: same top-level keys, same section
  keys, `sources` arrays of objects.
- Sections that already meet this rubric are kept untouched. Minimal churn:
  rewrite only what is templated, thin, generic, inaccurate, or
  under-cited.

## 7. What "flagged" means

A section is flagged when any of these holds:

1. Body below the absolute floor (250 chars) — hard failure.
2. Body thin for its class (below the depth target) or padded with filler.
3. Generic templated prose that could apply to any entry ("This name has
   been important since antiquity…") without entry-specific substance.
4. Any factual claim not grounded in a cited or standard source.
5. Missing sources, dangling `[^n]` markers, or unused sources.
6. Marketing voice, first person, or editorializing.

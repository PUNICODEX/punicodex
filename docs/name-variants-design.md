# Name Variants System — Design Plan (v0.1, draft 2026-10-29)

Status: **implemented** (Phases 1–3 first pass, 2026-10-29). The tier-system
removal shipped first (see `archive/tier-system/README.md`); this system is its
positive replacement. Contracts live in `test/variants.test.js`; doctrine in
`AGENTS.md` → "Name Variants System".

## Why this exists

The retired Dual/Tier-1/Tier-2 system *classified* each name with one label.
This system does something strictly more valuable: it **enumerates the
spelling space** of each ancient name — every attested transliteration variant,
how it relates to the canonical restoration, and which sources attest it.

A classification is one label. A variant set is scholarly knowledge:

> "This name has 4 attested spellings. Here they are. Here is why each one
> exists. Two are ours; knowledge of the other two is not ownership-dependent."

Design principle (carried over from the tier removal): **a description may
never claim more than the data supports.** Every form carries an explicit
`class`, and only sourced forms count toward headline counts. This is the
failure class that killed the tier system — it is designed out here from the
start.

## The three variant classes

| Class | Meaning | Counted in "attested forms"? | Source of truth |
|---|---|---|---|
| `attested` | Spelling backed by a named scholarly source (LSJ, Beekes, Faulkner, Monier-Williams, a primary text, an owned registration) | **Yes** | Hand-edited `variants` on the lexicon entry, each carrying `sources` |
| `derived` | Systematic feature subsets of the canonical form (see below) — *possible* spellings, never presented as attested | No — labeled "derived" wherever shown | Computed by NFD decomposition (`type/js/engine.js` → `preservedFeatures`) |
| `convention` | Per-tradition transliteration conventions (Greek `kh`/`ch`; Egyptian `ꜣ` → `3`/`ʿ`/`a`; Sanskrit IAST diacritic-dropping; Chinese pinyin ↔ Wade-Giles; Japanese Hepburn ↔ Kunrei) | Only when a source is attached | Per-pantheon convention tables (incremental, Phase 3) |

Derived forms are the honest mechanical family of the canonical restoration:

- **full** — the canonical form as-is
- **length-only** — macrons kept, stress marks dropped (LSJ convention; the
  default fallback per the Multi-Form hierarchy in AGENTS.md)
- **stress-only** — acute kept, length dropped
- **plain** — ASCII (last-resort fallback)
- **stacked** — combined-mark forms (ḗ, ṓ) where the Greek original supports
  them, via the existing `deriveStackedForm()` engine

Binding rules (unchanged from ACCURACY.md / AGENTS.md): a circumflex counts as
both stress and length; **wrong accent position is worse than none** — derived
forms never move stress; all forms NFC-normalized; punycode computed, never
hand-typed.

## Data model — generated, never stored counts

Canonical source (hand-edited, flywheel rules apply):

- `type/js/lexicon.js` → `entry.variants[]`: `{ unicode, type, note, sources? }`.
  Only grows via scholarship: manual review, or the authoritative import
  framework (`data/authoritative/` → `scripts/import-runner.js` →
  `scripts/apply-suggestions.js`). Currently 115 entries carry variants.

Generated artifact (new):

- `scripts/generate-variants.js` → `data/variants.json` (+ a copy under
  `platform/api/` if handler bundling requires it), modeled on
  `scripts/generate-similarities.js`. Per entry:

```jsonc
{
  "id": "apollon",
  "canonical": "Apóllōn",
  "attestedCount": 2,           // computed from sourced forms only
  "forms": [
    {
      "form": "Apóllōn",
      "class": "attested",
      "relation": "canonical",
      "features": ["stress", "vowel length"],
      "sources": ["LSJ"],
      "punycode": "xn--aplln-5qae.com",
      "owned": true               // annotation only, never a gate
    },
    {
      "form": "Apollōn",
      "class": "attested",
      "relation": "length-only",
      "features": ["vowel length"],
      "sources": ["owned registration"],
      "punycode": "xn--aplln-1ta64d.com",
      "owned": true
    },
    { "form": "Apóllōn", "class": "derived", "relation": "stress-only", "features": ["stress"] },
    { "form": "Apollon",  "class": "derived", "relation": "plain", "features": [] }
  ]
}
```

**Hard rule: no stored counts on the lexicon entry.** `attestedCount`,
`derivedCount`, variant lists — all computed at generate time. The moment a
count is stored by hand it drifts; drift is what made the tier system
unmaintainable (see `archive/tier-system/README.md` → "Why it was removed").

`owned` is resolved against `platform/db/owned-domains.json` + archetype
domain sets at generate time — the same derivation the flywheel already uses.

## API contracts (knowledge-first)

Ownership is an **annotation**, not a filter — this is a knowledge endpoint,
not a domain-sales endpoint.

- `GET /api/v1/names/:id/variants` — upgrade the existing handler
  (`platform/api-handlers/v1/names/[id]/variants.js`) to return the full
  computed set: all classes, sources per attested form, `owned` flags.
  Response shape: `{ canonical, attestedCount, forms: [...] }`.
- `GET /api/v2/names/:id` (subresource `variants`) — mirrors v1.
- `?class=attested|derived|convention` — optional filter; default returns all.
- No write endpoints. Variants are canonical-source data; changes go through
  the lexicon + generate, per the flywheel.
- Rate-limit tier: free (read-only scholarly data, same as name detail).

## Where it surfaces

- **Temples — "Name Variations" section**: the full attested family. Owned
  forms highlighted; unattested-*attested* forms shown as knowledge ("LSJ
  also gives Apollōn"); derived forms in a clearly-labeled "systematic
  derivations" subsection. Replaces the current owned-forms-only rendering.
- **Type tool**: "Scholarly Variants" already keys off `sources`; it becomes
  the richest client of the new data (live derivation + attestation badges).
- **Count display**: "N attested forms of this name" — driven by
  **attested** count, never by ownership. ("We own 2 of them" remains a
  separate display fact where relevant to leasing.)
- **Search**: a `hasVariants` browse signal is possible later; do not add a
  variant-text filter until the corpus stabilizes.
- **AI corpus**: `generate-synthetic-qa.js` gains a variant family that
  *teaches the attested-vs-derived distinction* — a model that knows
  "Apollōn (length-only) is the LSJ convention form; Apóllōn (stress-only) is
  a systematic subset, not a citation" is genuinely more useful.

## Sequencing

1. **Phase 0 — prerequisite**: tier removal ships (this migration).
2. **Phase 1 — mechanics**: `generate-variants.js` emitting `derived` forms
   only (NFD subsetting + `deriveStackedForm` + punycode) + API shape +
   contracts tests. Zero scholarly risk — pure computation over the canonical
   lexicon. Validator: every derived form must round-trip (NFC) and never
   equal the canonical form.
3. **Phase 2 — attestation**: grow sourced variants via the authoritative
   import framework (LSJ/Perseus/Wikidata batches, applied with review).
   The count becomes meaningful name by name; temple rendering upgrade ships
   here, once there is real attestation depth to show.
4. **Phase 3 — conventions**: per-pantheon transliteration convention tables,
   biggest pantheons first (Egyptian, Akkadian, Sanskrit, then CJK
   romanizations). Each convention engine ships with its own validator suite.

Each phase: canonical change → `npm run generate` → `npm test` → deploy.

## Open questions

- **Attestation granularity**: is an owned registration itself an attestation
  source, or only evidence of *our* usage? (Leaning: list it as a source but
  weight scholarly sources first in any future ranking.)
- **Convention depth**: how many conventions per pantheon? Start with the two
  most-used romanizations and expand on demand.
- **Reverse lookup**: `GET /api/v1/variants/:form` (which entries admit this
  spelling?) is cheap to add from the same JSON — defer until a client asks.
- **Variant graphs**: two names sharing an attested form (syncretism across
  scripts, e.g. Greek Αἴγυπτος / Egyptian variants) — relationship to the
  existing `similarities.json` graph is undefined; likely a `sharedForms`
  edge type, Phase 3+.

## Relation to neighboring systems

- **Tier system (retired)**: no `tier` fields are reintroduced anywhere.
  This plan is the replacement's positive half — what a name *has* — where
  `preservedFeatures()` is what a *form* shows.
- **Owned forms / multi-form**: ownership stays a display fact on temples
  and an annotation in the API; it never gates knowledge.
- **Appraisal**: a future input at most (attestation depth as a demand
  signal). Not in Phase 1–2.

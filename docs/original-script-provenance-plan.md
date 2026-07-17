# PUNICODEX — Original Script Provenance Overhaul Plan

## 0. Executive Summary / Diagnosis

The current "Original Script Provenance" panel on flagship temple lore pages is under-built:

- **56 of 123 built flagships have no provenance section at all.**
  - All Greek entries (Olympian, Titan, Chthonic, Greek locations): the section is omitted because the legacy `greek` field supplies a Greek glyph, but no curated provenance exists.
  - All Japanese (`kobe`, `kyoto`, `osaka`, `nikko`), Chinese (`long`, `taichi`, `bagua`, `wuxing`), Taoist (`yinyang`, `wuji`), Incan (`trengtreng`), Nahuatl (`quetzalcoatl`), and `medousa`.
- **67 flagships that do have provenance are mostly templated and shallow.**
  - Norse entries reuse the same three rune-descriptions plus a generic "normalized phonetic reconstruction" sentence.
  - Sanskrit/Buddhist entries share a single auto-generated paragraph.
  - Egyptian entries list signs but lack Gardiner codes, determinative explanation, MdC source, Coptic vocalisation path, and variant spellings.
  - Mesopotamian, Canaanite, Phoenician, Abrahamic, and Avestan entries are formulaic and lack per-name philological depth.
- **The UI is a hidden collapsible with no dedicated styling.** There is no large script specimen, no sign-by-sign breakdown, no etymology, no transmission diagram, and no uncertainty markers.

The result is that the lore pages feel generic where they should feel authoritative and bespoke.

## 1. Goal

Every flagship temple lore page must contain a visible, beautifully designed, philologically defensible **Original Script & Provenance** section that:

1. Displays the actual indigenous script specimen at a readable size.
2. Walks the reader sign-by-sign, syllable-by-syllable, or character-by-character through the writing.
3. Explains the full chain: **Original Script → Transliteration → Unicode Restoration → Punycode → ASCII**, including what is lost or preserved at each step.
4. Provides etymology, attestation, regional/period context, and known variants.
5. Cites canonical sources from the hierarchy defined in `ACCURACY.md`.
6. Honestly flags reconstructions, uncertain vocalisations, and registrability compromises.
7. Adapts its presentation to the writing system (hieroglyphs, cuneiform, runes, Greek, Devanagari, CJK, Hebrew, Avestan, Phoenician, Ugaritic, or scriptless traditions).

## 2. Enriched Provenance Schema

Extend the provenance object used by `type/js/original-scripts.js` and `type/js/original-scripts-extra.json` (and optionally the lexicon itself) to the following shape:

```ts
interface Provenance {
  // Identity
  scriptSpecimen: string;           // the actual Unicode glyphs
  scriptName: string;               // e.g. "Hieroglyphs", "Younger Futhark"
  scriptFamily?: string;            // e.g. "Egyptian hieroglyphic", "Germanic runic"
  writingDirection?: string;        // e.g. "right-to-left", "boustrophedon"
  timePeriod?: string;              // e.g. "Middle Egyptian, c. 2000 BCE"
  region?: string;                  // e.g. "Memphis / Heliopolis"

  // Reading
  transliteration: string;          // primary scholarly transliteration
  transliterationScheme?: string;   // e.g. "MdC", "IAST", "normalized Old Norse"
  normalizedReading?: string;       // vocalised where defensible
  phoneticReconstruction?: string;  // IPA when available

  // Atomic breakdown
  signs?: Sign[];                   // one per meaningful unit

  // Narrative
  steps?: string[];                 // short human-readable steps
  etymology?: string;               // meaning and derivation
  semantics?: string;               // what the name denotes in its tradition

  // Scholarly context
  variants?: Variant[];             // alternate spellings/accents
  attestations?: Attestation[];     // inscription/text citations
  uncertainties?: string[];         // honest caveats

  // DNS / Unicode bridge
  dnsNotes?: string;                // why this form was chosen as the IDN
  punycodeReflection?: string;      // how the original maps to the domain

  // Sources
  sources?: Source[];               // structured citations
  editorsNote?: string;             // curator commentary
  curationDate?: string;            // ISO date
  reviewStatus?: 'draft' | 'reviewed' | 'canonical';
}

interface Sign {
  sign: string;                     // Unicode glyph
  name?: string;                    // e.g. "G1 vulture"
  value?: string;                   // phonetic/logographic value
  function?: 'logogram' | 'phonogram' | 'determinative' | 'ideogram' | 'syllable' | 'letter' | 'radical';
  gardinerCode?: string;            // Egyptian
  mdCode?: string;                  // MdC code for hieroglyphs
  unicode?: string;                 // code point label, e.g. U+13000
  reading?: string;                 // e.g. "ra"
  note?: string;                    // bespoke note for this sign
}

interface Variant {
  form: string;
  context: string;                  // e.g. "Late Period spelling"
  source?: string;
}

interface Attestation {
  text: string;
  date?: string;
  location?: string;
  reference: string;
}

interface Source {
  title: string;
  author?: string;
  year?: string;
  pages?: string;
  url?: string;
  tier: 1 | 2 | 3;                  // matches ACCURACY.md hierarchy
}
```

### Per-tradition required fields

| Tradition | Required enrichments |
|-----------|----------------------|
| **Greek** | Original Greek form with accentuation, dialect/epic variants, etymology (PIE root where known), LSJ/Beekes citation, accent rule explanation. |
| **Egyptian** | MdC source string, Gardiner codes for every sign, determinative function, Coptic/Demotic vocalisation pathway, Faulkner/Wb reference, variant spellings. |
| **Norse** | Rune names and values, Proto-Norse or normalized Old Norse reconstruction, attestation in runic corpus or Eddic source, etymology, dialect notes. |
| **Sanskrit / Buddhist** | Devanagari specimen, IAST syllable breakdown, sandhi notes where relevant, MW/Apte reference, Vedic vs Classical distinction. |
| **Mesopotamian** | Sign values (Sumerogram/Akkadian), divine determinative explanation, CAD/ETCSL reference, period (Sumerian/Akkadian/Babylonian). |
| **Canaanite / Phoenician / Ugaritic** | Alphabetic sign values, ʿayin/aleph handling, KTU/CIS/KAI references, cognate forms. |
| **Avestan / Zoroastrian** | Avestan letter values, Bartholomae/Gathas reference, Old Persian parallel where relevant. |
| **Abrahamic (Hebrew)** | Biblical Hebrew spelling with cantillation/Masoretic notes, BHS/HALOT/TDOT references, etymology. |
| **CJK** | Hanzi/kanji form, on/kun or Mandarin readings, traditional/simplified variants, Unihan/Baxter-Sagart references, Joyō status. |
| **Scriptless** | Language family, why no indigenous script exists, modern orthographic conventions, honest "scholarly transliteration" label. |

## 3. Content Acquisition Strategy

The work is philological, not purely technical. Proposed sources and methods:

1. **Authoritative importers (existing framework)**
   - Greek: Perseus/LSJ, Beekes Etymological Dictionary.
   - CJK: Unihan Database, Kanjidic, Joyō tables, Baxter-Sagart.
   - Hebrew: Sefaria, BHS, HALOT.
   - Egyptian: Faulkner, Wörterbuch, Wikipedia `hiero` fields as a cross-check only.
   - Norse: Runic dictionary extracts, Zoëga, Cleasby-Vigfusson.
   - Sanskrit: Monier-Williams, Macdonell.
   - Mesopotamian: ETCSL, CAD, Oracc.

2. **Manual curation by tradition**
   - Each entry needs a human reviewer who can confirm sign values, vocalisations, and source citations.
   - Use `scripts/apply-suggestions.js` to apply importer output; never let importers mutate canonical sources directly.

3. **Script-specific tooling**
   - Egyptian: already have `.venv_hieropy` for MdC→Unicode; extend to capture MdC and Gardiner codes.
   - Cuneiform: build a small sign-value lookup from Oracc/ETCSL.
   - Runes: map rune Unicode → name → phonetic value via a curated table.
   - Greek: parse accentuation and provide accent-rule explanation.
   - Devanagari: already generated from IAST; add syllabic breakdown.
   - CJK: read Unihan `kDefinition`, `kMandarin`, `kJapaneseOn`, `kJapaneseKun`.

## 4. UI / UX Redesign

Replace the current hidden collapsible with a full **Script Altar** section.

### Layout (desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  02 — Original Script & Provenance                              │
│  How {Unicode} travels from ancient script to the modern URL   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           [ LARGE SCRIPT SPECIMEN ]                             │
│              ᛞᛟᛗᚨᛁᚾ                                          │
│           Transliteration: domain                               │
│           Reconstruction: /ˈdoːmɑin/                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Sign-by-sign                                                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│  │ ᛞ  │ │ ᛟ  │ │ ᛗ  │ │ ᚨ  │ │ ᛁ  │ │ ᚾ  │                  │
│  │ d  │ │ o  │ │ m  │ │ a  │ │ i  │ │ n  │                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
├─────────────────────────────────────────────────────────────────┤
│  [Reading] [Etymology] [Variants] [Attestations] [Sources]     │
│                                                                 │
│  Transmission chain:                                            │
│  Original → Transliteration → Unicode → Punycode → ASCII        │
│  (what is preserved / what is lost at each step)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **Specimen Hero**
   - Large, centered indigenous script at `clamp(2.5rem, 8vw, 6rem)`.
   - Subtitle with transliteration, phonetic reconstruction, and script name.
   - Gentle glow matching the temple's palette.

2. **Sign / Syllable / Character Grid**
   - Each unit as a card: glyph, name, value/function, code point (where useful), bespoke note.
   - For logographic scripts, distinguish phonograms from determinatives.
   - For abjads/alphabets, show letter name and sound.
   - For CJK, show radical/stroke info and readings.

3. **Transmission Chain**
   - A horizontal or vertical diagram showing:
     - **Original Script** — full philological form.
     - **Transliteration** — Latin scholarly form.
     - **Unicode Restoration** — registrable domain form.
     - **Punycode** — DNS encoding.
     - **ASCII** — flattened fallback.
   - Annotate what survives and what is sacrificed at each transition.

4. **Tabbed Scholarly Content**
   - **Reading**: how the name is read, accent rules, vowel length.
   - **Etymology**: root, meaning, cognates.
   - **Variants**: attested alternate spellings, dialect forms, historical changes.
   - **Attestations**: primary-source citations with dates/locations.
   - **Sources**: tiered bibliography with links where available.

5. **Uncertainty & DNS Notes**
   - For reconstructions: "Vocalisation is uncertain; the Unicode form preserves the consonantal skeleton."
   - For IDN choice: "The macron-only form was chosen because the combined-acute-macron glyph is not registrable in .com."

6. **Scriptless Honest Panel**
   - For Celtic, Nahuatl, Yoruba, Polynesian, Slavic, Incan, Korean (per `SCRIPTLESS_PANTHEONS`):
     - Explain that no indigenous per-name script is securely attested.
     - Show the scholarly transliteration and the modern orthographic conventions used.
     - Reference academic grammars and dictionaries.

### Responsive Behaviour

- On mobile, the specimen scales down; sign grid becomes 2–3 columns; tabs become an accordion.
- Maintain accessibility: each sign card has `aria-label`, focus states, and prefers-reduced-motion fallbacks.

## 5. Template & Generator Changes

1. **Data layer**
   - Extend `type/js/original-scripts.js` to expose new helpers: `getProvenance`, `getSigns`, `getAttestations`, `getSources`.
   - Add new fields to `type/js/original-scripts-extra.json` for non-Greek/CJK traditions.
   - For Greek/CJK, add provenance directly in `type/js/lexicon.js` or a new canonical file `type/js/greek-provenance.json` / `type/js/cjk-provenance.json`.

2. **Generator**
   - Refactor `scripts/create-flagship.js`:
     - Replace `buildOriginalScriptProvenanceSection()` with a call to a new partial/template.
     - Consume the enriched schema; provide graceful fallback to the old schema during migration.
     - Emit a placeholder panel for entries not yet curated, inviting contribution via `/scholars/`.
   - Create `templates/flagship/partials/original-script-provenance.html` as the single source of truth for the component markup.

3. **Styling**
   - Add a dedicated stylesheet partial or extend `css/temple-base.css` with `.section-provenance`, `.script-specimen`, `.sign-grid`, `.transmission-chain`, `.provenance-tabs`.
   - Add webfont fallbacks for rare scripts (Noto Sans Egyptian Hieroglyphs, Noto Sans Cuneiform, Noto Sans Avestan, Noto Sans Runic, Noto Serif Devanagari, Noto CJK).

4. **Integration**
   - Update `scripts/generate-temples.js` if base temples also need the section.
   - Update `scripts/sync-shared-lexicon.js` if provenance needs to travel to mobile/extension.

## 6. Validation, Testing & Quality Gates

Add a new validator, `scripts/validate-provenance.js`, called as part of `npm test`:

- Every built flagship must have a provenance object.
- Required fields must be present per pantheon.
- `sources` must contain at least one Tier-1 source or a reviewed importer provenance.
- `originalScript` must be renderable and within expected Unicode blocks.
- Egyptian hieroglyphs must not contain format-control characters.
- Sign count must be consistent with the specimen where the script is segmentable.
- No placeholder text ("Lorem ipsum", "undefined", "TODO").
- No generic template text duplicated across more than N entries (detect boilerplate).

Add unit tests:

- Sample flagships (one per tradition) produce valid provenance HTML.
- Transmission chain contains all five stages.
- Greek accent explanation matches the tier rule.
- Egyptian MdC round-trips to the displayed glyphs.
- Devanagari converter output matches enriched sign breakdown.

Add CI gate:

- `npm run generate:check` already catches drift; extend it to fail if provenance data changes are not committed.

## 7. Rollout Phases

### Phase A — Infrastructure (1–2 days)
- Finalise schema.
- Build partial template, CSS, and generator changes.
- Add validator scaffold (lenient at first).
- Generate a pilot set: `zeus`, `ra`, `thor`, `shiva`, `amaterasu`, `long`.

### Phase B — Pilot Content (2–3 days)
- Curate 6–10 flagship entries across all major script families.
- Refine UI based on visual review.
- Harden validator rules.

### Phase C — Bulk Curation (parallel work, several weeks)
- Greek Olympians + Titans + Chthonic (38 entries).
- Egyptian major gods + concepts (already have base; enrich).
- Norse major gods + realms (enrich templated entries).
- Sanskrit/Buddhist major deities (enrich auto-generated entries).
- Mesopotamian, Canaanite, Phoenician, Abrahamic, Avestan (enrich).
- CJK locations/concepts (8 entries).
- Scriptless entries with honest panels (3 entries).

### Phase D — Validation & Deployment (1–2 days)
- Run full test suite and provenance validator.
- Run `npm run generate` and `npm run generate:check`.
- Commit, push, and deploy to production.
- Spot-check live pages on mobile and desktop.

## 8. Effort Estimate

| Area | Effort |
|------|--------|
| Schema, template, CSS, generator | 1–2 dev days |
| Pilot curation (6–10 entries) | 2–3 days |
| Bulk curation (≈123 entries) | 200–400 hours of philological work |
| Validator + tests | 1–2 dev days |
| Review & deploy | 1 day |

**Total:** several weeks of focused work, with the content curation being the dominant cost. Parallelising by tradition across subject-matter contributors is strongly recommended.

## 9. Immediate Next Steps

1. **Approve this plan** and the proposed schema.
2. **Choose the pilot entries** (suggestion: `zeus`, `ra`, `thor`, `shiva`, `amaterasu`, `long`, `anubis`, `david`).
3. **Confirm source access**: do you have subscriptions or API keys for LSJ/Perseus, HALOT, CAD, etc.?
4. **Assign curators** per tradition or grant agent access to run authoritative importers.
5. I will then implement Phase A and the pilot entries, open a preview deployment, and iterate before scaling to all 123.

---

*Prepared for PUNICODEX. Follows `ACCURACY.md` source hierarchy and `AGENTS.md` generated-output workflow.*

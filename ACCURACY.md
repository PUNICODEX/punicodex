# PUNYCODEX Accuracy Control Manual

This document is the authoritative standard for the philological and technical
accuracy of every entry in the PUNYCODEX lexicon. It exists so that future
edits — whether made by humans or agents — are transparent, defensible, and
verifiable.

> **Scope:** Every `unicode` restoration, `originalScript` value, character
> `breakdown`, and generated temple page must conform to this manual.

---

## 1. Source Hierarchy

Use the highest available source for each tradition. Lower tiers may be used
for cross-checking, but they do not override a higher tier.

| Pantheon / Tradition | Tier 1 (canonical) | Tier 2 (scholarly) | Tier 3 (reference / cross-check) |
|---|---|---|---|
| Greek & Greek locations | LSJ, Pape-Benseler, Beekes Etymological Dictionary | Liddell-Scott-Jones supplements, DGE | Wikipedia infobox, Wiktionary Ancient Greek |
| Egyptian | Faulkner, *A Concise Dictionary of Middle Egyptian*; Wörterbuch (Wb) | Allen, *Middle Egyptian*; Hoch, *Semitic Words in Egyptian Texts* | English Wiktionary Egyptian section; Wikipedia `hiero` field |
| Mesopotamian | Chicago Assyrian Dictionary (CAD); ETCSL | George, *House Most High*; Black & Green | Oracc sign lists |
| Ugaritic / Canaanite / Phoenician | KTU (Ugaritic texts); CIS / KAI | Smith, *The Ugaritic Baal Cycle*; Day, *Yahweh and the Gods and Goddesses of Canaan* | Wiktionary Semitic entries |
| Norse | Zoëga, *A Concise Dictionary of Old Icelandic*; Cleasby & Vigfusson | EDPG (Proto-Germanic) | Wiktionary Old Norse |
| Sanskrit / Buddhist | Monier-Williams; Macdonell, *Sanskrit Grammar for Students* | Apte; MW supplements | IAST→Devanagari internal converter |
| Chinese / Taoist | Unihan Database; Hanyu Da Zidian | Baxter-Sagart | Wiktionary Chinese |
| Japanese | Unihan / Joyō tables | Hepburn romanisation standards | Wiktionary Japanese |
| Korean | Korean Standard Dictionary | Revised Romanisation | Wiktionary Korean |
| Celtic, Slavic, Nahuatl, Yoruba, Polynesian, Incan | Academic grammars and dictionaries for the relevant language | Ethnologue, Glottolog | Wiktionary, encyclopedic sources |
| Zoroastrian | Avestan dictionaries (Bartholomae) | Old Persian corpora | Encyclopaedia Iranica |

**Rule:** If a Tier 1 source contradicts a Tier 3 source, the Tier 1 source
wins. Any override must be recorded in the entry’s provenance.

---

## 2. Before Adding or Changing Any Entry

Every change to `type/js/lexicon.js`, `type/js/original-scripts-extra.json`, or
any generated temple must pass the following review.

1. **Confirm the name belongs in the canon.** It must be a theonym, mythic
   figure, mythic location, or culturally significant term already attested in
   the relevant tradition.
2. **Fix the pantheon and tier.** Follow the canonical tier rules documented
   in `AGENTS.md`. Never flatten a dual-tier name or dual-tier a single-tier
   name.
3. **Reconstruct the `unicode` form from the source.** Prefer the most
   accurate, registrable Latin-with-diacritics representation. Do not invent
   macrons or accents that are not supported by the source.
4. **Add or verify the `originalScript`.** See Section 3.
5. **Build a character `breakdown`.** Every ASCII→Unicode transformation must
   be explicit (`same`, `drop`, `special`, `macron`, `accent`). Do not use
   `special` to hide an unmapped change.
6. **Check punycode registrability.** See Section 4.
7. **Run the full test suite.** `npm test` must pass before any commit.
8. **Regenerate derived artefacts.** See Section 5.

---

## 3. Original-Script Verification Procedure

### 3.1 General Rules

- The `originalScript` field must contain the actual indigenous writing of the
  name when it is securely attested. It must **not** contain a Greek or Latin
  transliteration, nor an emoji-style approximation.
- If no indigenous script is securely attested for individual names in a
  tradition (e.g., Celtic, Nahuatl, Yoruba), the entry remains honest about
  being a scholarly transliteration. Do not fabricate glyphs.
- When a script can be algorithmically derived from the `unicode` field
  (Sanskrit/Buddhist Devanagari, CJK characters), use the existing converters
  in `type/js/original-scripts.js` rather than hard-coding unless a special
  exception is required.

### 3.2 Egyptian Hieroglyphs

1. **Locate the standard spelling.** Primary: Faulkner / Wb. Secondary:
   English Wiktionary Egyptian section or Wikipedia infobox `hiero` field.
2. **Obtain the MdC code.** Copy the Manuel de Codage string from the source.
3. **Convert with `hieropy`.**
   ```powershell
   .venv_hieropy\Scripts\python -c "from hieropy import MdcUniConverter; print(''.join(str(f) for f in MdcUniConverter().convert('r:a-ra')))"
   ```
4. **Strip formatting controls.** The Egyptian Hieroglyph Format Controls
   block (`U+13430`–`U+1343F`) is used by `hieropy` for layout grouping. These
   characters must be removed from the stored `originalScript` because they
   are invisible controls, not display glyphs.
   ```python
   controls = set(range(0x13430, 0x13440))
   clean = ''.join(ch for ch in raw if ord(ch) not in controls)
   ```
5. **Verify code-point range.** All stored hieroglyphs must fall within
   `U+13000`–`U+1342F` (Egyptian Hieroglyphs) unless an Extended-A sign is
   explicitly justified by the source. Prefer main-block equivalents when
   available (e.g., `G16` instead of `G16A`).
6. **Record provenance.** Every Egyptian entry with an original script must
   have a `provenance` object listing:
   - the hieroglyphic spelling;
   - the transliteration;
   - a short step-by-step explanation;
   - canonical sources (Faulkner, Wb, Allen).

### 3.3 Cuneiform

- Use standard Neo-Assyrian / Sumerian sign values from the CAD or ETCSL.
- Always include the divine determinative `𒀭` when the source does.
- For logograms, note the Sumerogram reading in the provenance.

### 3.4 Greek

- Use the original Greek form as the `greek` field; do not invent accents.
- If a name has multiple attested accentuations, follow the dual-tier rules in
  `AGENTS.md`.

---

## 4. Punycode Validation

Every `unicode` restoration must be registrable as an IDN in the project’s
target TLDs (primarily `.com`).

1. **Convert to Punycode.** Use Node’s built-in `punycode` module or
   `new URL('https://' + unicode).hostname`.
2. **Check for `xn--`.** If the result does not begin with `xn--`, the string
   contains characters that are not IDNA2008 valid for DNS.
3. **Check output length.** Must be ≤ 63 characters between dots.
4. **Reject visually confusable ASCII.** Do not register lookalikes.
5. **Prefer combined marks only when registrable.** Combined diacritics are
   philologically ideal but often untypeable on phones and sometimes rejected
   by registries. Follow the fallback hierarchy in `AGENTS.md`.

Quick check script:

```js
const punycode = require('punycode');
const ascii = punycode.toASCII('Apóllōn'); // xn--aplln-8uaa6d
```

---

## 5. Deployment Checklist

After any lexicon, script, or template change:

- [ ] `npm test` passes all suites.
- [ ] If `type/js/lexicon.js` changed, run `node scripts/generate-temples.js`.
- [ ] If `type/js/lexicon.js` or `type/js/original-scripts-extra.json` changed,
      run `node platform/db/init.js`.
- [ ] If any flagship entry was affected, run `node scripts/create-flagship.js <id>`.
- [ ] Run `npm test` again after regeneration.
- [ ] Validate `vercel.json` structure (no duplicate keys; see `AGENTS.md`).
- [ ] Commit the lexicon, `original-scripts-extra.json`, generated temples, and
      database together. Keep the audit trail in the commit message.
- [ ] Deploy. Verify a sample of affected temple pages renders the new
      original script correctly.

---

## 6. Known Exceptions and Pending Work

The following Egyptian entries do **not** yet have a verified hieroglyphic
original script because their attestation is ambiguous, syncretic, or
post-Pharaonic. They display a scholarly transliteration until a defensible
spelling is identified:

- `sia` — abstract concept; no secure single hieroglyphic spelling.
- `aaru` — mythic location; orthographies vary (`Ꜥꜣrw`, `iꜣrw`).
- `maatka` — compound theological term.
- `henkhisesui` — obscure compound.
- `karnak`, `luxor` — place names often written in later scripts.
- `kebechet` — minor goddess; sources disagree on spelling.
- `serapis`, `harpokrates`, `onuris` — Greco-Egyptian syncretisms whose primary
  attestation is Greek; original Egyptian forms require extra review.

Any future addition of original scripts for these entries must include the
source citation and pass the procedure in Section 3.

---

## 7. Change Log

| Date | Change |
|---|---|
| 2026-06-14 | Egyptian audit: corrected original scripts/provenance for `ra`, `bastet`, `nephthys`, `set`; added verified original scripts for 30 previously missing Egyptian entries; fixed `tefnut` unicode `Tfnwt` → `Tfnt` and breakdown; regenerated 778 base temples and rebuilt SQLite database with migrations. |

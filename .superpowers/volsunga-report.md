# Vǫlsunga Saga — Sacred Texts addition (commit 4d0d52eb)

## Source provenance

- **Work**: Vǫlsunga saga, in William Morris & Eiríkr Magnússon's translation,
  *The Story of the Volsungs and Niblungs, with certain Songs from the Elder
  Edda* (first published 1870; the transcription follows the Walter Scott
  Press, London, 1888 printing).
- **File used**: Project Gutenberg eBook **#1152**, UTF-8 plain text. The main
  gutenberg.org endpoints returned 504s during the session; the byte-identical
  file was fetched from the official mirror
  `https://gutenberg.pglaf.org/1/1/5/1152/1152-0.txt` (cross-checked against
  `mirror.serv.ch`, same 330,843 bytes). Translators verified in-file:
  "translated by William Morris and Eirikr Magnusson (Walter Scott Press,
  London, 1888)" and the signed "WILLIAM MORRIS and EIRIKR MAGNUSSON." at the
  close of the introduction.
- **License**: public domain (Gutenberg `copyright: false`).
- **Raw saved**: `platform/texts/volsunga-saga/src/eng-raw.txt` — Gutenberg
  transcriber front-matter (D. B. Killings note + bibliography) and license
  boilerplate stripped; translators' introduction, saga proper (chapters
  I–XLIII) and the Poetic Edda appendix preserved verbatim; CRLF → LF.
  A provenance header sits at the top of the file.
- **Corpus**: `platform/texts/volsunga-saga/eng.json` contains only the 43
  saga chapters (introduction and appendix are *not* sections). Morris's prose
  is verbatim: prose paragraphs re-wrapped, verse blocks kept line-by-line,
  per-chapter ENDNOTES retained as an "Endnotes:" paragraph series.
  One documented normalization: chapter XXXI's heading in the Gutenberg
  transcription reads "as it is told told in ancient Songs" (duplication);
  the display title uses the printed reading "as it is told in ancient Songs"
  (raw file untouched).
- Build script committed for reproducibility: `tools/build-volsunga-corpus.js`.

## Chapter map (43 sections, ids ch-01 … ch-43)

Titles follow Morris's headings ("Chapter I: Of Sigi, the Son of Odin" …
"Chapter XLIII: The Latter End of all the Kin of the Giukings"). Chapter XXII's
trailing footnote marker "(1)" is dropped from the display title; its endnote
is preserved in the chapter text. Section sizes 695–10,948 chars; the corpus
validator (`scripts/lib/chapter-corpus.js`) passes.

## xref forms verified (capitalized whole-word attestations in the corpus)

Linked (all **built flagships**, as `test/texts-chapters.test.js` requires):

| temple | form | occurrences | context |
|--------|------|-------------|---------|
| odinn | Odin | 17 | ch. I, II, XI, XIV, … (Sigi's father; the sword in the Branstock; Sigmund's last battle; the otter ransom) |
| tyr | Tyr | 1 | ch. XX — Brynhild's rune counsel: "Twice name Tyr therein" |
| helheimr | Hell | 1 | ch. XVIII — Sigurd's curse on Fáfnir: "till Death and Hell have thee" (same mapping precedent as prose-edda's Hel → helheimr) |
| ragnarok | Ragnarok | 1 | ch. XIV endnote: "Surt … will destroy the world at the Ragnarok" |

Verified but **NOT linked** (lexicon entries exist but are not built
flagships — the chapters test asserts `BUILT.has(link.temple)` and the
mention-card template stamps a "Flagship" badge):

| form | occurrences | lexicon id |
|------|-------------|------------|
| Sigurd | 212 | sigurd |
| Fafnir | 26 | fafnir |
| Regin | 40 | reginn |
| Brynhild | 83 | brynhildr |
| Loki | 5 | loki |
| Andvari | 2 | andvari |
| Gudrun 102, Sigmund 84, Signy 25, Sinfjotli 27, Gunnar 74, Hogni 44, Atli 51, Grimhild 18 | — | **no lexicon entries exist** for these ids |
| Freyia (1), Aegir (1), Ran (2), Mimir (1) | — | freyja / aegir / ran / mimir exist, not flagships |

Not attested in the saga proper (checked, zero capitalized whole-word hits):
Thor, Balder/Baldr, Njord, Frey/Freyr, Frigg, Heimdall, Hermod, Vali, Buri,
Asgard, Midgard, Jotunheim. (Hermod/Hel-realm material sits in the excluded
appendix.) "Skadi" appears 4× but is a *man* in this saga — a different
figure from Skaði; correctly unlinked.

## Registry & counts

- `platform/texts/registry.json`: `volsunga-saga` inserted after `prose-edda`
  (Norse cluster): titleNative "Vǫlsunga saga", author "Anonymous (Icelandic)",
  composed "c. 1270", language "non", sectionCount 43, one edition
  (Morris & Magnússon 1870, PG #1152, Public domain).
- `test/texts-chapters.test.js`: 21→22 texts, 20→21 chaptered texts, index
  count assertion 21→22. No other repo file pins the count (generator derives
  it from the registry).
- `sitemap.xml` regenerated via `node scripts/gen-sitemap.js`
  (registry-driven; +1 URL entry).

## Temple back-links

There is no per-text form table in `scripts/generate-text-pages.js` for
chapters texts — the Theogony `XREF` table there is Greek-only. The chapters
mechanism is the per-text `xref.json` (built here), and the temple-side
back-link band is produced by `create-flagship.js`'s `TEXTS_XREF_MAP`, which
inverts every text's `xref.json` automatically. Verified with the same
inversion logic: odinn, tyr, helheimr and ragnarok now map to volsunga-saga,
so their lore pages ("In the Texts" band, alongside the existing Poetic Edda /
Prose Edda badges on e.g. `sites/odinn/lore/`) will carry the **Völsunga
Saga** badge after the controller's `npm run generate` re-renders flagships.
(A lone `create-flagship.js <id>` run was tested on odinn and **reverted** —
it strips the post-pipeline analytics/beacon/cookie injections that the full
generate re-applies; single-temple regeneration must not ship without the
full pipeline.)

## Test results (all run locally, 2026-08-21)

- `node --test test/texts-chapters.test.js test/texts-section.test.js` —
  **green** (8/8 texts-chapters, 18/18 texts-section; includes generator
  idempotency).
- `node --test test/links.js` — **green** (61s).
- Biome: `test/texts-chapters.test.js` format+lint clean;
  `tools/build-volsunga-corpus.js` is outside biome coverage (tools/ ignored
  by config). All JSON parsed and byte-stable (`JSON.stringify(x, null, 2)` +
  trailing newline, matching `writeByteStable`).
- `node scripts/generate-text-pages.js` — 23 pages; volsunga-saga page has
  43 TOC anchors, chips resolve, JSON-LD `@type: Book`, native title, Morris
  & Magnússon attribution.
- `npm run generate` / `npm test` deliberately **not** run (controller's job).

## Concerns / follow-ups

1. **sigurðr.com / fáfnir.com are not yet flagships.** Neither
   `js/archetypes-v2.js` nor `platform/db/owned-domains.json` mentions them;
   `sites/sigurd/` and `sites/fafnir/` are base temples. The chapters-test
   contract (built flagships only) made linking them impossible in this
   commit. Once promoted (`node scripts/promote-to-flagship.js sigurd
   --domain sigurðr.com` etc.), add the verified forms above to
   `platform/texts/volsunga-saga/xref.json` — Sigurd (212×), Fafnir (26×),
   Regin (40×), Brynhild (83×), Loki (5×), Andvari (2×) are ready to drop in.
2. The "Mentioned in this text" card template hardcodes a "Flagship" badge,
   so even after promotion of sigurd/fafnir, reginn/brynhildr/loki/andvari
   would need their own promotions (or a template nuance) to be linkable.
3. `texts-section.test.js`'s sitemap assertion only pins theogony; the new
   sitemap entry is registry-driven and covered by the divergence gate.

# Avesta corpus — source audit trail

The corpus (`../eng.json`) is built from two public-domain Sacred Books of the
East translations:

- **SBE vol. 23 — "The Zend-Avesta, Part II (The Sîrôzahs, Yaṣts and Nyâyiṣ)",
  tr. James Darmesteter (1883)** — the ten Yasht sections.
- **SBE vol. 31 — "The Zend-Avesta, Part III (The Yasna, Visparad, Âfrînagân,
  Gâhs, and Miscellaneous Fragments)", tr. L. H. Mills (1887)** — the twelve
  Yasna chapter-group sections (the complete Yasna, I–LXXII, in Mills' print
  order; the Gâthas are printed by Mills before the rest of the Yasna, with
  Y. XXIX placed before Y. XXVIII).

Project Gutenberg does not host these SBE volumes (searched 2026-07-27), and
the archive.org scans are OCR-corrupt exactly on the diacritic name forms this
corpus must preserve (e.g. "Haurvata/" for Haurvatâṭ). The text was therefore
taken from the Internet Sacred Text Archive (sacred-texts.com) typed
transcription of the same two volumes, fetched 2026-07-27 via r.jina.ai as
markdown (files under `sacred-texts/sbe23/`, `sacred-texts/sbe31/`).
Six chapters that the fetch proxy returned empty (Y. V, LXIII, LXIV, LXVII,
LXIX, LXXII — all cross-reference stubs in Mills' edition) were fetched from
the Wayback Machine as original sacred-texts HTML (files under
`sacred-texts/wayback/`).

Source URLs:

- https://sacred-texts.com/zor/sbe23/sbe23NN.htm (NN = 06,07,08,09,10,13,15,18,19,24)
- https://sacred-texts.com/zor/sbe31/sbe31NNN.htm (NNN = 006–077)
- https://web.archive.org/web/*/https://sacred-texts.com/zor/sbe31/sbe31NNN.htm

`sbe23-darmesteter-raw.txt` and `sbe31-mills-raw.txt` are the archive.org OCR
full texts (identifiers `zendavesta02darm`, `zendavesta03darm`), kept as
corroborating evidence; they were used to verify print diacritics against the
page images, not as corpus text.

Processing notes (all decisions verified against the scan page images):

- sacred-texts types the print's diacritic letters as italic single letters
  (`_x_`). Mapping applied: `_s_`→ṣ, `_t_`→ṭ, `_h_`→ḥ (Mills' own footnote
  "ḥv = h before y"), `_n_`→ṉ except in the Speñta word-family (verified
  n-tilde) where it is ñ; Darmesteter-only: `_g_`→ǧ, `_G_`→Ǧ (verified
  "Ǧahi" on scan; avesta.org normalizes to Jahi/Jamaspa).
- All other `_x_` letters are the translators' emendation italics (verified:
  "Beregya" italic-g, "Râman Hvâstra" italic-Hv) and are rendered plain.
- Translators' introductions, arguments, footnotes, and page markers are
  stripped; verse numbers, rubrics, and the translators' bracketed glosses
  are kept. Mills' six cross-reference stub chapters are reproduced as
  printed.

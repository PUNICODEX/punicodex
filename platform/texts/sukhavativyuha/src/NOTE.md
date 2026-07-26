# sukhavativyuha — source note

Target edition: F. Max Müller (ed.), *Buddhist Mahâyâna Texts* (Sacred Books
of the East, vol. XLIX, Clarendon Press, 1894), Part II: the Larger and the
Smaller Sukhâvatî-vyûha, translated by F. Max Müller. Public domain.

- Project Gutenberg was checked first: the PG catalog carries **no** edition
  of SBE vol. 49 (verified 2026-07-26 via gutenberg.org OPDS search).
- `eng-raw.txt` is the archive.org full-text OCR of the 1894 print
  (`buddhistmahy02cowe`, the part-II volume). Kept for provenance and print
  verification; unusable as an extraction source (mojibake, reflowed notes).
- Actual extraction source: the Internet Sacred Text Archive transcription of
  the same SBE 49 texts (`https://sacred-texts.com/bud/sbe49/`, pages
  `sbe4924.htm` = Larger, `sbe4927.htm` = Smaller; raw HTML in `src/sbe49/`).
  Müller's separate "Note" page (`sbe4925.htm`, downloaded but excluded) and
  all footnote paragraphs are translator apparatus and were stripped per brief.

Processing (`tools/texts-pack/build-sukhavati.js`):

- The transcription encodes the print's dotted/italic transliteration letters
  as `<I>x</I>`; these were converted to Unicode per Müller's notation,
  print-verified against the 1894 scan (e.g. page 2 § 1):
  italic g/G → j/J (`Jina`, `Ajita`), italic k/K → c/C (`Pañca`),
  italic s/S → ś/Ś (`Śâriputra`, `Kâśyapa`), italic s + h → ṣ
  (the "sh" digraph), t→ṭ, th→ṭh, d→ḍ, n→ṇ, nd→ṇḍ, m→ṃ, h→ḥ, l→ḷ,
  ri→ṛi, ris→ṛś, ms→ṃś, kkh→cch, ñk→ñc, ñg→ñj, gñ→jñ.
- Inline footnote refs `[n]` removed; page anchors `{p. n}` removed;
  paragraphs split at printed-page boundaries rejoined.
- Müller's § numbering is kept at paragraph starts.

Sections: the two texts ship as two sections (larger ~17.7k words, smaller
~1.9k words). The Larger Sukhâvatî-vyûha has no named internal parts (only
§ numbers), so no further split was made.

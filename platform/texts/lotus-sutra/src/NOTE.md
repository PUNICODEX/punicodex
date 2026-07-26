# lotus-sutra — source note

Target edition: Hendrik Kern, *The Saddharma-Pundarîka or The Lotus of the
True Law* (Sacred Books of the East, vol. XXI, Clarendon Press, 1884).
Public domain.

- Project Gutenberg was checked first (pack brief preference): the PG catalog
  carries **no** edition of SBE vol. 21 / Kern's Lotus under any title or
  author search (verified 2026-07-26 via gutenberg.org OPDS search).
- `eng-raw.txt` is the archive.org full-text OCR of the 1884 print
  (`saddharmapundar00camb`, scan of the Princeton copy). It is kept for
  provenance and print verification but is unusable as an extraction source:
  mangled diacritics, footnotes reflowed into the body at page breaks.
- Actual extraction source: the Internet Sacred Text Archive transcription of
  the same Kern 1884 translation (`https://sacred-texts.com/bud/lotus/`,
  27 chapter pages, raw HTML in `src/lot/lot01–27.htm`). This is the closest
  faithful public-domain digital edition of the named translation. Kern's
  introduction and footnotes are not part of that transcription, so the corpus
  is body text only, as the brief requires.

Processing (`tools/texts-pack/build-lotus.js`):

- Entities decoded (â î û ñ Â Î Û Æ æ), including double-escaped `&amp;acirc;`.
- The transcription preserves Kern's vowel circumflexes but flattens his
  consonant diacritics (print-verified: Kern prints ṛ/ṭ/ṇḍ dots, italic g = j,
  italic k = c, italic s = ś, "sh" = ṣ; the transcription has none of these).
  Forms therefore appear as e.g. `Sâkyamuni`, `Mañgusrî`, `Vagrapâni`
  (Kern's g-for-j), `Avalokitesvara`, `Akshobhya` — see `xref.json`.
- Two transcription typos fixed against the print: verse-initial `I` misread
  as digit `1` (8 occurrences, e.g. `44. 1 see thousands…` → `44. I see…`),
  and `Bhadrikal` → `Bhadrika` (footnote-marker 1 misread as letter l).
- The transcription inlines Kern's footnotes as square-bracketed spans at the
  marker position. 17 spans that are clearly footnote apparatus (translator's
  commentary, not translation — e.g. `[In this chapter only four disciples
  are mentioned…]`) were stripped; short bracketed glosses that are part of
  the translation flow (`[Or, elements]`, `[a thousand billions]`,
  `[&c., as above till …]`) were kept per the brief.
- Verse lines keep Kern's line numbers; each verse line / prose paragraph is
  one corpus paragraph.

`vairocana` was checked and excluded: no standalone capitalized `Vairocana`
(or `Vairochana`) occurs; only the compound Tathâgata name
`Vairokanarasmipratimandita(-râja)` in Chapter VII, a distinct Buddha.

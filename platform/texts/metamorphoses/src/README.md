# Metamorphoses corpus — source audit trail

The corpus (`../eng.json`) is the complete Metamorphoses of Ovid, Books I–XV,
in **Brookes More's blank-verse translation (Boston: Cornhill Publishing Co.,
1922, public domain)**.

The pack brief named Project Gutenberg ebook 26073; that ebook turned out to
be **Henry T. Riley's 1851 prose translation** (Books VIII–XV), not Brookes
More — wrong translator, so it was not used. No Project Gutenberg ebook of
More's translation exists, and archive.org holds only a Book-1 microform of
the Cornhill edition (`metamorphosespov00ovid`). The closest public-domain
alternative is the Perseus Digital Library's curated TEI XML of the Cornhill
1922 edition — the same digital library this repository's theogony corpus
already draws on:

- `eng-raw.xml` — downloaded 2026-07-26 from
  https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0959/phi006/phi0959.phi006.perseus-eng3.xml
  (CTS urn:cts:latinLit:phi0959.phi006.perseus-eng3; the `__cts__.xml`
  catalogue entry reads "Ovid. Metamorphoses. More, Brookes, translator.
  Boston: Cornhill Publishing Co., 1922.")

Processing notes:

- One section per Book (`book-1` … `book-15`), verse lines joined with single
  newlines; the print edition's own paragraph breaks (TEI
  `<milestone ed="P" unit="para"/>`) mark paragraph boundaries.
- Perseus encoding quirk handled: Book 3 is tagged `subtype="BOOK"`.
- No notes or apparatus exist in this edition; nothing else was cut.

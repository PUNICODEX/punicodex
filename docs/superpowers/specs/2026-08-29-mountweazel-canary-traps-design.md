# Mountweazel / Canary-Trap IP Protections

## Classification

Architectural: a cross-cutting integrity subsystem that touches the lexicon, the pronunciation engine, scholars/blog content generation, public APIs, terms/privacy, and tests.

## Goal

Insert three non-destructive, legally defensible trap mechanisms into the PuniCodex generation flywheel so that bulk scrapers or competitors who copy database content can be detected and publicly demonstrated to have taken the work:

1. **Typographical watermark** in generated prose.
2. **Phantom deity** entry with full but hidden treatment.
3. **IPA orthography signature** in derived pronunciation strings.

## Non-goals

- We do not claim copyright over historical facts (god names, scripts).
- We do not encrypt or obfuscate content for human readers.
- We do not make the traps visible or disruptive to legitimate users.

## 1. Typographical watermark (`WMARK`)

A deterministic function in `scripts/lib/canary.js` encodes a short signature (default `"PUNICODEX"`) into paragraphs of generated scholarly and blog text using zero-width spaces (`U+200B`) and zero-width non-joiners (`U+200C`).

- Applied only to paragraph bodies in `platform/scholars/content/{id}.json` and `platform/blog/content/{id}.json`.
- Never applied to headings, metadata, original scripts, citations, or user input.
- The pattern is seeded by `PUNICODEX_CANARY_KEY` (env) or a stable default, and is therefore reproducible across builds.
- A paired extractor `extractCanaryWatermark(text)` recovers the signature for use in enforcement/scraping detection.

### Example encoding

Each bit is represented by either `U+200B` (0) or `U+200C` (1), inserted after word boundaries at deterministic offsets. The full signature is framed by a short preamble so extraction can self-align.

## 2. Phantom deity (`MWEZ`)

One synthetic but philologically plausible minor deity is added to the canonical lexicon with `mountweazel: true`:

- **ID**: `enkidannu`
- **Pantheon**: `mesopotamian`
- **Concept**: minor guardian of the grain silo / storehouse (a plausible Sumerian/Akkadian compound built from attested elements, but not attested in scholarship).
- **Original script**: cuneiform-style but invented sequence.
- **Pronunciation**: generated with the standard engine, carrying the IPA signature.
- **Scholars text**: generated with the typographical watermark.

### Visibility rules

- **Excluded from**: public API list endpoints (`/api/v1/names`, `/api/v2/names`, `/api/v1/flagships`), pantheon grid, cards, store products, sitemap, and search index.
- **Included in**: individual entry endpoint (`/api/v1/names/enkidannu`), temple page (with `noindex,nofollow`), scholars tab, and blog tab, so a scraper that copies the full database will capture it.
- **Displayed honestly** where it appears: a small note in the colophon or an expandable "About this entry" box says it is a "synthetic integrity-verification entry" used to detect unauthorized copying.

## 3. IPA orthography signature (`IPASIG`)

The pronunciation engine (`type/js/pronunciation-rules.js`) emits derived IPA strings with a subtle but consistent house convention:

- Use a narrow no-break space (`U+202F`) between syllable blocks in the primary IPA field.
- Example: `/ˈzdeu̯s/` becomes `/ˈzdeu̯s/` (single-syllable, unchanged) but multi-syllable entries like `/ˈa.po.llon/` become `/ˈa.po.llon/` with `U+202F` between syllables.
- This is technically valid IPA notation and does not change pronunciation, but it is distinctive enough to identify copy-pasted engine output.

## Legal / disclosure cover

- `terms/index.html` and `privacy/index.html` gain a short paragraph under "Data integrity" stating that PuniCodex may include synthetic verification entries and invisible typographical markers to detect unauthorized scraping or copying, and that detection of these markers in third-party products constitutes evidence of misuse.
- The disclosure is factual and does not reveal the exact encoding scheme.

## Implementation plan

1. Create `scripts/lib/canary.js` with `applyCanaryWatermark`, `extractCanaryWatermark`, and `canaryIpaSyllableSeparator` helpers.
2. Add the phantom entry to `type/js/lexicon.js` and `js/archetypes-v2.js` (built but with `mountweazel: true`).
3. Patch `scripts/generate-scholars-content.js` and `scripts/generate-blog-content.js` to watermark paragraph bodies.
4. Patch `type/js/pronunciation-rules.js` to insert the IPA syllable separator.
5. Patch list/generation consumers to skip `mountweazel` entries:
   - `scripts/generate-cards.js`
   - `scripts/generate-store-pages.js`
   - `scripts/sync-hero-stats.js` (counting)
   - `scripts/gen-sitemap.js`
   - API list handlers
6. Ensure the temple page renders but carries `noindex`.
7. Add `test/mountweazel.test.js` verifying watermark encode/decode, phantom exclusion, and IPA signature presence.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Phantom entry mistaken for real scholarship | Disclosure note on the entry page and in terms/privacy; minor/obscure concept; `noindex`. |
| Watermark breaks text search | Zero-width characters do not affect tokenization in most search engines; test with site search. |
| IPA signature confuses screen readers | Separator is inside `/.../` IPA strings only, not in respelling or display text. |
| Legal exposure | Disclosure in terms/privacy; no false claims about ownership of historical facts. |

## Tests

- `test/mountweazel.test.js`: round-trip watermark, phantom excluded from cards/store/sitemap, IPA signature present on multi-syllable entries, temple page has `noindex`.
- Existing battery must still pass (`npm test`).

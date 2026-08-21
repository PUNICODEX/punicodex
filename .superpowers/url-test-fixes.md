# URL-consolidation test fixes — per-suite report

Context: temple canonical URLs moved from `/sites/{id}/…` to clean `/{id}/…`
(middleware rewrites `/{id}/*` → `/sites/{id}/*` for all lexicon ids; the
legacy form 301s, `/sites/{id}/assets/*` passes through). The generated tree
is current. All five flagged suites were diagnosed before editing.

## 1. Sitemap Consistency — `test/sitemap-consistency.test.js`

- **Root cause:** contract update. The sitemap now lists clean `/{id}/` locs,
  but `urlToFile()` mapped URLs to filesystem paths literally, so
  `https://punicodex.com/zeus/` resolved to the non-existent
  `zeus/index.html` instead of `sites/zeus/index.html` ("every sitemap URL
  resolves" failed). Symmetrically, the orphan check called `pageUrl()` on
  `sites/{id}/…` files, producing `/sites/{id}/` URLs that are no longer in
  the sitemap → 4,123 false "orphans".
- **Fix:** the test now loads the canonical lexicon (`type/js/lexicon.js`)
  into a `LEXICON_IDS` set and mirrors the middleware rewrite rule in both
  directions: `urlToFile()` rewrites `/{id}/*` → `sites/{id}/*` before file
  resolution, and `pageUrl()` maps `sites/{id}/*` files (lexicon ids only)
  to their clean `/{id}/*` public URL before sitemap lookup. Strictness is
  preserved: a missing temple file or a sitemap entry without a backing file
  still fails; non-lexicon `sites/` paths are not remapped.
- **Result:** 5 passed, 0 failed (8,228 URLs).

## 2. Texts Chapters — `test/texts-chapters.test.js`

- **Root cause:** contract update, not a rendering break. Verified against
  `texts/homeric-hymns/index.html` on disk: the temple chips render fine but
  now carry clean hrefs (`class="tx-chip" href="/zeus/"`), while the test
  regex required `href="/sites/{id}/"`. `scripts/lib/crosslink.js` is not
  broken — the chips exist with the new URL form.
- **Fix:** the `tx-chip` and `tx-m-card` regexes now match the clean
  `/{id}/` form; the backing-file existence check (`sites/{id}/index.html`)
  is unchanged and still strict.
- **Result:** all 8 texts-chapters tests passed.

## 3. Realms Page — `test/realms-page.test.js`

- **Root cause:** contract update. `realms/index.html` is intact — cards
  still exist with correct structure and flagship classes
  (`href="/helheimr/" class="realm-card norse flagship"`); only the href
  form changed from `/sites/{id}/` to `/{id}/`, so the pinned regex matched
  zero cards ("expected realm cards").
- **Fix:** card regex updated to `href="\/([^/]+)\/" class="realm-card …"`.
  Flagship-marking, badge-count, and JSON-LD assertions unchanged.
- **Result:** 37 assertions passed.

## 4. Site Analytics — `test/site-analytics.test.js`

- **Root cause:** NOT a real break on the current tree. The battery log
  shows the injector subtest failed because `node scripts/inject-analytics.js`
  exited 1 with "Failed to inject into tiers\index.html" and
  "texts\theogony\index.html" — transient Windows file locks (AV/indexer),
  the same class of error the Edit tool itself hit twice during this
  session. Both files currently carry exactly one beacon block, and a full
  re-run of the suite on the stable tree passes 14/14, including the
  idempotency/exactly-once assertion. The CSS split (f68a41ce) left
  `index.html`'s markers intact (verified: 1 start marker, 1 end marker,
  1 beacon tag).
- **Fix:** none — no code change. The injector already has withRetry +
  3 sweep passes for exactly this failure mode.
- **Result:** 14 passed, 0 failed on re-run. Concern: the suite remains
  timing/lock-sensitive under concurrent load on Windows (flake risk in the
  battery, not a product bug).

## 5. Blog Index — `test/blog-index.test.js`

- **Root cause:** contract update (from the battery log: "ListItem url has
  unexpected shape: https://punicodex.com/acheron/blog/"). The generated
  `blog/index.html` now emits clean `/{id}/blog/` hrefs and JSON-LD urls;
  the test pinned `/sites/{id}/blog/`.
- **Fix:** three regexes updated to the clean form — the JSON-LD
  `item.url` shape, the main-dispatch card href pattern, and the series
  card href pattern. On-disk existence checks against `sites/{id}/blog/…`
  unchanged (still strict).
- **Result:** 8 passed, 0 failed (incl. generator idempotency).

## Neighbor re-checks

- `test/seo-regression.test.js` — 26 passed, 0 failed (already encodes the
  clean-URL contract).
- `test/links.js` — all 898,676 links valid across 8,658 files (already
  resolves root-level lexicon-id paths against `sites/`).
- `test/texts-section.test.js` — 18 passed, 0 failed.
- `test/blog.test.js` — 287 passed; `test/blog-series.test.js` — 1 passed.
- Biome format + lint clean on all four edited test files.

## Files changed

- `test/sitemap-consistency.test.js`
- `test/texts-chapters.test.js`
- `test/realms-page.test.js`
- `test/blog-index.test.js`
- `.superpowers/url-test-fixes.md` (this report)

No generator or middleware changes were needed; no `npm run generate` or
full `npm test` was run, per instructions.

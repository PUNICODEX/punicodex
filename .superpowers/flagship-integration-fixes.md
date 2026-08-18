# Flagship Integration Fixes — 2026-08-18 batch

Promotion of 5 temples to flagship (nezha, change, houyi, longwang, xiwangmu —
change and houyi brand-new lexicon entries) left 13 suites red in the full
battery. This report records each failure, its root cause, the fix, and the
re-run result. The `[change] breakdown reconstructs` failure was fixed
separately (apostrophe injected via a `special` step, `to: "g'"`) before this
pass; `scripts/validate-accuracy.js` confirmed green (966 passed, 2 warnings).

## 1. Engine Unit Tests — "Correct pantheon counts: Chinese count 49 !== 47"

- **Root cause:** `type/js/test-engine.js` hardcodes per-pantheon counts; the
  two new Chinese entries (change, houyi) raised `chinese` 47 → 49. All other
  counts verified unchanged against the live lexicon (926 entries, 25 pantheon
  tags; computed with node before writing).
- **Fix:** updated the single assertion to 49.
- **Files:** `type/js/test-engine.js`
- **Re-run:** `node type/js/test-engine.js` — all 65 tests passed.
- **Commit:** `69d32b9a fix(lexicon): update Chinese pantheon count to 49 after change/houyi entries`

## 2. Authenticity Case Matrix — change/houyi classified unknown/styled

- **Root cause:** not a test-matrix gap. `platform/api/authenticity-service.js`
  resolves canonical matches from the SQLite `entries` table
  (`platform/db/punicodex.db`), and the local DB predated the two new lexicon
  entries (924 rows, change/houyi absent). The three pre-existing entries
  classified fine. CI rebuilds the DB via `npm run db-init`, so this was a
  stale-local-artifact failure.
- **Fix:** `npm run db-init` (rebuilds the DB from the canonical lexicon +
  archetypes; gitignored local artifact, no code change). The same rebuild
  fixed the Foundation Tests golden-DB failure (item 6b).
- **Files:** none (regenerated `platform/db/punicodex.db`, gitignored).
- **Re-run:** `node test/authenticity-cases.test.js` — 10 passed, 0 failed.

## 3. Scholars Content Regression — 57 failures (5 temples × missing kit sections)

- **Root cause:** the taxonomy's pantheon kits (chinese: classical-texts,
  daoist-sources, buddhist-sources, calligraphy; taoist: daoist-canon, yijing,
  neidan) are **hand-authored bespoke sections** in
  `platform/scholars/content/{id}.json` — the synthesizer
  (`scripts/generate-scholars-content.js`) has no builders for them; every
  peer (long, guanyin, mazu, nuwa, taishang, yinyang, laozi, wuji) carries
  them as `"bespoke": true` sections. The 5 new content files lacked them, so
  the generated manifests had empty status/body/sources.
- **Fix:** hand-authored all 19 sections (4 × 4 chinese temples + 3 × 1 taoist
  temple) from the rich `scripts/lore-catalog.json` material plus primary
  sources (Huainanzi, Shanhaijing, ctext.org, Daozang companion literature,
  Unihan), in the established peer format (body 450–850 chars, [^n] citations
  mapping into the sources array, `generatedFrom: ["bespoke:scholarly-authorship"]`,
  `bespoke: true`). Regenerated manifests with
  `scripts/generate-scholars-manifests.js`. Verified the sections survive a
  re-run of `generate-scholars-content.js` (fill-only-missing preserves
  non-empty bodies) so the controller's `npm run generate` will not drop them.
- **Files:** `platform/scholars/content/{nezha,change,houyi,longwang,xiwangmu}.json`,
  regenerated `platform/scholars/manifests/` (5 temple manifests + `all.json`).
- **Re-run:** `node --test test/scholars-content.test.js` — pass 1, fail 0.
- **Commit:** `85238c2a feat(scholars): hand-author Chinese/Taoist pantheon-kit sections for the 5 new flagship temples`

## 4. Blog failures (two suites, two causes)

### 4a. Flagship Blog Tests — "blog page for change: JSON-LD headline should match post title"

- **Root cause:** the shared blog template
  (`templates/flagship/blog/index.html`) fed HTML-escaped strings into the
  `application/ld+json` block, so the apostrophe in "The name Cháng'é and the
  world it opens" surfaced as `Cháng&#39;é` inside the JSON-LD headline. Both
  page generators (`generate-blog-pages.js`, `generate-blog-series-pages.js`)
  shared the flaw; keywords and description had the same latent bug class.
- **Fix:** JSON-LD values now use dedicated `{{POST_TITLE_JSONLD}}` /
  `{{POST_DESCRIPTION_JSONLD}}` placeholders fed by `JSON.stringify(...)`, and
  `POST_KEYWORDS_JSON` serializes each keyword with `JSON.stringify`. HTML
  contexts keep `escapeHtml`. Regenerated all blog + series pages.
- **Files:** `templates/flagship/blog/index.html`,
  `scripts/generate-blog-pages.js`, `scripts/generate-blog-series-pages.js`
  (+ regenerated `sites/*/blog*/` pages).
- **Re-run:** `node --test test/blog.test.js` — pass 287, fail 0.
- **Commit:** `9dd924be fix(blog): emit JSON-LD-safe headline, description, and keywords on blog pages`

### 4b. Blog Series Tests — "xiwangmu: title too thin" (resonance post)

- **Root cause:** shared root cause with the patterns failures — the 5 temples
  had **no industry seats**, so the resonance generator
  (`scripts/generate-blog-series-resonance.js`) fell into its seatless
  fallback pools (`The Xīwángmǔ audit`, 18 chars; body 469 words < 500).
- **Fix:** seating the temples in `type/js/industry-patterns.js` (item 5) and
  re-running the series generators produced full posts (verified the whole
  resonance/restoration/canonical fleet regenerated, 287 posts each).
- **Re-run:** `node --test test/blog-series.test.js` — pass 1, fail 0 (all 11
  checks green, including "every built flagship has a resonance post").

## 5. Industry Patterns / Flagship Patterns — 5 temples unseated

- **Root cause:** `type/js/industry-patterns.js` (canonical industry map) had
  no seats for the 5 new flagships; contracts require ≥3 industries and ≥1
  weight-2 primary per built flagship (≤3 primaries).
- **Fix:** editorial seating following peer precedent (long, guanyin, mazu):
  - **nezha** — gaming-entertainment w2 (Ne Zha 2 is the highest-grossing
    animated film ever); defense, automotive-mobility (Wind Fire Wheels; the
    Neta EV marque), faith (Taiwan Third Prince cult) w1.
  - **change** — space-astronomy w2 (the Chang'e lunar exploration program is
    literally her name); food-hospitality (mooncakes), faith (Mid-Autumn
    altar) w1.
  - **houyi** — sports-athletics w2 (the divine archer); solar-energy (shot
    nine of ten suns), disaster-resilience (ended the scorching), gaming
    (Smite/Honor of Kings) w1.
  - **longwang** — maritime w2 + water-utilities w2 (the four seas and the
    rain office are his jurisdiction); storm-forecasting, agriculture-food
    (rain-prayers) w1.
  - **xiwangmu** — biotech-longevity w2 (she holds the elixir of immortality);
    wellness-mind (three-thousand-year peaches), faith (3 BCE millenarian
    movement), food-hospitality (Peach Banquet) w1.
  Regenerated `platform/api/industry-patterns.json` +
  `platform/browser/renderer/industry-patterns.json`
  (`scripts/generate-industry-patterns.js`) and re-ran
  `scripts/create-flagship.js` for the 5 temples to re-bake their patterns
  tabs.
- **Files:** `type/js/industry-patterns.js`, the two generated pattern JSONs,
  regenerated `sites/{5 temples}/**`.
- **Re-run:** `node test/industry-patterns.test.js` — 8 passed, 0 failed;
  `node test/flagship-patterns.test.js` — 56,915 assertions passed.
- **Commit:** `4f537960 feat(patterns): seat the 5 new flagship temples in the industry-pattern map`

## 6. Cards failures + golden DB

### 6a. Cards Gallery — "exactly 282 legendaries" / "1,746 static frames"

- **Root cause:** `test/cards-gallery.test.js` hardcodes the fleet contract
  counts (the established pattern in this file — the test title itself still
  said "1,698" from an earlier bump). Promotion moved the 5 temples up the
  edition ladder: +5 legendary (full-art) printings → 287; total set 1,746 →
  1,763 (20 new printings − 3 retired archive printings for the pre-existing
  base entries). The generated `game/cards.json` and `cards/index.html` were
  already correct from the battery's generate run.
- **Fix:** bumped the three hardcoded expectations (287 legendaries; 1,763
  frames/payload/stat-total) and the stale test title to match the real set.
- **Files:** `test/cards-gallery.test.js`
- **Re-run:** `node test/cards-gallery.test.js` — all 5 tests passed.
- **Commit:** `1dfb9a76 fix(cards): bump FR1 contract counts for the 5 new flagship printings`

### 6b. Foundation Tests — "golden DB contains every built flagship id"

- **Root cause:** same stale local DB as item 2 — the golden DB
  (`platform/db/punicodex.db`) is a runtime-derived local artifact; the test
  diffs `entries.has_flagship = 1` against the built archetypes.
- **Fix:** covered by the `npm run db-init` rebuild (flagship ids derive from
  `js/archetypes-v2.js` inside `platform/db/init.js`). No fixture file needed
  editing — the "golden DB" is not a committed fixture.
- **Re-run:** `node test/foundations.test.js` — 12 passed, 0 failed.

## 7. Store — variantPricing / printfulVariants

- **Root cause:** the 65 new products (5 temples × 13 kinds) entered
  `store/products.json` without the synced operational fields. Two different
  situations:
  - `variantPricing` is a pure function of (kind, flat price) — the builder
    (`scripts/build-variant-pricing.js`) writes "the same spread for all
    temples" per price tier (verified: maps are byte-identical across
    same-kind, same-price peers fleet-wide). Offline-derivable exactly.
  - `printfulVariants` are per-sync-product Printful variant ids (verified:
    283 distinct maps across 283 tees). They only exist after
    `scripts/sync-printful-products.js` creates the real Printful products.
    Every previous promotion (e.g. `35dc85a1`, 11 flagships) ran the Printful
    sync before committing — 0 unsynced products at every commit. There is no
    offline/mock path, and copying another temple's ids would route orders to
    the wrong design (a real fulfillment bug), so it was not done.
- **Fix:** backfilled `variantPricing` on all 65 products from same-kind,
  same-price peers (exactly the builder's output; survives regeneration via
  the generator's `PRESERVE_FIELDS`). Re-ran
  `scripts/generate-store-pages.js` (idempotent, 0 writes — pages bake prices
  only when printfulVariants exist).
- **Files:** `store/products.json`
- **Re-run:** `node test/variant-pricing.test.js` — 11 passed, 0 failed.
  `node test/store-structure.test.js` — 10 passed, **1 failed** (remaining:
  "nezha-tee: no printfulVariants").
- **Commit:** `842e5527 fix(store): backfill variantPricing for the 5 new temples' 65 POD products`
- **Left for the operator (needs PRINTFUL_API_KEY, deliberately not called
  here):**
  ```
  PRINTFUL_API_KEY=... node scripts/sync-printful-products.js --only nezha
  # (repeat per temple, or one fleet run)
  PRINTFUL_API_KEY=... node scripts/backfill-printful-variants.js --only nezha
  npm run generate
  ```
  This is the only known-red assertion after this pass.

## Not run (per instructions)

- `npm run generate` and full `npm test` — left to the controller. All
  regenerated artifacts produced here used the flywheel's own generators, so
  the divergence gate should reproduce them byte-identically. Note the working
  tree still carries the battery's other post-promotion generated outputs
  (data/corpus, sitemap, etc.) for the controller to regenerate and commit.

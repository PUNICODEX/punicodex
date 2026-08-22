# Norse Flagship Integration Fixes — 2026-08-22 batch

Promotion of 6 Norse temples to flagship (fafnir, bifrost, mjolnir, mani,
sigurd, skadi) left 9 suites red in the full battery. Same failure class as
the 2026-08-18 Chinese batch (see `flagship-integration-fixes.md`); this
report records each failure, its root cause, the fix, and the re-run result.
The Divergence Gate failure is expected pre-commit and left to the
controller's regenerate-and-commit pass.

## 1. Industry Patterns / Flagship Patterns / Blog Series — 6 temples unseated

- **Root cause:** `type/js/industry-patterns.js` had no seats for the 6 new
  flagships; contracts require ≥3 industries and ≥1 weight-2 primary per
  built flagship, and the resonance blog generator
  (`scripts/generate-blog-series-resonance.js`) falls into thin seatless
  fallback titles ("fafnir: title too thin") without seats.
- **Fix:** applied the staged curation patch
  (`.superpowers/norse-curation-patch.json`) — 21 industry seats, 2
  similarity-group adds (mani → Moon/lunar; fafnir → Guardian/protector), and
  11 curated pairs (`bidirectional: true` per house style) — to
  `type/js/industry-patterns.js` and `type/js/similarity-groups.js`.
  **Deviation from the staged patch:** the patch seated sigurd and bifrost
  with weight-1 seats only, violating the ≥1-primary contract
  (`flagship-patterns.test.js` auditCoverage). Elevated sigurd's
  publishing-media seat ("the dragon-slayer plot is his patent") and
  bifrost's construction-engineering seat ("joining two worlds is the
  industry's founding dream") to weight 2; the patch JSON was updated to
  match. Regenerated `platform/api/industry-patterns.json` +
  `platform/browser/renderer/industry-patterns.json`
  (`generate-industry-patterns.js`), `platform/api/similarities.json` +
  browser copy (`generate-similarities.js`), re-baked the 6 temples with
  `create-flagship.js`, and re-ran the blog series generators
  (resonance + pages; 293 posts each).
- **Files:** `type/js/industry-patterns.js`, `type/js/similarity-groups.js`,
  the 4 generated pattern/similarity JSONs, `.superpowers/norse-curation-patch.json`.
  The re-baked `sites/{6}/` trees and the regenerated blog series pages
  (all 293 temples' series pages were rewritten by the generators) are left
  in the working tree for the controller's regenerate-and-commit pass.
- **Re-run:** `node test/industry-patterns.test.js` — 8 passed, 0 failed;
  `node test/flagship-patterns.test.js` — 58,538 assertions passed;
  `node --test test/blog-series.test.js` — pass 1, fail 0.
- **Commit:** `8a863eab feat(patterns): seat the 6 new Norse flagship temples in the industry-pattern map`

## 2. Scholars Content Regression — 6 temples × 4 empty norse-kit sections

- **Root cause:** same class as the Chinese batch. The taxonomy's norse kit
  (poetic-edda, prose-edda, runic-evidence, sagas) is **hand-authored
  bespoke** in `platform/scholars/content/{id}.json` — the synthesizer
  (`generate-scholars-content.js`) has no norse kit builders (verified:
  every norse peer, e.g. thor/odinn, carries them as `"bespoke": true`).
  The 6 new content files lacked them, so manifests had empty
  status/body/sources (6 taxonomy-structure + 72 publication-state failures).
- **Fix:** hand-authored all 24 sections from the rich
  `scripts/lore-catalog.json` material plus primary sources (Codex Regius
  lays, Snorri, Ramsund/Gök/Drävle/Kirk Andreas stones, Købelev "hamar × is"
  inscription, Ynglinga saga, NKS 1824 b 4to), in the peer format (450–850
  char bodies, `[^n]` citations mapping into the sources array, wikilinks
  only to real lexicon ids, `generatedFrom: ["bespoke:scholarly-authorship"]`,
  `bespoke: true`), inserted after `meditation` to match peer key order.
  Honest-absence sections where the record demands it (bifrost/mani/skadi
  runic-evidence state plainly that no inscription names the figure).
  Regenerated manifests (`generate-scholars-manifests.js`, 293 manifests,
  4,573 published sections). Verified `generate-scholars-content.js` re-run
  generates 0 sections (fill-only-missing preserves the bespoke bodies), so
  the controller's `npm run generate` will not drop them.
- **Files:** `platform/scholars/content/{fafnir,bifrost,mjolnir,mani,sigurd,skadi}.json`,
  `platform/scholars/manifests/{same 6}.json` + `all.json`.
- **Re-run:** `node --test test/scholars-content.test.js` — pass 1, fail 0.
- **Commit:** `3bb08c3c feat(scholars): hand-author Norse pantheon-kit sections for the 6 new flagship temples`

## 3. Cards Gallery — hardcoded contract counts

- **Root cause:** `test/cards-gallery.test.js` hardcodes the fleet contract
  counts. The battery log itself reported the real baked numbers
  (1,818 frames; 293 full-arts), and `game/cards.json` confirms them:
  total 1,818 (common 293 / holo 293 / full-art 293 / secret 266 /
  archive 673). Arithmetic vs the old expectation: 1,803 + 18 new
  common/holo/full-art printings + 3 secret foils (fafnir, mjolnir, skadi
  have verified runic forms; bifrost, mani, sigurd do not) − 6 retired
  archive printings = 1,818. (The staged brief's 1,824 estimate forgot the
  archive retirements.)
- **Fix:** bumped the legendaries expectation 287 → 293 and the
  frames/payload/stat-total expectations 1,803 → 1,818 (title included).
- **Files:** `test/cards-gallery.test.js`
- **Re-run:** `node test/cards-gallery.test.js` — all 5 tests passed;
  biome clean.
- **Commit:** `dc2ad39d fix(cards): bump FR1 contract counts for the 6 new flagship printings`

## 4. Store — variantPricing / printfulVariants on 78 new products

- **Root cause:** the 78 new products (6 temples × 13 kinds) entered
  `store/products.json` without the synced operational fields. Two
  situations, same as the Chinese batch:
  - `variantPricing` is a pure function of (kind, flat price) — verified the
    invariant fleet-wide first: all 21 same-kind/same-price groups carry
    byte-identical maps.
  - `printfulVariants` need the real Printful sync products.
- **Fix:** backfilled `variantPricing` on all 78 products from same-kind,
  same-price peers (survives regeneration via the generator's preserve
  fields; trailing-newline formatting matched to the committed file). Ran
  the Printful sync per temple:
  `PRINTFUL_API_KEY=… node scripts/sync-printful-products.js --only <id>`
  then `node scripts/backfill-printful-variants.js --only <id>` for each of
  the 6 — 13/13 products synced and mapped per temple.
- **Files:** `store/products.json`
- **Re-run:** `node test/variant-pricing.test.js` — 11 passed, 0 failed;
  `node test/store-structure.test.js` — 11 passed, 0 failed (first invocation
  showed 10/1: the suite's own idempotency check re-ran
  `generate-store-pages.js`, which baked the checkout contract into the 78
  product pages now that printfulVariants exist; stable at 11/0 from the
  second run on).
- **Commit:** `682567f1 fix(store): sync the 6 new temples' 78 POD products to Printful + backfill pricing`

## 5. Foundation Tests — golden DB missing the 6 flagship ids

- **Root cause:** stale local SQLite DB (`platform/db/punicodex.db`,
  gitignored runtime artifact), same as the Chinese batch item 6b.
- **Fix:** `npm run db-init` rebuilt the DB from the canonical lexicon +
  archetypes. Confirmed gitignored (`.gitignore:44`) — nothing to commit.
- **Re-run:** `node test/foundations.test.js` — 12 passed, 0 failed.

## Not run (per instructions)

- `npm run generate` and full `npm test` — left to the controller. All
  regenerated artifacts produced here used the flywheel's own generators, so
  the divergence gate should reproduce them byte-identically. The working
  tree still carries the battery's other post-promotion generated outputs
  (re-baked `sites/{6}/`, blog series pages, data/corpus, sitemap, etc.)
  for the controller to regenerate and commit.

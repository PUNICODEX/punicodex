# Workstream B Report — Generator + Template Layer URL Consolidation

Status: **DONE_WITH_CONCERNS**
Commit: `b3657815` — `feat(seo): canonical + sitemap + internal links move to clean /{id}/ URLs` (58 files, +230/−187)

## What changed

### Canonicals / meta / JSON-LD
- `scripts/generate-temples.js` — `canonicalUrl` now `https://punicodex.com/${entry.id}/`
  (feeds `<link rel=canonical>`, `og:url`, WebPage JSON-LD `url`, BreadcrumbList item).
  Cognate card (~497), related-cognate (1123) and same-pantheon (1157) links →
  `https://punicodex.com/{id}[/lore/]` clean form.
- `templates/flagship/*.html` — all 9 indexable tab templates + root index: canonical,
  og:url, JSON-LD `url`/`@id`, and the absolute breadcrumb links in `blog/index.html:153`
  and `scholars/index.html:265` → `https://punicodex.com/{{TEMPLE_ID}}/…` (22 occurrences).
  `dashboard.html` untouched (deliberately noindex, no canonical).
- `templates/flagship/patterns/patterns.js:148` and `patron/patron.js:112` — template-side
  temple href builder and the patron eyebrow label → clean form.
- `templates/flagship/flagship.js` dashboard-token links (`/sites/{id}/dashboard/?token=`)
  deliberately left — they 301 through the new middleware; flagged below.
- `scripts/create-flagship.js` — `patternTempleHref` (3319) → `/{id}/…`; the legacy
  relative related-cards helper (1549) `../../${e.id}/` → explicit `/${e.id}/`.

### Sitemap
- `scripts/gen-sitemap.js` — temple entries and all 11 per-flagship secondary URLs
  (lore, lore/extended, gallery, blog + 3 series, patterns, scholars, creatives, patron)
  → `/{id}/…` clean forms.

### Internal links (generators)
- `scripts/sync-temple-index.js:66` — hub index anchors → `/{id}/`.
- `scripts/generate-itemlist-schemas.js:32` — lexicon ItemList JSON-LD urls → clean.
- `scripts/generate-everyday-page.js:85`, `scripts/generate-blog-index.js` (89, 99–101, 156),
  `scripts/generate-blog-series-canonical.js` (646–647, canonical-register.json fields),
  `scripts/generate-text-pages.js` (319, 513, 618, 1009), `scripts/generate-scholars-content.js:325`,
  `scripts/generate-store-pages.js:129`, `scripts/generate-pod-products.js:342` (`templeUrl`),
  `scripts/generate-patterns-page.js` (430, 437), `scripts/generate-pitch-pages.js` (315, 322),
  `scripts/seed-flagship-sites.js` (136, 154, DB canonical fallback) — all → clean form.
- `scripts/lib/crosslink.js` (89, 105), `scripts/lib/breadcrumb.js` (32, 35, 55),
  `scripts/lib/blog-render.js:189` — shared link builders default to `/{id}/`.
- `platform/scholars/markdown.js:51` — scholars `[[id]]` crosslinks → `/{id}/`.
- `platform/db/seed-temple-content.js` (74, 132, 149) — temple-content search corpus urls → clean.
- `platform/api/pitch-email.js` (128–129) — outreach email temple/patterns URLs → clean.

### Internal links (hand pages + client JS)
- `realms/index.html` — 33 static realm cards → `/{id}/`.
- `js/connections.js` (494, 507), `js/home.js` (20, 22), `js/ink.js` (151, 229, 283, 352),
  `js/pantheon.js:44`, `js/trending-temple.js:63`, `js/patterns-atlas.js:31`,
  `cards/cards.js:265` — all temple link renderers → `/{id}/`.
- Asset paths deliberately left on `/sites/`: `js/patterns-atlas.js:27` mascot,
  `js/archetypes-v2.js` mascot/logomark paths, `scripts/generate-pod-products.js:23`,
  `generate-flagships.js`, `promote-*.js`, Printful sync scripts.
- `js/trending-temple.js:179` left — it shortens *recorded analytics paths* for display,
  not link generation.

### `?v=` cache-bust bumps (immutable 1-year caching)
- `index.html` home.js `perf21→perf22`; `pantheon/index.html` pantheon.js `78→79`;
  `connections/index.html` connections.js `atlas3→atlas4`; `ink/index.html` ink.js `2→3`;
  `cards/index.html` cards.js `1→2`; `scripts/generate-patterns-page.js` patterns-atlas.js
  `1→2`; `scripts/generate-trending-temple-page.js` trending-temple.js `1→2`
  (patterns/ and trending/ pages are generated — pins bumped in the generators only).

### Search-link hygiene (task 6)
- `scripts/generate-temples.js` — `getDomainStatus` search links (`/search/?q=…`, the
  ~685 crawlable parameterized links) now carry `rel: 'nofollow'`, rendered by the hero
  CTA anchor. Owned-domain CTAs unchanged.

### Tests / validators
- `test/links.js` — resolves root-level lexicon-id paths (`/{id}/…`) against `sites/`
  (the middleware contract), via `LEXICON_IDS`.
- `scripts/validate-seo.js` — canonical check now accepts *only* the clean `/{id}/` form
  (the `/sites/` form is rejected).
- `scripts/validate-flywheel.js` — expected sitemap URLs → clean forms. Middleware
  DOMAIN_MAP assertions untouched (internal targets stay `/sites/{id}` — workstream A).
- `test/seo-regression.test.js` — related-grid regex reads clean links (lexicon-id filtered);
  new tests pin the new contract: clean canonical+og:url on base + flagship temples,
  no `/sites/` locs in sitemap, `rel="nofollow"` on base-temple `/search/?q=` links.
- `test/crosslink.test.js`, `test/lexicon-dedup.test.js:99` — engine expectations → clean form;
  baked-page self-link check tolerates both forms during transition.
- `test/blog.test.js` — internal-link guard matches both forms, skipping non-temple
  single-segment prefixes (asset dirs + hubs).
- `test/blog-series.test.js` (75, 79, 138, 195, 271, 304), `test/everyday-ink.test.js:71`,
  `test/texts-section.test.js` (230–232, 379), `test/scholars-content.test.js` (423 comment,
  609, 614), `test/search-temples.test.js` (111–113, 167), `test/cards-gallery.test.js:70`,
  `test/pitch-email.test.js` (167–168) — updated to the clean-form contract.

## Verification (run; no `npm run generate` / full `npm test`, per instructions)

Source-level gates — all green:
- `test/crosslink.test.js` 12/0 · `test/lexicon-dedup.test.js` 4/0 · `test/pitch-email.test.js` all pass
- `test/links.js` — 898,665 links valid across 8,658 files
- `test/cards-gallery.test.js` 5/5 · `test/scholars-content.test.js` 83,904 assertions, 0 fail
- `test/search-temples.test.js` pass · `test/texts-section.test.js` 18/0 · `test/everyday-ink.test.js` 14/0
- `test/blog.test.js` 287/0
- Biome: two format errors my edits introduced in `test/blog.test.js` / `test/blog-series.test.js`
  were fixed with `biome format --write`; `biome check` clean on all touched covered files
  (two pre-existing lint warnings in `test/seo-regression.test.js` — `totalPairs`, `unicodeOf` — predate this change).

Expected-stale failures (generated output not yet regenerated; these flip green after the
controller runs `npm run generate`):
- `test/seo-regression.test.js` — 4 failures: related grids (stale `/sites/` links),
  clean-canonical test, sitemap test, nofollow test.
- `test/blog-series.test.js` — 3 failures (series canonicals still `/sites/` on disk).
- `scripts/validate-seo.js` — per-entry `Wrong canonical: …/sites/{id}/` (old form on disk).
- `scripts/validate-flywheel.js` — `sitemap.xml missing: https://punicodex.com/{id}/…` (old sitemap).

## Interaction with workstream A (important)

- A's commit `2e7316b7` landed mid-session and **swept my uncommitted edits to
  `test/links.js` and `test/seo-regression.test.js` into their commit** (verified:
  `git diff HEAD` on both files is empty; HEAD contains my exact edits). No work was lost,
  but the authorship/blame of those two files sits in A's commit. My commit contains the rest.
- The working tree currently holds 21 regenerated `texts/` files (someone ran
  `generate-text-pages.js` after my edit; they carry clean links). I deliberately did **not**
  commit them — generated outputs belong to the controller's `npm run generate` pass.
  All other generated consumers (`sites/`, `sitemap.xml`, `blog/`, `everyday/`, `store/`,
  `platform/api/canonical-register.json`, `platform/scholars/manifests`, …) are stale on disk
  until then, by design.

## Concerns / follow-ups

1. **API `links.temple` fields still emit `/sites/{id}/`**: `platform/api/names-service.js:119`,
   `platform/api/cards-service.js:64`, `platform/api-handlers/v1/cards/[id]/index.js:35`,
   `platform/api-handlers/v1/names/pronunciation/index.js:54`,
   `platform/api/industry-pattern-service.js:91` (asserted by `test/api-v2.test.js:118`,
   `test/cards-api.test.js:137`). These are public API payloads, not page chrome — left
   untouched as an API-contract decision; they 301 fine at the edge.
2. **Dashboard token links** (`templates/flagship/flagship.js` ×7, and the
   booking-confirmation/patron emails, e.g. `test/sponsorship-email-triggers.test.js`
   expectations) still build `/sites/{id}/dashboard/?token=…`. Deliberately left
   (tokenized, noindex surface; 301 preserves path+query). Consolidate if desired.
3. **7 stale redirect stubs** (`sites/{achilles,delphi,europa,hercules,jason,khaos,pegasus}/`,
   from one-off `tools/dedup-entries.js`) still carry `/sites/{to}/` canonicals + meta-refresh
   targets, pinned by `test/lexicon-dedup.test.js:80,83`. They work (refresh target 301s), but
   if A's `LEGACY_REDIRECTS` decision deletes them, that test block must go too.
4. **Legacy/one-off scripts not in the flywheel still reference `/sites/`**:
   `scripts/update-sitemap.js` (superseded by `gen-sitemap.js`?), `scripts/fix-flagship-seo.js`,
   `scripts/fix-flagship-canonicals.js` (its docstring already claims the clean form while the
   code writes `/sites/` — pre-existing bug), `scripts/enhance-flagships.js`,
   `scripts/run-lighthouse.js`, `scripts/smoke-production.js`. None run in `npm run generate`.
5. `test/seo-regression.test.js` hub-anchor test (committed under A's hash) now counts both
   `/sites/` and clean anchors — transition-tolerant; can be tightened to clean-only after
   regeneration if the controller wants the stricter pin.
6. `platform/public/scholars/index.html:304` (`/sites/{id}/scholars/` link builder) is the
   scholars portal — workstream A's scope; still on the old form at HEAD.

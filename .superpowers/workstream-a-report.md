# Workstream A Report — Edge Layer + Crawl Hygiene

**Status:** DONE_WITH_CONCERNS
**Commit:** `2e7316b733719149c1f991667b0f73686c3fc9db` — `feat(seo): canonicalize temples on clean /{id}/ URLs — 966-id rewrites, /sites/ 301s, robots + scholars hygiene`
**Branch:** master (not pushed)

## What changed

### 1. Edge routing — `scripts/sync-middleware-domains.js` + `middleware.js`

**Generator (`scripts/sync-middleware-domains.js`):**
- Now loads `type/js/lexicon.js` (same `vm.runInNewContext` idiom already used
  for archetypes), verifies id uniqueness, and emits a second generated block
  between explicit markers:
  `// === BEGIN/END GENERATED LEXICON_IDS + LEGACY_REDIRECTS (scripts/sync-middleware-domains.js) ===`
- `LEXICON_IDS` — all 966 lexicon ids, code-unit sorted (deterministic across
  hosts/ICU, which the divergence gate needs).
- `LEGACY_REDIRECTS` — the 3 existing entries (aether→aither, enki→ea,
  oceanus→okeanos) plus the 7 stale dirs: achilles→achilleus, delphi→delphoi,
  europa→europe, hercules→herakles, jason→iason, khaos→chaos,
  pegasus→pegasos. **All 7 targets verified to exist in the lexicon**; the
  script now hard-fails if any target is not a lexicon id. The table is a
  hand-edited constant at the top of the script (new canonical input).
- Regeneration verified byte-identical (ran twice, `diff` clean). DOMAIN_MAP
  output unchanged (1294 domains, +0).
- The generator-idempotency suite (`test/generator-idempotency.test.js`)
  already runs this script twice and diffs — covered.

**Runtime (`middleware.js`, outside the markers):**
- Clean-URL rewrite (§4) now matches `LEXICON_IDS` (all 966) instead of
  `ARCHETYPE_IDS`. Base temples (`/marduk/`, `/korinthos/`, …) now rewrite to
  `/sites/{id}/*` internally instead of 404ing. `ARCHETYPE_IDS` is kept
  (derived from DOMAIN_MAP) for the flywheel validator contract.
- New §3b: `/sites/{id}/...` for lexicon ids 301s to `/{id}/...` — subpath,
  trailing slash, and query string preserved; a trailing `index.html`
  collapses to the slash form in the SAME hop (`/sites/{id}/lore/index.html`
  → `/{id}/lore/`; `/sites/{id}/index.html` → `/{id}/`). Bare `/sites/{id}`
  (no slash) → `/{id}/` directly.
- Assets exemption: `/sites/{id}/assets/*` passes through untouched
  (`fetch(request)`) — the vercel.json masters proxy and absolute asset refs
  depend on the `/sites/` prefix.
- Stale-dir handling is unified: `/sites/achilles/` also 301s (to
  `/achilleus/`, one hop) via the LEGACY_REDIRECTS fallback in §3b; unknown
  `/sites/{id}/` ids fall through to static (404) as before.
- Ordering: API shim → defensive domains → direct-serve → external redirects →
  deity-domain 301 → legacy path 301 → /sites/ canonicalization → clean-URL
  rewrite. No interference: deity-domain 301s are host-based and precede all
  path logic; legacy redirects precede §3b; `sites` is not a lexicon id.
- Runtime smoke-tested across 17 request shapes (see below).

### 2. `robots.txt`
- `Disallow: /api/` (subsumes the old `/api/admin/` line) with
  `Allow: /api/v1/docs/` — verified `/api/v1/docs/` is the Swagger UI
  (`platform/api-handlers/v1/docs/index.js`), a public docs surface that is in
  the sitemap, so it stays crawlable (longest-match Allow wins in Google/Bing).
- `Disallow: /auth/` (kills the `/auth/session` 404 noise from scholars JS).
- `Disallow: /search/` and `Disallow: /search-v2/` — both exist as directory
  pages (`search/index.html`, `search-v2/index.html`); there is no
  `search.html`. Query pages render client-side from `?q=`; the 685+ embedded
  `/search/?q=…` links on base temples were burning crawl budget.
- Kept as-is: `/admin.html`, `/platform/`, Crawl-delay, Sitemap, and the
  /account/ + /admin-portal/ not-disallowed rationale comment.

### 3. Scholars portal heads (`platform/public/scholars/` — canonical source)
- `noindex,nofollow` added to the 7 account surfaces: `login`, `dashboard`,
  `review`, `admin`, `institution`, `dept-admin`, `analytics` (inserted after
  the meta description, matching existing head conventions).
- `<link rel="canonical" href="https://punicodex.com/scholars/{page}/">` added
  to the 3 public-facing pages: `apply`, `search`, `creatives` (matches the
  existing `scholars/index.html` canonical convention).
- Root `scholars/` regenerated copy was **deliberately reverted**
  (`git checkout -- scholars/`): running only `sync-scholars-portal.js`
  strips the beacon/cookie-consent blocks that later generate steps inject.
  The controller's full `npm run generate` will produce the correct copy.

### 4. Tests
- `test/middleware-routing.test.js` (+7 tests, 19 total, all pass): LEXICON_IDS
  covers the whole lexicon (static parse + size check), exhaustive clean-URL
  rewrite sweep over all 966 ids, base-temple rewrites, `/sites/{id}/` 301
  matrix (bare/slash/index.html), subpath+query preservation, one-hop
  index.html collapse, assets exemption pass-through, all 7 stale-dir legacy
  redirects incl. the `/sites/{legacy}/` one-hop form.
- `test/seo-regression.test.js`: new robots test (`/api/` disallow,
  `/api/v1/docs/` allow, `/auth/`, `/search/`, `/search-v2/`); new scholars
  noindex/canonical guard on the canonical source dir; temple-index anchor
  guard now accepts both `/sites/{id}/` and clean `/{id}/` anchor forms so it
  is green before AND after the generator stream flips `sync-temple-index.js`.
- `test/vercel-config.test.js`: new guard that the
  `/sites/:path*/assets/…` → punycodex-masters proxy rewrite stays in place
  (the middleware assets exemption depends on it).
- `test/links.js`: **co-owned race, see concerns.** The kept version resolves
  `/{id}/*` first segments against `sites/{id}/*` (middleware-aware), so the
  checker stays green when the generator stream flips internal links to the
  clean form. 898,665 links checked, 0 broken.
- Biome: my test files formatted (`biome check --write`), no new lint
  warnings (2 pre-existing warnings in seo-regression confirmed via stash
  comparison; middleware.js and the sync script are outside Biome coverage).
- `AGENTS.md` updated: middleware guardrail section, layout table, generated-
  outputs list, and deployment-section routing bullet now document
  LEXICON_IDS/LEGACY_REDIRECTS, the 966-id clean-URL rewrite, and the
  /sites/ 301 + assets exemption.

## Test results (only suites I touched, per instructions)

| Suite | Result |
|---|---|
| `test/middleware-routing.test.js` | **19/19 pass** (1294 domains swept) |
| `test/vercel-config.test.js` | **9/9 pass** |
| `test/links.js` | **0 broken / 898,665 links** (8,658 files) |
| `test/seo-regression.test.js` | **22 pass / 4 fail** — see concerns |

`npm run generate` / `npm test` NOT run (controller's job).

## Concerns (why DONE_WITH_CONCERNS)

1. **Shared working tree / co-owned test files.** The generator-stream agent
   is working in the same tree and had also edited `test/seo-regression.test.js`
   and `test/links.js` (their hunks assert the post-generate state: clean
   canonicals in `sites/*/index.html`, sitemap without `/sites/`, nofollow on
   `/search/?q=` links). The 4 current seo-regression failures are ALL their
   assertions awaiting `npm run generate` with their generator changes — my
   assertions (robots, scholars) pass. My commit snapshots both streams' hunks
   in those two files (I could not split a single file across two commits);
   their stream's remaining work is still uncommitted in the tree. In
   `test/links.js` I removed my duplicate edit and kept their equivalent
   middleware-aware resolution (functionally the same).
2. **Trailing-slash interplay:** Vercel's `trailingSlash:true` 308 vs
   middleware ordering is not locally verifiable; §3b handles both
   `/sites/{id}` and `/sites/{id}/` explicitly, so either ordering yields one
   hop to the canonical form.
3. **robots `Allow:` support** is universal in Google/Bing but not every
   minor crawler honors it — acceptable, docs surface remains reachable
   regardless.
4. Root `scholars/` copy is intentionally stale in this commit (see §3) — it
   converges on the controller's `npm run generate`.

## Deliberately left for the generator stream / controller

- All canonical/og/JSON-LD/sitemap/internal-link flips in generators,
  templates, and site HTML (per stream boundaries).
- Root `scholars/` regeneration and full `npm run generate` + divergence gate.
- The stale `sites/{achilles,delphi,europa,hercules,jason,khaos,pegasus}/`
  directories still exist on disk; they are now unreachable by inbound links
  once the generator stream flips links, and requests 301 at the edge.
  Deleting them is safe afterwards but was not required.

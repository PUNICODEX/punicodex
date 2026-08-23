# Leftover URL Emitters Report — API + Dashboard + Email Clean URLs

Status: **DONE_WITH_CONCERNS**
Commit: `6f75ced3` — `feat(seo): API + dashboard + email temple links move to clean /{id}/ URLs` (14 files, +37/−40)

## What changed

### 1. Public API temple links (all relative-form services → `/{id}/…`)
- `platform/api/names-service.js:119` — `buildLinks().temple` `/sites/{id}/` → `/{id}/`.
- `platform/api/cards-service.js:64` — per-card `links.temple` → `/{entryId}/`.
- `platform/api/industry-pattern-service.js:90-91` — `links.patternsPage` and
  `links.temple` → `/{id}/patterns/`, `/{id}/`.
- `platform/api-handlers/v1/cards/[id]/index.js:35` — response `links.temple` → `/{id}/`.
- `platform/api-handlers/v1/names/pronunciation/index.js:54` — `links.temple` →
  `/{id}/` (still `encodeURIComponent(id)`).
- Also in scope under "any v1/v2 handlers emitting temple URLs":
  - `platform/api/search-v2.js` (the v2 search service) — `link` fields at 721
    (availability vertical), 773 (domains vertical) → `/{entryId}/`; 811 (lore
    vertical) `/sites/{id}/lore.html` → `/{id}/lore/` (canonical tab form, not
    the legacy `.html` path).
  - `platform/api/oracle.js` (unversioned public `/api/oracle`) — citation
    `url` fields at 1123 → `/{id}/`, 1143 `lore.html` → `/{id}/lore/`.

### 2. Dashboard/token links — `templates/flagship/flagship.js`
All 7 `dashboardLink.href` builders (725, 849, 860, 863, 869, 876, 1008):
`${API_BASE}/sites/{{TEMPLE_ID}}/dashboard/?token=…` →
`${API_BASE}/{{TEMPLE_ID}}/dashboard/?token=…`. Template only — the generated
`sites/{id}/script.js` copies refresh on the controller's `npm run generate`.
`API_BASE` defaults to `''` (same-origin relative), so the middleware's
`/{id}/* → /sites/{id}/*` rewrite resolves the clean form.

### 3. Booking/patron emails — `platform/api/email.js` (8 spots)
- `getDashboardUrl` (113) — `${PLATFORM_URL}/{slug}/dashboard/?token=`.
- `notifyPatronWelcome` (631), sponsor digest CTA fallback (836), patron digest
  (870), patron expiry reminder (891), patron cancelled (918) — `templeUrl` →
  `${PLATFORM_URL}/{slug}/`.
- `digestPulseSection` (812) — trending-temple row links → `/{templeId}/`.

### Tests updated to the clean-form contract
- `test/api-v2.test.js:118` — `links.temple` pin tightened to
  `strictEqual(body.data.links.temple, '/zeus/')`.
- `test/cards-api.test.js:137` — `=== '/zeus/'`.
- `test/portal-leasing.test.js` (436-437, 441 test name, 469, 472, 521-522) —
  dashboard-link and negative nike assertions → clean form.
- `test/sponsorship-email-triggers.test.js` (161, 197) — dashboard snapshot
  link pins → `/nike/dashboard/?token=…`.
- `test/patterns-atlas.test.js:325` — methodology-page temple-link assertion →
  `/{memberId}/`. This pin was already failing against the freshly regenerated
  `patterns/methodology/index.html` (workstream B moved the generator; this
  test was missed there) — now green.

## Verification (no `npm run generate` / full `npm test`, per instructions)

- Suites covering every changed file, all green:
  - `api-v2` 34/0 · `api-v1` 49/0 · `cards-api` 0 fail · `search-v2` all pass ·
    `oracle` all pass · `names-service` 8/0 · `search-gating` 7/0 ·
    `industry-patterns` 8/0 · `patterns-atlas` 11/0 · `pronunciation` 29/0
  - `portal-leasing` all pass · `sponsorship-email-triggers` 12/0 ·
    `booking-service` 30/0
  - Template suites: `sponsorship-ui-contracts` 16/0 · `creative-upload` 15/0 ·
    `discount-modal` 4/0 · `flagship-slots` 3/0 · `ad-analytics` 27/0 ·
    `sponsor-content-safety` 6/0 · `patron-contract` 7/0 ·
    `security-injection-extended` 7/0
- Biome: `biome check` clean on all 13 touched covered files (one formatting
  reflow in `portal-leasing.test.js` fixed via `biome format --write`).
  `templates/flagship/flagship.js` is not biome-covered (ES6 template) —
  `node --check` parses; edits match surrounding style.

## Concerns / follow-ups

1. **Staging accident, corrected.** The first commit attempt (`5fde097c`)
   swept in 21 pre-staged regenerated `texts/*/index.html` files (the ones
   workstream B deliberately left uncommitted — they were sitting in the
   index, not just the working tree). I split it: `git reset --soft HEAD~1`,
   unstaged `texts/`, recommitted as `6f75ced3` with exactly the 14 intended
   files. The `texts/` files are back to unstaged-modified on disk for the
   controller's generate pass. Note: their content is pure clean-link
   regeneration (`/sites/tian/` → `/tian/` tx-chip hrefs), so nothing was at
   risk either way.
2. **Deliberately left on `/sites/`** (per instructions): the 7 legacy
   redirect stubs, all `/sites/{id}/assets/` media-proxy paths,
   `platform/api/site-analytics.js` (path *filters* over recorded analytics,
   not emitters), `platform/public/scholars/index.html:304`, legacy tools/
   scripts.
3. **Out of scope but worth a decision later:** `platform/api/stripe.js`
   (88-89, 144-145, 198-199) — Stripe `success_url`/`cancel_url` still land
   customers on `/sites/{id}/?booking=…` / `?patron=…`. They 301 fine with
   query intact (pinned by `middleware-routing.test.js`), but they are
   customer-facing redirect targets and could move to the clean form in a
   follow-up. No test pins them; I did not touch them (not in the flagged
   list).
4. **Expected-stale generated outputs:** `sites/{id}/script.js` copies still
   carry the old dashboard href on disk until the controller runs
   `npm run generate` (create-flagship regenerates them from the template).
   No committed test asserts the stale form in generated scripts
   (`discount-modal`, `sponsor-content-safety`, etc. all green).
5. Transient Windows filesystem errors (`UNKNOWN`, errno -4094) blocked
   in-place writes to `search-v2.js` and `portal-leasing.test.js` a few times
   (append allowed, truncate refused — AV/Controlled-Folder-Access pattern).
   Worked around via write-temp-then-rename; final contents verified by
   diff + test runs.

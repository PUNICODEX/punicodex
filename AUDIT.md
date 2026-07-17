# PUNICODEX — Comprehensive Audit & Strategic Review

**Audit date:** 2026-06-21  
**Auditor:** Kimi Code CLI (agent swarm)  
**Scope:** Mobile app (Android/Capacitor), browser extension, search engine/crawler, API/backend, advertising/monetization, temple & flagship pages, lexicon/content accuracy, business docs/CI/flywheel, browser/Electron shell, security/privacy/compliance.  
**Methodology:** Read-only inspection by 10 specialist agents; ran `npm test`, `node type/js/validate.js`, `node scripts/validate-accuracy.js`, `node scripts/validate-flywheel.js`, `node test/links.js`, `node scripts/validate-seo.js`, Android build/lint, and extension build. No source code was modified during the audit.  
**Current canonical counts:** 860 entries · 21 pantheons · 83 flagships · 3 dual-tier · 270 tier-1 · 587 tier-2.

---

## 1. Executive Summary

PUNICODEX is a genuinely unique asset: a curated, academically-oriented Unicode-name knowledge graph, a working type engine, a domain portfolio, and the beginnings of a search engine/browser/ecosystem. The foundation is strong enough that **all 77,522 test assertions pass** when the generated-artifacts and flywheel suites are excluded—but those two suites are currently failing because the working tree is out of sync with its own canonical sources.

The audit found **no fatal flaws in the concept**, but it found many places where the execution is not yet "team-of-experts, years-in-the-making" polished. The biggest themes are:

1. **Generated artifacts are stale.** `npm run generate` has not been run and committed after recent canonical changes, so the renderer lexicon, lore catalog, mobile/extension copies, and data-version are inconsistent.
2. **Vercel vs. local platform-server divergence.** Large parts of the backend (`/api/bookings`, `/api/admin`, `/api/analytics`, `/api/v2`, `/api/v1/names/batch`) exist only in the local Express server and are not exposed as Vercel functions, even though the public site is deployed on Vercel.
3. **Monetization path is functionally broken.** Ad-slot IDs in generated HTML do not match the database, Stripe webhook signature verification is undermined by the global JSON parser, click redirects reject external URLs, and displayed prices disagree with charged prices.
4. **Security holes that should be closed before broad exposure.** A tracked `.env` file, hardcoded demo API key, unauthenticated spam/availability endpoints, missing admin rate limiting, and the extension reading password fields on every site.
5. **Pervasive count/documentation drift.** 850, 859, 895, 81 flagships, 63 sites, 44,748 links, 74,000 assertions—many hard-coded numbers throughout the repo no longer match reality.
6. **Unfinished product surfaces.** The native mobile app cannot reach the API, the AR lens is a placeholder, the Electron browser shell is unbuildable and loads the wrong page, and the search index is mostly synthetic flagship stubs rather than live crawls.

The good news: most issues are discrete, well-scoped fixes. The data core and the generation flywheel are real. With a focused 4–6 week sprint on the items flagged **Critical** and **High** below, the project can move from "impressive prototype" to "production-grade canonical layer."

---

## 2. Consolidated Risk Register

| # | Sev | Area | Issue | Key File(s) | Impact | Recommended Fix |
|---|-----|------|-------|-------------|--------|-----------------|
| 1 | 🔴 Critical | Security | `.env` file is tracked in Git | `.env`, `.gitignore` | Likely production secrets leaked in repo history | `git rm --cached .env`, purge history, rotate secrets |
| 2 | 🔴 Critical | API/Auth | Public endpoint can mark any site spam | `api/sites/[punycode]/spam/index.js` | Unauthenticated removal of sites from search | Add `requireAdmin` guard |
| 3 | 🔴 Critical | API/Auth | Availability status update is unauthenticated | `platform/server.js:1050-1058` | Anyone can corrupt availability data | Require admin/API key |
| 4 | 🔴 Critical | Ads/Monetization | Ad-site `data-space` IDs do not match DB slots | `sites/*/index.html`, `platform/db/migrate-booking.js` | Bookings and live creatives completely broken | Re-seed or regenerate slot IDs |
| 5 | 🔴 Critical | Ads/Monetization | Stripe webhook body parsed before signature verification | `platform/server.js:176`, `platform/api/stripe.js` | Webhooks fail; payments not confirmed | Mount raw body parser before global JSON parser |
| 6 | 🔴 Critical | Ads/Monetization | Ad click redirects blocked for external URLs | `platform/server.js:154-166`, `/api/analytics/click` | Clicks not recorded, users not redirected | Allow valid `http(s)` advertiser URLs |
| 7 | 🔴 Critical | Ads/Monetization | Displayed prices differ from backend prices | `sites/*/index.html`, `terms/advertising/index.html`, `migrate-booking.js` | Billing disputes, trust loss | Single source of truth for pricing |
| 8 | 🔴 Critical | Search | Search index dominated by synthetic flagship stubs | `platform/db/migrate-crawler.js`, `punicodex.db` | Results are templated marketing, not live web | Real-crawl flagships or mark pending |
| 9 | 🔴 Critical | Search | Click feedback does not influence ranking | `platform/server.js:776-815`, `platform/api/ltr-service.js` | Learning-to-rank loop disconnected | Consolidate `search_clicks` / `search_result_clicks` |
| 10 | 🔴 Critical | Browser | Electron preload API is unimplemented | `platform/browser/preload.js`, `renderer/*.js` | Electron app cannot start | Implement `window.punicodex` bridge or remove Electron UI |
| 11 | 🔴 Critical | Browser | `main.js` loads the wrong shell | `platform/browser/main.js:10` | All renderer UI is unreachable | Load `renderer/index.html` or delete renderer code |
| 12 | 🔴 Critical | Browser | Electron build scripts cannot run | `package.json:35-37` | Cannot package browser | Install `electron`, `electron-builder`, `cross-env` |
| 13 | 🔴 Critical | Browser | Renderer artifacts stale | `platform/browser/renderer/lexicon.json`, `lore-catalog.json` | CI fails; API lore stale | Run `npm run generate` |
| 14 | 🔴 Critical | Mobile | Native app cannot reach backend API | `mobile/js/mobile.js:13,554,800`, `capacitor.config.json` | Domain badges/AR lens broken | Set `API_BASE` for Capacitor or add `server.url` |
| 15 | 🔴 Critical | Mobile | AR lens is a non-functional placeholder | `mobile/ar-lens.html:54-70` | Product feature does not work | Implement or remove/relabel |
| 16 | 🔴 Critical | Extension | Packaged ZIP omits `lore-catalog.json` | `extension/build.js`, `extension/shared/lore-catalog.json` | Flagship lore broken in store builds | Add file to build list |
| 17 | 🟠 High | Security | Hardcoded demo API key seeded in DB | `platform/db/migrate-api-keys.js`, `api-auth.js` | Publicly known key in production | Remove seed; delete existing demo key |
| 18 | 🟠 High | Security | No rate limiting on admin login/token | `platform/api/admin.js`, `api/_utils.js` | Brute-force risk | Add IP throttling/lockout |
| 19 | 🟠 High | Security | Invalid API keys bypass rate limiting | `platform/api/api-handler.js:51-76` | Resource exhaustion/key enumeration | Rate-limit by IP before key validation |
| 20 | 🟠 High | API | Postgres operational DB support is non-functional | `platform/db/operational.js`, `platform/api/bookings.js`, etc. | Data split across SQLite/Postgres | Route all operational tables through `operational.js` |
| 21 | 🟠 High | API | Postgres operational init not in `npm run db` | `platform/db/init-operational-postgres.js`, `package.json` | Postgres tables not created | Add conditional init step |
| 22 | 🟠 High | Search | Domain discovery produces no real candidates | `platform/scripts/discover-domains.js`, `discover-by-dns*.js` | Crawler has no real workload | Fix CT-log filtering, clear synthetic records, run DNS discovery |
| 23 | 🟠 High | Search | A/B rank variants broken/hybrid ranker unused | `platform/api/search-v2.js`, `crawler-db.js`, `ranker.js` | Ranking promises unfulfilled | Align variants, fix breakdown, integrate or remove ranker |
| 24 | 🟠 High | Ads | Only 4 of 54 planned ad sites have slot inventory | `platform/db/migrate-booking*.js`, `seed-ra-akh-slots.js` | Most ad temples cannot accept bookings | Seed per-site inventory or generate slots |
| 25 | 🟠 High | Ads | `/api/slots` Vercel function is a no-op | `api/slots/index.js` | Static ad pages show no live inventory | Implement or route through server |
| 26 | 🟠 High | Ads | Dashboard calls missing `/api/my-claims` | `platform/public/dashboard.html:146` | Public claims dashboard broken | Add endpoint |
| 27 | 🟠 High | Ads | Stripe webhook async DB calls not awaited | `platform/api/stripe.js:168,174,177` | Post-payment emails skipped | Add `await` |
| 28 | 🟠 High | Ads | Subscription revenue not recorded after trial | `platform/api/stripe.js`, `scripts/trial-reminders.js` | Revenue undercounted | Handle `invoice.payment_succeeded` |
| 29 | 🟠 High | Temples | Tier labels/badges inconsistent with `AGENTS.md` | `type/js/lexicon.js`, `type/js/validate.js`, `scripts/create-flagship.js` | Dual-tier pages fail spec; trust erosion | Update canonical labels & consumers |
| 30 | 🟠 High | Temples | Base temples incorrectly claim "Dual Variant" for Tier-1 names | `scripts/generate-temples.js`, `sites/thebai/index.html` | Misrepresents tier system | Use `entry.tier === 'dual'` |
| 31 | 🟠 High | Lexicon | Working tree has 100+ uncommitted changes | Repository root | No reproducible baseline; CI gate fails | Run `npm run generate`, commit canonical+generated |
| 32 | 🟠 High | Docs | Stale counts everywhere | `AGENTS.md`, `index.html`, `PHASED_PLAN_PROGRESS.md`, etc. | Undermines accuracy brand | Sweep and update to 860/21/83/587 |
| 33 | 🟠 High | Docs | `SEARCH-ENGINE-EVOLUTION.md` is materially obsolete | `SEARCH-ENGINE-EVOLUTION.md` | Misdirects prioritization | Rewrite status or retire |
| 34 | 🟠 High | Docs | `vercel.json` violates `headers-only` guardrail | `vercel.json`, `AGENTS.md` | Guardrail no longer enforced | Decide cron/function home; update docs |
| 35 | 🟠 High | Browser | Browser shell rejects Unicode domains | `platform/public/browser.html:206`, `js/browser-shell.js:19` | Cannot navigate to Unicode domains | Use `domainToASCII`/`URL` parsing |
| 36 | 🟠 High | Browser | Web shell uses insecure iframe sandbox | `platform/public/browser.html:188-192` | Popups/forms allowed in PUNICODEX origin | Use `<webview>` or tighten sandbox |
| 37 | 🟠 High | Extension | Content script runs in password fields | `extension/content/content.js:210-218` | Privacy/security risk | Remove `password` from `isTextInput` |
| 38 | 🟠 High | Extension | Hard-coded stale counts & missing pantheons | `extension/popup/popup.html`, `options/options.html` | Misrepresents scope | Drive from canonical lexicon |
| 39 | 🟠 High | Mobile | Stale counts & missing pantheon filters | `mobile/index.html`, `mobile/manifest.json` | Misleading metadata; 5 pantheons hidden | Update counts and add pills |
| 40 | 🟡 Medium | Security | Admin tokens stored/logged in plaintext | `platform/api/admin.js`, `admin-actions.js` | DB breach exposes active tokens | Hash tokens at rest and in logs |
| 41 | 🟡 Medium | Security | Vercel admin login endpoint missing | `platform/public/admin-api-keys.html`, `api/admin/` | Admin UI cannot auth on Vercel | Add `api/admin/login.js` |
| 42 | 🟡 Medium | Security | Vercel cron endpoints callable by anyone | `api/cron/*`, `vercel.json` | Quota exhaustion/noise | Add `CRON_SECRET` check |
| 43 | 🟡 Medium | Security | Public submission/partner endpoints unrate-limited | `api/submit/index.js`, `api/partners/index.js` | Spam/abuse | Apply `createPublicRateLimit` |
| 44 | 🟡 Medium | API | API v2 not mounted in local platform server | `platform/server.js` | Local/Vercel behavior differs | Mount v2 router |
| 45 | 🟡 Medium | API | `/api/v1/names/batch` unreachable locally | `platform/server.js`, `api/v1/names/batch.js` | Documented endpoint missing locally | Mount and test |
| 46 | 🟡 Medium | API | v1 OpenAPI omits `/names/batch` | `platform/api/openapi.json` | Swagger docs incomplete | Add path/schema |
| 47 | 🟡 Medium | API | CORS helpers lack `Vary: Origin` | `api/_utils.js`, `platform/api/api-response.js` | Cached CORS failures | Add header |
| 48 | 🟡 Medium | Search | `search-v2.html` exposes no backend filters | `platform/public/search-v2.html` | Advanced filtering unavailable | Add pantheon/tier/concept/sort UI |
| 49 | 🟡 Medium | Search | Concept filters return no results | `platform/api/crawler-db.js`, `search.html` | Pills are broken | Populate `archetype_signals` or hide |
| 50 | 🟡 Medium | Search | No automatic crawl scheduling | `platform/db/migrate-crawler.js`, `package.json` | Index goes stale | Add Vercel cron/GitHub Action |
| 51 | 🟡 Medium | Search | Crawler lacks size limits/robots.txt | `platform/crawler/index.js` | Memory risk, impolite crawling | Add max-size, robots, crawl delay |
| 52 | 🟡 Medium | Search | Availability seeded without verification | `platform/db/migrate-crawler.js`, `check-all-availability.js` | Registrar links may be wrong | Run and schedule availability checks |
| 53 | 🟡 Medium | Ads | Advertising terms pricing contradicts DB | `terms/advertising/index.html` | Legal/discovery risk | Align terms and DB |
| 54 | 🟡 Medium | Ads | Dashboards inject user input via `innerHTML` | `admin-bookings.html`, `advertiser-panel.html` | Stored XSS | DOM-based rendering or escape |
| 55 | 🟡 Medium | Ads | Marketplace listings/reviews not admin-gated | `api/marketplace/index.js`, `platform/api/marketplace.js` | Fake listings/reviews | Restrict mutations |
| 56 | 🟡 Medium | Ads | `getClaimById` queries wrong column | `platform/api/claims.js:48-55` | Webhook claim lookup fails | Query by `stripe_session_id` |
| 57 | 🟡 Medium | Lexicon | `original-scripts-extra.json` is canonical but untracked | `data-version.json`, `scripts/update-data-version.js` | Changes bypass divergence gate | Add to canonical hashes |
| 58 | 🟡 Medium | Lexicon | Tier roster conflicts (Hestía, Médousa) | `AGENTS.md`, `type/js/lexicon.js` | Canonical rulebook contradicts data | Reconcile roster/classifications |
| 59 | 🟡 Medium | Lexicon | 32 entries missing expected original scripts | `type/js/lexicon.js`, `original-scripts.js` | Pages show transliteration wrongly | Add verified scripts |
| 60 | 🟡 Medium | Lexicon | ~270 entries use plain ASCII as primary Unicode | `type/js/lexicon.js` | Weakens restoration value prop | Audit for source-justified diacritics |
| 61 | 🟡 Medium | Lexicon | Vague "Special character" breakdown notes | `type/js/lexicon.js` | Transformation opaque | Rewrite notes |
| 62 | 🟡 Medium | Browser | `build-lexicon.js` competes with canonical generator | `platform/browser/build-lexicon.js` | Can overwrite with divergent schema | Delete or rename to diagnostic tool |
| 63 | 🟡 Medium | Browser | No tests cover Electron browser | `test/browser-shell.test.js` | Broken state undetected | Add smoke tests |
| 64 | 🟡 Medium | Privacy | Analytics injection contradicts privacy policy | `scripts/inject-analytics.js`, `privacy/index.html` | False legal statements | Update policy or add consent |
| 65 | 🟡 Medium | Privacy | IP-hash irreversibility claim is overstated | `privacy/index.html` | Misleading privacy claim | Revise wording |
| 66 | 🟡 Medium | Headers | Production headers lack CSP/HSTS | `vercel.json` | XSS/misconfiguration risk | Add strict CSP + HSTS |
| 67 | 🟢 Low | CI | `db` and `db-init` npm scripts are duplicates | `package.json` | Maintenance risk | Make one alias |
| 68 | 🟢 Low | CI | CI runs `npm test` before `npm run generate` | `.github/workflows/ci.yml` | Process mismatch docs | Align docs or CI order |
| 69 | 🟢 Low | Docs | `AGENTS.md` generator list out of sync | `AGENTS.md`, `scripts/generate.js` | Confusing flywheel docs | Update list |
| 70 | 🟢 Low | Docs | `ACCURACY.md` type vocabulary stale | `ACCURACY.md`, `type/js/validate.js` | Contributors use wrong types | Update allowed types |
| 71 | 🟢 Low | Legal | No root `LICENSE`; `package.json` says ISC | Repo root, `AGENTS.md` | Licensing ambiguity | Add code + data licenses |
| 72 | 🟢 Low | Deploy | `DEPLOY.md` targets Cloudflare, repo targets Vercel | `DEPLOY.md`, `.vercel/` | Operator confusion | Align docs |
| 73 | 🟢 Low | Mobile | Android symbol keyboard backslash label wrong | `android/.../keyboard_view_symbols.xml:140` | Inserts "?" not "\" | Fix label |
| 74 | 🟢 Low | Mobile | iOS project absent | `capacitor.config.json` | Android-only | Add iOS or document |
| 75 | 🟢 Low | Extension | ZIP uses backslash separators | `extension/build.js:60` | Cross-platform store issues | Use Node-based archiver |

---

## 3. Domain Findings

### 3.1 Mobile Application (`mobile/` + `android/`)

**Healthy:** Canonical lexicon/engine assets are byte-identical to canonical sources, the native keyboard IME compiles and is feature-complete, keyboard-completeness tests pass, and the debug Android build succeeds.

**Critical gaps:**
- `mobile/js/mobile.js` uses `const API_BASE = ''` and calls `/api/entry/${id}` relative to the Capacitor local origin (`capacitor://` / `http://localhost`). Those calls 404 in the native app, breaking domain-status badges and the AR lens.
- `mobile/ar-lens.html` is a literal placeholder (`// Placeholder: in a full implementation we'd run OCR/glyph detection here`) and returns a random flagship. `AndroidManifest.xml` does not declare `CAMERA` permission.

**High gaps:**
- Hard-coded counts are stale: "850 entries / 16 pantheons" vs. 860/21; "4,475 characters" vs. 5,190.
- The Type-mode filter UI lists only 16 pantheons; `taoist`, `korean`, `canaanite`, `phoenician`, and `hittite` are missing.

**Medium/Low:** Android symbol-keyboard backslash key is labeled `?` and actually inserts `?`; `colors.xml` missing; 83 lint warnings; iOS project absent; mobile pages lack SEO/meta tags; AR lens page is orphaned; service worker does not pre-cache lore catalog.

**Top actions:** fix native API origin; implement or hide AR lens; update counts/filters; fix backslash key; add iOS or document Android-only.

---

### 3.2 Browser Extension (`extension/`)

**Healthy:** Manifest V3 is valid, shared engine/lexicon copies match canonical sources, icons are correctly sized, and the build produces a ZIP.

**Critical gaps:**
- `extension/build.js` does **not** copy `shared/lore-catalog.json` into the store ZIP, but `popup.js` fetches it. Flagship lore is broken for store users.

**High gaps:**
- Popup/options hard-code "895 entries / 14 pantheons" instead of 860/21.
- Pantheon filter `<select>` omits 7 real pantheons.
- Content script treats `type="password"` as a text input, observing keystrokes in password fields on all sites.
- ZIP is built with PowerShell `Compress-Archive`, producing backslash path separators.

**Medium:** no CI extension build verification; service-worker clipboard fallback is dead code; capture-phase keyboard interception can disrupt host pages; dropdown is not Shadow-DOM isolated; extension code is excluded from Biome formatting/linting.

**Top actions:** add `lore-catalog.json` to the build; remove password inputs; sync counts/filters; add CI build verification; isolate dropdown with Shadow DOM.

---

### 3.3 Search Engine & Crawler (`platform/api/search*`, `platform/crawler/`, `platform/scripts/`, `search.html`, `search-v2.html`)

**Healthy:** The schema is rich, the query-intel layer works, and the frontend is visually polished.

**Critical gaps:**
- 81 of 82 `indexed_sites` rows are synthetic flagship stubs with templated titles, `last_crawled = NULL`, and zero quality/entity signals. Only `example.com` has a real crawl timestamp.
- Production click endpoint writes `search_clicks`; the LTR ranker reads `search_result_clicks`. The learning loop is disconnected.
- A/B rank variants are misaligned: `search-v2.js` advertises an `engagement` variant that `applyVariantRanking` does not handle, and the hybrid `ranker.js` module is not actually used by `searchWeb`.

**High gaps:**
- Domain discovery is not producing real candidates. `crawl_queue` is empty; `discovered_domains` contains only synthetic `xn--scout*` records.
- CT-log `afterStr` is computed but never appended to the crt.sh URL.
- DNS discovery skips domains already in `indexed_sites`, so the 81 placeholder flagships block their own re-discovery.

**Medium:** `search-v2.html` does not expose backend filters; concept-filter pills return empty because `archetype_signals` is unpopulated; no automatic crawl scheduler; crawler lacks response-size limits, robots.txt compliance, and per-domain rate limiting; 779 availability rows are seeded as `available` without verification; entity graph/semantic search are empty; `simhash` uses a 32-bit hash for 64-bit output; `search-v2` undercounts results for analytics; default favicon path is wrong.

**Top actions:** real-crawl flagships; fix click-to-rank wiring; align A/B variants; fix discovery; expose v2 filters; schedule recrawls.

---

### 3.4 API & Backend (`api/`, `platform/api/`, `platform/server.js`, `platform/db/`)

**Healthy:** All 36 test suites pass when the generated-artifacts/flywheel failures are excluded. The v1 API surface is extensive and mostly documented.

**Critical gaps:**
- `api/sites/[punycode]/spam/index.js` calls `markSiteSpam()` without any admin check.
- `POST /api/availability/:entryId` in `platform/server.js` has no auth guard.

**High gaps:**
- Postgres operational-DB support is incomplete: most operational modules import `better-sqlite3` directly and bypass `platform/db/operational.js`.
- `platform/db/init-operational-postgres.js` is not included in `npm run db` / `npm run db-init`.

**Medium:** hardcoded `pk_punicodex_demo` API key seeded on migration; admin password compared without timing-safe equality; Vercel cron endpoints callable without secret; public submission/partner endpoints unrate-limited; admin Vercel endpoints bypass `createApiHandler` (no logging/rate-limit); API v2 not mounted locally; `/api/v1/names/batch` unreachable locally; v1 OpenAPI omits batch; v2 OpenAPI wraps spec in envelope; OUWP doc references wrong partner path; CORS lacks `Vary: Origin`; Swagger docs have no CSP.

**Low:** module-level DB openings can fail on Vercel cold start; `STRIPE_SECRET_KEY` required unconditionally at startup.

**Top actions:** close spam/availability auth holes; finish or remove Postgres path; mount v2 and v1 batch locally; sync OpenAPI/docs.

---

### 3.5 Advertising, Monetization, Tenants & Bookings

**Healthy:** The local Express server has a full booking flow, admin dashboards, tenant management, and marketplace tables.

**Critical gaps:**
- Ad-site HTML uses `data-space="53"` through `"65"`; the database only has slots `1-52` (Nike, Hermes, Ra, Akh). Booking returns "Slot not found" everywhere.
- Stripe webhook body is parsed by the global `express.json()` middleware before the raw-body route can verify the signature.
- `/api/analytics/click` rejects external advertiser URLs because `isSafeRedirectUrl` only allows same-origin or `PLATFORM_URL` hostnames.
- UI prices ($60–$500/mo) do not match seeded DB prices ($1,200–$5,150/mo).
- Booking/admin/analytics routes exist only in `platform/server.js`; they are not exposed as Vercel functions, so the deployed site cannot take bookings.

**High gaps:**
- Only Nike, Hermes, Ra, and Akh have slot inventory; the rollout targets 54 pantheon sites.
- `api/slots/index.js` always returns `{ slots: [] }`.
- `dashboard.html` calls `/api/my-claims`, which does not exist.
- Stripe webhook handler does not `await` async DB updates.
- Subscription/trial revenue is not recorded when billing starts.
- Tenant/marketplace services open SQLite directly, bypassing the operational DB abstraction.

**Medium:** `PANTHEON-ADVERTISING-ROLLOUT.md` promises `scripts/generate-ad-sites.js` which does not exist; advertising terms pricing contradicts the DB; no automated tests cover bookings/webhooks/analytics; dashboards inject user input via `innerHTML` (stored XSS); marketplace listings/reviews are not admin-gated; Stripe success/cancel URLs fall back to `localhost`; `getClaimById` queries `id` with a Stripe session ID string; stale renderer lexicon causes `npm test` failures.

**Top actions:** align slot IDs/prices; repair Stripe webhook handling; allow external click URLs; expose booking/admin/analytics on Vercel; seed slot inventory for all ad sites; add automated monetization tests.

---

### 3.6 Temple Pages & Flagships (`sites/`, `templates/flagship/`, generation scripts)

**Healthy:** All 860 entries have a temple page; internal links are clean (29,519 valid); every page has title/description/canonical/OG/Twitter/JSON-LD; canonical source integrity is good.

**Critical gaps:**
- Generated renderer artifacts (`platform/browser/renderer/lexicon.json`, `lore-catalog.json`) are stale, causing `npm test` flywheel/generated-artifacts failures.

**High gaps:**
- `AGENTS.md` requires hyphenated `Tier-1` / `Tier-2` labels and two badges for dual-tier temples. The lexicon uses `Tier 1` / `Tier 2` / `Dual-Tier` and `validate.js` enforces the spaced form. Flagship lore pages render a single `Dual-Tier` badge.
- Base temples mark "Dual Variant" active whenever Greek has both stress and length, which is true for all Tier-1 names, contradicting the single-tier rule.

**Medium:** flagship pages lack the required "Name Variations" section; AI Knowledge Panel in `js/temple-base.js` injects unescaped HTML; shared `js/flagship-canvas.js` is no longer used by generated flagships; `AGENTS.md` counts stale; SEO validator accepts a non-canonical `/{id}/` canonical root.

**Top actions:** regenerate stale artifacts; reconcile tier labels/badges; fix dual-variant logic; add Name Variations section; escape AI panel HTML.

---

### 3.7 Lexicon & Content Accuracy (`type/js/lexicon.js`, `type/js/original-scripts*.js`, validators)

**Healthy:** All automated validators pass; the lexicon is technically sound and internally consistent.

**High gaps:**
- Working tree has 100+ modified tracked files and 50+ untracked files; no clean baseline.
- Hard-coded counts are stale (850, 859, 895).
- Tier roster conflicts: `AGENTS.md` lists Hestía as Tier-1 but the lexicon classifies her as Tier-2; `AGENTS.md` lists Médousa as Tier-2 but the lexicon classifies her as Tier-1.
- `type/js/original-scripts-extra.json` is documented as canonical but is redundant (all its keys already exist in `original-scripts.js`) and is not tracked in `data-version.json`.
- 32 entries that should have original scripts still show scholarly transliteration (Hittite entries, some Egyptian syncretisms, Roman virtues, etc.).
- ~270 primary `unicode` values are plain ASCII, contradicting the "Plain ASCII: last resort, never primary" rule.
- 254 breakdown steps use the vague note "Special character" or "Special phonetic character," hiding real transformations.

**Medium:** `scripts/validate-accuracy.js` does not enforce tier rules, punycode registrability, hieroglyph code-point range, or meaningful `special` notes; `ACCURACY.md` type vocabulary is stale; `data-version.json` canonical source list is incomplete.

**Top actions:** clean working tree; reconcile tier docs; update counts; add missing original scripts; upgrade ASCII primaries where defensible; improve validator coverage.

---

### 3.8 Business Docs, Roadmaps, CI & Flywheel Governance

**Healthy:** CI exists and runs tests/format/lint/divergence gate; `AGENTS.md` is detailed; the flywheel concept is sound.

**High gaps:**
- `type/js/original-scripts-extra.json` is canonical but not tracked in `data-version.json`, so changes bypass the divergence gate.
- `AGENTS.md` "Master generator" list enumerates 10 steps; `scripts/generate.js` actually runs 13.
- Stale counts (859 entries, 81 flagships, 586 tier-2, 44,748 links, 74,000+ assertions) are repeated across docs and public pages.
- `SEARCH-ENGINE-EVOLUTION.md` is materially obsolete (claims 63 placeholder sites, broken crons, phases incorrectly incomplete).
- `vercel.json` contains `trailingSlash`, `functions`, and `crons` keys, directly contradicting the documented `headers-only` guardrail.

**Medium:** large uncommitted working tree; manual routing blocks in `middleware.js` (defensive domains, direct-serve map) are outside the generated `DOMAIN_MAP` and not validated; `middleware.js` has mixed line endings; no root `LICENSE`; `DEPLOY.md` describes Cloudflare Pages while the repo is configured for Vercel.

**Low:** `package.json` `db` and `db-init` scripts are exact duplicates; CI runs `npm test` before `npm run generate`, which differs from the documented workflow; `ACCURACY.md` deployment checklist references `node platform/db/init.js` instead of the full migration chain.

**Top actions:** add `original-scripts-extra.json` to data-version; update `AGENTS.md` generator list; refresh counts; rewrite or retire `SEARCH-ENGINE-EVOLUTION.md`; reconcile `vercel.json` with guardrail; add `LICENSE`.

---

### 3.9 Browser / Electron App (`platform/browser/` + `platform/public/browser.html`)

**Healthy:** The web shell `browser.html` renders and the `js/browser-shell.js` logic passes its own tests.

**Critical gaps:**
- `platform/browser/preload.js` does not implement the `window.punicodex` API that every renderer module expects (minimize/maximize/close, API calls, lexicon entry/search/variants, normalize URL, session, open external).
- `platform/browser/main.js` loads `platform/public/browser.html` in production, not the fully built `renderer/index.html`. All renderer UI code is dead.
- Build scripts reference `electron` and `electron-builder`, which are not installed. `NODE_ENV=development` syntax is invalid on Windows.
- Renderer lexicon/lore-catalog are stale; `npm test` fails.

**High gaps:**
- Renderer modules define globals with underscore-prefixed names (`_PunyUtil`) but reference them without the underscore (`PunyUtil`).
- `main.js` does not enable `webviewTag`, but `webview-manager.js` creates `<webview>` elements.
- Web shell uses iframes with a permissive sandbox (`allow-popups allow-forms`) and no CSP.
- `resolveInput` regex `/^[a-z0-9][\w\-\.]*\.[a-z]{2,}$/i` rejects Unicode domains like `Apóllōn.com`.
- No automated tests cover the actual Electron app.

**Medium:** `build-lexicon.js` is a duplicate generator that can overwrite canonical output; dev-mode URL points to undocumented port 3000; window chrome mismatch; back/forward buttons navigate the top-level page, not the iframe; external URLs opened without scheme validation.

**Top actions:** decide whether to finish Electron shell or delete renderer code; fix build scripts; remove duplicate generator; add smoke tests; make web shell handle Unicode domains.

---

### 3.10 Security, Privacy & Compliance

**Healthy:** Test/lint/format pass; the codebase uses API keys, rate limiting, admin tokens, and homograph/confusable services.

**Critical gaps:**
- `.env` is tracked in Git even though `.gitignore` lists `.env` (the ignore was added after the file was committed).

**High gaps:**
- `platform/db/migrate-api-keys.js` seeds a hardcoded `pk_punicodex_demo` key on every DB init.
- Admin login has no rate limiting or lockout.
- No Vercel `api/admin/login.js` function exists, breaking admin auth on the deployed site.
- Invalid API keys bypass rate limiting because `api-handler.js` returns 401 before the rate-limiter runs.

**Medium:** admin tokens stored and logged in plaintext; admin password compared without `timingSafeEqual`; Vercel cron endpoints callable without secret; public submission/partner endpoints unrate-limited; homograph service misses modern Latin blocks; privacy policy says "No On-Site Tracking" while `scripts/inject-analytics.js` injects GA4; privacy policy claims truncated IP hashes are irreversible (IPv4 search space is small); production `vercel.json` headers lack CSP/HSTS/Permissions-Policy; local server uses `cors()` globally; `X-Forwarded-For` leftmost value is spoofable; browser extension matches `<all_urls>` and observes password fields; Swagger UI loads external assets without SRI.

**Low:** admin session table never garbage-collects expired tokens; OpenAPI spec lacks security scheme.

**Top actions:** remove `.env` from history and rotate secrets; kill demo key; rate-limit admin login and invalid-key paths; add Vercel admin login; hash tokens; add CSP/HSTS; fix privacy policy; exclude password inputs from extension.

---

## 4. Strategic Observations

### 4.1 The concept is genuinely defensible

You are right that meaningful Unicode names are scarce and undervalued. The world conflates "IDN" with emoji domains and visually-confusable ASCII lookalikes. A curated layer that separates *meaningful, historically attested names* from *stylish noise* is a real category. PUNICODEX can own that category because:

- It has the only scholarly Unicode-restored theonym lexicon (860 entries, original scripts, tier rules, source citations).
- It owns the matching domains for the flagship names.
- It has built the tooling (type engine, trie, keyboard, extension) that makes the names usable.

The moat is not the domains alone; it is the **canonical knowledge layer** wrapped around them.

### 4.2 The product is currently three products that are not fully integrated

1. **The public website / temples** (static, scholarly, SEO-heavy).
2. **The platform server** (bookings, admin, crawler, API, analytics) — only runs locally.
3. **The Vercel serverless API** (`api/`) — partial, missing admin/bookings/analytics.

Until the platform server and the Vercel functions expose the same surface, the deployed product cannot take money, cannot crawl at scale, and cannot serve admin dashboards. This is the single largest architectural blocker.

### 4.3 The "flywheel" is real but needs enforcement

The canonical-source → generate → test → commit flywheel is the right design. The fact that it is currently broken (stale renderer artifacts, uncommitted changes) means the enforcement layer is too manual. Recommend:

- Pre-commit hooks that run `npm run generate` and `git diff --exit-code`.
- A `data-version.json` that truly hashes every canonical source (including `original-scripts-extra.json` if kept).
- A nightly CI run, not just push-triggered.

### 4.4 Accuracy is the brand; every inconsistency costs trust

A project that claims to be the canonical layer for the Unicode web cannot have:
- Stale counts (850/859/895).
- Tier rules that contradict the live data (Hestía/Médousa).
- "Original Script" cards that show Latin transliteration.
- Plain ASCII as the primary restoration for a third of entries.

These are not cosmetic. They are the product's credibility. The accuracy manual (`ACCURACY.md`) and validators should be tightened until they enforce the documented rules automatically.

### 4.5 Monetization is closer than it looks, but fragile

The ad/booking infrastructure is surprisingly complete in the local server. The blockers are all at the integration layer: slot IDs, Stripe webhooks, Vercel routing, price reconciliation. Fixing those is a matter of weeks, not months. But the current state—where a customer could click "Book" and hit "Slot not found"—must not be exposed publicly.

### 4.6 The browser shell is the wrong priority in its current form

The Electron app is unbuildable and loads the wrong page. The web shell (`platform/public/browser.html`) is more viable but uses iframes and cannot navigate Unicode domains. If the goal is a "PUNICODEX Browser," the fastest path is probably a browser extension that intercepts Unicode URLs and routes them through PUNICODEX context panels, not a full Electron wrapper.

### 4.7 Security must be hardened before the first public API consumer

The API v1 is documented and partially deployed, but the key/rate-limit/admin auth surface has real holes. With a public API, even one leaked `.env` or demo key becomes a permanent incident.

---

## 5. File Hygiene — Old Audit & Obsolete Plan Files Removed

As requested, the following old audit scripts, transient audit outputs, and obsolete/achieved planning documents were removed and replaced by this single canonical `AUDIT.md`:

- `audit-conversion.js`
- `sites_audit.csv`
- `PHASED_PLAN_PROGRESS.md`
- `SEARCH-ENGINE-EVOLUTION.md`
- `SEARCH-ENGINE-EVOLUTION-SCOPE.md`
- `scripts/peak-quality-audit.js`
- `scripts/_audit-results.json`
- `scripts/_audit-summary.js`
- `scripts/_audit-gallery-urls.js`
- `scripts/_audit-sites.js`
- `scripts/audit-vercel-domains.js`
- `scripts/comprehensive-audit.js`
- `scripts/audit-pantheon-greek.js`
- `scripts/audit-main-pages.js`
- `scripts/fix-tier-audit-issues.js`
- `scripts/audit-ad-sites.js`
- `scripts/audit-domains.js`
- `.vercel/output/static/audit-conversion.js`
- `.vercel/output/static/sites_audit.csv`
- `.vercel/output/static/scripts/peak-quality-audit.js`
- `.vercel/output/static/scripts/_audit-results.json`
- `.vercel/output/static/scripts/_audit-summary.js`
- `.vercel/output/static/scripts/_audit-gallery-urls.js`
- `.vercel/output/static/scripts/_audit-sites.js`
- `.vercel/output/static/scripts/audit-vercel-domains.js`
- `.vercel/output/static/scripts/comprehensive-audit.js`
- `.vercel/output/static/scripts/audit-pantheon-greek.js`
- `.vercel/output/static/scripts/audit-main-pages.js`
- `.vercel/output/static/scripts/fix-tier-audit-issues.js`
- `.vercel/output/static/scripts/audit-ad-sites.js`
- `.vercel/output/static/scripts/audit-domains.js`

The remaining roadmap and rollout documents (`PANTHEON-ADVERTISING-ROLLOUT.md`, `PUNICODEX-21ST-CENTURY-ROADMAP.md`, `AD_CONVERSION_GUIDE.md`, `ACCURACY.md`, `AGENTS.md`, `OWNED_DOMAINS.md`, `UTF8_PRESERVATION_GUIDE.md`, `DNS-SETUP-GUIDE.txt`) were kept because they are either still active plans or authoritative reference manuals, but several are flagged above for refresh.

---

## 6. Recommended Sequencing

### Immediate (this week)
1. Run `npm run generate`, re-run `npm test`, and commit all canonical + generated changes.
2. Remove `.env` from Git history and rotate every secret it contains.
3. Delete the hardcoded demo API key from the migration and any production DB.
4. Add admin/auth guards to the spam and availability endpoints.
5. Decide the deployment architecture: Vercel functions vs. single platform-server function; then expose bookings/admin/analytics accordingly.

### Short-term (next 4–6 weeks)
6. Fix the ad-slot ID mismatch and reconcile prices across UI, terms, and DB.
7. Repair Stripe webhook handling (raw body, await async calls, invoice payment events).
8. Real-crawl the flagship domains and replace synthetic stubs; schedule recrawls.
9. Fix click-to-rank wiring and A/B variant alignment.
10. Reconcile tier labels/badges and add the missing Name Variations section to flagships.
11. Refresh counts (860/21/83/587) across `AGENTS.md`, public pages, extension, and mobile.
12. Close the Vercel vs. local API gaps (v2, v1 batch, admin login).

### Medium-term (next 2–3 months)
13. Complete or remove the Postgres operational path.
14. Add the 32 missing original scripts and tighten `validate-accuracy.js`.
15. Audit the ~270 ASCII-primary entries and upgrade restorations where sources allow.
16. Harden security headers (CSP/HSTS), rate limiting, admin auth, and extension behavior.
17. Choose and apply a data license (recommend CC BY 4.0 or ODbL) and add a `LICENSE` file.
18. Decide the browser strategy: finish Electron, pivot to extension-first, or deprecate.

### Long-term (3–6 months)
19. Build the autonomous agent layer (scout, curator, sentinel) into scheduled crons.
20. Launch the public API v1 with proper key management and partner onboarding.
21. Publish the Unicode Web Index Protocol draft and recruit registrar/browser partners.
22. Develop the marketplace/lease flow and the first paid tenants.

---

## 7. Questions for You

Below are the strategic questions I think we should discuss before the next sprint. There is no right answer for any of them; they depend on how you want to position PUNICODEX in the market and what resources you have.

1. **Deployment target:** Is Vercel the permanent production platform, or do you still intend to use Cloudflare Pages for part of the stack? The repo is configured for Vercel but `DEPLOY.md` still says Cloudflare.

2. **Monetization priority:** Do you want to make advertising/bookings work on the live site first, or do you want to prioritize the search engine/API/public dataset? The ad stack is closer to revenue but has integration blockers; the search engine is closer to the "canonical layer" vision but needs real crawls.

3. **Browser strategy:** Should we finish the Electron shell, double down on the browser extension as the "Unicode browser," or treat the browser shell as a low-priority experiment? The extension is much closer to shipping.

4. **Data licensing:** You have a scholarly dataset. Do you want to release it under **CC BY 4.0** (maximum distribution/academic citation), **ODbL 1.0** (database-specific share-alike), or keep it proprietary while the API is monetized? This blocks DOI/Zenodo and open-source claims.

5. **Accuracy vs. scale:** Should we pause adding new entries until the 32 missing original scripts and the ~270 ASCII-primary entries are audited? Or do you want to keep expanding the lexicon and backfill accuracy later?

6. **Team/AI scaling:** You mentioned "a consecutive non-stop plan to evolve PUNICODEX in ways unimaginable for a single dev and an AI system." What shape do you want that collaboration to take? For example:
   - You define vision and commercial priorities; I own implementation sprints.
   - We pair on architecture decisions but I execute code and tests.
   - I become a "maintainer" that monitors CI, runs curators, and proposes PRs.

7. **The "Unicode web" argument:** Your strongest argument is that meaningful names are finite and valuable. Do you want PUNICODEX to be perceived primarily as:
   - A domain portfolio / brand network?
   - A search engine for Unicode domains?
   - A scholarly knowledge graph?
   - An identity protocol for the Unicode web?
   The answer changes which features we polish first.

8. **iOS and app stores:** Are you committed to shipping iOS, or is Android + PWA + extension enough for the next phase? iOS adds significant Capacitor/App Store work.

9. **Open protocol vs. controlled platform:** Phase 10 of the roadmap talks about publishing the Unicode Web Index Protocol. How open do you want it? Fully open standard with competitors, or a partner-licensed protocol that keeps PUNICODEX as the canonical registry?

10. **Funding / runway:** Many of the issues above are discrete engineering fixes, but some (real crawls at scale, iOS, autonomous agents, fine-tuned AI) require compute, registrar/API spend, and time. What is the realistic monthly budget/compute envelope I should design against?

---

**End of audit.** I am genuinely excited by what you are building. The concept is bigger than the current codebase, and that is exactly the right problem to have: the vision is ahead of the execution, which means the execution can catch up. Let me know where you want to start.

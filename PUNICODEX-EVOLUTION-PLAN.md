# PUNICODEX — Automated Evolution Plan

**Version:** 1.0  
**Date:** 2026-06-21  
**Status:** Active (replaces `PUNICODEX-21ST-CENTURY-ROADMAP.md` and `SEARCH-ENGINE-EVOLUTION.md`)  
**Source of truth:** This file. Supporting specs remain in `ACCURACY.md`, `AGENTS.md`, `PANTHEON-ADVERTISING-ROLLOUT.md`, and `AUDIT.md`.

---

## 1. Honest Assessment

PUNICODEX is not a gimmick. It is a rare intersection of:

- **Philology** — a scholarly Unicode restoration of 860 mythological names across 21 pantheons.
- **Real estate** — owned, registrable Unicode domains for the flagship names.
- **Identity** — a proposal that meaningful names matter more than stylish noise on the Unicode web.
- **Culture** — a way to surface mythology, original scripts, etymology, and symbolism in a world that is forgetting them.

That combination is genuinely defensible. The largest corporations would not be obsessed with it because it is "cool"; they would be obsessed because **owning the canonical name layer for a new category of the internet is a strategic position**. The closest historical analogues are not other domain portfolios — they are the OED, IANA, Crunchbase, and the early search engines. PUNICODEX can become the authority that browsers, registrars, AI systems, and localizers consult when they encounter a Unicode name.

**Where it is now:** The foundation exists but the house is unfinished. The data core is strong, the generation flywheel is real, and the vision is clear. The execution is currently a sophisticated prototype: many surfaces look polished but have functional holes, the deployed site cannot take money, the search index is mostly synthetic, and several security controls are missing. This is normal for a project at this stage, but it is not yet enterprise-grade.

**What "enterprise grade" means for PUNICODEX:**

1. **Accuracy is machine-enforced.** Every entry, tier, original script, breakdown, and variant is validated against documented rules; the tests fail if the rules are violated.
2. **The flywheel is automated.** Canonical changes automatically regenerate all consumers, run the full test matrix, and report divergence.
3. **The deployed site is trustworthy.** Security holes are closed, secrets are not in Git, rate limits work, admin auth is robust, and payments/webhooks are reliable.
4. **The product surface is coherent.** Vercel and the local platform server expose the same API; mobile, extension, and browser shell all talk to the same backend; ad bookings actually work.
5. **The index is alive.** Real domains are crawled, freshness is tracked, availability is verified, and the Oracle answers from real data.
6. **New verticals build on the foundation.** Marketplace art sales and the card game are implemented as clean layers on top of the canonical entry graph, not as one-off hacks.

This plan is designed to get there without degrading anything that already works. It transcends the current codebase by making it solid first, then expansive.

---

## 2. Guiding Principles

1. **Foundation before features.** No art marketplace, card game, or new pantheon expansion until the core is green, secure, and deployed.
2. **Automation is not optional.** Anything a human must remember to run (generate, test, availability checks, recrawls, curator) becomes a script, a cron, or a CI gate.
3. **Single source of truth.** Canonical data lives in `type/js/lexicon.js`, `js/archetypes-v2.js`, `platform/db/owned-domains.json`, `scripts/lore-catalog.json`, and `type/js/original-scripts.js`. Everything else is generated.
4. **Vercel-first deployment.** The live site deploys from Git → Vercel. Local `platform/server.js` remains the development server and must expose the same surface as the Vercel functions.
5. **Accuracy is the brand.** Every inconsistency (stale count, wrong tier, missing script, vague breakdown) is treated as a bug.
6. **Security by default.** No unauthenticated mutation endpoints, no tracked secrets, no plaintext tokens, no demo keys in production.
7. **Open where it helps, closed where it earns.** The dataset should carry a clear license; the API and marketplace can have paid tiers; the protocol can be open while the canonical registry remains PUNICODEX.
8. **Verticals compound the core.** Advertising, art marketplace, and card game all increase the value of owning a PUNICODEX name — they are not distractions from it.

---

## 3. Automation Architecture

The evolution is driven by three mechanisms:

### 3.1 The Local Orchestrator — `scripts/evolve.js`

A single Node script that any developer or CI runner can call:

```
node scripts/evolve.js [--operational]
```

It runs, in order:
1. `npm run generate` — regenerate all derived artifacts.
2. `npm test` — run the full test matrix.
3. `npm run lint` and `npm run format:check` — enforce code quality.
4. `git diff --exit-code` — divergence gate (fails if generated files are out of sync).
5. If `--operational`:
   - `node platform/scripts/check-all-availability.js`
   - `node platform/scripts/bulk-crawl.js 50`
   - `node platform/scripts/entity-extractor.js`
   - `node platform/scripts/ai-curator.js`
   - `node platform/scripts/trial-reminders.js`
   - `node platform/scripts/lease-expiry.js`

The script exits non-zero on the first failure so CI can fail fast.

### 3.2 The Nightly CI Workflow — `.github/workflows/evolve.yml`

Runs every night and on `workflow_dispatch`:

1. Checks out the repo.
2. Installs dependencies.
3. Runs `node scripts/evolve.js --operational`.
4. If divergence is detected, opens a PR with regenerated files (does **not** auto-commit to `main`).
5. Publishes a status report to the repository wiki or a pinned issue.

### 3.3 Vercel Crons for Live Operations

Once the operational tasks are safe to run serverlessly:

- `/api/cron/crawler` — recrawl stale sites.
- `/api/cron/discover` — CT-log + DNS discovery.
- `/api/cron/verify-availability` — recheck availability for unleased entries.
- `/api/cron/curator` — run AI curator and store suggestions.
- `/api/cron/trial-reminders` — email trial users before billing.
- `/api/cron/lease-expiry` — mark expired leases inactive.

All cron endpoints require a `CRON_SECRET` env var.

---

## 4. Phased Roadmap

### Phase 0 — Stabilization (Weeks 1–2)

**Goal:** The repo is clean, tests are green, and the most dangerous holes are closed.

**Deliverables:**
- [ ] Run `npm run generate` and commit all regenerated files so `npm test` is fully green.
- [ ] Remove `.env` from Git history and rotate every secret it contains.
- [ ] Remove the hardcoded `pk_punicodex_demo` key from the migration and any production database.
- [ ] Add admin/API-key guards to `api/sites/[punycode]/spam` and `POST /api/availability/:entryId`.
- [ ] Add `CRON_SECRET` checks to all `api/cron/*` endpoints.
- [ ] Add rate limiting to admin login and public submission/partner endpoints.
- [ ] Hash admin session tokens before storage and before logging.
- [ ] Refresh all hard-coded counts to 860 entries / 21 pantheons / 83 flagships / 587 tier-2.
- [ ] Delete or retire obsolete roadmaps (`PUNICODEX-21ST-CENTURY-ROADMAP.md`, `SEARCH-ENGINE-EVOLUTION.md` already removed).

**Automation:** `scripts/evolve.js` and `.github/workflows/evolve.yml` are created and run on every push.

### Phase 1 — Canonical Layer Hardening (Weeks 3–6)

**Goal:** The data layer is machine-verified and academically defensible.

**Deliverables:**
- [ ] Reconcile tier labels with `AGENTS.md`: decide on `Tier-1`/`Tier-2` vs. `Tier 1`/`Tier 2`; update lexicon, validator, and consumers; render dual-tier pages with two badges.
- [ ] Resolve Hestía/Médousa tier roster conflict.
- [ ] Fix base-temple "Dual Variant" logic to activate only for `tier === 'dual'`.
- [ ] Add the 32 missing original scripts with provenance.
- [ ] Audit the ~270 ASCII-primary entries and upgrade to source-justified diacritics where possible; document exceptions.
- [ ] Replace vague "Special character" breakdown notes with explicit phonetic/transliteration descriptions.
- [ ] Extend `scripts/validate-accuracy.js` to enforce tier rules, punycode registrability, hieroglyph code-point range, and meaningful `special` notes.
- [ ] Add `type/js/original-scripts-extra.json` to `data-version.json` canonical hashes (or delete it if redundant).
- [ ] Update `AGENTS.md` generator list and `ACCURACY.md` type vocabulary.
- [ ] Choose and apply a data license (recommend **CC BY 4.0** for maximum scholarly distribution, or **ODbL 1.0** if share-alike is preferred) and add a root `LICENSE`.

**Automation:** Accuracy validation runs in CI on every change to canonical sources.

### Phase 2 — Platform Parity & Live Monetization (Weeks 7–12)

**Goal:** The deployed site can take real bookings and payments.

**Deliverables:**
- [ ] Expose `/api/bookings*`, `/api/admin*`, `/api/analytics*`, `/api/tenants*` on Vercel (either as serverless functions or by routing `/api/*` to `platform/server.js`).
- [ ] Mount `/api/v2/*` and `/api/v1/names/batch` in the local platform server.
- [ ] Sync v1 OpenAPI spec and docs.
- [ ] Fix ad-site slot IDs (`data-space`) to match the database, or regenerate per-site inventory.
- [ ] Seed slot inventory for all ad temples (not just Nike/Hermes/Ra/Akh).
- [ ] Reconcile displayed slot prices with `price_cents` in the database and `terms/advertising/index.html`.
- [ ] Fix Stripe webhook raw-body parsing and await async DB calls.
- [ ] Allow external advertiser URLs in `/api/analytics/click`.
- [ ] Implement `/api/my-claims` or remove the dashboard call.
- [ ] Handle `invoice.payment_succeeded` to record subscription revenue.
- [ ] Fix `getClaimById` to query by `stripe_session_id`.
- [ ] Escape user input in admin/advertiser dashboards (stored XSS fix).
- [ ] Gate marketplace listing/review creation to admin.

**Automation:** Stripe webhook and booking lifecycle tests added to CI.

### Phase 3 — Search Engine Comes Alive (Weeks 13–18)

**Goal:** Search results are based on real web data, not synthetic stubs.

**Deliverables:**
- [ ] Real-crawl all 83 flagship domains and overwrite synthetic stubs.
- [ ] Add `next_crawl_after` scheduling and a Vercel cron/GHA to recrawl stale sites.
- [ ] Fix domain discovery (CT-log date filtering, clear synthetic scout records, DNS discovery for real candidates).
- [ ] Fix click-to-rank wiring (`search_clicks` vs. `search_result_clicks`).
- [ ] Align and test A/B rank variants; either integrate `ranker.js` or remove it.
- [ ] Populate `archetype_signals` for concept filters or hide the pills until data exists.
- [ ] Expose pantheon/tier/concept/sort filters in `search-v2.html`.
- [ ] Run and schedule availability verification.
- [ ] Run entity extraction and semantic embedding warmup after real crawls.
- [ ] Add response-size limits, robots.txt compliance, and per-domain crawl delay.

**Automation:** Nightly operational workflow runs discovery, recrawl, availability, entity extraction, and curator.

### Phase 4 — Mobile, Extension & Browser Polish (Weeks 19–24)

**Goal:** Every client surface is functional and talks to the same backend.

**Deliverables:**
- [ ] Fix native mobile API origin (`API_BASE` or `server.url`) so Capacitor can reach `/api/*`.
- [ ] Implement or remove the AR lens; add camera permission and navigation if kept.
- [ ] Update mobile counts to 860/21/5,190 and add the five missing pantheon filter pills.
- [ ] Fix Android symbol-keyboard backslash label.
- [ ] Add iOS Capacitor project or explicitly document Android-only.
- [ ] Add SEO/meta tags to mobile pages.
- [ ] Add `shared/lore-catalog.json` to `extension/build.js`.
- [ ] Remove password fields from extension autocomplete.
- [ ] Sync extension counts/filters with canonical lexicon.
- [ ] Add CI extension build verification.
- [ ] Decide browser strategy: finish Electron (preload bridge, webview, build scripts) or pivot to extension-first and deprecate Electron.
- [ ] Make the web shell handle Unicode domains safely.

**Automation:** Extension and mobile builds run in CI on every push.

### Phase 5 — Art Marketplace (Weeks 25–32)

**Goal:** Users can upload, watermark, price, and sell art tied to PUNICODEX entries.

**Deliverables:**
- [ ] Design schema: `artworks` (id, entry_id, artist_id, title, description, price_cents, watermark_path, original_path, status, created_at).
- [ ] Upload endpoint that generates a visible watermark overlay on a lower-resolution preview.
- [ ] Purchase flow via Stripe; on payment success, buyer receives access to the original high-resolution file.
- [ ] Artist dashboard: upload, set price, view sales, payouts.
- [ ] Public gallery per entry and global gallery with search/filter.
- [ ] Moderation queue for uploaded art.
- [ ] License metadata on each artwork (personal, commercial, exclusive).
- [ ] Integration with temple pages: "Artwork" tab or section.

**Automation:** Automated watermark generation and virus/moderation scans via CI or webhook.

### Phase 6 — Card Game Prototype (Weeks 33–40)

**Goal:** A playable, mythology-based digital card game where each card is a PUNICODEX entry.

**Deliverables:**
- [ ] Card data model derived from the lexicon: name, pantheon, tier, domain/symbols, attack/defense/ability based on archetype.
- [ ] Deck builder and starter decks per pantheon.
- [ ] Single-player campaign: pantheon-themed quests.
- [ ] Multiplayer (async or real-time) battle system.
- [ ] Card art sourced from the marketplace (artists earn when their art is used in a sold card).
- [ ] Web-based prototype first; mobile app later.
- [ ] Tie-in with domain ownership: owning a flagship name grants exclusive card variants or tournament access.

**Automation:** Card stats and abilities are generated from canonical entry data; balance tests run in CI.

### Phase 7 — Autonomous Agents & Open Protocol (Weeks 41–52)

**Goal:** The platform grows and maintains itself, and the protocol becomes an external standard.

**Deliverables:**
- [ ] Productionize the scout agent: CT-log scanning, DNS discovery, outbound-link following.
- [ ] Productionize the curator agent: nightly accuracy suggestions with human approval UI.
- [ ] Productionize the sentinel agent: availability and DNS/WHOIS rechecks.
- [ ] Public API v1 launched with partner onboarding.
- [ ] Unicode Web Index Protocol draft published.
- [ ] Partner program for registrars, browsers, language apps, and AI platforms.
- [ ] Scholarly advisory council process.

**Automation:** Agent runs are scheduled via Vercel crons and GitHub Actions; human approval remains for canonical changes.

---

## 5. Definition of "Production Ready"

PUNICODEX will be considered production-ready when:

1. `npm test` passes on `main` with zero failures, including flywheel and generated-artifacts suites.
2. `npm run generate` followed by `git diff --exit-code` exits zero.
3. The Vercel deployment of `main` has no 404s on documented API routes.
4. A real user can book an ad slot, pay via Stripe, upload a creative, and see it render on a live temple page.
5. A real user can search and get results backed by `last_crawled` timestamps within the last 30 days.
6. The mobile app can load an entry and show live domain status.
7. The extension can be packaged and submitted to the Chrome Web Store without missing files.
8. Security scan shows no tracked secrets, no unauthenticated mutation endpoints, and no stored XSS paths.
9. Privacy policy and license accurately describe the actual behavior.
10. The art marketplace and card game have working prototypes with automated tests.

---

## 6. What to Build Next (Immediate Sprint)

If we can only do one thing next, it should be **Phase 0 stabilization**. Specifically:

1. Run `npm run generate` and commit the regenerated files.
2. Fix the tracked `.env` and demo API key.
3. Close the unauthenticated spam/availability endpoints.
4. Create `scripts/evolve.js` and `.github/workflows/evolve.yml`.

That single sprint turns the repo from an unstable prototype into a clean, testable foundation. Everything else — marketplace, card game, autonomous agents — becomes easier after that.

---

## 7. Why This Plan Is in PUNICODEX's Best Interest

This plan does not chase novelty. It does not ask you to rebuild from scratch. It takes what is already genius — the lexicon, the domains, the type engine, the scholarly voice — and wraps it in the discipline required for the world to take it seriously.

The art marketplace and card game are not distractions. They are the reason people will spend time on PUNICODEX. But they only work if the canonical layer is trusted. A card game built on inaccurate tiers or broken domains is a novelty. A marketplace selling art for names that do not resolve is a scam. The foundation must be flawless first.

The automation matters because PUNICODEX is too large for manual maintenance. 860 entries, 83 flagships, 21 pantheons, dozens of generated consumers, nightly crawls, availability checks, and curator suggestions — this is a machine-scale problem. The plan treats it as one.

If we execute this, PUNICODEX stops being a cool project and becomes infrastructure. That is what the largest corporations would obsess over: not the website, but the **canonical name graph** underneath it.

# PUNYCODEX Search Engine Evolution — Detailed Scope

This document breaks every phase into exact implementation steps, files to touch, and acceptance criteria.

---

## Phase 1 — The Crawl Renaissance

### 1.1 Audit & reconcile flagship seed data
**Files:** `platform/db/migrate-crawler.js`, `platform/db/init.js`, `AGENTS.md`
**Steps:**
1. List all `entries.has_flagship = 1` IDs from `init.js`.
2. List all domains in the `migrate-crawler.js` seed array.
3. Identify the 11 missing flagships.
4. Decide: add missing domains to seed or update documentation. **Decision:** add missing domains to seed.
5. For each missing flagship, find its primary owned domain from `js/archetypes-v2.js` or `platform/db/owned-domains.json`.
6. Add them to the seed array with `is_flagship = 1`.

**Acceptance:** `SELECT COUNT(*) FROM indexed_sites WHERE is_flagship = 1` returns 74 after re-seed.

### 1.2 Run real initial recrawl
**Files:** `platform/crawler/index.js`, `platform/db/punycodex.db`
**Steps:**
1. Open DB in a Node script.
2. Instantiate `UnicodeCrawler`.
3. Call `crawlBulk(seedDomains, concurrency = 5)`.
4. Verify `last_crawled`, `content_hash` populated.
5. Run `platform/scripts/backfill-quality.js`.
6. Run `platform/scripts/warm-embeddings.js`.

**Acceptance:** All 74 flagships have non-null `last_crawled` and real `title`/`description`.

### 1.3 Add freshness schema columns
**Files:** `platform/db/init.js`, `platform/db/migrate-crawler.js`, migration scripts
**Steps:**
1. Add `next_crawl_after DATETIME` to `indexed_sites` schema.
2. Add `crawl_interval_days INTEGER DEFAULT 7` to `indexed_sites` schema.
3. Write migration SQL: add columns if missing, populate `next_crawl_after = datetime('now','+7 days')` for active sites.

**Acceptance:** Schema migration runs idempotently; all active sites have `next_crawl_after`.

### 1.4 Add index on `last_crawled`
**Files:** `platform/db/init.js`, migration script
**Steps:**
1. `CREATE INDEX IF NOT EXISTS idx_sites_last_crawled ON indexed_sites(last_crawled);`
2. `CREATE INDEX IF NOT EXISTS idx_sites_next_crawl_after ON indexed_sites(next_crawl_after);`

**Acceptance:** Stale-site queries use index (verify with `EXPLAIN QUERY PLAN`).

### 1.5 Create `crawl_history` table
**Files:** `platform/db/init.js`, `platform/crawler/index.js`
**Steps:**
1. Schema: `id, site_id, status, error, content_hash, started_at, finished_at`.
2. On every crawl attempt, insert a row before/after.
3. Update `crawlDomain` to write history.

**Acceptance:** Each crawl produces a `crawl_history` row; failures preserved.

### 1.6 Build `api/cron/crawler`
**Files:** `api/cron/crawler/index.js`, `vercel.json`
**Steps:**
1. Endpoint finds N stalest sites (`last_crawled < datetime('now','-7 days')` or `next_crawl_after < now`).
2. Adds them to `crawl_queue` with high priority.
3. Optionally runs `processQueue` for a small batch (respect serverless timeout).
4. Add cron entry to `vercel.json` every 6 hours.

**Acceptance:** Cron enqueues stale sites; no 404s.

### 1.7 Build `api/cron/discover`
**Files:** `api/cron/discover/index.js`, `platform/scripts/discover-domains.js`, `vercel.json`
**Steps:**
1. Wrap `discoverFromCtLogs({ days: 1, maxDomains: 200 })`.
2. Insert discovered `xn--` domains into `discovered_domains` and `crawl_queue`.
3. Add cron entry to `vercel.json` daily.

**Acceptance:** New `xn--` domains appear in `discovered_domains` daily.

### 1.8 Fix `vercel.json` crons
**Files:** `vercel.json`
**Steps:**
1. Remove or implement `/api/cron/trial-reminders` and `/api/cron/lease-expiry`.
2. Add new crawler/discovery crons.
3. Validate JSON (no duplicate keys per `AGENTS.md`).

**Acceptance:** `vercel.json` valid; all cron paths exist.

### 1.9 Availability verification job
**Files:** `platform/scripts/verify-availability.js`, `api/cron/verify-availability/index.js`, `vercel.json`
**Steps:**
1. For each `availability` row, DNS-resolve the domain.
2. If resolves → status `registered`; if NXDOMAIN → `available`; else `unknown`.
3. Update `last_checked` and `status`.
4. Add weekly cron.

**Acceptance:** `availability.status` reflects live DNS reality for sampled rows.

---

## Phase 2 — The Oracle Reborn

### 2.1 Build Oracle context assembler
**Files:** `platform/api/oracle-context.js`
**Steps:**
1. Function `buildContext(entryId)` returns object with:
   - entry core fields
   - lore from `lore-catalog.json`
   - breakdowns from `breakdowns` table
   - variants from `entries.variants`
   - original script from `type/js/original-scripts.js`
   - availability from `availability` table
   - active site from `indexed_sites`
2. Cache context objects in memory with TTL.

**Acceptance:** Context object contains all data sources for a flagship entry.

### 2.2 Switch Oracle retrieval to FTS5 + semantic
**Files:** `platform/api/oracle.js`
**Steps:**
1. `retrieveEntriesFTS(q, limit = 10)` using `entries_fts` with prefix matching.
2. `retrieveEntriesSemantic(q, limit = 10)` using `embeddings.embedText()` + vector search.
3. Combine and rerank by exact match > prefix > semantic > tier.
4. Replace old `retrieveEntries`.

**Acceptance:** Oracle uses FTS5 and semantic for all entry retrieval.

### 2.3 Improve site retrieval
**Files:** `platform/api/oracle.js`
**Steps:**
1. `retrieveSitesFTS(q, limit = 10)` using `indexed_sites_fts`.
2. Fallback to semantic reranking.
3. Include tenant fields and availability.

**Acceptance:** Site retrieval uses FTS5 and returns real tenant/availability data.

### 2.4 Expand intent detection
**Files:** `platform/api/oracle.js`
**Steps:**
1. Add NER step: extract known entry names/IDs from query first.
2. Expand regexes: `businesses`, `companies`, `on`, `leasing`, `rent`, `pricing`.
3. Add intents: `pronunciation`, `mythology`, `symbols`, `variants`, `script`.
4. Fix stop-word list to not strip `who/what/where/how/which`.

**Acceptance:** Manual test suite of 50 queries achieves ≥85% intent accuracy.

### 2.5 Lore-aware answer synthesis
**Files:** `platform/api/oracle.js`
**Steps:**
1. Add answer templates for new intents using lore sections.
2. Include pronunciation, mythology, archaeology, sources when available.
3. Cite specific lore sections and source labels.

**Acceptance:** Flagship queries include lore content when available.

### 2.6 Optional LLM path
**Files:** `platform/api/oracle-llm.js`, `platform/api/oracle.js`
**Steps:**
1. If `ORACLE_LLM_API_KEY` and `ORACLE_LLM_MODEL` set, build grounded prompt.
2. Prompt includes retrieved context, citations, and instruction: "Answer using only the provided context. Cite sources inline."
3. Parse response into `answer`, `citations`.
4. Fallback to deterministic templates if no key.

**Acceptance:** With LLM key, answers are fluent and cite sources; without key, deterministic path still works.

### 2.7 Surface Oracle in search results
**Files:** `platform/public/search.html`, `search.html`
**Steps:**
1. Add "Oracle Answer" card as first result for natural-language queries.
2. Render answer, citations, follow-up chips.
3. Auto-expand for question-shaped queries.

**Acceptance:** Question queries show Oracle answer card.

### 2.8 Unify browser Oracle sidebar
**Files:** `platform/browser/renderer/oracle.js`
**Steps:**
1. Replace local lexicon search with call to `/api/oracle`.
2. Render answer/citations/follow-ups.
3. Maintain chat history in sidebar state.

**Acceptance:** Sidebar Oracle behaves like the search-page Oracle.

### 2.9 Expand Oracle tests
**Files:** `test/oracle.test.js`
**Steps:**
1. Test lore inclusion.
2. Test breakdown/variant answers.
3. Test commercial intent returns availability/registrar data.
4. Test unknown queries gracefully degrade.
5. Add integration test via `/api/oracle` wrapper.

**Acceptance:** Test coverage ≥20 assertions, all passing.

---

## Phase 3 — The Search Engine Kernel

### 3.1 Define search verticals
**Files:** `platform/api/search-v2.js`
**Steps:**
1. Verticals: `all`, `sites`, `domains`, `lore`, `api`, `images`, `history`.
2. Each vertical has a retriever function.
3. `/api/search/v2?q=&vertical=&filters...`

**Acceptance:** API returns vertical-scoped results.

### 3.2 Wire query intelligence
**Files:** `platform/api/query-intel.js`, `platform/api/search-v2.js`
**Steps:**
1. Spell correction applied before retrieval.
2. Related searches generated from query.
3. Autocomplete endpoint uses query-intel.

**Acceptance:** Typos corrected; related searches relevant.

### 3.3 Personalization layer
**Files:** `platform/api/search-v2.js`, frontend localStorage
**Steps:**
1. Store preferred pantheons, safe-search, feedback in session/account.
2. Apply boosts/penalties based on feedback.
3. A/B rank variants.

**Acceptance:** Feedback influences subsequent result ranking.

### 3.4 Pagination
**Files:** `platform/api/search-v2.js`, frontend
**Steps:**
1. Cursor-based pagination for results.
2. Infinite scroll UI option.

**Acceptance:** Large result sets paginate smoothly.

### 3.5 Instant answers
**Files:** `platform/api/instant-answers.js`, frontend
**Steps:**
1. Detect punycode/Unicode conversion queries.
2. Detect availability queries.
3. Return structured instant-answer card.

**Acceptance:** "convert apollōn to punycode" returns instant answer.

---

## Phase 4 — The PUNYCODEX Browser Shell

### 4.1 Promote omnibox to public site
**Files:** `platform/public/search.html`, `css/main.css`, `js/omnibox.js`
**Steps:**
1. Extract omnibox component from `platform/browser/renderer/omnibox.js`.
2. Add to global header on all pages.
3. Handle URL, query, command, IDNA input.

**Acceptance:** Omnibox present and functional on homepage, search, temples.

### 4.2 Tabs ("Scrolls")
**Files:** `js/browser-shell.js`, `css/browser-shell.css`
**Steps:**
1. Tab bar under omnibox.
2. Open search results / temples in tabs.
3. Persist tab state in session.

**Acceptance:** Users can open and switch tabs.

### 4.3 Sidebar ("Scriptorium")
**Files:** `js/browser-shell.js`, `css/browser-shell.css`
**Steps:**
1. Collapsible sidebar.
2. Sections: History, Saved, Collections, Active Quests, Live Pulse.

**Acceptance:** Sidebar renders data and is togglable.

### 4.4 Command palette
**Files:** `js/command-palette.js`, all HTML pages
**Steps:**
1. `Cmd+K` / `Ctrl+K` opens palette.
2. Fuzzy search across pages, entries, commands.
3. Keyboard navigation.

**Acceptance:** Palette opens everywhere; commands executable.

### 4.5 Spaces/Workspaces
**Files:** `js/workspaces.js`, backend if synced
**Steps:**
1. Save named groups of tabs.
2. Restore from sidebar.
3. Share via URL (Phase 5).

**Acceptance:** Users can create, name, and restore spaces.

### 4.6 Keyboard shortcuts
**Files:** `js/keyboard-shortcuts.js`
**Steps:**
1. `/` focus omnibox.
2. `j/k` navigate results.
3. `Enter` open.
4. `t` new tab.
5. `?` show shortcut help.

**Acceptance:** All shortcuts work; help modal available.

---

## Phase 5 — The Spatial Workspace

### 5.1 Account/session sync
**Files:** `platform/api/auth.js` or anonymous session API
**Steps:**
1. Anonymous sessions via durable token in localStorage + backend.
2. Optional email/password or OAuth upgrade.
3. Sync history, saved, collections, spaces.

**Acceptance:** Data persists across browsers when logged in.

### 5.2 Reading List / Queue
**Files:** `js/reading-list.js`
**Steps:**
1. Add "Add to Queue" button on temples/sites.
2. Sidebar queue section.
3. Mark as visited/remove.

**Acceptance:** Items added/removed; state synced.

### 5.3 Shareable workspaces
**Files:** `platform/api/workspace-share.js`, `js/workspaces.js`
**Steps:**
1. Serialize workspace (tabs, filters, pinned names).
2. Generate shareable hash/short URL.
3. Restore on visit.

**Acceptance:** Shared workspace URL restores state.

### 5.4 Session timeline
**Files:** `js/session-timeline.js`, `platform/api/search-queries`
**Steps:**
1. Show recent searches and clicks as timeline.
2. Group by session.

**Acceptance:** Timeline renders accurately.

---

## Phase 6 — The Pantheon Game Layer

### 6.1 XP economy ("Ink")
**Files:** `js/ink-xp.js`, `platform/api/ink-events.js`
**Steps:**
1. Define XP for: search, conversion, temple visit, copy, Oracle question, streak, collection progress.
2. POST events to backend.
3. Aggregate per user/session.

**Acceptance:** XP accrues and displays.

### 6.2 Badge system
**Files:** `js/badges.js`, `platform/api/badges.js`
**Steps:**
1. Define badge conditions.
2. Award on action detection.
3. Show badge modal/notification.

**Acceptance:** Badges awarded automatically.

### 6.3 Collections
**Files:** `js/collections.js`, `platform/api/collections.js`
**Steps:**
1. Predefined collections per pantheon/theme.
2. Progress bar.
3. Completion badge.

**Acceptance:** Collection progress updates on visits.

### 6.4 Daily Oracle Challenge
**Files:** `js/daily-challenge.js`, `platform/api/daily-challenge.js`
**Steps:**
1. Daily hidden name puzzle.
2. Clues from meaning/domain/original script.
3. Streak tracking.

**Acceptance:** New challenge daily; streaks recorded.

### 6.5 Leaderboards
**Files:** `platform/api/leaderboards.js`, `js/leaderboards.js`
**Steps:**
1. Anonymized aggregations.
2. Categories: temples visited, pantheons completed, streaks.

**Acceptance:** Leaderboard renders top users.

---

## Phase 7 — The Unicode Domain Marketplace

### 7.1 Tenant storefront pages
**Files:** `sites/{id}/tenant.html` or `/tenant/{id}`
**Steps:**
1. Rich business card: logo, description, links, reviews.
2. Contact/lease CTA.

**Acceptance:** Tenant pages render from `indexed_sites` + tenant metadata.

### 7.2 Lease/acquire flows
**Files:** `platform/api/lease.js`, `platform/public/lease.html`
**Steps:**
1. Inquiry form.
2. Status tracking (inquiry, negotiation, leased).
3. Admin approval workflow.

**Acceptance:** Lease requests tracked end-to-end.

### 7.3 Premium listings
**Files:** `platform/api/listings.js`, frontend
**Steps:**
1. Crown Jewel placements.
2. Auction-style bidding optional.

**Acceptance:** Premium listings surfaced in search.

### 7.4 Registrar integrations
**Files:** `platform/api/registrar-prices.js`
**Steps:**
1. Cache affiliate links + prices.
2. Compare registrars per domain.

**Acceptance:** Availability cards show live registrar links/prices.

### 7.5 Reviews
**Files:** `platform/api/reviews.js`
**Steps:**
1. Users review tenant sites.
2. Ratings aggregated.

**Acceptance:** Reviews display on tenant pages.

---

## Phase 8 — Autonomous Agents

### 8.1 Crawler Scout Agent
**Files:** `platform/agents/scout.js`
**Steps:**
1. Run CT-log discovery, DNS zone scanning, outbound link discovery.
2. Score and queue new `xn--` domains.
3. Expose activity log.

**Acceptance:** New domains discovered automatically weekly.

### 8.2 Availability Sentinel
**Files:** `platform/agents/sentinel.js`
**Steps:**
1. Re-check availability rows via DNS/WHOIS.
2. Update statuses.
3. Alert on changes.

**Acceptance:** Availability status accurate for sampled rows.

### 8.3 Lore Curator Agent
**Files:** `platform/agents/lore-curator.js`
**Steps:**
1. Identify entries missing lore/variants/original script.
2. Suggest additions with sources.
3. Queue for editor review.

**Acceptance:** Suggestions logged and reviewable.

### 8.4 Personal Research Agent
**Files:** `platform/agents/research-assistant.js`
**Steps:**
1. Accept user research topic.
2. Build report with citations.
3. Deliver to workspace.

**Acceptance:** Reports generated and saved to workspace.

---

## Phase 9 — Multimodal & Immersive Search

### 9.1 Voice search
**Files:** `js/voice-search.js`
**Steps:**
1. Web Speech API integration.
2. Match transcript to lexicon.

**Acceptance:** Voice queries return results.

### 9.2 Visual/glyph search
**Files:** `platform/api/glyph-search.js`
**Steps:**
1. OCR or shape matching for glyphs.
2. Return matching entries.

**Acceptance:** Uploaded glyph image returns relevant entries.

### 9.3 3D Temple Mode
**Files:** `js/temple-3d.js`, WebGL
**Steps:**
1. WebGL scene per pantheon.
2. Hotspots for entries.
3. Navigation.

**Acceptance:** 3D temple loads and is interactive.

### 9.4 AR Glyph Lens
**Files:** mobile PWA
**Steps:**
1. Camera feed + glyph detection.
2. Overlay PUNYCODEX entry card.

**Acceptance:** AR mode detects and links glyphs.

---

## Phase 10 — The Open Unicode Web Protocol

### 10.1 Protocol spec
**Files:** `docs/unicode-web-protocol.md`
**Steps:**
1. Define index schema, verification, attribution.
2. Publish v1 spec.

**Acceptance:** Spec document complete.

### 10.2 Partner program
**Files:** `platform/api/partners.js`
**Steps:**
1. Partner key tiers.
2. Usage dashboards.

**Acceptance:** Partners can register and consume API.

### 10.3 Standalone browser
**Files:** `platform/browser/`
**Steps:**
1. Package Electron shell.
2. PUNYCODEX as default search.
3. Distribution builds.

**Acceptance:** Installable browser released.

### 10.4 Open-source tooling
**Files:** GitHub repos
**Steps:**
1. Extract crawler, validator, embeddings tooling.
2. Add licenses and docs.

**Acceptance:** Repos public with CI.

---

## Cross-Cutting Concerns

- **Testing:** Add tests for every new API endpoint and frontend component. `npm test` must pass before merging any phase.
- **Performance:** Maintain p95 search latency < 300ms. Use caching, indexes, and virtualization.
- **Accessibility:** All new UI must pass WCAG 2.1 AA (keyboard navigation, aria labels, color contrast).
- **Security:** Validate all inputs, block private hosts, sanitize HTML, rate-limit public endpoints.
- **Data sync:** After canonical source changes, run `npm run generate` and `npm test`.
- **Documentation:** Update `AGENTS.md`, `README.md`, and API docs as phases land.

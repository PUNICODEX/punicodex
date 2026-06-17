# PUNYCODEX Search Engine Evolution — Master Plan

> **Objective:** Transform PUNYCODEX from a scholarly catalog into the default browser/search engine for the Unicode web, with a game layer that makes philology addictive.
> **Scope:** 10 phases, from data foundation to open protocol.
> **Status:** Phases 1–2 complete. Phase 3 in progress.

---

## Executive Summary

PUNYCODEX has built a technically excellent but data-empty search engine:

- **Crawler:** Production-grade, but all 63 indexed sites are seeded placeholders with `last_crawled = NULL`.
- **Oracle:** Template-based and ignores lore, breakdowns, variants, original scripts, embeddings, and availability.
- **Frontend:** Premium visual identity, but behaves like a catalog rather than a browser or search engine.

This plan fixes the foundation and then evolves the product into a browser-grade, AI-powered, gamified Unicode web platform.

---

## The 10 Phases

### Phase 1 — The Crawl Renaissance
*Replace placeholder data with a living, self-healing index.*

**Goal:** Every flagship domain is real-crawled, freshness-tracked, and automatically maintained.

**Deliverables:**
- [ ] Real recrawl of all 63 seeded flagships.
- [ ] Resolve 63 vs. 74 flagship discrepancy.
- [ ] Backfill `last_crawled`, `content_hash`, `quality_score`, `spam_score`, `freshness_score`.
- [ ] Add `next_crawl_after` and `crawl_interval_days` columns to `indexed_sites`.
- [ ] Add index on `last_crawled`.
- [ ] Create `crawl_history` table.
- [ ] Build `api/cron/crawler` (enqueue stale sites).
- [ ] Build `api/cron/discover` (CT-log discovery).
- [ ] Fix/remove broken `vercel.json` crons.
- [ ] Add WHOIS/DNS verification job for `availability` rows.

**Success Metrics:**
- 100% of flagships recrawled with real metadata within 30 days.
- `last_crawled` non-null for ≥95% of active sites.
- Queue processed automatically every 6 hours.

---

### Phase 2 — The Oracle Reborn
*Turn the Oracle into a true RAG scholar with citations, lore, and optional LLM reasoning.*

**Goal:** Oracle answers are grounded in the full PUNYCODEX knowledge base and sound like a domain expert.

**Deliverables:**
- [ ] Load `lore-catalog.json`, `breakdowns`, `variants`, `original-scripts.js`, `availability`, and `entries_fts` into Oracle context.
- [ ] Replace `LIKE` retrieval with FTS5 + semantic reranking.
- [ ] Expand retrieval limits and rerank.
- [ ] Improve intent detection with lexicon NER + expanded regex.
- [ ] Multi-turn memory beyond anaphora.
- [ ] Optional LLM path with mandatory citations.
- [ ] Surface Oracle as a featured-answer card above search results.
- [ ] Unify browser Oracle sidebar to call `/api/oracle`.
- [ ] Expand `test/oracle.test.js` coverage.

**Success Metrics:**
- Oracle answers rated "helpful" ≥70%.
- Average citations per answer ≥3.
- FTS5 + semantic retrieval used in 100% of queries.

---

### Phase 3 — The Search Engine Kernel
*Build a universal search backend with verticals, personalization, and query intelligence.*

**Goal:** Search is fast, scoped, intelligent, and measurable.

**Deliverables:**
- [ ] Define vertical indexes: All / Sites / Domains / Lore / API / Images / History.
- [ ] Implement unified `/api/search/v2`.
- [ ] Wire `query-intel.js` into every query path.
- [ ] Add personalization layer (safe-search, preferred pantheons, feedback).
- [ ] Infinite scroll / cursor pagination.
- [ ] Result-rank A/B framework.
- [ ] Real-time trending searches.
- [ ] Structured instant answers (converter, IDNA preview, availability, registrar prices).

**Success Metrics:**
- Search latency p95 < 300ms.
- Zero-result rate < 5%.
- User feedback events logged per 100 searches.

---

### Phase 4 — The PUNYCODEX Browser Shell
*Transform the site from a page hierarchy into a browser-like operating system.*

**Goal:** The search bar is the primary interaction surface; the product feels like Arc + Kagi + mythological archive.

**Deliverables:**
- [ ] Promote Electron shell `omnibox.js` to public web header.
- [ ] Omnibox accepts URLs, queries, commands, IDNA strings.
- [ ] Persistent tabs ("Scrolls").
- [ ] Sidebar ("Scriptorium") with history, saved searches, collections, quests.
- [ ] Global `Cmd+K` / `Ctrl+K` command palette.
- [ ] Spaces/Workspaces.
- [ ] Browser-grade keyboard shortcuts.

**Success Metrics:**
- ≥50% of page loads include omnibox interaction.
- Command palette used ≥3 times per returning user.
- Average tabs per session ≥2.

---

### Phase 5 — The Spatial Workspace
*Persistent memory across sessions, devices, and collaborative spaces.*

**Goal:** PUNYCODEX remembers the user’s scholarly journey.

**Deliverables:**
- [ ] Sync history, saved names, collections, spaces across devices.
- [ ] Reading List / Queue.
- [ ] Shareable workspaces.
- [ ] Session replay timeline.
- [ ] Cross-device "continue where you left off."

**Success Metrics:**
- Returning-user retention (7-day) up 25%.
- Workspace share links generated per week.

---

### Phase 6 — The Pantheon Game Layer
*Turn learning, discovery, and domain exploration into a progression system.*

**Goal:** The product becomes fun and habit-forming without cheapening the scholarly brand.

**Deliverables:**
- [ ] "Ink" XP economy.
- [ ] Badge/achievement system.
- [ ] Collections with progress bars.
- [ ] Day streaks (web + mobile sync).
- [ ] Daily Oracle Challenge.
- [ ] Anonymized leaderboards.
- [ ] Cosmetic rewards (themes, cursors, temple backgrounds).

**Success Metrics:**
- DAU/MAU ratio ≥30%.
- Average session length +40%.
- ≥60% of users earn at least one badge.

---

### Phase 7 — The Unicode Domain Marketplace
*Connect search intent to real ownership and leasing.*

**Goal:** Names are discoverable, leasable, and claimable.

**Deliverables:**
- [ ] Tenant storefront pages.
- [ ] Lease/acquire request flows.
- [ ] Premium listings and Crown Jewel placements.
- [ ] Registrar API integrations.
- [ ] User reviews and ratings.
- [ ] Admin lease management dashboard.

**Success Metrics:**
- Marketplace GMV tracked.
- Availability-to-registrar click conversion ≥15%.

---

### Phase 8 — Autonomous Agents
*Let AI scouts crawl, verify, and curate while users sleep.*

**Goal:** The index grows and stays accurate without manual intervention.

**Deliverables:**
- [ ] Crawler Scout Agent (CT logs, DNS zones, outbound links).
- [ ] Availability Sentinel (DNS/WHOIS re-checks).
- [ ] Lore Curator Agent (suggests missing content).
- [ ] Personal Research Agent (mini-reports).
- [ ] Live "Network Activity" panel.

**Success Metrics:**
- New domains discovered automatically per week ≥50.
- Availability status accuracy ≥90%.
- Agent-curated suggestions accepted ≥30%.

---

### Phase 9 — Multimodal & Immersive Search
*Search by voice, image, glyph, and spatial temple.*

**Goal:** PUNYCODEX escapes the 2D page and becomes a world.

**Deliverables:**
- [ ] Voice search.
- [ ] Visual/glyph search.
- [ ] 3D Temple Mode (WebGL).
- [ ] AR Glyph Lens.
- [ ] Ambient notifications.
- [ ] Spatial audio for temples.

**Success Metrics:**
- Multimodal queries ≥5% of total.
- 3D temple engagement time ≥2 minutes per visit.

---

### Phase 10 — The Open Unicode Web Protocol
*Turn PUNYCODEX from a product into a standard and an economy.*

**Goal:** PUNYCODEX becomes the default knowledge layer for the Unicode web.

**Deliverables:**
- [ ] Publish Unicode Web Index Protocol.
- [ ] Partner program for registrars/browsers/language apps.
- [ ] Release standalone PUNYCODEX Browser (Electron shell).
- [ ] API credits, partner keys, data-licensing tiers.
- [ ] Open-source non-core crawler tooling.
- [ ] Scholarly advisory council.

**Success Metrics:**
- API consumers ≥100.
- Standalone browser downloads ≥10k.
- Protocol contributions per quarter.

---

## Execution Order

1. **Now (Weeks 1–4):** Phase 1 + Phase 2.
2. **Next (Months 2–3):** Phase 3 + Phase 4.
3. **Then (Months 4–6):** Phase 5 + Phase 6.
4. **Scale (Months 6–12):** Phase 7–10.

---

## Notes

- Each phase has its own detailed breakdown in `SEARCH-ENGINE-EVOLUTION-SCOPE.md`.
- Progress is tracked via `data-version.json`, `npm test`, and the flywheel integrity validator.
- Generated files must remain in sync: run `npm run generate` after canonical source changes.

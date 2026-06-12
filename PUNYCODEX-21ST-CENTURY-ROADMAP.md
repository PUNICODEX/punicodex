# PUNYCODEX 21st Century Search Engine Evolution Roadmap

> **North Star:** Transform PUNYCODEX from a vertical Unicode-domain search engine into the world’s authoritative AI-native knowledge and discovery network for meaning-rich names, myths, symbols, and the businesses that inhabit them — fully independent of Big Tech.

---

## Executive Summary

PUNYCODEX already owns a rare asset: a curated lexicon of 850+ Unicode-restored mythological names, a working crawler, a SQLite-backed search engine, and a growing set of flagship Unicode domains. The next evolution is to wrap this core with an **AI layer** that:

1. **Fact-checks and enriches** the lexicon automatically.
2. **Answers user queries conversationally** using only PUNYCODEX-curated data.
3. **Crawls tenant websites** and rebounds off their existing SEO.
4. **Surfaces businesses** inside mythological context.
5. **Becomes a multimodal, multilingual, personalized** discovery experience.
6. **Operates as an independent platform** with public APIs, datasets, and community contributions.

This roadmap is split into six phases. Each phase has concrete deliverables, file-level change targets, acceptance criteria, and explicit connections to the commercial flywheel. The work is ordered to maximize compounding value: data quality first, then AI experience, then monetization, then ecosystem.

---

## Guiding Principles

1. **Data independence.** Own the crawl, the knowledge graph, the embeddings, and the ranking model. Use third-party AI only through swappable APIs or self-hosted models.
2. **Human-in-the-loop AI.** AI drafts and flags; humans approve high-stakes changes (entries, tiers, etymology).
3. **Vertical focus.** Do not try to be generic Google. Be the best engine for Unicode names, ancient scripts, mythology, and the businesses aligned with them.
4. **Tenant value first.** Every feature should make leasing a PUNYCODEX domain more valuable.
5. **Test everything.** Every module must have automated tests; `npm test` must remain green.

---

## Phase 1 — Foundation: Make the Engine Feel Complete

**Duration:** Now → 2 months  
**Goal:** Stabilize the deployed search engine, improve data quality, and make the user experience feel polished and trustworthy.

### 1.1 Production Hardening

**Deliverables:**
- All `/api/search/*`, `/api/entry/*`, `/api/crawler/*`, and `/api/admin/*` endpoints run reliably on Vercel.
- Middleware correctly routes deity domains to temples and serves the main site on production domains.
- Database copy-to-`/tmp` strategy is robust for all modules.
- All API modules use `platform/db/db.js` / `getDbPath()` consistently.

**File targets:**
- `platform/api/*.js`
- `platform/db/db.js`
- `middleware.js`
- `vercel.json`

**Acceptance criteria:**
- `npm test` passes with 74,000+ assertions.
- `curl https://punycodex.com/api/health/` returns `status: ok`.
- All documented API endpoints return 200 with valid JSON.

### 1.2 Search Result Presentation

**Deliverables:**
- Rich business cards for indexed sites (favicon, title, snippet, tenant badge).
- Sponsored result labels for leased/tenant entries.
- Availability cards for unleased entries.
- Clear “No results? Browse the lexicon” fallback.

**File targets:**
- `platform/public/search.html`
- `platform/api/crawler-db.js` (result shaping)

**Acceptance criteria:**
- A search for `zeus` shows the `zeús.com` business card at the top.
- A search for an unleased name shows registrar availability links.
- Results render correctly on mobile.

### 1.3 Search Filters & Sorting

**Deliverables:**
- Filter pills: All / Gods / Realms / Locations / Businesses / Available.
- Tier filter: Dual / Tier 1 / Tier 2.
- Pantheon filter dropdown.
- Sort: Relevance, Alphabetical, Tier, Recently Crawled.

**File targets:**
- `platform/public/search.html`
- `platform/api/search.js`
- `platform/api/crawler-db.js`

**Acceptance criteria:**
- Selecting “Businesses” shows only `indexed_sites` with active tenants.
- Selecting “Available” shows only `availability.status = 'available'` entries.
- Sorting by Tier places Dual-tier first.

### 1.4 Data Quality & Confidence Scoring

**Deliverables:**
- A nightly (or on-demand) AI curator script that scores every entry on:
  - Source completeness.
  - Unicode correctness (stress + length consistency).
  - Etymology presence and parseability.
  - Image/asset presence.
  - Tenant value potential.
- A “confidence score” stored in `entries.confidence_score`.
- A curator report page/dashboard.

**File targets:**
- `platform/scripts/ai-curator.js` (new)
- `platform/api/search.js` (expose score)
- Temple pages (`sites/{id}/index.html` templates) display score badge.

**Acceptance criteria:**
- Top 50 weakest entries are flagged with specific issues.
- Human can run `node platform/scripts/ai-curator.js` and get a JSON report.
- Scores appear on temple pages.

### 1.5 Tenant Onboarding & Free Lease ✅

**Deliverables:**
- Free trial lease mode: 3 or 6 months.
- Stripe subscription scheduled to start after trial.
- Reminder emails at 7 days and 1 day before billing.
- Admin can create, end, or run reminders for trial leases.

**File targets:**
- `platform/api/bookings.js`
- `platform/api/stripe.js`
- `platform/api/email.js`
- `platform/api/admin.js`
- `platform/server.js`
- `platform/public/admin-bookings.html`
- `platform/scripts/trial-reminders.js`
- `platform/db/migrate-trial-columns.js`

**Acceptance criteria:**
- A booking created with `leaseMonths` is marked as trial until the end date.
- Tenant is not billed during trial.
- Email reminders are sent automatically.
- `goLive()` still populates `tenant_front_url` for search indexing.

### 1.6 Keyword Extraction Loop

**Deliverables:**
- Crawler extracts SEO keywords from every active site.
- If `tenant_front_url` exists, that site is also crawled for keywords.
- Keyword index is refreshed weekly.
- Search uses keyword fallback when FTS returns few results.

**File targets:**
- `platform/api/keyword-extractor.js`
- `platform/crawler/index.js`
- `platform/api/crawler-db.js`

**Acceptance criteria:**
- `GET /api/sites/:punycode/keywords/` returns extracted keywords.
- Searching a tenant keyword returns the tenant in results.

---

## Phase 2 — AI Augmentation: Make It Intelligent

**Duration:** 2 → 4 months  
**Goal:** Add conversational search, AI-generated knowledge panels, and a self-improving ranking system.

### 2.1 “Ask the Oracle” Conversational Search

**Deliverables:**
- Chat UI embedded in `/search.html` and a dedicated `/oracle.html`.
- RAG pipeline over:
  - `entries` (lexicon)
  - `indexed_sites` (crawled tenant content)
  - `site_keywords` (extracted SEO terms)
  - `entity_mentions` (semantic graph)
- Every answer includes citations with links to source entries/sites.
- If no data supports the answer, the oracle says so.

**File targets:**
- `platform/api/oracle.js` (new)
- `platform/public/oracle.html` (new)
- `platform/public/search.html`
- `platform/api/query-intel.js`

**Acceptance criteria:**
- “Who is Poseidôn and what business is on his domain?” returns a synthesized answer with links.
- Citation chips are clickable.
- Oracle refuses to answer when no relevant data exists.

### 2.2 AI-Generated Temple Knowledge Panels

**Deliverables:**
- For every entry, generate and cache:
  - One-paragraph AI summary of the deity/realm.
  - Key symbols and domains.
  - Pronunciation guide.
  - AI-expanded etymology narrative.
  - “Why this name matters today.”
- Human approval workflow for AI-generated content.
- Store generated content in `entries.ai_summary`, `entries.ai_symbols`, etc.

**File targets:**
- `platform/scripts/enrich-entries.js` (new)
- `platform/api/search.js` (expose AI fields)
- `sites/{id}/index.html` templates display AI panels.

**Acceptance criteria:**
- Every temple page shows an AI-generated summary.
- Generated content is marked “AI-generated, pending review” until approved.
- Human reviewer can approve/reject each generated block.

### 2.3 Hybrid Ranking Model

**Deliverables:**
- Combine signals into a single rank score:
  - BM25 (FTS5)
  - Dense vector similarity
  - Keyword match score
  - Entity-graph proximity
  - Click-through rate
  - Tenant quality score
  - Tier/flagship bonuses
- Expose score breakdown in UI.
- A/B test ranking variants.

**File targets:**
- `platform/api/ranker.js` (new)
- `platform/api/crawler-db.js`
- `platform/api/search.js`

**Acceptance criteria:**
- Search results for the same query can be sorted by the new ranker.
- Score breakdown is visible on hover.
- Ranker passes regression tests.

### 2.4 AI Curator Agent

**Deliverables:**
- Nightly agent that:
  - Validates Unicode normalization.
  - Checks stress/length against tier rules.
  - Cross-references sources (LSJ, Beekes, Wiktionary, etc.).
  - Suggests missing variants.
  - Detects duplicate or conflicting entries.
- Curator dashboard for admin review.
- One-click approve/reject for suggestions.

**File targets:**
- `platform/scripts/ai-curator.js`
- `platform/public/admin-curator.html` (new)
- `platform/api/admin.js`

**Acceptance criteria:**
- Agent runs without errors.
- Dashboard shows open suggestions and confidence.
- Approved suggestions are applied to `entries`.

---

## Phase 3 — Multimodal & Interactive: Make It Magical

**Duration:** 4 → 6 months  
**Goal:** Add voice, visual, and interactive discovery features.

### 3.1 Voice Search

**Deliverables:**
- Microphone button in search bar.
- Speech-to-text in browser.
- Handles ancient names gracefully (fallback suggestions).

**File targets:**
- `platform/public/search.html`
- `platform/public/js/voice-search.js` (new)

**Acceptance criteria:**
- User can tap mic and say “show me Norse gods of war.”
- Query is submitted and results load.

### 3.2 Glyph & Symbol Search

**Deliverables:**
- User draws or uploads a character/glyph.
- Engine matches against Unicode data and entry scripts.
- Returns the matching deity/entity.

**File targets:**
- `platform/api/glyph-search.js` (new)
- `platform/public/glyph-search.html` (new)

**Acceptance criteria:**
- Drawing the Greek letter Ζ returns Zeús.
- Drawing a Rune returns the matching Norse entry.

### 3.3 Relationship Graph

**Deliverables:**
- Interactive graph on each temple page.
- Nodes: entries. Edges: co-mentions, family, equivalents, same-pantheon.
- Click to navigate.

**File targets:**
- `platform/public/js/entity-graph.js` (new)
- `platform/api/entity-graph.js` (new)

**Acceptance criteria:**
- Graph renders for Zeús with at least 8 connected nodes.
- Clicking a node navigates to that temple.

### 3.4 Personalized Discovery

**Deliverables:**
- User selects favorite pantheons.
- “Recommended for you” section on home/search.
- Local-only history (privacy-first).

**File targets:**
- `platform/public/js/preferences.js` (new)
- `platform/api/recommend.js` (new)

**Acceptance criteria:**
- Favoriting “Norse” surfaces Norse entries on the home page.
- Preferences persist in localStorage.

---

## Phase 4 — Commercial Flywheel: Make It Profitable

**Duration:** 6 → 9 months  
**Goal:** Turn search into a self-reinforcing revenue engine.

### 4.1 Sponsored Results & Auction

**Deliverables:**
- Tenants can bid on keywords.
- Auction logic balances bid, quality, relevance.
- Sponsored results labeled clearly.
- CPC billing via Stripe.

**File targets:**
- `platform/api/tenant-keywords.js` (new)
- `platform/api/auction.js` (new)
- `platform/public/tenant-dashboard.html` (new)

**Acceptance criteria:**
- Tenant bids on “water filter” for Poseidôn.
- Search for “water filter” shows the tenant as sponsored.
- Clicks are charged correctly.

### 4.2 Dynamic Tenant Landing Pages

**Deliverables:**
- For leased entries, generate a query-specific landing experience.
- Combines tenant info with mythological context.
- Example: “water filter” on Poseidôn explains the sea/water connection.

**File targets:**
- `platform/api/dynamic-landing.js` (new)
- `platform/public/landing.html` (new)

**Acceptance criteria:**
- Landing page renders for any leased entry + query pair.
- Content is unique and useful.

### 4.3 Tenant Analytics Dashboard

**Deliverables:**
- Impressions, clicks, CTR, top queries, competitor insights.
- Export to CSV.
- Real-time-ish (hourly) data.

**File targets:**
- `platform/api/analytics.js` (new)
- `platform/public/tenant-analytics.html` (new)

**Acceptance criteria:**
- Tenant logs in and sees search-driven traffic.
- Data matches `search_clicks` and `search_queries` tables.

### 4.4 Domain Marketplace

**Deliverables:**
- List available entries for lease in search results.
- “Claim this domain” CTA.
- Auction system for premium names.

**File targets:**
- `platform/api/marketplace.js` (new)
- `platform/public/marketplace.html` (new)

**Acceptance criteria:**
- Available entries show price and registrar links.
- User can start a lease flow.

---

## Phase 5 — Ecosystem & Independence: Build a Platform

**Duration:** 9 → 12 months  
**Goal:** Make PUNYCODEX valuable to researchers, developers, and contributors outside the main site.

### 5.1 Public API v1

**Deliverables:**
- `/api/v1/search`
- `/api/v1/entry/:id`
- `/api/v1/tenant/:punycode`
- `/api/v1/stats`
- Rate-limited free tier and paid tier.

**File targets:**
- `api/v1/**/*.js` (new)
- `platform/api/rate-limit.js` (new)

**Acceptance criteria:**
- API returns JSON with documented schemas.
- Rate limits enforced.

### 5.2 Dataset Products

**Deliverables:**
- Monthly crawl snapshot download.
- Curated Unicode-name dataset.
- Trend reports.

**File targets:**
- `platform/scripts/export-dataset.js` (new)
- `platform/public/datasets.html` (new)

**Acceptance criteria:**
- `npm run export:dataset` generates a downloadable archive.

### 5.3 Contributor Network

**Deliverables:**
- Community submission form for new entries.
- AI drafts the entry; human moderators approve.
- Reputation system for contributors.

**File targets:**
- `platform/public/contribute.html` (new)
- `platform/api/submissions.js` (new)

**Acceptance criteria:**
- User submits a name; AI generates draft; moderator approves; entry goes live.

### 5.4 Independent AI Stack

**Deliverables:**
- Fine-tune an open-source model on PUNYCODEX data.
- Host embeddings locally or via dedicated provider.
- Own all prompts and RAG context.

**File targets:**
- `platform/ai/` (new directory)
- `platform/ai/fine-tune.js` (new)
- `platform/ai/embeddings.js` (new)

**Acceptance criteria:**
- Oracle answers are generated without relying on a single closed provider.
- Embeddings service is swappable.

---

## Phase 6 — Legendary Features: Become Unforgettable

**Duration:** 12+ months  
**Goal:** Create features that define the brand.

### 6.1 “Oracle” Personality

**Deliverables:**
- Distinct voice: scholarly, poetic, epic.
- Custom greetings and sign-offs.
- Seasonal modes (e.g., solstice oracle).

**File targets:**
- `platform/ai/personas/` (new)

**Acceptance criteria:**
- Users can recognize the PUNYCODEX voice.

### 6.2 Live Events & Trends

**Deliverables:**
- Auto-generated “Today in Mythology” page.
- Trending searches widget.
- Seasonal content tied to festivals/eclipses.

**File targets:**
- `platform/public/today.html` (new)
- `platform/api/trends.js` (new)

**Acceptance criteria:**
- Page updates daily with trending/seasonal content.

### 6.3 Cross-Pantheon Synthesis

**Deliverables:**
- Query: “sky gods across all pantheons.”
- AI synthesizes Zeús, Thor, Indra, Amaterasu, etc.
- Side-by-side comparison table.

**File targets:**
- `platform/api/synthesis.js` (new)
- `platform/public/compare.html` (new)

**Acceptance criteria:**
- Synthesis query returns structured comparison.

### 6.4 AR / Mobile Experiential Layer

**Deliverables:**
- Mobile camera scans a Unicode domain in the wild.
- Overlay shows deity card, tenant info, pronunciation.

**File targets:**
- `mobile/` integration

**Acceptance criteria:**
- Scanning `zeús.com` on a phone displays the temple card.

---

## Implementation Order: First 12 Concrete Tasks

1. **AI Curator MVP** — score all entries, flag the 50 weakest.
2. **Ask the Oracle prototype** — RAG chat over the lexicon only.
3. **Tenant keyword refresh loop** — weekly re-crawl of `tenant_front_url`.
4. **Search filters & sorting** — All / Gods / Realms / Businesses / Available.
5. **Rich business cards** — improve search result rendering.
6. **Free lease mode** — 3/6 month trial with delayed Stripe billing.
7. **AI-generated summaries** — one paragraph per entry, human approval.
8. **Hybrid ranker** — combine BM25 + vectors + keywords + clicks.
9. **Entity relationship graph** — interactive graph on temple pages.
10. **Tenant analytics dashboard** — impressions, clicks, top queries.
11. **Public API v1** — search, entry, tenant endpoints.
12. **Contributor submission flow** — AI drafts, human approves.

---

## Success Metrics

| Metric | Baseline | 6-month target | 12-month target |
|--------|----------|----------------|-----------------|
| Indexed sites | 1,600+ | 3,000+ | 10,000+ |
| Active tenants | ~0 | 25 | 100+ |
| Weekly search queries | unknown | 1,000 | 10,000 |
| Avg. result click-through | unknown | 5% | 8% |
| Entry confidence score avg | TBD | 85% | 95% |
| Public API consumers | 0 | 5 | 50+ |

---

## Conclusion

This roadmap turns PUNYCODEX into a 21st-century product: an AI-curated, mythology-focused, business-enabled search network that is independent, useful, and defensible. The work begins with data quality and AI curation, because everything else — search, tenants, revenue, community — depends on the lexicon being accurate, rich, and alive.

The first task is the **AI Curator MVP**.

# PUNYCODEX Strategic Vision: The Unicode Web as Real Estate

## North Star

PUNYCODEX evolves from a curated Unicode domain directory into an **archetype-aligned domain leasing platform** with a genuine search engine. Each Unicode domain becomes leasable real estate where tenants build businesses that resonate with the mythological energy of the name.

## The Pivot

### From → To

| Before | After |
|--------|-------|
| Static "temple" pages (scholarly restorations) | Tabbed domain pages: **Front** (tenant) + **Lore** (scholarly) |
| Domains as museum pieces | Domains as revenue-generating assets |
| Search engine finds names | Search engine finds **real businesses** on Unicode domains |
| 48 indexed sites (all ours) | Hundreds of tenant sites with diverse, crawlable content |
| "Find a domain for Apollo" | "Find a wireless modem company on Hermès" |

## The Architecture

### Domain Page Structure

Each `/sites/{id}/` becomes a tabbed interface:

```
┌─────────────────────────────────────────────┐
│  hermês.com  │  [Front] [Lore] [Analytics] │
├─────────────────────────────────────────────┤
│                                             │
│  FRONT TAB (leased content)                 │
│  ┌─────────────────────────────────────┐   │
│  │  FastMesh Wireless                  │   │
│  │  "Commercial-grade wireless routers │   │
│  │   for enterprises."                 │   │
│  │                                     │   │
│  │  [Shop] [Contact] [About]           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  LORE TAB (preserved PUNYCODEX content)     │
│  ┌─────────────────────────────────────┐   │
│  │  Hermês — Messenger, Commerce       │   │
│  │  Greek · Tier-1 · PIE *ser-         │   │
│  │  Etymology · Cognates · Sources     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Tenant Model

```
tenant_name:          "FastMesh Wireless"
tenant_category:      "telecommunications"
tenant_front_url:     "https://hermês.com" (or subpath)
archetype_score:      0.87  (crawler-computed: how well content matches Hermes archetype)
lease_status:         "leased" | "available" | "reserved" | "flagship"
```

### Search Engine Role

The dual search we built prepares for this:

| Search Mode | Future Role |
|-------------|-------------|
| **Web Search** | Ranks tenant sites by content relevance + archetype alignment. "wireless modem" → finds FastMesh on hermês.com because BM25 matches content + archetype score boosts Hermes↔communication alignment |
| **Domain Discovery** | Browse available domains for lease. Filters by pantheon, tier, availability |

### The "Hermes Modem" Example

User searches: *"wireless modem near me"*

1. **FTS5 crawl** finds pages containing "wireless modem"
2. **One result** is `xn--herms-ksa.com` (hermês.com) — FastMesh Wireless
3. **Composite scoring** (extensible formula):
   ```
   score = bm25 * (1.0 + tier_bonus + flagship_bonus + archetype_score + ...)
   
   FastMesh on hermês.com:
   - bm25: -2.4 (strong content match for "wireless modem")
   - tier_bonus: +0.3 (Hermes is Tier-1)
   - flagship_bonus: +0.2
   - archetype_score: +0.85 (Hermes = messenger/commerce/speed; aligns with communication tech)
   - multiplier: 2.35
   - final: -2.4 * 2.35 = -5.64
   ```
4. **Result card** shows:
   ```
   hermês.com › FastMesh Wireless › "Commercial-grade wireless routers..."
   🏛️ Flagship · Greek · Tier-1 · Archetype Match: 85%
   ```

## Why This Moat Is Real

Google cannot replicate this because:

1. **Semantic archetype layer**: No search engine maps business content to mythological archetypes. PUNYCODEX owns the lexicon + the domain + the mapping.
2. **Unicode domain authority**: We are the registry of record for these specific Unicode restorations. Google indexes us; we *are* the namespace.
3. **Curated tenant quality**: Not anyone can lease — tenants must archetypally align. This creates a filter bubble of quality that generic search can't match.

## Current State → Future State

| Component | Current | Future |
|-----------|---------|--------|
| `indexed_sites` | 48 flagships, all "PUNYCODEX Temple" | 200+ tenant sites with real business content |
| `archetype_score` | 0.0 (default) | Computed by crawler: semantic match between page content and entry meaning |
| `tenant_*` columns | NULL | Populated for leased domains |
| Search ranking | BM25 × tier × flagship | BM25 × tier × flagship × archetype × tenant_quality × geo |
| Domain pages | Single temple page | Tabbed: Front / Lore / Lease Info |
| Revenue | None | Lease fees + search placement |

## Technical Prep Already Done

The Phase 5 search engine split was architected for this:

- ✅ **FTS5 on `indexed_sites`** — indexes tenant page content (title, h1, description, body)
- ✅ **Composite scoring** — additive multiplier structure: `1.0 + tier + flagship + archetype + ...`
- ✅ **Tenant columns** — `tenant_name`, `tenant_category`, `tenant_front_url`, `archetype_score`, `lease_status`
- ✅ **Dual search UI** — Web Search for consumers, Domain Discovery for potential tenants
- ✅ **Crawler infrastructure** — bulk crawl, recrawl, spam flagging all ready for tenant sites

## Next Steps (When Ready)

1. **Archetype scoring algorithm**: NLP pipeline that scores how well a crawled page's content maps to the domain's `meaning` and `etymology` fields
2. **Tenant onboarding API**: `POST /api/tenants` with validation that tenant category aligns with archetype
3. **Tabbed domain pages**: Rewrite `sites/{id}/` templates to support Front/Lore tabs
4. **Geo search**: Add lat/lng to `indexed_sites` for "near me" queries
5. **Lease management dashboard**: `/admin.html` tenant CRUD, lease expiration alerts

---

*This document is a strategic north star. Implementation of tenant features happens only when the business model is ready. The search engine architecture is prepared for it now.*

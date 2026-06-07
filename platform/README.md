# PUNYCODEX Platform

The search engine and crawler backend for PUNYCODEX.

## Quick Start

```bash
# Install dependencies (from project root)
npm install

# Initialize database (rebuilds from current lexicon)
npm run db-init

# Start the server
npm run platform
```

Server runs on `http://localhost:3456`.

## Database

SQLite at `db/punycodex.db`.

| Table | Purpose |
|-------|---------|
| `entries` | 850 lexicon items |
| `breakdowns` | Character-by-character Unicode analysis |
| `entries_fts` | FTS5 full-text search index |
| `indexed_sites` | Crawled xn-- domains |
| `availability` | Unregistered domains → registrar links |

## API Endpoints

### Phase 1 — Lexicon
- `GET /api/health` — System status
- `GET /api/search?q=zeus&pantheon=greek&tier=1` — FTS5 search with filters
- `GET /api/entry/:id` — Single entry + breakdown + site + availability
- `GET /api/stats` — Entry counts by pantheon
- `GET /api/pantheons` — List all pantheons
- `GET /api/flagships` — All flagship entries

### Phase 2 — Crawler
- `GET /api/crawler/stats` — Crawler metrics
- `GET /api/sites?status=active` — List indexed sites
- `GET /api/sites/search?q=zeus` — Search indexed sites
- `POST /api/crawl` — Crawl single domain `{ domain: "zeús.com" }`
- `POST /api/crawl/bulk` — Bulk crawl `{ domains: [...] }`
- `POST /api/crawl/recrawl` — Re-crawl all active sites

### Phase 2 — Availability
- `GET /api/availability/:entryId` — Check domain availability
- `POST /api/availability/:entryId` — Update availability status

## Frontend

| Page | URL |
|------|-----|
| Search | `http://localhost:3456/search.html` |
| Entry Detail | `http://localhost:3456/entry.html?id=zeus` |
| Admin Dashboard | `http://localhost:3456/admin.html` |

## Registrars

Availability layer generates affiliate links for:
- GoDaddy
- Namecheap
- Porkbun
- Dynadot
- Spaceship

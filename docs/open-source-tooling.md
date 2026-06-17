# PUNYCODEX Open-Source Tooling

This document describes the standalone tools extracted from PUNYCODEX that can
be reused, packaged, and released as open-source libraries.

## 1. Unicode Domain Crawler

Path: `platform/crawler/`, `platform/scripts/bulk-crawl.js`

Features:
- IDNA / punycode normalization
- Safe HTTP fetching with timeout and redirect handling
- Content extraction (title, meta, Open Graph, structured data)
- SQLite persistence with FTS5 search

Release package: `@punycodex/crawler`

## 2. Scholarly Lexicon Engine

Path: `type/js/lexicon.js`, `platform/api/search.js`

Features:
- 859-entry canonical lexicon with tier system
- FTS5 + semantic vector retrieval
- Variant and breakdown resolution

Release package: `@punycodex/lexicon`

## 3. Oracle RAG

Path: `platform/api/oracle.js`, `platform/api/oracle-context.js`

Features:
- Intent detection
- Lore-aware answer synthesis
- Optional LLM grounding with citations

Release package: `@punycodex/oracle`

## 4. Query Intelligence

Path: `platform/api/query-intel.js`

Features:
- Spell correction / Did you mean
- Related searches
- Autocomplete

Release package: `@punycodex/query-intel`

## 5. Embeddings Pipeline

Path: `platform/api/embeddings.js`, `platform/api/semantic-search.js`

Features:
- Local transformer embeddings via `@xenova/transformers`
- Vector similarity search in SQLite

Release package: `@punycodex/embeddings`

## Release Checklist

- [ ] Choose license (CC BY 4.0 recommended for data; MIT for code)
- [ ] Add `LICENSE` files per package
- [ ] Set up per-package `package.json`
- [ ] Add CI workflows for tests and publishing
- [ ] Publish to npm/GitHub Packages
- [ ] Document breaking changes and version matrix

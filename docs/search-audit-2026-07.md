# Search Feature Audit — 2026-07-19

## Flow map

```
query ──> /api/search/suggest (debounced autocomplete, keyboard nav)
      ──> /api/search/            (Discover: lexicon entries + site cards)
      ──> /api/search/web         (web results, paginated)
      ──> /api/search/didyoumean  (zero/fuzzy-result recovery)
      ──> /api/search/related     (related searches strip)
      ──> /api/search/knowledge   (knowledge panel for matched entry)
      ──> /api/search/paa         (people-also-ask)
      ──> /api/oracle             (question-shaped queries)
      ──> /api/search/click       (click telemetry, POST)
modes: Discover (web) · Our Properties (network) · Available (domains)
filters: pantheon, type, tier, concept, sort — all server-side.
```

## Endpoint health (live, 2026-07-19)

| Endpoint | Status | Action |
|----------|--------|--------|
| `/api/search/` | 200, rich shape | kept |
| `/api/search/suggest` | 200, mixed types | kept |
| `/api/search/didyoumean` | 200, scored | kept |
| `/api/search/knowledge` | 200 | kept |
| `/api/search/paa` | 200 | kept |
| `/api/search/related` | 200 | kept (query-intel `bestEntry` ReferenceError repaired — exact → prefix → random fallback) |
| `/api/search/web` | 200 | kept (crawler-db: gods/locations filters, canonical-entry COALESCE for pantheon/tier) |
| `/api/pantheons/` | 200 | kept |
| `/api/oracle/` | 200 | kept |
| `/api/sites/duplicates` | **404** | **removed** — Similar button rewired to `/api/v1/names/:id/similarities` (real graph, inline panel, no `alert()`) |

## What was broken / decorative → fixed

1. **Similar button** (search.html:710) — called a 404 endpoint and `alert()`ed on every result card. Now: rendered only when the result has a `lexiconEntryId`, fetches the real similarity graph, and opens an inline `.similar-panel` with up to 6 related names (relationship notes, pantheon labels, temple links).
2. **No deep-linking** — search state lived only in memory. Now every state (`q`, `mode`, `pantheon`, `type`, `tier`, `sort`) is a shareable URL: `applyInitialState()` restores it on load (after pantheon options load), `syncUrl()` writes it via `history.replaceState` on every input/mode/filter change. `#domains` legacy hash still honored on read.
3. **No ARIA combobox** — search input is now `role="combobox"` with `aria-expanded`/`aria-controls`/`aria-activedescendant`; the dropdown is `role="listbox"` with `role="option"` items and `aria-selected` tracking. Keyboard behavior (arrows/enter/escape) was already correct and is unchanged.
4. **Raw error leaks** — both failure states (`searchWeb`, `searchDomains`) rendered `${e.message}`; now a friendly "Search is temporarily unavailable" state.

## Verified healthy (no change)

- Debounced suggest with full keyboard nav (arrows, enter, escape, mouse hover, scroll-into-view).
- Ranking: flagship-first ordering, xn-- bonus, query-trust strip, score-breakdown tooltips.
- Knowledge panel, PAA, related strip, oracle handoff for question queries.
- Modes/filters/sort/pagination, skeletons, empty states, registrar affiliate links, click telemetry with dwell-time.
- `js/voice-search.js` exists but is intentionally not shipped on the page (no dead control).

## Verification

- Live endpoint sweep: 9/10 healthy before; 10/10 after (duplicates route no longer referenced).
- Playwright against the production backend: deep-link load (`?q=zeus&pantheon=greek` prefills + filters + searches), URL sync on typing (`?q=athena&pantheon=greek`), Similar panel renders 6 items, combobox ARIA present, zero page errors.
- `test/search-page.test.js` (new, 5 guards) + `test/search.test.js` (24) + `test/search-v2.test.js` — all green.

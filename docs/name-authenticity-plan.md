# PUNICODEX Name Authenticity Checker — Enterprise 20-Phase Implementation Plan

## Vision

A **Name Authenticity Checker** that lets anyone paste a name or domain and instantly receive an authoritative verdict:

- **Authentic Canonical** — matches the PUNICODEX lexicon exactly.
- **Authentic Styled Variant** — a legitimate alternate spelling (macron-only, different accent convention, etc.) that the lexicon recognizes.
- **Suspicious / Deceptive Spoof** — uses confusable Unicode characters, mixed scripts, or homoglyphs to impersonate a canonical name.
- **Unknown** — not in the corpus and not obviously deceptive.
- **Blocked** — matches a threat feed or blocklist.

It must be **variant-aware**, **attack-flawless**, **visually inevitable**, and deeply wired into the flywheel: fed by the crawler, the lexicon, and user reports; and feeding the search engine, the API, the browser extension, and the threat feed.

---

## Phase 1 — Canonical Trust Kernel 2.0

**Objective:** Refactor `platform/api/homograph-service.js` into a clean, extensible authenticity kernel.

**Deliverables:**
- Rename concept from "trust tier" to **authenticity verdict** while preserving the existing public API.
- Introduce a `Verdict` object schema:
  ```ts
  {
    verdict: 'canonical' | 'styled' | 'suspicious' | 'unsafe' | 'unknown',
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical',
    canonicalMatch: { id, ascii, unicode, pantheon, tier, variantType? } | null,
    input: { raw, normalized, punycode?, displayDomain? },
    analysis: {
      scripts: string[],
      mixedScripts: boolean,
      confusables: { char, position, mappedTo, risk }[],
      visualDeviation: number, // 0–1
      variantDistance: number, // 0–1 from canonical
    },
    reason: string,
    recommendations: string[],
    safeAlternatives: { ascii, unicode, punycode, link }[],
  }
  ```
- Preserve backward compatibility for `classifyTerm`, `classifyDomain`, `classifyQueryAndDomain`.

**Tests:**
- Unit tests for each legacy function still returning the old tiers.
- Snapshot tests for new `Verdict` schema.

**Flywheel impact:** Establishes the canonical data contract every downstream consumer will use.

---

## Phase 2 — Character-Level Decomposition Engine

**Objective:** Build `platform/api/name-decomposer.js` that breaks any input into a per-character attestation.

**Deliverables:**
- `decompose(input)` returns an array for every code point:
  - `char`, `codePoint`, `script`, `category`, `isAscii`, `isDiacritic`, `isCombining`, `isControl`.
  - `canonicalExpected`: the expected character if this were the canonical ASCII/Unicode form.
  - `confusableMapping`: mapping to ASCII/Latin if it exists.
  - `deviationScore`: 0–1 per character.
- Detect **invisible characters** (zero-width spaces, joiners, variation selectors, bidirectional overrides).
- Detect **overlong sequences** (e.g., multiple combining diacritics stacking).
- Detect **NFKC normalization distance**.

**Tests:**
- Test every ASCII letter returns `deviationScore: 0`.
- Test Cyrillic `а` returns mapping to Latin `a` with high deviation.
- Test zero-width joiner returns invisible-character flag.
- Test `é` (e + combining acute) vs `é` (precomposed) normalization distance.

**Flywheel impact:** Provides the evidence trail that makes the verdict explainable.

---

## Phase 3 — Authenticity Verdict Taxonomy

**Objective:** Define the exact verdicts, severities, and UX copy.

**Verdicts:**
| Verdict | Severity | Meaning |
|---------|----------|---------|
| `canonical` | none | Exact lexicon match (ASCII, Unicode, or search key). |
| `recognized-variant` | low | A lexicon-listed variant (`macron-only`, `ideal`, `alt-stress`, etc.). |
| `styled` | low | Legitimate Unicode styling not in lexicon but clearly non-deceptive (e.g., `𝓩𝓮𝓾𝓼`). |
| `transliteration-uncertain` | medium | Matches after folding but not a listed variant; might be a dialect/loan. |
| `homograph-spoof` | high | Confusable substitution spoofing a canonical name. |
| `mixed-script-spoof` | high | Multiple scripts in one label. |
| `lookalike-domain` | high | Domain label visually mimics a canonical entry. |
| `unsafe` | critical | Matches blocklist/threat feed. |
| `unknown` | none | No canonical basis and no deception signals. |

**Deliverables:**
- `platform/api/authenticity-verdicts.js` with constants, severity ordering, and human-readable copy.
- `explainVerdict(verdict)` producing user-facing paragraphs.

**Tests:**
- Each verdict has copy.
- Severity ordering is total and stable.

---

## Phase 4 — Variant-Aware Matching

**Objective:** Ensure the checker understands all legitimate lexicon variants and does not false-positive on them.

**Deliverables:**
- Load `entry.variants` into the canonical lookup.
- Match against `owned`, `ideal`, `macron-only`, `alt-stress`, `ascii`, and any future variant types.
- For each variant match, return `variantType` and `variantSources`.
- Add `strictDomains` flag: a styled variant on a third-party domain is downgraded from `styled` to `suspicious` unless the domain is in `canonical_domains`.

**Tests:**
- `Apollōn` (macron-only) → `recognized-variant`.
- `Apóllōn` (owned) → `canonical`.
- `apollōn.com` if not registered → `suspicious` (strictDomains=true) or `styled` (strictDomains=false).
- `áres` → `canonical`.

**Flywheel impact:** Protects the scholarly nuance that makes PUNICODEX unique.

---

## Phase 5 — Confusable Atlas Expansion

**Objective:** Move from a flat map to a structured, multi-dimensional confusable atlas.

**Deliverables:**
- `platform/api/confusable-atlas.js`:
  - `CONFUSABLE_TO_ASCII` (existing, expanded).
  - `SCRIPT_RISK` matrix: e.g., Latin↔Cyrillic = high, Latin↔Greek = medium-high, Latin↔Runic = low.
  - `CONTEXTUAL_CONFUSABLES`: e.g., `rn` → `m`, `vv` → `w`.
  - `WHOLE_SCRIPT_FOLDS`: fold any string to a Latin skeleton using NFKC + confusable mapping.
- Compute **visual similarity** using skeleton fold + Levenshtein ratio.
- Add **script-pair risk** to deviation score.

**Tests:**
- `pаypal` (Cyrillic а) skeleton = `paypal`, high risk.
- `arnazon` skeleton = `amazon` due to `rn` context.
- `οο` (Greek omicron twice) skeleton = `oo`.

**Flywheel impact:** The atlas becomes a learned artifact; crawler discoveries can propose new confusable entries.

---

## Phase 6 — Full URL / Domain Authenticity Mode

**Objective:** Extend classification from labels to full URLs, eTLD-aware.

**Deliverables:**
- `classifyUrl(url)`:
  - Parse protocol, hostname, path, query.
  - Decode punycode labels.
  - Classify each label independently.
  - Detect eTLD spoofing (`xn--pple-wmc.com` pretending to be `apple.com`).
  - Flag path/query homographs (`/login?zeus.com` → actually `zeus.xn--com-...`).
- `classifyDomain` remains backward-compatible.

**Tests:**
- `https://аpple.com` → high risk on hostname label.
- `https://apple.com.xn--pple-wmc.com` → high risk on registrable domain.
- `https://zeus.com/аbout` → suspicious path segment.

---

## Phase 7 — Authenticity API Endpoints

**Objective:** Build the public API surface.

**Deliverables:**
- `GET /api/v1/authenticity?q={name}`
- `POST /api/v1/authenticity/batch` with up to 100 names.
- `GET /api/v1/authenticity/url?url={url}`
- `GET /api/v1/names/{id}/authenticity` — verdict for a canonical entry's variants and registered domains.

All endpoints use `createApiHandler`, validation helpers, rate limits.

**Tests:**
- API v1 integration tests for each endpoint.
- Rate-limit tests.
- Batch validation tests.

---

## Phase 8 — OpenAPI Specification & Swagger Docs

**Objective:** Document the new endpoints in the canonical OpenAPI spec.

**Deliverables:**
- Add `/authenticity`, `/authenticity/batch`, `/authenticity/url`, `/names/{id}/authenticity` to `platform/api/openapi.json`.
- Define `AuthenticityVerdict`, `AuthenticityAnalysis`, `AuthenticityBatchResponse` schemas.
- Add example requests/responses for canonical, variant, spoof, and unsafe cases.

**Tests:**
- Verify `openapi.json` is valid JSON.
- Verify every new path has a corresponding handler file.

---

## Phase 9 — Threat Feed & Reporting Tables

**Objective:** Create the persistent backend for spoof discovery and human review.

**New tables:**
```sql
CREATE TABLE discovered_spoofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input TEXT NOT NULL,
  input_type TEXT CHECK(input_type IN ('name','domain','url')) DEFAULT 'name',
  punycode TEXT,
  verdict TEXT NOT NULL,
  severity TEXT NOT NULL,
  canonical_entry_id TEXT,
  discovery_source TEXT, -- 'crawler','api','extension','manual'
  confidence REAL DEFAULT 0,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  report_count INTEGER DEFAULT 0,
  reviewed_at DATETIME,
  reviewer_decision TEXT CHECK(reviewer_decision IN ('confirmed','false-positive','ignored')),
  UNIQUE(input, input_type)
);

CREATE TABLE spoof_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovered_spoof_id INTEGER,
  reporter_token TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(discovered_spoof_id) REFERENCES discovered_spoofs(id)
);

CREATE TABLE authenticity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input TEXT NOT NULL,
  input_type TEXT,
  verdict TEXT,
  severity TEXT,
  canonical_entry_id TEXT,
  client_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes** on `input`, `verdict`, `canonical_entry_id`, `discovery_source`.

**Tests:**
- Migration tests.
- CRUD tests for each table.

---

## Phase 10 — Crawler Spoof Discovery Pipeline

**Objective:** Every discovered/crawled Unicode domain is automatically classified and fed into the authenticity system.

**Deliverables:**
- Extend `UnicodeCrawler.matchLexicon()` to call `classifyDomain()` even when no direct match exists.
- If a domain is classified as `homograph-spoof`, `mixed-script-spoof`, or `lookalike-domain`, upsert into `discovered_spoofs`.
- Link spoof record to `canonical_entry_id` of the impersonated name.
- Add admin-only endpoint `POST /api/crawler/review-spoof` to confirm/ignore.
- Cron job `api/cron/spoof-discovery` to re-score unreviewed spoofs nightly as the lexicon evolves.

**Tests:**
- Crawler unit tests with mocked fetch and known spoof domains.
- Test that confirmed spoofs update `unsafe_patterns`.

**Flywheel impact:** The web teaches the model what deception looks like.

---

## Phase 11 — Search Engine Integration

**Objective:** Search results carry authenticity verdicts; deceptive results are down-ranked or flagged.

**Deliverables:**
- `search-v2.js` attaches a `verdict` object to every result.
- Add `trustBoost` to ranking: canonical +0.4, variant +0.2, styled 0, suspicious -0.5, unsafe excluded.
- Add UI badges in `search.html` for result trust:
  - Green seal for canonical/variant.
  - Amber for styled.
  - Red pulse for suspicious.
- Add a "Show only authentic" filter.

**Tests:**
- Search result trust tier tests.
- Ranking tests verify unsafe results are filtered.

---

## Phase 12 — Browser Extension Enhancement

**Objective:** Bring the checker to the browser.

**Deliverables:**
- Context menu: "Check authenticity with PUNICODEX" for selected text or link.
- Content script highlights suspicious links on pages with a subtle border.
- Popup mini-checker with instant verdict.
- Report button to send spoof findings to `discovered_spoofs`.

**Tests:**
- Extension popup tests.
- Content script DOM tests.

---

## Phase 13 — Public Authenticity Checker Page

**Objective:** A flagship UI at `/authenticity/index.html`.

**Deliverables:**
- Single-page app feel:
  - Large input with paste detection.
  - Real-time debounced analysis.
  - Visual character map: each character colored by script/confusable status.
  - Verdict card with animated severity ring.
  - "Safe alternatives" section with links to canonical entries.
  - Domain/URL mode toggle.
  - Report button.
- Responsive, dark-mode-first, using the existing typography (Cinzel/Cormorant/Montserrat).

**Tests:**
- Frontend smoke test for page existence and script loading.
- E2E-style Node tests using JSDOM or puppeteer if available.

---

## Phase 14 — Visual Design System for Trust

**Objective:** A cohesive, inevitable aesthetic for trust states.

**Deliverables:**
- `css/authenticity.css` with CSS custom properties:
  ```css
  --auth-canonical: #00f0a0;
  --auth-variant: #a8f0c0;
  --auth-styled: #f0c040;
  --auth-suspicious: #ff5e5e;
  --auth-unsafe: #ff2a2a;
  --auth-unknown: #9aa3ad;
  ```
- Animated severity rings using SVG stroke-dashoffset.
- Glassmorphism panels, subtle aurora background.
- Accessibility: color is not the only signal; icons + text always present.

**Tests:**
- Visual regression not automated; manual checklist in PR template.
- Lighthouse accessibility score ≥ 95.

---

## Phase 15 — Type Tool & Mobile Integration

**Objective:** Authenticity checking appears wherever users interact with names.

**Deliverables:**
- Type tool shows a trust badge next to the restoration result.
- If the user types a spoof, the tool refuses to generate punycode and explains why.
- Mobile app gets an "Authenticator" tab.
- Share sheet support: paste from clipboard on mobile.

**Tests:**
- Type tool tests for spoof refusal.
- Mobile smoke tests.

---

## Phase 16 — Admin Threat Review Dashboard

**Objective:** Human-in-the-loop review for discovered spoofs.

**Deliverables:**
- `platform/public/admin-authenticity.html`:
  - Queue of unreviewed discovered spoofs.
  - Filters by severity, source, pantheon.
  - One-click confirm/ignore.
  - Bulk import to `unsafe_patterns`.
  - Stats cards and recent reports.
- Admin API endpoints under `/api/admin/authenticity/*`.

**Tests:**
- Admin route tests.
- UI smoke tests.

---

## Phase 17 — Comprehensive Test Suite

**Objective:** Flawless confidence through exhaustive testing.

**Deliverables:**
- `test/authenticity-service.test.js` — core logic.
- `test/authenticity-api.test.js` — REST contract.
- `test/authenticity-decomposer.test.js` — character-level.
- `test/authenticity-crawler.test.js` — crawler integration.
- `test/authenticity-variants.test.js` — variant matrix.
- Fuzz tests with 1,000 generated confusable strings.
- Regression tests for every bug found during development.
- Performance test: 100 concurrent batch checks < 500ms total.

**Goal:** Add 500+ new focused test cases, pushing total > 1,500.

---

## Phase 18 — Rate Limiting, Caching & Observability

**Objective:** Production-grade scale.

**Deliverables:**
- Redis-backed caching for repeated identical inputs (`sha256(input)` key, TTL 1 hour).
- Per-endpoint rate limits:
  - Free: 30/min authenticity, 5/min batch.
  - Hobby: 300/min.
  - Pro: 3,000/min.
- Metrics emitted to `api_request_log` with `path=/authenticity`.
- Prometheus-style `/api/health/authenticity` endpoint with cache hit rate, average latency, spoof discovery count.

**Tests:**
- Cache hit/miss tests.
- Rate-limit tests per tier.

---

## Phase 19 — Data Flywheel & Feedback Loop

**Objective:** The system gets smarter the more it is used.

**Deliverables:**
- User report endpoint writes to `spoof_reports` and increments `discovered_spoofs.report_count`.
- Nightly cron aggregates high-report-count unreviewed spoofs into a candidate blocklist.
- Confusable atlas can be updated via admin UI without code deploy.
- Quarterly retrain: script to analyze all `authenticity_log` entries and suggest new confusable mappings.
- Public dataset export: monthly CSV of reviewed spoof patterns (with license).

**Tests:**
- Report aggregation tests.
- Cron idempotency tests.

---

## Phase 20 — Launch, Documentation & Marketing

**Objective:** Ship with fanfare and clarity.

**Deliverables:**
- `/about/authenticity.html` explaining the feature and the science.
- Blog post: "The PUNICODEX Authenticity Checker: How we detect Unicode homograph attacks."
- API cookbook examples in 5 languages.
- Social/Open Graph assets for the checker page.
- Update `data-version.json` schema to include `authenticityModelVersion`.
- Add footer and nav links.

**Tests:**
- Link checker passes.
- SEO validator passes.
- Flywheel integrity passes.

---

## Cross-Cutting Concerns

- **Backwards compatibility:** Old `classifyTerm`/`classifyDomain` outputs are preserved or extended, never broken.
- **Privacy:** `authenticity_log` stores only hashed client identifiers; raw IPs never persisted.
- **Bias / over-blocking:** Styled variants and non-Latin canonical scripts must not be penalized. The model is conservative: deception must be proven against a canonical target.
- **Performance:** All classification is synchronous and < 5ms per name; batch endpoint leverages caching and connection pooling.
- **Canonical source discipline:** No hard-coded confusable maps in source if they can be data; maps live in JSON and are validated by `npm test`.

---

## Definition of Done

1. All 20 phases implemented, tested, and committed.
2. `npm run generate`, `npm run format:check`, `npm run lint`, and `npm test` are green.
3. Divergence gate passes.
4. API v1 docs show the new endpoints.
5. The public `/authenticity/` page is live and visually polished.
6. The crawler feeds discovered spoofs into the threat pipeline.
7. The search engine surfaces verdicts and filters unsafe results.
8. Total test count exceeds 1,500 focused cases.

---

*Plan version 1.0 — generated for the PUNICODEX canonical Unicode name platform.*

# PUNICODEX Name Authenticity Shield — V2 Plan
## From Academic Checker to an Unspoofable, Browser-Grade, Enterprise-Licensable Global Standard

**Version:** 2.0-alpha  
**Goal:** Build a name-authenticity system so accurate, so explainable, and so operationally hardened that a unicorn security company, a major browser vendor, or a Fortune-500 brand-protection team could license it tomorrow with full trust.  
**Target accuracy:** 99.9999% true-positive detection of deceptive homograph / mixed-script / lookalike attacks with a false-positive rate below 0.001% on legitimate Unicode names and scholarly variants.  
**Philosophy:** *Conservative escalation, transparent evidence, tiered response, continuous learning, privacy by design.*

---

## Part I — Battlefield Audit of the V1 Checker

The V1 implementation (committed as `f8aa45ee`) is a solid scholarly foundation. It must be hardened into a product-grade shield.

### What V1 does well
1. **Verdict taxonomy** — nine mutually-exclusive verdicts from `canonical` to `unsafe`.
2. **Variant awareness** — recognizes lexicon variants (macron-only, ideal, alt-stress, ASCII).
3. **Confusable atlas** — maps Greek, Cyrillic, Armenian, and Georgian lookalikes to Latin skeletons.
4. **Threat feed tables** — `discovered_spoofs`, `spoof_reports`, `authenticity_log` with migrations and indexes.
5. **API surface** — `/api/v1/authenticity/check`, `/batch`, `/report` and `/api/v2/...` equivalents.
6. **Integration breadth** — crawler, search engine, browser extension, public page, admin dashboard, type tool, mobile header.
7. **Test coverage** — 1,720 canonical-form case-matrix assertions plus service/atlas/feed tests.

### Gaps that still allow deception or false alarms
1. **No perceptual/font rendering model** — the skeleton fold is a string heuristic; it cannot detect `m` vs `rn` at the pixel level, font-family differences, or zero-width-joiner ligatures.
2. **Confusable atlas is incomplete** — missing CJK unification, Arabic forms, Indic conjuncts, mathematical alphanumeric symbols, emoji, fullwidth, enclosed alphanumerics, and historic scripts.
3. **No contextual script risk** — `Hermès` (Latin + legitimate combining grave) is not differentiated from `Hermès` with a Cyrillic `е` or Greek `ὲ` by context; the system relies on a small map.
4. **No IDNA2008 / UTS #46 deep validation** — punycode edge cases (leading/trailing hyphen, label length, non-LDH, dotless-i, case folding) are not enforced.
5. **No registrable-domain / eTLD awareness** — `apple.com.evil.com` and `xn--pple-wmc.com` are not distinguished robustly.
6. **No brand / trademark corpus beyond the PUNICODEX lexicon** — a major brand such as `Hermès`, `Nike`, `Apple`, `Google`, or `Tesla` is not modeled unless it happens to be a deity entry.
7. **No learned classifier** — the fixed 0.85 skeleton threshold can be gamed by subtle substitutions or contextual additions.
8. **No adversarial test harness** — there is no red-team generator, no formal false-positive budget, no differential testing.
9. **No browser-native SDK or enterprise policy layer** — the extension calls the website API, but there is no offline WASM model, no managed policy, no SIEM export.
10. **Threat feed is batch, not streaming** — new spoofs are written to SQLite and reviewed manually; there is no Kafka/PubSub-style stream, no clustering, no ML reputation model.
11. **Explainability is character-level only** — there is no rendered glyph diff, no side-by-side image, no downloadable forensics report.
12. **No tiered UI policy** — the UI shows a badge but does not enforce enterprise policies (block page, soft warning, log-only, allowlist override).
13. **No privacy-preserving telemetry** — logs store raw inputs; differential privacy, k-anonymity, and opt-in telemetry are absent.
14. **No performance SLA / edge caching** — every request hits Node + SQLite; no Redis-backed result cache or CDN-level WASM edge function.
15. **No localization** — verdicts and explanations are English-only; RTL and CJK UX are not considered.
16. **No legal / forensics export** — there is no PDF chain-of-custody report for UDRP, trademark, or law-enforcement use.

---

## Part II — Design Principles for V2

1. **Defense in depth.** Every input must pass rule-based, statistical, perceptual, and reputation gates before it is trusted.
2. **Conservative escalation.** When in doubt, raise to human review rather than silently trusting. False positives are corrected quickly through allowlists.
3. **Explainability by default.** Every verdict must carry a human- and machine-readable evidence trail.
4. **Privacy by design.** Raw inputs are hashed, telemetry is differentially private, and logs expire.
5. **Enterprise governance.** RBAC, audit logs, SIEM, policy packs, and compliance dashboards are first-class.
6. **Global script coverage.** No script family is treated as second-class; every block of Unicode receives a script-specific risk model.
7. **Continuous learning.** The model improves from crawler discoveries, user reports, red-team exercises, and quarterly retraining.
8. **Browser-native performance.** Core classification must run offline in a WebAssembly module in < 2 ms per name.

---

## Part III — The 20 V2 Phases

Each phase below is intentionally exhaustive. Treat each as a mini-spec with its own acceptance criteria, tests, APIs, and operational concerns.

---

### Phase 1 — Perceptual Glyph Engine (The Foundation)

**Objective:** Move beyond string folding. Build a font-aware, pixel-level, and Unicode-normalization-hardened perception layer that can answer *"does this string look like that string when rendered?"* with evidence.

**Deliverables:**

1.1. **Canonical Unicode confusable database (`platform/db/confusables.sqlite` or JSON)**
- Ingest the **Unicode Confusables** table (UTR #39, `confusables.txt`) and the **Intentional Confusables** list.
- Add PUNICODEX-specific confusables not in the standard: combining diacritic stacks that mimic precomposed accents, math bold/fraktur/monospace variants, enclosed alphanumerics, fullwidth forms, small-capital forms, IPA lookalikes.
- Store for each confusable:
  - `source_codepoint`, `target_codepoint` or `target_ascii`
  - `script_family`, `category` (homoglyph, near-homoglyph, stylistic, diacritic, invisible)
  - `visual_similarity_score` (0–1) derived from font rendering experiments
  - `contextual_notes` (e.g., Cyrillic `а` is a perfect homoglyph of Latin `a` in sans-serif; Greek `ο` is identical to Latin `o`).

1.2. **Font-rendered glyph similarity (`platform/api/glyph-renderer.js`)**
- Use `node-canvas` / `skia-canvas` in Node and `OffscreenCanvas` in the browser extension to render candidate strings in a curated font list:
  - System UI fonts: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Arial`, `Noto Sans`, `SF Pro`.
  - Monospace and serif variants to catch `rn`/`m` differences.
- Compute **perceptual hash (pHash)** and **SSIM** between rendered glyph images.
- Expose `renderedSimilarity(a, b, options)` returning a 0–1 score and a diff heat-map descriptor.
- Cache render results in Redis keyed by `(font_family, normalized_string, size)`.

1.3. **Glyph skeleton pipeline upgrade (`platform/api/confusable-atlas.js`)**
- Replace the current hand-coded map with the confusable database as the source of truth.
- Add **whole-word confusables** (e.g., `rn` → `m`, `vv` → `w`, `cl` → `d`, `nn` → `m`, `lI` → `U`, `0O` ambiguity).
- Add **diacritic-collapse modes**:
  - `strict` — preserve macrons/acutes (scholarly)
  - `loose` — strip all combining marks for spoof detection
  - `canonical` — NFKC + confusable folding
- Add **invisible-character detection**: zero-width joiners/non-joiners, variation selectors, bidirectional overrides, word joiners, BOM, tag characters.

1.4. **Normalization fortress**
- Apply UTS #46 (ToUnicode/ToASCII) with `UseSTD3ASCIIRules`, `CheckHyphens`, `CheckBidi`, `CheckJoiners`.
- Detect `NFC`, `NFD`, `NFKC`, `NFKD` distance and reject overlong decomposition attacks.
- Detect **homoglyph canonical equivalence** (precomposed `é` vs `e` + combining acute).

1.5. **Per-character attestation v2 (`platform/api/name-decomposer.js`)**
- Extend decomposition output with:
  - `isHomoglyph` flag
  - `renderedBaselineHash` for ASCII/Latin baseline
  - `confusableRiskScore` weighted by script-pair risk
  - `contextualRisk` (neighboring characters that combine to look like another character)
- Compute `visualDeviation` using both string features and rendered similarity when available.

**Acceptance criteria:**
- `аpple` (Cyrillic а) vs `apple` returns rendered similarity ≥ 0.98.
- `arnazon` vs `amazon` returns high contextual risk for `rn` → `m`.
- `Hermès` (legitimate Latin + combining grave) returns low deviation, while `Hermès` with Cyrillic `е` returns high deviation.
- Zero-width characters trigger `invisibleChars` and bump severity.

**Tests:**
- `test/glyph-renderer.test.js` — 500 rendered-similarity assertions across fonts.
- `test/confusable-atlas-v2.test.js` — every UTR #39 confusable maps to its intended target.
- `test/normalization-attacks.test.js` — NFC/NFD/ NFKC attacks are detected.

**Files changed / created:**
- `platform/db/confusables.json`
- `platform/api/glyph-renderer.js`
- `platform/api/confusable-atlas.js` (major refactor)
- `platform/api/name-decomposer.js` (extend)
- `test/glyph-renderer.test.js`

---

### Phase 2 — Canonical Identity Kernel 2.0

**Objective:** Build a unified registry of *identities*: PUNICODEX lexicon entries, owned canonical domains, registered brand names, and trademarked Unicode forms. The kernel must know that `Hermes` (ASCII brand), `Hermès` (French brand), and `Hermês` (Greek deity) are distinct legitimate identities and that a Cyrillic substitution in any of them is an attack.

**Deliverables:**

2.1. **Identity table schema (`platform/db/identities.sql`)**
```sql
CREATE TABLE identities (
  id TEXT PRIMARY KEY,              -- e.g., "hermes-brand", "hermes-greek"
  type TEXT NOT NULL,               -- 'lexicon' | 'brand' | 'trademark' | 'owned_domain'
  name TEXT NOT NULL,               -- canonical display name
  ascii TEXT,                       -- ASCII fallback if any
  unicode TEXT,                     -- canonical Unicode form
  scripts TEXT,                     -- JSON array of scripts used legitimately
  owner TEXT,                       -- brand/org owner
  registration_country TEXT,
  registration_number TEXT,
  priority INTEGER DEFAULT 0,       -- for ranking when multiple identities collide
  allowed_domains TEXT,             -- JSON array of registrable domains
  blocked_patterns TEXT,            -- JSON array of glob/regex patterns
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_identities_name ON identities(name);
CREATE INDEX idx_identities_ascii ON identities(ascii);
CREATE INDEX idx_identities_unicode ON identities(unicode);
```

2.2. **Identity matcher (`platform/api/identity-kernel.js`)**
- `findIdentities(input, options)` returns all matching identities with match type (`exact`, `variant`, `folded`, `visual`, `domain`).
- Support identity-level variants and aliases (e.g., `Hermes` and `Hermès` are linked under `hermes-brand` if the brand owns both).
- Distinguish identity type in verdict reasoning: *"This impersonates the French trademark HERMÈS"* vs *"This impersonates the PUNICODEX entry Hermês"*.

2.3. **Owned / canonical domain registry v2**
- Expand `canonical_domains` with:
  - `identity_id` foreign key to `identities`
  - `registrar`, `registration_date`, `renewal_date`
  - `verification_method` (DNS TXT, HTTP file, WHOIS/RDAP, trademark office)
  - `status` (`active`, `expired`, `disputed`, `revoked`)
- Import the existing PUNICODEX owned-domain set and enrich with WHOIS/RDAP metadata.

2.4. **Top-brand seed pack**
- Seed the identity kernel with a curated, license-clean list of globally recognized brands (Hermès, Nike, Apple, Google, Microsoft, Amazon, Meta, Tesla, etc.) including their legitimate Unicode forms and common ASCII aliases.
- Each seed entry carries provenance notes and a `do_not_serve` flag if licensing forbids public exposure; the classifier still uses it privately.

2.5. **Lexicon linkage**
- Every PUNICODEX lexicon entry becomes an `identity` row of type `lexicon`.
- `entry.variants` are normalized into `identity_aliases`.

**Acceptance criteria:**
- `classifyTerm('Hermès')` returns canonical for the brand identity if registered, and recognized variant for the Greek deity if in lexicon.
- `classifyTerm('Hermès')` with Cyrillic `е` flags as homograph spoof targeting the most relevant identity.
- `classifyDomain('hermes.com')` returns canonical if owned, but `classifyDomain('hermès-phishing.com')` returns lookalike-domain.

**Tests:**
- `test/identity-kernel.test.js` — exact/variant/folded/visual/domain matches.
- `test/brand-seed.test.js` — top 100 brand identities are loadable and not false-positive on legitimate forms.

**Files changed / created:**
- `platform/db/identities.sql`
- `platform/api/identity-kernel.js`
- `platform/db/seeds/brand-identities.json`
- `platform/api/canonical-domains.js`

---

### Phase 3 — Multi-Dimensional Risk Scoring & Ensemble Classification

**Objective:** Replace the single 0.85 skeleton threshold with a calibrated, ensemble risk model that combines rule-based, perceptual, lexical, and reputation signals into a single probability-of-deception.

**Deliverables:**

3.1. **Risk feature vector (`platform/api/risk-features.js`)**
For every input, compute:
- `glyph_similarity_max` — best rendered similarity to any identity
- `skeleton_similarity_max` — best skeleton-fold similarity
- `confusable_count` and `confusable_density`
- `script_entropy` — number of distinct scripts and their proportions
- `mixed_script_flag` and `script_pair_risk`
- `invisible_char_flag`
- `normalization_distance` (NFKC vs raw)
- `domain_etld_risk` — is the registrable domain suspicious?
- `path_query_risk` — are path/query segments spoofing?
- `reputation_score` — from threat feed / blocklist / WHOIS age / ASN
- `identity_priority` — priority of the best matching identity
- `variant_recognition` — is the input a listed variant?

3.2. **Ensemble classifier (`platform/api/authenticity-ensemble.js`)**
- **Rule guardrails:** any invisible character in a hostname → at least medium; any Cyrillic/Latin homograph in a hostname → at least high.
- **Gradient-boosted decision tree** (or logistic regression if model size matters) trained on:
  - Positive class: known phishing/homograph samples from OpenPhish, PhishTank, URLhaus, crawler discoveries.
  - Negative class: PUNICODEX lexicon, legitimate brand identities, common real names.
- **Confidence calibration** with isotonic regression so output probabilities are reliable.
- **Thresholds tuned to FPR < 0.001%** on a held-out legitimate set and TPR > 99.99% on a held-out deceptive set.

3.3. **Verdict mapper (`platform/api/verdict-mapper.js`)**
Map ensemble probability + rule overrides to V2 verdicts:
| Probability / Rule | Verdict | Severity |
|---|---|---|
| Blocklist / confirmed threat | `blocked` | critical |
| ≥ 0.95 deceptive | `homograph-spoof` or `mixed-script-spoof` | critical |
| 0.80 – 0.95 | `lookalike-domain` / `suspicious` | high |
| 0.60 – 0.80 | `transliteration-uncertain` | medium |
| Listed variant | `recognized-variant` | low |
| Exact identity | `canonical` | none |
| Styled but safe | `styled` | low |
| No signal | `unknown` | none |

3.4. **Model versioning and A/B testing**
- Store model artifacts under `platform/models/authenticity/YYYY-MM-DD/`
- `model-version.json` with hash, training dataset version, thresholds, metrics.
- API supports `?modelVersion=...` for A/B testing.

**Acceptance criteria:**
- On a 10,000-sample adversarial test set: TPR ≥ 99.99%, FPR ≤ 0.001%.
- `Hermès` (legitimate) scores deceptive probability < 0.01.
- `Нermès` (Cyrillic Н + Latin rest) scores deceptive probability > 0.99.
- Model inference latency p99 < 2 ms.

**Tests:**
- `test/authenticity-ensemble.test.js` — fixed benchmark set.
- `test/false-positive-budget.test.js` — asserts FPR on 5,000 legitimate inputs.
- `test/threshold-calibration.test.js` — probability bins line up with observed rates.

**Files changed / created:**
- `platform/api/risk-features.js`
- `platform/api/authenticity-ensemble.js`
- `platform/api/verdict-mapper.js`
- `platform/models/authenticity/` training pipeline
- `scripts/train-authenticity-model.js`

---

### Phase 4 — Punycode, IDNA & DNS Deep Validation

**Objective:** Harden the system against every IDN/Punycode trick that bypasses naive Unicode checks.

**Deliverables:**

4.1. **IDNA2008 + UTS #46 validator (`platform/api/idna-validator.js`)**
- Implement `validateIdna(domain, options)`:
  - `CheckHyphens`, `CheckBidi`, `CheckJoiners`
  - `UseSTD3ASCIIRules`
  - Label length ≤ 63 octets; total domain ≤ 253 octets
  - Punycode prefix `xn--` only at label start
  - Reject empty labels, leading/trailing hyphens in labels
  - Detect **dotless-i / dotted-I** Turkish case-folding attacks
  - Detect **non-LDH** ASCII characters in punycode labels
- Expose a per-label diagnostic array: `valid`, `error`, `errorCode`, `decoded`, `rawPunycode`.

4.2. **Registrable-domain extractor (`platform/api/domain-parser.js`)**
- Integrate the Public Suffix List (PSL) and keep it updated via a weekly cron.
- Compute `registrableDomain`, `etldPlusOne`, `subdomain`, `hostname`.
- Detect **eTLD spoofing** where the registrable domain is a punycode lookalike of a target but the subdomain claims the target name.

4.3. **DNS metadata enricher (`platform/api/dns-enricher.js`)**
- Query A/AAAA/MX/TXT/NS records with timeouts.
- Compute domain age from WHOIS/RDAP creation date.
- Detect **newly registered domains** (< 30 days) and bump risk.
- Detect **parked / wildcard DNS** patterns.
- Cache results in Redis TTL 1 hour.

4.4. **IDN registry policy awareness**
- Data file `platform/db/idn-registry-policies.json` mapping TLDs to allowed scripts.
- If a domain uses a script not permitted by its TLD (e.g., Cyrillic in `.com` is allowed by some registries but not all), raise `policy-risk`.

**Acceptance criteria:**
- `xn--pple-wmc.com` decoded to `аpple.com` is flagged critical because the registrable domain is a homograph.
- `apple.com.evil.com` is high because the canonical identity appears only in a subdomain.
- `xn--nxasmq5a.com` (Greek label) is validated against `.com` IDN policy.

**Tests:**
- `test/idna-validator.test.js` — 200 edge cases.
- `test/domain-parser.test.js` — PSL correctness for 100 known domains.
- `test/dns-enricher.test.js` — mocked DNS/WHOIS responses.

**Files changed / created:**
- `platform/api/idna-validator.js`
- `platform/api/domain-parser.js`
- `platform/api/dns-enricher.js`
- `platform/db/public-suffix-list.dat` (auto-updated)
- `platform/db/idn-registry-policies.json`

---

### Phase 5 — Full URL Pathology Analyzer

**Objective:** Analyze the entire URL — protocol, userinfo, host, port, path, query, fragment — as a structured attack surface, not just the hostname.

**Deliverables:**

5.1. **URL decomposition v2 (`platform/api/url-decomposer.js`)**
Return a typed tree:
```ts
{
  protocol: { value: 'https', risk: 'none' | 'insecure' },
  userinfo: { value?: string, risk },
  hostname: { labels: Label[], registrableDomain: string, etld: string, risk },
  port: { value?: number, risk },
  path: { segments: Segment[], risk },
  query: { params: Param[], risk },
  fragment: { value?: string, risk }
}
```
- Flag non-HTTPS protocols.
- Flag userinfo credentials (`user:pass@host`).
- Flag suspicious ports.

5.2. **Path / query homograph detection**
- Each path segment and query key/value is classified independently.
- Detect when a query value is a URL that itself spoofs a canonical identity (e.g., `?redirect=https://аpple.com`).
- Detect **query-parameter stuffing** where a well-known param (`oauth_callback`, `next`, `return_to`) points to a spoof.

5.3. **URL obfuscation detection**
- IP address literals (IPv4 / IPv6) in hostname.
- Percent-encoded obfuscation.
- Mixed punycode/ASCII labels.
- Right-to-left override in URL display.
- Homograph TLDs (e.g., `.соm` with Cyrillic о).

5.4. **Path-context risk**
- A path segment `/login` or `/signin` on a suspicious domain raises severity.
- A path containing a canonical brand name on a non-canonical domain raises lookalike-domain risk.

**Acceptance criteria:**
- `https://аpple.com/login` flags critical (Cyrillic `а` in hostname + `/login` path).
- `https://example.com/redirect?next=https://аpple.com` flags high for query value.
- `https://192.168.1.1/аpple` flags high.
- `https://example.com/apple` returns unknown/low (legitimate substring, not spoof).

**Tests:**
- `test/url-pathology.test.js` — 300 URL cases.
- `test/url-obfuscation.test.js` — percent-encoding, IP, RTL, mixed-script.

**Files changed / created:**
- `platform/api/url-decomposer.js`
- `platform/api/url-classifier.js`
- Update `platform/api/authenticity-service.js` `classifyUrl` to use new pipeline.

---

### Phase 6 — Brand & Trademark Shield

**Objective:** Protect the world’s valuable names, not just mythological ones. Model ASCII brands, Unicode trademarks, common-law marks, and celebrity/persona names.

**Deliverables:**

6.1. **Brand identity ingestion pipeline**
- `scripts/import-brand-identities.js` reads:
  - WIPO Global Brand Database extracts (CSV)
  - EUIPO / USPTO trademark files
  - Curated high-value brand list (top 10k by web traffic / market cap)
  - User-supplied enterprise allowlists/blocklists via API
- Normalize names to identity rows with `type='trademark'`.

6.2. **Hermès case study**
- Explicitly model:
  - ASCII brand: `Hermes` (German luxury holding / courier / common name)
  - Unicode trademark: `Hermès` (French maison, legitimate combining grave)
  - Greek deity: `Hermês` (PUNICODEX)
- Define disambiguation rules by context: domain owner, country, accompanying text.
- A Cyrillic substitution in `Hermès` must flag as targeting the French trademark; a Latin-stripped `Hermes` must remain legitimate for the ASCII brand.

6.3. **Trademark verification sources**
- WHOIS/RDAP registration verification.
- DNS TXT record `_trademark.<domain>` or `_dmarc` alignment.
- WIPO DRS / UDRP case lookup.
- Manual curator review queue.

6.4. **Dispute and takedown workflow**
- `disputes` table linking identity, contested input, evidence, decision, appeal.
- Admin UI for reviewers with legal notes.
- Export UDRP-ready evidence packages (screenshots, whois, classification report).

**Acceptance criteria:**
- `hermes.com` registered to the brand returns canonical.
- `hermès.com` (Latin + combining grave) registered to the brand returns canonical.
- `hermès.net` not owned returns lookalike-domain high.
- `hеrmes.com` (Cyrillic е) returns homograph-spoof critical.

**Tests:**
- `test/brand-shield.test.js` — 200 brand/trademark edge cases.
- `test/hermes-disambiguation.test.js` — dedicated Hermès scenarios.

**Files changed / created:**
- `platform/db/seeds/brand-identities.json` (expanded)
- `scripts/import-brand-identities.js`
- `platform/api/brand-shield.js`
- `platform/api/dispute-service.js`
- `platform/public/admin-disputes.html`

---

### Phase 7 — Browser-Grade SDK, Extension & Native Integration

**Objective:** Package the classifier so any browser vendor or security company can drop it in. Provide offline-first, policy-driven, enterprise-manageable components.

**Deliverables:**

7.1. **WebAssembly core (`platform/wasm/`)**
- Compile the confusable atlas, identity kernel, and lightweight ensemble to WASM via AssemblyScript or Rust.
- Target size < 500 KB gzipped.
- Expose C API and JS bindings (`@punicodex/authenticity-wasm`).
- Browser extension ships the WASM bundle so classification is local-first.

7.2. **JavaScript/TypeScript SDK (`sdk/js/`)**
- `@punicodex/authenticity-sdk` npm package.
- Methods: `check(input)`, `checkBatch(inputs)`, `checkUrl(url)`, `on(tabUpdated)`, `configure(policy)`.
- Offline mode uses WASM; online mode refreshes threat feed and identity registry.
- Enterprise policy hooks:
  - `policy.action` = `block` | `warn` | `log` | `allow` per severity
  - `policy.allowlist` / `policy.blocklist`
  - `policy.reportEndpoint`

7.3. **Browser extension v2 (`extension-v2/`)**
- Manifest V3 service worker + content script + popup + options.
- Highlight suspicious links with overlay badges.
- Interstitial/block page for `critical` severity.
- Report button sends evidence to API.
- Managed storage for enterprise GPO / Chrome Enterprise policies.

7.4. **Safari / Firefox / Edge ports**
- Safari Web Extension wrapper.
- Firefox manifest differences.
- Edge Add-ons manifest.

7.5. **Native OS helpers**
- macOS `NetworkExtension` sample app.
- Windows `WebView2` / `MSIX` sample.
- Android `WebView` / custom tabs integration sample.
- iOS `WKWebView` integration sample.

**Acceptance criteria:**
- SDK `check('аpple.com')` returns critical in < 2 ms offline.
- Extension blocks navigation to a critical domain with a full-page interstitial.
- Enterprise policy can suppress warnings for an internal domain.

**Tests:**
- `sdk/js/test/sdk.test.js` — 500 SDK assertions.
- `extension-v2/test/extension.test.js` — mocked browser environment.
- `platform/wasm/test/wasm.test.js` — WASM parity with Node implementation.

**Files changed / created:**
- `platform/wasm/`
- `sdk/js/`
- `extension-v2/`
- `platform/public/interstitial.html`

---

### Phase 8 — Real-Time Threat Intelligence & Streaming Pipeline

**Objective:** Turn the threat feed from a SQLite queue into a living stream of global deception intelligence.

**Deliverables:**

8.1. **Streaming ingest (`platform/api/threat-stream.js`)**
- Kafka / AWS Kinesis / Redis Streams adapter (pluggable).
- Sources:
  - PUNICODEX crawler (every newly discovered xn-- domain)
  - Certificate Transparency log watchers
  - OpenPhish, PhishTank, URLhaus, GitHub phishing lists
  - User reports from extension + public page
  - Partner feeds (ISPs, registrars, browser safe-browsing partners)

8.2. **Clustering & reputation model**
- Cluster spoof domains by:
  - Registrable domain pattern
  - ASN / hosting provider
  - Name server
  - Visual target (canonical identity)
  - Registration time window
- Compute `reputation_score` per cluster and per domain.
- Auto-promote high-confidence clusters to blocklist pending human review.

8.3. **Time-decay and re-scoring**
- Nightly cron re-scores all unreviewed discovered spoofs with the latest model.
- False-positive feedback from reviewers updates model weights.

8.4. **Graph of deception**
- `spoof_relationships` table linking discovered inputs to target identities, campaigns, and clusters.
- Graph query API: "show all domains impersonating Apple in the last 7 days."

**Acceptance criteria:**
- A new `xn--pple-wmc.com` discovered in CT logs appears in the threat feed within 5 minutes.
- A cluster of 50 `apple-*` lookalikes from the same ASN is auto-flagged for review.
- False-positive rate of auto-promotions < 0.1%.

**Tests:**
- `test/threat-stream.test.js` — mocked stream ingestion.
- `test/clustering.test.js` — synthetic campaign detection.
- `test/reputation-model.test.js` — score stability and decay.

**Files changed / created:**
- `platform/api/threat-stream.js`
- `platform/api/clustering.js`
- `platform/api/reputation-model.js`
- `platform/db/threat-graph.sql`

---

### Phase 9 — Tiered Warning UX & Enterprise Policy System

**Objective:** Translate model outputs into a graduated UX that protects users without crying wolf. Enterprise customers must be able to define policy per risk tier.

**Deliverables:**

9.1. **Risk tiers v2**
| Tier | Severity | User-facing label | Default action |
|---|---|---|---|
| 0 — Authentic | none | Green seal | No interruption |
| 1 — Verified variant | low | Blue check | No interruption |
| 2 — Styled / benign | low | Gray info | Inline note |
| 3 — Uncertain | medium | Yellow ask | Inline warning |
| 4 — Suspicious | high | Orange alert | Expanded warning, require click-through |
| 5 — Deceptive | critical | Red block | Full-page interstitial / blocked |
| 6 — Known threat | critical | Black block | Hard block, report incident |

9.2. **Policy engine (`platform/api/policy-engine.js`)**
- Policy object schema:
```ts
{
  tenantId: string,
  defaultAction: Action,
  severityActions: Record<Severity, Action>,
  allowlist: Pattern[],   // exact / glob / regex
  blocklist: Pattern[],
  logRetentionDays: number,
  uiTheme: 'inline' | 'modal' | 'interstitial',
  reportEndpoint?: string,
  siemWebhook?: string
}
```
- Evaluate input + tenant context → final action and UI payload.

9.3. **Interstitial / block page (`platform/public/interstitial.html`)**
- Beautiful, accessible, mobile-responsive.
- Shows target identity, attack explanation, safe alternatives, report/appeal buttons.
- Enterprise branding option.

9.4. **Accessibility**
- All warnings use ARIA live regions, role="alert", and are keyboard navigable.
- Color is never the sole signal; iconography + text always present.
- Screen-reader-friendly explanation: *"Warning: this link looks like Apple but uses a Cyrillic letter."*

9.5. **Localization**
- i18n bundles for EN, FR, DE, ES, JA, ZH, AR, HI, RU.
- Verdict labels, explanations, recommendations translated by professional review.
- RTL layout support.

**Acceptance criteria:**
- A `critical` input triggers interstitial in 100% of browser / SDK integrations.
- An `allowlisted` internal domain bypasses all warnings.
- UI passes WCAG 2.1 AA and Lighthouse accessibility ≥ 95.

**Tests:**
- `test/policy-engine.test.js` — policy precedence and override.
- `test/interstitial-smoke.test.js` — page loads and renders dynamic content.
- `test/i18n.test.js` — all verdicts have translations; no missing keys.

**Files changed / created:**
- `platform/api/policy-engine.js`
- `platform/public/interstitial.html`
- `i18n/authenticity/`
- Update `authenticity/index.html`, `search.html`, extension UI.

---

### Phase 10 — Enterprise Governance, Compliance & Audit

**Objective:** Make the product sellable to CISOs: RBAC, audit logs, SIEM, SOC2-friendly controls, data residency.

**Deliverables:**

10.1. **Multi-tenant RBAC**
- `tenants` table with `name`, `plan`, `rate_limit_tier`, `data_region`.
- `users` table with roles: `superadmin`, `tenant_admin`, `analyst`, `viewer`, `api`.
- API keys scoped per tenant and per permission set.

10.2. **Audit logging**
- `audit_logs` table captures every classification decision, policy override, review action, model update.
- Immutable hash chain (previous log entry hash) for tamper evidence.
- Export to CSV / JSON / SIEM (CEF, LEEF).

10.3. **Compliance dashboards**
- Admin UI pages:
  - `admin-authenticity-audit.html` — searchable audit log
  - `admin-authenticity-policy.html` — tenant policy editor
  - `admin-authenticity-users.html` — RBAC management
  - `admin-authenticity-compliance.html` — false-positive rate, threat catch rate, SLA metrics

10.4. **Data residency & retention**
- Per-tenant data region routing.
- Configurable retention (default 90 days for raw inputs, 1 year for aggregates).
- GDPR/CCPA deletion workflow.

10.5. **SOC2 / ISO evidence**
- Automated evidence generation: access reviews, change management logs, model validation reports.

**Acceptance criteria:**
- Every API call is attributable to a tenant + key + user hash.
- Audit log cannot be altered by application code (hash chain + DB constraints).
- Retention job deletes expired raw inputs but preserves aggregates.

**Tests:**
- `test/audit-log.test.js` — immutability and export.
- `test/rbac.test.js` — role-based access.
- `test/retention.test.js` — deletion and aggregation.

**Files changed / created:**
- `platform/api/audit-log.js`
- `platform/api/rbac.js`
- `platform/db/tenants.sql`
- `platform/public/admin-authenticity-*.html`

---

### Phase 11 — Adversarial Test Harness & Red Team

**Objective:** Prove the system is unbreakable by trying to break it continuously. Establish a formal false-positive / false-negative budget.

**Deliverables:**

11.1. **Attack generator (`scripts/adversarial-generator.js`)**
Generate synthetic attacks:
- Single-character confusable substitution across all scripts.
- Multi-character confusable combinations.
- Invisible-character injection (zero-width, variation selectors, bidirectional overrides).
- Normalization attacks (NFD stacking, homoglyph canonical equivalence).
- eTLD / subdomain tricks.
- Path/query homograph injection.
- Mixed-script legitimate names (should be safe) vs mixed-script attacks (should be flagged).

11.2. **Benchmark datasets**
- `data/benchmarks/authenticity/legitimate-50k.jsonl` — real-world legitimate Unicode names, brands, variants.
- `data/benchmarks/authenticity/deceptive-50k.jsonl` — generated and curated deceptive samples.
- `data/benchmarks/authenticity/hard-negatives-5k.jsonl` — cases that historically confused the model.

11.3. **Red-team automation**
- Weekly cron runs the attack generator and fails CI if accuracy drops below target.
- Differential testing: compare V1 vs V2 outputs; investigate every disagreement.
- Fuzzing with random Unicode strings up to 256 characters.

11.4. **False-positive / false-negative budget**
- File `docs/authenticity-sla.md` defines allowed error budgets per quarter.
- CI gate enforces the budget.

**Acceptance criteria:**
- Attack generator produces ≥ 100,000 unique deceptive variants per run.
- Red-team CI fails if any known attack family is not detected.
- False-positive rate on legitimate set < 0.001%.

**Tests:**
- `test/adversarial-generator.test.js`
- `test/red-team-ci.test.js`
- `test/false-negative-budget.test.js`

**Files changed / created:**
- `scripts/adversarial-generator.js`
- `scripts/red-team-run.js`
- `data/benchmarks/authenticity/`
- `.github/workflows/red-team.yml`

---

### Phase 12 — Explainability & Digital Forensics

**Objective:** Every verdict must be defensible in court, in a SOC, and in front of a non-technical user.

**Deliverables:**

12.1. **Evidence object v2**
```ts
{
  verdict: string,
  confidence: number,
  modelVersion: string,
  features: RiskFeatureVector,
  characterMap: CharAttestation[],
  renderedComparison: {
    baseline: string,         // canonical identity rendered
    input: string,            // input rendered
    diffHeatmap: number[],    // per-pixel/per-glyph risk
    fontFamily: string
  },
  identityMatches: IdentityMatch[],
  domainMetadata: DomainMetadata,
  threatFeedHits: DiscoveredSpoof[],
  recommendations: string[],
  generatedAt: ISO8601
}
```

12.2. **Forensics report export**
- `GET /api/v1/authenticity/report/:id/pdf` generates a PDF evidence package.
- Includes rendered images, character table, chain of custody, model version, and signatures.
- Suitable for UDRP, trademark, or law-enforcement submission.

12.3. **Visual diff in public checker**
- Side-by-side rendered glyph comparison on the `/authenticity/` page.
- Hover over each character to see its code point, script, confusable mapping, and risk.
- Export JSON evidence with one click.

12.4. **Model cards**
- `docs/authenticity-model-card.md` documents intended use, limitations, bias considerations, and performance metrics.

**Acceptance criteria:**
- Every API response contains an `evidence` object.
- PDF report generation succeeds for 100% of high/critical verdicts.
- Visual diff is reproducible across browsers.

**Tests:**
- `test/evidence-object.test.js`
- `test/forensics-pdf.test.js` — mocked PDF generation.
- `test/model-card.test.js` — card exists and matches current model metrics.

**Files changed / created:**
- `platform/api/evidence-builder.js`
- `platform/api/forensics-pdf.js`
- `docs/authenticity-model-card.md`
- Update `authenticity/index.html` and `authenticity/script.js`.

---

### Phase 13 — Performance, Scale & Edge Deployment

**Objective:** Serve the entire web with millisecond latency and five-nines availability.

**Deliverables:**

13.1. **Caching layer**
- Redis result cache keyed by SHA-256 of normalized input + model version + tenant policy hash.
- TTL: 1 hour for typical names, 24 hours for stable identities, 5 minutes for threat-feed-heavy results.
- Cache invalidation on model update or blocklist change.

13.2. **Edge functions**
- Vercel Edge Function / Cloudflare Worker sample deploying the WASM classifier at the CDN edge.
- Geo-routing to nearest edge POP.

13.3. **Batch & streaming inference**
- Batch endpoint optimized with shared identity lookups and vectorized feature computation.
- Streaming response for real-time threat feed consumers.

13.4. **Load testing & SLOs**
- SLOs:
  - p50 latency < 1 ms
  - p99 latency < 5 ms
  - availability 99.999%
  - cache hit rate > 85%
- Load test: 10,000 RPS sustained.

13.5. **Database sharding**
- Tenant-aware read replicas for audit and threat-feed queries.
- Archive old `authenticity_log` partitions to cold storage.

**Acceptance criteria:**
- `/api/v1/authenticity/check` p99 < 5 ms at 1,000 RPS.
- Edge cache hit rate > 85%.
- No single point of failure (Redis cluster, DB replicas).

**Tests:**
- `test/performance-load.test.js` — k6 or Artillery script.
- `test/cache-invalidation.test.js`
- `test/edge-function.test.js`

**Files changed / created:**
- `platform/api/cache.js`
- `platform/edge/authenticity.js`
- `test/load/k6-authenticity.js`

---

### Phase 14 — Continuous Learning & Model Operations (MLOps)

**Objective:** The system gets smarter every day without human rewrites.

**Deliverables:**

14.1. **Telemetry pipeline (privacy-preserving)**
- Log only hashed client identifiers.
- Differential privacy noise added to aggregate metrics.
- Opt-in detailed telemetry with user consent.

14.2. **Active learning**
- Sample uncertain predictions (probability 0.4–0.7) for human review.
- Prioritize samples from under-represented scripts and new attack patterns.

14.3. **Quarterly retraining**
- `scripts/retrain-authenticity-model.js`:
  - Pulls new curated samples.
  - Retrains ensemble.
  - Runs benchmark suite.
  - A/B deploys new model.
  - Rolls back if metrics regress.

14.4. **Feature drift monitoring**
- Track distribution drift of `script_entropy`, `confusable_density`, `domain_age_days`.
- Alert when drift exceeds thresholds.

14.5. **Human feedback loop**
- Reviewer decisions feed back as training labels.
- User “not a spoof” appeals feed back as hard negatives.

**Acceptance criteria:**
- Model improves benchmark F1 by ≥ 0.1% each quarter or an explanation is documented.
- Active learning queue never exceeds 1,000 unreviewed uncertain samples.
- Telemetry contains no raw IPs or raw inputs.

**Tests:**
- `test/telemetry-privacy.test.js`
- `test/active-learning.test.js`
- `test/model-retrain.test.js`

**Files changed / created:**
- `scripts/retrain-authenticity-model.js`
- `platform/api/telemetry.js`
- `platform/api/drift-monitor.js`

---

### Phase 15 — Global Script & Internationalization Coverage

**Objective:** The classifier must be world-class for every writing system, not just Greek/Cyrillic/Latin.

**Deliverables:**

15.1. **Script-specific risk modules**
- **Arabic/Persian/Urdu:** detect dotless/dotted variants, contextual initial/medial/final forms, Kashida elongation.
- **Indic (Devanagari, Bengali, Tamil, etc.):** detect conjunct homoglyphs, vowel sign stacking, ZWJ/ZWNJ manipulation.
- **CJK:** detect simplified/traditional/unified hanzi collisions, kana lookalikes, fullwidth forms.
- **Hebrew:** detect final-form substitutions, Yiddish digraphs.
- **Runic / historic:** treat as stylistic unless impersonating a modern identity.

15.2. **Locale-aware confusables**
- `platform/db/locale-confusables.json` mapping locale-specific homoglyphs (e.g., Turkish `ı` vs `i`, Azerbaijani `ə` vs `a`).
- Locale inferred from browser `Accept-Language` or domain TLD.

15.3. **Right-to-left (RTL) attacks**
- Detect bidirectional override characters that flip display.
- Compute visual order vs logical order.
- Flag mismatches as high risk.

15.4. **i18n bundles**
- Translate all UI strings, verdicts, explanations, recommendations.
- Locale-specific examples on the public checker page.
- RTL CSS support.

**Acceptance criteria:**
- Arabic `اپل` (Persian alef + pe) vs Latin `apple` is flagged when impersonating Apple.
- Devanagari `ऑपल` is handled as non-Latin and not false-positive on a legitimate Indic brand.
- RTL override in a URL flips visual order and triggers critical.

**Tests:**
- `test/script-arabic.test.js`
- `test/script-indic.test.js`
- `test/script-cjk.test.js`
- `test/rtl-attacks.test.js`

**Files changed / created:**
- `platform/api/script-modules/*.js`
- `platform/db/locale-confusables.json`
- `i18n/authenticity/*.json`

---

### Phase 16 — Regulatory, Legal & Abuse-Handling Integration

**Objective:** Make the product safe to operate at scale and useful to legal teams.

**Deliverables:**

16.1. **Privacy compliance**
- GDPR/CCPA data-subject request API: export and delete user data by hashed client id.
- Data Processing Agreement template.
- Privacy policy updates for authenticity telemetry.

16.2. **Trademark & UDRP integration**
- Lookup WIPO / UDRP case status by domain.
- Auto-generate UDRP complaint evidence packages.
- Track dispute outcomes and update identity registry.

16.3. **Abuse reporting API**
- `POST /api/v1/authenticity/abuse-report` for third-party reporters.
- Rate-limited, authenticated, with evidence upload.
- Escalation workflow to abuse team.

16.4. **Lawful access & transparency**
- Process lawful data requests through a dedicated workflow.
- Publish transparency report quarterly (number of takedowns, government requests, false positives).

16.5. **Insurance & liability**
- Document SLA, error budgets, and liability caps.
- Offer audit logs as evidence for cyber-insurance claims.

**Acceptance criteria:**
- A UDRP evidence package can be generated in < 30 seconds.
- GDPR deletion request completes within 30 days and is auditable.
- Transparency report is generated automatically from tables.

**Tests:**
- `test/gdpr-dsar.test.js`
- `test/udrp-evidence.test.js`
- `test/abuse-report.test.js`

**Files changed / created:**
- `platform/api/privacy-service.js`
- `platform/api/udrp-service.js`
- `platform/api/abuse-service.js`
- `platform/public/transparency-report.html`

---

### Phase 17 — Mobile, Embedded & IoT Integration

**Objective:** Bring the shield to phones, tablets, wearables, and embedded browsers.

**Deliverables:**

17.1. **Native mobile SDKs**
- iOS Swift SDK (`sdk/ios/`)
- Android Kotlin SDK (`sdk/android/`)
- React Native / Flutter wrappers.

17.2. **Mobile UX**
- Share-extension: paste any link from any app into the PUNICODEX Authenticity Checker.
- Keyboard integration: warn when typing or pasting a spoof into a text field.
- App-attestation to prevent SDK tampering.

17.3. **Wearables & embedded**
- Lightweight classifier for Apple Watch / Wear OS notifications.
- Router/IoT firmware sample that checks DNS names before resolution.

17.4. **Mobile app v2**
- New "Shield" tab in the mobile app.
- Scan clipboard on app open.
- History of checked URLs.

**Acceptance criteria:**
- iOS SDK classifies a URL in < 5 ms on device.
- Share extension works from Safari, Mail, Messages.
- Keyboard warns before a spoof is sent.

**Tests:**
- `sdk/ios/Tests/`
- `sdk/android/app/src/test/`
- `test/mobile-share-extension.test.js` (mocked)

**Files changed / created:**
- `sdk/ios/`
- `sdk/android/`
- `mobile/shield.html`
- `mobile/js/shield.js`

---

### Phase 18 — Certifications, Standards & Industry Adoption

**Objective:** Make PUNICODEX the reference implementation for Unicode name safety.

**Deliverables:**

18.1. **Standards engagement**
- Submit best-practice drafts to W3C WebAppSec and Unicode ICU.
- Participate in ICANN SSAC (Security and Stability Advisory Committee) consultations.
- Publish a technical memo on IDN homograph mitigation.

18.2. **Security certifications**
- SOC 2 Type II audit.
- ISO 27001 certification.
- CREST / OWASP penetration test report.

18.3. **Browser vendor acceptance**
- Meet Google Safe Browsing / Microsoft SmartScreen integration criteria.
- Provide signed extension packages and reproducible builds.
- Publish threat-intel feeds in standard formats (STIX/TAXII, MISP).

18.4. **Benchmark leadership**
- Publish results on a public benchmark leaderboard.
- Open-source the benchmark dataset (with license).
- Invite red-team challenges with bug-bounty rewards.

**Acceptance criteria:**
- SOC 2 Type II report available to enterprise customers.
- Threat feed is consumable via STIX 2.1.
- Public benchmark shows PUNICODEX in top tier.

**Tests:**
- `test/stix-export.test.js`
- `test/reproducible-build.test.js`
- `test/certification-evidence.test.js`

**Files changed / created:**
- `docs/standards/`
- `platform/api/stix-export.js`
- `scripts/reproducible-build.sh`

---

### Phase 19 — Ecosystem, Partnerships & Go-to-Market

**Objective:** Turn the technology into a market-dominant product.

**Deliverables:**

19.1. **Partner API program**
- Tiered partner keys: browser vendor, registrar, ISP, enterprise, NGO.
- Revenue-share and usage-based pricing.
- SLA guarantees per tier.

19.2. **Integrations**
- WordPress plugin to warn authors before publishing punycode links.
- Cloudflare Worker / Vercel Edge template.
- SIEM connectors (Splunk, Datadog, Elastic).
- Slack / Teams bot for security teams.

19.3. **Marketing assets**
- `/about/authenticity.html` — product page for CISOs.
- Explainer video and interactive demo.
- Case studies with early adopters.
- Conference talks (Black Hat, RSA, ICANN, Unicode).

19.4. **Open-source balance**
- Open-source the core classifier and benchmarks.
- Keep premium features (enterprise policy, real-time threat stream, forensics PDF) commercial.
- Contributor license agreement and security disclosure policy.

**Acceptance criteria:**
- Partner API onboarding is self-service.
- WordPress plugin has > 1,000 installs in first quarter.
- Product page ranks top 3 for "unicode homograph detection API".

**Tests:**
- `test/partner-onboarding.test.js`
- `test/wordpress-plugin-smoke.test.js`
- `test/siem-connector.test.js`

**Files changed / created:**
- `about/authenticity.html`
- `sdk/wordpress/`
- `platform/api/partners.js`

---

### Phase 20 — Operational Readiness, Reliability & Guarantees

**Objective:** The product runs itself, recovers gracefully, and meets enterprise SLAs.

**Deliverables:**

20.1. **Service Level Objectives**
- Availability: 99.999%
- Classification p99 latency: < 5 ms
- Threat-feed freshness: < 5 minutes from discovery
- False-positive rate: < 0.001%
- Support response: 15 minutes for critical, 1 hour for high

20.2. **Observability**
- Grafana dashboards: QPS, latency, cache hit rate, error rate, model drift, threat-feed volume.
- PagerDuty / Opsgenie alerts for SLO breaches.
- Distributed tracing for classification pipeline.

20.3. **Incident response**
- Runbooks for model rollback, blocklist revert, false-positive storm, DDoS.
- Chaos tests kill Redis / DB replica and verify graceful degradation.
- Quarterly tabletop exercises.

20.4. **Disaster recovery**
- Multi-region DB backups.
- Model artifacts versioned in object storage.
- Automated failover to edge-only WASM mode if API is unreachable.

20.5. **Customer success**
- Self-service documentation, status page, support portal.
- Quarterly business reviews for enterprise customers.
- Training materials for SOC analysts.

**Acceptance criteria:**
- All SLOs are measured and published on a status page.
- Chaos test passes: kill primary DB; read-only mode serves cached classifications.
- Incident runbooks are under 5 minutes to execute.

**Tests:**
- `test/chaos-failover.test.js`
- `test/slo-compliance.test.js`
- `test/runbook-existence.test.js`

**Files changed / created:**
- `platform/observability/`
- `docs/runbooks/`
- `platform/public/status.html`

---

## Part IV — Cross-Cutting Architecture

### Data Flow (One Check)

```
Input
  → Normalize (NFKC, UTS #46, IDNA)
  → Decompose (script, confusable, invisible, contextual)
  → Identity Kernel (exact, variant, domain, visual)
  → Perceptual Glyph Engine (rendered similarity)
  → Risk Features
  → Ensemble Classifier + Rule Guardrails
  → Verdict Mapper
  → Policy Engine (tenant policy, allowlist/blocklist)
  → Threat Feed / Reputation Lookup
  → Evidence Builder
  → Response + Cache
```

### Core Modules

| Module | Responsibility |
|---|---|
| `identity-kernel.js` | Who is being impersonated? |
| `glyph-renderer.js` | How does it look? |
| `confusable-atlas.js` | What characters collide? |
| `name-decomposer.js` | Per-character evidence |
| `authenticity-ensemble.js` | Probability of deception |
| `verdict-mapper.js` | Verdict + severity |
| `policy-engine.js` | What should the user see? |
| `threat-stream.js` | What is the world seeing? |
| `evidence-builder.js` | Why was this decision made? |

### Security Boundaries

- Untrusted input never reaches SQL beyond parameterized queries.
- Rendered images are generated in sandboxed workers / WASM with memory limits.
- Model artifacts are signed; extension verifies signature.
- Admin endpoints require hardware-token-grade MFA in production.

---

## Part V — Success Metrics & KPIs

| Metric | Target |
|---|---|
| True-positive rate on deceptive inputs | ≥ 99.999% |
| False-positive rate on legitimate inputs | ≤ 0.001% |
| Classification p99 latency | < 5 ms |
| Cache hit rate | > 85% |
| Threat-feed ingestion delay | < 5 minutes |
| Model retrain cadence | Quarterly |
| Public benchmark rank | Top 3 |
| Enterprise customer NPS | > 70 |
| Browser extension MAU | > 1,000,000 |

---

## Part VI — Definition of Done for V2

1. All 20 phases have delivered artifacts, tests, and documentation.
2. `npm run generate`, `npm run format:check`, `npm run lint`, and `npm test` are green.
3. Divergence gate passes.
4. The adversarial CI harness runs 100,000+ generated attacks with TPR ≥ 99.99%.
5. The false-positive budget test runs 50,000+ legitimate inputs with FPR ≤ 0.001%.
6. API v1/v2 docs include all new endpoints.
7. `/authenticity/` page supports visual diff, URL mode, reporting, and i18n.
8. Browser extension v2 ships with offline WASM, interstitial, and enterprise policy.
9. Threat feed ingests streaming sources and auto-clusters campaigns.
10. SOC 2 Type II evidence and runbooks exist.
11. Model card and benchmark results are published.

---

## Part VII — Suggested Implementation Order

While the phases are numbered, the recommended execution order is:

1. **Phase 1 + 2 + 3** in parallel — the new perception + identity + ensemble core.
2. **Phase 4 + 5** — harden URL/domain handling.
3. **Phase 6** — brand/trademark shield.
4. **Phase 11** early — set up adversarial CI so every subsequent phase is tested against attacks.
5. **Phase 7 + 9 + 13** — SDK, policy, performance.
6. **Phase 8 + 10 + 12 + 14** — enterprise/governance/flywheel.
7. **Phase 15 + 16 + 17** — internationalization, legal, mobile.
8. **Phase 18 + 19 + 20** — certifications, go-to-market, operations.

---

*Plan version 2.0 — PUNICODEX Name Authenticity Shield.*

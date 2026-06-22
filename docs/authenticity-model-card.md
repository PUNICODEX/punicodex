# PÚNYCODEX Name Authenticity Shield — Model Card

## Model Overview

The **Name Authenticity Shield** is the spoof-detection classifier behind
PÚNYCODEX. It evaluates Unicode names, domains, and URLs to determine whether
they are legitimate canonical forms, recognized scholarly variants, styled
names, or deceptive homograph / mixed-script / lookalike attacks.

- **Version:** 2.0
- **Date:** 2026-06-21
- **Owner:** PÚNYCODEX
- **License:** Project data license TBD (see `data-version.json`)

## Intended Use

- Protect users of the PÚNYCODEX search engine, type tool, browser extension,
  and API from Unicode-domain homograph attacks.
- Provide defensible evidence for SOC teams, trademark investigators, and
  domain-dispute proceedings.
- Score names for authenticity in real time across web, mobile, and edge
  deployments.

## Out-of-Scope Use

- The model is **not** a general-purpose content-moderation or malware
  classifier. It focuses on name/domain authenticity, not site content.
- It does **not** perform live WHOIS or DNS resolution; DNS and ownership data
  are cached or manually curated.
- It is not intended to police arbitrary personal names; only protected
  identities in the PÚNYCODEX lexicon, brand seed list, and owned-domain list
  are defended.

## Input / Output

**Inputs**
- A single Unicode string: name, domain, or URL.
- Optional type hint: `auto` | `term` | `domain` | `url`.

**Outputs**
- `verdict` — one of `canonical`, `recognized-variant`, `styled`, `unknown`,
  `lookalike-domain`, `homograph-spoof`, `mixed-script-spoof`, `unsafe`.
- `severity` — `none`, `low`, `medium`, `high`, or `critical`.
- `confidence` — model probability in `[0, 1]`.
- `evidence` — per-character attestation, rendered comparison, identity
  matches, domain metadata, and threat-feed hits.

## Architecture

- **Perceptual Glyph Engine:** skeleton-fold similarity + rendered glyph
  comparison using the confusable atlas.
- **Canonical Identity Kernel:** exact/folded/visual matching against 859
  lexicon entries, 72+ brand identities, and owned domains.
- **Ensemble Risk Classifier:** rule-based + lightweight probabilistic model
  combining confusable density, script entropy, visual deviation, IDNA risk,
  and blocked-pattern signals.
- **URL Pathology Analyzer:** per-part classification of hostname labels,
  path segments, query values, and redirect parameters.

## Performance Targets

| Metric | Target | Budget |
|--------|--------|--------|
| True Positive Rate (deceptive) | ≥ 99.99 % | TPR ≥ 0.9999 |
| False Positive Rate (legitimate) | ≤ 0.001 % | FPR ≤ 0.00001 |
| p50 latency | < 1 ms | — |
| p99 latency | < 5 ms | — |
| Availability | 99.999 % | — |

## Known Limitations

- Lexicon entries without owned domains are treated as public names and may
  legitimately appear on arbitrary domains. This is intentional.
- ASCII-only personal names that coincidentally fold to a protected identity
  via digit substitution (e.g., `susan0`) are conservatively treated as
  unknown unless the target is a high-value brand or owned domain.
- Mixed-script inputs in non-Latin scholarly scripts (e.g., a Greek word
  written in Greek letters) are not attacks; the classifier relies on
  confusable mappings to flag visual spoofs.
- The model does not verify live TLS certificates or page content; it scores
  the name itself.

## Bias & Fairness

- The lexicon prioritizes historically attested names from Greco-Roman,
  Norse, Egyptian, Japanese, Hindu, and other pantheons. This reflects the
  scholarly scope of PÚNYCODEX, not a value judgment.
- Brand seed list is dominated by global technology and financial services
  firms because these are the most frequently spoofed categories. Additional
  verticals are added through the enterprise governance workflow.
- Macron-only and stress-shift variants are explicitly recognized as valid
  scholarly conventions rather than spoof attempts.

## Update & Versioning

- Canonical source changes bump the patch version in `data-version.json`.
- Model weights and thresholds are versioned in source control and reviewed
  through the red-team CI gate before release.
- Threat-intel feeds are ingested continuously; discovered spoofs are
  back-filled into training and benchmark sets.

## Evidence & Audit

Every API response includes an `evidence` object with:
- `characterMap` — per-character code point, script, confusable mapping, and
  deviation score.
- `renderedComparison` — side-by-side input vs. canonical baseline with a
  per-glyph risk heatmap.
- `identityMatches` — top matching protected identities with match type and
  score.
- `domainMetadata` — parsed registrable domain, eTLD, punycode status, and
  IDNA errors.
- `threatFeedHits` — any matching entries from the streaming threat feed.

Forensic PDF reports can be generated for any high/critical verdict via
`GET /api/v1/authenticity/report/:id/pdf`.

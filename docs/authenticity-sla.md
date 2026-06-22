# PUNYCODEX Name Authenticity Shield — Service Level Agreement

**Version:** 2.0 Phase 11  
**Effective date:** 2026-06-22  
**Owner:** PUNYCODEX Security & Trust Engineering  
**Review cadence:** Quarterly

## 1. Purpose

This document defines the quarterly error budgets, service-level objectives (SLOs), liability caps, and escalation contacts for the PUNYCODEX Name Authenticity Shield V2. It governs the adversarial test harness, red-team CI pipeline, and production classification service.

## 2. Scope

The SLA applies to:

- `platform/api/authenticity-service.js` and its public/classified outputs.
- The adversarial generator (`scripts/adversarial-generator.js`).
- The benchmark datasets under `data/benchmarks/authenticity/`.
- The red-team runner (`scripts/red-team-run.js`).
- The weekly GitHub Actions red-team workflow (`.github/workflows/red-team.yml`).

## 3. Service-Level Objectives (SLOs)

| Metric | Target | Measurement window | Source |
|--------|--------|--------------------|--------|
| True Positive Rate (TPR) | ≥ 99.99% | Weekly red-team run | `scripts/red-team-run.js` |
| False Positive Rate (FPR) | ≤ 0.001% | Weekly red-team run | `scripts/red-team-run.js` |
| Fuzzer crash rate | 0% | Weekly fuzz run | `scripts/fuzz-unicode.js` |
| Differential drift vs. baseline | ≤ 0.1% | Weekly diff run | `scripts/diff-v1-v2.js` |
| Red-team report availability | 100% | Weekly cron | GitHub Actions artifacts |
| Mean classification latency (p50) | ≤ 10 ms | Continuous | Red-team / fuzz reports |
| Max classification latency (p99) | ≤ 200 ms | Continuous | Red-team / fuzz reports |

A "deceptive" classification is any verdict in `{homograph-spoof, mixed-script-spoof, lookalike-domain, unsafe}`.

## 4. Quarterly Error Budgets

Each quarter the service is allocated the following error budgets. Breaching a budget triggers the escalation path in §6.

| Budget | Allowance per quarter | Reset |
|--------|----------------------|-------|
| False negatives (deceptive undetected) | ≤ 0.01% of deceptive benchmark samples | First Monday of quarter |
| False positives (legitimate flagged) | ≤ 0.001% of legitimate benchmark samples | First Monday of quarter |
| Fuzzer crashes | 0 allowed | First Monday of quarter |
| Differential drift | ≤ 0.1% of compared samples | First Monday of quarter |
| Latency SLO misses | ≤ 1% of samples above p99 | First Monday of quarter |

## 5. Definitions

- **True Positive (TP):** A deceptive sample classified as deceptive.
- **False Positive (FP):** A legitimate sample classified as deceptive.
- **True Negative (TN):** A legitimate sample not classified as deceptive.
- **False Negative (FN):** A deceptive sample not classified as deceptive.
- **Differential drift:** A change in binary deceptive/legitimate outcome between the current classifier and the approved baseline.

## 6. Escalation Contacts

| Severity | Condition | Contact | Response time |
|----------|-----------|---------|---------------|
| P0 — Critical | Fuzzer crash, TPR < 95%, or FPR > 0.1% | security@punycodex.com, +1-555-PUNY-SEC | 1 hour |
| P1 — High | TPR < 99.99%, FPR > 0.001%, or drift > 0.1% | security@punycodex.com, #incidents | 4 hours |
| P2 — Medium | Latency SLO miss or benchmark regeneration failure | platform-eng@punycodex.com | 24 hours |
| P3 — Low | Documentation or artifact issues | docs@punycodex.com | 72 hours |

## 7. Liability Cap

PUNYCODEX's aggregate liability for classification errors covered by this SLA is capped at the lesser of:

(a) USD $10,000 per incident, or  
(b) USD $100,000 per quarter.

This cap does not apply to gross negligence, willful misconduct, or violations of law.

## 8. Red-team Workflow

The weekly red-team workflow (`red-team.yml`) runs:

1. `node scripts/build-authenticity-benchmarks.js`
2. `node scripts/red-team-run.js`
3. `node scripts/diff-v1-v2.js`
4. `node scripts/fuzz-unicode.js --samples 1000`

The workflow fails and triggers P1 escalation if any budget is breached or any fuzzer crash occurs.

## 9. Exclusions

This SLA does not cover:

- Inputs outside the supported Unicode range or exceeding 256 characters.
- Adversarial inputs crafted after the weekly benchmark snapshot (zero-day homographs).
- Third-party registrar availability or DNS resolution failures.
- Consumer misuse of the API or SDK.

## 10. Changes

Changes to this SLA require a pull request approved by both Security and Platform Engineering and must be reflected in the next quarterly review.

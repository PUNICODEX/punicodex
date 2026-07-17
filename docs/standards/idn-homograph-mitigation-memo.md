# PUNICODEX Technical Memo — IDN Homograph Mitigation

**To:** W3C WebAppSec, Unicode ICU, ICANN SSAC, browser vendors, registrar operators
**From:** PUNICODEX Name Authenticity Team
**Date:** 2026-06-22
**Version:** 1.0

## 1. Executive Summary

Internationalized Domain Names (IDNs) enable the global web to use native scripts, but the same mechanism is exploited to register visually deceptive domains. This memo documents PUNICODEX's defense-in-depth strategy and proposes a set of best practices for mitigating homograph, mixed-script, and lookalike attacks.

## 2. Threat Model

| Technique | Example | Risk |
|---|---|---|
| Single-script homoglyph | `аpple.com` (Cyrillic `а`) | High — perfect visual match in most fonts |
| Mixed-script injection | `pаypal.com` (Latin + Cyrillic) | High — bypasses single-script whole-label checks |
| Diacritic stacking | `paypál.com` (combining acute on `a`) | Medium — can render identically to precomposed form |
| Whole-word confusables | `arnazon.com` (`rn` → `m`) | Medium — font-dependent |
| Invisible characters | zero-width joiner, variation selectors | Medium — breaks normalization and user expectations |
| RTL override | `example.com/​abc` with RLO | High — flips visual display of entire labels |

## 3. Recommended Mitigations

1. **Whole-label script checks are necessary but not sufficient.** Require every label to be single-script, but also evaluate confusable pairs across scripts.
2. **Perceptual rendering comparison.** Render candidate labels in the user's actual font list and compare against canonical identities using pHash/SSIM.
3. **Canonical identity registry.** Maintain a machine-readable list of protected names, their legitimate Unicode variants, and owned domains.
4. **Conservative escalation.** When confidence is below a calibrated threshold, surface an explicit warning rather than silently trusting.
5. **Evidence-first reporting.** Every block or warning must include explainable evidence: code points, script families, confusable mappings, and rendered diff.

## 4. PUNICODEX Reference Implementation

The open-source PUNICODEX classifier implements the above as a pipeline:

```
Normalize (NFKC, UTS #46, IDNA2008) → Decompose → Identity Kernel
→ Perceptual Glyph Engine → Risk Features → Ensemble Classifier
→ Verdict Mapper → Policy Engine → Evidence Builder
```

Implementation: `platform/api/authenticity-service.js`
Tests: `test/authenticity-cases.test.js`, `test/homograph-defense.test.js`

## 5. Call to Action

We invite standards bodies and browser vendors to adopt these practices as normative guidance for IDN display policies, safe-browsing feeds, and registrar abuse workflows.

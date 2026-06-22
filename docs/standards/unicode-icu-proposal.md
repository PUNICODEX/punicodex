# PUNYCODEX Proposal — Unicode ICU Best Practice for Name Safety

**Document type:** Draft best-practice submission for ICU (International Components for Unicode)
**Version:** 1.0
**Date:** 2026-06-22

## 1. Scope

This proposal recommends additions to ICU's `uspoof` and IDNA APIs so that downstream applications (browsers, registrars, security products) can detect deceptive Unicode names with explainable evidence.

## 2. Proposed API Additions

### 2.1 `USpoofCheckResult` Evidence Fields

Extend `USpoofCheckResult` to expose:

```c
typedef struct {
  UChar32 source;
  UChar32 target;
  const char* scriptFamily;
  const char* confusableCategory;  // "homoglyph", "near-homoglyph", "diacritic", "invisible"
  double visualSimilarityScore;      // 0.0 .. 1.0
  const char* contextualNote;
} UConfusableMatch;

UConfusableMatch* uspoof_getConfusableMatches(USpoofChecker* sc, ...);
```

### 2.2 IDNA Display Policy API

Add an API that, given a decoded IDN label and a list of canonical identities, returns:

- `displayAsUnicode`: safe to show as Unicode
- `displayAsPunycode`: always render as `xn--...`
- `warnUser`: show inline warning before navigation
- `evidence`: array of `UConfusableMatch` structs

### 2.3 Locale-Aware Confusables

ICU should support locale-specific confusable tables:

- Turkish `ı` vs Latin `i`
- Azerbaijani `ə` vs Latin `a`
- Greek final sigma `ς` vs sigma `σ`

## 3. Reference Data

PUNYCODEX publishes a curated confusable atlas at `platform/db/confusables.json` and per-locale overrides at `platform/db/locale-confusables.json`. These datasets are available under the project license for adoption into ICU test suites.

## 4. Backwards Compatibility

All proposed additions are additive; existing `uspoof_checkUnicodeString` behavior remains unchanged unless callers opt in with new check types (`USPOOF_CANONICAL_IDENTITY_CHECK`, `USPOOF_RENDERED_SIMILARITY`).

## 5. Next Steps

1. Open a Unicode CLDR/ICU ticket referencing this proposal.
2. Contribute confusable data and test cases to the ICU repository.
3. Publish an interoperability report comparing ICU, PUNYCODEX, and browser vendor implementations.

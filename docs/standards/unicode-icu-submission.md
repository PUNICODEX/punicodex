# Unicode ICU Submission — Extended Confusable Detection API

**Project:** PUNYCODEX Name Authenticity Shield  
**Submission type:** Best-practice proposal / API extension request  
**Target:** ICU (International Components for Unicode) and Unicode Consortium  
**Date:** 2026-06-22

## Problem Statement

The Unicode Confusables table (`confusables.txt`) and the ICU `uspoof` API provide excellent coverage of single-codepoint homoglyphs, but operational phishing detection requires additional signals:

1. **Whole-word confusables** such as `rn` → `m`, `vv` → `w`, and `cl` → `d`.
2. **Font-rendered similarity** for glyphs that are identical in common sans-serif fonts but distinct in monospace or serif fonts.
3. **Contextual identity awareness** so the same string can be judged safe or unsafe based on ownership and linguistic provenance.
4. **Invisible-character risk** beyond the current checks for bidirectional overrides and joiners.

## Proposed ICU API Extension

```c
UENUMStatus U_EXPORT2
uspooof_checkExtended(const UChar *id, int32_t length,
                      const UChar *targetIdentity, int32_t targetLength,
                      USpoofCheckExtendedResult *outResult,
                      UErrorCode *status);
```

The `USpoofCheckExtendedResult` structure would return:

- `overallRisk`: enumerated level (`none`, `low`, `medium`, `high`, `critical`).
- `confusableCount`: number of confusable code points detected.
- `wholeWordMatches`: array of substring positions that visually collide with the target identity.
- `invisibleChars`: array of invisible or ignorable code point positions.
- `scriptMix`: bitmask of scripts present in the input.

## Reference Data Offered

PUNYCODEX maintains a curated, license-clean dataset of:

- ~8,000 single-codepoint confusable mappings derived from the Unicode confusables table.
- ~50 whole-word confusable patterns validated against real-world phishing data.
- Per-font glyph similarity scores for system UI fonts and monospace/serif variants.
- A public benchmark of 100,000 deceptive and 50,000 legitimate Unicode names.

We propose to donate this dataset to ICU under a compatible open-source license once the PUNYCODEX data license is finalized.

## Backward Compatibility

The proposed API is additive. Existing `uspoof_check` behavior remains unchanged. The extended checks are opt-in via a new flag, `USPOOF_EXTENDED_CHECKS`, preserving existing integrations.

## Next Steps

1. Open an ICU ticket with this proposal and a reference implementation patch.
2. Publish the PUNYCODEX benchmark as a Unicode technical note.
3. Coordinate with the Unicode Confusables Maintenance Committee on data updates.

---

*Contact: security@punycodex.com*

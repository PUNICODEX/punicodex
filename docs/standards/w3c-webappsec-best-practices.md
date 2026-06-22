# W3C WebAppSec Best-Practice Draft: Unicode Name Safety

**Date:** 2026-06-22
**Status:** Draft submission
**Audience:** W3C Web Application Security Working Group

## Summary

This document proposes best practices for web applications that display, parse, or navigate to Unicode domain names, user handles, or search results. The goal is to reduce homograph and mixed-script deception without breaking legitimate internationalized names.

## Recommended Practices

1. **Display canonicalization.** Before rendering a Unicode hostname in the address bar or UI, convert it to its canonical Unicode form using UTS #46 with `CheckBidi`, `CheckJoiners`, and `UseSTD3ASCIIRules`.
2. **Mixed-script highlighting.** When a label contains characters from more than one script, apply a subtle visual warning unless the combination is on an allowlist (e.g., Japanese Latin + Katakana).
3. **Confusable alerts.** If a string has a high visual similarity to a known high-value identity, show an explanatory warning with the canonical identity.
4. **Safe fallback for unknown scripts.** Render Punycode (`xn--`) when the user agent cannot determine that a label is safe to display.
5. **Privacy-preserving telemetry.** Hash raw inputs before logging; aggregate metrics with differential privacy.

## Conformance

User agents and web applications may claim conformance by implementing the display canonicalization and mixed-script-highlighting requirements. Additional confusable-alert and telemetry controls are recommended for high-security contexts.

## References

- W3C *URL Standard*
- Unicode Technical Standard #46
- Unicode Technical Report #36, *Security Considerations for the Unicode Standard*

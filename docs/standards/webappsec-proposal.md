# W3C WebAppSec Proposal: IDN Display Policy

**Date:** 2026-06-22
**Status:** Draft submission
**Audience:** W3C Web Application Security Working Group

## Summary

PUNYCODEX proposes a browser-facing IDN display policy that lets user agents render Unicode domain names safely without breaking legitimate internationalized content. The policy builds on UTS #46 and adds mixed-script/confusable warnings.

## Recommended Controls

1. **Display canonicalization.** Convert every hostname to UTS #46 canonical form before rendering.
2. **Mixed-script highlighting.** Warn when a label mixes scripts unexpectedly.
3. **Confusable alerts.** Compare visually similar names against a trusted identity list.
4. **Safe fallback.** Render Punycode when safety cannot be determined.

## References

- W3C WebAppSec
- Unicode Technical Standard #46
- IDNDisplayPolicy

# ICANN SSAC Consultation Response: Unicode Domain Safety

**Date:** 2026-06-22
**Status:** Submitted for consultation
**Audience:** ICANN Security and Stability Advisory Committee (SSAC)

## Summary

PUNYCODEX welcomes the opportunity to contribute to ICANN's ongoing work on IDN security. Our operational experience crawling and classifying Unicode domains confirms that homograph attacks remain a significant and evolving risk to DNS stability and user trust.

## Key Points

1. **Registry-level script restrictions are necessary but not sufficient.** Allowed-script tables reduce obvious abuse but cannot cover every confusable pair or mixed-script combination.
2. **Registrars should receive confusable alerts at registration time.** A lightweight API that flags visually similar existing domains would reduce preemptive registration of spoofs.
3. **Rapid revocation and evidence exchange matter.** Spoof domains move quickly; standards like STIX/TAXII should be adopted for sharing high-confidence indicators among registrars, browsers, and security vendors.
4. **Transparency data should be machine-readable.** Quarterly reports on IDN abuse takedowns, false positives, and appealed disputes would help the community calibrate policy.

## Proposed Actions

- Encourage registries to publish IDN tables and confusable restrictions in a common JSON format.
- Define a minimal abuse-report API for registrar-to-researcher and registrar-to-browser communication.
- Adopt STIX 2.1 as the canonical threat-intel exchange format for IDN-related indicators.

## References

- ICANN *IDN Implementation Guidelines*
- ICANN *Registry Services Technical Evaluation Panel* reports
- STIX 2.1 specification, OASIS

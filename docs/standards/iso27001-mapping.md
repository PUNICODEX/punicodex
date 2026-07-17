# ISO 27001 Control Mapping

**Date:** 2026-06-22
**Status:** Evidence collection

## Summary

This document maps PUNICODEX controls to ISO/IEC 27001:2022 Annex A controls.

## Control Mapping

| ISO 27001 Control | Title | PUNICODEX Implementation |
|---|---|---|
| A.5.1 | Policies for information security | `docs/standards/`, security policy memos |
| A.5.7 | Threat intelligence | STIX export, threat feed, SIEM connectors |
| A.8.1 | User endpoint devices | Browser extension, mobile SDK |
| A.8.5 | Secure authentication | RBAC, API keys, admin tokens |
| A.12.1 | Operational procedures | `docs/runbooks/` |
| A.16.1 | Management of information security incidents | Incident runbooks, PagerDuty integration |

## References

- ISO/IEC 27001:2022 Annex A
- `docs/runbooks/`
- `platform/api/stix-export.js`

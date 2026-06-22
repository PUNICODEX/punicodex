# SOC 2 Control Mapping

**Date:** 2026-06-22
**Status:** Evidence collection

## Summary

This document maps PUNYCODEX Name Authenticity Shield controls to SOC 2 Trust Services Criteria and links each control to its evidence.

## Control Mapping

| SOC 2 Criteria | Control | Evidence |
|---|---|---|
| CC6.1 | Logical access control | `platform/api/rbac.js`, access review |
| CC6.6 | Security infrastructure | `platform/api/audit-log.js`, hash-chain |
| CC7.2 | System monitoring | Grafana dashboards, PagerDuty alerts |
| CC8.1 | Change management | `scripts/reproducible-build.sh`, deployment logs |
| A1.2 | Availability | Runbook library, DDoS response |

## Evidence Checklist

- Access review
- hash-chain audit log sample
- Red-team exercise report
- Penetration test summary
- STIX export sample
- False-positive budget report
- Runbook execution log

## References

- `platform/api/audit-log.js`
- `docs/runbooks/`
- `scripts/reproducible-build.sh`

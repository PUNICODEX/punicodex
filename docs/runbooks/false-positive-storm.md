# Runbook — False-Positive Storm

**Trigger:** Sudden spike in false-positive reports or `false_positive_rate` SLO breach.

## 1. Detection

- Grafana alert `false_positive_rate > 0.001%` over 5-minute window.
- Support queue flooding with "not a spoof" appeals.

## 2. Immediate Actions (0–5 minutes)

1. Identify the common pattern:
   ```sql
   SELECT input, COUNT(*) FROM spoof_reports
   WHERE created_at >= datetime('now', '-1 hour')
   GROUP BY input ORDER BY COUNT(*) DESC LIMIT 20;
   ```
2. If a specific rule or model version is responsible, disable or roll back the rule:
   ```bash
   export AUTHENTICITY_RULE_OVERRIDE=skip_recent_rule
   ```
3. Bulk-allowlist confirmed false positives via `platform/api/policy-engine.js`.
4. Increase active-learning sampling to capture more human labels.

## 3. Communication

- Status page: yellow if only warnings are affected, red if blocks are affected.
- Email enterprise tenants with estimated resolution time.

## 4. Validation

1. Re-run `test/false-positive-budget.test.js` on a recent sample.
2. Confirm the false-positive rate returns below the 0.001% target.
3. Audit allowlist changes in `audit_logs`.

## 5. Post-Incident

- Add the false-positive samples to the legitimate-50k benchmark.
- Adjust model threshold or feature if the root cause is algorithmic.

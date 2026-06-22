# Runbook — Model Rollback

**Trigger:** Classification accuracy drops, false-positive storm, or new model version fails health checks.

## 1. Detection

- PagerDuty alert: `authenticity_model_drift` or `false_positive_rate > 0.001%`.
- Grafana dashboard: `platform/observability-service.js` → `getMetrics`.

## 2. Immediate Actions (0–2 minutes)

1. Identify the active model version from `GET /api/v1/version`.
2. Set the fallback model version in environment config:
   ```bash
   export AUTHENTICITY_MODEL_VERSION=previous-stable
   ```
3. Restart API workers or redeploy the edge function with the previous model.
4. Verify `/api/v1/authenticity/check` returns expected verdicts on known samples.

## 3. Communication

- Post incident in `#incidents` Slack channel.
- Update status page if classification latency or availability is impacted.

## 4. Recovery Validation

1. Run `test/false-positive-budget.test.js` and `test/red-team-ci.test.js`.
2. Confirm p99 latency is below 5 ms.
3. Mark incident resolved after 15 minutes of green metrics.

## 5. Post-Incident

- Capture model artifacts and input samples that regressed.
- File retraining ticket with the MLops pipeline (`scripts/retrain-authenticity-model.js`).

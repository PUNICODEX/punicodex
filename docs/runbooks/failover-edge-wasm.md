# Runbook — Edge/WASM Failover

**Trigger:** Primary API is unreachable from edge locations, database connectivity is lost, or Redis cluster failure causes cache misses.

## 1. Detection

- Health probe reports `degraded` from `/api/v1/health`.
- Grafana alert: `api_availability < 99.999%` or `edge_wasm_fallback > 0`.
- PagerDuty alert from the edge observability dashboard.

## 2. Immediate Actions (0–5 minutes)

1. Confirm the API origin is unreachable from multiple edge POPs.
2. Promote the WASM edge classifier to serve read-only classification requests:
   ```bash
   export AUTHENTICITY_EDGE_MODE=wasm-only
   ```
3. Warm the edge cache with the top 1,000 canonical entries.
4. Disable writes (reports, feedback) and queue them for replay once the API recovers.

## 3. Communication

- Update the status page to indicate read-only edge mode.
- Notify enterprise tenants that classification continues but mutations are deferred.

## 4. Validation

1. Verify `GET /api/v1/authenticity/check` returns a verdict with `source: edge-wasm`.
2. Confirm p99 latency remains below 5 ms at the edge.
3. Ensure no data loss for queued write operations.

## 5. Post-Incident

- Restore the primary API and drain the write queue.
- Compare edge classifications with API classifications for drift.
- Document root cause and update runbooks if the failover triggered for a new reason.

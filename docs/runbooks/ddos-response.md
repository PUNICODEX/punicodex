# Runbook — DDoS Response

**Trigger:** API latency spikes, error rate increases, or upstream provider reports volumetric attack.

## 1. Detection

- PagerDuty alert: `api_error_rate > 1%` or `p99_latency > 5ms`.
- Cloudflare/Vercel dashboard shows anomalous request volume.

## 2. Immediate Actions (0–5 minutes)

1. Enable strict rate limiting for anonymous requests via `platform/api/api-rate-limiter.js`.
2. Toggle `STRICT_MODE=1` to require API keys for all `/api/v1/authenticity/*` endpoints.
3. Enable challenge or CAPTCHA at the CDN edge for suspicious IP ranges.
4. Scale API workers / edge functions horizontally if auto-scaling is not active.

## 3. Communication

- Status page: red if availability SLO is breached.
- Notify enterprise tenants of any key-only access requirement.

## 4. Validation

1. Confirm `GET /api/v1/health` returns 200 and latency is within SLO.
2. Monitor rate-limiter blocked request count.
3. Confirm legitimate partner traffic is not throttled.

## 5. Post-Incident

- Collect attack fingerprints (IP ranges, user-agent patterns, request paths).
- Update firewall rules and threat-intel blocklists.
- Document lessons learned in incident tracker.

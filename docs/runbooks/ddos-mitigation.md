# Runbook — DDoS Mitigation

**Owner:** Platform Engineering  
**Severity:** High  
**Estimated time to execute:** 5 minutes

## Trigger

- QPS exceeds 10× baseline sustained over 1 minute.
- Error rate spikes due to resource exhaustion.
- Rate-limit alerts fire across multiple API keys or anonymous traffic.
- CDN or WAF reports anomalous traffic patterns.

## Impact

Service degradation, legitimate users blocked, and potential cost overruns.

## Steps

1. **Confirm the attack.**
   - Check the observability dashboard for traffic origin, User-Agent distribution, and request path.
   - Identify whether traffic is concentrated on `/api/v2/authenticity/check`, `/api/v2/search/web`, or static assets.

2. **Enable emergency rate limiting.**
   - Lower global free-tier rate limit to 10 requests/minute:
     ```bash
     curl -X POST https://punicodex.com/api/v2/admin/rate-limits \
       -H "x-admin-token: $ADMIN_TOKEN" \
       -d '{"tier": "free", "requestsPerMinute": 10}'
     ```
   - Enable proof-of-work challenge for anonymous classification requests if available.

3. **Activate edge-only mode.**
   - If the origin is overwhelmed, serve cached classifications from the Vercel Edge / Cloudflare Worker WASM bundle.
   - Set `EDGE_ONLY_MODE=true` on the edge functions.

4. **Block bad actors.**
   - Add offending IP ranges or ASNs to the WAF blocklist.
   - Use CAPTCHA or JS challenge for suspicious User-Agents.

5. **Scale resources.**
   - Increase serverless function concurrency limits.
   - Warm additional database read replicas if query load is high.

6. **Communicate.**
   - Update the status page.
   - Notify enterprise customers that SLA targets may be temporarily at risk.

## Verification

- [ ] Origin CPU/memory/backlog returned to normal.
- [ ] Error rate below 0.1%.
- [ ] Legitimate partner traffic is not blocked.
- [ ] Status page marked resolved.

## Post-incident

- Analyze attack signatures and add permanent WAF rules.
- Review rate-limit thresholds and edge-only fallback triggers.
- Update capacity plans if peak traffic exceeded provisioned limits.

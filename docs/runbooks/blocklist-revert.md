# Runbook — Blocklist Revert

**Trigger:** Legitimate domain or name is incorrectly added to the blocklist, causing false positives.

## 1. Detection

- Support ticket or automated false-positive report.
- `blocked_inputs` table shows recent block for the affected input.

## 2. Immediate Actions (0–2 minutes)

1. Look up the blocked input:
   ```sql
   SELECT * FROM blocked_inputs WHERE input = 'affected.example';
   ```
2. If the block was auto-promoted, set status to `false_positive`:
   ```sql
   UPDATE blocked_inputs SET reason = 'false_positive_reverted' WHERE input = 'affected.example';
   ```
   Or remove the row if it should never have been blocked.
3. Add the input to the tenant or global allowlist via `platform/api/policy-engine.js`.
4. Clear the Redis cache key pattern `punycodex:auth:*`.

## 3. Communication

- Notify affected tenant contacts.
- If public service was disrupted, post a status-page update.

## 4. Validation

1. Query `GET /api/v1/authenticity/check?q=affected.example` and confirm `canonical` or `unknown`.
2. Verify the input no longer appears in STIX export bundles.

## 5. Post-Incident

- Feed the false positive to `platform/api/active-learning.js` as a hard negative.
- Review clustering rule that caused auto-promotion.

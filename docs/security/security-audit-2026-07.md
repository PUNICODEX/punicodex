# PÚNYCODEX — Security Audit, July 2026

**Date:** 2026-07-17
**Scope:** Vercel serverless API surface (`api/**`), platform services
(`platform/api/**`, `platform/agents/**`, `platform/scholars/**`), booking and
email-verification flows, build-time generators, and deployment headers.
**Methodology:** Static review. Every finding was confirmed by reading the
code path end to end (handler → service → datastore) before being accepted.
No dynamic scanning, fuzzing, or penetration testing was performed; the
weekly red-team CI (`red-team.yml`) covers the authenticity subsystem
separately and was out of scope for this review.
**Data version under review:** `2.0.63`.

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | HIGH | Public crawl-event webhook: no auth, no rate limit, caller-controlled priority | **Fixed** |
| 2 | HIGH | Anonymous-session write endpoints without rate limits (gamification, agents, workspace) | **Fixed** |
| 3 | MED | Scholars login credential-stuffing limiter was synchronous in-memory only | **Fixed** |
| 4 | MED | 500 responses leaked internal error messages | **Fixed** |
| 5 | LOW | Email verification codes stored in plaintext, non-constant-time compare | **Fixed** |
| 6 | MED | Missing CSP / HSTS / Permissions-Policy headers | **Fixed** (portal workstream) |
| 7 | MED | Shared admin password instead of per-user admin accounts | **Fixed** (portal workstream) |
| 8 | MED | Blog generator lacks URL-scheme allowlist | **Fixed** (blog workstream) |
| 9 | LOW | Flagship generator performs raw template substitution | Documented-accepted |
| 10 | LOW | `@xenova/transformers` deprecated | Documented-accepted |
| 11 | LOW | Left-most `X-Forwarded-For` trust in client-IP extraction | Documented-accepted |

---

## Finding 1 — HIGH: public crawl-event webhook allowed unauthenticated queue flooding

**Evidence (pre-fix):** `api/crawl/events/index.js:10-24`. `POST /api/crawl/events`
was reachable by anyone, performed no authentication and no rate limiting,
and passed a caller-supplied `priority` straight into
`enqueueEvent` (`platform/api/event-crawler-service.js:27-45`). Pending events
are processed in `priority ASC` order, so an attacker could both flood the
`crawl_events` table and jump their own entries to the front of the queue;
each processed event triggers an outbound crawl (HTTP fetch) of the named
domain.

**Fix:**

- POST is now rate-limited per IP via `checkPublicRateLimitByReq(req, res,
  'crawl-events')` (`api/crawl/events/index.js:35`) — 10 requests/minute,
  matching the posture of every other public endpoint.
- Payload validation: the body must be a JSON object; `domain` (≤255 chars)
  and `source` (≤100 chars) must be non-empty strings; `punycode` and
  `eventType` are type-checked when present. Malformed payloads receive 400
  (`api/crawl/events/index.js:36-55`).
- `priority` must be numeric and is clamped to the integer range 1-10
  (default 5), so callers can no longer dominate queue ordering
  (`api/crawl/events/index.js:20-27`).

**Verification:** `node test/security-hardening.test.js` — "crawl/events POST
allows 10 requests then returns 429", "clamps priority into the 1-10 range",
"defaults priority to 5 when omitted", "rejects malformed payloads with 400".
Existing suite `node test/event-crawler.test.js` remains green.

## Finding 2 — HIGH: anonymous-session write endpoints without rate limits

**Evidence (pre-fix):**

- `api/gamification/index.js:58-79` — `POST` (`xp`, `challenge` actions)
  performed unlimited DB writes per anonymous session.
- `api/agents/index.js:24-49` — `POST ?agent=sentinel` ran
  `verifyAvailability(batchSize || 50)` (`platform/agents/sentinel.js:37-52`),
  which issues one real DNS lookup per row with no cap on `batchSize`:
  an unauthenticated outbound-work amplifier.
- `api/workspace/index.js:43-67` — `POST`/`PATCH`/`DELETE` performed
  unlimited DB writes.
- Session trust is intentionally weak: `getSessionToken`
  (`platform/api/search-v2.js:124-131`) accepts any 8-64 character
  `x-session-token`, so session identity provides no abuse resistance.

**Fix:**

- All three handlers now call `checkPublicRateLimitByReq` at the top of
  their write branches: `gamification-write` (`api/gamification/index.js:60`)
  and `workspace-write` (`api/workspace/index.js:45,72,87`) use the standard
  `public` bucket (10/min per IP per endpoint); GET behavior is unchanged.
- `agents-run` (`api/agents/index.js:37`) uses a new, stricter
  **`public-strict` bucket (5/min per IP)**, added to `DEFAULT_TIER_LIMITS`
  in `platform/api/api-rate-limiter.js:24-27` and selectable through a new
  `tier` option on `checkPublicRateLimitByReq`
  (`platform/api/public-rate-limiter.js:31-50`). Existing callers are
  unaffected (the option defaults to `public`).
- The sentinel `batchSize` is validated as numeric and clamped to 1-50
  (`api/agents/index.js:13-24,46-50`), capping DNS work per invocation.

**Verification:** `node test/security-hardening.test.js` — "gamification POST
is rate limited after 10 writes; GET is unaffected", "agents POST uses the
stricter 5/min bucket", "agents sentinel rejects a non-numeric batchSize with
400", "workspace POST, PATCH and DELETE share one 10/min write bucket".
Existing suites `node test/gamification.test.js`, `node test/agents.test.js`,
`node test/workspaces.test.js` remain green.

## Finding 3 — MED: scholars login credential-stuffing limiter was per-instance only

**Evidence (pre-fix):** `createLoginRateLimit`
(`platform/scholars/security.js:250-254`) called the synchronous
`loginLimiter.check(key)`, keeping counters in process memory. On Vercel each
serverless instance has its own memory, so the 10-attempts-per-15-minutes
(IP+email) budget reset per instance and gave no real protection against
credential stuffing. The Redis-backed async pattern already existed in the
same file (`ScholarsRateLimiter.checkAsync`, `security.js:91-118`) and was
used by `createScholarsRateLimit`.

**Fix:** `createLoginRateLimit` is now async and awaits
`loginLimiter.checkAsync(key)` (`platform/scholars/security.js:250-289`),
mirroring `createScholarsRateLimit`: with `REDIS_URL` configured, counters
are global across instances (`punycodex:rl:scholars:login:...`); without it,
the in-memory fallback is used. The `PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT=1`
escape hatch (used by the load and concurrency suites) is preserved.
Additionally, the limiter — previously defined but not mounted — is now wired
into the login route ahead of the per-IP strict limiter
(`platform/scholars/router.js:236-240`), so the IP+email budget is actually
enforced; this closes the gap where a distributed attack (many IPs, one
account) was constrained only by the per-IP limiter.

**Verification:** `node test/security-hardening.test.js` — "scholars login
limiter blocks the 11th attempt for one IP+email", "scholars login limiter
honors the PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT escape hatch".
`node platform/scholars/router.test.js` (91 tests, exercises `/auth/login`
end-to-end), `node platform/scholars/load.test.js`,
`node platform/scholars/concurrency.test.js`,
`node platform/scholars/session-revocation.test.js`, and
`node test/scholars-api-flow.test.js` all remain green.

## Finding 4 — MED: 500 responses leaked internal error messages

**Evidence (pre-fix):** `handleError` (`api/_utils.js:8`) and `handleApiError`
(`platform/api/api-response.js:92`) serialized `err.message` into the 500
response body. Uncaught errors from `better-sqlite3`, the crawler, or the
filesystem can disclose schema details, file paths, and query fragments to
unauthenticated callers.

**Fix:** both handlers now return a generic `{ error: 'Internal server
error' }` body when `NODE_ENV === 'production'` or the `VERCEL` environment
variable is set, while still logging the full error server-side with
`console.error` (`api/_utils.js:5-17`,
`platform/api/api-response.js:90-104`). Non-production environments keep the
detailed message for developer ergonomics. The check is evaluated per
request, not at module load.

**Verification:** `node test/security-hardening.test.js` — four cases:
detailed message outside production, generic body under
`NODE_ENV=production`, generic body under `VERCEL=1`, and the v1 envelope
variant (`handleApiError`). No existing suite asserted on leaked messages, so
no suite required updating. `node test/api-utils.test.js`,
`node test/api-v1.test.js`, `node test/api-v2.test.js` remain green.

## Finding 5 — LOW: email verification codes stored in plaintext

**Evidence (pre-fix):** `sendVerification` inserted the 6-digit code verbatim
into `email_verifications` (`platform/api/booking-service.js:253-260`), and
`checkVerification` compared it with `!==` (`booking-service.js:276`).
Any database read (backup, log shipping, SQLi elsewhere) would disclose
usable codes, and the comparison was not constant-time. The pre-existing
10-minute TTL and the `verify-send`/`verify-check` rate limits
(`api/verify/[action].js:15,21`) kept the practical severity low.

**Fix:** codes are now stored as SHA-256 hashes
(`platform/api/booking-service.js:37-39,273`) and verified with
`crypto.timingSafeEqual` over the hash bytes
(`platform/api/booking-service.js:41-47,290`). The plaintext code continues
to exist only in the outgoing email. TTL, single-use deletion, and rate-limit
behavior are unchanged. Hashing is one-way at the same entropy the code
already had (6 digits), consistent with how API keys are handled.

**Test update disclosure:** `test/booking-service.test.js` previously read
the plaintext code straight out of the database (`SELECT code FROM
email_verifications`) — i.e. the suite encoded the vulnerability. It now
captures the code at the email boundary (a mocked
`platform/api/email.js#sendVerificationCode`) and asserts that the stored
value is the SHA-256 hash of the delivered code, not the code itself.

**Verification:** `node test/security-hardening.test.js` — "verification
codes are hashed at rest and accepted exactly once".
`node test/booking-service.test.js` (19 tests) and `node test/email.test.js`
remain green.

**Related observation (not fixed here):** the local Express dev server keeps
its own copy of this flow at `platform/server.js:1417-1459`, which still
stores plaintext codes and generates them with `Math.random()`. That file was
outside this workstream's scope; see recommendation R4 below.

---

## Findings fixed by the parallel workstreams

### 6 — MED: missing CSP / HSTS / Permissions-Policy headers — **Fixed** (portal workstream)

`vercel.json` previously set only `X-Frame-Options`, `X-Content-Type-Options`,
and `Referrer-Policy`. The portal workstream added, on the global `/(.*)`
headers block: `Strict-Transport-Security: max-age=63072000; includeSubDomains;
preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a
permissive `Content-Security-Policy-Report-Only` (`default-src 'self'` with
`'unsafe-inline'` for scripts/styles). CSP is deliberately report-only: 895
static temples carry inline scripts/styles, so violations must be collected
before enforcement (R2). `vercel.json` remains single-key valid JSON.

### 7 — MED: shared admin password — **Fixed** (portal workstream)

The unified admin portal introduces per-user `admin_users` accounts (bcrypt(12)
password hashes, roles `superadmin/ops/leasing/scholars/viewer`, 5-attempt
lockout, immediate session revocation on disable/password change, per-user
attribution in the newly created `admin_actions` audit table) — see
`platform/db/migrate-admin-users.js` and `platform/api/admin-portal-auth.js`.
The legacy shared-password `/api/admin/login` is retained for backward
compatibility; portal sessions reuse the SHA-256-hashed `admin_sessions`
token store with an `admin_user_id` link. Verified by
`node test/admin-portal.test.js` (36 tests).

### 8 — MED: blog generator lacks URL-scheme allowlist — **Fixed** (blog workstream)

`scripts/generate-blog-pages.js#mdToHtml` now renders links only for
allowlisted schemes (`http:`, `https:`, `mailto:`, and plausible relative
links); anything else is emitted as literal text, so a corrupted content file
can no longer inject `javascript:`/`data:` URLs into generated pages. Verified
by `node --test test/blog.test.js` (196 posts) and the full link checker
(`node test/links.js`, 136k links).

## Documented-accepted findings

### 9 — LOW: raw template substitution in flagship generator

`scripts/create-flagship.js:921-928` performs raw string substitution of
lore-catalog HTML into flagship temple templates without escaping. This is
intentional: the lore catalog is a trusted, hand-curated canonical source
whose HTML is meant to render verbatim, and all of it passes the flywheel
validators before deploy. **Accepted risk:** if lore-catalog content is ever
sourced from an untrusted channel, this becomes an XSS sink. Residual risk is
carried by the content-governance process (canonical sources are
review-only), not by code.

### 10 — LOW: `@xenova/transformers` deprecation

The ML embedding/classifier stack depends on the deprecated
`@xenova/transformers` package, which also anchors the unresolved
`protobufjs` CVE chain tracked in `docs/security/cve-tracker.md`. Usage is
confined to the optional site-embedding pipeline on internally controlled
input. No dependency change was made in this workstream; migration is
recommended (R3) rather than forced.

### 11 — LOW: left-most `X-Forwarded-For` trust in client-IP extraction

`platform/api/client-ip.js:8-17` trusts the left-most `X-Forwarded-For`
value, which is client-spoofable on a direct connection. Behind Vercel the
platform overwrites/append-controls this header, so the extracted IP is
trustworthy for rate limiting in production. **Accepted risk:** the local
Express server (`npm run platform`) has no such guarantee, so IP-based limits
there are advisory only. No code change; documented here so future non-Vercel
deployments re-evaluate.

---

## Remaining recommendations

- **R1 — External datastore for rate-limit integrity.** All API rate limits
  (public buckets, API-key tiers, scholars limiters) fall back to per-process
  memory when `REDIS_URL` is unset, and Vercel's ephemeral SQLite means the
  abuse log is not durable either. Production deployments should set
  `REDIS_URL` (the code paths are already in place and covered by the Redis
  branch tests in `test/rate-limiter.test.js`) and consider moving security
  counters to the same external Postgres planned for booking persistence.
- **R2 — CSP rollout: report-only first.** When the portal workstream lands
  CSP/HSTS/Permissions-Policy (finding 6), deploy `Content-Security-Policy-
  Report-Only` for at least one release cycle and collect violations before
  switching to enforcing; the static pages carry inline scripts/styles that
  will need nonces or hashes.
- **R3 — Migrate off `@xenova/transformers`.** Evaluate
  `@huggingface/transformers` (the successor package, already present in the
  dependency tree) for the embedding pipeline; this also clears the
  `protobufjs` CVE chain in `docs/security/cve-tracker.md`. Keep the
  authenticity benchmarks (`data/benchmarks/authenticity/`) as the
  acceptance gate for any model swap.
- **R4 — Deduplicate the local dev server's verify flow.** Make
  `platform/server.js:1417-1459` delegate to
  `platform/api/booking-service.js#sendVerification` / `checkVerification`
  instead of maintaining a parallel implementation; this removes the last
  plaintext-code storage and the `Math.random()` code generator, and
  guarantees the two environments cannot drift again.
- **R5 — Re-test after infrastructure changes.** Any migration of session,
  rate-limit, or booking persistence to an external store should re-run
  `node test/security-hardening.test.js` plus the suites listed in
  `test/run-all.js` before rollout.

## Verification record

All commands below were run on 2026-07-17 against the fixed tree:

```bash
node test/security-hardening.test.js          # 15 passed, 0 failed (new suite)
node test/rate-limiter.test.js                # 7 passed, 0 failed
node test/admin.test.js                       # 12 passed, 0 failed
node test/api-utils.test.js                   # 9 passed, 0 failed
node test/api-v1.test.js                      # 41 passed, 0 failed
node test/api-v2.test.js                      # 26 passed, 0 failed
node test/gamification.test.js                # passed
node test/agents.test.js                      # passed
node test/workspaces.test.js                  # passed
node test/event-crawler.test.js               # 4 passed, 0 failed
node test/booking-service.test.js             # 19 passed, 0 failed
node test/booking-validation.test.js          # 5 passed, 0 failed
node test/admin-bookings.test.js              # passed
node test/email.test.js                       # 6 passed, 0 failed
node test/cron-single-flight.test.js          # 7 passed, 0 failed
node test/patron-service.test.js              # 22 passed, 0 failed
node test/marketplace.test.js                 # passed
node test/creative-marketplace.test.js        # passed
node platform/scholars/router.test.js         # 91 passed, 0 failed
node platform/scholars/auth.test.js           # passed
node platform/scholars/session-revocation.test.js  # 8 passed, 0 failed
node platform/scholars/load.test.js           # 6 passed, 0 failed
node platform/scholars/concurrency.test.js    # 4 passed, 0 failed
node test/scholars-api-flow.test.js           # 54 assertions passed, 0 failed
```

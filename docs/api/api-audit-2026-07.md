# PuniCodex Public API Audit — July 2026

Scope: the versioned public APIs — `api/v1/**` (per-resource Vercel handlers)
and `api/v2/**` (explicit routes + `[[...slug]]` catch-all backed by
`platform/api/api-v2-router.js`). Unversioned routes (`api/search`, `api/entry`,
…), admin routes (`api/admin/**`), and cron routes were not in scope.

Enforcement: `test/openapi-contract.test.js` (registered in `test/run-all.js`
as **OpenAPI Contract Tests**) proves both OpenAPI documents match the
implemented route surface. It fails if a documented route 404s/500s, if an
implemented public route is missing from the spec, if a `required` parameter
is not enforced with 400, or if representative envelopes drift from their
declared schema names.

## Shared infrastructure (both versions)

All versioned routes are wrapped by `platform/api/api-handler.js`
(`createApiHandler`), which provides:

- **CORS** via `platform/api/api-response.js#setCors` — allowlist origins
  (`ALLOWED_ORIGINS`), `Access-Control-Allow-Methods: GET, POST, OPTIONS`,
  credentials enabled for allowlisted origins. Verified identical for
  equivalent v1/v2 endpoints (contract test asserts both).
- **Rate limiting** — fixed window per key or per IP; tiers Free 100/day,
  Hobby 1,000/day, Pro 10,000/day, Enterprise 100,000/day. Every non-OPTIONS
  response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` (asserted by the contract test for both versions).
- **Auth** — optional `Authorization: Bearer <key>`; keyless reads run at the
  free tier; invalid keys → `401 UNAUTHORIZED`; missing scopes → `403 FORBIDDEN`.
- **Envelopes** — success: `{ success: true, data, meta: { requestId, version,
  timestamp, ... }, links?, license }`; error: `{ success: false, error:
  { code, message, details }, meta, license }`. One shape per version; v1 and
  v2 error objects have identical keys (asserted by the contract test).

Status-code conventions verified across both versions: `400` validation,
`401`/`403` auth, `404` missing resource, `405` wrong method (every spec'd
path rejects an undeclared method — swept by the contract test), `429` rate
limited. Trailing slashes behave consistently (`/api/v2/names/` ≡
`/api/v2/names`; v1 file-based routing normalizes at the platform layer).

## v1 route table (`/api/v1`, spec: `platform/api/openapi.json`, 47 paths)

Success envelope is the standard v1 envelope for every route below unless
noted. All routes are keyless (free tier, IP-limited) unless an Auth column
says otherwise.

| Method | Path | Auth | Required input | Success data |
|---|---|---|---|---|
| GET | `/names` | — | — | `Name[]`, `meta.pagination` |
| POST | `/names/batch` | — | body `ids[]` (1–100) | `Name[]`, `meta.requested/returned/missing` |
| GET | `/names/{id}` | — | — | full scholarly record |
| GET | `/names/{id}/variants` | — | — | variant forms |
| GET | `/names/{id}/breakdown` | — | — | character steps |
| GET | `/names/{id}/original-script` | — | — | script + provenance |
| GET | `/names/{id}/etymology` | — | — | etymology |
| GET | `/names/{id}/availability` | — | — | availability + registrar links |
| GET | `/names/{id}/site` | — | — | indexed site metadata (nullable) |
| GET | `/names/{id}/slots` | — | — | ad-slot inventory |
| GET | `/names/{id}/lore` | — | — | flagship lore |
| GET | `/names/{id}/pronunciation` | — | — | pronunciation |
| GET | `/names/{id}/mythology` | — | — | mythology section |
| GET | `/names/{id}/archaeology` | — | — | archaeology section |
| GET | `/names/{id}/patterns` | — | — | industry-pattern profile |
| GET | `/names/{id}/similarities` | — | — | similarity edges (`limit,minStrength,relationship,category`) |
| GET | `/names/{id}/graph` | — | — | ego-network (`depth,limit,minStrength,relationship,category`) |
| GET | `/pantheons` | — | — | `{ items, count, total }` |
| GET | `/pantheons/{name}` | — | — | `{ id, items, total }` |
| GET | `/tiers` | — | — | `{ items }` (3 tiers) |
| GET | `/autocomplete` | — | query `q` | `{ query, items, count }` |
| GET | `/convert` | — | query `q` | `{ matches, queryTrust }` |
| POST | `/convert/batch` | — | body `queries[]` (1–100) | `{ items, count }` |
| GET | `/appraise` | — | query `q` | appraisal + lexicon match |
| POST | `/appraise/batch` | — | body `domains[]` (1–100) | appraisals |
| GET | `/cards` | — | — | `Card[]`, `meta.pagination` |
| GET | `/cards/{id}` | — | — | `{ entryId, variants }` |
| GET | `/similarities` | — | — | full graph `{ nodes, edges, meta }` |
| GET | `/similarities/relationships` | — | — | `{ count, items }` |
| GET | `/industry-patterns` | — | — | pattern map |
| GET | `/industry-patterns/industries` | — | — | `{ count, industries }` |
| GET | `/connections/taxonomy` | — | — | concept taxonomy |
| GET | `/authenticity` | — | — | endpoint map |
| GET | `/authenticity/check` | — | query `input` (`type`) | classification + evidence |
| POST | `/authenticity/check/batch` | — | body `inputs[]` (1–100) | classifications |
| POST | `/authenticity/report` | — | body `input` | `{ reported, spoof }` |
| GET | `/authenticity/report/{id}/pdf` | — | query `input` | `application/pdf` binary (no envelope) |
| POST | `/authenticity/abuse-report` | Bearer + `abuse:write` | body `domain`, `category` | `{ report }` |
| GET | `/policy` | — | — (`tenant`) | policy document |
| POST | `/policy/evaluate` | — | body `input` | `{ action, tier, verdict, … }` |
| GET | `/threat-feed` | — | — (`target_identity_id,status,source,cluster_id,limit,offset`) | events[], `meta.pagination` |
| GET | `/threat-feed/stats` | — | — | `{ byStatus, bySource, byCluster }` |
| GET | `/threat-feed/campaigns/{identityId}` | — | — (`days`) | events[] |
| POST | `/threat-feed/ingest` | Bearer + `threat:write` | body `input` | 201 `{ relationship, cluster, reputationScore }` |
| POST | `/threat-feed/cluster/{clusterId}/review` | Bearer + `threat:write` | body `status` | updated cluster |
| GET | `/transparency-report` | — | — | quarterly report |
| GET | `/version` | — | — | dataset version manifest |
| GET | `/openapi.json` | — | — | raw OpenAPI document (no envelope) |
| GET | `/docs` | — | — | Swagger UI HTML (no envelope) |

Implemented but deliberately **not** in the spec (allowlisted in the contract
test):

- `GET /canary` — honeypot endpoint; documenting it would defeat its purpose.
  Payload is byte-stable by design (scraper fingerprinting).
- `/creatives/*` — separate Express sub-API (vercel.json rewrite) with its own
  contract; see "Deliberately left" below.
- `/scholars/*` — same: separate Scholarly Edition sub-API.

## v2 route table (`/api/v2`, spec served at `/api/v2/openapi.json`, 29 paths)

All routes use the standard v2 envelope (`meta.version: 'v2'`). Keyless unless
noted. The v2 spec document is a path→summary map (OpenAPI 3.0 info block),
not a full schema-level spec — see "Deliberately left".

| Method | Path | Auth | Required input | Success data |
|---|---|---|---|---|
| GET | `/api/v2` | — | — | docs index (name, endpoints) |
| GET | `/api/v2/names` | — | — | `Name[]`, `meta.pagination`, `links` |
| GET | `/api/v2/names/{id}` | — | — | name record |
| GET | `/api/v2/names/{id}/{subresource}` | — | — | one of 12 subresources (variants, breakdown, original-script, etymology, availability, site, slots, lore, pronunciation, mythology, archaeology, similarities, graph) |
| GET | `/api/v2/pantheons` | — | — | pantheons |
| GET | `/api/v2/pantheons/{name}` | — | — | pantheon entries |
| GET | `/api/v2/tiers` | — | — | tier docs |
| GET | `/api/v2/autocomplete` | — | query `q` | completions |
| GET | `/api/v2/convert` | — | query `q` | matches |
| POST | `/api/v2/convert/batch` | — | body `queries[]` | batch results |
| GET | `/api/v2/appraise` | — | query `q` | appraisal |
| POST | `/api/v2/appraise/batch` | — | body `domains[]` | appraisals |
| GET | `/api/v2/authenticity/check` | — | query `input` | classification + evidence |
| POST | `/api/v2/authenticity/check/batch` | — | body `inputs[]` | classifications |
| POST | `/api/v2/authenticity/report` | — | body `input` | report ack |
| GET | `/api/v2/policy` | — | — | policy |
| POST | `/api/v2/policy/evaluate` | — | body `input` | evaluation |
| GET | `/api/v2/similarities/relationships` | — | — | relationship types |
| GET | `/api/v2/threat-feed/stream` | — | — | Server-Sent Events (no JSON envelope) |
| GET/POST | `/api/v2/tenants/{tenantId}/users` | admin token / tenant key | — | tenant users |
| PATCH | `/api/v2/tenants/{tenantId}/users/{userId}/role` | 〃 | body `role` | role change |
| GET | `/api/v2/tenants/{tenantId}/audit` | 〃 | — | audit logs |
| GET | `/api/v2/tenants/{tenantId}/audit/export` | 〃 | — | JSON/CSV/CEF download |
| POST | `/api/v2/tenants/{tenantId}/audit/verify` | 〃 | — | hash-chain check |
| POST | `/api/v2/tenants/{tenantId}/retention/purge` | 〃 | — | purge result |
| GET | `/api/v2/search/web` | — | query `q` | web results |
| GET | `/api/v2/sites` | — | — | indexed sites |
| GET | `/api/v2/sites/{punycode}` | — | — | site detail |
| GET | `/api/v2/health` | — | — | `{ status, database }` |
| GET | `/api/v2/version` | — | — | dataset version |
| GET | `/api/v2/openapi.json` | — | — | the v2 spec |

## Documentation coverage (before → after)

| Spec | Documented before | Implemented public | Undocumented before | Documented after |
|---|---|---|---|---|
| v1 | 32 paths | 47 (+3 deliberate exclusions) | **15** | **47/47** |
| v2 | 27 paths | 29 (+1 docs index) | **2** | **29/29** |

v1 gaps closed: `/authenticity`, `/authenticity/abuse-report`,
`/authenticity/report/{id}/pdf`, `/connections/taxonomy`,
`/names/{id}/similarities`, `/names/{id}/graph`, `/policy`,
`/policy/evaluate`, `/similarities/relationships`, `/threat-feed`,
`/threat-feed/stats`, `/threat-feed/ingest`,
`/threat-feed/campaigns/{identityId}`,
`/threat-feed/cluster/{clusterId}/review`, `/transparency-report`. The spec
also gained a `bearerAuth` security scheme and `401`/`403` response
components, applied to the three key-gated routes.

v2 gaps closed: `/api/v2/similarities/relationships`,
`/api/v2/threat-feed/stream`.

## Inconsistencies found and fixed

1. **Unauthenticated tenant/governance calls returned 500.**
   `platform/api/governance-routes.js` let `rbac.UnauthorizedError` escape, so
   the wrapper's catch-all produced `500 INTERNAL_ERROR` (and the v2 router
   never set Express-style `req.params`, guaranteeing a `TypeError` before
   auth even ran — a second 500 source). Handlers now authorize through a
   shared preamble: no credentials → `401 UNAUTHORIZED`, insufficient role →
   `403 FORBIDDEN`, in the standard error envelope; the v2 router maps slug
   segments onto `req.params`.
   *Regression tests:* `GET/POST /api/v2/tenants/:tenantId/users without auth
   returns 401, not 500`, `GET /api/v2/tenants/:tenantId/audit …`,
   `POST /api/v2/tenants/:tenantId/retention/purge …` (api-v2.test.js);
   contract sweep of all six tenant routes.

2. **`GET /api/v1/names/{id}/slots` (and the v2 equivalent) always 500'd.**
   `names-service.js#getSlots` treated the async `bookings.getSlots()` as
   synchronous (`slots.map` on a Promise). Made the service method `async` and
   awaited it at both call sites.
   *Regression tests:* `GET /api/v1/names/:id/slots returns slot inventory`,
   `… returns 404 for unknown id` (api-v1.test.js), `GET
   /api/v2/names/zeus/slots returns slot inventory` (api-v2.test.js).

3. **Threat-feed endpoints bypassed the standard envelope.**
   `platform/api/threat-routes.js` (shared by the v1 serverless routes, the v2
   router, and the Express platform server) emitted raw `res.json` payloads
   without `meta.requestId/version/timestamp`, flat error objects without
   `details`/`meta`, and flat list meta. All handlers now use the shared
   `success()`/`error()` helpers; list meta keeps the legacy flat
   `total/limit/offset` keys and additionally nests them under
   `meta.pagination` (additive, backwards compatible).
   *Regression tests:* `GET /api/v1/threat-feed uses the standard envelope`,
   `GET /api/v1/threat-feed/stats uses the standard envelope`,
   `POST /api/v1/threat-feed/ingest without a key returns 401`
   (api-v1.test.js); existing `test/threat-stream.test.js` unchanged and green.

4. **`GET /api/v1/authenticity` bypassed the envelope** — returned a raw
   `res.status(200).json` payload. Now uses `success()`.
   *Regression test:* `GET /api/v1/authenticity uses the standard envelope`.

5. **Missing 405 method guards.** `GET /api/v1/transparency-report` and
   `GET /api/v1/canary` answered any HTTP method. Both now return
   `405 METHOD_NOT_ALLOWED` for non-GET, matching every other v1 route.
   *Regression tests:* `GET /api/v1/transparency-report returns envelope,
   POST is 405`, `GET /api/v1/canary returns honeypot payload, POST is 405`;
   contract wrong-method sweep across all 47 v1 paths.

6. **Governance validation errors used ad-hoc shapes** — `{ error: 'string' }`
   with no `success` flag, no machine-readable `code`, no `meta`. Converted to
   the standard envelope (`VALIDATION_ERROR` 400, `NOT_FOUND` 404,
   `CONFLICT` 409).

7. **15 v1 + 2 v2 public routes were undocumented** (see coverage table).
   Specs extended; the contract suite now fails on any future undocumented
   public route (filesystem-derived route discovery for v1, explicit
   implemented-route list for v2, both checked against the specs).

## Deliberately left as-is (with reasons)

- **`/api/v1/creatives/*` and `/api/v1/scholars/*` error shape** — these are
  separate Express sub-APIs mounted via vercel.json rewrites. Their
  `{ success: false, error: 'Not found', code: 404 }` shape is consumed by
  their own frontends (creative marketplace UI, scholars portal), and they
  run their own rate limiting (Redis-backed for Scholars) instead of the
  shared `X-RateLimit-*` pipeline. Normalizing them would break those clients
  for no API-consumer benefit. They are excluded from the OpenAPI spec and
  allowlisted in the contract test.
- **Governance success payloads** (`{ users }`, `{ id, tenantId, … }`,
  `{ success: true, userId, role }`, audit query/export/verify/purge results)
  are not wrapped in the envelope — only their *error* paths were normalized.
  These are enterprise endpoints with potential external consumers; wrapping
  success bodies would be a breaking change.
- **Canary payload** — byte-stable honeypot; only a method guard was added.
- **v2 spec depth** — `/api/v2/openapi.json` remains a path→summary map, not a
  schema-level OpenAPI document like v1's. Upgrading it is worthwhile future
  work but was out of scope for a consistency pass.
- **Version parity** — `/health`, `/search/web`, `/sites*` exist only in v2;
  v1 has `/cards*`, `/industry-patterns*`, `/connections/taxonomy`,
  `/transparency-report`, `/threat-feed*` (list/stats/campaigns/ingest/review)
  that v2 lacks. Route additions are product decisions, not consistency bugs.
- **PDF/SSE/binary routes have no JSON envelope** by nature
  (`/api/v1/authenticity/report/{id}/pdf`, `/api/v2/threat-feed/stream`,
  `/api/v2/tenants/{id}/audit/export` in non-JSON formats).

## Files changed

- `platform/api/openapi.json` — 15 new paths, `bearerAuth` scheme, 17 new
  response components (32 → 47 paths).
- `platform/api/api-v2-router.js` — `req.params` mapping for the tenants
  branch; `await` on `getSlots`; two missing spec entries.
- `platform/api/governance-routes.js` — 401/403 authorization preamble,
  envelope error shapes.
- `platform/api/threat-routes.js` — standard envelope everywhere.
- `platform/api/names-service.js` — `getSlots` made async.
- `api/v1/names/[id]/slots.js` — await the async service.
- `api/v1/authenticity/index.js` — standard envelope.
- `api/v1/transparency-report/index.js` — 405 guard.
- `api/v1/canary/index.js` — 405 guard.
- `test/openapi-contract.test.js` — new contract suite (233 checks).
- `test/api-v1.test.js`, `test/api-v2.test.js` — regression tests above.
- `test/run-all.js` — registered "OpenAPI Contract Tests".

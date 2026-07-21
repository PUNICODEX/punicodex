# Tenant Portal (Sponsor/Patron Self-Service)

Self-service portal at **`/account/`** for the people who pay for space on
flagship temples: **sponsors** (ad-slot bookings) and **patrons** (temple
patron spots). They log in with their contact email, review analytics scoped
to what they own, and request changes (creative swap / social links). Every
change goes through an approval queue in the unified admin portal — nothing
applies until a superadmin or ops admin approves it.

## Flow

```
Stripe checkout.session.completed
  (booking paid / patron paid)
        │
        ▼
api/webhook/index.js ── provisionTenantPortalAccount()
        │                 create-or-find tenant_accounts row by email
        │                 issue one-time set-password token (first use only)
        ▼
email: portal link (+ setup link on first use)      [fire-and-forget]
        │
        ▼
/account/?token=…  →  set password  →  session (30-day bearer)
        │
        ▼
Dashboard:  My Space │ My Temples │ Site-wide │ Resources │ Requests
        │
        ▼  POST /api/account/requests/  (ownership-checked, validated)
tenant_change_requests (status = pending)
        │
        ▼  /admin-portal/requests/  (superadmin / ops)
approve → change applied to the real record IN A TRANSACTION
reject  → record untouched, note stored
```

## Data model

Migration: `platform/db/migrate-tenant-portal.js` (idempotent; wired into the
`db` / `db-init` npm scripts and the cold start of `api/account/[[...slug]].js`).

| Table | Purpose |
|---|---|
| `tenant_accounts` | One row per contact email. `password_hash` NULL until set; `is_sponsor` / `is_patron` flags recomputed from linkage; `status` active/disabled. |
| `tenant_sessions` | Bearer sessions, sha256-hashed token, 30-day expiry. Revocation via `deleteSessionsForUser` (password set/reset, account disable). |
| `tenant_tokens` | One-time `set_password` / `reset` tokens (hash only, 24h expiry, `used_at`, atomic single-use consume). |
| `tenant_change_requests` | The approval queue: `account_id`, `target_kind` (booking/patron), `target_id`, `type` (`image`/`social_links`), JSON `payload`, `status` pending/approved/rejected, `reviewer_note`, `reviewed_by`, `reviewed_at`. |

**Linkage is by email match** — the existing schemas already carry the
contact email (`bookings.email`, `patrons.email`), so no columns were added
to those tables. `linkTenantAccount(email)` in
`platform/api/tenant-portal.js` is the single ownership source of truth; an
email may hold both kinds of resource (one account row, both flags).

## Endpoints

Tenant API (`api/account/[[...slug]].js`, reached via `vercel.json` rewrites):

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/account/auth/set-password/` | one-time token | Sets bcrypt hash, consumes token atomically, revokes old sessions, returns a session. Accepts `reset` tokens too. |
| `POST /api/account/auth/login/` | — | Rate-limited (`public-strict`); generic `Invalid email or password` for unknown email / unset password / wrong password. Disabled accounts → 403 only after credentials verify. |
| `POST /api/account/auth/logout/` | session | Destroys the bearer session. |
| `POST /api/account/auth/forgot/` | — | Rate-limited; always returns the same success message (no account-existence leak). Emails a reset link when an active account exists. |
| `GET /api/account/me/` | session | Profile + owned bookings/patron spots. |
| `GET /api/account/analytics/space/` | session | Per owned slot: impressions, clicks, CTR, 30-day daily series from `analytics_events` (bots excluded). Patron spots report zeros with `tracking: 'none'` — never fabricated. |
| `GET /api/account/analytics/temple/:id/` | session | Aggregate page stats (site_analytics rollups) for a temple the account owns a resource on; 403 otherwise, 400 on invalid id. |
| `GET /api/account/analytics/site/` | session | Site-wide public-level aggregates: traffic totals/series/devices + lexicon counts. Nothing per-user. |
| `GET /api/account/requests/` | session | Own change requests with statuses. |
| `POST /api/account/requests/` | session | Create a change request (201). Validates ownership (403), target status, payload. |

Session auth is `Authorization: Bearer <token>` (or `x-session-token`).

Admin API (unified admin portal, `requirePortal` from
`platform/api/admin-portal-auth.js`, **ops permission = superadmin/ops**;
viewer/leasing/scholars → 403):

| Endpoint | Notes |
|---|---|
| `GET /api/admin/portal/tenant-requests/` | Queue list (`?status=pending|approved|rejected&limit=&offset=`), includes account email + target context. |
| `POST /api/admin/portal/tenant-requests/:id/approve/` | Applies the change (below) and marks reviewed. 409 on double review. |
| `POST /api/admin/portal/tenant-requests/:id/reject/` | Marks rejected with optional note; target untouched. |

Frontend queue page: `/admin-portal/requests/` (canonical source
`platform/public/admin-portal/requests/index.html`; root copy is generated
by `scripts/sync-admin-portal.js`).

## How approval applies changes

Inside `reviewChangeRequest()` (`platform/api/tenant-portal.js`):

- **image** (target = booking): the new creative was staged at request time
  under `platform/api/public/uploads/tenant-requests/<account>/…` (same
  base64 → dimension-check → `/uploads/…` convention as
  `platform/api/booking-upload.js`). Approval re-verifies the booking still
  belongs to the account, then in one transaction updates
  `bookings.creative_path` + `creative_original_name` and marks the request
  approved. Booking status is untouched (a `live` booking stays live — the
  admin approval **is** the approval).
- **social_links** (target = patron): payload validated against the same
  platform/URL patterns as patron checkout; approval updates
  `patrons.social_platform` / `social_url`. Both fields may be null (a
  link-removal request).
- Both review paths write to the `admin_actions` audit trail
  (`portal.tenant-request.approve|reject`).

## Email behavior

`platform/api/email.js` (Resend; without `RESEND_API_KEY` it logs to console
and reports success):

- `notifyTenantAccountProvisioned({ email, kind, setPasswordUrl })` — sent by
  the webhook provisioning hook. Carries the one-time setup link
  (`/account/?token=…`, 24h) when the account has no password yet, otherwise
  just the portal sign-in link.
- `notifyTenantPasswordReset({ email, token })` — sent by the forgot flow.

Provisioning/email failures never fail the Stripe webhook (wrapped,
fire-and-forget).

## Ops runbook

Nothing automated beyond the above. Routine operation:

1. Watch `/admin-portal/requests/` for pending requests (no notification
   email is sent to admins in v1 — check the queue).
2. Approve → the change applies immediately and is audit-logged.
3. Reject → add a reviewer note; the tenant sees it in their request history.

Known limitations:

- SQLite on Vercel is ephemeral (`/tmp`); durable production persistence
  needs an external DB (same limitation as patrons/bookings).
- Staged creative files under `platform/api/public/uploads/tenant-requests/`
  follow the same storage model as the existing booking-upload flow (local
  platform server; see `booking-upload.js`).
- The polling fallback `booking-service.checkBookingPayment` activates
  bookings outside the webhook; provisioning happens on the webhook path
  only. Accounts are also create-or-find, so a later webhook or a manual
  `provisionTenantAccount(email, { kind })` call covers any gap.

## Tests

`test/tenant-portal.test.js` (registered in `test/run-all.js`, 60s timeout):
provisioning on activation, token single-use/expiry, login/logout/revocation,
ownership scoping (403s), analytics exactness, change-request lifecycle
(approve applies / reject preserves), admin role gating, validation errors.

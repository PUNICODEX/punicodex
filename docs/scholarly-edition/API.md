# PÚNYCODEX Scholarly Edition — API Reference

Base URL: `/api/v1/scholars`

## Authentication

All authenticated endpoints expect a session token, sent either as the
`x-scholars-session` header or the `scholars_session` cookie.

Obtain a session with email + password:

```bash
POST /api/v1/scholars/auth/login
{ "email": "user@university.edu", "password": "..." }
```

Response: `{ "success": true, "data": { "token", "user", "requirePasswordChange" } }`.
`requirePasswordChange` is `true` when an institution admin signs in with
their provisioned initial password — the client must route them through
`POST /auth/password` before continuing.

Password rules: minimum 10 characters, at least one uppercase letter and one
digit. Changing or resetting a password revokes all other sessions for the
account immediately. Disabling an account revokes its sessions at once; a
non-active account is rejected (403 `account_inactive`) on its next request
regardless of session expiry.

Magic-link authentication is **removed**. Institution admins provision
student credentials; curators provision institution admins (see Sponsorship
applications and Institution endpoints).

## Rate limiting & security headers

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. Exceeding a limit returns 429 with `retryAfter`.
Limiters are Redis-backed when `REDIS_URL` is configured (global across
serverless invocations, key prefix `punycodex:rl:scholars:{tier}:...`),
falling back to per-process memory otherwise. Tiers: `public` 120/min,
`auth` 60/min, `strict` 10/min, `login` 10/15min.

Baseline security headers (CSP, nosniff, DENY frame, referrer policy) are set
on every response.

## Endpoints

### Health
- `GET /health` — Service status (public).

### Auth
- `POST /auth/login` — Password login.
- `GET /auth/session` — Current session user (public; `data.user` is `null` when signed out).
- `POST /auth/logout` — Destroy the current session.
- `POST /auth/password` — Change own password (`currentPassword`, `newPassword`). Revokes other sessions.
- `POST /auth/password/reset` — Institution admin resets a managed user's password; returns a one-time `tempPassword` and revokes the target's sessions.

### Temples & Sections
- `GET /temples` — List flagship temples (`?pantheon=`).
- `GET /temples/:id` — Temple metadata and sections.
- `GET /temples/:id/manifest` — Canonical blank manifest.
- `GET /sections/:id` — Section content.
- `GET /temples/:id/sections/:key` — Section by temple and key.
- `GET /sections/:id/history` — Revision history.

### Edits
- `POST /temples/:id/sections/:key/edits` — Submit an edit (student; active sponsorship + department allowlist enforced). Quality-gate scored; 422 below the minimum.
- `GET /edits/mine` — The signed-in user's own submissions, newest first, with section/temple context (`?limit=&offset=`).
- `GET /edits/pending` — Reviewer queue (reviewer+; scoped to the reviewer's institution unless curator).
- `GET /edits/:id` — Edit detail.
- `POST /edits/:id/withdraw` — Author withdraws their own `pending`/`needs_revision` edit.

### Reviews
- `POST /edits/:id/approve` — Approve (reviewer+; cannot review own institution unless curator). Publishes the section and records history.
- `POST /edits/:id/reject` — Reject or request revision (`status: "rejected" | "needs_revision"`).

### Search
- `GET /search?q=...&pantheon=...&limit=...&offset=...` — Search published sections (public).

### Media
- `POST /media` — Upload media (student; JSON base64 or multipart).
- `GET /media?status=pending|approved|rejected` — Media review list (reviewer+).
- `POST /media/:id/approve` / `POST /media/:id/reject` — Media decisions (reviewer+).

### Notifications
- `GET /notifications` — Current user's notifications.
- `POST /notifications/:id/read` / `POST /notifications/:id/dismiss`.

### Institution (institution admin)
- `GET /institution` — Dashboard: stats + member list.
- `GET /institution/analytics?days=30&limit=10` — Institution-scoped edits/approvals by day and top temples.
- `GET /institution/students` / `POST /institution/students` — List / provision students (server-generated or caller-supplied password, strength-validated; temp password shown once).
- `PATCH /institution/students/:id` — Update profile/department/status. Disabling revokes sessions immediately.
- `DELETE /institution/students/:id` — Disable a student account (sessions revoked immediately).
- `POST /institution/students/:id/reset-password` — Reset to a one-time temp password (sessions revoked).
- `GET /institution/reviewers` / `POST /institution/reviewers` — Manage reviewers.

### Analytics (curator)
- `POST /analytics/view` — Record a temple view (public).
- `GET /analytics?days=30&limit=10` — Global edits/approvals/views by day, top institutions and temples.

### Admin (curator)
- `GET /stats` — Totals across temples, sections, edits, users, institutions.
- `GET /users?role=&institutionId=&accountStatus=&q=` — List users.
- `PATCH /users/:id/role` — Change role.
- `PATCH /users/:id/status` — Change account status; non-active revokes sessions immediately.
- `GET /institutions` / `POST /institutions` — List / create institution with admin (temp password shown once).
- `PATCH /institutions/:id/sponsorship` — Update `sponsorshipStatus` (`active|pending|expired`) and `sponsorshipExpiresAt` (`null` clears). Read-time enforcement: an active sponsorship past its expiry is treated as lapsed immediately; a daily cron (`/api/cron/sponsorship-expiry`) flips the stored status.
- `PATCH /institutions/:id/allowlist` — Department allowlist.
- `POST /temples/:id/freeze` — Freeze/unfreeze a temple against new edits.

### Sponsorship applications
- `POST /sponsorship/apply` — Public self-serve application (`institutionName`, `domain`, `contactName`, `contactEmail`, optional `departmentFocus`, `message`). Strict rate limit; hidden `website` honeypot silently discards bot submissions.
- `GET /sponsorship/applications?status=` — Curator queue with `pendingCount`.
- `POST /sponsorship/applications/:id/approve` — Creates the institution (sponsorship active) plus its admin account; returns the one-time temp admin password for out-of-band delivery.
- `POST /sponsorship/applications/:id/reject` — Reject with an optional review comment.

## Response Format

All responses use:

```json
{
  "success": true,
  "data": { ... }
}
```

Errors:

```json
{
  "success": false,
  "error": "..."
}
```

# PÚNYCODEX Scholarly Edition — API Reference

Base URL: `/api/v1/scholars`

## Authentication

All write endpoints require a session. Obtain one via magic link:

```bash
POST /api/v1/scholars/auth/magic-link
{ "email": "user@university.edu" }
```

Then verify the token:

```bash
GET /api/v1/scholars/auth/verify?token=...
```

Send the returned session ID as `x-scholars-session` header on subsequent requests.

## Endpoints

### Health
`GET /health` — Service status.

### Temples
- `GET /temples` — List all 123 flagships.
- `GET /temples/:id` — Temple metadata and sections.
- `GET /temples/:id/manifest` — Canonical blank manifest.

### Sections
- `GET /sections/:id` — Section content.
- `GET /temples/:id/sections/:key` — Section by temple and key.
- `GET /sections/:id/history` — Revision history.

### Edits
- `POST /temples/:id/sections/:key/edits` — Submit an edit.
- `GET /edits/pending` — Reviewer queue.
- `GET /edits/:id` — Edit detail.

### Reviews
- `POST /edits/:id/approve` — Approve an edit.
- `POST /edits/:id/reject` — Reject an edit.

### Search
- `GET /search?q=...&pantheon=...&limit=...&offset=...` — Search sections.

### Institution
- `GET /institution` — Institution dashboard data.

### Admin
- `GET /stats` — Curator stats.
- `GET /users` — List users.
- `GET /institutions` — List institutions.
- `POST /temples/:id/freeze` — Freeze/unfreeze temple.

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

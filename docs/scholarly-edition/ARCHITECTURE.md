# PuniCodex Scholarly Edition — Reference Architecture

> Version 1.0.0 — Additive scholarly layer for 123 flagship temples.

---

## 1. Overview

The Scholarly Edition is a separate layer that sits alongside existing PuniCodex temples. It adds editable, attributable scholarly content without modifying canonical sources or the existing temple generation pipeline.

```
┌─────────────────────────────────────────────────────────────┐
│                     Static Temple Pages                      │
│  /sites/{id}/          /sites/{id}/lore/   /sites/{id}/gallery/ │
│         │                       │                       │     │
│         └───────────────────────┼───────────────────────┘     │
│                                 ▼                             │
│              /sites/{id}/scholars/  ← blank, then hydrated    │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  PuniCodex Scholars Service                  │
│  Auth · Edits · Reviews · History · Attribution · Search     │
│         Neon PostgreSQL  ·  Redis  ·  Vercel Serverless       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Principles

1. **Canonical sources remain king.** The Scholarly Edition may not mutate `type/js/lexicon.js`, `type/js/original-scripts.js`, or `scripts/lore-catalog.json` directly.
2. **Structure-first.** Blank pages are generated first; content is added through the workflow.
3. **Static-first rendering.** Public pages are rendered to static HTML snapshots that can be served from the CDN.
4. **University-scoped auth.** Users belong to institutions; permissions flow from that relationship.
5. **Immutable history.** Every approved edit becomes a permanent, attributable record.
6. **Non-destructive.** Existing pages, tests, and flywheel validators are untouched.

---

## 3. Components

### 3.1 Static Temple Layer
- Existing `sites/{id}/index.html`, `lore/index.html`, `gallery/index.html`.
- New `sites/{id}/scholars/index.html` generated from `templates/flagship/scholars/index.html`.
- Tab navigation connects all four pages.

### 3.2 Scholars Service
- Runtime: Vercel serverless functions or `platform/server.js` in local dev.
- Framework: Express.js (already used in `platform/`).
- Base path: `/api/v1/scholars/`.

### 3.3 Database
- Primary: Neon PostgreSQL (serverless, already a dependency).
- Cache/Sessions: Redis via `ioredis` (optional; falls back to in-memory).
- Schema: `platform/db/scholars/schema.sql`.

### 3.4 File Storage
- Media uploads: S3-compatible object storage (R2/S3) with local fallback.
- Static snapshots: committed to `sites/{id}/scholars/index.html` via `npm run generate`.

### 3.5 Taxonomy Engine
- Already built: `platform/scholars/taxonomy.js`.
- Drives section validation, blank manifest generation, and rendering.

---

## 4. Data Model

### 4.1 Institutions
- `id`, `name`, `domain`, `accreditation`, `status`, `metadata`, `created_at`.

### 4.2 Users
- `id`, `email`, `institution_id`, `role`, `orcid`, `created_at`, `last_seen`.
- Roles: `student`, `reviewer`, `dept_admin`, `inst_admin`, `curator`.

### 4.3 Temples
- `entry_id` (matches archetype id), `pantheon`, `tier`, `manifest_version`, `snapshot_version`, `is_frozen`.

### 4.4 Sections
- `id`, `temple_id`, `key`, `label`, `body`, `sources` (JSON), `media` (JSON), `status`, `version`, `updated_at`.

### 4.5 Edits
- `id`, `section_id`, `user_id`, `proposed_body`, `proposed_sources`, `proposed_media`, `status`, `comment`, `created_at`.

### 4.6 Reviews
- `id`, `edit_id`, `reviewer_id`, `decision`, `comment`, `reviewed_at`.

### 4.7 History
- `id`, `section_id`, `edit_id`, `body`, `sources`, `media`, `attribution` (JSON), `applied_at`.

### 4.8 Snapshots
- `id`, `temple_id`, `version`, `html_path`, `json_path`, `generated_at`.

---

## 5. API Surface

All routes under `/api/v1/scholars/`:

- `GET /health` — service health.
- `GET /temples` — list flagships.
- `GET /temples/:id` — temple metadata and sections.
- `GET /temples/:id/manifest` — canonical blank/full manifest.
- `GET /sections/:id` — section content.
- `POST /temples/:id/sections/:key/edits` — submit an edit.
- `GET /edits/pending` — reviewer queue.
- `POST /edits/:id/approve` — approve edit.
- `POST /edits/:id/reject` — reject edit.
- `GET /sections/:id/history` — version history.
- `GET /search?q=...` — search Scholarly Edition content.
- `POST /auth/magic-link` — request login link.
- `POST /auth/verify` — verify login link.
- `POST /auth/logout` — end session.

---

## 6. Authentication

Phase 1: email magic links.
Phase 2: university SSO via OAuth2/SAML.

- Sessions stored in Redis with secure, HTTP-only cookies.
- Email domain allowlist auto-assigns institution.
- Manual approval queue for institutions not on the allowlist.
- Curators can bypass institution restrictions.

---

## 7. Authorization Matrix

| Action | Anonymous | Student | Reviewer | Dept Admin | Inst Admin | Curator |
|---|---|---|---|---|---|---|
| Read published content | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Submit edit | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Review edits | ✘ | ✘ | ✔ | ✔ | ✔ | ✔ |
| Manage institution | ✘ | ✘ | ✘ | partial | ✔ | ✔ |
| Freeze temple / revert section | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |

---

## 8. Rendering Pipeline

1. Editor submits markdown-like scholarly body.
2. Server sanitizes with DOMPurify and renders to HTML.
3. Citations are validated and formatted.
4. Approved content is written to the `sections` table.
5. Snapshot generator reads sections and produces static HTML.
6. `npm run generate` writes `sites/{id}/scholars/index.html`.
7. CDN serves the static page; dynamic API hydrates edit controls for logged-in users.

---

## 9. Caching Strategy

- Static snapshots: long-cache on CDN.
- API responses: stale-while-revalidate, 60s for content, 5s for queues.
- Sessions: Redis, TTL 7 days.
- Rendered section HTML: Redis, invalidated on approval.

---

## 10. Security

- Input validation via Zod schemas.
- Output sanitization via DOMPurify.
- Rate limiting per endpoint and user.
- CSRF tokens for forms.
- SQL injection prevention via parameterized queries.
- XSS prevention via strict Content-Security-Policy.
- Abuse detection: spam scoring, rapid-edit throttling, account bans.

---

## 11. Observability

- Structured JSON logs for every request.
- Audit log for authz, edits, reviews, curator actions.
- Metrics: edits/day, approval time, top institutions, queue depth.
- Health endpoints for database, Redis, and storage.

---

## 12. Deployment

- Local dev: `npm run platform` or `vercel dev`.
- Database: `npm run db` includes Scholars migrations.
- Production: Vercel serverless + Neon + Redis.
- Static snapshots regenerated by `npm run generate` and committed.

---

## 13. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20+ | Already required by project |
| Web framework | Express | Already used in `platform/` |
| Database | Neon PostgreSQL | Already a dependency |
| Cache | Redis / ioredis | Already a dependency |
| Auth | Magic links + OAuth2/SAML | Progressive enhancement |
| Validation | Zod | Lightweight, TypeScript-friendly |
| Sanitization | DOMPurify | Battle-tested |
| Object storage | S3/R2 | Media uploads and snapshots |
| Search | PostgreSQL full-text + custom index | Avoids new dependency |

---

## 14. Integration with Existing PuniCodex

- No changes to `type/js/lexicon.js` canonical source.
- No changes to `js/archetypes-v2.js` except through existing governance.
- No changes to `middleware.js` routing.
- New generated artifacts: `sites/{id}/scholars/index.html` and `platform/scholars/manifests/{id}.json`.
- CI already validates generated artifacts; Scholars artifacts will be included.

---

## 15. Future Evolution

- Real-time collaborative editing.
- Multi-language scholarly content.
- Advanced media (3D models, maps, timelines).
- Machine-assisted citation verification.
- Reputation and quality scoring for contributors.

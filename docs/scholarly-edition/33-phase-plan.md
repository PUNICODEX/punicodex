# PÚNYCODEX Scholarly Edition — 33-Phase Master Plan

> Structure-first. Content-blank. University-credited. Additive to existing temples.
> Scope: 123 flagship temples. Audience: students, faculty, researchers, institutions.

---

## Phase 1 — Archaeology of the 123 Flagships ✅

**Objective:** Empirically discover what scholarly content already exists and what structure every flagship shares.

1.1. Inventory all 123 flagship IDs, names, pantheons, and tiers.  
1.2. Parse `scripts/lore-catalog.json` for existing scholarly sections.  
1.3. Parse rendered `sites/{id}/lore/index.html` for exposed sections.  
1.4. Parse rendered `sites/{id}/index.html` for home-page sections.  
1.5. Parse rendered `sites/{id}/gallery/index.html` for gallery structures.  
1.6. Catalog original-script provenance coverage gaps.  
1.7. Build the flagship section frequency matrix.  
1.8. Identify universal vs. pantheon-specific vs. optional content patterns.  
1.9. Produce the first scholarly section taxonomy draft.  
1.10. Validate taxonomy against existing page structures for consistency.  
1.11. Document archaeological findings and anomalies.  
1.12. Define deprecation rules for legacy section names.  
1.13. Publish `phase1-report.md`, `flagship-section-matrix.json`, and `scholarly-section-taxonomy-v0.1.json`.

**Deliverables:** `docs/scholarly-edition/phase1-report.md`, `flagship-section-matrix.json`, `scholarly-section-taxonomy-v0.1.json`.

---

## Phase 2 — Governance Charter

**Objective:** Define the legal, editorial, and institutional rules before any backend code is written.

2.1. Draft the Scholarly Edition editorial mission statement.  
2.2. Define university eligibility criteria (accreditation, department, advisor).  
3.3. Define student editor roles: contributor, reviewer, department admin, institution admin.  
2.4. Define PUNYCODEX curator role and veto/override powers.  
2.5. Establish content license: student submission grants PUNYCODEX a CC BY-compatible perpetual license.  
2.6. Define attribution model: per-section credit, co-author lists, institutional badges.  
2.7. Establish dispute resolution workflow for contested edits.  
2.8. Define acceptable sources hierarchy (peer-reviewed > museum > primary text > tertiary).  
2.9. Define prohibited content: original research, unsourced claims, religious advocacy, AI-generated false citations.  
2.10. Create the Scholarly Edition Code of Conduct.  
2.11. Draft the University Partnership Agreement template.  
2.12. Define data retention, export, and deletion rights for institutions.  
2.13. Publish `GOVERNANCE.md` and require sign-off before production data.

**Deliverables:** `docs/scholarly-edition/GOVERNANCE.md`, `docs/scholarly-edition/university-partnership-template.md`.

---

## Phase 3 — Reference Architecture

**Objective:** Produce the canonical technical blueprint that every subsequent phase obeys.

3.1. Define the layered architecture: static temples, Scholars API, editing service, review service, history service.  
3.2. Choose runtime model: Vercel serverless + Neon PostgreSQL + Redis for sessions/rate limits.  
3.3. Define the data-authority boundary: canonical sources remain king; Scholarly Edition is a curated overlay.  
3.4. Design the manifest-per-temple model (`platform/scholars/manifests/{id}.json`).  
3.5. Design the section schema: body, sources, media, editor notes, status, attribution, history refs.  
3.6. Define the API contract: REST + JSON, versioned under `/api/v1/scholars/`.  
3.7. Design the authentication flow: university SSO via SAML/OAuth2 + magic-link fallback.  
8.8. Define the authorization matrix (RBAC) for roles vs. actions.  
3.9. Design the static-site integration: blank pages now, hydration later.  
3.10. Define caching strategy: CDN for rendered pages, SWR for API, immutable history.  
3.11. Design the webhook/event bus for edits, approvals, and notifications.  
3.12. Establish observability: structured logging, metrics, audit log.  
3.13. Publish `ARCHITECTURE.md` and a system diagram.

**Deliverables:** `docs/scholarly-edition/ARCHITECTURE.md`, `docs/scholarly-edition/system-diagram.md`.

---

## Phase 4 — Scholarly Section Taxonomy Engine ✅

**Objective:** Codify the section taxonomy in code so it can drive generation and validation.

4.1. Load `scholarly-section-taxonomy-v0.1.json` as canonical configuration.  
4.2. Implement `loadTaxonomy()` with caching.  
4.3. Implement archetype resolution from `js/archetypes-v2.js`.  
4.4. Implement universal section retrieval.  
4.5. Implement pantheon-kit section retrieval.  
4.6. Implement common and optional section registries.  
4.7. Implement section key validation and deprecation checks.  
4.8. Implement `generateBlankSection()` for any valid key.  
4.9. Implement `generateBlankManifest()` per flagship.  
4.10. Implement `validateManifest()` with human-readable errors.  
4.11. Write unit tests covering all pantheon kits and edge cases.  
4.12. Integrate taxonomy engine into `npm test`.  
4.13. Ensure taxonomy version is stamped into every generated manifest.

**Deliverables:** `platform/scholars/taxonomy.js`, `platform/scholars/taxonomy.test.js`.

---

## Phase 5 — Data Model & Schema Design

**Objective:** Design the database schema for institutions, users, edits, approvals, history, and rendered snapshots.

5.1. Design the `institutions` table: id, name, domain, accreditation, status, metadata.  
5.2. Design the `users` table: id, email, institution_id, role, created_at, last_seen.  
5.3. Design the `sessions` table: token, user_id, expires_at, device fingerprint.  
5.4. Design the `temples` table: entry_id, pantheon, tier, manifest_version, snapshot_version.  
5.5. Design the `sections` table: id, temple_id, key, label, current_body, current_sources, current_media.  
5.6. Design the `edits` table: id, section_id, user_id, proposed_body, proposed_sources, status, created_at.  
5.7. Design the `reviews` table: id, edit_id, reviewer_id, decision, comment, reviewed_at.  
5.8. Design the `history` table: id, section_id, edit_id, rendered_version, diff, attribution, applied_at.  
5.9. Design the `snapshots` table: id, temple_id, version, html_path, json_path, generated_at.  
5.10. Design indexes for common queries: by temple, by user, by status, by institution.  
5.11. Define foreign-key constraints and cascade behavior.  
5.12. Write schema migrations using `node-pg-migrate` or equivalent.  
5.13. Publish `schema.sql` and migration files.

**Deliverables:** `platform/db/scholars/schema.sql`, `platform/db/scholars/migrations/`.

---

## Phase 6 — Database Layer & Connection Pool

**Objective:** Build the production-grade database access layer.

6.1. Configure Neon PostgreSQL connection with SSL and environment variables.  
6.2. Implement a connection pool using `pg` or `postgres.js`.  
6.3. Build a query builder/helper layer for common CRUD operations.  
6.4. Implement transaction wrapper for multi-step edit/approval workflows.  
6.5. Add query timing metrics and slow-query logging.  
6.6. Implement database health-check endpoint.  
6.7. Seed the `temples` table from existing 123 flagship manifests.  
6.8. Seed the `sections` table from blank manifests.  
6.9. Add rollback scripts for local/dev reset.  
6.10. Write integration tests for the DB layer.  
6.11. Document local setup with Docker Compose option.  
6.12. Add connection retry and graceful shutdown logic.  
6.13. Validate schema against the taxonomy engine.

**Deliverables:** `platform/db/scholars/index.js`, `platform/db/scholars/migrations/`, `platform/db/scholars/seed.js`.

---

## Phase 7 — University Identity & Authentication

**Objective:** Let verified students and faculty log in through their institutions.

7.1. Implement email-based magic link authentication as MVP.  
7.2. Implement OAuth2/SAML integration for major university IdPs.  
7.3. Build the `institutions` registration and verification flow.  
7.4. Implement email domain allowlist for auto-institution assignment.  
7.5. Implement manual institution approval queue for non-allowlist domains.  
7.6. Build session management with secure HTTP-only cookies.  
7.7. Add CSRF protection for state-changing requests.  
7.8. Implement rate limiting on auth endpoints.  
7.9. Add login/logout audit events.  
7.10. Build the `/api/v1/scholars/auth/*` endpoints.  
7.11. Create the login UI at `/scholars/login`.  
7.12. Write auth integration tests.  
7.13. Document the auth flow for university IT departments.

**Deliverables:** `api/scholars/auth.js`, `platform/scholars/auth.js`, `scholars/login/index.html`.

---

## Phase 8 — Editor Personas & Authorization

**Objective:** Enforce who can do what, where, and under whose supervision.

8.1. Define the full RBAC matrix: anonymous, student, reviewer, dept_admin, inst_admin, curator.  
8.2. Implement permission middleware for API routes.  
8.3. Build institution-scoped permissions (students can only act for their institution).  
8.4. Implement department-level scoping (Classics, Religious Studies, etc.).  
8.5. Add per-temple moderation locks (curator can freeze a temple).  
8.6. Implement per-section edit locks to prevent concurrent edit collisions.  
8.7. Build the `requireRole()` and `requireInstitution()` helpers.  
8.8. Add audit logging for every permission check failure.  
8.9. Implement impersonation/sudo mode for curators with full audit trail.  
8.10. Build the institution membership invite flow.  
8.11. Create the role-management UI for institution admins.  
8.12. Write authorization tests.  
8.13. Document the RBAC model.

**Deliverables:** `platform/scholars/authz.js`, `platform/scholars/authz.test.js`, `platform/public/scholars/admin/roles.html`.

---

## Phase 9 — Blank Scholars Page Generation ✅

**Objective:** Generate a static, blank Scholarly Edition page for every flagship.

9.1. Create the `templates/flagship/scholars/index.html` template.  
9.2. Build `scripts/generate-scholars.js` to emit one page per flagship.  
9.3. Build `scripts/generate-scholars-manifests.js` to emit per-temple manifests.  
9.4. Integrate Scholars generation into `scripts/generate.js`.  
9.5. Ensure each page links to Home, Lore, Gallery, and Scholars tabs.  
9.6. Ensure each page has correct meta, OG, Twitter, and canonical tags.  
9.7. Ensure each page has Schema.org JSON-LD.  
9.8. Ensure each page displays the correct Unicode name and tier badge.  
9.9. Generate blank section skeletons from the taxonomy engine.  
9.10. Add a clear "blank canvas" call-to-action for students.  
9.11. Verify all 123 pages are generated.  
9.12. Add a CI check that Scholars pages stay in sync.  
9.13. Run the full test suite after generation.

**Deliverables:** `templates/flagship/scholars/index.html`, `scripts/generate-scholars.js`, `scripts/generate-scholars-manifests.js`, `sites/{id}/scholars/index.html`.

---

## Phase 10 — Temple Tab Integration ✅

**Objective:** Add the Scholars tab to all existing flagship pages without breaking them.

10.1. Update `templates/flagship/index.html` to include a Scholars tab.  
10.2. Update `templates/flagship/lore/index.html` to include a Scholars tab.  
10.3. Update `templates/flagship/gallery/index.html` to include a Scholars tab.  
10.4. Build `scripts/migrate-scholars-tab.js` to patch existing 369 rendered pages.  
10.5. Ensure tab styling matches the existing design system.  
10.6. Ensure tabs are accessible (ARIA roles, keyboard navigation).  
10.7. Add active-state highlighting for the Scholars tab.  
10.8. Verify every flagship has a working Scholars tab link.  
10.9. Test on mobile viewport sizes.  
10.10. Regenerate all affected pages via `npm run generate`.  
10.11. Run link checker on all Scholars tab URLs.  
10.12. Run SEO validator on Scholars pages.  
10.13. Commit generated artifacts.

**Deliverables:** Updated templates, `scripts/migrate-scholars-tab.js`, 369 migrated pages.

---

## Phase 11 — Scholars API Foundation

**Objective:** Build the REST API surface that powers the Scholarly Edition.

11.1. Define the OpenAPI spec for `/api/v1/scholars/*`.  
11.2. Implement health and version endpoints.  
11.3. Implement `GET /temples` listing.  
11.4. Implement `GET /temples/:id` with section metadata.  
11.5. Implement `GET /temples/:id/manifest` returning the canonical manifest.  
11.6. Implement `GET /sections/:id` for a single section.  
11.7. Implement `GET /temples/:id/sections` for all sections.  
11.8. Add consistent error response formatting.  
9.9. Add request validation using Zod or JSON Schema.  
11.10. Add API rate limiting per user tier.  
11.11. Add CORS configuration for the website origin.  
11.12. Write API contract tests.  
11.13. Publish Swagger UI at `/api/v1/scholars/docs`.

**Deliverables:** `api/scholars/index.js`, `api/scholars/openapi.json`, Swagger UI.

---

## Phase 12 — Edit Submission API

**Objective:** Allow authenticated users to propose edits to any section.

12.1. Design the edit payload: body, sources, media, editorNotes.  
12.2. Implement `POST /temples/:id/sections/:key/edits`.  
12.3. Validate section key against taxonomy engine.  
12.4. Validate payload length, source format, and media references.  
12.5. Detect and reject empty or no-op edits.  
12.6. Implement optimistic locking via section version.  
12.7. Notify section watchers and institution reviewers.  
12.8. Store the edit in `edits` table with `pending` status.  
12.9. Create a history preview record without applying it.  
12.10. Return the edit ID and review URL.  
12.11. Write edit-submission tests.  
12.12. Build the frontend edit form in the Scholars page.  
12.13. Add autosave drafts to `localStorage`.

**Deliverables:** `api/scholars/edits.js`, frontend edit form, edit tests.

---

## Phase 13 — Approval Workflow Engine

**Objective:** Ensure every edit is reviewed before it becomes public.

13.1. Define review states: pending, approved, rejected, needs_revision, withdrawn.  
13.2. Implement `GET /edits/pending` for reviewers.  
13.3. Implement `POST /edits/:id/approve` and `POST /edits/:id/reject`.  
13.4. Prevent authors from approving their own edits.  
13.5. Require at least one reviewer from the same institution or a curator.  
13.6. Implement review comments and threaded discussion.  
13.7. Apply approved edits to the `sections` table atomically.  
13.8. Generate a new history record on approval.  
13.9. Notify the author and watchers of the decision.  
13.10. Implement escalation for edits stuck in review beyond a threshold.  
13.11. Build the reviewer dashboard UI.  
13.12. Write approval workflow tests.  
13.13. Document the review policy.

**Deliverables:** `api/scholars/reviews.js`, reviewer dashboard, review tests.

---

## Phase 14 — Version Control & Diff Engine

**Objective:** Make every change visible, attributable, and reversible.

14.1. Design the history record format with full content snapshots.  
14.2. Implement `GET /sections/:id/history` returning chronological changes.  
14.3. Implement unified diff generation between any two history records.  
14.4. Implement HTML diff rendering for human review.  
14.5. Add support for reverting a section to any previous version (curator only).  
14.6. Implement branching: multiple pending edits against the same section.  
14.7. Detect and flag merge conflicts between concurrent edits.  
14.8. Store diff artifacts immutably (S3 or similar).  
14.9. Build the history timeline UI.  
14.10. Add "compare with previous" links in the Scholars page.  
14.11. Write diff engine tests.  
14.12. Ensure GDPR-compliant deletion does not corrupt history chains.  
14.13. Document the version-control model.

**Deliverables:** `platform/scholars/history.js`, history timeline UI, diff tests.

---

## Phase 15 — Attribution Engine

**Objective:** Credit universities, departments, and individual contributors accurately.

15.1. Design the attribution record: user, institution, department, edit_id, section.  
15.2. Implement per-section attribution display.  
15.3. Implement per-temple attribution rollup.  
15.4. Add institutional badges and links.  
15.5. Add ORCID integration for researchers.  
15.6. Implement co-author ordering logic.  
15.7. Add a "Contributors" section to every Scholars page.  
15.8. Generate attribution exports for institutions.  
15.9. Handle attribution disputes through the governance workflow.  
15.10. Add attribution to Schema.org JSON-LD.  
15.11. Build the attribution admin UI.  
15.12. Write attribution tests.  
15.13. Document attribution policy.

**Deliverables:** `platform/scholars/attribution.js`, contributors UI, attribution tests.

---

## Phase 16 — Content Rendering Pipeline

**Objective:** Render Scholarly Edition content safely and beautifully into static pages.

16.1. Define the markdown subset allowed in scholarly bodies.  
16.2. Implement a strict sanitizer (DOMPurify server-side).  
16.3. Render citations, footnotes, and bibliographic entries.  
16.4. Render media placeholders with provenance captions.  
16.5. Build the section renderer for universal sections.  
16.6. Build the section renderer for pantheon-kit sections.  
16.7. Generate static HTML snapshots from the database.  
16.8. Integrate snapshot generation into `npm run generate`.  
16.9. Ensure rendered pages are SEO-friendly and cacheable.  
16.10. Add fallback to blank state when no content exists.  
16.11. Render edit buttons only for authenticated users.  
16.12. Write rendering tests.  
16.13. Document the rendering pipeline.

**Deliverables:** `platform/scholars/render.js`, rendering tests, snapshot generator.

---

## Phase 17 — Scholarly Markup & Citations

**Objective:** Support rigorous, machine-readable citations.

17.1. Define citation schema: author, title, year, publisher, URL, DOI.  
17.2. Implement inline citation syntax (e.g., `[Smith 2023]`).  
17.3. Build a bibliography aggregator per section.  
17.4. Validate DOI format and fetch metadata where possible.  
17.5. Support Chicago, MLA, and APA export formats.  
17.6. Add structured data for citations (Schema.org/ScholarlyArticle).  
17.7. Warn users about missing or malformed citations.  
17.8. Build the citation picker UI.  
17.9. Integrate with the source catalog (`type/js/source-catalog.js`).  
17.10. Support primary-source citations (text, line, tablet, verse).  
17.11. Write citation tests.  
17.12. Document citation guidelines.  
17.13. Add citation linting to the approval workflow.

**Deliverables:** `platform/scholars/citations.js`, citation UI, citation tests.

---

## Phase 18 — Media & Provenance Attachments

**Objective:** Let editors attach images, maps, and diagrams with full provenance.

18.1. Define media metadata: url, caption, license, source, photographer, date.  
18.2. Implement upload to S3/R2 with virus scanning.  
18.3. Implement upload limits by role and file type.  
18.4. Generate WebP derivatives and fallbacks.  
18.5. Store media references in section `media` arrays.  
18.6. Build the media gallery component.  
18.7. Enforce license compatibility with CC BY 4.0.  
18.8. Add alt-text and accessibility requirements.  
18.9. Implement media moderation queue.  
18.10. Build the media upload UI.  
18.11. Write media tests.  
18.12. Document media policy.  
18.13. Integrate media into gallery pages where appropriate.

**Deliverables:** `api/scholars/media.js`, media UI, media processing pipeline.

---

## Phase 19 — Search & Discovery

**Objective:** Make the Scholarly Edition discoverable across all 123 temples.

19.1. Build a Scholars search index over sections, bodies, and attributions.  
19.2. Implement `GET /scholars/search?q=...`.  
19.3. Add filters: pantheon, institution, contributor, section type.  
19.4. Add faceted search results.  
19.5. Index content incrementally on approval.  
19.6. Implement search suggestions/autocomplete.  
19.7. Build the global Scholars search page.  
19.8. Add "recent edits" and "recently approved" feeds.  
19.9. Add RSS/Atom feeds for new content.  
19.10. Ensure search respects content visibility states.  
19.11. Write search tests.  
19.12. Document the search API.  
19.13. Integrate search links into the main navigation.

**Deliverables:** `platform/scholars/search.js`, `/scholars/search/index.html`, search tests.

---

## Phase 20 — Notifications & Webhooks

**Objective:** Keep editors, reviewers, and institutions informed.

20.1. Design the notification event model.  
20.2. Implement in-app notification inbox.  
20.3. Implement email notifications via transactional email provider.  
20.4. Add notification preferences per user.  
20.5. Implement digest mode for batch updates.  
20.6. Build webhook registration for institutions.  
20.7. Implement webhook signing and retry logic.  
20.8. Add notification audit log.  
20.9. Trigger notifications on edit, review, approval, and mention.  
20.10. Build the notification UI.  
20.11. Write notification tests.  
20.12. Document webhook payload format.  
20.13. Ensure GDPR-compliant unsubscribe.

**Deliverables:** `platform/scholars/notifications.js`, notification UI, webhook system.

---

## Phase 21 — Review Queue UI

**Objective:** Give reviewers a fast, authoritative workflow.

21.1. Build the `/scholars/review` dashboard layout.  
21.2. List pending edits with section, author, institution, and age.  
21.3. Add diff preview inline.  
21.4. Add approve/reject/needs-revision actions.  
21.5. Add batch actions for trusted reviewers.  
21.6. Implement reviewer assignment (auto and manual).  
21.7. Add filters by pantheon, temple, institution.  
21.8. Add review statistics and leaderboards.  
21.9. Add comment threads per edit.  
21.10. Ensure mobile-responsive review UI.  
21.11. Write review UI tests.  
21.12. Document the reviewer workflow.  
21.13. Train sample reviewers with a sandbox queue.

**Deliverables:** `/scholars/review/index.html`, review dashboard JS, review UI tests.

---

## Phase 22 — University Dashboard

**Objective:** Give institutions visibility into their contributors and impact.

22.1. Build the `/scholars/institution/:id` dashboard.  
22.2. Show institution stats: editors, edits, approvals, temples contributed to.  
22.3. List active contributors and their roles.  
22.4. Show pending edits from institution members.  
22.5. Show attribution badges across temples.  
22.6. Add exportable reports for department review.  
22.7. Manage institution membership invites.  
22.8. Configure department tags and specializations.  
22.9. Set institution-branded styling.  
22.10. Integrate with ORCID and university SSO.  
22.11. Write dashboard tests.  
22.12. Document the dashboard for institution admins.  
22.13. Add public institution profile page.

**Deliverables:** `/scholars/institution/index.html`, institution API, dashboard tests.

---

## Phase 23 — Admin Oversight Tools

**Objective:** Give PUNYCODEX curators full visibility and control.

23.1. Build the curator admin dashboard.  
23.2. List all temples, institutions, users, and pending edits.  
23.3. Implement global search across all Scholarly Edition data.  
23.4. Add bulk actions: freeze temple, revoke edit, reset password.  
23.5. Implement audit log viewer.  
23.6. Add moderation tools: flag content, issue warnings, suspend users.  
23.7. Add analytics: edits per day, top institutions, top temples.  
23.8. Add content quality scoring.  
23.9. Implement backup and restore tools.  
23.10. Add configuration UI for taxonomy versions.  
23.11. Write admin tests.  
23.12. Document curator procedures.  
23.13. Add emergency kill-switch for public content.

**Deliverables:** `/scholars/admin/index.html`, curator API, admin tests.

---

## Phase 24 — Content Migration from lore-catalog.json

**Objective:** Seed Scholarly Edition sections from the existing authoritative lore catalog.

24.1. Map lore-catalog sections to taxonomy keys.  
24.2. Build `scripts/migrate-lore-to-scholars.js`.  
24.3. Preserve original attribution to PUNYCODEX.  
24.4. Convert existing prose into the section body format.  
24.5. Convert existing sources into citation records.  
24.6. Generate migration previews before applying.  
24.7. Run migration in dry-run mode for all 111 covered flagships.  
24.8. Apply migration to the database and regenerate snapshots.  
24.9. Validate migrated content renders correctly.  
24.10. Leave the 12 flagships without lore-catalog entries blank.  
24.11. Add migration audit records to history.  
24.12. Write migration tests.  
24.13. Document the migration process.

**Deliverables:** `scripts/migrate-lore-to-scholars.js`, migrated content, migration tests.

---

## Phase 25 — Quality & Accuracy Gates

**Objective:** Protect the scholarly integrity of every public section.

25.1. Implement citation presence checks.  
25.2. Implement source-quality scoring.  
25.3. Implement minimum body length checks.  
25.4. Detect unsupported claims with warning flags.  
25.5. Integrate with `ACCURACY.md` philological standards.  
25.6. Implement original-script verification pipeline.  
25.7. Add automated fact-consistency checks against canonical sources.  
25.8. Build the quality score dashboard.  
25.9. Require minimum quality score before approval.  
25.10. Add curator override with justification.  
25.11. Write quality gate tests.  
25.12. Document quality standards.  
25.13. Iterate gates based on early feedback.

**Deliverables:** `platform/scholars/quality.js`, quality dashboard, quality tests.

---

## Phase 26 — Performance & Caching

**Objective:** Ensure the Scholarly Edition is fast at scale.

26.1. Implement CDN caching for static Scholars pages.  
26.2. Implement stale-while-revalidate for dynamic API responses.  
26.3. Cache rendered section snapshots in Redis.  
26.4. Optimize database queries with indexes and materialized views.  
26.5. Implement connection pooling and query timeouts.  
26.6. Add front-end lazy loading for images and sections.  
26.7. Implement pagination for history, edits, and search.  
26.8. Add request compression.  
26.9. Monitor Core Web Vitals.  
26.10. Load-test the review and approval APIs.  
26.11. Write performance tests.  
26.12. Document caching policy.  
26.13. Set up alerting for performance regressions.

**Deliverables:** Caching configuration, performance tests, monitoring alerts.

---

## Phase 27 — Security & Abuse Prevention

**Objective:** Keep the platform safe from attacks, spam, and misuse.

27.1. Implement strict input validation and sanitization.  
27.2. Add rate limiting across all endpoints.  
27.3. Implement CAPTCHA for anonymous/signup flows.  
27.4. Add spam detection for edit submissions.  
27.5. Implement IP and account-level bans.  
27.6. Add audit logging for all sensitive actions.  
27.7. Implement SQL injection and XSS protection.  
27.8. Add CSRF tokens to all forms.  
27.9. Run dependency vulnerability scans.  
27.10. Implement penetration testing checklist.  
27.11. Write security tests.  
27.12. Document the security model.  
27.13. Create incident response runbook.

**Deliverables:** Security middleware, abuse detection, security tests, runbook.

---

## Phase 28 — Analytics & Reporting

**Objective:** Measure impact and continuously improve the platform.

28.1. Track edits, approvals, and contributor activity.  
28.2. Track page views and engagement per temple.  
28.3. Build the analytics dashboard for curators.  
28.4. Build institution-level analytics reports.  
28.5. Implement exportable CSV/JSON reports.  
28.6. Track content quality scores over time.  
28.7. Measure time-to-approval distributions.  
28.8. Add A/B testing hooks for UI experiments.  
28.9. Ensure analytics are privacy-respecting.  
28.10. Integrate with existing PUNYCODEX analytics.  
28.11. Write analytics tests.  
28.12. Document metrics definitions.  
28.13. Set up automated weekly reports.

**Deliverables:** Analytics pipeline, dashboards, reports, tests.

---

## Phase 29 — Documentation & Onboarding

**Objective:** Make the Scholarly Edition usable for students, faculty, and admins.

29.1. Write the student editor handbook.  
29.2. Write the reviewer handbook.  
29.3. Write the institution admin handbook.  
29.4. Write the curator handbook.  
29.5. Create video/text onboarding flows.  
29.6. Build an interactive style guide.  
29.7. Document the API with examples.  
29.8. Create quick-start templates for common sections.  
29.9. Add in-page contextual help.  
29.10. Translate onboarding materials into key languages.  
29.11. Write documentation tests.  
29.12. Collect feedback and iterate.  
29.13. Publish the public Scholars Edition guide.

**Deliverables:** Handbook docs, onboarding flows, style guide, API docs.

---

## Phase 30 — Beta Pilot with Universities

**Objective:** Validate the platform with a small set of real institutions.

30.1. Recruit 3–5 pilot universities.  
30.2. Onboard pilot institutions and students.  
30.3. Enable edit submissions in a closed beta.  
30.4. Monitor the review queue closely.  
30.5. Collect qualitative feedback via interviews.  
30.6. Collect quantitative metrics.  
30.7. Fix critical bugs and UX issues.  
30.8. Refine the approval workflow based on reviewer behavior.  
30.9. Update documentation and training materials.  
30.10. Validate attribution accuracy.  
30.11. Run a security review.  
30.12. Prepare go/no-go decision criteria.  
30.13. Publish the beta pilot report.

**Deliverables:** Beta program, feedback report, bug fixes, refined workflows.

---

## Phase 31 — Public Launch

**Objective:** Open the Scholarly Edition to all 123 flagships and eligible institutions.

31.1. Finalize production environment configuration.  
31.2. Run full regression test suite.  
31.3. Generate final static snapshots for all 123 temples.  
31.4. Update public navigation and marketing pages.  
31.5. Announce the launch to universities and users.  
31.6. Monitor traffic and errors closely.  
31.7. Provide launch-day support.  
31.8. Capture launch metrics.  
31.9. Address any critical issues immediately.  
31.10. Celebrate the team and early contributors.  
31.11. Write the launch post-mortem.  
31.12. Plan the first post-launch iteration.  
31.13. Mark Phase 31 complete in the project tracker.

**Deliverables:** Live public launch, marketing assets, post-mortem.

---

## Phase 32 — Continuous Evolution

**Objective:** Improve the Scholarly Edition based on real-world usage.

32.1. Establish a public roadmap and feedback board.  
32.2. Implement monthly taxonomy review meetings.  
32.3. Add new pantheon kits as needed.  
32.4. Improve the editor experience based on analytics.  
32.5. Expand university partnerships.  
32.6. Introduce advanced features: collaborative editing, real-time cursors.  
32.7. Support multilingual scholarly content.  
32.8. Enhance media and map integrations.  
32.9. Build automated content freshness reminders.  
32.10. Run regular accuracy audits.  
32.11. Recognize top contributors and institutions.  
32.12. Write quarterly impact reports.  
32.13. Keep the 33-phase plan updated.

**Deliverables:** Roadmap, feedback loops, iterative improvements, impact reports.

---

## Phase 33 — Legacy & Archive

**Objective:** Ensure the scholarly record remains accessible and trustworthy for generations.

33.1. Implement immutable archival snapshots.  
33.2. Generate DOI-ready exports for stable citation.  
33.3. Build a read-only archive mode.  
33.4. Ensure data portability for institutions.  
33.5. Create long-term backup strategy.  
33.6. Document the evolution of the taxonomy over time.  
33.7. Preserve attribution history permanently.  
33.8. Enable versioned API deprecation policy.  
33.9. Plan for technology succession.  
33.10. Establish an editorial board for long-term governance.  
33.11. Publish annual scholarly integrity reports.  
33.12. Contribute to open standards for collaborative scholarship.  
33.13. Declare the Scholarly Edition a living, permanent public good.

**Deliverables:** Archive system, DOI exports, governance board, integrity reports.

---

## Execution Notes

- Phases marked ✅ are already complete.
- Phases 2 and 3 should be finalized before backend implementation begins.
- Each phase gates the next: no backend code until architecture is signed off; no launch until beta is successful.
- The plan is additive to existing PUNYCODEX infrastructure and does not modify canonical sources except through the existing governance workflow.

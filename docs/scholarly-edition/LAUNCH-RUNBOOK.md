# PÚNYCODEX Scholarly Edition — Launch Runbook

## Pre-Launch Checklist

- [ ] All 123 flagships have `/sites/{id}/scholars/index.html` generated.
- [ ] Database migrations applied to production (Neon).
- [ ] Lore-catalog migration run in production.
- [ ] `REDIS_URL` configured for caching and sessions (optional but recommended).
- [ ] Email provider configured for magic links (replace dev logging).
- [ ] University SSO configured for pilot institutions.
- [ ] Curator accounts created and roles assigned.
- [ ] Rate limits and security headers verified.
- [ ] Review queue UI accessible at `/scholars/review/index.html`.
- [ ] Admin dashboard accessible at `/scholars/admin/index.html`.
- [ ] Analytics dashboard accessible at `/scholars/analytics/index.html`.
- [ ] Search page accessible at `/scholars/search/index.html`.
- [ ] University dashboard accessible at `/scholars/institution/index.html`.
- [ ] `npm test` passes.
- [ ] `npm run generate` produces no diffs.

## Pilot Program (Phase 30)

1. Recruit 3–5 pilot universities.
2. Onboard institution admins and faculty reviewers.
3. Enable edit submissions.
4. Monitor review queue daily.
5. Collect feedback weekly.
6. Fix critical issues within 48 hours.

## Public Launch (Phase 31)

1. Remove pilot-only restrictions.
2. Announce to all institutions and users.
3. Monitor traffic and errors.
4. Capture launch metrics.

## Evolution (Phase 32)

1. Maintain public roadmap.
2. Expand university partnerships.
3. Add advanced features based on usage.

## Archive (Phase 33)

1. Generate immutable snapshots.
2. Assign DOIs to stable versions.
3. Establish editorial board.

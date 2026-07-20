# PUNICODEX Deployment Guide (Vercel)

Current production: Vercel project `punycodex-main` (team `hekaverse`).
Static site + serverless functions in `api/` + edge `middleware.js`. No build step on Vercel — the deploy payload is the repo minus `.vercelignore`.

---

## Why deploys used to take ~30 minutes — and what we did about it

The project is GB-scale: 252 flagship temples with multi-MB image assets, 915 temple pages, and several source-material folders that are not runtime code. The deploy payload is now controlled by `.vercelignore`, which excludes everything that is not served at runtime:

- `extended flagship materials/` (3.2 GB of business source PNGs)
- `branding/` (1.1 GB of per-deity brand kits — public brand assets live in `/assets/brand/`)
- `docs/`, `tools/`, `android/`, `extension*/`, `data/corpus/`, `data/authoritative/`, `data/benchmarks/`
- `Kimi_Agent_punicodex扩展/`, `session-debug/`
- `sites/**/*.png` — temples ship WebP only (PNG fallbacks stay in the repo, never uploaded)

**Vercel dedupes uploads by file hash** — unchanged files are never re-uploaded. A no-change production deploy now measures ~3 minutes end-to-end (measured 2026-07-20). The slow 30-minute runs were almost entirely *new content* uploads (batches of new temples/images), not re-uploads of the existing site.

### What this means in practice

| Change type | Cost | Why |
|---|---|---|
| Localized edit (one CSS/JS/HTML file) | ~3 min | Hash dedup skips everything else |
| Content batch (new temples/images) | minutes–tens of minutes | Only the new files upload |
| Full regenerate (no content change) | ~3 min | Byte-identical artifacts hash to the same values |

There is no way to deploy a *subset* of a Vercel project — a project is one deployment unit. The win is keeping the payload lean (`.vercelignore`) and leaning on hash dedup, both of which are now in place. The only architecture that would make big batches cheap is moving immutable temple images to a separate asset host (R2/S3/another Vercel "assets" project) — a real refactor, listed under "Future" below.

---

## Deploy paths

### Fast path — localized fixes (CSS/JS/HTML edits, no canonical-source changes)

When you have only edited hand-maintained files and the flywheel is untouched:

```bash
git add -A && git commit -m "..."
git push origin master
vercel deploy --prod --yes
# alias to the primary domains
D=$(vercel ls --yes | grep -o 'punycodex-main-[a-z0-9-]*\.vercel\.app' | head -1)
for a in punicodex.com punycodex.com www.punicodex.com; do vercel alias "$D" "$a"; done
```

### Full path — canonical-source changes (lexicon, archetypes, lore, taxonomy, effects, industry patterns)

The flywheel demands regeneration and the full gate:

```bash
npm run generate        # regenerates all derived artifacts
npm test                # 136 suites incl. the Divergence Gate
git add -A && git commit -m "..."
git push origin master
vercel deploy --prod --yes
# alias as above
```

Rules that keep the gate green:

- Never edit generated outputs by hand; edit canonical sources and re-run `npm run generate`.
- `vercel.json` stays valid single-key JSON; domain routing lives in `middleware.js` (generated DOMAIN_MAP), never duplicated into `vercel.json` redirects.
- Bump the `?v=perfXX` asset versions (and `archetypes-v2.js?v=NN`, thumbs `?v=NN`) whenever CSS/JS/thumbs change — those paths are cached immutable for a year.

### Mobile safety

HTML is `max-age=0, must-revalidate`, but `/css`, `/js`, `/assets` are immutable. Any visual fix to a cached file **requires** a version bump or users with warm caches never see it.

---

## Future: true localized deploys (asset-host migration)

The only honest path to sub-minute large deploys is moving immutable temple images off the monorepo deployment:

1. Host `sites/{id}/assets/` (webp mascots/logos) on a CDN (Cloudflare R2, S3+CloudFront, or a separate Vercel "assets" project).
2. Point `mascotPath`/`logomarkPath` in `js/archetypes-v2.js` and the template asset URLs at the CDN domain.
3. Main deploy drops to < 200 MB and finishes in ~1 minute regardless of temple count.

Do this only with an explicit host decision — it changes public URLs and needs DNS/CDN setup. Not started; the current payload cuts solve the common case.

---

## Non-negotiables

- **Do not** commit secrets. Env vars live in Vercel (`STRIPE_*`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `ADMIN_*`, `CRON_SECRET`).
- **Do not** push a broken flywheel: if `npm test` is red, do not deploy.
- **Do not** deploy `extended flagship materials/`, `branding/`, `docs/`, `tools/`, `session-debug/` — they are excluded by `.vercelignore` on purpose.
- HTML must always carry the analytics beacon marker block (auto-injected by `npm run generate`).

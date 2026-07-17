# PUNICODEX Deployment — DO NOT FUCK THIS UP

## Critical Rules

### 1. Production Branch is `main`, NOT `master`
- Cloudflare Pages serves `punicodex.com` from the **`main`** branch
- `master` branch goes to **Preview** only
- Always deploy with: `npx wrangler pages deploy . --project-name=punicodex --branch=main`

### 2. Cache Busting is MANDATORY
- `_headers` sets `Cache-Control: public, max-age=31536000, immutable` on `.css`, `.js`, `.png`, `.svg`
- **Every CSS/JS reference in HTML must use `?v=PERFX` query strings**
- When you change CSS or JS, bump the version in ALL HTML files that reference it
- Current version: `?v=perf7`

### 3. Pages that MUST have cache-bust on CSS/JS
- Root pages: `index.html`, `404.html`
- Section pages: `about/`, `contact/`, `codex/`, `store/`, `pantheon/`, `lexicon/`, `type/`, `realms/`, `tiers/`
- All 260+ temple sites in `sites/{id}/`
- Check with: `grep -r 'href="/css/[^"]*\.css"' --include='*.html' | grep -v '\?v='`

### 4. Deployment Checklist
```bash
# 1. Commit everything
git add -A && git commit -m "..."
git push origin master
git push origin master:main

# 2. Deploy to PRODUCTION (main branch)
# Set CLOUDFLARE_API_TOKEN in your environment before running
npx wrangler pages deploy . --project-name=punicodex --branch=main

# 3. Verify live site (not the preview URL)
curl -s https://punicodex.com/ | head -5
```

### 5. Multi-Account Deployment (Norse sites: helheimr, muspellheimr)
Wrangler caches the last-used `account_id` in `node_modules/.cache/wrangler/pages.json`.
**You MUST delete this cache before switching accounts**, or wrangler will send requests
to the wrong account and fail with `Authentication error [code: 10000]`.

```powershell
# Main account (punicodex.com, hermes, nike, etc.)
Get-Content .env | ForEach-Object { $k, $v = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($k, $v, 'Process') }
Remove-Item node_modules/.cache/wrangler/pages.json -Force -ErrorAction SilentlyContinue
npx wrangler pages deploy . --project-name=hermes --branch=main --commit-dirty=true

# Second account (helheimr.com, muspellheimr.com)
$env:CLOUDFLARE_API_TOKEN = $env:CLOUDFLARE_API_TOKEN_NORSE
$env:CLOUDFLARE_ACCOUNT_ID = $env:CLOUDFLARE_ACCOUNT_ID_NORSE
Remove-Item node_modules/.cache/wrangler/pages.json -Force -ErrorAction SilentlyContinue
npx wrangler pages deploy . --project-name=helheimr --branch=main --commit-dirty=true
```

**Env var names in `.env`:**
- Main account: `CLOUDFLARE_API_TOKEN_MAIN` / `CLOUDFLARE_ACCOUNT_ID_MAIN`
- Norse account: `CLOUDFLARE_API_TOKEN_NORSE` / `CLOUDFLARE_ACCOUNT_ID_NORSE`

### 6. What NOT to do
- ❌ Do NOT deploy to `--branch=master` and think it's live
- ❌ Do NOT give the user `*.pages.dev` preview URLs as if they're the live site
- ❌ Do NOT change CSS/JS without updating `?v=` query strings in HTML
- ❌ Do NOT assume cache will invalidate itself — it won't

### 7. If Something Looks Broken on Live
1. Check if the HTML references the right `?v=` version
2. Check if you deployed to `main`, not `master`
3. Check `npx wrangler pages deployment list --project-name=punicodex` to confirm
4. Cloudflare edge cache can lag ~30s; wait a moment then hard-refresh

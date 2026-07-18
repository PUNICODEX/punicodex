# Browser Extensions Audit — July 2026

Scope: `extension/` (PuniCodex Type, MV3) and `extension-v2/` (PuniCodex
Authenticity Shield, MV3, threat interstitial), plus the shared remote
interstitial page that extension-v2 depends on. Audit performed against the
post-rebrand state (brand assets in `/assets/brand/`, plain-text wordmark in
extension popups per the brand plan's offline-hostile-popup decision).

Method: static review of both extensions and their tests, CORS/endpoint
verification against `api/v1` + `api/v2`, brand-asset comparison with
`docs/brand/BRAND_GUIDELINES.md`, execution of all existing extension suites,
and new tests for the API-down paths. No canonical generator inputs were
modified; `npm run generate` was not run (a single new sync script was
executed directly to produce its own output).

---

## Findings & fixes — `extension/` (PuniCodex Type v1)

| Item | Status | Notes |
|------|--------|-------|
| MV3 compliance | PASS | Classic content script, packaged code only, no CSP concerns |
| Permissions | PASS (justified) | `storage` (settings), `activeTab` (popup tab query). `host_permissions: <all_urls>` kept — required for content scripts on all sites and the popup's cross-origin API call; see deferred items |
| Icons | FIXED | Were old-brand gold Φ on black; replaced with the new emblem from `assets/brand/02-favicons/` (16/32/48 copied, 128 resized from `favicon-512x512.png` via jimp) |
| Shared lexicon sync | VERIFIED | `extension/shared/lexicon.js` = 152-byte generated header + byte-identical copy of `type/js/lexicon.js` (covered by new test) |
| Offline-first type tool | PASS | Lexicon + engine + `lore-catalog.json` are packaged; the only network calls are the optional authenticity checks |
| Authenticity endpoint | FIXED (bug) | `popup/popup.js` and `content/content.js` called `https://punicodex.com/api/v2/authenticity/check/` — a route that exists only via the optional `api/v2/[[...slug]].js` catch-all (marked "local/tests"), with a trailing slash that forces a Vercel 308 hop. Now the stable, documented `/api/v1/authenticity/check` |
| Content-script CORS | FIXED (bug) | `content/content.js` fetched the API from page context; the API only sends CORS headers for punicodex.com origins, so the banner could never render on third-party sites. The fetch now runs in the service worker (`checkAuthenticity` message), which is CORS-exempt via host permissions |
| `authenticityWarnings` setting | FIXED (bug) | `getSettings` never returned the key, so the options-page toggle was ignored; added to the key list and to `onInstalled` defaults |
| Console spam | FIXED | Removed `console.log('PuniCodex Type content script loaded.')` that fired on every visited page |
| Brand text/CSS | PASS | Plain `PUNICODEX` wordmark + gold CSS already in place (chrome-slice); README counts refreshed (859/21 → 895/22) |

## Findings & fixes — `extension-v2/` (Authenticity Shield)

| Item | Status | Notes |
|------|--------|-------|
| MV3 compliance | FIXED | `content_scripts[0].type: "module"` is not a valid content-script key (the script is classic); removed |
| Permissions | FIXED | Removed `scripting` — zero usage anywhere in the codebase. `storage` + `activeTab` retained (settings, popup current-tab query); `http://*/*` + `https://*/*` host permissions retained because the API endpoint is user-configurable and fetches run in the service worker |
| **Default API endpoint** | FIXED (bug) | `DEFAULTS.apiEndpoint` was `https://punicodex.com/api/v2/` — the trailing slash produced double-slash request URLs (`…/api/v2//authenticity/check`), and the v2 authenticity routes exist only via the optional `[[...slug]]` catch-all router whose own header calls it "local/tests". Both are fragile: double-slash segments 404 wherever the platform does not normalize them. Now the stable, documented `https://punicodex.com/api/v1` (popup docs link and options placeholder updated to match) |
| Double-slash hardening | FIXED | New `getApiBase()` strips trailing slashes from user-supplied endpoints in `checkUrl`, `reportVerdict`, and the popup's manual check |
| Fetch timeout / fail-open | FIXED | `checkUrl` and `reportVerdict` had no timeout — a hung API left tab checks and popup requests pending forever. Both now use `AbortSignal.timeout(8000)`; all callers already treat a rejection as fail-open |
| Offline/API-down behavior | VERIFIED + TESTED | Fail-open is the design (README now states it): `handleTabUpdate` swallows errors (navigation proceeds), message handlers respond `{success:false}` (popup shows "Offline"/error), link highlighting ignores failures. New tests cover fetch-throw, HTTP 500, timeout signal, and the fail-open contract. No unhandled rejections found. No `chrome.alarms` retry logic exists — retries happen naturally on the next navigation; adding alarm infrastructure was judged out of scope |
| Brand colors | FIXED | Popup/options used pre-rebrand indigo `#4f46e5`; now Pantheon Gold `#D4AF37` buttons (obsidian text) with Deep Temple Gold `#8C6A22` for text-on-light, per `BRAND_GUIDELINES.md` |
| Icons | FIXED | Same old-brand Φ icons as v1; replaced from the brand favicon set |

## Findings & fixes — threat interstitial (remote page)

extension-v2 redirects blocked tabs to `https://punicodex.com/interstitial.html`.

| Item | Status | Notes |
|------|--------|-------|
| **Page deployment** | FIXED (critical) | The canonical page lived only at `platform/public/interstitial.html`, so `/interstitial.html` **404'd in production — every block action redirected to a dead page**. Added `scripts/sync-interstitial.js` (modeled on `sync-admin-portal.js`), registered it in `scripts/generate.js` after `sync-admin-portal.js`, and produced the root `interstitial.html` copy |
| Report endpoint | FIXED (bug) | The "Report mistake" button POSTed to `/api/v2/authenticity/report/` (catch-all-only route, trailing slash → 308 hop); now `/api/v1/authenticity/report` |
| Branding | FIXED | Indigo accent → brand gold; purple gradient "P" disc → packaged brand favicon (`/assets/brand/02-favicons/favicon-48x48.png`); alt-links gold |
| Asset refs / i18n | PASS | All 9 locale bundles exist under `/i18n/authenticity/`; placeholders, ARIA regions, and controls verified by `test/interstitial-smoke.test.js` (6/6 pass) |

## Tests

- `test/extension-v2.test.js` — **16/16 pass** (6 new: trailing-slash/default-endpoint, AbortSignal presence, API-500 rejection, fail-open on unreachable API, fail-open on 500, message-handler failure response).
- `test/extensions-audit.test.js` — **new suite, 18/18 pass**; registered in `test/run-all.js` next to the extension-v2 suite. Covers both manifests (MV3, packaged code, permissions actually used, icons on disk and on-brand), the no-`api/v2/authenticity` rule, endpoint defaults, timeout wiring, v1 remote-call scope, lexicon byte-identity, and interstitial deployment/branding.
- `test/interstitial-smoke.test.js` — 6/6 pass.
- `npm run format` / `npm run lint` — clean on all touched files (4 pre-existing format-drift files elsewhere in the repo were left untouched).

## Build

- `node extension/build.js` → `extension/punicodex-type-extension.zip` rebuilt successfully (635.8 KB) with the fixed code and new icons.

## Deferred items (with reasons)

- **v1 `host_permissions: <all_urls>` narrowing** — could be reduced to `https://punicodex.com/*` (content scripts keep running via their own `matches`), but the install-time warning is identical either way and the change risks subtle breakage for zero user-visible gain. Revisit if the store listing ever needs a minimal-permissions story.
- **v1 service-worker fetch timeout** — a hung API leaves the `checkAuthenticity` request pending; the user-visible outcome is simply "no banner", which is the desired fail-open. Not worth diverging v1 from its current minimal style.
- **Alarm-based retry for extension-v2** — fail-open design makes a failed check silent until the next navigation/manual check; adding `chrome.alarms` state machinery to re-check after outages is new feature surface, not a fix.
- **University-collaborators strip on the interstitial** — the global injector adds it to every public page including the security interstitial; removing it for this one page is an injector-policy decision, out of audit scope.

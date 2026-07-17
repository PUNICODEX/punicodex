# PuniCodex — CSP Report-Only Soak

**Status:** Soaking (report-only) since 2026-07
**Header:** `Content-Security-Policy-Report-Only` on all routes (`vercel.json`)
**Current policy value:**

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'
```

## Why report-only first

The site ships 895 temple pages plus portal and feature pages that carry
inline `<script>` and `<style>` blocks, inline event handlers, and
dynamically injected markup. Switching straight to an enforcing CSP risked
breaking pages fleet-wide with no easy way to predict every violation.
Report-only mode delivers the same violation telemetry to the browser
console (and any future `report-uri`/`report-to` endpoint) without blocking
a single resource, so the real-world violation surface can be mapped before
anything is enforced.

## What to check before enforcing

Open each of these representative pages in a browser with DevTools open and
confirm **no `Content-Security-Policy-Report-Only` violation warnings**
appear in the console during a full page load and basic interaction
(navigation, search, tab switches):

- A flagship temple page (e.g. `/sites/zeus/`) — covers the temple template,
  inline canvas effects, and tab pages (`lore/`, `gallery/`, `blog/`).
- `/blog/` — the generated global blog index.
- `/admin-portal/` — the unified admin portal (login + dashboard).
- `/search.html` — the search engine UI.
- `/type/` — the type tool (heaviest inline-script page).

Any violation reported on these pages must be resolved or consciously
accepted (by widening the matching directive — see below) before the policy
is enforced.

## How to enforce

One-line change in `vercel.json`: rename the header key, keep the value
identical.

```diff
-          "key": "Content-Security-Policy-Report-Only",
+          "key": "Content-Security-Policy",
```

Do not change the policy value in the same commit — enforce exactly what was
soaked, so any breakage maps directly to enforcement itself and not to a
policy edit.

## If violations appear after enforcing

Widen the **specific directive** named in the violation report (e.g. add a
host to `img-src`, or a hash/`'unsafe-inline'` to `style-src`) — do **not**
loosen the whole policy (e.g. do not fall back to `default-src *` or drop
`default-src 'self'`). Each widening should be scoped to the resource class
that actually violated, so the rest of the policy keeps its protective
value. Re-soak in report-only after any non-trivial widening before
re-enforcing.

# The Unicode Web — Search × Arbitrage Evolution Plan

**Status:** v0.1 draft · 2 November 2026 · Owner: PuniCodex core
**Surfaces:** `/search/`, `/arbitrage/`, `platform/crawler/`, `api/search/`, `api/v1|v2`

---

## 1. The strategic reframe

PuniCodex is not a registrar and not a domain marketplace. It is **the search
engine and the trust layer of the Unicode web**. The reframe in one sentence:

> **A Unicode domain bought anywhere can exist; a Unicode domain recognised by
> PuniCodex is findable, verified, and trusted.**

The current `/arbitrage/` page treats domains as inventory to flip — a reseller
mindset that (a) competes with our own temples, (b) feels amateur, and (c) has
no moat. The current `/search/` treats the index as a lookup table for our own
lexicon. Both are the old concept. The new concept has three moves:

1. **Open the index.** The crawler already discovers live `xn--` domains. The
   search engine becomes the place you *explore* the Unicode web — names,
   languages, businesses, people who registered Unicode domains — not just our
   983 restorations. The fun the founder described: *imagine what's out there.*
2. **Make registration the on-ramp, not the product.** Anyone can register any
   Unicode domain at any registrar. We don't need to be the registrar. We need
   to be the **registry of record for identity**: the domain's listing, its
   verification badge, its temple-style business card, its rank.
3. **Monetise recognition, not registration.** The asset is attention and
   trust inside the search engine, exactly as Google's asset was ranking.

## 2. What changes on the surface

### `/search/` — the engine (Phase 1, this cycle)

- **Sitewide chrome.** Same header/menu/footer as the rest of the site (done in
  this cycle: canonical nav spliced in, sub-brand "Curated Unicode Real
  Estate" lockup preserved above the search box, hero centered like a real
  engine). The page must read as *infrastructure*, not a marketing page.
- **Three result classes, visually distinct:**
  - **Verified temples** — our lexicon entries with live sites (current
    behaviour, keep the flagship-first ranking).
  - **Claimed Unicode web** — live `xn--` sites the crawler has indexed that
    are *not* lexicon entries. Each gets a business card: title, favicon, first
    text, language guess, punycode + Unicode forms, "first seen" date.
  - **The unclaimed space** — availability signals: query → punycode conversion
    → "this label is free / taken" via RDAP, with registrar deep links.
- **No competitor framing.** Results never say "buy this mythological domain" —
  mythological availability lives behind the temple flow only. The engine is
  neutral about *whose* name it is.
- **Engine cues:** result counts, index coverage stats ("N Unicode domains
  indexed across M scripts"), query-time, and a `site:` operator. Small,
  real-search-engine details that signal competence.

### Claim & verify flow (Phase 2 — the monetisable core)

1. Owner of any Unicode domain runs a search for their domain → result card
   shows **"Claim this listing"**.
2. Claim = prove control (DNS TXT record or file at the domain — the
   authenticity subsystem already has verification machinery to reuse).
3. Verified listings get: edit rights (title/description/logo), a **verified
   badge**, and placement above unverified listings of the same label.
4. **Monetisation tiers:**
   - **Free** — claim, badge, basic card. This must stay free; it's the
     index-building wedge (like Google's free crawl).
   - **Spotlight (paid)** — enhanced card (logo, tagline, deep links), sitelinks
     under the result, category placement. The analogue of our ad slots, priced
     per label per month. Reuses the booking/checkout machinery.
   - **Category pages (paid, future)** — "JapaneseUnicode domains",
     "Cafés with Unicode domains" — editorially curated category pages that
     rank in Google; slots on them are premium.
   - **Data/API (paid, exists)** — the crawler's index as an API product:
     "is this Unicode domain live/claimed/what category" for registrars,
     security vendors, brand-protection (natural fit with the authenticity
     product line).
   - **Broker referral (light-touch)** — for unclaimed labels, registrar
     affiliate links (Porkbun/Spaceship/Dynadot already in the registrar set).
     Small money, but it completes the loop: *find it here → register it →
     claim it here.*

### `/arbitrage/` — retired into the engine (Phase 1)

- The arbitrage page's useful content (availability checking, punycode
  conversion, registrar comparison) merges into `/search/` as the unclaimed-
  space result class and into the existing `/appraise/` tool.
- `/arbitrage/` becomes a redirect to `/search/` with a banner, not a separate
  concept. The *word* arbitrage survives only as an internal analytics view
  (which labels are being searched and are free — demand signal, not inventory).
- Rationale: we do not flip domains; we index the people who do.

## 3. Backend work (roughly in order)

1. **Index exposure:** extend `api/search` to return claimed-Unicode-web cards
   for non-lexicon `xn--` sites (data already in `indexed_sites`; the ranking
   already has the xn-- bonus). Needs: favicon URL, language guess, first-seen.
2. **Availability in results:** RDAP/whois check for non-indexed labels,
   cached in `availability` (table exists). Rate-limit carefully; RDAP is
   free but not unlimited.
3. **Claims table + DNS verification:** `domain_claims(id, punycode,
   owner_email, method, verified_at, plan)` + the TXT/file challenge flow.
   Reuse `platform/models/authenticity/` verification patterns.
4. **Spotlight checkout:** reuse the sponsor slot booking flow (Stripe +
   booking state machine) for per-label spotlight subscriptions.
5. **Robots/crawler etiquette:** claimed sites can supply sitemaps/feeds for
   fresher crawls (an earned benefit that also improves the index).

## 4. Metrics that tell us it's working

- Indexed Unicode domains count (crawler) — north star for the open index.
- Claimed listings count and claim→spotlight conversion.
- Searches returning "claimed Unicode web" cards (engine is being used as an
  engine).
- Referral clicks to registrars; spotlight renewal rate.

## 5. What we deliberately do NOT do

- Do not become a registrar. Registration margin is thin, support-heavy, and
  commoditised; our leverage is the index and the badge.
- Do not sell listings or rankings for unverified domains (trust is the
  product; selling unverified placement kills it).
- Do not de-prioritise the temples — the lexicon is the editorial spine that
  makes the open index coherent.

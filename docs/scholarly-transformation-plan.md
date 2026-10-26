# The Scholarly Transformation Plan
## PuniCodex — University & Scholarly Ecosystem: Audit Findings + Execution Roadmap

**Date:** 2026-10-26 · **Depth:** full-stack audit (API, DB, UI, tests, email, store pipeline)
**Verdict:** the scholarly foundation is genuinely well-built — authz, session revocation, editorial workflow, and the creatives marketplace all test green. The system is ~60% infrastructure-complete and ~15% *experience-complete*: the seams between subsystems are where the value leaks out.

---

## 1. What the audit verified as SOLID (do not rebuild)

| Area | Evidence |
|---|---|
| Scholars auth & sessions | bcrypt, lockout, immediate revocation on password change/reset/disable (`session-revocation.test.js`) |
| Role matrix | student → reviewer → dept_admin → inst_admin → curator, enforced server-side (`authz.test.js`) |
| Editorial workflow | submit → reviewer (same institution) → approve/reject → author notified (`router.test.js`, `notifyAuthorOfDecision`) |
| Institution provisioning | curator approves application → institution + admin account created → admin provisions/revokes students (`dept-admin.test.js`, provisioning email with forced password change) |
| Creatives marketplace | upload → moderation (`creative-moderation`) → review → purchase/licensing with 50/50 ledger (`creative-marketplace.test.js`, `creator-merch.test.js`) |
| Merch consent | legal opt-in re-verified server-side; withdrawal unlists products transactionally |
| **Temple store art (new, this cycle)** | `sync-store-creatives.js` gate: approved + merch_consent + inspiration_entry_id → PDP art chips; `audit-art-placement.js` guards placement; 15,930 placements audited, 0 spills |
| University outreach (new, this cycle) | hybrid template engine exceeding the founding-pitch benchmark; 39 AU institutions seeded; pitch throttles + audit trail |

---

## 2. Gaps, flaws, and improvement metrics (the 15%)

### CRITICAL — value leaks
1. **Student dashboard has no editing surface.** The propose-edit UI lives only on temple `/scholars/` tabs (line 1143 of the generated tab) and the review UI; `scholars/dashboard` (909 lines) never fetches sections. A student landing in the portal has no "Continue your work on Athena" affordance. → Build the dashboard "My sections in progress" + deep links.
2. **No notification surface for creatives events.** `creative-marketplace.js` never calls `sendEmail`: a student whose art is approved, purchased, or goes live on the store is never told. The royalty moment — the single best retention event in the product — is silent. → Wire `notifyCreativeEvent` (approved / first sale / store-artwork-live) into review, purchase, and sync-store-creatives.
3. **The P4 store-artwork pipeline is ops-driven, not event-driven.** `sync-store-creatives.js` must be run manually; consent granted today appears on the store at the next manual sync + regenerate (tens of minutes of lag, or forever if nobody runs it). → Run it as a post-approval hook (admin portal approve action) + nightly cron; regenerate only affected PDPs.

### HIGH — experience fractures
4. **Inspiration temple is a free-text field.** `asset-inspiration` asks students to type "e.g., zeus" — invalid IDs silently produce art that can never reach a temple. → Temple picker (lexicon-autocomplete) + server-side validation against LEXICON_IDS; reject unknown ids at PATCH.
5. **Nothing tells a creator their art is a store artwork.** After sync, the art appears on the temple's products with no notice, no credit line in the PDP chip tooltip, no analytics back to the creator. → Chip tooltip = title + creator name (data already in `creative-artworks.json`); creator analytics add "store views/orders" events.
6. **University application → onboarding email copy is transactional, not ceremonial.** The provisioning email carries a temp password; it should also carry the "your institution now holds a seat in the pantheon" moment. → Upgrade `notifyScholarsAccountProvisioned` to the obsidian/gold email language.
7. **The paid/free boundary confuses.** The public page historically led with $999; the outreach says free. The redesigned page now separates them (free core / optional founding-partner tier), but the **application flow** (`/scholars/apply/`) still asks for sponsorship intent without that distinction. → Add the free-collaboration path explicitly in the apply form.

### MEDIUM — correctness & polish
8. **Admin portal Express parity gap.** `platform/server.js` implements only a subset of `/api/admin/*`; portal routes (discounts pitch, new universities) are Vercel-only. Local dev against the Express server silently 404s these. → Note in docs + a parity test listing handled routes.
9. **No crawl-sourced enrichment of prospects.** The seed is static; departments, contact pages, and research-centre URLs go stale. → The crawling engine (§3).
10. **Pitch analytics blind.** Pitch sends log to `admin_actions`, but there's no funnel view (sent → replied → active). → Add a Universities funnel card to the portal section (counts already derivable from status + pitch_count).
11. **Watermarked preview vs print master mismatch risk.** Marketplace previews are watermarked; the store chip uses the original. Consent UI must state that the *unwatermarked original* prints on merchandise. → One sentence in the opt-in endpoint's UI + email.
12. **University prospects have no region expansion path.** Table is AU-only by seed; the crawler plan (§3) generalizes.

### LOW — hygiene
13. `university_prospects.contact_email` is null everywhere in the seed — the portal expects the operator to supply it per send (fine) but a `suggested contact pages` field from the crawler would prefill research.
14. Scholars frontend copies (`platform/public/scholars` → root `scholars/`) are generated — every UI fix above must land in the canonical source and regenerate.

---

## 3. The crawling engine ecosystem (university discovery)

Leverage the existing crawler (`platform/crawler/`, discovery → normalize → match → fetch → extract) as the user intuited — it already fetches, extracts, and dedups at scale.

**Pipeline: `scripts/crawl-australian-universities.js`**

1. **Source of truth (domains):** the `university_prospects` table itself — every seeded `.edu.au` domain is a crawl target. New universities enter via TEQSA's public register (43 accredited AU providers) as a bootstrap list; Wikidata SPARQL (`instance of: university, country: Australia`) as the enrichment cross-check.
2. **Discovery pass (per domain, robots-respecting, 1 req/2s):**
   - fetch `/` → extract faculty/school links (`/faculties`, `/schools`, `/departments`, `/about/structure`);
   - fetch each faculty index → extract unit names (h1/h2/link text matching dept vocab: *classics, ancient history, archaeology, linguistics, religious studies, theology, digital humanities, design, marketing, Indigenous studies, Egyptology, history*).
3. **Matching (the part the search engine already does):** normalize unit names, match against the department benefit vocabulary in `university-pitch-email.js` (single source of truth — extend `DEPARTMENT_BENEFITS` as new departments are discovered), score ≥ threshold → write to `prospects.departments` (source='crawl', never overwriting a human-curated seed list — merge, don't replace).
4. **Contact discovery:** from faculty pages, extract the *school office* / *head of school* contact page URL into `metadata.contact_pages[]` (never scrape personal emails — ACMA spam rules; the operator picks the recipient in the portal).
5. **Schedule:** monthly cron (`evolve.yml` nightly already runs; add a `--operational` flag), diff report to `data/crawler/universities/YYYY-MM.json`, ops review queue for new departments.
6. **Guardrails:** respect robots.txt + crawl-delay; cache content-hash (crawler's existing dedup); every auto-updated prospect row tagged `source='crawl'` and listed in the portal for human sign-off before any pitch.

**Deliverable of this cycle (v1, shipped):** the curated 39-institution seed with aligned departments (the crawler's ground truth) + the portal section. The engine itself is phase-1 of the execution plan below.

---

## 4. Execution plan (phased, each phase independently shippable)

### Phase A — close the silent seams (highest ROI, ~2–3 days)
- A1. Event-driven store-artwork sync: hook `sync-store-creatives` into the admin approve action + nightly cron; regenerate only affected temple PDPs.
- A2. Creative lifecycle emails: approved / first sale / store-artwork-live (obsidian/gold template family; reuse `university-pitch-email` design DNA).
- A3. Temple picker for inspiration entry (lexicon autocomplete; validate server-side).
- A4. Dashboard "my work" surface: in-progress edits, review status, creative status, earnings.
- A5. Upgrade provisioning email to the ceremonial register.

### Phase B — the crawler (~2 days)
- B1. `crawl-australian-universities.js` per §3 (discovery, matching, contact-page extraction, diff reports).
- B2. Portal: prospect funnel card (sent → replied → active), suggested-contact-pages display, crawl-source badge.
- B3. TEQSA/Wikidata bootstrap cross-check.

### Phase C — the money loop (~3–4 days)
- C1. Creator analytics: store views/orders attributed from `store_orders.artwork_key` (`creative:<id>`) → creator dashboard + payout ledger transparency.
- C2. PDP chip attribution: tooltip + alt text with creator name; "Created by {name}, {university}" line under the art row.
- C3. Apply-flow free/paid separation (free collaboration default; founding-partner as opt-in toggle).
- C4. Combination-design entries for notebook/sticker (`mascot + logomark`, `complete set`) as explicit `design` variants — data model already supports it.

### Phase D — hardening (~2 days)
- D1. Express parity test for admin portal routes.
- D2. Battle suite for the scholarly flow (apply → provision → edit → review → approve → creative → consent → store sale → royalty) at booking-battle depth.
- D3. Rate-limit + abuse review on the new endpoints (pitch endpoint already throttled per prospect).

### Phase E — growth surface (~3 days)
- E1. Institution public pages (`/universities/{slug}/`): their published contributions, their creatives, their researchers — SEO surface that doubles as a pitch follow-up link.
- E2. Herald quarterly university column (data already exists).
- E3. The Australia-first → world expansion of the prospect engine (NZ/UK/CA phase 2, same pipeline).

---

## 5. Success metrics
- **Adoption:** institutions active (target: 5 by Q1), students provisioned, edits submitted/approved per month.
- **Money loop:** creatives with merch consent %, store orders carrying `creative:<id>`, royalties paid.
- **Outreach:** pitch → replied → active funnel (baseline: 39 seeded, 0 pitched — first sends are the operator's).
- **Quality:** scholarly edits approval rate, review turnaround, audit suite green.

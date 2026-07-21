# PuniCodex — Creator Merch Pipeline

Verified Creative Marketplace contributors (university students with an active
institution sponsorship) can opt in — per work, with explicit recorded
consent — to have their approved creative works listed automatically as
print-on-demand merchandise in the PuniCodex Store. Sales revenue is split
between the creator and the platform.

## Consent terms (plain language)

The upload form in the Creator Studio (`/scholars/creatives/`) carries an
**unchecked-by-default** checkbox. Ticking it means:

- If the work is approved by reviewers, it **may be listed as PuniCodex
  merchandise** (posters first) in the Store.
- The creator is **attributed by name and university** on every listing
  ("Created by {name} · {university}").
- The creator earns **50% of the net margin** on every sale (see below).
- The creator can **withdraw any work at any time** from the asset list in the
  Creator Studio; withdrawal pulls the product from the Store immediately.

Consent is recorded server-side (`merch_consent`, `merch_consent_at` on
`creative_assets`) only after the API has re-verified the account
(`canSubmitCreative` — active student account, active institution sponsorship,
allowlisted department). The checkbox value alone is never trusted: the same
verification gate runs on upload, on the opt-in endpoint, and (implicitly) on
approval, since only consented works are listed.

## Revenue split

**50/50 of net margin**, where:

```
net margin = sale price − POD base cost − payment processing fees
```

Worked example: a **$28.00** shirt with a **$13.00** base cost and **~$1.12**
in payment processing fees leaves a **$13.88** net margin → **$6.94 to the
creator, $6.94 to the platform**. That lands ≈ **25% of the retail price** to
the creator — above typical royalty programs.

Rounding: the creator gets `floor(net / 2)` and the platform keeps the
remainder, so a **leftover odd cent goes to the platform**. A non-positive
margin (refund-level pricing) pays nobody.

Catalog defaults live in `platform/api/creator-merch.js` (`MERCH_PRODUCTS`)
and derive from the Printful figures in `docs/pod-integration.md` (top of each
base-cost range, conservative):

| Product | Price | Base cost |
|---|---|---|
| `poster` (default) | $29.00 | $11.00 |
| `tee` | $38.00 | $18.00 |
| `sticker` | $9.00 | $4.00 |

## Data model

Migration: `platform/db/migrate-creator-merch.js` (idempotent; runs in the
`db`/`db-init` scripts and on the `/api/v1/creatives` and `/api/store/products`
cold starts).

`creative_assets` gains three columns:

- `merch_consent INTEGER NOT NULL DEFAULT 0` — current consent flag
- `merch_consent_at TEXT` — when consent was last given (kept as an audit
  record after withdrawal)
- `merch_rev_share REAL NOT NULL DEFAULT 0.5` — creator share of net margin

New tables:

- `creator_products` — one row per consented work: `creative_asset_id`
  (unique FK), `creator_id`, denormalized `creator_name` /
  `creator_university`, `title`, `image_path` (the watermarked preview used
  for display), `product_type` (`poster`/`tee`/`sticker`), `price_cents`,
  `base_cost_cents`, `status` (`pending`/`live`/`withdrawn`), timestamps.
- `creator_order_ledger` — one row per paid order: unique `order_ref`,
  `product_id` FK, `gross_cents`, `base_cents`, `fees_cents`,
  `creator_share_cents`, `platform_share_cents`, `status`
  (`recorded`/`paid_out`/`refunded`), `created_at`. The unique `order_ref`
  makes webhook retries idempotent.

## API surface

Creatives API (`/api/v1/creatives`, `platform/api/creative-marketplace.js`):

- `POST /` (upload) — accepts `merchConsent: true`; consent recorded only
  after `canSubmitCreative` passes.
- `POST /:id/review` — on `approved` with `merch_consent = 1`, a live
  `creator_products` row is created in the same transaction.
- `POST /:id/merch/opt-in` (auth, creator only) — re-consent after upload;
  lists immediately if the asset is already approved. Re-checks
  `canSubmitCreative`.
- `POST /:id/merch/withdraw` (auth, creator only) — revokes consent and flips
  the product to `withdrawn`, which excludes it from the store endpoint.
- `GET /merch/earnings` (auth) — read-only earnings summary for the signed-in
  creator: lifetime `totalEarnedCents` plus a per-product breakdown (orders,
  gross, creator share). Refunded orders are excluded.

Storefront:

- `GET /api/store/products` (`api/store/products.js`) — public; returns live
  creator products shaped like the static `store/products.json` entries, plus
  a `creator: { name, university }` badge payload. `/js/store.js` merges these
  into the catalog and degrades to the static catalog if the endpoint fails.

## Order accounting and checkout status

`recordCreatorOrder({ orderRef, productId, grossCents, baseCents, feesCents })`
in `platform/api/creator-merch.js` computes the split **at order time** and
writes the ledger row (base cost defaults to the product's recorded POD base).
`handleMerchOrderPaid(order)` is the documented webhook stub that the future
POD order webhook should call.

**Live merch checkout is not wired yet.** Per `docs/pod-integration.md`, the
Printful sync worker and an `/api/webhook/printful` handler are Phase 2
operational steps (create the Printful manual-order store, set
`PRINTFUL_API_KEY`, sync products, swap the storefront CTA to live checkout).
Once that handler exists it should call `handleMerchOrderPaid` with the paid
order's figures. No Printful/Printify integration is fabricated here.

## Payouts

The ledger and earnings summary are the accounting layer only — **no money
moves yet**. The intended payout rail is **Stripe Connect**: each creator
onboards a Connect (Express) account, and the platform pays out accumulated
`creator_share_cents` on a schedule. Remaining operational steps:

1. Enable Stripe Connect on the platform account.
2. Add a Connect onboarding flow for creators (account link + KYC).
3. Store each creator's Connect account id and sweep `recorded` ledger rows
   into transfers, flipping them to `paid_out`.

Until then, earnings accrue in the ledger and are visible to the creator in
the Creator Studio ("Merch Earnings" section) and via
`GET /api/v1/creatives/merch/earnings`.

## Tests

`test/creator-merch.test.js` (registered in `test/run-all.js` as "Creator
Merch Tests") covers: consent recorded only for verified accounts,
approval-with-consent auto-listing, exact split math (including the odd-cent
rule and non-positive margins), withdrawal excluding products from the store
endpoint, idempotent order recording, and earnings summary totals.

# PUNICODEX Art Marketplace — Design Spec

**Status:** Design / preparation  
**Goal:** Let artists upload designs for PUNICODEX entries, display watermarked previews, and sell unmarked originals.  
**Relation to core:** A vertical that increases the value of every entry and gives artists a reason to contribute to the canonical name graph.

---

## 1. Overview

Each PUNICODEX entry is a cultural concept with visual potential. The art marketplace turns those concepts into licensable, collectible images. Buyers see a watermarked preview; after payment the original high-resolution file is released.

Key principles:
- **Watermark is non-removable from previews.** A visible, branded overlay plus a subtle forensic fingerprint (e.g., perceptual hash + user-specific metadata) makes leaks traceable.
- **Payments are simple.** Stripe Checkout for one-time purchases; artist payout on order completion.
- **Curation is light but required.** Uploaded art enters a moderation queue before it appears publicly.
- **Tie-in with entries.** Every temple page gets an "Art" tab showing available works for that name.
- **License is explicit.** Personal, commercial, or exclusive; stored on-chain in the order record.

---

## 2. User Stories

- **Artist:** "I painted an interpretation of Ártemis. I upload a 4K PNG, set a price of $120 for personal use / $400 for commercial, and the marketplace shows a watermarked preview. When someone buys, I receive payout minus platform fee."
- **Buyer:** "I am building a brand around Poseidôn. I browse the Poseidôn temple page, see a watermarked illustration I like, pay $400 for a commercial license, and receive the unmarked original plus a license PDF."
- **Visitor:** "I love the mythological art and want to collect limited-edition prints. I can favorite works, follow artists, and see new uploads on my home feed."
- **Admin:** "I review the moderation queue, approve/reject uploads, handle disputes, and set platform fee percentage."

---

## 3. Data Model

### `artworks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | |
| `entry_id` | TEXT FK → entries.id | The PUNICODEX concept this art depicts. |
| `artist_id` | TEXT FK → artists.id | |
| `title` | TEXT | |
| `description` | TEXT | |
| `status` | TEXT | `pending` / `approved` / `rejected` / `delisted` |
| `preview_path` | TEXT | Watermarked preview, public CDN path. |
| `original_path` | TEXT | Unmarked original, private/secure storage. |
| `fingerprint` | TEXT | Perceptual hash / forensic metadata signature. |
| `created_at` | INTEGER | Unix ms. |

### `artwork_licenses`
| Column | Type | Notes |
|--------|------|-------|
| `artwork_id` | TEXT FK | |
| `license_type` | TEXT | `personal` / `commercial` / `exclusive` |
| `price_cents` | INTEGER | |
| `is_active` | BOOLEAN | |

### `art_orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | |
| `artwork_id` | TEXT FK | |
| `license_type` | TEXT | |
| `buyer_email` | TEXT | |
| `price_cents` | INTEGER | |
| `platform_fee_cents` | INTEGER | |
| `artist_payout_cents` | INTEGER | |
| `stripe_session_id` | TEXT | |
| `status` | TEXT | `pending` / `paid` / `delivered` / `refunded` |
| `delivered_at` | INTEGER | |

### `artists`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | |
| `user_email` | TEXT | |
| `display_name` | TEXT | |
| `payout_email` | TEXT | Stripe Connect or PayPal. |
| `verified` | BOOLEAN | |

---

## 4. Upload & Watermark Flow

1. Artist submits original image (PNG/JPG/WebP, max 25 MB).
2. Server validates dimensions, file type, and malware (ClamAV or similar).
3. Server generates:
   - `preview`: downscaled to 1200px on long edge, overlaid with PUNICODEX watermark + artist name + translucent grid.
   - `original`: stored encrypted/private, untouched.
   - `fingerprint`: pHash + embedded buyer-agnostic metadata (artist ID, artwork ID, upload timestamp).
4. Artwork enters `pending` status.
5. Admin/mod curator approves.
6. Public preview appears on entry page and global gallery.

Watermarking can use `sharp` (already present in `node_modules`) or `canvas`. The watermark must be visible enough to deter theft but attractive enough to sell the piece.

---

## 5. Purchase & Delivery Flow

1. Buyer selects license type on the artwork page.
2. Server creates `art_order` row with `status = pending`.
3. Stripe Checkout session created with `success_url` and `cancel_url` pointing back to the order.
4. On `checkout.session.completed` webhook:
   - Mark order `paid`.
   - Generate a time-limited, signed download URL for the original file.
   - Email buyer the download link and license PDF.
   - Queue artist payout ( Stripe Connect transfer or manual batch payout).
5. Download link expires after 7 days or 3 downloads, whichever comes first.

---

## 6. Moderation & Trust

- All uploads go through a moderation queue before public display.
- Automated pre-checks: NSFW classifier, copyright fingerprint (TinEye/Google image search), file integrity.
- Human curator reviews for quality, accuracy (does the art match the entry?), and appropriateness.
- Rejected uploads are deleted; artist receives reason.
- Approved artists with good history can be "verified" and skip the queue for subsequent uploads.

---

## 7. Integration Points

- **Temple pages:** New "Art" tab on every `sites/{id}/` page listing approved artworks for that entry.
- **Search:** Artworks appear as a vertical in `search-v2` (e.g., "Images" vertical) and in knowledge panels.
- **Card game:** Artworks can be licensed as card illustrations; artists earn royalties when their art is used on a sold card pack.
- **API v1:** `GET /api/v1/entries/{id}/artworks`, `GET /api/v1/artworks`, `POST /api/v1/artworks` (artist auth), `POST /api/v1/artworks/{id}/purchase`.

---

## 8. Revenue Model

- Platform fee: 15–25% of sale price (configurable per artist tier).
- Payment processing: Stripe fees passed through.
- Optional "featured placement" fee for artists who want homepage promotion.
- Optional print-on-demand integration for physical prints (future).

---

## 9. Open Questions

- Should exclusive licenses delist the artwork from the marketplace permanently, or for a fixed term?
- Do we want on-chain provenance (NFT or attestation) or traditional licensing only?
- Should buyers be able to commission custom art for an entry?
- What is the review turnaround SLA we promise artists?

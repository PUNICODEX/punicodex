# PuniCodex — Print-on-Demand Integration (Printful)

**Status:** Phase 1 live (catalog rendered from `store/products.json` — 3,466
products: 266 temples × 13 product types across apparel / art-prints /
drinkware / accessories / relics, plus an 8-item PuniCodex house line).
**Provider:** Printful — chosen for API quality, global fulfillment, no upfront cost, and a generous free tier.

## Architecture

```
scripts/generate-pod-products.js   →  store/products.json  →  js/store.js (renderer)
        (reads js/archetypes-v2.js)      (canonical catalog)      (store/ page)
scripts/sync-printful-products.js  →  Printful API (phase 2 sync worker;
        resumable via session-debug/printful-sync-state.json)
```

- **Phase 1 (current):** the catalog lists each flagship's line (tee, hoodie,
  crewneck, art print, canvas, sticker set, enamel pin, mug, tumbler, tote,
  phone case, cap, notebook) built from the temple's three brand materials —
  mascot, logomark, logolockup — with per-product `design.placements`
  describing which material prints where. Products render on `/store/` with
  category tabs. Checkout is not yet open — the notify form collects emails
  for the launch.
- **Phase 2 (API):** set `PRINTFUL_API_KEY` in the Vercel env, then run
  `node scripts/sync-printful-products.js [--only <temple>] [--kinds ...]`
  to create real Printful products and write live `printfulProductId`s back
  into `store/products.json` (the generator preserves them on regeneration).
  `--refresh` updates print files on already-synced products.
- **Print masters:** temple PNG masters are excluded from the main deploy
  (`.vercelignore: sites/**/*.png`) and served from a dedicated static
  deployment (`punycodex-masters.vercel.app`, content: repo-local
  `.masters/`). The sync worker assigns files to Printful by URL.
- **Composites:** products whose design uses multiple materials in one
  print area (sticker sheet, canvas, tote, mug wrap, notebook) use
  pre-composited print files built by
  `scripts/generate-merch-composites.js` (jimp, hermite upscaling).
  Composite binaries are gitignored (5.3 GB, regenerable) but deployed
  with the masters project.

## Phase 2 checklist

1. Create a Printful account → connect a "manual order" store.
2. Add `PRINTFUL_API_KEY` to Vercel (Production + Preview).
3. Sync worker (to be added): for each product in `store/products.json`,
   `POST /v2/products` with the temple mascot as the print file (mascots are
   3000×3000 PNG masters under `sites/{id}/assets/` — note: only the deployed
   `.webp` is public; use the local PNG masters for uploads).
4. Write the returned product IDs back into `store/products.json`
   (`printfulProductId`), regenerate, and swap the CTA from "Print on demand"
   to live checkout buttons.
5. Orders then flow Printful-side; webhooks (`/api/webhook/printful`) update
   order status for the future account dashboard.

## Pricing guidance

| Product | Base cost (Printful) | Catalog price | Margin |
|---|---|---|---|
| Temple Tee | ~$15–18 | $38 | ~$20 |
| Art Print 30×40 | ~$8–11 | $29 | ~$18 |
| Sticker Set | ~$3–4 | $9 | ~$5 |

Margins fund the corpus (new domains + hosting). Review quarterly with the
analytics reports promised to sponsors.

## Creatives tie-in

The `/creatives/` marketplace already produces student-made temple designs.
Phase 2 adds a "print this design" CTA on creatives cards, routing approved
student work into the same POD pipeline with a royalty share for the student.

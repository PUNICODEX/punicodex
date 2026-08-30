# Quarterly Unicode Herald — Q3 2026 First Edition (Digital Book)

## Classification

Architectural: a multi-page generated publication subsystem with its own canonical data source, generator, shared templates/styles, tests, and sitemap integration.

## Goal

Publish the first edition of *The Unicode Herald* as a styled digital book at `/herald/`. The book has a cover/table-of-contents page plus individual chapter pages, each with prev/next navigation, unified typography, and a print-friendly stylesheet. It tells the PuniCodex origin story from May 2026 through the 542-flagship milestone while previewing sponsors, patrons, the store, the card game, university collaboration, and the product roadmap.

## Non-goals

- Not a dynamic CMS or runtime newsletter manager.
- Not a physical print pipeline (only print-CSS).
- Not a subscription checkout.

## Canonical source

`data/herald-editions.json` — an array of edition objects. The latest edition drives all `/herald/*` pages.

```json
{
  "editions": [{
    "id": "q3-2026",
    "volume": 1,
    "number": 1,
    "quarter": "Q3 2026",
    "label": "Inaugural Issue",
    "publishedAt": "2026-09-01",
    "originDate": "2026-05-25",
    "masthead": { "title": "...", "subtitle": "..." },
    "cover": { "headline": "...", "dek": "...", "body": ["..."] },
    "fleet": { "entries": 980, "flagships": 542, "pantheons": 25, "domainsOwned": 352 },
    "analytics": { "period": "90 days", "humanViews": 19499, ... },
    "trending": { ... },
    "chapters": [
      { "slug": "introduction", "title": "...", "subtitle": "...", "body": [...] },
      { "slug": "by-the-numbers", "title": "...", "sections": [...] },
      ...
    ]
  }]
}
```

## Generated pages

| Path | Purpose |
|------|---------|
| `/herald/` | Cover + table of contents |
| `/herald/introduction/` | Editor's letter / origin story |
| `/herald/by-the-numbers/` | Fleet counts, 90-day analytics, trending temples |
| `/herald/new-features/` | Screen guide, pantheon landing pages, domainless flagships |
| `/herald/sponsors-patrons/` | Sponsorship & patronage model |
| `/herald/universities/` | University collaboration update |
| `/herald/reliquary/` | POD store progress |
| `/herald/mythic-duel/` | Cards & duel game status |
| `/herald/roadmap/` | Looking ahead |
| `/herald/colophon/` | Credits, print note, HEKAWEB credit |

## Generator

`scripts/generate-herald.js` reads the edition, resolves temple names/logos, and writes all pages under `herald/`.

Shared partials live in `templates/herald/partials/` (head, nav, footer, book-nav). Chapter bodies use `templates/herald/chapter.html` and the cover uses `templates/herald/cover.html`.

## Styling

`css/herald-book.css` provides:
- Book-style typography with serif display face, generous whitespace, drop caps.
- Table of contents as a styled chapter list with page numbers/estimates.
- Prev/next chapter navigation.
- Print media query that hides nav/footer and inverts to high-contrast.

## Integration

- Added to `scripts/generate.js` after `generate-blog-index.js`.
- Sitemap includes `/herald/` and all chapter paths.
- Nav/footer link to `/herald/`.
- Tests: `test/herald-page.test.js` verifies every chapter exists, has valid JSON-LD, and navigation links work.

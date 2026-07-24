# PuniCodex — Enterprise Brand Kit v1.0

Complete brand and website theme materials for **punicodex.com** (formerly Punycodex).
Every logo is pure ASCII ("PUNICODEX" / "PuniCodex") — no Unicode characters anywhere in the artwork.
All PNGs are transparent unless noted. Everything renders at 4× supersampling for crisp edges at any size.

## Kit map

```
punicodex-brand-kit/
├── 01-logos/                 Wordmarks, emblem, lockups (transparent PNG + SVG)
│   ├── punicodex-wordmark-gold.png          3600px · metallic gradient gold
│   ├── punicodex-wordmark-gold-solid.png    3600px · flat #D4AF37
│   ├── punicodex-wordmark-ivory.png         3600px · for busy/photo backgrounds
│   ├── punicodex-wordmark-obsidian.png      3600px · for light backgrounds
│   ├── punicodex-wordmark-camel-gold.png    3600px · "PuniCodex" editorial form
│   ├── punicodex-tagline-gold.png           2400px · "THE UNICODE PANTHEON"
│   ├── punicodex-emblem-gold.png            1600px · ring + column + mark
│   ├── punicodex-emblem-ivory.png           1600px
│   ├── punicodex-emblem-obsidian.png        1600px
│   ├── punicodex-emblem-glyph-gold.png      1600px · ringless glyph for small sizes
│   ├── punicodex-emblem.svg                 vector · infinitely scalable
│   ├── punicodex-lockup-stacked-gold.png    emblem / wordmark / tagline
│   └── punicodex-lockup-horizontal-gold.png emblem + wordmark + tagline
├── 02-favicons/              favicon.svg, ICO (16–256), PNGs 16–512, apple-touch-icon
├── 03-ornaments/             greek-key strip, diamond divider, laurel wreath,
│                             medallion frame, empty-portrait placeholder,
│                             gold radial glow, gold dust overlay
├── 04-badges/                tier seals: TIER I, TIER II, DUAL-TIER (1000px)
├── 05-social/                OG image 1200×630, social avatar 1024 (obsidian, non-transparent),
│                             brand board (presentation sheet)
├── 06-code/                  punicodex-tokens.css · tokens.json · site.webmanifest
│                             · integration-snippets.html
├── 07-fonts/                 Cinzel + Cormorant Garamond (OFL) for self-hosting
├── 08-seals-stamps/          official seal (circular inscription) · awaiting-restoration stamp
├── 09-patterns/              seamless tessellation tile (subtle diamond lattice, 800px)
├── 10-motion/                punicodex-loader.svg (animated, pure SMIL) · punicodex-motion.css
├── 11-print/                 certificates (authenticity + appraisal, A4 300dpi) ·
│                             business card front/back (300dpi) · A4 letterhead
├── 12-social-templates/      X header 1500×500 · post 1080² · story 1080×1920
├── BRAND_GUIDELINES.md       the full brand system
├── SITE_AUDIT.md             page-by-page review of punicodex.com + fix list
└── README.md                 this file
```

**v1.1 additions:** official seal, restoration stamp, tessellation pattern, animated
loader + motion CSS, certificates, business card, letterhead, social templates,
mask-icon + web manifest.

## Quickstart with Kimi Code CLI

1. Copy the kit into your site repo, e.g. `assets/brand/`.
2. Swap the header/footer wordmark: replace the old **PŪNYCODEX** text with
   `01-logos/punicodex-wordmark-gold.png` (or the horizontal lockup) — see `06-code/integration-snippets.html` §3–4.
3. Replace favicon tags with snippet §1 and add OG tags §2.
4. Import `06-code/punicodex-tokens.css` globally; utilities (`pc-kicker`, `pc-btn-gold`,
   `pc-card`, `pc-medallion`, `pc-divider`, `pc-keyband`, `pc-atmosphere`) map 1:1 to existing components.
5. Fix empty pantheon portraits with `03-ornaments/punicodex-empty-portrait.png` (snippet §5).
6. Self-host fonts from `07-fonts/` or use the Google Fonts link (snippet §9).

## The mark

**The Restored Column** — a fluted temple column (the temples you build) crowned by the
floating diamond: the restored diacritic, the mark that matters, held above the structure
exactly the way an accent sits above a letter. The double ring is the pantheon medallion
and the golden ratio circle already living in your hero.

Read `SITE_AUDIT.md` before editing templates — it maps every asset to the exact page and
problem it solves.

## v3.0 — 13-page-visuals/ (3D page art + hero loop)

26 page-attuned 3D renders (raymarched gold metalwork, transparent PNG) — one signature
object per page: celestial torus knot (home, plus a seamless MP4 hero loop), dodecahedron
council (pantheon), Bifrost stair (realms), Möbius ribbon (lexicon), Hopf link
(connections), cursor monolith (type), triad ziggurat (tiers), icosahedron (codex), node
lattice (API), golden brilliant (store), eclipse spark (about), beacon flame (contact),
lens (search), armillary sphere (oracle), balance (appraise), cylinder seal (authenticity),
nib (scholars), muse flame + empty pedestal (creatives), academy temple + feature icons
(sponsorship), portal ring (temple template), sealed tablet (legal), toppled column (404).

**Read `13-page-visuals/PLACEMENT-GUIDE.txt` first** — it maps every asset to its exact
page, DOM position, sizing, alt text and CSS, and lists the bugs found in the full crawl
(broken /realms/ nav, /api/ + /scholars/ 404s, emoji in production UI, heading breaks).

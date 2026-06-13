# PUNYCODEX — Temple to Ad Homepage Conversion

> **Version 5.0 — Automated**
>
> One command converts any temple. No manual steps. No copy-paste. No color identification.

## Quick Start

```bash
# Convert a single temple
node scripts/create-flagship.js zeus

# Convert 5 temples (test batch)
node scripts/convert-all-temples.js --limit=5

# Preview what would be converted (no files written)
node scripts/convert-all-temples.js --dry-run

# Convert ALL remaining temples
node scripts/convert-all-temples.js
```

## What the Script Does

1. **Detects temple type** — flagship (local CSS/JS) vs generated (shared temple-base)
2. **Extracts identity** — colors, sections, canvas ID, meta tags from existing temple
3. **Generates ad homepage** — 13 slots, booking modal, endorsement hero
4. **Generates lore page** — temple sections moved to lore template
5. **Generates gallery page** — visual collection template
6. **Generates dashboard** — advertiser dashboard
7. **Merges CSS** — base styles + Nike ad blocks + auto color replacement
8. **Merges JS** — base scripts + Nike booking system
9. **Auto-replaces colors** — Nike navy/gold → temple palette
10. **Auto-generates slot names** — archetype-themed from lexicon data
11. **Validates** — CSS variables, clone DNA, links
12. **Creates backup** — timestamped backup in `.backup/`

## Color Replacement (Fully Automated)

The script reads the temple's existing palette and maps Nike's colors:

| Nike Color | Temple Replacement | Source |
|------------|-------------------|--------|
| `#0a121f` | Darkest background | `--void-deep` or `#050505` |
| `rgba(10,18,31,X)` | Page background | `--void` or `#0A0A0A` |
| `rgba(14,26,43,X)` | Card surface | `--storm` or derived |
| `rgba(212,175,55,X)` | Primary accent | `--primary` or `--gold` |
| `rgba(27,58,92,X)` | Secondary accent | `--secondary` or `--lightning` |

For generated temples, pantheon colors are looked up from `generate-temples.js`.

## Slot Name Generation

Slot names are auto-generated from the lexicon entry:
- **Domain words** (e.g., "Sky, Thunder, King of Gods")
- **Meaning words** (e.g., "Bright, day")
- **Pantheon fallbacks** (e.g., "Olympus, Divine, Eternal, Sacred")

Example for Zeus:
```
01 Sky Crown        07 Gods Ribbon       12 Sky Foundation
02 Thunder Column   08 Sky Seal          13 Thunder Dominion
03 King Banner      09 Thunder Inscription
04 Sky Frame I      10 King Emblem
05 Thunder Frame II 11 Gods Sigil
06 King Frame III
```

## Canvas Policy

- **Ad homepage (`index.html`)**: NO canvas element
- **Lore page (`lore/index.html`)**: Canvas with temple's original ID
- **Gallery page (`gallery/index.html`)**: Same canvas as lore

## Navigation Policy

- **All pages**: `.global-strip` class-based global nav (standardized)
- **All pages**: `nav.main-nav.tab-nav` with Home/Lore/Gallery tabs
- **Inline fixed nav** from base temples is removed

## Manual Override

```bash
# Custom slot names via file
node scripts/create-flagship.js zeus --dry-run
```

`zeus-slots.json`:
```json
[
  "Crown of Olympus",
  "Thunder Column",
  "Lightning Strip",
  ...
]
```

## Architecture

```
scripts/
├── create-flagship.js          # Master script (single temple, validated)
├── convert-all-temples.js      # Batch script (all temples)
└── ad-conversion/
    └── extractors/
        └── colors.js           # Auto-extract palette
```

## Validation

After conversion, the script checks:
- ✅ All `var(--*)` references have definitions
- ✅ No Nike/Hermes/Ra/Akh clone DNA
- ✅ No hardcoded Nike colors (`#0a121f`, etc.)
- ✅ Canvas only in lore/gallery
- ✅ Double navbar absent
- ✅ Font preserved (not overridden by Montserrat)

## Restoring from Backup

Each conversion creates a timestamped backup:
```bash
# List backups
ls sites/zeus/.backup/

# Restore
$backup = (Get-ChildItem sites/zeus/.backup | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Copy-Item "$backup/index.html" sites/zeus/index.html
Copy-Item "$backup/styles.css" sites/zeus/styles.css
Copy-Item "$backup/script.js" sites/zeus/script.js
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Missing CSS variables | `--black` or other var undefined | Script auto-adds `--black: #000000` |
| Clone DNA detected | Nike slot names leaked | Script uses placeholder strategy to avoid substring collisions |
| Slot names generic | Not enough theme words | Add `--slots-file` with custom names |
| Canvas missing in lore | No canvas in original temple | Uses `particle-canvas` fallback |
| Font wrong | Montserrat override | Script preserves temple's `--font-body` |

## Test Results

| Temple | Type | Result |
|--------|------|--------|
| zeus | Flagship | ✅ Pass |
| aaru | Generated | ✅ Pass |
| apollon | Dual-tier (dry) | ✅ Pass |
| Batch (5 temples) | Mixed | ✅ All pass |

---

*Document version: 5.0*
*Automation date: 2026-06-09*

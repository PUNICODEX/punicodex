# PUNYCODEX — Temple-to-Ad Homepage Conversion Guide

> **Purpose:** Convert any regular temple (`/sites/{id}/`) into a revenue-generating advertising homepage with 13 leaseable slots, a booking modal, and archetype-specific animations.
>
> **Scope:** 51 remaining temples (3 of 54 complete: Nike, Hermès, Ra)
>
> **Non-negotiable:** All file edits must preserve Unicode. Use Node.js scripts with explicit `utf8` encoding. PowerShell `Get-Content`/`Set-Content` corrupts Greek/Egyptian characters.

---

## ⚠️ The Clone Trap (READ FIRST)

**The most common and embarrassing mistake:** Copying the most recently converted temple (e.g., Ra) and running string replacements to create the next one (e.g., Akh). This produces a **Frankenstein** — the new temple looks correct on the surface but is riddled with the old temple's DNA: wrong slot names, wrong mythology in lore, wrong colors, wrong symbols, and wrong hero copy.

**Real example:** Akh (Anubis, death/afterlife) was initially converted from Ra (sun god). The result had "Solar Disk," "Falcon's Wing," and "Scarab" as slot names. The lore described the sun barge, Khepri the scarab, and the self-created sun god. The CSS had emerald-green solar gradients. It was Ra wearing an Akh mask.

**Prevention:**
1. Never copy the *most recent* conversion. Use Nike (the canonical base) or build from the original temple's pre-conversion HTML.
2. The Archetype Worksheet (Section 1) is **mandatory**, not optional. Fill it before touching code.
3. After automation, run the **Content Residue Check** (Section 8.4) to catch leaked archetype DNA.
4. Lore and gallery must be **authored, not replaced**. String-replaced mythology is poison.

---

## Table of Contents

1. [Pre-Flight: Archetype Worksheet](#1-pre-flight-archetype-worksheet)
2. [Database: Seed 13 Slots](#2-database-seed-13-slots)
3. [Step 1 — Copy Base Template](#3-step-1--copy-base-template)
4. [Step 2 — HTML Home Page Conversion](#4-step-2--html-home-page-conversion)
5. [Step 3 — CSS Merge + Archetype Animations](#5-step-3--css-merge--archetype-animations)
6. [Step 4 — JS Booking System Integration](#6-step-4--js-booking-system-integration)
7. [Step 5 — Lore + Gallery Pages](#7-step-5--lore--gallery-pages)
8. [Step 6 — Unicode-Safe Mass Edits](#8-step-6--unicode-safe-mass-edits)
9. [Step 7 — Testing Checklist](#9-step-7--testing-checklist)
10. [Step 8 — Cache-Bust, Commit, Deploy](#10-step-8--cache-bust-commit-deploy)
11. [Reference: Slot Numbering Map](#11-reference-slot-numbering-map)
12. [Reference: Animation Design System](#12-reference-animation-design-system)

---

## 1. Pre-Flight: Archetype Worksheet

Before touching code, define these 6 values. They drive every customization decision.

| # | Question | Example (Nike) | Example (Hermès) | Example (Ra) | Example (Akh) |
|---|----------|---------------|------------------|--------------|---------------|
| 1 | **Archetype name** | Victory | Speed/Messenger | Sun/Fire | Death/Afterlife |
| 2 | **Primary symbol** Unicode | `✦` (victory star) | `⚕` (caduceus) | `☉` (sun disk) | `☥` (ankh) |
| 3 | **Symbol animation** | Wingbeat pulse (scale ±15%, rotate ±5°) | Slow rotation (360° over 8s) | Pulse glow (scale 1→1.2→1) | Gentle rotation + glow (scale 1→1.15→1) |
| 4 | **Background color** | Deep charcoal `#0A0A0A` | Deep emerald `#0A120A` | Warm brown `#0A0806` | Pure black `#050505` |
| 5 | **Shimmer color accent** | Pure gold `#D4AF37` | Silver-gold `#C0C0C0` | Amber `#FFB43C` | Gold `#C9A227` |
| 6 | **Slot names (13 total)** | Crown Position, Victory Column, Champion Strip… | Winged Crown, Herald's Column, Traveler's Strip… | Solar Disk, Horizon Throne, Falcon's Wing… | Jackal Crown, Canopic Column, Threshold Strip… |
| 7 | **Mascot asset path** | `assets/nike_mascot.png` | `assets/hermes_mascot.png` | `assets/ra_mascot.png` | `assets/akh_mascot.png` |
| 8 | **Hero endorsement line** | "Endorsed by the Goddess of Victory, Níkē" | "Endorsed by the Messenger of the Gods, Hermês" | "Endorsed by the Sun God, Rꜥ" | "Endorsed by the Guardian of the Dead, Ꜣḫ" |

**Output:** Fill in `scripts/archetype-registry.js` (create if missing) so future scripts can look up these values programmatically.

**Slot name rule:** Every one of the 13 slot names must evoke the archetype. Generic names like "Content I" or "Text I" are acceptable only for slots 9–12 (the smaller emblems/footer). Slots 1–8 must be archetype-themed. If you find yourself writing "Solar Disk" for a death god, you have fallen into the Clone Trap.

---

## 2. Database: Seed 13 Slots

Each temple needs 13 rows in `ad_slots`. IDs are globally unique — never reuse.

### 2.1 Determine your ID block

Consult the [Slot Numbering Map](#11-reference-slot-numbering-map) to find the next free block of 13 IDs.

As of this writing:
- Nike: 1–13
- Hermès: 14–26
- Ra: 27–39 (seeded manually if migration missing)
- Next temple: **40–52**

### 2.2 Add migration script

Create `platform/db/migrate-{temple}-slots.js`:

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

const SITE_SLUG = 'zeus';        // ← change per temple
const START_ID = 40;             // ← change per temple (next free block)

// Verify block is unused
const existing = db.prepare('SELECT COUNT(*) as c FROM ad_slots WHERE id BETWEEN ? AND ?')
  .get(START_ID, START_ID + 12);

if (existing.c > 0) {
  console.log(`Slots ${START_ID}-${START_ID + 12} already exist. Skipping.`);
  process.exit(0);
}

const insert = db.prepare(`
  INSERT INTO ad_slots (id, name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle, site_slug)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Slot definitions: same layout/prices as Nike/Hermès, but names customized to archetype
const slots = [
  [START_ID + 0,  'Crown Position',     '{slug}-crown',       1136, 379, 120000, '1200:400', 1, 0, SITE_SLUG],
  [START_ID + 1,  'Column',             '{slug}-column',       260, 520, 80000,  '300:600',  2, 0, SITE_SLUG],
  [START_ID + 2,  'Strip',              '{slug}-strip',        844, 317, 60000,  '800:300',  3, 0, SITE_SLUG],
  [START_ID + 3,  'Content I',          '{slug}-content-1',    600, 280, 50000,  '600:280',  4, 0, SITE_SLUG],
  [START_ID + 4,  'Content II',         '{slug}-content-2',    500, 280, 40000,  '500:280',  5, 0, SITE_SLUG],
  [START_ID + 5,  'Ribbon',             '{slug}-ribbon',       700, 180, 35000,  '700:180',  6, 0, SITE_SLUG],
  [START_ID + 6,  'Badge',              '{slug}-badge',        400, 150, 30000,  '400:150',  7, 0, SITE_SLUG],
  [START_ID + 7,  'Text I',             '{slug}-text-1',       350, 120, 25000,  '350:120',  8, 0, SITE_SLUG],
  [START_ID + 8,  'Text II',            '{slug}-text-2',       350, 120, 18000,  '350:120',  9, 0, SITE_SLUG],
  [START_ID + 9,  'Emblem I',           '{slug}-emblem-1',     250, 100, 15000,  '250:100',  10, 0, SITE_SLUG],
  [START_ID + 10, 'Emblem II',          '{slug}-emblem-2',     250, 100, 12000,  '250:100',  11, 0, SITE_SLUG],
  [START_ID + 11, 'Footer',             '{slug}-footer',       700, 180, 30000,  '700:180',  12, 0, SITE_SLUG],
  [START_ID + 12, 'Throne',             '{slug}-throne',      1200, 400, 515000, '1200:400', 13, 1, SITE_SLUG],
];

// Replace {slug} placeholders
for (const row of slots) {
  row[2] = row[2].replace('{slug}', SITE_SLUG);
  insert.run(row);
}

// Seed bundle_members for throne slot (throne ID → member IDs 1-12 within this site's block)
const bundleId = START_ID + 12;
const memberStmt = db.prepare('INSERT OR IGNORE INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)');
for (let i = 0; i < 12; i++) {
  memberStmt.run(bundleId, START_ID + i);
}

console.log(`Seeded 13 ${SITE_SLUG} ad_slots (IDs ${START_ID}-${START_ID + 12})`);
db.close();
```

Run it:
```bash
node platform/db/migrate-zeus-slots.js
```

Verify in `punycodex.db`:
```sql
SELECT id, name, site_slug, price_cents FROM ad_slots WHERE site_slug = 'zeus';
```

---

## 3. Step 1 — Copy Base Template

Use **Nike** as the canonical base (most complete, least domain-specific). Copy to the new temple directory.

```bash
# From project root
cp -r sites/nike sites/zeus
```

**Why Nike?** Nike's slot names (Crown Position, Victory Column, Champion Strip) are generic enough that they don't leak Greek/Nike-specific DNA into unrelated archetypes. Copying Ra for Akh produced "Solar Disk" and "Scarab Badge" — completely wrong for a death god. Copying Hermès would produce "Winged Crown" and "Caduceus Badge" — also wrong. Nike is the safe default.

### 3.1 Immediate cleanup in new directory

Delete Nike-specific assets that will be replaced:
```bash
rm sites/zeus/assets/nike_mascot.png
rm sites/zeus/assets/nike_mascot.webp
# Keep the placeholder/structure, replace content
```

---

## 4. Step 2 — HTML Home Page Conversion

File: `sites/{temple}/index.html`

### 4.1 Hero rebranding

Replace:
- `<title>` — use temple's Unicode name
- `<meta name="description">` — archetype-specific
- `<meta property="og:*">` — canonical URL, title, description
- Schema.org JSON-LD — name, URL, description
- `.endorsement-eyebrow` text
- `.endorsement-title` — `<h1>` with Unicode name
- `.endorsement-lead` — archetype tagline
- `.endorsement-mascot-img` `src`/`srcset` — point to new mascot asset
- `.global-brand` link text (if global strip exists)

### 4.2 Slot structure (13 slots)

The HTML has a fixed layout. **Do not change the DOM structure** — only change:
- `data-space` values → your ID block (e.g., 40–52)
- `data-price-cents` values → match database (copy from Nike/Hermès, they're identical)
- `.space-name` text → **archetype-themed slot names (mandatory)**
- `.space-dims` text → dimensions (same for all temples)

**CRITICAL:** The slot names are the most visible archetype signal. "Solar Disk" on a death-god temple is an immediate credibility destroyer. Every slot name must pass the sniff test: *would this word appear in a museum exhibit about this god?*
- ❌ Ra → Akh: "Solar Disk," "Horizon Throne," "Falcon's Wing" — these are Ra's domains
- ✅ Akh slot names: "Jackal Crown" (Anubis's head), "Canopic Column" (embalming jars), "Threshold Strip" (boundary between worlds), "Scales Badge" (weighing of the heart)

**Critical:** `data-space` must be **zero-padded 2 digits** for slots 01–09, plain for 10+. The JS does `parseInt(dataset.space, 10)` which handles both.

Example slot 1:
```html
<div class="space-slot" data-space="40" data-price-cents="120000">
    <div class="space-meta">
        <span class="space-num">01</span>
        <div class="space-info">
            <span class="space-name">Thunder Crown</span>
            <span class="space-dims">1136 × 379 px</span>
        </div>
    </div>
    <div class="space-frame space-frame--hero">
        <div class="space-frame-glow"></div>
        <div class="space-frame-content">
            <span class="space-placeholder-logo">◆</span>
        </div>
    </div>
</div>
```

### 4.3 Booking modal

The modal HTML is generic. Only change:
- Modal title prefix ("Reserve" stays, the `<span id="booking-slot-name">` is injected by JS)
- Any archetype-specific copy inside the modal steps

### 4.4 Nav links

Update nav links to point to the temple's own lore/gallery:
```html
<a href="lore/" class="nav-link">Lore</a>
<a href="gallery/" class="nav-link">Gallery</a>
```

### 4.5 Cache-bust query string

Change `?v=perf37` (or whatever Nike has) to a new version for this temple, e.g. `?v=perf1`.

---

## 5. Step 3 — CSS Merge + Archetype Animations

File: `sites/{temple}/styles.css`

### 5.1 Base CSS is already copied from Nike

Nike's CSS is the merged result of temple styles + advertising styles. You generally **do not need to rewrite CSS from scratch** — **BUT** you must change the color palette to match the archetype.

**Color traps to avoid:**
- Copying Ra's CSS for a non-solar Egyptian god leaves warm brown/gold `void-*` variables and green gradient accents. Anubis (death) needs pure black. Thoth (wisdom) needs midnight blue.
- Copying Hermès leaves emerald-green canvas backgrounds. Apollo (music/light) needs warm amber.
- Always update `--void-deep`, `--void-mid`, `--void-light` to match the archetype's emotional temperature.

**⚠️ CSS VARIABLE TRAP — NEW (post-Akh fix)**

When you merge ad-slot CSS from Nike/Hermès/Ra into a new temple, the merged styles reference dozens of custom properties (`--nav-height`, `--space-md`, `--classic-gold`, `--bg-primary`, `--text-muted`, `--gradient-card`, `--shadow-gold`, etc.). If the target temple's `:root` does not define these, every `var(--*)` becomes **invalid at computed-value time** — the browser silently drops the entire declaration.

**Real damage from Akh:**
- `--nav-height` missing → `padding-top: calc(40px + var(--nav-height) + 3rem)` invalid → hero content flush against navbar
- `--space-md` missing → `padding: 0 var(--space-md)` invalid → `.container` has no horizontal padding
- No global `img { display: block }` → Hermes has it, Akh didn't → endorsement mascot rendered as inline instead of block, causing horizontal centering drift

**Prevention:**
1. After merging CSS, run the variable audit (Section 5.1.1).
2. Add **all** missing variables to the target's `:root`, mapping them to the archetype's palette (not the source's).
3. Ensure the target has the same global reset as the source — especially `img { max-width: 100%; display: block; }`.
4. Verify `.container` matches the source: `max-width`, `margin: 0 auto`, **and `padding: 0 var(--space-md)`**.

#### 5.1.1 CSS Variable Audit Script

Run this after any CSS merge to catch undefined variables:

```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('sites/{temple}/styles.css', 'utf8');
const uses = [...css.matchAll(/var\\(--([\\w-]+)\\)/g)].map(m => m[1]);
const defs = [...css.matchAll(/--([\\w-]+)\\s*:/g)].map(m => m[1]);
const missing = [...new Set(uses)].filter(v => !new Set(defs).has(v));
if (missing.length) {
  console.error('MISSING VARS:', missing.sort().join(', '));
  process.exit(1);
} else {
  console.log('All CSS variables defined ✓');
}
"
```

**Required variables every converted temple must define** (adapt values to archetype):

```css
:root {
  /* Layout & Spacing */
  --max-width: 1200px;
  --nav-height: 72px;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 6rem;
  --space-2xl: 8rem;

  /* Accent (archetype-specific) */
  --classic-gold: #D4AF37;      /* or solar amber, lapis, saffron, etc. */
  --pale-gold: #E8D5A3;
  --gold-dim: #B8983C;
  --gold-bright: #F0D070;
  --text-gold: #D4AF37;

  /* Surfaces (archetype-specific) */
  --bg-primary: #0a0512;
  --bg-secondary: #0e0a18;
  --bg-nav: rgba(10, 5, 18, 0.95);
  --bg-card: rgba(16, 12, 24, 0.8);
  --bg-elevated: #1a1028;

  /* Text */
  --text-primary: #e8e0f0;
  --text-secondary: #a098b0;
  --text-muted: #6a6080;
  --font-greek: 'Georgia', 'Times New Roman', serif;

  /* Gradients & Shadows */
  --gradient-card: linear-gradient(135deg, rgba(16,12,24,0.85), rgba(8,5,12,0.92));
  --gradient-gold: linear-gradient(135deg, var(--classic-gold), var(--gold-bright));
  --shadow-gold: 0 0 30px rgba(212, 175, 55, 0.15);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.4);

  /* States */
  --success: #4ade80;
}
```

### 5.2 Archetype-specific animation block

Find the block starting with:
```css
/* ═══════════════════════════════════════════════════════════════
   ARCHETYPE ANIMATIONS — NIKE
   ═══════════════════════════════════════════════════════════════ */
```

Replace with your temple's animation block. The structure must stay identical — only the keyframes and symbol change.

**Template:**

```css
/* ═══════════════════════════════════════════════════════════════
   ARCHETYPE ANIMATIONS — {TEMPLE_UPPERCASE}
   ═══════════════════════════════════════════════════════════════ */

/* Frame is the interactive element */
.space-frame {
    cursor: pointer;
}

/* Shimmer sweep across frame */
.space-frame::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.06), transparent);
    transform: skewX(-20deg);
    animation: shimmer-sweep 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
}

/* Archetype symbol replaces diamond */
.space-placeholder-logo {
    font-size: 0;
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
}
.space-placeholder-logo::before {
    content: '{SYMBOL}';
    font-size: 1.1rem;
    color: var(--classic-gold);
    animation: {temple}-symbol 3s ease-in-out infinite;
    display: block;
}

/* Floating particles inside frame */
.space-frame-content::before {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: {PARTICLE_COLOR};
    top: 60%;
    left: 25%;
    animation: float-up 4s ease-in-out infinite;
    pointer-events: none;
}

/* Elegant "Available" hover label */
.space-frame-content::after {
    content: 'Available';
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    font-family: var(--font-display);
    font-size: clamp(0.28rem, 0.7vw, 0.5rem);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(212,175,55,0.5);
    opacity: 0;
    transition: all 0.35s ease;
    pointer-events: none;
    white-space: nowrap;
}
.space-frame:hover .space-frame-content::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    color: rgba(212,175,55,0.75);
}

/* Refined glow on hover */
.space-frame:hover {
    border-color: rgba(212,175,55,0.25);
    box-shadow: 0 0 20px rgba(212,175,55,0.06), inset 0 0 30px rgba(212,175,55,0.03);
}
.space-frame:hover .space-frame-glow {
    opacity: 0.7;
}

/* ─── Symbol keyframes (customize per archetype) ─── */
@keyframes {temple}-symbol {
    0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); }
    25% { transform: scale(1.15) rotate(5deg); filter: drop-shadow(0 0 8px rgba(212,175,55,0.6)); }
    50% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(212,175,55,0.4)); }
    75% { transform: scale(1.15) rotate(-5deg); filter: drop-shadow(0 0 8px rgba(212,175,55,0.6)); }
}

/* ─── Shared keyframes (identical for all temples) ─── */
@keyframes shimmer-sweep {
    0% { left: -100%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: 200%; opacity: 0; }
}
@keyframes float-up {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    15% { opacity: 0.6; }
    85% { opacity: 0.6; }
    100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
}
@keyframes available-pulse {
    0%, 100% { opacity: 0.25; transform: translateX(-50%) translateY(4px) scale(0.92); }
    50% { opacity: 0.85; transform: translateX(-50%) translateY(0) scale(1); }
}
```

### 5.3 Mobile "Available" pulse stagger

In the `@media (max-width: 768px)` block, ensure the staggered `animation-delay` rules exist. They create the "random pulse" effect on mobile. These are identical for all temples:

```css
@media (max-width: 768px) {
    .space-frame-content::after {
        opacity: 0.5;
        animation: available-pulse 3.5s ease-in-out infinite;
    }
    .space-slot:nth-child(1) .space-frame-content::after { animation-delay: 0s; }
    .space-slot:nth-child(2) .space-frame-content::after { animation-delay: 0.7s; }
    /* … through nth-child(13) … */
}
```

### 5.4 Mobile column fix

Ensure the sidebar column override is present:

```css
@media (max-width: 768px) {
    .space-row--sidebar .space-frame--column {
        flex: 1;
        aspect-ratio: auto;
        min-height: 0;
    }
}
```

---

## 6. Step 4 — JS Booking System Integration

File: `sites/{temple}/script.js`

### 6.1 The JS is 95% generic

Only these 4 values change per temple:

```javascript
// Line ~699
async function loadSlots() {
  const res = await fetch(`${API_BASE}/api/slots?site=zeus`);  // ← site slug
}

// Line ~861
const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);

// Line ~1036
els.dashboardLink.href = `${API_BASE}/sites/zeus/dashboard/?token=${token}`;  // ← site slug

// Line ~1261
loadSlots();
```

**No other JS changes are required.** The booking modal, Stripe flow, verification, and upload logic are fully generic.

### 6.2 Console logging

Keep the `[PUNYCODEX]` prefix on all `console.log` / `console.error` calls so debugging is consistent across all temples.

---

## 7. Step 5 — Lore + Gallery Pages

### 7.1 Lore page (`sites/{temple}/lore/index.html`)

**⚠️ DANGER ZONE:** This is where the Clone Trap does the most damage. Do **NOT** copy another temple's lore page and run string replacements. You will end up with the wrong myths, wrong symbols, wrong genealogy, and wrong cultural impact.

**The correct process:**
1. Use the original temple's pre-conversion lore as the **structure template** (HTML layout, section order, CSS classes).
2. **Write entirely new content** for every section: hero description, name cards, tier explanation, pronunciation, myths, pantheon, and extended lore CTA.
3. If you are not confident writing authentic mythology, research first. Do not guess. Wrong mythology is worse than no mythology.

The lore page structure (copy from Nike for layout only):

```html
<!-- Extended Lore CTA -->
<section class="section section-pantheon" id="extended-lore-cta">
    <div class="container">
        <div class="pantheon-content reveal-up">
            <div class="pantheon-text">
                <span class="pantheon-eyebrow">Go Deeper</span>
                <h2 class="pantheon-title">The Scholar's {Archetype}</h2>
                <p class="pantheon-body">…archetype-specific extended lore pitch…</p>
                <a href="extended/" class="btn-primary btn-ghost">
                    <span>Enter Extended Lore</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                </a>
            </div>
            <div class="pantheon-mascot">
                <picture>
                    <source srcset="../assets/{temple}_mascot.webp" type="image/webp">
                    <img src="../assets/{temple}_mascot.png" alt="{Unicode name} mascot" class="pantheon-mascot-img">
                </picture>
            </div>
        </div>
    </div>
</section>
```

**Critical:** All paths use `../` because lore is at `sites/{temple}/lore/`.

### 7.2 Extended lore page (`sites/{temple}/lore/extended/index.html`)

**Same warning as 7.1.** Do not copy another temple's extended lore. Write it from scratch using the original temple's pre-conversion content as your primary source, supplemented by scholarly sources.

What to change:
- Title, meta, OG tags
- Canonical URL
- **Content — entirely authored, not replaced**
- Mascot asset paths (`../../assets/...`)
- FAQ questions must be relevant to the actual archetype (e.g., "What is the difference between the Ꜣḫ and the kꜣ?" not "What is the Homeric Hymn to Ra?")

### 7.3 Gallery page (`sites/{temple}/gallery/index.html`)

Copy Nike's gallery page for **structure only**. Every caption, title, and description must reference the correct archetype's actual art and archaeology.

**Gallery caption test:** If you can replace the god's name with another god's name and the sentence still makes sense, your caption is too generic and probably cloned. Example of a cloned caption:
- ❌ "The transfigured spirit sails the barge across the sky" — this is Ra, not Akh
- ✅ "Anubis kneels beside the scales, adjusting the beam, as the heart is weighed against the feather of Ma'at" — this is Akh/Anubis

---

## 8. Step 6 — Unicode-Safe Mass Edits

### 8.1 The Golden Rule

**NEVER** use PowerShell `Get-Content` / `Set-Content` on files containing Greek, Egyptian, or any non-ASCII characters. PowerShell's default encoding corrupts Unicode.

**ALWAYS** use Node.js scripts with explicit `utf8`:

```javascript
const fs = require('fs');
const content = fs.readFileSync(path, 'utf8');
fs.writeFileSync(path, content, 'utf8');
```

### 8.2 Recommended automation script

Create `scripts/convert-temple.js`:

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Convert a regular temple into an ad homepage.
 * @param {string} source - Source temple to copy from (e.g., 'nike')
 * @param {string} target - New temple id (e.g., 'zeus')
 * @param {object} config - Archetype configuration
 */
function convertTemple(source, target, config) {
  const srcDir = path.join('sites', source);
  const tgtDir = path.join('sites', target);

  // 1. Copy directory
  // (use cp -r or fs.cpSync in Node 16.7+)

  // 2. Process HTML files
  const htmlFiles = [
    path.join(tgtDir, 'index.html'),
    path.join(tgtDir, 'lore', 'index.html'),
    path.join(tgtDir, 'lore', 'extended', 'index.html'),
    path.join(tgtDir, 'gallery', 'index.html'),
  ];

  for (const file of htmlFiles) {
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');

    // Replace site slug references
    html = html.replace(new RegExp(source, 'g'), target);

    // Replace Unicode name in titles/meta
    html = html.replace(/Níkē/g, config.unicodeName);
    html = html.replace(/Nike/g, config.asciiName);

    // Update cache-bust to temple-specific version
    html = html.replace(/\?v=perf\d+/g, '?v=perf1');

    fs.writeFileSync(file, html, 'utf8');
  }

  // 3. Process CSS — inject archetype animation block
  const cssFile = path.join(tgtDir, 'styles.css');
  let css = fs.readFileSync(cssFile, 'utf8');

  // Replace symbol
  css = css.replace(/content: '✦';/, `content: '${config.symbol}';`);
  // Replace animation name
  css = css.replace(/nike-symbol/g, `${target}-symbol`);
  // Replace archetype header comment
  css = css.replace(/ARCHETYPE ANIMATIONS — NIKE/, `ARCHETYPE ANIMATIONS — ${target.toUpperCase()}`);

  fs.writeFileSync(cssFile, css, 'utf8');

  // 4. Process JS — update site slug
  const jsFile = path.join(tgtDir, 'script.js');
  let js = fs.readFileSync(jsFile, 'utf8');
  js = js.replace(new RegExp(`site=${source}`, 'g'), `site=${target}`);
  js = js.replace(new RegExp(`/sites/${source}/dashboard/`, 'g'), `/sites/${target}/dashboard/`);
  fs.writeFileSync(jsFile, js, 'utf8');
}
```

### 8.3 Manual verification after automation

Even with scripts, ALWAYS manually verify these 5 Unicode-critical spots:
1. Greek names in `<title>` and `<h1>` tags
2. Greek names in JSON-LD schema
3. Meta description with Unicode
4. Any `data-*` attributes with Unicode
5. The `extended/` lore page content (usually the densest with Unicode)

### 8.4 Content Residue Check (POST-AUTOMATION)

After running any conversion script, run this check to catch leaked archetype DNA:

```bash
node -e "
const fs = require('fs');
const files = [
  'sites/{temple}/index.html',
  'sites/{temple}/lore/index.html',
  'sites/{temple}/lore/extended/index.html',
  'sites/{temple}/gallery/index.html',
];
const forbidden = [
  'solar disk', 'sun god', 'sun barge', 'Mandjet',
  'Khepri', 'scarab pushing', 'falcon-headed', 'Apep',
  'caduceus', 'winged sandals', 'winged helmet',
  'Hermes', 'Mercury', 'Trismegistus',
  // Add pantheon-specific forbidden words
];
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  for (const word of forbidden) {
    if (h.toLowerCase().includes(word.toLowerCase())) {
      console.log('CLONE DNA: ' + word + ' in ' + f);
    }
  }
}
"
```

**Zero tolerance:** If any forbidden word appears, the conversion is not done. Fix it before committing.

---

## 9. Step 7 — Testing Checklist

Before any commit, verify:

### 9.1 Visual
- [ ] 13 slots visible, numbered 01–13
- [ ] No prices inside frames (only archetype symbol + "Available" on hover)
- [ ] Clicking any slot opens booking modal
- [ ] Modal shows correct slot name, dimensions, and **price**
- [ ] Monthly/Yearly toggle updates price correctly
- [ ] Modal closes with X and backdrop click
- [ ] Archetype symbol animates (gentle motion, not seizure-inducing)
- [ ] Shimmer sweep travels across frames
- [ ] Mobile: column slot (slot 2) fills full vertical height
- [ ] Mobile: "Available" text pulses with staggered delays
- [ ] **Slot names pass the archetype sniff test** (no foreign-pantheon references)
- [ ] **Hero padding-top is correct** — inspect `.endorsement-hero` in DevTools; if padding-top is 0 or missing, `--nav-height` is undefined
- [ ] **Mascot alignment matches source template** — if it drifts left/right compared to Nike/Hermès, check global `img { display: block }` and `.container` padding
- [ ] **Container has horizontal padding** — `.container` should show `padding-left: 2rem` and `padding-right: 2rem` in computed styles

### 9.2 Functional
- [ ] API call `?site={slug}` returns 13 slots in Network tab
- [ ] Console shows `[PUNYCODEX] Modal opened for slot X` on click
- [ ] Console shows `[PUNYCODEX] openModal called: X`
- [ ] No JS errors in console
- [ ] **Content Residue Check passes** (Section 8.4) — zero foreign archetype DNA

### 9.3 Authenticity
- [ ] Hero tagline matches archetype (not a string-replaced version of another god)
- [ ] Lore myths are about the correct god, not another god with a find-and-replace
- [ ] Gallery captions reference correct art/archaeology
- [ ] Color palette matches archetype temperature (not inherited from source template)
- [ ] JSON-LD `alternateName` lists correct epithets, not another god's names

### 9.4 Unicode integrity
- [ ] Open file in browser devtools → Sources → verify Greek/Egyptian chars render
- [ ] Run `node test/run-all.js` (if temple is in lexicon)

### 9.4 Links
- [ ] Nav links work: Lore → `/sites/{temple}/lore/`
- [ ] Nav links work: Gallery → `/sites/{temple}/gallery/`
- [ ] Extended Lore CTA button → `extended/`
- [ ] All `../` relative paths resolve correctly from subdirectories

---

## 10. Step 8 — Cache-Bust, Commit, Deploy

### 10.1 Cache-bust automation

Use `scripts/bump-cache-bust.js` per temple. Each temple has its own version counter.

### 10.2 Commit message template

```
feat(temples): convert {temple} to ad homepage

- 13 leaseable ad slots with archetype-specific animations
- Booking modal with Stripe integration
- Lore + Gallery pages with extended lore CTA
- Archetype symbol: {symbol} ({description})
- Color palette: {palette} (not cloned from {source})
- Content Residue Check: PASS (zero foreign archetype DNA)
- Cache-bust: {temple} perf1
```

### 10.3 Deployment

```bash
git push origin master
vercel --prod
```

---

## 11. Reference: Slot Numbering Map

| Temple | Slot IDs | Status |
|--------|----------|--------|
| Nike | 1–13 | ✅ Done |
| Hermès | 14–26 | ✅ Done |
| Ra | 27–39 | ✅ Done (DB seeded) |
| *Next* | **40–52** | 🔄 Available |
| *Next* | **53–65** | 🔄 Available |
| *Next* | **66–78** | 🔄 Available |
| … | … | … |

**Rule:** Each temple gets exactly 13 consecutive IDs. The throne/bundle is always the 13th slot in the block (ID = START + 12).

---

## 12. Reference: Animation Design System

### Symbol selection guidelines

| Pantheon | Suggested symbols | Rationale |
|----------|-------------------|-----------|
| Greek | `✦` `⚡` `☥` `𓂀` | Victory, power, immortality, wisdom |
| Norse | `ᛟ` `⚔` `🜂` | Runes, battle, fire |
| Egyptian | `☉` `👁` `𓃻` | Sun, Eye of Horus, scarab |
| Japanese | `⛩` `🌸` `⚔` | Shrine, sakura, katana |
| Celtic | `🌿` `🌀` `☘` | Oak, spiral, shamrock |
| Hindu | `🔱` `🕉` `☸` | Trident, Om, Dharma wheel |
| Mesopotamian | `𒀭` `🦁` `⭐` | Dingir, lion, Ishtar star |

### Animation archetypes

| Archetype | Primary motion | Secondary motion | Particle |
|-----------|---------------|------------------|----------|
| **Warrior/Victory** | Scale pulse + rotation | Wingbeat oscillation | Upward drift |
| **Speed/Messenger** | Slow rotation | Horizontal speed lines | Zigzag |
| **Sun/Fire** | Pulse glow (brightness) | Rotating rays | Flame float |
| **Wisdom/Knowledge** | Gentle breathe (scale 1→1.05) | Orbiting dots | Spiral |
| **Nature/Growth** | Sway (rotate ±3°) | Leaf fall | Downward drift |
| **Water/Sea** | Horizontal shimmer | Wave oscillation | Bubble rise |
| **Death/Afterlife** | Slow rotation + glow fade | Rising particles (souls) | Upward drift, starfield |
| **Underworld/Shadow** | Subtle pulse (barely visible) | Mist drift | Horizontal fog |

### Color accents

Always derive from the pantheon's classic association:
- Greek: Gold `#D4AF37`
- Norse: Ice silver `#C0D6E4`
- Egyptian (solar): Solar amber `#FFB43C`
- Egyptian (death): Gold on black `#C9A227` on `#050505`
- Egyptian (wisdom): Lapis `#1E3A5F` on midnight `#080818`
- Japanese: Vermilion `#E34234`
- Celtic: Forest green `#228B22`
- Hindu: Saffron `#F4C430`
- Mesopotamian: Lapis `#1E6091`

Use the accent color at **low opacity** (0.05–0.15) for the shimmer sweep so it doesn't clash with the unified dark UI.

---

## Appendix A: File Inventory Per Temple

After conversion, each temple directory must contain:

```
sites/{temple}/
├── index.html              # Ad homepage (13 slots + booking modal)
├── styles.css              # Merged temple + ad styles
├── script.js               # Booking system
├── lore/
│   ├── index.html          # Lore + Extended Lore CTA
│   └── extended/
│       └── index.html      # Deep scholarship
├── gallery/
│   └── index.html          # Image gallery
└── assets/
    ├── {temple}_mascot.png
    └── {temple}_mascot.webp
```

---

## Appendix B: Quick-Start Command Sequence

```bash
# 1. Seed database
node platform/db/migrate-zeus-slots.js

# 2. Copy template
cp -r sites/nike sites/zeus

# 3. Run conversion script (after customizing config)
node scripts/convert-temple.js

# 4. Manual review (titles, Unicode, slot names)
# Open sites/zeus/index.html in editor

# 5. Test locally
# npx serve sites/zeus

# 6. Bump cache-bust
node scripts/bump-cache-bust.js

# 7. Commit & deploy
git add -A
git commit -m "feat(temples): convert zeus to ad homepage"
git push origin master
vercel --prod
```

---

*Document version: 2.0*
*Last updated: 2026-06-06*
*Author: PUNYCODEX Agent*
*Evolution note: v2.0 adds the Clone Trap warning, Content Residue Check, and archetype authenticity safeguards after the Akh→Ra cloning incident.*

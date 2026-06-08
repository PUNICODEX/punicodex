# PUNYCODEX — Base Temple to Ad Homepage Conversion Guide

> Convert any existing base temple into a revenue-generating ad homepage with 13 slots, booking modal, and lore/gallery/extended pages.
>
> **Scope:** 47 base temples remaining. All share the same structure.
>
> **Non-negotiable:** Use Node.js `fs.readFileSync(path, 'utf8')` / `fs.writeFileSync(path, content, 'utf8')`. PowerShell corrupts Unicode.

---

## ⚠️ The Clone Trap

Never copy the most recently converted temple and run string replacements. Use **Nike** as the structural template — it has the most generic slot names and least archetype-specific DNA.

After conversion, run the Content Residue Check (Section 9) to catch leaked DNA.

---

## Base Temple Anatomy (All 47 Are Identical)

```
sites/{temple}/
├── index.html          # Hero, Name, Pronunciation, Myths, Pantheon, Footer
├── styles.css          # ~1,400 lines: colors, canvas, components, responsive
├── script.js           # ~300 lines: canvas, scroll reveal, nav toggle
└── assets/
    ├── {temple}_logolockup.png / .webp
    ├── {temple}_logomark.png / .webp
    └── {temple}_mascot.png / .webp   # may be missing
```

**Missing:** `lore/`, `gallery/`, `lore/extended/`, ad slots, booking modal.

---

## The 8 Steps

### Step 1 — Backup

```bash
cp sites/zeus/index.html sites/zeus/index.html.bak
cp sites/zeus/styles.css sites/zeus/styles.css.bak
cp sites/zeus/script.js sites/zeus/script.js.bak
```

---

### Step 2 — Copy Nike Structure

```bash
mkdir -p sites/zeus/lore/extended
mkdir -p sites/zeus/gallery
cp sites/nike/index.html sites/zeus/index.html
cp sites/nike/lore/index.html sites/zeus/lore/
cp sites/nike/lore/extended/index.html sites/zeus/lore/extended/
cp sites/nike/gallery/index.html sites/zeus/gallery/
```

---

### Step 3 — Transplant Identity (Ad Homepage)

Edit `sites/zeus/index.html`. Use Nike's DOM structure. Change only these values:

| Element | What to change |
|---------|---------------|
| `<title>` | `Ζεύς — Endorsed by the King of the Gods` |
| `<meta name="description">` | Archetype-specific description |
| `<meta property="og:*">` | Canonical URL, title, description |
| Schema.org JSON-LD | Name, URL, description |
| `.endorsement-eyebrow` | `Endorsed by` |
| `.endorsement-title` | `The King of the Gods, <span class="endorsement-greek">Ζεύς</span>` |
| `.endorsement-lead` | Archetype tagline (e.g. `Twelve sacred frames. One temple. Rule the sky.`) |
| `.endorsement-mascot-img` | `assets/zeus_mascot.png` / `.webp` |
| Nav links | `<a href="lore/">Lore</a>`, `<a href="gallery/">Gallery</a>` |
| `.global-brand` | Link text: `PUNYCODEX` (already generic) |

**Slot names:** Rename all 13 `.space-name` values to archetype-themed names. Keep the DOM structure identical.

**Slot IDs:** Remap `data-space="01"` → `"40"` through `"13"` → `"52"`:

```javascript
const fs = require('fs');
let html = fs.readFileSync('sites/zeus/index.html', 'utf8');
for (let i = 1; i <= 13; i++) {
  const old = 'data-space="' + String(i).padStart(2, '0') + '"';
  const neu = 'data-space="' + String(39 + i) + '"';
  html = html.split(old).join(neu);
}
fs.writeFileSync('sites/zeus/index.html', html, 'utf8');
```

**Cache bust:** Change `?v=perf37` to `?v=perf1`.

---

### Step 4 — Fix Paths in Subdirectories

| File | Find | Replace |
|------|------|---------|
| `lore/index.html` | `assets/zeus_` | `../assets/zeus_` |
| `lore/index.html` | `styles.css` | `../styles.css` |
| `lore/extended/index.html` | `assets/zeus_` | `../../assets/zeus_` |
| `lore/extended/index.html` | `styles.css` | `../styles.css` |
| `gallery/index.html` | `assets/zeus_` | `../assets/zeus_` |
| `gallery/index.html` | `styles.css` | `../styles.css` |

---

### Step 5 — Merge CSS

**Strategy:** Keep the base temple's entire `styles.css`. Append **only** the ad-specific blocks from Nike's CSS.

**Do NOT append Nike's entire CSS.** Nike's file is 3,982 lines and contains ~100 unused selectors (dead code from earlier iterations). Appending it all bloats the file and risks cascade conflicts.

**Extract these blocks from Nike's CSS and append them to the base temple:**

```
/* ===== REDUCED MOTION ===== */
/* ===== TAB NAVIGATION ===== */
/* ===== QUICK FACTS ===== */
/* ===== ETymology ===== */
/* ===== UNICODE BREAKDOWN TABLE ===== */
/* ===== CULTURAL SIGNIFICANCE ===== */
/* ===== FAQ ===== */
/* ===== SOURCES ===== */
/* ===== GALLERY ===== */
/* ===== RESPONSIVE (Gallery) ===== */
/* ===== HOME / LEASE PAGE STYLES ===== */
/* ===== RESPONSIVE LEASE PAGE ===== */
/* ===== ENDORSEMENT HERO ===== */
/* ===== RESPONSIVE (Lease) ===== */
/* ===== HOW IT WORKS ===== */
/* ===== RESPONSIVE TEMPLATE ===== */
/* ===== TEMPLATE SLOTS (PROPORTIONAL) ===== */
/* ===== RESPONSIVE TEMPLATE ===== */
/* ===== 12 SACRED SPACES ===== */
/* ===== RESPONSIVE SPACES ===== */
/* ===== BOOKING MODAL ===== */
```

**Skip these dead blocks:**

```
/* ===== AD ZONES (Home/Endorsements) ===== */      → Unused in all Nike HTML
/* ===== PRICING STEPS ===== */                      → Unused
/* ===== HEKAWEB PARTNER ===== */                    → Unused
```

**Extraction method:** Open `sites/nike/styles.css`. Find each block by its section comment (`/* ===== BLOCK NAME ===== */`). Copy from the comment to just before the next `/* =====` comment. Paste at the end of `sites/zeus/styles.css`.

**After appending, add missing variables to `:root`:**

```css
:root {
  --nav-height: 72px;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 6rem;
  --space-2xl: 8rem;
  --max-width: 1200px;

  --classic-gold: #D4AF37;
  --pale-gold: #E8D5A3;
  --gold-dim: #B8983C;
  --gold-bright: #F0D070;
  --text-gold: #D4AF37;

  --bg-primary: #0a0512;
  --bg-secondary: #0e0a18;
  --bg-nav: rgba(10, 5, 18, 0.95);
  --bg-card: rgba(16, 12, 24, 0.8);
  --bg-elevated: #1a1028;

  --text-primary: #e8e0f0;
  --text-secondary: #a098b0;
  --text-muted: #6a6080;
  --font-greek: 'Georgia', 'Times New Roman', serif;

  --gradient-card: linear-gradient(135deg, rgba(16,12,24,0.85), rgba(8,5,12,0.92));
  --gradient-gold: linear-gradient(135deg, var(--classic-gold), var(--gold-bright));
  --shadow-gold: 0 0 30px rgba(212, 175, 55, 0.15);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.4);

  --success: #4ade80;
}
```

**Verify with the CSS Variable Audit:**

```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('sites/zeus/styles.css', 'utf8');
const uses = [...css.matchAll(/var\(--([\w-]+)\)/g)].map(m => m[1]);
const defs = [...css.matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]);
const missing = [...new Set(uses)].filter(v => !new Set(defs).has(v));
if (missing.length) { console.error('MISSING:', missing.sort().join(', ')); process.exit(1); }
console.log('All variables defined');
"
```

**Step 5b — Color Replacement (CRITICAL)**

Nike's extracted CSS blocks contain 50+ hardcoded colors. If you append them unchanged, the ad page will be Nike navy (`#0a121f`) + Nike gold (`rgba(212,175,55,0.X)`) instead of the temple's own palette.

**Real damage:** Akh's endorsement hero currently has `#0a121f` (Nike navy) instead of `#0a0512` (Akh violet). There are 100+ gold borders that should be violet.

**The 4 color categories to replace:**

| Category | Nike's Color | What it controls | Replace with |
|----------|-------------|------------------|--------------|
| Darkest background | `#0a121f`, `#0e1a2b`, `#0f1f35`, `rgba(8,15,25,X)`, `rgba(10,18,31,X)` | Page backgrounds, gradients | Temple's darkest bg |
| Card surface | `rgba(14,26,43,X)` | Card backgrounds, modal panels | Temple's card bg |
| Primary accent | `rgba(212,175,55,X)`, `#D4AF37` | Borders, glows, hover states | Temple's accent color |
| Secondary accent | `rgba(27,58,92,X)` | Secondary glows, subtle borders | Temple's secondary color |

**Universal colors (do NOT replace):**
- Success: `#2ecc71`, `#4ade80`
- Error: `#c44`, `#ff6b6b`, `rgba(255,107,107,0.08)`
- Warning: `#fbbf24`
- Neutral: `#000`, `rgba(0,0,0,X)`, `#A0A0A0`, `rgba(255,255,255,X)`

**How to find your temple's colors:**

Open `sites/zeus/styles.css.bak`. Look at `:root`. These are the colors that define the temple's identity:

```css
/* Zeus example */
--void-deep: #050505        /* → replaces #0a121f (darkest bg) */
--void: #0A0A0A            /* → replaces rgba(8,15,25,X) (page bg) */
--gold: #D4AF37            /* → replaces rgba(212,175,55,X) (accent) */
--lightning: #4169E1       /* → replaces rgba(27,58,92,X) (secondary) */
--storm: #1E3A5F           /* → card bg candidate */

/* Akh example */
--bg-deep: #0a0512         /* → replaces #0a121f */
--bg-void: #06030a         /* → replaces rgba(8,15,25,X) */
--accent-gold-egypt: #D4AF37  /* → replaces rgba(212,175,55,X) */
--accent-star: #9B7EDE     /* → replaces rgba(27,58,92,X) */
--bg-card: rgba(16,12,24,0.8)  /* → replaces rgba(14,26,43,X) */
```

**Color replacement script:**

After extracting Nike's blocks and appending them, run this BEFORE the variable audit:

```javascript
const fs = require('fs');

const TEMPLE = 'zeus';
const cssPath = `sites/${TEMPLE}/styles.css`;
let css = fs.readFileSync(cssPath, 'utf8');

// ═══════════════════════════════════════════════════════════════
// STEP 1: Define your temple's colors (fill these in from :root)
// ═══════════════════════════════════════════════════════════════
const replacements = {
  // Darkest background (Nike navy → temple darkest)
  '#0a121f': '#050505',
  '#0e1a2b': '#0A0A0A',
  '#0f1f35': '#0A0A0A',
  
  // Page background rgba (Nike → temple)
  // Use a function for rgba with variable opacity
};

// For rgba replacements, we need regex patterns
const rgbaReplacements = [
  // Nike navy-blue backgrounds → temple background
  { from: /rgba\(8,\s*15,\s*25,/g, to: 'rgba(5,5,5,' },
  { from: /rgba\(10,\s*18,\s*31,/g, to: 'rgba(10,10,10,' },
  
  // Card surfaces → temple card color
  // Zeus has no explicit card color, use void-mid or storm
  { from: /rgba\(14,\s*26,\s*43,/g, to: 'rgba(30,58,95,' },
  
  // Secondary accent → temple secondary
  { from: /rgba\(27,\s*58,\s*92,/g, to: 'rgba(65,105,225,' },
  
  // Primary gold accent → temple accent (Zeus gold is same as Nike, skip)
  // If your temple uses a different accent, uncomment:
  // { from: /rgba\(212,\s*175,\s*55,/g, to: 'rgba(201,162,39,' },
];

// Apply hex replacements
for (const [from, to] of Object.entries(replacements)) {
  css = css.split(from).join(to);
}

// Apply rgba replacements
for (const { from, to } of rgbaReplacements) {
  css = css.replace(from, to);
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Colors replaced for', TEMPLE);
```

**For Akh (different accent):**

```javascript
const rgbaReplacements = [
  { from: /rgba\(8,\s*15,\s*25,/g, to: 'rgba(6,3,10,' },
  { from: /rgba\(10,\s*18,\s*31,/g, to: 'rgba(10,5,18,' },
  { from: /rgba\(14,\s*26,\s*43,/g, to: 'rgba(16,12,24,' },
  { from: /rgba\(27,\s*58,\s*92,/g, to: 'rgba(155,126,222,' },
  // Akh keeps Egyptian gold #D4AF37 — same as Nike, no change needed
];
```

**Verify:** Open the ad page in a browser. The endorsement hero background, slot borders, and booking modal should match the temple's palette, not Nike's navy.

---

### Step 6 — Merge JS

**Strategy:** Keep the base temple's `script.js` intact. Append Nike's booking system.

**Nike's `script.js` has dead canvas code at the top (632 lines, no `<canvas>` element in HTML). Do not copy it.**

**Extraction:** Open `sites/nike/script.js`. Find this line:

```javascript
// ========== NIKE BOOKING SYSTEM ==========
```

Copy **from this comment to the end of the file**. Paste at the end of `sites/zeus/script.js`.

**Update these 4 values in the pasted booking code:**

```javascript
const API_BASE = window.ZEUS_API_BASE || 'http://localhost:3456';
const SITE_SLUG = 'zeus';
// fetch(`${API_BASE}/api/slots?site=zeus`)
// els.dashboardLink.href = `${API_BASE}/sites/zeus/dashboard/?token=${token}`
```

**Why this works:** The base temple's JS already handles canvas, scroll reveal, and nav toggle. Nike's booking system is self-contained and attaches its own event listeners. No conflicts.

---

### Step 7 — Create Lore Content

The base temple's `index.html.bak` contains all the lore content. Move it into the new lore page.

**From `index.html.bak` → To `lore/index.html`:**

| Section in backup | Destination in lore page |
|-------------------|-------------------------|
| Hero (`<section class="hero">`) | Lore hero section |
| The Name (`#the-name`) | Name grid section |
| Tier Classification (`#tier`) | Tier section |
| Pronunciation (`#pronunciation`) | Pronunciation grid |
| Domains / Symbols / King | Domains + Symbols sections |
| Myths (`#myths`) | Myths timeline |
| Pantheon / Related Names | Related names grid |
| Footer (`<footer class="main-footer">`) | Footer (with seal) |

**How to move:** Open both files side by side. In `lore/index.html` (Nike template), find the placeholder sections. Replace each placeholder with the matching section from `index.html.bak`. Update asset paths from `assets/` to `../assets/`.

**For `lore/extended/index.html`:** Write extended scholarship. Use Nike's structure, the temple's actual mythology.

**For `gallery/index.html`:** Write authentic captions. Use Nike's grid structure.

---

### Step 8 — Content Residue Check

```bash
node -e "
const fs = require('fs');
const files = [
  'sites/zeus/index.html',
  'sites/zeus/lore/index.html',
  'sites/zeus/lore/extended/index.html',
  'sites/zeus/gallery/index.html',
];
const forbidden = ['solar disk', 'sun god', 'sun barge', 'Khepri', 'scarab', 'caduceus', 'winged sandals', 'Hermes'];
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8').toLowerCase();
  for (const word of forbidden) {
    if (h.includes(word)) console.log('CLONE DNA: ' + word + ' in ' + f);
  }
}
"
```

---

## Testing Checklist

### Visual
- [ ] 13 slots visible, numbered 01–13
- [ ] Slot names are archetype-themed
- [ ] Clicking any slot opens booking modal
- [ ] Modal shows correct slot name, dimensions, price
- [ ] Archetype symbol animates
- [ ] Hero has correct top padding (`--nav-height` defined)
- [ ] Container has horizontal padding
- [ ] Mascot alignment matches Nike
- [ ] Lore page renders correctly (no broken styles)
- [ ] Gallery page renders correctly

### Functional
- [ ] API call `?site={slug}` returns 13 slots
- [ ] No JS errors in console
- [ ] Base temple canvas still animates
- [ ] Scroll reveal still works
- [ ] Nav toggle still works
- [ ] Content Residue Check passes

### Links
- [ ] Nav: Lore → `/sites/{temple}/lore/`
- [ ] Nav: Gallery → `/sites/{temple}/gallery/`
- [ ] Extended Lore CTA → `extended/`
- [ ] All `../` and `../../` paths resolve

---

## Reference: Slot Prices

| Slot | Type | Price Cents |
|------|------|-------------|
| 1 | Crown (hero) | 120000 |
| 2 | Column (sidebar) | 80000 |
| 3 | Strip (inline) | 60000 |
| 4 | Content I | 50000 |
| 5 | Content II | 40000 |
| 6 | Ribbon | 35000 |
| 7 | Badge | 30000 |
| 8 | Text I | 25000 |
| 9 | Text II | 18000 |
| 10 | Emblem I | 15000 |
| 11 | Emblem II | 12000 |
| 12 | Footer | 30000 |
| 13 | Throne (bundle) | 515000 |

---

## Reference: Slot Numbering Map

| Temple | Slot IDs |
|--------|----------|
| Nike | 1–13 |
| Hermès | 14–26 |
| Ra | 27–39 |
| Akh | 40–52 |
| *Next* | 53–65 |

---

*Document version: 4.0*
*Last updated: 2026-06-06*

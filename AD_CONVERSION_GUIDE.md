# PUNYCODEX — Base Temple to Ad Homepage Conversion Guide

> Convert any existing base temple (`/sites/{id}/`) into a revenue-generating ad homepage with 13 leaseable slots, booking modal, and lore/gallery pages.
>
> **Scope:** 47 base temples remaining (4 complete: Nike, Hermès, Ra, Akh)
>
> **Non-negotiable:** All file edits must preserve Unicode. Use Node.js `fs.readFileSync(path, 'utf8')` / `fs.writeFileSync(path, content, 'utf8')`. PowerShell `Get-Content`/`Set-Content` corrupts Greek/Egyptian characters.

---

## ⚠️ The Clone Trap

**Never** copy the most recently converted temple and run string replacements. You will get wrong slot names, wrong mythology, wrong colors. Always use **Nike** as the structural template — it has the most generic slot names and least archetype-specific DNA.

**Prevention:**
1. Use Nike as the template for structure only.
2. Slot names must be archetype-themed ("Thunder Crown" for Zeus, not "Solar Disk").
3. Lore and gallery content must be authored, not replaced.
4. After conversion, run the Content Residue Check (Section 8).

---

## What Every Base Temple Looks Like

All 47 base temples share this structure:

```
sites/{temple}/
├── index.html          # Hero, Name, Pronunciation, Myths, Pantheon, Footer
├── styles.css          # Temple colors, canvas animation, components
├── script.js           # Canvas, scroll reveal, nav toggle
└── assets/
    ├── {temple}_logolockup.png/webp
    ├── {temple}_logomark.png/webp
    └── {temple}_mascot.png/webp   # may be missing
```

**Missing:** `lore/`, `gallery/`, `lore/extended/`, ad slots, booking modal.

---

## The 8 Steps

### 1. Backup

```bash
cp sites/zeus/index.html sites/zeus/index.html.bak
cp sites/zeus/styles.css sites/zeus/styles.css.bak
cp sites/zeus/script.js sites/zeus/script.js.bak
```

### 2. Copy Nike Structure

```bash
mkdir -p sites/zeus/lore/extended
mkdir -p sites/zeus/gallery
cp sites/nike/index.html sites/zeus/index.html
cp sites/nike/lore/index.html sites/zeus/lore/
cp sites/nike/lore/extended/index.html sites/zeus/lore/extended/
cp sites/nike/gallery/index.html sites/zeus/gallery/
```

### 3. Transplant Identity

Edit `sites/zeus/index.html`:

| Element | What to change | Example |
|---------|---------------|---------|
| `<title>` | Temple's Unicode name | `Ζεύς — Endorsed by the King of the Gods` |
| `<meta name="description">` | Archetype-specific | `Your brand, endorsed by Zeús...` |
| Schema.org JSON-LD | Name, URL, description | `Ζεύς`, `https://punycodex.com/sites/zeus/` |
| `.endorsement-eyebrow` | Tagline | `Endorsed by` |
| `.endorsement-title` | Unicode name | `The King of the Gods, <span class="endorsement-greek">Ζεύς</span>` |
| `.endorsement-lead` | Archetype tagline | `Twelve sacred frames. One temple. Rule the sky.` |
| `.endorsement-mascot-img` | Mascot asset | `assets/zeus_mascot.png` |
| Nav links | Point to lore/gallery | `<a href="lore/">Lore</a>`, `<a href="gallery/">Gallery</a>` |

**Slot names:** Rename all 13 `.space-name` values to archetype-themed names. Keep the structure identical.

**Slot IDs:** Remap `data-space="01"` → `"40"` through `"13"` → `"52"`:

```javascript
const fs = require('fs');
let html = fs.readFileSync('sites/zeus/index.html', 'utf8');
for (let i = 1; i <= 13; i++) {
  const old = String(i).padStart(2, '0');
  const neu = String(39 + i);  // 40–52
  html = html.split('data-space="' + old + '"').join('data-space="' + neu + '"');
}
fs.writeFileSync('sites/zeus/index.html', html, 'utf8');
```

**Cache bust:** Change `?v=perf37` to `?v=perf1` (or any new version).

### 4. Fix Paths in Subdirectories

| File | Change |
|------|--------|
| `lore/index.html` | `assets/zeus_` → `../assets/zeus_` |
| `lore/index.html` | `styles.css` → `../styles.css` |
| `lore/extended/index.html` | `assets/zeus_` → `../../assets/zeus_` |
| `lore/extended/index.html` | `styles.css` → `../styles.css` |
| `gallery/index.html` | `assets/zeus_` → `../assets/zeus_` |
| `gallery/index.html` | `styles.css` → `../styles.css` |

### 5. Merge CSS

Keep the base temple's `styles.css`. Append the ad-slot + booking CSS from Nike. The simplest method:

```bash
# Extract everything after the temple-specific styles from Nike
# (ad slots, booking modal, endorsement hero, responsive rules)
# Append to base temple:
cat sites/nike/styles.css >> sites/zeus/styles.css
```

Then add missing CSS variables to `:root`:

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

**Verify:** Run the CSS Variable Audit:

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

### 6. Merge JS

The base temple's `script.js` has canvas animation + scroll reveal + nav. Nike's `script.js` has booking system + scroll reveal + nav.

**Strategy:** Keep Nike's `script.js` (it has the booking system). Paste the base temple's canvas code at the very top.

1. Open `sites/zeus/script.js.bak`
2. Find the canvas code (top of file, contains `getElementById('...-canvas')`)
3. Copy it
4. Open `sites/nike/script.js` → save as `sites/zeus/script.js`
5. Paste the canvas code at line 1
6. Update:
   - `const API_BASE = window.ZEUS_API_BASE || 'http://localhost:3456'`
   - `const SITE_SLUG = 'zeus'`
   - `fetch(\`${API_BASE}/api/slots?site=zeus\`)`
   - `els.dashboardLink.href = \`${API_BASE}/sites/zeus/dashboard/?token=${token}\``

### 7. Create Lore Content

Copy content from `sites/zeus/index.html.bak` into `sites/zeus/lore/index.html`:

| From `index.html.bak` | To `lore/index.html` |
|----------------------|----------------------|
| Hero section | Lore hero section |
| The Name section | Name grid section |
| Tier Classification | Tier section |
| Pronunciation | Pronunciation grid |
| Domains/Symbols | Domains + Symbols sections |
| Myths timeline | Myths timeline |
| Related Names | Related names grid |
| Footer (with seal) | Footer (with seal) |

**Do not** string-replace. Move the HTML verbatim. Update paths from `assets/` to `../assets/`.

For `lore/extended/index.html` and `gallery/index.html`: write authentic content. Use Nike's structure, Zeus's mythology.

### 8. Content Residue Check

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
- [ ] Slot names are archetype-themed (no foreign pantheon references)
- [ ] Clicking any slot opens booking modal
- [ ] Modal shows correct slot name, dimensions, and price
- [ ] Archetype symbol animates
- [ ] Hero has correct top padding (`--nav-height` defined)
- [ ] Container has horizontal padding
- [ ] Mascot alignment matches Nike/Hermès

### Functional
- [ ] API call `?site={slug}` returns 13 slots
- [ ] No JS errors in console
- [ ] Content Residue Check passes

### Links
- [ ] Nav: Lore → `/sites/{temple}/lore/`
- [ ] Nav: Gallery → `/sites/{temple}/gallery/`
- [ ] Extended Lore CTA → `extended/`

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
| *Next* | 66–78 |

---

*Document version: 3.0*
*Last updated: 2026-06-06*

/**
 * Standardize nav/logo across all hand-crafted temple flagships
 * 
 * Changes:
 * 1. Remove justify-content: center from .nav-logo (left-align all logos)
 * 2. Set .nav-logo-img height to 128px (match zeus)
 * 3. Add global PUNYCODEX strip to temples missing it
 * 4. Add top:40px offset to main-nav for temples getting the strip
 * 
 * Usage: node scripts/standardize-nav.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Groups ──────────────────────────────────────────────────────────────

// Temples needing: remove justify-content:center from .nav-logo
// (they already have the strip + 128px logo)
const REMOVE_CENTERING = [
  'zeus','athena','apollon','artemis','aphrodite','athenai','ares','chaos',
  'demeter','atlas','dionysos','delphoi','gaia','hades','hephaistos','hera',
  'hestia','hermes','jotunheimr','kobe','kyoto','medousa','midgardr','nike',
  'prometheus','poseidon','osaka','ragnarok','pontos','persephone','sparte',
  'olympos'
];

// Temples needing: logo height → 128px (already have strip, already left-aligned)
const INCREASE_LOGO_SIZE = [
  'alfheimr',   // 36px → 128px
  'tartaros',   // 36px → 128px
  'hekate',     // 160px → 128px
];

// Temples needing: add strip + logo → 128px + nav top:40px
// (no strip currently, small logo, already left-aligned)
const ADD_STRIP_AND_SIZE = [
  'odinn','ra','selene','helheimr','ker','helios'
];

// ── The standard global strip HTML ──────────────────────────────────────

const STRIP_HTML = `    <!-- Global Nav -->
    <div style="position:fixed;top:0;left:0;width:100%;z-index:1001;background:rgba(10,10,10,0.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="max-width:1200px;margin:0 auto;padding:0.4rem clamp(1.5rem,5vw,3rem);display:flex;align-items:center;justify-content:space-between;">
            <a href="/" style="font-family:'Cinzel',serif;font-size:0.8rem;font-weight:700;letter-spacing:0.15em;color:#D4AF37;text-decoration:none;">PUNYCODEX</a>
            <div style="display:flex;gap:1.5rem;">
                <a href="/pantheon/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Pantheon</a>
                <a href="/lexicon/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Lexicon</a>
                <a href="/type/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Type</a>
                <a href="/tiers/" style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#A0A0A0;text-decoration:none;transition:color 0.3s;" onmouseover="this.style.color='#D4AF37'" onmouseout="this.style.color='#A0A0A0'">Tiers</a>
            </div>
        </div>
    </div>
`;

// ── Helpers ─────────────────────────────────────────────────────────────

function logChange(site, type, detail) {
  const prefix = DRY_RUN ? '[DRY-RUN]' : '[CHANGED]';
  console.log(`${prefix} ${site}: ${type} — ${detail}`);
}

function logSkip(site, reason) {
  console.log(`[SKIP] ${site}: ${reason}`);
}

function readFile(site, ext) {
  const p = path.join('sites', site, ext === 'html' ? 'index.html' : 'styles.css');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

function writeFile(site, ext, content) {
  if (DRY_RUN) return;
  const p = path.join('sites', site, ext === 'html' ? 'index.html' : 'styles.css');
  fs.writeFileSync(p, content, 'utf-8');
}

// ── CSS Operations ──────────────────────────────────────────────────────

function removeJustifyContentCenter(css, site) {
  // Match .nav-logo { ... justify-content: center; ... }
  // Handle both multi-line and single-line variants
  const patterns = [
    // Multi-line: .nav-logo {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    ...
    /(\s*\.nav-logo\s*\{[\s\S]*?)(\s+justify-content:\s*center;)([\s\S]*?\})/,
    // Single-line: .nav-logo { display: flex; align-items: center; justify-content: center; ... }
    /(\s*\.nav-logo\s*\{[^}]*?)(\s*justify-content:\s*center;\s*)([^}]*\})/,
  ];

  for (const re of patterns) {
    if (re.test(css)) {
      const newCss = css.replace(re, '$1$3');
      // Verify the centering was actually removed
      if (!newCss.includes('justify-content: center') || !/\.nav-logo\s*\{/.test(newCss)) {
        logChange(site, 'CSS', 'removed justify-content:center from .nav-logo');
        return newCss;
      }
    }
  }

  // Fallback: targeted line removal
  const lines = css.split('\n');
  let inNavLogo = false;
  let braceDepth = 0;
  let changed = false;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\.nav-logo\s*\{/.test(line)) {
      inNavLogo = true;
      braceDepth = 1;
    }
    if (inNavLogo) {
      // Count braces to track rule end
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (/justify-content:\s*center/.test(line)) {
        changed = true;
        continue; // skip this line
      }
      if (braceDepth <= 0) {
        inNavLogo = false;
      }
    }
    newLines.push(line);
  }

  if (changed) {
    logChange(site, 'CSS', 'removed justify-content:center from .nav-logo (line-by-line)');
    return newLines.join('\n');
  }

  logSkip(site, 'justify-content:center not found in .nav-logo');
  return css;
}

function setLogoHeight(css, site, targetHeight = 128) {
  // Find .nav-logo-img rule and set height
  const re = /(\s*\.nav-logo-img\s*\{[\s\S]*?height:\s*)\d+(px|rem|em)([\s\S]*?\})/;
  if (re.test(css)) {
    const newCss = css.replace(re, `$1${targetHeight}px$3`);
    const match = css.match(re);
    const oldHeight = match ? match[0].match(/height:\s*(\d+(?:px|rem|em))/)[1] : 'unknown';
    logChange(site, 'CSS', `.nav-logo-img height ${oldHeight} → ${targetHeight}px`);
    return newCss;
  }

  // Fallback: find the height line in .nav-logo-img block
  const lines = css.split('\n');
  let inRule = false;
  let braceDepth = 0;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\.nav-logo-img\s*\{/.test(line)) {
      inRule = true;
      braceDepth = 1;
    }
    if (inRule) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      const hm = line.match(/^(\s*height:\s*)\d+(px|rem|em)(\s*;?\s*)$/);
      if (hm) {
        const oldVal = line.match(/height:\s*(\d+(?:px|rem|em))/)[1];
        lines[i] = `${hm[1]}${targetHeight}px${hm[3]}`;
        changed = true;
        logChange(site, 'CSS', `.nav-logo-img height ${oldVal} → ${targetHeight}px (line-by-line)`);
      }
      if (braceDepth <= 0) {
        inRule = false;
      }
    }
  }

  if (changed) return lines.join('\n');

  logSkip(site, `.nav-logo-img height rule not found`);
  return css;
}

// ── HTML Operations ─────────────────────────────────────────────────────

function addGlobalStrip(html, site) {
  // Insert after <body> and before the first canvas comment
  // Pattern: <body>\n    <!-- Some Canvas -->\n    <canvas...
  const bodyRe = /(<body>\n)(\s*<!--\s*[A-Za-z]+\s*Canvas\s*-->\n\s*<canvas)/;
  if (bodyRe.test(html)) {
    const newHtml = html.replace(bodyRe, `$1${STRIP_HTML}$2`);
    logChange(site, 'HTML', 'added global PUNYCODEX strip');
    return newHtml;
  }

  // Fallback: just after <body>\n
  const bodySimpleRe = /(<body>\n)/;
  if (bodySimpleRe.test(html)) {
    const newHtml = html.replace(bodySimpleRe, `$1${STRIP_HTML}`);
    logChange(site, 'HTML', 'added global PUNYCODEX strip (fallback)');
    return newHtml;
  }

  logSkip(site, 'could not find insertion point for global strip');
  return html;
}

function addNavTopOffset(html, site) {
  // Change <nav class="main-nav" id="main-nav"> to <nav class="main-nav" style="top:40px;" id="main-nav">
  const re = /(<nav\s+class="main-nav")(\s+id="main-nav")/;
  if (re.test(html)) {
    const newHtml = html.replace(re, '$1 style="top:40px;"$2');
    logChange(site, 'HTML', 'added top:40px to main-nav');
    return newHtml;
  }

  logSkip(site, 'could not find <nav class="main-nav"> to add top offset');
  return html;
}

// ── Main ────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`TEMPLE NAV STANDARDIZATION`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files changed)' : 'LIVE'}`);
console.log(`${'='.repeat(60)}\n`);

let changedCount = 0;
let skippedCount = 0;

// ── Group 1: Remove centering ───────────────────────────────────────────
console.log('\n── GROUP 1: Remove justify-content:center from .nav-logo ──');
for (const site of REMOVE_CENTERING) {
  const css = readFile(site, 'css');
  if (!css) { logSkip(site, 'styles.css not found'); skippedCount++; continue; }
  const newCss = removeJustifyContentCenter(css, site);
  if (newCss !== css) { writeFile(site, 'css', newCss); changedCount++; }
  else { skippedCount++; }
}

// ── Group 2: Increase logo size ─────────────────────────────────────────
console.log('\n── GROUP 2: Increase .nav-logo-img to 128px ──');
for (const site of INCREASE_LOGO_SIZE) {
  const css = readFile(site, 'css');
  if (!css) { logSkip(site, 'styles.css not found'); skippedCount++; continue; }
  const newCss = setLogoHeight(css, site, 128);
  if (newCss !== css) { writeFile(site, 'css', newCss); changedCount++; }
  else { skippedCount++; }
}

// ── Group 3: Add strip + increase size + offset ─────────────────────────
console.log('\n── GROUP 3: Add strip + logo 128px + nav top:40px ──');
for (const site of ADD_STRIP_AND_SIZE) {
  const css = readFile(site, 'css');
  const html = readFile(site, 'html');
  if (!css) { logSkip(site, 'styles.css not found'); skippedCount++; continue; }
  if (!html) { logSkip(site, 'index.html not found'); skippedCount++; continue; }

  let newCss = css;
  let newHtml = html;

  // CSS: increase logo
  newCss = setLogoHeight(newCss, site, 128);

  // HTML: add strip
  newHtml = addGlobalStrip(newHtml, site);

  // HTML: add nav offset
  newHtml = addNavTopOffset(newHtml, site);

  if (newCss !== css) { writeFile(site, 'css', newCss); changedCount++; }
  if (newHtml !== html) { writeFile(site, 'html', newHtml); changedCount++; }
  if (newCss === css && newHtml === html) { skippedCount++; }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`SUMMARY: ${changedCount} changes, ${skippedCount} skipped`);
console.log(`${'='.repeat(60)}\n`);

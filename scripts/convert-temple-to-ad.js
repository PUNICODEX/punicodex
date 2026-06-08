#!/usr/bin/env node
/**
 * PUNYCODEX — Temple to Ad Homepage Conversion Script
 *
 * Converts any base temple (generated or flagship) into an ad homepage
 * with 13 slots, booking modal, and lore/gallery/extended pages.
 *
 * Usage:
 *   node scripts/convert-temple-to-ad.js zeus
 *   node scripts/convert-temple-to-ad.js aaru --dry-run
 *   node scripts/convert-temple-to-ad.js zeus --skip-backup
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ─── CONFIG ──────────────────────────────────────────────────────────────

const NIKE_DIR = path.join(__dirname, '..', 'sites', 'nike');
const SITES_DIR = path.join(__dirname, '..', 'sites');
const TEMPLE_BASE_CSS = path.join(__dirname, '..', 'css', 'temple-base.css');
const TEMPLE_BASE_JS = path.join(__dirname, '..', 'js', 'temple-base.js');

// Pantheon colors (mirrored from generate-temples.js)
const PANTHEON_COLORS = {
  greek:            { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  'greek-location': { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  norse:            { primary: '#C0C0C0', primaryDim: '#808080', primaryBright: '#E8E8E8', secondary: '#5C9BD1' },
  egyptian:         { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#1E3A5F' },
  sanskrit:         { primary: '#FF9933', primaryDim: '#CC7A29', primaryBright: '#FFB366', secondary: '#8B0000' },
  celtic:           { primary: '#228B22', primaryDim: '#1A6B1A', primaryBright: '#32CD32', secondary: '#B8D4E3' },
  mesopotamian:     { primary: '#CD7F32', primaryDim: '#A06020', primaryBright: '#E09040', secondary: '#C2B280' },
  polynesian:       { primary: '#1E90FF', primaryDim: '#1670CC', primaryBright: '#4DA6FF', secondary: '#FF7F50' },
  japanese:         { primary: '#DC143C', primaryDim: '#A01030', primaryBright: '#FF3355', secondary: '#1A1A1A' },
  nahuatl:          { primary: '#50C878', primaryDim: '#3A9E5A', primaryBright: '#6EE89A', secondary: '#2F2F2F' },
  yoruba:           { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4B0082' },
  slavic:           { primary: '#C0C0C0', primaryDim: '#808080', primaryBright: '#E8E8E8', secondary: '#228B22' },
  zoroastrian:      { primary: '#FF4500', primaryDim: '#CC3700', primaryBright: '#FF6633', secondary: '#F5F5F5' },
  incan:            { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#DC143C' },
};

// Nike hardcoded colors to replace
const NIKE_COLORS = {
  hex: ['#0a121f', '#0e1a2b', '#0f1f35', '#D4AF37'],
  rgba: [
    { pattern: /rgba\(8,\s*15,\s*25,/g, desc: 'page bg dark' },
    { pattern: /rgba\(10,\s*18,\s*31,/g, desc: 'page bg' },
    { pattern: /rgba\(14,\s*26,\s*43,/g, desc: 'card surface' },
    { pattern: /rgba\(212,\s*175,\s*55,/g, desc: 'gold accent' },
    { pattern: /rgba\(27,\s*58,\s*92,/g, desc: 'secondary accent' },
  ]
};

// Ad-specific CSS blocks to extract from Nike (by section comment)
const AD_CSS_BLOCKS = [
  'HOME / LEASE PAGE STYLES',
  'RESPONSIVE LEASE PAGE',
  'ENDORSEMENT HERO',
  'HOW IT WORKS',
  '12 SACRED SPACES',
  'RESPONSIVE SPACES',
  'BOOKING MODAL',
  'REDUCED MOTION',
  'GALLERY',
];

// Dead blocks to skip
const DEAD_CSS_BLOCKS = [
  'AD ZONES (Home/Endorsements)',
  'PRICING STEPS',
  'HEKAWEB PARTNER',
  'HEKAWEB SERVICES',
  'TEMPLATE SLOTS (PROPORTIONAL)',
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function isDark(hex) {
  return getLuminance(hex) < 0.3;
}

function loadLexicon() {
  const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
  return LEXICON;
}

function detectTempleType(templePath) {
  const hasLocalCss = fs.existsSync(path.join(templePath, 'styles.css'));
  const hasLocalJs = fs.existsSync(path.join(templePath, 'script.js'));
  const htmlPath = path.join(templePath, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const linksToShared = html.includes('temple-base.css');

  if (hasLocalCss && hasLocalJs && !linksToShared) {
    return 'flagship';
  }
  if (!hasLocalCss && linksToShared) {
    return 'generated';
  }
  // Fallback: if it has local CSS, treat as flagship
  return hasLocalCss ? 'flagship' : 'generated';
}

// ─── COLOR EXTRACTION ────────────────────────────────────────────────────

function extractColors(templeId, templePath, pantheon) {
  const htmlPath = path.join(templePath, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const isFlagship = fs.existsSync(path.join(templePath, 'styles.css'));

  let vars = {};
  let fontBody = "'Lato', 'Helvetica Neue', sans-serif";

  if (isFlagship) {
    const css = fs.readFileSync(path.join(templePath, 'styles.css'), 'utf8');
    const matches = [...css.matchAll(/--([\w-]+)\s*:\s*([^;\n]+)/g)];
    matches.forEach(m => { vars[m[1]] = m[2].trim(); });

    const fm = css.match(/font-family\s*:\s*([^;\n]+)/);
    if (fm) fontBody = fm[1].trim();
  }

  // Extract inline style vars from generated temples
  const styleMatch = html.match(/<style>\s*:root\s*\{([^}]+)\}/);
  if (styleMatch) {
    const matches = [...styleMatch[1].matchAll(/--([\w-]+)\s*:\s*([^;\n]+)/g)];
    matches.forEach(m => { vars[m[1]] = m[2].trim(); });
  }

  // Pantheon fallback colors
  const pc = PANTHEON_COLORS[pantheon] || PANTHEON_COLORS.greek;

  // Darkest background
  let darkestBg = vars['void-deep'] || vars['bg-deep'] || vars['bg-primary'] || '#050505';

  // Primary accent
  let primary = vars['primary'] || vars['gold'] || vars['accent-gold'] || vars['classic-gold'] || pc.primary;

  // Primary dim
  let primaryDim = vars['primary-dim'] || vars['gold-dim'] || pc.primaryDim;

  // Primary bright
  let primaryBright = vars['primary-bright'] || vars['gold-bright'] || pc.primaryBright;

  // Secondary accent
  let secondary = vars['secondary'] || vars['lightning'] || vars['accent-star'] || vars['storm'] || pc.secondary;

  // Page background (slightly lighter than darkest)
  let pageBg = vars['void'] || vars['bg-secondary'] || '#0A0A0A';

  // Card surface
  let cardSurface;
  if (vars['bg-card']) {
    cardSurface = vars['bg-card'];
  } else if (vars['storm']) {
    cardSurface = vars['storm'];
  } else {
    const secRgb = hexToRgb(secondary);
    if (secRgb && isDark(secondary)) {
      cardSurface = rgbToHex(secRgb.r + 10, secRgb.g + 10, secRgb.b + 10);
    } else {
      const darkRgb = hexToRgb(darkestBg) || { r: 5, g: 5, b: 5 };
      cardSurface = rgbToHex(darkRgb.r + 15, darkRgb.g + 15, darkRgb.b + 15);
    }
  }

  // White / text colors
  let white = vars['white'] || '#F5F5F5';
  let whiteDim = vars['white-dim'] || '#A0A0A0';

  // Font display
  let fontDisplay = vars['font-display'] || "'Cinzel', serif";

  return {
    darkestBg,
    pageBg,
    cardSurface,
    primary,
    primaryDim,
    primaryBright,
    secondary,
    white,
    whiteDim,
    fontBody,
    fontDisplay,
    rawVars: vars,
    isFlagship
  };
}

// ─── SECTION EXTRACTION ──────────────────────────────────────────────────

function extractSections(templePath) {
  const htmlPath = path.join(templePath, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const sections = {};

  // Match <section id="...">...</section> blocks (non-greedy)
  const sectionRegex = /<section[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/section>/g;
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const id = match[1];
    const content = match[0];
    sections[id] = content;
  }

  // Also extract footer if present
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/);
  if (footerMatch) {
    sections['__footer'] = footerMatch[0];
  }

  // Extract inline global nav
  const navMatch = html.match(/<div style="position:fixed[\s\S]*?<\/div>\s*(?=<nav|<canvas|<section)/);
  if (navMatch) {
    sections['__nav'] = navMatch[0];
  }

  // Extract canvas
  const canvasMatch = html.match(/<canvas[^>]*id="([^"]+)"[^>]*>/);
  if (canvasMatch) {
    sections['__canvas'] = canvasMatch[0];
    sections['__canvasId'] = canvasMatch[1];
  }

  return sections;
}

// ─── CSS MERGER ──────────────────────────────────────────────────────────

function extractCssBlock(css, blockName) {
  const comment = `/* ===== ${blockName} ===== */`;
  const idx = css.indexOf(comment);
  if (idx === -1) return null;

  // Find the next block comment or end of file
  const nextComment = css.indexOf('/* =====', idx + comment.length);
  const endIdx = nextComment === -1 ? css.length : nextComment;
  return css.substring(idx, endIdx).trim();
}

function generateNikeVariables(colors) {
  const darkestRgb = hexToRgb(colors.darkestBg) || { r: 5, g: 5, b: 5 };
  const pageRgb = hexToRgb(colors.pageBg) || { r: 10, g: 10, b: 10 };
  const cardRgb = hexToRgb(colors.cardSurface) || { r: 30, g: 58, b: 95 };
  const primaryRgb = hexToRgb(colors.primary) || { r: 212, g: 175, b: 55 };

  return `
/* ===== AD PAGE VARIABLES (auto-generated) ===== */
:root {
  --nav-height: 72px;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 6rem;
  --space-2xl: 8rem;
  --max-width: 1200px;

  --classic-gold: ${colors.primary};
  --pale-gold: ${colors.primaryBright};
  --gold-dim: ${colors.primaryDim};
  --gold-bright: ${colors.primaryBright};
  --text-gold: ${colors.primary};

  --bg-primary: ${colors.darkestBg};
  --bg-secondary: ${colors.pageBg};
  --bg-nav: rgba(${darkestRgb.r}, ${darkestRgb.g}, ${darkestRgb.b}, 0.95);
  --bg-card: rgba(${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}, 0.8);
  --bg-elevated: ${colors.cardSurface};

  --text-primary: ${colors.white};
  --text-secondary: ${colors.whiteDim};
  --text-muted: ${colors.whiteDim};
  --font-greek: 'Georgia', 'Times New Roman', serif;

  --gradient-card: linear-gradient(135deg, rgba(${cardRgb.r},${cardRgb.g},${cardRgb.b},0.85), rgba(${darkestRgb.r},${darkestRgb.g},${darkestRgb.b},0.92));
  --gradient-gold: linear-gradient(135deg, var(--classic-gold), var(--gold-bright));
  --shadow-gold: 0 0 30px rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.4);

  --success: #4ade80;
  --black: #000000;
}
`;
}

function replaceNikeColors(css, colors) {
  const darkestRgb = hexToRgb(colors.darkestBg) || { r: 5, g: 5, b: 5 };
  const pageRgb = hexToRgb(colors.pageBg) || { r: 10, g: 10, b: 10 };
  const cardRgb = hexToRgb(colors.cardSurface) || { r: 30, g: 58, b: 95 };
  const primaryRgb = hexToRgb(colors.primary) || { r: 212, g: 175, b: 55 };
  const secondaryRgb = hexToRgb(colors.secondary) || { r: 65, g: 105, b: 225 };

  // Hex replacements
  css = css.replace(/#0a121f/g, colors.darkestBg);
  css = css.replace(/#0e1a2b/g, colors.pageBg);
  css = css.replace(/#0f1f35/g, colors.pageBg);

  // RGBA replacements
  css = css.replace(/rgba\(8,\s*15,\s*25,/g, `rgba(${darkestRgb.r},${darkestRgb.g},${darkestRgb.b},`);
  css = css.replace(/rgba\(10,\s*18,\s*31,/g, `rgba(${pageRgb.r},${pageRgb.g},${pageRgb.b},`);
  css = css.replace(/rgba\(14,\s*26,\s*43,/g, `rgba(${cardRgb.r},${cardRgb.g},${cardRgb.b},`);
  css = css.replace(/rgba\(212,\s*175,\s*55,/g, `rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},`);
  css = css.replace(/rgba\(27,\s*58,\s*92,/g, `rgba(${secondaryRgb.r},${secondaryRgb.g},${secondaryRgb.b},`);

  // Font replacement
  css = css.replace(/'Montserrat',\s*-apple-system,\s*BlinkMacSystemFont,\s*sans-serif/g, colors.fontBody);

  return css;
}

function mergeCss(templePath, colors) {
  const nikeCss = fs.readFileSync(path.join(NIKE_DIR, 'styles.css'), 'utf8');

  let baseCss = '';
  if (colors.isFlagship) {
    baseCss = fs.readFileSync(path.join(templePath, 'styles.css'), 'utf8');
  } else {
    baseCss = fs.readFileSync(TEMPLE_BASE_CSS, 'utf8');
  }

  // Inject Nike variables
  const nikeVars = generateNikeVariables(colors);

  // Extract ad blocks from Nike CSS
  let adBlocks = [];
  for (const blockName of AD_CSS_BLOCKS) {
    const block = extractCssBlock(nikeCss, blockName);
    if (block) {
      adBlocks.push(block);
    }
  }

  // Replace colors in ad blocks
  let adCss = adBlocks.join('\n\n');
  adCss = replaceNikeColors(adCss, colors);

  // Combine
  let result = baseCss + '\n\n' + nikeVars + '\n\n' + adCss;

  // For generated temples, also inject pantheon colors inline
  if (!colors.isFlagship) {
    const pc = PANTHEON_COLORS[Object.keys(PANTHEON_COLORS).find(k => k === colors.pantheon)] || PANTHEON_COLORS.greek;
    const pantheonVars = `
/* ===== PANTHEON COLOR OVERRIDES ===== */
:root {
  --primary: ${colors.primary};
  --primary-dim: ${colors.primaryDim};
  --primary-bright: ${colors.primaryBright};
  --secondary: ${colors.secondary};
}
`;
    result = pantheonVars + '\n' + result;
  }

  return result;
}

// ─── JS MERGER ───────────────────────────────────────────────────────────

function removeOldCanvasGuard(baseJs) {
  // Remove the old broken guard pattern:
  // const canvas = ...;
  // if (!canvas) { console.log('...'); return; }
  // const ctx = canvas.getContext('2d');
  return baseJs.replace(
    /const canvas = document\.getElementById\('([^']+)'\);\s*\n\s*if\s*\(\s*!canvas\s*\)\s*\{[^}]*return;\s*\}\s*\n\s*(const ctx = canvas\.getContext\('2d'\);)/,
    'const canvas = document.getElementById(\'$1\');\n    $2'
  );
}

/**
 * Strip single-line and multi-line comments from JS code,
 * replacing them with spaces to preserve character positions.
 * This allows safe pattern matching without hitting false positives
 * inside comments or strings.
 */
function stripJsComments(code) {
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < code.length && code[i] !== '\n') i++;
      result += ' '.repeat(i - start);
    } else if (code[i] === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      if (i < code.length) i += 2;
      result += ' '.repeat(i - start);
    } else if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      result += code[i];
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') { result += code[i]; i++; }
        result += code[i];
        i++;
      }
      if (i < code.length) { result += code[i]; i++; }
    } else {
      result += code[i];
      i++;
    }
  }
  return result;
}

function applySurgicalCanvasWrapping(baseJs, templeId) {
  if (!baseJs.includes('const canvas = document.getElementById')) {
    return baseJs; // No canvas code
  }

  // Find canvas init + ctx init (may be on same line, adjacent lines, or with a guard in between)
  const canvasMatch = baseJs.match(
    /(const canvas = document\.getElementById\('([^']+)'\);)[ \t]*\r?\n(?:^[ \t]*if\s*\(\s*!canvas\s*\).*\r?\n)?[ \t]*(const ctx = canvas\.getContext\('2d'\);)/m
  );

  if (!canvasMatch) {
    // No ctx init found - check if script already has canvas handling (if/else, existing guard)
    const canvasInitPos = baseJs.indexOf('const canvas = document.getElementById');
    if (canvasInitPos !== -1) {
      const nextBlock = baseJs.slice(canvasInitPos, canvasInitPos + 500);
      if (/if\s*\(\s*!?\s*canvas\b/.test(nextBlock)) {
        // Already has guard logic - leave as-is
        return baseJs;
      }
    }
    // No existing guard - add early return fallback
    // First, strip any existing simple guard to avoid duplicates
    baseJs = baseJs.replace(/^[ \t]*if\s*\(\s*!canvas\s*\).*\r?\n/gm, '');
    baseJs = baseJs.replace(
      /const canvas = document\.getElementById\('([^']+)'\);/,
      `const canvas = document.getElementById('$1');\n    if (!canvas) { console.log('[${templeId}] Canvas $1 not present on this page'); return; }`
    );
    baseJs = baseJs.replace(
      /canvas\.style\.display = 'none';/g,
      `if (canvas) canvas.style.display = 'none';`
    );
    return baseJs;
  }

  const canvasId = canvasMatch[2];
  const initPos = canvasMatch.index;
  const initLen = canvasMatch[0].length;

  // Boundary patterns that indicate the end of the canvas code block.
  // These are patterns that appear AFTER the canvas init and BEFORE any
  // scroll reveal, navigation, parallax, or other non-canvas code.
  // IMPORTANT: Do NOT use generic section delimiters like '// ====' because
  // they appear at both the START and END of sections. Only use specific
  // section names or DOM element references that uniquely identify non-canvas code.
  const boundaryPatterns = [
    'const revealElements = document.querySelectorAll',
    'const revealElements = document.querySelector',
    "const nav = document.getElementById('main-nav')",
    "const nav = document.querySelector('.nav-links')",
    "const nav = document.querySelector('.main-nav')",
    "const navToggle = document.getElementById('nav-toggle')",
    "const navLinks = document.querySelector('.nav-links')",
    '// Scroll Reveal',
    '// Reveal',
    '/* Scroll Reveals',
    '/* Reveal',
    'SCROLL REVEALS',
    '// Navigation',
    '// Nav',
    '/* Navigation',
    '/* Nav',
    'NAV SCROLL EFFECT',
    'MOBILE NAV TOGGLE',
    '// Mobile Nav',
    '// Parallax',
    '/* Parallax',
    'MASCOT PARALLAX',
    '// Mouse',
    '/* Mouse',
    '// Smooth Scroll',
    '/* Smooth Scroll',
    'SMOOTH SCROLL',
    '// Prefers Reduced',
    '/* Prefers Reduced',
    'PREFERS REDUCED MOTION',
  ];

  // Strip comments to avoid matching patterns inside comments or strings.
  const strippedJs = stripJsComments(baseJs);

  let boundaryPos = -1;
  for (const pattern of boundaryPatterns) {
    const pos = strippedJs.indexOf(pattern, initPos + initLen);
    if (pos !== -1 && (boundaryPos === -1 || pos < boundaryPos)) {
      boundaryPos = pos;
    }
  }

  // If no boundary found, try the IIFE end as a fallback
  if (boundaryPos === -1) {
    const iifeEnd = strippedJs.indexOf('})();', initPos + initLen);
    if (iifeEnd !== -1) {
      boundaryPos = iifeEnd;
    }
  }

  // If still no boundary, the entire file is canvas code (aigyptos style)
  // Use early return - safe because there's no nav/reveal after canvas
  if (boundaryPos === -1) {
    baseJs = baseJs.replace(
      canvasMatch[1],
      `const canvas = document.getElementById('${canvasId}');\n    if (!canvas) { console.log('[${templeId}] Canvas ${canvasId} not present on this page'); return; }\n    `
    );
    baseJs = baseJs.replace(
      /canvas\.style\.display = 'none';/g,
      `if (canvas) canvas.style.display = 'none';`
    );
    return baseJs;
  }

  // Found boundary - wrap canvas block in conditional
  const before = baseJs.slice(0, initPos);
  const block = baseJs.slice(initPos + initLen, boundaryPos);
  const after = baseJs.slice(boundaryPos);

  let result = before +
    `const canvas = document.getElementById('${canvasId}');\n    const ctx = canvas ? canvas.getContext('2d') : null;\n    if (ctx) {` +
    block +
    `\n    } else {\n      console.log('[${templeId}] Canvas ${canvasId} not present on this page');\n    }\n    ` +
    after;

  // Post-process: guard unguarded canvas.style.display references after } else {
  const elseBlockEnd = result.indexOf(`console.log('[${templeId}] Canvas ${canvasId} not present on this page');\n    }\n`);
  if (elseBlockEnd !== -1) {
    const afterElsePos = elseBlockEnd + `console.log('[${templeId}] Canvas ${canvasId} not present on this page');\n    }\n`.length;
    const afterElse = result.slice(afterElsePos);
    // Replace unguarded canvas.style.display = '...';
    const guarded = afterElse.replace(/(^|\n)(\s*)(canvas\.style\.display\s*=\s*['"][^'"]+['"];)/g, (match, newline, indent, stmt) => {
      // Don't double-guard
      const preceding = afterElse.slice(Math.max(0, afterElse.indexOf(match) - 20), afterElse.indexOf(match));
      if (preceding.includes('if (canvas)')) return match;
      return newline + indent + 'if (canvas) ' + stmt;
    });
    result = result.slice(0, afterElsePos) + guarded;
  }

  // Post-process: move canvas init calls (resize(), animate(), etc.) from after } else { to inside if (ctx)
  const initCallPattern = /\n(\s*)(resize|initTilt|animate|initElements|animateCanvas|animateLightning|initMist|initSparks|initKeys|initEmbers|initWaves|initParticles|initFlares|initTrails|initTendrils|initSouls|initHelm|initFire|initButterflies|initLeaves|initWheat|initSunbeams|initStars|initDust|initGlow|initOrbs|initPaths|initSnow|initRain|initFog|initClouds|initLightning|initBolts|initBranches|initSegments|initGlows|initFlashes|initPulses|initRings|initSpirals|initHexes|initNodes|initLinks|initTriangles|initCircles|initSquares|initDiamonds|initCrosses|initArrows|initDots|initLines|initCurves|initShapes|initForms|initPatterns|initTextures|initGradients|initShadows|initHighlights|initReflections|initRefractions|initDiffractions|initInterference|initScattering|initAbsorption|initEmission|initTransmission)\s*\(\)\s*;?\s*\n/g;

  if (elseBlockEnd !== -1) {
    const afterElsePos = elseBlockEnd + `console.log('[${templeId}] Canvas ${canvasId} not present on this page');\n    }\n`.length;
    const afterElse = result.slice(afterElsePos);
    const initCalls = [];
    let m;
    const maxScan = 800;
    const scanArea = afterElse.slice(0, maxScan);
    while ((m = initCallPattern.exec(scanArea)) !== null) {
      initCalls.push(m[0]);
    }
    if (initCalls.length > 0) {
      // Remove init calls from after } else {
      let cleanedAfter = afterElse;
      for (const call of initCalls) {
        cleanedAfter = cleanedAfter.replace(call, '');
      }
      // Insert them before } else {
      result = result.slice(0, afterElsePos) + initCalls.join('') + cleanedAfter;
    }
  }

  return result;
}

function mergeJs(templePath, templeId, colors) {
  let baseJs = '';

  if (colors.isFlagship) {
    baseJs = fs.readFileSync(path.join(templePath, 'script.js'), 'utf8');
  } else {
    baseJs = fs.readFileSync(TEMPLE_BASE_JS, 'utf8');
  }

  // Re-run guard: already has booking system?
  if (baseJs.includes('// ========== BOOKING SYSTEM ==========')) {
    // Check if it has the OLD broken guard and replace with surgical wrapping
    if (baseJs.includes('if (!canvas)') && baseJs.includes('return;')) {
      baseJs = removeOldCanvasGuard(baseJs);
      baseJs = applySurgicalCanvasWrapping(baseJs, templeId);
    }
    return baseJs;
  }

  // Apply surgical canvas wrapping
  baseJs = applySurgicalCanvasWrapping(baseJs, templeId);

  const nikeJs = fs.readFileSync(path.join(NIKE_DIR, 'script.js'), 'utf8');

  // Extract booking system from Nike JS
  const bookingStart = nikeJs.indexOf('// ========== NIKE BOOKING SYSTEM ==========');
  if (bookingStart === -1) {
    throw new Error('Could not find booking system in Nike script.js');
  }
  let bookingJs = nikeJs.substring(bookingStart);

  // Rename to generic booking system
  bookingJs = bookingJs.replace('// ========== NIKE BOOKING SYSTEM ==========', '// ========== BOOKING SYSTEM ==========');

  // Replace Nike-specific values
  bookingJs = bookingJs.replace(/window\.NIKE_API_BASE/g, `window.${templeId.toUpperCase()}_API_BASE`);
  bookingJs = bookingJs.replace(/site=nike/g, `site=${templeId}`);
  bookingJs = bookingJs.replace(/\/sites\/nike\//g, `/sites/${templeId}/`);
  bookingJs = bookingJs.replace(/nike\/dashboard/g, `${templeId}/dashboard`);

  // Standardize console prefix
  bookingJs = bookingJs.replace(/\[PUNYCODEX\]/g, `[PUNYCODEX:${templeId}]`);

  return baseJs + '\n\n' + bookingJs;
}

// ─── SLOT NAME GENERATION ────────────────────────────────────────────────

function generateSlotNames(entry) {
  const name = entry.unicode;
  const ascii = entry.ascii;
  const meaning = entry.meaning || '';
  const domain = entry.domain || '';
  const pantheon = entry.pantheon || 'greek';

  // Extract theme words from domain and meaning
  const stopWords = new Set(['the', 'and', 'or', 'from', 'possibly', 'maybe', 'probably', 'likely', 'perhaps', 'with', 'for', 'via', 'into']);
  const cleanWord = w => w.trim().replace(/^['"`]+|['"`]+$/g, '').replace(/[()]/g, '');
  const domainWords = domain.split(/[,\s&·]+/).map(cleanWord).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  const meaningWords = meaning.split(/[,\s()]+/).map(cleanWord).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // Build a rich pool of theme words
  let themeWords = [...domainWords];
  if (themeWords.length < 6 && meaningWords.length > 0) {
    themeWords = [...themeWords, ...meaningWords.slice(0, 6 - themeWords.length)];
  }
  // Add pantheon-specific fallback words
  if (themeWords.length < 4) {
    const pantheonWords = {
      greek: ['Olympus', 'Divine', 'Eternal', 'Sacred'],
      norse: ['Asgard', 'Runes', 'Frost', 'Eternal'],
      egyptian: ['Pharaoh', 'Desert', 'Eternal', 'Sacred'],
      sanskrit: ['Cosmos', 'Mantra', 'Eternal', 'Sacred'],
      japanese: ['Samurai', 'Cherry', 'Eternal', 'Sacred'],
    };
    const fallbacks = pantheonWords[pantheon] || pantheonWords.greek;
    themeWords = [...themeWords, ...fallbacks];
  }
  // Capitalize and deduplicate
  themeWords = [...new Set(themeWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)))];

  const w = (i) => themeWords[i % themeWords.length];

  // Each slot type gets a unique, themed name
  // Slot types: Crown(1), Column(2), Strip(3), Content I-III(4-6), Ribbon(7), Badge(8),
  //             Text(9), Emblem I-II(10-11), Foundation(12), Throne/Bundle(13)
  return [
    `${w(0)} Crown`,           // 01 - Hero position
    `${w(1)} Column`,          // 02 - Sidebar column
    `${w(2)} Banner`,          // 03 - Inline strip
    `${w(0)} Frame I`,         // 04 - Content half
    `${w(1)} Frame II`,        // 05 - Content half
    `${w(2)} Frame III`,       // 06 - Content half
    `${w(3)} Ribbon`,          // 07 - Thin ribbon
    `${w(0)} Seal`,            // 08 - Small badge
    `${w(1)} Inscription`,     // 09 - Text line
    `${w(2)} Emblem`,          // 10 - Small emblem
    `${w(3)} Sigil`,           // 11 - Small emblem
    `${w(0)} Foundation`,      // 12 - Footer strip
    `${w(1)} Dominion`,        // 13 - Full page bundle
  ];
}

// ─── HTML GENERATION ─────────────────────────────────────────────────────

function getDomainsText(entry, isFlagship) {
  const unicode = entry.unicode;
  const variantTexts = (entry.variants || []).map(v => v.unicode).filter(v => v !== unicode);
  const allForms = variantTexts.length > 0 ? [unicode, ...variantTexts] : [unicode];
  if (isFlagship) {
    return allForms.map(f => f + '.com').join(' \u00b7 ');
  }
  return allForms.join(' \u00b7 ');
}

function generateAdHomepage(entry, colors, slotNames, slotOffset) {
  let html = fs.readFileSync(path.join(NIKE_DIR, 'index.html'), 'utf8');

  const templeId = entry.id;
  const unicode = entry.unicode;
  const greek = entry.greek || unicode;
  const ascii = entry.ascii;
  const domain = entry.domain;
  const meaning = entry.meaning || '';
  const tier = entry.tier;
  const tierLabel = entry.tierLabel;
  const domainsText = getDomainsText(entry, colors.isFlagship);

  // ── STEP 1: Targeted body replacements (BEFORE any global name swaps) ──

  // Hero endorsement title + mascot alt (must match original Nike text)
  html = html.replace(
    /The Goddess of Victory, <span class="endorsement-greek">Níkē<\/span>/,
    `${domain}, <span class="endorsement-greek">${unicode}</span>`
  );
  html = html.replace(
    /alt="Níkē — Goddess of Victory"/,
    `alt="${unicode} — ${domain}"`
  );
  html = html.replace(
    /Twelve sacred frames\. One temple\. Claim your crown\./,
    `Twelve sacred frames. One temple. Claim your place.`
  );

  // Global "Goddess of Victory" replacement (catches meta, JSON-LD, etc.)
  html = html.replace(/Greek Goddess of Victory/g, domain);
  html = html.replace(/Goddess of Victory/g, domain);

  // Slot names and IDs
  for (let i = 0; i < 13; i++) {
    const oldNum = String(i + 1).padStart(2, '0');
    const newNum = String(slotOffset + i + 1).padStart(2, '0');
    html = html.replace(new RegExp(`data-space="${oldNum}"`, 'g'), `data-space="${newNum}"`);
  }

  // Replace slot names (placeholder strategy, longest first)
  const nikeSlotNames = [
    'Crown Position', 'Victory Column', 'Champion Strip', 'Wingspan I',
    'Wingspan II', 'Wingspan III', 'Golden Ribbon', 'Laurel Badge',
    'Inscription', 'Emblem I', 'Emblem II', 'Foundation', 'Total Conquest'
  ];
  const placeholders = nikeSlotNames.map((_, i) => `__SLOT_NAME_${i}__`);
  const sortedIndices = nikeSlotNames.map((name, i) => ({ name, i, len: name.length }))
    .sort((a, b) => b.len - a.len);
  for (const { i } of sortedIndices) {
    html = html.split(nikeSlotNames[i]).join(placeholders[i]);
  }
  for (let i = 0; i < 13; i++) {
    html = html.split(placeholders[i]).join(slotNames[i]);
  }

  // Footer
  html = html.replace(/níkē\.com &middot; nikē\.com/, domainsText);
  html = html.replace(/Dual‑Tier Pair \(Tier‑1 &amp; Tier‑2\)/, `${tierLabel}`);
  html = html.replace(/<span class="footer-value">Νίκη<\/span>/, `<span class="footer-value">${greek}</span>`);
  html = html.replace(/Self-Service Ads/g, tierLabel);
  html = html.replace(/Greek Original/g, 'Original Script');

  // ── STEP 2: Meta / head replacements ──

  html = html.replace(/<title>.*?<\/title>/, `<title>${unicode} — Endorsed by the ${domain}</title>`);
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="Your brand, endorsed by ${unicode} — the ${domain}. Premium advertising placements on a domain rooted in ancient power.">`);
  html = html.replace(/<meta property="og:title" content=".*?">/g, `<meta property="og:title" content="${unicode} — Endorsed by the ${domain}">`);
  html = html.replace(/<meta property="og:description" content=".*?">/g, `<meta property="og:description" content="Your brand, endorsed by ${unicode} — the ${domain}. Premium advertising placements on a domain rooted in ancient power.">`);
  html = html.replace(/<meta property="og:url" content=".*?">/g, `<meta property="og:url" content="https://punycodex.com/sites/${templeId}/">`);
  html = html.replace(/<meta name="twitter:title" content=".*?">/g, `<meta name="twitter:title" content="${unicode} — Endorsed by the ${domain}">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/g, `<meta name="twitter:description" content="Your brand, endorsed by ${unicode} — the ${domain}.">`);

  // Schema.org JSON-LD
  html = html.replace(/"name":\s*"Níkē[\s\S]*?"/, `"name": "${unicode} — Endorsed by the ${domain}"`);
  html = html.replace(/"name":\s*"Νίκη[\s\S]*?"/, `"name": "${unicode} — Endorsed by the ${domain}"`);
  html = html.replace(/"description":\s*"Your brand, endorsed by Níkē[\s\S]*?"/, `"description": "Your brand, endorsed by ${unicode} — the ${domain}."`);
  html = html.replace(/"url":\s*"https:\/\/punycodex.com\/nike\/"/, `"url": "https://punycodex.com/sites/${templeId}/"`);
  html = html.replace(/"name":\s*"Níkē"/, `"name": "${unicode}"`);
  html = html.replace(/"alternateName":\s*\[\s*"nike",\s*"Nike"\s*\]/, `"alternateName": ["${ascii}", "${unicode}"]`);
  html = html.replace(/"description":\s*"Victory"/, `"description": "${domain}"`);

  // ── STEP 3: Asset paths ──
  html = html.replace(/assets\/nike_/g, `assets/${templeId}_`);

  // Fix relative links for local file compatibility
  html = html.replace(/href="lore\/"/g, 'href="lore/index.html"');
  html = html.replace(/href="gallery\/"/g, 'href="gallery/index.html"');

  // ── STEP 4: Global name cleanup (LAST) ──
  html = html.replace(/Níkē/g, unicode);
  html = html.replace(/Νίκη/g, unicode);
  html = html.replace(/nike/gi, (m) => m.toLowerCase() === 'nike' ? templeId : m);

  // Cache bust
  html = html.replace(/\?v=perf37/g, '?v=perf1');

  return html;
}

function generateLorePage(entry, colors, sections, templePath, originalHtml) {
  const templeId = entry.id;
  const unicode = entry.unicode;
  const greek = entry.greek || unicode;
  const ascii = entry.ascii;
  const domain = entry.domain;
  const tier = entry.tier;
  const tierLabel = entry.tierLabel;
  const domainsText = getDomainsText(entry, colors.isFlagship);

  if (colors.isFlagship && originalHtml) {
    // For flagships, preserve the original temple content as the lore page
    // Use Cheerio for robust DOM manipulation
    const $ = cheerio.load(originalHtml);

    // Extract tab nav from Nike lore template
    const nikeLoreHtml = fs.readFileSync(path.join(NIKE_DIR, 'lore', 'index.html'), 'utf8');
    const $nike = cheerio.load(nikeLoreHtml);
    const tabNav = $nike('nav.main-nav.tab-nav').clone();

    // Update tab nav links for subdirectory
    tabNav.find('a[href="../"]').attr('href', '../index.html');
    tabNav.find('a[href="./"]').attr('href', './index.html');
    tabNav.find('a[href="../gallery/"]').attr('href', '../gallery/index.html');

    // Replace original nav with tab nav
    const existingNav = $('nav');
    if (existingNav.length > 0) {
      existingNav.replaceWith(tabNav);
    } else {
      // If no nav found, insert after body start
      $('body').prepend(tabNav);
    }

    // Fix paths in <head>
    $('link[href="styles.css"]').attr('href', '../styles.css');
    $('link[href^="styles.css?v="]').each((i, el) => {
      const href = $(el).attr('href');
      $(el).attr('href', href.replace('styles.css', '../styles.css'));
    });
    $('script[src="script.js"]').attr('src', '../script.js');
    $('script[src^="script.js?v="]').each((i, el) => {
      const src = $(el).attr('src');
      $(el).attr('src', src.replace('script.js', '../script.js'));
    });

    // Fix asset paths
    $('img[src^="assets/"]').each((i, el) => {
      $(el).attr('src', '../' + $(el).attr('src'));
    });
    $('source[srcset^="assets/"]').each((i, el) => {
      $(el).attr('srcset', '../' + $(el).attr('srcset'));
    });
    // Fix nested picture > source > img structures
    $('picture source[srcset^="assets/"]').each((i, el) => {
      $(el).attr('srcset', '../' + $(el).attr('srcset'));
    });

    // Update title
    $('title').text(`${unicode} — ${domain} | Lore | PUNYCODEX`);

    // Update meta description
    $('meta[name="description"]').attr('content', `The authentic digital shrine to ${unicode}, ${domain}. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ${greek}.`);

    // Update canonical
    $('link[rel="canonical"]').attr('href', `https://punycodex.com/sites/${templeId}/lore/`);

    // Update OG URL
    $('meta[property="og:url"]').attr('content', `https://punycodex.com/sites/${templeId}/lore/`);

    // Update OG title
    $('meta[property="og:title"]').attr('content', `${unicode} — ${domain} | Lore | PUNYCODEX`);

    // Update OG description
    $('meta[property="og:description"]').attr('content', `The authentic digital shrine to ${unicode}. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ${greek}.`);

    // Update footer (flagship lore)
    // For flagships, preserve the original domain value (it's already correct)
    // Only update classification and original script label
    $('.footer-block').each((i, block) => {
      const label = $(block).find('.footer-label').text().trim().toLowerCase();
      if (label.includes('classif') || label.includes('tier')) {
        $(block).find('.footer-value').text(tierLabel);
      }
      if (label.includes('greek') || label.includes('original')) {
        $(block).find('.footer-label').text('Original Script');
        $(block).find('.footer-value').text(greek);
      }
    });

    // Update Twitter
    $('meta[name="twitter:title"]').attr('content', `${unicode} — ${domain} | Lore | PUNYCODEX`);
    $('meta[name="twitter:description"]').attr('content', `The authentic digital shrine to ${unicode}. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ${greek}.`);

    // Update JSON-LD schema.org
    $('script[type="application/ld+json"]').each((i, el) => {
      let json = $(el).html();
      if (json) {
        json = json.split('Níkē').join(unicode);
        json = json.split('Νίκη').join(greek);
        json = json.split('Nike').join(ascii);
        json = json.split('nike').join(templeId);
        json = json.split('Victory, conquest').join(domain);
        $(el).html(json);
      }
    });

    // Serialize and do global string replacements
    let html = $.html();

    // Global name cleanup
    html = html.split('Níkē').join(unicode);
    html = html.split('Νίκη').join(greek);
    html = html.split('Nike').join(ascii);
    html = html.split('nike').join(templeId);

    // Footer domain/classification fix (in case Cheerio missed inline styles)
    html = html.replace(/<span class="footer-value">níkē\.com &middot; nikē\.com<\/span>/, `<span class="footer-value">${domainsText}</span>`);
    html = html.replace(/<span class="footer-value">Dual‑Tier Pair \(Tier‑1 &amp; Tier‑2\)<\/span>/, `<span class="footer-value">${tierLabel}</span>`);

    html = html.replace(/\?v=perf37/g, '?v=perf1');

    return html;
  }

  // For generated temples, use Nike lore template
  let html = fs.readFileSync(path.join(NIKE_DIR, 'lore', 'index.html'), 'utf8');

  // STEP 1: Targeted body content (BEFORE global name swaps)
  html = html.replace(/<span class="title-greek">\u039d\u03af\u03ba\u03b7<\/span>/, '<span class="title-greek">' + greek + '</span>');
  html = html.replace(/<span class="title-trans">N\u00edk\u0113<\/span>/, '<span class="title-trans">' + unicode + '</span>');
  html = html.replace(/Goddess of Victory &middot; She Who Crowns the Worthy &middot; Winged Triumph/, domain);
  html = html.replace(/Greek Goddess of Victory/g, domain);
  html = html.replace(/Goddess of Victory/g, domain);

  // Tier badges
  if (tier === 'dual') {
    // Keep dual tier badges
  } else if (tier === '1') {
    html = html.replace(/<span class="meta-badge tier-1">Tier\u20111 Accent\u2011Preserving<\/span>\s*<span class="tier-connector"><\/span>\s*<span class="meta-badge tier-2">Tier\u20112 Macron\u2011Preserving<\/span>/, '<span class="meta-badge tier-1">' + tierLabel + '</span>');
  } else {
    html = html.replace(/<span class="meta-badge tier-1">Tier\u20111 Accent\u2011Preserving<\/span>\s*<span class="tier-connector"><\/span>\s*<span class="meta-badge tier-2">Tier\u20112 Macron\u2011Preserving<\/span>/, '<span class="meta-badge tier-2">' + tierLabel + '</span>');
  }

  // Domain bridge
  html = html.replace(/<span class="meta-domain">n\u00edk\u0113\.com<\/span>\s*<span class="domain-connector">\u00b7<\/span>\s*<span class="meta-domain-alt">nik\u0113\.com<\/span>/, '<span class="meta-domain">' + domainsText + '</span>');

  // Footer
  html = html.replace(/<span class="footer-value">n\u00edk\u0113\.com &middot; nik\u0113\.com<\/span>/, '<span class="footer-value">' + domainsText + '</span>');
  html = html.replace(/<span class="footer-value">Dual\u2011Tier Pair \(Tier\u20111 &amp; Tier\u20112\)<\/span>/, '<span class="footer-value">' + tierLabel + '</span>');
  html = html.replace(/<span class="footer-value">\u039d\u03af\u03ba\u03b7<\/span>/, '<span class="footer-value">' + greek + '</span>');
  html = html.replace(/Greek Original/g, 'Original Script');

  // Canvas ID
  const canvasId = sections.__canvasId || 'particle-canvas';
  html = html.replace(/id="victory-canvas"/g, 'id="' + canvasId + '"');
  html = html.replace(/<!-- Victory Canvas -->/g, '<!-- ' + templeId.charAt(0).toUpperCase() + templeId.slice(1) + ' Canvas -->');

  // Tab nav links
  html = html.replace(/<a href="\.\.\/" class="nav-link">Home<\/a>/, '<a href="../index.html" class="nav-link">Home</a>');
  html = html.replace(/<a href="\.\/" class="nav-link active">Lore<\/a>/, '<a href="./index.html" class="nav-link active">Lore</a>');
  html = html.replace(/<a href="\.\.\/gallery\/" class="nav-link">Gallery<\/a>/, '<a href="../gallery/index.html" class="nav-link">Gallery</a>');

  // STEP 2: Meta / head replacements
  html = html.replace(/<title>.*?<\/title>/, '<title>' + unicode + ' — ' + domain + ' | Lore | PUNYCODEX</title>');
  html = html.replace(/<meta name="description" content=".*?">/, '<meta name="description" content="The authentic digital shrine to ' + unicode + ', ' + domain + '. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ' + greek + '.">');
  html = html.replace(/<meta property="og:title" content=".*?">/g, '<meta property="og:title" content="' + unicode + ' — ' + domain + ' | Lore | PUNYCODEX">');
  html = html.replace(/<meta property="og:description" content=".*?">/g, '<meta property="og:description" content="The authentic digital shrine to ' + unicode + '. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ' + greek + '.">');
  html = html.replace(/<meta property="og:url" content=".*?">/g, '<meta property="og:url" content="https://punycodex.com/sites/' + templeId + '/lore/">');
  html = html.replace(/<meta name="twitter:title" content=".*?">/g, '<meta name="twitter:title" content="' + unicode + ' — ' + domain + ' | Lore | PUNYCODEX">');
  html = html.replace(/<meta name="twitter:description" content=".*?">/g, '<meta name="twitter:description" content="The authentic digital shrine to ' + unicode + '. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ' + greek + '.">');

  // Schema.org
  html = html.replace(/"name":\s*"N\u00edk\u0113.*?"/, '"name": "' + unicode + ' — ' + domain + ' | Lore"');
  html = html.replace(/"description":\s*"The authentic digital shrine to N\u00edk\u0113.*?"/, '"description": "The authentic digital shrine to ' + unicode + '."');
  html = html.replace(/"url":\s*"https:\/\/punycodex.com\/nike\/lore\/"/, '"url": "https://punycodex.com/sites/' + templeId + '/lore/"');
  html = html.replace(/"name":\s*"N\u00edk\u0113"/, '"name": "' + unicode + '"');
  html = html.replace(/"alternateName":\s*[\s*"nike",\s*"N\u00edk\u0113"\s*]/, '"alternateName": ["' + ascii + '", "' + unicode + '"]');
  html = html.replace(/"description":\s*"Victory, conquest"/, '"description": "' + domain + '"');
  html = html.replace(/nike\/assets\/nike_mascot\.png/g, 'sites/' + templeId + '/assets/' + templeId + '_mascot.png');

  // Asset paths
  html = html.replace(/\.\.\/assets\/nike_/g, '../assets/' + templeId + '_');
  html = html.replace(/\.\.\/script\.js/g, '../script.js');

  // STEP 3: Global name cleanup (LAST)
  html = html.split('Níkē').join(entry.unicode);
  html = html.split('Νίκη').join(entry.greek || entry.unicode);
  html = html.split('Nike').join(entry.ascii);
  html = html.split('nike').join(entry.id);

  // Cache bust
  html = html.replace(/\?v=perf37/g, '?v=perf1');

  return html;
}

function generateGalleryPage(entry, colors, sections) {
  let html = fs.readFileSync(path.join(NIKE_DIR, 'gallery', 'index.html'), 'utf8');

  const templeId = entry.id;
  const unicode = entry.unicode;
  const greek = entry.greek || unicode;
  const domain = entry.domain;
  const tierLabel = entry.tierLabel;
  const domainsText = getDomainsText(entry, colors.isFlagship);

  // Basic replacements
  html = html.replace(/<title>.*?<\/title>/, `<title>${unicode} — Gallery | ${domain} | PUNYCODEX</title>`);
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="A curated gallery of ${unicode}, ${domain}, through history.">`);

  // OG
  html = html.replace(/<meta property="og:title" content=".*?">/g, `<meta property="og:title" content="${unicode} — Gallery | ${domain} | PUNYCODEX">`);
  html = html.replace(/<meta property="og:description" content=".*?">/g, `<meta property="og:description" content="A curated gallery of ${unicode}, ${domain}, through history.">`);
  html = html.replace(/<meta property="og:url" content=".*?">/g, `<meta property="og:url" content="https://punycodex.com/sites/${templeId}/gallery/">`);

  // Twitter
  html = html.replace(/<meta name="twitter:title" content=".*?">/g, `<meta name="twitter:title" content="${unicode} — Gallery | ${domain} | PUNYCODEX">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/g, `<meta name="twitter:description" content="A curated gallery of ${unicode}, ${domain}, through history.">`);

  // Canonical
  html = html.replace(/<link rel="canonical" href=".*?">/, `<link rel="canonical" href="https://punycodex.com/sites/${templeId}/gallery/">`);

  // Assets
  html = html.replace(/\.\.\/assets\/nike_/g, `../assets/${templeId}_`);
  html = html.replace(/\.\.\/script\.js/g, `../script.js`);

  // Tab nav links
  html = html.replace(/<a href="\.\.\/" class="nav-link">Home<\/a>/, '<a href="../index.html" class="nav-link">Home</a>');
  html = html.replace(/<a href="\.\.\/lore\/" class="nav-link">Lore<\/a>/, '<a href="../lore/index.html" class="nav-link">Lore</a>');
  html = html.replace(/<a href="\.\/" class="nav-link active">Gallery<\/a>/, '<a href="./index.html" class="nav-link active">Gallery</a>');

  // Canvas
  const canvasId = sections.__canvasId || 'particle-canvas';
  html = html.replace(/id="victory-canvas"/g, `id="${canvasId}"`);
  html = html.replace(/<!-- Victory Canvas -->/g, `<!-- ${templeId.charAt(0).toUpperCase() + templeId.slice(1)} Canvas -->`);

  // Hero
  html = html.replace(/<span class="title-greek">Νίκη<\/span>/, `<span class="title-greek">${greek}</span>`);
  html = html.replace(/<span class="title-trans">Gallery<\/span>/, `<span class="title-trans">Gallery</span>`);
  html = html.replace(/Art &middot; Sculpture &middot; Vase Painting &middot; Coinage &middot; Architecture/, `${domain}`);

  // Global cleanup
  html = html.replace(/Greek Goddess of Victory/g, domain);
  html = html.replace(/Goddess of Victory/g, domain);

  // Also replace remaining Nike references
  html = html.split('Níkē').join(unicode);
  html = html.split('Νίκη').join(greek);

  // Footer
  html = html.replace(/<span class="footer-value">níkē\.com &middot; nikē\.com<\/span>/, `<span class="footer-value">${domainsText}</span>`);
  html = html.replace(/<span class="footer-value">Dual‑Tier Pair \(Tier‑1 &amp; Tier‑2\)<\/span>/, `<span class="footer-value">${tierLabel}</span>`);
  html = html.replace(/<span class="footer-value">Νίκη<\/span>/, `<span class="footer-value">${greek}</span>`);
  html = html.replace(/Greek Original/g, 'Original Script');

  // Gallery grid - replace hardcoded Nike art with generic placeholder
  const $ = cheerio.load(html);
  const galleryGrid = $('.gallery-grid');
  if (galleryGrid.length > 0) {
    galleryGrid.empty();
    galleryGrid.append(`
    <div class="gallery-item reveal-up">
      <div class="gallery-placeholder">
        <span class="gallery-label">Gallery images coming soon</span>
        <span class="gallery-meta">${unicode} — ${domain}</span>
      </div>
      <p class="gallery-caption">A curated collection of ${unicode}, ${domain}, through history.</p>
    </div>
    `);
  }
  html = $.html();

  // Cache bust
  html = html.replace(/\?v=perf37/g, '?v=perf1');

  return html;
}

// ─── VALIDATORS ────────────────────────────────────────────────────────────

function validateCssVariables(cssPath) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const uses = [...css.matchAll(/var\(--([\w-]+)\)/g)].map(m => m[1]);
  const defs = [...css.matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]);
  const missing = [...new Set(uses)].filter(v => !new Set(defs).has(v));
  if (missing.length) {
    console.warn('  ⚠️  Missing CSS variables:', missing.sort().join(', '));
    return false;
  }
  console.log('  ✓ All CSS variables defined');
  return true;
}

function validateCloneDna(files, templeId) {
  const forbidden = ['solar disk', 'sun god', 'sun barge', 'Khepri', 'scarab', 'caduceus', 'winged sandals', 'Hermes', 'victory-canvas', 'Victory Column', 'Champion Strip'];
  let clean = true;
  for (const f of files) {
    const h = fs.readFileSync(f, 'utf8');
    const lower = h.toLowerCase();
    for (const word of forbidden) {
      if (lower.includes(word.toLowerCase())) {
        console.warn(`  ⚠️  Clone DNA: "${word}" in ${f}`);
        clean = false;
      }
    }
  }
  if (clean) console.log('  ✓ No clone DNA detected');
  return clean;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const templeId = args[0];
  const dryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--skip-backup');

  if (!templeId) {
    console.error('Usage: node scripts/convert-temple-to-ad.js <temple-id> [--dry-run] [--skip-backup]');
    process.exit(1);
  }

  const templePath = path.join(SITES_DIR, templeId);
  if (!fs.existsSync(templePath)) {
    console.error(`Temple not found: ${templePath}`);
    process.exit(1);
  }

  // Load lexicon
  const LEXICON = loadLexicon();
  const entry = LEXICON.find(e => e.id === templeId);
  if (!entry) {
    console.error(`Lexicon entry not found: ${templeId}`);
    process.exit(1);
  }

  console.log(`\n🎯 Converting ${templeId} (${entry.unicode}) → Ad Homepage`);

  // Detect type
  const templeType = detectTempleType(templePath);
  console.log(`   Type: ${templeType}`);

  // Extract colors
  const colors = extractColors(templeId, templePath, entry.pantheon);
  colors.pantheon = entry.pantheon;
  console.log(`   Palette: primary=${colors.primary}, secondary=${colors.secondary}, darkest=${colors.darkestBg}`);

  // Extract sections
  const sections = extractSections(templePath);
  console.log(`   Sections found: ${Object.keys(sections).filter(k => !k.startsWith('__')).join(', ')}`);

  // Generate slot names
  const slotNames = generateSlotNames(entry);
  const slotOffset = 52; // Next available after Akh (40-52)

  if (dryRun) {
    console.log('\n   [DRY RUN] No files written.');
    console.log('   Slot names:', slotNames);
    return;
  }

  // Backup
  if (!skipBackup) {
    const backupDir = path.join(templePath, '.backup', Date.now().toString());
    fs.mkdirSync(backupDir, { recursive: true });
    const filesToBackup = ['index.html', 'styles.css', 'script.js'].filter(f => fs.existsSync(path.join(templePath, f)));
    for (const f of filesToBackup) {
      fs.copyFileSync(path.join(templePath, f), path.join(backupDir, f));
    }
    console.log(`   Backup: ${backupDir}`);
  }

  // Create subdirectories
  fs.mkdirSync(path.join(templePath, 'lore', 'extended'), { recursive: true });
  fs.mkdirSync(path.join(templePath, 'gallery'), { recursive: true });
  fs.mkdirSync(path.join(templePath, 'dashboard'), { recursive: true });

  // Generate CSS
  console.log('   Generating styles.css...');
  const css = mergeCss(templePath, colors);
  fs.writeFileSync(path.join(templePath, 'styles.css'), css, 'utf8');

  // Generate JS
  console.log('   Generating script.js...');
  const js = mergeJs(templePath, templeId, colors);
  fs.writeFileSync(path.join(templePath, 'script.js'), js, 'utf8');

  // Generate HTML files
  // Save original flagship HTML before overwriting (needed for lore page)
  let originalHtml = colors.isFlagship
    ? fs.readFileSync(path.join(templePath, 'index.html'), 'utf8')
    : null;

  // Re-run guard: if originalHtml is already the ad homepage, try to restore from backup
  if (originalHtml && originalHtml.includes('endorsement-hero')) {
    const backupDir = path.join(templePath, '.backup');
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir)
        .filter(d => /^\d+$/.test(d))
        .sort((a, b) => parseInt(b) - parseInt(a));
      if (backups.length > 0) {
        const backupPath = path.join(backupDir, backups[0], 'index.html');
        if (fs.existsSync(backupPath)) {
          originalHtml = fs.readFileSync(backupPath, 'utf8');
          console.log(`   Re-conversion: using original from backup ${backups[0]}`);
        }
      }
    }
  }

  console.log('   Generating index.html...');
  const adHtml = generateAdHomepage(entry, colors, slotNames, slotOffset);
  fs.writeFileSync(path.join(templePath, 'index.html'), adHtml, 'utf8');

  console.log('   Generating lore/index.html...');
  const loreHtml = generateLorePage(entry, colors, sections, templePath, originalHtml);
  fs.writeFileSync(path.join(templePath, 'lore', 'index.html'), loreHtml, 'utf8');

  console.log('   Generating gallery/index.html...');
  const galleryHtml = generateGalleryPage(entry, colors, sections);
  fs.writeFileSync(path.join(templePath, 'gallery', 'index.html'), galleryHtml, 'utf8');

  // Copy dashboard
  const nikeDashboard = path.join(NIKE_DIR, 'dashboard', 'index.html');
  if (fs.existsSync(nikeDashboard)) {
    let dash = fs.readFileSync(nikeDashboard, 'utf8');
    dash = dash.replace(/nike/g, templeId);
    fs.writeFileSync(path.join(templePath, 'dashboard', 'index.html'), dash, 'utf8');
  }

  // Copy extended lore
  const nikeExtended = path.join(NIKE_DIR, 'lore', 'extended', 'index.html');
  if (fs.existsSync(nikeExtended)) {
    let ext = fs.readFileSync(nikeExtended, 'utf8');
    ext = ext.replace(/nike/g, templeId);
    ext = ext.replace(/Níkē/g, entry.unicode);
    ext = ext.replace(/Νίκη/g, entry.greek || entry.unicode);
    fs.writeFileSync(path.join(templePath, 'lore', 'extended', 'index.html'), ext, 'utf8');
  }

  // Validation
  console.log('\n   Running validators...');
  validateCssVariables(path.join(templePath, 'styles.css'));
  validateCloneDna([
    path.join(templePath, 'index.html'),
    path.join(templePath, 'lore', 'index.html'),
    path.join(templePath, 'gallery', 'index.html'),
  ], templeId);

  console.log(`\n✅ ${templeId} converted successfully!`);
  console.log(`   Next: Test the page at sites/${templeId}/index.html`);
}

main();

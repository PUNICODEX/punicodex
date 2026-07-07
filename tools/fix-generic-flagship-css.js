#!/usr/bin/env node
/**
 * Rebuild the generic flagship styles.css files from the current template,
 * re-injecting the per-deity :root palette so variables are not lost.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'templates', 'flagship', 'flagship.css');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const IDS = [
  'ahuramazda', 'lakshmi', 'ma', 'nikko', 'nirmata', 'om',
  'parvati', 'ptah', 'rama', 'tiamat', 'tyr', 'valholl',
];

const PANTHEON_COLORS = {
  greek: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  'greek-location': { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  norse: { primary: '#C0C0C0', primaryDim: '#808080', primaryBright: '#E8E8E8', secondary: '#5C9BD1' },
  egyptian: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#1E3A5F' },
  sanskrit: { primary: '#FF9933', primaryDim: '#CC7A29', primaryBright: '#FFB366', secondary: '#8B0000' },
  celtic: { primary: '#228B22', primaryDim: '#1A6B1A', primaryBright: '#32CD32', secondary: '#B8D4E3' },
  mesopotamian: { primary: '#CD7F32', primaryDim: '#A06020', primaryBright: '#E09040', secondary: '#C2B280' },
  polynesian: { primary: '#1E90FF', primaryDim: '#1670CC', primaryBright: '#4DA6FF', secondary: '#FF7F50' },
  japanese: { primary: '#DC143C', primaryDim: '#A01030', primaryBright: '#FF3355', secondary: '#1A1A1A' },
  nahuatl: { primary: '#50C878', primaryDim: '#3A9E5A', primaryBright: '#6EE89A', secondary: '#2F2F2F' },
  yoruba: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4B0082' },
  slavic: { primary: '#C0C0C0', primaryDim: '#808080', primaryBright: '#E8E8E8', secondary: '#228B22' },
  zoroastrian: { primary: '#FF4500', primaryDim: '#CC3700', primaryBright: '#FF6633', secondary: '#F5F5F5' },
  incan: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#DC143C' },
  canaanite: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  phoenician: { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#800080' },
  hittite: { primary: '#CD7F32', primaryDim: '#A06020', primaryBright: '#E09040', secondary: '#C2B280' },
};

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function lighten(hex, amount = 20) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    '#' +
    [rgb.r + amount, rgb.g + amount, rgb.b + amount]
      .map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function paletteFor(entry) {
  const pc = PANTHEON_COLORS[entry.pantheon] || PANTHEON_COLORS.greek;
  return {
    primary: pc.primary,
    primaryDim: pc.primaryDim,
    primaryBright: pc.primaryBright,
    secondary: pc.secondary,
    secondaryGlow: lighten(pc.secondary, 40),
    accent: '#DC143C',
    void: '#0A0A0A',
    voidDeep: '#050505',
    white: '#F5F5F5',
    whiteDim: '#A0A0A0',
  };
}

function buildRootVariables(p) {
  const pr = hexToRgb(p.primary);
  const vdr = hexToRgb(p.voidDeep);
  const cardSurface = `rgb(${vdr.r + 15},${vdr.g + 15},${vdr.b + 15})`;
  const cardRgba = `${vdr.r + 15},${vdr.g + 15},${vdr.b + 15}`;
  return `
/* ===== FLAGSHIP VARIABLES (auto-generated) ===== */
:root {
  --primary: ${p.primary};
  --primary-dim: ${p.primaryDim};
  --primary-bright: ${p.primaryBright};
  --secondary: ${p.secondary};
  --secondary-glow: ${p.secondaryGlow};
  --accent: ${p.accent};
  --void: ${p.void};
  --void-deep: ${p.voidDeep};
  --white: ${p.white};
  --white-dim: ${p.whiteDim};
  --white-faint: rgba(255,255,255,0.06);
  --section-pad: clamp(6rem, 12vh, 10rem);
  --container-max: 1200px;
  --font-display: 'Cinzel', 'Trajan Pro', 'Times New Roman', serif;
  --font-body: 'Lato', 'Helvetica Neue', sans-serif;
  --font-mono: 'Fira Code', 'Courier New', monospace;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

  --nav-height: 72px;
  --classic-gold: var(--primary);
  --pale-gold: var(--primary-bright);
  --gold-dim: var(--primary-dim);
  --gold-bright: var(--primary-bright);
  --text-gold: var(--primary);
  --bg-primary: var(--void-deep);
  --bg-secondary: var(--void);
  --bg-nav: rgba(${vdr.r},${vdr.g},${vdr.b},0.95);
  --bg-card: rgba(${cardRgba},0.8);
  --bg-elevated: ${cardSurface};
  --text-primary: var(--white);
  --text-secondary: var(--white-dim);
  --text-muted: var(--white-dim);
  --font-greek: 'Georgia', 'Times New Roman', serif;
  --gradient-card: linear-gradient(135deg, rgba(${cardRgba},0.85), rgba(${vdr.r},${vdr.g},${vdr.b},0.92));
  --gradient-gold: linear-gradient(135deg, var(--classic-gold), var(--gold-bright));
  --shadow-gold: 0 0 30px rgba(${pr.r},${pr.g},${pr.b},0.15);
  --shadow-card: 0 8px 32px rgba(0,0,0,0.4);
  --success: #4ade80;
  --black: #000000;
}
`;
}

function buildCss(palette) {
  let css = fs.readFileSync(TEMPLATE, 'utf8');
  css = css.replace(/:root\s*\{[^}]*\}/g, '');

  const pr = hexToRgb(palette.primary);
  const vdr = hexToRgb(palette.voidDeep);

  const colorMap = {
    '#D4AF37': 'var(--primary)',
    '#8B7355': 'var(--primary-dim)',
    '#F0D878': 'var(--primary-bright)',
    '#4169E1': 'var(--secondary)',
    '#87CEEB': 'var(--secondary-glow)',
    '#DC143C': 'var(--accent)',
    '#0A0A0A': 'var(--void)',
    '#050505': 'var(--void-deep)',
    '#F5F5F5': 'var(--white)',
    '#A0A0A0': 'var(--white-dim)',
  };
  for (const [hex, replacement] of Object.entries(colorMap)) {
    css = css.split(hex).join(replacement);
  }

  // Replace donor rgba primary tints with the actual palette
  css = css.replace(
    /rgba\(212,\s*175,\s*55,\s*([0-9.]+)\)/g,
    `rgba(${pr.r},${pr.g},${pr.b},$1)`
  );

  const rootVars = buildRootVariables(palette);
  return rootVars.trimStart() + '\n' + css.trim();
}

for (const id of IDS) {
  const entry = LEXICON.find((e) => e.id === id);
  if (!entry) {
    console.error(`Lexicon entry not found: ${id}`);
    continue;
  }
  const palette = paletteFor(entry);
  const css = buildCss(palette);
  const outPath = path.join(ROOT, 'sites', id, 'styles.css');
  fs.writeFileSync(outPath, css);
  console.log(`Rebuilt ${outPath} (${entry.pantheon}, ${palette.primary})`);
}

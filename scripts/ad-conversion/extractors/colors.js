/**
 * Color Extractor — Auto-extract palette from any temple
 *
 * Returns a color mapping object:
 * {
 *   darkestBg: '#050505',      // Replaces #0a121f
 *   pageBg: '#0A0A0A',         // Replaces rgba(10,18,31,X)
 *   cardSurface: 'rgba(30,58,95,', // Replaces rgba(14,26,43,X)
 *   primaryAccent: '#D4AF37',  // Replaces rgba(212,175,55,X)
 *   secondaryAccent: '#4169E1', // Replaces rgba(27,58,92,X)
 *   fontBody: "'Lato', 'Helvetica Neue', sans-serif"
 * }
 */

const fs = require('fs');
const path = require('path');

// Pantheon colors from generate-temples.js
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

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToRgbaStr(r, g, b) {
  return `rgba(${r},${g},${b},`;
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function isDarkColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return getLuminance(rgb.r, rgb.g, rgb.b) < 0.3;
}

function isGoldColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Gold-ish: high red+green, low blue, medium-high luminance
  const lum = getLuminance(rgb.r, rgb.g, rgb.b);
  return rgb.r > 180 && rgb.g > 140 && rgb.b < 100 && lum > 0.3 && lum < 0.9;
}

/**
 * Extract colors from a flagship temple's local styles.css
 */
function extractFromFlagship(templePath) {
  const cssPath = path.join(templePath, 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Extract all CSS variables
  const vars = {};
  const varMatches = [...css.matchAll(/--([\w-]+)\s*:\s*([^;\n]+)/g)];
  varMatches.forEach(m => {
    vars[m[1]] = m[2].trim();
  });

  // Find font-family
  const fontMatch = css.match(/font-family\s*:\s*([^;\n]+)/);
  const fontBody = fontMatch ? fontMatch[1].trim() : "'Lato', 'Helvetica Neue', sans-serif";

  // Determine darkest background
  let darkestBg = '#050505';
  const darkCandidates = [
    vars['void-deep'], vars['bg-deep'], vars['bg-primary'],
    vars['void'], vars['bg-dark'], vars['bg-void']
  ].filter(Boolean);

  if (darkCandidates.length > 0) {
    // Pick the darkest one by luminance
    const scored = darkCandidates.map(c => {
      const rgb = hexToRgb(c);
      if (rgb) return { color: c, lum: getLuminance(rgb.r, rgb.g, rgb.b) };
      return { color: c, lum: 0.5 };
    });
    scored.sort((a, b) => a.lum - b.lum);
    darkestBg = scored[0].color;
  }

  // Determine primary accent
  let primaryAccent = '#D4AF37';
  const primaryCandidates = [
    vars['primary'], vars['gold'], vars['accent-gold'], vars['classic-gold'],
    vars['accent'], vars['gold-bright']
  ].filter(Boolean);

  if (primaryCandidates.length > 0) {
    primaryAccent = primaryCandidates[0];
  }

  // Determine secondary accent
  let secondaryAccent = '#4169E1';
  const secondaryCandidates = [
    vars['secondary'], vars['lightning'], vars['accent-star'],
    vars['secondary-accent'], vars['storm']
  ].filter(Boolean);

  if (secondaryCandidates.length > 0) {
    secondaryAccent = secondaryCandidates[0];
  }

  // Determine card surface (darker than page bg but not as dark as void)
  let cardSurface = null;
  const cardCandidates = [
    vars['bg-card'], vars['card-bg'], vars['surface'], vars['storm']
  ].filter(Boolean);

  if (cardCandidates.length > 0) {
    cardSurface = cardCandidates[0];
  } else {
    // Derive from secondary if it's dark
    const secRgb = hexToRgb(secondaryAccent);
    if (secRgb && isDarkColor(secondaryAccent)) {
      cardSurface = rgbToRgbaStr(secRgb.r, secRgb.g, secRgb.b);
    } else {
      const darkRgb = hexToRgb(darkestBg) || { r: 5, g: 5, b: 5 };
      cardSurface = rgbToRgbaStr(
        Math.min(255, darkRgb.r + 20),
        Math.min(255, darkRgb.g + 20),
        Math.min(255, darkRgb.b + 20)
      );
    }
  }

  // Page background (slightly lighter than darkest)
  const darkRgb = hexToRgb(darkestBg) || { r: 5, g: 5, b: 5 };
  const pageBg = rgbToHex(
    Math.min(255, darkRgb.r + 5),
    Math.min(255, darkRgb.g + 5),
    Math.min(255, darkRgb.b + 5)
  );

  return {
    darkestBg,
    pageBg,
    cardSurface,
    primaryAccent,
    secondaryAccent,
    fontBody,
    rawVars: vars
  };
}

/**
 * Extract colors from a generated base temple (uses temple-base.css + inline style)
 */
function extractFromGenerated(templePath, pantheon) {
  const htmlPath = path.join(templePath, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract inline style colors
  const vars = {};
  const styleMatch = html.match(/<style>\s*:root\s*\{([^}]+)\}/);
  if (styleMatch) {
    const styleBlock = styleMatch[1];
    const matches = [...styleBlock.matchAll(/--([\w-]+)\s*:\s*([^;\n]+)/g)];
    matches.forEach(m => {
      vars[m[1]] = m[2].trim();
    });
  }

  // Use pantheon colors as fallback
  const pc = PANTHEON_COLORS[pantheon] || PANTHEON_COLORS.greek;

  const darkestBg = '#050505';
  const pageBg = '#0A0A0A';
  const primaryAccent = vars['primary'] || pc.primary;
  const secondaryAccent = vars['secondary'] || pc.secondary;

  // Card surface derived from secondary if dark, else from primary-dim
  const secRgb = hexToRgb(secondaryAccent);
  let cardSurface;
  if (secRgb && isDarkColor(secondaryAccent)) {
    cardSurface = rgbToRgbaStr(secRgb.r, secRgb.g, secRgb.b);
  } else {
    const primRgb = hexToRgb(primaryAccent) || { r: 212, g: 175, b: 55 };
    cardSurface = rgbToRgbaStr(
      Math.max(0, primRgb.r - 50),
      Math.max(0, primRgb.g - 50),
      Math.max(0, primRgb.b - 50)
    );
  }

  return {
    darkestBg,
    pageBg,
    cardSurface,
    primaryAccent,
    secondaryAccent,
    fontBody: "'Lato', 'Helvetica Neue', sans-serif",
    rawVars: vars
  };
}

function extract(templeId, templePath, pantheon) {
  const isFlagship = fs.existsSync(path.join(templePath, 'styles.css'));

  if (isFlagship) {
    return extractFromFlagship(templePath);
  }
  return extractFromGenerated(templePath, pantheon);
}

module.exports = { extract, PANTHEON_COLORS };

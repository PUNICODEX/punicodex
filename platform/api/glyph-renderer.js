/**
 * PuniCodex — Glyph Renderer (font-metric backend)
 *
 * Provides perceptual, rendered-style similarity between two strings without
 * requiring a native canvas library. It uses a curated table of glyph geometry
 * metrics and falls back to script/category inference for unknown characters.
 *
 * The module is designed to be backend-pluggable: if a native canvas library
 * is available, the same API can swap in a pixel-based renderer. For now the
 * default backend is pure JavaScript so the classifier runs everywhere:
 * serverless edge functions, browser extensions, mobile SDKs, and IoT devices.
 */

const CONFUSABLE_DB = require('../db/confusables.json');

const CONFUSABLE_TO_ASCII = new Map(
  CONFUSABLE_DB.entries.map((entry) => [entry.char, entry.target])
);

const CONTEXTUAL_SUBSTITUTIONS = [
  { pattern: 'rn', replacement: 'm' },
  { pattern: 'vv', replacement: 'w' },
  { pattern: 'cl', replacement: 'd' },
  { pattern: 'nn', replacement: 'm' },
  { pattern: 'ii', replacement: 'n' },
  { pattern: 'lI', replacement: 'U' },
  { pattern: '0O', replacement: 'O' },
  { pattern: 'O0', replacement: 'O' },
];

// Normalized glyph geometry features in the range [0, 1].
// Features:
//   width, height, ascender, descender, xHeight,
//   centerX, centerY,
//   openLoops (e.g., a, b, d, e, o, p, q), closedLoops (e.g., B, D, O),
//   verticalStrokes, horizontalStrokes, diagonalStrokes
const GLYPH_METRICS = new Map();

function defineMetric(ch, metrics) {
  GLYPH_METRICS.set(ch, { ...DEFAULT_METRICS(), ...metrics });
}

function DEFAULT_METRICS() {
  return {
    width: 0.5,
    height: 0.45,
    ascender: 0.0,
    descender: 0.0,
    xHeight: 0.45,
    centerX: 0.25,
    centerY: 0.22,
    openLoops: 0,
    closedLoops: 0,
    verticalStrokes: 1,
    horizontalStrokes: 0,
    diagonalStrokes: 0,
    tags: [],
  };
}

function buildAsciiMetrics() {
  const lowercase = [
    [
      'a',
      {
        width: 0.55,
        xHeight: 0.45,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'rightStem', 'xHeight'],
      },
    ],
    [
      'b',
      {
        width: 0.5,
        height: 0.7,
        ascender: 0.25,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'leftStem', 'ascender'],
      },
    ],
    [
      'c',
      {
        width: 0.45,
        xHeight: 0.45,
        openLoops: 0,
        verticalStrokes: 0,
        tags: ['openRight', 'xHeight'],
      },
    ],
    [
      'd',
      {
        width: 0.5,
        height: 0.7,
        ascender: 0.25,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'rightStem', 'ascender'],
      },
    ],
    [
      'e',
      {
        width: 0.5,
        xHeight: 0.45,
        openLoops: 1,
        verticalStrokes: 0,
        tags: ['bowl', 'middleBar', 'xHeight'],
      },
    ],
    [
      'f',
      {
        width: 0.35,
        height: 0.7,
        ascender: 0.25,
        verticalStrokes: 1,
        tags: ['ascender', 'topHook', 'crossbar'],
      },
    ],
    [
      'g',
      {
        width: 0.5,
        height: 0.65,
        descender: 0.2,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'loop', 'descender'],
      },
    ],
    [
      'h',
      {
        width: 0.5,
        height: 0.7,
        ascender: 0.25,
        verticalStrokes: 2,
        tags: ['leftStem', 'rightStem', 'ascender'],
      },
    ],
    ['i', { width: 0.2, xHeight: 0.45, verticalStrokes: 1, tags: ['dot', 'stem', 'xHeight'] }],
    [
      'j',
      {
        width: 0.25,
        height: 0.65,
        descender: 0.2,
        verticalStrokes: 1,
        tags: ['dot', 'descender', 'stem'],
      },
    ],
    [
      'k',
      {
        width: 0.45,
        height: 0.7,
        ascender: 0.25,
        verticalStrokes: 1,
        diagonalStrokes: 2,
        tags: ['leftStem', 'ascender', 'diagonals'],
      },
    ],
    [
      'l',
      { width: 0.15, height: 0.7, ascender: 0.25, verticalStrokes: 1, tags: ['stem', 'ascender'] },
    ],
    ['m', { width: 0.75, xHeight: 0.45, verticalStrokes: 3, tags: ['threeLegs', 'xHeight'] }],
    ['n', { width: 0.5, xHeight: 0.45, verticalStrokes: 2, tags: ['twoLegs', 'xHeight'] }],
    [
      'o',
      {
        width: 0.5,
        xHeight: 0.45,
        openLoops: 1,
        verticalStrokes: 0,
        tags: ['closedLoop', 'xHeight'],
      },
    ],
    [
      'p',
      {
        width: 0.5,
        height: 0.65,
        descender: 0.2,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'descender', 'leftStem'],
      },
    ],
    [
      'q',
      {
        width: 0.5,
        height: 0.65,
        descender: 0.2,
        openLoops: 1,
        verticalStrokes: 1,
        tags: ['bowl', 'descender', 'rightStem'],
      },
    ],
    ['r', { width: 0.35, xHeight: 0.45, verticalStrokes: 1, tags: ['leg', 'xHeight'] }],
    ['s', { width: 0.4, xHeight: 0.45, verticalStrokes: 0, tags: ['curve', 'xHeight'] }],
    [
      't',
      {
        width: 0.35,
        height: 0.6,
        verticalStrokes: 1,
        horizontalStrokes: 1,
        tags: ['cross', 'ascender', 'stem'],
      },
    ],
    [
      'u',
      { width: 0.5, xHeight: 0.45, verticalStrokes: 2, tags: ['twoLegs', 'xHeight', 'openTop'] },
    ],
    [
      'v',
      {
        width: 0.5,
        xHeight: 0.45,
        verticalStrokes: 0,
        diagonalStrokes: 2,
        tags: ['twoDiagonals', 'xHeight', 'pointBottom'],
      },
    ],
    [
      'w',
      {
        width: 0.7,
        xHeight: 0.45,
        verticalStrokes: 0,
        diagonalStrokes: 4,
        tags: ['fourDiagonals', 'xHeight', 'pointBottom'],
      },
    ],
    [
      'x',
      {
        width: 0.5,
        xHeight: 0.45,
        verticalStrokes: 0,
        diagonalStrokes: 2,
        tags: ['cross', 'xHeight'],
      },
    ],
    [
      'y',
      {
        width: 0.5,
        height: 0.65,
        descender: 0.2,
        verticalStrokes: 0,
        diagonalStrokes: 2,
        tags: ['twoDiagonals', 'descender', 'pointBottom'],
      },
    ],
    [
      'z',
      {
        width: 0.45,
        xHeight: 0.45,
        verticalStrokes: 0,
        diagonalStrokes: 1,
        tags: ['zigzag', 'xHeight'],
      },
    ],
  ];

  for (const [ch, m] of lowercase) {
    const full = {
      ...m,
      centerX: (m.width || 0.5) / 2,
      centerY: 0.22 + (m.ascender || 0) * 0.3,
    };
    defineMetric(ch, full);
    defineMetric(ch.toUpperCase(), full);
  }

  const digits = [
    ['0', { width: 0.5, height: 0.7, closedLoops: 1, verticalStrokes: 0 }],
    ['1', { width: 0.2, height: 0.7, verticalStrokes: 1 }],
    ['2', { width: 0.45, height: 0.7, verticalStrokes: 0 }],
    ['3', { width: 0.45, height: 0.7, verticalStrokes: 0 }],
    ['4', { width: 0.5, height: 0.7, verticalStrokes: 2, diagonalStrokes: 1 }],
    ['5', { width: 0.45, height: 0.7, verticalStrokes: 1, horizontalStrokes: 1 }],
    ['6', { width: 0.5, height: 0.7, openLoops: 1, verticalStrokes: 0 }],
    ['7', { width: 0.45, height: 0.7, verticalStrokes: 1, horizontalStrokes: 1 }],
    ['8', { width: 0.5, height: 0.7, closedLoops: 2, verticalStrokes: 0 }],
    ['9', { width: 0.5, height: 0.7, openLoops: 1, verticalStrokes: 0 }],
  ];
  for (const [ch, m] of digits) {
    defineMetric(ch, { ...m, centerX: m.width / 2, centerY: 0.35 });
  }
}

buildAsciiMetrics();

function getScript(ch) {
  const cp = ch.codePointAt(0);
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x00c0 && cp <= 0x024f) return 'Latin';
  if (cp >= 0x1e00 && cp <= 0x1eff) return 'Latin';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x2e80 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0xff00 && cp <= 0xffef) return 'CJK';
  return 'Other';
}

function inferMetrics(ch) {
  const script = getScript(ch);
  switch (script) {
    case 'CJK':
      return DEFAULT_METRICS();
    case 'Arabic':
      return { ...DEFAULT_METRICS(), width: 0.45, diagonalStrokes: 1 };
    case 'Devanagari':
      return { ...DEFAULT_METRICS(), width: 0.5, horizontalStrokes: 1 };
    default:
      return DEFAULT_METRICS();
  }
}

function getMetrics(ch) {
  if (GLYPH_METRICS.has(ch)) return GLYPH_METRICS.get(ch);

  const mapped = CONFUSABLE_TO_ASCII.get(ch);
  if (mapped) {
    // Recurse once through the confusable mapping. If the target is a
    // multi-character string (e.g., Cyrillic ы → "bl"), return the metrics of
    // the first character as a best-effort approximation.
    const first = String(mapped).charAt(0);
    if (GLYPH_METRICS.has(first)) return GLYPH_METRICS.get(first);
  }

  return inferMetrics(ch);
}

function normalizeForRendering(str) {
  const s = String(str).normalize('NFKC');

  // Apply confusable character folding first.
  let folded = '';
  for (const ch of s) {
    folded += CONFUSABLE_TO_ASCII.get(ch) ?? ch;
  }

  // Then collapse contextual multi-character lookalikes (rn → m, etc.).
  for (const { pattern, replacement } of CONTEXTUAL_SUBSTITUTIONS) {
    folded = folded.split(pattern).join(replacement);
  }

  return folded;
}

function metricDistance(a, b) {
  // Weight structural features more heavily so letters that share the same
  // basic envelope but differ in strokes/loops are clearly separated.
  const weights = {
    width: 1.0,
    height: 1.5,
    ascender: 2.0,
    descender: 2.0,
    xHeight: 1.5,
    centerX: 0.5,
    centerY: 0.5,
    openLoops: 2.0,
    closedLoops: 2.0,
    verticalStrokes: 1.5,
    horizontalStrokes: 1.5,
    diagonalStrokes: 1.5,
  };
  let sum = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const diff = (a[key] || 0) - (b[key] || 0);
    sum += weight * diff * diff;
    weightSum += weight;
  }
  return Math.sqrt(sum / weightSum);
}

function tagSimilarity(tagsA, tagsB) {
  const setA = new Set(tagsA || []);
  const setB = new Set(tagsB || []);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

function charSimilarity(a, b) {
  const ma = getMetrics(a);
  const mb = getMetrics(b);
  const dist = metricDistance(ma, mb);
  const metricSim = Math.max(0, 1 - dist);
  const tagSim = tagSimilarity(ma.tags, mb.tags);
  // Shape tags are the strongest signal of visual identity.
  return metricSim * 0.35 + tagSim * 0.65;
}

/**
 * Compute a 0–1 visual similarity between two strings using the font-metric
 * backend. The comparison first folds confusable characters and collapses
 * contextual lookalikes (e.g., rn → m), then compares glyph geometry.
 */
function renderedSimilarity(a, b, options = {}) {
  const { contextual = true } = options;
  let sa = String(a).normalize('NFKC');
  let sb = String(b).normalize('NFKC');

  if (contextual) {
    sa = normalizeForRendering(sa);
    sb = normalizeForRendering(sb);
  }

  if (sa === sb) return 1;

  const charsA = [...sa];
  const charsB = [...sb];
  if (charsA.length === 0 || charsB.length === 0) return 0;

  // If lengths differ, align the shorter string against the longer using a
  // sliding window and keep the best average per-character similarity.
  if (charsA.length !== charsB.length) {
    const [shorter, longer] = charsA.length < charsB.length ? [charsA, charsB] : [charsB, charsA];
    let best = 0;
    for (let start = 0; start <= longer.length - shorter.length; start++) {
      let total = 0;
      for (let i = 0; i < shorter.length; i++) {
        total += charSimilarity(shorter[i], longer[start + i]);
      }
      const avg = total / shorter.length;
      if (avg > best) best = avg;
    }
    const lengthPenalty =
      1 - Math.abs(charsA.length - charsB.length) / Math.max(charsA.length, charsB.length);
    return best * lengthPenalty;
  }

  let total = 0;
  for (let i = 0; i < charsA.length; i++) {
    total += charSimilarity(charsA[i], charsB[i]);
  }
  return total / charsA.length;
}

/**
 * Compute a compact visual-hash descriptor for a string. Useful for caching
 * and clustering visually similar inputs.
 */
function computeVisualHash(str, options = {}) {
  const { lowercase = true } = options;
  let normalized = normalizeForRendering(str);
  if (lowercase) normalized = normalized.toLowerCase();
  const chars = [...normalized];
  const descriptors = chars.map((ch) => {
    const m = getMetrics(ch);
    return [
      Math.round((m.width || 0) * 9),
      Math.round((m.height || 0) * 9),
      m.verticalStrokes || 0,
      m.diagonalStrokes || 0,
      m.openLoops + m.closedLoops,
    ].join('');
  });
  return descriptors.join('-');
}

module.exports = {
  renderedSimilarity,
  computeVisualHash,
  getMetrics,
  normalizeForRendering,
  GLYPH_METRICS,
};

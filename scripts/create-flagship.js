#!/usr/bin/env node
/**
 * PUNYCODEX — Flagship Temple Creator
 *
 * Generates a complete, validated flagship temple for a lexicon entry.
 * Does NOT read from sites/nike. Uses first-class templates under templates/flagship/.
 *
 * Usage:
 *   node scripts/create-flagship.js baal
 *   node scripts/create-flagship.js baal --dry-run
 *   node scripts/create-flagship.js --regenerate-all
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const url = require('node:url');
const { unicodeName } = require('unicode-name');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'flagship');
const SITES_DIR = path.join(ROOT, 'sites');
const FLAGSHIP_DATA = require(path.join(__dirname, 'flagship-data.json'));
const {
  getOriginalScript,
  hasOriginalScript,
  getOriginalScriptLabel,
  getProvenance,
  getNoScriptNote,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));

const LORE_STUBS = require(path.join(__dirname, 'lore-stubs.js'));

const SLOT_TYPES = [
  'Crown',
  'Column',
  'Banner',
  'Frame I',
  'Frame II',
  'Frame III',
  'Ribbon',
  'Seal',
  'Inscription',
  'Emblem',
  'Sigil',
  'Foundation',
  'Dominion',
];

const PANTHEON_COLORS = {
  greek: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4169E1',
  },
  'greek-location': {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4169E1',
  },
  norse: {
    primary: '#C0C0C0',
    primaryDim: '#808080',
    primaryBright: '#E8E8E8',
    secondary: '#5C9BD1',
  },
  egyptian: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#1E3A5F',
  },
  sanskrit: {
    primary: '#FF9933',
    primaryDim: '#CC7A29',
    primaryBright: '#FFB366',
    secondary: '#8B0000',
  },
  celtic: {
    primary: '#228B22',
    primaryDim: '#1A6B1A',
    primaryBright: '#32CD32',
    secondary: '#B8D4E3',
  },
  mesopotamian: {
    primary: '#CD7F32',
    primaryDim: '#A06020',
    primaryBright: '#E09040',
    secondary: '#C2B280',
  },
  polynesian: {
    primary: '#1E90FF',
    primaryDim: '#1670CC',
    primaryBright: '#4DA6FF',
    secondary: '#FF7F50',
  },
  japanese: {
    primary: '#DC143C',
    primaryDim: '#A01030',
    primaryBright: '#FF3355',
    secondary: '#1A1A1A',
  },
  nahuatl: {
    primary: '#50C878',
    primaryDim: '#3A9E5A',
    primaryBright: '#6EE89A',
    secondary: '#2F2F2F',
  },
  yoruba: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4B0082',
  },
  slavic: {
    primary: '#C0C0C0',
    primaryDim: '#808080',
    primaryBright: '#E8E8E8',
    secondary: '#228B22',
  },
  zoroastrian: {
    primary: '#FF4500',
    primaryDim: '#CC3700',
    primaryBright: '#FF6633',
    secondary: '#F5F5F5',
  },
  incan: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#DC143C',
  },
  canaanite: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4169E1',
  },
  phoenician: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#800080',
  },
  hittite: {
    primary: '#CD7F32',
    primaryDim: '#A06020',
    primaryBright: '#E09040',
    secondary: '#C2B280',
  },
};

const PANTHEON_FALLBACK_WORDS = {
  greek: ['Olympian', 'Divine', 'Heroic', 'Immortal', 'Theban', 'Delphic', 'Aegean', 'Mythic'],
  'greek-location': ['Aegean', 'Hellenic', 'Ancient', 'Marble', 'Olive', 'Ionian'],
  norse: ['Asgard', 'Runic', 'Frost', 'Iron', 'Yggdrasil', 'Bifrost', 'Mjolnir', 'Rune'],
  egyptian: ['Pharaoh', 'Desert', 'Nile', 'Ankh', 'Horizon', 'Papyrus', 'Lotus', 'Scarab'],
  sanskrit: ['Cosmic', 'Mantra', 'Vedic', 'Agni', 'Soma', 'Dharma', 'Karma', 'Om'],
  celtic: ['Oak', 'Mist', 'Druid', 'Harp', 'Tir', 'Celtic', 'Grove', 'Stone'],
  mesopotamian: [
    'Ziggurat',
    'Clay',
    'Tigris',
    'Euphrates',
    'Tablet',
    'Cuneiform',
    'Sumer',
    'Akkad',
  ],
  polynesian: ['Moana', 'Wayfinder', 'Tapa', 'Koa', 'Honu', 'Aloha', 'Tiki', 'Voyager'],
  japanese: ['Samurai', 'Cherry', 'Kami', 'Bushido', 'Torii', 'Zen', 'Ronin', 'Sakura'],
  nahuatl: ['Sunstone', 'Jade', 'Feather', 'Serpent', 'Obsidian', 'Aztec', 'Toltec', 'Quetzal'],
  yoruba: ['Orisha', 'Bronze', 'Cowrie', 'Ife', 'Odu', 'Yoruba', 'Ancestral', 'Sacred'],
  slavic: ['Birch', 'Frost', 'Kupala', 'Veles', 'Perun', 'Rus', 'Dazhbog', 'Firebird'],
  zoroastrian: ['Fire', 'Asha', 'Faravahar', 'Mithra', 'Haoma', 'Persian', 'Avestan', 'Fravashi'],
  incan: ['Inti', 'Gold', 'Quipu', 'Puma', 'Andes', 'Inca', 'Cuzco', 'Llama'],
  canaanite: ['Canaanite', 'Ugaritic', 'Phoenician', 'Zaphon', 'Levant', 'Bronze', 'Baal', 'El'],
  phoenician: [
    'Phoenician',
    'Tyrian',
    'Purple',
    'Cedar',
    'Carthage',
    'Sailor',
    'Alphabet',
    'Astart',
  ],
  hittite: ['Hittite', 'Anatolian', 'Bronze', 'Hattusa', 'Lion', 'Storm', 'Solar', 'Cuneiform'],
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'or',
  'from',
  'of',
  'a',
  'an',
  'to',
  'in',
  'on',
  'by',
  'for',
  'with',
  'via',
  'as',
  'is',
  'was',
  'were',
  'be',
  'been',
  'being',
  'are',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'his',
  'her',
  'him',
  'she',
  'he',
  'they',
  'them',
  'their',
  'who',
  'whom',
  'which',
  'what',
  'when',
  'where',
  'why',
  'how',
  'also',
  'then',
  'than',
  'only',
  'just',
  'now',
  'here',
  'there',
  'thus',
  'so',
  'too',
  'very',
  'can',
  'could',
  'would',
  'should',
  'will',
  'shall',
  'may',
  'might',
  'must',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'done',
  'get',
  'got',
  'gotten',
  'make',
  'made',
  'take',
  'took',
  'taken',
  'give',
  'gave',
  'given',
  'see',
  'saw',
  'seen',
  'know',
  'knew',
  'known',
  'come',
  'came',
  'become',
  'went',
  'gone',
  'say',
  'said',
  'tell',
  'told',
  'ask',
  'asked',
  'use',
  'used',
  'work',
  'worked',
  'call',
  'called',
  'try',
  'tried',
  'need',
  'needed',
  'feel',
  'felt',
  'seem',
  'seemed',
  'leave',
  'left',
  'put',
  'keep',
  'kept',
  'let',
  'lets',
  'let',
  'help',
  'helped',
  'show',
  'showed',
  'shown',
  'hear',
  'heard',
  'play',
  'played',
  'move',
  'moved',
  'live',
  'lived',
  'believe',
  'believed',
  'bring',
  'brought',
  'happen',
  'happened',
  'write',
  'wrote',
  'written',
  'provide',
  'provided',
  'sit',
  'sat',
  'stand',
  'stood',
  'lose',
  'lost',
  'pay',
  'paid',
  'meet',
  'met',
  'include',
  'included',
  'continue',
  'continued',
  'set',
  'sets',
  'learn',
  'learned',
  'learnt',
  'change',
  'changed',
  'lead',
  'led',
  'understand',
  'understood',
  'watch',
  'watched',
  'follow',
  'followed',
  'stop',
  'stopped',
  'create',
  'created',
  'speak',
  'spoke',
  'spoken',
  'read',
  'allow',
  'allowed',
  'add',
  'added',
  'spend',
  'spent',
  'grow',
  'grew',
  'grown',
  'open',
  'opened',
  'walk',
  'walked',
  'offer',
  'offered',
  'remember',
  'remembered',
  'love',
  'loved',
  'consider',
  'considered',
  'appear',
  'appeared',
  'buy',
  'bought',
  'wait',
  'waited',
  'serve',
  'served',
  'die',
  'died',
  'send',
  'sent',
  'expect',
  'expected',
  'build',
  'built',
  'stay',
  'stayed',
  'fall',
  'fell',
  'fallen',
  'cut',
  'cuts',
  'reach',
  'reached',
  'kill',
  'killed',
  'remain',
  'remained',
  'suggest',
  'suggested',
  'raise',
  'raised',
  'pass',
  'passed',
  'sell',
  'sold',
  'require',
  'required',
  'report',
  'reported',
  'decide',
  'decided',
  'pull',
  'pulled',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'first',
  'second',
  'third',
  'last',
  'next',
  'other',
  'another',
  'same',
  'different',
  'new',
  'old',
  'long',
  'short',
  'high',
  'low',
  'big',
  'small',
  'little',
  'large',
  'great',
  'good',
  'bad',
  'best',
  'better',
  'worst',
  'worse',
  'high',
  'true',
  'prime',
  'royal',
  'grand',
  'sovereign',
  'ancient',
  'main',
  'local',
  'title',
  'word',
  'person',
  'people',
  'component',
  'components',
  'applied',
  'also',
  'was',
  'were',
  'who',
  'one',
  'five',
  'title',
  'common',
  'later',
  'before',
  'after',
  'above',
  'below',
  'under',
  'over',
  'again',
  'further',
  'once',
  'more',
  'most',
  'many',
  'much',
  'some',
  'any',
  'all',
  'each',
  'every',
  'both',
  'few',
  'several',
  'own',
  'same',
  'such',
  'no',
  'not',
  'only',
  'own',
  'right',
  'left',
  'early',
  'late',
  'still',
  'yet',
  'already',
  'almost',
  'quite',
  'rather',
  'enough',
  'even',
  'ever',
  'never',
  'always',
  'often',
  'sometimes',
  'usually',
  'finally',
  'quickly',
  'slowly',
  'really',
  'actually',
  'probably',
  'certainly',
  'clearly',
  'simply',
  'completely',
  'absolutely',
  'especially',
  'particularly',
  'generally',
  'basically',
  'specifically',
  'originally',
  'traditionally',
  'historically',
  'commonly',
  'widely',
  'generally',
  'mostly',
  'partly',
  'fully',
  'highly',
  'deeply',
  'greatly',
  'strongly',
  'clearly',
  'obviously',
  'certainly',
  'surely',
  'possibly',
  'perhaps',
  'maybe',
  'definitely',
  'absolutely',
  'literally',
  'figuratively',
  'indeed',
  'instead',
  'otherwise',
  'however',
  'therefore',
  'moreover',
  'furthermore',
  'nevertheless',
  'nonetheless',
  'meanwhile',
  'otherwise',
  'instead',
  'likewise',
  'similarly',
  'conversely',
  'accordingly',
  'subsequently',
  'eventually',
  'previously',
  'formerly',
  'lately',
  'recently',
  'currently',
  'presently',
  'immediately',
  'directly',
  'individually',
  'personally',
  'particularly',
  'especially',
  'notably',
  'significantly',
  'specifically',
  'namely',
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

const GENERIC_MODIFIERS = [
  'Prime',
  'Royal',
  'Grand',
  'Sovereign',
  'Ancient',
  'First',
  'High',
  'True',
];

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

function loadLexicon() {
  const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  return LEXICON;
}

function loadLoreCatalog() {
  const catalogPath = path.join(__dirname, 'lore-catalog.json');
  if (!fs.existsSync(catalogPath)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    // Remove schema key and empty placeholder entries
    const catalog = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith('_')) continue;
      if (value && Object.keys(value).length > 0) catalog[key] = value;
    }
    return catalog;
  } catch (e) {
    console.error(`Warning: could not parse lore-catalog.json: ${e.message}`);
    return {};
  }
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
  const _sr = hexToRgb(p.secondary);
  const _vr = hexToRgb(p.void);
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
  let css = fs.readFileSync(path.join(TEMPLATE_DIR, 'flagship.css'), 'utf8');
  // Remove previous :root blocks so we can supply a single authoritative one
  css = css.replace(/:root\s*\{[^}]*\}/g, '');

  const pr = hexToRgb(palette.primary);
  const _sr = hexToRgb(palette.secondary);
  const _vr = hexToRgb(palette.void);
  const _vdr = hexToRgb(palette.voidDeep);

  // Replace hard-coded donor colors with CSS variables
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
  css = css.replace(/rgba\(212,\s*175,\s*55,/g, `rgba(${pr.r},${pr.g},${pr.b},`);

  // Inject full-height hero behaviour directly into the existing rule
  css = css.replace(
    /(\.endorsement-hero\s*\{)(\s*)/,
    `$1$2    min-height: 100vh;$2    min-height: 100svh;$2    display: flex;$2    align-items: center;$2    justify-content: center;$2`
  );

  const rootVars = buildRootVariables(palette);
  return `${rootVars}\n${css}`;
}

function buildScript(templeId) {
  let js = fs.readFileSync(path.join(TEMPLATE_DIR, 'flagship.js'), 'utf8');
  js = js.replace(/\{\{TEMPLE_ID\}\}/g, templeId);
  return js;
}

function getSlotNames(entry) {
  if (FLAGSHIP_DATA.slotNames?.[entry.id]) {
    const names = FLAGSHIP_DATA.slotNames[entry.id];
    if (names.length !== SLOT_TYPES.length) {
      throw new Error(
        `Slot-name registry for ${entry.id} has ${names.length} entries, expected ${SLOT_TYPES.length}`
      );
    }
    return names;
  }
  return generateSlotNames(entry);
}

function cleanWord(w) {
  return w
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
}

function generateSlotNames(entry) {
  const text = [
    entry.domain || '',
    entry.meaning || '',
    entry.etymology?.protoGloss || '',
    entry.etymology?.derivation || '',
  ].join(' ');

  const rawTokens = text.split(/[\s,;:.!?()""''·\-—&]+/);
  let tokens = [];
  for (const w of rawTokens) {
    const cw = cleanWord(w);
    if (!cw || cw.length < 3) continue;
    const lower = cw.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    tokens.push(cw.charAt(0).toUpperCase() + cw.slice(1).toLowerCase());
  }
  tokens = [...new Set(tokens)];

  const fallbacks = PANTHEON_FALLBACK_WORDS[entry.pantheon] || PANTHEON_FALLBACK_WORDS.greek;
  if (tokens.length < 6) {
    tokens = [...tokens, ...fallbacks];
    tokens = [...new Set(tokens)];
  }

  if (tokens.length < SLOT_TYPES.length) {
    while (tokens.length < SLOT_TYPES.length) {
      tokens.push(GENERIC_MODIFIERS[tokens.length % GENERIC_MODIFIERS.length]);
    }
  }

  const names = SLOT_TYPES.map((type, i) => `${tokens[i % tokens.length]} ${type}`);

  // Validate: no punctuation, no stop words, first six must be non-generic
  const firstSixBad = names.slice(0, 6).some((n) => {
    const word = n.split(' ')[0].toLowerCase();
    return STOP_WORDS.has(word) || GENERIC_MODIFIERS.map((g) => g.toLowerCase()).includes(word);
  });
  if (firstSixBad) {
    throw new Error(
      `Auto-generated slot names for ${entry.id} are too generic. Please add a curated entry to scripts/flagship-data.json.`
    );
  }
  return names;
}

function replacePlaceholders(html, vars) {
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = vars[key] == null ? '' : String(vars[key]);
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}

function hasHeroVideo(templeId) {
  return fs.existsSync(path.join(SITES_DIR, templeId, 'assets', `${templeId}_hero_video.webm`));
}

function buildHeroVisual(templeId, unicode, domain) {
  return `<div class="endorsement-mascot">
    <picture><source srcset="assets/${templeId}_mascot.webp" type="image/webp"><img src="assets/${templeId}_mascot.png" alt="${unicode} — ${domain}" class="endorsement-mascot-img"></picture>
</div>`;
}

function buildExtendedTab(page, _templeId) {
  const paths = {
    index: 'lore/extended/',
    lore: 'extended/',
    gallery: '../lore/extended/',
    extended: './',
  };
  const href = paths[page] || paths.index;
  const activeClass = page === 'extended' ? 'nav-link active' : 'nav-link';
  return `<a href="${href}" class="${activeClass}">Extended</a>`;
}

function hasRealGreek(entry) {
  return hasOriginalScript(entry);
}

function isGreekEntry(entry) {
  return entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
}

function originalScript(entry) {
  return getOriginalScript(entry) || entry.unicode;
}

function stripPlaceholderGreek(html, unicode) {
  html = html.replace(
    /<span class="title-greek">—<\/span>\s*<span class="title-divider"><\/span>/,
    ''
  );
  html = html.replace(/<p class="card-greek">—<\/p>/g, '');
  html = html.replace(
    /<div class="footer-block">\s*<span class="footer-label">Original Script<\/span>\s*<span class="footer-value">—<\/span>\s*<\/div>/g,
    ''
  );
  html = html.replace(/"name":\s*"—"/g, `"name": "${unicode}"`);
  html = html.replace(/"description":\s*"—"/g, `"description": "${unicode}"`);
  // Replace any stray <strong>—</strong> in lore body copy
  html = html.replace(/<strong>—<\/strong>/g, `<strong>${unicode}</strong>`);
  return html;
}

function isStubContent(content) {
  if (!content?.trim()) return true;
  const lower = content.toLowerCase();
  const stubPhrases = [
    'coming soon',
    'explore the myths and stories',
    'reconstructed pronunciation guide',
    'reflect time, destruction, empowerment',
    'reflect love, fertility, war',
    'reflect the domains of',
    'reflect the symbols of',
    'continues to shape language, art, and imagination today',
    'is time, destruction, empowerment',
    'is love, fertility, war',
    'is the sky, thunder, king of gods',
    'these attributes appear across seals, coins, vase paintings, and temple reliefs',
    'the myths surrounding this figure established its authority in ritual, art, and literature',
    'etymologically, it derives from',
    'a root that shaped cult titles, hymns, and ritual addresses across centuries',
    'belongs to the greek tradition as',
    'belongs to the norse tradition as',
    'belongs to the egyptian tradition as',
    'belongs to the sanskrit tradition as',
    'belongs to the mesopotamian tradition as',
    'belongs to the zoroastrian tradition as',
    'belongs to the japanese tradition as',
  ];
  return stubPhrases.some((p) => lower.includes(p));
}

const OWNED_DOMAINS = (() => {
  try {
    return require(path.join(ROOT, 'platform', 'db', 'owned-domains.json'));
  } catch {
    return [];
  }
})();
const OWNED_DOMAINS_SET = new Set(OWNED_DOMAINS.map((d) => d.toLowerCase().normalize('NFC')));

function getOwnedForms(entry) {
  const candidates = [entry.unicode];
  for (const v of entry.variants || []) {
    if (v?.unicode) candidates.push(v.unicode);
  }
  const seen = new Set();
  const forms = [];
  for (const f of candidates) {
    if (!f) continue;
    const domain = `${f}.com`.toLowerCase().normalize('NFC');
    const key = f.toLowerCase().normalize('NFC');
    if (OWNED_DOMAINS_SET.has(domain) && !seen.has(key)) {
      seen.add(key);
      forms.push(f);
    }
  }
  return forms;
}

function getDomainsText(entry) {
  const ownedForms = getOwnedForms(entry);
  if (ownedForms.length === 0) {
    // No owned domain: show the scholarly restoration only.
    return entry.unicode;
  }
  return ownedForms.map((f) => `${f}.com`).join(' \u00b7 ');
}

function getPunycodeExplainer(entry) {
  const primary = entry.unicode;
  const ascii = entry.ascii;
  try {
    const ace = url.domainToASCII(`${primary.toLowerCase()}.com`);
    if (ace && !ace.includes(' ')) return `${primary}.com \u2192 ${ace}`;
  } catch (_e) {}
  const owned = (entry.variants || []).find((v) => v.type === 'owned');
  if (owned?.unicode) {
    try {
      return `${owned.unicode}.com \u2192 ${url.domainToASCII(`${owned.unicode.toLowerCase()}.com`)}`;
    } catch (_e) {}
  }
  return `${ascii}.com \u2192 ${ascii}.com`;
}

function generateTierExplanation(entry) {
  const source = originalScript(entry);
  const sourceLabel = isGreekEntry(entry) ? 'Greek original' : 'original form';
  if (isGreekEntry(entry)) {
    if (entry.tier === 'dual') {
      return `The ${sourceLabel} <strong>${source}</strong> contains <strong>both stress and vowel length</strong>, and it supports multiple historically valid Unicode restorations. This makes it a <strong>dual-tier</strong> name.`;
    }
    if (entry.tier === '1') {
      return `The ${sourceLabel} <strong>${source}</strong> contains <strong>both stress and vowel length</strong>, but only one historically valid Unicode restoration exists. This makes it a <strong>single-tier Tier-1</strong> name.`;
    }
    const hasStress =
      /[\u0301\u0302\u0342άέήίόύώΆΈΉΊΌΎΏ]/.test(source) || /[áéíóúÁÉÍÓÚṓṒ]/.test(entry.unicode);
    const hasLength =
      /[ηωᾱῑῡēō]/.test(source.toLowerCase()) || /[ēōḗṓ]/.test(entry.unicode.toLowerCase());
    if (hasStress && !hasLength)
      return `The ${sourceLabel} <strong>${source}</strong> contains <strong>stress (acute/circumflex)</strong> but no long-vowel mark. This makes it a <strong>single-tier Tier-2 Accent-Preserving</strong> name.`;
    if (!hasStress && hasLength)
      return `The ${sourceLabel} <strong>${source}</strong> contains a <strong>long vowel</strong> but no stress mark. This makes it a <strong>single-tier Tier-2 Macron-Preserving</strong> name.`;
    return `The ${sourceLabel} <strong>${source}</strong> preserves one distinctive feature in its Unicode restoration. This makes it a <strong>${entry.tierLabel || 'Tier-2'}</strong> name.`;
  }
  // Non-Greek entries: explain by tradition and tier label
  if (entry.tier === 'dual') {
    return `The ${sourceLabel} <strong>${source}</strong> supports multiple historically valid Unicode restorations. Within the ${entry.pantheon} tradition, this makes it a <strong>dual-tier</strong> name.`;
  }
  if (entry.tier === '1') {
    return `The ${sourceLabel} <strong>${source}</strong> has one canonical Unicode restoration that preserves its distinctive identity. Within the ${entry.pantheon} tradition, this makes it a <strong>single-tier Tier-1</strong> name.`;
  }
  return `The ${sourceLabel} <strong>${source}</strong> preserves a recognizable written identity in its Unicode restoration. Classified as <strong>${entry.tierLabel || 'Tier-2'}</strong> in the PUNYCODEX tier system.`;
}

function _tierGridValues(entry) {
  const source = originalScript(entry);
  const isGreek = isGreekEntry(entry);
  const hasStress =
    isGreek &&
    (/[\u0301\u0302\u0342άέήίόύώΆΈΉΊΌΎΏ]/.test(source) || /[áéíóúÁÉÍÓÚ]/.test(entry.unicode));
  const hasLength =
    isGreek &&
    (/[ηωᾱῑῡēō]/.test(source.toLowerCase()) || /[ēōḗṓ]/.test(entry.unicode.toLowerCase()));
  const isDual = entry.tier === 'dual';
  return {
    stressActive: hasStress ? 'active' : 'inactive',
    stressValue: hasStress ? 'Preserved' : isGreek ? '\u2014' : 'N/A',
    lengthActive: hasLength ? 'active' : 'inactive',
    lengthValue: hasLength ? 'Preserved' : isGreek ? '\u2014' : 'N/A',
    dualActive: isDual ? 'active' : 'inactive',
    dualValue: isDual ? 'Yes' : '\u2014',
  };
}

function scriptLabel(entry) {
  if (isGreekEntry(entry)) return 'Greek';
  const map = {
    egyptian: 'Egyptian',
    sanskrit: 'Sanskrit',
    mesopotamian: 'Mesopotamian',
    canaanite: 'Canaanite',
    norse: 'Norse',
    celtic: 'Celtic',
    slavic: 'Slavic',
    japanese: 'Japanese',
    nahuatl: 'Nahuatl',
    yoruba: 'Yoruba',
    polynesian: 'Polynesian',
    zoroastrian: 'Zoroastrian',
    incan: 'Incan',
    phoenician: 'Phoenician',
    hittite: 'Hittite',
  };
  return (
    map[entry.pantheon] ||
    (entry.pantheon ? entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1) : 'Ancient')
  );
}

function analyzeFeatures(entry) {
  const greekRaw = entry.greek || '';
  const greek = greekRaw.normalize('NFD');
  const unicode = entry.unicode || '';
  const features = [];
  if (isGreekEntry(entry)) {
    if (/[θφχ]/.test(greek)) features.push('aspirated consonants');
    if (/αι|ει|οι|αυ|ευ|ου/.test(greek)) features.push('diphthongs');
    if (/[ηωᾱῑῡ]/.test(greek)) features.push('long vowels');
    if (/[άέήίόύώ]/.test(greekRaw) || /[\u0301\u0302\u0342]/.test(greek))
      features.push('acute accents');
    if (/[ἁἅἃἇὁὅὃὕὑὓὗἱἵἳἷ]/.test(greekRaw)) features.push('rough breathing');
  } else {
    if (/[ꜥꜣ]/.test(unicode)) features.push('Egyptological ain and alef letters');
    if (/[ʿʾ]/.test(unicode)) features.push('Semitic pharyngeal letters');
    if (/[ḥṣṭḍẓ]/.test(unicode.toLowerCase())) features.push('emphatic consonants');
    if (/[āīūēō]/.test(unicode)) features.push('macron-length vowels');
    if (/[áéíóú]/.test(unicode)) features.push('acute stress marks');
    if (/[ṃṇñṅ]/.test(unicode.toLowerCase())) features.push('nasal retroflexes');
    if (/[śṣ]/.test(unicode)) features.push('palatal/retroflex sibilants');
  }
  return features;
}

function joinFeatures(arr) {
  if (!arr || arr.length === 0) return 'original diacritics and script distinctions';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr.join(' and ');
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function buildNameProse(entry) {
  const label = scriptLabel(entry);
  const source = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  const features = analyzeFeatures(entry);
  const featureList = joinFeatures(features);
  const meaningClause = entry.meaning ? ` — “${entry.meaning}”` : '';
  const original = hasOriginal
    ? `The name in its original ${label} form. <strong>${entry.unicode}</strong> (${source}) is attested as ${entry.domain.toLowerCase()}${meaningClause}. Its ${featureList} carry the full phonetic and orthographic weight of the source tradition.`
    : `The name survives only in scholarly transliteration. <strong>${entry.unicode}</strong> is the standard ${label} romanisation, attested as ${entry.domain.toLowerCase()}${meaningClause}. Its ${featureList} preserve distinctions lost in plain ASCII.`;
  const ascii = `Reduced to plain <strong>${entry.ascii}</strong>, the name loses everything that made it specific: ${featureList}. What remains is an ASCII string that machines can parse but that no longer speaks with its original voice.`;
  const unicode = `The Unicode restoration recovers what ASCII flattened. <strong>${entry.unicode}</strong> restores ${featureList}, returning the name to its original written dignity. The domain encodes to Punycode, but the browser displays the truth.`;
  return { original, ascii, unicode };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOriginalScriptCardNote(entry) {
  if (!hasOriginalScript(entry)) {
    return `<p class="card-note">${escapeHtml(getNoScriptNote(entry))}</p>`;
  }
  return '';
}

function buildOriginalScriptProvenanceSection(entry) {
  const provenance = getProvenance(entry);
  if (!provenance || !Array.isArray(provenance.steps) || provenance.steps.length === 0) {
    return '';
  }

  const steps = provenance.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const sources = (provenance.sources || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const stepCount = provenance.steps.length;
  const sourceCount = (provenance.sources || []).length;
  const hintParts = [
    `${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`,
    sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const sourcesColumn = sources
    ? `                    <div class="provenance-column provenance-sources-column">
                        <h3 class="provenance-column-title">Sources</h3>
                        <ul class="provenance-sources">${sources}</ul>
                    </div>`
    : '';

  return `<section class="section section-provenance" id="provenance">
    <div class="section-bg-glow"></div>
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">02</span>
            <h2 class="section-title">Original Script Provenance</h2>
            <p class="section-subtitle">How ${entry.unicode} travels from ancient script to scholarly transliteration</p>
        </div>
        <div class="provenance-panel reveal-up">
            <button class="provenance-toggle" id="provenance-toggle" aria-expanded="false" aria-controls="provenance-content" type="button">
                <span class="provenance-toggle-text">
                    <span class="provenance-toggle-label">Show scholarly provenance</span>
                    <span class="provenance-toggle-hint">${hintParts}</span>
                </span>
                <span class="provenance-toggle-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </button>
            <div class="provenance-content" id="provenance-content" role="region" aria-labelledby="provenance-toggle" hidden>
                <div class="provenance-content-inner">
                    <div class="provenance-columns">
                        <div class="provenance-column provenance-steps-column${sources ? '' : ' provenance-column-full'}">
                            <h3 class="provenance-column-title">From original to transliteration</h3>
                            <ol class="provenance-steps">${steps}</ol>
                        </div>
                        ${sourcesColumn}
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>`;
}

function _buildTierSection(entry, _sectionNumber) {
  const tierLabel = entry.tierLabel || `Tier ${entry.tier}`;
  return `<section class="section section-tier" id="tier">
    <div class="container">
        <div class="section-header reveal-up">
            <h2 class="section-title">Tier Classification</h2>
            <p class="section-subtitle">Where ${entry.unicode} stands in the PUNYCODEX tier system</p>
        </div>
        <div class="tier-grid tier-grid-single">
            <div class="tier-card reveal-up">
                <div class="tier-label">${tierLabel}</div>
                <div class="tier-domain">${entry.unicode}.com</div>
                <p class="tier-body">${generateTierExplanation(entry)}</p>
            </div>
        </div>
    </div>
</section>`;
}

function getCanvasEffect(entry) {
  const id = entry.id;

  // Authoritative per-id effect map (overrides all heuristics).
  if (FLAGSHIP_DATA.effectMap?.[id]) {
    return FLAGSHIP_DATA.effectMap[id];
  }

  const pantheon = entry.pantheon || '';
  const domain = (entry.domain || '').toLowerCase();
  const meaning = (entry.meaning || '').toLowerCase();
  const combined = `${domain} ${meaning}`;
  const has = (words) => words.some((w) => combined.includes(w));

  // ── Bespoke legendary effects for recently expanded / non-generic flagships
  if (
    id === 'aither' ||
    id === 'ouranos' ||
    id === 'uranus' ||
    has(['aether', 'upper air', 'bright upper'])
  )
    return 'aurora';
  if (
    id === 'varuna' ||
    id === 'praajapati' ||
    id === 'prajapati' ||
    id === 'rta' ||
    id === 'maat' ||
    id === 'vishnu'
  )
    return 'cosmicNet';
  if (id === 'anat' || id === 'baal' || id === 'enlil' || has(['desert storm', 'sumerian wind']))
    return 'sandstorm';
  if (
    id === 'apsu' ||
    id === 'ea' ||
    id === 'okeanos' ||
    id === 'pontos' ||
    has(['abyss', 'freshwater abyss', 'fresh water', 'primordial water'])
  )
    return 'abyssal';
  if (
    id === 'ka' ||
    id === 'ba' ||
    id === 'akh' ||
    has(['soul', 'life force', 'vital essence', 'double'])
  )
    return 'soul';
  if (
    id === 'trengtreng' ||
    id === 'typhon' ||
    id === 'ishtar' ||
    id === 'astart' ||
    has(['volcanic', 'thunder war'])
  )
    return 'volcanic';
  if (id === 'eros' || has(['desire', 'love', 'passion'])) return 'light';
  if (id === 'asherah' || id === 'inanna') return 'tree';

  // ── Existing shared effect mappings
  if (
    ['zeus', 'thor', 'jupiter', 'perun', 'adad', 'shu'].includes(id) ||
    has(['thunder', 'storm', 'lightning'])
  )
    return 'storm';
  if (
    ['kronos', 'cronus', 'chronos', 'saturn'].includes(id) ||
    has(['time', 'harvest', 'golden age'])
  )
    return 'time';
  if (
    ['hades', 'nott', 'hekate', 'kali', 'tartaros', 'chaos'].includes(id) ||
    has(['dark', 'void', 'night', 'death', 'underworld'])
  )
    return 'void';
  if (
    ['apollo', 'ra', 'helios', 'surya', 'savitr', 'amaterasu', 'int'].includes(id) ||
    has(['sun', 'light', 'dawn'])
  )
    return 'sun';
  if (
    ['poseidon', 'aphrodite', 'loki', 'njor'].includes(id) ||
    has(['water', 'sea', 'ocean', 'wave', 'river'])
  )
    return 'water';
  if (
    ['gaia', 'rhea', 'demeter', 'cybele', 'inanna', 'asherah', 'anu', 'nut', 'geb'].includes(id) ||
    has(['earth', 'mountain', 'fertility', 'mother'])
  )
    return 'mountain';
  if (
    ['artemis', 'diana', 'selene', 'chandra', 'tsukuyomi'].includes(id) ||
    has(['moon', 'hunt', 'stars'])
  )
    return 'stars';
  if (
    ['odin', 'thoth', 'bragi', 'saraswati', 'ganesha', 'hanuman', 'hermes'].includes(id) ||
    has(['wisdom', 'knowledge', 'word', 'poetry', 'messenger'])
  )
    return 'light';
  if (
    ['prometheus', 'hephaistos', 'logi', 'aguni', 'kali'].includes(id) ||
    has(['fire', 'flame', 'forge'])
  )
    return 'flame';
  if (['yggdrasil', 'silvanus', 'dionysos'].includes(id) || has(['tree', 'vine', 'forest']))
    return 'tree';
  if (pantheon === 'norse' || pantheon === 'celtic' || pantheon === 'slavic') return 'stars';
  if (pantheon === 'egyptian') return 'sun';
  if (pantheon === 'mesopotamian') return 'sandstorm';
  return 'particles';
}

function wrapSection(id, title, subtitle, content, sectionNumber) {
  if (!content?.trim()) return '';
  return `<section class="section section-${id}" id="${id}">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2, '0')}</span>
            <h2 class="section-title">${title}</h2>
            <p class="section-subtitle">${subtitle}</p>
        </div>
        ${content}
    </div>
</section>`;
}

function sourceHref(src) {
  const lower = src.toLowerCase();
  if (lower === 'lsj')
    return 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek';
  if (lower.includes('pape')) return 'https://archive.org/details/bub_gb_8SMSAAAAIAAJ';
  if (lower.includes('beekes')) return 'https://brill.com/view/title/17858';
  if (lower.includes('smyth'))
    return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0007';
  if (lower.includes('delg')) return 'https://klincksieck.com/';
  if (lower.includes('hesiod'))
    return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0130';
  if (lower.includes('plato')) return 'https://www.perseus.tufts.edu/hopper/searchresults?q=plato';
  if (lower.includes('orphic')) return 'https://www.orphic-hymns.com/';
  if (lower.includes('herodotus'))
    return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0126';
  if (lower.includes('faulkner')) return 'https://www.griffith.ox.ac.uk/';
  if (lower === 'wb' || lower.includes('wörterbuch')) return 'https://aaew.bbaw.de/tla/';
  if (lower.includes('gardiner')) return 'https://www.griffith.ox.ac.uk/';
  if (lower.includes('allen')) return 'https://www.britishmuseum.org/';
  if (lower.includes('cad') || lower.includes('chicago assyrian'))
    return 'https://oracc.museum.upenn.edu/';
  if (lower.includes('ahw')) return 'https://www.altorientalistik.de/';
  if (lower.includes('kramer')) return 'https://etcsl.orinst.ox.ac.uk/';
  if (lower.includes('jacobsen')) return 'https://oi.uchicago.edu/';
  if (lower.includes('etcsl')) return 'https://etcsl.orinst.ox.ac.uk/';
  if (lower.includes('black-green')) return 'https://www.britishmuseum.org/';
  if (lower.includes('mw') || lower.includes('monier'))
    return 'https://www.sanskrit-lexicon.uni-koeln.de/';
  if (lower.includes('kewa')) return 'https://www.sanskrit-lexicon.uni-koeln.de/';
  if (lower.includes('rv') || lower.includes('ṛgveda') || lower.includes('rigveda'))
    return 'https://vedaweb.uni-koeln.de/';
  if (lower.includes('brāhmaṇa') || lower.includes('brahmana'))
    return 'https://www.sacred-texts.com/hin/';
  if (lower.includes('upaniṣad') || lower.includes('upanishad'))
    return 'https://www.sacred-texts.com/hin/';
  if (lower.includes('ktu')) return 'https://www.keele.ac.uk/ktu/';
  if (lower.includes('cis')) return 'https://www.hup.harvard.edu/books/cis';
  if (lower.includes('kai')) return 'https://www.hup.harvard.edu/books/kai';
  if (lower.includes('coogan'))
    return 'https://www.hup.harvard.edu/books/stories-from-ancient-canaan/';
  if (lower.includes('smith')) return 'https://www.sbl-site.org/';
  if (lower.includes('day')) return 'https://www.sbl-site.org/';
  if (lower.includes('cross'))
    return 'https://www.hup.harvard.edu/books/canaanite-myth-and-hebrew-epic/';
  if (lower.includes('de moor')) return 'https://brill.com/view/title/16979';
  return '';
}

function _buildSourcesSection(entry, sectionNumber, catalogEntry) {
  const sourceList = catalogEntry?.sources
    ? catalogEntry.sources.map((s) => s.name || s)
    : entry.sources || [];
  const badges = sourceList
    .map((src) => {
      const name = typeof src === 'string' ? src : src.name;
      const href = typeof src === 'object' && src.url ? src.url : sourceHref(name);
      return href
        ? `<a href="${href}" target="_blank" rel="noopener" class="source-badge" title="${name}">${name}</a>`
        : `<span class="source-badge">${name}</span>`;
    })
    .join('');
  if (!badges) return '';
  return `<section class="section section-related" id="sources">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2, '0')}</span>
            <h2 class="section-title">Scholarly Sources</h2>
            <p class="section-subtitle">Attested in accredited reference works</p>
        </div>
        <div class="sources-section reveal-up">
            <div class="sources-list">
                ${badges}
            </div>
        </div>
    </div>
</section>`;
}

function buildRelatedNamesSection(entry, sectionNumber) {
  const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  const related = LEXICON.filter((e) => e.id !== entry.id && e.pantheon === entry.pantheon).slice(
    0,
    6
  );
  if (!related.length) return '';
  const pantheonLabel = entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
  const cards = related
    .map((e) => {
      const greek = e.greek && e.greek !== '—' ? e.greek : '';
      const tier = e.tierLabel || `Tier ${e.tier}`;
      return `
    <a href="../../${e.id}/" class="related-card reveal-up">
      <span class="related-name">${e.unicode}</span>
      ${greek ? `<span class="related-greek">${greek}</span>` : ''}
      <span class="related-domain">${e.domain}</span>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:auto;padding-top:0.5rem;">
        <span class="related-tier">${tier}</span>
        <span class="related-tier" style="border-color:rgba(255,255,255,0.06);color:var(--white-dim);">${pantheonLabel}</span>
      </div>
    </a>`;
    })
    .join('');
  return `<section class="section section-related" id="related">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2, '0')}</span>
            <h2 class="section-title">Related Names</h2>
            <p class="section-subtitle">Other figures in the ${entry.pantheon} pantheon</p>
        </div>
        <div class="related-grid reveal-up">
            ${cards}
        </div>
    </div>
</section>`;
}

function buildExtendedLoreCTA(entry, catalogEntry) {
  let body = '';
  if (catalogEntry?.extendedMeditation) {
    const firstP = catalogEntry.extendedMeditation.match(/<p[\s\S]*?<\/p>/);
    body = firstP ? firstP[0] : catalogEntry.extendedMeditation;
  }
  if (!body) {
    body = `<p>The lore you have read is the surface — the living myth. Beneath it lies the scholarship: etymology, reconstructed pronunciation, Unicode character breakdown, and the cultural legacy of <strong>${entry.unicode}</strong>.</p>`;
  }
  const bodyHtml = body.replace(/<p>/g, '<p class="pantheon-body">');
  return `<section class="section section-pantheon" id="extended-lore-cta" style="background: linear-gradient(180deg, var(--void) 0%, var(--void-deep) 100%);">
    <div class="container">
        <div class="pantheon-content reveal-up">
            <div class="pantheon-text">
                <span class="pantheon-eyebrow">Go Deeper</span>
                <h2 class="pantheon-title">Extended Lore</h2>
                ${bodyHtml}
                <a href="extended/" class="btn-primary btn-ghost">
                    <span>Enter Extended Lore</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                </a>
            </div>
            <div class="pantheon-mascot">
                <picture><source srcset="../assets/${entry.id}_mascot.webp" type="image/webp"><img src="../assets/${entry.id}_mascot.png" alt="${entry.unicode} mascot" class="pantheon-mascot-img"></picture>
            </div>
        </div>
    </div>
</section>`;
}

// Extended page builder helpers for create-flagship.js

function buildZeusFooter(entry, assetPrefix) {
  const logomarkPath = `${assetPrefix}assets/${entry.id}_logomark`;
  const greek = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  const ownedForms = getOwnedForms(entry);
  const isOwned = ownedForms.length > 0;
  const domainsLabel = isOwned ? 'Domains' : 'Restoration';
  const domains = isOwned
    ? ownedForms
        .map((f) => `${f}.com`)
        .join(' \u00b7 ')
        .toLowerCase()
    : entry.unicode;
  const classification =
    entry.tier === 'dual'
      ? 'Dual‑Tier Pair (Tier‑1 & Tier‑2)'
      : entry.tierLabel || `Tier ${entry.tier}`;
  return `    <footer class="main-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <span class="footer-logo">PUNYCODEX</span>
                    <p class="footer-tagline">Authentic unicode domains.<br>Real words. Real orthography. Real internet.</p>
                </div>
                <div class="footer-info">
                    <div class="footer-block">
                        <span class="footer-label">${domainsLabel}</span>
                        <span class="footer-value">${domains}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Classification</span>
                        <span class="footer-value">${classification}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">${getOriginalScriptLabel(entry)}</span>
                        <span class="footer-value">${hasOriginal ? greek : entry.unicode}</span>
                    </div>
                </div>
            </div>
            <div class="footer-seal">
                <picture><source srcset="${logomarkPath}.webp" type="image/webp"><img src="${logomarkPath}.png" alt="${entry.unicode} logomark" class="footer-logomark"></picture>
            </div>
            <div class="footer-bottom">
                <p class="footer-credit">The gods have returned &middot; The internet is merely the first temple</p>
            </div>
        </div>
    </footer>`;
}

function buildHeroVisualExtended(entry, assetPrefix) {
  const videoBase = `${assetPrefix}assets/${entry.id}_hero_video`;
  const poster = `${assetPrefix}assets/${entry.id}_hero_poster.jpg`;
  const mascot = `${assetPrefix}assets/${entry.id}_mascot`;
  if (hasHeroVideo(entry.id)) {
    return `<figure class="endorsement-mascot endorsement-mascot--video" style="margin:0;">
      <video autoplay muted loop playsinline poster="${poster}" aria-label="Animated portrait of ${entry.unicode}, ${entry.domain}">
        <source src="${videoBase}.webm" type="video/webm">
        <source src="${videoBase}.mp4" type="video/mp4">
        <img src="${mascot}.png" alt="${entry.unicode} — ${entry.domain}">
      </video>
      <button class="video-pause" aria-label="Pause animation">❚❚</button>
    </figure>`;
  }
  return `<picture><source srcset="${mascot}.webp" type="image/webp"><img src="${mascot}.png" alt="${entry.unicode} — ${entry.domain}" class="mascot-img"></picture>`;
}

function getUnicodeInfo(char) {
  const cp = char.codePointAt(0);
  const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  let name;
  try {
    name = unicodeName(char);
  } catch (_e) {
    name = `Character ${hex}`;
  }
  if (name) {
    name = name
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bOf\b/g, 'of')
      .replace(/\bAnd\b/g, 'and')
      .replace(/\bWith\b/g, 'with');
  } else {
    name = `Character ${hex}`;
  }
  let block = 'Unknown';
  if (cp <= 0x007f) block = 'Basic Latin';
  else if (cp <= 0x00ff) block = 'Latin-1 Supplement';
  else if (cp <= 0x017f) block = 'Latin Extended-A';
  else if (cp <= 0x024f) block = 'Latin Extended-B';
  else if (cp >= 0x0250 && cp <= 0x02af) block = 'IPA Extensions';
  else if (cp >= 0x02b0 && cp <= 0x02ff) block = 'Spacing Modifier Letters';
  else if (cp >= 0x0300 && cp <= 0x036f) block = 'Combining Diacritical Marks';
  else if (cp >= 0x0370 && cp <= 0x03ff) block = 'Greek and Coptic';
  else if (cp >= 0x1f00 && cp <= 0x1fff) block = 'Greek Extended';
  else if (cp >= 0x0400 && cp <= 0x04ff) block = 'Cyrillic';
  else if (cp >= 0x0530 && cp <= 0x058f) block = 'Armenian';
  else if (cp >= 0x0590 && cp <= 0x05ff) block = 'Hebrew';
  else if (cp >= 0x0600 && cp <= 0x06ff) block = 'Arabic';
  else if (cp >= 0x0900 && cp <= 0x097f) block = 'Devanagari';
  else if (cp >= 0x10a0 && cp <= 0x10ff) block = 'Georgian';
  else if (cp >= 0xa720 && cp <= 0xa7ff) block = 'Latin Extended-D';
  return { hex, name, block };
}

function buildQuickFactsSection(entry, catalogEntry) {
  const greek = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  const symbols = catalogEntry?.symbols || [];
  const ipa = catalogEntry?.pronunciation?.ipa ? catalogEntry.pronunciation.ipa : '';
  const facts = [
    { dt: getOriginalScriptLabel(entry), dd: hasOriginal ? greek : entry.unicode, isScript: true },
    { dt: 'Unicode Restoration', dd: entry.unicode },
    {
      dt: 'Pantheon',
      dd: (entry.pantheon || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    { dt: 'Domain', dd: entry.domain },
    { dt: 'Meaning', dd: entry.meaning || entry.domain },
    { dt: 'Classification', dd: entry.tierLabel || `Tier ${entry.tier}` },
    {
      dt: 'Primary Domain',
      dd: getDomainsText(entry).split(' \u00b7 ')[0] || `${entry.unicode}.com`,
    },
  ];
  if (ipa) facts.splice(2, 0, { dt: 'Reconstructed Pronunciation', dd: ipa });
  if (symbols.length)
    facts.push({
      dt: 'Sacred Symbols',
      dd: symbols
        .slice(0, 5)
        .map((s) => s.name)
        .join(', '),
    });
  const rows = facts
    .map(
      (f) =>
        `<div class="fact-card reveal-up"><span class="fact-label">${f.dt}</span><span class="fact-value ${f.isScript ? 'script' : ''}">${f.dd}</span></div>`
    )
    .join('');
  return `<section class="section section-name" id="quick-facts">
    <div class="section-bg-glow"></div>
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">01</span>
            <h2 class="section-title">Quick Facts</h2>
            <p class="section-subtitle">Essential information about ${entry.unicode}, ${entry.domain}</p>
        </div>
        <div class="facts-grid reveal-up">
            <div class="facts-list">${rows}</div>
        </div>
    </div>
</section>`;
}

function buildEtymologySection(entry, catalogEntry) {
  const greek = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  const etym = entry.etymology || {};
  const steps = [];
  if (etym.protoForm) {
    steps.push({
      lang: etym.protoLanguage
        ? etym.protoLanguage.charAt(0).toUpperCase() + etym.protoLanguage.slice(1)
        : 'Proto-Form',
      form: etym.protoForm,
      gloss: etym.protoGloss || 'reconstructed ancestor',
    });
  }
  steps.push({
    lang: getOriginalScriptLabel(entry),
    form: hasOriginal ? greek : entry.unicode,
    gloss: entry.meaning ? `${entry.unicode} — "${entry.meaning}"` : entry.domain,
  });
  steps.push({
    lang: 'Unicode Restoration',
    form: entry.unicode,
    gloss: 'Restored stress, length, and script',
  });
  steps.push({ lang: 'Modern ASCII', form: entry.ascii, gloss: 'Plain-ASCII fallback' });
  const chain = steps
    .map((s, i) => {
      const step = `<div class="etymology-step reveal-up" data-step="${i + 1}" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
      <div class="etym-step-content">
        <span class="etym-lang">${s.lang}</span>
        <span class="etym-form">${s.form}</span>
        <span class="etym-gloss">${s.gloss}</span>
      </div>
    </div>`;
      return step;
    })
    .join('');
  const etymNote = catalogEntry?.pronunciation?.note || etym.derivation || '';
  const note = etymNote
    ? `<p class="etymology-note">${etymNote}</p>`
    : `<p class="etymology-note">The name <strong>${entry.unicode}</strong> carries the orthographic signature of the ${entry.pantheon} tradition: ${greek}. Unicode restoration recovers what ASCII flattens.</p>`;
  const kin = catalogEntry?.pronunciation?.kin ? catalogEntry.pronunciation.kin : [];
  const derivativeGroups = [];
  if (kin.length) {
    derivativeGroups.push({
      title: 'Etymological Kin',
      items: kin.map((k) => `<li><strong>${k.label}</strong> — ${k.form}</li>`).join(''),
    });
  }
  const scholarlyVariants = (entry.variants || []).filter((v) => v.type !== 'ascii');
  if (scholarlyVariants.length) {
    derivativeGroups.push({
      title: 'Unicode Variants',
      items: scholarlyVariants
        .map(
          (v) => `<li><strong>${v.unicode}</strong> — ${v.type}${v.note ? ` (${v.note})` : ''}</li>`
        )
        .join(''),
    });
  }
  if (entry.accuracyNote) {
    derivativeGroups.push({
      title: 'Editorial Note',
      items: `<li>${entry.accuracyNote}</li>`,
    });
  }
  if (!derivativeGroups.length) {
    derivativeGroups.push({
      title: 'Modern Descendants',
      items: `<li><strong>${entry.ascii}</strong> — Modern English / international usage</li>`,
    });
  }
  const derivatives = derivativeGroups
    .map((g) => `<div class="derivative-group"><h4>${g.title}</h4><ul>${g.items}</ul></div>`)
    .join('');
  return `<section class="section section-victory" id="etymology">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">02</span>
            <h2 class="section-title">Etymology & Word Family</h2>
            <p class="section-subtitle">From original script to Unicode restoration</p>
        </div>
        <div class="etymology-content">
            <div class="etymology-main reveal-up">
                <div class="etymology-timeline">${chain}</div>
                ${note}
            </div>
            <aside class="derivatives-sidebar reveal-up" data-delay="150">
                <h3 class="derivatives-title">Derivatives & Descendants</h3>
                <div class="derivatives-grid">${derivatives}</div>
            </aside>
        </div>
    </div>
</section>`;
}

function buildUnicodeBreakdownSection(entry) {
  const breakdown = entry.breakdown || [];
  let rows = '';
  if (breakdown.length) {
    rows = breakdown
      .map((b, i) => {
        if (!b.to) {
          return `<tr class="reveal-up" ${i > 0 ? `data-delay="${i * 80}"` : ''}><td class="char-cell">—</td><td><code>N/A</code></td><td>Dropped character</td><td>${(entry.pantheon || 'Original').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} orthography</td><td>${b.note || 'Not represented in the original script'}</td></tr>`;
        }
        const info = getUnicodeInfo(b.to);
        let role = b.note || '';
        if (!role) {
          if (b.type === 'stress') role = 'Stress marker (acute/circumflex): pitch or emphasis';
          else if (b.type === 'length') role = 'Length marker (macron): long vowel';
          else if (b.type === 'breathing') role = 'Breathing mark: rough or smooth aspiration';
          else role = 'Preserves the base letter';
        }
        return `<tr class="reveal-up" ${i > 0 ? `data-delay="${i * 80}"` : ''}><td class="char-cell">${b.to}</td><td><code>${info.hex}</code></td><td>${info.name}</td><td>${info.block}</td><td>${role}</td></tr>`;
      })
      .join('');
  } else {
    rows = entry.unicode
      .split('')
      .map((ch, i) => {
        const info = getUnicodeInfo(ch);
        return `<tr class="reveal-up" ${i > 0 ? `data-delay="${i * 80}"` : ''}><td class="char-cell">${ch}</td><td><code>${info.hex}</code></td><td>${info.name}</td><td>${info.block}</td><td>Restored character</td></tr>`;
      })
      .join('');
  }
  const tierNote =
    entry.tier === 'dual'
      ? `The <strong>dual-tier</strong> nature of ${entry.unicode} arises because the original contains multiple independent scholarly restorations.`
      : `The <strong>${entry.tierLabel || `Tier ${entry.tier}`}</strong> classification reflects which ancient features stress, length, or script are preserved in this restoration.`;
  return `<section class="section section-pronunciation" id="unicode-breakdown">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">03</span>
            <h2 class="section-title">Unicode Character Breakdown</h2>
            <p class="section-subtitle">Character-by-character philological analysis</p>
        </div>
        <div class="breakdown-table reveal-up">
            <table class="char-table">
                <thead>
                    <tr><th>Character</th><th>Unicode</th><th>Name</th><th>Block</th><th>Phonetic Role</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="breakdown-note">${tierNote}</p>
        </div>
    </div>
</section>`;
}

function buildCulturalSignificanceSection(entry, catalogEntry) {
  const cards = [];
  if (catalogEntry?.syncretism) {
    cards.push({
      title: `${entry.unicode} in Later Traditions`,
      body: stripOuterPTag(catalogEntry.syncretism),
    });
  }
  if (catalogEntry?.culturalLegacy) {
    cards.push({ title: 'Modern Legacy', body: stripOuterPTag(catalogEntry.culturalLegacy) });
  }
  cards.push({
    title: 'Unicode Restoration as Cultural Act',
    body: `Restoring <strong>${entry.unicode}</strong> in a domain name is more than orthographic accuracy. It is a statement that the internet should recognize the full range of human writing — not only the ASCII keyboard.`,
  });
  if (catalogEntry?.domains?.title) {
    cards.unshift({
      title: 'Ancient Domain',
      body:
        stripOuterPTag(catalogEntry.domains.lead) ||
        `In the ${entry.pantheon} tradition, ${entry.unicode} governed ${entry.domain.toLowerCase()}.`,
    });
  }
  const grid = cards
    .map(
      (c, i) =>
        `<article class="cultural-card reveal-up ${i === 0 ? 'feature-card' : ''}" ${i > 0 ? `data-delay="${i * 100}"` : ''}><h3 class="cultural-card-title">${c.title}</h3><p class="cultural-card-body">${c.body}</p></article>`
    )
    .join('');
  return `<section class="section section-name" id="cultural-significance">
    <div class="section-bg-glow"></div>
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">04</span>
            <h2 class="section-title">Cultural Significance</h2>
            <p class="section-subtitle">From ancient cult to modern Unicode</p>
        </div>
        <div class="cultural-grid">${grid}</div>
    </div>
</section>`;
}

function stripOuterPTag(html) {
  if (!html) return '';
  const trimmed = html.trim();
  if (trimmed.toLowerCase().startsWith('<p') && trimmed.toLowerCase().endsWith('</p>')) {
    const inner = trimmed.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '');
    return inner.trim();
  }
  return trimmed;
}

function buildFaqSection(entry, catalogEntry) {
  const greek = getOriginalScript(entry) || entry.unicode;
  const ipa = catalogEntry?.pronunciation?.ipa ? catalogEntry.pronunciation.ipa : '';
  const approximation = catalogEntry?.pronunciation?.approximation
    ? catalogEntry.pronunciation.approximation
    : '';
  const symbols = catalogEntry?.symbols || [];
  const variants = (entry.variants || []).filter((v) => v.type !== 'ascii');
  const items = [];
  items.push({
    q: `How do you pronounce ${entry.unicode}?`,
    a: ipa
      ? `In reconstructed pronunciation, <strong>${entry.unicode}</strong> is ${ipa}${approximation ? ` — approximately ${approximation}` : ''}.`
      : `The original form <strong>${greek}</strong> preserves phonetic distinctions that plain <strong>${entry.ascii}</strong> cannot show.`,
  });
  items.push({
    q: `What does ${entry.unicode} mean?`,
    a: `<strong>${entry.unicode}</strong> means <strong>${entry.meaning || entry.domain}</strong> in the ${entry.pantheon} tradition.`,
  });
  if (symbols.length) {
    items.push({
      q: `What are the symbols of ${entry.unicode}?`,
      a: `${entry.unicode} is associated with ${symbols
        .slice(0, 5)
        .map((s) => `<strong>${s.name}</strong> (${s.meaning})`)
        .join(', ')}.`,
    });
  }
  if (variants.length) {
    items.push({
      q: `What is the difference between ${getDomainsText(entry).split(' \u00b7 ').join(' and ')}?`,
      a: `Each is a historically defensible restoration. ${variants.map((v) => `<strong>${v.unicode}.com</strong> is the ${v.type} form${v.note ? `: ${v.note}` : ''}`).join('; ')}.`,
    });
  }
  items.push({
    q: `Why restore ${entry.unicode} in Unicode?`,
    a: `Plain ASCII <strong>${entry.ascii}</strong> strips the stress, length, and script that make the name specific. Unicode restoration returns the name to its original written dignity.`,
  });
  if (catalogEntry?.mythology?.myths?.length) {
    const m = catalogEntry.mythology.myths[0];
    items.push({
      q: `What is the most important myth about ${entry.unicode}?`,
      a: stripOuterPTag(m.text)
        .replace(/<p[^>]*>/g, '')
        .replace(/<\/p>/g, ''),
    });
  }
  const faqs = items
    .map(
      (it, i) =>
        `<details class="faq-item reveal-up" ${i === 0 ? 'open' : ''}><summary class="faq-question"><span class="faq-number">${String(i + 1).padStart(2, '0')}</span>${it.q}</summary><div class="faq-answer"><p>${it.a}</p></div></details>`
    )
    .join('');
  return `<section class="section section-victory" id="faq">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">05</span>
            <h2 class="section-title">Frequently Asked Questions</h2>
            <p class="section-subtitle">Common questions about ${entry.unicode}, ${entry.domain}, and Unicode restoration</p>
        </div>
        <div class="faq-list">${faqs}</div>
    </div>
</section>`;
}

function buildSourcesSection(entry, catalogEntry) {
  const sourceCitations = {
    LSJ: '<cite>Liddell, H. G., Scott, R., &amp; Jones, H. S. <em>A Greek-English Lexicon.</em> Oxford: Clarendon Press, 9th ed. 1996.</cite>',
    'Pape-Benseler':
      '<cite>Pape, W., &amp; Benseler, G. E. <em>Wörterbuch der griechischen Eigennamen.</em> Braunschweig: Vieweg, 1884.</cite>',
    Beekes:
      '<cite>Beekes, R. S. P. <em>Etymological Dictionary of Greek.</em> Leiden: Brill, 2010.</cite>',
    Chantraine:
      '<cite>Chantraine, P. <em>Dictionnaire étymologique de la langue grecque.</em> Paris: Klincksieck, 1968–1980.</cite>',
    Faulkner:
      '<cite>Faulkner, R. O. <em>A Concise Dictionary of Middle Egyptian.</em> Oxford: Griffith Institute, 1962.</cite>',
    Budge:
      '<cite>Budge, E. A. W. <em>An Egyptian Hieroglyphic Dictionary.</em> London: John Murray, 1920.</cite>',
    Burkert:
      '<cite>Burkert, W. <em>Greek Religion.</em> Cambridge, MA: Harvard University Press, 1985.</cite>',
    Nilsson:
      '<cite>Nilsson, M. P. <em>Geschichte der griechischen Religion.</em> Munich: Beck, 1967.</cite>',
    Watkins:
      '<cite>Watkins, C. <em>The American Heritage Dictionary of Indo-European Roots.</em> Boston: Houghton Mifflin, 2000.</cite>',
    West: '<cite>West, M. L. <em>Indo-European Poetry and Myth.</em> Oxford: Oxford University Press, 2007.</cite>',
  };
  const primaryByPantheon = {
    greek:
      'Homer. <em>Iliad</em> and <em>Odyssey</em>; Hesiod. <em>Theogony</em> and <em>Works and Days</em>.',
    egyptian: 'The Pyramid Texts; The Coffin Texts; The Book of the Dead.',
    norse: 'The <em>Poetic Edda</em>; The <em>Prose Edda</em> of Snorri Sturluson.',
    mesopotamian: 'The Epic of Gilgamesh; Sumerian temple hymns and Akkadian ritual texts.',
    canaanite: 'The Ugaritic Baal Cycle; ritual texts from Ugarit and Phoenician inscriptions.',
    hindu: 'The <em>Ṛgveda</em>; the <em>Brāhmaṇas</em>; early Upaniṣadic literature.',
    japanese: 'The <em>Kojiki</em>; the <em>Nihon Shoki</em>; shrine ritual records.',
  };
  const lexKeys = ['LSJ', 'Beekes', 'Pape-Benseler', 'Chantraine', 'Faulkner', 'Budge', 'Watkins', 'West'];
  const primaryPatterns = [
    /Homer/,
    /Hesiod/,
    /Aeschylus/,
    /Sophocles/,
    /Euripides/,
    /Pindar/,
    /Pausanias/,
    /Apollodorus/,
    /Ovid/,
    /Vergil/,
    /Virgil/,
    /Plato/,
    /Cicero/,
    /Homeric Hymn/,
    /Orphic Hymn/,
    /Theogony/,
    /Works and Days/,
    /Iliad/,
    /Odyssey/,
    /Library/,
    /Metamorphoses/,
    /Aeneid/,
    /Phaedo/,
    /Protagoras/,
    /Republic/,
    /Suppliants/,
    /Eumenides/,
    /Prometheus Bound/,
    /Iphigenia/,
    /Sappho/,
  ];
  const archaeologyPatterns = [
    /Archaeology/,
    /Art History/,
    /Iconography/,
    /Inscription/,
    /Excavation/,
    /Sanctuary/,
    /Temple/,
    /Vase/,
    /Frieze/,
    /Pergamon/,
    /Parthenon/,
    /Acropolis/,
    /Eleusis/,
    /Delphi/,
    /Linear B/,
    /Mycenaean/,
    /Minoan/,
    /Pylos/,
    /Knossos/,
    /Mycenae/,
  ];

  const lexItems = (entry.sources || []).map((s) => sourceCitations[s] || `<cite>${s}</cite>`);
  if (!lexItems.length)
    lexItems.push(`<cite>Lexical and philological sources for ${entry.unicode}.</cite>`);

  let primaryItems = [];
  let archaeologyItems = [];
  let religiousItems = [];

  if (catalogEntry?.sources && catalogEntry.sources.length > 0) {
    for (const s of catalogEntry.sources) {
      const name = (s.name || s).toString();
      const cite = `<cite>${name}</cite>`;
      if (lexKeys.includes(name)) continue;
      if (primaryPatterns.some((p) => p.test(name))) {
        primaryItems.push(cite);
      } else if (archaeologyPatterns.some((p) => p.test(name))) {
        archaeologyItems.push(cite);
      } else {
        religiousItems.push(cite);
      }
    }
  }

  if (!primaryItems.length) {
    const primaryText =
      primaryByPantheon[entry.pantheon] ||
      `Primary sources in the ${entry.pantheon} tradition for ${entry.unicode}.`;
    primaryItems.push(`<cite>${primaryText}</cite>`);
  }

  if (!archaeologyItems.length) {
    archaeologyItems.push(
      `<cite>Material evidence — iconography, inscriptions, and temple archaeology — for ${entry.unicode} and related cults.</cite>`
    );
  }

  if (catalogEntry?.archaeology) {
    archaeologyItems.push(`<cite>${catalogEntry.archaeology}</cite>`);
  }

  if (!religiousItems.length) {
    religiousItems.push(
      `<cite>Comparative studies of ${entry.pantheon} religion and the place of ${entry.unicode} within it.</cite>`
    );
  }

  const sourceCategories = [
    { title: 'Lexicography & Philology', icon: '◈', items: lexItems },
    { title: 'Primary Texts', icon: '◎', items: primaryItems },
    { title: 'Archaeology & Art History', icon: '◉', items: archaeologyItems },
    { title: 'Religious Studies', icon: '✦', items: religiousItems },
  ];
  const categoryGrid = sourceCategories
    .map(
      (cat) => `<div class="source-category reveal-up">
                    <div class="source-category-header">
                        <span class="source-icon">${cat.icon}</span>
                        <h3>${cat.title}</h3>
                    </div>
                    <ul class="source-list">${cat.items.map((li) => `<li>${li}</li>`).join('')}</ul>
                </div>`
    )
    .join('');

  return `<section class="section section-name" id="sources">
    <div class="section-bg-glow"></div>
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">06</span>
            <h2 class="section-title">Scholarly Sources</h2>
            <p class="section-subtitle">The philological foundations of this restoration</p>
        </div>
        <div class="sources-content reveal-up">
            <div class="sources-intro">
                <p>Every claim on this page is grounded in established scholarship. The orthographic restorations follow disciplinary convention. The etymological chain follows the best available reference works. This is not invention — it is <strong>resurrection through scholarship.</strong></p>
            </div>
            <div class="sources-grid">${categoryGrid}</div>
        </div>
    </div>
</section>`;
}

function cleanSectionContent(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  const section = $('section');
  if (!section.length) return html;
  section.find('.section-header').remove();
  section.find('.section-bg-glow').remove();
  const bodySelectors = [
    '.tier-feature-grid',
    '.victory-content',
    '.pronunciation-grid',
    '.domains-grid',
    '.symbols-list',
    '.myths-timeline',
    '.tier-explanation',
  ];
  for (const sel of bodySelectors) {
    let el = section.find(sel).first();
    if (!el.length) continue;
    while (true) {
      const children = el.children();
      if (children.length === 1) {
        const child = children.first();
        const tag = child[0].tagName;
        const cls = child.attr('class') || '';
        if (
          tag === 'div' &&
          (cls.includes('container') || cls.includes('tier-explanation') || cls.includes('section'))
        ) {
          el = child;
          continue;
        }
      }
      break;
    }
    const wrapperClasses = [
      'tier-feature-grid',
      'pronunciation-grid',
      'domains-grid',
      'symbols-list',
      'myths-timeline',
    ];
    const cls = el.attr('class') || '';
    if (wrapperClasses.some((c) => cls.includes(c))) return $.html(el).trim();
    return el.html().trim();
  }
  let inner = '';
  section.children().each((_i, el) => {
    inner += $.html(el);
  });
  return inner.trim();
}

function generateHomePage(entry, palette, slotNames, templateDir) {
  let html = fs.readFileSync(path.join(templateDir, 'index.html'), 'utf8');
  const templeId = entry.id;
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: getOriginalScript(entry) || '—',
    DOMAIN: entry.domain,
    MEANING: entry.meaning || '',
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    HERO_VIDEO_OR_MASCOT: buildHeroVisual(templeId, entry.unicode, entry.domain),
    FOOTER: buildZeusFooter(entry, ''),
  };
  for (let i = 0; i < SLOT_TYPES.length; i++) {
    vars[`SLOT_${String(i + 1).padStart(2, '0')}_NAME`] = slotNames[i];
    vars[`SLOT_OFFSET_${String(i + 1).padStart(2, '0')}`] = String(52 + i + 1).padStart(2, '0');
  }
  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);

  // Optional full-bleed phenomenon background behind the mascot (e.g. Aša)
  const phenomenonPng = path.join(
    SITES_DIR,
    templeId,
    'assets',
    `${templeId}_mascot_phenomenon.png`
  );
  if (fs.existsSync(phenomenonPng)) {
    const phenomenonHtml = `
        <div class="endorsement-hero-phenomenon" aria-hidden="true">
            <picture>
                <source srcset="assets/${templeId}_mascot_phenomenon.webp" type="image/webp">
                <img src="assets/${templeId}_mascot_phenomenon.png" alt="" class="endorsement-hero-phenomenon-img">
            </picture>
        </div>`;
    html = html.replace(
      /<header class="endorsement-hero" id="hero">\n\s*<div class="container">/,
      `<header class="endorsement-hero" id="hero">${phenomenonHtml}\n        <div class="container">`
    );
  }

  return html;
}

function iconSvg(pathData, stroke = 'var(--primary)') {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.5"><path d="${pathData}"/></svg>`;
}

function buildPronunciationContent(entry, catalogEntry) {
  if (catalogEntry?.pronunciation) {
    const p = catalogEntry.pronunciation;
    const phonemes = (p.phonemes || [])
      .map(
        (ph, i) => `
      <div class="phoneme" style="--delay:${i * 100}ms">
        <span class="phoneme-symbol">${ph.symbol}</span>
        <span class="phoneme-desc">${ph.desc}</span>
      </div>`
      )
      .join('');
    const kin = (p.kin || []).map((k) => `<li><strong>${k.label}</strong> ${k.form}</li>`).join('');
    return `
      <div class="pronunciation-grid">
        <div class="pronunciation-main reveal-up">
          <div class="ipa-display">
            <span class="ipa-text">${p.ipa || ''}</span>
            <span class="ipa-label">${p.ipaLabel || 'Reconstructed Pronunciation'}</span>
          </div>
          ${phonemes ? `<div class="pronunciation-breakdown">${phonemes}</div>` : ''}
        </div>
        <div class="pronunciation-sidebar reveal-up" data-delay="150">
          <div class="sidebar-card">
            <h4 class="sidebar-title">Modern Approximation</h4>
            <p class="sidebar-text">${p.approximation || ''}</p>
            ${kin ? `<div class="sidebar-divider"></div><h4 class="sidebar-title">Etymological Kin</h4><ul class="kin-list">${kin}</ul>` : ''}
          </div>
          ${p.note ? `<div class="sidebar-card accent-card"><h4 class="sidebar-title">The Accent / Script Rule</h4><p class="sidebar-text">${p.note}</p></div>` : ''}
        </div>
      </div>`;
  }
  // fallback stub
  return LORE_STUBS.buildPronunciationContent(entry);
}

function buildSymbolsContent(entry, catalogEntry) {
  if (catalogEntry?.domains) {
    const d = catalogEntry.domains;
    const cards = (d.cards || [])
      .map(
        (c, i) => `
      <div class="domain-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="domain-icon">${iconSvg(c.iconPath)}</div>
        <h4 class="domain-name">${c.name}</h4>
        <p class="domain-desc">${c.desc}</p>
      </div>`
      )
      .join('');
    const symbols = (catalogEntry.symbols || [])
      .map(
        (s) => `
      <div class="symbol-item">
        <span class="symbol-name">${s.name}</span>
        <span class="symbol-meaning">${s.meaning}</span>
      </div>`
      )
      .join('');
    const leadHtml = d.lead
      ? d.lead.trim().startsWith('<p')
        ? `<div class="domains-intro reveal-up">${d.lead}</div>`
        : `<div class="domains-intro reveal-up"><p class="lead-text">${d.lead}</p></div>`
      : '';
    return `
      ${leadHtml}
      <div class="domains-grid">${cards}</div>
      ${symbols ? `<div class="symbols-section reveal-up"><h3 class="symbols-title">Sacred Symbols</h3><div class="symbols-list">${symbols}</div></div>` : ''}`;
  }
  // fallback stub
  return LORE_STUBS.buildSymbolsContent(entry);
}

function buildMythologyContent(entry, catalogEntry) {
  if (catalogEntry?.mythology) {
    const m = catalogEntry.mythology;
    const myths = (m.myths || [])
      .map((my, i) => {
        const textHtml = my.text?.trim().startsWith('<p')
          ? my.text
          : `<p class="myth-text">${my.text}</p>`;
        return `
      <div class="myth-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="myth-marker"></div>
        <div class="myth-content">
          <span class="myth-tag">${my.tag}</span>
          <h3 class="myth-title">${my.title}</h3>
          ${textHtml}
        </div>
      </div>`;
      })
      .join('');
    const leadPara = m.lead
      ? m.lead.trim().startsWith('<p')
        ? m.lead
        : `<p class="lead-text">${m.lead}</p>`
      : '';
    return `
      ${leadPara}
      <div class="myths-timeline">${myths}</div>`;
  }
  // fallback stub
  return LORE_STUBS.buildMythologyContent(entry);
}

function _buildSyncretismContent(entry, catalogEntry) {
  if (catalogEntry?.syncretism) return catalogEntry.syncretism;
  return cleanSectionContent(entry._loreSections?.syncretism) || '';
}

function _buildCulturalLegacyContent(entry, catalogEntry) {
  if (catalogEntry?.culturalLegacy) return catalogEntry.culturalLegacy;
  return `<p class="lead-text"><strong>${entry.unicode}</strong> survives in languages, place names, academic vocabulary, and contemporary media.</p>
<p>From classical scholarship to modern fantasy, gaming, and brand language, the name remains a marker of primal force. Its Unicode restoration makes that legacy addressable on the internet itself.</p>`;
}

function generateLorePage(entry, palette, loreSections, templateDir, catalog) {
  const catalogEntry = catalog?.[entry.id];
  let html = fs.readFileSync(path.join(templateDir, 'lore', 'index.html'), 'utf8');
  const templeId = entry.id;
  const nameProse = buildNameProse(entry);
  const provenance = getProvenance(entry);
  const hasProvenance =
    provenance && Array.isArray(provenance.steps) && provenance.steps.length > 0;
  const sectionOffset = hasProvenance ? 1 : 0;
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: getOriginalScript(entry) || '—',
    ORIGINAL_SCRIPT: getOriginalScript(entry) || entry.unicode,
    ORIGINAL_SCRIPT_LABEL: getOriginalScriptLabel(entry),
    ORIGINAL_SCRIPT_CARD_NOTE: buildOriginalScriptCardNote(entry),
    ORIGINAL_SCRIPT_PROVENANCE_SECTION: buildOriginalScriptProvenanceSection(entry),
    DOMAIN: entry.domain,
    MEANING: entry.meaning || '',
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    PUNYCODE: getPunycodeExplainer(entry),
    NAME_ORIGINAL: nameProse.original,
    NAME_ASCII: nameProse.ascii,
    NAME_UNICODE: nameProse.unicode,
  };

  const hasCatalogMyth = catalogEntry?.mythology;
  const hasCatalogPron = catalogEntry?.pronunciation;
  const hasCatalogSymbols = catalogEntry?.domains;

  const mythology = hasCatalogMyth
    ? buildMythologyContent(entry, catalogEntry)
    : isStubContent(cleanSectionContent(loreSections.mythology))
      ? buildMythologyContent(entry, null)
      : cleanSectionContent(loreSections.mythology);
  const pronunciationRaw = cleanSectionContent(loreSections.pronunciation);
  const pronunciationStub =
    isStubContent(pronunciationRaw) ||
    (pronunciationRaw.includes('lead-text') && !pronunciationRaw.includes('ipa-display'));
  const pronunciation = hasCatalogPron
    ? buildPronunciationContent(entry, catalogEntry)
    : pronunciationStub
      ? buildPronunciationContent(entry, null)
      : pronunciationRaw;
  const symbolsRaw = cleanSectionContent(loreSections.symbols);
  const symbolsStub =
    isStubContent(symbolsRaw) ||
    (symbolsRaw.includes('class="symbols-list"') && !symbolsRaw.includes('symbol-meaning'));
  const symbols = hasCatalogSymbols
    ? buildSymbolsContent(entry, catalogEntry)
    : symbolsStub
      ? buildSymbolsContent(entry, null)
      : symbolsRaw;

  const symbolsTitle = catalogEntry?.domains?.title
    ? catalogEntry.domains.title
    : 'Domains & Sacred Symbols';
  const symbolsSubtitle = catalogEntry?.domains?.subtitle
    ? catalogEntry.domains.subtitle
    : catalogEntry?.domains?.title
      ? entry.domain
      : `Attributes of ${entry.unicode}`;

  vars.PRONUNCIATION = wrapSection(
    'pronunciation',
    'Pronunciation',
    `How ${entry.unicode} was spoken`,
    pronunciation,
    2 + sectionOffset
  );
  vars.SYMBOLS = wrapSection('symbols', symbolsTitle, symbolsSubtitle, symbols, 3 + sectionOffset);
  vars.MYTHOLOGY = wrapSection(
    'mythology',
    'Mythology',
    `Stories of ${entry.unicode}`,
    mythology,
    4 + sectionOffset
  );
  vars.RELATED_NAMES = buildRelatedNamesSection(entry, 5 + sectionOffset);
  vars.EXTENDED_LORE_CTA = buildExtendedLoreCTA(entry, catalogEntry);
  vars.FOOTER = buildZeusFooter(entry, '../');
  vars.EXTENDED_TAB = buildExtendedTab('lore', entry.id);

  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);
  return html;
}

function buildGalleryGrid(entry) {
  const id = entry.id;
  const items = [];
  const pushItem = (img, webp, caption) => {
    const imgPath = path.join(SITES_DIR, id, 'assets', img);
    if (fs.existsSync(imgPath)) {
      items.push(`
                <div class="gallery-item reveal-up">
                    <figure class="gallery-figure" data-full-src="../assets/${img}">
                        <picture><source srcset="../assets/${webp}" type="image/webp"><img src="../assets/${img}" alt="${caption}" loading="lazy"></picture>
                    </figure>
                    <p class="gallery-caption">${caption}</p>
                </div>`);
    }
  };
  pushItem(
    `${id}_mascot.png`,
    `${id}_mascot.webp`,
    `The ${entry.unicode} mascot — ${entry.domain}`
  );
  pushItem(`${id}_logolockup.png`, `${id}_logolockup.webp`, `${entry.unicode} logolockup`);
  pushItem(`${id}_logomark.png`, `${id}_logomark.webp`, `${entry.unicode} logomark seal`);
  pushItem(`${id}_hero_poster.jpg`, `${id}_hero_poster.jpg`, `${entry.unicode} cinematic poster`);
  if (items.length === 0) {
    items.push(`
                <div class="gallery-item reveal-up">
                    <div class="gallery-placeholder">
                        <span class="gallery-label">Gallery images coming soon</span>
                        <span class="gallery-meta">${entry.unicode} — ${entry.domain}</span>
                    </div>
                    <p class="gallery-caption">A curated collection of ${entry.unicode}, ${entry.domain}, through history.</p>
                </div>`);
  }
  return items.join('\n');
}

function generateGalleryPage(entry, palette, templateDir) {
  let html = fs.readFileSync(path.join(templateDir, 'gallery', 'index.html'), 'utf8');
  const templeId = entry.id;
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: getOriginalScript(entry) || '—',
    DOMAIN: entry.domain,
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    GALLERY_GRID: buildGalleryGrid(entry),
    FOOTER: buildZeusFooter(entry, '../'),
    EXTENDED_TAB: buildExtendedTab('gallery', entry.id),
  };
  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);
  return html;
}

function generateExtendedPage(entry, palette, templateDir, catalog) {
  let html = fs.readFileSync(path.join(templateDir, 'lore', 'extended', 'index.html'), 'utf8');
  const templeId = entry.id;
  const catalogEntry = catalog?.[entry.id];
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: getOriginalScript(entry) || '—',
    DOMAIN: entry.domain,
    MEANING: entry.meaning || '',
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    HERO_VISUAL: buildHeroVisualExtended(entry, '../../'),
    QUICK_FACTS: buildQuickFactsSection(entry, catalogEntry),
    ETYMOLOGY: buildEtymologySection(entry, catalogEntry),
    UNICODE_BREAKDOWN: buildUnicodeBreakdownSection(entry),
    CULTURAL_SIGNIFICANCE: buildCulturalSignificanceSection(entry, catalogEntry),
    FAQ: buildFaqSection(entry, catalogEntry),
    SOURCES: buildSourcesSection(entry, catalogEntry),
    FOOTER: buildZeusFooter(entry, '../../'),
  };
  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);
  return html;
}

function buildLoreJson(entry, catalogEntry) {
  const payload = {
    id: entry.id,
    unicode: entry.unicode,
    ascii: entry.ascii,
    greek: entry.greek || null,
    pantheon: entry.pantheon,
    tier: entry.tier,
    tierLabel: entry.tierLabel || `Tier ${entry.tier}`,
    domain: entry.domain,
    meaning: entry.meaning || '',
    sources: entry.sources || [],
    lore: catalogEntry || {},
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

function validateGenerated(_templeId, outputs) {
  const issues = [];
  const slotNameRe = /^[\p{L}\p{N}\s]+$/u;

  for (const [fileName, content] of Object.entries(outputs)) {
    if (content.includes('{{') || content.includes('}}')) {
      const leftover = content.match(/\{\{[^}]+\}\}/g) || [];
      issues.push(`${fileName}: leftover placeholders ${leftover.join(', ')}`);
    }
    if (fileName.endsWith('.js')) {
      if (content.includes('console.error') || content.includes('console.log')) {
        issues.push(`${fileName}: contains console statement`);
      }
      if (content.includes('localhost')) {
        issues.push(`${fileName}: contains localhost reference`);
      }
    }
    if (fileName.endsWith('.html')) {
      if (
        content.includes('<span class="title-greek">—</span>') ||
        content.includes('<p class="card-greek">—</p>')
      ) {
        issues.push(`${fileName}: placeholder em dash in Greek position`);
      }
    }
  }

  // Slot-name check (home page)
  const home = outputs['index.html'];
  const slotNames = [];
  const nameMatches = home.match(/<span class="space-name">([^<]+)<\/span>/g) || [];
  for (const m of nameMatches) {
    const name = m.replace(/<[^>]+>/g, '').trim();
    if (!slotNameRe.test(name))
      issues.push(`index.html: slot name contains punctuation: "${name}"`);
    slotNames.push(name);
  }
  if (slotNames.length !== SLOT_TYPES.length) {
    issues.push(`index.html: found ${slotNames.length} slot names, expected ${SLOT_TYPES.length}`);
  }

  return issues;
}

function requiredAssets(templeId) {
  const base = path.join(SITES_DIR, templeId, 'assets');
  return [
    path.join(base, `${templeId}_mascot.png`),
    path.join(base, `${templeId}_mascot.webp`),
    path.join(base, `${templeId}_logolockup.png`),
    path.join(base, `${templeId}_logolockup.webp`),
    path.join(base, `${templeId}_logomark.png`),
    path.join(base, `${templeId}_logomark.webp`),
  ];
}

function createFlagship(templeId, options = {}) {
  const { dryRun = false, skipValidation = false } = options;
  const LEXICON = loadLexicon();
  const entry = LEXICON.find((e) => e.id === templeId);
  if (!entry) throw new Error(`Lexicon entry not found: ${templeId}`);

  const siteDir = path.join(SITES_DIR, templeId);
  if (!fs.existsSync(siteDir)) throw new Error(`Site directory not found: ${siteDir}`);

  for (const asset of requiredAssets(templeId)) {
    if (!fs.existsSync(asset)) throw new Error(`Missing required asset: ${asset}`);
  }

  const palette = paletteFor(entry);
  const slotNames = getSlotNames(entry);
  const catalog = loadLoreCatalog();

  // Lore sections extracted from existing lore page if present, otherwise empty
  const lorePath = path.join(siteDir, 'lore', 'index.html');
  const loreSections = {};
  if (fs.existsSync(lorePath)) {
    const loreHtml = fs.readFileSync(lorePath, 'utf8');
    const $ = cheerio.load(loreHtml);
    const idMap = {
      mythology: 'mythology',
      'mythology-lore': 'mythology',
      pronunciation: 'pronunciation',
      'symbols-iconography': 'symbols',
      symbols: 'symbols',
      syncretism: 'syncretism',
      'cultural-legacy': 'cultural-legacy',
    };
    for (const [id, key] of Object.entries(idMap)) {
      const section = $(`section#${id}`);
      if (section.length) loreSections[key] = $.html(section);
    }
  }

  const outputs = {
    'index.html': generateHomePage(entry, palette, slotNames, TEMPLATE_DIR),
    'lore/index.html': generateLorePage(entry, palette, loreSections, TEMPLATE_DIR, catalog),
    'gallery/index.html': generateGalleryPage(entry, palette, TEMPLATE_DIR),
    'lore.json': buildLoreJson(entry, catalog[entry.id] || {}),
    'styles.css': buildCss(palette),
    'script.js': buildScript(templeId),
  };
  const extended = generateExtendedPage(entry, palette, TEMPLATE_DIR, catalog);
  if (extended) outputs['lore/extended/index.html'] = extended;

  if (!skipValidation) {
    const issues = validateGenerated(templeId, outputs);
    if (issues.length) {
      throw new Error(`Validation failed for ${templeId}:\n  - ${issues.join('\n  - ')}`);
    }
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would write ${Object.keys(outputs).length} files for ${templeId}`);
    return outputs;
  }

  // Backup existing flagship files
  const backupDir = path.join(siteDir, '.backup', Date.now().toString());
  const filesToBackup = [
    'index.html',
    'styles.css',
    'script.js',
    'lore/index.html',
    'gallery/index.html',
    'lore/extended/index.html',
  ];
  for (const f of filesToBackup) {
    const p = path.join(siteDir, f);
    if (fs.existsSync(p)) {
      fs.mkdirSync(path.join(backupDir, path.dirname(f)), { recursive: true });
      fs.copyFileSync(p, path.join(backupDir, f));
    }
  }

  for (const [relativePath, content] of Object.entries(outputs)) {
    const outPath = path.join(siteDir, relativePath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf8');
  }

  console.log(`✓ ${templeId}: wrote ${Object.keys(outputs).length} files (backup: ${backupDir})`);
  return outputs;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipValidation = args.includes('--skip-validation');
  const regenerateAll = args.includes('--regenerate-all');

  const EXTENDED_IDS = [
    'aither',
    'anat',
    'apollon',
    'aphrodite',
    'ares',
    'artemis',
    'asherah',
    'astart',
    'athena',
    'atlas',
    'ba',
    'baal',
    'chaos',
    'demeter',
    'dionysos',
    'el',
    'ea',
    'enlil',
    'eros',
    'gaia',
    'ganesha',
    'hades',
    'hekate',
    'heka',
    'helios',
    'hephaistos',
    'hera',
    'hermes',
    'hestia',
    'horus',
    'ishtar',
    'kali',
    'ker',
    'kronos',
    'medousa',
    'nike',
    'okeanos',
    'persephone',
    'pontos',
    'poseidon',
    'prajapati',
    'prometheus',
    'rta',
    'selene',
    'shu',
    'tartaros',
    'typhon',
    'vishnu',
    'zeus',
  ];

  if (regenerateAll) {
    let failed = 0;
    for (const id of EXTENDED_IDS) {
      try {
        createFlagship(id, { dryRun, skipValidation });
      } catch (err) {
        console.error(`✗ ${id}: ${err.message}`);
        failed++;
      }
    }
    console.log(
      `\nRegenerated ${EXTENDED_IDS.length - failed}/${EXTENDED_IDS.length} flagships${dryRun ? ' (dry run)' : ''}.`
    );
    process.exit(failed > 0 ? 1 : 0);
  }

  const templeId = args.find((a) => !a.startsWith('--'));
  if (!templeId) {
    console.error('Usage: node scripts/create-flagship.js <id> [--dry-run] [--skip-validation]');
    console.error('       node scripts/create-flagship.js --regenerate-all [--dry-run]');
    process.exit(1);
  }

  try {
    createFlagship(templeId, { dryRun, skipValidation });
  } catch (err) {
    console.error(`✗ ${templeId}: ${err.message}`);
    process.exit(1);
  }
}

main();

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

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'flagship');
const SITES_DIR = path.join(ROOT, 'sites');
const FLAGSHIP_DATA = require(path.join(__dirname, 'flagship-data.json'));

const SLOT_TYPES = ['Crown','Column','Banner','Frame I','Frame II','Frame III','Ribbon','Seal','Inscription','Emblem','Sigil','Foundation','Dominion'];

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
  canaanite:        { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#4169E1' },
  phoenician:       { primary: '#D4AF37', primaryDim: '#8B7355', primaryBright: '#F0D878', secondary: '#800080' },
  hittite:          { primary: '#CD7F32', primaryDim: '#A06020', primaryBright: '#E09040', secondary: '#C2B280' },
};

const PANTHEON_FALLBACK_WORDS = {
  greek: ['Olympian','Divine','Heroic','Immortal','Theban','Delphic','Aegean','Mythic'],
  'greek-location': ['Aegean','Hellenic','Ancient','Marble','Olive','Ionian'],
  norse: ['Asgard','Runic','Frost','Iron','Yggdrasil','Bifrost','Mjolnir','Rune'],
  egyptian: ['Pharaoh','Desert','Nile','Ankh','Horizon','Papyrus','Lotus','Scarab'],
  sanskrit: ['Cosmic','Mantra','Vedic','Agni','Soma','Dharma','Karma','Om'],
  celtic: ['Oak','Mist','Druid','Harp','Tir','Celtic','Grove','Stone'],
  mesopotamian: ['Ziggurat','Clay','Tigris','Euphrates','Tablet','Cuneiform','Sumer','Akkad'],
  polynesian: ['Moana','Wayfinder','Tapa','Koa','Honu','Aloha','Tiki','Voyager'],
  japanese: ['Samurai','Cherry','Kami','Bushido','Torii','Zen','Ronin','Sakura'],
  nahuatl: ['Sunstone','Jade','Feather','Serpent','Obsidian','Aztec','Toltec','Quetzal'],
  yoruba: ['Orisha','Bronze','Cowrie','Ife','Odu','Yoruba','Ancestral','Sacred'],
  slavic: ['Birch','Frost','Kupala','Veles','Perun','Rus','Dazhbog','Firebird'],
  zoroastrian: ['Fire','Asha','Faravahar','Mithra','Haoma','Persian','Avestan','Fravashi'],
  incan: ['Inti','Gold','Quipu','Puma','Andes','Inca','Cuzco','Llama'],
  canaanite: ['Canaanite','Ugaritic','Phoenician','Zaphon','Levant','Bronze','Baal','El'],
  phoenician: ['Phoenician','Tyrian','Purple','Cedar','Carthage','Sailor','Alphabet','Astart'],
  hittite: ['Hittite','Anatolian','Bronze','Hattusa','Lion','Storm','Solar','Cuneiform'],
};

const STOP_WORDS = new Set([
  'the','and','or','from','of','a','an','to','in','on','by','for','with','via','as','is','was','were','be','been','being','are','this','that','these','those','it','its','his','her','him','she','he','they','them','their','who','whom','which','what','when','where','why','how','also','then','than','only','just','now','here','there','thus','so','too','very','can','could','would','should','will','shall','may','might','must','have','has','had','do','does','did','done','get','got','gotten','make','made','take','took','taken','give','gave','given','see','saw','seen','know','knew','known','come','came','become','went','gone','say','said','tell','told','ask','asked','use','used','work','worked','call','called','try','tried','need','needed','feel','felt','seem','seemed','leave','left','put','keep','kept','let','lets','let','help','helped','show','showed','shown','hear','heard','play','played','move','moved','live','lived','believe','believed','bring','brought','happen','happened','write','wrote','written','provide','provided','sit','sat','stand','stood','lose','lost','pay','paid','meet','met','include','included','continue','continued','set','sets','learn','learned','learnt','change','changed','lead','led','understand','understood','watch','watched','follow','followed','stop','stopped','create','created','speak','spoke','spoken','read','allow','allowed','add','added','spend','spent','grow','grew','grown','open','opened','walk','walked','offer','offered','remember','remembered','love','loved','consider','considered','appear','appeared','buy','bought','wait','waited','serve','served','die','died','send','sent','expect','expected','build','built','stay','stayed','fall','fell','fallen','cut','cuts','reach','reached','kill','killed','remain','remained','suggest','suggested','raise','raised','pass','passed','sell','sold','require','required','report','reported','decide','decided','pull','pulled','one','two','three','four','five','six','seven','eight','nine','ten','first','second','third','last','next','other','another','same','different','new','old','long','short','high','low','big','small','little','large','great','good','bad','best','better','worst','worse','high','true','prime','royal','grand','sovereign','ancient','main','local','title','word','person','people','component','components','applied','also','was','were','who','one','five','title','common','later','before','after','above','below','under','over','again','further','once','more','most','many','much','some','any','all','each','every','both','few','several','own','same','such','no','not','only','own','right','left','early','late','still','yet','already','almost','quite','rather','enough','even','ever','never','always','often','sometimes','usually','finally','quickly','slowly','really','actually','probably','certainly','clearly','simply','completely','absolutely','especially','particularly','generally','basically','specifically','originally','traditionally','historically','commonly','widely','generally','mostly','partly','fully','highly','deeply','greatly','strongly','clearly','obviously','certainly','surely','possibly','perhaps','maybe','definitely','absolutely','literally','figuratively','indeed','instead','otherwise','however','therefore','moreover','furthermore','nevertheless','nonetheless','meanwhile','otherwise','instead','likewise','similarly','conversely','accordingly','subsequently','eventually','previously','formerly','lately','recently','currently','presently','immediately','directly','individually','personally','particularly','especially','notably','significantly','specifically','namely','i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves'
]);

const GENERIC_MODIFIERS = ['Prime','Royal','Grand','Sovereign','Ancient','First','High','True'];

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) };
}

function lighten(hex, amount=20) {
  const rgb = hexToRgb(hex); if (!rgb) return hex;
  return '#' + [rgb.r+amount, rgb.g+amount, rgb.b+amount].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2,'0')).join('');
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
  const sr = hexToRgb(p.secondary);
  const vr = hexToRgb(p.void);
  const vdr = hexToRgb(p.voidDeep);
  const cardSurface = `rgb(${vdr.r+15},${vdr.g+15},${vdr.b+15})`;
  const cardRgba = `${vdr.r+15},${vdr.g+15},${vdr.b+15}`;
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
  const sr = hexToRgb(palette.secondary);
  const vr = hexToRgb(palette.void);
  const vdr = hexToRgb(palette.voidDeep);

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
  css = css.replace(/(\.endorsement-hero\s*\{)(\s*)/, `$1$2    min-height: 100vh;$2    min-height: 100svh;$2    display: flex;$2    align-items: center;$2    justify-content: center;$2`);

  const rootVars = buildRootVariables(palette);
  return rootVars + '\n' + css;
}

function buildScript(templeId) {
  let js = fs.readFileSync(path.join(TEMPLATE_DIR, 'flagship.js'), 'utf8');
  js = js.replace(/\{\{TEMPLE_ID\}\}/g, templeId);
  return js;
}

function getSlotNames(entry) {
  if (FLAGSHIP_DATA.slotNames && FLAGSHIP_DATA.slotNames[entry.id]) {
    const names = FLAGSHIP_DATA.slotNames[entry.id];
    if (names.length !== SLOT_TYPES.length) {
      throw new Error(`Slot-name registry for ${entry.id} has ${names.length} entries, expected ${SLOT_TYPES.length}`);
    }
    return names;
  }
  return generateSlotNames(entry);
}

function cleanWord(w) {
  return w
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
}

function generateSlotNames(entry) {
  const text = [
    entry.domain || '',
    entry.meaning || '',
    (entry.etymology && entry.etymology.protoGloss) || '',
    (entry.etymology && entry.etymology.derivation) || ''
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
  const firstSixBad = names.slice(0,6).some(n => {
    const word = n.split(' ')[0].toLowerCase();
    return STOP_WORDS.has(word) || GENERIC_MODIFIERS.map(g => g.toLowerCase()).includes(word);
  });
  if (firstSixBad) {
    throw new Error(`Auto-generated slot names for ${entry.id} are too generic. Please add a curated entry to scripts/flagship-data.json.`);
  }
  return names;
}

function replacePlaceholders(html, vars) {
  const keys = Object.keys(vars).sort((a,b) => b.length - a.length);
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

function buildExtendedTab(page, templeId) {
  if (!hasHeroVideo(templeId)) return '';
  const paths = { index: 'lore/extended/index.html', lore: '../lore/extended/index.html', gallery: '../lore/extended/index.html', extended: './index.html' };
  const href = paths[page] || paths.index;
  const activeClass = page === 'extended' ? 'nav-link active' : 'nav-link';
  return `<a href="${href}" class="${activeClass}">Extended</a>`;
}

function hasRealGreek(entry) {
  const greek = entry.greek || '';
  return greek && greek !== '—' && greek.trim() !== '';
}

function isGreekEntry(entry) {
  return entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
}

function originalScript(entry) {
  if (isGreekEntry(entry) && hasRealGreek(entry)) return entry.greek;
  return entry.unicode;
}

function stripPlaceholderGreek(html, unicode) {
  html = html.replace(/<span class="title-greek">—<\/span>\s*<span class="title-divider"><\/span>/, '');
  html = html.replace(/<p class="card-greek">—<\/p>/g, '');
  html = html.replace(/<div class="footer-block">\s*<span class="footer-label">Original Script<\/span>\s*<span class="footer-value">—<\/span>\s*<\/div>/g, '');
  html = html.replace(/"name":\s*"—"/g, `"name": "${unicode}"`);
  html = html.replace(/"description":\s*"—"/g, `"description": "${unicode}"`);
  // Replace any stray <strong>—</strong> in lore body copy
  html = html.replace(/<strong>—<\/strong>/g, `<strong>${unicode}</strong>`);
  return html;
}

function isStubContent(content) {
  if (!content || !content.trim()) return true;
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
    'is the sky, thunder, king of gods'
  ];
  return stubPhrases.some(p => lower.includes(p));
}

function getDomainsText(entry) {
  const unicode = entry.unicode;
  const useful = (entry.variants || [])
    .filter(v => v && v.unicode && (!v.type || v.type === 'owned' || v.type === 'ascii' || v.type === 'primary'))
    .map(v => v.unicode);
  const allForms = [unicode, ...useful];
  const seen = new Set();
  const forms = [];
  for (const f of allForms) {
    if (!f || !/[\x00-\x7F]/.test(f[0]) || /\s/.test(f)) continue;
    const key = f.toLowerCase().normalize('NFC');
    if (!seen.has(key)) { seen.add(key); forms.push(f); }
  }
  if (forms.length === 0) forms.push(unicode);
  return forms.map(f => f + '.com').join(' \u00b7 ');
}

function getPunycodeExplainer(entry) {
  const primary = entry.unicode;
  const ascii = entry.ascii;
  try {
    const ace = url.domainToASCII(`${primary.toLowerCase()}.com`);
    if (ace && !ace.includes(' ')) return `${primary}.com \u2192 ${ace}`;
  } catch (e) {}
  const owned = (entry.variants || []).find(v => v.type === 'owned');
  if (owned && owned.unicode) {
    try {
      return `${owned.unicode}.com \u2192 ${url.domainToASCII(`${owned.unicode.toLowerCase()}.com`)}`;
    } catch (e) {}
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
    const hasStress = /[\u0301\u0302\u0342άέήίόύώΆΈΉΊΌΎΏ]/.test(source) || /[áéíóúÁÉÍÓÚṓṒ]/.test(entry.unicode);
    const hasLength = /[ηωᾱῑῡēō]/.test(source.toLowerCase()) || /[ēōḗṓ]/.test(entry.unicode.toLowerCase());
    if (hasStress && !hasLength) return `The ${sourceLabel} <strong>${source}</strong> contains <strong>stress (acute/circumflex)</strong> but no long-vowel mark. This makes it a <strong>single-tier Tier-2 Accent-Preserving</strong> name.`;
    if (!hasStress && hasLength) return `The ${sourceLabel} <strong>${source}</strong> contains a <strong>long vowel</strong> but no stress mark. This makes it a <strong>single-tier Tier-2 Macron-Preserving</strong> name.`;
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

function tierGridValues(entry) {
  const source = originalScript(entry);
  const isGreek = isGreekEntry(entry);
  const hasStress = isGreek && (/[\u0301\u0302\u0342άέήίόύώΆΈΉΊΌΎΏ]/.test(source) || /[áéíóúÁÉÍÓÚ]/.test(entry.unicode));
  const hasLength = isGreek && (/[ηωᾱῑῡēō]/.test(source.toLowerCase()) || /[ēōḗṓ]/.test(entry.unicode.toLowerCase()));
  const isDual = entry.tier === 'dual';
  return {
    stressActive: hasStress ? 'active' : 'inactive',
    stressValue: hasStress ? 'Preserved' : (isGreek ? '\u2014' : 'N/A'),
    lengthActive: hasLength ? 'active' : 'inactive',
    lengthValue: hasLength ? 'Preserved' : (isGreek ? '\u2014' : 'N/A'),
    dualActive: isDual ? 'active' : 'inactive',
    dualValue: isDual ? 'Yes' : '\u2014'
  };
}

function scriptLabel(entry) {
  if (isGreekEntry(entry)) return 'Greek';
  const map = {
    egyptian: 'Egyptian', sanskrit: 'Sanskrit', mesopotamian: 'Mesopotamian',
    canaanite: 'Canaanite', norse: 'Norse', celtic: 'Celtic', slavic: 'Slavic',
    japanese: 'Japanese', nahuatl: 'Nahuatl', yoruba: 'Yoruba', polynesian: 'Polynesian',
    zoroastrian: 'Zoroastrian', incan: 'Incan', phoenician: 'Phoenician', hittite: 'Hittite'
  };
  return map[entry.pantheon] || (entry.pantheon ? entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1) : 'Ancient');
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
    if (/[άέήίόύώ]/.test(greekRaw) || /[\u0301\u0302\u0342]/.test(greek)) features.push('acute accents');
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
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

function buildNameProse(entry) {
  const label = scriptLabel(entry);
  const source = originalScript(entry);
  const features = analyzeFeatures(entry);
  const featureList = joinFeatures(features);
  const meaningClause = entry.meaning ? ` — “${entry.meaning}”` : '';
  const original = `The name in its original ${label} form. <strong>${entry.unicode}</strong> (${source}) is attested as ${entry.domain.toLowerCase()}${meaningClause}. Its ${featureList} carry the full phonetic and orthographic weight of the source tradition.`;
  const ascii = `Reduced to plain <strong>${entry.ascii}</strong>, the name loses everything that made it specific: ${featureList}. What remains is an ASCII string that machines can parse but that no longer speaks with its original voice.`;
  const unicode = `The Unicode restoration recovers what ASCII flattened. <strong>${entry.unicode}</strong> restores ${featureList}, returning the name to its original written dignity. The domain encodes to Punycode, but the browser displays the truth.`;
  return { original, ascii, unicode };
}

function buildTierSection(entry, sectionNumber) {
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
  const pantheon = entry.pantheon || '';
  const domain = (entry.domain || '').toLowerCase();
  const meaning = (entry.meaning || '').toLowerCase();
  const combined = `${domain} ${meaning}`;
  const has = words => words.some(w => combined.includes(w));
  if (['zeus','thor','jupiter','perun','adad','baal','shu'].includes(id) || has(['thunder','storm','lightning'])) return 'storm';
  if (['kronos','cronus','chronos','saturn'].includes(id) || has(['time','harvest','golden age'])) return 'time';
  if (['hades','nott','hekate','kali','typhon','tartaros','chaos'].includes(id) || has(['dark','void','night','death','underworld'])) return 'void';
  if (['apollo','ra','helios','surya','savitr','amaterasu','int'].includes(id) || has(['sun','light','dawn'])) return 'sun';
  if (['poseidon','varuna','aphrodite','loki','njor'].includes(id) || has(['water','sea','ocean','wave','river'])) return 'water';
  if (['gaia','rhea','demeter','cybele','ishtar','inanna','asherah','anu','nut','geb'].includes(id) || has(['earth','mountain','fertility','mother'])) return 'mountain';
  if (['artemis','diana','selene','chandra','tsukuyomi'].includes(id) || has(['moon','hunt','stars'])) return 'stars';
  if (['odin','thoth','bragi','saraswati','ganesha','hanuman','hermes'].includes(id) || has(['wisdom','knowledge','word','poetry','messenger'])) return 'light';
  if (['prometheus','hephaistos','logi','aguni'].includes(id) || has(['fire','flame','forge'])) return 'flame';
  if (['yggdrasil','silvanus','dionysos'].includes(id) || has(['tree','vine','forest'])) return 'tree';
  if (['ouranos','aether','uranus'].includes(id) || has(['sky','air','aether'])) return 'stars';
  if (pantheon === 'norse' || pantheon === 'celtic' || pantheon === 'slavic') return 'stars';
  if (pantheon === 'egyptian') return 'sun';
  if (pantheon === 'mesopotamian') return 'water';
  return 'particles';
}

function wrapSection(id, title, subtitle, content, sectionNumber) {
  if (!content || !content.trim()) return '';
  return `<section class="section section-${id}" id="${id}">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2,'0')}</span>
            <h2 class="section-title">${title}</h2>
            <p class="section-subtitle">${subtitle}</p>
        </div>
        ${content}
    </div>
</section>`;
}

function sourceHref(src) {
  const lower = src.toLowerCase();
  if (lower === 'lsj') return 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek';
  if (lower.includes('pape')) return 'https://archive.org/details/bub_gb_8SMSAAAAIAAJ';
  if (lower.includes('beekes')) return 'https://brill.com/view/title/17858';
  if (lower.includes('smyth')) return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0007';
  if (lower.includes('delg')) return 'https://klincksieck.com/';
  if (lower.includes('hesiod')) return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0130';
  if (lower.includes('plato')) return 'https://www.perseus.tufts.edu/hopper/searchresults?q=plato';
  if (lower.includes('orphic')) return 'https://www.orphic-hymns.com/';
  if (lower.includes('herodotus')) return 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0126';
  if (lower.includes('faulkner')) return 'https://www.griffith.ox.ac.uk/';
  if (lower === 'wb' || lower.includes('wörterbuch')) return 'https://aaew.bbaw.de/tla/';
  if (lower.includes('gardiner')) return 'https://www.griffith.ox.ac.uk/';
  if (lower.includes('allen')) return 'https://www.britishmuseum.org/';
  if (lower.includes('cad') || lower.includes('chicago assyrian')) return 'https://oracc.museum.upenn.edu/';
  if (lower.includes('ahw')) return 'https://www.altorientalistik.de/';
  if (lower.includes('kramer')) return 'https://etcsl.orinst.ox.ac.uk/';
  if (lower.includes('jacobsen')) return 'https://oi.uchicago.edu/';
  if (lower.includes('etcsl')) return 'https://etcsl.orinst.ox.ac.uk/';
  if (lower.includes('black-green')) return 'https://www.britishmuseum.org/';
  if (lower.includes('mw') || lower.includes('monier')) return 'https://www.sanskrit-lexicon.uni-koeln.de/';
  if (lower.includes('kewa')) return 'https://www.sanskrit-lexicon.uni-koeln.de/';
  if (lower.includes('rv') || lower.includes('ṛgveda') || lower.includes('rigveda')) return 'https://vedaweb.uni-koeln.de/';
  if (lower.includes('brāhmaṇa') || lower.includes('brahmana')) return 'https://www.sacred-texts.com/hin/';
  if (lower.includes('upaniṣad') || lower.includes('upanishad')) return 'https://www.sacred-texts.com/hin/';
  if (lower.includes('ktu')) return 'https://www.keele.ac.uk/ktu/';
  if (lower.includes('cis')) return 'https://www.hup.harvard.edu/books/cis';
  if (lower.includes('kai')) return 'https://www.hup.harvard.edu/books/kai';
  if (lower.includes('coogan')) return 'https://www.hup.harvard.edu/books/stories-from-ancient-canaan/';
  if (lower.includes('smith')) return 'https://www.sbl-site.org/';
  if (lower.includes('day')) return 'https://www.sbl-site.org/';
  if (lower.includes('cross')) return 'https://www.hup.harvard.edu/books/canaanite-myth-and-hebrew-epic/';
  if (lower.includes('de moor')) return 'https://brill.com/view/title/16979';
  return '';
}

function buildSourcesSection(entry, sectionNumber, catalogEntry) {
  const sourceList = (catalogEntry && catalogEntry.sources)
    ? catalogEntry.sources.map(s => s.name || s)
    : (entry.sources || []);
  const badges = sourceList.map(src => {
    const name = typeof src === 'string' ? src : src.name;
    const href = (typeof src === 'object' && src.url) ? src.url : sourceHref(name);
    return href
      ? `<a href="${href}" target="_blank" rel="noopener" class="source-badge" title="${name}">${name}</a>`
      : `<span class="source-badge">${name}</span>`;
  }).join('');
  if (!badges) return '';
  return `<section class="section section-related" id="sources">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2,'0')}</span>
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
  const related = LEXICON.filter(e => e.id !== entry.id && e.pantheon === entry.pantheon).slice(0, 6);
  if (!related.length) return '';
  const pantheonLabel = entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
  const cards = related.map(e => {
    const greek = (e.greek && e.greek !== '—') ? e.greek : '';
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
  }).join('');
  return `<section class="section section-related" id="related">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">${String(sectionNumber).padStart(2,'0')}</span>
            <h2 class="section-title">Related Names</h2>
            <p class="section-subtitle">Other figures in the ${entry.pantheon} pantheon</p>
        </div>
        <div class="related-grid reveal-up">
            ${cards}
        </div>
    </div>
</section>`;
}

function buildPantheonConnectionSection(entry, sectionNumber) {
  const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  const related = LEXICON.filter(e => e.id !== entry.id && e.pantheon === entry.pantheon).slice(0, 4);
  const count = related.length;
  const pantheonLabel = entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
  const bodyOne = count
    ? `<strong>${entry.unicode}</strong> is ${entry.domain.toLowerCase()} in the ${pantheonLabel} tradition — one voice in a chorus that includes ${related.slice(0, 3).map(e => `<strong>${e.unicode}</strong>`).join(', ')}${count > 3 ? ' and others' : ''}. Each name carries its own domain, its own lore, and its own truth.`
    : `<strong>${entry.unicode}</strong> is ${entry.domain.toLowerCase()} in the ${pantheonLabel} tradition — a restored name in a vast network of authentic orthographies.`;
  return `<section class="section section-pantheon" id="pantheon" style="background: linear-gradient(180deg, var(--void) 0%, var(--void-deep) 100%);">
    <div class="container">
        <div class="pantheon-content reveal-up">
            <div class="pantheon-text">
                <span class="pantheon-eyebrow">The PUNYCODEX</span>
                <h2 class="pantheon-title">One of the Restored</h2>
                <p class="pantheon-body">${bodyOne}</p>
                <p class="pantheon-body">This is not a directory. This is a <strong>resurrection</strong>.</p>
                <a href="https://punycodex.com/lexicon/" class="btn-primary btn-ghost">
                    <span>Enter the Codex</span>
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

function cleanSectionContent(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  const section = $('section');
  if (!section.length) return html;
  section.find('.section-header').remove();
  section.find('.section-bg-glow').remove();
  const bodySelectors = ['.tier-feature-grid','.victory-content','.domains-grid','.symbols-list','.myths-timeline','.tier-explanation'];
  for (const sel of bodySelectors) {
    let el = section.find(sel).first();
    if (!el.length) continue;
    while (true) {
      const children = el.children();
      if (children.length === 1) {
        const child = children.first();
        const tag = child[0].tagName;
        const cls = (child.attr('class') || '');
        if (tag === 'div' && (cls.includes('container') || cls.includes('tier-explanation') || cls.includes('section'))) { el = child; continue; }
      }
      break;
    }
    const wrapperClasses = ['tier-feature-grid','domains-grid','symbols-list','myths-timeline'];
    const cls = el.attr('class') || '';
    if (wrapperClasses.some(c => cls.includes(c))) return $.html(el).trim();
    return el.html().trim();
  }
  let inner = '';
  section.children().each((i, el) => { inner += $.html(el); });
  return inner.trim();
}

function generateHomePage(entry, palette, slotNames, templateDir) {
  let html = fs.readFileSync(path.join(templateDir, 'index.html'), 'utf8');
  const templeId = entry.id;
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: originalScript(entry),
    DOMAIN: entry.domain,
    MEANING: entry.meaning || '',
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    HERO_VIDEO_OR_MASCOT: buildHeroVisual(templeId, entry.unicode, entry.domain)
  };
  for (let i = 0; i < SLOT_TYPES.length; i++) {
    vars[`SLOT_${String(i+1).padStart(2,'0')}_NAME`] = slotNames[i];
    vars[`SLOT_OFFSET_${String(i+1).padStart(2,'0')}`] = String(52 + i + 1).padStart(2,'0');
  }
  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);
  return html;
}

function iconSvg(pathData, stroke = 'var(--primary)') {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.5"><path d="${pathData}"/></svg>`;
}

function buildPronunciationContent(entry, catalogEntry) {
  if (catalogEntry && catalogEntry.pronunciation) {
    const p = catalogEntry.pronunciation;
    const phonemes = (p.phonemes || []).map((ph, i) => `
      <div class="phoneme" style="--delay:${i * 100}ms">
        <span class="phoneme-symbol">${ph.symbol}</span>
        <span class="phoneme-desc">${ph.desc}</span>
      </div>`).join('');
    const kin = (p.kin || []).map(k => `<li><strong>${k.label}</strong> ${k.form}</li>`).join('');
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
  const source = originalScript(entry);
  const label = isGreekEntry(entry) ? 'Greek' : entry.pantheon;
  return `<p class="lead-text">The name <strong>${entry.unicode}</strong> carries the phonetic values of the ${label} tradition.</p>
<p>The original form <strong>${source}</strong> preserves distinctions that plain ASCII <strong>${entry.ascii}</strong> erases: vowel length, stress, breathing, or other script-specific features. A full reconstructed pronunciation guide is being prepared.</p>`;
}

function buildSymbolsContent(entry, catalogEntry) {
  if (catalogEntry && catalogEntry.domains) {
    const d = catalogEntry.domains;
    const cards = (d.cards || []).map((c, i) => `
      <div class="domain-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="domain-icon">${iconSvg(c.iconPath)}</div>
        <h4 class="domain-name">${c.name}</h4>
        <p class="domain-desc">${c.desc}</p>
      </div>`).join('');
    const symbols = (catalogEntry.symbols || []).map(s => `
      <div class="symbol-item">
        <span class="symbol-name">${s.name}</span>
        <span class="symbol-meaning">${s.meaning}</span>
      </div>`).join('');
    const leadHtml = d.lead
      ? (d.lead.trim().startsWith('<p') ? `<div class="domains-intro reveal-up">${d.lead}</div>` : `<div class="domains-intro reveal-up"><p class="lead-text">${d.lead}</p></div>`)
      : '';
    return `
      ${leadHtml}
      <div class="domains-grid">${cards}</div>
      ${symbols ? `<div class="symbols-section reveal-up"><h3 class="symbols-title">Sacred Symbols</h3><div class="symbols-list">${symbols}</div></div>` : ''}`;
  }
  // fallback stub
  const themeWords = [entry.domain, entry.meaning].filter(Boolean).join(', ').toLowerCase();
  const symbols = [];
  if (themeWords.includes('storm') || themeWords.includes('thunder') || themeWords.includes('lightning')) symbols.push('thunderbolt','storm cloud','bull');
  if (themeWords.includes('sun') || themeWords.includes('light')) symbols.push('solar disc','ray','gold');
  if (themeWords.includes('sea') || themeWords.includes('water')) symbols.push('wave','trident','fish');
  if (themeWords.includes('earth') || themeWords.includes('fertility') || themeWords.includes('harvest')) symbols.push('grain','cornucopia','serpent');
  if (themeWords.includes('war') || themeWords.includes('warrior')) symbols.push('spear','shield','lion');
  if (themeWords.includes('love') || themeWords.includes('desire')) symbols.push('dove','rose','mirror');
  if (themeWords.includes('death') || themeWords.includes('underworld')) symbols.push('key','torch','cypress');
  if (themeWords.includes('wisdom') || themeWords.includes('knowledge')) symbols.push('book','owl','scroll');
  if (themeWords.includes('time')) symbols.push('sickle','hourglass','wheel');
  if (symbols.length === 0) symbols.push('sacred flame','laurel','altar');
  const unique = [...new Set(symbols)].slice(0, 4);
  let text = `<p class="lead-text">The iconography of <strong>${entry.unicode}</strong> clusters around ${entry.domain.toLowerCase()}.</p>`;
  text += `<div class="symbols-list">${unique.map(s => `<span class="symbol-item">${s}</span>`).join('')}</div>`;
  text += `<p>These attributes appear across seals, coins, vase paintings, and temple reliefs — a visual shorthand for the powers this name invokes.</p>`;
  return text;
}

function buildMythologyContent(entry, catalogEntry) {
  if (catalogEntry && catalogEntry.mythology) {
    const m = catalogEntry.mythology;
    const myths = (m.myths || []).map((my, i) => {
      const textHtml = my.text && my.text.trim().startsWith('<p')
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
    }).join('');
    const leadPara = m.lead
      ? (m.lead.trim().startsWith('<p') ? m.lead : `<p class="lead-text">${m.lead}</p>`)
      : '';
    return `
      ${leadPara}
      <div class="myths-timeline">${myths}</div>`;
  }
  // fallback stub
  const etymology = entry.etymology || {};
  const proto = etymology.protoForm || '';
  const protoGloss = etymology.protoGloss || '';
  let text = `<p class="lead-text"><strong>${entry.unicode}</strong> belongs to the ${entry.pantheon} tradition as ${entry.domain.toLowerCase()}.</p>`;
  text += `<p>${entry.meaning || `The name is understood as "${entry.domain}".`}</p>`;
  if (proto && protoGloss) {
    text += `<p>Etymologically, it derives from ${proto} (“${protoGloss}”), a root that shaped cult titles, hymns, and ritual addresses across centuries.</p>`;
  }
  text += `<p>The myths surrounding this figure established its authority in ritual, art, and literature — and continue to surface in later religious and literary traditions.</p>`;
  return text;
}

function buildSyncretismContent(entry, catalogEntry) {
  if (catalogEntry && catalogEntry.syncretism) return catalogEntry.syncretism;
  return cleanSectionContent((entry._loreSections || {}).syncretism) || '';
}

function buildCulturalLegacyContent(entry, catalogEntry) {
  if (catalogEntry && catalogEntry.culturalLegacy) return catalogEntry.culturalLegacy;
  return `<p class="lead-text"><strong>${entry.unicode}</strong> survives in languages, place names, academic vocabulary, and contemporary media.</p>
<p>From classical scholarship to modern fantasy, gaming, and brand language, the name remains a marker of primal force. Its Unicode restoration makes that legacy addressable on the internet itself.</p>`;
}

function generateLorePage(entry, palette, loreSections, templateDir, catalog) {
  const catalogEntry = catalog && catalog[entry.id];
  let html = fs.readFileSync(path.join(templateDir, 'lore', 'index.html'), 'utf8');
  const templeId = entry.id;
  const nameProse = buildNameProse(entry);
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: originalScript(entry),
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
    NAME_UNICODE: nameProse.unicode
  };

  const hasCatalogMyth = catalogEntry && catalogEntry.mythology;
  const hasCatalogPron = catalogEntry && catalogEntry.pronunciation;
  const hasCatalogSymbols = catalogEntry && catalogEntry.domains;

  const mythology = hasCatalogMyth
    ? buildMythologyContent(entry, catalogEntry)
    : (isStubContent(cleanSectionContent(loreSections.mythology)) ? buildMythologyContent(entry, null) : cleanSectionContent(loreSections.mythology));
  const pronunciation = hasCatalogPron
    ? buildPronunciationContent(entry, catalogEntry)
    : (isStubContent(cleanSectionContent(loreSections.pronunciation)) ? buildPronunciationContent(entry, null) : cleanSectionContent(loreSections.pronunciation));
  const symbols = hasCatalogSymbols
    ? buildSymbolsContent(entry, catalogEntry)
    : (isStubContent(cleanSectionContent(loreSections.symbols)) ? buildSymbolsContent(entry, null) : cleanSectionContent(loreSections.symbols));

  const symbolsTitle = catalogEntry && catalogEntry.domains && catalogEntry.domains.title
    ? catalogEntry.domains.title : 'Domains & Sacred Symbols';
  const symbolsSubtitle = catalogEntry && catalogEntry.domains && catalogEntry.domains.subtitle
    ? catalogEntry.domains.subtitle
    : (catalogEntry && catalogEntry.domains && catalogEntry.domains.title
        ? entry.domain
        : `Attributes of ${entry.unicode}`);

  vars.TIER_SECTION = buildTierSection(entry, 2);
  vars.PRONUNCIATION = wrapSection('pronunciation','Pronunciation',`How ${entry.unicode} was spoken`,pronunciation,3);
  vars.SYMBOLS = wrapSection('symbols', symbolsTitle, symbolsSubtitle, symbols, 4);
  vars.MYTHOLOGY = wrapSection('mythology','Mythology',`Stories of ${entry.unicode}`,mythology,5);
  vars.RELATED_NAMES = buildRelatedNamesSection(entry, 6);
  vars.PANTHEON_CONNECTION = buildPantheonConnectionSection(entry, 7);

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
  pushItem(`${id}_mascot.png`, `${id}_mascot.webp`, `The ${entry.unicode} mascot — ${entry.domain}`);
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
    GREEK: originalScript(entry),
    DOMAIN: entry.domain,
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    GALLERY_GRID: buildGalleryGrid(entry)
  };
  html = replacePlaceholders(html, vars);
  if (!hasRealGreek(entry)) html = stripPlaceholderGreek(html, entry.unicode);
  return html;
}

function generateExtendedPage(entry, palette, templateDir, catalog) {
  if (!hasHeroVideo(entry.id)) return '';
  let html = fs.readFileSync(path.join(templateDir, 'lore', 'extended', 'index.html'), 'utf8');
  const templeId = entry.id;
  const catalogEntry = catalog && catalog[entry.id];
  const defaultMeditation = `<p class="lead-text">The rite above is a visual invocation of <strong>${entry.unicode}</strong>, ${entry.domain}. It carries the same orthographic signature as the domain — the stress, length, and script that ASCII strips away.</p>
<p class="lead-text">Return to the <a href="../index.html" style="color:var(--primary);">main lore page</a> for pronunciation, mythology, and scholarly sources.</p>`;
  const vars = {
    UNICODE: entry.unicode,
    ASCII: entry.ascii,
    GREEK: originalScript(entry),
    DOMAIN: entry.domain,
    MEANING: entry.meaning || '',
    TIER_LABEL: entry.tierLabel || `Tier ${entry.tier}`,
    DOMAINS_TEXT: getDomainsText(entry),
    TEMPLE_ID: templeId,
    EFFECT: getCanvasEffect(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    EXTENDED_MEDITATION: (catalogEntry && catalogEntry.extendedMeditation) ? catalogEntry.extendedMeditation : defaultMeditation
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
    generatedAt: new Date().toISOString()
  };
  return JSON.stringify(payload, null, 2);
}

function validateGenerated(templeId, outputs) {
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
      if (content.includes('<span class="title-greek">—</span>') || content.includes('<p class="card-greek">—</p>')) {
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
    if (!slotNameRe.test(name)) issues.push(`index.html: slot name contains punctuation: "${name}"`);
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
  const entry = LEXICON.find(e => e.id === templeId);
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
  let loreSections = {};
  if (fs.existsSync(lorePath)) {
    const loreHtml = fs.readFileSync(lorePath, 'utf8');
    const $ = cheerio.load(loreHtml);
    const idMap = { mythology:'mythology', 'mythology-lore':'mythology', pronunciation:'pronunciation', 'symbols-iconography':'symbols', symbols:'symbols', syncretism:'syncretism', 'cultural-legacy':'cultural-legacy' };
    for (const [id,key] of Object.entries(idMap)) {
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
  const filesToBackup = ['index.html','styles.css','script.js','lore/index.html','gallery/index.html','lore/extended/index.html'];
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

  const EXTENDED_IDS = ['aether','anat','asherah','astart','ba','baal','chaos','dionysos','el','enki','enlil','eros','ganesha','heka','horus','ishtar','kali','kronos','prajapati','rta','shu','tartaros','typhon','vishnu'];

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
    console.log(`\nRegenerated ${EXTENDED_IDS.length - failed}/${EXTENDED_IDS.length} flagships${dryRun ? ' (dry run)' : ''}.`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const templeId = args.find(a => !a.startsWith('--'));
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

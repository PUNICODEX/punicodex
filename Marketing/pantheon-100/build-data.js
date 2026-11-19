// Builds marketing/pantheon-100/data.json for the 100-temple audit materials.
// Sources (canonical, read-only): js/archetypes-v2.js, scripts/lore-catalog.json,
// type/js/industry-patterns.js, type/js/lexicon.js, type/js/original-scripts.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const TOP100 = [
  // Olympian (14)
  'zeus', 'hera', 'poseidon', 'athena', 'apollon', 'artemis', 'ares', 'aphrodite',
  'hermes', 'hephaistos', 'demeter', 'dionysos', 'hades', 'nike',
  // Greek (20)
  'gaia', 'kronos', 'helios', 'selene', 'eros', 'psyche', 'thanatos', 'tyche', 'iris', 'pan',
  'herakles', 'perseus', 'theseus', 'odysseus', 'achilleus', 'helene', 'medousa', 'pegasos',
  'orpheus', 'pandora',
  // Titan (2)
  'prometheus', 'atlas',
  // Greek location (1)
  'atlantis',
  // Roman (5)
  'mars', 'venus', 'diana', 'pluto', 'vulcanus',
  // Norse (10)
  'odinn', 'thor', 'loki', 'freyja', 'hel', 'fenrir', 'ragnarok', 'yggdrasill', 'mjolnir', 'tyr',
  // Egyptian (10)
  'ra', 'isis', 'osiris', 'horus', 'anubis', 'thoth', 'sekhmet', 'bastet', 'seth', 'amun',
  // Sanskrit (10)
  'om', 'shiva', 'vishnu', 'ganesha', 'kali', 'lakshmi', 'saraswati', 'hanuman', 'durga', 'karma',
  // Chinese (5)
  'long', 'guanyin', 'sunwukong', 'nezha', 'caishen',
  // Taoist (2)
  'yinyang', 'laozi',
  // Japanese (5)
  'amaterasu', 'susanoo', 'tsukuyomi', 'inari', 'fuji',
  // Buddhist (2)
  'avalokiteshvara', 'shakyamuni',
  // Mesopotamian (3)
  'gilgamesh', 'ishtar', 'tiamat',
  // Canaanite (2)
  'baal', 'leviathan',
  // Celtic (3)
  'brigid', 'cernunnos', 'fionn',
  // Slavic (1)
  'perun',
  // Nahuatl (1)
  'quetzalcoatl',
  // Polynesian (1)
  'pele',
  // Yoruba (1)
  'shango',
  // Incan (1)
  'inti',
  // Zoroastrian (1)
  'ahuramazda',
];

const stripHtml = (s) =>
  (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (s, n) => {
  if (!s) return '';
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > n * 0.6 ? lastSpace : n)}…`;
};

const archetypesRaw = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
let archetypes = Array.isArray(archetypesRaw) ? archetypesRaw : Object.values(archetypesRaw);
if (archetypes.length === 1 && Array.isArray(archetypes[0])) archetypes = archetypes[0];
const byId = new Map(archetypes.map((a) => [a.id, a]));

const lore = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const { INDUSTRY_GROUPS, INDUSTRY_SECTORS } = require(path.join(ROOT, 'type', 'js', 'industry-patterns.js'));
const origScripts = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const lexiconMod = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const lexList = Array.isArray(lexiconMod) ? lexiconMod : lexiconMod.LEXICON || Object.values(lexiconMod);
const lexById = new Map((Array.isArray(lexList) ? lexList : []).map((e) => [e.id, e]));

const sectorById = new Map(INDUSTRY_SECTORS.map((s) => [s.id, s]));

// Invert industry groups -> per-deity seats
const seatsById = new Map();
for (const g of INDUSTRY_GROUPS) {
  for (const e of g.entries || []) {
    if (!seatsById.has(e.id)) seatsById.set(e.id, []);
    seatsById.get(e.id).push({
      industry: g.industry,
      name: g.name,
      sector: g.sector,
      sectorColor: (sectorById.get(g.sector) || {}).color || '#c9a44a',
      sectorName: (sectorById.get(g.sector) || {}).name || g.sector,
      weight: e.weight || 1,
      why: stripHtml(e.why || ''),
      industryTagline: g.tagline || '',
    });
  }
}
for (const seats of seatsById.values()) {
  seats.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

const missing = [];
const out = [];
for (const id of TOP100) {
  const a = byId.get(id);
  const l = lore[id];
  if (!a || !l) {
    missing.push(id + (!a ? ' (no archetype)' : '') + (!l ? ' (no lore)' : ''));
    continue;
  }
  const lex = lexById.get(id);
  let script = null;
  let scriptLabel = null;
  try {
    script = origScripts.getOriginalScript(lex || { id });
    if (script && origScripts.isPlaceholder && origScripts.isPlaceholder(script)) script = null;
    scriptLabel = script ? origScripts.getOriginalScriptLabel(lex || { id }) : null;
  } catch {
    script = null;
  }
  const mascotPng = path.join(ROOT, 'sites', id, 'assets', `${id}_mascot.png`);
  const mascotWebp = path.join(ROOT, 'sites', id, 'assets', `${id}_mascot.webp`);
  const mascot = fs.existsSync(mascotPng) ? mascotPng : fs.existsSync(mascotWebp) ? mascotWebp : null;

  const myths = (l.mythology && l.mythology.myths ? l.mythology.myths : []).slice(0, 3).map((m) => ({
    tag: stripHtml(m.tag),
    title: stripHtml(m.title),
    text: truncate(stripHtml(m.text), 420),
  }));

  out.push({
    id,
    name: a.name,
    asciiName: lex ? lex.latin || null : null,
    greek: a.greek || null,
    originalScript: script,
    originalScriptLabel: scriptLabel,
    tagline: a.tagline || '',
    domainGloss: a.domain || '',
    pantheon: a.pantheon,
    tier: a.rentalTier || 'A',
    domainUnicode: a.domainUnicode || null,
    domainPunycode: a.domainPunycode || null,
    colors: a.colors || { primary: '#c9a44a', secondary: '#8a7332', glow: 'rgba(201,164,74,0.3)' },
    mascot,
    pronunciation: l.pronunciation ? truncate(stripHtml(l.pronunciation.approximation || ''), 180) : '',
    mythLead: truncate(stripHtml(l.mythology && l.mythology.lead), 460),
    myths,
    symbols: (l.symbols || []).slice(0, 4).map((s) => ({
      name: stripHtml(s.name),
      meaning: truncate(stripHtml(s.meaning), 120),
    })),
    domainsTitle: l.domains ? stripHtml(l.domains.title) : '',
    domainsSubtitle: l.domains ? stripHtml(l.domains.subtitle) : '',
    industries: (seatsById.get(id) || []).slice(0, 5),
    url: `https://punicodex.com/${id}`,
  });
}

if (missing.length) {
  console.error('MISSING:', missing.join(', '));
  process.exit(1);
}
const noMascot = out.filter((e) => !e.mascot).map((e) => e.id);
const noIndustries = out.filter((e) => e.industries.length === 0).map((e) => e.id);
const noMyths = out.filter((e) => e.myths.length === 0).map((e) => e.id);
console.log('entries:', out.length);
console.log('no mascot:', noMascot.join(', ') || 'none');
console.log('no industries:', noIndustries.join(', ') || 'none');
console.log('no myths:', noMyths.join(', ') || 'none');
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(out, null, 1));
console.log('wrote data.json');

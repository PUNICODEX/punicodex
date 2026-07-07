const {
  loadLexicon,
  loadArchetypes,
  saveArchetypes,
  upsertArchetype,
} = require('../scripts/flywheel-utils');

const url = require('url');

const ownedDomains = {
  njord: 'njǫrðr.com',
  ankh: 'ꜥnḫ.com',
  isis: 'ꜣst.com',
  sekhmet: 'sḫmt.com',
  bastet: 'bꜣstt.com',
  wadjet: 'wꜣḏ.com',
  nht: 'nḫt.com',
  moses: 'mōšeh.com',
  david: 'dāwîḏ.com',
  solomon: 'šəlōmōh.com',
  noah: 'nōaḥ.com',
  cain: 'qāyīn.com',
  abel: 'hāḇel.com',
  hercules: 'hēraklēs.com',
  hemera: 'hēmera.com',
  long: 'lóng.com',
  taichi: 'tàijí.com',
  yinyang: 'yīn-yáng.com',
  wuji: 'wújí.com',
  bagua: 'bāguà.com',
  wuxing: 'wǔxíng.com',
};

const colorsByPantheon = {
  norse: { primary: '#4A6741', secondary: '#C9A227', glow: 'rgba(74,103,65,0.3)' },
  egyptian: { primary: '#C9A227', secondary: '#1E3A5F', glow: 'rgba(201,162,39,0.3)' },
  abrahamic: { primary: '#6B4C1E', secondary: '#D4AF37', glow: 'rgba(107,76,30,0.3)' },
  greek: { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
  chinese: { primary: '#C41E3A', secondary: '#D4AF37', glow: 'rgba(196,30,58,0.3)' },
  taoist: { primary: '#2F4F4F', secondary: '#00CED1', glow: 'rgba(47,79,79,0.3)' },
};

function punycode(domain) {
  try {
    return url.domainToASCII(domain);
  } catch {
    return domain;
  }
}

const lexicon = loadLexicon();
let { src } = loadArchetypes();

for (const [id, domainUnicode] of Object.entries(ownedDomains)) {
  const entry = lexicon.find(e => e.id === id);
  if (!entry) {
    console.error(`Lexicon entry missing: ${id}`);
    continue;
  }
  const archetype = {
    id,
    name: entry.unicode,
    greek: entry.greek || '—',
    domain: entry.domain || `${entry.pantheon} deity`,
    tagline: entry.meaning ? `${entry.domain} · ${entry.meaning}` : `${entry.domain}`,
    tier: entry.tier === 'dual' ? 'dual-tier' : entry.tier === '1' ? 'tier-1' : 'tier-2',
    tierDetail: entry.tier === 'dual' ? 'dual-tier' : 'single-tier',
    pantheon: entry.pantheon,
    folder: id,
    domainUnicode,
    domainPunycode: punycode(domainUnicode),
    domainAlt: [],
    colors: colorsByPantheon[entry.pantheon] || { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
    mascotPath: `/sites/${id}/assets/${id}_mascot.png`,
    mascotFallback: `/sites/${id}/assets/${id}_mascot.png`,
    logomarkPath: `/sites/${id}/assets/${id}_logomark.png`,
    built: false,
    hasAdSite: false,
    darkPunchline: false,
  };
  src = upsertArchetype(src, archetype);
  console.log(`Added archetype ${id} -> ${domainUnicode} (${archetype.domainPunycode})`);
}

saveArchetypes(src);
console.log('Saved archetypes');

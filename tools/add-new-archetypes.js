const fs = require('fs');
const path = require('path');
const { url } = require('node:url') || require('url');
const {
  loadLexicon,
  loadArchetypes,
  saveArchetypes,
  upsertArchetype,
} = require('../scripts/flywheel-utils');

const newIds = ['erebus', 'ashur', 'shamash', 'quetzalcoatl', 'mot', 'aseratu', 'leviathan'];

const ownedDomains = {
  erebus: 'érebos.com',
  ashur: 'aššur.com',
  shamash: 'šamaš.com',
  quetzalcoatl: 'quetzalcōātl.com',
  mot: 'mōt.com',
  aseratu: 'ašeratu.com',
  leviathan: 'liwyāṯān.com',
};

const colorsByPantheon = {
  greek: { primary: '#2A1F3D', secondary: '#D4AF37', glow: 'rgba(42,31,61,0.3)' },
  mesopotamian: { primary: '#8B0000', secondary: '#D4AF37', glow: 'rgba(139,0,0,0.3)' },
  nahuatl: { primary: '#00A86B', secondary: '#D4AF37', glow: 'rgba(0,168,107,0.3)' },
  phoenician: { primary: '#4B0082', secondary: '#A0A0A0', glow: 'rgba(75,0,130,0.3)' },
  canaanite: { primary: '#1E3A5F', secondary: '#00CED1', glow: 'rgba(30,58,95,0.3)' },
};

function punycode(domain) {
  try {
    return require('url').domainToASCII(domain);
  } catch {
    return domain;
  }
}

const lexicon = loadLexicon();
let { src } = loadArchetypes();

for (const id of newIds) {
  const entry = lexicon.find(e => e.id === id);
  if (!entry) {
    console.error(`Lexicon entry missing: ${id}`);
    continue;
  }
  const domainUnicode = ownedDomains[id];
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

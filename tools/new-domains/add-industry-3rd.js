// Wire the 15 third-wave entries into industry-patterns.
const fs = require('node:fs');
const FILE = 'type/js/industry-patterns.js';

const ADDS = {
  defense: [
    { id: 'guandi', weight: 2, why: 'The god of war himself — loyalty as the armys oath.' },
    { id: 'kartikeya', weight: 2, why: 'The commander of the gods armies; the week-old general.' },
  ],
  leadership: [
    { id: 'guandi', weight: 2, why: 'The co-Sage of the empire; loyalty as governance.' },
    { id: 'mazu', weight: 2, why: 'The sea has a government, and it is her temple network.' },
  ],
  'legal-justice': [
    { id: 'sani', weight: 2, why: 'Karmas auditor; the slow court that never errs.' },
    { id: 'guandi', weight: 1, why: 'The enforcer of oaths; every contract sworn on his altar.' },
  ],
  faith: [
    { id: 'guandi', weight: 2 },
    { id: 'mazu', weight: 2 },
    { id: 'orun', weight: 2 },
    { id: 'oba', weight: 2 },
    { id: 'gauri', weight: 2 },
    { id: 'kartikeya', weight: 2 },
  ],
  'travel-tourism': [
    { id: 'mazu', weight: 2, why: 'The Dajia procession and Meizhou pilgrimage draw millions yearly.' },
    { id: 'kartikeya', weight: 2, why: 'Palani, Kataragama, Batu Caves — his hills are pilgrimage infrastructure.' },
    { id: 'oba', weight: 1, why: 'Her river and lake keep an active shrine-tourism.' },
  ],
  'agriculture-food': [
    { id: 'ceres', weight: 2 },
  ],
  'mining-resources': [
    { id: 'pluto', weight: 2, why: 'The Rich One below — ore, wealth, and the deep.' },
  ],
  'funerary-memorial': [
    { id: 'pluto', weight: 2, why: 'The underworld itself; the oldest address of the dead.' },
  ],
  'finance-commerce': [
    { id: 'pluto', weight: 1, why: 'Plutus the giver; wealth from the earth personified.' },
  ],
  horology: [
    { id: 'sani', weight: 2, why: 'The slow planet; 29.5 years of audit per orbit.' },
    { id: 'xiuhtecuhtli', weight: 2, why: 'The 52-year New Fire cycle; time restarted by hand.' },
  ],
  insurance: [
    { id: 'sani', weight: 2, why: 'Sade Sati is the oldest risk-model in continuous use.' },
  ],
  'thermal-energy': [
    { id: 'xiuhtecuhtli', weight: 2 },
  ],
  'manufacturing-craft': [
    { id: 'xiuhtecuhtli', weight: 1, why: 'The fire-drill and the forge; the hearth of all making.' },
  ],
  'space-astronomy': [
    { id: 'mixcoatl', weight: 2, why: 'The Milky Way as his body; the star-road personified.' },
    { id: 'sani', weight: 1, why: 'Saturn, his planet — the ringed auditor of the sky.' },
  ],
  'sports-athletics': [
    { id: 'mixcoatl', weight: 1, why: 'The hunt; the oldest competitive pursuit.' },
    { id: 'kartikeya', weight: 1, why: 'The young commander; speed, precision, the spear.' },
  ],
  'environment-climate': [
    { id: 'mixcoatl', weight: 1, why: 'The cloud-serpent; weather as a living road.' },
    { id: 'ceres', weight: 1, why: 'The field and its seasons; agriculture as stewardship.' },
  ],
  'water-utilities': [
    { id: 'oba', weight: 2 },
    { id: 'ganga', weight: 2 },
    { id: 'yamuna', weight: 2 },
  ],
  'disaster-resilience': [
    { id: 'mazu', weight: 2, why: 'The storm-answerer; the seas own emergency line.' },
    { id: 'ganga', weight: 1, why: 'The purifier; the river that restores.' },
  ],
  education: [
    { id: 'orun', weight: 1, why: 'Ifa and the odù — the oral university of heaven.' },
    { id: 'orunmila-note', skip: true },
  ],
  'publishing-media': [
    { id: 'orun', weight: 1, why: 'The oral archive; scripture carried in memory.' },
  ],
  'music-arts': [
    { id: 'orpheus', weight: 2 },
  ],
  'philosophy-ethics': [
    { id: 'orpheus', weight: 1, why: 'The look back; arts oldest parable of limits.' },
    { id: 'orun', weight: 1, why: 'Destiny as contract; the orí doctrine.' },
  ],
  gaming: [
    { id: 'guandi', weight: 1, why: 'Dynasty Warriors made him a global gaming icon.' },
  ],
};

let src = fs.readFileSync(FILE, 'utf8');
let inserted = 0;
for (const [gid, entries] of Object.entries(ADDS)) {
  const real = entries.filter((e) => !e.skip);
  if (!real.length) continue;
  const marker = `industry: '${gid}',`;
  const gi = src.indexOf(marker);
  if (gi === -1) {
    console.error('missing group', gid);
    continue;
  }
  const ei = src.indexOf('entries: [', gi);
  const insertAt = src.indexOf('\n', ei) + 1;
  const lines = real
    .map((e) =>
      e.why ? `      { id: '${e.id}', weight: ${e.weight}, why: '${e.why}' },` : `      { id: '${e.id}', weight: ${e.weight} },`
    )
    .join('\n');
  src = src.slice(0, insertAt) + lines + '\n' + src.slice(insertAt);
  inserted += real.length;
}
fs.writeFileSync(FILE, src, 'utf8');
console.log(`inserted ${inserted} industry entries`);

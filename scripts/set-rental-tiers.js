/**
 * One-off script to inject rentalTier into js/archetypes-v2.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'archetypes-v2.js');
let source = fs.readFileSync(filePath, 'utf8');

const sss = new Set(['nike', 'hermes', 'ea', 'zeus', 'ares', 'kronos']);

const s = new Set([
  'aigyptos', 'aphrodite', 'apollon', 'asia', 'athena', 'dionysos', 'europe',
  'gaia', 'hades', 'isis', 'kobe', 'kyoto', 'lakshmi', 'libye', 'long', 'odinn',
  'osaka', 'poseidon', 'prometheus', 'quetzalcoatl', 'ra', 'shiva', 'thor', 'tyr',
  'vishnu', 'atlas', 'medousa', 'horus', 'om', 'ganesha', 'kali', 'hekate',
  'ahuramazda', 'baal', 'el', 'rama', 'parvati', 'artemis', 'erebus', 'herakles',
]);

const a = new Set([
  'demeter', 'hera', 'hephaistos', 'persephone', 'helios', 'selene', 'eros',
  'okeanos', 'aither', 'hemera', 'chaos', 'tartaros', 'pontos', 'typhon',
  'njordr', 'ragnarok', 'valholl', 'midgardr', 'bastet', 'sekhmet', 'ptah',
  'maat', 'ankh', 'nirmata', 'varuna', 'ishtar', 'tiamat', 'enlil', 'anu',
  'ashur', 'shamash', 'apsu', 'anat', 'asherah', 'astart', 'mot', 'aseratu',
  'leviathan', 'taichi', 'yinyang', 'nikko', 'athenai', 'sparte', 'delphoi',
  'olymmpos', 'moses', 'david', 'solomon', 'noah',
]);

const b = new Set([
  'hestia', 'alfheimr', 'helheimr', 'jotunheimr', 'muspellheimr', 'ker', 'shu',
  'prajapati', 'vac', 'rta', 'asha', 'hen', 'wuji', 'bagua', 'wuxing',
  'trengtreng', 'cain', 'abel', 'wadjet', 'nht',
]);

const c = new Set(['ab', 'akh', 'ba', 'ka', 'ma', 'maa', 'sia']);

function tierFor(id) {
  if (sss.has(id)) return 'SSS';
  if (s.has(id)) return 'S';
  if (a.has(id)) return 'A';
  if (b.has(id)) return 'B';
  if (c.has(id)) return 'C';
  return null;
}

// Find all ids in the file and validate coverage
const idRegex = /id:\s*"([^"]+)"/g;
const ids = [];
let m;
while ((m = idRegex.exec(source)) !== null) ids.push(m[1]);

const missing = ids.filter((id) => !tierFor(id));
if (missing.length) {
  console.warn('Missing tier assignment for:', missing);
  // Default missing to A to avoid breaking generation; user can adjust later
  missing.forEach((id) => a.add(id));
}

// Insert rentalTier after each id line, preserving line endings
const updated = source.replace(/(\s+id:\s*"([^"]+)",)(\r?\n)/g, (match, idPart, id, newline) => {
  const tier = tierFor(id);
  if (!tier) return match;
  return `${idPart},${newline}        rentalTier: "${tier}",${newline}`;
});

if (updated === source) {
  console.error('No replacements made.');
  process.exit(1);
}

fs.writeFileSync(filePath, updated, 'utf8');

const counts = { SSS: 0, S: 0, A: 0, B: 0, C: 0 };
ids.forEach((id) => counts[tierFor(id)]++);
console.log('Rental tiers assigned:', counts);
console.log('Wrote', filePath);

const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

// User's owned domains (from their message)
const OWNED_DOMAINS = {
  akh: ['ꜣḫ.com'],
  aigyptos: ['aígyptos.com'],
  aphrodite: ['aphrodītē.com', 'aphrodítē.com'],
  apollon: ['apóllōn.com', 'apollōn.com'],
  asia: ['asía.com'],
  athena: ['athénā.com', 'athēnā.com'],
  athenai: ['athēnai.com'],
  ab: ['ꜣb.com'],
  ba: ['bꜣ.com'],
  chaos: ['cháos.com'],
  delphoi: ['delphoí.com'],
  dionysos: ['diónysos.com'],
  demeter: ['dēmētēr.com'],
  europe: ['eurṓpē.com', 'eurōpē.com'],
  gaia: ['gaîa.com'],
  ganesha: ['gaṇeśa.com'],
  hades: ['hádēs.com'],
  hekate: ['hekatē.com', 'hekátē.com'],
  hermes: ['hermês.com', 'hermēs.com'],
  hestia: ['hestía.com'],
  helios: ['hēlios.com'],
  hephaistos: ['hēphaistos.com'],
  hera: ['hēra.com'],
  odinn: ['óðinn.com'],
  shiva: ['śiva.com'],
  jotunheimr: ['jötunheimr.com'],
  ka: ['kꜣ.com'],
  kobe: ['kōbe.com'],
  kali: ['kālī.com'],
  ker: ['kēr.com'],
  kyoto: ['kyōto.com'],
  alfheimr: ['álfheimr.com'],
  libye: ['libyē.com'],
  olympos: ['ólympos.com'],
  ma: ['mꜥ.com'],
  maat: ['mꜣ.com'],
  medousa: ['médousa.com'],
  midgardr: ['miðgarðr.com'],
  nike: ['nikē.com', 'níkê.com', 'níkē.com'],
  persephone: ['persephonē.com'],
  pontos: ['póntos.com'],
  poseidon: ['poseidōn.com', 'poseidôn.com'],
  prometheus: ['promētheus.com'],
  ra: ['rꜥ.com'],
  ragnarok: ['ragnarǫk.com'],
  thor: ['þórr.com'],
  ares: ['árēs.com'],
  artemis: ['ártemis.com'],
  sa: ['sꜥ.com'],
  osaka: ['ōsaka.com'],
  selene: ['selēnē.com'],
  sparte: ['spártē.com'],
  atlas: ['átlas.com'],
  tartaros: ['tártaros.com'],
  vishnu: ['viṣṇu.com'],
  shu: ['šw.com'],
  zeus: ['zeús.com'],
};

const lexicon = fs.readFileSync(LEXICON_PATH, 'utf8');

function getLexiconEntry(id) {
  const idPattern = new RegExp(`id\\s*:\\s*['"\`]${id}['"\`]`, 'g');
  let match;
  while ((match = idPattern.exec(lexicon)) !== null) {
    const idx = match.index;
    let blockStart = idx;
    while (blockStart > 0 && lexicon[blockStart] !== '{') blockStart--;
    let blockEnd = blockStart + 1;
    let depth = 1;
    while (blockEnd < lexicon.length && depth > 0) {
      if (lexicon[blockEnd] === '{') depth++;
      if (lexicon[blockEnd] === '}') depth--;
      blockEnd++;
    }
    const block = lexicon.slice(blockStart, blockEnd);
    const unicodeMatch = block.match(/unicode\s*:\s*['"`]([^'"`]+)['"`]/);
    const asciiMatch = block.match(/ascii\s*:\s*['"`]([^'"`]+)['"`]/);
    if (unicodeMatch) {
      return {
        unicode: unicodeMatch[1],
        ascii: asciiMatch ? asciiMatch[1] : id,
      };
    }
  }
  return null;
}

const dirs = fs.readdirSync(SITES_DIR).filter(d => {
  return fs.existsSync(path.join(SITES_DIR, d, 'index.html'));
}).sort();

console.log('Cross-checking displayed domains against owned domains...\n');

let issues = [];

for (const id of dirs) {
  const entry = getLexiconEntry(id);
  const html = fs.readFileSync(path.join(SITES_DIR, id, 'index.html'), 'utf8');

  // Find the footer domain display
  const footerMatch = html.match(/<span class="footer-value">([^<]+)<\/span>/);
  const displayedDomains = footerMatch ? footerMatch[1].trim() : 'NOT FOUND';

  const owned = OWNED_DOMAINS[id];

  if (!owned) {
    // Check if it's a non-flagship (base temple)
    if (html.includes('temple-base.css') || html.includes('PUNYCODEX Base Temple')) {
      continue; // Skip base temples
    }
    console.log(`${id}: NO OWNED DOMAINS LIST (displayed: ${displayedDomains})`);
    continue;
  }

  // Check if displayed domains match owned domains
  const normalizedDisplayed = displayedDomains.toLowerCase().replace(/\s+/g, ' ').replace(/·/g, ' ').trim();
  const normalizedOwned = owned.map(d => d.toLowerCase()).sort().join(' ');

  // Simple check: does the displayed string contain at least one owned domain?
  let hasMatch = false;
  for (const domain of owned) {
    if (displayedDomains.toLowerCase().includes(domain.toLowerCase())) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch) {
    console.log(`${id}: MISMATCH`);
    console.log(`  Displayed: ${displayedDomains}`);
    console.log(`  Owned:     ${owned.join(', ')}`);
    console.log(`  Lexicon:   ${entry ? entry.unicode : 'NOT FOUND'}`);
    issues.push({id, displayed: displayedDomains, owned, lexicon: entry ? entry.unicode : 'NOT FOUND'});
  }
}

if (issues.length === 0) {
  console.log('\nAll pages match owned domains.');
} else {
  console.log(`\n${issues.length} pages have mismatched domains.`);
}

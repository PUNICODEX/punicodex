/**
 * PuniCodex — Flywheel editing utilities
 *
 * Shared helpers for safe-edit scripts that mutate canonical sources.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const vm = require('node:vm');
const { domainToASCII } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  lexicon: path.join(ROOT, 'type', 'js', 'lexicon.js'),
  archetypes: path.join(ROOT, 'js', 'archetypes-v2.js'),
  ownedDomains: path.join(ROOT, 'platform', 'db', 'owned-domains.json'),
};

function normalizeDomain(raw) {
  let d = (raw ?? '').normalize('NFC').trim().toLowerCase();
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
}

function punycode(domain) {
  try {
    const encoded = domainToASCII(domain);
    return encoded === domain ? null : encoded;
  } catch {
    return null;
  }
}

function loadLexicon() {
  return require(PATHS.lexicon).LEXICON;
}

function loadArchetypes() {
  const src = fs.readFileSync(PATHS.archetypes, 'utf8');
  return { src, list: vm.runInNewContext(`(function(){\n${src}\nreturn ARCHETYPES;\n})()`) };
}

function loadOwnedDomains() {
  return require(PATHS.ownedDomains);
}

function saveOwnedDomains(domains) {
  atomicWrite(PATHS.ownedDomains, JSON.stringify(domains, null, 2) + '\n');
}

function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, filePath);
}

function saveArchetypes(src) {
  atomicWrite(PATHS.archetypes, src);
}

function findArchetypeBlock(src, id) {
  const re = new RegExp(`(\\{\\s*\\n\\s*id:\\s*"${id}"[\\s\\S]*?\\n\\s*\\},?)`);
  const match = src.match(re);
  if (!match) return null;
  return { block: match[1], start: match.index, end: match.index + match[1].length };
}

function replaceArchetypeBlock(src, id, newBlock) {
  const found = findArchetypeBlock(src, id);
  if (!found) throw new Error(`Archetype block for ${id} not found`);
  return src.slice(0, found.start) + newBlock + src.slice(found.end);
}

function insertArchetypeBlock(src, newBlock) {
  // Insert before the closing ]; of the ARCHETYPES array
  const exportIdx = src.indexOf('if (typeof module');
  const closeIdx = exportIdx >= 0 ? src.lastIndexOf('];', exportIdx) : src.lastIndexOf('];');
  if (closeIdx < 0) throw new Error('Could not find ARCHETYPES array close');
  // The last entry's closing brace must sit on the line(s) immediately before
  // `];` and carry a trailing comma before we insert after it — otherwise the
  // new block wedges inside the last entry. Normalize the tail instead of
  // assuming its exact formatting.
  const tailStart = src.lastIndexOf('}', closeIdx);
  if (tailStart < 0) throw new Error('Could not find last archetype closing brace');
  const head = src.slice(0, tailStart + 1).replace(/,?\s*$/, '');
  return `${head},\n\n${newBlock}\n];${src.slice(closeIdx + 2)}`;
}

function jsonString(v) {
  return JSON.stringify(v);
}

function setLine(block, key, value, afterKey) {
  const valueStr = typeof value === 'string' ? jsonString(value) : JSON.stringify(value);
  const existingRe = new RegExp(`^(\\s*)${key}:\\s*[^,\\n]+,?\\s*$`, 'm');
  if (existingRe.test(block)) {
    return block.replace(existingRe, `$1${key}: ${valueStr},`);
  }
  const afterRe = new RegExp(`^(\\s*)${afterKey}:\\s*[^,\\n]+,?\\s*$`, 'm');
  const afterMatch = block.match(afterRe);
  if (!afterMatch) throw new Error(`Could not find ${afterKey} line in archetype block`);
  const indent = afterMatch[1];
  const line = `${indent}${key}: ${valueStr},`;
  const pos = afterMatch.index + afterMatch[0].length;
  return block.slice(0, pos) + '\n' + line + block.slice(pos);
}

function pushToArrayLine(block, key, value) {
  const valueStr = typeof value === 'string' ? jsonString(value) : JSON.stringify(value);
  const re = new RegExp(`^(\\s*)${key}:\\s*\\[([^\\]]*)\\],?\\s*$`, 'm');
  const match = block.match(re);
  if (!match) return null;
  const indent = match[1];
  const inner = match[2].trim();
  const newInner = inner ? `${inner}, ${valueStr}` : valueStr;
  return block.replace(re, `${indent}${key}: [${newInner}],`);
}

function updateArchetypeDomain(src, id, rawDomain) {
  const norm = normalizeDomain(rawDomain);
  const puny = punycode(norm);

  const found = findArchetypeBlock(src, id);
  if (!found) throw new Error(`Archetype ${id} not found`);

  let block = found.block;

  // Helper to check if a value is already covered
  const already = (() => {
    const du = (block.match(/domainUnicode:\s*"([^"]+)"/) || [])[1];
    const dp = (block.match(/domainPunycode:\s*"([^"]+)"/) || [])[1];
    const daMatch = block.match(/domainAlt:\s*\[([^\]]*)\]/);
    const da = daMatch
      ? daMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
      : [];
    const all = [du, dp, ...da].filter(Boolean).map(d => normalizeDomain(d));
    return all.some(d => d === norm || (puny && d === puny));
  })();
  if (already) return { src, changed: false };

  const hasDomainUnicode = /domainUnicode:/.test(block);

  if (!hasDomainUnicode) {
    block = setLine(block, 'domainUnicode', norm, 'folder');
    if (puny) block = setLine(block, 'domainPunycode', puny, 'domainUnicode');
  } else {
    const hasDomainAlt = /domainAlt:/.test(block);
    if (hasDomainAlt) {
      const updated = pushToArrayLine(block, 'domainAlt', norm);
      if (!updated) throw new Error(`Could not append to domainAlt for ${id}`);
      block = updated;
    } else {
      block = setLine(block, 'domainAlt', [norm], 'domainPunycode');
    }
  }

  const newSrc = replaceArchetypeBlock(src, id, block);
  return { src: newSrc, changed: true };
}

function runGenerate() {
  console.log('\n▸ npm run generate');
  execSync('npm run generate', { cwd: ROOT, stdio: 'inherit' });
}

function runCommand(cmd) {
  console.log(`\n▸ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function runValidators(extras = []) {
  runCommand('node scripts/validate-flywheel.js');
  runCommand('node type/js/validate.js');
  for (const cmd of extras) runCommand(cmd);
}

function loadLexiconSource() {
  return fs.readFileSync(PATHS.lexicon, 'utf8');
}

function saveLexicon(src) {
  atomicWrite(PATHS.lexicon, src);
}

function setLexiconField(src, id, field, value) {
  const valueStr = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
  const blockRe = new RegExp(`(\\{[\\s\\S]*?\\n\\s*(?:id:\\s*'${id}'|"id":\\s*"${id}")[\\s\\S]*?\\n\\s*\\},?)`);
  const blockMatch = src.match(blockRe);
  if (!blockMatch) throw new Error(`Lexicon entry ${id} not found`);

  let block = blockMatch[1];
  const fieldRe = new RegExp(`^(\\s*)${field}:\\s*[^,\\n]+,?\\s*$`, 'm');
  if (fieldRe.test(block)) {
    block = block.replace(fieldRe, `$1${field}: ${valueStr},`);
  } else {
    const idRe = new RegExp(`^(\\s*)(?:id:\\s*'${id}'|"id":\\s*"${id}"),?\\s*$`, 'm');
    const idMatch = block.match(idRe);
    if (!idMatch) throw new Error(`Could not locate id line for ${id}`);
    const indent = idMatch[1];
    const line = `${indent}${field}: ${valueStr},`;
    const pos = idMatch.index + idMatch[0].length;
    block = block.slice(0, pos) + '\n' + line + block.slice(pos);
  }

  return src.slice(0, blockMatch.index) + block + src.slice(blockMatch.index + blockMatch[1].length);
}

const PANTHEON_COLORS = {
  greek: { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
  'greek-location': { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
  norse: { primary: '#C0C0C0', secondary: '#5C9BD1', glow: 'rgba(192,192,192,0.3)' },
  egyptian: { primary: '#D4AF37', secondary: '#1E3A5F', glow: 'rgba(212,175,55,0.3)' },
  sanskrit: { primary: '#FF9933', secondary: '#8B0000', glow: 'rgba(255,153,51,0.3)' },
  celtic: { primary: '#228B22', secondary: '#B8D4E3', glow: 'rgba(34,139,34,0.3)' },
  mesopotamian: { primary: '#CD7F32', secondary: '#C2B280', glow: 'rgba(205,127,50,0.3)' },
  polynesian: { primary: '#1E90FF', secondary: '#FF7F50', glow: 'rgba(30,144,255,0.3)' },
  japanese: { primary: '#DC143C', secondary: '#1A1A1A', glow: 'rgba(220,20,60,0.3)' },
  nahuatl: { primary: '#50C878', secondary: '#2F2F2F', glow: 'rgba(80,200,120,0.3)' },
  yoruba: { primary: '#D4AF37', secondary: '#4B0082', glow: 'rgba(212,175,55,0.3)' },
  slavic: { primary: '#C0C0C0', secondary: '#228B22', glow: 'rgba(192,192,192,0.3)' },
  zoroastrian: { primary: '#FF4500', secondary: '#F5F5F5', glow: 'rgba(255,69,0,0.3)' },
  incan: { primary: '#D4AF37', secondary: '#DC143C', glow: 'rgba(212,175,55,0.3)' },
  canaanite: { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
  phoenician: { primary: '#D4AF37', secondary: '#800080', glow: 'rgba(212,175,55,0.3)' },
  hittite: { primary: '#CD7F32', secondary: '#C2B280', glow: 'rgba(205,127,50,0.3)' },
  chinese: { primary: '#DC143C', secondary: '#FFD700', glow: 'rgba(220,20,60,0.3)' },
  buddhist: { primary: '#FF4500', secondary: '#F5F5F5', glow: 'rgba(255,69,0,0.3)' },
  taoist: { primary: '#1A1A1A', secondary: '#DC143C', glow: 'rgba(26,26,26,0.3)' },
  korean: { primary: '#DC143C', secondary: '#1A1A1A', glow: 'rgba(220,20,60,0.3)' },
};

function defaultColors(pantheon) {
  return PANTHEON_COLORS[pantheon] || PANTHEON_COLORS.greek;
}

function formatArchetype(a) {
  const colors = a.colors || defaultColors(a.pantheon);
  const lines = [
    '    {',
    `        id: ${JSON.stringify(a.id)},`,
  ];
  if (a.rentalTier) {
    lines.push(`        rentalTier: ${JSON.stringify(a.rentalTier)},`);
  }
  lines.push(
    `        name: ${JSON.stringify(a.name)},`,
    `        greek: ${JSON.stringify(a.greek ?? '—')},`,
    `        domain: ${JSON.stringify(a.domain)},`,
    `        tagline: ${JSON.stringify(a.tagline)},`,
    `        tier: ${JSON.stringify(a.tier)},`,
    `        tierDetail: ${JSON.stringify(a.tierDetail)},`,
    `        pantheon: ${JSON.stringify(a.pantheon)},`,
    `        folder: ${JSON.stringify(a.folder)},`,
  );
  if (a.domainUnicode) {
    lines.push(`        domainUnicode: ${JSON.stringify(a.domainUnicode)},`);
  }
  if (a.domainPunycode) {
    lines.push(`        domainPunycode: ${JSON.stringify(a.domainPunycode)},`);
  }
  if (a.domainAlt && a.domainAlt.length) {
    const alt = a.domainAlt.map(d => JSON.stringify(d)).join(', ');
    lines.push(`        domainAlt: [${alt}],`);
  }
  if (a.domainless) {
    lines.push('        domainless: true,');
  }
  lines.push(
    `        colors: { primary: ${JSON.stringify(colors.primary)}, secondary: ${JSON.stringify(colors.secondary)}, glow: ${JSON.stringify(colors.glow)} },`,
    `        mascotPath: ${JSON.stringify(a.mascotPath)},`,
    `        mascotFallback: ${JSON.stringify(a.mascotFallback)},`,
    `        logomarkPath: ${JSON.stringify(a.logomarkPath)},`,
    `        built: ${a.built},`,
    `        hasAdSite: ${a.hasAdSite},`,
    `        darkPunchline: ${a.darkPunchline}`
  );
  lines.push('    },');
  return lines.join('\n');
}

function upsertArchetype(src, archetype) {
  const block = formatArchetype(archetype);
  if (findArchetypeBlock(src, archetype.id)) {
    return replaceArchetypeBlock(src, archetype.id, block);
  }
  return insertArchetypeBlock(src, block);
}

module.exports = {
  ROOT,
  PATHS,
  normalizeDomain,
  punycode,
  loadLexicon,
  loadArchetypes,
  loadOwnedDomains,
  saveOwnedDomains,
  saveArchetypes,
  findArchetypeBlock,
  replaceArchetypeBlock,
  insertArchetypeBlock,
  updateArchetypeDomain,
  runGenerate,
  runCommand,
  runValidators,
  loadLexiconSource,
  saveLexicon,
  setLexiconField,
  defaultColors,
  formatArchetype,
  upsertArchetype,
};

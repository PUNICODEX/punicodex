/**
 * Update js/archetypes-v2.js for Greek acute-accent audit.
 *
 * - Unowned Group A flagships: name + domainUnicode -> corrected acute form;
 *   old macron-only form becomes domainAlt.
 * - Owned Group A flagships: keep name/domainUnicode; add corrected acute form
 *   to domainAlt.
 * - Group B flagships (all owned here): keep name/domainUnicode; add stacked
 *   macron+acute ideal form to domainAlt.
 *
 * Domainless flagships only get name updates (unowned Group A).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { domainToASCII } = require('url');

const auditPath = path.resolve(__dirname, '../.superpowers/greek-acute-audit.json');
const ownedPath = path.resolve(__dirname, '../platform/db/owned-domains.json');
const archPath = path.resolve(__dirname, '../js/archetypes-v2.js');

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const owned = new Set(JSON.parse(fs.readFileSync(ownedPath, 'utf8')));

const archSrc = fs.readFileSync(archPath, 'utf8');
const archetypes = vm.runInNewContext(`(function(){
${archSrc}
return ARCHETYPES;
})()`);
const byId = new Map(archetypes.map((a) => [a.id, a]));

function puny(d) {
  try {
    return domainToASCII(d);
  } catch (e) {
    return null;
  }
}

function ownedUnicode(u) {
  return owned.has(`${u.toLowerCase()}.com`);
}

function entryBounds(src, id) {
  const marker = `id: "${id}"`;
  const start = src.indexOf(marker);
  if (start === -1) return null;
  const end = src.indexOf('\n    },', start);
  return { start, end: end === -1 ? src.length : end };
}

function replaceInEntry(src, id, field, newValue) {
  const b = entryBounds(src, id);
  if (!b) return src;
  const block = src.slice(b.start, b.end);
  const re = new RegExp(`(${field}: \")([^\"]+)(\",)`);
  if (!re.test(block)) return src; // field absent (domainless)
  const updatedBlock = block.replace(re, `$1${newValue}$3`);
  return src.slice(0, b.start) + updatedBlock + src.slice(b.end);
}

function addDomainAlt(src, id, newDomain, newPuny) {
  const b = entryBounds(src, id);
  if (!b) return src;
  const block = src.slice(b.start, b.end);

  // Already has domainAlt — append if absent.
  const hasAlt = /domainAlt:\s*\[/.test(block);
  if (hasAlt) {
    if (block.includes(newDomain)) return src; // already present
    const updatedBlock = block.replace(
      /(domainAlt:\s*\[)([^\]]*)(\])/,
      (m, before, inner, after) => {
        const sep = inner.trim() ? ', ' : '';
        return `${before}${inner}${sep}"${newDomain}", "${newPuny}"${after}`;
      },
    );
    return src.slice(0, b.start) + updatedBlock + src.slice(b.end);
  }

  // No domainAlt yet — insert after domainPunycode (if present).
  if (!/domainPunycode:/.test(block)) return src; // domainless
  const updatedBlock = block.replace(
    /(domainPunycode: "[^"]+",)\n/,
    `$1\n        domainAlt: ["${newDomain}", "${newPuny}"],\n`,
  );
  return src.slice(0, b.start) + updatedBlock + src.slice(b.end);
}

let src = archSrc;
let updated = 0;
let altAdded = 0;

for (const item of audit.groupA) {
  const a = byId.get(item.id);
  if (!a) continue; // base temple, no archetype

  if (ownedUnicode(item.unicode)) {
    // Owned: keep canonical, add acute variant to domainAlt (if has domains).
    const p = puny(`${item.corrected.toLowerCase()}.com`);
    const before = src;
    src = addDomainAlt(src, item.id, `${item.corrected.toLowerCase()}.com`, p);
    if (src !== before) altAdded++;
  } else {
    // Unowned: switch canonical to acute form; old form -> domainAlt.
    const oldDomain = `${item.unicode.toLowerCase()}.com`;
    const newDomain = `${item.corrected.toLowerCase()}.com`;
    const oldPuny = puny(oldDomain);
    const newPuny = puny(newDomain);
    src = replaceInEntry(src, item.id, 'name', item.corrected);
    src = replaceInEntry(src, item.id, 'domainUnicode', newDomain);
    src = replaceInEntry(src, item.id, 'domainPunycode', newPuny);
    const before = src;
    src = addDomainAlt(src, item.id, oldDomain, oldPuny);
    if (src !== before) altAdded++;
    updated++;
  }
}

for (const item of audit.groupB) {
  const a = byId.get(item.id);
  if (!a) continue;
  const p = puny(`${item.ideal.toLowerCase()}.com`);
  const before = src;
  src = addDomainAlt(src, item.id, `${item.ideal.toLowerCase()}.com`, p);
  if (src !== before) altAdded++;
}

fs.writeFileSync(archPath, src);
console.log(`Updated ${updated} unowned archetype canonicals.`);
console.log(`Added/updated domainAlt on ${altAdded} archetypes.`);
console.log('Wrote archetypes to', archPath);

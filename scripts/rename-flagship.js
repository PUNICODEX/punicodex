/**
 * Rename an existing flagship directory and update all internal references.
 * Usage: node scripts/rename-flagship.js <oldId> <newId> [newUnicode] [newDomainUnicode]
 */
const fs = require('node:fs');
const path = require('node:path');

const [oldId, newId, newUnicode, newDomainUnicode] = process.argv.slice(2);
if (!oldId || !newId) {
  console.error('Usage: node scripts/rename-flagship.js <oldId> <newId> [newUnicode] [newDomainUnicode]');
  process.exit(1);
}

const SITES_DIR = path.join(__dirname, '..', 'sites');
const oldDir = path.join(SITES_DIR, oldId);
const newDir = path.join(SITES_DIR, newId);

if (!fs.existsSync(oldDir)) {
  console.error(`Old directory not found: ${oldDir}`);
  process.exit(1);
}

if (fs.existsSync(newDir)) {
  console.error(`New directory already exists: ${newDir}`);
  process.exit(1);
}

// Determine new Unicode / domain Unicode from args or keep old
const oldTitleCase = oldId.charAt(0).toUpperCase() + oldId.slice(1);
const newTitleCase = newId.charAt(0).toUpperCase() + newId.slice(1);
const finalUnicode = newUnicode || newTitleCase;
const finalDomainUnicode = newDomainUnicode || `${finalUnicode.toLowerCase()}.com`;

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return;
  // Skip binary-ish files
  const ext = path.extname(filePath).toLowerCase();
  if (['.webp', '.png', '.jpg', '.jpeg', '.mp4', '.webm', '.pdf', '.zip'].includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// Rename directory
fs.renameSync(oldDir, newDir);
console.log(`Renamed ${oldDir} -> ${newDir}`);

// Build replacement patterns
const replacements = [
  [`/sites/${oldId}/`, `/sites/${newId}/`],
  [`"${oldId}"`, `"${newId}"`], // JSON ids, etc.
  [`${oldId}_`, `${newId}_`], // asset prefixes
  [`"${oldTitleCase}"`, `"${finalUnicode}"`], // title-ish
  [`>${oldTitleCase}<`, `>${finalUnicode}<`], // HTML titles
];

// If domain unicode changed, also replace domain references
if (newDomainUnicode) {
  const oldDomain = `${oldTitleCase.toLowerCase()}.com`;
  const newDomain = newDomainUnicode.toLowerCase();
  replacements.push([oldDomain, newDomain]);
  replacements.push([`https://${oldDomain}`, `https://${newDomain}`]);
  replacements.push([`https://punycodex.com/${oldId}`, `https://punycodex.com/${newId}`]);
}

// Walk new directory and apply replacements
function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else {
      replaceInFile(fullPath, replacements);
    }
  }
}
walk(newDir);

console.log(`Updated internal references ${oldId} -> ${newId}`);

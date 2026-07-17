const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');

// These are the only plain ASCII domains the user owns
const ALLOWED_ASCII = new Set(['helheimr.com', 'muspellheimr.com', 'punicodex.com']);

const dirs = fs.readdirSync(SITES_DIR).filter(d => {
  return fs.existsSync(path.join(SITES_DIR, d, 'lore', 'index.html'));
}).sort();

console.log('Checking lore pages for plain ASCII domains...\n');

let issues = [];

for (const id of dirs) {
  const lorePath = path.join(SITES_DIR, id, 'lore', 'index.html');
  const html = fs.readFileSync(lorePath, 'utf8');

  // Find all .com references
  const matches = [...html.matchAll(/[\w\-]+\.com/g)];
  const asciiDomains = [];

  for (const m of matches) {
    const domain = m[0];
    const lower = domain.toLowerCase();

    // Skip allowed ASCII domains
    if (ALLOWED_ASCII.has(lower)) continue;

    // Skip punycode
    if (lower.startsWith('xn--')) continue;

    // Skip template/example domains
    if (['company.com', 'yourbrand.com', 'googleapis.com', 'gstatic.com'].includes(lower)) continue;

    // Check if it's plain ASCII (no extended chars)
    const isAscii = /^[\x00-\x7F]+$/.test(domain);
    if (isAscii) {
      asciiDomains.push(domain);
    }
  }

  if (asciiDomains.length > 0) {
    const unique = [...new Set(asciiDomains)];
    console.log(`${id}: ${unique.join(', ')}`);
    issues.push({id, domains: unique});
  }
}

if (issues.length === 0) {
  console.log('\nAll lore pages are clean.');
} else {
  console.log(`\n${issues.length} lore pages have plain ASCII domains that need fixing.`);
}

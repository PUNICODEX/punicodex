/**
 * PUNYCODEX — SEO Validation Script
 * Verifies schema.org, meta tags, and canonical URLs on all temple pages.
 */

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const sitesDir = path.join(__dirname, '..', 'sites');
const errors = [];
let checked = 0;

function checkPage(entry) {
  const filePath = path.join(sitesDir, entry.id, 'index.html');
  if (!fs.existsSync(filePath)) {
    errors.push({ id: entry.id, issue: 'File not found' });
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  checked++;

  // Check title (contains unicode or greek, case-insensitive)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  if (!titleMatch) {
    errors.push({ id: entry.id, issue: 'Missing <title>' });
  } else {
    const titleLower = titleMatch[1].toLowerCase();
    const unicodeLower = entry.unicode.toLowerCase();
    const greekLower = entry.greek && entry.greek !== '—' ? entry.greek.toLowerCase() : '';
    if (!titleLower.includes(unicodeLower) && (!greekLower || !titleLower.includes(greekLower))) {
      errors.push({ id: entry.id, issue: `Title missing name: "${titleMatch[1]}"` });
    }
  }

  // Check meta description
  const descMatch = html.match(/<meta name="description" content="([^"]*)">/);
  if (!descMatch) {
    errors.push({ id: entry.id, issue: 'Missing meta description' });
  }

  // Check canonical
  const canonMatch = html.match(/<link rel="canonical" href="([^"]*)">/);
  if (!canonMatch) {
    errors.push({ id: entry.id, issue: 'Missing canonical URL' });
  } else {
    const expectedRoot = `https://punycodex.com/${entry.id}/`;
    const expectedSites = `https://punycodex.com/sites/${entry.id}/`;
    if (canonMatch[1] !== expectedRoot && canonMatch[1] !== expectedSites) {
      errors.push({ id: entry.id, issue: `Wrong canonical: ${canonMatch[1]}` });
    }
  }

  // Check schema.org
  if (!html.includes('application/ld+json')) {
    errors.push({ id: entry.id, issue: 'Missing schema.org JSON-LD' });
  }

  // Check Open Graph
  if (!html.includes('og:title')) {
    errors.push({ id: entry.id, issue: 'Missing og:title' });
  }
  if (!html.includes('og:description')) {
    errors.push({ id: entry.id, issue: 'Missing og:description' });
  }
  if (!html.includes('og:url')) {
    errors.push({ id: entry.id, issue: 'Missing og:url' });
  }
  if (!html.includes('og:image')) {
    errors.push({ id: entry.id, issue: 'Missing og:image' });
  }

  // Check Twitter Card
  if (!html.includes('twitter:card')) {
    errors.push({ id: entry.id, issue: 'Missing twitter:card' });
  }
  if (!html.includes('twitter:image')) {
    errors.push({ id: entry.id, issue: 'Missing twitter:image' });
  }

  // Check temple-base.css or styles.css
  if (!html.includes('temple-base.css') && !html.includes('styles.css')) {
    errors.push({ id: entry.id, issue: 'Missing CSS link' });
  }

  // Check temple-base.js or script.js
  if (!html.includes('temple-base.js') && !html.includes('script.js')) {
    errors.push({ id: entry.id, issue: 'Missing JS link' });
  }
}

console.log(`${C.cyan}▸ SEO Validation${C.reset}`);
console.log('');

for (const entry of LEXICON) {
  checkPage(entry);
}

console.log(`  ${C.dim}Pages checked:${C.reset} ${checked}`);
console.log(`  ${C.dim}Errors found:${C.reset} ${errors.length}`);

if (errors.length > 0) {
  console.log('');
  errors.slice(0, 20).forEach((e) => {
    console.log(`  ${C.red}✗${C.reset} ${e.id}: ${e.issue}`);
  });
  if (errors.length > 20) {
    console.log(`  ${C.dim}... and ${errors.length - 20} more${C.reset}`);
  }
  process.exit(1);
} else {
  console.log(`  ${C.green}✓ All ${checked} pages have complete SEO markup${C.reset}`);
  process.exit(0);
}

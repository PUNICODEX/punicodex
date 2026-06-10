const fs = require('fs');
const path = require('path');
const L = require('../type/js/lexicon.js').LEXICON;
const lexiconMap = new Map(L.map(e => [e.id, e]));

const SITES_DIR = path.join(__dirname, '..', 'sites');

function hasBookingSystem(siteId) {
  const jsPath = path.join(SITES_DIR, siteId, 'script.js');
  if (!fs.existsSync(jsPath)) return false;
  return fs.readFileSync(jsPath, 'utf8').includes('BOOKING SYSTEM');
}

const adSites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory())
  .filter(hasBookingSystem)
  .sort();

console.log(`Auditing ${adSites.length} main ad pages...\n`);

const issues = [];

for (const siteId of adSites) {
  const entry = lexiconMap.get(siteId);
  if (!entry) continue;

  const mainPath = path.join(SITES_DIR, siteId, 'index.html');
  if (!fs.existsSync(mainPath)) continue;

  const html = fs.readFileSync(mainPath, 'utf8');

  // Check title contains the name
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1];
    // Title should contain either Unicode or ASCII name
    const hasName = title.includes(entry.unicode) || title.includes(entry.ascii) ||
                    (entry.greek && entry.greek !== '—' && title.includes(entry.greek));
    if (!hasName) {
      issues.push({ siteId, severity: 'medium', issue: `Title "${title}" missing name` });
    }
  }

  // Check canonical URL
  const canonMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (canonMatch) {
    const canon = canonMatch[1];
    if (!canon.includes(siteId)) {
      issues.push({ siteId, severity: 'high', issue: `Canonical URL "${canon}" doesn't contain site ID` });
    }
  }

  // Check footer domain
  const footerDomainMatch = html.match(/<span class="footer-label">Domains<\/span>\s*<span class="footer-value">([^<]+)<\/span>/);
  if (footerDomainMatch) {
    const domain = footerDomainMatch[1].trim();
    // Should contain the unicode name + .com
    if (!domain.includes(entry.unicode) && !domain.includes(entry.ascii)) {
      issues.push({ siteId, severity: 'high', issue: `Footer domain "${domain}" doesn't match entry` });
    }
  }

  // Check for missing mascot image
  const hasMascot = html.includes('mascot') || html.includes('logolockup');
  if (!hasMascot) {
    issues.push({ siteId, severity: 'medium', issue: 'No mascot/logolockup reference' });
  }

  // Check meta description
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  if (descMatch) {
    const desc = descMatch[1];
    if (desc.includes('Your brand, endorsed by') || desc.includes('Premium advertising')) {
      issues.push({ siteId, severity: 'low', issue: 'Generic meta description' });
    }
  }
}

// Group and print
const high = issues.filter(i => i.severity === 'high');
const medium = issues.filter(i => i.severity === 'medium');
const low = issues.filter(i => i.severity === 'low');

function printGroup(label, items) {
  if (items.length === 0) return;
  console.log(`\n=== ${label} (${items.length}) ===`);
  const bySite = {};
  for (const item of items) {
    if (!bySite[item.siteId]) bySite[item.siteId] = [];
    bySite[item.siteId].push(item.issue);
  }
  for (const siteId of Object.keys(bySite).sort()) {
    console.log(`${siteId}: ${bySite[siteId].join('; ')}`);
  }
}

printGroup('HIGH', high);
printGroup('MEDIUM', medium);
printGroup('LOW', low);

console.log(`\nTotal: ${issues.length} issues across ${new Set(issues.map(i => i.siteId)).size} sites.`);

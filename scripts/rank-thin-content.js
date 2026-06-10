const fs = require('fs');
const path = require('path');

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

const scores = [];

for (const siteId of adSites) {
  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) continue;

  const html = fs.readFileSync(lorePath, 'utf8');

  // Remove scripts and styles
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const mythText = (html.match(/<p class="myth-text">[\s\S]*?<\/p>/g) || [])
    .map(m => m.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .join(' ');

  const hasFigureSection = html.includes('The Figure') || html.includes('Who ') || html.includes('who ');
  const hasEtymologySection = html.includes('The Name Through History') || html.includes('Through History');
  const hasCharacterBreakdown = html.includes('Character Breakdown');
  const mythCards = (html.match(/<div class="myth-card/g) || []).length;

  // Quality score: higher is better
  let score = 0;
  score += text.length > 3000 ? 3 : (text.length > 1500 ? 2 : 1);
  score += mythCards >= 4 ? 3 : (mythCards >= 2 ? 2 : (mythCards >= 1 ? 1 : 0));
  score += mythText.length > 500 ? 3 : (mythText.length > 200 ? 2 : (mythText.length > 0 ? 1 : 0));
  score += hasFigureSection ? 2 : 0;
  score += hasEtymologySection ? 2 : 0;
  score += hasCharacterBreakdown ? 1 : 0;

  // Penalize generic templated phrases
  const genericPhrases = [
    'Your brand, endorsed by',
    'Premium advertising placements',
    'Twelve sacred frames',
    'This is not a directory',
    'This is a resurrection',
  ];
  for (const phrase of genericPhrases) {
    if (html.includes(phrase)) score -= 1;
  }

  scores.push({ siteId, score, textLength: text.length, mythCards, mythTextLength: mythText.length, hasFigureSection, hasEtymologySection, hasCharacterBreakdown });
}

scores.sort((a, b) => a.score - b.score);

console.log('THINNEST CONTENT (lowest scores):');
console.log('=================================');
for (const s of scores.slice(0, 20)) {
  const issues = [];
  if (s.mythCards === 0) issues.push('no myths');
  if (s.mythTextLength < 100) issues.push('thin myth text');
  if (!s.hasFigureSection) issues.push('no figure section');
  if (!s.hasEtymologySection) issues.push('no etymology');
  if (!s.hasCharacterBreakdown) issues.push('no breakdown');
  if (s.textLength < 1500) issues.push('very short');
  console.log(`${s.siteId}: score=${s.score} (${issues.join(', ') || 'ok'})`);
}

console.log('\nBEST CONTENT (highest scores):');
console.log('==============================');
for (const s of scores.slice(-10).reverse()) {
  console.log(`${s.siteId}: score=${s.score}`);
}

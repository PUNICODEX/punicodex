const fs = require('fs');
const path = require('path');

const sitesDir = path.join(__dirname, '..', 'sites');
const sites = fs.readdirSync(sitesDir).filter(id => {
  return fs.existsSync(path.join(sitesDir, id, 'lore', 'index.html'));
});

let issuesFound = 0;
for (const site of sites) {
  const html = fs.readFileSync(path.join(sitesDir, site, 'lore', 'index.html'), 'utf8');
  const absPaths = html.match(/href="\/sites\/[^"]+\//g);
  const hadesCards = html.match(/Hádes[\s\S]{0,400}Dual-Tier/g);
  const nikeCards = html.match(/Níke[\s\S]{0,400}Ἄρης/g);
  const aresFull = html.match(/Tier-1 Full/g);
  const aphroMacron = html.match(/Tier-1 Macron-Preserving/g);
  
  const issues = [];
  if (absPaths) issues.push(`${absPaths.length} absolute paths`);
  if (hadesCards) issues.push('Hades Dual-Tier bug');
  if (nikeCards) issues.push('Nike Greek bug');
  if (aresFull) issues.push('Ares Tier-1 Full bug');
  if (aphroMacron) issues.push('Aphrodite Macron-Preserving bug');
  
  if (issues.length > 0) {
    console.log(`${site}: ${issues.join(', ')}`);
    issuesFound++;
  }
}
console.log(`\n${sites.length} sites checked, ${issuesFound} with issues`);

const fs = require('fs');

// Prices per slot (same for all 3 sites)
const prices = {
  '01': 120000,
  '02': 80000,
  '03': 60000,
  '04': 50000,
  '05': 40000,
  '06': 35000,
  '07': 30000,
  '08': 25000,
  '09': 18000,
  '10': 15000,
  '11': 12000,
  '12': 30000,
  '13': 515000,
};

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  let html = fs.readFileSync(htmlFile, 'utf8');

  // Add data-price-cents to each .space-slot
  for (const [num, cents] of Object.entries(prices)) {
    const regex = new RegExp(`(<div class="space-slot[^"]*" data-space="${num}")`, 'g');
    html = html.replace(regex, `$1 data-price-cents="${cents}"`);
  }

  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log(`Prices added: ${htmlFile}`);
}

console.log('\nDone.');

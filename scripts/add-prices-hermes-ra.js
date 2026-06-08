const fs = require('fs');

// Prices for Hermes/Ra slots 14-26 (same layout as Nike 01-13)
const prices = {
  '14': 120000,
  '15': 80000,
  '16': 60000,
  '17': 50000,
  '18': 40000,
  '19': 35000,
  '20': 30000,
  '21': 25000,
  '22': 18000,
  '23': 15000,
  '24': 12000,
  '25': 30000,
  '26': 515000,
};

const sites = ['hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  let html = fs.readFileSync(htmlFile, 'utf8');

  for (const [num, cents] of Object.entries(prices)) {
    const regex = new RegExp(`(<div class="space-slot[^"]*" data-space="${num}")`, 'g');
    html = html.replace(regex, `$1 data-price-cents="${cents}"`);
  }

  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log(`Prices added: ${htmlFile}`);
}

console.log('\nDone.');

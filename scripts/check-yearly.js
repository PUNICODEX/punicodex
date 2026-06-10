const fs = require('fs');
const html = fs.readFileSync('sites/nike/index.html', 'utf8');
const yearly = html.match(/data-yearly-price=["']([^"']+)["']/g);
console.log('Yearly attrs:', yearly ? yearly.slice(0, 5) : 'none');
const price = html.match(/data-price-cents=["'](\d+)["']/g);
console.log('Price attrs sample:', price ? price.slice(0, 5) : 'none');

const fs = require('fs');
const path = require('path');

const urls = new Set();
urls.add('https://punycodex.com/');
urls.add('https://punycodex.com/404.html');
['about','contact','codex','store','pantheon','lexicon','type','realms','tiers'].forEach(p => urls.add('https://punycodex.com/' + p + '/'));

fs.readdirSync('sites').forEach(d => {
  if (fs.statSync(path.join('sites', d)).isDirectory()) {
    urls.add('https://punycodex.com/sites/' + d + '/');
  }
});

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
Array.from(urls).sort().forEach(u => {
  xml += '  <url>\n    <loc>' + u + '</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n';
});
xml += '</urlset>';

fs.writeFileSync('sitemap.xml', xml);
console.log('Sitemap generated:', urls.size, 'URLs');

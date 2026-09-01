const fs = require('fs');
const { LEXICON } = require('../type/js/lexicon.js');

const BUILT_TEMPLES = new Set([
    'zeus','ares','apollon','hades','hekate','nike','aphrodite','athena',
    'demeter','hera','hermes','hephaistos','hestia','poseidon','persephone',
    'prometheus','artemis','atlas','dionysos','medousa'
]);

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

const mainPages = [
    { loc: 'https://punicodex.com/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://punicodex.com/pantheon/', priority: '0.9', changefreq: 'weekly' },
    { loc: 'https://punicodex.com/type/', priority: '0.9', changefreq: 'weekly' },
    { loc: 'https://punicodex.com/tiers/', priority: '0.8', changefreq: 'monthly' },
    { loc: 'https://punicodex.com/codex/', priority: '0.7', changefreq: 'weekly' },
    { loc: 'https://punicodex.com/lexicon/', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://punicodex.com/store/', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://punicodex.com/about/', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://punicodex.com/contact/', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://punicodex.com/innovation/', priority: '0.8', changefreq: 'weekly' },
];

mainPages.forEach(p => {
    xml += '  <url>\n';
    xml += `    <loc>${p.loc}</loc>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += '  </url>\n';
});

xml += '  <!-- Flagship Temples -->\n';
BUILT_TEMPLES.forEach(id => {
    xml += `  <url><loc>https://punicodex.com/${id}/</loc><priority>0.8</priority><changefreq>monthly</changefreq></url>\n`;
});

xml += '  <!-- Base Temples -->\n';
LEXICON.forEach(entry => {
    if (!BUILT_TEMPLES.has(entry.id)) {
        xml += `  <url><loc>https://punicodex.com/${entry.id}/</loc><priority>0.6</priority><changefreq>monthly</changefreq></url>\n`;
    }
});

xml += '</urlset>';

fs.writeFileSync('sitemap.xml', xml, 'utf8');
const total = 9 + BUILT_TEMPLES.size + (LEXICON.length - BUILT_TEMPLES.size);
console.log(`Sitemap updated. Total URLs: ${total}`);

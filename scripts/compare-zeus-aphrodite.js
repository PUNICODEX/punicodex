const fs = require('fs');
const z = fs.readFileSync('sites/zeus/index.html', 'utf8');
const a = fs.readFileSync('sites/aphrodite/index.html', 'utf8');
console.log('ZEUS css:', (z.match(/styles\.css[^"']*/) || ['none'])[0]);
console.log('APHRODITE css:', (a.match(/styles\.css[^"']*/) || ['none'])[0]);
console.log('ZEUS script:', (z.match(/script\.js[^"']*/) || ['none'])[0]);
console.log('APHRODITE script:', (a.match(/script\.js[^"']*/) || ['none'])[0]);

// Check if zeus has the endorsement-hero vs regular hero
console.log('ZEUS has endorsement-hero:', z.includes('endorsement-hero'));
console.log('APHRODITE has endorsement-hero:', a.includes('endorsement-hero'));
console.log('ZEUS has spaces-layout:', z.includes('spaces-layout'));
console.log('APHRODITE has spaces-layout:', a.includes('spaces-layout'));

// Check section structure
const zSections = z.match(/<section[^>]*class="([^"]*)"/g) || [];
const aSections = a.match(/<section[^>]*class="([^"]*)"/g) || [];
console.log('ZEUS sections:', zSections.slice(0, 10));
console.log('APHRODITE sections:', aSections.slice(0, 10));

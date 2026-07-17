const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'middleware.js');
let src = fs.readFileSync(file, 'utf8');

const block = `
  // ─── 0b. Defensive domains ─────────────────────────────────────────
  // punicodex.com is a defensive typo domain -> redirect to punicodex.com
  const DEFENSIVE_DOMAINS = new Set(['punicodex.com', 'www.punicodex.com']);
  if (DEFENSIVE_DOMAINS.has(host)) {
    url.hostname = 'punicodex.com';
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.toString(),
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  }

`;

const marker = '  // ─── 0. Direct-serve flagship domains ──────────────────────────────';
if (!src.includes(marker)) {
  console.error('Direct-serve marker not found');
  process.exit(1);
}
if (src.includes('DEFENSIVE_DOMAINS')) {
  console.log('Defensive redirect already present');
  process.exit(0);
}

src = src.replace(marker, block + marker);
fs.writeFileSync(file, src);
console.log('Added punicodex.com defensive redirect to middleware.js');

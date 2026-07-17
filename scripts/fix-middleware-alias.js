const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'middleware.js');
let src = fs.readFileSync(file, 'utf8');

const insertion = `
  // ─── 0. Direct-serve flagship domains ──────────────────────────────
  // Some deity domains should serve their temple page directly instead
  // of redirecting to punicodex.com/{id}.
  const DIRECT_SERVE_MAP = {
    'helheimr.com': 'helheimr',
    'www.helheimr.com': 'helheimr',
  };
  const directId = DIRECT_SERVE_MAP[host];
  if (directId) {
    url.pathname = '/sites/' + directId + url.pathname;
    return fetch(url);
  }

`;

const marker = '  // ─── 1. Domain redirect ────────────────────────────────────────────';
if (!src.includes(marker)) {
  console.error('Marker not found in middleware.js');
  process.exit(1);
}
if (src.includes('DIRECT_SERVE_MAP')) {
  console.log('DIRECT_SERVE_MAP already present');
  process.exit(0);
}

src = src.replace(marker, insertion + marker);
fs.writeFileSync(file, src);
console.log('Updated middleware.js for direct-serve flagship domains');

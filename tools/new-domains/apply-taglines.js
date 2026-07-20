// Applies the curated taglines to js/archetypes-v2.js.
const fs = require('node:fs');
const curated = require('./taglines-curated.js');
const { ARCHETYPES } = require('../../js/archetypes-v2.js');

const built = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const clean = {};
const skipped = [];
for (const [id, t] of Object.entries(curated)) {
  if (t === null || t === undefined) {
    skipped.push(id);
    continue;
  }
  if (!built.has(id)) {
    skipped.push(`${id}(not-built)`);
    continue;
  }
  clean[id] = t;
}
console.log(`applicable: ${Object.keys(clean).length} | skipped: ${skipped.join(',')}`);

let A = fs.readFileSync('js/archetypes-v2.js', 'utf8');
let changed = 0;
for (const [id, t] of Object.entries(clean)) {
  const i = A.indexOf(`id: "${id}"`);
  if (i === -1) {
    console.error('missing', id);
    continue;
  }
  const end = A.indexOf('\n    },', i);
  let b = A.slice(i, end);
  const re = /tagline: "((?:[^"\\]|\\.)*)"/;
  const m = b.match(re);
  if (m && m[1] !== t) {
    b = b.replace(re, `tagline: ${JSON.stringify(t)}`);
    A = A.slice(0, i) + b + A.slice(end);
    changed++;
  }
}
fs.writeFileSync('js/archetypes-v2.js', A, 'utf8');
console.log(`taglines updated: ${changed}`);

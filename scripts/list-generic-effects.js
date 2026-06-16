const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('scripts/flagship-data.json', 'utf8'));
const effectMap = data.effectMap || {};
const sitesDir = 'sites';
const dirs = fs.readdirSync(sitesDir).filter((id) => fs.statSync(path.join(sitesDir, id)).isDirectory());
const flagships = dirs.filter((id) => fs.existsSync(path.join(sitesDir, id, 'gallery')));

const genericBase = new Set([
  'particles', 'stars', 'void', 'time', 'light', 'water', 'storm',
  'tree', 'mountain', 'sun', 'flame', 'aurora', 'cosmicNet', 'sandstorm',
  'abyssal', 'soul', 'volcanic'
]);

const results = [];
for (const id of flagships) {
  const files = ['index.html', 'lore/index.html', 'lore/extended/index.html', 'gallery/index.html'];
  let effect = null;
  for (const f of files) {
    const p = path.join(sitesDir, id, f);
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    const m = html.match(/<canvas[^>]+data-effect="([^"]+)"/);
    if (m) { effect = m[1]; break; }
  }
  if (!effect) { results.push({ id, effect: 'NONE' }); continue; }
  if (effectMap[id]) continue; // mapped
  if (!genericBase.has(effect)) continue; // bespoke not in map? maybe custom inline
  results.push({ id, effect });
}

console.log('Flagships without mapped/bespoke effect:', results.length);
for (const r of results) console.log(r.id + ': ' + r.effect);

const mapped = flagships.filter(id => effectMap[id]);
console.log('\nMapped count:', mapped.length);
console.log(mapped.join(', '));
console.log('\nTotal flagships:', flagships.length);

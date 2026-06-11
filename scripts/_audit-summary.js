const data = require('./_audit-results.json');
const bySite = {};
for (const cat of ['missing', 'full', 'error']) {
  for (const e of data[cat]) {
    bySite[e.siteId] = bySite[e.siteId] || { missing: 0, full: 0, error: 0, items: [] };
    bySite[e.siteId][cat]++;
    bySite[e.siteId].items.push({ filename: e.filename, status: cat });
  }
}
const sorted = Object.entries(bySite).sort((a, b) => {
  const ta = a[1].missing + a[1].full + a[1].error;
  const tb = b[1].missing + b[1].full + b[1].error;
  return tb - ta;
});
for (const [site, info] of sorted) {
  const total = info.missing + info.full + info.error;
  console.log(`${site}: ${total} broken (miss=${info.missing}, full=${info.full}, err=${info.error})`);
  for (const item of info.items) {
    console.log(`  [${item.status}] ${item.filename}`);
  }
}

// One-off: sweep live /api/slots for every flagship to find sites with missing/degenerate slots.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const a = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const list = Array.isArray(a) ? a : (a.archetypes || a.ARCHETYPES || Object.values(a)[0]);
const ids = list.filter((x) => x.built).map((x) => x.id);

const CONCURRENCY = 8;

async function fetchSite(id) {
  try {
    const res = await fetch(`https://punicodex.com/api/slots/?site=${encodeURIComponent(id)}`, {
      headers: { 'user-agent': 'punicodex-qa-sweep/1.0' },
    });
    if (res.status !== 200) return { id, status: res.status };
    const data = await res.json();
    const slots = data.slots || [];
    const bundle = slots.filter((s) => s.is_bundle === 1).length;
    return { id, status: 200, count: slots.length, bundle };
  } catch (e) {
    return { id, status: 'ERR', error: e.message };
  }
}

(async () => {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < ids.length) {
      const id = ids[i++];
      results.push(await fetchSite(id));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const bad = results.filter(
    (r) => r.status !== 200 || r.count !== 14 || r.bundle !== 1
  );
  console.log(`swept ${results.length} sites`);
  console.log(`healthy (200, 14 slots, 1 bundle): ${results.length - bad.length}`);
  console.log('problem sites:');
  for (const b of bad) console.log(' ', JSON.stringify(b));
  fs.writeFileSync(path.join(__dirname, 'slots-sweep-results.json'), JSON.stringify(results, null, 2));
})();

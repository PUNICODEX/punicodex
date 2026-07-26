'use strict';
const c = require('C:/projects/punycodex/platform/texts/lotus-sutra/eng.json');
const spans = new Map();
for (const s of c.sections) {
  for (const m of s.text.matchAll(/\[([^\]]{1,160})\]/g)) {
    const key = m[1].slice(0, 60);
    if (!spans.has(key)) spans.set(key, { n: 0, sec: s.id, full: m[1] });
    spans.get(key).n++;
  }
}
console.log('distinct bracket spans:', spans.size);
for (const [k, v] of spans) {
  console.log(`${v.n}x [${v.sec}] ${JSON.stringify(v.full.slice(0, 120))}`);
}

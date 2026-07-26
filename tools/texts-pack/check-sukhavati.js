'use strict';
const c = require('C:/projects/punycodex/platform/texts/sukhavativyuha/eng.json');
for (const s of c.sections) {
  const paras = s.text.split('\n\n');
  const lower = paras.filter((p) => /^[a-z,(]/.test(p));
  console.log(s.id, 'paras:', paras.length, 'lowercase-continuation:', lower.length);
  console.log('  first 3 lowercase:', lower.slice(0, 3).map((p) => JSON.stringify(p.slice(0, 60))));
}
const all = c.sections.map((s) => s.text).join('\n');
console.log('--- conversion spot checks ---');
for (const probe of ['Âjñâtakauṇḍinya', 'Aśvajit', 'Kâśyapa', 'Śâriputra', 'Śrâvastî', 'Jeta-grove', 'Anâthapiṇḍika', 'Trâyastriṃśa', 'Mañjuśrî', 'Vâṣpa', 'Yashpa', 'ghoṣa', 'Jina', 'Gina', 'Râjagṛiha', 'duḥkha', 'Pûrṇa', 'Akshobhya', 'Vajracchedikâ']) {
  const n = (all.split(probe).length - 1);
  if (n) console.log(probe, n);
}
console.log('--- Akshobhya context ---');
const i = all.indexOf('Akshobhya');
console.log(all.slice(i - 300, i + 150));
console.log('--- any leftover markup/entities ---');
const bad = all.match(/<[^>]+>|&[a-zA-Z#0-9]+;/g);
console.log(bad ? bad.slice(0, 10) : 'none');
console.log('--- any [n] ---');
console.log(all.match(/\[\d+\]/g)?.slice(0, 5) || 'none');

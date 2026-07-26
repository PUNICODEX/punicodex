'use strict';
const c = require('C:/projects/punycodex/platform/texts/lotus-sutra/eng.json');
const all = c.sections.map((s) => s.text).join('\n');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const f of ['Sâkyamuni', 'Mañgusrî', 'Vagrapâni', 'Mâra', 'Avalokitesvara', 'Akshobhya']) {
  console.log(f, (all.match(new RegExp(esc(f), 'g')) || []).length);
}
const ch1 = c.sections[0];
console.log('=== ch1 para 1 ===');
console.log(ch1.text.split('\n\n')[0].slice(0, 200));
console.log('=== ch1 para 2 (first 700 chars) ===');
console.log(ch1.text.split('\n\n')[1].slice(0, 700));
console.log('=== ch24 start ===');
console.log(c.sections[23].text.slice(0, 500));
console.log('=== leftover markup ===');
const bad = all.match(/<[^>]+>|&[a-zA-Z#0-9]+;/g);
console.log(bad ? bad.slice(0, 10) : 'none');
console.log('=== any [n] markers ===');
const br = all.match(/\[[0-9]{1,2}\]/g);
console.log(br ? br.slice(0, 10) : 'none');

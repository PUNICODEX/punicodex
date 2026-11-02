#!/usr/bin/env node
/** Verify industry seats: no duplicate ids within a block, file loads. */
'use strict';
const src = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'type', 'js', 'industry-patterns.js'),
  'utf8'
);
const nameRe = new RegExp("\\n    name: '((?:[^'\\\\]|\\\\.)*)'", 'g');
const blocks = [];
let m;
while ((m = nameRe.exec(src))) {
  const s = m.index;
  const e = src.indexOf('\n  },', s);
  blocks.push({ p: m[1], s, e: e === -1 ? src.length : e });
}
let dup = 0;
for (const b of blocks) {
  const seen = {};
  const re = new RegExp("\\{ id: '([a-z0-9-]+)'", 'g');
  const block = src.slice(b.s, b.e);
  let x;
  while ((x = re.exec(block))) {
    seen[x[1]] = (seen[x[1]] || 0) + 1;
    if (seen[x[1]] > 1) { console.log('DUP', x[1], 'in', b.p); dup++; }
  }
}
const { INDUSTRY_GROUPS } = require('../type/js/industry-patterns.js');
console.log(dup ? dup + ' duplicates' : 'no duplicates | ' + INDUSTRY_GROUPS.length + ' groups load clean');

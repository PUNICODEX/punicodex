'use strict';
for (const id of ['sukhavativyuha', 'bible-kjv']) {
  const c = require('C:/projects/punycodex/platform/texts/' + id + '/eng.json');
  const all = c.sections.map((s) => s.text).join('\n');
  const one = all.match(/[.;:!?] 1 [a-z]{2,}/g);
  const ll = all.match(/[a-z]1[a-z]/g);
  const ds = all.match(/  +/g);
  console.log(id, '| "1 <word>":', one ? one.length : 0, '| letter1letter:', ll ? ll.length : 0, '| double spaces:', ds ? ds.length : 0);
  if (one) console.log('  ', one.slice(0, 10).map((s) => JSON.stringify(s)).join(' '));
}

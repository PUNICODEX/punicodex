'use strict';
const c = require('C:/projects/punycodex/platform/texts/lotus-sutra/eng.json');
const all = c.sections.map((s) => s.text).join('\n');
// digit-as-letter artifacts: "1 " at sentence/verse start where capital I is meant
const oneSee = all.match(/(^|\n|[.;:!?] )1 [a-z]{2,}/g);
console.log('"1 <word>" cases:', oneSee ? oneSee.length : 0);
console.log((oneSee || []).slice(0, 20).map((s) => JSON.stringify(s)).join(' '));
const oneAlone = all.match(/[a-z]1[a-z]/g);
console.log('letter1letter:', oneAlone ? oneAlone.slice(0, 20) : 'none');
console.log('Bhadrikal:', (all.match(/Bhadrikal/g) || []).length);
console.log('Bhadrika:', (all.match(/Bhadrika/g) || []).length);
// stray braces / weird chars
console.log('braces:', (all.match(/[{}]/g) || []).length);
// double spaces
console.log('double spaces:', (all.match(/  /g) || []).length);
// common sacred-texts typos in this etext: "0 " for "O "
const zeroO = all.match(/(^|\n)0 [a-z]/g);
console.log('"0 <word>":', zeroO ? zeroO.slice(0, 10) : 'none');

'use strict';
const fs = require('node:fs');
const xref = {
  version: 1,
  links: [
    { temple: 'ahuramazda', forms: ['Ahura Mazda', 'Ahura'] },
    { temple: 'asa', forms: ['Asha'] },
    { temple: 'ashavahista', forms: ['Asha Vahiṣta', 'Asha-Vahiṣta'] },
    { temple: 'haurvatat', forms: ['Haurvatâṭ'] },
    { temple: 'ameretat', forms: ['Ameretâṭ', 'Ameretatâṭ'] },
  ],
};
fs.writeFileSync('platform/texts/avesta/xref.json', `${JSON.stringify(xref, null, 2)}\n`);
console.log('wrote platform/texts/avesta/xref.json');

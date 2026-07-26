'use strict';
const fs = require('node:fs');
const xref = {
  version: 1,
  links: [
    { temple: 'iuppiter', forms: ['Jove', 'Jupiter'] },
    { temple: 'iuno', forms: ['Juno'] },
    { temple: 'diana', forms: ['Diana'] },
    { temple: 'ceres', forms: ['Ceres'] },
    { temple: 'vulcanus', forms: ['Vulcan'] },
    { temple: 'neptunus', forms: ['Neptune'] },
    { temple: 'pluto', forms: ['Pluto'] },
    { temple: 'ianus', forms: ['Janus'] },
  ],
};
fs.writeFileSync('platform/texts/metamorphoses/xref.json', `${JSON.stringify(xref, null, 2)}\n`);
console.log('wrote platform/texts/metamorphoses/xref.json');

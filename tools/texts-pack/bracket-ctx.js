'use strict';
const c = require('C:/projects/punycodex/platform/texts/lotus-sutra/eng.json');
const all = c.sections.map((s) => s.text).join('\n\n');
for (const probe of [
  'In this chapter only four disciples',
  'The function of Avalokitesvara',
  'the Brâhman may be Brihaspati',
  'Then Akshayamati in the joy',
  'After a last effort the storm subsides',
  'These names may be translated',
]) {
  const i = all.indexOf(probe);
  console.log('### ' + probe);
  console.log('…' + all.slice(Math.max(0, i - 180), i + 220).replace(/\n\n/g, ' ¶ ') + '…\n');
}

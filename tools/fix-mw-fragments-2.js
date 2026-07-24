#!/usr/bin/env node
/**
 * One-off repair (part 2): sita/om raw-meaning purges in scholars + blog
 * content. The om scholars prose is already a proper paraphrase — untouched.
 */
const fs = require('node:fs');

function patch(file, pairs) {
  let src = fs.readFileSync(file, 'utf8');
  for (const [oldStr, newStr] of pairs) {
    const count = src.split(oldStr).length - 1;
    if (count !== 1) throw new Error(`${file}: expected 1, got ${count} :: ${oldStr.slice(0, 60)}`);
    src = src.split(oldStr).join(newStr);
  }
  fs.writeFileSync(file, src);
  console.log(`patched ${file} x${pairs.length}`);
}

patch('platform/scholars/content/sita.json', [
  [
    'Etymologically it means \\"a furrow, the track or line of a ploughshare (also personified, and apparently once worshipped as a kind of goddess resembling Pomona; in RV. iv, 57, 6\\"',
    'Etymologically it means \\"furrow\\" — the track of the ploughshare, personified as the field-goddess who became the wife of Rāma',
  ],
]);

patch('platform/blog/content/sita.json', [
  [
    '**Meaning:** \\"a furrow, the track or line of a ploughshare (also personified, and apparently once worshipped as a kind of goddess resembling Pomona; in RV. iv, 57, 6\\"',
    '**Meaning:** \\"Furrow — the field-goddess, wife of Rāma and mother of his twin sons\\"',
  ],
]);

patch('platform/blog/content/om.json', [
  [
    '**Meaning:** \\"a word of solemn affirmation and respectful assent, sometimes translated by ‘yes, verily, so be it’ (and in this sense compared with Amen; it is placed at the commencement of most\\"',
    '**Meaning:** \\"The sacred syllable of solemn affirmation — the sound from which the Vedas and creation itself proceed\\"',
  ],
]);

console.log('Part 2 repairs applied.');

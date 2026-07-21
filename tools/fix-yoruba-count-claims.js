/**
 * One-off: Yoruba count corrections in blog content.
 * Canon after re-filing 9 Aboriginal entries out of yoruba: Yoruba = 20 entries.
 * Also fixes the Ọbatalá -> Ọbàtálá spelling slip in obatala.json's overview.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'platform', 'blog', 'content');
const FILES = [
  'aganju.json',
  'babaluaye.json',
  'eshu.json',
  'oba.json',
  'obatala.json',
  'ochosi.json',
  'ogun.json',
  'olodumare.json',
  'orun.json',
  'orunmila.json',
  'oshun.json',
  'oya.json',
  'shango.json',
];

let countFixes = 0;
for (const f of FILES) {
  const fp = path.join(DIR, f);
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const before = j.body;
  j.body = j.body.replace(
    /one of 32 entries the PuniCodex lexicon catalogues under the Yoruba pantheon/g,
    'one of 20 entries the PuniCodex lexicon catalogues under the Yoruba pantheon'
  );
  if (j.body === before) throw new Error(`no count claim replaced in ${f}`);
  countFixes += 1;
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}
console.log(`count claims fixed: ${countFixes}`);

// obatala.json spelling slip: Ọbatalá (missing grave on the second a) -> Ọbàtálá.
const obFp = path.join(DIR, 'obatala.json');
const ob = JSON.parse(fs.readFileSync(obFp, 'utf8'));
const obBefore = ob.body;
ob.body = ob.body.replace(/Ọbatalá/g, 'Ọbàtálá');
const slipCount = (obBefore.match(/Ọbatalá/g) || []).length;
if (slipCount === 0) throw new Error('no Ọbatalá slips found in obatala.json');
fs.writeFileSync(obFp, `${JSON.stringify(ob, null, 2)}\n`);
console.log(`obatala.json: fixed ${slipCount} spelling slip(s)`);

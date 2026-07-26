#!/usr/bin/env node
'use strict';
/**
 * Tablet-7 surgical rebuild: verses 35-37 (scan-verified) and the
 * fragment region 83-112 (rebuilt from the pdftext of print pp. 101-107).
 */
const fs = require('node:fs');
const path = require('node:path');
const DIR = path.join(__dirname, 'out', 'enuma-final');
const FILE = path.join(DIR, 'tablet-7.txt');

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
function idx(verseNo) {
  const re = new RegExp(`^${verseNo}\\. `);
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) throw new Error(`verse ${verseNo} not found`);
  return i;
}

// --- verses 35-37 (verified against scan, print p. 99) ---
lines[idx(35)] = '35. Šag-zu, " who knoweth the heart of the gods," " who seeth through the innermost part!]"';
if (!lines.some((l) => /^36\. /.test(l))) {
  lines.splice(idx(37), 0, '', '36. " The evil-doer he hath not caused to go forth with him!"');
}
lines[idx(37)] = '37. " Founder of the assembly of the gods," "[who . . . . ] their heart!"';

// --- fragment region 83-112: replace the [83] and [103,107] blocks ---
const i83 = idx(83);
const i103 = idx(103);
const i109 = idx(109);
const rebuilt = [
  '[The following lines are taken from the fragment K. 12,830, but their position in the text is uncertain.]',
  '',
  '[He named the four quarters (of the world)], mankind [he created],',
  '',
  '[And upon] him understanding [ . . . . . ]',
  '',
  '[The following lines are taken from the fragment K. 13,761.]',
  '',
  '" The mighty one [ . . . . . . . . . ] ! " Agijl . . . . . . . . ]," " The Creator of [the earth . . . . . ] ! " Zulummu . [ . . . . . . . . ]',
  '',
  '" The Giver of counsel and of whatsoever [ . . . . ]!" Mummu, " the Creator [of . . . . . . ] in " Mulil, the heavens [ . . . . . . . . ] . " Who for [ . . . ]!" GiSkul, let [ . . . . . . . . . . . ],',
  '',
  '" Who brought the gods to naught [ . . . . ]!" Lugal-ab-[ . . . . . . . . . . . ], "Who in [ . . . . . . . . . . . . ]!" Pap-[ . . . . . . . . . . . . . ] "Who in [ . . . . . . . . . . . . ]!',
  '',
  '[The following lines are taken from the fragment K. 8,519 and its duplicate K. 13,337; this portion of the text was not separated by much from that preserved by K. 13,761.]',
  '',
  '[ . . . ] the Chief (?) of all lords, [ . supreme] is his might ! [Lugal-durmab, " the King] of the band of the gods," " the Lord of rulers,"',
  '',
  '" Who is exalted in a royal habitation," " [Who] among the gods is gloriously supreme !" [Adu-nuna], " the Counsellor of Ea," who created the gods his fathers, Unto the path of whose majesty [No] god can ever attain !',
  '',
  '[ . . . in] Dul-azag he made it known, [ . . . . . . ] pure is his dwelling! [ . . . ] of those without understanding is Lugal-dul-azaga ! [ . . . ] supreme is his might! [ . . . ] in the midst of Tiamat, [ . . . . . . . . ] of the battle !',
  '',
  '[The numbering of the following lines is based on the marginal numbers upon No. 91,139 + 93,073.]',
  '',
  '105. [ . . . . . ] . [ . . . . . ] him,',
  '',
  '106. [ . . . . . ] . the star, which [shineth in the heavens].',
  '',
  '107. May he hold the Beginning and the Future, they pay homage unto him,',
  '',
  '108. " He who forced his way through the midst of Tiamat [without resting],"',
];
// region runs from line of v83 to just before v109
lines.splice(i83, i109 - i83, ...rebuilt, '');
fs.writeFileSync(FILE, lines.join('\n'));
console.log('tablet-7 rebuilt');

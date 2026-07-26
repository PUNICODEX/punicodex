#!/usr/bin/env node
'use strict';
/**
 * Final hand patches for enuma-elish tablet drafts (footnote intrusions
 * and OCR artifacts found in review). Idempotent.
 */
const fs = require('node:fs');
const path = require('node:path');
const DIR = path.join(__dirname, 'out', 'enuma-final');

function patch(file, fn) {
  const p = path.join(DIR, file);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  fs.writeFileSync(p, fn(lines).join('\n'));
}
function replaceVerse(lines, verseNo, newText) {
  const re = new RegExp(`^${verseNo}\\. `);
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) throw new Error(`verse ${verseNo} not found in patch target`);
  lines[i] = `${verseNo}. ${newText}`;
  return lines;
}
function insertVerseAfter(lines, afterNo, verseNo, newText) {
  const has = new RegExp(`^${verseNo}\\. `);
  if (lines.some((l) => has.test(l))) return lines; // already present
  const re = new RegExp(`^${afterNo}\\. `);
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) throw new Error(`verse ${afterNo} not found for insert`);
  lines.splice(i + 1, 0, '', `${verseNo}. ${newText}`);
  return lines;
}

// ---- tablet 1 ----
patch('tablet-1.txt', (lines) => {
  replaceVerse(lines, 26, 'And Tiamat roared [ . . . . . . . . . ]');
  replaceVerse(lines, 38, '" By day I cannot rest, by night [I cannot lie down (in peace)].');
  replaceVerse(lines, 41, 'When Tiamat [heard] these words,');
  replaceVerse(lines, 113, '[Ummu-Hubur, who formed all things,');
  insertVerseAfter(lines, 113, 114, '[Made in addition] weapons invincible, she spawned monster-serpents,');
  replaceVerse(lines, 118, '[With splendour] she decked them, [she made them] of lofty stature.');
  replaceVerse(lines, 130, '" To give the battle-signal, to advance to the attack,');
  return lines;
});

// ---- tablet 2 ----
patch('tablet-2.txt', (lines) => {
  replaceVerse(lines, 14, '" [With] those, whom ye created, they go at her side.');
  insertVerseAfter(lines, 14, 15, '" They are banded together and at the side of Tiamat they advance ;');
  replaceVerse(lines, 41, '" \' [Be thou exalted], thou [my chosen spouse],');
  replaceVerse(lines, 55, '" [Mummu and] Apsû thou hast smitten,');
  replaceVerse(lines, 58, '[ . . . . the . of ] the gods, N[u]di[mmud] \' [A gap of about ten lines occurs here.]');
  replaceVerse(lines, 76, ') " [That] her spirit [may be appeased], that her heart may be merciful.');
  replaceVerse(lines, 125, ') " [ . . . ] . . rejoice and be glad;');
  return lines;
});

// ---- tablet 3 ----
patch('tablet-3.txt', (lines) => {
  replaceVerse(lines, 2, '[Unto Gaga], his [minister], spake the word :');
  replaceVerse(lines, 26, '" With poison instead of blood she hath filled their bodies.');
  replaceVerse(lines, 41, '" [To direct] the battle, to control the [fight],');
  replaceVerse(lines, 49, '" Now Kingu, (thus) exalted, having received [the power of Anu],');
  replaceVerse(lines, 52, '" \' [Whoso is exalted in the battle], let him display (his) might! \'');
  insertVerseAfter(lines, 52, 53, '" I sent Anu, but he could not withstand her ;');
  replaceVerse(lines, 83, '" Sharp of tooth and merciless of fang.');
  replaceVerse(lines, 107, '" Now Kingu, (thus) exalted, [having received the power of Anu],');
  return lines;
});

// ---- tablet 4 ----
patch('tablet-4.txt', (lines) => {
  replaceVerse(lines, 49, 'Then the lord raised the thunderbolt, his mighty weapon,');
  insertVerseAfter(lines, 49, 50, 'And mounted the chariot, the storm unequalled for terror,');
  insertVerseAfter(lines, 50, 51, 'He harnessed and yoked unto it four horses,');
  replaceVerse(lines, 52, 'Destructive, ferocious, overwhelming, and swift of pace ;');
  replaceVerse(lines, 118, 'Them and their opposition he trampled under his feet.');
  replaceVerse(lines, 133, 'His fathers beheld, and they rejoiced and were glad ;');
  return lines;
});

// ---- tablet 5 ----
patch('tablet-5.txt', (lines) => {
  replaceVerse(lines, 2, 'The stars, their images, as the stars of the Zodiac, he fixed.');
  replaceVerse(lines, 26, '" [ . . . . . . . . . . . . ]me.');
  return lines;
});

// ---- tablet 6 ----
patch('tablet-6.txt', (lines) => {
  replaceVerse(lines, 5, '" My blood will I take and bone will I [fashion],');
  replaceVerse(lines, 10, '" Together shall they be oppressed, and unto evil shall [they . . . . ]. "');
  return lines;
});

// ---- tablet 7 ----
patch('tablet-7.txt', (lines) => {
  replaceVerse(lines, 83, 'O, but their position in the text is uncertain.]');
  replaceVerse(lines, 117, '(This) title, which all the Spirits of Heaven proclaimed,');
  replaceVerse(lines, 142, '[ . . . . . . . . . . . . . . ] ! "');
  return lines;
});

console.log('patched');

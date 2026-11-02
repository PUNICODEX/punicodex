#!/usr/bin/env node
/** Top-up: the seven entries still short of 3 industry seats. Idempotent. */
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'type', 'js', 'industry-patterns.js');
let src = fs.readFileSync(FILE, 'utf8');

const ADD = [
  ['Astrology, Tarot & Esoteric Services', { id: 'nut', weight: 1, why: 'The sky-mother whose body the decans traverse — the celestial map is her skin.' }],
  ['Travel, Tourism & Place Branding', { id: 'onuris', weight: 1, why: 'The retrieval journey to Nubia and back — the divine quest as the first pilgrimage-tour.' }],
  ['Music, Arts & Performance', { id: 'brahman', weight: 1, why: 'AUM as the resonant syllable — the primordial drone beneath every raga.' }],
  ['Defense, Military & Security', { id: 'diti', weight: 1, why: "Mother of the Daitya war-hosts — the anti-gods' armies are her nursery." }],
  ['Music, Arts & Performance', { id: 'mantra', weight: 2, why: 'The chant as performance — the Gāyatrī, recited unbroken for three millennia, is the oldest continuous piece on earth.' }],
  ['Writing, Publishing & Media', { id: 'gronwpebr', weight: 2, why: "His story survives in the White and Red Books — the Mabinogi manuscripts are Welsh literature's foundation." }],
  ['Meteorology & Weather Intelligence', { id: 'yammu', weight: 1, why: 'The sea Baal must break — the storm-versus-ocean combat is weather’s oldest dramatization.' }],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let ins = 0;
for (const [pattern, seat] of ADD) {
  const m = new RegExp(`name: '${esc(pattern)}'`).exec(src);
  if (!m) { console.log('pattern not found:', pattern); continue; }
  const tail = src.slice(m.index);
  const closeRe = /\n    \]\n  \},/;
  const cm = closeRe.exec(tail);
  if (!cm) { console.log('no close for', pattern); continue; }
  const endIdx = cm.index;
  const block = tail.slice(0, endIdx);
  if (block.includes(`{ id: '${seat.id}'`)) continue;
  const at = m.index + endIdx;
  const line = `\n\n      { id: '${seat.id}', weight: ${seat.weight}, why: ${JSON.stringify(seat.why)} },`;
  src = src.slice(0, at) + line + src.slice(at);
  ins++;
}
fs.writeFileSync(FILE, src);
console.log('inserted', ins);

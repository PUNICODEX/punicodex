#!/usr/bin/env node
/**
 * Industry-seats audit & repair (ascii-restoration batch 2026-11).
 *
 * The naive `\n    ],` insertion anchor misfired on the 13 pattern blocks whose
 * entries array closes inline (`... }],`). Seats intended for those blocks were
 * pushed into the FOLLOWING pattern's end. This script:
 *   1. Rebuilds the intended seat map from the two batch scripts.
 *   2. Locates every `{ id: 'X' }` seat and its actual containing pattern block.
 *   3. Removes seats sitting in a wrong block.
 *   4. Inserts each intended seat into its correct block using a robust
 *      group-end anchor (handles both `\n    ],\n  },` and inline `}],\n  },`).
 * Idempotent.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'type', 'js', 'industry-patterns.js');

// ── Rebuild intended map ──
function grabObject(file, marker) {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('marker not found in ' + file);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return eval('(' + src.slice(open, i + 1) + ')');
}
const seatsFromMain = grabObject('add-ascii-industry-seats.js', 'const SEATS');
const topupSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'add-ascii-industry-seats-2.js'), 'utf8');
const addOpen = topupSrc.indexOf('const ADD');
const addArr = eval('(' + topupSrc.slice(topupSrc.indexOf('[', addOpen), topupSrc.indexOf('];', addOpen) + 1) + ')');

const INTENDED = new Map(); // key: pattern|id
for (const [pattern, seats] of Object.entries(seatsFromMain)) {
  for (const s of seats) INTENDED.set(pattern + '|' + s.id, { pattern, ...s });
}
for (const [pattern, seat] of addArr) INTENDED.set(pattern + '|' + seat.id, { pattern, ...seat });

let src = fs.readFileSync(FILE, 'utf8');

// ── Block map: every pattern name → [start, end) char range ──
const nameRe = /\n    name: '((?:[^'\\]|\\.)*)'/g;
const blocks = [];
let nm;
while ((nm = nameRe.exec(src))) {
  const start = nm.index;
  // group end: first "\n  }," after start (entries is the last property)
  const end = src.indexOf('\n  },', start);
  blocks.push({ pattern: nm[1], start, end: end === -1 ? src.length : end });
}

function blockOf(index) {
  for (const b of blocks) if (index >= b.start && index < b.end) return b.pattern;
  return null;
}

// ── 1. Remove wrongly-placed seats ──
const seatLineRe = /\n[ \t]*\{ id: '([a-z0-9-]+)', weight: \d+, why: [^\n]*\},?/g;
let removed = 0;
const toRemove = [];
let sm;
while ((sm = seatLineRe.exec(src))) {
  const actual = blockOf(sm.index);
  // intended pattern for THIS occurrence: any intended seat with this id
  const candidates = [...INTENDED.values()].filter((s) => s.id === sm[1]);
  if (!candidates.length) continue; // not ours — leave it
  if (!candidates.some((c) => c.pattern === actual)) {
    toRemove.push([sm.index, sm[0]]);
  }
}
for (let i = toRemove.length - 1; i >= 0; i--) {
  src = src.slice(0, toRemove[i][0]) + src.slice(toRemove[i][0] + toRemove[i][1].length);
  removed++;
}

// ── 2. Rebuild block ranges after removal ──
nameRe.lastIndex = 0;
blocks.length = 0;
while ((nm = nameRe.exec(src))) {
  const start = nm.index;
  const end = src.indexOf('\n  },', start);
  blocks.push({ pattern: nm[1], start, end: end === -1 ? src.length : end });
}

// ── 3. Insert each intended seat into its correct block ──
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let inserted = 0, present = 0;
for (const seat of INTENDED.values()) {
  const b = blocks.find((x) => x.pattern === seat.pattern);
  if (!b) { console.log('!! pattern missing:', seat.pattern); continue; }
  const block = src.slice(b.start, b.end);
  if (block.includes(`{ id: '${seat.id}'`)) { present++; continue; }
  // insert before the group end, inside the entries array
  const before = src.slice(Math.max(0, b.end - 16), b.end);
  let at;
  let replacement;
  const line = `\n\n      { id: '${seat.id}', weight: ${seat.weight}, why: ${JSON.stringify(seat.why)} },`;
  if (/\}\],\s*$/.test(before)) {
    // inline close: ... { last }],\n  },  → add after last entry, re-close
    at = b.end - 2; // position of "},\n" → we insert before the "]"
    // src ends with "}]" + ",\n  }," ; put our entry before the final "}"
    const insertAt = b.end - ']'.length - '\n  },'.length - ','.length;
    // simpler: replace trailing "}],...": find last "}" before b.end
    const closeIdx = src.lastIndexOf('}', b.end);
    replacement = '},\n    }';
    // turn "...x }],\n  }," into "...x },\n\n {seat},\n    }],\n  },"
    const lastBrace = src.lastIndexOf('}', b.end);
    // remove the "]" right after that brace
    const rb = src.slice(0, lastBrace) + '},\n\n      { seatline_PLACEHOLDER }'.replace('{ seatline_PLACEHOLDER }', '') ;
    // Build final: everything up to and including last entry's closing brace
    // (drop the "],)" part), then our entry, then re-close.
    const tailStart = src.indexOf(']', lastBrace);
    src = src.slice(0, lastBrace + 1) + ',' + line + '\n    ' + src.slice(tailStart);
    inserted++;
    // refresh block ends lazily — recompute below after loop? safer: recompute now
    nameRe.lastIndex = 0;
    blocks.length = 0;
    while ((nm = nameRe.exec(src))) {
      const s2 = nm.index;
      const e2 = src.indexOf('\n  },', s2);
      blocks.push({ pattern: nm[1], start: s2, end: e2 === -1 ? src.length : e2 });
    }
    continue;
  }
  if (/\n    \],\s*$/.test(before) || /\],\s*$/.test(before)) {
    // line close: insert before the final "\n    ],"
    const closeIdx = src.lastIndexOf('\n    ],', b.end);
    src = src.slice(0, closeIdx) + line + src.slice(closeIdx);
    inserted++;
    nameRe.lastIndex = 0;
    blocks.length = 0;
    while ((nm = nameRe.exec(src))) {
      const s2 = nm.index;
      const e2 = src.indexOf('\n  },', s2);
      blocks.push({ pattern: nm[1], start: s2, end: e2 === -1 ? src.length : e2 });
    }
    continue;
  }
  console.log('!! unknown close style for', seat.pattern, JSON.stringify(before));
}

fs.writeFileSync(FILE, src);
console.log(`audit: removed ${removed} misplaced, inserted ${inserted}, ${present} already correct`);

// ── 4. Verify ──
const final = fs.readFileSync(FILE, 'utf8');
require(FILE); // loads clean?
nameRe.lastIndex = 0;
blocks.length = 0;
while ((nm = nameRe.exec(final))) {
  const s2 = nm.index;
  const e2 = final.indexOf('\n  },', s2);
  blocks.push({ pattern: nm[1], start: s2, end: e2 === -1 ? final.length : e2 });
}
function blockOf2(index) {
  for (const b of blocks) if (index >= b.start && index < b.end) return b.pattern;
  return null;
}
let misplaced = 0;
const seatRe2 = /\{ id: '([a-z0-9-]+)', weight: \d+, why:/g;
while ((nm = seatRe2.exec(final))) {
  if (![...INTENDED.values()].some((s) => s.id === nm[1])) continue;
  const actual = blockOf2(nm.index);
  if (![...INTENDED.values()].some((c) => c.id === nm[1] && c.pattern === actual)) {
    console.log('STILL MISPLACED:', nm[1], 'in', actual);
    misplaced++;
  }
}
const ALL = [...new Set([...INTENDED.values()].map((s) => s.id))];
const short = ALL.filter((id) => (final.match(new RegExp("\\{ id: '" + id + "'", 'g')) || []).length < 3);
console.log(misplaced ? misplaced + ' still misplaced' : '0 misplaced');
console.log(short.length ? 'UNDER 3: ' + short.join(',') : 'ALL entries have ≥3 seats');

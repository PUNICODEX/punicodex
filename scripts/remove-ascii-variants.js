#!/usr/bin/env node
/**
 * Remove 'ascii' variants from the canonical lexicon.
 *
 * ASCII is kept as entry.ascii for search/routing, but it should not be
 * presented as a scholarly Unicode variant. Names whose Unicode form is
 * already plain ASCII are unaffected (there is nothing to remove).
 */

const fs = require('node:fs');
const path = require('node:path');

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

function findMatchingBracket(str, openIdx) {
  const openChar = str[openIdx];
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 1;
  let i = openIdx + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === openChar) depth++;
    else if (str[i] === closeChar) depth--;
    i++;
  }
  return i - 1;
}

function splitTopLevelObjects(block) {
  const items = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        items.push(block.slice(start, i + 1));
      }
    }
  }
  return items;
}

let src = fs.readFileSync(LEXICON_PATH, 'utf8');
let changed = 0;
let skipped = 0;

const variantsRegex = /variants:\s*\[/g;
let match;
while ((match = variantsRegex.exec(src)) !== null) {
  const openIdx = match.index + match[0].length - 1;
  const closeIdx = findMatchingBracket(src, openIdx);
  if (closeIdx <= openIdx) continue;

  const arrayContent = src.slice(openIdx + 1, closeIdx);
  const items = splitTopLevelObjects(arrayContent);
  const filtered = items.filter((item) => {
    const isAscii = /type\s*:\s*['"]ascii['"]/.test(item);
    return !isAscii;
  });

  if (filtered.length !== items.length) {
    const newContent = filtered.join(',\n      ');
    src = src.slice(0, openIdx + 1) + '\n      ' + newContent + '\n    ' + src.slice(closeIdx);
    changed += items.length - filtered.length;
  } else {
    skipped += 1;
  }
}

fs.writeFileSync(LEXICON_PATH, src, 'utf8');
console.log(`Removed ${changed} ascii variants, skipped ${skipped} arrays without ascii variants.`);

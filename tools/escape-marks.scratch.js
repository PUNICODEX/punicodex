// One-off: escape combining-mark literals in engine.js as \uXXXX sequences.
const fs = require('node:fs');

const path = 'type/js/engine.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const ESCAPE = {
  0x0300: '\\u0300',
  0x0301: '\\u0301',
  0x0302: '\\u0302',
  0x0304: '\\u0304',
  0x0308: '\\u0308',
  0x0342: '\\u0342',
  0x0345: '\\u0345',
};

const TARGET_LINES = new Set([172, 173, 174, 175, 229, 230, 231]); // 1-based
const out = lines.map((line, i) => {
  if (!TARGET_LINES.has(i + 1)) return line;
  let next = '';
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    next += ESCAPE[cp] || ch;
  }
  return next;
});
fs.writeFileSync(path, out.join('\n'));
console.log('escaped');

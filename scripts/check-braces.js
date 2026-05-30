const fs = require('fs');
const c = fs.readFileSync('type/js/lexicon.js', 'utf8');
let braceCount = 0;
let inString = false;
let stringChar = '';
let line = 1;
let col = 0;
let stack = [];
let problems = [];
for (let i = 0; i < c.length; i++) {
  const ch = c[i];
  col++;
  if (ch === '\n') { line++; col = 0; }
  if (!inString && (ch === "'" || ch === '"')) {
    inString = true;
    stringChar = ch;
  } else if (inString && ch === stringChar && c[i - 1] !== '\\') {
    inString = false;
  }
  if (!inString) {
    if (ch === '{') {
      braceCount++;
      stack.push({ line, col, char: '{' });
    }
    if (ch === '}') {
      braceCount--;
      if (braceCount < 0) {
        problems.push(`UNEXPECTED } at line ${line} col ${col}`);
      }
      if (stack.length) stack.pop();
    }
  }
}
console.log('Final brace count:', braceCount);
console.log('Total lines:', line);
if (stack.length) {
  console.log('Unclosed braces (stack):');
  stack.forEach(s => console.log('  ', s.char, 'at line', s.line, 'col', s.col));
}
if (problems.length) {
  console.log('Problems:');
  problems.forEach(p => console.log('  ', p));
}

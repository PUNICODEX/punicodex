const fs = require('fs');
const c = fs.readFileSync('type/js/lexicon.js', 'utf8');
const lines = c.split('\n');

// Binary search for the line that causes parse error
function checkUpTo(n) {
  const portion = lines.slice(0, n).join('\n') + '\n];\n';
  try {
    new Function(portion + '\nreturn LEXICON;');
    return true;
  } catch (e) {
    return false;
  }
}

let lo = 1, hi = lines.length;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  if (checkUpTo(mid)) {
    lo = mid + 1;
  } else {
    hi = mid;
  }
}

console.log('Syntax error around line:', lo);
for (let i = Math.max(0, lo - 5); i < Math.min(lines.length, lo + 5); i++) {
  console.log(i + 1, lines[i]);
}

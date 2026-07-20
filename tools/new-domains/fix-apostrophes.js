// Finds and escapes unescaped apostrophes inside single-quoted JS strings.
const fs = require('node:fs');
const FILE = process.argv[2];
let src = fs.readFileSync(FILE, 'utf8');
let fixes = 0;
const lines = src.split('\n');
const out = lines.map((line, idx) => {
  // Only consider lines that look like single-quoted string content (not comments)
  if (line.trim().startsWith('//')) return line;
  // Heuristic: a single-quoted string on this line with an odd number of
  // unescaped single quotes likely contains prose apostrophes.
  const unescaped = (line.match(/(?<!\\)'/g) || []).length;
  if (unescaped > 2 && unescaped % 2 === 1) {
    // Escape apostrophes that are word-internal (letter on both sides),
    // except the first and last single-quote on the line (the delimiters).
    const chars = line.split('');
    const quoteIdxs = [];
    chars.forEach((c, i) => {
      if (c === "'" && chars[i - 1] !== '\\') quoteIdxs.push(i);
    });
    const first = quoteIdxs[0];
    const last = quoteIdxs[quoteIdxs.length - 1];
    const nl = chars
      .map((c, i) => {
        if (c === "'" && i !== first && i !== last && /[A-Za-z]/.test(chars[i - 1] || '') && /[A-Za-z]/.test(chars[i + 1] || '')) {
          fixes++;
          return "\\'";
        }
        return c;
      })
      .join('');
    if (nl !== line) console.log(`line ${idx + 1}: escaped ${fixes} apostrophe(s)`);
    return nl;
  }
  return line;
});
fs.writeFileSync(FILE, out.join('\n'), 'utf8');
console.log(`done, ${fixes} apostrophes escaped`);

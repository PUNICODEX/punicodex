const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (['node_modules', '.git', 'build', '.gradle', 'dist'].includes(f)) continue;
      walk(p, out);
    } else if (f.endsWith('.js') && !f.includes('.test.')) {
      out.push(p);
    }
  }
  return out;
}

const files = walk('platform').concat(walk('api'));
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/require\(['"].*db\/operational/.test(src)) continue;
  // find string/template literals passed to operational-style calls
  const re = /\b(all|get|run|query|insert)\(\s*([`"'])([\s\S]*?)\2\s*,?\s*(\[[\s\S]*?\])?/g;
  let m;
  while ((m = re.exec(src))) {
    const sql = m[3];
    const hasQ = sql.includes('?');
    const hasDollar = /\$\d+/.test(sql);
    if (hasQ && /SELECT|INSERT|UPDATE|WHERE|VALUES|JOIN/i.test(sql)) {
      const line = src.slice(0, m.index).split('\n').length;
      console.log(f + ':' + line, JSON.stringify(sql.slice(0, 100)));
    }
  }
}
console.log('audit done');

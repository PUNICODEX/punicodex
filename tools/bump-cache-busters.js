const fs = require('fs');
const glob = require('glob');
const path = require('path');

const root = process.cwd().replace(/\\/g, '/');
const files = glob.sync(`${root}/**/*.html`).filter((f) => !f.includes('.backup'));

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  html = html.replace(/temple-base\.css\?v=perf8/g, 'temple-base.css?v=perf10');
  html = html.replace(/styles\.css\?v=perf3/g, 'styles.css?v=perf5');
  html = html.replace(/temple-base\.css\?v=perf9/g, 'temple-base.css?v=perf10');
  html = html.replace(/styles\.css\?v=perf4/g, 'styles.css?v=perf5');
  if (html !== original) {
    fs.writeFileSync(file, html);
    console.log('bumped', path.relative(root, file));
  }
}

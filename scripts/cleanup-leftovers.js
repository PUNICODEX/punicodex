const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const file = `sites/${site}/index.html`;
  let html = fs.readFileSync(file, 'utf8');

  // Remove standalone </span> lines (leftover from nested span removal inside frame-content)
  html = html.replace(/^\s*<\/span>\s*\n/gm, '');

  fs.writeFileSync(file, html, 'utf8');
  console.log(`Cleaned: ${file}`);
}

console.log('\nDone.');

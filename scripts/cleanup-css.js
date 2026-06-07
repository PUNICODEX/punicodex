const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const cssFile = `sites/${site}/styles.css`;
  let css = fs.readFileSync(cssFile, 'utf8');

  const lines = css.split('\n');
  const cleaned = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines containing target selectors (but not space-reserved)
    if (trimmed.includes('.space-reserve') && !trimmed.includes('.space-reserved')) continue;
    if (trimmed.includes('.space-price') && !trimmed.includes('.space-reserved')) continue;
    if (trimmed.includes('.space-footer') && !trimmed.includes('.space-reserved')) continue;
    // Skip orphaned commas and empty lines that were between removed selectors
    if (trimmed === ',') continue;
    cleaned.push(line);
  }

  css = cleaned.join('\n');

  // Remove empty CSS blocks: selector {\n} or selector {\n\n}
  css = css.replace(/[^{}\s][^{}]*\{\s*\}\n?/g, '');
  // Remove blocks with only whitespace inside
  css = css.replace(/[^{}\s][^{}]*\{\n\s*\}\n?/g, '');

  // Clean up multiple blank lines
  css = css.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`Cleaned CSS: ${cssFile}`);
}

console.log('\nDone.');

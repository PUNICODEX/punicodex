const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  const cssFile = `sites/${site}/styles.css`;

  // ─── HTML ───
  let html = fs.readFileSync(htmlFile, 'utf8');

  // 1. Remove all placeholder text spans
  html = html.replace(/<span class="space-placeholder-text">[^<]*<\/span>\s*/g, '');

  // 2. Extract footer contents using depth tracking (handles nested divs)
  const lines = html.split('\n');
  const footers = [];
  const outLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('<div class="space-footer">')) {
      const footerLines = [];
      let depth = 1;
      i++; // skip opening line

      while (i < lines.length && depth > 0) {
        const inner = lines[i];
        const openDivs = (inner.match(/<div[\s>]/g) || []).length;
        const closeDivs = (inner.match(/<\/div>/g) || []).length;
        depth += openDivs - closeDivs;

        if (depth > 0) {
          footerLines.push(inner.trim());
        }
        i++;
      }

      footers.push(footerLines.filter(Boolean).join('\n'));
      continue;
    }

    outLines.push(line);
    i++;
  }

  html = outLines.join('\n');

  // 3. Insert footer contents into frame-contents in order
  let idx = 0;
  html = html.replace(
    /(<div class="space-frame-content">[\s\S]*?<span class="space-placeholder-logo">◆<\/span>)(\s*<\/div>)/g,
    (match, prefix, suffix) => {
      const content = footers[idx++];
      if (!content) return match;
      const indentMatch = suffix.match(/\n(\s*)<\/div>/);
      const baseIndent = indentMatch ? indentMatch[1] : '                                ';
      const contentIndent = baseIndent + '    ';
      const indented = content.split('\n').map(l => contentIndent + l).join('\n');
      return prefix + '\n' + indented + '\n' + baseIndent + '</div>';
    }
  );

  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log(`HTML: ${htmlFile} (${footers.length} slots)`);

  // ─── CSS ───
  let css = fs.readFileSync(cssFile, 'utf8');

  // 1. Change .space-frame-content to column layout
  css = css.replace(
    /\.space-frame-content \{\n    position: relative;\n    z-index: 1;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0\.75rem;\n    width: 100%;\n    height: 100%;/,
    `.space-frame-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    height: 100%;`
  );

  // 2. Add frame-content price/button styles before .space-frame--hero
  const frameStyles = `
.space-frame-content .space-price {
    font-size: 0.75rem;
    color: var(--text-primary);
}
.space-frame-content .space-price span {
    font-size: 0.6rem;
    opacity: 0.7;
}
.space-frame-content .space-price-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
}
.space-frame-content .space-price-note {
    font-size: 0.55rem;
    color: var(--text-muted);
}
.space-frame-content .space-reserve {
    font-size: 0.65rem;
    padding: 0.4rem 0.8rem;
}
`;
  css = css.replace(
    /(\.space-frame--hero \{)/,
    frameStyles + '$1'
  );

  // 3. Add slot-2 override + compact mobile styles inside @media (max-width: 768px)
  const mobileAdditions = `    .space-row--triple > .space-slot:nth-child(2) {
        flex: 1.8;
    }
    .space-row--quad > .space-slot:nth-child(2) {
        flex: 1.5;
    }
    .space-frame-content {
        gap: 0.15rem;
    }
    .space-frame-content .space-placeholder-logo {
        font-size: 0.7rem;
    }
    .space-frame-content .space-price {
        font-size: 0.5rem;
    }
    .space-frame-content .space-price span {
        font-size: 0.4rem;
    }
    .space-frame-content .space-price-group {
        gap: 0.05rem;
    }
    .space-frame-content .space-price-note {
        font-size: 0.4rem;
    }
    .space-frame-content .space-reserve {
        font-size: 0.45rem;
        padding: 0.15rem 0.4rem;
    }
`;

  const mobileRegex = /@media \(max-width: 768px\) \{([\s\S]*?)(    \.space-footer \{)/;
  css = css.replace(mobileRegex, `@media (max-width: 768px) {$1${mobileAdditions}$2`);

  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`CSS: ${cssFile}`);
}

console.log('\nDone.');

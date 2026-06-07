const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  const cssFile = `sites/${site}/styles.css`;
  const jsFile = `sites/${site}/script.js`;

  // ─── HTML: remove all Reserve buttons from frame-content ───
  let html = fs.readFileSync(htmlFile, 'utf8');
  html = html.replace(/\s*<button type="button" class="space-reserve">Reserve<\/button>\s*/g, '\n');
  // Clean up double newlines
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log(`HTML cleaned: ${htmlFile}`);

  // ─── CSS: remove button styles, add cursor + hover overlay ───
  let css = fs.readFileSync(cssFile, 'utf8');

  // Remove all .space-frame-content .space-reserve rules (including variants)
  css = css.replace(/\.space-frame-content \.space-reserve[\w-]*\s*\{[\s\S]*?\}\n?/g, '');
  // Remove mobile .space-frame-content .space-reserve rule
  css = css.replace(/    \.space-frame-content \.space-reserve[\w-]*\s*\{[\s\S]*?\}\n?/g, '');

  // Insert new styles before .space-frame--hero
  const newStyles = `
/* Frame is the interactive element */
.space-frame {
    cursor: pointer;
}

/* Elegant "Available" hover label */
.space-frame-content::after {
    content: 'Available';
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    font-family: var(--font-display);
    font-size: clamp(0.28rem, 0.7vw, 0.5rem);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(212,175,55,0.5);
    opacity: 0;
    transition: all 0.35s ease;
    pointer-events: none;
    white-space: nowrap;
}
.space-frame:hover .space-frame-content::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    color: rgba(212,175,55,0.75);
}

/* Refined glow on hover */
.space-frame:hover {
    border-color: rgba(212,175,55,0.25);
    box-shadow: 0 0 20px rgba(212,175,55,0.06), inset 0 0 30px rgba(212,175,55,0.03);
}
.space-frame:hover .space-frame-glow {
    opacity: 0.7;
}
`;

  css = css.replace(/(\.space-frame--hero \{)/, newStyles + '$1');
  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`CSS updated: ${cssFile}`);

  // ─── JS: update slot UI and click handlers ───
  let js = fs.readFileSync(jsFile, 'utf8');

  // 1. In updateSlotUI: remove btn references
  js = js.replace(
    /const btn = slotEl\.querySelector\('\.space-reserve'\);\n(\s*)const frame = slotEl\.querySelector\('\.space-frame'\);\n(\s*)const meta = slotEl\.querySelector\('\.space-meta'\);\n(\s*)if \(!btn \|\| !frame\) return;/g,
    "const frame = slotEl.querySelector('.space-frame');\n$1const meta = slotEl.querySelector('.space-meta');\n$2if (!frame) return;"
  );

  // 2. In live slot block: remove btn.style.display = 'none';
  js = js.replace(
    /btn\.style\.display = 'none';\n(\s*)const pixelUrl = /g,
    "const pixelUrl = "
  );

  // 3. In reserved slot block: remove btn.style.display = 'none';
  js = js.replace(
    /btn\.style\.display = 'none';\n(\s*)const overlay = document\.createElement\('div'\);/g,
    "const overlay = document.createElement('div');"
  );

  // 4. In available block: remove btn.style.display = '';
  js = js.replace(
    /btn\.style\.display = '';\n(\s*)const badge = slotEl\.querySelector\('\.space-reserved-badge'\);/g,
    "const badge = slotEl.querySelector('.space-reserved-badge');"
  );

  // 5. Update default restore content: remove "Your Brand Here" text
  js = js.replace(
    /<span class="space-placeholder-text">Your Brand Here<\/span>/g,
    ''
  );

  // 6. Replace button click handler with frame click handler
  js = js.replace(
    /\/\/ Event: Reserve button clicks\ndocument\.querySelectorAll\('\.space-reserve'\)\.forEach\(btn => \{\n\s*btn\.addEventListener\('click', \(e\) => \{\n\s*const slotEl = e\.target\.closest\('\.space-slot'\);\n\s*if \(!slotEl\) return;\n\s*const slotId = parseInt\(slotEl\.dataset\.space, 10\);\n\s*openModal\(slotId\);\n\s*\}\);\n\}\);/,
    "// Event: Click anywhere on an available frame to open booking\ndocument.querySelectorAll('.space-frame').forEach(frame => {\n  frame.addEventListener('click', (e) => {\n    // Don't intercept clicks on live ad links\n    if (e.target.closest('a.space-live-ad')) return;\n    const slotEl = e.target.closest('.space-slot');\n    if (!slotEl) return;\n    const slotId = parseInt(slotEl.dataset.space, 10);\n    openModal(slotId);\n  });\n});"
  );

  fs.writeFileSync(jsFile, js, 'utf8');
  console.log(`JS updated: ${jsFile}`);
}

console.log('\nDone.');

const fs = require('fs');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  const cssFile = `sites/${site}/styles.css`;

  // ─── HTML: remove price spans & price-group divs from frame-content ───
  let html = fs.readFileSync(htmlFile, 'utf8');

  // Remove <span class="space-price">...</span> inside frame-content
  html = html.replace(/<span class="space-price[^"]*">[\s\S]*?<\/span>\s*/g, '');

  // Remove <div class="space-price-group">...</div> inside frame-content
  html = html.replace(/<div class="space-price-group">[\s\S]*?<\/div>\s*/g, '');

  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log(`HTML: ${htmlFile}`);

  // ─── CSS: remove price styles, rewrite reserve button for elite look ───
  let css = fs.readFileSync(cssFile, 'utf8');

  // Remove .space-frame-content .space-price rules
  css = css.replace(/\.space-frame-content \.space-price \{[\s\S]*?\}\n?/g, '');
  css = css.replace(/\.space-frame-content \.space-price span \{[\s\S]*?\}\n?/g, '');
  css = css.replace(/\.space-frame-content \.space-price-group \{[\s\S]*?\}\n?/g, '');
  css = css.replace(/\.space-frame-content \.space-price-note \{[\s\S]*?\}\n?/g, '');

  // Remove old .space-frame-content .space-reserve rules
  css = css.replace(/\.space-frame-content \.space-reserve \{[\s\S]*?\}\n?/g, '');

  // Remove old mobile .space-frame-content .space-reserve rule
  css = css.replace(/    \.space-frame-content \.space-reserve \{[\s\S]*?\}\n?/g, '');

  // New elite button styles (insert before .space-frame--hero)
  const eliteStyles = `
/* Elite reserve button inside frame */
.space-frame-content .space-reserve,
.space-frame-content .space-reserve--throne {
    position: relative;
    z-index: 10;
    pointer-events: auto;
    font-family: var(--font-display);
    font-size: clamp(0.45rem, 1.1vw, 0.75rem);
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--void-deep);
    background: linear-gradient(135deg, var(--classic-gold), rgba(212,175,55,0.88));
    border: 1px solid rgba(212,175,55,0.5);
    border-radius: 2px;
    padding: clamp(0.25rem, 0.7vw, 0.55rem) clamp(0.5rem, 1.3vw, 1rem);
    cursor: pointer;
    transition: all 0.25s ease;
    white-space: nowrap;
    box-shadow: 0 1px 6px rgba(212,175,55,0.2);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.space-frame-content .space-reserve:hover,
.space-frame-content .space-reserve--throne:hover {
    background: linear-gradient(135deg, rgba(232,195,75,1), var(--classic-gold));
    box-shadow: 0 3px 14px rgba(212,175,55,0.4);
    transform: translateY(-1px);
    border-color: rgba(212,175,55,0.8);
}
.space-frame-content .space-reserve:active,
.space-frame-content .space-reserve--throne:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(212,175,55,0.25);
}

/* Frame-type specific button sizing */
.space-frame--hero .space-reserve,
.space-frame--throne .space-reserve {
    font-size: clamp(0.55rem, 1.4vw, 0.9rem);
    padding: clamp(0.35rem, 0.9vw, 0.7rem) clamp(0.7rem, 1.8vw, 1.3rem);
    letter-spacing: 0.2em;
}
.space-frame--column .space-reserve {
    font-size: clamp(0.45rem, 1.2vw, 0.75rem);
    padding: clamp(0.3rem, 0.8vw, 0.6rem) clamp(0.55rem, 1.4vw, 1rem);
}
.space-frame--inline .space-reserve,
.space-frame--content .space-reserve,
.space-frame--half .space-reserve {
    font-size: clamp(0.4rem, 1vw, 0.7rem);
    padding: clamp(0.2rem, 0.6vw, 0.5rem) clamp(0.45rem, 1.2vw, 0.9rem);
}
.space-frame--ribbon .space-reserve,
.space-frame--badge .space-reserve,
.space-frame--text .space-reserve,
.space-frame--emblem .space-reserve,
.space-frame--footer .space-reserve {
    font-size: clamp(0.3rem, 0.8vw, 0.55rem);
    padding: clamp(0.12rem, 0.4vw, 0.35rem) clamp(0.3rem, 0.9vw, 0.7rem);
    letter-spacing: 0.1em;
}
`;

  css = css.replace(
    /(\.space-frame--hero \{)/,
    eliteStyles + '$1'
  );

  // Update mobile button styles
  const mobileButtonStyles = `    .space-frame-content .space-reserve,
    .space-frame-content .space-reserve--throne {
        font-size: clamp(0.35rem, 1.8vw, 0.55rem);
        padding: clamp(0.15rem, 0.8vw, 0.4rem) clamp(0.3rem, 1.5vw, 0.7rem);
        letter-spacing: 0.1em;
        min-height: 28px;
        min-width: 44px;
    }
`;

  // Replace the old mobile .space-reserve block
  const mobileRegex = /@media \(max-width: 768px\) \{([\s\S]*?)(    \.space-footer \{)/;
  css = css.replace(mobileRegex, `@media (max-width: 768px) {$1${mobileButtonStyles}$2`);

  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`CSS: ${cssFile}`);
}

console.log('\nDone.');

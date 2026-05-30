/**
 * Fix horizontal overflow on mobile caused by mascot images
 * with `width: auto` but no `max-width` constraint.
 */

const fs = require('fs');
const path = require('path');

const TARGET_CLASSES = ['.mascot-img', '.pantheon-mascot-img'];

function fixCss(css, site) {
  let changed = false;
  let newCss = css;

  for (const cls of TARGET_CLASSES) {
    // Match the rule block: .class { ... }
    const re = new RegExp(
      `(${cls.replace('.', '\\.')})\\s*\\{([^}]*)\\}`,
      'gs'
    );

    newCss = newCss.replace(re, (match, className, ruleBody) => {
      // Check if it has width: auto but no max-width
      const hasWidthAuto = /width:\s*auto/.test(ruleBody);
      const hasMaxWidth = /max-width/.test(ruleBody);

      if (hasWidthAuto && !hasMaxWidth) {
        changed = true;
        console.log(`  [FIXED] ${site}: ${className} - added max-width: 100%`);
        // Add max-width: 100%; right after width: auto
        return match.replace(
          /(width:\s*auto\s*;?)/,
          '$1\n    max-width: 100%;'
        );
      }
      return match;
    });
  }

  return { css: newCss, changed };
}

console.log('='.repeat(60));
console.log('MOBILE OVERFLOW FIX');
console.log('='.repeat(60));

const sitesDir = path.join(__dirname, '..', 'sites');
const sites = fs.readdirSync(sitesDir).filter(d => {
  const p = path.join(sitesDir, d, 'styles.css');
  return fs.existsSync(p);
});

let totalChanged = 0;
let totalRules = 0;

for (const site of sites.sort()) {
  const cssPath = path.join(sitesDir, site, 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const { css: newCss, changed } = fixCss(css, site);

  if (changed) {
    fs.writeFileSync(cssPath, newCss, 'utf-8');
    totalChanged++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Fixed ${totalChanged} temples`);
console.log('='.repeat(60));

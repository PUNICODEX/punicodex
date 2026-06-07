const fs = require('fs');
const cheerio = require('cheerio');

const sites = ['nike', 'hermes', 'ra'];

for (const site of sites) {
  const htmlFile = `sites/${site}/index.html`;
  const cssFile = `sites/${site}/styles.css`;
  
  // ─── HTML TRANSFORM ───
  let html = fs.readFileSync(htmlFile, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  
  $('.space-slot').each(function() {
    const $slot = $(this);
    const $frameContent = $slot.find('.space-frame-content').first();
    const $footer = $slot.find('.space-footer').first();
    
    if (!$frameContent.length || !$footer.length) return;
    
    // Remove placeholder text
    $frameContent.find('.space-placeholder-text').remove();
    
    // Extract price and reserve from footer
    const $price = $footer.find('.space-price').first().clone();
    const $priceGroup = $footer.find('.space-price-group').first().clone();
    const $reserve = $footer.find('.space-reserve').first().clone();
    
    // Add price into frame-content (prefer price-group for throne)
    if ($priceGroup.length) {
      $frameContent.append($priceGroup);
    } else if ($price.length) {
      $frameContent.append($price);
    }
    
    // Add reserve button/link into frame-content
    if ($reserve.length) {
      $frameContent.append($reserve);
    }
    
    // Remove footer entirely
    $footer.remove();
  });
  
  // Serialize back — cheerio strips self-closing on some tags, so fix them
  let out = $.html();
  // Preserve exact original for non-slot areas: replace the spaces-section only
  // Actually cheerio rewrites the whole doc. Let's use a targeted regex instead
  // to only replace the spaces-section.
  
  // Re-read original and splice in the modified section
  const original = fs.readFileSync(htmlFile, 'utf8');
  const modifiedSection = $('#spaces').html();
  if (modifiedSection) {
    const sectionRegex = /(<section class="section spaces-section" id="spaces">)[\s\S]*?(<\/section>)/;
    out = original.replace(sectionRegex, `$1\n${modifiedSection}\n$2`);
  } else {
    out = original;
  }
  
  fs.writeFileSync(htmlFile, out, 'utf8');
  console.log(`HTML updated: ${htmlFile}`);
  
  // ─── CSS TRANSFORM ───
  let css = fs.readFileSync(cssFile, 'utf8');
  
  // 1. Change .space-frame-content to column layout globally
  css = css.replace(
    /\.space-frame-content \{\n    position: relative;\n    z-index: 1;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 0\.75rem;\n    width: 100%;\n    height: 100%;\n\}/g,
    `.space-frame-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    height: 100%;
}`
  );
  
  // 2. Add styles for price/button inside frame-content
  const frameContentStyles = `
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
  
  // Insert before the first space-frame--hero rule
  css = css.replace(
    /(\.space-frame--hero \{)/,
    frameContentStyles + '$1'
  );
  
  // 3. Add slot-2 flex override inside mobile breakpoint
  const slot2Override = `    .space-row--triple > .space-slot:nth-child(2) {
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
  
  // Find the mobile breakpoint and insert the override before the closing }
  const mobileRegex = /@media \(max-width: 768px\) \{([\s\S]*?)(    \.space-footer \{)/;
  css = css.replace(mobileRegex, `@media (max-width: 768px) {$1${slot2Override}$2`);
  
  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`CSS updated: ${cssFile}`);
}

console.log('\nAll sites transformed.');

const fs = require('fs');

// 1. Fix CSS: add --nav-height, replace remaining emerald colors
let css = fs.readFileSync('sites/ra/styles.css', 'utf8');

// Add --nav-height after the first :root block
css = css.replace(
  /:root \{\n    --egypt-gold: #C9A227;/g,
  ':root {\n    --nav-height: 72px;\n    --egypt-gold: #C9A227;'
);

// Replace remaining emerald colors
css = css.replace(/#0f1f1a/g, '#0A0806');
css = css.replace(/rgba\(14,26,20,/g, 'rgba(10,8,6,');
css = css.replace(/rgba\(8,15,10,/g, 'rgba(8,6,4,');
css = css.replace(/rgba\(27,58,58,0\.3\)/g, 'rgba(26,24,20,0.3)');
css = css.replace(/rgba\(10,18,10,0\.5\)/g, 'rgba(10,8,6,0.5)');

fs.writeFileSync('sites/ra/styles.css', css, 'utf8');
console.log('Fixed CSS colors and nav-height');

// 2. Fix gallery placeholder text and gradients
let gal = fs.readFileSync('sites/ra/gallery/index.html', 'utf8');

// Fix gradients
gal = gal.replace(/rgba\(27,58,58,0\.3\)/g, 'rgba(26,24,20,0.3)');
gal = gal.replace(/rgba\(10,18,10,0\.5\)/g, 'rgba(10,8,6,0.5)');

// Fix placeholder labels - Egyptian themed
gal = gal.replace(/Praxiteles' Ra/g, 'Solar Barge');
gal = gal.replace(/Ra Psychopomp/g, 'Falcon of Horus');
gal = gal.replace(/The Caduceus/g, 'The Scarab');
gal = gal.replace(/Ra & Argus/g, 'Ra & Apep');
gal = gal.replace(/The Herm/g, 'The Obelisk');
gal = gal.replace(/Ra & Pandora/g, 'Ra & Maat');

fs.writeFileSync('sites/ra/gallery/index.html', gal, 'utf8');
console.log('Fixed gallery placeholders');

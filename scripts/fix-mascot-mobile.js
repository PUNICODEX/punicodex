const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Group 1: Sites with max-height: 80vh pattern on .mascot-img
const group1 = [
  'aphrodite','apollon','ares','athena','atlas','chaos','delphoi','hades',
  'hephaistos','hera','hermes','hestia','jotunheimr','medousa','midgardr',
  'olympos','persephone','poseidon','prometheus','ragnarok','zeus'
];

// Group 2: Sites that hide .hero-mascot on mobile
const group2 = ['helios','ker','odinn','ra','selene','thor'];

const MOBILE_MASCOT_RULES = `
    .hero-mascot {
        order: -1;
    }
    .mascot-img {
        max-width: 320px;
    }
    .pantheon-mascot {
        order: -1;
    }
    .pantheon-mascot-img {
        max-width: 280px;
    }`;

function fixMascotSizing(css) {
  // Replace .mascot-img block: max-height: 80vh; width: auto; max-width: 100%; -> width: 100%; max-width: 480px; height: auto;
  return css.replace(
    /(\s*\.mascot-img\s*\{[\s\S]*?)(max-height:\s*80vh;\s*)(width:\s*auto;\s*)(max-width:\s*100%;\s*)([\s\S]*?\})/,
    (match, before, maxHeight, width, maxWidth, after) => {
      return before + 'width: 100%;\n    ' + 'max-width: 480px;\n    ' + 'height: auto;\n    ' + after;
    }
  );
}

function fixPantheonMascotSizing(css) {
  // Replace .pantheon-mascot-img block: max-height: 500px; width: auto; max-width: 100%; -> width: 100%; max-width: 480px; height: auto;
  return css.replace(
    /(\s*\.pantheon-mascot-img\s*\{[\s\S]*?)(max-height:\s*500px;\s*)(width:\s*auto;\s*)(max-width:\s*100%;\s*)([\s\S]*?\})/,
    (match, before, maxHeight, width, maxWidth, after) => {
      return before + 'width: 100%;\n    ' + 'max-width: 480px;\n    ' + 'height: auto;\n    ' + after;
    }
  );
}

function addMobileMascotRules(css) {
  // Find @media (max-width: 1024px) block and add mascot rules if not present
  const mediaRegex = /@media\s*\(\s*max-width:\s*1024px\s*\)\s*\{([\s\S]*?)\n\}/;
  const match = css.match(mediaRegex);
  if (!match) return css;
  
  const mediaContent = match[1];
  let additions = [];
  
  if (!mediaContent.includes('.hero-mascot')) {
    additions.push('    .hero-mascot {\n        order: -1;\n    }');
  }
  if (!mediaContent.includes('.mascot-img')) {
    additions.push('    .mascot-img {\n        max-width: 320px;\n    }');
  }
  if (!mediaContent.includes('.pantheon-mascot')) {
    additions.push('    .pantheon-mascot {\n        order: -1;\n    }');
  }
  if (!mediaContent.includes('.pantheon-mascot-img')) {
    additions.push('    .pantheon-mascot-img {\n        max-width: 280px;\n    }');
  }
  
  if (additions.length === 0) return css;
  
  // Insert before the closing } of the media query
  // We need to find the exact position of the media query's closing brace
  const startIdx = match.index;
  let braceCount = 0;
  let insertIdx = startIdx;
  for (let i = startIdx; i < css.length; i++) {
    if (css[i] === '{') braceCount++;
    else if (css[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        insertIdx = i;
        break;
      }
    }
  }
  
  const additionStr = '\n' + additions.join('\n');
  return css.slice(0, insertIdx) + additionStr + css.slice(insertIdx);
}

function fixGroup2(css) {
  // Replace display: none with order: -1 for hero-mascot and pantheon-mascot in media query
  let newCss = css;
  
  // Find @media (max-width: 1024px) block
  const mediaRegex = /@media\s*\(\s*max-width:\s*1024px\s*\)\s*\{([\s\S]*?)\n\}/;
  const match = newCss.match(mediaRegex);
  if (!match) return newCss;
  
  let mediaContent = match[1];
  let modified = false;
  
  // Replace .hero-mascot { display: none; } with .hero-mascot { order: -1; }
  if (mediaContent.includes('.hero-mascot') && mediaContent.includes('display: none')) {
    mediaContent = mediaContent.replace(
      /(\.hero-mascot\s*\{\s*)display:\s*none;(\s*\})/,
      '$1order: -1;$2'
    );
    modified = true;
  }
  
  // Replace .pantheon-mascot { display: none; } with .pantheon-mascot { order: -1; }
  if (mediaContent.includes('.pantheon-mascot') && mediaContent.includes('display: none')) {
    mediaContent = mediaContent.replace(
      /(\.pantheon-mascot\s*\{\s*)display:\s*none;(\s*\})/,
      '$1order: -1;$2'
    );
    modified = true;
  }
  
  if (!modified) return newCss;
  
  // Rebuild the CSS with modified media query content
  const startIdx = match.index;
  let braceCount = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < newCss.length; i++) {
    if (newCss[i] === '{') braceCount++;
    else if (newCss[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  
  newCss = newCss.slice(0, startIdx) + '@media (max-width: 1024px) {' + mediaContent + '\n}' + newCss.slice(endIdx + 1);
  
  // Now add mobile mascot rules
  return addMobileMascotRules(newCss);
}

function fixSite(id, group) {
  const siteDir = path.join(ROOT, 'sites', id);
  const cssPath = path.join(siteDir, 'styles.css');
  
  if (!fs.existsSync(cssPath)) {
    console.log(`  SKIP: ${id} - no styles.css`);
    return false;
  }
  
  let css = fs.readFileSync(cssPath, 'utf8');
  let original = css;
  
  if (group === 1) {
    css = fixMascotSizing(css);
    css = fixPantheonMascotSizing(css);
    css = addMobileMascotRules(css);
  } else if (group === 2) {
    css = fixGroup2(css);
  }
  
  if (css !== original) {
    fs.writeFileSync(cssPath, css);
    console.log(`  FIXED: ${id}`);
    return true;
  } else {
    console.log(`  NO CHANGE: ${id}`);
    return false;
  }
}

// Run fixes
console.log('=== FIXING GROUP 1 (max-height: 80vh pattern) ===');
let group1Fixed = 0;
for (const id of group1) {
  if (fixSite(id, 1)) group1Fixed++;
}

console.log('\n=== FIXING GROUP 2 (display: none on mobile) ===');
let group2Fixed = 0;
for (const id of group2) {
  if (fixSite(id, 2)) group2Fixed++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Group 1 fixed: ${group1Fixed}/${group1.length}`);
console.log(`Group 2 fixed: ${group2Fixed}/${group2.length}`);

const fs = require('fs');
const path = require('path');

const sitesDir = path.join(__dirname, '..', 'sites');

const norseNames = {
  alfheimr: 'Álfheimr',
  helheimr: 'Helheimr',
  jotunheimr: 'Jötunheimr',
  midgardr: 'Miðgarðr',
  muspellheimr: 'Muspellheimr',
  odinn: 'Óðinn',
  ragnarok: 'Ragnarǫk',
  thor: 'Þórr',
};

// Fix footer Original Script placeholders in index.html files
let fixedFooters = 0;
for (const [siteId, name] of Object.entries(norseNames)) {
  const filePath = path.join(sitesDir, siteId, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  html = html.replace(/<span class="footer-value">—<\/span>/g, `<span class="footer-value">${name}</span>`);
  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    fixedFooters++;
    console.log(`Fixed footer for ${siteId}`);
  }
}

// Rename thor logo files from thorr_* to thor_* to match existing HTML references
const thorAssetsDir = path.join(sitesDir, 'thor', 'assets');
if (fs.existsSync(thorAssetsDir)) {
  const renames = [
    ['thorr_logolockup.png', 'thor_logolockup.png'],
    ['thorr_logolockup.webp', 'thor_logolockup.webp'],
    ['thorr_logomark.png', 'thor_logomark.png'],
    ['thorr_logomark.webp', 'thor_logomark.webp'],
  ];
  for (const [oldName, newName] of renames) {
    const oldPath = path.join(thorAssetsDir, oldName);
    const newPath = path.join(thorAssetsDir, newName);
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed ${oldName} -> ${newName}`);
    }
  }
}

// Fix the thor lore page reference that still uses thorr_logomark
const thorLorePath = path.join(sitesDir, 'thor', 'lore', 'index.html');
if (fs.existsSync(thorLorePath)) {
  let loreHtml = fs.readFileSync(thorLorePath, 'utf8');
  const loreOriginal = loreHtml;
  loreHtml = loreHtml.replace(/thorr_logomark/g, 'thor_logomark');
  if (loreHtml !== loreOriginal) {
    fs.writeFileSync(thorLorePath, loreHtml, 'utf8');
    console.log('Fixed thorr_logomark reference in thor lore');
  }
}

console.log(`\nFixed ${fixedFooters} footers.`);

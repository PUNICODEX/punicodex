const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'archetypes-v2.js');
let content = fs.readFileSync(filePath, 'utf8');

// Map IDs to their original-script value (replaces greek: "—")
const originalScriptMap = {
  // Norse — use the Old Norse form (same as name)
  alfheimr: 'Álfheimr',
  helheimr: 'Helheimr',
  jotunheimr: 'Jötunheimr',
  midgardr: 'Miðgarðr',
  muspellheimr: 'Muspellheimr',
  odinn: 'Óðinn',
  ragnarok: 'Ragnarǫk',
  thor: 'Þórr',
  // Egyptian — use the transliterated form (same as name)
  maat: 'Mꜣ',
  maa: 'Mꜥ',
  ra: 'Rꜥ',
  sia: 'Sꜥ',
  shu: 'Šw',
  ab: 'ꜣb',
  akh: 'ꜣḫ',
  // Sanskrit / Hindu
  shiva: 'शिव',
};

for (const [id, script] of Object.entries(originalScriptMap)) {
  // Match the block for this ID and replace greek: "—" inside it
  const re = new RegExp(
    `(id: "${id}"[\\s\\S]{0,400}?)greek: "—"`,
    'g'
  );
  content = content.replace(re, `$1greek: "${script}"`);
}

// Fix thor asset paths that still reference thorr_*
content = content.replace(/\/sites\/thor\/assets\/thorr_mascot\.webp/g, '/sites/thor/assets/thor_mascot.webp');
content = content.replace(/\/sites\/thor\/assets\/thorr_logomark\.webp/g, '/sites/thor/assets/thor_logomark.webp');

fs.writeFileSync(filePath, content, 'utf8');

// Verify
const remaining = (content.match(/greek: "—"/g) || []).length;
console.log(`Remaining greek: "—" placeholders: ${remaining}`);
console.log('Thor paths updated:', !content.includes('thorr_mascot') && !content.includes('thorr_logomark'));

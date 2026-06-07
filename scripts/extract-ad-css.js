const fs = require('fs');

const hermesCss = fs.readFileSync('sites/hermes/styles.css', 'utf8').split('\n');
const raCss = fs.readFileSync('sites/ra/styles.css', 'utf8');

// Sections to extract from Hermes CSS (0-indexed lines)
const sections = [
  { start: 1476, end: 1503, name: 'TAB NAVIGATION' },        // lines 1477-1504
  { start: 1503, end: 1594, name: 'AD ZONES' },              // lines 1504-1595
  { start: 2037, end: 2088, name: 'GALLERY' },               // lines 2038-2089
  { start: 2137, end: 2494, name: 'HOME / LEASE PAGE' },     // lines 2138-2495
  { start: 2518, end: 2578, name: 'ENDORSEMENT HERO' },      // lines 2519-2579
  { start: 2668, end: 2716, name: 'HOW IT WORKS' },          // lines 2669-2717
  { start: 2724, end: 2940, name: 'TEMPLATE SLOTS' },        // lines 2725-2941
  { start: 2992, end: 3309, name: '12 SACRED SPACES' },      // lines 2993-3310
  { start: 3395, end: 3834, name: 'BOOKING MODAL' },         // lines 3396-3835
];

let extracted = '\n\n/* ===== RA ADVERTISING STYLES (from Hermès template) ===== */\n';

for (const sec of sections) {
  const lines = hermesCss.slice(sec.start, sec.end + 1);
  extracted += '\n/* ===== ' + sec.name + ' ===== */\n';
  extracted += lines.join('\n') + '\n';
}

// Color replacements: Hermès emerald → Ra Egyptian
extracted = extracted.replace(/#0a1f15/g, '#0A0806');
extracted = extracted.replace(/#0e1a1a/g, '#0E0C0A');
extracted = extracted.replace(/#1B3A3A/g, '#1A1814');
extracted = extracted.replace(/#D4941E/g, '#D4AF37');
extracted = extracted.replace(/#32CD32/g, '#D4AF37');

fs.writeFileSync('sites/ra/styles.css', raCss + extracted, 'utf8');
console.log('Appended ' + sections.length + ' ad CSS sections to sites/ra/styles.css');

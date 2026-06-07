const fs = require('fs');
const content = fs.readFileSync('sites/ra/index.html', 'utf8');
const lines = content.split('\n');
let found = 0;
lines.forEach((line, i) => {
  if (line.includes('—')) {
    const trimmed = line.trim();
    // Skip known good patterns
    if (trimmed.includes('Rꜥ — Ra') || trimmed.includes('rꜥ —') || trimmed.includes('form —') || 
        trimmed.includes('sky —') || trimmed.includes('itself —') || trimmed.includes('creator —') ||
        trimmed.includes('night —') || trimmed.includes('horizon —') || trimmed.includes('god —') ||
        trimmed.includes('brow —') || trimmed.includes('sun —') || trimmed.includes('life —') ||
        trimmed.includes('Nun —') || trimmed.includes('trill —') || trimmed.includes('fricative —') ||
        trimmed.includes('"RAH-ah" —') || trimmed.includes('pharyngeal fricative —') ||
        trimmed.includes('Coptic') || trimmed.includes('Phoenician') || trimmed.includes('Hebrew') ||
        trimmed.includes('Egyptian aleph —') || trimmed.includes('creation itself.')) {
      return;
    }
    // Check for likely placeholders
    if (trimmed.includes('shrine to —') || trimmed.includes('"name": "—"') || trimmed.includes('—.com') ||
        trimmed.includes('>— ') || trimmed.includes('of —,') || trimmed.includes('of —.') ||
        trimmed.includes('— himself') || trimmed.includes('— holds') || trimmed.includes('Eye of —') ||
        trimmed.includes('form of —') || trimmed.includes('beginning, —') || trimmed.includes('But —')) {
      console.log('Line ' + (i+1) + ': ' + trimmed.substring(0, 100));
      found++;
    }
  }
});
console.log(found > 0 ? 'Found ' + found + ' potential placeholders.' : 'No remaining placeholders.');

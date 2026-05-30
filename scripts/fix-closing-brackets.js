const fs = require('fs');
let content = fs.readFileSync('type/js/lexicon.js', 'utf8');
const fixes = ['diancecht','hiiaka','babayaga','zmeygorynych','spentamainyu','vohumanah','ashavahishta','khshathravairya','spentaarmaiti'];

for (const id of fixes) {
  const marker = "id: '" + id + "',";
  const idx = content.indexOf(marker);
  if (idx === -1) {
    console.log('Not found: ' + id);
    continue;
  }
  // Find the closing of the previous entry
  const prevEntryEnd = content.lastIndexOf('},', idx);
  if (prevEntryEnd === -1) continue;
  
  // Check if there's a ] between prevEntryEnd and idx
  const textBetween = content.substring(prevEntryEnd + 2, idx);
  if (!textBetween.includes(']')) {
    // Insert ] before },
    content = content.substring(0, prevEntryEnd) + '\n    ]\n  }' + content.substring(prevEntryEnd + 2);
    console.log('Fixed ' + id);
  } else {
    console.log('Already OK: ' + id);
  }
}

fs.writeFileSync('type/js/lexicon.js', content);
console.log('Done');

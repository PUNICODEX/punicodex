const fs = require('fs');
const path = require('path');

// Load current lexicon
const c = fs.readFileSync('type/js/lexicon.js', 'utf8');
const w = c + '\nmodule.exports = LEXICON;';
fs.writeFileSync(path.join(__dirname, '_t.js'), w);
const lex = require(path.join(__dirname, '_t.js'));
fs.unlinkSync(path.join(__dirname, '_t.js'));

// Filter out undefined
const clean = lex.filter(e => e != null);
console.log('Cleaned: ' + clean.length + ' entries');

// Regenerate file
const entriesJs = clean.map(e => {
  const src = e.sources.map(s => {
    if (s.includes("'")) return '"' + s.replace(/"/g, '\\"') + '"';
    return "'" + s + "'";
  }).join(', ');
  
  const bd = e.breakdown.map(b => {
    const note = b.note.replace(/'/g, "\\'");
    return `      { char: '${b.char}', to: '${b.to}', type: '${b.type}', note: '${note}' }`;
  }).join(',\n');
  
  const meaning = e.meaning.includes("'") ? `"${e.meaning.replace(/"/g, '\\"')}"` : `'${e.meaning}'`;
  const domain = e.domain.includes("'") ? `"${e.domain.replace(/"/g, '\\"')}"` : `'${e.domain}'`;
  
  return `  {
    id: '${e.id}',
    ascii: '${e.ascii}',
    unicode: '${e.unicode}',
    greek: '${e.greek}',
    pantheon: '${e.pantheon}',
    tier: '${e.tier}',
    tierLabel: '${e.tierLabel}',
    domain: ${domain},
    meaning: ${meaning},
    sources: [${src}],
    breakdown: [
${bd}
    ]
  }`;
}).join(',\n');

const newContent = `/*
 * PUNICODEX Lexicon
 * ${clean.length} validated entries across 14 pantheons
 */

const LEXICON = [
${entriesJs}
];

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LEXICON };
}
`;

fs.writeFileSync('type/js/lexicon.js', newContent);
console.log('Written: ' + clean.length + ' entries');

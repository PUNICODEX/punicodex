/**
 * Apply expansion batch to lexicon
 * 1. Load existing lexicon
 * 2. Load batch data
 * 3. Check for duplicates (id, ascii, unicode)
 * 4. Generate entries with breakdowns
 * 5. Append to lexicon
 * 6. Run validation
 * 7. Rebuild database
 */

const fs = require('fs');
const path = require('path');
const { generateEntry } = require('./generate-entries');
const BATCH_DATA = require('./expansion-batch');

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const DB_INIT_PATH = path.join(__dirname, '..', 'platform', 'db', 'init.js');
const VALIDATE_PATH = path.join(__dirname, '..', 'type', 'js', 'validate.js');

// Load existing lexicon
function loadExistingLexicon() {
  const content = fs.readFileSync(LEXICON_PATH, 'utf8');
  const wrapped = content + '\nmodule.exports = LEXICON;';
  const tempPath = path.join(__dirname, '_temp_existing_lex.js');
  fs.writeFileSync(tempPath, wrapped);
  const lex = require(tempPath);
  fs.unlinkSync(tempPath);
  return lex;
}

function main() {
  console.log('=== PUNYCODEX Lexicon Expansion ===\n');
  
  // 1. Load existing
  const existing = loadExistingLexicon();
  console.log(`Existing entries: ${existing.length}`);
  
  const existingIds = new Set(existing.map(e => e.id));
  const existingAscii = new Set(existing.map(e => e.ascii));
  const existingUnicode = new Set(existing.map(e => e.unicode));
  
  // 2. Check batch for duplicates
  const newEntries = [];
  const batchIds = new Set();
  const batchAscii = new Set();
  const batchUnicode = new Set();
  
  let skipped = 0;
  
  for (const data of BATCH_DATA) {
    // Check against existing
    if (existingIds.has(data.id)) {
      console.log(`SKIP (existing id): ${data.id}`);
      skipped++;
      continue;
    }
    if (existingAscii.has(data.ascii)) {
      console.log(`SKIP (existing ascii): ${data.ascii}`);
      skipped++;
      continue;
    }
    if (existingUnicode.has(data.unicode)) {
      console.log(`SKIP (existing unicode): ${data.unicode}`);
      skipped++;
      continue;
    }
    
    // Check against batch itself
    if (batchIds.has(data.id)) {
      console.log(`SKIP (batch duplicate id): ${data.id}`);
      skipped++;
      continue;
    }
    if (batchAscii.has(data.ascii)) {
      console.log(`SKIP (batch duplicate ascii): ${data.ascii}`);
      skipped++;
      continue;
    }
    if (batchUnicode.has(data.unicode)) {
      console.log(`SKIP (batch duplicate unicode): ${data.unicode}`);
      skipped++;
      continue;
    }
    
    batchIds.add(data.id);
    batchAscii.add(data.ascii);
    batchUnicode.add(data.unicode);
    
    // Generate entry
    try {
      const entry = generateEntry(data);
      newEntries.push(entry);
    } catch (e) {
      console.error(`ERROR generating ${data.id}: ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\nNew entries to add: ${newEntries.length}`);
  console.log(`Skipped: ${skipped}`);
  
  if (newEntries.length === 0) {
    console.log('Nothing to add. Exiting.');
    return;
  }
  
  // 3. Append to lexicon file
  const lexiconContent = fs.readFileSync(LEXICON_PATH, 'utf8');
  
  // Find the last entry's closing brace and the final ]; 
  const lastBraceIdx = lexiconContent.lastIndexOf('},');
  if (lastBraceIdx === -1) {
    console.error('Could not find last entry in lexicon');
    process.exit(1);
  }
  
  // Insert new entries after the last },
  const newEntriesJs = newEntries.map(e => {
    return `  {
    id: '${e.id}',
    ascii: '${e.ascii}',
    unicode: '${e.unicode}',
    greek: '${e.greek}',
    pantheon: '${e.pantheon}',
    tier: '${e.tier}',
    tierLabel: '${e.tierLabel}',
    domain: '${e.domain}',
    meaning: '${e.meaning}',
    sources: [${e.sources.map(s => `'${s}'`).join(', ')}],
    breakdown: [
${e.breakdown.map(b => `      { char: '${b.char}', to: '${b.to}', type: '${b.type}', note: '${b.note.replace(/'/g, "\\'")}' }`).join(',\n')}
    ]
  }`;
  }).join(',\n');
  
  const insertPos = lastBraceIdx + 2;
  const newContent = lexiconContent.slice(0, insertPos) + ',\n' + newEntriesJs + lexiconContent.slice(insertPos);
  
  // Backup existing
  const backupPath = LEXICON_PATH + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, lexiconContent);
  console.log(`\nBackup saved: ${backupPath}`);
  
  fs.writeFileSync(LEXICON_PATH, newContent);
  console.log(`Updated lexicon: ${LEXICON_PATH}`);
  
  // 4. Update header comment
  const totalEntries = existing.length + newEntries.length;
  const updatedContent = newContent.replace(
    /\* \d+ validated entries across \d+ pantheons \*/,
    `* ${totalEntries} validated entries across ${new Set([...existing, ...newEntries].map(e => e.pantheon)).size} pantheons *`
  );
  fs.writeFileSync(LEXICON_PATH, updatedContent);
  
  console.log(`\nTotal entries after expansion: ${totalEntries}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run validation: node type/js/validate.js`);
  console.log(`  2. Rebuild DB: node platform/db/init.js`);
}

main();

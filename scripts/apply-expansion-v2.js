/**
 * Apply expansion batch to lexicon — Version 2
 * Handles hyphens, quote escaping, and proper breakdown generation
 */

const fs = require('fs');
const path = require('path');
const { generateEntry, generateBreakdown } = require('./generate-entries');
const batchFileArg = process.argv[2] || './expansion-batch.js';
const batchPath = path.resolve(batchFileArg);
const BATCH_DATA = require(batchPath);

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

function loadExistingLexicon() {
  const content = fs.readFileSync(LEXICON_PATH, 'utf8');
  const wrapped = content + '\nmodule.exports = LEXICON;';
  const tempPath = path.join(__dirname, '_temp_existing_lex.js');
  fs.writeFileSync(tempPath, wrapped);
  const lex = require(tempPath);
  fs.unlinkSync(tempPath);
  return lex;
}

function escapeJsString(str, useDoubleQuotes = false) {
  if (useDoubleQuotes) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
  // For single quotes, we CAN'T escape them in JS. Use double quotes instead.
  if (str.includes("'")) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return "'" + str + "'";
}

function main() {
  console.log('=== PUNYCODEX Lexicon Expansion v2 ===\n');
  
  const existing = loadExistingLexicon();
  console.log(`Existing entries: ${existing.length}`);
  
  const existingIds = new Set(existing.map(e => e.id));
  const existingUnicode = new Set(existing.map(e => e.unicode));
  
  const newEntries = [];
  const batchIds = new Set();
  const batchUnicode = new Set();
  
  let skipped = 0;
  
  for (const data of BATCH_DATA) {
    // Fix hyphens in ascii/id
    const cleanId = data.id.replace(/-/g, '');
    const cleanAscii = data.ascii.replace(/-/g, '');
    
    // Fix Unicode to align with clean ASCII (remove hyphens from Unicode too)
    const cleanUnicode = data.unicode.replace(/-/g, '');
    
    // Check against existing
    if (existingIds.has(cleanId)) {
      console.log(`SKIP (existing id): ${cleanId}`);
      skipped++;
      continue;
    }
    if (existingUnicode.has(cleanUnicode)) {
      console.log(`SKIP (existing unicode): ${cleanUnicode}`);
      skipped++;
      continue;
    }
    
    if (batchIds.has(cleanId)) {
      console.log(`SKIP (batch duplicate id): ${cleanId}`);
      skipped++;
      continue;
    }
    if (batchUnicode.has(cleanUnicode)) {
      console.log(`SKIP (batch duplicate unicode): ${cleanUnicode}`);
      skipped++;
      continue;
    }
    
    batchIds.add(cleanId);
    batchUnicode.add(cleanUnicode);
    
    try {
      const entry = generateEntry({
        ...data,
        id: cleanId,
        ascii: cleanAscii,
        unicode: cleanUnicode
      });
      newEntries.push(entry);
    } catch (e) {
      console.error(`ERROR generating ${cleanId}: ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\nNew entries to add: ${newEntries.length}`);
  console.log(`Skipped: ${skipped}`);
  
  if (newEntries.length === 0) {
    console.log('Nothing to add. Exiting.');
    return;
  }
  
  // Append to lexicon file — find the end of the last entry before '];'
  const lexiconContent = fs.readFileSync(LEXICON_PATH, 'utf8');
  
  // Find the last entry's closing brace: look for '\n  }\n];' before module export
  const moduleExportIdx = lexiconContent.indexOf('\n// Node.js export');
  const searchEnd = moduleExportIdx > 0 ? moduleExportIdx : lexiconContent.length;
  const searchArea = lexiconContent.slice(0, searchEnd);
  const endPattern = '\n  }\n];';
  const endEntryIdx = searchArea.lastIndexOf(endPattern);
  
  if (endEntryIdx === -1) {
    console.error('Could not find insertion point (end of last entry before ];)');
    process.exit(1);
  }
  
  // Insert after the last entry's closing '}' and before '\n];'
  const insertPos = endEntryIdx + 4; // after '\n  }'
  
  const newEntriesJs = newEntries.map(e => {
    const src = e.sources.map(s => {
      // Use double quotes for sources containing single quotes
      if (s.includes("'")) return `"${s.replace(/"/g, '\\"')}"`;
      return `'${s}'`;
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
  
  const newContent = lexiconContent.slice(0, insertPos) + ',\n' + newEntriesJs + lexiconContent.slice(insertPos);
  
  // Validate before writing
  const tempPath = path.join(__dirname, '_temp_lexicon.js');
  fs.writeFileSync(tempPath, newContent + '\nmodule.exports = LEXICON;');
  try {
    const testLex = require(tempPath);
    console.log(`Temp validation OK: ${testLex.length} entries`);
  } catch (e) {
    console.error('Validation failed for updated lexicon:', e.message);
    fs.unlinkSync(tempPath);
    process.exit(1);
  }
  fs.unlinkSync(tempPath);
  
  fs.writeFileSync(LEXICON_PATH, newContent);
  console.log(`Updated lexicon: ${LEXICON_PATH}`);
  
  console.log(`\nTotal entries after expansion: ${existing.length + newEntries.length}`);
}

main();

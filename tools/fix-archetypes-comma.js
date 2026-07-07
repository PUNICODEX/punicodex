const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../js/archetypes-v2.js');
let src = fs.readFileSync(file, 'utf8');

// The upsert inserted blocks without a leading comma on the first new block.
// Add a comma after the last original block, which is immediately before the first new block (id: "erebus").
src = src.replace(/(\bdarkPunchline:\s*false\r?\n\s*\})(\r?\n\r?\n\s*\{\r?\n\s*id:\s*"erebus")/, '$1,$2');

fs.writeFileSync(file, src, 'utf8');
console.log('Fixed missing comma before new archetypes');

// Verify parse
try {
  const vm = require('vm');
  const ARCHETYPES = vm.runInNewContext(`(function(){\n${src}\nreturn ARCHETYPES;\n})()`);
  console.log(`Parsed ${ARCHETYPES.length} archetypes`);
} catch (e) {
  console.error('Parse failed:', e.message);
  process.exit(1);
}

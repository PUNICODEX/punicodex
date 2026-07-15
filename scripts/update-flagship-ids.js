const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ARCHETYPES_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');
const INIT_PATH = path.join(ROOT, 'platform', 'db', 'init.js');

const archetypesSrc = fs.readFileSync(ARCHETYPES_PATH, 'utf8');
const archetypes = vm.runInNewContext(`(function(){\n${archetypesSrc}\nreturn ARCHETYPES;})()`);
const ids = archetypes.filter(a => a.built).map(a => a.id).sort();

const initSrc = fs.readFileSync(INIT_PATH, 'utf8');
const newSet = `const flagshipIds = new Set([\n${ids.map(id => `  '${id}',`).join('\n')}\n]);`;
const updatedSrc = initSrc.replace(/const flagshipIds = new Set\(\[[\s\S]*?\]\);/, newSet);

fs.writeFileSync(INIT_PATH, updatedSrc, 'utf8');
console.log(`Updated platform/db/init.js flagshipIds with ${ids.length} ids`);

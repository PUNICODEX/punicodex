const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FLAGSHIPS = new Set([
    'zeus','ares','apollon','hades','hekate','nike','aphrodite','athena',
    'demeter','hera','hermes','hephaistos','hestia','poseidon','persephone',
    'prometheus','artemis','atlas','dionysos','medousa'
]);

const sitesDir = path.join(__dirname, '..', 'sites');

// Delete all base temple directories
const dirs = fs.readdirSync(sitesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !FLAGSHIPS.has(d.name))
    .map(d => d.name);

console.log(`Deleting ${dirs.length} base temple directories...`);
for (const dir of dirs) {
    fs.rmSync(path.join(sitesDir, dir), { recursive: true, force: true });
}

console.log('Regenerating...');
execSync('node scripts/generate-temples.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

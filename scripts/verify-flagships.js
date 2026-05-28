const fs = require('fs');
const path = require('path');

const BUILT_TEMPLES = [
    'zeus','ares','apollon','hades','hekate','nike','aphrodite','athena',
    'demeter','hera','hermes','hephaistos','hestia','poseidon','persephone',
    'prometheus','artemis','atlas','dionysos','medousa'
];

for (const id of BUILT_TEMPLES) {
    const html = fs.readFileSync(path.join('sites', id, 'index.html'), 'utf8');
    const checks = {
        'Schema.org': html.includes('Schema.org'),
        'Global Nav': html.includes('Global Nav'),
        'Related Names': html.includes('id="related"'),
        'Type Tool CTA': html.includes('Type Tool CTA'),
        'Lexicon link': html.includes('/lexicon/'),
    };
    const allOk = Object.values(checks).every(v => v);
    console.log(`${allOk ? '✓' : '✗'} ${id}: ${Object.entries(checks).map(([k,v]) => `${k}=${v?'Y':'N'}`).join(', ')}`);
}

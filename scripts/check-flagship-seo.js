const fs = require('fs');
const ids = ['zeus','ares','apollon','hades','hekate','nike','aphrodite','athena','demeter','hera','hermes','hephaistos','hestia','poseidon','persephone','prometheus','artemis','atlas','dionysos','medousa'];
for (const id of ids) {
    const html = fs.readFileSync('sites/' + id + '/index.html', 'utf8');
    const hasCanon = html.includes('rel="canonical"');
    const hasOG = html.includes('og:title');
    const hasTwitter = html.includes('twitter:card');
    console.log(id + ': canonical=' + hasCanon + ' og=' + hasOG + ' twitter=' + hasTwitter);
}

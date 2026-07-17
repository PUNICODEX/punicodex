const https = require('https');
const ids = ['hekate','om','zeus'];
const BASE = 'punicodex-main-pebt8502q-hekaverse.vercel.app';
function fetch(id) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: BASE, path: `/sites/${id}/`, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
(async () => {
  for (const id of ids) {
    const html = await fetch(id);
    const m = html.match(/<span class="meta-domain">([^<]+)<\/span>/);
    console.log(id, m ? m[1] : 'not found');
  }
})();

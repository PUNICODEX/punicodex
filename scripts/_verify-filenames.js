const https = require('https');

function apiInfo(titles) {
  return new Promise((resolve, reject) => {
    const ts = titles.map(t => 'File:' + encodeURIComponent(t)).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${ts}&prop=imageinfo&iiprop=url|size|mime|thumbmime&iiurlwidth=800&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNYCODEX-gallery-audit/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function verify(files) {
  const data = await apiInfo(files);
  for (const pid of Object.keys(data.query.pages || {})) {
    const page = data.query.pages[pid];
    const title = page.title?.replace(/^File:/, '');
    if (page.missing !== undefined) {
      console.log('MISSING', title || pid);
    } else if (page.imageinfo?.[0]) {
      const info = page.imageinfo[0];
      const hashMatch = info.thumburl.match(/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\//);
      console.log('OK', title, '->', hashMatch ? `${hashMatch[1]}/${hashMatch[2]}` : 'FULL');
    }
  }
}

const candidates = process.argv.slice(2);
if (candidates.length) verify(candidates);

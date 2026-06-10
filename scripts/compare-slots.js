const fs = require('fs');
for (const s of ['zeus', 'aphrodite']) {
  const c = fs.readFileSync('sites/' + s + '/index.html', 'utf8');
  const slot = c.match(/<div class="space-slot"[^>]*>/);
  const frame = c.match(/<div class="space-frame[^"]*"/);
  console.log(s + ' first slot:', slot ? slot[0] : 'not found');
  console.log(s + ' first frame:', frame ? frame[0] : 'not found');
}

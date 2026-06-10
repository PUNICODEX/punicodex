const fs = require('fs');
for (const s of ['zeus', 'aphrodite', 'ares', 'poseidon', 'maat']) {
  const c = fs.readFileSync('sites/' + s + '/index.html', 'utf8');
  const sections = c.match(/<section[^>]*class="([^"]*)"/g) || [];
  console.log(s + ':', sections.map(m => m.match(/class="([^"]*)"/)[1]));
}

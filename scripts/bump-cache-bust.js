const fs = require('fs');

const bumps = [
  // Nike: perf36 -> perf37
  { file: 'sites/nike/index.html', from: '?v=perf36', to: '?v=perf37' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf36', to: '?v=perf37' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf36', to: '?v=perf37' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf36', to: '?v=perf37' },
  // Hermes: perf13 -> perf14
  { file: 'sites/hermes/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf13', to: '?v=perf14' },
  // Ra: perf18 -> perf19
  { file: 'sites/ra/index.html', from: '?v=perf18', to: '?v=perf19' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf18', to: '?v=perf19' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf18', to: '?v=perf19' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf18', to: '?v=perf19' },
  // Akh: perf19 -> perf20
  { file: 'sites/akh/index.html', from: '?v=perf19', to: '?v=perf20' },
  { file: 'sites/akh/lore/index.html', from: '?v=perf19', to: '?v=perf20' },
  { file: 'sites/akh/lore/extended/index.html', from: '?v=perf19', to: '?v=perf20' },
  { file: 'sites/akh/gallery/index.html', from: '?v=perf19', to: '?v=perf20' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

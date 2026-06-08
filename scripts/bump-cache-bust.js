const fs = require('fs');

const bumps = [
  // Nike: perf34 -> perf35
  { file: 'sites/nike/index.html', from: '?v=perf34', to: '?v=perf35' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf34', to: '?v=perf35' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf34', to: '?v=perf35' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf34', to: '?v=perf35' },
  // Hermes: perf11 -> perf12
  { file: 'sites/hermes/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf11', to: '?v=perf12' },
  // Ra: perf16 -> perf17
  { file: 'sites/ra/index.html', from: '?v=perf16', to: '?v=perf17' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf16', to: '?v=perf17' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf16', to: '?v=perf17' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf16', to: '?v=perf17' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

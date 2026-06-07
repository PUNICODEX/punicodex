const fs = require('fs');

const bumps = [
  // Nike: perf29 -> perf30
  { file: 'sites/nike/index.html', from: '?v=perf29', to: '?v=perf30' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf29', to: '?v=perf30' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf29', to: '?v=perf30' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf29', to: '?v=perf30' },
  // Hermes: perf6 -> perf7
  { file: 'sites/hermes/index.html', from: '?v=perf6', to: '?v=perf7' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf6', to: '?v=perf7' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf6', to: '?v=perf7' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf6', to: '?v=perf7' },
  // Ra: perf11 -> perf12
  { file: 'sites/ra/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf11', to: '?v=perf12' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf11', to: '?v=perf12' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

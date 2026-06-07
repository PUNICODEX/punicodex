const fs = require('fs');

const bumps = [
  // Nike: perf25 -> perf27
  { file: 'sites/nike/index.html', from: '?v=perf25', to: '?v=perf27' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf25', to: '?v=perf27' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf25', to: '?v=perf27' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf25', to: '?v=perf27' },
  // Hermes: perf2 -> perf4
  { file: 'sites/hermes/index.html', from: '?v=perf2', to: '?v=perf4' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf2', to: '?v=perf4' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf2', to: '?v=perf4' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf2', to: '?v=perf4' },
  // Ra: perf7 -> perf9, perf2 -> perf9
  { file: 'sites/ra/index.html', from: '?v=perf2', to: '?v=perf9' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf7', to: '?v=perf9' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf2', to: '?v=perf9' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf2', to: '?v=perf9' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

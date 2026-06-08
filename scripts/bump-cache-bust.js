const fs = require('fs');

const bumps = [
  // Nike: perf33 -> perf34
  { file: 'sites/nike/index.html', from: '?v=perf33', to: '?v=perf34' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf33', to: '?v=perf34' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf33', to: '?v=perf34' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf33', to: '?v=perf34' },
  // Hermes: perf10 -> perf11
  { file: 'sites/hermes/index.html', from: '?v=perf10', to: '?v=perf11' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf10', to: '?v=perf11' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf10', to: '?v=perf11' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf10', to: '?v=perf11' },
  // Ra: perf15 -> perf16
  { file: 'sites/ra/index.html', from: '?v=perf15', to: '?v=perf16' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf15', to: '?v=perf16' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf15', to: '?v=perf16' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf15', to: '?v=perf16' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

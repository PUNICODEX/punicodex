const fs = require('fs');

const bumps = [
  // Nike: perf32 -> perf33
  { file: 'sites/nike/index.html', from: '?v=perf32', to: '?v=perf33' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf32', to: '?v=perf33' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf32', to: '?v=perf33' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf32', to: '?v=perf33' },
  // Hermes: perf9 -> perf10
  { file: 'sites/hermes/index.html', from: '?v=perf9', to: '?v=perf10' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf9', to: '?v=perf10' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf9', to: '?v=perf10' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf9', to: '?v=perf10' },
  // Ra: perf14 -> perf15
  { file: 'sites/ra/index.html', from: '?v=perf14', to: '?v=perf15' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf14', to: '?v=perf15' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf14', to: '?v=perf15' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf14', to: '?v=perf15' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

const fs = require('fs');

const bumps = [
  // Nike: perf31 -> perf32
  { file: 'sites/nike/index.html', from: '?v=perf31', to: '?v=perf32' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf31', to: '?v=perf32' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf31', to: '?v=perf32' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf31', to: '?v=perf32' },
  // Hermes: perf8 -> perf9
  { file: 'sites/hermes/index.html', from: '?v=perf8', to: '?v=perf9' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf8', to: '?v=perf9' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf8', to: '?v=perf9' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf8', to: '?v=perf9' },
  // Ra: perf13 -> perf14
  { file: 'sites/ra/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf13', to: '?v=perf14' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf13', to: '?v=perf14' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

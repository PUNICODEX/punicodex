const fs = require('fs');

const bumps = [
  // Nike: perf35 -> perf36
  { file: 'sites/nike/index.html', from: '?v=perf35', to: '?v=perf36' },
  { file: 'sites/nike/lore/index.html', from: '?v=perf35', to: '?v=perf36' },
  { file: 'sites/nike/lore/extended/index.html', from: '?v=perf35', to: '?v=perf36' },
  { file: 'sites/nike/gallery/index.html', from: '?v=perf35', to: '?v=perf36' },
  // Hermes: perf12 -> perf13
  { file: 'sites/hermes/index.html', from: '?v=perf12', to: '?v=perf13' },
  { file: 'sites/hermes/lore/index.html', from: '?v=perf12', to: '?v=perf13' },
  { file: 'sites/hermes/lore/extended/index.html', from: '?v=perf12', to: '?v=perf13' },
  { file: 'sites/hermes/gallery/index.html', from: '?v=perf12', to: '?v=perf13' },
  // Ra: perf17 -> perf18
  { file: 'sites/ra/index.html', from: '?v=perf17', to: '?v=perf18' },
  { file: 'sites/ra/lore/index.html', from: '?v=perf17', to: '?v=perf18' },
  { file: 'sites/ra/lore/extended/index.html', from: '?v=perf17', to: '?v=perf18' },
  { file: 'sites/ra/gallery/index.html', from: '?v=perf17', to: '?v=perf18' },
];

for (const b of bumps) {
  let content = fs.readFileSync(b.file, 'utf8');
  const count = content.split(b.from).length - 1;
  content = content.split(b.from).join(b.to);
  fs.writeFileSync(b.file, content, 'utf8');
  console.log(b.file + ': replaced ' + count + ' occurrence(s) of ' + b.from);
}

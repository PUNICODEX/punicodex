const fs = require('node:fs');
function rw(p, s) {
  for (let i = 0; i < 12; i++) {
    try {
      fs.writeFileSync(p, s);
      return;
    } catch (e) {
      if (i === 11) throw e;
      require('node:child_process').spawnSync('node', ['-e', 'setTimeout(()=>{},400)']);
    }
  }
}
const kin = 'qnyt ʾilm: the creatress of the gods — the mother';
for (const p of ['scripts/lore-catalog.json', 'platform/scholars/content/athiratu.json', 'platform/blog/content/athiratu.json']) {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/nrt ʾilm: the sanctuary-light of the divine household — the mother/g, kin);
  s = s.replace(/nrt ʾilm, 'lamp of the gods'\[\^2\]/g, "qnyt ʾilm, 'creatress of the gods'[^2]");
  s = s.replace(
    /nrt ʾilm, 'lamp of the gods', makes her the sanctuary-light of the divine household/g,
    "qnyt ʾilm, 'creatress of the gods', makes her the mother of the divine household",
  );
  s = s.replace(
    /nrt ʾilm, 'lamp of the gods'; and her servant Qōdēšu-wa-ʾAmruru/g,
    "rbt ʾaṯrt ym, 'the Great Lady who walks on the Sea'; and her servant Qōdēšu-wa-ʾAmruru",
  );
  s = s.replace(/nrt ʾilm\*\* — \\/g, 'qnyt ʾilm** — \\');
  rw(p, s);
}
console.log('done');
for (const p of ['scripts/lore-catalog.json', 'platform/scholars/content/athiratu.json', 'platform/blog/content/athiratu.json']) {
  const s = fs.readFileSync(p, 'utf8');
  const nrt = (s.match(/nrt ʾilm/g) || []).length;
  const qnyt = (s.match(/qnyt ʾilm/g) || []).length;
  console.log(p.split('/').pop(), '| nrt:', nrt, '| qnyt:', qnyt);
}

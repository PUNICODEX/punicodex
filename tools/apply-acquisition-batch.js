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

// ── 1. owned-domains.json: add 17 new (old forms stay as variants) ──
const NEW = [
  'sjꜣ.com', 'huītzilōpōchtli.com', 'ītzpāpālōtl.com', 'tēzcatlīpōca.com', 'tēzcatlīpohca.com',
  'ḥꜥpy.com', 'ꜥꜣpp.com', 'dāgān.com', 'mūt.com', 'ọbà.com', 'athēnâ.com', 'ẹṣù.com',
  'ọrúnmìlà.com', 'ọbàtálá.com', 'promētheús.com', 'aṯiratu.com', 'ēōs.com',
];
const od = JSON.parse(fs.readFileSync('platform/db/owned-domains.json', 'utf8'));
for (const d of NEW) if (!od.includes(d)) od.push(d);
rw('platform/db/owned-domains.json', `${JSON.stringify(od, null, 2)}\n`);
console.log('owned-domains:', od.length);

// ── 2. lexicon: unicode + breakdown for the 12 form-changing entries ──
let s = fs.readFileSync('type/js/lexicon.js', 'utf8');
const swaps = {
  sia: ['"unicode": "sꜣ"', '"unicode": "sjꜣ"'],
  huitzilopochtli: ['"unicode": "Huitzilopōchtli"', '"unicode": "Huītzilōpōchtli"'],
  itzpapalotl: ['"unicode": "Itzpapālōtl"', '"unicode": "Ītzpāpālōtl"'],
  tezcatlipoca: ['"unicode": "Tezcatlipōca"', '"unicode": "Tēzcatlīpōca"'],
  hp: ['"unicode": "Ḥp"', '"unicode": "Ḥꜥpy"'],
  apep: ['"unicode": "Ꜥpp"', '"unicode": "ꜥꜣpp"'],
  dagan: ['"unicode": "Dāgan"', '"unicode": "Dāgān"'],
  mot: ['"unicode": "Mōt"', '"unicode": "Mūt"'],
  oba: ['"unicode": "Ọba"', '"unicode": "Ọbà"'],
  athena: ['"unicode": "Athénā"', '"unicode": "Athēnâ"'],
  eshu: ['"unicode": "Ẹṣu"', '"unicode": "Ẹṣù"'],
  obatala: ['"unicode": "Ọbatálá"', '"unicode": "Ọbàtálá"'],
  prometheus: ['"unicode": "Promētheus"', '"unicode": "Promētheús"'],
};
for (const [id, [a, b]] of Object.entries(swaps)) {
  if (!s.includes(a)) console.log('MISS', id, a);
  else s = s.replace(a, b);
}
rw('type/js/lexicon.js', s);

// ── 3. archetypes: primary domain swaps + alts ──
const { loadArchetypes, saveArchetypes, upsertArchetype } = require('../scripts/flywheel-utils');
const { src, list } = loadArchetypes();
const A = {
  sia: { name: 'Sjꜣ', domainUnicode: 'sjꜣ.com', domainPunycode: 'xn--sj-tq8h.com', alt: ['sꜣ.com'] },
  huitzilopochtli: { name: 'Huītzilōpōchtli', domainUnicode: 'huītzilōpōchtli.com', domainPunycode: 'xn--hutzilpchtli-u2b49bb.com', alt: ['huitzilopōchtli.com'] },
  itzpapalotl: { name: 'Ītzpāpālōtl', domainUnicode: 'ītzpāpālōtl.com', domainPunycode: 'xn--tzppltl-u3ab82bvm.com', alt: ['itzpapālōtl.com'] },
  tezcatlipoca: { name: 'Tēzcatlīpōca', domainUnicode: 'tēzcatlīpōca.com', domainPunycode: 'xn--tzcatlpca-bhb3yro.com', alt: ['tezcatlipōca.com', 'tēzcatlīpohca.com'] },
  hp: { name: 'Ḥꜥpy', domainUnicode: 'ḥꜥpy.com', domainPunycode: 'xn--py-rus6609e.com', alt: ['ḥp.com'] },
  apep: { name: 'ꜥꜣpp', domainUnicode: 'ꜥꜣpp.com', domainPunycode: 'xn--pp-rq8hha.com', alt: ['ꜥpp.com'] },
  dagan: { name: 'Dāgān', domainUnicode: 'dāgān.com', domainPunycode: 'xn--dgn-1oab.com', alt: ['dāgan.com'] },
  mot: { name: 'Mūt', domainUnicode: 'mūt.com', domainPunycode: 'xn--mt-gua.com', alt: ['mōt.com'] },
  oba: { name: 'Ọbà', domainUnicode: 'ọbà.com', domainPunycode: 'xn--b-sfa590u.com', alt: ['ọba.com'] },
  athena: { name: 'Athēnâ', domainUnicode: 'athēnâ.com', domainPunycode: 'xn--athn-eoa60a.com', alt: ['athénā.com'] },
  eshu: { name: 'Ẹṣù', domainUnicode: 'ẹṣù.com', domainPunycode: 'xn--qda371mmha.com', alt: ['ẹṣu.com'] },
  orunmila: { domainUnicode: 'ọrúnmìlà.com', domainPunycode: 'xn--rnml-3na4exes761a.com', alt: ['ọrunmila.com'] },
  obatala: { name: 'Ọbàtálá', domainUnicode: 'ọbàtálá.com', domainPunycode: 'xn--btl-9kagb8274c.com', alt: ['ọbatálá.com'] },
  prometheus: { name: 'Promētheús', domainUnicode: 'promētheús.com', domainPunycode: 'xn--promthes-u5a0w.com', alt: ['promētheus.com'] },
  asherah: { alt: ['aṯiratu.com'] },
  eos: { domainUnicode: 'ēōs.com', domainPunycode: 'xn--s-oia8o.com', alt: ['eōs.com'] },
};
let newSrc = src;
for (const a of list) {
  const p = A[a.id];
  if (!p) continue;
  const alts = p.alt || [];
  delete p.alt;
  Object.assign(a, p);
  const cur = Array.isArray(a.domainAlt) ? a.domainAlt : [];
  a.domainAlt = [...new Set([...cur, ...alts])];
  newSrc = upsertArchetype(newSrc, a);
  console.log('patched', a.id, '→', a.domainUnicode, '| alt:', a.domainAlt.join(','));
}
saveArchetypes(newSrc);

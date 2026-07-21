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
const M = {
  helios: 'Sun (from PIE *seh₂wel-)',
  yamuna: "The Twin River — daughter of Sūrya, twin of Yama, Kṛṣṇa's beloved water",
  radha: "The beloved of Kṛṣṇa, chief of the gopīs (from √rādh, 'to succeed, accomplish')",
  akshobhya: 'The Unshakable — the immovable Buddha of the eastern pure land Abhirati (from a-√kṣubh)',
  vajrapani: "The Vajra-Bearer — wielder of the thunderbolt, protector of the Buddha (vajra + pāṇi 'in the hand')",
  ksitigarbha: "The Earth-Womb — bodhisattva of the great vow to empty the hells (kṣiti 'earth' + garbha 'womb')",
  rama: 'The beloved prince of Ayodhyā — hero of the Rāmāyaṇa and seventh avatāra of Viṣṇu (from √ram, to delight)',
  saraswati: "The goddess of eloquence and learning — river of sacred speech (saras 'flowing water' + vatī 'possessing')",
  sati: "The True One — daughter of Dakṣa and first wife of Śiva, who immolated herself at her father's sacrifice",
  surya: 'The Sun — the Vedic solar deity who rides the one-wheeled chariot of seven mares',
  vishnu: "The Preserver — the principal Hindu deity who descends as avatāras to sustain cosmic order (from √viṣ, 'to pervade')",
  varuna: 'The All-Enveloping Sky — the Vedic Āditya of the waters and of ṛta, paired with Mitra',
  vac: 'Speech personified — the Vedic goddess of sacred utterance (Vāc)',
  rta: 'Cosmic order, truth — the Vedic principle of rightness that governs gods and nature (ṛta)',
  kali: "The Black One — the fierce goddess of time and destruction, consort of Śiva (fem. of kāla)",
  ganga: "The river Ganges personified — eldest daughter of Himavat, brought from heaven by Bhagīratha's austerities",
  hanuman: "The Large-Jawed One — the monkey-god of devotion and strength, Rāma's peerless servant",
  lakshmi: "The goddess of fortune and beauty — Viṣṇu's consort, born from the churning of the ocean",
  durga: "'the inaccessible or terrific goddess', N. of the daughter of Himavat and wife of Śiva (also called Umā, Pārvatī &c., and mother of Kārttikeya and Gaṇeśa)",
};
let s = fs.readFileSync('type/js/lexicon.js', 'utf8');
for (const [id, meaning] of Object.entries(M)) {
  const anchor = `"id": "${id}"`;
  const i = s.indexOf(anchor);
  if (i === -1) {
    console.log('MISSING', id);
    continue;
  }
  const end = s.indexOf('"sources":', i);
  const block = s.slice(i, end);
  const nb = block.replace(/"meaning": "(?:[^"\\]|\\.)*"/, `"meaning": "${meaning.replace(/"/g, '\\"')}"`);
  s = s.slice(0, i) + nb + s.slice(end);
}
rw('type/js/lexicon.js', s);
const { LEXICON } = require('../type/js/lexicon.js');
for (const id of Object.keys(M)) console.log(id.padEnd(12), (LEXICON.find((x) => x.id === id).meaning || '').slice(0, 70));

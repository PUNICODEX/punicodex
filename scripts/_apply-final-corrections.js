const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const filePath = path.join(__dirname, 'batch-update-galleries.js');

function fetchInfo(filename) {
  return new Promise((resolve, reject) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|size|mime|thumbmime&iiurlwidth=960&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNICODEX-correction/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function urlFor(filename, h1, h2) {
  const safe = encodeURIComponent(filename).replace(/!/g, '%21').replace(/'/g, '%27');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h1}/${h2}/${safe}/960px-${safe}.webp`;
}

async function main() {
  let src = fs.readFileSync(filePath, 'utf8');

  const corrections = [
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Acropolis_Athens.JPG/960px-Acropolis_Athens.JPG.webp',
      newFile: 'Acropolis Athens.JPG',
      oldAlt: 'The Acropolis of Athens.',
      newAlt: 'The Acropolis of Athens.',
      oldCaption: '<strong>The Acropolis</strong> â€” Athens. The sacred rock: Parthenon, Erechtheion, Propylaea.',
      newCaption: '<strong>The Acropolis</strong> â€” Athens. The sacred rock: Parthenon, Erechtheion, Propylaea.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Prajapati_Hindu.jpg/960px-Prajapati_Hindu.jpg.webp',
      newFile: 'Brahma issuing from lotus originating from umbilicus of Vishnu painting 1913.jpg',
      oldAlt: 'Prajapati, Vedic deity.',
      newAlt: "Brahma (Prajapati) emerging from a lotus growing from Vishnu's navel, 1913 illustration.",
      oldCaption: '<strong>Prajapati</strong> â€” The Lord of Creatures, the primordial creator from whom all beings emanate.',
      newCaption: '<strong>Prajapati</strong> â€” The Lord of Creatures, shown as Brahma emerging from the cosmic lotus. The primordial creator from whom all beings emanate.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Rta_vedic.jpg/960px-Rta_vedic.jpg.webp',
      newFile: 'Yajna Agni - Howrah 2012-12-16 2084.JPG',
      oldAlt: 'Vedic fire altar, symbol of cosmic order.',
      newAlt: 'Vedic yajna fire altar, Howrah, 2012.',
      oldCaption: '<strong>Vedic Fire Altar</strong> â€” The ritual fire (agni) maintained in perfect order, embodying á¹šta.',
      newCaption: '<strong>Vedic Fire Altar</strong> â€” The ritual fire (Agni) maintained in perfect order, embodying á¹šta, the cosmic law that governs gods and mortals alike.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Venus_and_Mars%2C_Sandro_Botticelli.jpg/960px-Venus_and_Mars%2C_Sandro_Botticelli.jpg.webp',
      newFile: 'Botticelli-Venus and Mars.jpg',
      oldAlt: 'Venus and Mars by Sandro Botticelli, c. 1485. National Gallery, London.',
      newAlt: 'Venus and Mars by Sandro Botticelli, c. 1485. National Gallery, London.',
      oldCaption: '<strong>Venus and Mars</strong> â€” Sandro Botticelli, c. 1485. Love defeats war.',
      newCaption: '<strong>Venus and Mars</strong> â€” Sandro Botticelli, c. 1485. Love defeats war in this dreamlike allegory of desire and conflict.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Marble_statuette_of_Aphrodite_Anadyomene_%28rising%29_type_MET_146990.jpg/960px-Marble_statuette_of_Aphrodite_Anadyomene_%28rising%29_type_MET_146990.jpg.webp',
      newFile: 'Aphrodite Anadyomene Louvre CA2288.jpg',
      oldAlt: 'Marble statue of Aphrodite, Roman Imperial. Metropolitan Museum of Art, New York.',
      newAlt: 'Aphrodite Anadyomene, marble statue. Louvre Museum.',
      oldCaption: '<strong>Roman Aphrodite</strong> â€” 1stâ€“2nd century CE, Metropolitan Museum. The goddess in her Anadyomene type.',
      newCaption: '<strong>Aphrodite Anadyomene</strong> â€” Marble statue, Louvre. The goddess wrings sea-foam from her hair in the type that celebrated her birth from the waves.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Belvedere_Apollo_Pio-Clementino_Inv1015_%28cropped%29.jpg/960px-Belvedere_Apollo_Pio-Clementino_Inv1015_%28cropped%29.jpg.webp',
      newFile: 'Apollo of the Belvedere.jpg',
      oldAlt: 'Apollo Belvedere. Vatican Museums.',
      newAlt: 'Apollo Belvedere, Roman copy. Vatican Museums.',
      oldCaption: '<strong>Apollo Belvedere</strong> â€” Roman copy of a Greek original by Leochares, c. 330 BCE. The ideal of male beauty and divine composure.',
      newCaption: '<strong>Apollo Belvedere</strong> â€” Roman copy of a Greek original by Leochares, c. 330 BCE. The ideal of male beauty and divine composure.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Mars_et_Venus_surpris_par_Vulcain..jpg/960px-Mars_et_Venus_surpris_par_Vulcain..jpg.webp',
      newFile: 'Mars and Venus Surprised by Vulcan - Tintoretto.jpg',
      oldAlt: 'Ares and Aphrodite surprised by Hephaestus, Attic red-figure krater, c. 360 BCE. Louvre Museum.',
      newAlt: 'Mars and Venus Surprised by Vulcan by Tintoretto.',
      oldCaption: "<strong>Ares and Aphrodite</strong> â€” Attic red-figure, c. 360 BCE. The lovers trapped in Hephaestus's net, exposed to the laughter of Olympus.",
      newCaption: "<strong>Mars and Venus Surprised by Vulcan</strong> â€” Jacopo Tintoretto. The war god and the goddess of love caught in Vulcan's net, exposed to Olympian laughter."
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Athena_type_Velletri.jpg/960px-Athena_type_Velletri.jpg.webp',
      newFile: 'Bust Athena Velletri Glyptothek Munich 213.jpg',
      oldAlt: 'Pallas Athena, Velletri type. Glyptothek, Munich.',
      newAlt: 'Bust of Athena Velletri type, Glyptothek, Munich.',
      oldCaption: '<strong>Pallas Athena</strong> â€” Velletri type. The spear rests against her shoulder. She does not need to raise it.',
      newCaption: '<strong>Pallas Athena</strong> â€” Velletri type, Glyptothek, Munich. The spear rests against her shoulder. She does not need to raise it.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/PLUTO_STATUE.jpg/960px-PLUTO_STATUE.jpg.webp',
      newFile: 'Serapis, with a modius on the head, depicted as Pluto, next to him is standing the three headed dog Cerberus, guardian of the Hades, from the Roman Villa of Chiragan, MusÃ©e des Antiques de Toulouse (16353062906).jpg',
      oldAlt: 'Hades, statue from Capua. Museo Provinciale Campano.',
      newAlt: 'Serapis as Pluto with Cerberus, Roman sculpture from the Villa of Chiragan. MusÃ©e Saint-Raymond, Toulouse.',
      oldCaption: '<strong>Hades of Capua</strong> â€” The grim face of the underworld, bearded and crowned with darkness.',
      newCaption: '<strong>Pluto with Cerberus</strong> â€” Roman sculpture from the Villa of Chiragan, MusÃ©e Saint-Raymond, Toulouse. Hades as Serapis-Pluto, guardian of the dead, with his three-headed hound.'
    },
    {
      oldSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Poseidon_sculpture_Copenhagen_2005.jpg/960px-Poseidon_sculpture_Copenhagen_2005.jpg.webp',
      newFile: 'Poseidon statue.jpg',
      oldAlt: 'Poseidon, bronze statue in Copenhagen harbor.',
      newAlt: 'Poseidon statue, sea god with trident.',
      oldCaption: '<strong>Poseidon of Copenhagen</strong> â€” The sea god in the harbor that bears his name, trident ready.',
      newCaption: '<strong>Poseidon</strong> â€” The sea god stands with trident in hand, lord of waves and earthquakes, protector of sailors and shaker of shores.'
    }
  ];

  for (const c of corrections) {
    if (!src.includes(c.oldSrc)) {
      console.warn('Old src not found (may already be fixed):', c.oldSrc.substring(0, 80));
      continue;
    }

    const data = await fetchInfo(c.newFile);
    await new Promise(r => setTimeout(r, 1500));
    const pages = data.query.pages;
    const page = pages[Object.keys(pages)[0]];
    if (page.missing) {
      console.warn('MISSING new file on Commons:', c.newFile);
      continue;
    }
    const info = page.imageinfo[0];
    const hashMatch = info.thumburl && info.thumburl.match(/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\//);
    if (!hashMatch) {
      console.warn('New file is LOW-RES (no 960px thumb):', c.newFile, 'width=', info.width);
      continue;
    }

    const newSrc = urlFor(c.newFile, hashMatch[1], hashMatch[2]);
    src = src.split(c.oldSrc).join(newSrc);

    const altPattern = new RegExp(`(src: '${escapeRegExp(newSrc)}'[^}]*alt: ')[^']*(')`);
    if (altPattern.test(src)) {
      src = src.replace(altPattern, `$1${c.newAlt}$2`);
    }

    const capPattern = new RegExp(`(src: '${escapeRegExp(newSrc)}'[\\s\\S]{0,800}?caption: ')(${escapeRegExp(c.oldCaption)})(')`);
    if (capPattern.test(src)) {
      src = src.replace(capPattern, `$1${c.newCaption}$3`);
    }

    console.log('Replaced', c.newFile);
  }

  fs.writeFileSync(filePath, src);
  console.log('Wrote updated batch-update-galleries.js');

  console.log('Regenerating galleries...');
  execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(err => { console.error(err); process.exit(1); });

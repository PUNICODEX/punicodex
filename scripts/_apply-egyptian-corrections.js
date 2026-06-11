const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function thumbUrl(filename) {
  const canonical = filename.replace(/ /g, '_');
  const hash = md5(canonical);
  const h = hash[0];
  const hh = hash.substring(0, 2);
  const encoded = encodeURIComponent(canonical);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h}/${hh}/${encoded}/960px-${encoded}.webp`;
}

const corrections = {
  ra: [
    { file: 'Ra as falcon.svg', alt: 'Ra-Horakhty depicted as a falcon wearing the solar disk.', caption: '<strong>Ra-Horakhty</strong> — Depicted as a falcon wearing the solar disk, the supreme sun god voyages across the sky.' },
    { file: 'Ra-Horakhty (RC 2063) Rosicrucian Egyptian Museum.jpg', alt: 'Ra-Horakhty statue, Rosicrucian Egyptian Museum.', caption: '<strong>Ra-Horakhty</strong> — Rosicrucian Egyptian Museum. The falcon-headed sun god, protector of kings.' },
    { file: 'Theban region, Deir el-Medina, TT1, tomb of Sennedjem, 1905-1914, photo 7 of 9 - Archivio fotografico Museo Egizio, Turin C00077.jpg', alt: 'Solar barque with Ra-Horakhty, tomb of Sennedjem.', caption: '<strong>Ra in the Book of the Dead</strong> — Tomb of Sennedjem, c. 1275 BCE. The sun god in his barque travels through the underworld.' },
    { file: 'ReliefFragmentOfAkhenatenWithSunDiskOfAten.png', alt: 'Relief fragment of Akhenaten with the sun disk of the Aten.', caption: '<strong>The Aten</strong> — Amarna period, c. 1350 BCE. Akhenaten\'s radiant sun disk, source of all life.' },
    { file: 'Nun Raises the Sun.jpg', alt: 'Nun lifts the solar barque of Ra.', caption: '<strong>The Solar Barque</strong> — Nun, god of chaos, lifts the barque of Ra into the sky at the dawn of time.' },
  ],
  horus: [
    { file: 'Temple of Edfu, Horus, Egypt.jpg', alt: 'Horus, Temple of Edfu, Egypt.', caption: '<strong>Horus of Edfu</strong> — Temple of Edfu. The falcon-headed god, protector of kings, avenger of his father Osiris.' },
    { file: 'Horus as falcon god with Egyptian crown from the 27th dynasty (04).jpg', alt: 'Horus as falcon, Late Period Egypt.', caption: '<strong>Horus the Falcon</strong> — Late Period statue. The god in his animal form: keen-eyed, swift, and terrible to his enemies.' },
    { file: 'Edfu47.JPG', alt: 'Wall relief of the battle between Horus and Seth, Temple of Edfu.', caption: '<strong>Horus and Seth</strong> — Wall relief, Temple of Edfu. The eternal battle between order and chaos.' },
    { file: 'Eye of Horus Amulet LACMA 50.4.6.19.jpg', alt: 'Eye of Horus amulet.', caption: '<strong>The Eye of Horus</strong> — Egyptian amulet. The wedjat eye: protection, royal power, and good health.' },
    { file: 'Cult Statue of Horus as Falcon Wearing Double Crown of Egypt - Front View - 27th Dynasty.jpg', alt: 'Horus wearing the double crown of Upper and Lower Egypt.', caption: '<strong>Horus Crowned</strong> — The double crown of Upper and Lower Egypt, symbolizing the unity Horus brought to the Two Lands.' },
  ],
  heka: [
    { file: 'Heka-E 4875-IMG 8027-gradient.jpg', alt: 'Heka, Egyptian god of magic, figurine.', caption: '<strong>Heka</strong> — The personification of magic itself, the force that powered Egyptian religion and medicine.' },
    { file: 'Graeco-Egyptian Magical Papyrus I; Louvre; Roman Epoch; 30-395 AD;Demotic, Greek,Coptic; Various Recipes; Magical Formulars are written Red.jpg', alt: 'Graeco-Egyptian magical papyrus, Louvre.', caption: '<strong>Heka in the Magical Papyrus</strong> — Graeco-Egyptian papyrus, Louvre. The word of power that opens doors and repels demons.' },
    { file: 'Egyptian - Amulet of Taweret - Walters 42219.jpg', alt: 'Egyptian protective amulet of Taweret.', caption: '<strong>Protective Amulet</strong> — Taweret amulet. Egyptian protective charm embodying heka to ward off evil.' },
  ],
  shu: [
    { file: 'Shu with feather.svg', alt: 'Shu, Egyptian god of air, with ostrich feather.', caption: '<strong>Shu</strong> — The god of air, shown with the ostrich feather, separating Nut and Geb.' },
    { file: 'Egyptian - Corner Relief Fragment with King Ptolemy II Philadelphos, Mehyet, and Onuris-Shu - Walters 225.jpg', alt: 'Relief showing Onuris-Shu enthroned.', caption: '<strong>Shu Enthroned</strong> — Relief from Samannud. Onuris-Shu, god of air and war, receives the king.' },
  ],
  sia: [
    { file: 'Sia god.svg', alt: 'Sia, Egyptian god of perception.', caption: '<strong>Sia</strong> — Personification of perception and understanding, attendant to Ra in his solar barque.' },
    { file: 'Papyrus funéraire (Louvre, E 6258 f01).jpg', alt: 'Funerary papyrus from the Egyptian Book of the Dead.', caption: '<strong>Sia in the Book of the Dead</strong> — Funerary papyrus, Louvre. The divine intelligence that guides the deceased.' },
  ],
  maa: [
    { file: 'Feather of maat.svg', alt: 'The Feather of Maat.', caption: '<strong>The Feather of Maat</strong> — The ostrich feather, symbol of truth and the measure against which hearts are weighed.' },
    { file: 'Maat (Goddess).png', alt: 'The Egyptian goddess Maat with feather of truth.', caption: '<strong>Maat</strong> — The goddess of truth, justice, and cosmic order, wearing the feather of truth.' },
  ],
  maat: [
    { file: 'Maat MET DP310895.jpg', alt: 'Maat, Metropolitan Museum of Art.', caption: '<strong>Maat</strong> — Metropolitan Museum of Art. The goddess kneels with outstretched wings, the embodiment of divine order.' },
    { file: 'BD Weighing of the Heart.jpg', alt: 'The Weighing of the Heart from the Book of the Dead of Ani.', caption: '<strong>The Weighing of the Heart</strong> — Book of the Dead of Ani. The deceased\'s heart is weighed against Maat\'s feather.' },
  ],
  akh: [
    { file: 'Akh iker en Re stela of Pahatia, limestone - Museo Egizio Turin C 1566 p01.jpg', alt: 'Akh iker en Re stela of Pahatia.', caption: '<strong>The Akh</strong> — Stela of Pahatia, Museo Egizio, Turin. The transfigured spirit of the deceased, radiant in the afterlife.' },
    { file: 'Akh iker en Re stela of Pahatia, limestone - Museo Egizio Turin C 1566 p02.jpg', alt: 'Akh iker en Re stela of Pahatia, detail.', caption: '<strong>The Akh in the Presence of Ra</strong> — The blessed dead as an effective spirit, akh iker en Re.' },
  ],
  ab: [
    { file: 'Heart scarab, Egyptian blue - Museo Egizio, Turin C 6016 p01.jpg', alt: 'Egyptian heart scarab of Egyptian blue.', caption: '<strong>The Heart (Ib/Ab)</strong> — Heart scarab of Egyptian blue. The seat of emotion, intellect, and morality in Egyptian belief.' },
    { file: 'Book of the Dead, Anubis weighing the heart. Wellcome L0005449.jpg', alt: 'Anubis weighing the heart against the feather of Maat.', caption: '<strong>The Heart in Judgement</strong> — Anubis weighs the heart against Maat\'s feather in the Hall of Judgement.' },
  ],
  ba: [
    { file: 'Ba bird.svg', alt: 'The Ba as a bird with human head.', caption: '<strong>The Ba</strong> — The personality and soul, depicted as a bird with a human head, free to fly between tomb and afterlife.' },
    { file: 'Ba bird amulet, gold - Museo Egizio, Turin C 6696 p01.jpg', alt: 'Gold Ba bird amulet.', caption: '<strong>Ba Bird Amulet</strong> — Gold amulet, Museo Egizio, Turin. The mobile aspect of the soul that could travel between worlds.' },
  ],
  ka: [
    { file: 'Ka arms.svg', alt: 'The Ka hieroglyph of two upraised arms.', caption: '<strong>The Ka Arms</strong> — The hieroglyph of two upraised arms: embrace, protection, the vital essence.' },
    { file: 'Ka Statue of king Hor.jpg', alt: 'Ka statue of King Hor, Egyptian Museum, Cairo.', caption: '<strong>The Ka</strong> — Ka statue of King Hor, Egyptian Museum, Cairo. The life force, created at birth, sustained by offerings.' },
  ],
  astart: [
    { file: 'Terracotta votary figurine(s) from sanctuary of Astarte at Kamelarga, Cyprus 600-500 BCE Ashmolean Museum 01.jpg', alt: 'Terracotta votary figurine from sanctuary of Astarte, Cyprus.', caption: '<strong>Astarte Figurine</strong> — Terracotta votary from Kamelarga, Cyprus, c. 600–500 BCE. The goddess of fertility and power.' },
    { file: 'Terracotta votary figurine(s) from sanctuary of Astarte at Kamelarga, Cyprus 600-500 BCE Ashmolean Museum 02.jpg', alt: 'Terracotta votary figurine from sanctuary of Astarte, Cyprus.', caption: '<strong>Astarte at Kamelarga</strong> — Votary figurine from her sanctuary on Cyprus, bearer of life and desire.' },
  ],
};

const batchPath = path.join(__dirname, 'batch-update-galleries.js');
let content = fs.readFileSync(batchPath, 'utf8');

for (const [siteId, images] of Object.entries(corrections)) {
  const items = images.map(img => {
    const src = thumbUrl(img.file);
    return `    { src: '${src}', alt: '${img.alt.replace(/'/g, "\\'")}', caption: '${img.caption.replace(/'/g, "\\'")}' }`;
  }).join(',\n');
  const replacement = `  ${siteId}: { images: [\n${items}\n  ]},`;

  const regex = new RegExp(`^  ${siteId}: \\{ images: \\[\\s*[\\s\\S]*?\\n  \\]\\},`, 'm');
  if (!regex.test(content)) {
    console.error(`Block not found for ${siteId}`);
    process.exit(1);
  }
  content = content.replace(regex, replacement);
  console.log(`Replaced gallery for ${siteId} (${images.length} images)`);
}

fs.writeFileSync(batchPath, content, 'utf8');
console.log('Wrote updated batch-update-galleries.js');

console.log('Running batch-update-galleries.js...');
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit' });

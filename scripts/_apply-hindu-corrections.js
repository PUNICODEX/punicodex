const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, 'batch-update-galleries.js');

function src(filename, hash) {
  const enc = encodeURIComponent(filename);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash}/${enc}/960px-${enc}.webp`;
}

const corrections = {
  shiva: [
    { file: 'Shiva Nataraja in BM.jpg', hash: '9/9a', alt: 'Shiva Nataraja, Chola bronze, c. 1100 CE. British Museum.', caption: '<strong>Shiva Nataraja</strong> — Chola bronze, c. 1100 CE. The cosmic dancer: creation and destruction in a single gesture.' },
    { file: 'Gudimallam Lingam in-situ photograph.jpg', hash: '1/15', alt: 'Gudimallam Lingam, 2nd century BCE–1st century CE. Andhra Pradesh, India.', caption: '<strong>Gudimallam Lingam</strong> — 2nd century BCE–1st century CE, Andhra Pradesh. The aniconic form of Shiva: raw generative power, without face or form.' },
    { file: 'Gomeg Ambika Vidisha.jpg', hash: '6/65', alt: 'Shiva and Parvati as Uma-Maheshvara, red sandstone, Central India.', caption: '<strong>Shiva and Parvati</strong> — Red sandstone Uma-Maheshvara from Central India. The divine couple united in eternal meditation.' },
    { file: 'Ardhanarishvara, Chola period, 11th century, Government Museum, Chennai.jpg', hash: '2/2f', alt: 'Ardhanarishvara, Chola period, 11th century CE. Government Museum, Chennai.', caption: '<strong>Ardhanarishvara</strong> — Chola period, 11th century CE, Government Museum, Chennai. Half Shiva, half Parvati: the divine androgyny made stone.' },
    { file: 'Shiva Bhairava ellora.jpg', hash: '3/35', alt: 'Shiva as Bhairava, Ellora Caves, Maharashtra.', caption: '<strong>Bhairava</strong> — Ellora Caves, Maharashtra. The terrible form of Shiva: fangs, skulls, and the fire of annihilation.' },
    { file: '8th century Standing Shiva Mahadeva, Kashmir, India, Clevelandart 1989.369.jpg', hash: '3/3c', alt: 'Standing Shiva Mahadeva, 8th century CE, Kashmir. Cleveland Museum of Art.', caption: '<strong>Standing Shiva Mahadeva</strong> — 8th century CE, Kashmir. Cleveland Museum of Art. The ascetic god in calm, monumental power.' },
  ],
  vishnu: [
    { file: '7th century Trivikrama, Vishnu avatar Vamana legend in Cave 2, Badami Hindu cave temple Karnataka.jpg', hash: 'b/ba', alt: 'Vishnu as Trivikrama, 7th century CE. Badami cave temple, Karnataka.', caption: '<strong>Vishnu Trivikrama</strong> — 7th century CE, Badami cave temple. The dwarf Vamana who grew to stride across the universe in three steps.' },
    { file: 'Anantasayana Vishnu.jpg', hash: '2/22', alt: 'Anantasayana Vishnu, Chola granite, 11th century CE. Salar Jung Museum, Hyderabad.', caption: '<strong>Vishnu Narayana</strong> — Chola granite, 11th century CE. The preserver reclines on the serpent Ananta, Lakshmi at his feet.' },
    { file: 'Udayagiri Caves, cave 5, Vishnu as Varaha Avatar (9839977024).jpg', hash: '4/48', alt: 'Vishnu as Varaha, Udayagiri Caves, cave 5, c. 400 CE.', caption: '<strong>Varaha Avatar</strong> — Udayagiri Caves, c. 400 CE. The boar-headed god lifts the earth goddess Bhudevi from the cosmic ocean.' },
    { file: 'Krishna playing the flute.jpg', hash: '2/2f', alt: 'Krishna playing the flute, Pahari miniature, c. 1810–20. National Museum, New Delhi.', caption: '<strong>Krishna</strong> — Pahari miniature, c. 1810–20. The most beloved avatar: flute-player, butter-thief, charioteer of Arjuna.' },
    { file: '12th-century sculpture at Belur Hindu temple, Narasimha killing demon Hiranyakashipu.jpg', hash: 'c/cb', alt: 'Vishnu as Narasimha killing Hiranyakashipu, 12th century CE. Belur temple, Karnataka.', caption: '<strong>Narasimha</strong> — 12th century CE, Belur. The man-lion avatar tears open the demon who thought himself immortal.' },
  ],
  ganesha: [
    { file: 'Ganesha - Gupta Period - ACCN 15-758 - Government Museum - Mathura 2013-02-23 5418.JPG', hash: '4/46', alt: 'Ganesha, Gupta period, c. 5th century CE. Government Museum, Mathura.', caption: '<strong>Ganesha</strong> — Gupta period, c. 5th century CE, Mathura. The elephant-headed god of beginnings, remover of obstacles.' },
    { file: 'Eight-armed Dancing Ganesha - Bronze - Circa 15th Century CE - Odisha - ACCN 2000-17 - Indian Museum - Kolkata 2015-09-26 3889.JPG', hash: 'a/a5', alt: 'Dancing Ganesha, bronze, c. 15th century CE. Indian Museum, Kolkata.', caption: '<strong>Dancing Ganesha</strong> — Bronze, c. 15th century CE, Odisha. The god dances with a bowl of sweets, trunk curved in joy.' },
    { file: 'Ganesha Basohli miniature circa 1730 Dubost p73.jpg', hash: '6/64', alt: 'Ganesha, Basohli miniature, c. 1730.', caption: '<strong>Ganesha</strong> — Basohli miniature, c. 1730. The patron of arts and sciences, worshipped before every new venture.' },
    { file: 'Stone sculpture of Ganesha, British Museum 01.jpg', hash: 'c/c0', alt: 'Stone sculpture of Ganesha. British Museum, London.', caption: '<strong>Ganesha</strong> — Stone sculpture, British Museum. The most widely worshipped deity in the Hindu pantheon, beloved across India and beyond.' },
  ],
  kali: [
    { file: 'India, Calcutta, Kalighat painting, 19th century - Kali - 2003.116 - Cleveland Museum of Art.jpg', hash: 'd/d7', alt: 'Kali, Kalighat painting, 19th century. Cleveland Museum of Art.', caption: '<strong>Kali</strong> — Kalighat painting, 19th century. The black goddess, tongue out in shock at her own violence, garlanded with skulls.' },
    { file: 'India, Kalighat painting, 19th century - Two Aspects of Kali- Kali Dancing on Shiva - 1980.216.a - Cleveland Museum of Art.jpg', hash: 'c/c2', alt: 'Kali dancing on Shiva, Kalighat painting, 19th century. Cleveland Museum of Art.', caption: "<strong>Dancing Kali</strong> — Kalighat painting, 19th century. The goddess dances on Shiva's body, time and destruction made flesh." },
    { file: 'A Tantric Form of the Hindu Goddess Kali (Recto), Horse (Verso), Folio from a Book of Iconography LACMA M.81.206.9.jpg', hash: '8/80', alt: 'Tantric form of Kali, folio from a book of iconography. LACMA.', caption: '<strong>Kali Tantra</strong> — Folio from a book of iconography, LACMA. The fierce mother who destroys ego to liberate the soul.' },
    { file: 'Kali Puja - Worship of Goddess Kali 01.jpg', hash: '4/4d', alt: 'Kali Puja festival, modern devotional image.', caption: '<strong>Kali</strong> — Modern devotional image. The divine mother who is simultaneously the most terrible and the most compassionate.' },
  ],
};

function buildBlock(siteId, items) {
  const lines = items.map((item) => {
    const alt = item.alt.replace(/'/g, "\\'");
    const caption = item.caption.replace(/'/g, "\\'");
    return `    { src: '${src(item.file, item.hash)}', alt: '${alt}', caption: '${caption}' }`;
  }).join(',\n');
  return `\n  ${siteId}: { images: [\n${lines}\n  ]},`;
}

let data = fs.readFileSync(filePath, 'utf8');

for (const siteId of Object.keys(corrections)) {
  const regex = new RegExp(`\\n  ${siteId}: \\{ images: \\[[\\s\\S]*?\\n  \\]\\},`);
  if (!regex.test(data)) {
    console.error(`Block for ${siteId} not found`);
    process.exit(1);
  }
  const replacement = buildBlock(siteId, corrections[siteId]);
  data = data.replace(regex, replacement);
  console.log(`Replaced ${siteId} gallery (${corrections[siteId].length} images)`);
}

fs.writeFileSync(filePath, data, 'utf8');
console.log('Wrote scripts/batch-update-galleries.js');

console.log('Running batch-update-galleries.js...');
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

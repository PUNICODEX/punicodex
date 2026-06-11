const fs = require('fs');
const { execSync } = require('child_process');
const file = 'scripts/batch-update-galleries.js';
let src = fs.readFileSync(file, 'utf8');

// Dionysos full replacement
const oldDionysos = `  dionysos: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Dionysus_Sarcophagus_Louvre_Ma_622.jpg/960px-Dionysus_Sarcophagus_Louvre_Ma_622.jpg.webp', alt: 'Sarcophagus with Dionysus, c. 220 CE. Louvre Museum.', caption: '<strong>Dionysus Sarcophagus</strong> — c. 220 CE. The god of wine reclines in triumph, satyrs and maenads dancing around him.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Dionysus_Lansdowne_BM_1805.jpg/960px-Dionysus_Lansdowne_BM_1805.jpg.webp', alt: 'Dionysus Lansdowne, Roman copy. British Museum.', caption: '<strong>Dionysus Lansdowne</strong> — British Museum. The god stands with panther skin and thyrsus, eyes already half-mad.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Dionysus_BM_Vase_E439.jpg/960px-Dionysus_BM_Vase_E439.jpg.webp', alt: 'Dionysus in his ship, Attic black-figure kylix, c. 530 BCE. British Museum.', caption: '<strong>Dionysus in His Ship</strong> — Attic black-figure, c. 530 BCE. The mast of the pirate ship sprouts vines; the sailors become dolphins.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Dionysus_Maenad_BM_Vase_98.jpg/960px-Dionysus_Maenad_BM_Vase_98.jpg.webp', alt: 'Dionysus and maenads, Attic red-figure krater, c. 480 BCE. British Museum.', caption: '<strong>Dionysus and Maenads</strong> — Attic red-figure, c. 480 BCE. The ecstatic dance: wine, drums, and the tearing apart of rationality.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Dionysus_Theater_Athens.jpg/960px-Dionysus_Theater_Athens.jpg.webp', alt: 'Theater of Dionysus, Athens.', caption: '<strong>Theater of Dionysus</strong> — Athens. Where tragedy and comedy were born from the god\\'s sacred rituals.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Dionysus_Bacchus_Prado.jpg/960px-Dionysus_Bacchus_Prado.jpg.webp', alt: 'Bacchus by Michelangelo Merisi da Caravaggio, c. 1595. Uffizi Gallery, Florence.', caption: '<strong>Bacchus</strong> — Caravaggio, c. 1595. The god of wine as a young man, offering the viewer a glass of his own divinity.' },
  ]},`;

const newDionysos = `  dionysos: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Louvre_Dionysus-and-Ariadne_sarcophagus.jpg/960px-Louvre_Dionysus-and-Ariadne_sarcophagus.jpg.webp', alt: 'Roman sarcophagus with Dionysus and Ariadne, c. 230–240 CE. Louvre Museum.', caption: '<strong>Dionysus and Ariadne Sarcophagus</strong> — c. 230–240 CE. The wine god discovers Ariadne on Naxos; vines and revelers frame their union.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Black_figure_Kylix_(drinking_cup)_depicting_Dionysus_crossing_the_sea,_ca._530_BC,_Staatliche_Antikensammlungen,_Munich_(8958045452).jpg/960px-Black_figure_Kylix_(drinking_cup)_depicting_Dionysus_crossing_the_sea,_ca._530_BC,_Staatliche_Antikensammlungen,_Munich_(8958045452).jpg.webp', alt: 'Dionysus sailing among pirates, Attic black-figure kylix by Exekias, c. 530 BCE. Staatliche Antikensammlungen, Munich.', caption: '<strong>Dionysus in His Ship</strong> — Black-figure kylix by Exekias, c. 530 BCE. Pirates who seized the god are transformed into dolphins as vines overtake the mast.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Attic_Red-figure_Ceramic_Lebes_Feast_of_Dionysus_with_Maenads_and_Silenas;_by_the_Dinos_painter,_c._420_BC_(28738772635).jpg/960px-Attic_Red-figure_Ceramic_Lebes_Feast_of_Dionysus_with_Maenads_and_Silenas;_by_the_Dinos_painter,_c._420_BC_(28738772635).jpg.webp', alt: 'Feast of Dionysus with maenads and silens, Attic red-figure lebes by the Dinos Painter, c. 420 BCE.', caption: '<strong>Feast of Dionysus</strong> — Red-figure lebes by the Dinos Painter, c. 420 BCE. Maenads and silens whirl around the god in ecstatic communion.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Resting_Satyr_-_Woodland_deity,_companion_of_the_god_Dionysus.jpg/960px-Resting_Satyr_-_Woodland_deity,_companion_of_the_god_Dionysus.jpg.webp', alt: 'Resting Satyr, companion of Dionysus, Roman copy after Praxiteles.', caption: '<strong>Resting Satyr</strong> — Roman copy after Praxiteles. The woodland companion of Dionysus leans on a tree trunk, embodying the god\\'s untamed retinue.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Athen_Theatre_of_Dionysus_BW_2017-10-09_14-29-49.jpg/960px-Athen_Theatre_of_Dionysus_BW_2017-10-09_14-29-49.jpg.webp', alt: 'Theatre of Dionysus, Athens.', caption: '<strong>Theatre of Dionysus</strong> — Athens. Where tragedy and comedy were born from the god\\'s sacred rituals.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bacchus_by_Caravaggio_1.jpg/960px-Bacchus_by_Caravaggio_1.jpg.webp', alt: 'Bacchus by Caravaggio, c. 1596. Uffizi Gallery, Florence.', caption: '<strong>Bacchus</strong> — Caravaggio, c. 1596. The god of wine as a young man, offering the viewer a glass of his own divinity.' },
  ]},`;

// Prometheus full replacement
const oldPrometheus = `  prometheus: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Prometheus_Bound_Rubens.jpg/960px-Prometheus_Bound_Rubens.jpg.webp', alt: 'Prometheus Bound by Peter Paul Rubens, c. 1612. Philadelphia Museum of Art.', caption: '<strong>Prometheus Bound</strong> — Peter Paul Rubens, c. 1612. The Titan chained to the Caucasus, liver torn by the eagle of Zeus.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Prometheus_Bound_Fuseli.jpg/960px-Prometheus_Bound_Fuseli.jpg.webp', alt: 'Prometheus Bound by Henry Fuseli, c. 1770. Kunsthaus Zürich.', caption: '<strong>Prometheus Bound</strong> — Henry Fuseli, c. 1770. The Romantic vision: agony as sublime defiance.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Prometheus_BM_Vase_E467.jpg/960px-Prometheus_BM_Vase_E467.jpg.webp', alt: 'Prometheus with the fennel stalk, Attic black-figure amphora, c. 570 BCE. British Museum.', caption: '<strong>Prometheus Steals Fire</strong> — Attic black-figure, c. 570 BCE. The Titan carries the fennel stalk with the stolen flame.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Prometheus_Heracles_BM_Vase_E467.jpg/960px-Prometheus_Heracles_BM_Vase_E467.jpg.webp', alt: 'Heracles freeing Prometheus, Attic red-figure krater, c. 450 BCE. British Museum.', caption: '<strong>Heracles Frees Prometheus</strong> — Attic red-figure, c. 450 BCE. The hero shoots the eagle, ending the Titan\\'s eternal torment.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Prometheus_Theft_Louvre_G192.jpg/960px-Prometheus_Theft_Louvre_G192.jpg.webp', alt: 'Prometheus and Athena, Attic red-figure krater, c. 480 BCE. Louvre Museum.', caption: '<strong>Prometheus and Athena</strong> — Attic red-figure, c. 480 BCE. The Titan receives the stolen fire from the goddess of wisdom.' },
  ]},`;

const newPrometheus = `  prometheus: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Peter_Paul_Rubens%2C_Flemish_(active_Italy%2C_Antwerp%2C_and_England)_-_Prometheus_Bound_-_Google_Art_Project.jpg/960px-Peter_Paul_Rubens%2C_Flemish_(active_Italy%2C_Antwerp%2C_and_England)_-_Prometheus_Bound_-_Google_Art_Project.jpg.webp', alt: 'Prometheus Bound by Peter Paul Rubens, c. 1612. Philadelphia Museum of Art.', caption: '<strong>Prometheus Bound</strong> — Peter Paul Rubens, c. 1612. The Titan chained to the Caucasus, liver torn by the eagle of Zeus.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Henry_Fuseli_-_Hephaestus%2C_Bia_and_Crato_Securing_Prometheus_on_Mount_Caucasus_-_Google_Art_Project.jpg/960px-Henry_Fuseli_-_Hephaestus%2C_Bia_and_Crato_Securing_Prometheus_on_Mount_Caucasus_-_Google_Art_Project.jpg.webp', alt: 'Henry Fuseli, Hephaestus, Bia and Crato Securing Prometheus on Mount Caucasus.', caption: '<strong>Prometheus Bound</strong> — Henry Fuseli. The Romantic vision: agony as sublime defiance, watched by powers of Olympus and Earth.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Classical_dinos_ARV_extra_-_Prometheus_and_satyrs_with_torches_(01).jpg/960px-Classical_dinos_ARV_extra_-_Prometheus_and_satyrs_with_torches_(01).jpg.webp', alt: 'Prometheus and satyrs with torches, Attic red-figure dinos, c. 420 BCE.', caption: '<strong>Prometheus with Satyrs and Torches</strong> — Attic red-figure dinos, c. 420 BCE. The fire-bringer stands amid the ecstatic retinue of Dionysus.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/NAMA_16384.jpg/960px-NAMA_16384.jpg.webp', alt: 'Heracles freeing Prometheus, Attic red-figure volute krater, c. 400 BCE. National Archaeological Museum, Athens.', caption: '<strong>Heracles Frees Prometheus</strong> — Attic red-figure volute krater, c. 400 BCE. The hero shoots the eagle, ending the Titan\\'s eternal torment.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Arkesilas_Painter_-_Atlas_and_Prometheus_-_Vaticano_MV-MGE_16592_-_03.jpg/960px-Arkesilas_Painter_-_Atlas_and_Prometheus_-_Vaticano_MV-MGE_16592_-_03.jpg.webp', alt: 'Atlas and Prometheus, Laconian kylix by the Arkesilas Painter, c. 565–560 BCE. Vatican Museums.', caption: '<strong>Atlas and Prometheus</strong> — Laconian kylix by the Arkesilas Painter, c. 565–560 BCE. The Titan holds the heavens while the fire-bringer looks on, serpent coiled below.' },
  ]},`;

if (src.includes(oldDionysos)) {
  src = src.replace(oldDionysos, newDionysos);
  console.log('FIXED: dionysos gallery');
} else {
  console.log('WARN: dionysos block not found');
}

if (src.includes(oldPrometheus)) {
  src = src.replace(oldPrometheus, newPrometheus);
  console.log('FIXED: prometheus gallery');
} else {
  console.log('WARN: prometheus block not found');
}

fs.writeFileSync(file, src);
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit' });

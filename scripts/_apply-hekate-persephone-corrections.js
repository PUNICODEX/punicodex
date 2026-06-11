const fs = require('fs');
const { execSync } = require('child_process');
const file = 'scripts/batch-update-galleries.js';
let src = fs.readFileSync(file, 'utf8');

const oldHekate = `  hekate: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Hecate_Chiaramonti_Inv1922.jpg/960px-Hecate_Chiaramonti_Inv1922.jpg.webp', alt: 'Hecate Chiaramonti, Roman copy. Vatican Museums.', caption: '<strong>Hecate Chiaramonti</strong> — Vatican Museums. The triple-bodied goddess, guardian of crossroads and protector of the home.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Hecate_Louvre_Ma_597.jpg/960px-Hecate_Louvre_Ma_597.jpg.webp', alt: 'Hecate, Roman copy. Louvre Museum, Paris.', caption: '<strong>Hecate</strong> — Louvre Museum. The torch-bearing goddess who walks between worlds.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Hecate_Pergamon_Altar.jpg/960px-Hecate_Pergamon_Altar.jpg.webp', alt: 'Hecate fighting the Giants, Pergamon Altar, c. 180 BCE. Pergamon Museum, Berlin.', caption: '<strong>Hecate on the Pergamon Altar</strong> — c. 180 BCE. The goddess battles Giants alongside the Olympians, torches blazing.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Hecate_Medea_Louvre_K289.jpg/960px-Hecate_Medea_Louvre_K289.jpg.webp', alt: 'Medea and Hecate, red-figure krater, c. 400 BCE. Louvre Museum.', caption: '<strong>Medea and Hecate</strong> — Red-figure krater, c. 400 BCE. The witch calls upon the goddess of magic at the crossroads.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Hecate_Dream.jpg/960px-Hecate_Dream.jpg.webp', alt: 'The Dream of Hecate, by Maximilian Pirner, 1909. National Gallery, Prague.', caption: '<strong>The Dream of Hecate</strong> — Maximilian Pirner, 1909. The goddess of the moon and magic in Symbolist vision.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Hecate_procession_MFA.jpg/960px-Hecate_procession_MFA.jpg.webp', alt: 'Hecate procession, Attic red-figure krater, c. 430 BCE. Museum of Fine Arts, Boston.', caption: '<strong>Hecate Procession</strong> — Attic red-figure, c. 430 BCE. The goddess leads spirits through the night.' },
  ]},`;

const newHekate = `  hekate: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Hecate_Chiaramonti_Inv1922.jpg/960px-Hecate_Chiaramonti_Inv1922.jpg.webp', alt: 'Hecate Chiaramonti, Roman copy. Vatican Museums.', caption: '<strong>Hecate Chiaramonti</strong> — Vatican Museums. The triple-bodied goddess, guardian of crossroads and protector of the home.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Statue_of_Hecate,_3rd_century_AD,_Antalya_Museum,_Turkey.jpg/960px-Statue_of_Hecate,_3rd_century_AD,_Antalya_Museum,_Turkey.jpg.webp', alt: 'Statue of Hecate, 3rd century AD, Antalya Museum, Turkey.', caption: '<strong>Hecate of Antalya</strong> — 3rd century AD. The triple-formed goddess stands with her torches, guardian of necropolis and night.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Hecate_fights_against_Klytios_%28left%29%3B_Artemis_against_Otos_%28right%29%2C_East_Frieze%2C_Gigantomachy_Frieze%2C_Pergamon_Altar%2C_Pergamon_Museum%2C_Berlin_%285913491142%29.jpg/960px-Hecate_fights_against_Klytios_%28left%29%3B_Artemis_against_Otos_%28right%29%2C_East_Frieze%2C_Gigantomachy_Frieze%2C_Pergamon_Altar%2C_Pergamon_Museum%2C_Berlin_%285913491142%29.jpg.webp', alt: 'Hecate fighting Klytios on the Pergamon Altar, c. 180 BCE. Pergamon Museum, Berlin.', caption: '<strong>Hecate on the Pergamon Altar</strong> — c. 180 BCE. The goddess battles the Giant Klytios alongside Artemis, torches blazing in marble fury.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hekate_2.jpg/960px-Hekate_2.jpg.webp', alt: 'Hecate statue, Antalya Museum.', caption: '<strong>Hecate</strong> — Antalya Museum. The goddess of crossroads preserved in a Roman-period statue, eyes fixed on the boundaries between worlds.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Afyonkarahisar_Archaeological_Museum_Statue_of_triple_Hecate,_Roman_period,_2nd_century_AD_1984.jpg/960px-Afyonkarahisar_Archaeological_Museum_Statue_of_triple_Hecate,_Roman_period,_2nd_century_AD_1984.jpg.webp', alt: 'Triple Hecate statue, Roman period, Afyonkarahisar Archaeological Museum.', caption: '<strong>Triple Hecate</strong> — Roman period, 2nd century AD. Three bodies, three faces, watching every direction at the crossroads.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Artemis_Hekate%2C_3rd_century_B._C.%2C_Apollonia._-_Limestone%2C_91.5_cm._Archaeological_Museum_of_Tirana.jpg/960px-Artemis_Hekate%2C_3rd_century_B._C.%2C_Apollonia._-_Limestone%2C_91.5_cm._Archaeological_Museum_of_Tirana.jpg.webp', alt: 'Artemis-Hekate, 3rd century BCE, Archaeological Museum of Tirana.', caption: '<strong>Artemis-Hekate</strong> — 3rd century BCE, Apollonia. A limestone fusion of huntress and goddess of the crossroads, protector of the necropolis.' },
  ]},`;

const oldPersephone = `  persephone: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Persephone_Villa_Albani.jpg/960px-Persephone_Villa_Albani.jpg.webp', alt: 'Persephone, Roman copy. Villa Albani, Rome.', caption: '<strong>Persephone</strong> — Villa Albani. Queen of the underworld, daughter of spring, goddess of both life and death.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Persephone_Louvre_Ma_487.jpg/960px-Persephone_Louvre_Ma_487.jpg.webp', alt: 'Persephone, Roman copy. Louvre Museum, Paris.', caption: '<strong>Persephone</strong> — Louvre Museum. The Kore who became Queen, innocence transformed into sovereignty.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Persephone_Hades_BM_Vase_E82.jpg/960px-Persephone_Hades_BM_Vase_E82.jpg.webp', alt: 'Persephone and Hades, Attic red-figure krater, c. 430 BCE. British Museum.', caption: '<strong>Persephone and Hades</strong> — Attic red-figure, c. 430 BCE. The queen and king of the dead, enthroned in shadows.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Persephone_Demeter_BM_Vase_E460.jpg/960px-Persephone_Demeter_BM_Vase_E460.jpg.webp', alt: 'Persephone and Demeter, Attic red-figure krater, c. 450 BCE. British Museum.', caption: '<strong>The Return of Persephone</strong> — The reunion with Demeter that brings spring to the world.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Persephone_Eleusis.jpg/960px-Persephone_Eleusis.jpg.webp', alt: 'Persephone of Eleusis, c. 330 BCE. Archaeological Museum of Eleusis.', caption: '<strong>Persephone of Eleusis</strong> — c. 330 BCE. The mystery goddess, keeper of the secrets of death and rebirth.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Persephone_Rape_BM_Vase_E82.jpg/960px-Persephone_Rape_BM_Vase_E82.jpg.webp', alt: 'The Rape of Persephone, Attic red-figure krater. British Museum.', caption: '<strong>The Rape of Persephone</strong> — The moment Hades seized her, and the world gained winter.' },
  ]},`;

const newPersephone = `  persephone: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Statue_of_Persephone_at_Eleusis,_Roman_period.jpg/960px-Statue_of_Persephone_at_Eleusis,_Roman_period.jpg.webp', alt: 'Statue of Persephone at Eleusis, Roman period.', caption: '<strong>Persephone of Eleusis</strong> — Roman period. Queen of the underworld, daughter of spring, goddess of both life and death.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Persephone_of_Eleusis_statue_02.jpg/960px-Persephone_of_Eleusis_statue_02.jpg.webp', alt: 'Persephone of Eleusis, Archaeological Museum of Eleusis.', caption: '<strong>Persephone of Eleusis</strong> — The Kore who became Queen, innocence transformed into sovereignty in the mystery sanctuary.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Persephone_Hades_BM_Vase_E82.jpg/960px-Persephone_Hades_BM_Vase_E82.jpg.webp', alt: 'Persephone and Hades, Attic red-figure krater, c. 430 BCE. British Museum.', caption: '<strong>Persephone and Hades</strong> — Attic red-figure, c. 430 BCE. The queen and king of the dead, enthroned in shadows.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Frederic_Leighton_-_The_Return_of_Persephone_(1891).jpg/960px-Frederic_Leighton_-_The_Return_of_Persephone_(1891).jpg.webp', alt: 'The Return of Persephone by Frederic Leighton, 1891.', caption: '<strong>The Return of Persephone</strong> — Frederic Leighton, 1891. The reunion with Demeter that brings spring back to the world.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Pluto_Serapis_and_Persephone_Isis_Heraklion_museum.jpg/960px-Pluto_Serapis_and_Persephone_Isis_Heraklion_museum.jpg.webp', alt: 'Pluto-Serapis and Persephone-Isis, Archaeological Museum of Heraklion.', caption: '<strong>Pluto-Serapis and Persephone-Isis</strong> — Archaeological Museum of Heraklion. The Greco-Egyptian fusion of underworld king and queen.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Apulian_red-figure_volute_krater_by_the_White_Sakkos_painter_Antikensammlung_Kiel_B_585_glare_reduced_white_bg.png/960px-Apulian_red-figure_volute_krater_by_the_White_Sakkos_painter_Antikensammlung_Kiel_B_585_glare_reduced_white_bg.png.webp', alt: 'Hades and Persephone enthroned, Apulian red-figure volute krater by the White Sakkos Painter, c. 320 BCE.', caption: '<strong>The Rape of Persephone</strong> — Apulian red-figure volute krater, c. 320 BCE. The moment Hades seized her, and the world gained winter.' },
  ]},`;

if (src.includes(oldHekate)) {
  src = src.replace(oldHekate, newHekate);
  console.log('FIXED: hekate gallery');
} else {
  console.log('WARN: hekate block not found');
}

if (src.includes(oldPersephone)) {
  src = src.replace(oldPersephone, newPersephone);
  console.log('FIXED: persephone gallery');
} else {
  console.log('WARN: persephone block not found');
}

fs.writeFileSync(file, src);
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit' });

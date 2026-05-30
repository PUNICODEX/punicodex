/**
 * Egyptian 2-letter concept words
 */

const { generateEntry } = require('./generate-entries');

const BATCH_DATA = [
  { id: 'ma', ascii: 'ma', unicode: 'Mꜣ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Truth, Rightness, Correctness, Measure', meaning: 'Truth, rightness, correctness, measure. Root of Maat (mꜣꜥt), the cosmic principle of truth and order', sources: ['Faulkner', 'Wb'] },
  { id: 'maa', ascii: 'maa', unicode: 'Mꜥ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Vision, Perception, Understanding', meaning: 'To see, to perceive, to understand. A core verb root, extremely common in texts', sources: ['Faulkner', 'Wb'] },
  { id: 'akh', ascii: 'akh', unicode: 'Ꜣḫ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Soul, Afterlife, Transfiguration', meaning: 'Akh, transfigured spirit; effective, luminous being. One of the highest forms of the soul', sources: ['Faulkner', 'Wb'] },
  { id: 'ab', ascii: 'ab', unicode: 'Ꜣb', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Heart, Conscience, Emotion', meaning: 'Heart. Central to the weighing of the heart ritual. Represents conscience, emotion, moral worth', sources: ['Faulkner', 'Wb'] },
  { id: 'sa', ascii: 'sa', unicode: 'Sꜥ', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Son, Divine Lineage, Kinship', meaning: 'Son. Used constantly in divine titles: Son of Ra, Son of Horus. A very common and important kinship term', sources: ['Faulkner', 'Wb'] },
  { id: 'hm', ascii: 'hm', unicode: 'Ḥm', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Majesty, Servant, Priest', meaning: 'Majesty; servant; priest. Appears in royal titulary (His Majesty). Also used for attendants or servants of gods', sources: ['Faulkner', 'Wb'] },
  { id: 'khp', ascii: 'khp', unicode: 'Ḫp', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Form, Appearance, Manifestation', meaning: 'Form; appearance; shape; manifestation. Important in magical and ritual contexts. Related to transformation and manifestation', sources: ['Faulkner', 'Wb'] },
];

module.exports = BATCH_DATA;

if (require.main === module) {
  let errors = 0;
  BATCH_DATA.forEach((data) => {
    try {
      const entry = generateEntry(data);
      if (entry.breakdown.length !== entry.ascii.length) {
        console.error(`ERROR ${entry.id}: breakdown length ${entry.breakdown.length} !== ascii length ${entry.ascii.length}`);
        errors++;
      }
      const reconstructed = entry.breakdown.map(b => b.to).join('');
      if (reconstructed !== entry.unicode) {
        console.error(`ERROR ${entry.id}: reconstructed "${reconstructed}" !== unicode "${entry.unicode}"`);
        errors++;
      }
      if (entry.id !== entry.ascii) {
        console.error(`ERROR ${entry.id}: id !== ascii`);
        errors++;
      }
    } catch (e) {
      console.error(`ERROR processing ${data.id}: ${e.message}`);
      errors++;
    }
  });
  console.log(`\nTotal entries: ${BATCH_DATA.length}`);
  console.log(`Errors: ${errors}`);
  if (errors === 0) console.log('All entries passed basic validation!');
}

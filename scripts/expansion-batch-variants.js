/**
 * PUNYCODEX — Spelling Variants Batch
 * Same ASCII base, different Unicode = different punycode = different domain
 */

const { generateEntry } = require('./generate-entries');

const BATCH_DATA = [
  // ==========================================
  // GREEK DUAL-TIER VARIANTS (per AGENTS.md)
  // ==========================================
  { id: 'hadesv1', ascii: 'hades', unicode: 'Hādēs', greek: 'Ἅιδης', pantheon: 'greek', tier: 'dual', tierLabel: 'Dual-Tier', domain: 'Underworld, Wealth', meaning: 'Variant: macron on alpha (length only, alternate restoration)', sources: ['LSJ', 'Pape-Benseler'] },

  // ==========================================
  // GREEK MAJOR GODS — accentless/plain variants
  // ==========================================
  { id: 'zeusv1', ascii: 'zeus', unicode: 'Zeus', greek: 'Ζεύς', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Sky, Thunder, King', meaning: 'Plain variant: no stress mark (modern English rendering)', sources: ['LSJ', 'Beekes'] },
  { id: 'aresv1', ascii: 'ares', unicode: 'Arēs', greek: 'Ἄρης', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'War, Courage', meaning: 'Plain variant: no acute accent (macron preserved)', sources: ['LSJ', 'Beekes'] },
  { id: 'athenav1', ascii: 'athena', unicode: 'Athena', greek: 'Ἀθήνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Wisdom, War, Crafts', meaning: 'Plain variant: no diacritics (modern English rendering)', sources: ['LSJ', 'Beekes'] },
  { id: 'poseidonv1', ascii: 'poseidon', unicode: 'Poseidōn', greek: 'Ποσειδῶν', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Sea, Earthquakes', meaning: 'Variant: macron only, no circumflex', sources: ['LSJ', 'Beekes'] },
  { id: 'hermesv1', ascii: 'hermes', unicode: 'Hermēs', greek: 'Ἑρμῆς', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Messenger, Commerce', meaning: 'Variant: macron only, no circumflex', sources: ['LSJ', 'Beekes'] },
  { id: 'aphroditev1', ascii: 'aphrodite', unicode: 'Aphroditē', greek: 'Ἀφροδίτη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Love, Beauty', meaning: 'Variant: macron only, no acute', sources: ['LSJ', 'Beekes'] },
  { id: 'herav1', ascii: 'hera', unicode: 'Hera', greek: 'Ἥρα', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Marriage, Queen', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },
  { id: 'artemisv1', ascii: 'artemis', unicode: 'Artemis', greek: 'Ἄρτεμις', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Hunt, Moon', meaning: 'Plain variant: no acute accent', sources: ['LSJ', 'Beekes'] },
  { id: 'dionysosv1', ascii: 'dionysos', unicode: 'Dionysos', greek: 'Διόνυσος', pantheon: 'greek', tier: '2', tierLabel: 'Tier 2', domain: 'Wine, Ecstasy', meaning: 'Plain variant: no acute accent', sources: ['LSJ', 'Beekes'] },
  { id: 'demeterv1', ascii: 'demeter', unicode: 'Demeter', greek: 'Δημήτηρ', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Harvest, Grain', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },
  { id: 'hephaistosv1', ascii: 'hephaistos', unicode: 'Hephaistos', greek: 'Ἥφαιστος', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Fire, Smithing', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },
  { id: 'hestiav1', ascii: 'hestia', unicode: 'Hestia', greek: 'Ἑστία', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Hearth, Home', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },
  { id: 'persephonev1', ascii: 'persephone', unicode: 'Persephone', greek: 'Περσεφόνη', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Spring, Underworld', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },
  { id: 'prometheusv1', ascii: 'prometheus', unicode: 'Prometheus', greek: 'Προμηθεύς', pantheon: 'greek', tier: '1', tierLabel: 'Tier 1', domain: 'Forethought, Fire', meaning: 'Plain variant: no diacritics', sources: ['LSJ', 'Beekes'] },

  // ==========================================
  // EGYPTIAN — Latin transliteration variants
  // ==========================================
  { id: 'rav1', ascii: 'ra', unicode: 'Rā', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Creator', meaning: 'Variant: macron (long-vowel rendering)', sources: ['Faulkner', 'Wb'] },
  { id: 'rav2', ascii: 'ra', unicode: 'Rá', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Creator', meaning: 'Variant: acute accent (stress rendering)', sources: ['Faulkner', 'Wb'] },
  { id: 'osirisv1', ascii: 'osiris', unicode: 'Osíris', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Death, Resurrection', meaning: 'Variant: acute on i (vocalized transliteration)', sources: ['Faulkner', 'Wb'] },
  { id: 'isisv1', ascii: 'isis', unicode: 'Ísis', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Magic, Motherhood', meaning: 'Variant: acute on i (vocalized transliteration)', sources: ['Faulkner', 'Wb'] },
  { id: 'anubisv1', ascii: 'anubis', unicode: 'Anúbis', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Mummification, Afterlife', meaning: 'Variant: acute on u (vocalized transliteration)', sources: ['Faulkner', 'Wb'] },
  { id: 'thothv1', ascii: 'thoth', unicode: 'Thóth', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, Writing', meaning: 'Variant: acute on o (vocalized transliteration)', sources: ['Faulkner', 'Wb'] },
  { id: 'amunv1', ascii: 'amun', unicode: 'Amon', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Wind, King of Gods', meaning: 'Variant: o-vowel (alternate Egyptological transliteration)', sources: ['Faulkner', 'Wb'] },
  { id: 'amunv2', ascii: 'amun', unicode: 'Amen', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Wind, King of Gods', meaning: 'Variant: e-vowel (biblical/Greek rendering)', sources: ['Faulkner', 'Wb'] },
  { id: 'ptahv1', ascii: 'ptah', unicode: 'Ptah', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Craftsmen', meaning: 'Variant: plain vocalization (no Egyptological diacritics)', sources: ['Faulkner', 'Wb'] },
  { id: 'sethv1', ascii: 'seth', unicode: 'Seth', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Chaos, Storm', meaning: 'Variant: plain vocalization (no Egyptological diacritics)', sources: ['Faulkner', 'Wb'] },
  { id: 'bastetv1', ascii: 'bastet', unicode: 'Bastet', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Cats, Home, Fertility', meaning: 'Variant: plain vocalization', sources: ['Faulkner', 'Wb'] },
  { id: 'sobekv1', ascii: 'sobek', unicode: 'Sobek', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Crocodiles, Water', meaning: 'Variant: plain vocalization', sources: ['Faulkner', 'Wb'] },
  { id: 'khnumv1', ascii: 'khnum', unicode: 'Khnum', greek: '—', pantheon: 'egyptian', tier: '2', tierLabel: 'Tier 2', domain: 'Pottery, Creation', meaning: 'Variant: plain vocalization', sources: ['Faulkner', 'Wb'] },

  // ==========================================
  // NORSE — anglicized/plain variants
  // ==========================================
  { id: 'thorsv1', ascii: 'thorr', unicode: 'Thorr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, Strength', meaning: 'Variant: th for thorn, double-r (anglicized)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'odinsv1', ascii: 'odinn', unicode: 'Oðinn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, War, Death', meaning: 'Variant: no acute (eth preserved)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'odinsv2', ascii: 'odinn', unicode: 'Odinn', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Wisdom, War, Death', meaning: 'Variant: plain anglicization', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'freyjasv1', ascii: 'freyja', unicode: 'Freya', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Love, Fertility, Seiðr', meaning: 'Variant: Anglo-Saxon spelling (j→y)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'lokisv1', ascii: 'loki', unicode: 'Lóki', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Trickery, Fire', meaning: 'Variant: acute accent (stressed form)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'tyrsv1', ascii: 'tyr', unicode: 'Tyr', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'War, Justice', meaning: 'Variant: no acute accent', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'baldrsv1', ascii: 'baldur', unicode: 'Baldur', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Light, Beauty', meaning: 'Variant: u-ending (Danish/Norse tradition)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'njordsv1', ascii: 'njord', unicode: 'Njord', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Sea, Wind, Wealth', meaning: 'Variant: plain anglicization (no o-slash)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },
  { id: 'heimdallsv1', ascii: 'heimdall', unicode: 'Heimdall', greek: '—', pantheon: 'norse', tier: '2', tierLabel: 'Tier 2', domain: 'Guardian, Foreknowledge', meaning: 'Variant: plain anglicization (no final r)', sources: ['Poetic Edda', 'Cleasby-Vigfusson'] },

  // ==========================================
  // SANSKRIT — anglicized variants
  // ==========================================
  { id: 'shivasv1', ascii: 'shiva', unicode: 'Shiva', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Destruction, Dance', meaning: 'Variant: sh for palatal s (anglicized)', sources: ['MW', 'Puranas'] },
  { id: 'shivasv2', ascii: 'shiva', unicode: 'Siva', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Destruction, Dance', meaning: 'Variant: plain s (simplified)', sources: ['MW', 'Puranas'] },
  { id: 'vishnusv1', ascii: 'vishnu', unicode: 'Vishnu', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Preservation, Cosmic Order', meaning: 'Variant: sh for retroflex ṣ (anglicized)', sources: ['MW', 'Puranas'] },
  { id: 'krishnasv1', ascii: 'krishna', unicode: 'Krishna', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Divine Love, Avatar', meaning: 'Variant: plain anglicization (no retroflex/under-dot)', sources: ['MW', 'Puranas'] },
  { id: 'brahmasv1', ascii: 'brahma', unicode: 'Brahma', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Creation, Knowledge', meaning: 'Variant: no macron (plain anglicization)', sources: ['MW', 'Puranas'] },
  { id: 'ganeshasv1', ascii: 'ganesha', unicode: 'Ganesha', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Remover of Obstacles', meaning: 'Variant: sh for palatal ś (anglicized)', sources: ['MW', 'Puranas'] },
  { id: 'indrasv1', ascii: 'indra', unicode: 'Indra', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Thunder, King of Gods', meaning: 'Variant: no acute accent', sources: ['MW', 'Puranas'] },
  { id: 'agnisv1', ascii: 'agni', unicode: 'Agni', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Fire, Sacrifice', meaning: 'Variant: no acute accent', sources: ['MW', 'Puranas'] },
  { id: 'suryasv1', ascii: 'surya', unicode: 'Surya', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Sun, Light', meaning: 'Variant: no macron', sources: ['MW', 'Puranas'] },
  { id: 'chadrasv1', ascii: 'chandra', unicode: 'Chandra', greek: '—', pantheon: 'sanskrit', tier: '2', tierLabel: 'Tier 2', domain: 'Moon, Mind', meaning: 'Variant: ch for palatal c (anglicized)', sources: ['MW', 'Puranas'] },
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
    } catch (e) {
      console.error(`ERROR processing ${data.id}: ${e.message}`);
      errors++;
    }
  });
  console.log(`\nTotal entries: ${BATCH_DATA.length}`);
  console.log(`Errors: ${errors}`);
  if (errors === 0) console.log('All entries passed basic validation!');
}

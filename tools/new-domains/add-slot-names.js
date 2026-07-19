#!/usr/bin/env node
/**
 * Generates curated sponsorship slot names for the 39 new flagship temples
 * (scripts/flagship-data.json#slotNames), themed per temple so the
 * auto-generator's "too generic" guard never fires.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST = require('./manifest.js');

// Per-temple themed words for the 13 slot name slots:
// [Crown, Column, Banner, Frame I, Frame II, Frame III, Ribbon, Seal, Inscription, Emblem, Sigil, Foundation, Dominion]
const THEMES = {
  achilleus: ['Wrath', 'Spear', 'Styx', 'Pelion', 'Armor', 'Myrmidon', 'Thetis', 'Ash', 'Rage', 'Glory', 'Heel', 'Tendon', 'Valor'],
  asklepios: ['Viper', 'Healer', 'Epidauros', 'Abaton', 'Chiron', 'Remedy', 'Oath', 'Spring', 'Cure', 'Koronis', 'Renewal', 'Clinic', 'Temple'],
  atropos: ['Shears', 'Thread', 'Moirai', 'Spindle', 'Measure', 'Fate', 'Klotho', 'Lachesis', 'Cut', 'Ananke', 'Skein', 'Turn', 'End'],
  delos: ['Palm', 'Lake', 'Leto', 'Cyclades', 'Sanctuary', 'Birth', 'Delia', 'Apollo', 'Harbor', 'Island', 'Anchor', 'Shrine', 'Aegean'],
  drakon: ['Ladon', 'Coil', 'Spring', 'Watcher', 'Scale', 'Hesperides', 'Apple', 'Unsleeping', 'Guardian', 'Orchard', 'Fang', 'Kadmos', 'Serpent'],
  monokeros: ['Horn', 'Purity', 'Ctesias', 'Narwhal', 'Virgin', 'Rarity', 'Wonder', 'Alicorn', 'Crescent', 'India', 'Chase', 'White', 'One'],
  phanes: ['Egg', 'Dawn', 'Firstborn', 'Orphic', 'Wing', 'Derveni', 'Reveal', 'Silver', 'Protogonus', 'Eros', 'Night', 'Shine', 'Light'],
  pegasos: ['Wing', 'Helikon', 'Chimaira', 'Bridle', 'Bellerophon', 'Hippokrene', 'Muse', 'Sky', 'Perseus', 'Gorgon', 'Spring', 'Cloud', 'Flight'],
  seiren: ['Song', 'Rock', 'Mast', 'Wax', 'Voice', 'Allure', 'Feather', 'Muse', 'Siren', 'Circe', 'Shore', 'Reef', 'Melody'],
  troia: ['Horse', 'Wall', 'Ilion', 'Helen', 'Laocoön', 'Achaean', 'Siege', 'Apple', 'Scamander', 'Ash', 'Gate', 'Citadel', 'Trojan'],
  tyche: ['Wheel', 'Fortune', 'Rudder', 'Cornucopia', 'Chance', 'Antioch', 'Eutychides', 'Turn', 'Lot', 'Fate', 'Hazard', 'Providence', 'Spin'],
  diana: ['Moon', 'Bow', 'Nemi', 'Grove', 'Huntress', 'Ceryneia', 'Stag', 'Crescent', 'Actaeon', 'Silver', 'Aventine', 'Lake', 'Quiver'],
  ianus: ['Gate', 'January', 'Gemini', 'Hinge', 'Key', 'Threshold', 'Door', 'Passage', 'First', 'Arch', 'Year', 'Face', 'Entry'],
  iuno: ['Peacock', 'Queen', 'Argus', 'Matronalia', 'Diadem', 'Lucina', 'Sky', 'Bridal', 'Scepter', 'June', 'Hera', 'Capitol', 'Crown'],
  iuppiter: ['Eagle', 'Thunder', 'Capitol', 'Oak', 'Bolt', 'Oath', 'Triumph', 'Fides', 'Sky', 'Optimus', 'Aquila', 'Laurel', 'Father'],
  neptunus: ['Trident', 'Tide', 'Horse', 'Dolphin', 'Wave', 'Deep', 'Mare', 'Earthquake', 'Brine', 'Hull', 'Anchor', 'Seahorse', 'Ocean'],
  vulcanus: ['Forge', 'Anvil', 'Etna', 'Hammer', 'Cyclops', 'Fire', 'Chain', 'Net', 'Volcano', 'Craft', 'Tongs', 'Alloy', 'Smith'],
  anubis: ['Jackal', 'Scale', 'Duat', 'Feather', 'Embalmer', 'Mountain', 'Shrine', 'Upwawet', 'Cynopolis', 'Mummy', 'Guide', 'Necropolis', 'Heart'],
  steh: ['Desert', 'Red Land', 'Storm', 'Sha', 'Apopis', 'Spear', 'Seth', 'Chaos', 'Barque', 'Strength', 'Dune', 'Sand', 'Foreigner'],
  seshat: ['Star', 'Scribe', 'Palm-Rib', 'Cord', 'Library', 'Measure', 'Ink', 'Seven', 'Leopard', 'Archive', 'Book', 'Year', 'Foundation'],
  hp: ['Nile', 'Flood', 'Cataract', 'Inundation', 'Lotus', 'Papyrus', 'Blue', 'Silt', 'Elephantine', 'Abundance', 'River', 'Delta', 'Hapi'],
  amsa: ['Portion', 'Share', 'Aditya', 'Ray', 'Heir', 'Quota', 'Sun', 'Part', 'Dividend', 'Lot', 'Sacrifice', 'Rite', 'Dawn'],
  daksa: ['Prajapati', 'Skill', 'Daughter', 'Sacrifice', 'Soma', 'Dharma', 'Order', 'Goat', 'Rite', 'Able', 'Kin', 'House', 'Craft'],
  dhatr: ['Establisher', 'Foundation', 'Rta', 'Order', 'Sun', 'Set', 'Upholder', 'Law', 'Place', 'Base', 'Creation', 'Aditya', 'Course'],
  pusan: ['Road', 'Path', 'Guide', 'Herd', 'Journey', 'Chariot', 'Star', 'Traveler', 'Goat', 'Soul', 'Nourisher', 'Way', 'Far'],
  tvastr: ['Forge', 'Vajra', 'Maker', 'Form', 'Wright', 'Cup', 'Bolt', 'Craft', 'Indra', 'Fashioner', 'Womb', 'Artisan', 'Shape'],
  fuxi: ['Trigram', 'River Horse', 'Cord', 'Bagua', 'Teacher', 'Net', 'Qin', 'Sovereign', 'Pattern', 'Yellow River', 'Marriage', 'First', 'Sign'],
  guanyin: ['Lotus', 'Willow', 'Mercy', 'Vase', 'Thousand Hands', 'Putuoshan', 'Vow', 'Hearing', 'Miaoshan', 'Pure Water', 'Compassion', 'Listening', 'Avalokiteśvara'],
  mengpo: ['Tea', 'Bridge', 'Naihe', 'Oblivion', 'Meng', 'Cup', 'Brew', 'Mengjiang', 'Wall', 'Old Lady', 'Five Flavors', 'Forget', 'Return'],
  nuwa: ['Stone', 'Mend', 'Clay', 'Serpent', 'Five Colors', 'Turtle', 'Sky', 'Mother', 'Reed Ash', 'Creation', 'Kunlun', 'Patch', 'Pillar'],
  pangu: ['Axe', 'Egg', 'Pillar', 'Giant', 'Chaos', 'Sky', 'Earth', 'Separation', 'Foundation', 'Four Quarters', 'Yin-Yang', 'Body', 'Armspan'],
  yanluo: ['Ledger', 'Court', 'Yama', 'Mirror', 'Book', 'Judge', 'Ten Kings', 'Dead', 'Bureau', 'Underworld', 'Fengdu', 'Verdict', 'Record'],
  hokkaido: ['Snow', 'North', 'Ainu', 'Lavender', 'Ice', 'Bear', 'Furano', 'Sapporo', 'Frontier', 'Sea', 'Okhotsk', 'Powder', 'Frost'],
  honshu: ['Fuji', 'Spine', 'Tōkaidō', 'Center', 'Kyoto', 'Edo', 'Lake', 'Main', 'Island', 'Station', 'Heartland', 'Capital', 'Peak'],
  kyushu: ['Aso', 'Volcano', 'Beppu', 'Takachiho', 'Nine Provinces', 'Amaterasu', 'Hot Spring', 'Kamikaze', 'South', 'Caldera', 'Ember', 'Arrival', 'Regalia'],
  tezcatlipoca: ['Mirror', 'Jaguar', 'Night', 'Toxcatl', 'Obsidian', 'Smoking', 'Foot', 'Cipactli', 'Sun', 'Temple', 'Sorcery', 'King', 'Fate'],
  xolotl: ['Twin', 'Dog', 'Guide', 'Axolotl', 'Mictlan', 'Court', 'Bone', 'Maize', 'Evening', 'Shadow', 'Salamander', 'Double', 'Loyal'],
  ogun: ['Iron', 'Blade', 'Forge', 'Cutlass', 'Warrior', 'Ire', 'Palm Oil', 'Dog', 'Smith', 'Road', 'Metal', 'War', 'Labor'],
  tumatauenga: ['Haka', 'Taiaha', 'War', 'Sky Push', 'Kūmara', 'Discipline', 'Face', 'Strength', 'All Blacks', 'Warrior', 'Cultivate', 'Rangi', 'People'],
};

function main() {
  const dataPath = path.join(ROOT, 'scripts', 'flagship-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const SUFFIXES = ['Crown', 'Column', 'Banner', 'Frame I', 'Frame II', 'Frame III', 'Ribbon', 'Seal', 'Inscription', 'Emblem', 'Sigil', 'Foundation', 'Dominion'];
  let added = 0;
  for (const e of MANIFEST) {
    if (data.slotNames[e.id]) continue;
    const theme = THEMES[e.id];
    if (!theme) {
      console.log(`NO THEME for ${e.id} — skipping`);
      continue;
    }
    data.slotNames[e.id] = SUFFIXES.map((suffix, i) => `${theme[i]} ${suffix}`);
    added++;
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`slotNames: added ${added} curated temple entries`);
}

main();

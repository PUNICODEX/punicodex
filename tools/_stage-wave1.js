// One-off: stage wave-1 assets, seat patterns, inject rental tiers for 12 domain-less promotions.
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const BATCH = 'ascii batch 24-08-26/punycodex';
const IDS = ['freyr', 'frigg', 'heimdallr', 'hel', 'ymir', 'fenrir', 'brigid', 'dagda', 'cernunnos', 'nuada', 'rhiannon', 'gwydion'];

// 1) assets: copy PNGs from the batch folder + webp siblings
(async () => {
  const sharp = require('sharp');
  for (const id of IDS) {
    const out = `sites/${id}/assets`;
    fs.mkdirSync(out, { recursive: true });
    for (const kind of ['mascot', 'logomark', 'logolockup']) {
      const src = `${BATCH}/${id}/${id}_${kind}.png`;
      const dst = `${out}/${id}_${kind}.png`;
      fs.copyFileSync(src, dst);
      await sharp(dst).webp({ quality: 88 }).toFile(dst.replace(/\.png$/, '.webp'));
    }
  }
  console.log('assets staged for 12');
})().then(() => {
  // 2) rental tiers
  const tiers = { freyr: 'S', frigg: 'A', heimdallr: 'A', hel: 'A', ymir: 'B', fenrir: 'S', brigid: 'A', dagda: 'A', cernunnos: 'A', nuada: 'B', rhiannon: 'A', gwydion: 'B' };
  // tiers are injected after promotion (archetype blocks don't exist yet)

  // 3) pattern seats
  const seats = [
    ['Agriculture, Food & Harvest', "      { id: 'freyr', weight: 2, why: 'The lord of harvest and peace — ár ok frið; rain and sunshine and the fruit of the earth are his to give.' },\n"],
    ['Gems, Jewelry & Luxury Materials', "      { id: 'freyr', weight: 1, why: 'Owner of Skíðblaðnir and Gullinbursti, the dwarf-forged wonders — the ship that folds into a pocket, the golden-bristled boar.' },\n"],
    ['Wine, Brewing & Hospitality', "      { id: 'freyr', weight: 1, why: 'The Uppsala feasts of the peace-years — Fróði-peace and plenty are remembered as his reign.' },\n"],
    ['Leadership, Governance & Public Administration', "      { id: 'frigg', weight: 2, why: 'Queen of the Æsir and consort of Óðinn — the only figure the sources show outmaneuvering him (the Grímnismál wager).' },\n"],
    ['Wedding, Family & Maternity', "      { id: 'frigg', weight: 2, why: 'The divine mother of the northern pantheon — her grief in Fensalir is mythology’s most famous mourning.' },\n"],
    ['Space, Astronomy & Celestial Science', "      { id: 'frigg', weight: 1, why: 'The folk star-name “Frigg’s distaff” for Orion’s belt — later tradition, but the only constellation owned by a goddess of the North.' },\n"],
    ['Defense, Military & Security', "      { id: 'heimdallr', weight: 2, why: 'The watchman of the gods — sight for a hundred leagues, hearing for the grass; the sentinel archetype entire.' },\n"],
    ['Communication, Messaging & Logistics', "      { id: 'heimdallr', weight: 1, why: 'The Gjallarhorn — mythology’s most famous signal; the horn that will be heard through all worlds.' },\n"],
    ['Environmental & Climate Services', "      { id: 'heimdallr', weight: 1, why: 'The white god of dawn and first light — morning-watch personified at the edge of the sky.' },\n"],
    ['Funerary & Memorial Services', "      { id: 'hel', weight: 2, why: 'The goddess of the dead entire — ruler of Éljúðnir, keeper of all who die of age and sickness.' },\n"],
    ['Healthcare, Pharma & Medicine', "      { id: 'hel', weight: 1, why: 'Hunger her dish, Famine her knife, Sick-bed her hall — the household of Éljúðnir is the corpus’s starkest personification of illness.' },\n"],
    ['Home, Hearth & Real Estate', "      { id: 'hel', weight: 1, why: 'Benches strewn with arm-rings, mead brewed for the guest — her hall receives the dead as its permanent residents.' },\n"],
    ['History, Archives & Records', "      { id: 'ymir', weight: 2, why: 'The first being — the corpus opens its memory with him; cosmogony made flesh.' },\n"],
    ['Mining & Natural Resources', "      { id: 'ymir', weight: 1, why: 'His flesh the earth, his bones the mountains, his blood the sea — the world quarried from a giant’s body.' },\n"],
    ['Environmental & Climate Services', "      { id: 'ymir', weight: 1, why: 'Frost and rime personified — the primordial ice of Ginnungagap from which every lineage descends.' },\n"],
    ['Pet Care & Animal Industries', "      { id: 'fenrir', weight: 2, why: 'The wolf the gods themselves fostered — captivity, dominance, and the animal that cannot be tamed.' },\n"],
    ['Disaster Resilience & Recovery', "      { id: 'fenrir', weight: 2, why: 'The foreknown catastrophe bound in a ribbon of six impossibles — risk deferred until Ragnarök.' },\n"],
    ['Legal, Justice & Compliance', "      { id: 'fenrir', weight: 1, why: 'Týr’s right hand in the wolf’s mouth — the pledge that made the binding lawful; a contract paid in flesh.' },\n"],
    ['Writing, Publishing & Media', "      { id: 'brigid', weight: 2, why: 'The poetess of the three sisters — Cormac’s Glossary makes poetry one of her three domains.' },\n"],
    ['Manufacturing, Craft & Automation', "      { id: 'brigid', weight: 2, why: 'The smith of the triad — smithcraft hers by name; the forge-fire tended as sacred duty.' },\n"],
    ['Healthcare, Pharma & Medicine', "      { id: 'brigid', weight: 2, why: 'The physician of the triad — healing as her third named domain; her well and flame both curative.' },\n"],
    ['Agriculture, Food & Harvest', "      { id: 'dagda', weight: 2, why: 'The cauldron of plenty — the undryable pot that feeds multitudes; abundance personified.' },\n"],
    ['Music, Arts & Performance', "      { id: 'dagda', weight: 2, why: 'Owner of the harp Uaithne — the three strains (grief, joy, sleep) are Irish music’s divine charter.' },\n"],
    ['Leadership, Governance & Public Administration', "      { id: 'dagda', weight: 1, why: 'Father-figure and king of the Tuatha Dé Danann — eighty years of rule in the Lebor Gabála.' },\n"],
    ['Forestry, Conservation & Outdoor Industries', "      { id: 'cernunnos', weight: 2, why: 'The horned god of animals and wild places — the Gundestrup master of beasts.' },\n"],
    ['History, Archives & Records', "      { id: 'cernunnos', weight: 2, why: 'One inscription ([C]ERNVNNOS, Pillar of the Boatmen, Tiberius-era) — the most materially attested Celtic theonym.' },\n"],
    ['Faith & Spiritual Organizations', "      { id: 'cernunnos', weight: 1, why: 'The Murray-to-Gardner descent — the god modern witchcraft claimed as its own, whatever the evidence says.' },\n"],
    ['Healthcare, Pharma & Medicine', "      { id: 'nuada', weight: 2, why: 'The silver arm of Dian Cécht and the flesh arm of Miach — medicine that rebuilds the king, at a price.' },\n"],
    ['Legal, Justice & Compliance', "      { id: 'nuada', weight: 2, why: 'The blemish law — the king must be whole; the corpus’s sharpest case study in fitness-for-office.' },\n"],
    ['Defense, Military & Security', "      { id: 'nuada', weight: 1, why: 'First king at Mag Tuired — he leads the Tuatha into both their great wars.' },\n"],
    ['Travel, Tourism & Place Branding', "      { id: 'rhiannon', weight: 1, why: 'The rider of Dyfed — the pale horse no pursuit can close; the Mabinogion’s most iconic image.' },\n"],
    ['Leadership, Governance & Public Administration', "      { id: 'rhiannon', weight: 2, why: 'Sovereignty itself — the Great Queen who chooses her own king and cannot be forced.' },\n"],
    ['Sports, Fitness & Competition', "      { id: 'rhiannon', weight: 1, why: 'The footrace she always wins by standing still — speed and pursuit outwitted.' },\n"],
    ['Astrology, Tarot & Esoteric Services', "      { id: 'gwydion', weight: 2, why: 'The enchanter of the Fourth Branch — shape-shifting, flower-bride crafting, the eagle called down the oak.' },\n"],
    ['Legal, Justice & Compliance', "      { id: 'gwydion', weight: 1, why: 'The crafted justice of the ending — the owl-shape for Blodeuwedd, the spear through Llech Gronw; punishment engineered to fit the crime.' },\n"],
    ['Agriculture, Food & Harvest', "      { id: 'gwydion', weight: 1, why: 'The swine-trick — the magician who conjured pigs from reeds and destabilized two kingdoms with them.' },\n"],
  ];

  let s = fs.readFileSync('type/js/industry-patterns.js', 'utf8');
  let applied = 0;
  for (const [industry, entry] of seats) {
    const marker = `    name: '${industry}',`;
    const idx = s.indexOf(marker);
    if (idx < 0) { console.error('industry not found:', industry); process.exit(1); }
    const entriesIdx = s.indexOf('    entries: [', idx);
    const insertAt = s.indexOf('\n', entriesIdx) + 1;
    s = s.slice(0, insertAt) + entry + s.slice(insertAt);
    applied++;
  }
  fs.writeFileSync('type/js/industry-patterns.js', s);
  console.log('seated', applied, 'pattern entries');
  fs.writeFileSync('/tmp/wave1-tiers.json', JSON.stringify(tiers));
});

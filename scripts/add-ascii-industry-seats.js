#!/usr/bin/env node
/**
 * Industry-pattern seats — ascii-restoration batch (2026-11).
 *
 * Inserts ≥3 curated {id, weight, why} seats per new flagship into the
 * canonical pattern arrays in type/js/industry-patterns.js, following the
 * file's mapping discipline:
 *   weight 2 — the industry is a direct expression of the entry's core domain.
 *   weight 1 — a resonant secondary association or namesake.
 * Idempotent: a seat already present in a pattern block is skipped.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'type', 'js', 'industry-patterns.js');
let src = fs.readFileSync(FILE, 'utf8');

// pattern name → array of seats
const SEATS = {
  'Funerary & Memorial Services': [
    { id: 'osiris', weight: 2, why: 'The weighing of the heart and the first mummy are the canonical warrant for every funerary rite after them — Osiris IS the judged dead.' },
    { id: 'sokar', weight: 2, why: 'Patron of the royal tomb-workers and the Memphite necropolis — the industry of the afterlife was literally his guild.' },
  ],
  'Agriculture, Food & Harvest': [
    { id: 'tefnut', weight: 1, why: 'The moisture-principle — dew and rain as the harvest\'s quiet half.' },
    { id: 'osiris', weight: 2, why: 'The green god of the Nile\'s return: his resurrection is the flood that fertilises the field — agriculture\'s founding myth.' },
    { id: 'sobek', weight: 2, why: 'The inundation itself was called "the arrival of Sobek" — the crocodile god is the flood that feeds the harvest.' },
    { id: 'min', weight: 2, why: 'His harvest festival opens with the king cutting the first sheaf before Min\'s shrine — the first-sheaf rite\'s divine owner.' },
    { id: 'geb', weight: 2, why: 'The earth-god whose body is the soil — grain, gold, and cattle all rise from Geb.' },
    { id: 'renenutet', weight: 2, why: 'The cobra of the last sheaf and the lady of the granary — every Egyptian storehouse was her chapel.' },
  ],
  'Maritime, Shipping & Ocean Industries': [
    { id: 'sobek', weight: 2, why: 'Master of the Nile and its crocodiles — the river\'s most dangerous passenger, propitiated by every who worked its waters.' },
    { id: 'nun', weight: 2, why: 'The primeval water that surrounds and underlies the world — every voyage crosses what was once all Nun.' },
    { id: 'njord', weight: 2, why: 'The Norse sea-lord of the safe shore and fair wind — sailors\' and merchants\' patron par excellence.' },
    { id: 'matsya', weight: 2, why: 'The great fish that bore the ark through the deluge — the flood survived by boat is his myth.' },
    { id: 'yammu', weight: 2, why: 'The sea itself as god — the Ugaritic ocean whose defeat by Baal is the Levant\'s oldest sea-story.' },
  ],
  'Space, Astronomy & Celestial Science': [
    { id: 'nut', weight: 2, why: 'Her body is the starry vault — temple ceilings across Egypt map the decans and planets on her skin.' },
    { id: 'aditi', weight: 1, why: 'Mother of the Ādityas — the solar gods whose circuit is the sky\'s first calendar.' },
    { id: 'chandra', weight: 2, why: 'The moon personified, lord of the nakṣatras — the lunar calendar and the planet both answer to him.' },
    { id: 'meru', weight: 2, why: 'The axis mountain around which sun, moon, and planets revolve — the cosmos\'s first orrery.' },
    { id: 'venus', weight: 1, why: 'The planet Venus is her namesake — the morning and evening star carried her name across every sky-map.' },
    { id: 'sahadeva', weight: 1, why: 'The epic\'s astronomer, whose star-charts set the war\'s calendar — the jyotiṣa tradition claims him as patron.' },
  ],
  'Defense, Military & Security': [
    { id: 'montu', weight: 2, why: 'The war-falcon of Thebes — "the Montu of kings" is the annals\' name for the victorious pharaoh himself.' },
    { id: 'onuris', weight: 2, why: 'The spear-bearing war-god of the Thinite nome, patron of the ancestral military aristocracy.' },
    { id: 'neith', weight: 2, why: 'Mistress of the bow, whose crossed arrows decide battles — her oracle settled the gods\' own succession-war.' },
    { id: 'min', weight: 1, why: 'His epithets link him to military power — the desert-roads he guarded fed the pharaoh\'s campaigns.' },
    { id: 'skanda', weight: 2, why: 'The deva-senāpati, general of the gods\' hosts — the war-god as professional commander.' },
    { id: 'indra', weight: 1, why: 'The Vedic storm-warrior whose hymns double as battle-songs — the Maruts are his war-band.' },
  ],
  'Healthcare, Pharma & Medicine': [
    { id: 'serket', weight: 2, why: 'She who causes the throat to breathe — goddess of venom and its cure, patron of healers of scorpion-sting and snakebite.' },
    { id: 'kebechet', weight: 2, why: 'Daughter of Anubis, the purifying cool water — the washing-rite that makes the body fit to be eternal is hers.' },
    { id: 'agni', weight: 1, why: 'The digestive fire and the healer\'s flame — Ayurveda\'s agni is the body\'s transformative heat.' },
  ],
  'Textiles, Weaving & Networks': [
    { id: 'neith', weight: 2, why: 'The weaver of the world\'s fabric at Sais — creation as textile-work is her founding metaphor.' },
    { id: 'tantra', weight: 1, why: 'The name means loom — the tantra is the warp on which the system\'s threads are stretched.' },
  ],
  'Thermal, Geothermal & Fire Energy': [
    { id: 'agni', weight: 2, why: 'Fire worshipped as god — hearth, lightning, and sun his three forms: the energy triad in one deity.' },
    { id: 'surtr', weight: 2, why: 'The fire-giant of Múspellsheimr whose burning sword outshines the sun — volcanism personified.' },
    { id: 'tapas', weight: 1, why: 'Heat as the engine of creation and austerity — the generative fire beneath every discipline.' },
  ],
  'Freshwater & Hydrology': [
    { id: 'nun', weight: 2, why: 'The primeval water from which creation rose and into which it returns — the deep aquifer of myth.' },
    { id: 'tefnut', weight: 2, why: 'The moisture-principle herself — dew, rain, and the humidity of the world\'s first morning.' },
    { id: 'kebechet', weight: 1, why: 'The cool water of purification — freshness itself, banked against the desert.' },
    { id: 'danu', weight: 2, why: 'The river-mother whose name waters the Danube, the Don, the Dnieper — hydrology\'s oldest eponym.' },
  ],
  'Meteorology & Weather Intelligence': [
    { id: 'indra', weight: 2, why: 'The storm-god of the Rigveda — the thunderbolt, the released waters, and the monsoon\'s personification.' },
    { id: 'yammu', weight: 1, why: 'The sea Baal must defeat — storm versus ocean is the Levant\'s weather-myth in combat form.' },
    { id: 'tefnut', weight: 1, why: 'The moisture the atmosphere carries — Shu\'s twin and the dew\'s deity, half of every forecast.' },
  ],
  'Aviation & Aerospace': [
    { id: 'montu', weight: 1, why: 'The war-falcon of Thebes — the sky as the falcon\'s field, the god\'s patrol.' },
    { id: 'nut', weight: 1, why: 'The sky\'s body itself — every ascent is a climb into her vault.' },
  ],
  'Wind & Atmospheric Energy': [
    { id: 'indra', weight: 2, why: 'The atmospheric storm-king — the Maruts, his wind-sons, are the gusts the turbines would harvest.' },
  ],
  'Cybersecurity & Digital Protection': [
    { id: 'serket', weight: 1, why: 'The scorpion who guards against poison — the specific threat turned back at the boundary.' },
  ],
  'Software, Cloud & Developer Infrastructure': [
    { id: 'neith', weight: 1, why: 'The world\'s weaver — the loom as the original network, warp and weft as threads and protocols.' },
  ],
  'Communication, Messaging & Logistics': [
    { id: 'agni', weight: 1, why: 'The messenger of the gods — every offering rides his flame; without Agni, no prayer arrives.' },
    { id: 'onuris', weight: 1, why: 'He who brings back the distant one — the divine retrieval specialist, fetcher of what fled.' },
    { id: 'mantra', weight: 1, why: 'The instrument of thought — sound engineered to carry meaning faultlessly, the original protocol.' },
  ],
  'Mining & Natural Resources': [
    { id: 'geb', weight: 2, why: 'The earth is his body and his treasury — gold, ore, and grain are mined from the god himself.' },
  ],
  'Manufacturing, Craft & Automation': [
    { id: 'sokar', weight: 2, why: 'Patron of the tomb\'s goldsmiths and metalworkers — the craft-guilds of the necropolis worked under him.' },
    { id: 'agni', weight: 1, why: 'The forge\'s flame and the potter\'s kiln — every transformative craft runs on his fire.' },
  ],
  'Architecture & Spatial Design': [
    { id: 'sokar', weight: 1, why: 'The Memphite necropolis as cosmogram — his ground taught sacred architecture to stage the mound.' },
    { id: 'karnak', weight: 2, why: 'The largest religious structure ever built — thirty pharaohs\' accumulated ground-plan, the discipline\'s deep canon.' },
    { id: 'luxor', weight: 1, why: 'The finest preserved New Kingdom colonnade — temple architecture\'s textbook front.' },
    { id: 'meru', weight: 1, why: 'Every mandala and temple-mountain is Meru in plan — sacred architecture\'s cosmographic source.' },
  ],
  'Gems, Jewelry & Luxury Materials': [
    { id: 'kubera', weight: 2, why: 'Lord of riches and the nine treasures — the gem-vaults of mythology are his accounting.' },
  ],
  'Beauty, Fashion & Cosmetics': [
    { id: 'venus', weight: 2, why: 'The goddess of beauty herself — the industry\'s namesake in every European language.' },
  ],
  'Wedding, Family & Maternity': [
    { id: 'bes', weight: 2, why: 'Guardian of the birth-chamber — the midwife\'s mask and the nursery\'s ward are his.' },
    { id: 'luxor', weight: 2, why: 'The birth-colonnade narrates Amenhotep III\'s divine conception — kingship\'s canonical birth-architecture.' },
    { id: 'min', weight: 2, why: 'The fertility god of the harvest and the bed — generative power as festival and guarantee.' },
    { id: 'yoni', weight: 2, why: 'The source and womb — the feminine principle as the world\'s first maternity.' },
    { id: 'venus', weight: 1, why: 'Genetrix — the mother of Aeneas and the Julian line, divine ancestress of a family-cult.' },
  ],
  'Home, Hearth & Real Estate': [
    { id: 'bes', weight: 2, why: 'The household god without a temple — every home was his, at the bed, the door, the mirror.' },
    { id: 'geb', weight: 1, why: 'The ground itself as god — real estate\'s most literal patron: the earth one stands on.' },
  ],
  'Pet Care & Animal Industries': [
    { id: 'nakula', weight: 2, why: 'Master of horses and cattle — the epic\'s great herdsman, born of the divine physicians.' },
    { id: 'sobek', weight: 1, why: 'His sacred crocodiles were kept, fed, adorned, and buried with honours — animal-keeping as cult.' },
  ],
  'Finance, Wealth & Commerce': [
    { id: 'kubera', weight: 2, why: 'The treasurer of the gods, regent of the north — wealth\'s oldest named guardian.' },
    { id: 'njord', weight: 2, why: 'The sea-lord of wealth and fair trade — the Norse merchant\'s patron, commerce under his calm.' },
    { id: 'renenutet', weight: 1, why: 'Lady of the granary — stored grain was wealth, and her audit was the realm\'s treasury.' },
  ],
  'Insurance & Protection Services': [
    { id: 'bes', weight: 1, why: 'The protector of the threshold — apotropaic insurance in dwarf-form, premium paid in amulets.' },
    { id: 'serket', weight: 2, why: 'The scorpion who guards against poison — protection against the specific peril, deity as underwriter.' },
    { id: 'yama', weight: 2, why: 'The judge whose account never errs — the final audit every policy eventually faces.' },
    { id: 'aditi', weight: 2, why: 'The unfettered one invoked against every bond — the oldest named protector from debt, disease, and doom.' },
    { id: 'matsya', weight: 1, why: 'The one who insured the species — the ark against the deluge, the policy that paid out in full.' },
  ],
  'Legal, Justice & Compliance': [
    { id: 'dharma', weight: 2, why: 'That which holds — law, duty, and righteousness personified, father of the dharmarāja.' },
    { id: 'yama', weight: 2, why: 'The first mortal who became the judge of all — his noose finds every soul at its hour.' },
    { id: 'osiris', weight: 1, why: 'The tribunal of the heart — the weighing against the feather is justice\'s oldest image.' },
  ],
  'Leadership, Governance & Public Administration': [
    { id: 'montu', weight: 1, why: 'The war-god in whose image the pharaoh governed — "Montu of kings" is the office\'s divine prefix.' },
    { id: 'duryodhana', weight: 1, why: 'The crown prince whose claim was legally arguable — governance\'s tragic case-study in succession.' },
    { id: 'dharma', weight: 1, why: 'The god of righteousness to whom every tribunal answers — kingship\'s moral warrant.' },
  ],
  'Philosophy, Ethics & Standards': [
    { id: 'dharma', weight: 2, why: 'The load-bearing concept of Indian ethics — svadharma as the standard every professional owes.' },
    { id: 'karma', weight: 2, why: 'The law of consequence — moral causation as the universe\'s compliance framework.' },
    { id: 'brahman', weight: 2, why: 'The absolute beneath every standard — neti neti as the discipline of definition itself.' },
    { id: 'tantra', weight: 1, why: 'The esoteric systems\' manuals — doctrine as method, initiation as certification.' },
    { id: 'yoni', weight: 1, why: 'The material cause in Sāṃkhya — prakṛti as the matrix in which every effect pre-exists.' },
    { id: 'nun', weight: 1, why: 'The inert ground of being — the waters before the word, philosophy\'s first image of potential.' },
  ],
  'Mental Health & Emotional Wellness': [
    { id: 'yoga', weight: 1, why: 'The stilling of the waves — citta-vṛtti-nirodha as the mind\'s original therapy.' },
    { id: 'karma', weight: 1, why: 'Deeds and their fruits — the doctrine that lets intention be examined, owned, and released.' },
    { id: 'bhakti', weight: 1, why: 'Loving devotion as emotional discipline — the heart\'s oldest regulated practice.' },
    { id: 'bodhidharma', weight: 1, why: 'Nine years facing the wall — the tradition\'s image of the mind trained past distraction.' },
  ],
  'Yoga, Meditation & Holistic Wellness': [
    { id: 'yoga', weight: 2, why: 'The discipline itself — union as practice, the eight limbs as curriculum.' },
    { id: 'tapas', weight: 2, why: 'The heat that ripens — austerity as one of kriyā-yoga\'s three disciplines.' },
    { id: 'tantra', weight: 2, why: 'The ritual systems of mantra, mandala, and visualization — embodied practice accelerated.' },
    { id: 'yoni', weight: 2, why: 'The subtle-body traditions\' ground — the source-principle of the esoteric anatomy.' },
    { id: 'bodhidharma', weight: 2, why: 'The First Patriarch of Zen — zazen, the wall-facing sitting, is his nine years made daily.' },
    { id: 'bhakti', weight: 1, why: 'Devotion as practice — the name-chant as the heart\'s repeating posture.' },
  ],
  'Sleep & Recovery Technology': [
    { id: 'chandra', weight: 1, why: 'The moon of the night-journey — Soma\'s cool light governs the hours sleep keeps.' },
    { id: 'yoga', weight: 1, why: 'The disciplines of withdrawal and rest — pratyāhāra as the original sleep-hygiene.' },
  ],
  'Astrology, Tarot & Esoteric Services': [
    { id: 'sahadeva', weight: 1, why: 'The epic\'s infallible astrologer — the jyotiṣa arts\' founding hero.' },
    { id: 'tantra', weight: 2, why: 'The esoteric systems par excellence — mantra, mandala, and initiation as service.' },
    { id: 'aditi', weight: 1, why: 'Mother of the Ādityas, the solar gods of the Vedic calendar — the zodiac\'s oldest family.' },
    { id: 'kalki', weight: 1, why: 'The prophesied one — the Kali Yuga\'s signs read like an astrologer\'s long-range forecast.' },
    { id: 'diti', weight: 1, why: 'Mother of the anti-gods — the shadow-zodiac\'s ancestral name.' },
  ],
  'Faith & Spiritual Organizations': [
    { id: 'brahman', weight: 2, why: 'The absolute as the ground of all cult — every temple stands on what the Upaniṣads call brahman.' },
    { id: 'bhakti', weight: 2, why: 'The devotional movements — vernacular, congregational, and still organizing.' },
    { id: 'mantra', weight: 2, why: 'The sacred formula as liturgy — japa is the daily office of hundreds of millions.' },
    { id: 'serapis', weight: 1, why: 'The Ptolemaic synthesis-god — state-built religion as organizational engineering.' },
    { id: 'kebechet', weight: 1, why: 'The purification-rites\' goddess — the liturgy of every libation poured for the dead.' },
  ],
  'Music, Arts & Performance': [
    { id: 'bhakti', weight: 2, why: 'The kīrtan and the nāma-saṅkīrtana — devotion\'s music, from Tamil hymns to global chant.' },
    { id: 'mantra', weight: 2, why: 'Sound as the art — the Gāyatrī recited for three millennia is performance\'s oldest continuous piece.' },
    { id: 'brahman', weight: 1, why: 'AUM as the resonant syllable — the primordial drone beneath every raga.' },
  ],
  'Gaming, Fantasy & Entertainment IP': [
    { id: 'indra', weight: 1, why: 'The dragon-slayer template — Vritra\'s defeat is fantasy\'s oldest boss-fight.' },
    { id: 'kalki', weight: 2, why: 'The world-ending rider — eschatology as franchise, the tenth avatāra endlessly re-staged.' },
    { id: 'diti', weight: 2, why: 'Mother of the Daityas — the anti-god dynasty that fantasy\'s villains keep recasting.' },
    { id: 'duryodhana', weight: 2, why: 'The Mahābhārata\'s tragic antagonist — wayang, film, and novel keep re-adjudging his claim.' },
    { id: 'arjuna', weight: 2, why: 'The Gītā\'s chariot is the world\'s most reproduced scene of instruction — epic as endless IP.' },
    { id: 'surtr', weight: 1, why: 'The fire-giant of Ragnarök — the genre\'s default volcanic apocalypse, name and all.' },
    { id: 'danu', weight: 1, why: 'Mother of the Tuatha Dé Danann — the fairy-canon\'s source, fantasy\'s oldest well.' },
    { id: 'gronwpebr', weight: 2, why: 'The Mabinogi\'s darkest triangle — retold from Saunders Lewis to a hundred modern renderings.' },
  ],
  'Sports, Fitness & Competition': [
    { id: 'arjuna', weight: 2, why: 'The archer of the svayaṃvara — skill under judgment, the contest won by a single shot.' },
    { id: 'skanda', weight: 2, why: 'The divine general and the vel — martial excellence as the gods\' own sport.' },
    { id: 'nakula', weight: 2, why: 'Master of horses and swords — the epic\'s professional athlete of the chariot arts.' },
    { id: 'min', weight: 1, why: 'The potency and the procession — vitality as festival-contest.' },
    { id: 'duryodhana', weight: 1, why: 'The mace-duel with Bhīma — sport and fate sharing one field.' },
    { id: 'tapas', weight: 1, why: 'The discipline of bearing the pairs of opposites — training as the oldest event.' },
    { id: 'bodhidharma', weight: 2, why: 'The Shaolin arts\' legendary founder — body-discipline as transmitted practice.' },
  ],
  'Travel, Tourism & Place Branding': [
    { id: 'karnak', weight: 2, why: 'The world\'s most visited ancient temple complex — Egypt\'s flagship brand since the Description.' },
    { id: 'luxor', weight: 2, why: 'Modern Egypt\'s tourist capital — the colonnade front is the nation\'s postcard.' },
    { id: 'danu', weight: 1, why: 'The sídhe-mounds and river-names — Ireland\'s mythic geography as destination.' },
    { id: 'gronwpebr', weight: 1, why: 'The Cynfael valley\'s spear-stone — myth pinned to a visitable landscape.' },
    { id: 'njord', weight: 1, why: 'The sea-lord of the safe shore — every coastal passage under his calm is his branding.' },
  ],
  'Writing, Publishing & Media': [
    { id: 'gronwpebr', weight: 2, why: 'His story survives in the White and Red Books — the Mabinogi manuscripts are Welsh literature\'s foundation.' },
    { id: 'sahadeva', weight: 1, why: 'The unheeded counsel — the epic\'s image of the expert\'s memo, read once and overridden.' },
  ],
  'AI, Data & Predictive Intelligence': [
    { id: 'sahadeva', weight: 2, why: 'The astronomer whose calculations were always right — predictive intelligence\'s founding hero.' },
    { id: 'karma', weight: 1, why: 'The law of consequence as moral data — action in, destiny out, no appeal.' },
  ],
  'Timekeeping & Calendar Systems': [
    { id: 'chandra', weight: 2, why: 'The lunar month\'s owner — every Hindu festival\'s dating runs on his phases.' },
    { id: 'sahadeva', weight: 2, why: 'The war\'s calendar was his — the epic\'s chronology kept by his stars.' },
    { id: 'renenutet', weight: 1, why: 'The harvest\'s clock — her festival closes the agricultural year.' },
  ],
  'Mapping & Geospatial': [
    { id: 'meru', weight: 2, why: 'The centre of every cosmological map — the mandala is geography\'s oldest projection.' },
  ],
  'Disaster Resilience & Recovery': [
    { id: 'matsya', weight: 2, why: 'The flood survived by ark — the species\' resilience plan, executed by a fish.' },
    { id: 'kalki', weight: 2, why: 'The restarter of time — after the sword, the new golden age: recovery as eschatology.' },
    { id: 'surtr', weight: 2, why: 'The fire that ends and renews — Ragnarök as the ultimate disaster-recovery cycle.' },
    { id: 'yammu', weight: 1, why: 'The sea subdued — the chaos-flood as the perennial threat the storm manages.' },
  ],
  'Love, Dating & Relationships': [
    { id: 'venus', weight: 2, why: 'The goddess of love — the industry\'s eponym, from the planet to the genre.' },
  ],
  'Automotive & Mobility': [
    { id: 'nakula', weight: 1, why: 'The master of horses — horsepower\'s oldest divine warrant.' },
    { id: 'skanda', weight: 1, why: 'The peacock-mount and the war-chariot — mobility as the god\'s parade.' },
  ],
  'Food & Hospitality': [
    { id: 'serapis', weight: 1, why: 'The modius of grain crowned him — the granary of the Mediterranean as hospitality\'s warrant.' },
  ],
  'Retail & Marketplaces': [
    { id: 'kubera', weight: 1, why: 'Lord of riches — the marketplace as his counting-house, the merchant\'s divine patron.' },
  ],
  'Ancestry & Heritage Services': [
    { id: 'yama', weight: 1, why: 'King of the ancestral world — the fathers\' realm he rules is genealogy\'s destination.' },
  ],
  'Global Pantheon Brands': [
    { id: 'serapis', weight: 2, why: 'The Ptolemies\' deliberately engineered pan-Mediterranean deity — the ancient world\'s most successful brand launch.' },
  ],
  'History, Archives & Records': [
    { id: 'karnak', weight: 1, why: 'The King List\'s gallery — history as the legitimation of the "Most Select of Places".' },
    { id: 'osiris', weight: 1, why: 'The Book of the Dead\'s judge — the archive of deeds, read aloud at the scales.' },
  ],
  'Optics, Imaging & Vision': [
    { id: 'arjuna', weight: 1, why: 'He shot the fish by its reflection alone — optics as the archer\'s solution.' },
  ],
  'Startups & Venture Creation': [],
};

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let inserted = 0, skipped = 0;
for (const [patternName, seats] of Object.entries(SEATS)) {
  if (!seats.length) continue;
  const nameRe = new RegExp(`name: '${escapeRe(patternName)}'`);
  const nameMatch = nameRe.exec(src);
  if (!nameMatch) { console.log(`! pattern not found: ${patternName}`); continue; }
  // find the end of this pattern's entries array: the first "\n    ]," after the name
  const tail = src.slice(nameMatch.index);
  const endIdx = tail.indexOf('\n    ],');
  if (endIdx === -1) { console.log(`! entries close not found: ${patternName}`); continue; }
  const blockEnd = nameMatch.index + endIdx;
  const block = src.slice(nameMatch.index, blockEnd);
  const adds = seats.filter((s) => !block.includes(`{ id: '${s.id}'`));
  skipped += seats.length - adds.length;
  if (!adds.length) continue;
  const lines = adds
    .map((s) => `\n\n      { id: '${s.id}', weight: ${s.weight}, why: ${JSON.stringify(s.why)} },`)
    .join('');
  src = src.slice(0, blockEnd) + lines + src.slice(blockEnd);
  inserted += adds.length;
}

fs.writeFileSync(FILE, src);
console.log(`industry seats: +${inserted}, ${skipped} already present`);

// verify ≥3 seats per entry
const ALL = ['osiris','sobek','nut','geb','tefnut','serket','serapis','neith','min','montu','nun','sokar','kebechet','renenutet','onuris','karnak','luxor','bes','indra','agni','yama','kalki','kubera','skanda','dharma','karma','yoga','aditi','brahman','bhakti','chandra','diti','duryodhana','arjuna','nakula','sahadeva','mantra','matsya','meru','tantra','tapas','yoni','surtr','njord','danu','gronwpebr','bodhidharma','yammu','venus'];
let low = [];
for (const id of ALL) {
  const n = (src.match(new RegExp(`\\{ id: '${id}'`, 'g')) || []).length;
  if (n < 3) low.push(`${id}(${n})`);
}
console.log(low.length ? `UNDER 3 SEATS: ${low.join(', ')}` : 'ALL 49 entries have ≥3 industry seats');

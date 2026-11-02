#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 6: tapas, yoni (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  tapas: {
    pronunciation: {
      ipa: '/ˈtʌpʌs/',
      ipaLabel: 'Sanskrit (IAST: Tapas)',
      phonemes: [
        { symbol: 'Ta-', desc: 'The root √tap means “to burn, to glow, to suffer heat” — the word begins in fire.' },
        { symbol: '-pas', desc: 'The neuter abstract ending; the final s is lightly sounded.' },
        { symbol: '', desc: 'Heat in every register: cosmic, ritual, bodily, and the heat of grief or remorse.' },
      ],
      approximation: '“TUP-us”',
      kin: [
        { label: 'Latin', form: 'tepeo — “I am warm”: the words are cousins across the Indo-European family' },
        { label: 'Range', form: 'cosmic heat · ritual heat · austerity · the fire of concentration' },
      ],
      note: 'The word’s cognate in Latin is tepeo, “I am warm” — the same heat-word, one family, two civilizations.',
    },
    domains: {
      title: 'Heat, the Generative Austerity',
      subtitle: 'The Fire That Burns Away and the Fire That Makes',
      lead: "<p class='lead-text'><strong>Tapas</strong> is heat as the engine of creation and purification: the fire that burned before the gods were born, the austerity by which sages bend the cosmos, the glow of concentration in which the mind’s dross is burned off. Every Indian cosmogony begins in tapas; every ascetic’s power is accounted for by it — the universe’s original and renewable energy.</p>",
      cards: [
        { name: 'The Cosmic Heat', desc: 'Before creation, the One heated itself by itself — tapas is the first act of every cosmogony.', iconPath: 'M32 12C26 22 22 30 22 38C22 46 26 52 32 52C38 52 42 46 42 38C42 30 38 22 32 12ZM32 40V52' },
        { name: 'Austerity', desc: 'The ascetic’s heat: fasting, silence, and posture banked like coals until power accrues.', iconPath: 'M20 48C20 34 24 24 32 24C40 24 44 34 44 48M16 48H48M32 24V12M24 16H40M28 52H36' },
        { name: 'Concentration’s Glow', desc: 'In yoga, tapas is one of the three disciplines (kriyā-yoga) — the heat that ripens meditation.', iconPath: 'M12 32C18 22 26 16 32 16C38 16 46 22 52 32C46 42 38 48 32 48C26 48 18 42 12 32ZM32 26A6 6 0 1 0 32 38A6 6 0 1 0 32 26' },
        { name: 'Prajāpati’s Fire', desc: 'The creator god heated himself to the world’s making — and his creatures’ tapas still feeds creation.', iconPath: 'M32 8V28M32 12L48 20M32 12L16 20M32 28L18 48M32 28L46 48M32 28V52M24 40H40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Tapas’s mythology is the mythology of creative heat: the One’s self-heating before the world, Prajāpati’s austerity that populates creation, and the sages’ banked fires that bend gods and kings. The epics count a sage’s power in years of tapas the way bankers count capital — and spend it the same way.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ṛgveda 10.129', title: 'The One Heated Itself', text: "<p class='myth-text'>The creation hymn’s second verse: ‘desire came upon the One in the beginning, that was the first seed of mind’ — and the One, the tradition glosses, heated itself by tapas until it multiplied into the world. The cosmogony is thermal: creation as the overflow of accumulated inner fire.</p>" },
        { tag: 'Śatapatha Brāhmaṇa', title: 'Prajāpati’s Exhaustion', text: "<p class='myth-text'>Prajāpati, having made the world, lay exhausted and dismembered; the gods reassembled him by offering, and his recovered heat (tapas) became the sun. The rite rekindles the creator daily — every sacrifice is a stoking of the first fire, the sun its visible remainder.</p>" },
        { tag: 'Epic Sage-Cycle', title: 'The Banked Fire of the Sages', text: "<p class='myth-text'>The Mahābhārata runs on tapas-economics: Paraśurāma’s austerity wins his axe; Viśvāmitra’s stands rival the gods’ own; and Śakuntalā’s ring is lost through a sage’s angry tapas-spell. Kings court sages as they court armies — a century of austerity, the epics know, outweighs a century of elephants.</p>" },
        { tag: 'Yoga-Sūtra', title: 'The Third Discipline', text: "<p class='myth-text'>Patañjali makes tapas one of kriyā-yoga’s three members — austerity, self-study, and devotion to the lord. The commentaries define it as bearing the pairs of opposites, heat and cold, honour and insult: the discipline of not flinching, by which the body becomes fit for stillness.</p>" },
      ],
    },
    syncretism: "Tapas is pan-Indian property: Vedic cosmogony, Jain austerity, Buddhist effort (viriya), and the yogic canon all bank the same fire. The Greek askesis is its structural twin — the comparatists’ standard pair — and the Latin tepeo keeps the family resemblance audible across the language tree.",
    culturalLegacy: "The word entered English as ‘tapas’ only in the yoga boom, but the concept underwrites every Indian discipline from the Vedic fire-altar to the modern meditation retreat. ‘Tapa’ as personal austerity remains a living practice across the subcontinent; and the cosmogonic image — the universe born of heat — is the oldest scientific-sounding sentence in any scripture.",
    extendedMeditation: "Tapas: the heat-word, restored in letters that hold no fire and yet warm on the tongue. Its cognate tepeo warms in Latin, its practice warms in a million meditation halls — the oldest energy in the lexicon, still unspent.",
    sources: [
      { name: 'Ṛgveda 10.129 (the self-heated One)' },
      { name: 'Śatapatha Brāhmaṇa 7.1–4 (Prajāpati’s recovery)' },
      { name: 'Mahābhārata sage-cycles (Paraśurāma, Viśvāmitra)' },
      { name: 'Patañjali, Yoga-sūtra 2.1' },
    ],
    archaeology: "Tapas leaves the ascetic’s traces: the śramaṇa figures of Mathura sculpture, the fire-altars of the Śrauta ritual rebuilt a thousand times, and the modern retreat-centres of every Indian tradition. Its monument is the ember.",
    cult: "The daily sādhana is its liturgy; the fortnightly fasts and the great austerities (cāndrāyaṇa and the rest) are its banked fires. The tapasvī — the practitioner of heat — is a recognized religious type to this day.",
    iconography: "The meditator in the fire’s heart, or the sage ringed by flames; the Agni of the altar and the inner sun of the subtle body. Its icon is the ember-bank: heat visible only at the cracks.",
    reception: "Comparative religion pairs tapas with askesis as the twin engines of pre-modern self-culture; and the creation-hymn’s thermal cosmogony is cited in every history of science as the oldest speculation that the universe’s origin was energetic, not verbal. The word’s modern life — ‘heating up’ in meditation — is the old fire in new rooms.",
  },

  yoni: {
    pronunciation: {
      ipa: '/ˈjoʊni/',
      ipaLabel: 'Sanskrit (IAST: Yoni)',
      phonemes: [
        { symbol: 'Yo-', desc: 'The root is √yu, “to unite, join” — the same yu-family as yoga’s yoking.' },
        { symbol: '-ni', desc: 'The feminine noun: “womb”, “source”, “place of origin”.' },
        { symbol: '', desc: 'The feminine principle, the origin — paired with the liṅga in Śaiva worship.' },
      ],
      approximation: '“YOH-nee”',
      kin: [
        { label: 'Counterpart', form: 'liṅga — the mark; together the Śaiva aniconic pair' },
        { label: 'Root', form: '√yu — to unite; the same family as yoga' },
      ],
      note: 'The word means womb, source, and place of origin — the feminine as the container of creation.',
    },
    domains: {
      title: 'The Womb, the Feminine Principle',
      subtitle: 'The Source from Which All Creation Flows',
      lead: "<p class='lead-text'><strong>Yoni</strong> is the source: the womb, the origin-place, the feminine principle that the Śaiva tradition pairs with the liṅga as the two-in-one of all generation. In philosophy it names the material cause — prakṛti, the matrix from which the differentiated world flows; in ritual it is the altar’s base, the goddess’s body, and the cosmic ground on which the god stands.</p>",
      cards: [
        { name: 'The Liṅga-Yoni', desc: 'The Śaiva aniconic pair: the standing mark in the flowing base — creation and its ground, united.', iconPath: 'M32 8C28 14 26 20 26 28C26 36 28 40 32 40C36 40 38 36 38 28C38 20 36 14 32 8ZM18 44C26 40 38 40 46 44C42 48 36 50 32 50C28 50 22 48 18 44ZM14 52H50' },
        { name: 'The Material Cause', desc: 'In Sāṃkhya-Yoga, prakṛti the yoni is the womb of the world — all effects pre-exist in their cause.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM32 24V44M26 30L38 42M38 30L26 42' },
        { name: 'The Goddess’s Body', desc: 'In the Śākta traditions the yoni is the goddess herself — the pīṭha, the sacred seat of power.', iconPath: 'M20 40C20 28 28 20 36 22C44 24 48 32 44 40C40 48 28 50 22 44M30 30L34 34M38 30L34 34M26 36H42' },
        { name: 'The Ritual Base', desc: 'Every Śaiva altar’s foundation is the yoni-shaped basin, catching the libation that feeds the god.', iconPath: 'M16 40H48M20 40L16 52M44 40L48 52M16 52H48M32 40V28M24 32H40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>The yoni’s mythology is the Śaiva theology of the pair: the god and his power, the liṅga and its base, the still and the flowing. Its narratives are the Goddess-traditions’ own — Satī’s sacrifice, the dismembered pīṭhas, and the tantric ritual in which the base is the goddess’s body receiving the god’s libation. The word itself is the doctrine: the womb as the world’s first fact.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Liṅga Purāṇa', title: 'The Endless Pillar and Its Base', text: "<p class='myth-text'>The tradition’s founding image: the endless pillar of fire — the liṅga without top or bottom — that humbled Brahmā and Vishnu, standing in the yoni-base as the ground of the ground. The Purāṇa’s theology is exact: the mark is the god, the base is his power, and worship of the one without the other is incomplete.</p>" },
        { tag: 'Satī Cycle', title: 'The Dismembered Seat', text: "<p class='myth-text'>When Satī self-immolated at her father’s insult, Śiva wandered the world with her corpse, and the pieces fell as the śakti-pīṭhas — each a seat of the goddess’s power, each in some tellings marked by the yoni. The tantric pilgrimages map the goddess’s body onto the subcontinent: the womb as sacred geography.</p>" },
        { tag: 'Tantric Ritual', title: 'The Rite of the Base', text: "<p class='myth-text'>In the tantric pūjā the yoni-basin receives the libations poured over the liṅga, channelling the offering to the goddess below. The ritual grammar is the theology in action: creation as the union of the standing god and the flowing ground, generation as worship.</p>" },
        { tag: 'Sāṃkhya Philosophy', title: 'The Matrix of Causes', text: "<p class='myth-text'>The Sāṃkhya makes yoni technical: prakṛti, the material cause, is the womb in which all effects pre-exist — the tree in the seed, the world in the matrix. The doctrine of satkāryavāda, ‘the effect pre-exists in the cause’, is the philosophy of the yoni stated as metaphysics.</p>" },
      ],
    },
    syncretism: "The yoni-liṅga pair absorbed every Indian polarity — puruṣa and prakṛti, god and goddess, stillness and flow — into a single aniconic form. The tantric traditions made it explicit worship; the Puranic made it respectable; and the modern world received it as scandal and symbol at once, usually without the theology.",
    culturalLegacy: "The liṅga-yoni is Hinduism’s most reproduced and least understood image — the tourist’s puzzle and the theologian’s précis. ‘Yoni’ entered English in the nineteenth century as a learned word; and the goddess’s-seats (śakti-pīṭhas) remain the subcontinent’s most charged pilgrimage geography.",
    extendedMeditation: "Yoni: the source-word, restored in plain letters that offer no euphemism and need none. The lexicon holds it as the tradition does — beside the liṅga, as the ground holds the standing thing. Two syllables, the world’s first fact.",
    sources: [
      { name: 'Liṅga Purāṇa (the endless pillar)' },
      { name: 'Devīpurāṇa and Śakti-pīṭha traditions (Satī cycle)' },
      { name: 'Sāṃkhyakārikā (the material cause)' },
      { name: 'Tantric pūjā-prakāśa ritual texts' },
    ],
    archaeology: "The yoni’s monuments are the oldest Śaiva remains: the Gupta liṅgas with their carved bases, the Gudimallam ithyphallic Śiva, and the aniconic aniconism of every village shrine’s stone pair. The pīṭha-stones of Kāmākhyā are its most charged site.",
    cult: "The daily liṅga-pūjā is its liturgy — the pouring, the catching, the feeding of the ground. The menstruation-temples of the goddess-traditions (Kāmākhyā above all) keep its most esoteric calendar.",
    iconography: "The liṅga rising from the yoni-basin, the channel of the libation cut into the base; or the goddess’s body as the seat. Its icon is the union: never the one without the other.",
    reception: "Religious studies treats the pair as the classic case of aniconic representation carrying full theology; and the modern West’s reception — oscillating between snigger and reverence — is itself a chapter in the study of how cultures misread what they have no grammar for.",
  },
};

let added = 0, skipped = 0;
for (const [id, entry] of Object.entries(ENTRIES)) {
  if (lore[id] && Object.keys(lore[id]).length) {
    console.log(`  = ${id}: exists, preserved`);
    skipped++;
    continue;
  }
  lore[id] = entry;
  added++;
  console.log(`  + ${id}`);
}
if (added) {
  fs.writeFileSync(LORE_PATH, JSON.stringify(lore, null, 2) + '\n');
}
console.log(`\nlore-catalog: +${added} entries, ${skipped} preserved, ${Object.keys(lore).length} total`);

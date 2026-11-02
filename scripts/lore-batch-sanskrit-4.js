#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 4: the Mahābhārata heroes (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  duryodhana: {
    pronunciation: {
      ipa: '/dʊrjˈoːdʰənə/',
      ipaLabel: 'Sanskrit (IAST: Duryodhana)',
      phonemes: [
        { symbol: 'Dur-', desc: 'The prefix dur- means “hard, ill” — the same intensifier as in “duress”.' },
        { symbol: '-yo-', desc: 'From yudh, “fight”: yodhana, “fighting”. The compound is transparent: hard to conquer in battle.' },
        { symbol: '-dhana', desc: 'The dh is a voiced aspirate; the name his mother chose against his father’s better judgement.' },
      ],
      approximation: '“door-YO-dhun-uh”',
      kin: [
        { label: 'Birth-name', form: 'Suyodhana — “good in battle”; the name was changed by the Pāṇḍavas’ jibe' },
        { label: 'Father', form: 'Dhṛtarāṣṭra, the blind king' },
      ],
      note: 'He was born Suyodhana; the jeering name by which history knows him is itself a piece of the epic’s blame-work.',
    },
    domains: {
      title: 'Hard to Conquer in Battle',
      subtitle: 'The Eldest Kaurava, Rival of the Pāṇḍavas',
      lead: "<p class='lead-text'><strong>Duryodhana</strong> is the Mahābhārata’s tragic antagonist: the eldest of the hundred Kauravas, peerless mace-fighter, generous friend, and the man whose refusal to yield an inch of the kingdom brought the world to war. The epic refuses to make him a villain simple enough to hate — his claim is legally arguable, his grievance real, and his end the war’s most earned lamentation.</p>",
      cards: [
        { name: 'The Hundredth Son', desc: 'Born of Gandhārī’s split pregnancy as a ball of flesh, divided into a hundred sons by Vyāsa’s grace.', iconPath: 'M32 12C24 18 18 26 18 36C18 46 24 52 32 52C40 52 46 46 46 36C46 26 40 18 32 12ZM32 22V42M26 27L38 41M38 27L26 41' },
        { name: 'Mace-Master', desc: 'The equal of Bhīma with the gadā; his duel with Bhīma closes the war’s eighteenth day.', iconPath: 'M18 46L44 18M44 18L38 20M44 18L42 26M18 46L12 40M18 46L24 52M36 32L28 24M40 36L32 28' },
        { name: 'Friend of Karṇa', desc: 'The epic’s one unbreakable friendship: the outcast-sūta king he crowned against all caste law.', iconPath: 'M18 40C18 30 24 24 30 26C36 28 38 36 34 42C30 48 20 48 18 40ZM38 40C38 30 44 24 50 26C56 28 58 36 54 42C50 48 40 48 38 40' },
        { name: 'The Dice Refusal', desc: '“Not a needle’s point of land” — the sentence that made the Kurukṣetra war inevitable.', iconPath: 'M16 48L32 32L48 48M24 40H40M32 32V12M26 18H38M28 24H36' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Duryodhana’s mythology is the Mahābhārata read from the losing side: the crown prince displaced by cousins the law favoured, the commander whose every general was better than his cause. The epic gives him the war’s best exit-line and its most human griefs — for Karṇa, for his sons, and for the pride he would not trade for peace.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ādi Parvan', title: 'The Ball of Flesh', text: "<p class='myth-text'>Gandhārī carried her pregnancy two years; delivered of a hard mass of flesh, she was about to cast it away when Vyāsa ordered it divided — a hundred pieces in oil-jars, and one more that became Duhśalā. Duryodhana’s birth-omen — braying donkeys, circling vultures — had the elders counselling his abandonment; Dhṛtarāṣṭra’s love overruled the omen, and the epic marks the moment the world’s fate turned.</p>" },
        { tag: 'Sabhā Parvan', title: 'The Dice Game', text: "<p class='myth-text'>At Śakuni’s loaded board, Duryodhana won the Pāṇḍavas’ kingdom, their liberty, and their queen — and ordered Duḥśāsana to drag Draupadī to the court. Her question — what did you stake first, the kingdom or me? — unmade his legal victory and made his moral one: he returned the stakes and later the kingdom, but the insult outlived the restitution.</p>" },
        { tag: 'Udyoga Parvan', title: 'The Embassies and the Refusal', text: "<p class='myth-text'>Krishna came in peace, then as war-herald; the Pāṇḍavas asked for five villages. ‘I will not give the Pāṇḍavas land equal to the point of a needle’ — Duryodhana’s answer to Krishna’s peace-mission is the epic’s hinge. Every reader who has wished he’d yielded has made the epic’s point: the war was chosen, not fated.</p>" },
        { tag: 'Śalya & Bhīma', title: 'The Last Duel', text: "<p class='myth-text'>On the war’s final day Duryodhana, alone of the hundred, met Bhīma by the lake of blood. Equal until the last, he fell to the mace-blow Bhīma aimed below the belt — the one illegal stroke of their duel, urged by Krishna. The epic lets the ‘good’ side win by the foul its cause had licensed; Duryodhana’s dying reproach stands unanswered in the text.</p>" },
      ],
    },
    syncretism: "Duryodhana is the epic’s dark mirror of the dharmarāja Yudhiṣṭhira: where the eldest Pāṇḍava keeps the letter and loses the spirit, Duryodhana keeps the pride and loses everything. Later tradition made him a byword for envy, but the critical readings — from the Bhārata’s own ambivalence to modern novelists — keep restoring the man the epic refused to flatten.",
    culturalLegacy: "His name is the subcontinent’s standing word for ruinous obstinacy; his friendship with Karṇa, for loyalty across caste. The dice-game is staged as dance-drama across South and Southeast Asia; and in Indonesian wayang, where the Mahābhārata became a national epic, Duryodhana (Duryudana) is among the most beloved characters — the loser the culture refuses to disown.",
    extendedMeditation: "Duryodhana: a name that means “hard to conquer”, worn by the man history conquered most completely. Restored plainly, it keeps its double edge — the boast and the epitaph in four syllables, the epic’s whole tragedy compressed into one who would not yield a needle’s point.",
    sources: [
      { name: 'Mahābhārata, Ādi Parvan (the birth)' },
      { name: 'Mahābhārata, Sabhā Parvan (the dice game)' },
      { name: 'Mahābhārata, Udyoga Parvan (the refusal)' },
      { name: 'Mahābhārata, Śalya Parvan (the final duel)' },
    ],
    archaeology: "Duryodhana’s monuments are performance: the Kutiyattam and Kathakali stages of Kerala keep the dice-game and the embassies in living repertory; and the Indonesian wayang kulit shadow-theatre’s Duryudana puppets are museum-pieces of the epic’s longest journey.",
    cult: "No temples to Duryodhana in orthodox India — the victors’ orthodoxy forbade it. But the epic’s own ambivalence is his cult: he is the character every Mahābhārata retelling must rescue from simplicity.",
    iconography: "The mace-fighter in royal dress, often with Karṇa beside him; in Indonesian wayang, the strong rounded form of the amUK-king. His icon is the clenched fist — the epic’s most repeated gesture of refusal.",
    reception: "Comparative literature sets him beside Achilles and Turnus as the enemy the epic loves; postcolonial readings (Bhyrappa’s <em>Parva</em>, the Indonesian tellings) made his cause the honest one. He remains the great test of the Mahābhārata’s fairness: the reader who hates him has read half the book.",
  },

  arjuna: {
    pronunciation: {
      ipa: '/ˈɑːrdʒʊnə/',
      ipaLabel: 'Sanskrit (IAST: Arjuna)',
      phonemes: [
        { symbol: 'Ar-', desc: 'The j is the palatal “j” of “jump”; the name is related to arjuna, “white, silver”.' },
        { symbol: '-ju-', desc: 'Short u as in “put”; the compound flows without stress in the classical cadence.' },
        { symbol: '-na', desc: 'The final a is a light schwa; the name means “the white one”, “the silvery”.', },
      ],
      approximation: '“AHR-joo-nuh”',
      kin: [
        { label: 'Epithet', form: 'Pārtha — son of Pṛthā (Kuntī); Kirīṭin — the diademed' },
        { label: 'Father', form: 'Indra, by Kuntī’s summoning of the king of gods' },
      ],
      note: 'The third Pāṇḍava, to whom Krishna speaks the Bhagavadgītā on the eve of the war.',
    },
    domains: {
      title: 'The Third Pāṇḍava, the Great Archer',
      subtitle: 'The Warrior Who Doubted, and the Gītā’s Listener',
      lead: "<p class='lead-text'><strong>Arjuna</strong> is the Mahābhārata’s central hero: the archer without equal, winner of Draupadī’s svayaṃvara, friend and charioteer-client of Krishna, and the man whose crisis on the battlefield became the occasion of the Bhagavadgītā — the moment world philosophy was spoken from a chariot between two armies.</p>",
      cards: [
        { name: 'The Gandiva', desc: 'The bow of Brahmā, won from Agni at Khaṇḍava; its twang alone routs armies.', iconPath: 'M14 8C22 24 22 40 14 56M14 12L48 32L14 52M44 32L52 32M10 30L18 34' },
        { name: 'The Svayaṃvara', desc: 'He alone shot the eye of the rotating fish at Draupadī’s bride-choice, looking only at its reflection.', iconPath: 'M32 12L48 32L32 52L16 32ZM32 24A4 4 0 1 0 32 32A4 4 0 1 0 32 24M8 32H16M48 32H56' },
        { name: 'The Gītā’s Chariot', desc: 'Between the armies he faltered — and Krishna answered with eighteen chapters that became a scripture.', iconPath: 'M12 44H52M18 44L22 28H42L46 44M24 28L32 18L40 28M32 18V8M16 52H48M22 44V52M42 44V52' },
        { name: 'The Tīrtha Pilgrimage', desc: 'His year of exile became the Tīrthayātrā — the epic’s encyclopedia of India’s sacred geography.', iconPath: 'M8 48C18 32 28 40 36 32C44 24 50 28 56 14M8 48L56 14M14 52H50' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Arjuna’s mythology is the epic’s spine: the feats of the forest-years, the disguises of the incognito year, the divine weapons won from Śiva and Indra, and the chariot-dialogue that turned a battle’s morning into the world’s most read scripture. He is the hero who wins everything and is saved, in the end, by having once doubted.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ādi Parvan', title: 'The Pāṇḍavas’ Birth', text: "<p class='myth-text'>When Pāṇḍu was cursed to die at love’s consummation, Kuntī used the boon of the mantra: Dharma fathered Yudhiṣṭhira, Vāyu Bhīma, and Indra himself Arjuna — born, the epic says, with Indra’s marks. The third son was trained by Droṇa, favoured by the master above all pupils, and marked from birth as the one who would carry the war.</p>" },
        { tag: 'Vana Parvan', title: 'The Kirātārjunīya', text: "<p class='myth-text'>In the forest, Arjuna did austerities for the divine weapons; Śiva came as a kirāta, a hill-tribesman, and they fought over a boar’s carcass until the god revealed himself and gave the Pāśupata — the shaft that ends worlds. Kālidāsa made the combat his greatest mahākāvya, the <em>Kirātārjunīya</em>.</p>" },
        { tag: 'Bhagavadgītā', title: 'The Chariot and the Crisis', text: "<p class='myth-text'>Seeing his teachers and kinsmen ranked against him, Arjuna lowered his bow: ‘I will not fight.’ Krishna’s answer — eighteen chapters on duty, devotion, the self, and action without attachment — is the Bhagavadgītā, the most read and most translated of Sanskrit texts. The war resumed; but the dialogue outgrew it entirely.</p>" },
        { tag: 'Aśvamedhika', title: 'The Horse and the End', text: "<p class='myth-text'>After the war, Yudhiṣṭhira’s horse-sacrifice wandered the subcontinent under Arjuna’s guard — his last great circuit. In the Svargārohaṇika, the Pāṇḍavas walk to heaven’s gate; Arjuna falls first among them, his sin named precisely: the vanity of having believed himself the greatest of archers.</p>" },
      ],
    },
    syncretism: "Arjuna is the Nara of the Nara-Nārāyaṇa pair — the human half of Vishnu’s eternal companion — making his friendship with Krishna a theology in dialogue-form. In Javanese and Balinese tradition he becomes the refined knight of the wayang cycle; and the Gītā made him, doubting, the everyman of all later Indian philosophy.",
    culturalLegacy: "The Gītā’s chariot is the world’s most reproduced scene of instruction; the phrase ‘Kurukshetra’ entered the political vocabulary of every Indian language as the name of any field where duty and doubt collide. His name crowned South Indian kings (Arjunavarman) and the great tank of Rajput legend; and ‘Arjuna award’ is India’s highest honour for a sportsperson — the archer’s prize.",
    extendedMeditation: "Arjuna: the silvery one, the third of five, the hero whose greatest act was a question. Restored plainly, the name holds the Gītā’s whole setting — the bow lowered, the armies waiting, the friend about to become God. Four syllables, one chariot, eighteen chapters.",
    sources: [
      { name: 'Mahābhārata, Ādi Parvan (birth and training)' },
      { name: 'Bhagavadgītā (the chariot dialogue)' },
      { name: 'Kālidāsa, Kirātārjunīya' },
      { name: 'Mahābhārata, Aśvamedhika & Svargārohaṇika Parvans' },
    ],
    archaeology: "Arjuna’s monuments are the epic’s geography itself — Indraprastha’s Purāṇa Qila in Delhi claims his city; and the wayang kulit’s refined Arjuna puppets of Java are among the finest objects of Indonesian art. The Gītā’s palm-leaf manuscripts number in the millions.",
    cult: "No temple to Arjuna, but his svayaṃvara-archery is the wedding-ceremony’s standard boast, and the Gītā’s recitation is a complete liturgy. The Arjuna-penance reliefs of Mamallapuram’s great bas-relief panel may show his Kirātārjunīya austerities.",
    iconography: "The archer with the Gandiva and the two inexhaustible quivers, Krishna as charioteer before him; the diadem and the ape-banner. His icon is the drawn bow at rest — the moment before the Gītā, frozen forever.",
    reception: "World literature knows him through the Gītā, where he is the eternal student; comparative epic pairs him with Achilles’ rival-enemies and with the archers of every tradition. In modern India he is the sportsperson’s patron, the doubter honoured above the certain — the hero whose question was worth more than his arrows.",
  },

  nakula: {
    pronunciation: {
      ipa: '/nəˈkuːlə/',
      ipaLabel: 'Sanskrit (IAST: Nakula)',
      phonemes: [
        { symbol: 'Na-', desc: 'Short a, light n; the name is usually read as “mongoose” or “of the mongoose”.' },
        { symbol: '-ku-', desc: 'Long ū as in “cool”; the name flows without heavy stress.' },
        { symbol: '-la', desc: 'Liquid l; the fourth Pāṇḍava, master of horses and swords.' },
      ],
      approximation: '“nuh-KOO-luh”',
      kin: [
        { label: 'Twin', form: 'Sahadeva — the two are the Aśvin-born pair' },
        { label: 'Parents', form: 'the Aśvins (the divine physicians), by Mādrī' },
      ],
      note: 'Twin of Sahadeva, fourth of the Pāṇḍu princes — the handsomest of the five by the epic’s own verdict.',
    },
    domains: {
      title: 'Twin of Sahadeva, Master of Horses',
      subtitle: 'The Fourth Pāṇḍava, the Handsomest of the Five',
      lead: "<p class='lead-text'><strong>Nakula</strong> is the fourth Pāṇḍava: son of the Aśvin twins by Pāṇḍu’s second queen Mādrī, twin of Sahadeva, master of horses, swords, and the lore of cattle. The epic’s verdict on his beauty is unambiguous — among the five, Nakula was the most beautiful — and his quiet competence made him the brother wars could not unsettle.</p>",
      cards: [
        { name: 'The Aśvin-Born', desc: 'Conceived by Mādrī’s mantra-call to the divine twin physicians — hence the brothers’ medical genius.', iconPath: 'M32 10V28M32 14L48 22M32 14L16 22M32 28L20 46M32 28L44 46M32 28V52M24 40H40' },
        { name: 'Master of Horses', desc: 'His care of horses was legendary; in the incognito year he served as Virāṭa’s horse-groom, a master among masters.', iconPath: 'M12 40C20 28 40 28 50 36L56 28L54 40C44 48 22 48 12 44ZM24 34L20 24M36 33L34 22M18 46L14 54M44 44L46 54' },
        { name: 'The Sword', desc: 'His blade-work the epic ranks first among the brothers — the quiet specialist of the five.', iconPath: 'M16 50L44 20M44 20L38 22M44 20L42 28M16 50L10 44M16 50L22 56M34 34L28 28M38 38L32 32' },
        { name: 'Cattle-Lore', desc: 'He knew herds as he knew horses — the brother of the epic’s animal-husbandry books.', iconPath: 'M18 34C18 24 26 16 36 18C46 20 50 30 46 38C42 46 30 48 24 42M32 22L30 12M40 28L46 20M22 36L12 32' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Nakula’s mythology is the epic of the competent: the twin born to the physician-gods, trained in every martial art, steady through exile, war, and loss. He has no single great myth because his greatness was distributed — the brother who never failed at anything assigned to him, and whose death on the final mountain was the quietest of the five.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ādi Parvan', title: 'The Second Mantra-Birth', text: "<p class='myth-text'>After Kuntī bore three sons by mantra, Pāṇḍu asked Mādrī to use the boon; she called not one god but the Aśvin twins, and bore the twins Nakula and Sahadeva — radiant, the epic says, as the gods themselves. When Pāṇḍu died, Mādrī entered his funeral pyre, leaving the twins to Kuntī’s care: the youngest of five mothers’ sons.</p>" },
        { tag: 'Virāṭa Parvan', title: 'Granthika the Groom', text: "<p class='myth-text'>In the thirteenth year of exile, spent incognito, Nakula served King Virāṭa as Granthika the horse-trainer — so skilled that the king’s herds and stables prospered beyond record. The disguise-book is the epic’s comedy of excellence: each brother, hidden, cannot help being the best at the humble job assigned.</p>" },
        { tag: 'Bhīṣma Parvan', title: 'The War’s Quiet Spear', text: "<p class='myth-text'>In the great war Nakula fought at the head of a division, slew his share of the hundred brothers — Duhśaha among them — and was never once routed. The epic’s tallies of his duels are long and undramatic: the record of a professional among heroes of fire.</p>" },
        { tag: 'Svargārohaṇika', title: 'The Fall on the Mountain', text: "<p class='myth-text'>On the last walk, Yudhiṣṭhira explained each brother’s fall: Bhīma for gluttony, Arjuna for vanity, Sahadeva for pride of wisdom. Nakula’s sin was the subtlest — the pride of beauty: ‘he thought none his equal in form’. The verdict completes the epic’s economy: even the quietest gift, treasured as superiority, weighs.</p>" },
      ],
    },
    syncretism: "Nakula is the Aśvins’ son in the epic’s divine-accounting, linking the heroic age to the Vedic physician-gods; and in later tradition the twins became the exemplars of brotherly symmetry — the epic’s only perfectly matched pair. The veterinary and medical lore the epic assigns him passed into the practical traditions of horse-culture across the subcontinent.",
    culturalLegacy: "The twins Nakula-Sahadeva are the subcontinent’s byword for matched pairs — in cards, in teams, in twins generally. His name graced South Indian kings (Nakula of the Cōḻa line’s theophorics); and in the epic retellings, his quiet excellence is the standard against which the louder heroes’ fireworks are measured.",
    extendedMeditation: "Nakula: the name that means ‘mongoose’ — small, quick, and immune to the serpent’s venom. Restored plainly, it suits the brother whose gifts never advertised themselves: the handsomest of five, the steadiest of five, the one whose fall on the mountain was for loving his own face too well. Two syllables, a twin’s half of a whole.",
    sources: [
      { name: 'Mahābhārata, Ādi Parvan (the twins’ birth)' },
      { name: 'Mahābhārata, Virāṭa Parvan (the incognito year)' },
      { name: 'Mahābhārata, Bhīṣma & Droṇa Parvans (war record)' },
      { name: 'Mahābhārata, Svargārohaṇika Parvan (the fall)' },
    ],
    archaeology: "Nakula has no monuments of his own — his are the epic’s performance traditions, where the twins’ matched brilliance is a stage convention of the Kathakali and Yakṣagāna repertories. The Pāṇḍava-ratha reliefs of Mamallapuram include the twin chariots of the Aśvin-born.",
    cult: "No separate cult; the Pāṇḍava-brotherhood cults of the Himalayan west (the Pāṇḍavas as five village gods of Jaunsar-Bawar) worship the set, the twins within it. The epic-recitation traditions keep his books in the cycle.",
    iconography: "The twin beside Sahadeva — the two differentiated by their mounts and emblems in the Purāṇic charts: Nakula with the sword and the horse. His icon is the matched half: no image of Nakula stands alone without its twin.",
    reception: "Comparative epic studies use Nakula and Sahadeva as the case of the hero-pair — Castor-and-Pollux structure inside an Indian frame. Literary criticism of the Mahābhārata increasingly reads him as the epic’s study of distributed excellence: the heroism that needs no chapter of its own.",
  },

  sahadeva: {
    pronunciation: {
      ipa: '/səˈhɑːdɛvə/',
      ipaLabel: 'Sanskrit (IAST: Sahadeva)',
      phonemes: [
        { symbol: 'Sa-', desc: 'Short a; the prefix sa- means “with” — Sahadeva, “god with god”.' },
        { symbol: '-ha-', desc: 'The h is a light aspirate; the compound honours the twin-born’s doubled divinity.' },
        { symbol: '-deva', desc: '“God”: the name is a sentence — a god attended by gods.' },
      ],
      approximation: '“suh-HAH-deh-vuh”',
      kin: [
        { label: 'Twin', form: 'Nakula — the Aśvin-born pair' },
        { label: 'Epic epithet', form: 'the wisest of the Pāṇḍavas after Yudhiṣṭhira — the astronomer' },
      ],
      note: 'Youngest of the Pāṇḍavas, famed for wisdom, astrology, and the sword — the quiet savant of the five.',
    },
    domains: {
      title: 'Twin of Nakula, Famed for Wisdom',
      subtitle: 'The Youngest Pāṇḍava, the Astronomer',
      lead: "<p class='lead-text'><strong>Sahadeva</strong> is the youngest Pāṇḍava: twin of Nakula, son of the Aśvin physicians, and the epic’s scholar-warrior — master of astrology and the calendar, keeper of the sword-skills that matched his twin’s, and the brother whose advice was always right and rarely heeded. Yudhiṣṭhira named him the wisest of the five; the war’s chronology ran by his stars.</p>",
      cards: [
        { name: 'The Astronomer', desc: 'His knowledge of the stars set the war’s calendar; the epic calls his astrology infallible.', iconPath: 'M16 28C20 20 26 16 32 16C38 16 44 20 48 28M20 36H44M24 44H40M28 52H36M32 16V6' },
        { name: 'The Sword', desc: 'His blade-work equalled Nakula’s — the twins were the epic’s matched pair of arms.', iconPath: 'M16 50L44 20M44 20L38 22M44 20L42 28M16 50L10 44M16 50L22 56M34 34L28 28M38 38L32 32' },
        { name: 'The Cattle-Seer', desc: 'Like his twin he knew herds — but Sahadeva read their breeding and their futures too.', iconPath: 'M18 34C18 24 26 16 36 18C46 20 50 30 46 38C42 46 30 48 24 42M32 22L30 12M40 28L46 20M22 36L12 32M36 34L44 34' },
        { name: 'The Unheeded Counsel', desc: 'He advised the dice-refusal and the war’s conduct — right, and passed over.', iconPath: 'M32 10V34M32 16L48 24M32 16L16 24M32 34L20 50M32 34L44 50M32 34V54M14 44L10 48M50 44L54 48' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Sahadeva’s mythology is the epic’s study of wisdom without power: the youngest brother whose knowledge was perfect and whose influence was nil. He knew the dice-game was ruin, the war’s timing, the omens’ meaning — and the epic lets him speak each truth once, then moves on. His death on the mountain was for the one pride knowledge permits: the pride of being right.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ādi Parvan', title: 'The Younger Twin', text: "<p class='myth-text'>Mādrī called the Aśvin twins and bore two sons — Nakula first, Sahadeva second — both radiant as the gods. Orphaned at the funeral pyre that took Mādrī, the twins were raised by Kuntī as her own: the youngest of five, the astronomer among warriors, born with the physician-gods’ second sight.</p>" },
        { tag: 'Sabhā Parvan', title: 'The Counsel Against the Dice', text: "<p class='myth-text'>When the challenge to the dice-game came, Sahadeva — who had calculated the stars and the odds — advised refusal to the last. The epic notes that the advice was heard and overridden; the fall of the Pāṇḍavas into thirteen years of loss begins at the moment the youngest brother’s arithmetic is outvoted.</p>" },
        { tag: 'Virāṭa Parvan', title: 'Tantripala the Cowherd', text: "<p class='myth-text'>In the incognito year he served Virāṭa as Tantripala, keeper of the cattle — and the herds multiplied under his accounting. The disguise-book’s joke runs deepest here: the astronomer disguised as a cowherd ran the kingdom’s true prosperity while the king praised his other servants.</p>" },
        { tag: 'Svargārohaṇika', title: 'The Pride of the Right', text: "<p class='myth-text'>On the final mountain, Sahadeva fell second — and Yudhiṣṭhira named his sin: ‘he thought none his equal in wisdom’. The epic’s most quietly devastating verdict: even the love of being right is a weight, and the wisest of the five carried his wisdom as others carried vanity.</p>" },
      ],
    },
    syncretism: "Sahadeva is the Aśvins’ second son — the epic’s accounting keeps the physician-gods’ line in the heroic blood — and later tradition made him the type of the jyotiṣika, the court astrologer whose charts rule kingdoms. The twins together became the subcontinent’s archetype of matched excellence in different keys: Nakula the body’s arts, Sahadeva the mind’s.",
    culturalLegacy: "The twins’ names remain a matched set in Indian naming — Sahadeva a standing boy’s name meaning ‘attended by gods’. His unheeded-counsel scene is the epic’s image of every expert ignored by power; and the jyotiṣa tradition claims him as its founding hero, the astronomer inside the world’s longest poem.",
    extendedMeditation: "Sahadeva: ‘god with god’ — the name is a theology of twins. Restored plainly, it keeps the epic’s quietest lesson: wisdom that cannot persuade is still wisdom, and the stars he read were right whether the court listened or not. Four syllables, infallible and ignored.",
    sources: [
      { name: 'Mahābhārata, Ādi Parvan (the twins’ birth)' },
      { name: 'Mahābhārata, Sabhā Parvan (the counsel refused)' },
      { name: 'Mahābhārata, Virāṭa Parvan (the incognito year)' },
      { name: 'Mahābhārata, Svargārohaṇika Parvan (the fall)' },
    ],
    archaeology: "As with Nakula, his monuments are the epic’s performance traditions and the Pāṇḍava-ratha reliefs of the Pallava south. The jyotiṣa-manuscript traditions of medieval India invoke his name as patron of the astronomical arts.",
    cult: "The Pāṇḍava-brotherhood village cults of the western Himalaya worship the set; astrologers’ lineages invoke him in their initiation verses. His festival is the epic-recitation itself.",
    iconography: 'The twin beside Nakula, differentiated by the astrolabe or the chart in later paintings; his icon is the star-diagram — the heavens reduced to the hand.',
    reception: "Literary criticism reads Sahadeva as the Mahābhārata’s Cassandra — the truth-teller structurally fated to be ignored. In the study of expertise and power, his scenes are cited as the epic’s analysis of how organizations fail: the one who calculates best is the one the assembly interrupts.",
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

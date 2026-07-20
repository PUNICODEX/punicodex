/**
 * Lore enrichment, batch G — Ašavahišta and Stýx.
 */

const ICONS = {
  flame: 'M32 8C28 20 20 26 20 38C20 48 25 56 32 56C39 56 44 48 44 38C44 26 36 20 32 8Z',
  wave: 'M8 24C16 16 24 16 32 24C40 32 48 32 56 24M8 40C16 32 24 32 32 40C40 48 48 48 56 40',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  star: 'M32 8L38 26L56 26L41 37L46 55L32 44L18 55L23 37L8 26L26 26Z',
  gate: 'M12 52V22C12 14 20 8 32 8C44 8 52 14 52 22V52M24 52V26M40 52V26',
  eye: 'M8 32C16 22 24 18 32 18C40 18 48 22 56 32C48 42 40 46 32 46C24 46 16 42 8 32ZM32 25A7 7 0 1 0 32 39A7 7 0 1 0 32 25Z',
  column: 'M16 52H48M20 52V20M28 52V20M36 52V20M44 52V20M14 20H50L32 8L14 20Z',
  knot: 'M20 20C12 20 8 26 8 32C8 38 12 44 20 44C28 44 36 20 44 20C52 20 56 26 56 32C56 38 52 44 44 44C36 44 28 20 20 20Z',
};

module.exports = {
  ashavahista: {
    pronunciationNote:
      'Avestan aša vahišta — "Best Truth/Righteousness" — is written in the scholarly transliteration with the palatal š of the Avestan alphabet, twice: Ašavahišta. The restoration keeps both sibilants exactly where the Gathas put them; English "Asha Vahishta" softens what the Avesta writes sharp.',
    domains: {
      title: 'The Best Truth',
      subtitle: 'Righteousness, the Sacred Fire, and the Moral Order',
      lead: `<p class='lead-text'>Ašavahišta is the Amesha Spenta of Aša — "Best Righteousness": the Bounteous Immortal who is cosmic order itself, the truth the universe is built to run on, and the sacred fire that tests every soul and every word against it.</p>`,
      cards: [
        { iconPath: ICONS.flame, name: 'The Sacred Fire', desc: 'His element: the altar-flame of the Avesta, purifier and witness.' },
        { iconPath: ICONS.scale, name: 'Aša', desc: 'Cosmic order as a person — the truth against which all thought, word, and deed is measured.' },
        { iconPath: ICONS.star, name: 'The Six', desc: 'One of the Amesha Spentas — the Bounteous Immortals who form Ahura Mazda\'s council.' },
        { iconPath: ICONS.eye, name: 'The Ordeal', desc: 'Fire as the test: the Avestan ordeal that proves the truthful from the deceitful.' },
      ],
    },
    symbols: [
      { name: 'The altar flame', meaning: 'The fire of the Avesta — his presence in every Zoroastrian temple' },
      { name: 'The ašem-vohū verse', meaning: 'The oldest prayer in the faith: "aša is the best, it is happiness"' },
      { name: 'The winged sun', meaning: 'The fravašis\' symbol he shares with the whole order' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Ašavahišta's mythology is the Gathas' own theology: truth not as an idea but as an immortal who must be fed, fought for, and kept alight.</p>`,
      myths: [
        { tag: 'The Council', title: 'The Bounteous Immortals', text: `<p class='myth-text'>The Avesta's great hymn-names them: Vohu Manah (Good Mind), Aša Vahišta (Best Truth), Xšathra Vairya (Chosen Power), Spenta Ārmaiti (Holy Devotion), Haurvatāt (Wholeness), Amərətāt (Immortality) — the Amesha Spentas, the Bounteous Immortals who are at once Ahura Mazda's powers and persons. Ašavahišta is the second: the Truth the Good Mind thinks, and the Fire that proves it. In the Gathas, Zaraθuštra meets each as a presence, not a principle.</p>` },
        { tag: 'The Element', title: 'The Fire of Aša', text: `<p class='myth-text'>His element is fire — not the destroyer but the tester. The Avesta gives fire to Aša Vahišta as his domain: the altar-flame through which prayers rise, and the ordeal-fire through which innocence is proven. Every Zoroastrian fire-temple keeps his presence: the flame tended for centuries is, in the faith, Ašavahišta made visible — the light that does not lie.</p>` },
        { tag: 'The Battle', title: 'Truth Against the Lie', text: `<p class='myth-text'>The Gathas' whole drama is his: Aša against Druj — Truth against the Lie, order against deceit. The righteous advance the world by good thought, good word, good deed; the deceitful tear at the fabric. Ašavahišta is not a passive abstraction but the war's front line: every true word spoken is his ground gained, every lie his ground lost. The cosmic fight is fought, daily, in speech.</p>` },
        { tag: 'The Fire', title: 'The Final Ordeal', text: `<p class='myth-text'>At the end, the texts say, the world is tested by molten metal: a river of fire through which all must pass — to the righteous, warm milk; to the deceitful, burning. Ašavahišta presides: his fire is the last instrument of the truth he has always been. The eschaton is not destruction but assay — the universe finally read for what it is.</p>` },
      ],
    },
    syncretism: `<p>His cognate is the Vedic ṛta and its guardian: scholars pair Aša with the Vedic order-principle and note the shared Indo-Iranian root (*rtá/aša). In the Sasanian era his fire became state cult — the great fire-temples of Adur Gušnasp and Adur Farnbag bore his element as national shrines; and the Yasna's ašem-vohū verse ("aša is the best, it is happiness") remains the most-recited line of the living faith. He survives wherever the fire is kept: Yazd's perpetual flame is, by every account, still his.</p>`,
    culturalLegacy: `<p>He is the reason "truth" has a temple: the Zoroastrian moral tradition — good thought, good word, good deed — is his liturgy, and the fire-temples of Yazd and the diaspora are his addresses. The word "Asha" lives in modern Persian and in a million names (Ashton? no — Asha, common across South Asia). Scholars read him as the hinge on which the Abrahamic heaven-and-judgment traditions later turned: the first theology of a universe audited for truth.</p>`,
    archaeology: `The fire-temples are his monuments: Adur Gušnasp at Takht-e Soleyman (Sasanian, UNESCO) — the shrine of kings; Adur Farnbag in Fars; and the working Atash Behram of Yazd, whose flame has burned since 470 CE. The Achaemenid reliefs of Persepolis show the fire-altar in royal worship, and the Gathas themselves — the oldest hymns of any living scripture — are his charter, preserved in the oldest Avestan manuscripts (K7, 14th c. copies of much older work).`,
    extendedMeditation: `<p>Ašavahišta is the god of the honest ledger. Every institution, every code review, every signature, every exam proctor, every journalist and every judge works in his fire — the test of what is true. He asks the oldest question of any ordered life: is the fire you keep burning for warmth, for show, or for truth — and what, this week, have you fed it?</p>`,
    sources: [{ name: 'Gathas' }, { name: 'Avesta' }, { name: 'Rigveda' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  styx: {
    pronunciationNote:
      'Greek Στύξ is monosyllabic — and Greek monosyllables carry the acute on their vowel in modern editions (as Πῦρ carries its circumflex, and φῶς its own). The restoration Stýx keeps that acute: the stress of the single syllable, the only mark the name can bear, exactly where the tradition places it.',
    domains: {
      title: 'The River of the Oath',
      subtitle: 'The Boundary, the Vow, and the Water the Gods Fear',
      lead: `<p class='lead-text'>Stýx is the river by which the gods themselves are bound: the underworld stream whose water makes an oath unbreakable even for Olympos, the eldest daughter of the Ocean, and the mother of Force, Rivalry, Power, and Victory.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Oath Water', desc: 'Swear on her and the vow is iron — Zeús himself cannot break it.' },
        { iconPath: ICONS.gate, name: 'The Boundary', desc: 'The river of the threshold: between the living and the dead, the world and the under.' },
        { iconPath: ICONS.scale, name: 'The Eldest Daughter', desc: 'First-born of Ōkeanos and Tēthys — the river with seniority among all waters.' },
        { iconPath: ICONS.star, name: 'Mother of Victory', desc: 'Her children: Bía (Force), Zêlos (Rivalry), Krátos (Power), Níkē (Victory).' },
      ],
    },
    symbols: [
      { name: 'The dark water', meaning: 'The stream that chills even gods — oaths made absolute' },
      { name: 'The waterfall', meaning: 'Her plunge from the underworld cliff, seen by few and sworn by all' },
      { name: 'The four children', meaning: 'Force, Rivalry, Power, Victory — the engines of Zeús\' reign, born of a river' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Stýx's myths are about the one thing stronger than the gods: the word you cannot take back — and the water that enforces it.</p>`,
      myths: [
        { tag: 'The Oath', title: 'The Water the Gods Swear By', text: `<p class='myth-text'>The Iliad's formula runs through the epic: "let this now be my inviolable oath, by the water of Stýx" — and even Zeús trembles at the breaking. When Hēra tricks him into binding his own hands over the fate of Troy, the poem's whole machinery turns on the fact that the oath, sworn on her water, cannot be unsaid. A god who breaks the oath lies nine years breathless, and nine more years cut off from the gods' feasts: the river punishes heaven itself.</p>` },
        { tag: 'The Lineage', title: 'The Mother of the Reign', text: `<p class='myth-text'>Hesiod's Theogony makes her the hinge of Zeús' kingdom: Stýx, eldest daughter of Ōkeanos, brought her four children — Bía (Force), Zêlos (Rivalry), Krátos (Power), Níkē (Victory) — to Olympos at the start of the war with the Titans, the first immortal to side with Zeús. For this he honored her above all waters and set her children at his side forever. The king's throne, the poets say, is propped by a river and her brood.</p>` },
        { tag: 'The Water', title: 'The Stream of the Under', text: `<p class='myth-text'>Her water is the underworld's own: a cold plunge from a high cliff, a tenth part of Ōkeanos' whole flow, circling the land of the dead nine times in the later tellings. The dead drink nothing, but the river is there anyway — the boundary that needs no ferryman because it is the law itself in liquid form. Styx is not a place you cross; she is a condition you agree to.</p>` },
      ],
    },
    syncretism: `<p>Rome kept her as the model of the binding vow — the jurists' "iusiurandum per Stygem" — and Dante lowered her to the fifth circle, the marsh of wrath, where the angry fight in her mud. Her name became the English adjective "Stygian" for anything dark, cold, and absolute; and her family — Force, Rivalry, Power, Victory — became the four imperial virtues Rome and every later empire borrowed for its own thrones.</p>`,
    culturalLegacy: `<p>"Stygian" is her everyday immortality: the word for the unbreakably dark and the absolutely binding. Her children rule the modern vocabulary — force, zeal, power, victory — and her water gave literature its favorite contract: the deal you cannot exit, from Faust to fantasy. Every "swear on my life" and every oath of office is a small glass of her river, drunk in public.</p>`,
    archaeology: `The Greeks placed her water in Arcadia: the Styx waterfall near Nonakris in the northern Peloponnese — a cliff-plunge so cold it was said to be her true stream, and Pausanias reports the locals' oath by it. The gorge at Aroania (Kráthis river) is shown to visitors still as the legendary drop. Homer's and Hesiod's lines are her oldest attestations; the Roman poets from Virgil to Statius keep her darkly flowing in every underworld scene.`,
    extendedMeditation: `<p>Stýx is the god of the word that costs something. Every contract, every vow, every "I promise" works because somewhere the tradition decided that speaking must bind — and her water is that decision made into a river. She asks the question every oath answers: what are you willing to swear on, and what will it cost you to keep it?</p>`,
    sources: [{ name: 'Iliad' }, { name: 'Hesiod, Theogony' }, { name: 'Apollodorus' }, { name: 'Pausanias' }, { name: 'LSJ' }, { name: 'Cambridge' }],
  },
};

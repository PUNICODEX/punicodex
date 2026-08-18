# PuniCodex Lexicon — Coverage Gap Analysis

Date: 2026-08-18. Source: `type/js/lexicon.js` on branch `feat/sponsorship-flow-overhaul`.
Working list: `.superpowers/lexicon-entries.tsv` (id, unicode, ascii, pantheon, domain, meaning).

**926 entries across 25 pantheon tags** (AGENTS.md documents 895 — the branch has been adding
entries, e.g. Cháng'é and Hòuyì; see Data-Quality Observations). This analysis asks: which
*major* mythological names are still missing, judged by primary-source prominence, festival /
living-religion importance, pop-culture presence, and domain-brandability.

---

## (a) Per-pantheon coverage table

| Pantheon tag | Entries | Depth verdict | Headliner coverage |
|---|---|---|---|
| greek | 265 | Very deep (heroes, personifications, abstract concepts) | All Olympians + 9 Muses + Fates present; famous-mortals layer has gaps (Helen, Clytemnestra, Iphigenia absent) |
| sanskrit | 92 | Deep (Vedic + epic + concepts) | Trimurti, Devis, epics well covered; **Dashavatara incomplete (5 of 10 present)** |
| norse | 86 | Very deep (gods, giants, dwarfs, realms, artifacts) | **Cosmic fundamentals missing: Sól, Máni, Ægir, Rán, Mímir, Sleipnir, Bifrǫst** |
| egyptian | 66 | Very deep (gods, demons, soul-concepts) | Ennead + triads covered; Aten, Ammit, Bennu, Sopdet absent |
| chinese | 49 | Good (gods, sages, sacred mountains, concepts) | **Major folk/living-religion layer missing: Yándì, Dà Yǔ, Zhīnǚ, Cáishén, Zàojūn, Zhōngkuí** |
| celtic | 47 | Good (Irish + Welsh + Arthurian knights) | **Táin/Mabinogion headliners missing: Medb, Balor, Brân, Arianrhod, Pwyll, Lleu** |
| japanese | 45 | Good (Kojiki kami + regions/cities) | **Seven Lucky Gods incomplete (2 of 7); folk heroes (Momotarō, Kaguya) absent** |
| mesopotamian | 30 | Deep (pantheon + Gilgamesh cast) | Flood heroes (Ūtanapištim, Atraḫasīs) and folk favorites (Ninkasi, Lamaštu) absent |
| nahuatl | 30 | Deep (full Aztec pantheon) | Tlāzōltēotl, Nanāhuātzin, Tēcciztēcatl, Cipactli absent |
| polynesian | 23 | Good (Māori + Hawaiian + Samoan + Tahitian) | **Ranginui (sky father!) missing; Hina, Hine-nui-te-pō, Haumea absent** |
| buddhist | 23 | Good (5 Dhyani Buddhas complete, bodhisattvas, scholars) | Avalokiteśvara (Skt anchor), Bhaiṣajyaguru, Padmasambhava, Budai absent |
| slavic | 21 | Moderate | **Major western Slavic gods missing: Svantovít, Triglav; calendar gods Jarilo, Kupalo absent** |
| yoruba | 20 | Good (major orishas present) | Odùduwà (Ife founder) the main gap |
| zoroastrian | 19 | Good (Ahura Mazda, Amesha Spentas complete) | **Zaraθuštra himself missing**; Yima, Saošyant, Aži Dahāka absent |
| canaanite | 14 | Thin-moderate (Ugaritic core + biblical figures) | Tanit, Melqart, Rešef, Ešmūn absent |
| korean | 12 | Thin (founding myth + household gods) | Sanshin (mountain god), Baridegi absent; id/unicode mismatch on `hananim` |
| incan | 11 | Moderate (core pantheon present) | Kon, Manco Cápac, Chaska, Apu absent |
| aboriginal | 12 | Moderate (regional spread) | Yhi, Tiddalik, Bunyip absent |
| taoist | 12 | **Thin** | **Eight Immortals incomplete (3 of 8); Bìxiá Yuánjūn, Tàiyī absent** |
| roman | 8 | **Systematically thin — headliners missing** | **Mārs, Venus, Cupīdō, Sāturnus, Fortūna, Vesta, Minerva, Mercurius, Bacchus all absent** |
| greek-location | 24 | Good | Fine for purpose |
| hittite | 8 | Thin (but obscure tradition) | Hurrian layer (Teššub, Šauška, Ḫebat) + Ullikummi, Illuyankaš absent |
| phoenician | 7 | Thin | Overlaps canaanite; Tanit/Melqart belong here or there |
| mapuche | 1 | **Token coverage** | Ngenechen (supreme god) absent |
| baltic | 1 | **Token coverage** | Dievas, Saulė, Laima, Žemyna absent |

Total: 926 entries, 25 tags.

---

## (b) Ranked shortlist — top 40 missing names

Ranked by combined notability (primary sources, living religion/festivals, pop culture,
brandability). Diacritic forms follow the project's conventions (pinyin tone marks for Chinese,
IAST for Sanskrit/Avestan, macrons for Japanese/Māori/Latin, Old Norse acute+ǫ/ð/þ, Egyptian
conventional + transliteration, Welsh circumflex).

1. **helene — Helénē** — Ἑλένη — greek — Helen of Troy, "the face that launched a thousand ships." The most famous mortal woman in Greek myth; arguably the single biggest gap in the whole lexicon.
2. **ranginui — Ranginui** — Māori — polynesian — The sky father, half of the primal pair. Papatūānuku (earth mother) is present without him — the central Māori creation myth is missing its other half.
3. **zarathushtra — Zaraθuštra** — Avestan 𐬰𐬀𐬭𐬀𐬚𐬎𐬱𐬙𐬭𐬀 — zoroastrian — The prophet himself. Ahura Mazda, Aŋra Mainyu and all six Amesha Spentas are present, but the founder of the religion is not.
4. **medb — Medb** — Old Irish Medb — celtic — Queen Medb of Connacht, driving force of the Táin Bó Cúailnge. The Táin's protagonist (Cú Chulainn) is present; its antagonist-queen is not.
5. **balor — Balor** — Old Irish Balor — celtic — Fomorian king of the destructive eye, grandfather-slayer figure of Cath Maige Tuired. Lúg is present; his great adversary is not.
6. **sol — Sól** — Old Norse Sól — norse — Personified sun, chased by Skǫll (who is present). Ragnarǫk's cast is incomplete without her. Highly brandable (sol.com-tier name).
7. **mani — Máni** — Old Norse Máni — norse — Personified moon, Sól's brother, chased by Hati (present). Same story, same gap.
8. **aegir — Ægir** — Old Norse Ægir — norse — Sea giant/god, brewer of the gods' feasts, central to Lokasenna (the poem where the whole present cast appears).
9. **ran — Rán** — Old Norse Rán — norse — Sea goddess who nets drowned sailors, Ægir's wife. Pair with #8.
10. **mimir — Mímir** — Old Norse Mímir — norse — Keeper of the well of wisdom; Óðinn sacrificed an eye to him. Major in both Eddas and in pop culture (God of War).
11. **sleipnir — Sleipnir** — Old Norse Sleipnir — norse — Óðinn's eight-legged horse, Loki's child. One of the most recognizable figures of Norse myth.
12. **bifrost — Bifrǫst** — Old Norse Bifrǫst — norse — The rainbow bridge. All nine realms are present but the bridge between them is not; huge pop-culture presence (Marvel).
13. **sigurd — Sigurðr** — Old Norse Sigurðr — norse — The dragon-slayer (Siegfried), slayer of Fáfnir — who is present, along with Reginn and Brynhildr. The hero of the Vǫlsunga saga is missing from his own story.
14. **yandi — Yándì** — 炎帝 — chinese — The Flame Emperor, co-ancestor of the Chinese people (炎黄子孙, "descendants of Yán and Huáng"). Huángdì is present; his co-headliner is not.
15. **yu — Dà Yǔ** — 大禹 — chinese — Yu the Great, tamer of the flood, founder of the Xià dynasty. One of the most famous figures of Chinese myth-history. (Sage kings Yáo 堯 and Shùn 舜 are the natural follow-ons.)
16. **zhinu — Zhīnǚ** — 织女 — chinese — The Weaver Girl of the Qìxì festival (the biggest myth-anchored festival still celebrated; cf. Niúláng 牛郎). Living-religion/festival importance is enormous.
17. **caishen — Cáishén** — 财神 — chinese — God of Wealth. Arguably the most-worshipped deity in the living Chinese folk religion; immense brandability.
18. **zaojun — Zàojūn** — 灶君 — chinese — The Kitchen God, hearth deity of hundreds of millions of households; Little New Year festival.
19. **zhongkui — Zhōngkuí** — 钟馗 — chinese — Queller of demons; ubiquitous in art, opera, film, games (Smite etc.).
20. **tudigong — Tǔdìgōng** — 土地公 — chinese — The earth god of every village and neighborhood shrine; most numerous shrines in the Sinosphere.
21. **kuafu — Kuāfù** — 夸父 — chinese — The giant who chased the sun; canonical school-text myth (夸父逐日).
22. **avalokiteshvara — Avalokiteśvara** — Sanskrit अवलोकितेश्वर — buddhist — The bodhisattva of compassion. Guānyīn (chinese) and Kannon (japanese) are present but the Sanskrit anchor form is not — the flywheel's cross-pantheon pattern (cf. Inanna/Ištar both present) supports adding it.
23. **bhaisajyaguru — Bhaiṣajyaguru** — Sanskrit भैषज्यगुरु — buddhist — The Medicine Buddha; one of the most venerated Buddhas across East and Central Asia.
24. **padmasambhava — Padmasambhava** — Sanskrit पद्मसम्भव — buddhist — "Guru Rinpoche," founder-figure of Tibetan Buddhism; second only to the Buddha in Nyingma devotion.
25. **budai — Bùdài** — 布袋 — buddhist/chinese — The laughing Buddha; one of the most recognizable religious figures worldwide (his Japanese form Hotei is also missing — see next-tier list).
26. **varaha — Varāha** — Sanskrit वराह — sanskrit — The boar avatar of Viṣṇu. The Dashavatara is the most systematic gap in the sanskrit pantheon: only Matsya, Narasiṃha, Rāma, Kṛṣṇa present (5 of 10).
27. **kurma — Kūrma** — Sanskrit कूर्म — sanskrit — The tortoise avatar (churning of the ocean myth).
28. **parashurama — Paraśurāma** — Sanskrit परशुराम — sanskrit — "Rāma with the axe," avatar and one of the Chiranjivi (immortals); appears in both epics.
29. **kalki — Kalki** — Sanskrit कल्कि — sanskrit — The avatar to come; the only future-eschatological figure in the Hindu canon, heavily present in pop culture.
30. **yudhisthira — Yudhiṣṭhira** — Sanskrit युधिष्ठिर — sanskrit — Eldest Pāṇḍava, son of Dharma. All four of his brothers (Bhīma, Arjuna, Nakula, Sahadeva) and Draupadī are present — the leader is not.
31. **duryodhana — Duryodhana** — Sanskrit दुर्योधन — sanskrit — The Mahābhārata's central antagonist; Kaṃsa and Rāvaṇa are present but the epic's own villain is not.
32. **rahu — Rāhu** — Sanskrit राहु — sanskrit — The eclipse deva, one of the nine grahas worshipped in living Hindu astrology (Ketu केतु pairs with him; Śani is already present).
33. **mars — Mārs** — Latin MARS — roman — The Roman war god; planet, month (March), Árēs' Roman half. The roman pantheon has only 8 entries and is missing most of the Dii Consentes.
34. **venus — Venus** — Latin VENVS — roman — Roman love goddess; planet; the most famous goddess-name in Western art. (Short vowels — no macrons; a plain-ASCII entry like several existing ones.)
35. **cupid — Cupīdō** — Latin CVPIDO — roman — The most famous divine child in Western culture; Érōs' Roman half. (With Sāturnus, Fortūna, Victōria, Vesta, Minerva, Mercurius, Bacchus, Lūna, Prōserpina as the rest of the roman cohort — roman is the most systematically thin pantheon relative to fame.)
36. **klytaimnestra — Klytaimnéstra** — Κλυταιμνήστρα — greek — Agamemnon's wife and slayer; the Oresteia's pivot. Agamemnōn, Orestēs, Ēlektra, Kassándra are all present — the Oresteia's fourth lead is not.
37. **iphigeneia — Iphigeneia** — Ἰφιγένεια — greek — The sacrificed daughter; two Euripidean tragedies, central to the Trojan cycle.
38. **triton — Tritōn** — Τρίτων — greek — Poseidon's son, the conch-blowing merman; moon of Neptune; enormous brandability.
39. **amphitrite — Amphitrítē** — Ἀμφιτρίτη — greek — Poseidon's queen. Every other Olympian consort (Hēra, Persephonē, Aphrodítē) is present; the sea-queen is not.
40. **adonis — Adōnis** — Ἄδωνις — greek — Aphrodite's beloved; archetype of male beauty; cross-tradition (Semitic ʾdn) resonance with the canaanite/phoenician pantheons.

### Next tier (41–60), unranked cluster

- **orion — Oríōn** (Ὠρίων, greek) — the hunter, most famous constellation; **leda — Lḗdē** (Λήδη, greek) — Leda and the swan, mother of Helen; **semele — Semelē** (Σεμέλη, greek) — mother of Diónysos; **io — Iō** (Ἰώ, greek) — cow-wandered heroine, moon of Jupiter, supremely brandable; **morpheus — Morpheus** (Μορφεύς, greek) — dream-shaper, Matrix fame; **metis — Mḗtis** (Μῆτις, greek) — first wife of Zeus, mother of Athēnâ.
- **aten — Aten** (Itn, egyptian) — Akhenaten's sun-disk god, history's most famous religious revolution; **ammit — Ammit** (ꜥmmt, egyptian) — devourer of hearts (Moon Knight fame); **bennu — Bennu** (Bnnw, egyptian) — the phoenix prototype; **sopdet — Sopdet** (Spdt, egyptian) — Sirius, anchor of the calendar.
- **utnapishtim — Ūtanapištim** (Akkadian, mesopotamian) — the flood survivor of Gilgameš (whose whole cast — Gilgameš, Enkidu, Ḫumbaba — is present); **ninkasi — Ninkasi** (Sumerian, mesopotamian) — beer goddess, modern brewing-culture icon; **lamashtu — Lamaštu** (mesopotamian) — the demoness of the famous Pazuzu amulets (Pazuzu is present, his adversary is not).
- **tanit — Tanit** (Punic 𐤕𐤍𐤕, phoenician/canaanite) — great goddess of Carthage; **melqart — Melqart** (Phoenician 𐤌𐤋𐤒𐤓𐤕) — Tyre's god, the "Tyrian Herakles."
- **chiyou — Chìyóu** (蚩尤, chinese) — war god fought by Huángdì; **jingwei — Jīngwèi** (精卫, chinese) — the sea-filling bird; **jiangziya — Jiāngzǐyá** (姜子牙, chinese) — hero of Investiture of the Gods.
- **momotaro — Momotarō** (桃太郎, japanese) — the Peach Boy, Japan's most famous folk hero; **kaguya — Kaguya** (輝夜姫, japanese) — the bamboo-cutter's moon princess (Taketori monogatari, Ghibli); **ryujin — Ryūjin** (龍神, japanese) — dragon sea-god of Urashima Tarō (浦島太郎, also missing); **daikokuten — Daikokuten** (大黒天, japanese) — with Bishamonten, Jurōjin, Fukurokuju, Hotei: the five missing Seven Lucky Gods (Ebisu, Benzaiten present); **konohanasakuya — Konohanasakuya-hime** (木花咲耶姫, japanese) — Mt Fuji's goddess (Fuji present, its kami not).
- **svantovit — Svantovít** (slavic) — four-faced god of Rügen, most famous western Slavic deity; **triglav — Triglav** (slavic) — three-headed god of the Polabians; **jarilo — Jarilo** (slavic) — spring/fertility god; **kupalo — Kupalo** (slavic) — of Kupala night, still celebrated.
- **kvasir — Kvasir** (norse) — wisest being, source of the mead of poetry; **gerd — Gerðr** (norse) — Freyr's giantess bride; **gudrun — Guðrún** (norse) — Vǫlsunga heroine; **volund — Vǫlundr** (norse) — Wayland the Smith.
- **oduduwa — Odùduwà** (yoruba) — founder-king of Ifẹ̀, ancestor of the Ọ̀yọ́ and Benin dynasties — the missing head of the orisha genealogy.
- **yima — Yima** (zoroastrian) — the first king and his Vara (flood-ark parallel); **saoshyant — Saošyant** (zoroastrian) — the world-savior to come; **azhidahaka — Aži Dahāka** (zoroastrian) — the three-headed dragon (Zahhāk of the Shāhnāmeh).
- **ngenechen — Ngenechen** (mapuche) — the supreme god; the mapuche pantheon currently has exactly one entry (Trengtreng) and it isn't this one.
- **dievas — Dievas** (baltic) — the sky father, with **saule — Saulė** (sun goddess), **laima — Laima** (fate), **zemyna — Žemyna** (earth): the baltic tag has only Perkūnas; the head of the pantheon is absent.
- **tesshub — Teššub** (hittite/hurrian) — the Hurrian storm god, protagonist of the Kumarbi cycle (Kumarbiš is present); **ullikummi — Ullikummi** (hittite) — the stone giant; **illuyankash — Illuyankaš** (hittite) — the dragon of the Illuyanka myth (Inaras present).
- **tawhaki — Tāwhaki** (polynesian) — the lightning-eyed ascender hero; **hina — Hina** (polynesian) — pan-Polynesian moon goddess; **hinenuitepo — Hine-nui-te-pō** (polynesian) — goddess of death who defeats Māui (present); **haumea — Haumea** (polynesian) — Hawaiian fertility goddess, dwarf-planet fame.
- **tlazolteotl — Tlāzōltēotl** (nahuatl) — eater of filth, goddess of confession/purification — a major Mexica deity absent from an otherwise deep pantheon; **nanahuatzin — Nanāhuātzin** (nahuatl) — the humble god who became the sun; **tecciztecatl — Tēcciztēcatl** (nahuatl) — the hesitant moon (his myth-mate Metztli is present).
- **eriu — Ériu** (celtic) — eponym of Ireland itself; **goibniu — Goibniu** (celtic) — smith of the Tuatha Dé Danann; **arianrhod — Arianrhod** (celtic) — Mabinogion's star-goddess (Gwydion present); **bran — Brân** (celtic) — Bendigeidfran, the Blessed; **branwen — Branwen** (celtic) — the Mabinogion's tragic queen; **pwyll — Pwyll** (celtic) — Prince of Dyfed (Rhiannon present); **lleu — Lleu** (celtic) — Llaw Gyffes (Blodeuwedd, Gronw Pebr present — the whole Fourth Branch cast except its hero); **llyr — Llŷr** (celtic) — father of Brân and Manawydan; **conchobar — Conchobar** (celtic) — king of Ulster in the Táin; **epona — Epona** (celtic/gaulish) — the horse goddess, only Celtic deity worshipped in Rome itself; **taranis — Taranis** (celtic/gaulish) — the thunderer of the Roman commentaries.
- **taiyi — Tàiyī** (太一, taoist) — Han-era supreme god; **bixiayuanjun — Bìxiá Yuánjūn** (碧霞元君, taoist) — goddess of Mt Tài, living pilgrimage; plus the five missing **Eight Immortals**: Hán Xiāngzǐ 韓湘子, Cáo Guójiù 曹國舅, Lǐ Tiěguǎi 李鐵拐, Lán Cǎihé 藍采和, Zhāng Guǒlǎo 張果老 (Lǚ Dōngbīn, Hé Xiāngū, Zhōnglí Quán present).
- **kon — Kon** (incan) — the coastal creator god; **mancocapac — Manco Cápac** (incan) — founder of Cuzco; **chaska — Ch'aska** (incan) — Venus goddess; **sanshin — Sanshin** (korean) — mountain god of living shrine practice; **baridegi — Baridegi** (korean) — the abandoned princess who became guide of souls; **yhi — Yhi** (aboriginal) — Karraur sun goddess; **bunyip — Bunyip** (aboriginal) — Australia's most famous creature; **tiddalik — Tiddalik** (aboriginal) — the water-hoarding frog.

---

## (c) Systematic-thinness notes

- **roman (8 entries)** — the thinnest pantheon *relative to fame*. The Dii Consentes are mostly absent: no Mārs, Venus, Cupīdō, Mercurius, Minerva, Vesta, Bacchus, Sāturnus, Fortūna, Victōria, Prōserpina, Lūna, Sōl. Note that ten Roman *abstractions* (Fidēs, Pietās, Virtūs, Clementia, Gravitas, Dignitās, Auctōritās, Nūmen, Anima, Animus) are filed under **greek** instead — see data-quality notes.
- **baltic (1)** and **mapuche (1)** — token coverage. Baltic has Perkūnas but not Dievas, Saulė, Laima, or Žemyna; Mapuche has Trengtreng but not Ngenechen. Either grow both to a defensible 5–8 entries or accept them as tokens.
- **taoist (12)** — thin for a living religion: the Eight Immortals are 3/8 present, the Three Pure Ones are only partially represented (Língbǎo present as a chinese entry, no Sānqīng structure), and major living-cult figures (Bìxiá Yuánjūn, Tàiyī) are absent.
- **korean (12)** — founding myth present (Dangun, Hwanung) but the living shamanic layer (Sanshin, Baridegi, Cheonjiwang) is barely touched.
- **canaanite/phoenician (14+7)** — the Ugaritic core is fine, but the Punic layer (Tanit, Baꜥal Ḥammōn, Melqart, Ešmūn) — the most famous Phoenician gods — is absent, and the canaanite tag currently doubles as a biblical-figures bucket (Moses, David, Solomon, Noah, Cain, Abel), which dilutes it.
- **sanskrit** — deep overall, but the Dashavatara — the single most recognizable Hindu "set" — is 5/10, and the Navagraha set is partial (Śani present; Rāhu, Ketu, Bṛhaspati, Śukra absent). Completing named sets is high-value because the set itself is the story.
- **japanese** — same set-completion issue: Seven Lucky Gods 2/7 present.
- **norse** — deep in giants/dwarfs/realms but missing the cosmic fundamentals (Sól, Máni, Ægir, Rán, Mímir) and the Vǫlsunga human layer (Sigurðr, Guðrún, Vǫlundr).
- **celtic** — good breadth, but the Táin and Mabinogion are missing their leads (Medb, Balor, Conchobar; Brân, Branwen, Arianrhod, Pwyll, Lleu), and the Roman-attested Gaulish gods (Epona, Taranis, Teutates, Belenos) are absent despite Cernunnos being present.
- **chinese** — the gods of *living practice* (Cáishén, Zàojūn, Tǔdìgōng, Zhōngkuí, Zhīnǚ) are exactly the layer that's missing — the lexicon covers the philosophical/textual layer (Dào, Qì, Wǔxíng, sacred mountains) better than the folk layer.
- **aboriginal, incan, hittite, polynesian** — moderate coverage with a few conspicuous headliner absences (Ranginui above all) rather than systematic thinness.

---

## (d) Data-quality observations (noticed in passing — not chased)

- **Count drift**: AGENTS.md and `data-version.json` document 895 entries; the working tree lexicon has 926. Presumably branch additions (Cháng'é, Hòuyì, …) awaiting a generate run, but worth confirming the divergence gate is green before relying on any count.
- **Near-duplicate entries** (same figure, two ids): `surt`/`surtr`, `njord`/`njordr`, `garm`/`garmr`, `marzanna`/`morana`, `ahriman`/`angramainyu`, `ashavahishta`/`ashavahista` (both zoroastrian, both Aša Vahišta), `inanna`/`ishtar` (both mesopotamian), `skanda`/`kartikeya` (both sanskrit), `mictlantecuhtli`/`mictlantecutli` (both nahuatl — two spellings of one god), `wenshu` (chinese) vs `manjushri` (buddhist), `amida` (japanese) vs `amitabha` (buddhist), `kothar` (phoenician) overlapping the canaanite cast. Some may be deliberate cross-tradition entries (the Inanna/Ištar pattern), but the zoroastrian and norse pairs look like accidental duplicates.
- **id/unicode mismatch**: `hananim` (korean) has unicode form `Hwanin` — two different figures (Hananim/Haneullim the sky god vs Hwanin, the celestial emperor of the Dangun myth) conflated in one entry.
- **Pantheon-tag drift**: ten Roman virtue abstractions (`fides`, `pietas`, `virtus`, `clementia`, `gravitas`, `dignitas`, `auctoritas`, `numen`, `anima`, `animus`) are tagged `greek`; biblical figures are tagged `canaanite`; modern cities (`tokyo`, `osaka`, `kyoto`, `kobe`, `nagoya`) are tagged `japanese` alongside kami (they may be intentional location entries, but there's no `japanese-location` tag to parallel `greek-location`).
- **Odd ids/forms**: `steh` for Egyptian Set (Stḫ); `radagast` (slavic) uses the Tolkien spelling — the attested god is Radegast; camelCase unicode forms `ErymanthianBoar`, `StymphalianBirds`, `Nemean Léon`, `SūnWùkōng`, `MakeMake`, `MamaQuilla`, `MatZemlyá`, `ZmeyGorynych` mix English multiword display into the unicode field.
- **greek `he`/`hebe`**: `he` (Hē) exists as a separate entry alongside `hebe` — verify `he` isn't a fragment.

---

*Method note: presence/absence verified by exact-id and substring search against the parsed lexicon (working list: `.superpowers/lexicon-entries.tsv`); every "absent" claim in sections (b)–(c) was confirmed absent by id at analysis time.*

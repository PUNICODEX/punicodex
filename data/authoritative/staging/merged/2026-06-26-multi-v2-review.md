# Merged batch review: 2026-06-26-multi-v2

Generated: 2026-06-26T02:46:49.601Z

## Summary

- Total merged suggestions: 274
- Conflicts: 0
- Greek field updates: 33
- Meaning updates: 139
- Original-script updates: 100
- Source-catalog updates: 2

## Overall assessment

The framework merged cleanly, but **the current batch should not be applied automatically**.
Perseus and Cologne both return dictionary-first-sense / lemma data, which is philologically accurate but often not the deity-or-personified-name sense used on temple pages. Wikidata still produces some misassigned entities for tier-3 leftovers.

## Greek field (Perseus, 33 suggestions)

Perseus returns dictionary headwords. Many are lowercase common-noun lemmas, while the lexicon uses capitalized proper-name forms for personified concepts. Applying these blindly would lowercase deity/abstract-principle pages.

Examples of case/dialect divergence:

| id | current | suggested | assessment |
|---|---|---|---|
| hades | Ἅιδης | Ἅδης | dialect/spelling variant |
| herakles | Ἡρακλῆς | Ἡρακλέης | dialect/spelling variant |
| elektra | Ἠλέκτρα | Ἠλέκτρη | dialect/spelling variant |
| aither | Αἰθήρ | αἰθήρ | lowercase lemma |
| ananke | Ἀνάγκη | ἀνάγκη | lowercase lemma |
| elpis | Ἐλπίς | ἐλπίς | lowercase lemma |
| ponos | Πόνος | πόνος | lowercase lemma |
| geras | Γῆρας | γῆρας | lowercase lemma |
| griffin | Γρύψ | γρύψ | lowercase lemma |
| logos | Λόγος | λόγος | lowercase lemma |
| nous | Νοῦς | νόος | lowercase lemma |
| pneuma | Πνεῦμα | πνεῦμα | lowercase lemma |

Recommendation: **manual review**. Keep capitalized display forms for deities/personified concepts; accept dialect variants only where the lexicon intentionally wants the alternate form.

## Meanings from Perseus Greek (26 suggestions)

Quality is mixed. Many extracted snippets are grammar labels, citations, or the Perseus footer instead of a plain definition.

### Looks usable

| id | suggested meaning |
|---|---|
| hades | in Hom. only as pr.n. Hades |
| demeter | Demeter, Il.2.696, al., once in Od., 5.125, h.Cer., etc. 2. appell., as a name for bread, Opp.H.3.463; cf. |
| tartaros | Tartarus, Il.8.13,481, Hes.Th.807, h.Ap.336, h.Merc.256,374, etc. |
| artemis | Artemis, Od.11.172, etc. |
| atlas | Atlas, Od.1.52: later, one of the Titans, Hes. Th.517, A.Pr.350,428 |
| peleus | Peleus, Il.18.18, etc. |
| protesilaus | A.First of the people, name of the hero who first leaped ashore at Troy, Il.2.698 |
| aither | in Hom., A.ether, the heaven |
| ananke | in Trag. freq. in answers and arguments |
| odysseus | A.Odysseus, king of Ithaca, hero of the Odyssey : in Hom. also |
| elpis | Constr., in Att., with gen. both of subject and object, as |
| praxis | A.doing, transaction, business |

### Looks problematic (skip or fix extractor)

| id | suggested meaning | issue |
|---|---|---|
| zeus | Dor. and Att.-Ion. forms with | grammar label |
| poseidon | Ion. | grammar label |
| leto | Adj. | grammar label |
| dionysos | Ep. also | fragment |
| agamemnon | also epith. of Zeus at Sparta, Staphylus Hist.10, Eust.168.10.—Adj. | fragment |
| priamos | Patron. | grammar label |
| thetis | Thetis, Hom., etc. Henry George Liddell. Robert Scott. A Greek-English Lexicon.  | Perseus footer/cruft |
| sisyphus | Adj. | grammar label |
| tantalus | Adj. | grammar label |
| achilles | Achilles. II. the fallacy vulgarly called Achilles and the Tortoise', invented b | Perseus footer/cruft |
| menelaus | Att. | grammar label |
| logos | Phrases | fragment |
| arche | also | fragment |
| delphi | Adj. | grammar label |

Recommendation: improve the Perseus extractor to strip the footer, reject grammar-only snippets, and require a real English gloss before producing a meaning suggestion.

## Devanagari original script from Cologne (96 suggestions)

- Aligned with existing curated forms: 83
- Divergent: 13

### Divergences (need fix in importer or manual choice)

| id | unicode | existing | suggested | likely cause |
|---|---|---|---|---|
| durga | Durgā | दुर्गा | दुर्ग | picked shorter/non-feminine headword |
| shiva | Śiva | शिव | सिव | wrong sibilant/entry |
| brahma | Brahmā | ब्रह्मा | ब्रह्म | picked shorter/non-feminine headword |
| kali | Kālī | काली | कलि | picked shorter/non-feminine headword |
| ushas | Uṣás | उष्áस् | उषस् | picked shorter/non-feminine headword |
| om | Oṃ | ओं | ओम् | wrong sibilant/entry |
| vyasa | Vyāsa | व्यास | तस् | picked shorter/non-feminine headword |
| nandi | Nandí | नन्द्í | नन्दि | picked shorter/non-feminine headword |
| shakti | Śakti | शक्ति | सक्ति | wrong sibilant/entry |
| narada | Nārada | नारद | नरद | picked shorter/non-feminine headword |
| samantabhadra | Samantabhadra | समन्तभद्र | सम्न्तभद्र | wrong sibilant/entry |
| nirvana | Nirvāṇa | निर्वाण | निर्वन | picked shorter/non-feminine headword |
| lumbini | Lumbinī | लुम्बिनी | लुम्बिनि | wrong sibilant/entry |

Recommendation: in the Cologne importer, prefer the exact `<s>` block whose stripped SLP1 matches the Unicode restoration (case-sensitive), and prefer deity-specific entries (e.g. look for "N. of" or feminine endings for goddess names).

## Meanings from Cologne Sanskrit (95 suggestions)

Cologne returns the dictionary-first sense. For deity entries this is often a generic adjective rather than the mythological figure.

| id | existing | suggested (first sense) | deity-friendly? |
|---|---|---|---|
| rama | Pleasing, dark (from राम) | dark, dark-coloured, black (cf. rAtri), AV.; TĀr. (rAmaH SakuniH. a bl | no — generic first sense |
| durga | Invincible, fortress (from दुर्ग) | a difficult or narrow passage, a place difficult of access, citadel, s | no — generic first sense |
| shiva | Auspicious, kind (from शिव) | or sivaka, m. one who sews or stitches, a sewer, stitcher, L. | no — generic first sense |
| vishnu | All-pervading (from विष्णु) | N. of one of the principal Hindū deities (in the later mythology regar | yes |
| krishna | Dark, dark-blue (from कृष्ण) | m. (with or without pakza) the dark half of the lunar month from full  | yes |
| lakshmi | Auspicious mark (from लक्ष्मी) | of the goddess of fortune and beauty (frequently in the later mytholog | yes |
| saraswati | She who flows (from सरस्वती) | of a river (celebrated in RV. and held to be a goddess whose identity  | yes |
| brahma | The Creator (from ब्रह्मा) | the one self-existent Spirit, the Absolute, R. | no — generic first sense |
| surya | The Sun (from सूर्य) | the sun or its deity (in the Veda the name Sūrya is generally distingu | yes |
| indra | The drop (from इन्द्र) | the Indian Jupiter Pluvius or lord of rain (who in Vedic mythology rei | no — generic first sense |
| agni | Fire (from अग्नि) | fire, sacrificial fire (of three kinds, Gārhapatya, Āhavanīya, and Dak | yes |
| yama | The Twin (from यम) | a twin, one of a pair or couple, a fellow (du. ‘the twins’, N. of the  | yes |
| kubera | Deformed one (from कुबेर) | or in later Sanskṛt kuvera (originally) N. of a chief of the evil bein | yes |
| hanuman | Having large jaws (from हनुमत्) | ‘having (large) jaws’, N. of a monkey-chief (one of the most celebrate | yes |
| chandra | Moon, shining | glittering, shining (as gold), having the brilliancy or hue of light ( | yes |
| varuna | He who covers | ‘All-enveloping Sky’, N. of an Āditya (in the Veda commonly associated | yes |
| ganga | Swift goer | ‘swift-goer’, the river Ganges (personified and considered as the elde | yes |
| parvati | Daughter of the mountain | of the god Śiva's wife (as daughter of Hima-vat, king of the snowy mou | yes |
| kali | The black one, time | m. N. of a class of mythic beings (related to the Gandharvas, and supp | yes |
| sita | Furrow | a furrow, the track or line of a ploughshare (also personified, and ap | yes |
| arjuna | White, bright, silver | of the third of the Pāṇḍava princes (who was a son of Indra and Kuntī) | no — generic first sense |
| bhima | Terrible, formidable | fearful, terrific, terrible, awful, formidable, tremendous, RV. &c. &c | no — generic first sense |
| draupadi | Daughter of Drupada | patr. | no — generic first sense |
| karna | Ear, earrings | the ear, RV.; AV.; TS.; Suśr. (api karRe, behind the ear or back, from | no — generic first sense |
| radha | Success, prosperity | of a celebrated cowherdess or Gopī (beloved by Kṛṣṇa, and a principal  | yes |

Recommendation: either extract the deity sense when available (e.g. find "N. of" in the entry body) or flag Cologne meaning suggestions for mythological entries as manual-review.

## Remaining Wikidata meanings (tier 3, 18 suggestions)

These survived because no higher-tier source overrode them, but several are misassigned entities.

| id | pantheon | existing | suggested | assessment |
|---|---|---|---|---|
| apollon | greek | Possibly 'destroyer' or 'purifier' (from | 1740 French naval vessle | misassigned entity |
| hekate | greek | She who works from afar (from ἑκάς) | Greek goddess | plausible |
| selene | greek | Moon, light (from σέλας) | ancient Greek goddess and personification of the Moon, daughter of Hyp | plausible |
| eos | greek | Dawn (from ἠώς) | weekly publication of the American Geophysical Union | misassigned entity |
| bellerophon | greek | Slayer of Belleros (possibly) | Hero in Greek myth who rode Pegasus and killed the Chimera | plausible |
| theseus | greek | The Gatherer (from τίθημι) | legendary king of Athensm son of Aegeus and Aethra; famous for slaying | misassigned entity |
| mnemosyne | greek | Memory (from μνήμη) | personification of memory in Greek mythology, mother of the nine muses | plausible |
| patroclus | greek | Father's glory | son of Menoetius in Greek mythology, a greek hero of the Trojan war | plausible |
| antilochus | greek | Against ambush | mythological prince, son of Nestor | plausible |
| bes | egyptian | The protector | Japanese singer | misassigned entity |
| khepri | egyptian | The becoming one | Egyptian deity of the rising sun | plausible |
| aaru | egyptian | Reeds | The heavenly paradise where Osiris ruled and good souls reside in the  | plausible |
| maatka | egyptian | Truth of the soul | Confederation of Kabyle tribes | misassigned entity |
| styx | greek | Hateful | small natural satellite of the dwarf planet Pluto | misassigned entity |
| guanyin | chinese | Perceiver of sounds | town in Yunxi County, Hubei province, China | misassigned entity |
| wenchang | taoist | Literary prosperity | subdistrict in Changqing District, Shandong, China | misassigned entity |
| dangun | korean | Lord of the sandalwood | legendary founder and first god-king of Gojoseon | plausible |
| samshin | korean | Three spirits | goddess in Korean mythology | plausible |

Recommendation: tighten Wikidata scoring (add more bad-phrase filters for satellites, publications, towns, singers, etc.) and require a higher confidence/score before accepting a tier-3 meaning.

## Recommended next steps

1. **Do not apply 2026-06-26-multi-v2 automatically.**
2. Fix the Cologne importer to select the exact Unicode-matching Devanagari headword and, when possible, the deity-specific sense.
3. Improve the Perseus meaning extractor: strip footer cruft, reject grammar-only snippets, and keep only real English glosses.
4. Harden Wikidata scoring to eliminate satellites, publications, towns, and singers.
5. Re-run the orchestrator and re-review.
6. Apply only after a human passes each field update.

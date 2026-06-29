# Merged batch review: 2026-06-26-multi-v4

Generated: 2026-06-26T04:54:08.718Z

## Summary

- Total merged suggestions: 213
- Conflicts: 0
- Meaning updates: 110
- Original-script updates: 101
- Source-catalog updates: 2

| Source | Tier | Suggestions |
|--------|------|-------------|
| cologne-sanskrit | 1 | 198 |
| etcsL-sumerian | 1 | 0 |
| psd-akkadian | 1 | 0 |
| rundata-norse | 1 | 0 |
| faulkner-egyptian | 1 | 0 |
| allen-egyptian | 1 | 0 |
| ctext-chinese | 2 | 0 |
| celt-irish | 2 | 0 |
| gretil-sanskrit | 2 | 0 |
| skaldic-norse | 2 | 0 |
| wikidata | 3 | 15 |

## Devanagari original script (Cologne)

- Suggestions matching existing curated forms: 96
- Divergent suggestions: 5

| id | unicode | existing | suggested | note |
|----|---------|----------|-----------|------|
| amaterasu | Amaterasu | (none) | 天照大神 | review needed |
| longwang | Lóngwáng | (none) | 龙王 | review needed |
| lumbini | Lumbinī | लुम्बिनी | लुम्बिनि | review needed |
| nandi | Nandí | नन्द्í | नन्दि | existing has stray Latin accent — suggestion is cleaner |
| ushas | Uṣás | उष्áस् | उषस् | existing has stray Latin accent — suggestion is cleaner |

## Meanings from Cologne Sanskrit

Total meaning suggestions: 110

### Plausible deity / figure senses (sample)

| id | unicode | suggested meaning |
|----|---------|-------------------|
| agni | Agni | the god of fire, the fire of the stomach, digestive faculty, gastric fluid |
| amaterasu | Amaterasu | Sun goddess in Shinto |
| ariadne | Ariadnē | the daughter of Minos in Greek mythology |
| brahma | Brahmā | Brahmā or the one impersonal universal Spirit manifested as a personal Creator and as the first of t |
| dhyana | Dhyāna | mental representation of the personal attributes of a deity, W. |
| diti | Diti | N. of a deity answering to Aditi (q.v.) as Sura to Asura and without any distinct character, AV. vii |
| durga | Durgā | ‘the inaccessible or terrific goddess’, N. of the daughter of Himavat and wife of Śiva (also called  |
| ganymede | Ganymēdēs | son of Tros in Greek mythology |
| hiiaka | Hiiaka | patron goddess of Hawaiʻi |
| indra | Indra | the god of the atmosphere and sky |
| kamapuaa | Kamapuaa | male fertility deity in Hawaiian mythology |
| kanaloa | Kānāloa | Hawaiian god symbolized by the squid or by the octopus, typically associated with Kāne |
| karna | Karṇa | of a king of Aṅga (and elder brother by the mother's side of the Pāṇḍu princes, being the son of the |
| krishna | Kṛṣṇa | of a celebrated Avatār of the god Viṣṇu, or sometimes identified with Viṣṇu himself [MBh. v, 2563; x |
| ksitigarbha | Kṣitigarbha | N. of a Bodhisattva, Buddh. |
| lakshmi | Lakṣmī | of the goddess of fortune and beauty (frequently in the later mythology identified with Śrī and rega |
| longwang | Lóngwáng | water deity in Chinese mythology |
| lono | Lono | Hawaiian deity, associated with fertility, agriculture, rainfall, music and peace |
| maitreya | Maitreya | of a Bodhisattva and future Buddha (the 5th of the present age), Lalit. |
| mantra | Mantra | a sacred formula addressed to any individual deity (e.g. om SivAya namaH), RTL. 61 |

### Generic or stub senses flagged for manual review

| id | unicode | suggested meaning |
|----|---------|-------------------|
| draupadi | Draupadī | patr. |
| rama | Rāma | of various mythical personages (in Veda two Rāmas are mentioned with the patr. Mārgaveya and Aupatas |
| ratri | Rātrī | in comp. |
| sahadeva | Sahadeva | N. of a Ṛṣi (with the patr. vArzAgira), RV. i, 107 |

## Wikidata tier-3 review

No obviously misassigned entities remain in the Wikidata suggestions after the scoring hardening.

## Notes

- Perseus Greek was excluded from this pass because the Perseus endpoint is currently rate-limiting / black-holing requests; the extractor fixes are in place and it can be re-run later with a longer delay.
- Cologne Sanskrit now selects Unicode-matching headwords and deity-specific senses in most cases; a few polysemous names still return dictionary-first-sense stubs.
- Wikidata scoring was tightened with a much larger bad-phrase list and a higher acceptance threshold; the remaining suggestions are all deity/mythology-aligned.

## Recommendation

Review the divergent Devanagari rows and the generic-meaning stubs, then apply the rest. The batch is significantly cleaner than v2 and has no same-tier conflicts.

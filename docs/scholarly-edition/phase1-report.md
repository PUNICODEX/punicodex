# Scholarly Edition — Phase 1 Archaeology Report

**Generated:** 2026-07-07T09:14:01.039Z  
**Flagships analyzed:** 123  
**Artifact locations:**
- `docs/scholarly-edition/flagship-section-matrix.json`
- `docs/scholarly-edition/scholarly-section-taxonomy-v0.1.json`

## Executive Summary
The 123 PUNICODEX flagship temples share a highly consistent underlying scholarly structure in `scripts/lore-catalog.json`, but the rendered lore pages expose only a thin subset of that content. The Scholarly Edition will surface every canonical section as a first-class, editable, attributable scholarly block, beginning blank for all 123 temples.

## Empirical Findings

### Catalog Section Frequency (out of 111 flagships with lore-catalog entries)
| Section | Count | % |
|---------|-------|---|
| pronunciation | 111 | 100% |
| domains | 111 | 100% |
| symbols | 111 | 100% |
| mythology | 111 | 100% |
| syncretism | 111 | 100% |
| culturalLegacy | 111 | 100% |
| sources | 111 | 100% |
| archaeology | 111 | 100% |
| extendedMeditation | 102 | 91.9% |
| originalScriptNote | 44 | 39.6% |

### Rendered Lore HTML Sections (all 123 flagships)
Every lore page renders the same shell:
`hero → the-name → pronunciation → symbols → mythology → related → extended-lore-cta`

67 of 123 also render an `Original Script Provenance` section.

### Extended Page Sections (all 123 flagships)
Every extended page renders:
`hero → quick-facts → etymology → unicode-breakdown → cultural-significance → faq → sources → back-to-lore`

## Scholarly Section Taxonomy v0.1

### Universal Sections (every flagship Scholarly Edition)
1. Overview
2. The Name
3. Pronunciation
4. Original Script & Provenance
5. Domains & Attributes
6. Symbols
7. Mythology
8. Syncretism & Reception
9. Cultural Legacy
10. Archaeology & Material Evidence
11. Scholarly Sources
12. Edit History
13. Attribution

### Common Sections
- Meditation & Reflection

### Pantheon Kits (auto-activated by tradition)
- Greek: Homeric Hymns, Epithets & Epicleses, Oracle & Cult Sites, Iconography
- Greek-location: Topography, Historical Sources, Modern Site & Excavations
- Norse: Poetic Edda, Prose Edda, Runic Evidence, Sagas
- Egyptian: Hieroglyphic Evidence, Pyramid Texts, Coffin Texts, Book of the Dead
- Canaanite: Ugaritic Tablets, Tanakh References, Inscriptions
- Phoenician: Phoenician Inscriptions, Biblical References, Classical Sources
- Mesopotamian: Cuneiform Sources, Enūma Eliš, Atra-Ḫasīs
- Sanskrit: Vedic References, Upaniṣads, Purāṇas, Mantras
- Chinese: Classical Texts, Daoist Sources, Buddhist Sources, Calligraphy
- Taoist: Daoist Canon, Yijing, Inner Alchemy
- Japanese: Kojiki & Nihon Shoki, Shinto Sources, Japanese Buddhist Sources
- Nahuatl: Florentine Codex, Aztec Sources, Colonial-Era Sources
- Incan: Colonial Chronicles, Archaeological Sites
- Zoroastrian: Avesta, Gathas, Middle Persian Sources
- Celtic: Irish Mythological Cycles, Welsh Sources, Inscriptions
- Yoruba: Ifá Corpus, Oral Tradition, Diaspora Traditions
- Polynesian: Oral Narratives, Ethnographic Sources
- Slavic: Primary Chronicle, Folk Sources
- Hittite: Hittite Texts, Cuneiform Archives
- Abrahamic: Hebrew Bible, New Testament, Midrash, Qur'ānic References

### Optional Sections
- Maps & Sacred Sites
- Art & Iconography Gallery
- Historical Timeline
- Genealogy
- Related Names
- Comparative Mythology
- Modern Practice & Devotion
- Full Bibliography

## Key Architectural Implications
1. **No existing content is damaged.** The Scholarly Edition is a new `/sites/{id}/scholars/` layer.
2. **Content is already structured.** `lore-catalog.json` provides the seed corpus; Scholarly Edition migrates it into the new editable workflow.
3. **Original script provenance must be universal.** Currently only 44 of 111 catalog entries have it, but every name has an original tradition.
4. **The generation pipeline needs a new artifact.** A Scholars manifest will drive blank-page generation for all 123 flagships.
5. **Pantheon kits prevent generic flattening.** Greek, Norse, Egyptian, and other traditions get their own required scholarly section palettes.

#!/usr/bin/env node
'use strict';

/**
 * PÚNYCODEX — Fix cross-tradition pollution in original-scripts-extra.json
 *
 * A bulk enrichment script incorrectly copied Avestan / Old Persian /
 * Zoroastrian (and a few other) scholarly sources and uncertainty notes into
 * entries whose actual tradition is Greek, Sanskrit, Egyptian, etc.
 *
 * This script:
 *  - reads type/js/original-scripts-extra.json
 *  - classifies each entry by scriptName / scriptFamily
 *  - removes sources whose title belongs to a different scholarly tradition
 *  - removes uncertainty notes that discuss an irrelevant tradition
 *  - back-fills 2–3 canonical default sources when an entry is left empty
 *  - preserves the 8 pilot flagships exactly as they are
 *  - writes the file back with JSON.stringify(..., null, 2)
 */

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'type', 'js', 'original-scripts-extra.json');

const PILOT_IDS = new Set(['zeus', 'ra', 'thor', 'shiva', 'long', 'nikko', 'david', 'enlil']);

function classifyTradition(entry) {
  const name = (entry.scriptName || '').toLowerCase();
  const family = (entry.scriptFamily || '').toLowerCase();

  if (name === 'greek' || family.includes('greek')) return 'greek';
  if (name === 'hieroglyphs' || family.includes('egyptian')) return 'egyptian';
  if (name === 'cuneiform' || family.includes('sumero-akkadian')) return 'mesopotamian';
  if (name === 'devanagari' || family.includes('brahmic')) return 'sanskrit';
  if (name === 'younger futhark' || family.includes('germanic runic')) return 'norse';
  if (name === 'hebrew') return 'hebrew';
  if (name === 'ugaritic' || name === 'phoenician') return 'canaanite';
  if (name === 'chinese characters' || family.includes('hanzi')) return 'chinese';
  if (name === 'japanese characters' || family.includes('kanji')) return 'japanese';
  if (name === 'avestan') return 'zoroastrian';
  return 'unknown';
}

// Returns a Set of traditions a source title clearly belongs to.
// An empty Set means "generic / unclassified" and will be kept.
function sourceTraditions(title) {
  const t = title.toLowerCase();
  const set = new Set();

  if (
    /liddell.scott.jones|\blsj\b|beekes|etymological dictionary of greek|chantraine|dictionnaire étymologique|pape.benseler|herodotus|hesiod|plato|greek and roman world|\bdge\b/.test(
      t
    )
  ) {
    set.add('greek');
  }

  if (
    /faulkner|wörterbuch der ägyptischen|wörterbuch der .*sprache|\bwb\b|allen, middle egyptian|hannig|gardiner, egyptian grammar/.test(t)
  ) {
    set.add('egyptian');
  }

  if (
    /chicago assyrian dictionary|\bcad\b|electronic text corpus|etcsl|akkadisches handwörterbuch|\bahw\b|black & green|george, (house most high|the babylonian)|enuma elish|schwemer|sommerfeld|wiggermann|jacobsen|annus|hutter/.test(
      t
    )
  ) {
    set.add('mesopotamian');
  }

  if (
    /monier.williams|mayrhofer|\bewaia\b|macdonell|sanskrit|apte|brāhmaṇa|upaniṣad|ṛgveda|śvetāśvatara/.test(t)
  ) {
    set.add('sanskrit');
  }

  if (
    /zoëga|cleasby.vigfusson|barnes, runes|poetic edda|prose edda|\bedpg\b|old icelandic/.test(t)
  ) {
    set.add('norse');
  }

  if (
    /biblia hebraica|\bbhs\b|brown.driver.briggs|\bhalot\b|hebrew and aramaic lexicon|\btdot\b|abraham/.test(t)
  ) {
    set.add('hebrew');
  }

  if (
    /\bcis\b|\bktu\b|\bkai\b|krahmalkov|phoenician|ugaritic texts|coogan|smith, the ugaritic|de moor|day|schaeffer|pardee|cross/.test(
      t
    )
  ) {
    set.add('canaanite');
  }

  if (
    /chinese classics|i ching|dao de jing|daoist canon|zhou dunyi|hanyu da zidian|baxter.sagart|karlgren|schuessler|pulleyblank|unihan|sino.tibetan/.test(
      t
    )
  ) {
    set.add('chinese');
  }

  if (
    /hepburn|joyō|joyo|kanjidic|kojiki|nelson|shinmeikai|on.yomi|kanji/.test(t)
  ) {
    set.add('japanese');
  }

  if (
    /bartholomae|altiranisches|geldner|avesta|kellens|airwb|old persian|encyclopaedia iranica/.test(t)
  ) {
    set.add('zoroastrian');
  }

  return set;
}

// Returns a Set of traditions an uncertainty note clearly discusses.
// Notes matched here but not allowed for the entry's tradition are removed.
// Classification is exclusive: the first matched tradition wins, so a note
// about Old Iranian that mentions Vedic Sanskrit as a comparison is treated
// as Zoroastrian only and removed from Sanskrit entries.
function uncertaintyTraditions(note) {
  const n = note.toLowerCase();

  if (/avestan|old persian|zoroastrian|old iranian|airwb/.test(n)) {
    return new Set(['zoroastrian']);
  }

  if (/ugaritic|phoenician/.test(n)) {
    return new Set(['canaanite']);
  }

  if (/biblical hebrew|tiberian|masoretic|qāmeṣ/.test(n)) {
    return new Set(['hebrew']);
  }

  if (
    /classical greek|pitch accent|byzantine|greek etymologies|pre.greek|greek alphabet/.test(n)
  ) {
    return new Set(['greek']);
  }

  if (/egyptian hieroglyphs|egyptological|hieroglyphs/.test(n)) {
    return new Set(['egyptian']);
  }

  if (/sumerian|polyphony|cuneiform|akkadian/.test(n)) {
    return new Set(['mesopotamian']);
  }

  if (/old norse|runic|younger futhark|proto.germanic|ᚢ/.test(n)) {
    return new Set(['norse']);
  }

  if (
    /vedic|sanskrit|devanagari|ṛgveda|upaniṣad|brāhmaṇa|śvetāśvatara|schwa deletion/.test(n)
  ) {
    return new Set(['sanskrit']);
  }

  if (/old chinese|baxter.sagart|mandarin|sino.tibetan|chinese.layer|simplified.*traditional/.test(n)) {
    return new Set(['chinese']);
  }

  if (/japanese readings|on.yomi|kanji orthography|joyō|joyo/.test(n)) {
    return new Set(['japanese']);
  }

  return new Set();
}

function defaultSources(tradition) {
  switch (tradition) {
    case 'greek':
      return [
        { title: 'Liddell-Scott-Jones (LSJ)', tier: 1 },
        { title: 'Beekes, Etymological Dictionary of Greek', tier: 2 },
        { title: 'Pape-Benseler', tier: 2 },
      ];
    case 'egyptian':
      return [
        { title: 'Faulkner, A Concise Dictionary of Middle Egyptian', tier: 1 },
        { title: 'Wörterbuch der ägyptischen Sprache (Wb)', tier: 1 },
        { title: 'Allen, Middle Egyptian', tier: 2 },
      ];
    case 'mesopotamian':
      return [
        { title: 'Chicago Assyrian Dictionary (CAD)', tier: 1 },
        { title: 'Electronic Text Corpus of Sumerian Literature (ETCSL)', tier: 1 },
        { title: 'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia', tier: 2 },
      ];
    case 'sanskrit':
      return [
        { title: 'Monier-Williams Sanskrit-English Dictionary', tier: 1 },
        { title: 'Mayrhofer, EWAia', tier: 1 },
        { title: 'Macdonell, Sanskrit-English Dictionary', tier: 2 },
      ];
    case 'norse':
      return [
        { title: 'Zoëga, A Concise Dictionary of Old Icelandic', tier: 1 },
        { title: 'Cleasby-Vigfusson, An Icelandic-English Dictionary', tier: 1 },
        { title: 'Barnes, Runes: A Handbook', tier: 2 },
      ];
    case 'hebrew':
      return [
        { title: 'Biblia Hebraica Stuttgartensia (BHS)', tier: 1 },
        { title: 'Hebrew and Aramaic Lexicon of the Old Testament (HALOT)', tier: 1 },
        { title: 'TDOT, דוד', tier: 2 },
      ];
    case 'canaanite':
      return [
        { title: 'KTU²', tier: 1 },
        { title: 'CIS', tier: 1 },
        { title: 'Smith, The Ugaritic Baal Cycle', tier: 2 },
      ];
    case 'chinese':
      return [
        { title: 'Unihan Database', tier: 1 },
        { title: 'Hanyu Da Zidian', tier: 2 },
        { title: 'Baxter-Sagart Reconstruction of Old Chinese', tier: 2 },
      ];
    case 'japanese':
      return [
        { title: 'Joyō Kanji Table', tier: 1 },
        { title: 'Hepburn Romanisation Standard', tier: 2 },
        { title: 'Kanjidic', tier: 3 },
      ];
    case 'zoroastrian':
      return [
        { title: 'Bartholomae, Altiranisches Wörterbuch', tier: 1 },
        { title: 'Geldner, Avesta', tier: 1 },
        { title: 'Kellens, Les textes vieil-avestiques', tier: 2 },
      ];
    default:
      return [];
  }
}

function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);

  let entriesWithSourcesRemoved = 0;
  let entriesWithUncertaintiesCleaned = 0;
  let totalSourcesRemoved = 0;
  let totalUncertaintiesRemoved = 0;
  let entriesWithDefaultsAdded = 0;

  for (const [id, entry] of Object.entries(data)) {
    if (id === '_note') continue;
    if (PILOT_IDS.has(id)) continue;

    const tradition = classifyTradition(entry);
    const provenance = entry.provenance || {};

    // --- sources ---
    const originalSources = provenance.sources || [];
    const cleanedSources = [];
    let sourcesRemovedHere = 0;

    for (const source of originalSources) {
      const title = source.title || '';
      const trads = sourceTraditions(title);
      if (trads.size > 0 && !trads.has(tradition)) {
        sourcesRemovedHere += 1;
        totalSourcesRemoved += 1;
      } else {
        cleanedSources.push(source);
      }
    }

    if (sourcesRemovedHere > 0) {
      entriesWithSourcesRemoved += 1;
    }

    if (cleanedSources.length === 0) {
      const defaults = defaultSources(tradition);
      const existingTitles = new Set(cleanedSources.map((s) => s.title));
      for (const def of defaults) {
        if (!existingTitles.has(def.title)) {
          cleanedSources.push(def);
          existingTitles.add(def.title);
        }
      }
      if (cleanedSources.length > 0) {
        entriesWithDefaultsAdded += 1;
      }
    }

    provenance.sources = cleanedSources;

    // --- uncertainties ---
    const originalUncertainties = provenance.uncertainties || [];
    const cleanedUncertainties = [];
    let uncertaintiesRemovedHere = 0;

    for (const note of originalUncertainties) {
      const trads = uncertaintyTraditions(note);
      if (trads.size > 0 && !trads.has(tradition)) {
        uncertaintiesRemovedHere += 1;
        totalUncertaintiesRemoved += 1;
      } else {
        cleanedUncertainties.push(note);
      }
    }

    if (uncertaintiesRemovedHere > 0) {
      entriesWithUncertaintiesCleaned += 1;
    }

    provenance.uncertainties = cleanedUncertainties;
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log('Provenance source clean-up complete.');
  console.log(`  Entries with sources removed:      ${entriesWithSourcesRemoved}`);
  console.log(`  Total sources removed:             ${totalSourcesRemoved}`);
  console.log(`  Entries with uncertainties cleaned:${entriesWithUncertaintiesCleaned}`);
  console.log(`  Total uncertainties removed:       ${totalUncertaintiesRemoved}`);
  console.log(`  Entries back-filled with defaults: ${entriesWithDefaultsAdded}`);
}

main();

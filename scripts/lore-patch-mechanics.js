#!/usr/bin/env node
/**
 * Lore patch — mechanics for the ascii-restoration batch (2026-11).
 *
 * The scholars generator + substance tests require:
 *   - lore.symbols (top-level array of {name, meaning}) — the temple's symbol
 *     cards and the scholars 'symbols' section both read it.
 *   - pronunciation.kin as an ARRAY of {label, form} — a string is silently
 *     dropped by buildPronunciation, starving the section below its floor.
 *
 * This patch derives lore.symbols from domains.cards (name/desc →
 * name/meaning) and converts kin strings to labelled arrays. Idempotent.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const IDS = [
  'osiris','sobek','nut','geb','tefnut','serket','serapis','neith','min','montu','nun',
  'sokar','kebechet','renenutet','onuris','karnak','luxor','bes',
  'indra','agni','yama','kalki','kubera','skanda','dharma','karma','yoga','aditi',
  'brahman','bhakti','chandra','diti',
];

let patched = 0;
for (const id of IDS) {
  const e = lore[id];
  if (!e) continue;
  let dirty = false;

  // 1. Top-level symbols from the domain cards.
  if (!Array.isArray(e.symbols) || !e.symbols.length) {
    const cards = (e.domains && e.domains.cards) || [];
    if (cards.length) {
      e.symbols = cards.map((c) => ({
        name: c.name,
        meaning: (c.desc || '').replace(/<\/?em>/g, '*'),
      }));
      dirty = true;
    }
  }

  // 2. kin → [{label, form}] array, split on the middle dot.
  const pron = e.pronunciation || {};
  if (pron.kin && !Array.isArray(pron.kin)) {
    pron.kin = String(pron.kin)
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^([^\s(]+(?:\s[A-Za-zĀ-ž'-]+)?)\s+(.+)$/);
        // label = first token(s) before the form: keep it simple — first word is the label.
        const sp = s.indexOf(' ');
        return sp > 0
          ? { label: s.slice(0, sp), form: s.slice(sp + 1) }
          : { label: 'Form', form: s };
      });
    dirty = true;
  }

  if (dirty) patched++;
}
fs.writeFileSync(LORE_PATH, JSON.stringify(lore, null, 2) + '\n');
console.log(`patched ${patched}/${IDS.length} entries`);

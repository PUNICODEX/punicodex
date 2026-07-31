/**
 * PuniCodex — editorial voice library for the blog series
 *
 * Shared prose machinery for the Restoration/Resonance generators: deep
 * deterministic phrase pools, full lore-catalog field access (mythology,
 * archaeology, syncretism, cultural legacy, pronunciation, symbols, sources),
 * and the citation texture that makes generated essays read as scholarship
 * rather than boilerplate.
 */

'use strict';

// ── Deterministic variation ─────────────────────────────────────────────────

function hashStr(id) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(id, salt, arr) {
  return arr[(hashStr(id) + salt * 2654435761) % arr.length];
}

// ── Text utilities ──────────────────────────────────────────────────────────

function stripHtml(h) {
  return String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentences(text, n) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return parts.slice(0, n).join(' ').trim();
}

function lastSentence(text) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return parts[parts.length - 1].trim();
}

function displayPantheon(p) {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
}

// ── Lore access ─────────────────────────────────────────────────────────────

function loreMyths(lore, n) {
  const myths = (lore?.mythology?.myths || []).slice(0, n || 3);
  return myths.map((m) => ({ title: stripHtml(m.title), tag: stripHtml(m.tag), text: stripHtml(m.text) }));
}

function loreLead(lore) {
  return stripHtml(lore?.mythology?.lead);
}

function loreArchaeology(lore) {
  return stripHtml(lore?.archaeology);
}

function loreSyncretism(lore) {
  return stripHtml(lore?.syncretism);
}

function loreLegacy(lore) {
  return stripHtml(lore?.culturalLegacy);
}

function loreSymbols(lore, n) {
  return (lore?.symbols || []).slice(0, n || 3).map((s) => ({ name: stripHtml(s.name), meaning: stripHtml(s.meaning) }));
}

function lorePronunciation(lore) {
  const p = lore?.pronunciation;
  if (!p) return null;
  return { ipa: p.ipa || '', approximation: stripHtml(p.approximation) };
}

// The citation line: "as Beekes and the Homeric Hymn to Apollo record".
function citeSources(lore, max) {
  const names = (lore?.sources || []).map((s) => s.name).filter(Boolean);
  if (names.length === 0) return '';
  const shown = names.slice(0, max || 2);
  const joined = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  const frames = [
    `as ${joined} record`,
    `as ${joined} preserve it`,
    `in the attestation ${joined} give us`,
    `on the evidence ${joined} set down`,
  ];
  return frames[hashStr(joined) % frames.length];
}

function sourceList(lore, max) {
  return (lore?.sources || []).map((s) => s.name).filter(Boolean).slice(0, max || 4);
}

// ── Pantheon flavor (one line each, used to tint openings) ──────────────────

const PANTHEON_FLAVOR = {
  greek: 'a tradition that invented both the chorus and the critique',
  norse: 'a tradition that wrote its endings down in advance and sang them anyway',
  egyptian: 'a tradition that treated names as operational magic, not labels',
  mesopotamian: 'the tradition that invented writing and immediately used it for the gods',
  sanskrit: 'a tradition where the name and the thing named were never fully separate',
  japanese: 'a tradition that keeps its gods in the landscape and the landscape in the name',
  norse2: '',
  yoruba: 'a tradition carried across an ocean without losing a single drumbeat',
  chinese: 'a tradition where order in heaven and order in the hall mirror each other',
  zoroastrian: 'the tradition that first framed the world as a choice between truth and the lie',
  polynesian: 'a tradition that navigated by names the way it navigated by stars',
};

function pantheonFlavor(p) {
  return PANTHEON_FLAVOR[p] || 'a tradition with its own exact discipline';
}

module.exports = {
  hashStr,
  pick,
  stripHtml,
  firstSentences,
  lastSentence,
  displayPantheon,
  loreMyths,
  loreLead,
  loreArchaeology,
  loreSyncretism,
  loreLegacy,
  loreSymbols,
  lorePronunciation,
  citeSources,
  sourceList,
  pantheonFlavor,
};

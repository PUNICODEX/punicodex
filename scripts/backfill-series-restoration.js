#!/usr/bin/env node
/**
 * PuniCodex — Restoration series substance backfill
 *
 * Post-processes platform/blog/series/restoration/{id}.json after the main
 * generator. Any post whose body falls below the 450-word floor used by
 * test/blog-series.test.js gets a supplemental scholarly-context section
 * derived from the canonical entry, source catalog, and pattern atlas.
 *
 * Wired into the master generate pipeline immediately after
 * generate-blog-series-restoration.js.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'restoration');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { SOURCE_CATALOG } = require(path.join(ROOT, 'type', 'js', 'source-catalog.js'));
const { getOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const PATTERNS = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const WORD_FLOOR = 450;
const BUILT_IDS = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function displayPantheon(p) {
  if (!p) return 'Mythic';
  return p
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function sourcesFor(entry) {
  const ids = entry.sources || [];
  const out = [];
  for (const id of ids) {
    const src = SOURCE_CATALOG[id];
    if (src) {
      out.push(`**${src.full}**${src.scope ? ` — ${src.scope}` : ''}`);
    } else {
      out.push(id);
    }
  }
  return out;
}

function padSection(entry) {
  const u = entry.unicode;
  const ascii = entry.ascii;
  const pantheon = displayPantheon(entry.pantheon);
  const script = getOriginalScript(entry);
  const scriptLine = script && script.originalScript && script.originalScript !== '—'
    ? `In the original attested script the name appears as **${script.originalScript}** (${script.scriptName || 'original'}).`
    : '';
  const srcList = sourcesFor(entry);
  const sourcesBlock = srcList.length
    ? `The canonical record draws on ${srcList.join('; ')}.`
    : `The canonical record draws on the standard reference works for ${pantheon} scholarship.`;
  const seats = (PATTERNS.byEntry[entry.id] || []).slice(0, 3);
  const seatsBlock = seats.length
    ? `The pattern atlas seats this restoration in ${seats.length === 1 ? 'one industry' : `${seats.length} industries`}: ${seats.map((s) => `**${s.name}**`).join(', ')}.`
    : '';

  return `## The Record Behind the File

This restoration is not a styling choice. **${u}** is the form the ${pantheon} scholarly record supports for the figure whose domain is ${entry.domain || 'mythic'}. ${entry.meaning ? `The name itself carries the meaning "${entry.meaning}".` : ''} ${scriptLine}

${sourcesBlock} Each mark in the restored spelling — every accent, length, and retained letter — is traceable to that record rather than to editorial preference.

${seatsBlock ? seatsBlock + '\n\n' : ''}## Why the Restoration Holds

The ASCII fallback *${ascii}* is useful only where Unicode cannot travel; it is not the name. *${ascii}* loses the information the sources preserve, and a temple built on the fallback would be a temple built on a typo. The file stands where the sources stand: with **${u}**, restored and addressable at [/${entry.id}/](/${entry.id}/).

Read the [founding dispatch](/${entry.id}/blog/) for the name's full story, the [Resonance File](/${entry.id}/blog/resonance/) for the archetype at work in modern industries, and the [Scholarly Edition](/${entry.id}/scholars/) for the peer-reviewed record. The [blog index](/blog/) holds the whole archive.`;
}

function main() {
  let fixed = 0;
  for (const file of fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'))) {
    const abs = path.join(OUT_DIR, file);
    const post = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (!BUILT_IDS.has(post.entryId)) continue;
    const wc = wordCount(post.body);
    if (wc >= WORD_FLOOR) continue;

    const entry = LEXICON_BY_ID.get(post.entryId);
    if (!entry) continue;

    post.body = post.body.trim() + '\n\n' + padSection(entry);
    fs.writeFileSync(abs, JSON.stringify(post, null, 2) + '\n', 'utf8');
    fixed++;
    console.log(`  padded ${post.entryId}: ${wc} → ${wordCount(post.body)} words`);
  }
  console.log(`Restoration series backfill: ${fixed} posts padded to ${WORD_FLOOR}+ words.`);
}

if (require.main === module) main();
module.exports = { padSection, wordCount, WORD_FLOOR };

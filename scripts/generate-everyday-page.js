#!/usr/bin/env node
/**
 * PuniCodex — The Gods You Speak Every Day: page generator.
 *
 * Bakes everyday/index.html — a fully static, crawlable register of ordinary
 * English words that descend from mythological names, each card carrying the
 * word, its modern gloss, the descent chain, the story, and a door into the
 * temple of the name behind it (restoration, pantheon, respelling, tier).
 *
 * Canonical inputs (never edit the output by hand):
 *   type/js/everyday-words.js  — the curated word registry
 *   type/js/lexicon.js         — entry names, pantheons, tiers
 *   type/js/pronunciation-rules.js — respellings
 *   type/js/pantheon-meta.js   — pantheon display labels
 *
 * Run: node scripts/generate-everyday-page.js  (part of npm run generate)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { EVERYDAY_WORDS } = require(path.join(ROOT, 'type', 'js', 'everyday-words.js'));
const { derivePronunciation } = require(path.join(ROOT, 'type', 'js', 'pronunciation-rules.js'));
const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));

const OUT = path.join(ROOT, 'everyday', 'index.html');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const byId = new Map(LEXICON.map((e) => [e.id, e]));

function pantheonLabel(p) {
  const meta = PANTHEON_META[p];
  return meta ? meta.label : p;
}

function tierBadge(t) {
  if (t === 'dual') return 'DUAL-TIER';
  if (t === '1') return 'TIER 1';
  if (t === '2') return 'TIER 2';
  return '';
}

const BANDS = [
  {
    id: 'greek',
    title: 'The Greek Everyman',
    note: 'Most of the mythology hiding in English is Greek. It arrived through science, medicine, Rome, and the church — and never left.',
    match: (card, entry) => !card.kind && entry.pantheon.startsWith('greek'),
  },
  {
    id: 'norse',
    title: 'The Norse Week',
    note: 'Four days of every English week are named for Norse gods. You have been keeping the old calendar your whole life.',
    match: (card, entry) => !card.kind && entry.pantheon === 'norse',
  },
  {
    id: 'wider',
    title: 'The Wider World',
    note: 'Sanskrit descents, an Egyptian temple address — the vocabulary travels further than Greece and Scandinavia.',
    match: (card, entry) => !card.kind && !entry.pantheon.startsWith('greek') && entry.pantheon !== 'norse',
  },
  {
    id: 'false-friends',
    title: 'False Friends',
    note: 'Famous etymologies that are simply wrong. Correcting them is not pedantry — it is the whole point of having a canon.',
    match: (card) => card.kind === 'false-friend',
  },
];

function cardHtml(card) {
  const entry = byId.get(card.entry);
  if (!entry) throw new Error(`everyday-words: unknown lexicon entry "${card.entry}" (word "${card.word}")`);
  const pron = derivePronunciation(entry) || {};
  const temple = `/${entry.id}/`;
  const ff = card.kind === 'false-friend';
  return `
        <article class="ed-card${ff ? ' ed-card--false' : ''}" id="${esc(card.word.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}" data-word="${esc(card.word.toLowerCase())}">
          ${ff ? '<div class="ed-false-tag">FAMOUS — BUT FALSE</div>' : ''}
          <div class="ed-word-row">
            <h3 class="ed-word">${esc(card.word)}</h3>
            <span class="ed-gloss">${esc(card.gloss)}</span>
          </div>
          ${card.origin ? `<p class="ed-origin">${esc(card.origin)}</p>` : ''}
          <p class="ed-story">${esc(card.story)}</p>
          ${card.note ? `<p class="ed-note">${esc(card.note)}</p>` : ''}
          <a class="ed-deity" href="${temple}">
            <span class="ed-deity-name">${esc(entry.unicode)}</span>
            <span class="ed-deity-meta">${esc(pantheonLabel(entry.pantheon))}${tierBadge(entry.tier) ? ` · ${tierBadge(entry.tier)}` : ''}</span>
            ${pron.respelling ? `<span class="ed-deity-say">Say it: <b>${esc(pron.respelling)}</b></span>` : ''}
            <span class="ed-deity-cta">Enter the temple →</span>
          </a>
        </article>`;
}

function bandHtml(band, cards) {
  const items = cards.filter((c) => band.match(c, byId.get(c.entry)));
  if (!items.length) return '';
  return `
      <section class="ed-band" id="band-${band.id}">
        <h2>${esc(band.title)}</h2>
        <p class="ed-band-note">${esc(band.note)}</p>
        <div class="ed-grid">
          ${items.map(cardHtml).join('\n')}
        </div>
      </section>`;
}

function main() {
  const total = EVERYDAY_WORDS.length;
  const falseFriends = EVERYDAY_WORDS.filter((c) => c.kind === 'false-friend').length;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: total,
    itemListElement: EVERYDAY_WORDS.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.word,
      url: `https://punicodex.com/everyday/#${c.word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    })),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="google" content="notranslate">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Gods You Speak Every Day | PUNICODEX</title>
    <meta name="description" content="Panic, echo, chaos, cereal, Thursday. ${total} ordinary English words that descend from gods, titans, and nymphs — each with its story, its citation, and its temple.">
    <meta name="theme-color" content="#050505">
    <meta name="color-scheme" content="dark">
    <link rel="canonical" href="https://punicodex.com/everyday/">
    <meta property="og:title" content="The Gods You Speak Every Day | PUNICODEX">
    <meta property="og:description" content="${total} ordinary words that descend from gods — with the stories and citations behind each.">
    <meta property="og:url" content="https://punicodex.com/everyday/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">
    <meta property="og:image" content="https://punicodex.com/assets/og/everyday.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="The Gods You Speak Every Day | PUNICODEX">
    <meta name="twitter:description" content="${total} ordinary words that descend from gods — with the stories and citations behind each.">
    <meta name="twitter:image" content="https://punicodex.com/assets/og/everyday.jpg">
    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/main.css?v=perf23">
    <link rel="stylesheet" href="/css/nav-more.css?v=4">
    <link rel="stylesheet" href="/css/mobile-menu.css?v=1">
    <link rel="stylesheet" href="/css/footer.css?v=2">
    <script type="application/ld+json">${JSON.stringify(itemList)}</script>
    <style>
      .ed-hero { padding: 9rem 1.5rem 3.5rem; text-align: center; background: radial-gradient(ellipse 70% 55% at 50% 0%, rgba(212,175,55,0.12), transparent 65%); }
      .ed-kicker { font-size: 0.72rem; letter-spacing: 0.35em; color: #8a7a52; text-transform: uppercase; margin-bottom: 1.2rem; }
      .ed-hero h1 { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(2.2rem, 5.5vw, 3.6rem); color: #e8c860; letter-spacing: 0.04em; margin: 0 0 1.2rem; }
      .ed-hero p { max-width: 46rem; margin: 0 auto; color: #cbb98e; line-height: 1.8; font-size: 1.05rem; }
      .ed-hero strong { color: #e8c860; font-weight: 600; }
      .ed-search { max-width: 26rem; margin: 2.2rem auto 0; }
      .ed-search input { width: 100%; padding: 0.85rem 1.2rem; background: #14110c; border: 1px solid #3a2f1a; color: #e8e0cc; font-family: Georgia, serif; font-size: 1rem; border-radius: 4px; outline: none; }
      .ed-search input:focus { border-color: #8a6d2f; }
      .ed-wrap { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 5rem; }
      .ed-band { margin-top: 4rem; }
      .ed-band h2 { font-family: Georgia, serif; color: #e8c860; font-size: 1.7rem; letter-spacing: 0.06em; margin: 0 0 0.5rem; }
      .ed-band-note { color: #8a7a52; margin: 0 0 2rem; max-width: 44rem; line-height: 1.7; }
      .ed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem; }
      .ed-card { position: relative; background: #14110c; border: 1px solid #3a2f1a; border-radius: 8px; padding: 1.6rem 1.6rem 1.3rem; display: flex; flex-direction: column; scroll-margin-top: 6rem; }
      .ed-card--false { border-color: #5a2a22; background: #171010; }
      .ed-false-tag { position: absolute; top: -0.65rem; left: 1.2rem; background: #7a2e22; color: #f0d0c8; font-size: 0.62rem; letter-spacing: 0.22em; padding: 0.25rem 0.7rem; border-radius: 3px; }
      .ed-word-row { display: flex; align-items: baseline; gap: 0.8rem; flex-wrap: wrap; }
      .ed-word { font-family: Georgia, serif; font-size: 1.9rem; color: #f0d878; margin: 0; letter-spacing: 0.02em; }
      .ed-gloss { color: #8a7a52; font-size: 0.9rem; font-style: italic; }
      .ed-origin { color: #6b6046; font-size: 0.82rem; letter-spacing: 0.02em; margin: 0.6rem 0 0; }
      .ed-story { color: #d8cfb8; line-height: 1.75; margin: 0.9rem 0 0; flex: 1; }
      .ed-note { color: #a99b78; line-height: 1.65; font-size: 0.9rem; margin: 0.8rem 0 0; padding-left: 0.9rem; border-left: 2px solid #6b5a33; }
      .ed-card--false .ed-note { border-left-color: #7a2e22; }
      .ed-deity { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-top: 1.2rem; padding: 0.85rem 1rem; background: #0b0a08; border: 1px solid #3a2f1a; border-radius: 6px; text-decoration: none; transition: border-color 0.2s; }
      .ed-deity:hover { border-color: #8a6d2f; }
      .ed-deity-name { font-family: Georgia, serif; font-size: 1.25rem; color: #e8c860; }
      .ed-deity-meta { color: #8a7a52; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; }
      .ed-deity-say { color: #a99b78; font-size: 0.85rem; }
      .ed-deity-say b { color: #d8cfb8; font-weight: 600; }
      .ed-deity-cta { margin-left: auto; color: #c9b584; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
      .ed-empty { display: none; text-align: center; color: #8a7a52; padding: 3rem 0; font-style: italic; }
      @media (max-width: 640px) {
        .ed-hero { padding-top: 7rem; }
        .ed-deity-cta { margin-left: 0; width: 100%; }
      }
    </style>
</head>
<body>
    <header class="ed-hero">
      <div class="ed-kicker">Everyday Etymology</div>
      <h1>The Gods You Speak Every Day</h1>
      <p>You invoke mythology constantly — at breakfast (<strong>cereal</strong>), in a crowd (<strong>panic</strong>), by Thursday (<strong>Þórr's day</strong>). This is the register: <strong>${total} ordinary words</strong> that descend from gods, titans, nymphs and fates — each with its story, its citation, and its temple. ${falseFriends} of them are here only to be corrected.</p>
      <div class="ed-search">
        <input id="ed-filter" type="search" placeholder="Filter the register — try 'panic' or 'thursday'" aria-label="Filter words">
      </div>
    </header>
    <main class="ed-wrap">
      ${BANDS.map((b) => bandHtml(b, EVERYDAY_WORDS)).join('\n')}
      <div class="ed-empty" id="ed-empty">Nothing in the register by that name — the gods keep more words than this page holds.</div>
    </main>
    <script>
      (function () {
        var input = document.getElementById('ed-filter');
        var empty = document.getElementById('ed-empty');
        var cards = Array.prototype.slice.call(document.querySelectorAll('.ed-card'));
        input.addEventListener('input', function () {
          var q = input.value.trim().toLowerCase();
          var shown = 0;
          cards.forEach(function (c) {
            var hit = !q || c.getAttribute('data-word').indexOf(q) !== -1;
            c.style.display = hit ? '' : 'none';
            if (hit) shown++;
          });
          empty.style.display = shown ? 'none' : 'block';
        });
      })();
    </script>
</body>
</html>
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log(`Everyday register: ${total} words (${falseFriends} false friends) → everyday/index.html`);
}

main();

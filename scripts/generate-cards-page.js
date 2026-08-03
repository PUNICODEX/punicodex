#!/usr/bin/env node
/**
 * PuniCodex — cards gallery SSR generator
 *
 * The cards gallery previously rendered entirely client-side: crawlers met
 * "Restoring the set…" and nothing else. This generator bakes the full First
 * Restoration set as static TCG frames into cards/index.html (between the
 * CARDS-GRID markers), plus the compact payload the interactive layer uses —
 * so the gallery is 1,698 crawlable cards AND a live app on top.
 *
 * Usage:
 *   node scripts/generate-cards-page.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const SET = require(path.join(ROOT, 'game', 'cards.json'));
const PAGE_PATH = path.join(ROOT, 'cards', 'index.html');

const GRID_START = '<!-- CARDS-GRID-START -->';
const GRID_END = '<!-- CARDS-GRID-END -->';

const RARITY = {
  legendary: { gem: '◆', cls: 'legendary', label: 'Legendary' },
  mythic: { gem: '✦', cls: 'mythic', label: 'Secret Rare' },
  rare: { gem: '◇', cls: 'rare', label: 'Rare' },
  uncommon: { gem: '◈', cls: 'uncommon', label: 'Uncommon' },
  common: { gem: '·', cls: 'common', label: 'Common' },
};
const RARITY_ORDER = ['legendary', 'mythic', 'rare', 'uncommon', 'common'];
const SET_CODE = 'FR1';

const PANTHEON_FRAME_COLORS = {
  greek: ['#D4AF37', '#4169E1'],
  'greek-location': ['#D4AF37', '#4169E1'],
  norse: ['#C0C0C0', '#5C9BD1'],
  egyptian: ['#D4AF37', '#1E3A5F'],
  sanskrit: ['#FF9933', '#8B0000'],
  celtic: ['#228B22', '#B8D4E3'],
  mesopotamian: ['#CD7F32', '#C2B280'],
  polynesian: ['#1E90FF', '#FF7F50'],
  japanese: ['#DC143C', '#FFB6C1'],
  chinese: ['#D4AF37', '#8B0000'],
  yoruba: ['#FF6B35', '#2E86AB'],
  nahuatl: ['#7A9E7E', '#D4AF37'],
  zoroastrian: ['#D4AF37', '#3B3B98'],
  buddhist: ['#D4AF37', '#6B4FA0'],
  abrahamic: ['#B8B8D0', '#4A4E8C'],
  taoist: ['#D4AF37', '#2F4F4F'],
  roman: ['#D4AF37', '#7A1F1F'],
  canaanite: ['#8FB5A5', '#4A5568'],
  phoenician: ['#B08050', '#3D5A80'],
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function colors(card) {
  const c = (card.art && card.art.colors) || {};
  const fallback = PANTHEON_FRAME_COLORS[card.pantheon] || ['#1a1a24', '#2a2a38'];
  return {
    primary: c.primary || fallback[0],
    secondary: c.secondary || fallback[1],
  };
}

function frameHtml(card, idx, total) {
  const r = RARITY[card.rarity] || RARITY.common;
  const col = colors(card);
  const edition = card.edition || 'archive';
  const foil = card.variant === 'original-script' || edition === 'secret';
  const fullArt = edition === 'full-art' || edition === 'secret';
  const art = fullArt && card.art && card.art.fullArt ? card.art.fullArt : (card.art && card.art.mascot) || '';
  const ability = card.ability || {};
  return `<article class="mcard${foil ? ' mcard--foil' : ''}${edition === 'holo' ? ' mcard--pattern' : ''}${fullArt ? ' mcard--fullart' : ''}" data-card-id="${esc(card.id)}" tabindex="0" role="button" aria-label="${esc(card.name)} card — open details" style="--mc1:${esc(col.primary)};--mc2:${esc(col.secondary)}">
          <div class="mcard-inner">
            <div class="mcard-banner"><span class="mcard-name">${esc(card.name)}</span><span class="mcard-sigil" title="${esc(card.pantheon)}">${esc(card.categoryIcon || '✦')}</span></div>
            <div class="mcard-art">
              <span class="mcard-tier">${esc(card.tierLabel || '')}</span>
              <span class="mcard-cat" title="${esc(card.categoryLabel || '')}">${esc(card.categoryIcon || '')}</span>
              ${
                art
                  ? `<img src="${esc(art)}" alt="${esc(card.name)}${fullArt ? ' full-art' : ' mascot'}" loading="lazy"${fullArt ? ' class="mcard-art--full"' : ''}>`
                  : `<span class="mcard-sigil-fallback" aria-hidden="true" style="font-size:3rem;color:var(--gold,#D4AF37);text-shadow:0 0 22px rgba(212,175,55,.35)">${esc(card.categoryIcon || '✦')}</span>`
              }
            </div>
            <div class="mcard-ability">
              <div class="mcard-ability-name">${esc(ability.name || card.domain || '')}</div>
              <div class="mcard-ability-text">${esc(ability.description || card.flavor || '')}</div>
            </div>
            <div class="mcard-stats">
              <div class="mcard-stat"><b>${card.cost ?? '—'}</b><span>Ink</span></div>
              <div class="mcard-stat"><b>${card.power ?? '—'}</b><span>Power</span></div>
              <div class="mcard-stat"><b>${card.health ?? '—'}</b><span>Health</span></div>
              <div class="mcard-stat"><b>${card.speed ?? '—'}</b><span>Speed</span></div>
            </div>
            <div class="mcard-foot"><span class="mcard-set">${SET_CODE} · ${idx + 1}/${total}</span><span class="mgem mgem--${r.cls}" title="${r.label}">${r.gem}</span></div>
          </div>
        </article>`;
}

function main() {
  const cards = SET.cards.slice().sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' });
  });
  const total = cards.length;
  const pantheons = new Set(cards.map((c) => c.pantheon));
  const fullArts = cards.filter((c) => c.edition === 'full-art').length;
  const secrets = cards.filter((c) => c.edition === 'secret').length;

  const frames = cards.map((c, i) => frameHtml(c, i, total)).join('\n        ');

  // Compact payload for the interactive layer (modal, search, filters).
  const payload = cards.map((c) => ({
    id: c.id,
    entryId: c.entryId,
    name: c.name,
    ascii: c.ascii,
    original: c.original,
    pantheon: c.pantheon,
    categoryIcon: c.categoryIcon,
    categoryLabel: c.categoryLabel,
    tierLabel: c.tierLabel,
    domain: c.domain,
    rarity: c.rarity,
    edition: c.edition || 'archive',
    variant: c.variant,
    cost: c.cost,
    power: c.power,
    health: c.health,
    speed: c.speed,
    ability: c.ability || null,
    flavor: c.flavor || '',
    art: c.art || null,
  }));
  const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  let html = fs.readFileSync(PAGE_PATH, 'utf8');
  const start = html.indexOf(GRID_START);
  const end = html.indexOf(GRID_END);
  if (start === -1 || end === -1 || end < start) {
    // First run: replace the loading shell with the marked block.
    const loading = html.indexOf('<div class="cards-loading">Restoring the set…</div>');
    if (loading === -1) throw new Error('cards/index.html: no grid mount point found');
    const block = `${GRID_START}\n        ${frames}\n        ${GRID_END}`;
    html = html.slice(0, loading) + block + html.slice(loading + '<div class="cards-loading">Restoring the set…</div>'.length);
  } else {
    html = html.slice(0, start) + `${GRID_START}\n        ${frames}\n        ${GRID_END}` + html.slice(end + GRID_END.length);
  }

  // Payload + static stats, replacing any prior baked block.
  // The old regex (`[^;]*`) stopped at the first `;` INSIDE the payload
  // (flavor prose contains semicolons), leaving the old payload's tail
  // appended after the new one — every generate added another full stale
  // copy of the set (an 18MB invalid-JS script after 13 runs). Match the
  // whole <script> element instead, and use a replacement function so `$`
  // sequences in the JSON are never treated as replace-patterns.
  html = html.replace(/<script>window\.__CARDS_PAYLOAD[\s\S]*?<\/script>/, () => {
    return `<script>window.__CARDS_PAYLOAD = ${payloadJson};</script>`;
  });
  if (!html.includes('window.__CARDS_PAYLOAD')) {
    html = html.replace(
      '</main>',
      () => `</main>\n    <script>window.__CARDS_PAYLOAD = ${payloadJson};</script>`
    );
  }
  html = html.replace(/(<span class="cards-stat-value" id="stat-total">)[^<]*/, `$1${total.toLocaleString('en-US')}`);
  html = html.replace(/(<span class="cards-stat-value" id="stat-fullart">)[^<]*/, `$1${fullArts}`);
  html = html.replace(/(<span class="cards-stat-value" id="stat-secret">)[^<]*/, `$1${secrets}`);
  html = html.replace(/(<span class="cards-stat-value" id="stat-pantheons">)[^<]*/, `$1${pantheons.size}`);

  writeFileWithRetry(PAGE_PATH, html);
  console.log(`Cards gallery: ${total} static frames baked (${fullArts} full-arts, ${secrets} secret rares, ${pantheons.size} pantheons)`);
}

main();

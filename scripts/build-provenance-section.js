/**
 * PuniCodex — Rich Original Script Provenance Section Builder
 *
 * Builds the "Original Script & Provenance" HTML panel for flagship lore pages.
 * Consumes the enriched schema from type/js/original-scripts.js and produces
 * a visible, beautifully structured section with sign breakdowns, transmission
 * chain, etymology, variants, attestations, sources, and DNS notes.
 */

'use strict';

const punycode = require('punycode');
const {
  getRichProvenance,
  getOriginalScript,
  getOriginalScriptLabel,
  SCRIPTLESS_PANTHEONS,
} = require('../type/js/original-scripts.js');

const FUNCTION_LABELS = {
  logogram: 'Logogram',
  phonogram: 'Phonogram',
  determinative: 'Determinative',
  ideogram: 'Ideogram',
  syllable: 'Syllable',
  letter: 'Letter',
  radical: 'Radical / Component',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safe(value) {
  return value || '';
}

function computePunycode(entry) {
  if (entry.domainPunycode) return entry.domainPunycode.toLowerCase();
  try {
    return punycode.toASCII((entry.unicode || entry.ascii || '').toLowerCase() + '.com');
  } catch {
    return '';
  }
}

function renderSignCard(sign) {
  const name = safe(sign.name);
  const value = safe(sign.value);
  const func = safe(sign.function);
  const note = safe(sign.note);
  const funcLabel = FUNCTION_LABELS[func] || func || 'Sign';
  return `
    <div class="sign-card" role="listitem">
      <div class="sign-glyph">${escapeHtml(sign.sign || '')}</div>
      ${name ? `<div class="sign-name">${escapeHtml(name)}</div>` : ''}
      ${value ? `<div class="sign-value">${escapeHtml(value)}</div>` : ''}
      <div class="sign-function"><span class="function-badge">${escapeHtml(funcLabel)}</span></div>
      ${note ? `<div class="sign-note">${escapeHtml(note)}</div>` : ''}
    </div>`;
}

function renderListItems(items, renderItem) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul class="provenance-list">${items.map(renderItem).join('')}</ul>`;
}

function renderVariants(variants) {
  return renderListItems(variants, (v) => `
    <li class="variant-item">
      <span class="variant-form">${escapeHtml(v.form || '')}</span>
      <span class="variant-context">${escapeHtml(v.context || '')}</span>
    </li>`);
}

function renderAttestations(attestations) {
  return renderListItems(attestations, (a) => `
    <li class="attestation-item">
      <div class="attestation-text">${escapeHtml(a.text || '')}</div>
      <div class="attestation-meta">
        ${a.date ? `<span class="attestation-date">${escapeHtml(a.date)}</span>` : ''}
        ${a.location ? `<span class="attestation-location">${escapeHtml(a.location)}</span>` : ''}
        ${a.reference ? `<span class="attestation-ref">${escapeHtml(a.reference)}</span>` : ''}
      </div>
    </li>`);
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  return `
    <div class="source-list">
      ${sources.map((s) => {
        const title = escapeHtml(s.title || '');
        const meta = [s.author, s.year, s.pages].filter(Boolean).join(', ');
        const url = s.url ? ` <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="source-link">↗</a>` : '';
        return `
          <div class="source-item">
            <div class="source-title">${title}${url}</div>
            ${meta ? `<div class="source-meta">${escapeHtml(meta)}</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderUncertainties(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `
    <ul class="uncertainty-list">
      ${items.map((u) => `<li><span class="uncertainty-marker">!</span>${escapeHtml(u)}</li>`).join('')}
    </ul>`;
}

function renderTransmissionChain(entry, prov) {
  const original = escapeHtml(prov.scriptSpecimen || '');
  const transliteration = escapeHtml(prov.transliteration || '');
  const unicode = escapeHtml(entry.unicode || '');
  const ascii = escapeHtml(entry.ascii || '');
  const puny = escapeHtml(computePunycode(entry));

  const nodes = [
    { label: 'Original Script', value: original, note: 'Indigenous writing' },
    { label: 'Transliteration', value: transliteration, note: 'Scholarly reading' },
    { label: 'Unicode Restoration', value: unicode, note: 'Registrable form' },
    { label: 'Punycode', value: puny, note: 'DNS encoding' },
    { label: 'ASCII Fallback', value: ascii, note: 'Flattened spelling' },
  ];

  return `
    <div class="transmission-chain" role="list" aria-label="Script transmission chain">
      ${nodes.map((n) => `
        <div class="transmission-node" role="listitem">
          <div class="transmission-label">${escapeHtml(n.label)}</div>
          <div class="transmission-value">${n.value || '—'}</div>
          <div class="transmission-note">${escapeHtml(n.note)}</div>
        </div>
      `).join('<div class="transmission-arrow" aria-hidden="true">→</div>')}
    </div>`;
}

function renderScriptMeta(prov) {
  const parts = [
    prov.scriptFamily,
    prov.writingDirection,
    prov.timePeriod,
    prov.region,
  ].filter(Boolean);
  if (parts.length === 0) return '';
  return `<div class="script-meta">${parts.map((p) => `<span>${escapeHtml(p)}</span>`).join(' · ')}</div>`;
}

function renderReadingColumn(prov) {
  const steps = (prov.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  return `
    <div class="provenance-reading">
      ${prov.etymology ? `<div class="provenance-block"><h4>Etymology</h4><p>${escapeHtml(prov.etymology)}</p></div>` : ''}
      ${prov.semantics ? `<div class="provenance-block"><h4>Meaning</h4><p>${escapeHtml(prov.semantics)}</p></div>` : ''}
      ${steps ? `<div class="provenance-block"><h4>From original to transliteration</h4><ol class="provenance-steps">${steps}</ol></div>` : ''}
    </div>`;
}

function renderScholarlyColumn(prov) {
  return `
    <div class="provenance-scholarly">
      ${renderVariants(prov.variants)}
      ${renderAttestations(prov.attestations)}
      ${renderSources(prov.sources)}
      ${prov.dnsNotes ? `<div class="provenance-block dns-block"><h4>DNS / IDN note</h4><p>${escapeHtml(prov.dnsNotes)}</p></div>` : ''}
      ${renderUncertainties(prov.uncertainties)}
    </div>`;
}

function buildPlaceholderSection(entry, label) {
  const specimen = escapeHtml(getOriginalScript(entry) || entry.unicode || '');
  const note = SCRIPTLESS_PANTHEONS.has(entry.pantheon)
    ? `No indigenous writing system is securely attested for individual ${entry.pantheon} names. The form shown is a modern scholarly transliteration.`
    : `A bespoke provenance study for ${escapeHtml(entry.unicode || '')} is being prepared by the PUNICODEX scholarly team.`;

  return `
<!-- Original Script Provenance -->
<section class="section section-provenance section-provenance-placeholder" id="provenance">
  <div class="section-bg-glow"></div>
  <div class="container">
    <div class="section-header reveal-up">
      <span class="section-number">02</span>
      <h2 class="section-title">Original Script & Provenance</h2>
      <p class="section-subtitle">How ${escapeHtml(entry.unicode || '')} is preserved in writing</p>
    </div>
    <div class="provenance-panel reveal-up">
      <div class="script-altar script-altar-placeholder">
        <div class="script-specimen">${specimen}</div>
        <div class="script-label">${escapeHtml(label)}</div>
        <p class="script-placeholder-note">${note}</p>
        <a class="btn-secondary" href="/scholars/login/">Contribute scholarly provenance →</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildRichProvenanceSection(entry) {
  const prov = getRichProvenance(entry);
  const label = getOriginalScriptLabel(entry);

  if (!prov) {
    return buildPlaceholderSection(entry, label);
  }

  const specimen = escapeHtml(prov.scriptSpecimen || '');
  const scriptName = escapeHtml(prov.scriptName || label);
  const transliteration = escapeHtml(prov.transliteration || '');
  const normalized = escapeHtml(prov.normalizedReading || '');
  const phonetic = escapeHtml(prov.phoneticReconstruction || '');
  const signGrid = (prov.signs || []).length
    ? `<div class="sign-grid" role="list">${prov.signs.map(renderSignCard).join('')}</div>`
    : '';
  const transmission = renderTransmissionChain(entry, prov);
  const readingCol = renderReadingColumn(prov);
  const scholarlyCol = renderScholarlyColumn(prov);

  return `
<!-- Original Script Provenance -->
<section class="section section-provenance" id="provenance">
  <div class="section-bg-glow"></div>
  <div class="container">
    <div class="section-header reveal-up">
      <span class="section-number">02</span>
      <h2 class="section-title">Original Script & Provenance</h2>
      <p class="section-subtitle">How ${escapeHtml(entry.unicode || '')} travels from ancient script to the modern URL</p>
    </div>

    <div class="provenance-panel reveal-up">
      <div class="script-altar">
        <div class="script-specimen" lang="und" translate="no">${specimen}</div>
        <div class="script-name">${scriptName}</div>
        ${transliteration ? `<div class="script-transliteration">${transliteration}</div>` : ''}
        ${normalized ? `<div class="script-reading"><strong>Reading:</strong> ${normalized}</div>` : ''}
        ${phonetic ? `<div class="script-phonetic"><strong>Reconstruction:</strong> ${phonetic}</div>` : ''}
        ${renderScriptMeta(prov)}
      </div>

      ${signGrid}
      ${transmission}

      <div class="provenance-columns">
        ${readingCol}
        ${scholarlyCol}
      </div>
    </div>
  </div>
</section>`;
}

module.exports = { buildRichProvenanceSection, escapeHtml };

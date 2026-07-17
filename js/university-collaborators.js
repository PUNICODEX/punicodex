/**
 * PÚNYCODEX — Academic Collaborators Strip
 *
 * Renders the universal pre-footer university sponsors section.
 * Edit the UNIVERSITY_COLLABORATORS array below to add real sponsors.
 * When no sponsors are confirmed, a single quiet invitation row is shown.
 */

(function () {
  'use strict';

  const SPONSORSHIP_URL = '/university-sponsorship/';

  const TIER_LABELS = {
    founding: 'Founding Partner',
    sponsoring: 'Sponsoring Institution',
    contributing: 'Contributing Institution',
  };

  // Add confirmed university collaborators here.
  const UNIVERSITY_COLLABORATORS = [
    // Example:
    // {
    //   id: 'university-of-sydney',
    //   name: 'University of Sydney',
    //   logo: '/assets/sponsors/usyd.svg',
    //   url: 'https://sydney.edu.au',
    //   tagline: 'Classics & Ancient History',
    //   tier: 'founding',
    // },
  ];

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function monogram(name) {
    const words = String(name)
      .split(/\s+/)
      .filter((w) => w && /[A-Za-z]/.test(w.charAt(0)))
      .filter((w) => !/^(of|the|and|for|in|de)$/i.test(w));
    const initials = (words.length ? words : [String(name)])
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
    return initials || 'Ψ';
  }

  function tierLabel(tier) {
    if (!tier) return '';
    return TIER_LABELS[tier] || String(tier);
  }

  function buildCard(sponsor) {
    const logoHtml = sponsor.logo
      ? `<img src="${escapeHtml(sponsor.logo)}" alt="" class="uc-card-logo" loading="lazy">`
      : `<span class="uc-card-monogram" aria-hidden="true">${escapeHtml(monogram(sponsor.name))}</span>`;

    const tier = tierLabel(sponsor.tier);
    const tierHtml = tier ? `<p class="uc-card-tier">${escapeHtml(tier)}</p>` : '';
    const taglineHtml = sponsor.tagline
      ? `<p class="uc-card-tagline">${escapeHtml(sponsor.tagline)}</p>`
      : '';

    const inner = `
        ${logoHtml}
        <p class="uc-card-name">${escapeHtml(sponsor.name)}</p>
        ${taglineHtml}
        ${tierHtml}
    `;

    if (sponsor.url) {
      return `<a href="${escapeHtml(sponsor.url)}" target="_blank" rel="noopener" class="uc-card" aria-label="${escapeHtml(sponsor.name)} — academic collaborator">${inner}</a>`;
    }
    return `<div class="uc-card">${inner}</div>`;
  }

  function buildInvitation() {
    return `
      <div class="uc-invite">
        <p class="uc-invite-text">
          We are inviting a small number of universities to become founding academic
          collaborators — mentoring the student scholars and creators who restore
          these names.
        </p>
        <a href="${SPONSORSHIP_URL}" class="uc-invite-link">
          Learn about university sponsorship <span aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }

  function renderStrip(container) {
    const sponsors = UNIVERSITY_COLLABORATORS.filter((s) => s && s.id && s.name);

    const bodyHtml = sponsors.length
      ? `<ul class="uc-grid" role="list">
          ${sponsors.map((s) => `<li class="uc-grid-item">${buildCard(s)}</li>`).join('')}
        </ul>
        <p class="uc-footnote">
          <a href="${SPONSORSHIP_URL}">Become a collaborator <span aria-hidden="true">→</span></a>
        </p>`
      : buildInvitation();

    container.innerHTML = `
      <div class="uc-inner">
        <div class="uc-header">
          <span class="uc-eyebrow">Scholarly Partnership</span>
          <h2 class="uc-title">Academic Collaborators</h2>
          <p class="uc-subtitle">
            Partner institutions whose students contribute to the
            <a href="/scholars/">Scholarly Edition</a> and the
            <a href="/creatives/">Creative</a> marketplace.
          </p>
        </div>
        ${bodyHtml}
      </div>
    `;
  }

  function init() {
    const container = document.getElementById('university-collaborators-strip');
    if (!container) return;
    renderStrip(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for dynamic updates and external configuration.
  window.PUNYCODEX = window.PUNYCODEX || {};
  window.PUNYCODEX.UniversityCollaborators = {
    data: UNIVERSITY_COLLABORATORS,
    render: init,
    addSponsor(sponsor) {
      if (!sponsor || !sponsor.id || !sponsor.name) return;
      UNIVERSITY_COLLABORATORS.push(sponsor);
      init();
    },
  };
})();

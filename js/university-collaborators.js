/**
 * PÚNYCODEX — Academic Collaborators Strip
 *
 * Renders the universal pre-footer university sponsors section.
 * Edit the UNIVERSITY_COLLABORATORS array below to add real sponsors.
 * Empty slots are auto-generated up to MIN_EMPTY_SLOTS.
 */

(function () {
  'use strict';

  const MIN_EMPTY_SLOTS = 4;
  const SPONSORSHIP_URL = '/university-sponsorship/';

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

  function buildFeaturedCard(sponsor, index) {
    const isEmpty = !sponsor;
    if (isEmpty) {
      return `
        <a href="${SPONSORSHIP_URL}" class="uc-card uc-card-empty" aria-label="Reserve a university collaborator slot">
          <div class="uc-empty-icon">+</div>
          <p class="uc-card-name">Reserve Your Place</p>
          <p class="uc-card-tagline">Join partner institutions empowering student scholars and creators.</p>
        </a>
      `;
    }

    const logoHtml = sponsor.logo
      ? `<img src="${escapeHtml(sponsor.logo)}" alt="${escapeHtml(sponsor.name)} logo" class="uc-card-logo" loading="lazy">`
      : `<div class="uc-card-logo" style="display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--uc-gold)">Ψ</div>`;

    const wrapperStart = sponsor.url ? `<a href="${escapeHtml(sponsor.url)}" target="_blank" rel="noopener" class="uc-card">` : '<div class="uc-card">';
    const wrapperEnd = sponsor.url ? '</a>' : '</div>';

    return `
      ${wrapperStart}
        ${logoHtml}
        <p class="uc-card-name">${escapeHtml(sponsor.name)}</p>
        ${sponsor.tagline ? `<p class="uc-card-tagline">${escapeHtml(sponsor.tagline)}</p>` : ''}
      ${wrapperEnd}
    `;
  }

  function buildMarquee(sponsors) {
    if (!sponsors || sponsors.length === 0) return '';
    const items = sponsors
      .map((s) => {
        if (!s.logo) return '';
        const linkStart = s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">` : '<span>';
        const linkEnd = s.url ? '</a>' : '</span>';
        return `${linkStart}<img src="${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)}" class="uc-marquee-logo" loading="lazy">${linkEnd}`;
      })
      .filter(Boolean)
      .join('');

    if (!items) return '';

    // Duplicate for seamless loop.
    return `
      <div class="uc-marquee" aria-hidden="true">
        <div class="uc-marquee-track">${items}${items}</div>
      </div>
    `;
  }

  function renderStrip(container) {
    const realSponsors = UNIVERSITY_COLLABORATORS.filter((s) => s && s.id && s.name);
    const featuredSponsors = realSponsors.slice(0, 4);
    const marqueeSponsors = realSponsors.slice(4);
    const emptySlots = Math.max(MIN_EMPTY_SLOTS - featuredSponsors.length, 0);
    const gridItems = [...featuredSponsors, ...Array(emptySlots).fill(null)];

    const marqueeHtml = marqueeSponsors.length > 0 ? buildMarquee(marqueeSponsors) : '';

    container.innerHTML = `
      <canvas class="uc-canvas" aria-hidden="true"></canvas>
      <div class="uc-inner">
        <div class="uc-header">
          <span class="uc-eyebrow">Scholarly Partnership</span>
          <h2 class="uc-title">Academic <span class="accent">Collaborators</span></h2>
          <p class="uc-subtitle">
            Partner institutions empowering the next generation of Unicode restoration.
            Their students contribute to our <a href="/scholars/">Scholars</a> archive and
            <a href="/creatives/">Creative</a> marketplace, turning ancient names into modern craft.
          </p>
        </div>
        <div class="uc-grid">
          ${gridItems.map((s, i) => buildFeaturedCard(s, i)).join('')}
        </div>
        ${marqueeHtml}
        <div class="uc-cta">
          <a href="${SPONSORSHIP_URL}">Become a Collaborator <span aria-hidden="true">→</span></a>
        </div>
      </div>
    `;

    initCanvas(container.querySelector('.uc-canvas'));
  }

  function initCanvas(canvas) {
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height;
    let particles = [];
    let animationId;
    let isVisible = false;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
      particles = [];
      const count = Math.min(Math.floor(width * height / 18000), 40);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.5 + 0.5,
        });
      }
    }

    function draw() {
      if (!isVisible) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    }

    function onVisibility(entries) {
      isVisible = entries.some((e) => e.isIntersecting);
    }

    resize();
    draw();

    window.addEventListener('resize', resize, { passive: true });

    const observer = new IntersectionObserver(onVisibility, { threshold: 0.1 });
    observer.observe(canvas.parentElement);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && animationId) cancelAnimationFrame(animationId);
      else if (!document.hidden) draw();
    });
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

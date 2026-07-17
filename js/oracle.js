/**
 * PuniCodex — Oracle page interactions
 * Mobile menu, scroll reveals, animated counters, and interactive demo.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Mobile menu ─── */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.remove('active');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  function openMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.add('active');
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function toggleMobileMenu() {
    if (mobileMenu && mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', toggleMobileMenu);
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  /* ─── Nav scroll state ─── */
  const mainNav = document.getElementById('main-nav');
  if (mainNav) {
    let lastScrollY = window.scrollY;
    function updateNav() {
      const scrolled = window.scrollY > 20;
      mainNav.classList.toggle('scrolled', scrolled);
      lastScrollY = window.scrollY;
    }
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  /* ─── Scroll reveal ─── */
  if (!prefersReducedMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal-up, .reveal-fade, .reveal-scale').forEach((el) => {
      revealObserver.observe(el);
    });

    document.querySelectorAll('[data-stagger]').forEach((container) => {
      container.querySelectorAll('.reveal-up, .reveal-fade, .reveal-scale').forEach((child, index) => {
        child.style.setProperty('--stagger-index', String(index));
        revealObserver.observe(child);
      });
    });
  } else {
    document.querySelectorAll('.reveal-up, .reveal-fade, .reveal-scale').forEach((el) => {
      el.classList.add('revealed');
    });
  }

  /* ─── Animated counters ─── */
  function formatNumber(n, suffix, decimals) {
    let formatted = n.toFixed(decimals);
    if (suffix === 'k+') formatted += 'k+';
    else if (suffix) formatted += suffix;
    return formatted;
  }

  function animateCounter(el, target, suffix, duration, decimals) {
    if (prefersReducedMotion) {
      el.textContent = formatNumber(target, suffix, decimals);
      return;
    }
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = formatNumber(current, suffix, decimals);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const raw = el.dataset.count;
          const suffix = el.dataset.suffix || '';
          const duration = Number(el.dataset.duration) || 1800;
          const decimals = Number(el.dataset.decimals) || 0;
          const target = Number(raw);
          if (!Number.isNaN(target)) {
            animateCounter(el, target, suffix, duration, decimals);
          }
          counterObserver.unobserve(el);
        }
      }
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-count]').forEach((el) => counterObserver.observe(el));

  /* ─── Interactive demo ─── */
  const demoData = {
    apollon: {
      query: 'Restore the name "apollon"',
      tier: 'dual',
      tierLabel: 'Dual-Tier',
      unicode: 'Apóllōn / Apollōn',
      punycode: 'xn--aplln-5qae.com',
      script: 'Ἀπόλλων',
      scriptLabel: 'Ancient Greek',
      meaning: 'The shining one; destroyer. God of light, music, prophecy, archery, and plague.',
      extra: 'The Oracle notes both stress and length, yielding two historically defensible Unicode restorations.',
    },
    domain: {
      query: 'Check xn--zes-9na.com',
      tier: 'tier-2',
      tierLabel: 'Tier-2',
      unicode: 'Zeús',
      punycode: 'xn--zes-9na.com',
      script: 'Ζεύς',
      scriptLabel: 'Ancient Greek',
      meaning: 'Sky father; king of the Olympian gods.',
      extra: 'Status: canonical PuniCodex restoration. No mixed-script deception detected.',
    },
    pronounce: {
      query: 'How is Hádēs pronounced?',
      tier: 'tier-1',
      tierLabel: 'Tier-1',
      unicode: 'Hádēs',
      punycode: 'xn--hds-8na.com',
      script: 'Ἅιδης',
      scriptLabel: 'Ancient Greek',
      meaning: 'IPA: /há.dɛːs/ — the unseen one; ruler of the underworld.',
      extra: 'The acute stress falls on the first syllable; the long vowel ē distinguishes it from modern "Hades".',
    },
    script: {
      query: 'Original script of Ra',
      tier: 'tier-1',
      tierLabel: 'Tier-1',
      unicode: 'Rꜥ',
      punycode: 'xn--r-wjn.com',
      script: '𓇳',
      scriptLabel: 'Egyptian hieroglyph',
      meaning: 'The sun disk; creator and noon-day sun.',
      extra: 'Provenance: Erman-Grapow Wb, Gardiner sign list N5 (sun).',
    },
    compare: {
      query: 'Compare Chaos and the Big Bang',
      tier: 'tier-2',
      tierLabel: 'Tier-2',
      unicode: 'Kháos',
      punycode: 'xn--khs-9na.com',
      script: 'Χάος',
      scriptLabel: 'Ancient Greek',
      meaning: 'The yawning gap; the primordial state before order.',
      extra: 'Analogy: like cosmic inflation, Kháos is a pre-ordered field from which structure later crystallises — but the myth speaks in narrative, not physics.',
    },
    correspondences: {
      query: 'Correspondences of Aphrodítē',
      tier: 'tier-1',
      tierLabel: 'Tier-1',
      unicode: 'Aphrodítē',
      punycode: 'xn--aphrodtn-0qae.com',
      script: 'Ἀφροδίτη',
      scriptLabel: 'Ancient Greek',
      meaning: 'Born of sea-foam; goddess of love, beauty, and generative attraction.',
      extra: 'Planetary: Venus. Elemental: water / copper. Alchemical: venus glyphs. Scientific echo: hormonal signalling and sexual selection.',
    },
  };

  const demoContainer = document.getElementById('oracle-demo');
  if (demoContainer) {
    const queryButtons = demoContainer.querySelectorAll('.demo-query');
    const answerContainer = demoContainer.querySelector('.demo-answer-content');
    const placeholder = demoContainer.querySelector('.demo-answer-placeholder');

    function renderAnswer(key) {
      const data = demoData[key];
      if (!data) return;

      const tierClass =
        data.tier === 'dual' ? 'tier-dual' : data.tier === 'tier-1' ? 'tier-1' : 'tier-2';

      answerContainer.innerHTML = `
        <div class="answer-meta">
          <span class="answer-pill ${tierClass}">${data.tierLabel}</span>
          <span class="answer-pill safety">Citation-backed</span>
        </div>
        <div class="answer-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-5);">
          <div class="answer-block">
            <h4>Unicode Restoration</h4>
            <p class="mono">${data.unicode}</p>
          </div>
          <div class="answer-block">
            <h4>Punycode Domain</h4>
            <p class="mono">${data.punycode}</p>
          </div>
          <div class="answer-block">
            <h4>Original Script <span style="color:var(--text-dim);font-weight:400;">(${data.scriptLabel})</span></h4>
            <p class="answer-script">${data.script}</p>
          </div>
        </div>
        <div class="answer-block">
          <h4>Oracle Response</h4>
          <p>${data.meaning}</p>
        </div>
        <div class="answer-block">
          <h4>Scholarly Note</h4>
          <p>${data.extra}</p>
        </div>
      `;

      if (placeholder) placeholder.style.display = 'none';
      answerContainer.classList.add('active');
      answerContainer.style.animation = 'none';
      // Force reflow to restart animation
      void answerContainer.offsetWidth;
      answerContainer.style.animation = '';

      queryButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.query === key));
    }

    queryButtons.forEach((btn) => {
      btn.addEventListener('click', () => renderAnswer(btn.dataset.query));
    });

    // Open with the first query if user has not interacted yet, but keep placeholder visible
    // until interaction. The first button gets focus/hover affordance only.
  }

  /* ─── Smooth scroll for anchor links ─── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
})();

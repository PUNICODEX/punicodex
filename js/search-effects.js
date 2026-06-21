/**
 * PUNYCODEX — Codex Noir premium interactions.
 * Spotlight hover, ambient particles, typewriter placeholders, staggered reveals.
 * Performance-first: reduced particle counts, O(n) grid connections, throttled
 * spotlight, debounced mutation observer, reduced-motion support, and visibility
 * pausing.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const DEFAULT_PARTICLE_COUNT = isTouchDevice ? 24 : 44;

  /**
   * Initialize ambient particle canvas behind a target element.
   * Uses a spatial grid so connection checks are O(n) instead of O(n²).
   */
  function initParticles(target, options = {}) {
    if (prefersReducedMotion) return { stop() {} };

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return { stop() {} };

    const canvas = document.createElement('canvas');
    canvas.className = 'cn-particles';
    canvas.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.55';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = options.count || DEFAULT_PARTICLE_COUNT;
    const connectDistance = options.connectDistance || 90;
    const speed = options.speed || 0.25;
    const maxConnections = options.maxConnections || 3;

    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: Math.random() * 1.2 + 0.5,
        alpha: Math.random() * 0.4 + 0.2,
      });
    }

    let running = true;
    let rafId = null;
    let visible = true;
    let frameSkip = isTouchDevice ? 2 : 1;
    let frameCount = 0;

    const gridSize = connectDistance;
    function getGridKey(x, y) {
      return `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
    }

    function draw() {
      if (!running) return;
      rafId = requestAnimationFrame(draw);
      if (!visible) return;

      frameCount++;
      if (frameCount % frameSkip !== 0) return;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      }

      // Spatial-grid connection pass (O(n) average)
      const grid = new Map();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const key = getGridKey(p.x, p.y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.07)';
      ctx.lineWidth = 0.5;
      const d2 = connectDistance * connectDistance;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const gx = Math.floor(p.x / gridSize);
        const gy = Math.floor(p.y / gridSize);
        let connections = 0;

        for (let dx = -1; dx <= 1 && connections < maxConnections; dx++) {
          for (let dy = -1; dy <= 1 && connections < maxConnections; dy++) {
            const key = `${gx + dx},${gy + dy}`;
            const cell = grid.get(key);
            if (!cell) continue;

            for (const j of cell) {
              if (j <= i || connections >= maxConnections) continue;
              const q = particles[j];
              const dxp = p.x - q.x;
              const dyp = p.y - q.y;
              const dist2 = dxp * dxp + dyp * dyp;
              if (dist2 < d2) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
                connections++;
              }
            }
          }
        }
      }
    }

    draw();

    function resize() {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    return {
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        observer.disconnect();
      },
    };
  }

  /**
   * Add mouse-following spotlight glow to cards. Uses rAF throttling and a single
   * document-level mousemove listener for better performance.
   */
  function initSpotlight(selector = '.cn-card') {
    if (prefersReducedMotion || isTouchDevice) return;

    const cards = Array.from(document.querySelectorAll(selector));
    cards.forEach((card) => {
      if (!card.classList.contains('cn-spotlight')) {
        card.classList.add('cn-spotlight');
      }
      if (!card.dataset.cnSpotlight) {
        card.dataset.cnSpotlight = '1';
      }
    });

    if (initSpotlight._active) return;
    initSpotlight._active = true;

    let targetCard = null;
    let pendingX = 0;
    let pendingY = 0;
    let rafId = null;

    function updateSpotlight() {
      rafId = null;
      if (!targetCard || !targetCard.isConnected) return;
      const rect = targetCard.getBoundingClientRect();
      const x = ((pendingX - rect.left) / rect.width) * 100;
      const y = ((pendingY - rect.top) / rect.height) * 100;
      targetCard.style.setProperty('--spotlight-x', `${x}%`);
      targetCard.style.setProperty('--spotlight-y', `${y}%`);
    }

    document.addEventListener(
      'mousemove',
      (e) => {
        const card = e.target.closest('.cn-spotlight');
        if (card !== targetCard) {
          if (targetCard) {
            targetCard.style.removeProperty('--spotlight-x');
            targetCard.style.removeProperty('--spotlight-y');
          }
          targetCard = card;
        }
        if (!targetCard) return;
        pendingX = e.clientX;
        pendingY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(updateSpotlight);
      },
      { passive: true }
    );
  }

  /**
   * Rotate placeholder text in an input like a typewriter.
   */
  function initTypewriter(input, phrases, options = {}) {
    const el = typeof input === 'string' ? document.querySelector(input) : input;
    if (!el || !phrases?.length) return;

    const typingSpeed = options.typingSpeed || 70;
    const pause = options.pause || 2000;
    const deletingSpeed = options.deletingSpeed || 35;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer = null;

    function tick() {
      const phrase = phrases[phraseIndex];
      if (isDeleting) {
        charIndex--;
      } else {
        charIndex++;
      }

      el.setAttribute('placeholder', phrase.slice(0, charIndex));

      if (!isDeleting && charIndex === phrase.length) {
        timer = setTimeout(() => {
          isDeleting = true;
          tick();
        }, pause);
        return;
      }

      if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        timer = setTimeout(tick, typingSpeed);
        return;
      }

      timer = setTimeout(tick, isDeleting ? deletingSpeed : typingSpeed);
    }

    tick();

    const stop = () => {
      if (timer) clearTimeout(timer);
    };
    el.addEventListener('focus', stop, { once: true });
  }

  /**
   * Apply staggered fade-up animation to a set of elements.
   */
  function initStagger(selector = '.cn-card', baseDelay = 0.05) {
    if (prefersReducedMotion) return;

    const elements = document.querySelectorAll(selector);
    elements.forEach((el, i) => {
      if (el.classList.contains('cn-animate-fade-up')) return;
      el.classList.add('cn-animate-fade-up');
      el.style.animationDelay = `${Math.min(i, 20) * baseDelay}s`;
    });
  }

  /**
   * Observe newly added cards and apply spotlight + stagger automatically.
   * Debounced to avoid thrashing during heavy DOM updates.
   */
  function initMutationObserver() {
    if (prefersReducedMotion) return;

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        initSpotlight('.cn-card:not([data-cn-spotlight])');
        initStagger('.cn-card:not(.cn-animate-fade-up)', 0.04);
      }, 80);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Initialize all premium effects for a search page.
   */
  function initSearchPage() {
    const ambient = document.querySelector('.cn-ambient');
    if (ambient) {
      initParticles(ambient, {
        count: DEFAULT_PARTICLE_COUNT,
        connectDistance: 90,
        speed: 0.25,
        maxConnections: 2,
      });
    }

    initSpotlight('.cn-card');
    initStagger('.cn-card', 0.05);
    initMutationObserver();

    const searchInput = document.querySelector('.cn-search-input');
    if (searchInput) {
      initTypewriter(searchInput, [
        'Search names, domains, lore, API…',
        'Who is Zeús?',
        'Is Athena available?',
        'Convert apóllōn.com',
        'Search the Unicode web…',
      ]);
    }
  }

  // Expose API
  window.PunyCodexEffects = {
    initParticles,
    initSpotlight,
    initTypewriter,
    initStagger,
    initSearchPage,
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchPage);
  } else {
    initSearchPage();
  }
})();

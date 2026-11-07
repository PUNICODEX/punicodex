/* PuniCodex — The Front Court: homepage station interactions.
 * Gold dust embers rise through the Covenant; the First Breath's scripts
 * ignite as the station enters view. Everything is Canvas 2D with a
 * quality governor (the arche.js pattern) — no WebGL, safe on mobile.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── The First Breath: ignite the scattered scripts ── */
  var breath = document.querySelector('.fc-breath');
  if (breath) {
    if ('IntersectionObserver' in window) {
      var breathSeen = false;
      var bio = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting && !breathSeen) {
              breathSeen = true;
              breath.classList.add('is-lit');
              bio.disconnect();
            }
          }
        },
        { threshold: 0.35 }
      );
      bio.observe(breath);
    } else {
      breath.classList.add('is-lit');
    }
  }

  /* ── The Consecrated Wall: count-up numerals ── */
  var wall = document.querySelector('.fc-wall-grid');
  if (wall) {
    var numerals = wall.querySelectorAll('.fc-numeral[data-count]');
    var animate = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (!target || el.getAttribute('data-done')) return;
      el.setAttribute('data-done', '1');
      if (reduceMotion || !window.PX || !window.PX.animateNumber) {
        el.textContent = target.toLocaleString();
        return;
      }
      window.PX.animateNumber(el, target, 2200);
    };
    if ('IntersectionObserver' in window) {
      var wio = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              for (var j = 0; j < numerals.length; j++) animate(numerals[j]);
              wio.disconnect();
            }
          }
        },
        { threshold: 0.3 }
      );
      wio.observe(wall);
    } else {
      for (var k = 0; k < numerals.length; k++) animate(numerals[k]);
    }
  }

  /* ── The Gallery: lightbox (full view — the masonry crops) ── */
  var lightbox = document.getElementById('fc-lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbTitle = lightbox.querySelector('.fc-lightbox-title');
    var lbCredit = lightbox.querySelector('.fc-lightbox-credit');
    var lbClose = lightbox.querySelector('.fc-lightbox-close');
    var lastFocus = null;

    function openLightbox(fig) {
      var img = fig.querySelector('img');
      var title = fig.querySelector('.fc-art-title');
      var credit = fig.querySelector('.fc-art-credit');
      if (!img) return;
      lastFocus = document.activeElement;
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
      lbTitle.textContent = title ? title.textContent : '';
      lbCredit.textContent = credit ? credit.textContent : '';
      lightbox.hidden = false;
      requestAnimationFrame(function () {
        lightbox.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        lightbox.hidden = true;
        lbImg.src = '';
      }, 280);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    var arts = document.querySelectorAll('.fc-art');
    for (var ai = 0; ai < arts.length; ai++) {
      arts[ai].setAttribute('tabindex', '0');
      arts[ai].setAttribute('role', 'button');
      arts[ai].setAttribute('aria-label', 'View artwork full size');
      arts[ai].addEventListener('click', function () {
        openLightbox(this);
      });
      arts[ai].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(this);
        }
      });
    }

    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  /* ── The Covenant: forge embers ── */
  var canvas = document.querySelector('.fc-embers');
  if (!canvas || reduceMotion || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var W = 0;
  var H = 0;
  var dpr = 1;
  var running = false;
  var raf = 0;
  var last = 0;
  var budget = 90; // ember count ceiling; governor lowers it if fps drops
  var fpsWindow = [];
  var embers = [];

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 8,
      r: 0.5 + Math.random() * 1.4,
      vy: 0.18 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.22,
      life: 0.55 + Math.random() * 0.45,
      hue: 38 + Math.random() * 10,
    };
  }

  function seed() {
    embers = [];
    for (var i = 0; i < budget; i++) embers.push(spawn(true));
  }

  function step(t) {
    if (!running) return;
    raf = requestAnimationFrame(step);
    if (t - last < 1000 / 45) return; // cap at ~45fps
    var dt = Math.min(64, t - last || 16);
    last = t;

    // quality governor: sustained low fps shrinks the ember budget
    fpsWindow.push(t);
    while (fpsWindow.length && fpsWindow[0] < t - 2000) fpsWindow.shift();
    if (fpsWindow.length > 110 && budget > 34) {
      budget = Math.max(34, budget - 22);
      embers.length = Math.min(embers.length, budget);
      fpsWindow = [];
    }

    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.y -= e.vy * (dt / 16.7);
      e.x += e.vx * (dt / 16.7) + Math.sin((e.y + i * 37) * 0.012) * 0.18;
      if (e.y < -10 || e.life <= 0) embers[i] = spawn(false);
      var a = Math.max(0, Math.min(0.75, e.life * 0.75));
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, 6.2832);
      ctx.fillStyle = 'hsla(' + e.hue + ', 68%, 60%, ' + a.toFixed(3) + ')';
      ctx.fill();
      e.life -= 0.0022 * (dt / 16.7);
    }
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  resize();
  seed();

  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) setRunning(entries[i].isIntersecting);
      },
      { rootMargin: '80px' }
    );
    vio.observe(canvas);
  } else {
    setRunning(true);
  }

  var rt = 0;
  window.addEventListener(
    'resize',
    function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        resize();
        seed();
      }, 160);
    },
    { passive: true }
  );
})();

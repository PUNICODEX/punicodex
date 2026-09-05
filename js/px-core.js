/* ═══════════════════════════════════════════════════════════
   PuniCodex — Core Shared Behaviors
   Nav, scroll reveal, clipboard, utilities.
   Loaded by main.js and temple-base.js.
   ═══════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const PX = global.PX || {};

  /* ─── Utilities ─── */
  function debounce(fn, wait = 100) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  PX.debounce = debounce;
  PX.throttle = throttle;
  PX.prefersReducedMotion = prefersReducedMotion;

  /* ─── Toast ─── */
  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'px-toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  PX.showToast = function (message, duration = 3000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'px-toast';
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  };

  /* ─── Clipboard ─── */
  PX.copyToClipboard = async function (text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (successMessage) PX.showToast(successMessage);
      return true;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (successMessage) PX.showToast(successMessage);
        return true;
      } catch (e) {
        PX.showToast('Could not copy to clipboard');
        return false;
      } finally {
        textarea.remove();
      }
    }
  };

  global.copyToClipboard = PX.copyToClipboard;

  /* ─── Navigation ─── */
  PX.initNavigation = function () {
    const navs = document.querySelectorAll('.main-nav');
    if (navs.length) {
      // Batch: one scrollY read, then all class writes — never interleaved,
      // so the browser never has to recompute layout between navs.
      const onScroll = throttle(() => {
        const scrolled = window.scrollY > 40;
        navs.forEach((nav) => {
          nav.classList.toggle('scrolled', scrolled);
        });
      }, 80);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    document.querySelectorAll('.nav-toggle').forEach((toggle) => {
      const menuId = toggle.getAttribute('aria-controls');
      let mobileMenu = menuId ? document.getElementById(menuId) : null;
      let navLinks = null;

      if (!mobileMenu) {
        mobileMenu = document.querySelector('.mobile-menu');
      }
      if (!mobileMenu) {
        const nav = toggle.closest('.main-nav');
        if (nav) navLinks = nav.querySelector('.nav-links');
      }
      if (!mobileMenu && !navLinks) return;

      // Menus marked aria-hidden="true" (e.g. temple pages) must not expose
      // focusable links while closed: keep aria-hidden and inert in sync with
      // the open state so keyboard/AT users only reach an open menu.
      const syncHiddenMenu = (open) => {
        if (!mobileMenu || !mobileMenu.hasAttribute('aria-hidden')) return;
        mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        mobileMenu.inert = !open;
      };
      if (mobileMenu && mobileMenu.hasAttribute('aria-hidden')) {
        mobileMenu.inert = !mobileMenu.classList.contains('active');
      }

      const closeMenu = () => {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (navLinks) navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
        syncHiddenMenu(false);
      };

      // Back-forward cache: navigating away with the menu open and returning
      // via the browser back button restores the page WITH the menu open.
      // Reset it whenever the page is shown from the bfcache.
      window.addEventListener('pageshow', (e) => {
        if (e.persisted) closeMenu();
      });

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        // Stop any legacy per-page nav handlers from double-toggling the menu.
        e.stopImmediatePropagation();
        const active = toggle.classList.toggle('active');
        toggle.setAttribute('aria-expanded', active ? 'true' : 'false');
        if (mobileMenu) mobileMenu.classList.toggle('active', active);
        if (navLinks) navLinks.classList.toggle('active', active);
        document.body.classList.toggle('menu-open', active);
        syncHiddenMenu(active);
      });

      if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach((link) => {
          link.addEventListener('click', closeMenu);
        });
      }
      if (navLinks) {
        navLinks.querySelectorAll('a').forEach((link) => {
          link.addEventListener('click', closeMenu);
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    });

    // Desktop "More" dropdown toggles
    document.querySelectorAll('.nav-more-toggle').forEach((toggle) => {
      const more = toggle.closest('.nav-more');
      const menu = toggle.nextElementSibling;
      if (!more || !menu || !menu.classList.contains('nav-more-menu')) return;

      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        // Close other open dropdowns
        document.querySelectorAll('.nav-more-toggle[aria-expanded="true"]').forEach((t) => {
          if (t !== toggle) t.setAttribute('aria-expanded', 'false');
        });
        setOpen(open);
      });

      // Hover persistence: opening on mouseenter and keeping the menu open
      // while the pointer is anywhere inside .nav-more (including the gap
      // between the toggle and the menu). A short leave delay prevents
      // flicker when crossing the toggle-to-menu gap.
      let leaveTimer = null;
      const HOVER_LEAVE_DELAY = 120;

      const clearLeaveTimer = () => {
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          leaveTimer = null;
        }
      };

      more.addEventListener('mouseenter', () => {
        clearLeaveTimer();
        setOpen(true);
      });

      more.addEventListener('mouseleave', () => {
        clearLeaveTimer();
        leaveTimer = setTimeout(() => {
          setOpen(false);
        }, HOVER_LEAVE_DELAY);
      });

      menu.addEventListener('mouseenter', () => {
        clearLeaveTimer();
        setOpen(true);
      });

      document.addEventListener('click', (e) => {
        if (!more.contains(e.target)) {
          setOpen(false);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
      });
    });

    // Highlight current page in nav
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkPath = new URL(href, window.location.origin).pathname.replace(/\/$/, '') || '/';
      if (linkPath === currentPath) {
        link.classList.add('active');
      }
    });
  };

  /* ─── Smooth Scroll ─── */
  PX.initSmoothScroll = function () {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const navHeight = document.querySelector('.main-nav')?.offsetHeight || 72;
          const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
          window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      });
    });
  };

  /* ─── Scroll Reveal ─── */
  PX.initReveal = function (selector = '.reveal-up, .reveal-scale, .reveal-fade, .reveal-stagger') {
    if (prefersReducedMotion()) {
      document.querySelectorAll(selector).forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
  };

  /* ─── Active Section Highlight ─── */
  PX.initActiveSection = function () {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => link.classList.remove('active'));
            const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
            if (active) active.classList.add('active');
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
  };

  /* ─── Number Animation ─── */
  PX.animateNumber = function (el, target, duration = 2000) {
    if (prefersReducedMotion()) {
      el.textContent = target.toLocaleString();
      return;
    }
    const start = performance.now();
    const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(from + (target - from) * eased);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* ─── Initialize on DOM ready ─── */
  PX.init = function () {
    PX.initNavigation();
    PX.initSmoothScroll();
    PX.initReveal();
    PX.initActiveSection();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', PX.init);
  } else {
    PX.init();
  }

  global.PX = PX;
})(window);

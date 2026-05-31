/**
 * PÚNYCODEX — Main JavaScript
 * Enterprise-grade: IntersectionObserver reveals, throttled nav, utilities
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════

    const nav = document.querySelector('.main-nav');
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    // Scroll-based nav background — throttled via rAF
    let lastScrollY = 0;
    let scrollTicking = false;
    function handleNavScroll() {
        if (!nav) return;
        const scrollY = window.scrollY;
        if (scrollY > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScrollY = scrollY;
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(handleNavScroll);
            scrollTicking = true;
        }
    }, { passive: true });
    handleNavScroll();

    // Mobile menu toggle
    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // NATIVE INTERSECTION OBSERVER SCROLL REVEALS
    // ═══════════════════════════════════════════════════════════

    function initScrollReveals() {
        const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-fade');
        if (!revealElements.length) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            revealElements.forEach(el => el.classList.add('revealed'));
            return;
        }

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -15% 0px'
        });

        revealElements.forEach(el => {
            const staggerContainer = el.closest('[data-stagger]');
            if (staggerContainer) {
                const siblings = Array.from(staggerContainer.children).filter(child =>
                    child.matches('.reveal-up, .reveal-scale, .reveal-fade')
                );
                const index = siblings.indexOf(el);
                el.style.setProperty('--stagger-index', index);
            }
            revealObserver.observe(el);
        });
    }

    if (document.readyState !== 'loading') {
        initScrollReveals();
    } else {
        document.addEventListener('DOMContentLoaded', initScrollReveals);
    }

    // ═══════════════════════════════════════════════════════════
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ═══════════════════════════════════════════════════════════

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = nav ? nav.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    window.PX = {
        debounce: function(fn, delay) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        throttle: function(fn, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        isInViewport: function(el, threshold = 0) {
            const rect = el.getBoundingClientRect();
            return (
                rect.top <= (window.innerHeight || document.documentElement.clientHeight) * (1 - threshold) &&
                rect.bottom >= 0
            );
        },

        animateNumber: function(el, target, duration = 2000) {
            const start = 0;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (target - start) * easeProgress);
                el.textContent = current.toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            requestAnimationFrame(update);
        },

        copyToClipboard: async function(text) {
            try {
                await navigator.clipboard.writeText(text);
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
                    return true;
                } catch (e) {
                    return false;
                } finally {
                    document.body.removeChild(textarea);
                }
            }
        },

        showToast: function(message, duration = 3000) {
            let toast = document.querySelector('.px-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'px-toast';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';

            if (toast._timeout) clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.style.transform = 'translateX(-50%) translateY(120px)';
                toast.style.opacity = '0';
            }, duration);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // SERVICE WORKER REGISTRATION
    // ═══════════════════════════════════════════════════════════

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                reg.update();
            })
            .catch(() => { /* silent fail */ });
    }

    // ═══════════════════════════════════════════════════════════
    // ACTIVE NAV LINK HIGHLIGHTING
    // ═══════════════════════════════════════════════════════════

    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link, .mobile-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.startsWith(href) && href !== '/') {
            link.classList.add('active');
            link.style.color = 'var(--gold)';
        }
    });

})();

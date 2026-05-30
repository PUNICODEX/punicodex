/**
 * PÚNYCODEX — Main JavaScript
 * Custom cursor, GSAP ScrollTrigger, navigation, utilities
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // GSAP SETUP
    // ═══════════════════════════════════════════════════════════

    let gsapLoaded = false;
    let scrollTriggerLoaded = false;

    function initGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            return false;
        }
        gsap.registerPlugin(ScrollTrigger);
        gsapLoaded = true;
        scrollTriggerLoaded = true;
        return true;
    }

    // Wait for GSAP to load
    function waitForGSAP(callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (initGSAP() || attempts >= maxAttempts) {
                clearInterval(interval);
                callback();
            }
        }, 100);
    }

    // ═══════════════════════════════════════════════════════════
    // CUSTOM CURSOR
    // ═══════════════════════════════════════════════════════════

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);

        // Create trail dots (reduced to 2 for performance)
        const trailCount = 2;
        const trails = [];
        for (let i = 0; i < trailCount; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            document.body.appendChild(trail);
            trails.push({ el: trail, x: 0, y: 0 });
        }

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // GPU-accelerated cursor — uses transform instead of left/top
        function animateCursor() {
            const mainEase = 0.78;
            cursorX += (mouseX - cursorX) * mainEase;
            cursorY += (mouseY - cursorY) * mainEase;

            cursor.style.transform = `translate3d(${cursorX - 6}px, ${cursorY - 6}px, 0)`;

            let prevX = cursorX, prevY = cursorY;
            trails.forEach((trail, i) => {
                const trailEase = 0.38 - (i * 0.06);
                trail.x += (prevX - trail.x) * trailEase;
                trail.y += (prevY - trail.y) * trailEase;
                const opacity = 1 - (i / trailCount);
                const scale = 1 - (i / trailCount) * 0.5;
                trail.el.style.transform = `translate3d(${trail.x - 3}px, ${trail.y - 3}px, 0) scale(${scale})`;
                trail.el.style.opacity = opacity * 0.35;
                prevX = trail.x;
                prevY = trail.y;
            });

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover states
        const hoverSelectors = 'a, button, .archetype-card, .codex-card, .tier-card, .stat-card, .nav-toggle';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(hoverSelectors)) {
                cursor.classList.add('hover');
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(hoverSelectors)) {
                cursor.classList.remove('hover');
            }
        });

        // Click animation
        document.addEventListener('mousedown', () => cursor.classList.add('click'));
        document.addEventListener('mouseup', () => cursor.classList.remove('click'));
    }

    // ═══════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════

    const nav = document.querySelector('.main-nav');
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    // Scroll-based nav background — throttled
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
    // GSAP SCROLL REVEALS
    // ═══════════════════════════════════════════════════════════

    function initScrollReveals() {
        if (!scrollTriggerLoaded) {
            // Fallback to IntersectionObserver
            initFallbackReveals();
            return;
        }

        // Reveal up animations
        gsap.utils.toArray('.reveal-up').forEach((el, i) => {
            gsap.fromTo(el,
                { opacity: 0, y: 50 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    },
                    delay: el.closest('[data-stagger]') ? (i % 6) * 0.08 : 0
                }
            );
        });

        // Reveal scale animations
        gsap.utils.toArray('.reveal-scale').forEach(el => {
            gsap.fromTo(el,
                { opacity: 0, scale: 0.9 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 1.2,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Reveal fade animations
        gsap.utils.toArray('.reveal-fade').forEach(el => {
            gsap.fromTo(el,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 1.5,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Parallax effects
        gsap.utils.toArray('.parallax-slow').forEach(el => {
            gsap.to(el, {
                y: -50,
                ease: 'none',
                scrollTrigger: {
                    trigger: el,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        });

        gsap.utils.toArray('.parallax-medium').forEach(el => {
            gsap.to(el, {
                y: -100,
                ease: 'none',
                scrollTrigger: {
                    trigger: el,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        });
    }

    function initFallbackReveals() {
        const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-fade');
        if (revealElements.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'none';
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            revealElements.forEach(el => revealObserver.observe(el));
        } else {
            revealElements.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LOADING SCREEN
    // ═══════════════════════════════════════════════════════════

    const loadingScreen = document.querySelector('.loading-screen');

    function hideLoadingScreen() {
        if (!loadingScreen) return;
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
            // Initialize scroll reveals after loading screen is gone
            initScrollReveals();
        }, 1000);
    }

    // Hide loading screen as soon as DOM is ready (max 600ms wait)
    function readyHide() {
        hideLoadingScreen();
    }
    if (document.readyState !== 'loading') {
        setTimeout(readyHide, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(readyHide, 100));
    }
    // Safety: never block longer than 600ms
    setTimeout(hideLoadingScreen, 600);

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

    // ═══════════════════════════════════════════════════════════
    // INITIALIZE GSAP WHEN READY
    // ═══════════════════════════════════════════════════════════

    waitForGSAP(() => {
        // If loading screen is already gone, init reveals now
        if (!loadingScreen || loadingScreen.classList.contains('hidden')) {
            initScrollReveals();
        }
    });

})();

/**
 * APSÛ FLAGSHIP TEMPLE — ABYSS CANVAS & INTERACTIONS
 * Still dark freshwater deep, rising light bubbles, swaying light shafts
 * + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Abyss Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('abyss-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let bubbles = [];
        let motes = [];
        let shafts = [];
        let orbSprite = null;
        let frameCount = 0;
        let paused = false;
        const pointer = { x: 0.5, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* Soft glowing orb sprite: one prerendered radial gradient, reused */
        function buildOrbSprite() {
            orbSprite = document.createElement('canvas');
            orbSprite.width = 64;
            orbSprite.height = 64;
            const g = orbSprite.getContext('2d');
            const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(220, 250, 246, 0.9)');
            grad.addColorStop(0.25, 'rgba(170, 230, 226, 0.45)');
            grad.addColorStop(0.6, 'rgba(110, 190, 196, 0.14)');
            grad.addColorStop(1, 'rgba(110, 190, 196, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
        }

        class LightBubble {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 40;
                this.vy = -(0.08 + Math.random() * 0.28); // the deep is still: slow rise
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.002 + Math.random() * 0.005;
                this.size = 6 + Math.random() * 26;
                this.pulse = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.006 + Math.random() * 0.012;
                this.alpha = 0.25 + Math.random() * 0.5;
            }

            update() {
                this.wobble += this.wobbleSpeed;
                this.pulse += this.pulseSpeed;
                this.x += Math.sin(this.wobble) * 0.15;
                this.y += this.vy;
                if (this.y < -50) this.reset(false);
            }

            draw() {
                const glow = this.alpha * (0.7 + 0.3 * Math.sin(this.pulse));
                ctx.save();
                ctx.globalAlpha = glow;
                const s = this.size * 2;
                ctx.drawImage(orbSprite, this.x - s / 2, this.y - s / 2, s, s);
                ctx.restore();
            }
        }

        class DriftMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(0.03 + Math.random() * 0.1);
                this.vx = (Math.random() - 0.5) * 0.05;
                this.size = 0.5 + Math.random() * 1.4;
                this.alpha = 0.05 + Math.random() * 0.14;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < -8 || this.x < -8 || this.x > width + 8) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#bfe8e4';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class LightShaft {
            constructor(index, total) {
                this.xFrac = 0.15 + (index / (total - 1)) * 0.7 + (Math.random() - 0.5) * 0.08;
                this.widthFrac = 0.05 + Math.random() * 0.07;
                this.sway = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.0015 + Math.random() * 0.002;
                this.alpha = 0.025 + Math.random() * 0.035;
            }

            draw(t) {
                this.sway += this.swaySpeed;
                const x = width * this.xFrac + Math.sin(this.sway) * width * 0.02;
                const w = width * this.widthFrac;
                const lean = Math.sin(this.sway * 0.7) * width * 0.04
                    + (pointer.active ? (pointer.x - 0.5) * width * 0.03 : 0);
                const breathe = 0.75 + 0.25 * Math.sin(t * 0.004 + this.xFrac * 9);
                const grad = ctx.createLinearGradient(x, 0, x + lean, height);
                grad.addColorStop(0, `rgba(170, 225, 220, ${this.alpha * breathe})`);
                grad.addColorStop(0.7, `rgba(140, 205, 205, ${this.alpha * 0.4 * breathe})`);
                grad.addColorStop(1, 'rgba(140, 205, 205, 0)');
                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(x - w * 0.5, -10);
                ctx.lineTo(x + w * 0.5, -10);
                ctx.lineTo(x + lean + w * 1.4, height);
                ctx.lineTo(x + lean - w * 1.4, height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        buildOrbSprite();
        for (let i = 0; i < 55; i++) bubbles.push(new LightBubble());
        for (let i = 0; i < 90; i++) motes.push(new DriftMote());
        for (let i = 0; i < 4; i++) shafts.push(new LightShaft(i, 4));

        window.addEventListener('resize', resize);

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            window.addEventListener('mousemove', (e) => {
                pointer.x = e.clientX / window.innerWidth;
                pointer.active = true;
            }, { passive: true });
        }

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        function animate() {
            if (paused) return;
            frameCount++;
            const t = frameCount;
            ctx.clearRect(0, 0, width, height);

            // The abyssal source: a slow-breathing glow deep below the frame
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.003);
            const deep = ctx.createRadialGradient(
                width * 0.5, height * 1.25, 0,
                width * 0.5, height * 1.25, Math.max(width, height) * 0.85
            );
            deep.addColorStop(0, `hsla(182, 55%, 26%, ${0.09 + pulse * 0.05})`);
            deep.addColorStop(0.55, `hsla(190, 50%, 18%, ${0.04 + pulse * 0.02})`);
            deep.addColorStop(1, 'transparent');
            ctx.fillStyle = deep;
            ctx.fillRect(0, 0, width, height);

            // Light shafts falling in from the far-above surface
            shafts.forEach(s => s.draw(t));

            // Distant surface shimmer: a faint breathing band at the top
            const shimmer = ctx.createLinearGradient(0, 0, 0, height * 0.16);
            shimmer.addColorStop(0, `hsla(180, 60%, 60%, ${0.04 + pulse * 0.03})`);
            shimmer.addColorStop(1, 'transparent');
            ctx.fillStyle = shimmer;
            ctx.fillRect(0, 0, width, height * 0.16);

            motes.forEach(m => { m.update(); m.draw(); });
            bubbles.forEach(b => { b.update(); b.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, parseInt(delay, 10));
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('visible'));
    }

    /* ── Nav Scroll Effect ────────────────────────────────────────────────── */
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            const hero = document.getElementById('hero');
            if (hero) {
                const heroBottom = hero.offsetTop + hero.offsetHeight;
                if (scrollY < heroBottom) {
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

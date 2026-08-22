/**
 * OṀ — The Sacred Syllable
 * Hero canvas: the ॐ form breathing at the center of the field, each pulse
 * releasing concentric sound-wave rings — the unstruck sound (anāhata)
 * made visible. Orbiting dust gathers and scatters with the breath.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Syllable Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('syllable-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let cx, cy, fieldR;
        let omSprite = null;
        let rings = [];
        let orbiters = [];
        let rafId = 0;
        let frame = 0;
        let lastPulseRing = -1;
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

        const ORBITER_COUNT = 130;
        const MAX_RINGS = 6;

        const PALETTE = {
            omCore: { r: 255, g: 196, b: 92 },    // Saffron heart
            omEdge: { r: 212, g: 120, b: 48 },    // Deep marigold
            ring: { r: 244, g: 186, b: 104 },     // Sound-ring gold
            ringDeep: { r: 186, g: 120, b: 200 }, // Violet overtone
            dust: { r: 250, g: 216, b: 150 },
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            cx = width / 2;
            cy = height * 0.5;
            fieldR = Math.min(width, height) * 0.5;
            bakeOmSprite();
            seedOrbiters();
        }

        // The ॐ is rendered once to an offscreen sprite and blitted per frame
        function bakeOmSprite() {
            const size = Math.max(220, Math.round(fieldR * 0.9));
            omSprite = document.createElement('canvas');
            omSprite.width = size;
            omSprite.height = size;
            const sctx = omSprite.getContext('2d');
            const grad = sctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.5);
            grad.addColorStop(0, `rgb(${PALETTE.omCore.r}, ${PALETTE.omCore.g}, ${PALETTE.omCore.b})`);
            grad.addColorStop(1, `rgb(${PALETTE.omEdge.r}, ${PALETTE.omEdge.g}, ${PALETTE.omEdge.b})`);
            sctx.font = `${Math.round(size * 0.72)}px "Noto Sans Devanagari", "Mangal", serif`;
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';
            sctx.shadowBlur = size * 0.08;
            sctx.shadowColor = `rgba(${PALETTE.omCore.r}, ${PALETTE.omCore.g}, ${PALETTE.omCore.b}, 0.95)`;
            sctx.fillStyle = grad;
            sctx.fillText('ॐ', size / 2, size / 2 + size * 0.03);
            // Second pass for a hotter core
            sctx.shadowBlur = size * 0.03;
            sctx.globalAlpha = 0.5;
            sctx.fillStyle = 'rgba(255, 240, 210, 0.85)';
            sctx.fillText('ॐ', size / 2, size / 2 + size * 0.03);
        }

        function seedOrbiters() {
            orbiters = [];
            for (let i = 0; i < ORBITER_COUNT; i++) {
                orbiters.push(new Orbiter());
            }
        }

        class Orbiter {
            constructor() {
                this.angle = Math.random() * Math.PI * 2;
                this.radius = fieldR * (0.25 + Math.random() * 0.75);
                this.speed = (0.0012 + Math.random() * 0.0022) * (Math.random() < 0.5 ? 1 : -1);
                this.eccentricity = 0.75 + Math.random() * 0.25;
                this.size = 0.5 + Math.random() * 1.6;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.12 + Math.random() * 0.3;
            }

            update(breath) {
                this.phase += 0.02;
                this.angle += this.speed * (0.7 + breath * 0.6);
                // The breath draws the dust inward and releases it
                this.radius += Math.sin(frame * 0.013 + this.phase) * 0.15;
            }

            draw(breath) {
                const x = cx + pointer.x + Math.cos(this.angle) * this.radius;
                const y = cy + pointer.y + Math.sin(this.angle) * this.radius * this.eccentricity;
                ctx.save();
                ctx.globalAlpha = this.alpha * (0.55 + 0.45 * Math.sin(this.phase)) * (0.7 + breath * 0.5);
                ctx.fillStyle = `rgb(${PALETTE.dust.r}, ${PALETTE.dust.g}, ${PALETTE.dust.b})`;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class PulseRing {
            constructor(birth) {
                this.birth = birth;
                this.r = omSprite ? omSprite.width * 0.28 : 60;
                this.speed = 1.1 + Math.random() * 0.5;
                this.maxR = fieldR * 1.25;
                this.deep = Math.random() < 0.35; // violet overtone rings
            }

            update() {
                this.r += this.speed * (1 + this.r / 800);
                return this.r < this.maxR;
            }

            draw() {
                const t = this.r / this.maxR;
                const alpha = 0.5 * (1 - t) * (1 - t);
                const c = this.deep ? PALETTE.ringDeep : PALETTE.ring;
                ctx.save();
                ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                // Ring thickens then thins as it travels
                ctx.lineWidth = 0.8 + Math.sin(Math.min(1, t * 1.4) * Math.PI) * 2.2;
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`;
                ctx.beginPath();
                ctx.arc(cx + pointer.x * 0.5, cy + pointer.y * 0.5, this.r, 0, Math.PI * 2);
                ctx.stroke();
                // Faint harmonic echo just inside the wavefront
                ctx.shadowBlur = 0;
                ctx.globalAlpha = alpha * 0.4;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.arc(cx + pointer.x * 0.5, cy + pointer.y * 0.5, this.r * 0.92, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        function animate() {
            frame++;
            ctx.clearRect(0, 0, width, height);

            // Breath: 0..1, slow diaphragmatic cycle (~9s)
            const breath = 0.5 + 0.5 * Math.sin(frame * 0.011);

            // Pointer parallax eases toward the hand
            pointer.x += (pointer.tx - pointer.x) * 0.04;
            pointer.y += (pointer.ty - pointer.y) * 0.04;

            // Field ambience — a warm halo around the syllable
            const halo = ctx.createRadialGradient(
                cx + pointer.x, cy + pointer.y, 0,
                cx + pointer.x, cy + pointer.y, fieldR * 1.1
            );
            halo.addColorStop(0, `rgba(226, 150, 70, ${0.09 + breath * 0.07})`);
            halo.addColorStop(0.5, `rgba(120, 70, 160, ${0.03 + breath * 0.03})`);
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, width, height);

            // Release a sound ring on each breath peak
            const breathPhase = Math.floor(frame * 0.011 / Math.PI);
            if (breath > 0.985 && lastPulseRing !== breathPhase && rings.length < MAX_RINGS) {
                lastPulseRing = breathPhase;
                rings.push(new PulseRing(frame));
            }

            rings = rings.filter(r => r.update());
            rings.forEach(r => r.draw());

            orbiters.forEach(o => { o.update(breath); o.draw(breath); });

            // The syllable itself — breathing scale, breathing light
            if (omSprite) {
                const base = omSprite.width;
                const scalePulse = 0.94 + breath * 0.10;
                const size = base * scalePulse;
                ctx.save();
                ctx.globalAlpha = 0.72 + breath * 0.28;
                ctx.shadowBlur = 30 + breath * 40;
                ctx.shadowColor = `rgba(${PALETTE.omCore.r}, ${PALETTE.omCore.g}, ${PALETTE.omCore.b}, 0.8)`;
                ctx.drawImage(
                    omSprite,
                    cx + pointer.x - size / 2,
                    cy + pointer.y - size / 2,
                    size,
                    size
                );
                ctx.restore();
            }

            rafId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener('resize', resize);

        window.addEventListener('pointermove', (e) => {
            pointer.tx = (e.clientX / Math.max(1, width) - 0.5) * 26;
            pointer.ty = (e.clientY / Math.max(1, height) - 0.5) * 18;
        }, { passive: true });

        rafId = requestAnimationFrame(animate);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            } else if (!rafId) {
                rafId = requestAnimationFrame(animate);
            }
        });
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay);
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

    window.addEventListener('scroll', () => {
        if (!nav) return;
        if (window.pageYOffset > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

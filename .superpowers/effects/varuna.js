/**
 * VARUṆA — Cosmic Order, Oceans
 * Hero canvas: deep layered order-waves rolling through dark waters, with
 * slow glowing binding-knot motifs that tighten and loosen — the nooses
 * (pāśa) with which Varuṇa binds the world to ṛta.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Waters Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('waters-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let waves = [];
        let knots = [];
        let motes = [];
        let rafId = 0;
        let frame = 0;
        const pointer = { x: 0.5, y: 0.5, energy: 0 };

        const WAVE_LAYERS = 6;
        const KNOT_COUNT = 3;
        const MOTE_COUNT = 80;

        const PALETTE = {
            crest: { r: 96, g: 178, b: 200 },     // Moonlit crest
            deep: { r: 14, g: 42, b: 66 },        // Abyssal blue
            knot: { r: 178, g: 214, b: 226 },     // Knot silver-blue
            knotGlow: { r: 120, g: 190, b: 214 },
            mote: { r: 150, g: 205, b: 220 },
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildWaves();
        }

        function buildWaves() {
            waves = [];
            for (let i = 0; i < WAVE_LAYERS; i++) {
                const depth = i / (WAVE_LAYERS - 1); // 0 = nearest top, 1 = deepest
                waves.push({
                    baseY: height * (0.28 + depth * 0.62),
                    amplitude: 12 + depth * 26,
                    wavelength: 220 + i * 130,
                    speed: 0.008 + depth * 0.006,
                    phase: Math.random() * Math.PI * 2,
                    secondary: 0.4 + Math.random() * 0.4,
                    alpha: 0.10 + depth * 0.10,
                });
            }
        }

        class Knot {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = width * (0.15 + Math.random() * 0.7);
                this.y = height * (0.2 + Math.random() * 0.6);
                this.vx = (Math.random() - 0.5) * 0.12;
                this.vy = (Math.random() - 0.5) * 0.08;
                this.size = 26 + Math.random() * 34;
                this.rotation = Math.random() * Math.PI * 2;
                this.spin = (Math.random() - 0.5) * 0.0022;
                this.tightenPhase = Math.random() * Math.PI * 2;
                this.tightenSpeed = 0.006 + Math.random() * 0.006;
                this.alpha = 0;
                this.fadeIn = true;
                this.life = 600 + Math.random() * 600;
            }

            update() {
                this.tightenPhase += this.tightenSpeed;
                this.rotation += this.spin;
                this.x += this.vx;
                this.y += this.vy;
                this.life--;

                if (this.fadeIn) {
                    this.alpha = Math.min(0.6, this.alpha + 0.004);
                    if (this.alpha >= 0.6) this.fadeIn = false;
                } else if (this.life < 120) {
                    this.alpha = Math.max(0, this.alpha - 0.005);
                }

                if (this.life <= 0 || this.x < -80 || this.x > width + 80 || this.y < -80 || this.y > height + 80) {
                    this.reset();
                }
            }

            draw() {
                // Binding loop: a trefoil-like closed curve that visibly
                // constricts and releases — the knot taking hold.
                const tighten = 0.72 + 0.28 * Math.sin(this.tightenPhase);
                const R = this.size * tighten;

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.alpha;
                ctx.lineWidth = 1.6;
                ctx.lineCap = 'round';
                ctx.strokeStyle = `rgb(${PALETTE.knot.r}, ${PALETTE.knot.g}, ${PALETTE.knot.b})`;
                ctx.shadowBlur = 14 * tighten;
                ctx.shadowColor = `rgba(${PALETTE.knotGlow.r}, ${PALETTE.knotGlow.g}, ${PALETTE.knotGlow.b}, 0.9)`;

                ctx.beginPath();
                const steps = 72;
                for (let i = 0; i <= steps; i++) {
                    const t = (i / steps) * Math.PI * 2;
                    // Trefoil parametric curve in the plane
                    const r = R * (0.62 + 0.38 * Math.cos(3 * t));
                    const px = Math.cos(t) * r;
                    const py = Math.sin(t) * r * 0.86;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();

                // Inner cinch ring — tightens harder than the outer loop
                ctx.shadowBlur = 8 * tighten;
                ctx.globalAlpha = this.alpha * 0.7;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, R * 0.34 * tighten, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vx = (Math.random() - 0.5) * 0.1;
                this.vy = -(0.08 + Math.random() * 0.3);
                this.size = 0.5 + Math.random() * 1.6;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.08 + Math.random() * 0.22;
            }

            update() {
                this.phase += 0.015;
                this.x += this.vx + Math.sin(this.phase) * 0.15;
                this.y += this.vy;
                if (this.y < -8 || this.x < -8 || this.x > width + 8) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha * (0.6 + 0.4 * Math.sin(this.phase * 2));
                ctx.fillStyle = `rgb(${PALETTE.mote.r}, ${PALETTE.mote.g}, ${PALETTE.mote.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawWave(w, pointerLift) {
            const grad = ctx.createLinearGradient(0, w.baseY - w.amplitude, 0, height);
            grad.addColorStop(0, `rgba(${PALETTE.crest.r}, ${PALETTE.crest.g}, ${PALETTE.crest.b}, ${w.alpha * 0.55})`);
            grad.addColorStop(0.25, `rgba(${PALETTE.deep.r + 20}, ${PALETTE.deep.g + 24}, ${PALETTE.deep.b + 30}, ${w.alpha})`);
            grad.addColorStop(1, 'transparent');

            ctx.save();
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, height);
            const step = 8;
            for (let x = 0; x <= width + step; x += step) {
                const p1 = Math.sin((x / w.wavelength) * Math.PI * 2 + w.phase) * w.amplitude;
                const p2 = Math.sin((x / (w.wavelength * 0.53)) * Math.PI * 2 + w.phase * 1.7) * w.amplitude * w.secondary * 0.5;
                // The water swells gently beneath the hand
                const dxn = (x / width - pointer.x) * 3;
                const lift = Math.exp(-dxn * dxn) * pointerLift;
                ctx.lineTo(x, w.baseY + p1 + p2 - lift);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();

            // Crest hairline
            ctx.globalAlpha = w.alpha * 1.6;
            ctx.strokeStyle = `rgba(${PALETTE.crest.r}, ${PALETTE.crest.g}, ${PALETTE.crest.b}, 0.5)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width + step; x += step) {
                const p1 = Math.sin((x / w.wavelength) * Math.PI * 2 + w.phase) * w.amplitude;
                const p2 = Math.sin((x / (w.wavelength * 0.53)) * Math.PI * 2 + w.phase * 1.7) * w.amplitude * w.secondary * 0.5;
                const dxn = (x / width - pointer.x) * 3;
                const lift = Math.exp(-dxn * dxn) * pointerLift;
                const y = w.baseY + p1 + p2 - lift;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        function animate() {
            frame++;
            ctx.clearRect(0, 0, width, height);

            pointer.energy *= 0.96;
            const pointerLift = 10 * Math.min(1, pointer.energy);

            // Abyssal depth glow
            const depthGlow = ctx.createLinearGradient(0, 0, 0, height);
            depthGlow.addColorStop(0, 'rgba(8, 22, 38, 0.06)');
            depthGlow.addColorStop(0.6, 'rgba(16, 52, 78, 0.10)');
            depthGlow.addColorStop(1, 'rgba(6, 18, 30, 0.05)');
            ctx.fillStyle = depthGlow;
            ctx.fillRect(0, 0, width, height);

            // Deepest waves first so nearer layers overlap
            for (let i = waves.length - 1; i >= 0; i--) {
                const w = waves[i];
                w.phase += w.speed;
                drawWave(w, pointerLift * (1 - i / waves.length));
            }

            knots.forEach(k => { k.update(); k.draw(); });
            motes.forEach(m => { m.update(); m.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < KNOT_COUNT; i++) {
            knots.push(new Knot());
        }
        for (let i = 0; i < MOTE_COUNT; i++) {
            motes.push(new Mote());
        }

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX / Math.max(1, width);
            pointer.y = e.clientY / Math.max(1, height);
            pointer.energy = Math.min(1, pointer.energy + 0.12);
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

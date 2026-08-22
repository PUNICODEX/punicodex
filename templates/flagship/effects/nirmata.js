/**
 * NIRMĀTṚ — The Divine Architect
 * Hero canvas: blueprint lines constructing a cosmic mandala over a drifting
 * drafting grid — concentric circles, spokes, petals and polygon rings are
 * drawn in stroke by stroke, held in a completed glow, then released and
 * drafted anew.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Blueprint Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('blueprint-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let cx, cy, scale;
        let elements = [];
        let chalk = [];
        let rafId = 0;
        let frame = 0;
        let cycleStart = 0;
        let variant = 0;
        const pointer = { x: -9999, y: -9999 };

        const CHALK_COUNT = 50;
        const HOLD_FRAMES = 420;  // completed mandala holds, then re-drafts
        const FADE_FRAMES = 120;

        const PALETTE = {
            line: { r: 126, g: 214, b: 236 },     // Drafting cyan
            lineDim: { r: 74, g: 140, b: 170 },
            grid: { r: 60, g: 110, b: 146 },
            hot: { r: 226, g: 246, b: 252 },      // Completed white-cyan
            chalk: { r: 150, g: 210, b: 228 },
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            cx = width / 2;
            cy = height / 2;
            scale = Math.min(width, height) * 0.40;
            draftMandala();
        }

        // Each element strokes itself in with `progress` (0..1)
        function draftMandala() {
            elements = [];
            let t = 0;
            const step = 14;
            const spokes = 8 + (variant % 3) * 4; // 8 / 12 / 16-fold symmetry

            // Concentric construction circles
            const radii = [0.22, 0.45, 0.68, 0.9, 1.0];
            radii.forEach(rf => {
                elements.push({ kind: 'circle', r: rf, start: t, dur: 90 });
                t += step;
            });

            // Radial measuring spokes
            for (let i = 0; i < spokes; i++) {
                elements.push({
                    kind: 'spoke',
                    angle: (i / spokes) * Math.PI * 2,
                    from: 0.22,
                    to: 1.0,
                    start: t,
                    dur: 50,
                });
                t += step * 0.5;
            }

            // Petal arcs between spokes, ring by ring
            [0.45, 0.68, 0.9].forEach(rf => {
                for (let i = 0; i < spokes; i++) {
                    const a0 = (i / spokes) * Math.PI * 2;
                    const a1 = ((i + 1) / spokes) * Math.PI * 2;
                    elements.push({
                        kind: 'petal',
                        r: rf,
                        a0: a0,
                        a1: a1,
                        bulge: 0.16 + 0.05 * (variant % 2),
                        start: t,
                        dur: 60,
                    });
                    t += step * 0.35;
                }
            });

            // Polygon rings — the architect's true geometry
            [0.34, 0.56, 0.79].forEach((rf, ri) => {
                elements.push({
                    kind: 'polygon',
                    r: rf,
                    sides: Math.max(4, Math.round(spokes / 2 + ri)),
                    rot: ri * 0.3,
                    start: t,
                    dur: 110,
                });
                t += step;
            });

            // Corner ticks — survey marks at the four quarters
            for (let i = 0; i < 4; i++) {
                elements.push({ kind: 'tick', angle: (i / 4) * Math.PI * 2 + Math.PI / 4, r: 1.08, start: t, dur: 30 });
                t += step * 0.5;
            }

            cycleStart = frame;
            variant++;
        }

        class Chalk {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.12;
                this.vy = (Math.random() - 0.5) * 0.12;
                this.size = 0.4 + Math.random() * 1.2;
                this.alpha = 0.05 + Math.random() * 0.15;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < -6 || this.x > width + 6 || this.y < -6 || this.y > height + 6) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = `rgb(${PALETTE.chalk.r}, ${PALETTE.chalk.g}, ${PALETTE.chalk.b})`;
                ctx.fillRect(this.x, this.y, this.size, this.size);
                ctx.restore();
            }
        }

        function elementProgress(el) {
            const t = frame - cycleStart - el.start;
            if (t <= 0) return 0;
            return Math.min(1, t / el.dur);
        }

        function drawGrid(glow) {
            ctx.save();
            ctx.strokeStyle = `rgb(${PALETTE.grid.r}, ${PALETTE.grid.g}, ${PALETTE.grid.b})`;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.05 + glow * 0.02;
            const gridStep = Math.max(60, scale / 5);
            const driftX = (frame * 0.06) % gridStep;
            ctx.beginPath();
            for (let x = -driftX; x <= width; x += gridStep) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = 0; y <= height; y += gridStep) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        function drawElement(el, p, glow) {
            if (p <= 0) return;
            const done = p >= 1;
            const heat = done ? glow : 0;
            const r = Math.round(PALETTE.line.r + (PALETTE.hot.r - PALETTE.line.r) * heat);
            const g = Math.round(PALETTE.line.g + (PALETTE.hot.g - PALETTE.line.g) * heat);
            const b = Math.round(PALETTE.line.b + (PALETTE.hot.b - PALETTE.line.b) * heat);

            ctx.save();
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.lineWidth = done ? 1.1 : 1.4;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.30 + p * 0.35 + heat * 0.25;
            ctx.shadowBlur = done ? 6 + heat * 10 : 4;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

            ctx.beginPath();
            if (el.kind === 'circle') {
                ctx.arc(cx, cy, el.r * scale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
            } else if (el.kind === 'spoke') {
                const r0 = el.from * scale;
                const r1 = (el.from + (el.to - el.from) * p) * scale;
                ctx.moveTo(cx + Math.cos(el.angle) * r0, cy + Math.sin(el.angle) * r0);
                ctx.lineTo(cx + Math.cos(el.angle) * r1, cy + Math.sin(el.angle) * r1);
            } else if (el.kind === 'petal') {
                // Petal: an arc bowed outward between two spokes
                const a0 = el.a0;
                const a1 = el.a0 + (el.a1 - el.a0) * p;
                const mid = (a0 + a1) / 2;
                const bowR = el.r * (1 + el.bulge) * scale;
                const bx = cx + Math.cos(mid) * bowR;
                const by = cy + Math.sin(mid) * bowR;
                const x0 = cx + Math.cos(a0) * el.r * scale;
                const y0 = cy + Math.sin(a0) * el.r * scale;
                const x1 = cx + Math.cos(a1) * el.r * scale;
                const y1 = cy + Math.sin(a1) * el.r * scale;
                ctx.moveTo(x0, y0);
                ctx.quadraticCurveTo(bx, by, x1, y1);
            } else if (el.kind === 'polygon') {
                const sides = el.sides;
                const total = sides * p;
                const full = Math.floor(total);
                const frac = total - full;
                for (let i = 0; i < full; i++) {
                    const aA = el.rot + (i / sides) * Math.PI * 2;
                    const aB = el.rot + ((i + 1) / sides) * Math.PI * 2;
                    const xA = cx + Math.cos(aA) * el.r * scale;
                    const yA = cy + Math.sin(aA) * el.r * scale;
                    const xB = cx + Math.cos(aB) * el.r * scale;
                    const yB = cy + Math.sin(aB) * el.r * scale;
                    if (i === 0) ctx.moveTo(xA, yA);
                    ctx.lineTo(xB, yB);
                }
                if (frac > 0 && full < sides) {
                    const aA = el.rot + (full / sides) * Math.PI * 2;
                    const aB = el.rot + ((full + 1) / sides) * Math.PI * 2;
                    const xA = cx + Math.cos(aA) * el.r * scale;
                    const yA = cy + Math.sin(aA) * el.r * scale;
                    const xB = cx + Math.cos(aB) * el.r * scale;
                    const yB = cy + Math.sin(aB) * el.r * scale;
                    if (full === 0) ctx.moveTo(xA, yA);
                    ctx.lineTo(xA + (xB - xA) * frac, yA + (yB - yA) * frac);
                }
            } else if (el.kind === 'tick') {
                const r0 = (el.r - 0.05 * p) * scale;
                const r1 = (el.r + 0.05 * p) * scale;
                ctx.moveTo(cx + Math.cos(el.angle) * r0, cy + Math.sin(el.angle) * r0);
                ctx.lineTo(cx + Math.cos(el.angle) * r1, cy + Math.sin(el.angle) * r1);
            }
            ctx.stroke();
            ctx.restore();
        }

        function animate() {
            frame++;
            ctx.clearRect(0, 0, width, height);

            // Cycle timing: total draw time, then hold, fade, re-draft
            const lastEnd = elements.length ? Math.max.apply(null, elements.map(e => e.start + e.dur)) : 0;
            const cycleT = frame - cycleStart;
            let glow = 0;
            let fade = 1;
            if (cycleT > lastEnd) {
                const held = cycleT - lastEnd;
                if (held < HOLD_FRAMES) {
                    glow = 0.5 + 0.5 * Math.sin((cycleT - lastEnd) * 0.03);
                } else if (held < HOLD_FRAMES + FADE_FRAMES) {
                    fade = 1 - (held - HOLD_FRAMES) / FADE_FRAMES;
                } else {
                    draftMandala();
                }
            }

            // Drafting-table ambience
            const tableGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.5);
            tableGlow.addColorStop(0, `rgba(30, 80, 110, ${0.06 + glow * 0.05})`);
            tableGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = tableGlow;
            ctx.fillRect(0, 0, width, height);

            drawGrid(glow);

            // Surveyor's light follows the hand
            if (pointer.x > -100) {
                const hand = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
                hand.addColorStop(0, 'rgba(140, 220, 240, 0.05)');
                hand.addColorStop(1, 'transparent');
                ctx.fillStyle = hand;
                ctx.fillRect(0, 0, width, height);
            }

            ctx.save();
            ctx.globalAlpha = fade;
            elements.forEach(el => drawElement(el, elementProgress(el), glow));
            ctx.restore();

            // Center bindu — the first mark of the architect
            const binduP = Math.min(1, cycleT / 40);
            if (binduP > 0) {
                ctx.save();
                ctx.globalAlpha = (0.6 + glow * 0.4) * fade;
                ctx.fillStyle = `rgb(${PALETTE.hot.r}, ${PALETTE.hot.g}, ${PALETTE.hot.b})`;
                ctx.shadowBlur = 16 + glow * 14;
                ctx.shadowColor = `rgba(${PALETTE.hot.r}, ${PALETTE.hot.g}, ${PALETTE.hot.b}, 0.9)`;
                ctx.beginPath();
                ctx.arc(cx, cy, 2.5 + binduP * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            chalk.forEach(c => { c.update(); c.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < CHALK_COUNT; i++) {
            chalk.push(new Chalk());
        }

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });
        window.addEventListener('pointerleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
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
        nav.classList.toggle('scrolled', window.pageYOffset > 100);
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

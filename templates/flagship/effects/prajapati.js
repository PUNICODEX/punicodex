/**
 * PRAJĀPATI — Lord of Creatures
 * Hero canvas: proliferating seed-motifs branching outward from a single point
 * of origin, blooming, scattering pollen, then dying back and regrowing.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Seed Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('seed-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let branches = [];
        let blooms = [];
        let pollen = [];
        let rafId = 0;
        let frame = 0;
        let regrowTimer = 0;
        const pointer = { x: -9999, y: -9999 };

        const MAX_BRANCHES = 130;
        const POLLEN_COUNT = 90;

        const PALETTE = {
            stem: { r: 96, g: 168, b: 112 },      // Living green
            stemDeep: { r: 42, g: 96, b: 58 },    // Old growth
            seed: { r: 232, g: 200, b: 104 },     // Seed gold
            bloom: { r: 244, g: 226, b: 160 },    // Bloom cream
            pollen: { r: 210, g: 232, b: 168 },   // Pollen mist
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Branch {
            constructor(x, y, angle, generation, length) {
                this.points = [{ x: x, y: y }];
                this.angle = angle;
                this.generation = generation;
                this.remaining = length;
                this.speed = 1.6 + Math.random() * 1.4;
                this.curve = (Math.random() - 0.5) * 0.12;
                this.thickness = Math.max(0.6, 3.2 - generation * 0.7);
                this.age = 0;
                this.alive = true;
                this.seedClock = 20 + Math.random() * 30;
            }

            head() {
                return this.points[this.points.length - 1];
            }

            update() {
                if (!this.alive) return;
                this.age++;

                // Gentle phototropic wander, bent slightly toward the pointer
                this.angle += this.curve + (Math.random() - 0.5) * 0.06;
                const h = this.head();
                const pdx = pointer.x - h.x;
                const pdy = pointer.y - h.y;
                const pd = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pd < 260 && pd > 1) {
                    const toPointer = Math.atan2(pdy, pdx);
                    let diff = toPointer - this.angle;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    this.angle += diff * 0.012 * (1 - pd / 260);
                }

                const step = Math.min(this.speed, this.remaining);
                const nx = h.x + Math.cos(this.angle) * step;
                const ny = h.y + Math.sin(this.angle) * step;
                this.points.push({ x: nx, y: ny });
                this.remaining -= step;
                if (this.points.length > 90) this.points.shift();

                // Drop a seed-bloom at nodes
                this.seedClock--;
                if (this.seedClock <= 0) {
                    this.seedClock = 40 + Math.random() * 60;
                    if (blooms.length < 220) {
                        blooms.push(new Bloom(nx, ny, this.generation));
                    }
                }

                // Split or die at the end of the run
                if (this.remaining <= 0 || nx < -40 || nx > width + 40 || ny < -40 || ny > height + 40) {
                    this.alive = false;
                    if (this.generation < 4 && branches.length < MAX_BRANCHES) {
                        const kids = this.generation === 0 ? 3 : 1 + Math.floor(Math.random() * 2);
                        for (let i = 0; i < kids; i++) {
                            const spread = 0.45 + Math.random() * 0.5;
                            const dir = i % 2 === 0 ? 1 : -1;
                            branches.push(new Branch(
                                nx,
                                ny,
                                this.angle + dir * spread * (0.4 + Math.random() * 0.8),
                                this.generation + 1,
                                this.remaining * 0 + (120 - this.generation * 22) * (0.7 + Math.random() * 0.6)
                            ));
                        }
                        if (blooms.length < 220) blooms.push(new Bloom(nx, ny, 0));
                    }
                }
            }

            draw() {
                if (this.points.length < 2) return;
                const fade = this.alive ? 1 : Math.max(0, 1 - this.age * 0.002);
                const mix = Math.min(1, this.generation / 4);
                const r = Math.round(PALETTE.stem.r + (PALETTE.stemDeep.r - PALETTE.stem.r) * mix);
                const g = Math.round(PALETTE.stem.g + (PALETTE.stemDeep.g - PALETTE.stem.g) * mix);
                const b = Math.round(PALETTE.stem.b + (PALETTE.stemDeep.b - PALETTE.stem.b) * mix);

                ctx.save();
                ctx.globalAlpha = 0.55 * fade;
                ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.lineWidth = this.thickness;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i < this.points.length; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
                ctx.stroke();

                // Luminous growing tip
                if (this.alive) {
                    const h = this.head();
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = `rgba(${PALETTE.seed.r}, ${PALETTE.seed.g}, ${PALETTE.seed.b}, 0.9)`;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = `rgba(${PALETTE.seed.r}, ${PALETTE.seed.g}, ${PALETTE.seed.b}, 0.8)`;
                    ctx.beginPath();
                    ctx.arc(h.x, h.y, this.thickness * 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        class Bloom {
            constructor(x, y, generation) {
                this.x = x;
                this.y = y;
                this.r = 1;
                this.maxR = 4 + (4 - generation) * 2.2 + Math.random() * 3;
                this.alpha = 0.9;
                this.ringAlpha = 0.5;
            }

            update() {
                if (this.r < this.maxR) this.r += 0.25;
                else {
                    this.alpha -= 0.004;
                    this.ringAlpha -= 0.006;
                }
                return this.alpha > 0;
            }

            draw() {
                ctx.save();
                // Seed core
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = `rgba(${PALETTE.bloom.r}, ${PALETTE.bloom.g}, ${PALETTE.bloom.b}, 1)`;
                ctx.shadowBlur = 12;
                ctx.shadowColor = `rgba(${PALETTE.seed.r}, ${PALETTE.seed.g}, ${PALETTE.seed.b}, 0.9)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                // Expanding halo ring
                ctx.shadowBlur = 0;
                ctx.globalAlpha = this.ringAlpha;
                ctx.strokeStyle = `rgba(${PALETTE.seed.r}, ${PALETTE.seed.g}, ${PALETTE.seed.b}, 1)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r * 2.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        class Pollen {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.25;
                this.vy = -(0.12 + Math.random() * 0.35);
                this.size = 0.6 + Math.random() * 1.8;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.1 + Math.random() * 0.3;
            }

            update() {
                this.phase += 0.02;
                this.x += this.vx + Math.sin(this.phase) * 0.2;
                this.y += this.vy;
                if (this.y < -12 || this.x < -12 || this.x > width + 12) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha * (0.7 + 0.3 * Math.sin(this.phase * 2));
                ctx.fillStyle = `rgb(${PALETTE.pollen.r}, ${PALETTE.pollen.g}, ${PALETTE.pollen.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function seedOriginBurst() {
            const ox = width / 2;
            const oy = height * 0.62;
            const roots = 5;
            for (let i = 0; i < roots; i++) {
                const angle = -Math.PI / 2 + (i - (roots - 1) / 2) * 0.55;
                branches.push(new Branch(ox, oy, angle, 0, 150 + Math.random() * 80));
            }
            blooms.push(new Bloom(ox, oy, 0));
        }

        resize();
        window.addEventListener('resize', resize);
        seedOriginBurst();
        for (let i = 0; i < POLLEN_COUNT; i++) {
            pollen.push(new Pollen());
        }

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });
        window.addEventListener('pointerleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
        }, { passive: true });

        function animate() {
            frame++;
            ctx.clearRect(0, 0, width, height);

            // Deep verdant ground-glow
            const glow = ctx.createRadialGradient(
                width / 2, height * 0.62, 0,
                width / 2, height * 0.62, Math.min(width, height) * 0.55
            );
            glow.addColorStop(0, 'rgba(38, 84, 52, 0.10)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            branches = branches.filter(b => b.alive || b.age < 600);
            branches.forEach(b => { b.update(); b.draw(); });

            blooms = blooms.filter(b => b.update());
            blooms.forEach(b => b.draw());

            pollen.forEach(p => { p.update(); p.draw(); });

            // When the growth exhausts itself, rest, then proliferate again
            if (branches.every(b => !b.alive)) {
                regrowTimer++;
                if (regrowTimer > 240) {
                    regrowTimer = 0;
                    branches = [];
                    seedOriginBurst();
                }
            }

            rafId = requestAnimationFrame(animate);
        }

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

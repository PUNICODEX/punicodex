/**
 * AHURA MAZDĀ FLAGSHIP TEMPLE — WINGED RADIANCE CANVAS
 * Faravahar-style winged solar radiance + rising light motes
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Radiance Canvas ──────────────────────────────────────────────────── */
    const canvas = document.getElementById('radiance-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let motes = [];
        let pulses = [];
        let frameCount = 0;
        let running = true;

        const PALETTE = {
            gold: { r: 232, g: 193, b: 90 },
            amber: { r: 217, g: 142, b: 43 },
            ivory: { r: 255, g: 243, b: 214 },
            bronze: { r: 138, g: 96, b: 32 }
        };

        // Pointer state — the radiance leans gently toward the visitor
        const pointer = { x: 0.5, y: 0.35, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class LightMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = -(Math.random() * 0.4 + 0.15);
                this.size = Math.random() * 1.8 + 0.6;
                this.opacity = Math.random() * 0.5 + 0.15;
                this.phase = Math.random() * Math.PI * 2;
                this.warm = Math.random() < 0.6;
            }

            update() {
                this.x += this.vx + Math.sin(frameCount * 0.01 + this.phase) * 0.1;
                this.y += this.vy;
                if (this.y < -10 || this.x < -10 || this.x > width + 10) {
                    this.reset(false);
                }
            }

            draw() {
                const c = this.warm ? PALETTE.gold : PALETTE.ivory;
                const twinkle = 0.7 + Math.sin(frameCount * 0.05 + this.phase) * 0.3;
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class PulseRing {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = 10;
                this.opacity = 0.5;
            }

            update() {
                this.radius += 3.2;
                this.opacity *= 0.955;
                return this.opacity > 0.01;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Faravahar-style wing: layered feather arcs sweeping outward from center
        function drawWing(cx, cy, dir, breathe) {
            const layers = 4;
            for (let layer = 0; layer < layers; layer++) {
                const span = width * (0.16 + layer * 0.07);
                const lift = height * (0.10 - layer * 0.014) * breathe;
                const feathers = 7 - layer;
                ctx.save();
                ctx.globalAlpha = 0.10 - layer * 0.015;
                ctx.strokeStyle = layer % 2 === 0
                    ? `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`
                    : `rgb(${PALETTE.amber.r}, ${PALETTE.amber.g}, ${PALETTE.amber.b})`;
                ctx.lineWidth = 2.5 - layer * 0.4;
                ctx.shadowBlur = 12;
                ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.5)`;
                for (let i = 0; i < feathers; i++) {
                    const t = i / feathers;
                    const startX = cx + dir * 12;
                    const startY = cy + t * 14 - 7;
                    const endX = cx + dir * span * (0.55 + t * 0.5);
                    const endY = cy - lift * (0.4 + t * 0.9) + t * 24;
                    const ctrlX = cx + dir * span * 0.5;
                    const ctrlY = cy - lift * 1.35;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Solar disc with two counter-rotating ray rings
        function drawSunDisc(cx, cy, breathe) {
            const baseRadius = Math.min(width, height) * 0.085;

            // Halo
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 4);
            halo.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.20 * breathe})`);
            halo.addColorStop(0.5, `rgba(${PALETTE.amber.r}, ${PALETTE.amber.g}, ${PALETTE.amber.b}, ${0.07 * breathe})`);
            halo.addColorStop(1, 'transparent');
            ctx.save();
            ctx.fillStyle = halo;
            ctx.fillRect(cx - baseRadius * 4, cy - baseRadius * 4, baseRadius * 8, baseRadius * 8);
            ctx.restore();

            // Long rays, slow rotation
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(frameCount * 0.0012);
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const len = baseRadius * (2.1 + Math.sin(frameCount * 0.02 + i) * 0.25);
                ctx.save();
                ctx.rotate(angle);
                ctx.globalAlpha = 0.16;
                ctx.strokeStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(baseRadius * 1.1, 0);
                ctx.lineTo(len, 0);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();

            // Short rays, counter-rotation
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-frameCount * 0.0018);
            for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * Math.PI * 2;
                const len = baseRadius * 1.55;
                ctx.save();
                ctx.rotate(angle);
                ctx.globalAlpha = 0.10;
                ctx.strokeStyle = `rgb(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(baseRadius * 1.1, 0);
                ctx.lineTo(len, 0);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();

            // Disc core + ring
            ctx.save();
            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
            core.addColorStop(0, `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, ${0.85 * breathe})`);
            core.addColorStop(0.7, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.45 * breathe})`);
            core.addColorStop(1, `rgba(${PALETTE.amber.r}, ${PALETTE.amber.g}, ${PALETTE.amber.b}, ${0.12 * breathe})`);
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 16;
            ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.9)`;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius * 1.12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        function initMotes() {
            motes = [];
            const count = Math.min(220, Math.floor(width / 6));
            for (let i = 0; i < count; i++) {
                motes.push(new LightMote());
            }
        }

        resize();
        initMotes();
        window.addEventListener('resize', () => {
            resize();
            initMotes();
        });

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX / window.innerWidth;
            pointer.y = e.clientY / window.innerHeight;
            pointer.active = true;
        }, { passive: true });

        window.addEventListener('pointerdown', (e) => {
            pulses.push(new PulseRing(e.clientX, e.clientY));
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const breathe = 0.85 + Math.sin(frameCount * 0.015) * 0.15;
            const cx = width * (0.5 + (pointer.active ? (pointer.x - 0.5) * 0.04 : 0));
            const cy = height * (0.30 + (pointer.active ? (pointer.y - 0.35) * 0.03 : 0));

            // Deep ambient glow at the top
            const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
            ambient.addColorStop(0, `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, 0.08)`);
            ambient.addColorStop(1, 'transparent');
            ctx.fillStyle = ambient;
            ctx.fillRect(0, 0, width, height);

            // Wings behind the disc
            drawWing(cx, cy, -1, breathe);
            drawWing(cx, cy, 1, breathe);

            // Solar disc
            drawSunDisc(cx, cy, breathe);

            // Rising light motes
            motes.forEach(m => { m.update(); m.draw(); });

            // Pointer pulses
            pulses = pulses.filter(p => {
                p.draw();
                return p.update();
            });

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
            const scrollY = window.pageYOffset;
            const hero = document.getElementById('hero');
            if (hero) {
                const heroBottom = hero.offsetTop + hero.offsetHeight;
                if (scrollY < heroBottom) {
                    mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
            }
        }, { passive: true });
    }

})();

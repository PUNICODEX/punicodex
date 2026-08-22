/**
 * VIṢṆU — The Preserver, Sustainer of the Cosmos
 * Four rotating chakra rings, serene blue-gold
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Chakra Rings Canvas System
    // ============================
    const canvas = document.getElementById('chakra-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let motes = [];
        let rays = [];
        let frameCount = 0;
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.45, active: false };

        // Palette: cosmic deep blue, serene sky, gold of the Sudarśana discus
        const PALETTE = {
            deepBlue: { r: 16, g: 32, b: 96 },
            blue: { r: 47, g: 85, b: 212 },
            sky: { r: 120, g: 170, b: 255 },
            gold: { r: 255, g: 204, b: 92 },
            paleGold: { r: 255, g: 232, b: 170 },
            white: { r: 245, g: 248, b: 255 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ---- Offscreen sprite atlas: a single chakra spoke-disc unit ----
        const sparkSprite = (function buildSparkSprite() {
            const size = 24;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');
            const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 248, 230, 1)');
            grad.addColorStop(0.4, 'rgba(255, 204, 92, 0.8)');
            grad.addColorStop(1, 'rgba(255, 204, 92, 0)');
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, size, size);
            return sprite;
        })();

        // The four rotating rings — each its own radius, speed, direction
        const rings = [
            { scale: 0.14, speed: 0.0035, dir: 1, spokes: 8, color: PALETTE.gold, lineWidth: 2.0, glow: 18 },
            { scale: 0.21, speed: 0.0022, dir: -1, spokes: 12, color: PALETTE.sky, lineWidth: 1.5, glow: 12 },
            { scale: 0.28, speed: 0.0014, dir: 1, spokes: 16, color: PALETTE.gold, lineWidth: 1.2, glow: 10 },
            { scale: 0.36, speed: 0.0009, dir: -1, spokes: 24, color: PALETTE.blue, lineWidth: 1.0, glow: 8 }
        ];

        function drawChakraRings(cx, cy, baseRadius, t) {
            rings.forEach((ring, idx) => {
                const radius = baseRadius * ring.scale * (1 + Math.sin(t * 0.4 + idx) * 0.015);
                const rotation = t * ring.speed * 1000 * ring.dir;
                const breathe = 0.5 + Math.sin(t * 0.8 + idx * 1.3) * 0.5;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(rotation);

                // The ring itself
                ctx.globalAlpha = 0.28 + breathe * 0.12;
                ctx.strokeStyle = `rgba(${ring.color.r}, ${ring.color.g}, ${ring.color.b}, 1)`;
                ctx.lineWidth = ring.lineWidth;
                ctx.shadowBlur = ring.glow;
                ctx.shadowColor = `rgba(${ring.color.r}, ${ring.color.g}, ${ring.color.b}, 0.7)`;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.stroke();

                // Spokes — the discus blades
                ctx.globalAlpha = 0.18 + breathe * 0.10;
                for (let i = 0; i < ring.spokes; i++) {
                    const a = (i / ring.spokes) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * radius * 0.82, Math.sin(a) * radius * 0.82);
                    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
                    ctx.stroke();
                }

                // Jewel node on each spoke tip
                ctx.shadowBlur = 0;
                for (let i = 0; i < ring.spokes; i++) {
                    const a = (i / ring.spokes) * Math.PI * 2;
                    const nx = Math.cos(a) * radius;
                    const ny = Math.sin(a) * radius;
                    ctx.globalAlpha = 0.35 + breathe * 0.25;
                    ctx.drawImage(sparkSprite, nx - 5, ny - 5, 10, 10);
                }

                ctx.restore();
            });

            // The still center — Viṣṇu's serene core
            const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.1);
            core.addColorStop(0, 'rgba(245, 248, 255, 0.35)');
            core.addColorStop(0.5, 'rgba(255, 204, 92, 0.18)');
            core.addColorStop(1, 'transparent');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 10;
                this.vy = -(0.1 + Math.random() * 0.3);
                this.vx = (Math.random() - 0.5) * 0.1;
                this.size = 1 + Math.random() * 2.5;
                this.opacity = 0.15 + Math.random() * 0.4;
                this.phase = Math.random() * Math.PI * 2;
                this.golden = Math.random() < 0.5;
            }

            update() {
                this.phase += 0.02;
                this.y += this.vy;
                this.x += this.vx + Math.sin(this.phase) * 0.15;
                if (this.y < -15) this.reset(false);
            }

            draw() {
                const c = this.golden ? PALETTE.paleGold : PALETTE.sky;
                const twinkle = this.opacity * (0.55 + Math.sin(this.phase * 3) * 0.45);
                ctx.save();
                ctx.globalAlpha = twinkle;
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 1)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Ray {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.speed = 0.0004 + Math.random() * 0.0006;
                this.width = 0.03 + Math.random() * 0.05;
                this.opacity = 0.015 + Math.random() * 0.03;
                this.length = 0.6 + Math.random() * 0.4;
            }

            update() {
                this.angle += this.speed;
            }

            draw(cx, cy, maxR) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(this.angle);
                const grad = ctx.createLinearGradient(0, 0, maxR * this.length, 0);
                grad.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${this.opacity})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, maxR * this.length, -this.width, this.width);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 140; i++) motes.push(new Mote());
        for (let i = 0; i < 10; i++) rays.push(new Ray());

        window.addEventListener('mousemove', (e) => {
            pointer.x = e.clientX / width;
            pointer.y = e.clientY / height;
            pointer.active = true;
        }, { passive: true });

        // Pause the loop when the tab is hidden
        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused && rafId === null) rafId = requestAnimationFrame(animate);
        });

        function animate() {
            rafId = null;
            if (paused) return;
            frameCount++;
            const t = frameCount / 60;
            ctx.clearRect(0, 0, width, height);

            // Cosmic ocean background — deep blue depth, calm and vast
            const ocean = ctx.createLinearGradient(0, 0, 0, height);
            ocean.addColorStop(0, 'rgba(16, 32, 96, 0.10)');
            ocean.addColorStop(0.5, 'rgba(10, 20, 60, 0.06)');
            ocean.addColorStop(1, 'rgba(6, 12, 40, 0.12)');
            ctx.fillStyle = ocean;
            ctx.fillRect(0, 0, width, height);

            // Slow concentric drift of the cosmic center toward the pointer
            const cx = (pointer.active ? pointer.x : 0.5 + Math.sin(t * 0.1) * 0.03) * width;
            const cy = (pointer.active ? pointer.y : 0.45 + Math.cos(t * 0.08) * 0.02) * height;
            const baseRadius = Math.min(width, height);

            // Rotating divine rays behind the rings
            rays.forEach(r => { r.update(); r.draw(cx, cy, baseRadius); });

            // Serene halo wash
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.45);
            halo.addColorStop(0, 'rgba(120, 170, 255, 0.08)');
            halo.addColorStop(0.6, 'rgba(255, 204, 92, 0.04)');
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, width, height);

            // The four chakra rings
            drawChakraRings(cx, cy, baseRadius, t);

            // Drifting motes of preserved light
            motes.forEach(m => { m.update(); m.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);
    } else if (canvas) {
        canvas.style.display = 'none';
    }

    // ============================
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
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
        revealElements.forEach(el => {
            el.classList.add('revealed');
            el.classList.add('visible');
        });
    }

    // ============================
    // Navigation
    // ============================
    const nav = document.querySelector('.main-nav');
    window.addEventListener('scroll', () => {
        if (!nav) return;
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

})();

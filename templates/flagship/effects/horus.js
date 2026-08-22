/**
 * HORUS — God of the Sky, Kingship & the Falcon
 * A falcon wing sweeping the heavens beneath the flare of the Eye.
 * Interactive Layer: Falconwing Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Falconwing Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('falconwing-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let feathers = [];
            let clouds = [];
            let running = true;
            let wing = { phase: 'idle', progress: 0, side: 1, cooldown: 240 };
            let eyeFlare = 0;
            let lastFlare = 0;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            // ── Wedjat — the Eye of Horus ──
            function drawEye(t, cx, cy, s) {
                const flare = eyeFlare;

                // Flare halo behind everything
                if (flare > 0.01) {
                    const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 6);
                    burst.addColorStop(0, `rgba(255, 226, 150, ${0.4 * flare})`);
                    burst.addColorStop(0.4, `rgba(240, 190, 100, ${0.16 * flare})`);
                    burst.addColorStop(1, 'transparent');
                    ctx.fillStyle = burst;
                    ctx.fillRect(cx - s * 6, cy - s * 6, s * 12, s * 12);
                }

                ctx.save();
                ctx.translate(cx, cy);
                const alpha = 0.55 + flare * 0.45;
                ctx.strokeStyle = `rgba(255, 216, 140, ${alpha})`;
                ctx.fillStyle = `rgba(255, 226, 160, ${alpha})`;
                ctx.lineWidth = Math.max(2, s * 0.07);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowBlur = 14 + flare * 40;
                ctx.shadowColor = 'rgba(255, 210, 120, 0.9)';

                // Almond outline
                ctx.beginPath();
                ctx.moveTo(-s * 1.15, 0);
                ctx.quadraticCurveTo(0, -s * 0.85, s * 1.15, 0);
                ctx.quadraticCurveTo(0, s * 0.62, -s * 1.15, 0);
                ctx.stroke();

                // Iris
                const irisPulse = 1 + Math.sin(t * 0.002) * 0.06 + flare * 0.25;
                ctx.beginPath();
                ctx.arc(0, -s * 0.08, s * 0.30 * irisPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(40, 60, 110, ${0.85 * alpha})`;
                ctx.beginPath();
                ctx.arc(0, -s * 0.08, s * 0.15 * irisPulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 226, 160, ${alpha})`;

                // Brow line above
                ctx.beginPath();
                ctx.moveTo(-s * 1.05, -s * 0.62);
                ctx.quadraticCurveTo(0, -s * 1.15, s * 1.05, -s * 0.62);
                ctx.stroke();

                // Tear drop + spiral curl beneath
                ctx.beginPath();
                ctx.moveTo(s * 0.28, s * 0.34);
                ctx.quadraticCurveTo(s * 0.24, s * 1.0, -s * 0.15, s * 1.1);
                ctx.moveTo(-s * 0.35, s * 0.4);
                ctx.quadraticCurveTo(-s * 0.75, s * 0.95, -s * 1.15, s * 0.7);
                ctx.quadraticCurveTo(-s * 1.3, s * 0.55, -s * 1.15, s * 0.5);
                ctx.stroke();

                ctx.restore();
            }

            // ── The falcon wing sweep crossing the sky ──
            function drawWing(t) {
                if (wing.phase === 'idle') {
                    wing.cooldown--;
                    if (wing.cooldown <= 0) {
                        wing.phase = 'sweep';
                        wing.progress = 0;
                        wing.side = Math.random() < 0.5 ? 1 : -1;
                    }
                    return;
                }

                wing.progress += 0.006;
                if (wing.progress >= 1) {
                    wing.phase = 'idle';
                    wing.cooldown = 300 + Math.random() * 400;
                    return;
                }

                // Ease across: fast in, slow out
                const p = wing.progress;
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                const spanW = width * 0.9;
                const startX = wing.side === 1 ? -spanW * 0.4 : width + spanW * 0.4;
                const endX = wing.side === 1 ? width + spanW * 0.4 : -spanW * 0.4;
                const wx = startX + (endX - startX) * eased;
                const wy = height * (0.22 + 0.1 * Math.sin(p * Math.PI));

                const fade = Math.sin(p * Math.PI); // fade in/out across the sweep
                const size = Math.min(width, height) * 0.30;

                ctx.save();
                ctx.translate(wx, wy);
                ctx.scale(wing.side, 1);
                ctx.rotate(Math.sin(p * Math.PI * 2) * 0.12);
                ctx.globalAlpha = fade * 0.5;

                // Layered primary feathers fanning back
                for (let f = 0; f < 7; f++) {
                    const frac = f / 6;
                    const len = size * (1.5 - frac * 0.7);
                    const droop = size * (0.25 + frac * 0.75);
                    const grad = ctx.createLinearGradient(0, 0, -len, droop);
                    grad.addColorStop(0, 'rgba(70, 90, 130, 0.75)');
                    grad.addColorStop(0.6, 'rgba(110, 130, 170, 0.45)');
                    grad.addColorStop(1, 'rgba(230, 200, 140, 0)');
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 9 - frac * 5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(-len * 0.5, droop * 0.3 - size * 0.2, -len, droop);
                    ctx.stroke();
                }

                // Leading edge highlight
                ctx.strokeStyle = 'rgba(255, 224, 160, 0.6)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(size * 0.15, -size * 0.1);
                ctx.quadraticCurveTo(-size * 0.5, -size * 0.5, -size * 1.3, size * 0.15);
                ctx.stroke();

                ctx.restore();
            }

            // ── Wind-borne feather motes ──
            class Feather {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.x = Math.random() * width;
                    this.y = scatter ? Math.random() * height : -20;
                    this.vy = 0.2 + Math.random() * 0.5;
                    this.sway = 20 + Math.random() * 40;
                    this.phase = Math.random() * Math.PI * 2;
                    this.size = 2 + Math.random() * 4;
                    this.rot = Math.random() * Math.PI;
                    this.rotSpeed = (Math.random() - 0.5) * 0.01;
                    this.opacity = 0.15 + Math.random() * 0.25;
                }

                update(t) {
                    this.y += this.vy;
                    this.x += Math.sin(t * 0.001 + this.phase) * 0.5;
                    this.rot += this.rotSpeed;
                    if (this.y > height + 20) this.reset(false);
                }

                draw() {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rot);
                    ctx.globalAlpha = this.opacity;
                    ctx.strokeStyle = '#E8D2A0';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size);
                    ctx.quadraticCurveTo(this.size * 0.7, 0, 0, this.size);
                    ctx.quadraticCurveTo(-this.size * 0.7, 0, 0, -this.size);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // ── Slow sky clouds ──
            class Cloud {
                constructor() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height * 0.5;
                    this.r = 80 + Math.random() * 140;
                    this.vx = 0.08 + Math.random() * 0.15;
                    this.opacity = 0.03 + Math.random() * 0.04;
                }

                update() {
                    this.x += this.vx;
                    if (this.x - this.r > width) this.x = -this.r;
                }

                draw() {
                    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
                    g.addColorStop(0, `rgba(150, 170, 205, ${this.opacity})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            resize();
            for (let i = 0; i < 50; i++) feathers.push(new Feather());
            for (let i = 0; i < 6; i++) clouds.push(new Cloud());

            window.addEventListener('resize', resize);

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                ctx.clearRect(0, 0, width, height);

                // Daybreak-sky wash
                const sky = ctx.createLinearGradient(0, 0, 0, height);
                sky.addColorStop(0, 'rgba(38, 58, 96, 0.18)');
                sky.addColorStop(0.55, 'rgba(90, 110, 150, 0.07)');
                sky.addColorStop(1, 'transparent');
                ctx.fillStyle = sky;
                ctx.fillRect(0, 0, width, height);

                clouds.forEach(c => { c.update(); c.draw(); });

                // Eye flare cadence — every ~7s
                if (t - lastFlare > 7000) {
                    lastFlare = t;
                    eyeFlare = 1;
                }
                eyeFlare *= 0.965;

                const eyeSize = Math.min(width, height) * 0.075;
                drawEye(t, width * 0.5, height * 0.30, eyeSize);

                drawWing(t);

                feathers.forEach(f => { f.update(t); f.draw(); });

                requestAnimationFrame(animate);
            }

            requestAnimationFrame(animate);
        }
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

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            if (hero) {
                const scrollY = window.pageYOffset;
                if (scrollY < hero.offsetTop + hero.offsetHeight) {
                    mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
            }
        }, { passive: true });
    }

})();

/**
 * ENLIL — Lord of Wind, Storms, and Kingship
 * Interactive Layer: Cyclonic Wind Spiral, Crown Flare, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Cyclone Canvas
    // ============================
    const canvas = document.getElementById('cyclone-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let windMotes = [];
        let crownFlareStart = -9999;
        let nextCrownFlare = 2500;
        let running = true;
        let rafId = null;

        const MOTE_COUNT = 240;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function cycloneX() { return width / 2; }
        function cycloneY() { return height * 0.48; }
        function maxRadius() { return Math.min(width, height) * 0.55; }

        class WindMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.arm = Math.random() < 0.5 ? 0 : Math.PI;
                this.radius = scatter
                    ? 20 + Math.random() * maxRadius()
                    : 15 + Math.random() * 30;
                this.angle = this.arm + this.radius * 0.012 + (Math.random() - 0.5) * 0.6;
                this.spin = 0.9 + Math.random() * 0.9;
                this.size = Math.random() * 1.6 + 0.5;
                this.alpha = Math.random() * 0.35 + 0.12;
                this.drift = 0.08 + Math.random() * 0.25;
            }

            update() {
                const angular = this.spin * (28 / (this.radius + 24));
                this.angle += angular;
                this.radius += this.drift;
                if (this.radius > maxRadius()) this.reset(false);
            }

            draw() {
                const cx = cycloneX();
                const cy = cycloneY();
                const x = cx + Math.cos(this.angle) * this.radius;
                const y = cy + Math.sin(this.angle) * this.radius * 0.62;
                const tx = -Math.sin(this.angle);
                const ty = Math.cos(this.angle) * 0.62;
                const len = 5 + this.size * 6;
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.strokeStyle = '#C8D0D8';
                ctx.lineWidth = this.size;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x - tx * len, y - ty * len);
                ctx.lineTo(x + tx * len, y + ty * len);
                ctx.stroke();
                ctx.restore();
            }
        }

        function crownEnvelope(time) {
            const t = (time - crownFlareStart) / 1600;
            if (t < 0 || t > 1) return 0;
            return Math.pow(1 - t, 2);
        }

        function drawCycloneCore(time) {
            const cx = cycloneX();
            const cy = cycloneY();
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius() * 0.5);
            g.addColorStop(0, 'rgba(190, 200, 210, 0.10)');
            g.addColorStop(0.5, 'rgba(140, 155, 170, 0.04)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);

            // Slow inner eye ring
            ctx.save();
            ctx.globalAlpha = 0.08 + 0.04 * Math.sin(time * 0.001);
            ctx.strokeStyle = '#D8E0E8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 42, 26, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        function drawCrown(time) {
            const cx = width / 2;
            const cy = height * 0.11;
            const w = Math.min(width, height) * 0.17;
            const h = w * 0.45;
            const env = crownEnvelope(time);
            const glow = 10 + env * 48;

            ctx.save();
            ctx.shadowBlur = glow;
            ctx.shadowColor = 'rgba(216, 184, 88, 0.9)';

            // Crown silhouette: band with five triangular spikes
            ctx.beginPath();
            ctx.moveTo(cx - w / 2, cy + h * 0.35);
            for (let i = 0; i < 5; i++) {
                const peakX = cx - w / 2 + ((i + 0.5) * w) / 5;
                const peakY = cy - h * (i === 2 ? 0.85 : 0.55);
                ctx.lineTo(peakX, peakY);
                ctx.lineTo(cx - w / 2 + ((i + 1) * w) / 5, cy + h * 0.1);
            }
            ctx.lineTo(cx + w / 2, cy + h * 0.35);
            ctx.closePath();
            ctx.fillStyle = 'rgba(30, 26, 16, 0.9)';
            ctx.fill();
            ctx.strokeStyle = `rgba(216, 184, 88, ${0.35 + env * 0.55})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.restore();

            // Radiating burst spikes during a flare
            if (env > 0.05) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.globalCompositeOperation = 'lighter';
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const len = w * (0.9 + 0.5 * Math.sin(i * 2.7)) * env + w * 0.3;
                    const alpha = env * 0.4;
                    const g = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
                    g.addColorStop(0, `rgba(240, 215, 140, ${alpha})`);
                    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.strokeStyle = g;
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        resizeCanvas();
        for (let i = 0; i < MOTE_COUNT; i++) {
            windMotes.push(new WindMote());
        }

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            ctx.clearRect(0, 0, width, height);

            drawCycloneCore(time);
            windMotes.forEach(m => { m.update(); m.draw(); });

            if (time > nextCrownFlare) {
                crownFlareStart = time;
                nextCrownFlare = time + 4200 + Math.random() * 3800;
            }
            drawCrown(time);

            if (running) rafId = requestAnimationFrame(animate);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(animate);
            }
        });

        rafId = requestAnimationFrame(animate);
        }
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
        revealElements.forEach(el => el.classList.add('revealed'));
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

    // ============================
    // Smooth Scroll for Anchor Links
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================
    // Mascot Parallax
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero') || document.querySelector('.hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

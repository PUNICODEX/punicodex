/**
 * ASTART — Lady of Love, War, and the Evening Star
 * Interactive Layer: Evening-Star Flare, Warfire, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Evening Star Canvas
    // ============================
    const canvas = document.getElementById('evenstar-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let stars = [];
        let embers = [];
        let flareStart = -9999;
        let nextFlare = 3000;
        let running = true;
        let rafId = null;

        const EMBER_CAP = 130;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedStars();
        }

        function starX() { return width / 2; }
        function starY() { return height * 0.28; }

        function seedStars() {
            stars = [];
            for (let i = 0; i < 130; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height * 0.75,
                    size: Math.random() * 1.4 + 0.4,
                    phase: Math.random() * Math.PI * 2,
                    speed: Math.random() * 0.03 + 0.008
                });
            }
        }

        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(Math.random() * 0.9 + 0.25);
                this.vx = (Math.random() - 0.5) * 0.35;
                this.size = Math.random() * 2 + 0.5;
                this.phase = Math.random() * Math.PI * 2;
                this.flicker = Math.random() * 0.08 + 0.03;
                this.rose = Math.random() < 0.5;
            }

            update() {
                this.x += this.vx + Math.sin(this.phase) * 0.25;
                this.y += this.vy;
                this.phase += this.flicker;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const alpha = 0.12 + 0.38 * (0.5 + 0.5 * Math.sin(this.phase));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.rose ? '#E89080' : '#D84838';
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.rose ? '#E8A088' : '#B02820';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function flareEnvelope(time) {
            const t = (time - flareStart) / 1400;
            if (t < 0 || t > 1) return 0;
            return Math.pow(1 - t, 2);
        }

        function drawStarfield() {
            stars.forEach(s => {
                s.phase += s.speed;
                const alpha = 0.15 + 0.4 * (0.5 + 0.5 * Math.sin(s.phase));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#F0E8DC';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        function drawWarfireBand(time) {
            const g = ctx.createLinearGradient(0, height * 0.7, 0, height);
            const flicker = 0.5 + 0.2 * Math.sin(time * 0.005) + 0.1 * Math.sin(time * 0.013);
            g.addColorStop(0, 'rgba(0, 0, 0, 0)');
            g.addColorStop(1, `rgba(150, 35, 28, ${0.18 * flicker + 0.08})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, height * 0.7, width, height * 0.3);
        }

        function drawEveningStar(time) {
            const sx = starX();
            const sy = starY();
            const unit = Math.min(width, height);
            const env = flareEnvelope(time);
            const pulse = 0.85 + 0.15 * Math.sin(time * 0.0012);
            const coreRadius = unit * (0.035 + env * 0.02) * pulse;

            // Halo
            const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius * (5 + env * 4));
            halo.addColorStop(0, `rgba(255, 235, 215, ${0.30 + env * 0.35})`);
            halo.addColorStop(0.4, `rgba(232, 150, 130, ${0.12 + env * 0.15})`);
            halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = halo;
            ctx.fillRect(sx - coreRadius * 10, sy - coreRadius * 10, coreRadius * 20, coreRadius * 20);

            // Flare spikes (horizontal long, vertical short)
            ctx.save();
            ctx.translate(sx, sy);
            ctx.globalCompositeOperation = 'lighter';
            const spikes = [
                { angle: 0, len: unit * (0.22 + env * 0.14) },
                { angle: Math.PI / 2, len: unit * (0.12 + env * 0.08) },
                { angle: Math.PI / 4, len: unit * (0.07 + env * 0.05) },
                { angle: -Math.PI / 4, len: unit * (0.07 + env * 0.05) }
            ];
            spikes.forEach(spike => {
                const alpha = 0.20 + env * 0.4;
                const g = ctx.createLinearGradient(-spike.len, 0, spike.len, 0);
                g.addColorStop(0, 'rgba(0, 0, 0, 0)');
                g.addColorStop(0.5, `rgba(255, 240, 225, ${alpha})`);
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.save();
                ctx.rotate(spike.angle + Math.sin(time * 0.0003) * 0.05);
                ctx.fillStyle = g;
                ctx.fillRect(-spike.len, -1.2, spike.len * 2, 2.4);
                ctx.restore();
            });
            ctx.restore();

            // Core
            const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreRadius);
            core.addColorStop(0, 'rgba(255, 255, 250, 0.95)');
            core.addColorStop(0.5, 'rgba(255, 230, 205, 0.6)');
            core.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(sx, sy, coreRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ignition ring on flare
            if (env > 0.05) {
                ctx.save();
                ctx.globalAlpha = env * 0.5;
                ctx.strokeStyle = '#FFD8C0';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(sx, sy, coreRadius * (2 + (1 - env) * 9), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        resizeCanvas();
        for (let i = 0; i < EMBER_CAP; i++) embers.push(new Ember());

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            ctx.clearRect(0, 0, width, height);

            drawStarfield();
            drawWarfireBand(time);
            embers.forEach(e => { e.update(); e.draw(); });

            if (time > nextFlare) {
                flareStart = time;
                nextFlare = time + 5000 + Math.random() * 5000;
            }
            drawEveningStar(time);

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

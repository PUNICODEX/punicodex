/**
 * EL — Supreme Father of the Canaanite Pantheon
 * Interactive Layer: Throne Radiance, Seven Rings, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Throne Radiance Canvas
    // ============================
    const canvas = document.getElementById('throne-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let motes = [];
        let pulses = [];
        let frameCount = 0;
        let running = true;
        let rafId = null;

        const GOLD = { r: 212, g: 175, b: 55 };
        const IVORY = { r: 245, g: 240, b: 220 };
        const AMBER = { r: 230, g: 180, b: 80 };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function throneX() { return width / 2; }
        function throneY() { return height * 0.34; }
        function ringUnit() { return Math.min(width, height) / 11; }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vy = -(Math.random() * 0.35 + 0.08);
                this.vx = (Math.random() - 0.5) * 0.15;
                this.size = Math.random() * 1.8 + 0.5;
                this.phase = Math.random() * Math.PI * 2;
                this.twinkleSpeed = Math.random() * 0.03 + 0.01;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += this.twinkleSpeed;
                if (this.y < -12) this.reset(false);
            }

            draw() {
                const alpha = 0.12 + 0.28 * (0.5 + 0.5 * Math.sin(this.phase));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${IVORY.r}, ${IVORY.g}, ${IVORY.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class RadiancePulse {
            constructor() {
                this.radius = ringUnit() * 0.5;
                this.maxRadius = Math.max(width, height) * 0.75;
                this.speed = Math.max(width, height) * 0.004;
            }

            update() {
                this.radius += this.speed;
                return this.radius < this.maxRadius;
            }

            draw() {
                const opacity = 0.35 * (1 - this.radius / this.maxRadius);
                if (opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.9)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(throneX(), throneY(), this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        function drawThroneGlow(time) {
            const glowRadius = ringUnit() * 4.5;
            const breathe = 0.85 + 0.15 * Math.sin(time * 0.0006);
            const g = ctx.createRadialGradient(
                throneX(), throneY(), 0,
                throneX(), throneY(), glowRadius * breathe
            );
            g.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.28)`);
            g.addColorStop(0.4, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0.10)`);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }

        function drawGodRays(time) {
            const rayCount = 10;
            const rayLength = Math.max(width, height) * 0.9;
            ctx.save();
            ctx.translate(throneX(), throneY());
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < rayCount; i++) {
                const baseAngle = (i / rayCount) * Math.PI * 2 + time * 0.00008;
                const wobble = Math.sin(time * 0.0005 + i * 1.7) * 0.06;
                const angle = baseAngle + wobble;
                const spread = 0.045 + 0.02 * Math.sin(time * 0.0004 + i);
                const alpha = 0.05 + 0.03 * Math.sin(time * 0.0009 + i * 2.3);
                if (alpha <= 0) continue;
                const g = ctx.createLinearGradient(
                    0, 0,
                    Math.cos(angle) * rayLength, Math.sin(angle) * rayLength
                );
                g.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`);
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle - spread) * rayLength, Math.sin(angle - spread) * rayLength);
                ctx.lineTo(Math.cos(angle + spread) * rayLength, Math.sin(angle + spread) * rayLength);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        function drawSevenRings(time) {
            for (let i = 0; i < 7; i++) {
                const baseRadius = ringUnit() * (1.1 + i * 0.85);
                const breathe = Math.sin(time * 0.001 + i * 0.9);
                const radius = baseRadius * (1 + 0.03 * breathe);
                const alpha = 0.10 + 0.10 * (0.5 + 0.5 * Math.sin(time * 0.0013 + i * 1.3));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = i % 2 === 0
                    ? `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.9)`
                    : `rgba(${IVORY.r}, ${IVORY.g}, ${IVORY.b}, 0.8)`;
                ctx.lineWidth = i === 3 ? 2 : 1.2;
                ctx.shadowBlur = 14;
                ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.6)`;
                ctx.beginPath();
                ctx.arc(throneX(), throneY(), radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        resizeCanvas();
        for (let i = 0; i < 140; i++) {
            motes.push(new Mote());
        }

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            drawThroneGlow(time);
            drawGodRays(time);

            motes.forEach(m => { m.update(); m.draw(); });

            if (frameCount % 300 === 0) {
                pulses.push(new RadiancePulse());
            }
            pulses = pulses.filter(p => {
                p.draw();
                return p.update();
            });

            drawSevenRings(time);

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

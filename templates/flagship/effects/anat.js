/**
 * ANAT — Goddess of War and the Hunt
 * Interactive Layer: Arrow Streaks, Blood-Gold Warfire, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Warfire Canvas
    // ============================
    const canvas = document.getElementById('warfire-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let arrows = [];
        let embers = [];
        let frameCount = 0;
        let running = true;
        let rafId = null;

        // Palette: blood crimson, warfire gold, hunt ivory
        const EMBER_CAP = 160;
        const ARROW_CAP = 26;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Arrow {
            constructor() {
                const fromLeft = Math.random() < 0.5;
                this.x = fromLeft ? -30 : width + 30;
                this.y = Math.random() * height * 0.5;
                const speed = 9 + Math.random() * 6;
                const slope = 0.18 + Math.random() * 0.28;
                this.vx = (fromLeft ? 1 : -1) * speed;
                this.vy = speed * slope;
                this.trail = [];
                this.trailMax = 12 + Math.floor(Math.random() * 6);
            }

            update() {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > this.trailMax) this.trail.shift();
                this.x += this.vx;
                this.y += this.vy;
                return this.x > -80 && this.x < width + 80 && this.y < height + 80;
            }

            draw() {
                ctx.save();
                for (let i = 1; i < this.trail.length; i++) {
                    const alpha = (i / this.trail.length) * 0.5;
                    ctx.strokeStyle = `rgba(255, 190, 90, ${alpha})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    ctx.stroke();
                }
                ctx.fillStyle = 'rgba(255, 232, 175, 0.95)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(255, 120, 60, 0.9)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(Math.random() * 1.1 + 0.3);
                this.vx = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 2.2 + 0.6;
                this.phase = Math.random() * Math.PI * 2;
                this.flicker = Math.random() * 0.09 + 0.04;
                this.gold = Math.random() < 0.45;
            }

            update() {
                this.x += this.vx + Math.sin(this.phase) * 0.3;
                this.y += this.vy;
                this.phase += this.flicker;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const alpha = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(this.phase));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.gold ? '#FFC860' : '#C03028';
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.gold ? '#FFB040' : '#A01818';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawWarfireGlow(time) {
            const layers = 3;
            for (let i = 0; i < layers; i++) {
                const cx = width * (0.25 + i * 0.25);
                const cy = height * 1.02;
                const radius = Math.min(width, height) * (0.34 + i * 0.1);
                const flicker =
                    0.6 +
                    0.25 * Math.sin(time * 0.004 + i * 2.1) +
                    0.15 * Math.sin(time * 0.011 + i * 5.3);
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * flicker);
                g.addColorStop(0, 'rgba(160, 30, 20, 0.20)');
                g.addColorStop(0.5, 'rgba(120, 20, 15, 0.08)');
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, width, height);
            }
        }

        function spawnVolley() {
            // A hunting volley: several arrows loose in the same beat
            const count = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count && arrows.length < ARROW_CAP; i++) {
                arrows.push(new Arrow());
            }
        }

        resizeCanvas();
        for (let i = 0; i < EMBER_CAP; i++) embers.push(new Ember());

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            drawWarfireGlow(time);

            embers.forEach(e => { e.update(); e.draw(); });

            if (frameCount % 360 === 0) spawnVolley();
            // Stray shots between volleys keep the field restless
            if (Math.random() < 0.012 && arrows.length < ARROW_CAP) {
                arrows.push(new Arrow());
            }
            arrows = arrows.filter(a => {
                a.draw();
                return a.update();
            });

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

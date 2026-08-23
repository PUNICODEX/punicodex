/**
 * FÁFNIR FLAGSHIP TEMPLE — HOARD CANVAS & INTERACTIONS
 * Ember-gold serpent coiling over a glittering hoard + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Hoard Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('hoard-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let coins = [];
        let embers = [];
        let wisps = [];
        let sparkles = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedCoins();
        }

        function seedCoins() {
            coins = [];
            const count = Math.min(180, Math.floor(width / 8));
            for (let i = 0; i < count; i++) {
                coins.push({
                    x: Math.random() * width,
                    y: height * 0.72 + Math.random() * height * 0.28,
                    r: 1.5 + Math.random() * 3.5,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.01 + Math.random() * 0.025,
                    hue: 42 + Math.random() * 10
                });
            }
        }

        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(0.3 + Math.random() * 0.7);
                this.size = 0.6 + Math.random() * 1.8;
                this.flicker = Math.random() * Math.PI * 2;
                this.life = 300 + Math.random() * 300;
            }

            update() {
                this.x += this.vx + Math.sin((frameCount + this.flicker * 60) * 0.02) * 0.15;
                this.y += this.vy;
                this.flicker += 0.08;
                this.life--;
                if (this.y < -10 || this.life <= 0) this.reset(false);
            }

            draw() {
                const a = (0.35 + Math.sin(this.flicker) * 0.25) * Math.min(1, this.life / 120);
                ctx.save();
                ctx.globalAlpha = Math.max(0, a);
                ctx.fillStyle = '#F0A83C';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#D4881F';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Wisp {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height * 0.5 + Math.random() * height * 0.4;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = -(0.08 + Math.random() * 0.12);
                this.radius = 60 + Math.random() * 120;
                this.life = 400 + Math.random() * 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                if (this.life <= 0 || this.y < -this.radius) this.reset();
            }

            draw() {
                const a = (this.life / this.maxLife) * 0.05;
                ctx.save();
                ctx.globalAlpha = a;
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                g.addColorStop(0, 'hsla(30, 20%, 30%, 0.6)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Serpent {
            constructor() {
                this.count = 30;
                this.points = [];
                for (let i = 0; i < this.count; i++) {
                    this.points.push({ x: width * 0.5, y: height * 0.8 });
                }
                this.t = Math.random() * 100;
                this.breath = 0;
            }

            update() {
                this.t += 0.012;
                this.breath += 0.03;

                // Head glides in a slow coil over the hoard
                const hx = width * 0.5 + Math.sin(this.t * 0.9) * width * 0.3
                    + Math.sin(this.t * 0.37) * width * 0.08;
                const hy = height * 0.62 + Math.sin(this.t * 1.3) * height * 0.12
                    + Math.cos(this.t * 0.53) * height * 0.05;

                // Follow-the-leader chain
                const head = this.points[0];
                head.x += (hx - head.x) * 0.08;
                head.y += (hy - head.y) * 0.08;
                for (let i = 1; i < this.count; i++) {
                    const prev = this.points[i - 1];
                    const p = this.points[i];
                    const dx = prev.x - p.x;
                    const dy = prev.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const spacing = 14;
                    p.x += dx * ((dist - spacing) / dist) * 0.5;
                    p.y += dy * ((dist - spacing) / dist) * 0.5;
                }
            }

            draw() {
                const breathe = 1 + Math.sin(this.breath) * 0.08;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                // Body: tapering overlapping discs, ember-gold
                for (let i = this.count - 1; i >= 0; i--) {
                    const p = this.points[i];
                    const t = i / this.count;
                    const r = (16 * (1 - t * 0.75) + 3) * breathe;
                    const g = ctx.createRadialGradient(p.x, p.y - r * 0.3, 0, p.x, p.y, r * 1.6);
                    g.addColorStop(0, `hsla(45, 85%, ${55 - t * 15}%, ${0.16 * (1 - t * 0.4)})`);
                    g.addColorStop(0.6, `hsla(38, 80%, ${40 - t * 12}%, ${0.1 * (1 - t * 0.4)})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
                    ctx.fill();

                    // Scale ridge glint
                    ctx.fillStyle = `hsla(50, 90%, 65%, ${0.1 * (1 - t)})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - r * 0.4, r * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Head eye-glare
                const head = this.points[0];
                const eyePulse = 0.5 + Math.sin(this.breath * 1.7) * 0.3;
                const eg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 26);
                eg.addColorStop(0, `rgba(255, 220, 120, ${0.5 * eyePulse})`);
                eg.addColorStop(0.4, `rgba(230, 150, 40, ${0.25 * eyePulse})`);
                eg.addColorStop(1, 'transparent');
                ctx.fillStyle = eg;
                ctx.beginPath();
                ctx.arc(head.x, head.y, 26, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        function spawnSparkle() {
            if (sparkles.length > 24) return;
            if (Math.random() > 0.12) return;
            const coin = coins[Math.floor(Math.random() * coins.length)];
            if (!coin) return;
            sparkles.push({ x: coin.x, y: coin.y, life: 40, maxLife: 40 });
        }

        resize();
        for (let i = 0; i < 60; i++) embers.push(new Ember());
        for (let i = 0; i < 5; i++) wisps.push(new Wisp());
        const serpent = new Serpent();

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Hoard underglow
            const hoardGlow = ctx.createRadialGradient(
                width * 0.5, height * 0.95, 0, width * 0.5, height * 0.95, width * 0.6);
            hoardGlow.addColorStop(0, 'hsla(45, 80%, 45%, 0.1)');
            hoardGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = hoardGlow;
            ctx.fillRect(0, 0, width, height);

            wisps.forEach(w => { w.update(); w.draw(); });

            // Hoard: twinkling coins
            ctx.save();
            coins.forEach(c => {
                c.phase += c.speed;
                const tw = Math.max(0, Math.sin(c.phase));
                ctx.fillStyle = `hsla(${c.hue}, 75%, ${40 + tw * 35}%, ${0.35 + tw * 0.55})`;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.r, c.r * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                if (tw > 0.97) {
                    ctx.strokeStyle = `hsla(50, 95%, 85%, ${(tw - 0.97) * 20})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(c.x - c.r * 2, c.y);
                    ctx.lineTo(c.x + c.r * 2, c.y);
                    ctx.moveTo(c.x, c.y - c.r * 2);
                    ctx.lineTo(c.x, c.y + c.r * 2);
                    ctx.stroke();
                }
            });
            ctx.restore();

            serpent.update();
            serpent.draw();

            embers.forEach(e => { e.update(); e.draw(); });

            spawnSparkle();
            sparkles = sparkles.filter(s => s.life > 0);
            sparkles.forEach(s => {
                s.life--;
                const a = (s.life / s.maxLife) * 0.6;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.strokeStyle = '#FFE9A8';
                ctx.lineWidth = 1;
                const len = 6 + (1 - s.life / s.maxLife) * 6;
                ctx.beginPath();
                ctx.moveTo(s.x - len, s.y);
                ctx.lineTo(s.x + len, s.y);
                ctx.moveTo(s.x, s.y - len);
                ctx.lineTo(s.x, s.y + len);
                ctx.stroke();
                ctx.restore();
            });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });
    } else if (canvas) {
        canvas.style.display = 'none';
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

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

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

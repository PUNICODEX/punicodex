/**
 * SKAÐI FLAGSHIP TEMPLE — SNOWFALL CANVAS & INTERACTIONS
 * Snowfall over ridgelines + ski-track gleam + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Snowfall Canvas ──────────────────────────────────────────────────── */
    const canvas = document.getElementById('snowfall-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let flakes = [];
        let mists = [];
        let farRidge = [];
        let nearRidge = [];
        let trackGleams = [];
        let frameCount = 0;
        let gleamTimer = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildRidges();
        }

        // Deterministic-ish jagged ridge from a seeded walk
        function buildRidge(baseY, amp, step) {
            const pts = [];
            let y = baseY;
            for (let x = -40; x <= width + 40; x += step) {
                y += (Math.random() - 0.5) * amp;
                y = Math.max(baseY - amp, Math.min(baseY + amp * 0.4, y));
                pts.push({ x, y });
            }
            return pts;
        }

        function buildRidges() {
            farRidge = buildRidge(height * 0.52, 42, 46);
            nearRidge = buildRidge(height * 0.68, 56, 38);
        }

        function ridgeY(ridge, x) {
            if (ridge.length < 2) return height * 0.7;
            for (let i = 0; i < ridge.length - 1; i++) {
                const a = ridge[i];
                const b = ridge[i + 1];
                if (x >= a.x && x <= b.x) {
                    const t = (x - a.x) / (b.x - a.x || 1);
                    return a.y + (b.y - a.y) * t;
                }
            }
            return ridge[ridge.length - 1].y;
        }

        class Flake {
            constructor(layer) {
                this.layer = layer;                 // 0 far, 1 mid, 2 near
                this.reset(true);
            }

            reset(scatter) {
                const scale = 0.5 + this.layer * 0.45;
                this.x = Math.random() * (width + 60) - 30;
                this.y = scatter ? Math.random() * height : -12;
                this.vy = (0.5 + Math.random() * 0.8) * scale;
                this.r = (0.8 + Math.random() * 1.6) * scale;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swayAmp = (0.3 + Math.random() * 0.5) * scale;
                this.opacity = 0.3 + this.layer * 0.22 + Math.random() * 0.2;
            }

            update() {
                this.swayPhase += 0.015 + this.layer * 0.006;
                // Skadi's mountain wind: slow global push + per-flake sway
                const wind = Math.sin(frameCount * 0.004) * 0.4;
                this.x += Math.sin(this.swayPhase) * this.swayAmp + wind * (0.4 + this.layer * 0.3);
                this.y += this.vy;
                if (this.y > height + 12) this.reset(false);
                if (this.x > width + 40) this.x = -30;
                if (this.x < -40) this.x = width + 30;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = '#E8F0FA';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Mist {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -260;
                this.y = height * (0.45 + Math.random() * 0.35);
                this.vx = 0.12 + Math.random() * 0.22;
                this.r = 130 + Math.random() * 170;
                this.opacity = 0.03 + Math.random() * 0.04;
            }

            update() {
                this.x += this.vx;
                if (this.x - this.r > width) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
                g.addColorStop(0, 'hsla(210, 30%, 85%, 0.7)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.r, this.r * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawRidge(ridge, fill, cap) {
            if (ridge.length < 2) return;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ridge[0].x, ridge[0].y);
            for (let i = 1; i < ridge.length; i++) ctx.lineTo(ridge[i].x, ridge[i].y);
            ctx.lineTo(width + 40, height + 40);
            ctx.lineTo(-40, height + 40);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();

            // Snow-cap gleam along the crest
            ctx.beginPath();
            ctx.moveTo(ridge[0].x, ridge[0].y);
            for (let i = 1; i < ridge.length; i++) ctx.lineTo(ridge[i].x, ridge[i].y);
            ctx.strokeStyle = cap;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.restore();
        }

        // Ski-track: a long S-curve carved across the near slope
        function trackPoint(t) {
            const startX = width * 0.12;
            const endX = width * 0.9;
            const x = startX + (endX - startX) * t;
            const base = ridgeY(nearRidge, x);
            const drop = height * 0.16 * t + Math.sin(t * Math.PI * 2.2) * height * 0.03;
            return { x, y: base + 6 + drop };
        }

        function drawTrack(t) {
            ctx.save();
            ctx.strokeStyle = 'rgba(200, 220, 245, 0.14)';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
                const p = trackPoint(i / 40);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.restore();

            // Gleams racing down the track
            gleamTimer--;
            if (gleamTimer <= 0 && trackGleams.length < 3) {
                trackGleams.push({ t: 0, speed: 0.006 + Math.random() * 0.004, trail: [] });
                gleamTimer = 260 + Math.random() * 220;
            }

            trackGleams = trackGleams.filter(g => g.t <= 1);
            trackGleams.forEach(g => {
                g.t += g.speed;
                const p = trackPoint(Math.min(1, g.t));
                g.trail.push({ x: p.x, y: p.y, life: 40 });
                g.trail.forEach(tp => tp.life--);
                g.trail = g.trail.filter(tp => tp.life > 0);

                ctx.save();
                g.trail.forEach(tp => {
                    ctx.globalAlpha = (tp.life / 40) * 0.5;
                    ctx.fillStyle = '#DDEBFF';
                    ctx.beginPath();
                    ctx.arc(tp.x, tp.y, 1.6, 0, Math.PI * 2);
                    ctx.fill();
                });
                // Gleam head
                ctx.globalAlpha = 0.9;
                const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
                hg.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                hg.addColorStop(0.4, 'rgba(200, 225, 255, 0.35)');
                hg.addColorStop(1, 'transparent');
                ctx.fillStyle = hg;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        resize();
        for (let i = 0; i < 220; i++) {
            flakes.push(new Flake(i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0)));
        }
        for (let i = 0; i < 4; i++) mists.push(new Mist());

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Cold alpine sky wash
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, 'hsla(215, 35%, 22%, 0.10)');
            sky.addColorStop(0.6, 'hsla(215, 30%, 32%, 0.05)');
            sky.addColorStop(1, 'transparent');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Far flakes behind the far ridge
            flakes.forEach(f => { if (f.layer === 0) { f.update(); f.draw(); } });

            drawRidge(farRidge, 'hsla(218, 25%, 14%, 0.75)', 'rgba(215, 230, 248, 0.28)');

            mists.forEach(m => { m.update(); m.draw(); });

            // Mid flakes between ridges
            flakes.forEach(f => { if (f.layer === 1) { f.update(); f.draw(); } });

            drawRidge(nearRidge, 'hsla(220, 28%, 10%, 0.9)', 'rgba(225, 238, 252, 0.4)');

            drawTrack(frameCount * 0.016);

            // Near flakes over everything
            flakes.forEach(f => { if (f.layer === 2) { f.update(); f.draw(); } });

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

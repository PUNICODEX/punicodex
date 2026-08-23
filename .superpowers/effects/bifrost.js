/**
 * BIFRǪST FLAGSHIP TEMPLE — RAINBOW BRIDGE CANVAS & INTERACTIONS
 * Prismatic band arc with Heimdallr's watch-flare + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Rainbow Bridge Canvas ────────────────────────────────────────────── */
    const canvas = document.getElementById('rainbow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let stars = [];
        let motes = [];
        let frameCount = 0;

        // Spectral band: seven hues, outer (red) to inner (violet)
        const SPECTRUM = [
            { h: 355, name: 'red' },
            { h: 28, name: 'orange' },
            { h: 50, name: 'gold' },
            { h: 110, name: 'green' },
            { h: 185, name: 'cyan' },
            { h: 225, name: 'blue' },
            { h: 275, name: 'violet' }
        ];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedStars();
        }

        function seedStars() {
            stars = [];
            const count = Math.min(110, Math.floor(width * height / 14000));
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height * 0.85,
                    r: 0.4 + Math.random() * 1.2,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.01 + Math.random() * 0.03
                });
            }
        }

        // Bridge geometry: a grand arc from the lower-left foot to the upper-right
        function bridgeParams() {
            const cx = width * 0.18;
            const cy = height * 1.35;
            const rBase = Math.hypot(width * 0.72, height * 1.1);
            const bandWidth = Math.min(90, height * 0.12);
            return { cx, cy, rBase, bandWidth };
        }

        class Mote {
            constructor() {
                this.reset();
            }

            reset() {
                const p = bridgeParams();
                this.t = Math.random();                       // 0..1 along the arc
                this.speed = 0.0006 + Math.random() * 0.0012; // arc progress per frame
                this.lane = (Math.random() - 0.5) * p.bandWidth * 0.9;
                this.size = 0.6 + Math.random() * 1.6;
                this.hue = SPECTRUM[Math.floor(Math.random() * SPECTRUM.length)].h;
            }

            update() {
                this.t += this.speed;
                if (this.t > 1) this.reset();
            }

            draw() {
                const p = bridgeParams();
                const a0 = Math.PI * 1.02;                     // start angle (lower-left)
                const a1 = Math.PI * 1.62;                     // end angle (upper-right)
                const ang = a0 + (a1 - a0) * this.t;
                const r = p.rBase + this.lane;
                const x = p.cx + Math.cos(ang) * r;
                const y = p.cy + Math.sin(ang) * r;
                const fade = Math.sin(this.t * Math.PI);
                ctx.save();
                ctx.globalAlpha = 0.5 * fade;
                ctx.fillStyle = `hsl(${this.hue}, 90%, 75%)`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = `hsl(${this.hue}, 90%, 65%)`;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawBridge(t) {
            const p = bridgeParams();
            const a0 = Math.PI * 1.02;
            const a1 = Math.PI * 1.62;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';

            // Layered spectral strokes
            for (let i = 0; i < SPECTRUM.length; i++) {
                const c = SPECTRUM[i];
                const r = p.rBase - p.bandWidth * 0.5 + (p.bandWidth / SPECTRUM.length) * (i + 0.5);
                const shimmer = 0.10 + 0.05 * Math.sin(t * 0.9 + i * 0.9);
                ctx.strokeStyle = `hsla(${c.h}, 85%, 62%, ${shimmer})`;
                ctx.lineWidth = (p.bandWidth / SPECTRUM.length) * 1.7;
                ctx.beginPath();
                ctx.arc(p.cx, p.cy, r, a0, a1);
                ctx.stroke();
            }

            // Travelling light-pulse along the band
            const pulseT = (t * 0.06) % 1.3;
            if (pulseT <= 1) {
                const pa = a0 + (a1 - a0) * pulseT;
                const px = p.cx + Math.cos(pa) * p.rBase;
                const py = p.cy + Math.sin(pa) * p.rBase;
                const pg = ctx.createRadialGradient(px, py, 0, px, py, p.bandWidth * 1.2);
                pg.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
                pg.addColorStop(0.4, 'rgba(220, 235, 255, 0.15)');
                pg.addColorStop(1, 'transparent');
                ctx.fillStyle = pg;
                ctx.beginPath();
                ctx.arc(px, py, p.bandWidth * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        function drawWatchFlare(t) {
            // Heimdallr's flare at the foot of the bridge
            const p = bridgeParams();
            const a0 = Math.PI * 1.02;
            const fx = p.cx + Math.cos(a0) * p.rBase;
            const fy = p.cy + Math.sin(a0) * p.rBase;
            const pulse = 0.65 + 0.35 * Math.sin(t * 1.4);
            const R = 70 * pulse + 20;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, R);
            g.addColorStop(0, `rgba(255, 250, 230, ${0.55 * pulse})`);
            g.addColorStop(0.25, `rgba(255, 225, 150, ${0.3 * pulse})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(fx, fy, R, 0, Math.PI * 2);
            ctx.fill();

            // Radiant rays, slowly rotating
            const rays = 8;
            const rot = t * 0.15;
            ctx.strokeStyle = `rgba(255, 240, 200, ${0.35 * pulse})`;
            for (let i = 0; i < rays; i++) {
                const ang = rot + (Math.PI * 2 / rays) * i;
                const len = R * (1.1 + 0.25 * Math.sin(t * 2 + i));
                ctx.lineWidth = i % 2 === 0 ? 1.6 : 0.8;
                ctx.beginPath();
                ctx.moveTo(fx + Math.cos(ang) * R * 0.15, fy + Math.sin(ang) * R * 0.15);
                ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len);
                ctx.stroke();
            }

            ctx.restore();
        }

        resize();
        for (let i = 0; i < 70; i++) motes.push(new Mote());

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            const t = frameCount * 0.016;
            ctx.clearRect(0, 0, width, height);

            // Night-sky depth glow
            const sky = ctx.createRadialGradient(
                width * 0.5, height * 0.2, 0, width * 0.5, height * 0.2, Math.min(width, height));
            sky.addColorStop(0, 'hsla(230, 30%, 20%, 0.06)');
            sky.addColorStop(1, 'transparent');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Stars
            ctx.save();
            stars.forEach(s => {
                s.phase += s.speed;
                const tw = 0.3 + 0.5 * Math.abs(Math.sin(s.phase));
                ctx.fillStyle = `rgba(230, 238, 255, ${tw * 0.6})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            drawBridge(t);

            motes.forEach(m => { m.update(); m.draw(); });

            drawWatchFlare(t);

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

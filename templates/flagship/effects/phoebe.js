/**
 * PHOÍBĒ — Titaness of Prophecy, the Bright Oracle
 * Lunar oracle glow breathing above, rippling prophecy rings expanding below
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Oracle Canvas ──────────────────────────────────────────────────── */
    const canvas = document.getElementById('oracle-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let rings = [];
        let motes = [];
        let mistBands = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;
        let lastRing = 0;
        let moonX = 0;
        let moonY = 0;
        let poolX = 0;
        let poolY = 0;
        let pointerX = -1;
        let pointerY = -1;

        const RING_SEGMENTS = 64;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            moonX = width * 0.5;
            moonY = height * 0.18;
            poolX = width * 0.5;
            poolY = height * 0.72;
        }

        class ProphecyRing {
            constructor(x, y, strong) {
                this.x = x;
                this.y = y;
                this.radius = 12;
                this.maxRadius = Math.min(width, height) * (strong ? 0.5 : 0.32);
                this.speed = strong ? 1.1 : 0.8;
                this.opacity = strong ? 0.4 : 0.28;
                this.ripplePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.radius += this.speed;
                this.ripplePhase += 0.015;
                const t = this.radius / this.maxRadius;
                this.opacity = (0.4 * (1 - t)) * (1 - t);
                return this.radius < this.maxRadius && this.opacity > 0.004;
            }

            draw() {
                ctx.save();
                ctx.strokeStyle = `rgba(200, 214, 240, ${this.opacity})`;
                ctx.lineWidth = 1.3;
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(180, 200, 240, 0.4)';
                ctx.beginPath();
                // Wobbled ring: the prophecy ripple distorts as it travels
                for (let i = 0; i <= RING_SEGMENTS; i++) {
                    const theta = (i / RING_SEGMENTS) * Math.PI * 2;
                    const wobble = Math.sin(theta * 5 + this.ripplePhase) * 3
                        + Math.sin(theta * 3 - this.ripplePhase * 1.6) * 2;
                    const r = this.radius + wobble;
                    const px = this.x + Math.cos(theta) * r;
                    const py = this.y + Math.sin(theta) * r * 0.42; // oracle pool: elliptical, seen at an angle
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }
        }

        class OracleMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(0.15 + Math.random() * 0.4);
                this.vx = (Math.random() - 0.5) * 0.25;
                this.size = 0.5 + Math.random() * 1.6;
                this.opacity = 0.1 + Math.random() * 0.28;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.02;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const twinkle = 0.5 + 0.5 * Math.sin(this.phase);
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = '#DCE6F8';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#B8CCF0';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class MistBand {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -width * 0.5;
                this.y = height * (0.45 + Math.random() * 0.5);
                this.vx = 0.15 + Math.random() * 0.3;
                this.radiusX = width * (0.2 + Math.random() * 0.25);
                this.radiusY = 20 + Math.random() * 40;
                this.opacity = 0.025 + Math.random() * 0.035;
            }

            update() {
                this.x += this.vx;
                if (this.x - this.radiusX > width) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const mist = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radiusX);
                mist.addColorStop(0, 'rgba(190, 205, 235, 0.5)');
                mist.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = mist;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 80; i++) motes.push(new OracleMote());
        for (let i = 0; i < 6; i++) mistBands.push(new MistBand());

        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
            } else if (!running) {
                running = true;
                animate();
            }
        });

        // Pointer over the pool stirs a small answering ripple
        canvas.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            pointerX = e.clientX - rect.left;
            pointerY = e.clientY - rect.top;
        }, { passive: true });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Lunar oracle glow, breathing slowly
            const breathe = 0.5 + 0.5 * Math.sin(frameCount * 0.008);
            const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 260 + breathe * 50);
            glow.addColorStop(0, `rgba(230, 238, 252, ${0.22 + breathe * 0.08})`);
            glow.addColorStop(0.3, `rgba(190, 205, 240, ${0.10 + breathe * 0.04})`);
            glow.addColorStop(0.7, 'rgba(120, 140, 200, 0.04)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            // Crescent shadow bite inside the glow for moon-shape suggestion
            ctx.save();
            ctx.globalAlpha = 0.5;
            const bite = ctx.createRadialGradient(moonX + 46, moonY - 14, 0, moonX + 46, moonY - 14, 90);
            bite.addColorStop(0, 'rgba(10, 12, 24, 0.55)');
            bite.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bite;
            ctx.beginPath();
            ctx.arc(moonX + 46, moonY - 14, 90, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Oracle pool sheen
            const pool = ctx.createRadialGradient(poolX, poolY, 0, poolX, poolY, Math.min(width, height) * 0.3);
            pool.addColorStop(0, `rgba(170, 190, 230, ${0.06 + breathe * 0.02})`);
            pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = pool;
            ctx.fillRect(0, 0, width, height);

            mistBands.forEach(m => { m.update(); m.draw(); });

            // Prophecy rings on a slow oracular cadence
            if (frameCount - lastRing > 130 + Math.random() * 120) {
                lastRing = frameCount;
                rings.push(new ProphecyRing(poolX, poolY, true));
            }
            // Pointer ripples (throttled by ring cap)
            if (pointerX >= 0 && rings.length < 9 && frameCount % 24 === 0) {
                rings.push(new ProphecyRing(pointerX, pointerY, false));
            }
            rings = rings.filter(r => {
                r.draw();
                return r.update();
            });

            motes.forEach(m => { m.update(); m.draw(); });

            rafId = requestAnimationFrame(animate);
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

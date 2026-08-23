/**
 * ZÉPHYROS — The West Wind, Gentlest of the Anemoi
 * Flowing wind ribbons streaming eastward, carried petals and gust swirls
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Wind Canvas ────────────────────────────────────────────────────── */
    const canvas = document.getElementById('wind-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let ribbons = [];
        let petals = [];
        let gusts = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;
        let lastGust = 0;

        const RIBBON_POINTS = 36;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class WindRibbon {
            constructor(index, total) {
                this.baseY = (index + 0.5) / total;
                this.yJitter = (Math.random() - 0.5) * 0.12;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.006 + Math.random() * 0.008;
                this.amp = 18 + Math.random() * 46;
                this.freq1 = 2 + Math.random() * 2.5;
                this.freq2 = 5 + Math.random() * 4;
                this.thickness = 8 + Math.random() * 22;
                this.opacity = 0.04 + Math.random() * 0.08;
                this.hueShift = Math.random();
            }

            update() {
                this.phase += this.speed;
            }

            yAt(t, xNorm) {
                return (this.baseY + this.yJitter) * height
                    + Math.sin(xNorm * this.freq1 + this.phase) * this.amp
                    + Math.sin(xNorm * this.freq2 + this.phase * 1.7) * this.amp * 0.35;
            }

            draw() {
                const cool = Math.round(170 + this.hueShift * 40);
                const warm = Math.round(200 + this.hueShift * 30);

                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Layered passes: wide soft body, then a brighter tapering core
                for (let pass = 0; pass < 2; pass++) {
                    ctx.beginPath();
                    for (let i = 0; i <= RIBBON_POINTS; i++) {
                        const xNorm = i / RIBBON_POINTS;
                        const px = xNorm * (width + 120) - 60;
                        const py = this.yAt(this.phase, xNorm * Math.PI * 2);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    if (pass === 0) {
                        ctx.strokeStyle = `rgba(${cool}, ${warm}, 235, ${this.opacity})`;
                        ctx.lineWidth = this.thickness;
                    } else {
                        ctx.strokeStyle = `rgba(235, 245, 255, ${this.opacity * 1.4})`;
                        ctx.lineWidth = this.thickness * 0.3;
                    }
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        class Petal {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -16;
                this.y = Math.random() * height;
                this.vx = 0.8 + Math.random() * 1.8;
                this.size = 1.5 + Math.random() * 3.5;
                this.rotation = Math.random() * Math.PI * 2;
                this.spin = (Math.random() - 0.5) * 0.06;
                this.flutterPhase = Math.random() * Math.PI * 2;
                this.opacity = 0.15 + Math.random() * 0.3;
                this.hue = Math.random();
            }

            update() {
                this.x += this.vx;
                this.flutterPhase += 0.05;
                this.y += Math.sin(this.flutterPhase) * 0.8;
                this.rotation += this.spin;
                if (this.x > width + 20) this.reset(false);
            }

            draw() {
                const tint = this.hue < 0.5 ? '232, 200, 210' : '215, 230, 220';
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = `rgba(${tint}, 0.9)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Gust {
            constructor() {
                this.x = -80;
                this.y = Math.random() * height;
                this.radius = 20 + Math.random() * 30;
                this.vx = 3 + Math.random() * 3;
                this.spinPhase = Math.random() * Math.PI * 2;
                this.opacity = 0.14;
            }

            update() {
                this.x += this.vx;
                this.spinPhase += 0.12;
                return this.x < width + this.radius + 100;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#DDEAF5';
                ctx.lineWidth = 1.4;
                // Spiral swirl: three arcs winding outward
                for (let arm = 0; arm < 3; arm++) {
                    const startAngle = this.spinPhase + arm * (Math.PI * 2 / 3);
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius * (0.5 + arm * 0.28), startAngle, startAngle + Math.PI * 0.9);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        resize();
        const RIBBON_COUNT = 10;
        for (let i = 0; i < RIBBON_COUNT; i++) ribbons.push(new WindRibbon(i, RIBBON_COUNT));
        for (let i = 0; i < 60; i++) petals.push(new Petal());

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

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Cool western-sky wash
            const sky = ctx.createLinearGradient(0, 0, width, height);
            sky.addColorStop(0, 'rgba(90, 120, 160, 0.05)');
            sky.addColorStop(0.6, 'rgba(140, 170, 200, 0.03)');
            sky.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            ribbons.forEach(r => { r.update(); r.draw(); });

            // Occasional gust swirl riding the stream
            if (frameCount - lastGust > 200 + Math.random() * 260) {
                lastGust = frameCount;
                gusts.push(new Gust());
            }
            gusts = gusts.filter(g => {
                g.draw();
                return g.update();
            });

            petals.forEach(p => { p.update(); p.draw(); });

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

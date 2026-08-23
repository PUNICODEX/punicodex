/**
 * KRÓNOS — Titan of Time & the Harvest
 * Interactive Layer: Orbiting Hourglass Rings, Falling Grain, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Hourglass System
    // ============================
    const canvas = document.getElementById('hourglass-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let rings = [];
        let grains = [];
        let dust = [];
        let pulse = 0;

        const PALETTE = {
            amber: { r: 212, g: 175, b: 55 },
            bronze: { r: 176, g: 124, b: 52 },
            wheat: { r: 232, g: 200, b: 120 },
            sand: { r: 240, g: 220, b: 160 },
            shadow: { r: 46, g: 34, b: 18 },
        };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            rings.forEach(r => r.recenter());
        }

        class HourglassRing {
            constructor(index, total) {
                this.index = index;
                this.total = total;
                this.recenter();
                this.radius = Math.min(width, height) * (0.16 + index * 0.085);
                this.baseRadius = this.radius;
                this.rotation = Math.random() * Math.PI * 2;
                this.speed = (index % 2 === 0 ? 1 : -1) * (0.0016 + Math.random() * 0.0018);
                this.ticks = 24 + index * 8;
                this.opacity = 0.28 - index * 0.045;
                this.orbiters = [];
                const orbiterCount = 2 + index;
                for (let i = 0; i < orbiterCount; i++) {
                    this.orbiters.push({
                        angle: (i / orbiterCount) * Math.PI * 2,
                        size: 1.4 + Math.random() * 1.8,
                        speed: (0.004 + Math.random() * 0.004) * (index % 2 === 0 ? 1 : -1),
                    });
                }
            }

            recenter() {
                this.cx = width * 0.5;
                this.cy = height * 0.44;
            }

            update() {
                this.rotation += this.speed;
                this.radius = this.baseRadius * (1 + Math.sin(pulse * 0.01 + this.index) * 0.015);
                this.orbiters.forEach(o => { o.angle += o.speed; });
            }

            draw() {
                ctx.save();

                // faint track of the ring itself
                ctx.strokeStyle = `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, ${this.opacity * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
                ctx.stroke();

                // tick marks, like the chapter ring of an old clock
                for (let i = 0; i < this.ticks; i++) {
                    const a = this.rotation + (i / this.ticks) * Math.PI * 2;
                    const long = i % (this.ticks / 4) === 0;
                    const inner = this.radius - (long ? 9 : 4);
                    const x1 = this.cx + Math.cos(a) * inner;
                    const y1 = this.cy + Math.sin(a) * inner;
                    const x2 = this.cx + Math.cos(a) * this.radius;
                    const y2 = this.cy + Math.sin(a) * this.radius;
                    ctx.strokeStyle = `rgba(${PALETTE.amber.r}, ${PALETTE.amber.g}, ${PALETTE.amber.b}, ${this.opacity * (long ? 1 : 0.55)})`;
                    ctx.lineWidth = long ? 1.6 : 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // grains of sand riding the orbit
                this.orbiters.forEach(o => {
                    const x = this.cx + Math.cos(o.angle) * this.radius;
                    const y = this.cy + Math.sin(o.angle) * this.radius;
                    ctx.save();
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = `rgba(${PALETTE.sand.r}, ${PALETTE.sand.g}, ${PALETTE.sand.b}, 0.9)`;
                    ctx.fillStyle = `rgba(${PALETTE.sand.r}, ${PALETTE.sand.g}, ${PALETTE.sand.b}, ${this.opacity + 0.35})`;
                    ctx.beginPath();
                    ctx.arc(x, y, o.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                ctx.restore();
            }
        }

        class GrainMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : -12;
                this.vy = 0.4 + Math.random() * 1.1;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.01 + Math.random() * 0.02;
                this.swayAmp = 8 + Math.random() * 18;
                this.size = 1 + Math.random() * 2.2;
                this.opacity = 0.25 + Math.random() * 0.45;
                this.spin = Math.random() * Math.PI;
                this.spinSpeed = (Math.random() - 0.5) * 0.04;
            }

            update() {
                this.y += this.vy;
                this.swayPhase += this.swaySpeed;
                this.spin += this.spinSpeed;
                if (this.y > height + 14) this.reset(false);
            }

            draw() {
                const x = this.x + Math.sin(this.swayPhase) * this.swayAmp;
                ctx.save();
                ctx.translate(x, this.y);
                ctx.rotate(this.spin + Math.sin(this.swayPhase) * 0.4);
                ctx.globalAlpha = this.opacity;

                // a falling kernel of wheat: elongated seed with a bright crease
                const grad = ctx.createLinearGradient(-this.size, 0, this.size, 0);
                grad.addColorStop(0, `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, 0.9)`);
                grad.addColorStop(0.5, `rgba(${PALETTE.wheat.r}, ${PALETTE.wheat.g}, ${PALETTE.wheat.b}, 1)`);
                grad.addColorStop(1, `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, 0.9)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 0.55, this.size * 1.6, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(${PALETTE.shadow.r}, ${PALETTE.shadow.g}, ${PALETTE.shadow.b}, 0.5)`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 1.3);
                ctx.lineTo(0, this.size * 1.3);
                ctx.stroke();

                ctx.restore();
            }
        }

        class GoldDust {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : Math.random() * -height;
                this.vy = 0.1 + Math.random() * 0.3;
                this.size = 0.6 + Math.random() * 1.4;
                this.twinkle = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                this.twinkle += 0.04;
                if (this.y > height + 8) this.reset(false);
            }

            draw() {
                const a = 0.12 + Math.sin(this.twinkle) * 0.1;
                ctx.save();
                ctx.fillStyle = `rgba(${PALETTE.amber.r}, ${PALETTE.amber.g}, ${PALETTE.amber.b}, ${Math.max(0.03, a)})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resizeCanvas();
        for (let i = 0; i < 4; i++) rings.push(new HourglassRing(i, 4));
        for (let i = 0; i < 90; i++) grains.push(new GrainMote());
        for (let i = 0; i < 50; i++) dust.push(new GoldDust());

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            pulse++;
            ctx.clearRect(0, 0, width, height);

            // hearth-warm glow where the rings turn
            const glow = ctx.createRadialGradient(
                width * 0.5, height * 0.44, 0,
                width * 0.5, height * 0.44, Math.min(width, height) * 0.55
            );
            glow.addColorStop(0, 'rgba(212, 175, 55, 0.07)');
            glow.addColorStop(0.6, 'rgba(176, 124, 52, 0.03)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            rings.forEach(r => { r.update(); r.draw(); });
            dust.forEach(d => { d.update(); d.draw(); });
            grains.forEach(g => { g.update(); g.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    } else if (canvas) {
        canvas.style.display = 'none';
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
                        entry.target.classList.add('visible');
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
        revealElements.forEach(el => {
            el.classList.add('revealed');
            el.classList.add('visible');
        });
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

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ============================
    // Parallax on Hero Mascot
    // ============================
    const heroMascot = document.querySelector('.mascot-img');

    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
            const scrollY = window.scrollY;
            if (scrollY < heroHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

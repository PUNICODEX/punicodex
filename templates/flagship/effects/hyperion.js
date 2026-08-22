/**
 * HYPERÍŌN — Titan of Heavenly Light, the Watcher Above
 * Rotating sun-ray crown, watchful flare pulses, rising embers
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Sunwatch Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('sunwatch-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let rays = [];
        let flares = [];
        let embers = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;
        let sunX = 0;
        let sunY = 0;
        let lastFlare = 0;

        const RAY_COUNT = 26;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            sunX = width * 0.5;
            sunY = height * 0.22;
        }

        class SunRay {
            constructor(index) {
                this.index = index;
                this.baseAngle = (index / RAY_COUNT) * Math.PI * 2;
                this.lengthRatio = index % 2 === 0 ? 1.0 : 0.62;
                this.widthBase = 0.028 + Math.random() * 0.014;
                this.pulsePhase = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.008 + Math.random() * 0.01;
            }

            draw(rotation) {
                const angle = this.baseAngle + rotation;
                this.pulsePhase += this.pulseSpeed;
                const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase);
                const reach = Math.max(width, height) * 0.75 * this.lengthRatio * pulse;
                const halfWidth = this.widthBase;

                const tipX = sunX + Math.cos(angle) * reach;
                const tipY = sunY + Math.sin(angle) * reach;
                const lX = sunX + Math.cos(angle - halfWidth) * 40;
                const lY = sunY + Math.sin(angle - halfWidth) * 40;
                const rX = sunX + Math.cos(angle + halfWidth) * 40;
                const rY = sunY + Math.sin(angle + halfWidth) * 40;

                const grad = ctx.createLinearGradient(sunX, sunY, tipX, tipY);
                grad.addColorStop(0, 'rgba(255, 214, 120, 0.22)');
                grad.addColorStop(0.4, 'rgba(244, 180, 80, 0.10)');
                grad.addColorStop(1, 'rgba(244, 180, 80, 0)');

                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(lX, lY);
                ctx.lineTo(tipX, tipY);
                ctx.lineTo(rX, rY);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        class FlarePulse {
            constructor() {
                this.radius = 30;
                this.maxRadius = Math.max(width, height) * 0.9;
                this.speed = 3.2 + Math.random() * 2.2;
                this.opacity = 0.5;
                this.lineWidth = 2.5 + Math.random() * 2;
            }

            update() {
                this.radius += this.speed;
                this.speed *= 1.008;
                this.opacity = Math.max(0, 0.5 * (1 - this.radius / this.maxRadius));
                return this.radius < this.maxRadius && this.opacity > 0.005;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#FFD98E';
                ctx.lineWidth = this.lineWidth;
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#FFC860';
                ctx.beginPath();
                ctx.arc(sunX, sunY, this.radius, 0, Math.PI * 2);
                ctx.stroke();
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
                this.vy = -(0.25 + Math.random() * 0.6);
                this.vx = (Math.random() - 0.5) * 0.4;
                this.size = 0.7 + Math.random() * 2;
                this.opacity = 0.12 + Math.random() * 0.3;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.025;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const twinkle = 0.5 + 0.5 * Math.sin(this.phase);
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = '#FFCF7A';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#FFB84D';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < RAY_COUNT; i++) rays.push(new SunRay(i));
        for (let i = 0; i < 70; i++) embers.push(new Ember());

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

            // Slow rotation of the ray crown
            const rotation = frameCount * 0.0009;
            rays.forEach(r => r.draw(rotation));

            // Solar core: layered breathing glow
            const breathe = 0.5 + 0.5 * Math.sin(frameCount * 0.01);
            const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 220 + breathe * 40);
            core.addColorStop(0, `rgba(255, 240, 200, ${0.28 + breathe * 0.08})`);
            core.addColorStop(0.25, `rgba(255, 200, 100, ${0.14 + breathe * 0.04})`);
            core.addColorStop(0.6, 'rgba(230, 150, 60, 0.05)');
            core.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = core;
            ctx.fillRect(0, 0, width, height);

            // Watchful flare pulses on a slow cadence
            if (frameCount - lastFlare > 240 + Math.random() * 180) {
                lastFlare = frameCount;
                flares.push(new FlarePulse());
            }
            flares = flares.filter(f => {
                f.draw();
                return f.update();
            });

            // Horizontal watch-glare streak across the core, subtly pulsing
            const glareAlpha = 0.05 + breathe * 0.04;
            const glare = ctx.createLinearGradient(0, sunY - 4, 0, sunY + 4);
            glare.addColorStop(0, 'rgba(255, 230, 170, 0)');
            glare.addColorStop(0.5, `rgba(255, 230, 170, ${glareAlpha})`);
            glare.addColorStop(1, 'rgba(255, 230, 170, 0)');
            ctx.fillStyle = glare;
            ctx.fillRect(0, sunY - 4, width, 8);

            embers.forEach(e => { e.update(); e.draw(); });

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

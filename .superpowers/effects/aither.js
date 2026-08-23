/**
 * AITHĒR — Upper Air, Light
 * Radiant light shafts drifting upward through luminous air
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Radiance Canvas ──────────────────────────────────────────────────── */
    const canvas = document.getElementById('radiance-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let shafts = [];
        let lightMotes = [];
        let hazeBands = [];
        let running = true;
        let rafId = null;
        let time = 0;
        let pointerX = 0.5;
        let pointerGlow = 0;
        let pointerGlowTarget = 0;

        const PALETTE = {
            gold: { r: 250, g: 226, b: 160 },
            white: { r: 255, g: 250, b: 235 },
            sky: { r: 190, g: 214, b: 245 },
            dawn: { r: 245, g: 200, b: 140 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* A shaft of light rising and slowly wheeling like a searchlight reversed */
        class LightShaft {
            constructor() {
                this.reset();
            }

            reset() {
                this.baseX = Math.random() * width;
                this.drift = (Math.random() - 0.5) * 0.35;
                this.tilt = (Math.random() - 0.5) * 0.35;
                this.tiltSpeed = (Math.random() - 0.5) * 0.0006;
                this.beamWidth = 30 + Math.random() * 90;
                this.opacity = 0.04 + Math.random() * 0.1;
                this.phase = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.003 + Math.random() * 0.006;
                this.warm = Math.random() < 0.5;
            }

            update() {
                this.phase += this.pulseSpeed;
                this.tilt += this.tiltSpeed;
                this.baseX += this.drift;
                if (this.baseX < -150) this.baseX = width + 150;
                if (this.baseX > width + 150) this.baseX = -150;
                if (this.tilt > 0.4 || this.tilt < -0.4) this.tiltSpeed *= -1;
            }

            draw() {
                const pulse = 0.6 + Math.sin(this.phase) * 0.4;
                const alpha = this.opacity * pulse;
                const topX = this.baseX + this.tilt * height;

                ctx.save();
                ctx.globalAlpha = alpha;
                const grad = ctx.createLinearGradient(this.baseX, height, topX, 0);
                const c = this.warm ? PALETTE.gold : PALETTE.sky;
                grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.0)`);
                grad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, 0.55)`);
                grad.addColorStop(1, `rgba(${PALETTE.white.r}, ${PALETTE.white.g}, ${PALETTE.white.b}, 0.9)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(this.baseX - this.beamWidth, height);
                ctx.lineTo(this.baseX + this.beamWidth, height);
                ctx.lineTo(topX + this.beamWidth * 0.35, 0);
                ctx.lineTo(topX - this.beamWidth * 0.35, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        /* Dust of light rising through the shafts */
        class LightMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vy = -(0.25 + Math.random() * 0.9);
                this.sway = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.008 + Math.random() * 0.02;
                this.size = 0.5 + Math.random() * 1.8;
                this.opacity = 0.15 + Math.random() * 0.5;
                this.twinkle = 0.02 + Math.random() * 0.05;
                this.warm = Math.random();
            }

            update() {
                this.sway += this.swaySpeed;
                this.x += Math.sin(this.sway) * 0.35;
                this.y += this.vy;
                this.opacity += (Math.random() - 0.5) * this.twinkle;
                this.opacity = Math.max(0.08, Math.min(0.7, this.opacity));
                if (this.y < -10) {
                    this.reset(false);
                }
            }

            draw() {
                const r = Math.round(PALETTE.sky.r + (PALETTE.gold.r - PALETTE.sky.r) * this.warm);
                const g = Math.round(PALETTE.sky.g + (PALETTE.gold.g - PALETTE.sky.g) * this.warm);
                const b = Math.round(PALETTE.sky.b + (PALETTE.gold.b - PALETTE.sky.b) * this.warm);
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Broad horizontal bands of luminous haze, rising very slowly */
        class HazeBand {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.y = scatter ? Math.random() * height : height + 120;
                this.vy = -(0.05 + Math.random() * 0.12);
                this.thickness = 60 + Math.random() * 140;
                this.opacity = 0.03 + Math.random() * 0.05;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += 0.003;
                this.y += this.vy;
                if (this.y < -this.thickness) {
                    this.reset(false);
                }
            }

            draw() {
                const breathe = 0.75 + Math.sin(this.phase) * 0.25;
                const grad = ctx.createLinearGradient(0, this.y - this.thickness, 0, this.y + this.thickness);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, `rgba(${PALETTE.dawn.r}, ${PALETTE.dawn.g}, ${PALETTE.dawn.b}, ${this.opacity * breathe})`);
                grad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.fillStyle = grad;
                ctx.fillRect(0, this.y - this.thickness, width, this.thickness * 2);
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 10; i++) shafts.push(new LightShaft());
        for (let i = 0; i < 160; i++) lightMotes.push(new LightMote());
        for (let i = 0; i < 5; i++) hazeBands.push(new HazeBand());

        window.addEventListener('resize', resize);

        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouchDevice) {
            document.addEventListener('mousemove', (e) => {
                pointerX = e.clientX / window.innerWidth;
                pointerGlowTarget = 0.35;
            }, { passive: true });
            document.addEventListener('mouseleave', () => {
                pointerGlowTarget = 0;
            });
        }

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running && rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });

        function animate() {
            if (!running) {
                rafId = null;
                return;
            }
            time++;
            ctx.clearRect(0, 0, width, height);

            // Luminous sky gradient — brightest at the crown of the page
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, `rgba(${PALETTE.white.r}, ${PALETTE.white.g}, ${PALETTE.white.b}, 0.16)`);
            sky.addColorStop(0.4, `rgba(${PALETTE.sky.r}, ${PALETTE.sky.g}, ${PALETTE.sky.b}, 0.08)`);
            sky.addColorStop(1, `rgba(${PALETTE.dawn.r}, ${PALETTE.dawn.g}, ${PALETTE.dawn.b}, 0.05)`);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            hazeBands.forEach(h => { h.update(); h.draw(); });
            shafts.forEach(s => { s.update(); s.draw(); });
            lightMotes.forEach(m => { m.update(); m.draw(); });

            // Pointer-following bloom of light
            pointerGlow += (pointerGlowTarget - pointerGlow) * 0.04;
            if (pointerGlow > 0.01) {
                const gx = pointerX * width;
                const bloom = ctx.createRadialGradient(gx, height * 0.4, 0, gx, height * 0.4, 220);
                bloom.addColorStop(0, `rgba(${PALETTE.white.r}, ${PALETTE.white.g}, ${PALETTE.white.b}, ${pointerGlow * 0.35})`);
                bloom.addColorStop(1, 'transparent');
                ctx.fillStyle = bloom;
                ctx.beginPath();
                ctx.arc(gx, height * 0.4, 220, 0, Math.PI * 2);
                ctx.fill();
            }

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);
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

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
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

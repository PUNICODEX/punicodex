/**
 * ÉRIS — Strife, Discord
 * Two colliding particle streams, golden apple glinting at the collision point
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Discord Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('discord-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let clashX, clashY;
        let streams = [];
        let clashes = [];
        let running = true;
        let rafId = null;
        let time = 0;
        let appleGlint = 0;

        const PALETTE = {
            crimson: { r: 200, g: 60, b: 70 },
            crimsonDeep: { r: 140, g: 30, b: 45 },
            ivory: { r: 235, g: 225, b: 205 },
            ivoryDim: { r: 190, g: 180, b: 165 },
            gold: { r: 230, g: 190, b: 80 },
            goldHot: { r: 255, g: 235, b: 160 },
            dusk: 'rgba(14, 10, 18, 0.7)'
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            clashX = width / 2;
            clashY = height / 2;
        }

        /* One particle of a warring stream — crimson from the left, ivory from the right */
        class StreamParticle {
            constructor(side) {
                this.side = side; // -1 = crimson from left, +1 = ivory from right
                this.reset(true);
            }

            reset(scatter) {
                const fromX = this.side < 0 ? -20 : width + 20;
                this.x = scatter ? Math.random() * width : fromX;
                this.baseY = height * (0.2 + Math.random() * 0.6);
                this.y = this.baseY;
                this.speed = 1.2 + Math.random() * 2.4;
                this.size = 0.7 + Math.random() * 2;
                this.waveAmp = 10 + Math.random() * 30;
                this.waveFreq = 0.004 + Math.random() * 0.008;
                this.phase = Math.random() * Math.PI * 2;
                this.opacity = 0.3 + Math.random() * 0.5;
            }

            update() {
                this.phase += this.waveFreq * 60 * 0.016 * 10;
                this.x += this.speed * -this.side;
                this.y = this.baseY + Math.sin(this.phase) * this.waveAmp;

                // Approach turbulence: streams buckle as they near the front
                const distToClash = Math.abs(this.x - clashX);
                if (distToClash < 120) {
                    this.y += (clashY - this.y) * 0.04 * (1 - distToClash / 120);
                }

                // Collision: burst into a clash spark, then recycle to the far side
                if (distToClash < 14) {
                    if (Math.random() < 0.4 && clashes.length < 90) {
                        clashes.push(new ClashSpark(this.x, this.y, this.side));
                    }
                    this.reset(false);
                    return;
                }

                if ((this.side < 0 && this.x > width + 30) || (this.side > 0 && this.x < -30)) {
                    this.reset(false);
                }
            }

            draw() {
                const c = this.side < 0 ? PALETTE.crimson : PALETTE.ivory;
                const distToClash = Math.abs(this.x - clashX);
                const heat = Math.max(0, 1 - distToClash / 200);

                ctx.save();
                ctx.globalAlpha = this.opacity * (0.6 + heat * 0.4);
                if (heat > 0.4) {
                    ctx.shadowBlur = 6 * heat;
                    ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.8)`;
                }
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

                // Elongated along the direction of travel — a stream, not a cloud
                const stretch = 1 + this.speed * 0.4;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.size * stretch, this.size, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* A spark thrown off where the two hosts meet */
        class ClashSpark {
            constructor(x, y, side) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 2 + side * (0.5 + Math.random());
                this.vy = (Math.random() - 0.5) * 3;
                this.life = 0;
                this.maxLife = 20 + Math.random() * 25;
                this.size = 0.5 + Math.random() * 1.4;
                this.golden = Math.random() < 0.35;
            }

            update() {
                this.life++;
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.97;
                this.vy *= 0.97;
            }

            draw() {
                const t = this.life / this.maxLife;
                const alpha = (1 - t) * 0.7;
                const c = this.golden ? PALETTE.gold : PALETTE.goldHot;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = this.golden ? 8 : 4;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * (1 - t * 0.5), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            get alive() {
                return this.life < this.maxLife;
            }
        }

        resize();
        for (let i = 0; i < 150; i++) streams.push(new StreamParticle(-1));
        for (let i = 0; i < 150; i++) streams.push(new StreamParticle(1));

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running && rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });

        function drawApple() {
            // The golden apple at the heart of the quarrel — small, bright, unmistakable
            const appleR = 9 + Math.sin(time * 0.03) * 1.2;

            // Ambient gold halo
            const haloR = 60 + appleGlint * 60;
            const halo = ctx.createRadialGradient(clashX, clashY, 0, clashX, clashY, haloR);
            halo.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.3 + appleGlint * 0.25})`);
            halo.addColorStop(0.5, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.08)`);
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(clashX, clashY, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Apple body
            ctx.save();
            ctx.shadowBlur = 24;
            ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.9)`;
            const body = ctx.createRadialGradient(
                clashX - appleR * 0.35, clashY - appleR * 0.35, appleR * 0.1,
                clashX, clashY, appleR
            );
            body.addColorStop(0, `rgb(${PALETTE.goldHot.r}, ${PALETTE.goldHot.g}, ${PALETTE.goldHot.b})`);
            body.addColorStop(0.7, `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`);
            body.addColorStop(1, 'rgb(160, 120, 40)');
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.arc(clashX, clashY, appleR, 0, Math.PI * 2);
            ctx.fill();

            // Stem
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(120, 90, 40, 0.9)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(clashX, clashY - appleR * 0.85);
            ctx.quadraticCurveTo(clashX + 3, clashY - appleR * 1.35, clashX + 6, clashY - appleR * 1.5);
            ctx.stroke();
            ctx.restore();

            // Periodic glint sweep across the apple
            if (appleGlint > 0.02) {
                ctx.save();
                ctx.globalAlpha = appleGlint;
                ctx.strokeStyle = `rgba(${PALETTE.goldHot.r}, ${PALETTE.goldHot.g}, ${PALETTE.goldHot.b}, 1)`;
                ctx.lineWidth = 1.2;
                const gl = appleR * (1.2 + appleGlint);
                ctx.beginPath();
                ctx.moveTo(clashX - gl, clashY);
                ctx.lineTo(clashX + gl, clashY);
                ctx.moveTo(clashX, clashY - gl);
                ctx.lineTo(clashX, clashY + gl);
                ctx.stroke();
                ctx.restore();
            }
        }

        function animate() {
            if (!running) {
                rafId = null;
                return;
            }
            time++;

            // The glint flares on a slow cycle, then dies away
            const glintCycle = (time % 420) / 420;
            appleGlint = glintCycle < 0.1 ? Math.sin((glintCycle / 0.1) * Math.PI) : appleGlint * 0.95;

            ctx.clearRect(0, 0, width, height);

            // Dusk backdrop, split by the front line
            const left = ctx.createLinearGradient(0, 0, clashX, 0);
            left.addColorStop(0, `rgba(${PALETTE.crimsonDeep.r}, ${PALETTE.crimsonDeep.g}, ${PALETTE.crimsonDeep.b}, 0.14)`);
            left.addColorStop(1, 'rgba(14, 10, 18, 0)');
            ctx.fillStyle = left;
            ctx.fillRect(0, 0, clashX, height);

            const right = ctx.createLinearGradient(width, 0, clashX, 0);
            right.addColorStop(0, `rgba(${PALETTE.ivoryDim.r}, ${PALETTE.ivoryDim.g}, ${PALETTE.ivoryDim.b}, 0.1)`);
            right.addColorStop(1, 'rgba(14, 10, 18, 0)');
            ctx.fillStyle = right;
            ctx.fillRect(clashX, 0, width - clashX, height);

            ctx.fillStyle = PALETTE.dusk;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;

            streams.forEach(p => { p.update(); p.draw(); });

            clashes = clashes.filter(s => s.alive);
            clashes.forEach(s => { s.update(); s.draw(); });

            drawApple();

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

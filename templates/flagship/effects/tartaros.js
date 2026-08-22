/**
 * TÁRTAROS — The Primordial Abyss
 * Falling ember motes descending into immeasurable depth
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Abyss Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('tartaros-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let embers = [];
        let ashVeils = [];
        let deepGlows = [];
        let running = true;
        let rafId = null;
        let time = 0;

        const PALETTE = {
            ember: { r: 255, g: 120, b: 40 },
            emberHot: { r: 255, g: 200, b: 120 },
            coal: { r: 180, g: 60, b: 30 },
            abyssTop: 'rgba(8, 5, 12, 0.55)',
            abyssBottom: 'rgba(2, 1, 4, 0.95)'
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* An ember falling forever down into the pit */
        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : -20 - Math.random() * 60;
                this.vy = 0.4 + Math.random() * 1.6;
                this.swayAmp = 6 + Math.random() * 22;
                this.swayFreq = 0.008 + Math.random() * 0.02;
                this.phase = Math.random() * Math.PI * 2;
                this.size = 0.6 + Math.random() * 2.2;
                this.flicker = 0.05 + Math.random() * 0.12;
                this.heat = Math.random();
                this.trail = [];
                this.maxTrail = 5 + Math.floor(Math.random() * 8);
            }

            update() {
                this.phase += this.swayFreq * 60 * 0.016;
                this.x += Math.sin(this.phase * 4) * 0.4;
                this.y += this.vy;
                this.heat += (Math.random() - 0.5) * this.flicker;
                this.heat = Math.max(0.15, Math.min(1, this.heat));

                this.trail.push({ x: this.x + Math.sin(this.phase * 4) * this.swayAmp * 0.1, y: this.y });
                if (this.trail.length > this.maxTrail) this.trail.shift();

                if (this.y > height + 30) {
                    this.reset(false);
                }
            }

            draw() {
                const px = this.x + Math.sin(this.phase * 4) * this.swayAmp * 0.1;
                const fadeToDepth = 1 - (this.y / height) * 0.35;

                // Trail
                ctx.save();
                ctx.lineCap = 'round';
                for (let i = 1; i < this.trail.length; i++) {
                    const t = i / this.trail.length;
                    ctx.globalAlpha = t * 0.25 * this.heat * fadeToDepth;
                    ctx.strokeStyle = `rgba(${PALETTE.coal.r}, ${PALETTE.coal.g}, ${PALETTE.coal.b}, 1)`;
                    ctx.lineWidth = this.size * t;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    ctx.stroke();
                }
                ctx.restore();

                // Core
                ctx.save();
                ctx.globalAlpha = this.heat * fadeToDepth;
                ctx.shadowBlur = 8 + this.heat * 10;
                ctx.shadowColor = `rgba(${PALETTE.ember.r}, ${PALETTE.ember.g}, ${PALETTE.ember.b}, 0.8)`;
                const mixR = Math.round(PALETTE.coal.r + (PALETTE.emberHot.r - PALETTE.coal.r) * this.heat);
                const mixG = Math.round(PALETTE.coal.g + (PALETTE.emberHot.g - PALETTE.coal.g) * this.heat);
                const mixB = Math.round(PALETTE.coal.b + (PALETTE.emberHot.b - PALETTE.coal.b) * this.heat);
                ctx.fillStyle = `rgb(${mixR}, ${mixG}, ${mixB})`;
                ctx.beginPath();
                ctx.arc(px, this.y, this.size * (0.7 + this.heat * 0.5), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Wide, slow sheets of ash haze drifting down the shaft of the pit */
        class AshVeil {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : -200;
                this.vy = 0.08 + Math.random() * 0.2;
                this.vx = (Math.random() - 0.5) * 0.12;
                this.radius = 140 + Math.random() * 260;
                this.opacity = 0.03 + Math.random() * 0.05;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += 0.004;
                this.y += this.vy;
                this.x += this.vx + Math.sin(this.phase) * 0.15;
                if (this.y > height + this.radius) {
                    this.reset(false);
                }
            }

            draw() {
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                grad.addColorStop(0, `rgba(70, 40, 30, ${this.opacity})`);
                grad.addColorStop(0.6, `rgba(40, 22, 18, ${this.opacity * 0.5})`);
                grad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Furnace glows far below — the pit's own slow-burning heart */
        class DeepGlow {
            constructor() {
                this.x = Math.random() * width;
                this.baseY = height * (0.75 + Math.random() * 0.35);
                this.radius = 160 + Math.random() * 280;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.006 + Math.random() * 0.01;
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                const pulse = 0.5 + Math.sin(this.phase) * 0.5;
                const alpha = 0.04 + pulse * 0.06;
                const grad = ctx.createRadialGradient(this.x, this.baseY, 0, this.x, this.baseY, this.radius);
                grad.addColorStop(0, `rgba(${PALETTE.ember.r}, ${PALETTE.ember.g}, ${PALETTE.ember.b}, ${alpha})`);
                grad.addColorStop(0.5, `rgba(${PALETTE.coal.r}, ${PALETTE.coal.g}, ${PALETTE.coal.b}, ${alpha * 0.4})`);
                grad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.baseY, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 200; i++) embers.push(new Ember());
        for (let i = 0; i < 8; i++) ashVeils.push(new AshVeil());
        for (let i = 0; i < 4; i++) deepGlows.push(new DeepGlow());

        window.addEventListener('resize', resize);

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

            // The descent — darkness deepening toward the bottom of the world
            const depth = ctx.createLinearGradient(0, 0, 0, height);
            depth.addColorStop(0, PALETTE.abyssTop);
            depth.addColorStop(0.55, 'rgba(5, 3, 8, 0.75)');
            depth.addColorStop(1, PALETTE.abyssBottom);
            ctx.fillStyle = depth;
            ctx.fillRect(0, 0, width, height);

            deepGlows.forEach(g => { g.update(); g.draw(); });
            ashVeils.forEach(v => { v.update(); v.draw(); });
            embers.forEach(e => { e.update(); e.draw(); });

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

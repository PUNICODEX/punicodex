/**
 * DIÓNYSOS — God of Wine & Ecstasy
 * Interactive Layer: Grape-Cluster Bubbles, Vine Tendrils, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Vineyard System
    // ============================
    const canvas = document.getElementById('vine-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let clusters = [];
        let tendrils = [];
        let motes = [];

        const PALETTE = {
            grapeDeep: { r: 74, g: 20, b: 90 },
            grape: { r: 128, g: 40, b: 130 },
            grapeLight: { r: 196, g: 96, b: 178 },
            wine: { r: 114, g: 22, b: 60 },
            gold: { r: 212, g: 175, b: 55 },
            ivy: { r: 74, g: 124, b: 60 },
        };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class GrapeCluster {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 50;
                this.vy = -(0.22 + Math.random() * 0.5);
                this.wobblePhase = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.008 + Math.random() * 0.012;
                this.wobbleAmp = 10 + Math.random() * 20;
                this.radius = 9 + Math.random() * 15;
                this.opacity = 0.22 + Math.random() * 0.38;
                this.depth = 0.5 + Math.random() * 0.5;
                this.grapes = [];
                const count = 6 + Math.floor(Math.random() * 6);
                for (let i = 0; i < count; i++) {
                    const row = Math.floor(i / 3);
                    this.grapes.push({
                        dx: (Math.random() - 0.5) * this.radius * 1.4 * (1 - row * 0.18),
                        dy: -row * this.radius * 0.42 + (Math.random() - 0.5) * 4,
                        r: this.radius * (0.24 + Math.random() * 0.14),
                        shade: Math.random(),
                    });
                }
            }

            update() {
                this.y += this.vy * this.depth;
                this.wobblePhase += this.wobbleSpeed;
                if (this.y < -60) this.reset(false);
            }

            draw() {
                const swayX = this.x + Math.sin(this.wobblePhase) * this.wobbleAmp;
                ctx.save();
                ctx.globalAlpha = this.opacity;

                // curling stem above the cluster
                ctx.strokeStyle = `rgba(${PALETTE.ivy.r}, ${PALETTE.ivy.g}, ${PALETTE.ivy.b}, 0.5)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(swayX, this.y - this.radius * 1.05);
                ctx.quadraticCurveTo(
                    swayX + 6, this.y - this.radius * 1.65,
                    swayX + 14, this.y - this.radius * 1.85
                );
                ctx.stroke();

                this.grapes.forEach(g => {
                    const gx = swayX + g.dx;
                    const gy = this.y + g.dy;
                    const grad = ctx.createRadialGradient(
                        gx - g.r * 0.35, gy - g.r * 0.35, g.r * 0.1,
                        gx, gy, g.r
                    );
                    if (g.shade < 0.4) {
                        grad.addColorStop(0, `rgba(${PALETTE.grapeLight.r}, ${PALETTE.grapeLight.g}, ${PALETTE.grapeLight.b}, 0.95)`);
                        grad.addColorStop(1, `rgba(${PALETTE.grapeDeep.r}, ${PALETTE.grapeDeep.g}, ${PALETTE.grapeDeep.b}, 0.9)`);
                    } else {
                        grad.addColorStop(0, `rgba(${PALETTE.grape.r}, ${PALETTE.grape.g}, ${PALETTE.grape.b}, 0.95)`);
                        grad.addColorStop(1, `rgba(${PALETTE.wine.r}, ${PALETTE.wine.g}, ${PALETTE.wine.b}, 0.9)`);
                    }
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
                    ctx.fill();

                    // specular highlight — the "bubble" sheen
                    ctx.fillStyle = 'rgba(255, 235, 250, 0.32)';
                    ctx.beginPath();
                    ctx.arc(gx - g.r * 0.35, gy - g.r * 0.4, g.r * 0.22, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
            }
        }

        class Tendril {
            constructor(side) {
                this.side = side;
                this.baseY = height * (0.55 + Math.random() * 0.45);
                this.length = height * (0.26 + Math.random() * 0.28);
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.004 + Math.random() * 0.006;
                this.curl = 0.6 + Math.random() * 0.9;
                this.thickness = 1.5 + Math.random() * 1.5;
                this.leaves = [];
                const leafCount = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < leafCount; i++) {
                    this.leaves.push({
                        t: 0.25 + (i / leafCount) * 0.7,
                        size: 6 + Math.random() * 8,
                        angle: (Math.random() - 0.5) * 1.4,
                    });
                }
            }

            pointAt(t, sway) {
                const dir = this.side === 'left' ? 1 : -1;
                const baseX = this.side === 'left' ? -10 : width + 10;
                const curlIn = Math.sin(t * Math.PI * this.curl + this.phase) * 34 * t;
                return {
                    x: baseX + dir * (t * this.length * 0.55 + sway * t * 30) + curlIn * dir,
                    y: this.baseY - t * this.length,
                };
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                const sway = Math.sin(this.phase * 1.7);
                const steps = 22;

                ctx.save();
                ctx.strokeStyle = `rgba(${PALETTE.ivy.r}, ${PALETTE.ivy.g}, ${PALETTE.ivy.b}, 0.55)`;
                ctx.lineCap = 'round';
                ctx.lineWidth = this.thickness;
                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const p = this.pointAt(i / steps, sway);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();

                // curling tip
                const tip = this.pointAt(1, sway);
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 7 + Math.sin(this.phase * 2.2) * 2.5, this.phase, this.phase + Math.PI * 1.5);
                ctx.lineWidth = 1;
                ctx.stroke();

                this.leaves.forEach(leaf => {
                    const p = this.pointAt(leaf.t, sway);
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(leaf.angle + sway * 0.25);
                    const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, leaf.size);
                    lg.addColorStop(0, 'rgba(110, 160, 88, 0.7)');
                    lg.addColorStop(1, 'rgba(46, 84, 40, 0.15)');
                    ctx.fillStyle = lg;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.45, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                ctx.restore();
            }
        }

        class WineMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vy = -(0.15 + Math.random() * 0.35);
                this.vx = (Math.random() - 0.5) * 0.2;
                this.size = 0.8 + Math.random() * 2;
                this.twinkle = Math.random() * Math.PI * 2;
                this.gold = Math.random() < 0.35;
            }

            update() {
                this.y += this.vy;
                this.x += this.vx;
                this.twinkle += 0.05;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const a = 0.22 + Math.sin(this.twinkle) * 0.18;
                const c = this.gold ? PALETTE.gold : PALETTE.grapeLight;
                ctx.save();
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0.04, a)})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resizeCanvas();
        for (let i = 0; i < 22; i++) clusters.push(new GrapeCluster());
        tendrils.push(new Tendril('left'), new Tendril('left'), new Tendril('right'), new Tendril('right'));
        for (let i = 0; i < 60; i++) motes.push(new WineMote());

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            // wine-dark depth glow rising from the floor of the hero
            const depth = ctx.createLinearGradient(0, height * 0.4, 0, height);
            depth.addColorStop(0, 'rgba(60, 14, 60, 0)');
            depth.addColorStop(1, 'rgba(74, 18, 58, 0.16)');
            ctx.fillStyle = depth;
            ctx.fillRect(0, 0, width, height);

            tendrils.forEach(t => { t.update(); t.draw(); });

            clusters.sort((a, b) => a.depth - b.depth);
            clusters.forEach(c => { c.update(); c.draw(); });

            motes.forEach(m => { m.update(); m.draw(); });

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

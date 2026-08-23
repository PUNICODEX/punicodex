/**
 * CHÁOS — The First Void
 * Swirling dark void with gold filaments of creation emerging
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Void Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('void-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let centerX, centerY;
        let motes = [];
        let filaments = [];
        let vortices = [];
        let running = true;
        let rafId = null;
        let time = 0;

        const PALETTE = {
            voidCore: 'rgba(4, 3, 10, 0.9)',
            voidMid: 'rgba(12, 8, 24, 0.5)',
            gold: { r: 212, g: 175, b: 55 },
            paleGold: { r: 245, g: 222, b: 150 },
            deepViolet: { r: 88, g: 60, b: 140 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            centerX = width / 2;
            centerY = height / 2;
        }

        /* Dark motes that orbit and are slowly drawn into the void */
        class VoidMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                const angle = Math.random() * Math.PI * 2;
                const maxR = Math.max(width, height) * 0.75;
                this.radius = scatter
                    ? maxR * (0.15 + Math.random() * 0.85)
                    : maxR * (0.7 + Math.random() * 0.3);
                this.angle = angle;
                this.speed = 0.0015 + Math.random() * 0.003;
                this.infall = 0.06 + Math.random() * 0.22;
                this.size = 0.5 + Math.random() * 1.8;
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.01 + Math.random() * 0.02;
                this.hue = Math.random();
            }

            update() {
                this.angle += this.speed * (60 / Math.max(this.radius, 40));
                this.radius -= this.infall;
                this.wobble += this.wobbleSpeed;
                if (this.radius < 30) {
                    this.reset(false);
                }
            }

            draw() {
                const wob = Math.sin(this.wobble) * 8;
                const x = centerX + Math.cos(this.angle) * (this.radius + wob);
                const y = centerY + Math.sin(this.angle) * (this.radius + wob) * 0.72;
                const depth = Math.min(1, this.radius / (Math.max(width, height) * 0.6));
                const alpha = 0.08 + (1 - depth) * 0.3;

                // Near the core, motes ignite gold — matter becoming creation
                const goldMix = Math.max(0, 1 - this.radius / 180);
                const r = Math.round(90 + (PALETTE.gold.r - 90) * goldMix);
                const g = Math.round(70 + (PALETTE.gold.g - 70) * goldMix);
                const b = Math.round(120 + (PALETTE.gold.b - 120) * goldMix);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.beginPath();
                ctx.arc(x, y, this.size * (0.6 + goldMix), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Gold filaments of creation spiralling out of the void */
        class Filament {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.length = 0;
                this.maxLength = 120 + Math.random() * 260;
                this.growth = 1.2 + Math.random() * 2.2;
                this.curl = 0.012 + Math.random() * 0.02;
                this.opacity = 0;
                this.state = 'grow';
                this.points = [];
                this.width = 0.6 + Math.random() * 1.4;
                this.drift = (Math.random() - 0.5) * 0.004;
            }

            update() {
                if (this.state === 'grow') {
                    this.length += this.growth;
                    this.opacity = Math.min(0.85, this.opacity + 0.02);
                    if (this.length >= this.maxLength) this.state = 'fade';
                } else {
                    this.opacity -= 0.008;
                    this.angle += this.drift;
                    if (this.opacity <= 0) {
                        this.reset();
                        return;
                    }
                }

                // Rebuild the spiral path from the core outward
                this.points.length = 0;
                const steps = 26;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const r = this.length * t;
                    const a = this.angle + t * t * this.curl * this.maxLength;
                    const sx = centerX + Math.cos(a) * r;
                    const sy = centerY + Math.sin(a) * r * 0.72;
                    this.points.push({ x: sx, y: sy, t: t });
                }
            }

            draw() {
                if (this.points.length < 2) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowBlur = 12;
                ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.6)`;

                ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.55)`;
                ctx.lineWidth = this.width;
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i < this.points.length; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
                ctx.stroke();

                // Bright tip — the leading edge of creation
                const tip = this.points[this.points.length - 1];
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(${PALETTE.paleGold.r}, ${PALETTE.paleGold.g}, ${PALETTE.paleGold.b}, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, this.width * 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Slow-breathing clouds of darkness that give the void depth */
        class Vortex {
            constructor() {
                this.angle = Math.random() * Math.PI * 2;
                this.dist = 60 + Math.random() * Math.max(width, height) * 0.35;
                this.radius = 120 + Math.random() * 220;
                this.speed = (Math.random() - 0.5) * 0.0016;
                this.phase = Math.random() * Math.PI * 2;
                this.breath = 0.002 + Math.random() * 0.004;
                this.violet = Math.random() < 0.4;
            }

            update() {
                this.angle += this.speed;
                this.phase += this.breath;
            }

            draw() {
                const breathe = 0.7 + Math.sin(this.phase) * 0.3;
                const x = centerX + Math.cos(this.angle) * this.dist;
                const y = centerY + Math.sin(this.angle) * this.dist * 0.7;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, this.radius * breathe);
                if (this.violet) {
                    grad.addColorStop(0, `rgba(${PALETTE.deepViolet.r}, ${PALETTE.deepViolet.g}, ${PALETTE.deepViolet.b}, 0.05)`);
                    grad.addColorStop(0.6, 'rgba(30, 18, 55, 0.03)');
                } else {
                    grad.addColorStop(0, 'rgba(10, 6, 20, 0.16)');
                    grad.addColorStop(0.6, 'rgba(6, 4, 12, 0.08)');
                }
                grad.addColorStop(1, 'transparent');
                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, this.radius * breathe, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 240; i++) motes.push(new VoidMote());
        for (let i = 0; i < 9; i++) filaments.push(new Filament());
        for (let i = 0; i < 7; i++) vortices.push(new Vortex());

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

            // The void itself — a deep radial darkness
            const bg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
            bg.addColorStop(0, PALETTE.voidCore);
            bg.addColorStop(0.5, PALETTE.voidMid);
            bg.addColorStop(1, 'rgba(2, 2, 6, 0.0)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            // Event horizon glow — where gold is born from nothing
            const pulse = 0.5 + Math.sin(time * 0.02) * 0.5;
            const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 110 + pulse * 30);
            coreGlow.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.14 + pulse * 0.08})`);
            coreGlow.addColorStop(0.4, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.05)`);
            coreGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 110 + pulse * 30, 0, Math.PI * 2);
            ctx.fill();

            vortices.forEach(v => { v.update(); v.draw(); });
            motes.forEach(m => { m.update(); m.draw(); });
            filaments.forEach(f => { f.update(); f.draw(); });

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

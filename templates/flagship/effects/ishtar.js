/**
 * ISHTAR — Lady of Love, War, and Venus
 * Interactive Layer: Eight-Pointed Star Ignition, Lion-Prowl Field, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Star & Lion-Prowl Canvas
    // ============================
    const canvas = document.getElementById('starlion-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let energyMotes = [];
        let shockwaves = [];
        let twinkles = [];
        let energy = 0;
        let starFlare = 0;
        let running = true;
        let rafId = null;

        const MOTE_CAP = 110;
        const IGNITION_THRESHOLD = 42;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedTwinkles();
        }

        function starX() { return width / 2; }
        function starY() { return height * 0.36; }
        function starUnit() { return Math.min(width, height); }

        function seedTwinkles() {
            twinkles = [];
            for (let i = 0; i < 90; i++) {
                twinkles.push({
                    x: Math.random() * width,
                    y: Math.random() * height * 0.6,
                    size: Math.random() * 1.3 + 0.4,
                    phase: Math.random() * Math.PI * 2,
                    speed: Math.random() * 0.025 + 0.008
                });
            }
        }

        class EnergyMote {
            constructor() {
                this.reset();
            }

            reset() {
                const edge = Math.floor(Math.random() * 4);
                if (edge === 0) { this.x = Math.random() * width; this.y = -10; }
                else if (edge === 1) { this.x = Math.random() * width; this.y = height + 10; }
                else if (edge === 2) { this.x = -10; this.y = Math.random() * height; }
                else { this.x = width + 10; this.y = Math.random() * height; }
                this.speed = 0.6 + Math.random() * 0.9;
                this.size = Math.random() * 1.8 + 0.6;
                this.wobble = Math.random() * Math.PI * 2;
            }

            update() {
                const dx = starX() - this.x;
                const dy = starY() - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                this.wobble += 0.08;
                this.speed = Math.min(this.speed + 0.012, 4.2);
                this.x += (dx / dist) * this.speed + Math.sin(this.wobble) * 0.5;
                this.y += (dy / dist) * this.speed + Math.cos(this.wobble) * 0.5;
                if (dist < starUnit() * 0.045) {
                    energy++;
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#FFD898';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#F0B060';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Shockwave {
            constructor() {
                this.radius = starUnit() * 0.06;
                this.maxRadius = starUnit() * 0.55;
            }

            update() {
                this.radius += starUnit() * 0.006;
                return this.radius < this.maxRadius;
            }

            draw() {
                const alpha = 0.45 * (1 - this.radius / this.maxRadius);
                if (alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#FFE0B0';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(starX(), starY(), this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        function traceStar(cx, cy, outer, inner, rot) {
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const a = rot + (i / 16) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
        }

        function drawEightPointedStar(time) {
            const sx = starX();
            const sy = starY();
            const charge = Math.min(1, energy / IGNITION_THRESHOLD);
            const pulse = 0.9 + 0.1 * Math.sin(time * 0.0016);
            const outer = starUnit() * 0.085 * pulse * (1 + starFlare * 0.25);
            const inner = outer * 0.42;
            const rot = time * 0.00015;

            // Charge halo
            const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, outer * (3 + starFlare * 3));
            halo.addColorStop(0, `rgba(255, 215, 150, ${0.16 + charge * 0.14 + starFlare * 0.3})`);
            halo.addColorStop(0.5, `rgba(200, 90, 60, ${0.06 + starFlare * 0.12})`);
            halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = halo;
            ctx.fillRect(sx - outer * 7, sy - outer * 7, outer * 14, outer * 14);

            // Star body
            ctx.save();
            ctx.shadowBlur = 18 + charge * 14 + starFlare * 40;
            ctx.shadowColor = 'rgba(255, 200, 120, 0.9)';
            traceStar(sx, sy, outer, inner, rot);
            ctx.fillStyle = `rgba(40, 22, 18, ${0.85 - charge * 0.2})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, ${200 + Math.floor(charge * 40)}, 140, ${0.5 + charge * 0.4})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Igniting core
            if (charge > 0.15 || starFlare > 0.05) {
                const coreR = outer * (0.16 + charge * 0.14 + starFlare * 0.2);
                const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR);
                core.addColorStop(0, `rgba(255, 250, 240, ${0.4 + charge * 0.5})`);
                core.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.shadowBlur = 0;
                ctx.fillStyle = core;
                ctx.beginPath();
                ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        function drawLionProwlField(time) {
            const horizon = height * 0.78;

            // Amber grass bands drifting at different speeds
            for (let band = 0; band < 4; band++) {
                const baseY = horizon + band * height * 0.05;
                const speed = 0.00025 + band * 0.00012;
                const amp = 5 + band * 2.5;
                ctx.save();
                ctx.globalAlpha = 0.10 + band * 0.02;
                ctx.strokeStyle = band % 2 === 0 ? '#C89038' : '#A06828';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                for (let x = 0; x <= width; x += 14) {
                    const y = baseY +
                        Math.sin(x * 0.012 + time * speed * 4 + band * 1.9) * amp +
                        Math.sin(x * 0.03 - time * speed * 2.4) * amp * 0.4;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Prowling shadow: the lion passing through the grass
            const prowlT = (Math.sin(time * 0.00035) + 1) / 2;
            const px = width * (0.15 + prowlT * 0.7);
            const py = height * 0.88;
            const pw = Math.min(width, height) * 0.16;
            const ph = pw * 0.22;
            const breathe = 0.75 + 0.25 * Math.sin(time * 0.002);
            ctx.save();
            ctx.globalAlpha = 0.35 * breathe;
            const g = ctx.createRadialGradient(px, py, 0, px, py, pw);
            g.addColorStop(0, 'rgba(12, 8, 5, 0.85)');
            g.addColorStop(0.6, 'rgba(30, 18, 8, 0.4)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(px, py, pw, ph, 0, 0, Math.PI * 2);
            ctx.fill();
            // Amber rim along the back
            ctx.globalAlpha = 0.22 * breathe;
            ctx.strokeStyle = '#D89840';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(px, py - ph * 0.35, pw * 0.85, ph * 0.55, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        function drawTwinkles() {
            twinkles.forEach(s => {
                s.phase += s.speed;
                const alpha = 0.12 + 0.32 * (0.5 + 0.5 * Math.sin(s.phase));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#F0E4D0';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        resizeCanvas();
        for (let i = 0; i < MOTE_CAP; i++) energyMotes.push(new EnergyMote());

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            ctx.clearRect(0, 0, width, height);

            drawTwinkles();
            drawLionProwlField(time);

            energyMotes.forEach(m => { m.update(); m.draw(); });

            if (energy >= IGNITION_THRESHOLD) {
                energy = 0;
                starFlare = 1;
                shockwaves.push(new Shockwave());
            }
            starFlare *= 0.96;

            shockwaves = shockwaves.filter(w => {
                w.draw();
                return w.update();
            });

            drawEightPointedStar(time);

            if (running) rafId = requestAnimationFrame(animate);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(animate);
            }
        });

        rafId = requestAnimationFrame(animate);
        }
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
        revealElements.forEach(el => el.classList.add('revealed'));
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

    // ============================
    // Smooth Scroll for Anchor Links
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================
    // Mascot Parallax
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero') || document.querySelector('.hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

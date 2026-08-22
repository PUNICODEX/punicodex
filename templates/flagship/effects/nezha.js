/**
 * NEZHA FLAGSHIP TEMPLE — WIND FIRE WHEELS CANVAS & INTERACTIONS
 * Twin spinning fire rings, ember field, flowing red silk sash
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Wind Fire Wheels Canvas ──────────────────────────────────────────── */
    const canvas = document.getElementById('windfire-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let embers = [];
        let wheels = [];
        let ribbons = [];
        let paused = false;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            layoutWheels();
        }

        function layoutWheels() {
            const cx = width / 2;
            const cy = height * 0.42;
            const spread = Math.min(width * 0.22, 260);
            wheels.forEach((wheel, i) => {
                wheel.baseX = cx + (i === 0 ? -spread : spread);
                wheel.baseY = cy + (i === 0 ? -30 : 30);
                wheel.radius = Math.min(width, height) * 0.11 + 40;
            });
        }

        class Ember {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 60;
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = -(Math.random() * 1.6 + 0.5);
                this.size = Math.random() * 2.4 + 0.6;
                this.opacity = Math.random() * 0.7 + 0.2;
                this.hue = 12 + Math.random() * 26; // red → gold
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.04 + 0.01;
            }

            update() {
                this.wobble += this.wobbleSpeed;
                this.x += this.vx + Math.sin(this.wobble) * 0.4;
                this.y += this.vy;
                this.opacity *= 0.998;
                if (this.y < -20 || this.opacity < 0.05) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = `hsl(${this.hue}, 95%, ${55 + this.opacity * 20}%)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `hsl(${this.hue}, 95%, 55%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class FireWheel {
            constructor(index) {
                this.index = index;
                this.baseX = 0;
                this.baseY = 0;
                this.radius = 100;
                this.angle = Math.random() * Math.PI * 2;
                this.spin = (index === 0 ? 1 : -1) * (0.025 + Math.random() * 0.01);
                this.bobPhase = Math.random() * Math.PI * 2;
                this.trail = [];
                this.flames = 14;
            }

            update() {
                this.bobPhase += 0.008;
                this.angle += this.spin;
                this.x = this.baseX + Math.cos(this.bobPhase) * 18;
                this.y = this.baseY + Math.sin(this.bobPhase * 1.3) * 24;
                this.trail.push({ x: this.x, y: this.y, r: this.radius, a: 0.22 });
                if (this.trail.length > 14) this.trail.shift();
                this.trail.forEach(t => { t.a *= 0.86; });
            }

            draw() {
                // Fading motion trail
                this.trail.forEach(t => {
                    if (t.a <= 0.01) return;
                    ctx.save();
                    ctx.globalAlpha = t.a;
                    ctx.strokeStyle = 'hsl(16, 90%, 50%)';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                });

                // Outer heat glow
                const glow = ctx.createRadialGradient(this.x, this.y, this.radius * 0.3, this.x, this.y, this.radius * 2.1);
                glow.addColorStop(0, 'hsla(18, 95%, 55%, 0.22)');
                glow.addColorStop(0.55, 'hsla(8, 90%, 45%, 0.08)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 2.1, 0, Math.PI * 2);
                ctx.fill();

                // Flame tongues around the rim
                for (let i = 0; i < this.flames; i++) {
                    const a = this.angle + (i / this.flames) * Math.PI * 2;
                    const flicker = 0.75 + Math.sin(this.bobPhase * 9 + i * 1.7) * 0.25;
                    const inner = this.radius * 0.82;
                    const outer = this.radius * (1.12 + flicker * 0.22);
                    const x1 = this.x + Math.cos(a) * inner;
                    const y1 = this.y + Math.sin(a) * inner;
                    const x2 = this.x + Math.cos(a + 0.16 * Math.sign(this.spin)) * outer;
                    const y2 = this.y + Math.sin(a + 0.16 * Math.sign(this.spin)) * outer;
                    ctx.save();
                    ctx.strokeStyle = `hsla(${28 + flicker * 18}, 100%, ${52 + flicker * 14}%, ${0.55 + flicker * 0.3})`;
                    ctx.lineWidth = 5 + flicker * 3;
                    ctx.lineCap = 'round';
                    ctx.shadowBlur = 14;
                    ctx.shadowColor = 'hsl(24, 100%, 55%)';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Molten core ring
                ctx.save();
                ctx.strokeStyle = 'hsla(40, 100%, 68%, 0.9)';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 22;
                ctx.shadowColor = 'hsl(36, 100%, 60%)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        class SashRibbon {
            constructor(offsetY, phase, hueShift) {
                this.offsetY = offsetY;
                this.phase = phase;
                this.hueShift = hueShift;
                this.points = 26;
                this.thickness = 22;
            }

            draw(time) {
                const pts = [];
                for (let i = 0; i <= this.points; i++) {
                    const t = i / this.points;
                    const x = t * (width + 160) - 80;
                    const y = this.offsetY
                        + Math.sin(t * 5.2 + time * 0.9 + this.phase) * 46
                        + Math.sin(t * 11 + time * 1.7 + this.phase * 2) * 14;
                    pts.push({ x, y });
                }

                // Silken body: tapered ribbon with a crimson gradient
                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < pts.length; i++) {
                    const p = pts[i];
                    const next = pts[Math.min(i + 1, pts.length - 1)];
                    const ang = Math.atan2(next.y - p.y, next.x - p.x) + Math.PI / 2;
                    const taper = Math.sin((i / this.points) * Math.PI) * 0.6 + 0.4;
                    const half = this.thickness * taper;
                    const px = p.x + Math.cos(ang) * half;
                    const py = p.y + Math.sin(ang) * half;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                for (let i = pts.length - 1; i >= 0; i--) {
                    const p = pts[i];
                    const next = pts[Math.max(i - 1, 0)];
                    const ang = Math.atan2(p.y - next.y, p.x - next.x) + Math.PI / 2;
                    const taper = Math.sin((i / this.points) * Math.PI) * 0.6 + 0.4;
                    const half = this.thickness * taper;
                    ctx.lineTo(p.x + Math.cos(ang) * half, p.y + Math.sin(ang) * half);
                }
                ctx.closePath();

                const grad = ctx.createLinearGradient(0, 0, width, 0);
                grad.addColorStop(0, `hsla(${355 + this.hueShift}, 85%, 42%, 0.10)`);
                grad.addColorStop(0.5, `hsla(${350 + this.hueShift}, 88%, 52%, 0.20)`);
                grad.addColorStop(1, `hsla(${355 + this.hueShift}, 85%, 42%, 0.10)`);
                ctx.fillStyle = grad;
                ctx.fill();

                // Gilded edge highlight
                ctx.strokeStyle = `hsla(45, 90%, 62%, 0.12)`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        wheels = [new FireWheel(0), new FireWheel(1)];
        layoutWheels();
        for (let i = 0; i < 130; i++) {
            const ember = new Ember();
            ember.y = Math.random() * height;
            embers.push(ember);
        }
        ribbons = [
            new SashRibbon(height * 0.30, 0, 0),
            new SashRibbon(height * 0.62, Math.PI * 0.7, -6)
        ];

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        let time = 0;

        function animate() {
            if (paused) return;
            time += 0.016;
            ctx.clearRect(0, 0, width, height);

            // Night-sky ember glow at the horizon
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, 'hsla(350, 60%, 8%, 0.05)');
            bg.addColorStop(1, 'hsla(20, 80%, 12%, 0.10)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            ribbons.forEach(r => r.draw(time));
            embers.forEach(e => { e.update(); e.draw(); });
            wheels.forEach(w => { w.update(); w.draw(); });

            requestAnimationFrame(animate);
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

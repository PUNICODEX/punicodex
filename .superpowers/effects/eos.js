/**
 * ĒṒS — Goddess of the Dawn
 * Rose-fingered gradient bands sweeping upward, gold rim light, fading stars
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Dawn Canvas ────────────────────────────────────────────────────── */
    const canvas = document.getElementById('dawn-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let bands = [];
        let motes = [];
        let stars = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;

        const PALETTE = [
            { r: 232, g: 160, b: 168 },  // rose petal
            { r: 212, g: 110, b: 122 },  // deep rose
            { r: 242, g: 193, b: 120 },  // apricot gold
            { r: 255, g: 217, b: 142 },  // pale gold
        ];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class DawnBand {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                this.thickness = height * (0.10 + Math.random() * 0.16);
                this.y = scatter ? Math.random() * (height * 1.4) : height + this.thickness;
                this.speed = 0.25 + Math.random() * 0.45;
                this.opacity = 0;
                this.maxOpacity = 0.10 + Math.random() * 0.10;
                this.wobblePhase = Math.random() * Math.PI * 2;
                this.wobbleAmp = 6 + Math.random() * 14;
            }

            update() {
                this.y -= this.speed;
                this.wobblePhase += 0.004;

                const fadeIn = height + this.thickness - this.y;
                const lifeTop = -this.thickness;
                if (fadeIn < 140) {
                    this.opacity = Math.min(this.maxOpacity, fadeIn / 140 * this.maxOpacity);
                } else if (this.y < 120) {
                    this.opacity = Math.max(0, (this.y - lifeTop) / 120 * this.maxOpacity);
                }

                if (this.y < lifeTop) {
                    this.reset(false);
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const wobble = Math.sin(this.wobblePhase) * this.wobbleAmp;
                const topY = this.y + wobble;
                const bottomY = this.y + this.thickness + wobble * 0.5;

                ctx.save();

                // Rose-fingered body: vertical gradient fading down into transparency
                const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
                grad.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.15})`);
                grad.addColorStop(0.35, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, topY, width, this.thickness);

                // Gold rim along the leading (top) edge
                const rim = ctx.createLinearGradient(0, topY - 3, 0, topY + 14);
                rim.addColorStop(0, 'rgba(255, 232, 170, 0)');
                rim.addColorStop(0.5, `rgba(255, 224, 150, ${this.opacity * 1.6})`);
                rim.addColorStop(1, 'rgba(255, 224, 150, 0)');
                ctx.fillStyle = rim;
                ctx.fillRect(0, topY - 3, width, 17);

                ctx.restore();
            }
        }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vy = -(0.2 + Math.random() * 0.5);
                this.vx = (Math.random() - 0.5) * 0.3;
                this.size = 0.6 + Math.random() * 1.8;
                this.opacity = 0.1 + Math.random() * 0.3;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.02;
                if (this.y < -12 || this.x < -12 || this.x > width + 12) {
                    this.reset(false);
                }
            }

            draw() {
                const twinkle = 0.5 + 0.5 * Math.sin(this.phase);
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = '#FFE8B0';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#FFD98E';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class DawnStar {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.55;
                this.size = 0.4 + Math.random() * 1.1;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.005 + Math.random() * 0.012;
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                // Stars near the horizon fade as the dawn climbs; high stars persist
                const depthFade = this.y / (height * 0.55);
                const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(this.phase));
                ctx.save();
                ctx.globalAlpha = 0.45 * twinkle * depthFade;
                ctx.fillStyle = '#F4E9D8';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 7; i++) bands.push(new DawnBand());
        for (let i = 0; i < 80; i++) motes.push(new Mote());
        for (let i = 0; i < 60; i++) stars.push(new DawnStar());

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

            // Deep pre-dawn violet wash, brightest near the horizon
            const horizon = ctx.createLinearGradient(0, 0, 0, height);
            horizon.addColorStop(0, 'rgba(26, 16, 44, 0.10)');
            horizon.addColorStop(0.6, 'rgba(58, 32, 62, 0.05)');
            horizon.addColorStop(1, 'rgba(120, 60, 70, 0.03)');
            ctx.fillStyle = horizon;
            ctx.fillRect(0, 0, width, height);

            // Breathing dawn glow rising from the horizon
            const breathe = 0.5 + 0.5 * Math.sin(frameCount * 0.004);
            const glow = ctx.createRadialGradient(
                width * 0.5, height * 1.05, 0,
                width * 0.5, height * 1.05, Math.max(width, height) * 0.8
            );
            glow.addColorStop(0, `rgba(255, 200, 130, ${0.10 + breathe * 0.05})`);
            glow.addColorStop(0.4, `rgba(226, 120, 110, ${0.05 + breathe * 0.03})`);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            stars.forEach(s => { s.update(); s.draw(); });
            bands.forEach(b => { b.update(); b.draw(); });
            motes.forEach(m => { m.update(); m.draw(); });

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

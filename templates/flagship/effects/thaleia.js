/**
 * THÁLEIA — Muse of Comedy and Idyllic Poetry
 * Playful mask-like bokeh rising, confetti-light shimmer
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Masks Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('masks-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let bokeh = [];
        let shimmer = [];
        let running = true;
        let rafId = null;
        let maskSprite = null;

        const PALETTE = [
            { r: 244, g: 196, b: 110 },  // stage gold
            { r: 232, g: 140, b: 150 },  // comic rose
            { r: 120, g: 200, b: 190 },  // playful teal
            { r: 246, g: 238, b: 220 },  // ivory
            { r: 190, g: 150, b: 230 },  // jest violet
        ];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // Offscreen comedy-mask glyph: two laughing eye arcs + a wide grin,
        // baked once at high resolution and blitted into select bokeh orbs.
        function buildMaskSprite() {
            const size = 128;
            maskSprite = document.createElement('canvas');
            maskSprite.width = size;
            maskSprite.height = size;
            const mctx = maskSprite.getContext('2d');
            const mid = size / 2;

            mctx.strokeStyle = 'rgba(255, 246, 230, 0.95)';
            mctx.lineWidth = 7;
            mctx.lineCap = 'round';

            // Left laughing eye (upward arc)
            mctx.beginPath();
            mctx.arc(mid - 24, mid - 18, 12, Math.PI * 1.15, Math.PI * 1.85);
            mctx.stroke();

            // Right laughing eye
            mctx.beginPath();
            mctx.arc(mid + 24, mid - 18, 12, Math.PI * 1.15, Math.PI * 1.85);
            mctx.stroke();

            // Wide comic grin
            mctx.beginPath();
            mctx.arc(mid, mid + 6, 26, Math.PI * 0.15, Math.PI * 0.85);
            mctx.stroke();
        }

        class Bokeh {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 60;
                this.radius = 8 + Math.random() * 42;
                this.vy = -(0.2 + Math.random() * 0.55) * (44 / (this.radius + 20));
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.006 + Math.random() * 0.012;
                this.swayAmp = 8 + Math.random() * 26;
                this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                this.baseAlpha = 0.05 + Math.random() * 0.12;
                this.isMask = this.radius > 26 && Math.random() < 0.3;
                this.spin = Math.random() * Math.PI * 2;
                this.spinSpeed = (Math.random() - 0.5) * 0.01;
            }

            update() {
                this.y += this.vy;
                this.swayPhase += this.swaySpeed;
                this.spin += this.spinSpeed;
                if (this.y < -this.radius - 70) {
                    this.reset(false);
                }
            }

            draw() {
                const swayX = Math.sin(this.swayPhase) * this.swayAmp;
                const px = this.x + swayX;
                const bounce = 1 + 0.04 * Math.sin(this.swayPhase * 2);
                const r = this.radius * bounce;
                const alpha = this.baseAlpha * (0.75 + 0.25 * Math.sin(this.swayPhase * 1.3));

                ctx.save();

                // Soft bokeh disc
                const grad = ctx.createRadialGradient(px, this.y, 0, px, this.y, r);
                grad.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 1.4})`);
                grad.addColorStop(0.7, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, this.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Bright rim ring (lens-bokeh edge)
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 1.6})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(px, this.y, r * 0.92, 0, Math.PI * 2);
                ctx.stroke();

                // Comedy-mask glyph inside the larger orbs
                if (this.isMask && maskSprite) {
                    ctx.globalAlpha = Math.min(1, alpha * 5);
                    ctx.translate(px, this.y);
                    ctx.rotate(Math.sin(this.spin) * 0.15);
                    const s = r * 1.15;
                    ctx.drawImage(maskSprite, -s / 2, -s / 2, s, s);
                }

                ctx.restore();
            }
        }

        class ShimmerMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 6;
                this.vy = -(0.3 + Math.random() * 0.7);
                this.vx = (Math.random() - 0.5) * 0.5;
                this.size = 0.5 + Math.random() * 1.5;
                this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                this.opacity = 0.1 + Math.random() * 0.3;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.03;
                if (this.y < -8) this.reset(false);
            }

            draw() {
                const twinkle = Math.abs(Math.sin(this.phase));
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        buildMaskSprite();
        resize();
        for (let i = 0; i < 110; i++) bokeh.push(new Bokeh());
        for (let i = 0; i < 80; i++) shimmer.push(new ShimmerMote());

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
            ctx.clearRect(0, 0, width, height);

            // Warm stage-footlight wash from below
            const footlight = ctx.createLinearGradient(0, height, 0, height * 0.3);
            footlight.addColorStop(0, 'rgba(244, 196, 110, 0.06)');
            footlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = footlight;
            ctx.fillRect(0, 0, width, height);

            bokeh.forEach(b => { b.update(); b.draw(); });
            shimmer.forEach(s => { s.update(); s.draw(); });

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

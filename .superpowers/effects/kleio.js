/**
 * KLEIṒ — Muse of History
 * Scrolling manuscript glyphs drifting like papyrus, ink-mote ambience
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Manuscript Canvas ──────────────────────────────────────────────── */
    const canvas = document.getElementById('manuscript-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let glyphs = [];
        let inkMotes = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;
        let spriteAtlas = [];

        const GLYPH_KINDS = 24;
        const SPRITE_SIZE = 48;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // Offscreen sprite atlas: pseudo-manuscript glyph strokes rendered once,
        // then blitted each frame instead of re-stroking hundreds of paths.
        function buildSpriteAtlas() {
            spriteAtlas = [];
            for (let kind = 0; kind < GLYPH_KINDS; kind++) {
                const off = document.createElement('canvas');
                off.width = SPRITE_SIZE;
                off.height = SPRITE_SIZE;
                const octx = off.getContext('2d');
                octx.strokeStyle = 'rgba(226, 200, 150, 0.9)';
                octx.lineWidth = 2;
                octx.lineCap = 'round';

                const mid = SPRITE_SIZE / 2;
                const style = kind % 4;
                octx.beginPath();
                if (style === 0) {
                    // Stele mark: vertical stem with cross bars
                    octx.moveTo(mid, 8);
                    octx.lineTo(mid, SPRITE_SIZE - 8);
                    octx.moveTo(mid - 8, 16);
                    octx.lineTo(mid + 8, 16);
                    octx.moveTo(mid - 6, 28);
                    octx.lineTo(mid + 6, 28);
                } else if (style === 1) {
                    // Scroll seal: open circle with tick
                    octx.arc(mid, mid, 10, 0.4, Math.PI * 1.8);
                    octx.moveTo(mid + 4, mid - 12);
                    octx.lineTo(mid + 10, mid - 18);
                } else if (style === 2) {
                    // Chevron rune
                    octx.moveTo(12, 12);
                    octx.lineTo(mid, mid + 6);
                    octx.lineTo(SPRITE_SIZE - 12, 12);
                    octx.moveTo(16, 26);
                    octx.lineTo(mid, SPRITE_SIZE - 10);
                    octx.lineTo(SPRITE_SIZE - 16, 26);
                } else {
                    // Reed brush: diagonal sweep with serif hooks
                    octx.moveTo(10, SPRITE_SIZE - 10);
                    octx.quadraticCurveTo(mid, 10, SPRITE_SIZE - 10, 14);
                    octx.moveTo(mid - 8, mid);
                    octx.lineTo(mid + 8, mid);
                }
                octx.stroke();

                // Soft ink halo baked into the sprite
                octx.globalCompositeOperation = 'source-over';
                octx.fillStyle = 'rgba(226, 200, 150, 0.15)';
                octx.beginPath();
                octx.arc(mid, mid, 14, 0, Math.PI * 2);
                octx.fill();

                spriteAtlas.push(off);
            }
        }

        class Glyph {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.sprite = spriteAtlas[Math.floor(Math.random() * GLYPH_KINDS)];
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : -SPRITE_SIZE;
                this.vy = 0.15 + Math.random() * 0.4;
                this.scale = 0.5 + Math.random() * 1.1;
                this.rotation = (Math.random() - 0.5) * 0.5;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.004 + Math.random() * 0.008;
                this.swayAmp = 10 + Math.random() * 22;
                this.opacity = 0.06 + Math.random() * 0.16;
            }

            update() {
                this.y += this.vy;
                this.swayPhase += this.swaySpeed;
                if (this.y > height + SPRITE_SIZE) {
                    this.reset(false);
                }
            }

            draw() {
                const swayX = Math.sin(this.swayPhase) * this.swayAmp;
                const size = SPRITE_SIZE * this.scale;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x + swayX, this.y);
                ctx.rotate(this.rotation + Math.sin(this.swayPhase * 0.7) * 0.1);
                ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        }

        class InkMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 6;
                this.vy = -(0.1 + Math.random() * 0.25);
                this.vx = (Math.random() - 0.5) * 0.2;
                this.size = 0.5 + Math.random() * 1.4;
                this.opacity = 0.08 + Math.random() * 0.18;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < -8) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = '#E8CFA0';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        buildSpriteAtlas();
        resize();
        for (let i = 0; i < 90; i++) glyphs.push(new Glyph());
        for (let i = 0; i < 70; i++) inkMotes.push(new InkMote());

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

            // Parchment wash, warmer toward the lower third
            const parchment = ctx.createLinearGradient(0, 0, 0, height);
            parchment.addColorStop(0, 'rgba(40, 30, 22, 0.06)');
            parchment.addColorStop(0.7, 'rgba(70, 52, 34, 0.05)');
            parchment.addColorStop(1, 'rgba(90, 66, 40, 0.04)');
            ctx.fillStyle = parchment;
            ctx.fillRect(0, 0, width, height);

            // Faint ruled manuscript lines scrolling upward with the glyphs
            const lineGap = 88;
            const scrollOffset = (frameCount * 0.15) % lineGap;
            ctx.save();
            ctx.strokeStyle = 'rgba(226, 200, 150, 0.045)';
            ctx.lineWidth = 1;
            for (let y = -lineGap + scrollOffset; y < height + lineGap; y += lineGap) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.restore();

            // Central reading-column glow, breathing faintly
            const breathe = 0.5 + 0.5 * Math.sin(frameCount * 0.006);
            const column = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, 0);
            column.addColorStop(0, 'rgba(0, 0, 0, 0)');
            column.addColorStop(0.5, `rgba(232, 207, 160, ${0.03 + breathe * 0.015})`);
            column.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = column;
            ctx.fillRect(width * 0.25, 0, width * 0.5, height);

            glyphs.forEach(g => { g.update(); g.draw(); });
            inkMotes.forEach(m => { m.update(); m.draw(); });

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

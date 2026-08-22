/**
 * VĀC — Sacred Speech
 * Hero canvas: syllable glyphs riding concentric sound-rings outward from
 * the mouth of the goddess — speech made visible as expanding ripples of
 * luminous Devanagari seed-sounds.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Speech Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('speech-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let ox, oy; // origin — the speaking mouth of the field
        let rings = [];
        let echoes = [];
        let sparks = [];
        let glyphAtlas = [];
        let rafId = 0;
        let frame = 0;
        let lastRing = 0;
        const pointer = { x: -9999, y: -9999, moved: 0 };

        const MAX_RINGS = 7;
        const RING_INTERVAL = 150; // frames between utterances
        const SPARK_COUNT = 60;

        // Seed syllables — the mothers of sound (mātṛkā)
        const SYLLABLES = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः', 'का', 'सा', 'ह', 'वाच्'];

        const PALETTE = {
            ring: { r: 236, g: 186, b: 96 },      // Saffron gold
            glyph: { r: 252, g: 224, b: 156 },    // Warm cream-gold
            echo: { r: 206, g: 140, b: 96 },      // Deep saffron
            spark: { r: 250, g: 214, b: 140 },
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            ox = width / 2;
            oy = height * 0.56;
            buildAtlas();
        }

        // Offscreen sprite atlas: each syllable rendered once, then blitted
        function buildAtlas() {
            glyphAtlas = SYLLABLES.map(syl => {
                const size = 64;
                const tile = document.createElement('canvas');
                tile.width = size;
                tile.height = size;
                const tctx = tile.getContext('2d');
                tctx.font = `600 ${Math.round(size * 0.52)}px "Noto Sans Devanagari", "Mangal", serif`;
                tctx.textAlign = 'center';
                tctx.textBaseline = 'middle';
                tctx.shadowBlur = 8;
                tctx.shadowColor = `rgba(${PALETTE.glyph.r}, ${PALETTE.glyph.g}, ${PALETTE.glyph.b}, 0.9)`;
                tctx.fillStyle = `rgb(${PALETTE.glyph.r}, ${PALETTE.glyph.g}, ${PALETTE.glyph.b})`;
                tctx.fillText(syl, size / 2, size / 2);
                return tile;
            });
        }

        class SoundRing {
            constructor(x, y, isEcho) {
                this.x = x;
                this.y = y;
                this.r = 8;
                this.speed = isEcho ? 0.9 : 1.5;
                this.maxR = Math.min(width, height) * (isEcho ? 0.35 : 0.62);
                this.alpha = isEcho ? 0.35 : 0.75;
                this.isEcho = !!isEcho;
                this.spin = Math.random() * Math.PI * 2;
                this.spinSpeed = (Math.random() - 0.5) * 0.003;

                // Syllables riding the wavefront
                this.glyphs = [];
                if (!isEcho) {
                    const count = 6 + Math.floor(Math.random() * 4);
                    for (let i = 0; i < count; i++) {
                        this.glyphs.push({
                            tile: Math.floor(Math.random() * glyphAtlas.length),
                            angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
                        });
                    }
                }
            }

            update() {
                this.r += this.speed * (1 + this.r / 900);
                this.spin += this.spinSpeed;
                const t = this.r / this.maxR;
                this.alpha = (this.isEcho ? 0.35 : 0.75) * Math.max(0, 1 - t * t);
                return this.r < this.maxR && this.alpha > 0.01;
            }

            draw() {
                ctx.save();
                // Wavefront — double stroke for an interference feel
                ctx.globalAlpha = this.alpha;
                ctx.strokeStyle = `rgb(${this.isEcho ? PALETTE.echo.r : PALETTE.ring.r}, ${this.isEcho ? PALETTE.echo.g : PALETTE.ring.g}, ${this.isEcho ? PALETTE.echo.b : PALETTE.ring.b})`;
                ctx.lineWidth = this.isEcho ? 1 : 1.6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.stroke();

                ctx.globalAlpha = this.alpha * 0.4;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r * 0.94, 0, Math.PI * 2);
                ctx.stroke();

                // Syllables standing on the ring, tangent to its travel
                this.glyphs.forEach(g => {
                    const a = g.angle + this.spin;
                    const gx = this.x + Math.cos(a) * this.r;
                    const gy = this.y + Math.sin(a) * this.r;
                    const scale = 0.35 + (this.r / this.maxR) * 0.55;
                    const size = 64 * scale;
                    ctx.globalAlpha = this.alpha * 0.95;
                    ctx.drawImage(glyphAtlas[g.tile], gx - size / 2, gy - size / 2, size, size);
                });
                ctx.restore();
            }
        }

        class Spark {
            constructor() {
                this.reset();
            }

            reset() {
                const a = Math.random() * Math.PI * 2;
                const d = Math.random() * Math.min(width, height) * 0.45;
                this.x = ox + Math.cos(a) * d;
                this.y = oy + Math.sin(a) * d;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = 0.5 + Math.random() * 1.4;
                this.phase = Math.random() * Math.PI * 2;
                this.alpha = 0.08 + Math.random() * 0.2;
            }

            update() {
                this.phase += 0.03;
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < -8 || this.x > width + 8 || this.y < -8 || this.y > height + 8) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha * (0.5 + 0.5 * Math.sin(this.phase));
                ctx.fillStyle = `rgb(${PALETTE.spark.r}, ${PALETTE.spark.g}, ${PALETTE.spark.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function animate() {
            frame++;
            ctx.clearRect(0, 0, width, height);

            // Womb-of-speech glow at the origin — breathes with the utterance
            const breath = 0.5 + 0.5 * Math.sin(frame * 0.02);
            const coreGlow = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(width, height) * 0.5);
            coreGlow.addColorStop(0, `rgba(216, 148, 84, ${0.07 + breath * 0.05})`);
            coreGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGlow;
            ctx.fillRect(0, 0, width, height);

            // Utter a new ring on the beat; the pointer whispers echoes
            if (frame - lastRing > RING_INTERVAL && rings.length < MAX_RINGS) {
                lastRing = frame;
                rings.push(new SoundRing(ox, oy, false));
            }
            if (pointer.moved > 0 && frame % 24 === 0 && echoes.length < 5) {
                echoes.push(new SoundRing(pointer.x, pointer.y, true));
                pointer.moved--;
            }

            rings = rings.filter(r => r.update());
            rings.forEach(r => r.draw());
            echoes = echoes.filter(r => r.update());
            echoes.forEach(r => r.draw());

            // The silent syllable at the center — the unstruck sound
            if (glyphAtlas.length) {
                const tile = glyphAtlas[glyphAtlas.length - 1]; // वाच्
                const pulse = 1 + breath * 0.06;
                const size = 96 * pulse;
                ctx.save();
                ctx.globalAlpha = 0.5 + breath * 0.35;
                ctx.drawImage(tile, ox - size / 2, oy - size / 2, size, size);
                ctx.restore();
            }

            sparks.forEach(s => { s.update(); s.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push(new Spark());
        }

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.moved = Math.min(6, pointer.moved + 1);
        }, { passive: true });

        rafId = requestAnimationFrame(animate);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            } else if (!rafId) {
                rafId = requestAnimationFrame(animate);
            }
        });
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
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
            const hero = document.getElementById('hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

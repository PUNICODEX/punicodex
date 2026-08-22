/**
 * PÁN — God of the Wilderness & Shepherds
 * Interactive Layer: Meadow Grass, Panpipe Note Wisps, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Meadow System
    // ============================
    const canvas = document.getElementById('meadow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let blades = [];
        let wisps = [];
        let pollen = [];
        let breeze = 0;

        const PALETTE = {
            grassDeep: { r: 38, g: 76, b: 38 },
            grass: { r: 78, g: 132, b: 62 },
            grassLight: { r: 138, g: 178, b: 92 },
            sunGold: { r: 226, g: 196, b: 110 },
            noteGlow: { r: 240, g: 226, b: 170 },
            reed: { r: 168, g: 142, b: 84 },
        };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedMeadow();
        }

        // Pre-rendered panpipe note sprites (quavers), one per tone,
        // so the wisps are a cheap drawImage each frame.
        function buildNoteSprite(hue) {
            const size = 26;
            const pad = 12;
            const sprite = document.createElement('canvas');
            sprite.width = sprite.height = size + pad * 2;
            const g = sprite.getContext('2d');
            const cx = pad + 8;
            const cy = pad + size - 8;

            g.strokeStyle = hue;
            g.fillStyle = hue;
            g.lineWidth = 2;
            g.lineCap = 'round';

            // note head
            g.beginPath();
            g.ellipse(cx, cy, 5, 3.6, -0.35, 0, Math.PI * 2);
            g.fill();

            // stem
            g.beginPath();
            g.moveTo(cx + 4.6, cy - 1);
            g.lineTo(cx + 4.6, cy - 16);
            g.stroke();

            // flag
            g.beginPath();
            g.moveTo(cx + 4.6, cy - 16);
            g.quadraticCurveTo(cx + 12, cy - 13, cx + 9, cy - 6);
            g.stroke();

            return sprite;
        }

        const noteSprites = [
            buildNoteSprite('rgba(240, 226, 170, 0.9)'),
            buildNoteSprite('rgba(226, 196, 110, 0.9)'),
            buildNoteSprite('rgba(190, 216, 150, 0.85)'),
        ];

        class GrassBlade {
            constructor(x) {
                this.x = x;
                this.h = 22 + Math.random() * 58;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.012 + Math.random() * 0.016;
                this.lean = (Math.random() - 0.5) * 0.5;
                this.thickness = 1 + Math.random() * 1.2;
                const shade = Math.random();
                if (shade < 0.35) this.color = PALETTE.grassDeep;
                else if (shade < 0.75) this.color = PALETTE.grass;
                else this.color = PALETTE.grassLight;
                this.seedHead = Math.random() < 0.12;
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                const gust = Math.sin(breeze * 0.008 + this.x * 0.004) * 0.35;
                const sway = Math.sin(this.phase) * 0.22 + this.lean + gust;
                const tipX = this.x + sway * this.h;
                const tipY = height + 6 - this.h;

                ctx.save();
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.75)`;
                ctx.lineWidth = this.thickness;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.x, height + 6);
                ctx.quadraticCurveTo(
                    this.x + sway * this.h * 0.25, height + 6 - this.h * 0.6,
                    tipX, tipY
                );
                ctx.stroke();

                if (this.seedHead) {
                    ctx.fillStyle = `rgba(${PALETTE.reed.r}, ${PALETTE.reed.g}, ${PALETTE.reed.b}, 0.8)`;
                    ctx.beginPath();
                    ctx.ellipse(tipX, tipY, 1.6, 4, sway, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        class NoteWisp {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? height * (0.4 + Math.random() * 0.6) : height + 24;
                this.vy = -(0.3 + Math.random() * 0.5);
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.01 + Math.random() * 0.015;
                this.swayAmp = 18 + Math.random() * 30;
                this.sprite = noteSprites[Math.floor(Math.random() * noteSprites.length)];
                this.scale = 0.5 + Math.random() * 0.6;
                this.life = this.maxLife = 320 + Math.random() * 240;
            }

            update() {
                this.y += this.vy;
                this.swayPhase += this.swaySpeed;
                this.life--;
                if (this.life <= 0 || this.y < -30) this.reset(false);
            }

            draw() {
                const x = this.x + Math.sin(this.swayPhase) * this.swayAmp;
                const fade = Math.min(1, this.life / 60) * Math.min(1, (this.maxLife - this.life) / 40);
                const w = this.sprite.width * this.scale;
                const h = this.sprite.height * this.scale;

                ctx.save();
                ctx.globalAlpha = fade * 0.75;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${PALETTE.noteGlow.r}, ${PALETTE.noteGlow.g}, ${PALETTE.noteGlow.b}, 0.7)`;
                ctx.drawImage(this.sprite, x - w / 2, this.y - h / 2, w, h);
                ctx.restore();
            }
        }

        class PollenMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(0.08 + Math.random() * 0.22);
                this.vx = (Math.random() - 0.5) * 0.15;
                this.size = 0.7 + Math.random() * 1.6;
                this.twinkle = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                this.x += this.vx + Math.sin(breeze * 0.01 + this.y * 0.01) * 0.12;
                this.twinkle += 0.04;
                if (this.y < -8) this.reset(false);
            }

            draw() {
                const a = 0.14 + Math.sin(this.twinkle) * 0.11;
                ctx.save();
                ctx.fillStyle = `rgba(${PALETTE.sunGold.r}, ${PALETTE.sunGold.g}, ${PALETTE.sunGold.b}, ${Math.max(0.03, a)})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function seedMeadow() {
            blades = [];
            const count = Math.min(170, Math.floor(width / 8));
            for (let i = 0; i < count; i++) {
                blades.push(new GrassBlade((i / count) * width + (Math.random() - 0.5) * 8));
            }
        }

        // Initialize
        resizeCanvas();
        for (let i = 0; i < 16; i++) wisps.push(new NoteWisp());
        for (let i = 0; i < 80; i++) pollen.push(new PollenMote());

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            breeze++;
            ctx.clearRect(0, 0, width, height);

            // late-afternoon wash over the meadow
            const wash = ctx.createLinearGradient(0, height * 0.45, 0, height);
            wash.addColorStop(0, 'rgba(226, 196, 110, 0)');
            wash.addColorStop(1, 'rgba(120, 140, 60, 0.12)');
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, width, height);

            pollen.forEach(p => { p.update(); p.draw(); });
            blades.forEach(b => { b.update(); b.draw(); });
            wisps.forEach(w => { w.update(); w.draw(); });

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

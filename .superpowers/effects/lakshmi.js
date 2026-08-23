/**
 * LAKṢMĪ — Goddess of Wealth, Fortune, and Auspiciousness
 * Lotus bloom + gold-coin shimmer rising
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Lotus & Gold Canvas System
    // ============================
    const canvas = document.getElementById('lotus-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let coins = [];
        let petals = [];
        let sparkles = [];
        let frameCount = 0;
        let bloomPhase = 0;
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.6, active: false };

        // Palette: lotus pink, blush rose, royal gold, warm ivory
        const PALETTE = {
            pink: { r: 255, g: 130, b: 170 },
            rose: { r: 232, g: 90, b: 140 },
            deepRose: { r: 180, g: 40, b: 95 },
            gold: { r: 255, g: 204, b: 64 },
            deepGold: { r: 212, g: 160, b: 32 },
            ivory: { r: 255, g: 244, b: 220 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ---- Offscreen sprite atlas: a gold coin face ----
        const coinSprite = (function buildCoinSprite() {
            const size = 48;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');
            const c = size / 2;

            const grad = sctx.createRadialGradient(c - 4, c - 4, 2, c, c, c);
            grad.addColorStop(0, 'rgba(255, 244, 200, 1)');
            grad.addColorStop(0.55, 'rgba(255, 204, 64, 0.95)');
            grad.addColorStop(1, 'rgba(190, 140, 30, 0.9)');
            sctx.fillStyle = grad;
            sctx.beginPath();
            sctx.arc(c, c, c - 1, 0, Math.PI * 2);
            sctx.fill();

            // Milled edge
            sctx.strokeStyle = 'rgba(160, 110, 20, 0.6)';
            sctx.lineWidth = 2;
            sctx.beginPath();
            sctx.arc(c, c, c - 2, 0, Math.PI * 2);
            sctx.stroke();

            // Inner lotus stamp
            sctx.strokeStyle = 'rgba(160, 110, 20, 0.55)';
            sctx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                sctx.beginPath();
                sctx.ellipse(c + Math.cos(a) * c * 0.3, c + Math.sin(a) * c * 0.3,
                    c * 0.16, c * 0.3, a + Math.PI / 2, 0, Math.PI * 2);
                sctx.stroke();
            }
            return sprite;
        })();

        class Coin {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 30;
                this.vy = -(0.4 + Math.random() * 0.9);
                this.drift = (Math.random() - 0.5) * 0.3;
                this.size = 8 + Math.random() * 14;
                this.opacity = 0.3 + Math.random() * 0.5;
                this.spin = Math.random() * Math.PI * 2;
                this.spinSpeed = 0.03 + Math.random() * 0.05;
                this.sway = Math.random() * Math.PI * 2;
            }

            update() {
                this.spin += this.spinSpeed;
                this.sway += 0.02;
                this.y += this.vy;
                this.x += this.drift + Math.sin(this.sway) * 0.4;
                if (this.y < -40) this.reset(false);
            }

            draw() {
                // Spinning coin: squash on X by cosine of the spin phase
                const squash = Math.abs(Math.cos(this.spin));
                const w = Math.max(2, this.size * squash);
                const shimmer = 0.7 + Math.sin(this.spin) * 0.3;
                ctx.save();
                ctx.globalAlpha = this.opacity * shimmer;
                ctx.translate(this.x, this.y);
                ctx.shadowBlur = 10 * shimmer;
                ctx.shadowColor = 'rgba(255, 204, 64, 0.8)';
                ctx.drawImage(coinSprite, -w / 2, -this.size / 2, w, this.size);
                ctx.restore();
            }
        }

        class Petal {
            constructor(layer, index, count) {
                this.layer = layer;         // 0 outer, 1 middle, 2 inner
                this.index = index;
                this.count = count;
                this.angle = (index / count) * Math.PI * 2;
                this.length = 1 - layer * 0.24;
                this.wobblePhase = Math.random() * Math.PI * 2;
            }

            draw(cx, cy, baseR, openness, t) {
                // openness 0 (closed bud) .. 1 (full bloom)
                const spread = 0.25 + openness * 0.75;
                const petalLen = baseR * this.length * (0.6 + openness * 0.4);
                const petalWidth = petalLen * 0.42;
                const wobble = Math.sin(t * 1.2 + this.wobblePhase) * 0.02;
                const a = this.angle * spread + wobble - Math.PI / 2;

                const shade = this.layer === 0 ? PALETTE.deepRose
                    : this.layer === 1 ? PALETTE.rose : PALETTE.pink;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(a);
                ctx.globalAlpha = 0.20 + openness * 0.16 + this.layer * 0.04;

                const grad = ctx.createLinearGradient(0, 0, 0, -petalLen);
                grad.addColorStop(0, `rgba(${PALETTE.deepRose.r}, ${PALETTE.deepRose.g}, ${PALETTE.deepRose.b}, 0.7)`);
                grad.addColorStop(0.6, `rgba(${shade.r}, ${shade.g}, ${shade.b}, 0.8)`);
                grad.addColorStop(1, `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, 0.55)`);
                ctx.fillStyle = grad;
                ctx.shadowBlur = 14;
                ctx.shadowColor = `rgba(${PALETTE.pink.r}, ${PALETTE.pink.g}, ${PALETTE.pink.b}, 0.5)`;

                // Petal silhouette: two bezier lobes meeting at a soft tip
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(-petalWidth, -petalLen * 0.3, -petalWidth * 0.8, -petalLen * 0.8, 0, -petalLen);
                ctx.bezierCurveTo(petalWidth * 0.8, -petalLen * 0.8, petalWidth, -petalLen * 0.3, 0, 0);
                ctx.fill();
                ctx.restore();
            }
        }

        class Sparkle {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 10;
                this.vy = -(0.15 + Math.random() * 0.4);
                this.size = 0.8 + Math.random() * 2;
                this.opacity = 0.2 + Math.random() * 0.5;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += 0.04;
                this.y += this.vy;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const tw = this.opacity * (0.5 + Math.sin(this.phase * 2.5) * 0.5);
                ctx.save();
                ctx.globalAlpha = tw;
                ctx.fillStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
                // Four-point star glint
                const s = this.size * (1 + Math.sin(this.phase * 2.5) * 0.3);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - s * 2);
                ctx.lineTo(this.x + s * 0.5, this.y - s * 0.5);
                ctx.lineTo(this.x + s * 2, this.y);
                ctx.lineTo(this.x + s * 0.5, this.y + s * 0.5);
                ctx.lineTo(this.x, this.y + s * 2);
                ctx.lineTo(this.x - s * 0.5, this.y + s * 0.5);
                ctx.lineTo(this.x - s * 2, this.y);
                ctx.lineTo(this.x - s * 0.5, this.y - s * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 40; i++) coins.push(new Coin());
        // Three petal layers: 10 outer, 8 middle, 6 inner
        for (let i = 0; i < 10; i++) petals.push(new Petal(0, i, 10));
        for (let i = 0; i < 8; i++) petals.push(new Petal(1, i, 8));
        for (let i = 0; i < 6; i++) petals.push(new Petal(2, i, 6));
        for (let i = 0; i < 100; i++) sparkles.push(new Sparkle());

        window.addEventListener('mousemove', (e) => {
            pointer.x = e.clientX / width;
            pointer.y = e.clientY / height;
            pointer.active = true;
        }, { passive: true });

        // Pause the loop when the tab is hidden
        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused && rafId === null) rafId = requestAnimationFrame(animate);
        });

        function animate() {
            rafId = null;
            if (paused) return;
            frameCount++;
            const t = frameCount / 60;
            ctx.clearRect(0, 0, width, height);

            // Rose-gold dawn wash
            const wash = ctx.createLinearGradient(0, height, 0, 0);
            wash.addColorStop(0, 'rgba(180, 40, 95, 0.10)');
            wash.addColorStop(0.5, 'rgba(255, 130, 170, 0.04)');
            wash.addColorStop(1, 'transparent');
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, width, height);

            // The lotus seat — slow perpetual bloom cycle
            bloomPhase = (Math.sin(t * 0.25) * 0.5 + 0.5);
            const openness = 0.55 + bloomPhase * 0.45;
            const lotusX = (pointer.active ? pointer.x : 0.5) * width;
            const lotusY = height * 0.72;
            const lotusR = Math.min(width, height) * 0.28;

            // Golden aura beneath the bloom
            const aura = ctx.createRadialGradient(lotusX, lotusY, 0, lotusX, lotusY, lotusR * 1.6);
            aura.addColorStop(0, `rgba(255, 204, 64, ${0.10 + bloomPhase * 0.06})`);
            aura.addColorStop(0.5, 'rgba(255, 130, 170, 0.05)');
            aura.addColorStop(1, 'transparent');
            ctx.fillStyle = aura;
            ctx.fillRect(0, 0, width, height);

            // Petals back to front
            petals.forEach(p => p.draw(lotusX, lotusY, lotusR, openness, t));

            // The seed-heart of the lotus
            const heart = ctx.createRadialGradient(lotusX, lotusY, 0, lotusX, lotusY, lotusR * 0.16);
            heart.addColorStop(0, `rgba(255, 244, 220, ${0.35 + bloomPhase * 0.2})`);
            heart.addColorStop(0.6, `rgba(255, 204, 64, ${0.18 + bloomPhase * 0.1})`);
            heart.addColorStop(1, 'transparent');
            ctx.fillStyle = heart;
            ctx.beginPath();
            ctx.arc(lotusX, lotusY, lotusR * 0.16, 0, Math.PI * 2);
            ctx.fill();

            // Rising gold-coin shimmer
            coins.forEach(c => { c.update(); c.draw(); });
            sparkles.forEach(s => { s.update(); s.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);
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

})();

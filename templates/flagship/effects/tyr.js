/**
 * TÝR FLAGSHIP TEMPLE — OATH-FLARE CANVAS
 * A sword of light descending to a burning oath-point, Tiwaz runes ascending
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Oath Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('tyr-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let runes = [];
        let sparks = [];
        let frameCount = 0;
        let running = true;
        let oathPulse = 0;

        const PALETTE = {
            steel: { r: 192, g: 203, b: 216 },
            cold: { r: 127, g: 163, b: 200 },
            oath: { r: 176, g: 58, b: 46 },
            flare: { r: 255, g: 248, b: 235 }
        };

        const pointer = { x: -9999, y: -9999 };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ── Tiwaz rune sprite atlas ─────────────────────────────────────────
        // The rune ᛏ is drawn once per tint into offscreen canvases and
        // blitted — never re-stroked per particle per frame.
        const runeSprites = [];

        function buildRuneSprites() {
            const tints = [
                `rgba(${PALETTE.steel.r}, ${PALETTE.steel.g}, ${PALETTE.steel.b}, 1)`,
                `rgba(${PALETTE.cold.r}, ${PALETTE.cold.g}, ${PALETTE.cold.b}, 1)`,
                `rgba(${PALETTE.oath.r}, ${PALETTE.oath.g}, ${PALETTE.oath.b}, 1)`
            ];
            const size = 48;
            tints.forEach(tint => {
                const off = document.createElement('canvas');
                off.width = size;
                off.height = size;
                const octx = off.getContext('2d');
                octx.strokeStyle = tint;
                octx.lineWidth = 4;
                octx.lineCap = 'round';
                // Stem
                octx.beginPath();
                octx.moveTo(size / 2, size * 0.12);
                octx.lineTo(size / 2, size * 0.88);
                octx.stroke();
                // Arms meeting at the stem's top — the arrow of Týr
                octx.beginPath();
                octx.moveTo(size * 0.18, size * 0.36);
                octx.lineTo(size / 2, size * 0.12);
                octx.lineTo(size * 0.82, size * 0.36);
                octx.stroke();
                runeSprites.push(off);
            });
        }

        class Rune {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 30;
                this.vy = -(Math.random() * 0.3 + 0.08);
                this.scale = Math.random() * 0.7 + 0.4;
                this.opacity = Math.random() * 0.22 + 0.06;
                this.sprite = runeSprites[Math.floor(Math.random() * runeSprites.length)];
                this.sway = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                this.x += Math.sin(frameCount * 0.006 + this.sway) * 0.12;
                if (this.y < -40) this.reset(false);
            }

            draw() {
                const size = 48 * this.scale;
                ctx.save();
                ctx.globalAlpha = this.opacity * Math.min(1, this.y / (height * 0.2));
                ctx.drawImage(this.sprite, this.x - size / 2, this.y - size / 2, size, size);
                ctx.restore();
            }
        }

        class Spark {
            constructor(x, y, burst) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = burst ? Math.random() * 3 + 1 : Math.random() * 0.8 + 0.2;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed - 0.3;
                this.size = Math.random() * 1.6 + 0.5;
                this.life = Math.random() * 50 + 25;
                this.maxLife = this.life;
                this.red = Math.random() < 0.25;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.015;
                this.life--;
            }

            draw() {
                const t = this.life / this.maxLife;
                const c = this.red ? PALETTE.oath : PALETTE.flare;
                ctx.save();
                ctx.globalAlpha = t * 0.8;
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * t, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // The sword: a blade of cold light from the top of the hero down to
        // the oath-point, with a crossguard etched in steel.
        function drawSword(tipX, tipY, pulse) {
            const topY = -10;
            const bladeGrad = ctx.createLinearGradient(tipX, topY, tipX, tipY);
            bladeGrad.addColorStop(0, `rgba(${PALETTE.cold.r}, ${PALETTE.cold.g}, ${PALETTE.cold.b}, 0)`);
            bladeGrad.addColorStop(0.25, `rgba(${PALETTE.steel.r}, ${PALETTE.steel.g}, ${PALETTE.steel.b}, 0.28)`);
            bladeGrad.addColorStop(1, `rgba(${PALETTE.flare.r}, ${PALETTE.flare.g}, ${PALETTE.flare.b}, 0.55)`);

            ctx.save();
            // Blade glow
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = bladeGrad;
            ctx.lineWidth = 7;
            ctx.shadowBlur = 24;
            ctx.shadowColor = `rgba(${PALETTE.cold.r}, ${PALETTE.cold.g}, ${PALETTE.cold.b}, 0.7)`;
            ctx.beginPath();
            ctx.moveTo(tipX, topY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            // Blade core
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.65;
            ctx.strokeStyle = `rgba(${PALETTE.flare.r}, ${PALETTE.flare.g}, ${PALETTE.flare.b}, 0.8)`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(tipX, topY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            // Crossguard near the tip
            const guardY = tipY - 26;
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = `rgb(${PALETTE.steel.r}, ${PALETTE.steel.g}, ${PALETTE.steel.b})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${PALETTE.steel.r}, ${PALETTE.steel.g}, ${PALETTE.steel.b}, 0.8)`;
            ctx.beginPath();
            ctx.moveTo(tipX - 18, guardY);
            ctx.lineTo(tipX + 18, guardY);
            ctx.stroke();
            ctx.restore();

            // Oath-flare at the point
            const flareRadius = 26 + pulse * 30;
            ctx.save();
            const flare = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, flareRadius * 3);
            flare.addColorStop(0, `rgba(${PALETTE.flare.r}, ${PALETTE.flare.g}, ${PALETTE.flare.b}, ${0.55 + pulse * 0.3})`);
            flare.addColorStop(0.3, `rgba(${PALETTE.oath.r}, ${PALETTE.oath.g}, ${PALETTE.oath.b}, ${0.22 + pulse * 0.18})`);
            flare.addColorStop(1, 'transparent');
            ctx.fillStyle = flare;
            ctx.beginPath();
            ctx.arc(tipX, tipY, flareRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            // Flare core
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = `rgb(${PALETTE.flare.r}, ${PALETTE.flare.g}, ${PALETTE.flare.b})`;
            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(${PALETTE.flare.r}, ${PALETTE.flare.g}, ${PALETTE.flare.b}, 1)`;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 3.5 + pulse * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        buildRuneSprites();

        function initParticles() {
            runes = [];
            sparks = [];
            const runeCount = Math.min(60, Math.floor(width / 22));
            for (let i = 0; i < runeCount; i++) {
                runes.push(new Rune());
            }
        }

        resize();
        initParticles();
        window.addEventListener('resize', () => {
            resize();
            initParticles();
        });

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });

        // The oath is sworn anew where the visitor presses
        window.addEventListener('pointerdown', (e) => {
            oathPulse = 1;
            for (let i = 0; i < 24; i++) {
                sparks.push(new Spark(e.clientX, e.clientY, true));
            }
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            oathPulse *= 0.96;
            const slowPulse = 0.5 + Math.sin(frameCount * 0.03) * 0.5;
            const pulse = Math.min(1, slowPulse * 0.4 + oathPulse);

            // Cold northern ambience
            const ambient = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, Math.max(width, height) * 0.6);
            ambient.addColorStop(0, `rgba(${PALETTE.cold.r}, ${PALETTE.cold.g}, ${PALETTE.cold.b}, 0.05)`);
            ambient.addColorStop(1, 'transparent');
            ctx.fillStyle = ambient;
            ctx.fillRect(0, 0, width, height);

            // Ascending Tiwaz runes
            runes.forEach(r => { r.update(); r.draw(); });

            // The sword and its oath-point
            const tipX = width / 2 + (pointer.x > -100 ? (pointer.x - width / 2) * 0.03 : 0);
            const tipY = height * 0.44;
            drawSword(tipX, tipY, pulse);

            // Steady sparks bleed from the oath-point
            if (frameCount % 6 === 0) {
                sparks.push(new Spark(tipX, tipY, false));
            }

            sparks = sparks.filter(s => s.life > 0);
            sparks.forEach(s => { s.update(); s.draw(); });

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

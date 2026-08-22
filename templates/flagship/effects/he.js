/**
 * HĒBĒ — The Divine Feminine
 * A soft spiral-goddess halo turning above columnar drape lines,
 * rose-gold light breathing through the folds.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Halo Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('halo-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let haloDots = [];
        let drapes = [];
        let petals = [];
        let running = true;
        let frameCount = 0;

        // Palette: rose gold, ivory, blush
        const GOLD = { r: 224, g: 184, b: 130 };
        const ROSE = { r: 232, g: 168, b: 160 };
        const IVORY = { r: 246, g: 240, b: 228 };

        // Offscreen glow sprite shared by halo dots and petals
        const glowSprite = document.createElement('canvas');
        glowSprite.width = 64;
        glowSprite.height = 64;
        (function bakeGlow() {
            const g = glowSprite.getContext('2d');
            const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
        })();

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildHalo();
            buildDrapes();
        }

        // Golden-angle spiral of soft dots — the goddess halo. Positions are
        // fixed along the spiral; rotation and breathing happen at draw time.
        function buildHalo() {
            haloDots = [];
            const count = 160;
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const maxR = Math.min(width, height) * 0.34;
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const r = Math.sqrt(t) * maxR;
                const theta = i * goldenAngle;
                haloDots.push({
                    r,
                    theta,
                    size: 2 + (1 - t) * 5 + Math.random() * 2,
                    opacity: 0.25 + (1 - t) * 0.45,
                    tint: i % 3 === 0 ? ROSE : (i % 3 === 1 ? GOLD : IVORY),
                    twinkle: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.015 + Math.random() * 0.02,
                });
            }
        }

        // Columnar drape lines — tall fabric folds falling from above the
        // frame, swaying gently like a chiton in still air.
        function buildDrapes() {
            drapes = [];
            const count = Math.max(6, Math.floor(width / 180));
            for (let i = 0; i < count; i++) {
                drapes.push({
                    x: (i + 0.5) * (width / count) + (Math.random() - 0.5) * 40,
                    widthLine: 30 + Math.random() * 50,
                    sway: Math.random() * Math.PI * 2,
                    swaySpeed: 0.003 + Math.random() * 0.004,
                    swayAmp: 8 + Math.random() * 14,
                    opacity: 0.04 + Math.random() * 0.06,
                    tint: Math.random() < 0.5 ? ROSE : IVORY,
                });
            }
        }

        class Petal {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : -20;
                this.size = 2 + Math.random() * 3.5;
                this.vy = 0.15 + Math.random() * 0.3;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.spin = Math.random() * Math.PI * 2;
                this.spinSpeed = 0.005 + Math.random() * 0.01;
                this.opacity = 0.12 + Math.random() * 0.25;
                this.tint = Math.random() < 0.5 ? ROSE : GOLD;
            }

            update() {
                this.spin += this.spinSpeed;
                this.x += this.vx + Math.sin(this.spin) * 0.3;
                this.y += this.vy;
                if (this.y > height + 20) this.reset(false);
            }

            draw() {
                const c = this.tint;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.spin);
                ctx.drawImage(glowSprite, -this.size * 2.5, -this.size * 2.5, this.size * 5, this.size * 5);
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 70; i++) petals.push(new Petal());

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function drawDrapes() {
            drapes.forEach((d) => {
                d.sway += d.swaySpeed;
                const c = d.tint;
                ctx.save();
                ctx.globalAlpha = d.opacity;
                // A soft vertical band with a sine-curved edge — one fold
                const grad = ctx.createLinearGradient(d.x - d.widthLine, 0, d.x + d.widthLine, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(d.x - d.widthLine, 0);
                for (let y = 0; y <= height; y += 24) {
                    const offset = Math.sin(d.sway + y * 0.004) * d.swayAmp;
                    ctx.lineTo(d.x - d.widthLine + offset, y);
                }
                for (let y = height; y >= 0; y -= 24) {
                    const offset = Math.sin(d.sway + y * 0.004) * d.swayAmp;
                    ctx.lineTo(d.x + d.widthLine + offset, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }

        function drawHalo() {
            const cx = width * 0.5;
            const cy = height * 0.34;
            const breath = 1 + Math.sin(frameCount * 0.008) * 0.05;
            const rotation = frameCount * 0.0012;

            // Ambient heart glow beneath the spiral
            const heartGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.45);
            heartGrad.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${0.10 * breath})`);
            heartGrad.addColorStop(0.5, `rgba(${ROSE.r}, ${ROSE.g}, ${ROSE.b}, ${0.05 * breath})`);
            heartGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = heartGrad;
            ctx.fillRect(0, 0, width, height);

            haloDots.forEach((d) => {
                d.twinkle += d.twinkleSpeed;
                const tw = 0.75 + Math.sin(d.twinkle) * 0.25;
                const angle = d.theta + rotation;
                const r = d.r * breath;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r * 0.92; // slight vertical squash
                const c = d.tint;
                const s = d.size * tw;
                ctx.save();
                ctx.globalAlpha = d.opacity * tw;
                ctx.drawImage(glowSprite, x - s * 2, y - s * 2, s * 4, s * 4);
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
                ctx.beginPath();
                ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Thin halo ring — the circlet of the goddess
            ctx.save();
            ctx.globalAlpha = 0.18 * breath;
            ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 1)`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.6)`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.min(width, height) * 0.36 * breath, Math.min(width, height) * 0.33 * breath, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Drape folds behind everything
            drawDrapes();

            // The spiral halo
            drawHalo();

            // Drifting petals
            petals.forEach((p) => { p.update(); p.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal (hebe namespace) ───────────────────────────────────── */
    const hebeReveals = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const hebeRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    hebeRevealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });
        hebeReveals.forEach((el) => hebeRevealObserver.observe(el));
    } else {
        hebeReveals.forEach((el) => el.classList.add('revealed'));
    }

    /* ── Nav Scroll Effect (hebe namespace) ───────────────────────────────── */
    const hebeNav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!hebeNav) return;
        if (window.scrollY > 100) {
            hebeNav.classList.add('scrolled');
        } else {
            hebeNav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax (hebe namespace) ─────────────────────────────────── */
    const hebeMascot = document.querySelector('.mascot-img');
    if (hebeMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.querySelector('.hero');
            if (hero && window.scrollY < hero.offsetHeight) {
                hebeMascot.style.transform = `translateY(${window.scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

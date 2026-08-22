/**
 * XIĀN — The Immortal
 * Mist-wisps ascending a mountain peak, cranes gliding through cloud.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Mist Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('xian-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let wisps = [];
        let clouds = [];
        let cranes = [];
        let motes = [];
        let ridges = [];
        let running = true;
        let frameCount = 0;

        // Palette: ink, jade, mist white, pale gold
        const JADE = { r: 126, g: 178, b: 152 };
        const GOLD = { r: 216, g: 186, b: 120 };

        // Offscreen glow sprite (radial soft disc) — reused by wisps, motes, moon halo
        const glowSprite = document.createElement('canvas');
        glowSprite.width = 128;
        glowSprite.height = 128;
        (function bakeGlow() {
            const g = glowSprite.getContext('2d');
            const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 128, 128);
        })();

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildRidges();
        }

        // Layered mountain silhouettes, rebuilt on resize. Three ridgelines with
        // deterministic pseudo-noise so the composition is stable frame to frame.
        function buildRidges() {
            ridges = [];
            const layers = [
                { base: 0.62, amp: 0.16, color: 'rgba(18, 26, 24, 0.55)', seed: 7 },
                { base: 0.72, amp: 0.12, color: 'rgba(14, 20, 19, 0.75)', seed: 13 },
                { base: 0.84, amp: 0.08, color: 'rgba(10, 14, 14, 0.95)', seed: 29 },
            ];
            layers.forEach((layer) => {
                const pts = [];
                const steps = 24;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const n =
                        Math.sin(t * 6.3 + layer.seed) * 0.55 +
                        Math.sin(t * 15.7 + layer.seed * 2.1) * 0.3 +
                        Math.sin(t * 31.1 + layer.seed * 0.7) * 0.15;
                    // Peak bias toward the right third — the immortal's summit
                    const peak = Math.exp(-Math.pow((t - 0.68) * 4.2, 2)) * 0.7;
                    pts.push({
                        x: t * width,
                        y: height * layer.base - (n * 0.5 + peak) * height * layer.amp,
                    });
                }
                ridges.push({ pts, color: layer.color });
            });
        }

        class Wisp {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 40 + Math.random() * 120;
                this.size = 30 + Math.random() * 90;
                this.vy = -(0.15 + Math.random() * 0.45);
                this.sway = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.004 + Math.random() * 0.008;
                this.swayAmp = 12 + Math.random() * 26;
                this.opacity = 0;
                this.maxOpacity = 0.05 + Math.random() * 0.1;
                this.life = 0;
                this.maxLife = 600 + Math.random() * 700;
                this.tint = Math.random() < 0.3 ? GOLD : JADE;
            }

            update() {
                this.life++;
                this.sway += this.swaySpeed;
                this.x += Math.sin(this.sway) * 0.3;
                this.y += this.vy;
                const fadeIn = Math.min(1, this.life / 120);
                const fadeOut = Math.min(1, (this.maxLife - this.life) / 200);
                this.opacity = this.maxOpacity * Math.min(fadeIn, fadeOut);
                if (this.life >= this.maxLife || this.y < -this.size) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(
                    glowSprite,
                    this.x + Math.sin(this.sway) * this.swayAmp - this.size,
                    this.y - this.size,
                    this.size * 2,
                    this.size * 1.2
                );
                ctx.restore();
            }
        }

        class CloudBank {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -width * 0.4;
                this.y = height * (0.15 + Math.random() * 0.35);
                this.size = 120 + Math.random() * 220;
                this.vx = 0.08 + Math.random() * 0.16;
                this.opacity = 0.03 + Math.random() * 0.05;
            }

            update() {
                this.x += this.vx;
                if (this.x - this.size > width) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(
                    glowSprite,
                    this.x - this.size,
                    this.y - this.size * 0.35,
                    this.size * 2,
                    this.size * 0.7
                );
                ctx.restore();
            }
        }

        class Crane {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 400 + Math.random() * 600;
            }

            launch() {
                this.active = true;
                this.dir = Math.random() < 0.5 ? 1 : -1;
                this.x = this.dir === 1 ? -80 : width + 80;
                this.y = height * (0.12 + Math.random() * 0.3);
                this.vx = this.dir * (1.1 + Math.random() * 0.7);
                this.flap = Math.random() * Math.PI * 2;
                this.flapSpeed = 0.09 + Math.random() * 0.04;
                this.scale = 0.7 + Math.random() * 0.6;
                this.bob = Math.random() * Math.PI * 2;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.launch();
                    return;
                }
                this.x += this.vx;
                this.flap += this.flapSpeed;
                this.bob += 0.02;
                this.y += Math.sin(this.bob) * 0.25;
                if (this.x < -120 || this.x > width + 120) {
                    this.reset();
                }
            }

            draw() {
                if (!this.active) return;
                const s = this.scale;
                const wing = Math.sin(this.flap) * 14 * s;
                ctx.save();
                ctx.translate(this.x, this.y);
                if (this.dir === -1) ctx.scale(-1, 1);
                ctx.strokeStyle = 'rgba(232, 234, 228, 0.75)';
                ctx.lineWidth = 2 * s;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(216, 186, 120, 0.5)';
                // Body + neck
                ctx.beginPath();
                ctx.moveTo(-14 * s, 0);
                ctx.quadraticCurveTo(0, -3 * s, 14 * s, 0);
                ctx.quadraticCurveTo(22 * s, -2 * s, 26 * s, -6 * s);
                ctx.stroke();
                // Wings
                ctx.beginPath();
                ctx.moveTo(0, -2 * s);
                ctx.quadraticCurveTo(-10 * s, -10 * s - wing, -26 * s, -6 * s - wing * 1.4);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -2 * s);
                ctx.quadraticCurveTo(10 * s, -10 * s + wing, 26 * s, -6 * s + wing * 1.4);
                ctx.stroke();
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
                this.size = 1 + Math.random() * 2;
                this.vy = -(0.1 + Math.random() * 0.3);
                this.vx = (Math.random() - 0.5) * 0.2;
                this.opacity = 0.15 + Math.random() * 0.35;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = 'rgb(216, 186, 120)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 90; i++) wisps.push(new Wisp());
        for (let i = 0; i < 5; i++) clouds.push(new CloudBank());
        for (let i = 0; i < 2; i++) cranes.push(new Crane());
        for (let i = 0; i < 60; i++) motes.push(new Mote());

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Pale moon glow high over the summit
            const moonX = width * 0.68;
            const moonY = height * 0.16;
            const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, height * 0.4);
            moonGrad.addColorStop(0, 'rgba(238, 232, 210, 0.10)');
            moonGrad.addColorStop(0.4, 'rgba(216, 186, 120, 0.04)');
            moonGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = moonGrad;
            ctx.fillRect(0, 0, width, height);

            // Drifting cloud banks behind the ridges
            clouds.forEach((c) => { c.update(); c.draw(); });

            // Mountain silhouettes
            ridges.forEach((ridge) => {
                ctx.fillStyle = ridge.color;
                ctx.beginPath();
                ctx.moveTo(0, height);
                ridge.pts.forEach((p) => ctx.lineTo(p.x, p.y));
                ctx.lineTo(width, height);
                ctx.closePath();
                ctx.fill();
            });

            // Ascending mist
            wisps.forEach((w) => { w.update(); w.draw(); });

            // Golden motes
            motes.forEach((m) => { m.update(); m.draw(); });

            // Cranes
            cranes.forEach((c) => { c.update(); c.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal (xian namespace) ───────────────────────────────────── */
    const xianReveals = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const xianRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    xianRevealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });
        xianReveals.forEach((el) => xianRevealObserver.observe(el));
    } else {
        xianReveals.forEach((el) => el.classList.add('revealed'));
    }

    /* ── Nav Scroll Effect (xian namespace) ───────────────────────────────── */
    const xianNav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!xianNav) return;
        if (window.scrollY > 100) {
            xianNav.classList.add('scrolled');
        } else {
            xianNav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax (xian namespace) ─────────────────────────────────── */
    const xianMascot = document.querySelector('.mascot-img');
    if (xianMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.querySelector('.hero');
            if (hero && window.scrollY < hero.offsetHeight) {
                xianMascot.style.transform = `translateY(${window.scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

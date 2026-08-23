/**
 * ŌKUNINUSHI — The Nation-Builder
 * Land-forming wave-rings rising from the sea, and the white rabbit of Inaba
 * hopping its trail across the water.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Wave Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('wave-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let rings = [];
        let emitters = [];
        let shimmers = [];
        let trailSparks = [];
        let rabbit = null;
        let running = true;
        let frameCount = 0;

        // Palette: deep sea, foam white, land gold
        const SEA = { r: 44, g: 92, b: 120 };
        const FOAM = { r: 226, g: 238, b: 240 };
        const LAND = { r: 198, g: 168, b: 110 };

        // Offscreen glow sprite for shimmers and trail sparks
        const glowSprite = document.createElement('canvas');
        glowSprite.width = 64;
        glowSprite.height = 64;
        (function bakeGlow() {
            const g = glowSprite.getContext('2d');
            const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
        })();

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildEmitters();
        }

        // Ring emitters along the water line — where land is being raised
        function buildEmitters() {
            emitters = [];
            const waterY = height * 0.72;
            const count = 4;
            for (let i = 0; i < count; i++) {
                emitters.push({
                    x: width * (0.15 + (i / (count - 1)) * 0.7) + (Math.random() - 0.5) * width * 0.06,
                    y: waterY + (Math.random() - 0.5) * height * 0.06,
                    cooldown: Math.random() * 160,
                    interval: 140 + Math.random() * 120,
                });
            }
        }

        class WaveRing {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = 4;
                this.maxRadius = 90 + Math.random() * 160;
                this.speed = 0.35 + Math.random() * 0.3;
                this.opacity = 0.55;
                this.lineWidth = 2.5;
                this.gold = Math.random() < 0.3;
            }

            update() {
                this.radius += this.speed;
                const t = this.radius / this.maxRadius;
                this.opacity = 0.55 * (1 - t);
                this.lineWidth = 2.5 * (1 - t * 0.6);
                return this.radius < this.maxRadius;
            }

            draw() {
                if (this.opacity <= 0) return;
                const c = this.gold ? LAND : FOAM;
                // Squashed ellipse reads as a ring on the water plane
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 1)`;
                ctx.lineWidth = this.lineWidth;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.28, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        class Shimmer {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter
                    ? height * (0.6 + Math.random() * 0.4)
                    : height * 0.6 + Math.random() * height * 0.4;
                this.size = 1 + Math.random() * 2.5;
                this.opacity = 0;
                this.maxOpacity = 0.15 + Math.random() * 0.3;
                this.life = 0;
                this.maxLife = 120 + Math.random() * 200;
            }

            update() {
                this.life++;
                const fadeIn = Math.min(1, this.life / 40);
                const fadeOut = Math.min(1, (this.maxLife - this.life) / 60);
                this.opacity = this.maxOpacity * Math.min(fadeIn, fadeOut);
                if (this.life >= this.maxLife) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(glowSprite, this.x - this.size * 3, this.y - this.size * 3, this.size * 6, this.size * 6);
                ctx.restore();
            }
        }

        class TrailSpark {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = 0.2 + Math.random() * 0.5;
                this.size = 1.5 + Math.random() * 2;
                this.life = 40 + Math.random() * 40;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
            }

            draw() {
                const a = (this.life / this.maxLife) * 0.6;
                if (a <= 0) return;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.drawImage(glowSprite, this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);
                ctx.restore();
            }
        }

        // The white rabbit of Inaba: hops a long arc across the water line,
        // lands, pauses, hops again. Trail sparks fall from each landing.
        class Rabbit {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 300 + Math.random() * 400;
            }

            launch() {
                this.active = true;
                this.dir = Math.random() < 0.5 ? 1 : -1;
                this.x = this.dir === 1 ? -40 : width + 40;
                this.baseY = height * (0.7 + Math.random() * 0.12);
                this.y = this.baseY;
                this.hopT = 0;
                this.hopLen = 26 + Math.random() * 14; // frames per hop
                this.hopHeight = 22 + Math.random() * 16;
                this.speed = this.dir * (1.6 + Math.random() * 0.8);
                this.pause = 0;
                this.scale = 0.8 + Math.random() * 0.4;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.launch();
                    return;
                }
                if (this.pause > 0) {
                    this.pause--;
                    this.y = this.baseY;
                    return;
                }
                this.hopT++;
                this.x += this.speed;
                const t = (this.hopT % this.hopLen) / this.hopLen;
                this.y = this.baseY - Math.sin(t * Math.PI) * this.hopHeight;
                if (this.hopT % this.hopLen === 0) {
                    // Landing: kick up sparks and occasionally pause
                    for (let i = 0; i < 4; i++) {
                        trailSparks.push(new TrailSpark(this.x, this.baseY));
                    }
                    if (Math.random() < 0.25) {
                        this.pause = 20 + Math.random() * 40;
                    }
                }
                if (this.x < -60 || this.x > width + 60) {
                    this.reset();
                }
            }

            draw() {
                if (!this.active) return;
                const s = this.scale;
                const t = (this.hopT % this.hopLen) / this.hopLen;
                const stretch = 1 + Math.sin(t * Math.PI) * 0.25;
                ctx.save();
                ctx.translate(this.x, this.y);
                if (this.dir === -1) ctx.scale(-1, 1);
                ctx.fillStyle = 'rgba(238, 242, 244, 0.92)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(226, 238, 240, 0.7)';
                // Body
                ctx.beginPath();
                ctx.ellipse(0, 0, 10 * s * stretch, 6.5 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                // Head
                ctx.beginPath();
                ctx.arc(8 * s * stretch, -5 * s, 4.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Ears — swept back mid-hop, upright when paused
                const earAngle = this.pause > 0 ? -0.2 : -0.7 - Math.sin(t * Math.PI) * 0.3;
                ctx.save();
                ctx.translate(8 * s * stretch, -8 * s);
                ctx.rotate(earAngle);
                ctx.beginPath();
                ctx.ellipse(0, -6 * s, 1.8 * s, 6 * s, 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(-3 * s, -5 * s, 1.6 * s, 5.5 * s, 0.05, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Tail puff
                ctx.beginPath();
                ctx.arc(-9 * s * stretch, -2 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 80; i++) shimmers.push(new Shimmer());
        rabbit = new Rabbit();

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const waterY = height * 0.72;

            // Deep-sea gradient below the water line
            const seaGrad = ctx.createLinearGradient(0, waterY - height * 0.2, 0, height);
            seaGrad.addColorStop(0, 'transparent');
            seaGrad.addColorStop(0.5, `rgba(${SEA.r}, ${SEA.g}, ${SEA.b}, 0.10)`);
            seaGrad.addColorStop(1, `rgba(${SEA.r}, ${SEA.g}, ${SEA.b}, 0.22)`);
            ctx.fillStyle = seaGrad;
            ctx.fillRect(0, waterY - height * 0.2, width, height * 0.2 + height * 0.2);

            // Horizon shimmer line
            ctx.save();
            ctx.globalAlpha = 0.12 + Math.sin(frameCount * 0.02) * 0.04;
            ctx.strokeStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, 1)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, waterY);
            for (let x = 0; x <= width; x += 16) {
                ctx.lineTo(x, waterY + Math.sin(x * 0.02 + frameCount * 0.03) * 2);
            }
            ctx.stroke();
            ctx.restore();

            // Emitters spawn wave-rings — the land being raised
            emitters.forEach((e) => {
                e.cooldown--;
                if (e.cooldown <= 0) {
                    rings.push(new WaveRing(e.x, e.y));
                    e.cooldown = e.interval;
                }
            });

            rings = rings.filter((r) => r.update());
            rings.forEach((r) => r.draw());

            // Sea shimmers
            shimmers.forEach((s) => { s.update(); s.draw(); });

            // Rabbit + trail
            rabbit.update();
            rabbit.draw();
            trailSparks = trailSparks.filter((s) => s.life > 0);
            trailSparks.forEach((s) => { s.update(); s.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal (okuninushi namespace) ─────────────────────────────── */
    const okuninushiReveals = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const okuninushiRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    okuninushiRevealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });
        okuninushiReveals.forEach((el) => okuninushiRevealObserver.observe(el));
    } else {
        okuninushiReveals.forEach((el) => el.classList.add('revealed'));
    }

    /* ── Nav Scroll Effect (okuninushi namespace) ─────────────────────────── */
    const okuninushiNav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!okuninushiNav) return;
        if (window.scrollY > 100) {
            okuninushiNav.classList.add('scrolled');
        } else {
            okuninushiNav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax (okuninushi namespace) ───────────────────────────── */
    const okuninushiMascot = document.querySelector('.mascot-img');
    if (okuninushiMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.querySelector('.hero');
            if (hero && window.scrollY < hero.offsetHeight) {
                okuninushiMascot.style.transform = `translateY(${window.scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

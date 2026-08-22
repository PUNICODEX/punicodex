/**
 * NIKKŌ — The Sacred Site
 * Cedar avenue converging on the shrine, lantern glow drifting between trunks.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Lantern Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('lantern-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let trunks = [];
        let lanterns = [];
        let motes = [];
        let beams = [];
        let running = true;
        let frameCount = 0;

        // Palette: vermilion shrine, warm lantern gold, deep cedar shadow
        const VERMILION = { r: 198, g: 64, b: 40 };
        const LANTERN = { r: 244, g: 190, b: 96 };

        // Offscreen glow sprite reused by lanterns, motes, and the shrine heart
        const glowSprite = document.createElement('canvas');
        glowSprite.width = 128;
        glowSprite.height = 128;
        (function bakeGlow() {
            const g = glowSprite.getContext('2d');
            const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 128, 128);
        })();

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildAvenue();
        }

        // Two rows of cedar trunks converging on a vanishing point slightly
        // right of centre, high in the frame — the shrine approach.
        function buildAvenue() {
            trunks = [];
            const vpX = width * 0.58;
            const vpY = height * 0.34;
            const rows = [
                { side: -1, count: 9 },
                { side: 1, count: 9 },
            ];
            rows.forEach((row) => {
                for (let i = 0; i < row.count; i++) {
                    const t = i / (row.count - 1); // 0 = near, 1 = far
                    const depth = 1 - t;
                    const baseX = vpX + row.side * (width * 0.06 + depth * width * 0.52);
                    const trunkWidth = 4 + depth * 26;
                    trunks.push({
                        x: baseX,
                        w: trunkWidth,
                        depth,
                        phase: Math.random() * Math.PI * 2,
                        alpha: 0.25 + depth * 0.6,
                        lit: Math.random() < 0.3,
                    });
                }
            });
            trunks.sort((a, b) => a.depth - b.depth); // far first
        }

        class LanternGlow {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                const depth = 0.25 + Math.random() * 0.75;
                const vpX = width * 0.58;
                const side = Math.random() < 0.5 ? -1 : 1;
                this.x = vpX + side * (width * 0.04 + depth * width * 0.42);
                this.y = scatter
                    ? height * (0.3 + Math.random() * 0.65)
                    : height + 30;
                this.depth = depth;
                this.size = (8 + depth * 30) * (0.8 + Math.random() * 0.4);
                this.vy = -(0.06 + Math.random() * 0.14) * depth;
                this.sway = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.006 + Math.random() * 0.01;
                this.opacity = 0.25 + depth * 0.5;
                this.flicker = Math.random() * Math.PI * 2;
                this.vermilion = Math.random() < 0.35;
            }

            update() {
                this.sway += this.swaySpeed;
                this.flicker += 0.07;
                this.x += Math.sin(this.sway) * 0.25;
                this.y += this.vy;
                if (this.y < height * 0.22) {
                    this.reset(false);
                }
            }

            draw() {
                const pulse = 0.82 + Math.sin(this.flicker) * 0.18;
                const c = this.vermilion ? VERMILION : LANTERN;
                const s = this.size * pulse;
                ctx.save();
                ctx.globalAlpha = this.opacity * pulse;
                ctx.drawImage(glowSprite, this.x - s * 2, this.y - s * 2, s * 4, s * 4);
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.55)`;
                ctx.shadowBlur = 14;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, s * 0.35, 0, Math.PI * 2);
                ctx.fill();
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
                this.size = 0.8 + Math.random() * 1.6;
                this.vy = -(0.08 + Math.random() * 0.22);
                this.vx = (Math.random() - 0.5) * 0.15;
                this.opacity = 0.1 + Math.random() * 0.3;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = 'rgb(244, 190, 96)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class LightBeam {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 200 + Math.random() * 400;
            }

            launch() {
                this.active = true;
                this.angle = (Math.random() - 0.5) * 0.9;
                this.width = 0.03 + Math.random() * 0.05;
                this.opacity = 0;
                this.maxOpacity = 0.04 + Math.random() * 0.05;
                this.life = 0;
                this.maxLife = 300 + Math.random() * 300;
                this.drift = (Math.random() - 0.5) * 0.0004;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.launch();
                    return;
                }
                this.life++;
                this.angle += this.drift;
                const fadeIn = Math.min(1, this.life / 90);
                const fadeOut = Math.min(1, (this.maxLife - this.life) / 120);
                this.opacity = this.maxOpacity * Math.min(fadeIn, fadeOut);
                if (this.life >= this.maxLife) this.reset();
            }

            draw() {
                if (!this.active || this.opacity <= 0) return;
                const vpX = width * 0.58;
                const vpY = height * 0.3;
                const len = Math.max(width, height) * 1.1;
                ctx.save();
                ctx.translate(vpX, vpY);
                ctx.rotate(this.angle);
                const grad = ctx.createLinearGradient(0, 0, len, 0);
                grad.addColorStop(0, `rgba(244, 190, 96, ${this.opacity})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len, -len * this.width);
                ctx.lineTo(len, len * this.width);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 26; i++) lanterns.push(new LanternGlow());
        for (let i = 0; i < 70; i++) motes.push(new Mote());
        for (let i = 0; i < 3; i++) beams.push(new LightBeam());

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const vpX = width * 0.58;
            const vpY = height * 0.34;

            // Shrine heart — a warm vermilion-gold glow at the vanishing point
            const heart = 0.85 + Math.sin(frameCount * 0.01) * 0.15;
            const heartGrad = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, height * 0.42);
            heartGrad.addColorStop(0, `rgba(244, 190, 96, ${0.14 * heart})`);
            heartGrad.addColorStop(0.35, `rgba(198, 64, 40, ${0.07 * heart})`);
            heartGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = heartGrad;
            ctx.fillRect(0, 0, width, height);

            // Light beams
            beams.forEach((b) => { b.update(); b.draw(); });

            // Cedar trunks (far to near), with a lantern-lit edge on some
            trunks.forEach((t) => {
                const sway = Math.sin(frameCount * 0.004 + t.phase) * t.depth * 1.5;
                ctx.save();
                ctx.globalAlpha = t.alpha;
                ctx.fillStyle = 'rgb(12, 18, 16)';
                ctx.fillRect(t.x + sway - t.w / 2, 0, t.w, height);
                if (t.lit) {
                    const edge = ctx.createLinearGradient(t.x + sway - t.w / 2, 0, t.x + sway + t.w / 2, 0);
                    edge.addColorStop(0, 'transparent');
                    edge.addColorStop(1, 'rgba(244, 190, 96, 0.12)');
                    ctx.fillStyle = edge;
                    ctx.fillRect(t.x + sway - t.w / 2, 0, t.w, height);
                }
                ctx.restore();
            });

            // Lantern glows
            lanterns.forEach((l) => { l.update(); l.draw(); });

            // Golden motes
            motes.forEach((m) => { m.update(); m.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal (nikko namespace) ──────────────────────────────────── */
    const nikkoReveals = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const nikkoRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    nikkoRevealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });
        nikkoReveals.forEach((el) => nikkoRevealObserver.observe(el));
    } else {
        nikkoReveals.forEach((el) => el.classList.add('revealed'));
    }

    /* ── Nav Scroll Effect (nikko namespace) ──────────────────────────────── */
    const nikkoNav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!nikkoNav) return;
        if (window.scrollY > 100) {
            nikkoNav.classList.add('scrolled');
        } else {
            nikkoNav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax (nikko namespace) ────────────────────────────────── */
    const nikkoMascot = document.querySelector('.mascot-img');
    if (nikkoMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.querySelector('.hero');
            if (hero && window.scrollY < hero.offsetHeight) {
                nikkoMascot.style.transform = `translateY(${window.scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

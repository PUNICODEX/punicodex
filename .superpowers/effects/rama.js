/**
 * RĀMA — The Virtuous King, the Ideal Made Flesh
 * Bowstring-draw energy + royal halo
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Bowstring & Halo Canvas System
    // ============================
    const canvas = document.getElementById('bowstring-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let arrows = [];
        let motes = [];
        let haloRays = [];
        let frameCount = 0;
        let drawPhase = 0;      // 0..1 bow draw cycle
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.5, active: false };

        // Palette: royal forest green, solar gold, ivory, kodanda steel
        const PALETTE = {
            green: { r: 22, g: 90, b: 60 },
            emerald: { r: 46, g: 139, b: 87 },
            gold: { r: 255, g: 200, b: 64 },
            paleGold: { r: 255, g: 232, b: 170 },
            ivory: { r: 250, g: 246, b: 230 },
            steel: { r: 200, g: 210, b: 220 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ---- Offscreen sprite atlas: a soft gold mote ----
        const moteSprite = (function buildMoteSprite() {
            const size = 20;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');
            const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 240, 200, 1)');
            grad.addColorStop(0.5, 'rgba(255, 200, 64, 0.6)');
            grad.addColorStop(1, 'rgba(255, 200, 64, 0)');
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, size, size);
            return sprite;
        })();

        class Arrow {
            constructor(x, y, angle) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.speed = 14 + Math.random() * 4;
                this.life = 60;
                this.maxLife = this.life;
                this.trail = [];
            }
            update() {
                this.trail.unshift({ x: this.x, y: this.y });
                if (this.trail.length > 12) this.trail.pop();
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.life--;
            }
            get done() {
                return this.life <= 0 || this.x < -80 || this.x > width + 80 ||
                    this.y < -80 || this.y > height + 80;
            }

            draw() {
                const fade = Math.min(1, this.life / (this.maxLife * 0.5));
                ctx.save();

                // Luminous trail
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const a = fade * (1 - i / this.trail.length) * 0.5;
                    ctx.globalAlpha = a;
                    ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
                    ctx.lineWidth = 3 * (1 - i / this.trail.length) + 0.5;
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = 'rgba(255, 200, 64, 0.8)';
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i].x, this.trail[i].y);
                    ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                    ctx.stroke();
                }

                // Arrowhead of light
                ctx.globalAlpha = fade;
                ctx.fillStyle = `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, 1)`;
                ctx.shadowBlur = 18;
                ctx.shadowColor = 'rgba(255, 232, 170, 1)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 10;
                this.vy = -(0.1 + Math.random() * 0.35);
                this.size = 2 + Math.random() * 5;
                this.opacity = 0.15 + Math.random() * 0.4;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += 0.02;
                this.y += this.vy;
                this.x += Math.sin(this.phase) * 0.25;
                if (this.y < -15) this.reset(false);
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity * (0.6 + Math.sin(this.phase * 2) * 0.4);
                ctx.drawImage(moteSprite, this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
                ctx.restore();
            }
        }

        class HaloRay {
            constructor(index, count) {
                this.baseAngle = (index / count) * Math.PI * 2;
                this.lengthJitter = 0.85 + ((index * 7919) % 10) / 40;
                this.width = 0.02 + ((index * 104729) % 10) / 500;
            }
            draw(cx, cy, radius, rotation, pulse) {
                const a = this.baseAngle + rotation;
                const len = radius * this.lengthJitter * (1 + pulse * 0.06);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(a);
                const grad = ctx.createLinearGradient(0, 0, len, 0);
                grad.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.10 + pulse * 0.05})`);
                grad.addColorStop(0.7, `rgba(${PALETTE.paleGold.r}, ${PALETTE.paleGold.g}, ${PALETTE.paleGold.b}, ${0.04 + pulse * 0.02})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(radius * 0.3, 0);
                ctx.arc(0, 0, len, -this.width, this.width);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 130; i++) motes.push(new Mote());
        const rayCount = 24;
        for (let i = 0; i < rayCount; i++) haloRays.push(new HaloRay(i, rayCount));

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

        // Draw cycle: 0..0.7 drawing back (tension), 0.7..0.8 release, 0.8..1 rest
        const CYCLE = 480;

        function drawBow(cx, cy, R, tension, t) {
            // The great bow Kodaṇḍa: an arc that flexes as the string draws
            const flex = tension * 0.12;
            const halfArc = Math.PI * (0.62 - flex * 0.5);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 2 + Math.sin(t * 0.3) * 0.02);

            // Bow limbs — emerald-green lacquer with gold tips
            ctx.strokeStyle = `rgba(${PALETTE.emerald.r}, ${PALETTE.emerald.g}, ${PALETTE.emerald.b}, 0.55)`;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 14;
            ctx.shadowColor = 'rgba(46, 139, 87, 0.6)';
            ctx.beginPath();
            ctx.arc(0, 0, R, -halfArc, halfArc);
            ctx.stroke();

            // Gold tips on the limbs
            const tipTop = { x: Math.cos(-halfArc) * R, y: Math.sin(-halfArc) * R };
            const tipBot = { x: Math.cos(halfArc) * R, y: Math.sin(halfArc) * R };
            [tipTop, tipBot].forEach(tip => {
                ctx.fillStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });

            // The bowstring — drawn back toward the center by tension
            const draw = tension * R * 0.55;
            const anchorX = -draw;
            const hum = tension > 0.6 ? Math.sin(t * 40) * tension * 1.5 : 0;

            ctx.strokeStyle = `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, ${0.4 + tension * 0.4})`;
            ctx.lineWidth = 1.5 + tension;
            ctx.shadowBlur = 8 + tension * 14;
            ctx.shadowColor = 'rgba(255, 232, 170, 0.9)';
            ctx.beginPath();
            ctx.moveTo(tipTop.x, tipTop.y);
            ctx.quadraticCurveTo(anchorX, hum, tipBot.x, tipBot.y);
            ctx.stroke();

            // The nocked arrow of light while the string is drawn
            if (tension > 0.15) {
                const shaftGrad = ctx.createLinearGradient(anchorX - R * 0.4, 0, R * 0.9, 0);
                shaftGrad.addColorStop(0, 'rgba(255, 232, 170, 0)');
                shaftGrad.addColorStop(0.5, `rgba(255, 232, 170, ${tension * 0.7})`);
                shaftGrad.addColorStop(1, `rgba(255, 255, 255, ${tension * 0.9})`);
                ctx.strokeStyle = shaftGrad;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(anchorX - R * 0.4, hum * 0.5);
                ctx.lineTo(R * 0.9, 0);
                ctx.stroke();

                // Tension glow at the nock point
                const nock = ctx.createRadialGradient(anchorX, 0, 0, anchorX, 0, 30 + tension * 30);
                nock.addColorStop(0, `rgba(255, 232, 170, ${tension * 0.5})`);
                nock.addColorStop(1, 'transparent');
                ctx.fillStyle = nock;
                ctx.beginPath();
                ctx.arc(anchorX, 0, 30 + tension * 30, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            return { releaseX: cx, releaseY: cy, tipTop, tipBot };
        }

        function animate() {
            rafId = null;
            if (paused) return;
            frameCount++;
            const t = frameCount / 60;
            ctx.clearRect(0, 0, width, height);

            // Royal forest canopy ambience
            const canopy = ctx.createLinearGradient(0, 0, 0, height);
            canopy.addColorStop(0, 'rgba(22, 90, 60, 0.10)');
            canopy.addColorStop(0.6, 'rgba(16, 60, 44, 0.06)');
            canopy.addColorStop(1, 'rgba(255, 200, 64, 0.04)');
            ctx.fillStyle = canopy;
            ctx.fillRect(0, 0, width, height);

            const cx = (pointer.active ? pointer.x : 0.5) * width;
            const cy = (pointer.active ? pointer.y : 0.5) * height;
            const R = Math.min(width, height) * 0.24;

            // Bow draw cycle
            drawPhase = (frameCount % CYCLE) / CYCLE;
            let tension;
            if (drawPhase < 0.7) {
                tension = drawPhase / 0.7;                    // slow, sure draw
            } else if (drawPhase < 0.78) {
                tension = 1 - (drawPhase - 0.7) / 0.08;       // the release
            } else {
                tension = 0;                                   // rest
            }
            tension = Math.max(0, tension);

            // Royal halo behind the bow — slow-turning solar rays
            const pulse = 0.5 + Math.sin(t * 0.8) * 0.5;
            const haloCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);
            haloCore.addColorStop(0, `rgba(255, 200, 64, ${0.06 + pulse * 0.03 + tension * 0.04})`);
            haloCore.addColorStop(0.5, 'rgba(255, 232, 170, 0.03)');
            haloCore.addColorStop(1, 'transparent');
            ctx.fillStyle = haloCore;
            ctx.fillRect(0, 0, width, height);

            haloRays.forEach(ray => ray.draw(cx, cy, R * 2.6, t * 0.05, pulse));

            // Halo ring
            ctx.save();
            ctx.globalAlpha = 0.14 + pulse * 0.06;
            ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 16;
            ctx.shadowColor = 'rgba(255, 200, 64, 0.7)';
            ctx.beginPath();
            ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // The bow, and the released arrow
            const bow = drawBow(cx, cy, R, tension, t);
            if (drawPhase >= 0.7 && drawPhase < 0.72 && arrows.length < 6) {
                const aim = pointer.active
                    ? Math.atan2(pointer.y * height - cy, pointer.x * width - cx)
                    : (Math.random() - 0.5) * 0.6;
                arrows.push(new Arrow(bow.releaseX, bow.releaseY, aim));
            }

            arrows = arrows.filter(a => !a.done);
            arrows.forEach(a => { a.update(); a.draw(); });

            // Ambient gold motes — the court of Ayodhyā
            motes.forEach(m => { m.update(); m.draw(); });

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

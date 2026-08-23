/**
 * GAṆEŚA — Remover of Obstacles, Lord of Beginnings
 * Modak-sweet golden glow + obstacle-clearing sweep
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Modak Glow Canvas System
    // ============================
    const canvas = document.getElementById('modak-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let modaks = [];
        let obstacles = [];
        let sweeps = [];
        let motes = [];
        let frameCount = 0;
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.4, active: false };

        // Palette: saffron, temple gold, warm amber, deep marigold
        const PALETTE = {
            gold: { r: 255, g: 200, b: 64 },
            saffron: { r: 255, g: 153, b: 51 },
            amber: { r: 255, g: 179, b: 71 },
            marigold: { r: 255, g: 119, b: 0 },
            cream: { r: 255, g: 240, b: 200 },
            stone: { r: 60, g: 42, b: 36 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ---- Offscreen sprite atlas: one modak sweet, tinted at draw time ----
        const modakSprite = (function buildModakSprite() {
            const size = 64;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');

            sctx.translate(size / 2, size / 2);
            const grad = sctx.createRadialGradient(0, -6, 2, 0, 0, size * 0.42);
            grad.addColorStop(0, 'rgba(255, 240, 200, 1)');
            grad.addColorStop(0.5, 'rgba(255, 179, 71, 0.95)');
            grad.addColorStop(1, 'rgba(255, 119, 0, 0.85)');
            sctx.fillStyle = grad;

            // Teardrop modak silhouette with a pointed tip
            sctx.beginPath();
            sctx.moveTo(0, -size * 0.42);
            sctx.bezierCurveTo(size * 0.30, -size * 0.22, size * 0.36, size * 0.08, size * 0.22, size * 0.28);
            sctx.bezierCurveTo(size * 0.10, size * 0.42, -size * 0.10, size * 0.42, -size * 0.22, size * 0.28);
            sctx.bezierCurveTo(-size * 0.36, size * 0.08, -size * 0.30, -size * 0.22, 0, -size * 0.42);
            sctx.fill();

            // Pleated ribs of the sweet
            sctx.strokeStyle = 'rgba(255, 119, 0, 0.35)';
            sctx.lineWidth = 1.5;
            for (let i = -2; i <= 2; i++) {
                sctx.beginPath();
                sctx.moveTo(0, -size * 0.40);
                sctx.quadraticCurveTo(i * size * 0.10, 0, i * size * 0.09, size * 0.30);
                sctx.stroke();
            }
            return sprite;
        })();

        class Modak {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 40;
                this.vy = -(0.15 + Math.random() * 0.35);
                this.vx = (Math.random() - 0.5) * 0.2;
                this.size = 10 + Math.random() * 18;
                this.opacity = 0.25 + Math.random() * 0.45;
                this.phase = Math.random() * Math.PI * 2;
                this.bobSpeed = 0.008 + Math.random() * 0.012;
            }

            update() {
                this.phase += this.bobSpeed;
                this.y += this.vy;
                this.x += this.vx + Math.sin(this.phase) * 0.3;
                if (this.y < -50) this.reset(false);
            }

            draw() {
                const bob = Math.sin(this.phase) * 4;
                ctx.save();
                ctx.globalAlpha = this.opacity * (0.75 + Math.sin(this.phase * 2) * 0.25);
                ctx.translate(this.x, this.y + bob);
                ctx.rotate(Math.sin(this.phase * 0.7) * 0.15);
                ctx.shadowBlur = 18;
                ctx.shadowColor = 'rgba(255, 179, 71, 0.8)';
                ctx.drawImage(modakSprite, -this.size / 2, -this.size / 2, this.size, this.size);
                ctx.restore();
            }
        }

        class Obstacle {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? height * 0.35 + Math.random() * height * 0.55 : height + 30;
                this.size = 8 + Math.random() * 22;
                this.opacity = 0.10 + Math.random() * 0.18;
                this.rotation = Math.random() * Math.PI;
                this.spin = (Math.random() - 0.5) * 0.004;
                this.cleared = 0; // 0 = solid, rises to 1 as the sweep passes through
            }

            update() {
                this.rotation += this.spin;
                if (this.cleared > 0) {
                    this.cleared = Math.min(1, this.cleared + 0.01);
                }
            }

            draw() {
                const fade = this.cleared > 0 ? 1 - this.cleared : 1;
                if (fade <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity * fade;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                // Rough stone silhouette: an irregular polygon
                ctx.fillStyle = `rgba(${PALETTE.stone.r}, ${PALETTE.stone.g}, ${PALETTE.stone.b}, 0.9)`;
                ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.35 * this.cleared})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const sides = 6;
                for (let i = 0; i < sides; i++) {
                    const a = (i / sides) * Math.PI * 2;
                    const r = this.size * (0.75 + ((i * 37) % 10) / 40);
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                if (this.cleared > 0) ctx.stroke();
                ctx.restore();
            }
        }

        class Sweep {
            constructor() {
                this.x = -width * 0.2;
                this.speed = 6 + Math.random() * 4;
                this.thickness = 90 + Math.random() * 60;
                this.tilt = 0.18 + Math.random() * 0.1;
                this.done = false;
            }

            update() {
                this.x += this.speed;
                if (this.x - this.thickness > width * 1.2) this.done = true;
            }

            draw() {
                ctx.save();
                const edge = this.x;
                const grad = ctx.createLinearGradient(edge - this.thickness, 0, edge, 0);
                grad.addColorStop(0, 'rgba(255, 200, 64, 0)');
                grad.addColorStop(0.6, 'rgba(255, 179, 71, 0.10)');
                grad.addColorStop(1, 'rgba(255, 240, 200, 0.20)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(edge - this.thickness, height);
                ctx.lineTo(edge - this.thickness + height * this.tilt, 0);
                ctx.lineTo(edge + height * this.tilt, 0);
                ctx.lineTo(edge, height);
                ctx.closePath();
                ctx.fill();

                // Bright leading edge
                ctx.strokeStyle = 'rgba(255, 240, 200, 0.35)';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255, 200, 64, 0.9)';
                ctx.beginPath();
                ctx.moveTo(edge + height * this.tilt, 0);
                ctx.lineTo(edge, height);
                ctx.stroke();
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
                this.vy = -(0.2 + Math.random() * 0.5);
                this.size = 0.6 + Math.random() * 1.8;
                this.opacity = 0.15 + Math.random() * 0.4;
                this.twinkle = Math.random() * Math.PI * 2;
            }

            update() {
                this.twinkle += 0.05;
                this.y += this.vy;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const glow = this.opacity * (0.6 + Math.sin(this.twinkle) * 0.4);
                ctx.save();
                ctx.globalAlpha = glow;
                ctx.fillStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 22; i++) modaks.push(new Modak());
        for (let i = 0; i < 26; i++) obstacles.push(new Obstacle());
        for (let i = 0; i < 120; i++) motes.push(new Mote());

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
            ctx.clearRect(0, 0, width, height);

            // Warm ambient glow following the pointer (or slow orbit)
            const gx = (pointer.active ? pointer.x : 0.5 + Math.sin(frameCount * 0.002) * 0.15) * width;
            const gy = (pointer.active ? pointer.y : 0.45 + Math.cos(frameCount * 0.0016) * 0.1) * height;
            const ambient = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(width, height) * 0.55);
            ambient.addColorStop(0, 'rgba(255, 179, 71, 0.10)');
            ambient.addColorStop(0.5, 'rgba(255, 153, 51, 0.05)');
            ambient.addColorStop(1, 'transparent');
            ctx.fillStyle = ambient;
            ctx.fillRect(0, 0, width, height);

            // Breathing golden heart-glow at the hero center
            const breath = 0.5 + Math.sin(frameCount * 0.015) * 0.5;
            const heart = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, 220 + breath * 60);
            heart.addColorStop(0, `rgba(255, 240, 200, ${0.08 + breath * 0.05})`);
            heart.addColorStop(0.6, `rgba(255, 200, 64, ${0.04 + breath * 0.03})`);
            heart.addColorStop(1, 'transparent');
            ctx.fillStyle = heart;
            ctx.fillRect(0, 0, width, height);

            // Obstacles, then the clearing sweep passes through them
            obstacles.forEach(o => { o.update(); o.draw(); });

            if (frameCount % 420 === 200 && sweeps.length < 2) sweeps.push(new Sweep());
            sweeps.forEach(s => {
                s.update();
                s.draw();
                obstacles.forEach(o => {
                    if (o.cleared === 0 && Math.abs(o.x + (o.y - height) * s.tilt - s.x) < 40) {
                        o.cleared = 0.02;
                    }
                });
            });
            sweeps = sweeps.filter(s => !s.done);

            // Recycle fully-cleared obstacles back to solid stones
            obstacles.forEach(o => {
                if (o.cleared >= 1) {
                    o.reset(false);
                }
            });

            modaks.forEach(m => { m.update(); m.draw(); });
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

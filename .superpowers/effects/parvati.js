/**
 * PĀRVATĪ — Daughter of the Mountain, Mother of Devotion
 * Himalayan snow-glow + gentle diya flames
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Summit & Flame Canvas System
    // ============================
    const canvas = document.getElementById('summit-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let snowflakes = [];
        let diyas = [];
        let peaks = [];
        let frameCount = 0;
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.5, active: false };

        // Palette: glacial blue-white, dawn blush, warm diya amber
        const PALETTE = {
            ice: { r: 210, g: 230, b: 250 },
            frost: { r: 160, g: 195, b: 235 },
            blush: { r: 255, g: 200, b: 200 },
            flame: { r: 255, g: 170, b: 60 },
            flameCore: { r: 255, g: 235, b: 180 },
            rock: { r: 40, g: 52, b: 80 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildPeaks();
        }

        // Mountain silhouettes, rebuilt on resize so they hug the baseline
        function buildPeaks() {
            peaks = [];
            const layers = 3;
            for (let layer = 0; layer < layers; layer++) {
                const points = [];
                const count = 7 + layer * 2;
                const baseY = height * (0.62 + layer * 0.12);
                const amp = height * (0.28 - layer * 0.07);
                for (let i = 0; i <= count; i++) {
                    const x = (i / count) * width;
                    const jag = (Math.sin(i * 12.9898 + layer * 78.233) * 43758.5453) % 1;
                    const y = baseY - Math.abs(jag) * amp - Math.sin(i * 2.4 + layer) * amp * 0.3;
                    points.push({ x, y });
                }
                peaks.push({ points, layer, baseY });
            }
        }

        // ---- Offscreen sprite atlas: a soft snowflake glow ----
        const flakeSprite = (function buildFlakeSprite() {
            const size = 24;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');
            const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.4, 'rgba(210, 230, 250, 0.6)');
            grad.addColorStop(1, 'rgba(210, 230, 250, 0)');
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, size, size);
            return sprite;
        })();

        class Snowflake {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : -15;
                this.vy = 0.3 + Math.random() * 0.9;
                this.size = 2 + Math.random() * 5;
                this.opacity = 0.3 + Math.random() * 0.55;
                this.sway = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.008 + Math.random() * 0.015;
                this.swayAmp = 0.4 + Math.random() * 1.2;
            }

            update() {
                this.sway += this.swaySpeed;
                this.y += this.vy;
                this.x += Math.sin(this.sway) * this.swayAmp * 0.3;
                if (this.y > height + 15) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity * (0.7 + Math.sin(this.sway * 3) * 0.3);
                ctx.drawImage(flakeSprite, this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
                ctx.restore();
            }
        }

        class Diya {
            constructor(x) {
                this.x = x;
                this.y = height - 14 - Math.random() * 10;
                this.phase = Math.random() * Math.PI * 2;
                this.flickerSpeed = 0.08 + Math.random() * 0.1;
                this.height = 14 + Math.random() * 10;
                this.opacity = 0.55 + Math.random() * 0.35;
            }

            update() {
                this.phase += this.flickerSpeed;
            }

            draw() {
                const flick = 0.8 + Math.sin(this.phase) * 0.12 + Math.sin(this.phase * 2.7) * 0.08;
                const h = this.height * flick;
                const lean = Math.sin(this.phase * 1.3) * 2.5;

                ctx.save();

                // Warm pool of light on the ground
                const pool = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, h * 5);
                pool.addColorStop(0, `rgba(255, 170, 60, ${0.10 * this.opacity * flick})`);
                pool.addColorStop(1, 'transparent');
                ctx.fillStyle = pool;
                ctx.fillRect(this.x - h * 5, this.y - h * 5, h * 10, h * 10);

                // The clay bowl of the lamp
                ctx.globalAlpha = this.opacity * 0.7;
                ctx.fillStyle = 'rgba(120, 70, 40, 0.8)';
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, 7, 3, 0, 0, Math.PI);
                ctx.fill();

                // The teardrop flame
                ctx.globalAlpha = this.opacity;
                const grad = ctx.createRadialGradient(this.x, this.y - h * 0.4, 0, this.x, this.y - h * 0.4, h);
                grad.addColorStop(0, `rgba(${PALETTE.flameCore.r}, ${PALETTE.flameCore.g}, ${PALETTE.flameCore.b}, 0.95)`);
                grad.addColorStop(0.5, `rgba(${PALETTE.flame.r}, ${PALETTE.flame.g}, ${PALETTE.flame.b}, 0.7)`);
                grad.addColorStop(1, 'rgba(255, 100, 20, 0)');
                ctx.fillStyle = grad;
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(255, 170, 60, 0.8)';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - h);
                ctx.quadraticCurveTo(this.x + 4 + lean, this.y - h * 0.5, this.x, this.y - 1);
                ctx.quadraticCurveTo(this.x - 4 + lean, this.y - h * 0.5, this.x, this.y - h);
                ctx.fill();

                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 180; i++) snowflakes.push(new Snowflake());
        const diyaCount = Math.max(4, Math.floor(width / 220));
        for (let i = 0; i < diyaCount; i++) {
            diyas.push(new Diya(((i + 0.5) / diyaCount) * width + (Math.random() - 0.5) * 60));
        }

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

        function drawMountains(t) {
            peaks.forEach(peak => {
                const { points, layer, baseY } = peak;
                ctx.save();

                // Rock silhouette
                const shade = 20 + layer * 14;
                ctx.globalAlpha = 0.35 + layer * 0.2;
                ctx.fillStyle = `rgba(${PALETTE.rock.r + shade}, ${PALETTE.rock.g + shade}, ${PALETTE.rock.b + shade}, 0.9)`;
                ctx.beginPath();
                ctx.moveTo(-20, height + 20);
                points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.lineTo(width + 20, height + 20);
                ctx.closePath();
                ctx.fill();

                // Snow-glow on the ridgeline — breathing with the dawn
                const glowPulse = 0.5 + Math.sin(t * 0.5 + layer * 1.2) * 0.5;
                ctx.globalAlpha = (0.10 + glowPulse * 0.10) * (1 - layer * 0.25);
                ctx.strokeStyle = `rgba(${PALETTE.ice.r}, ${PALETTE.ice.g}, ${PALETTE.ice.b}, 1)`;
                ctx.lineWidth = 3 - layer * 0.6;
                ctx.shadowBlur = 16;
                ctx.shadowColor = `rgba(${PALETTE.frost.r}, ${PALETTE.frost.g}, ${PALETTE.frost.b}, 0.9)`;
                ctx.beginPath();
                points.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();

                ctx.restore();
            });
        }

        function animate() {
            rafId = null;
            if (paused) return;
            frameCount++;
            const t = frameCount / 60;
            ctx.clearRect(0, 0, width, height);

            // Pre-dawn Himalayan sky — cold above, dawn blush at the horizon
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, 'rgba(30, 45, 80, 0.14)');
            sky.addColorStop(0.5, 'rgba(60, 80, 130, 0.08)');
            sky.addColorStop(0.75, `rgba(255, 200, 200, ${0.05 + Math.sin(t * 0.3) * 0.02})`);
            sky.addColorStop(1, 'rgba(255, 170, 60, 0.05)');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // High alpine glow that follows the pointer gently
            const gx = (pointer.active ? pointer.x : 0.5 + Math.sin(t * 0.06) * 0.1) * width;
            const gy = height * 0.3;
            const alpine = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(width, height) * 0.6);
            alpine.addColorStop(0, 'rgba(210, 230, 250, 0.07)');
            alpine.addColorStop(1, 'transparent');
            ctx.fillStyle = alpine;
            ctx.fillRect(0, 0, width, height);

            drawMountains(t);

            // Falling snow in front of the peaks
            snowflakes.forEach(f => { f.update(); f.draw(); });

            // The line of devotional lamps along the base
            diyas.forEach(d => { d.update(); d.draw(); });

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

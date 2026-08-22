/**
 * KĀLĪ — Mother of Time, Dissolver of Worlds
 * Crimson-black pulse waves + ember shower
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Crimson Pulse Canvas System
    // ============================
    const canvas = document.getElementById('crimson-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let pulses = [];
        let embers = [];
        let ashWisps = [];
        let frameCount = 0;
        let beatPhase = 0;
        let paused = false;
        let rafId = null;

        const pointer = { x: 0.5, y: 0.5, active: false };

        // Palette: crimson heart, blood red, coal black, ember orange
        const PALETTE = {
            crimson: { r: 220, g: 20, b: 60 },
            blood: { r: 138, g: 3, b: 3 },
            ember: { r: 255, g: 90, b: 20 },
            gold: { r: 255, g: 190, b: 90 },
            coal: { r: 12, g: 4, b: 8 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // ---- Offscreen sprite atlas: a soft ember glow dot ----
        const emberSprite = (function buildEmberSprite() {
            const size = 32;
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const sctx = sprite.getContext('2d');
            const grad = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 220, 160, 1)');
            grad.addColorStop(0.3, 'rgba(255, 90, 20, 0.9)');
            grad.addColorStop(0.7, 'rgba(220, 20, 60, 0.35)');
            grad.addColorStop(1, 'rgba(138, 3, 3, 0)');
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, size, size);
            return sprite;
        })();

        class PulseWave {
            constructor(x, y, hot) {
                this.x = x;
                this.y = y;
                this.radius = 0;
                this.maxRadius = Math.max(width, height) * (0.5 + Math.random() * 0.4);
                this.speed = 2.2 + Math.random() * 1.6;
                this.opacity = hot ? 0.32 : 0.18;
                this.thickness = hot ? 3 : 1.5;
                this.hot = hot;
                this.done = false;
            }

            update() {
                this.radius += this.speed;
                this.speed *= 1.004;
                this.opacity *= 0.992;
                if (this.radius > this.maxRadius || this.opacity < 0.005) this.done = true;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const c = this.hot ? PALETTE.crimson : PALETTE.blood;
                ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 1)`;
                ctx.lineWidth = this.thickness;
                ctx.shadowBlur = this.hot ? 24 : 10;
                ctx.shadowColor = `rgba(${PALETTE.crimson.r}, ${PALETTE.crimson.g}, ${PALETTE.crimson.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner echo ring, slightly offset for depth
                if (this.hot) {
                    ctx.globalAlpha = this.opacity * 0.4;
                    ctx.lineWidth = this.thickness * 2.5;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius * 0.86, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        class Ember {
            constructor(burst) {
                this.reset(burst);
            }

            reset(burst) {
                if (burst) {
                    this.x = width / 2 + (Math.random() - 0.5) * 60;
                    this.y = height * 0.5 + (Math.random() - 0.5) * 40;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 3;
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed - 1;
                } else {
                    this.x = Math.random() * width;
                    this.y = height + 20;
                    this.vx = (Math.random() - 0.5) * 0.6;
                    this.vy = -(0.8 + Math.random() * 2.2);
                }
                this.size = 4 + Math.random() * 12;
                this.opacity = 0.4 + Math.random() * 0.6;
                this.life = 120 + Math.random() * 180;
                this.maxLife = this.life;
                this.flicker = Math.random() * Math.PI * 2;
                this.wobble = Math.random() * Math.PI * 2;
            }

            update() {
                this.flicker += 0.2;
                this.wobble += 0.03;
                this.x += this.vx + Math.sin(this.wobble) * 0.5;
                this.y += this.vy;
                this.vx *= 0.995;
                this.vy *= 0.998;
                this.life--;
                if (this.life <= 0 || this.y < -30) this.reset(false);
            }

            draw() {
                const fade = Math.min(1, this.life / (this.maxLife * 0.4));
                const flick = 0.6 + Math.sin(this.flicker) * 0.4;
                ctx.save();
                ctx.globalAlpha = this.opacity * fade * flick;
                ctx.drawImage(emberSprite, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                ctx.restore();
            }
        }

        class AshWisp {
            constructor() {
                this.reset(true);
            }

            reset(initial) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height * (0.3 + Math.random() * 0.7);
                this.radius = 60 + Math.random() * 140;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.opacity = 0.02 + Math.random() * 0.05;
                this.life = 400 + Math.random() * 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.life--;
                if (this.life <= 0) this.reset(false);
            }

            draw() {
                const fade = Math.sin((this.life / this.maxLife) * Math.PI);
                ctx.save();
                ctx.globalAlpha = this.opacity * fade;
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                grad.addColorStop(0, 'rgba(40, 10, 18, 0.9)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ---- Initialization ----
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 160; i++) embers.push(new Ember(false));
        for (let i = 0; i < 5; i++) ashWisps.push(new AshWisp());

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

        function heartbeat(t) {
            // Two-thump heartbeat envelope: strong beat + weaker echo
            const cycle = t % 1;
            const thump = Math.exp(-Math.pow((cycle - 0.12) * 9, 2));
            const echo = Math.exp(-Math.pow((cycle - 0.34) * 11, 2)) * 0.5;
            return thump + echo;
        }

        function animate() {
            rafId = null;
            if (paused) return;
            frameCount++;
            beatPhase = (beatPhase + 0.008) % 1;
            ctx.clearRect(0, 0, width, height);

            const beat = heartbeat(beatPhase);

            // Deep coal vignette that breathes crimson with the beat
            const vignette = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) * 0.75
            );
            vignette.addColorStop(0, `rgba(138, 3, 3, ${0.05 + beat * 0.06})`);
            vignette.addColorStop(0.6, `rgba(40, 8, 14, ${0.08 + beat * 0.03})`);
            vignette.addColorStop(1, `rgba(${PALETTE.coal.r}, ${PALETTE.coal.g}, ${PALETTE.coal.b}, 0.25)`);
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            // Ash wisps drifting under everything
            ashWisps.forEach(w => { w.update(); w.draw(); });

            // The beating heart of the goddess: a core that flares and sheds waves
            const coreX = pointer.active ? pointer.x * width : width / 2;
            const coreY = pointer.active ? pointer.y * height : height * 0.5;
            const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 140 + beat * 120);
            core.addColorStop(0, `rgba(220, 20, 60, ${0.10 + beat * 0.12})`);
            core.addColorStop(0.4, `rgba(138, 3, 3, ${0.06 + beat * 0.05})`);
            core.addColorStop(1, 'transparent');
            ctx.fillStyle = core;
            ctx.fillRect(0, 0, width, height);

            // Shed a pulse wave on each strong thump
            if (beat > 0.85 && pulses.length < 8) {
                pulses.push(new PulseWave(coreX, coreY, true));
                // Ember burst from the heart
                for (let i = 0; i < 6; i++) embers.push(new Ember(true));
                if (embers.length > 320) embers.splice(0, embers.length - 320);
            }
            // Occasional faint ambient ripple from the edges
            if (frameCount % 240 === 120 && pulses.length < 8) {
                pulses.push(new PulseWave(Math.random() * width, Math.random() * height, false));
            }

            pulses = pulses.filter(p => !p.done);
            pulses.forEach(p => { p.update(); p.draw(); });

            // Ember shower rising through the dark
            embers.forEach(e => { e.update(); e.draw(); });

            // Sparse gold glints — the goddess's garland catching light
            ctx.save();
            for (let i = 0; i < 4; i++) {
                const px = Math.random() * width;
                const py = Math.random() * height;
                ctx.globalAlpha = Math.random() * 0.2 * beat;
                ctx.fillStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
                ctx.beginPath();
                ctx.arc(px, py, Math.random() * 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

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

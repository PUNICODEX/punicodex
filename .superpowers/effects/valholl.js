/**
 * VALHǪLL FLAGSHIP TEMPLE — GOLDEN HALL CANVAS
 * Golden hall-rafters in perspective + ascending warrior sparks
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Hall Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('hall-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let sparks = [];
        let dust = [];
        let frameCount = 0;
        let running = true;

        const PALETTE = {
            gold: { r: 216, g: 168, b: 58 },
            bronze: { r: 138, g: 90, b: 32 },
            ember: { r: 232, g: 140, b: 60 },
            ivory: { r: 255, g: 236, b: 200 }
        };

        // The vanishing point leans gently toward the visitor's pointer
        const pointer = { x: 0.5, y: 0.3, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // Warrior sparks: embers of the einherjar rising through the hall
        class WarriorSpark {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vy = -(Math.random() * 0.9 + 0.35);
                this.size = Math.random() * 2 + 0.6;
                this.opacity = Math.random() * 0.6 + 0.25;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swayAmp = Math.random() * 0.5 + 0.15;
                this.hot = Math.random() < 0.3;
                this.trail = [];
            }

            update() {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 6) this.trail.shift();
                this.y += this.vy;
                this.x += Math.sin(frameCount * 0.02 + this.swayPhase) * this.swayAmp;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const fade = Math.min(1, this.y / (height * 0.2));
                const c = this.hot ? PALETTE.ivory : PALETTE.ember;

                // Short rising trail
                if (this.trail.length > 1) {
                    ctx.save();
                    ctx.globalAlpha = this.opacity * fade * 0.3;
                    ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                    ctx.lineWidth = this.size * 0.7;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(this.trail[0].x, this.trail[0].y);
                    for (let i = 1; i < this.trail.length; i++) {
                        ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }

                ctx.save();
                ctx.globalAlpha = this.opacity * fade;
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.shadowBlur = this.hot ? 12 : 7;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Hall dust: slow golden motes drifting at depth between the rafters
        class DustMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.12;
                this.vy = -(Math.random() * 0.12 + 0.03);
                this.size = Math.random() * 1.2 + 0.3;
                this.opacity = Math.random() * 0.2 + 0.05;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < -10 || this.x < -10 || this.x > width + 10) {
                    this.reset(false);
                    this.y = height + 10;
                }
            }

            draw() {
                const twinkle = 0.6 + Math.sin(frameCount * 0.04 + this.phase) * 0.4;
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // The rafters: golden beams converging on the hall's vanishing point,
        // like looking down the length of a mead-hall roof.
        function drawRafters(vpX, vpY) {
            const rafterCount = 9;
            const baseY = height + 40;

            ctx.save();
            for (let i = 0; i < rafterCount; i++) {
                const t = i / (rafterCount - 1);
                // Beam feet fan across the bottom edge and beyond
                const footX = width * (-0.2 + t * 1.4);
                const flicker = 0.85 + Math.sin(frameCount * 0.01 + i * 1.3) * 0.15;

                // Depth: outer beams dimmer, inner beams brighter
                const centerDist = Math.abs(t - 0.5) * 2;
                const alpha = (0.14 - centerDist * 0.06) * flicker;

                const beamGrad = ctx.createLinearGradient(footX, baseY, vpX, vpY);
                beamGrad.addColorStop(0, `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, ${alpha * 0.5})`);
                beamGrad.addColorStop(0.7, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${alpha})`);
                beamGrad.addColorStop(1, `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, ${alpha * 0.9})`);

                ctx.strokeStyle = beamGrad;
                ctx.lineWidth = 4.5 - centerDist * 2;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${alpha * 2})`;
                ctx.beginPath();
                ctx.moveTo(footX, baseY);
                ctx.lineTo(vpX, vpY);
                ctx.stroke();
            }
            ctx.restore();

            // Cross-beams: horizontal rafter ties at receding depths
            ctx.save();
            for (let i = 1; i <= 5; i++) {
                const depth = i / 6;
                const beamY = vpY + (baseY - vpY) * depth * depth;
                const halfSpan = width * 0.62 * depth;
                const alpha = 0.10 * (1 - depth * 0.4) * (0.85 + Math.sin(frameCount * 0.012 + i) * 0.15);

                ctx.globalAlpha = alpha;
                ctx.strokeStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.lineWidth = 3.5 * depth + 0.5;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.6)`;
                ctx.beginPath();
                ctx.moveTo(vpX - halfSpan, beamY);
                ctx.lineTo(vpX + halfSpan, beamY);
                ctx.stroke();
            }
            ctx.restore();

            // Hearth-glow at the vanishing point — the fire at the hall's heart
            ctx.save();
            const hearth = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, Math.min(width, height) * 0.35);
            hearth.addColorStop(0, `rgba(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b}, ${0.14 + Math.sin(frameCount * 0.02) * 0.04})`);
            hearth.addColorStop(0.4, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.07)`);
            hearth.addColorStop(1, 'transparent');
            ctx.fillStyle = hearth;
            ctx.fillRect(vpX - width * 0.4, vpY - height * 0.4, width * 0.8, height * 0.8);
            ctx.restore();
        }

        function initParticles() {
            sparks = [];
            dust = [];
            const sparkCount = Math.min(140, Math.floor(width / 9));
            const dustCount = Math.min(120, Math.floor(width / 11));
            for (let i = 0; i < sparkCount; i++) {
                sparks.push(new WarriorSpark());
            }
            for (let i = 0; i < dustCount; i++) {
                dust.push(new DustMote());
            }
        }

        resize();
        initParticles();
        window.addEventListener('resize', () => {
            resize();
            initParticles();
        });

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX / window.innerWidth;
            pointer.y = e.clientY / window.innerHeight;
            pointer.active = true;
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const vpX = width * (0.5 + (pointer.active ? (pointer.x - 0.5) * 0.06 : 0));
            const vpY = height * (0.28 + (pointer.active ? (pointer.y - 0.3) * 0.04 : 0));

            // Dark mead-hall warmth at the base
            const hallGlow = ctx.createLinearGradient(0, height, 0, height * 0.5);
            hallGlow.addColorStop(0, `rgba(${PALETTE.bronze.r}, ${PALETTE.bronze.g}, ${PALETTE.bronze.b}, 0.10)`);
            hallGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = hallGlow;
            ctx.fillRect(0, 0, width, height);

            drawRafters(vpX, vpY);

            dust.forEach(d => { d.update(); d.draw(); });
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

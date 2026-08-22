/**
 * TYPHŌN — Father of Monsters, Lord of Storms
 * Interactive Layer: Serpentine Storm Coils, Volcanic Flashes, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Typhonian Storm System
    // ============================
    const canvas = document.getElementById('stormcoil-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let coils = [];
        let puffs = [];
        let embers = [];
        let flashIntensity = 0;
        let flashCooldown = 200;

        const PALETTE = {
            stormDark: { r: 32, g: 36, b: 48 },
            stormMid: { r: 62, g: 68, b: 88 },
            serpent: { r: 44, g: 58, b: 66 },
            serpentRidge: { r: 96, g: 112, b: 118 },
            ember: { r: 232, g: 96, b: 32 },
            lava: { r: 255, g: 152, b: 48 },
            eyeGlow: { r: 255, g: 62, b: 32 },
        };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class SerpentCoil {
            constructor(index) {
                this.index = index;
                this.y = height * (0.22 + index * 0.2);
                this.baseY = this.y;
                this.amplitude = 42 + Math.random() * 48;
                this.wavelength = 1.8 + Math.random() * 1.2;
                this.speed = 0.7 + Math.random() * 0.9;
                this.phase = Math.random() * Math.PI * 2;
                this.thickness = 13 + Math.random() * 9;
                this.headX = Math.random() * width;
                this.dir = index % 2 === 0 ? 1 : -1;
                this.bodyLength = 30;
            }

            update() {
                this.phase += 0.012 * this.speed;
                this.headX += this.dir * this.speed * 0.9;
                this.y = this.baseY + Math.sin(this.phase * 0.5) * 18;

                if (this.dir > 0 && this.headX > width + 220) this.headX = -220;
                if (this.dir < 0 && this.headX < -220) this.headX = width + 220;
            }

            bodyPoint(i) {
                const t = i / this.bodyLength;
                const x = this.headX - this.dir * t * this.wavelength * 220;
                const wave = Math.sin(this.phase + t * Math.PI * 2.6) * this.amplitude * (0.35 + t * 0.65);
                return { x, y: this.y + wave, t };
            }

            draw() {
                ctx.save();
                ctx.lineCap = 'round';

                // body: tapering overlapping segments, tail drawn first
                for (let i = this.bodyLength; i >= 0; i--) {
                    const p = this.bodyPoint(i);
                    const r = Math.max(1.2, this.thickness * (1 - p.t * 0.82));
                    const shade = 1 - p.t * 0.55;
                    ctx.fillStyle = `rgba(${PALETTE.serpent.r}, ${PALETTE.serpent.g}, ${PALETTE.serpent.b}, ${0.5 * shade})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.fill();

                    // dorsal ridge highlight
                    if (i % 2 === 0) {
                        ctx.fillStyle = `rgba(${PALETTE.serpentRidge.r}, ${PALETTE.serpentRidge.g}, ${PALETTE.serpentRidge.b}, ${0.28 * shade})`;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y - r * 0.4, r * 0.42, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // head with a furnace eye
                const head = this.bodyPoint(0);
                const hr = this.thickness * 1.25;
                const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, hr * 2.4);
                hg.addColorStop(0, `rgba(${PALETTE.ember.r}, ${PALETTE.ember.g}, ${PALETTE.ember.b}, 0.5)`);
                hg.addColorStop(1, 'transparent');
                ctx.fillStyle = hg;
                ctx.beginPath();
                ctx.arc(head.x, head.y, hr * 2.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(${PALETTE.serpent.r}, ${PALETTE.serpent.g}, ${PALETTE.serpent.b}, 0.85)`;
                ctx.beginPath();
                ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${PALETTE.eyeGlow.r}, ${PALETTE.eyeGlow.g}, ${PALETTE.eyeGlow.b}, 0.9)`;
                ctx.fillStyle = `rgba(${PALETTE.eyeGlow.r}, ${PALETTE.eyeGlow.g}, ${PALETTE.eyeGlow.b}, 0.95)`;
                ctx.beginPath();
                ctx.arc(head.x + this.dir * hr * 0.35, head.y - hr * 0.25, hr * 0.18, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.restore();
            }
        }

        class StormPuff {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height * 0.7 : Math.random() * height * 0.3;
                this.vx = (Math.random() - 0.5) * 0.35;
                this.radius = 80 + Math.random() * 130;
                this.life = this.maxLife = 400 + Math.random() * 400;
            }

            update() {
                this.x += this.vx;
                this.life--;
                if (this.life <= 0 || this.x < -this.radius || this.x > width + this.radius) {
                    this.reset(false);
                }
            }

            draw() {
                const fade = this.life / this.maxLife;
                ctx.save();
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                grad.addColorStop(0, `rgba(${PALETTE.stormMid.r}, ${PALETTE.stormMid.g}, ${PALETTE.stormMid.b}, ${0.1 * fade})`);
                grad.addColorStop(0.6, `rgba(${PALETTE.stormDark.r}, ${PALETTE.stormDark.g}, ${PALETTE.stormDark.b}, ${0.06 * fade})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Ember {
            constructor(x, y, burst) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const force = burst ? 1.5 + Math.random() * 3.5 : 0.3 + Math.random() * 0.8;
                this.vx = Math.cos(angle) * force;
                this.vy = Math.sin(angle) * force - (burst ? 1.2 : 0.4);
                this.size = burst ? 1 + Math.random() * 2.4 : 0.6 + Math.random() * 1.4;
                this.life = this.maxLife = burst ? 40 + Math.random() * 50 : 120 + Math.random() * 160;
                this.lava = Math.random() < 0.4;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy -= 0.015;
                this.vx *= 0.99;
                this.life--;
            }

            draw() {
                const fade = this.life / this.maxLife;
                const c = this.lava ? PALETTE.lava : PALETTE.ember;
                ctx.save();
                ctx.globalAlpha = fade * 0.85;
                ctx.shadowBlur = 7;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 1)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * (0.5 + fade * 0.5), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function volcanicFlash() {
            flashCooldown--;
            if (flashCooldown > 0) return;
            if (Math.random() < 0.012) {
                flashIntensity = 0.1 + Math.random() * 0.12;
                flashCooldown = 260 + Math.random() * 420;

                // eruption of embers from a random coil head
                const coil = coils[Math.floor(Math.random() * coils.length)];
                if (coil) {
                    const head = coil.bodyPoint(0);
                    for (let i = 0; i < 26; i++) {
                        embers.push(new Ember(head.x, head.y, true));
                    }
                }
            }
        }

        // Initialize
        resizeCanvas();
        for (let i = 0; i < 3; i++) coils.push(new SerpentCoil(i));
        for (let i = 0; i < 6; i++) puffs.push(new StormPuff());
        for (let i = 0; i < 40; i++) {
            embers.push(new Ember(Math.random() * width, Math.random() * height, false));
        }

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            // volcanic flash washes the sky
            if (flashIntensity > 0) {
                ctx.fillStyle = `rgba(232, 96, 32, ${flashIntensity})`;
                ctx.fillRect(0, 0, width, height);
                flashIntensity *= 0.86;
                if (flashIntensity < 0.002) flashIntensity = 0;
            }

            // smouldering glow along the bottom, like a caldera
            const caldera = ctx.createLinearGradient(0, height * 0.55, 0, height);
            caldera.addColorStop(0, 'rgba(120, 40, 16, 0)');
            caldera.addColorStop(1, 'rgba(150, 48, 18, 0.14)');
            ctx.fillStyle = caldera;
            ctx.fillRect(0, 0, width, height);

            puffs.forEach(p => { p.update(); p.draw(); });
            volcanicFlash();
            coils.forEach(c => { c.update(); c.draw(); });

            embers = embers.filter(e => e.life > 0);
            while (embers.length < 40) {
                embers.push(new Ember(Math.random() * width, height + 8, false));
            }
            embers.forEach(e => { e.update(); e.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
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

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ============================
    // Parallax on Hero Mascot
    // ============================
    const heroMascot = document.querySelector('.mascot-img');

    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
            const scrollY = window.scrollY;
            if (scrollY < heroHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

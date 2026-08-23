/**
 * CHÍMAIRA — The Fire-Breathing Monster of Three Natures
 * Interactive Layer: Lion Embers, Goat Frost, Serpent Venom, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Triple-Nature Flame System
    // ============================
    const canvas = document.getElementById('triflame-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let particles = [];
        let bursts = [];
        let time = 0;

        // The three natures of the beast, each with its own hearth and temperament.
        const NATURES = [
            {
                name: 'lion',
                xBand: 0.2,
                core: { r: 255, g: 168, b: 60 },
                edge: { r: 196, g: 64, b: 20 },
                glow: 'rgba(255, 140, 40, 0.10)',
                behavior: 'ember',
            },
            {
                name: 'goat',
                xBand: 0.5,
                core: { r: 210, g: 236, b: 255 },
                edge: { r: 110, g: 160, b: 220 },
                glow: 'rgba(150, 200, 255, 0.08)',
                behavior: 'frost',
            },
            {
                name: 'serpent',
                xBand: 0.8,
                core: { r: 150, g: 240, b: 130 },
                edge: { r: 40, g: 140, b: 60 },
                glow: 'rgba(80, 220, 110, 0.08)',
                behavior: 'venom',
            },
        ];

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class FlameParticle {
            constructor(nature) {
                this.nature = nature;
                this.reset(true);
            }

            reset(scatter) {
                const band = width * 0.26;
                this.x = width * this.nature.xBand + (Math.random() - 0.5) * band;
                this.y = scatter ? Math.random() * height : height + 12;

                if (this.nature.behavior === 'ember') {
                    this.vy = -(0.7 + Math.random() * 1.6);
                    this.vx = (Math.random() - 0.5) * 0.5;
                    this.size = 1 + Math.random() * 2.6;
                    this.life = this.maxLife = 90 + Math.random() * 120;
                } else if (this.nature.behavior === 'frost') {
                    this.vy = -(0.15 + Math.random() * 0.4);
                    this.vx = (Math.random() - 0.5) * 0.35;
                    this.size = 1 + Math.random() * 2;
                    this.life = this.maxLife = 180 + Math.random() * 200;
                    this.spin = Math.random() * Math.PI;
                    this.spinSpeed = (Math.random() - 0.5) * 0.03;
                } else {
                    // venom: a low, heavy, sinuous crawl
                    this.vy = -(0.25 + Math.random() * 0.6);
                    this.phase = Math.random() * Math.PI * 2;
                    this.phaseSpeed = 0.03 + Math.random() * 0.04;
                    this.swayAmp = 16 + Math.random() * 26;
                    this.size = 1.2 + Math.random() * 2.4;
                    this.life = this.maxLife = 120 + Math.random() * 160;
                }
            }

            update() {
                this.life--;

                if (this.nature.behavior === 'ember') {
                    this.x += this.vx + Math.sin(time * 0.05 + this.y * 0.02) * 0.3;
                    this.y += this.vy;
                    this.vy *= 0.998;
                } else if (this.nature.behavior === 'frost') {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.spin += this.spinSpeed;
                } else {
                    this.phase += this.phaseSpeed;
                    this.x += Math.sin(this.phase) * 1.4;
                    this.y += this.vy;
                }

                if (this.life <= 0 || this.y < -16) this.reset(false);
            }

            draw() {
                const fade = this.life / this.maxLife;
                const n = this.nature;

                ctx.save();

                if (n.behavior === 'ember') {
                    ctx.globalAlpha = fade * 0.9;
                    ctx.shadowBlur = 9;
                    ctx.shadowColor = `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 0.9)`;
                    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                    grad.addColorStop(0, `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 1)`);
                    grad.addColorStop(1, `rgba(${n.edge.r}, ${n.edge.g}, ${n.edge.b}, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (n.behavior === 'frost') {
                    // six-spoked ice crystal
                    ctx.globalAlpha = fade * 0.75;
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.spin);
                    ctx.strokeStyle = `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 0.9)`;
                    ctx.lineWidth = 0.8;
                    for (let i = 0; i < 6; i++) {
                        ctx.rotate(Math.PI / 3);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(0, this.size * 2.4);
                        ctx.stroke();
                    }
                } else {
                    // venom: beaded droplet with a trailing wisp
                    ctx.globalAlpha = fade * 0.8;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 0.8)`;
                    ctx.fillStyle = `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 0.95)`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = `rgba(${n.edge.r}, ${n.edge.g}, ${n.edge.b}, ${fade * 0.5})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.quadraticCurveTo(
                        this.x - Math.sin(this.phase) * 10, this.y + 8,
                        this.x - Math.sin(this.phase - 0.6) * 16, this.y + 18
                    );
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        class FlameBurst {
            constructor(nature) {
                this.nature = nature;
                this.x = width * nature.xBand + (Math.random() - 0.5) * width * 0.12;
                this.y = height * (0.85 + Math.random() * 0.1);
                this.life = this.maxLife = 26 + Math.random() * 18;
                this.radius = 20 + Math.random() * 30;
            }

            update() {
                this.life--;
            }

            draw() {
                const t = 1 - this.life / this.maxLife;
                const r = this.radius * (0.4 + t * 1.4);
                const n = this.nature;

                ctx.save();
                ctx.globalAlpha = (1 - t) * 0.55;
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
                grad.addColorStop(0, `rgba(${n.core.r}, ${n.core.g}, ${n.core.b}, 0.9)`);
                grad.addColorStop(0.5, `rgba(${n.edge.r}, ${n.edge.g}, ${n.edge.b}, 0.4)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resizeCanvas();
        NATURES.forEach(nature => {
            const count = nature.behavior === 'frost' ? 60 : 80;
            for (let i = 0; i < count; i++) {
                particles.push(new FlameParticle(nature));
            }
        });

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            time++;
            ctx.clearRect(0, 0, width, height);

            // three hearths smoulder along the floor of the hero
            NATURES.forEach(nature => {
                const gx = width * nature.xBand;
                const hearth = ctx.createRadialGradient(gx, height, 0, gx, height, height * 0.5);
                hearth.addColorStop(0, nature.glow);
                hearth.addColorStop(1, 'transparent');
                ctx.fillStyle = hearth;
                ctx.fillRect(0, 0, width, height);

                // intermittent eruption from each nature's hearth
                if (Math.random() < 0.02 && bursts.length < 9) {
                    bursts.push(new FlameBurst(nature));
                }
            });

            bursts = bursts.filter(b => b.life > 0);
            bursts.forEach(b => { b.update(); b.draw(); });

            particles.forEach(p => { p.update(); p.draw(); });

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

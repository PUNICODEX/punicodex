/**
 * ÉRŌS — God of Love & Desire
 * Interactive Layer: Golden Arrow Trails, Drifting Heart-Motes, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Quiver System
    // ============================
    const canvas = document.getElementById('eros-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let running = true;
        let arrows = [];
        let hearts = [];
        let sparks = [];

        const PALETTE = {
            gold: { r: 212, g: 175, b: 55 },
            goldBright: { r: 248, g: 222, b: 140 },
            rose: { r: 214, g: 96, b: 122 },
            roseDeep: { r: 156, g: 44, b: 74 },
            blush: { r: 244, g: 180, b: 190 },
        };

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // Pre-rendered heart sprites: one per size band, drawn once and
        // blitted every frame so the motes stay cheap at 60fps.
        function buildHeartSprite(size, inner, outer) {
            const pad = Math.ceil(size * 1.2);
            const sprite = document.createElement('canvas');
            sprite.width = sprite.height = size * 2 + pad * 2;
            const g = sprite.getContext('2d');
            const cx = sprite.width / 2;
            const cy = sprite.height / 2;

            const grad = g.createRadialGradient(cx - size * 0.3, cy - size * 0.4, size * 0.1, cx, cy, size * 1.3);
            grad.addColorStop(0, inner);
            grad.addColorStop(1, outer);

            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(cx, cy + size * 0.75);
            g.bezierCurveTo(cx - size * 1.35, cy - size * 0.15, cx - size * 0.6, cy - size * 1.05, cx, cy - size * 0.35);
            g.bezierCurveTo(cx + size * 0.6, cy - size * 1.05, cx + size * 1.35, cy - size * 0.15, cx, cy + size * 0.75);
            g.closePath();
            g.fill();

            return sprite;
        }

        const heartSprites = [
            buildHeartSprite(7, 'rgba(244, 180, 190, 0.95)', 'rgba(156, 44, 74, 0.85)'),
            buildHeartSprite(12, 'rgba(244, 180, 190, 0.95)', 'rgba(156, 44, 74, 0.85)'),
            buildHeartSprite(18, 'rgba(248, 222, 140, 0.9)', 'rgba(214, 96, 122, 0.8)'),
        ];

        class Arrow {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 90 + Math.random() * 320;
                this.trail = [];
            }

            launch() {
                this.active = true;
                const fromLeft = Math.random() < 0.5;
                this.x = fromLeft ? -50 : width + 50;
                this.y = height * (0.15 + Math.random() * 0.5);
                const dir = fromLeft ? 1 : -1;
                const speed = 8 + Math.random() * 5;
                const angle = (Math.random() - 0.5) * 0.5;
                this.vx = dir * Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed * 0.6;
                this.trail = [];
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.launch();
                    return;
                }

                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.025; // the gentle arc of a loosed bow

                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 34) this.trail.shift();

                if (this.x < -80 || this.x > width + 80 || this.y > height + 60) {
                    this.reset();
                }
            }

            draw() {
                if (!this.active || this.trail.length < 2) return;

                ctx.save();
                ctx.lineCap = 'round';

                // comet trail, fading tail-to-head
                for (let i = 1; i < this.trail.length; i++) {
                    const t = i / this.trail.length;
                    ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${t * 0.5})`;
                    ctx.lineWidth = 1 + t * 2.2;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    ctx.stroke();
                }

                // glowing head + barbed point aimed along the velocity
                const angle = Math.atan2(this.vy, this.vx);
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);

                ctx.shadowBlur = 14;
                ctx.shadowColor = `rgba(${PALETTE.goldBright.r}, ${PALETTE.goldBright.g}, ${PALETTE.goldBright.b}, 0.9)`;
                ctx.fillStyle = `rgba(${PALETTE.goldBright.r}, ${PALETTE.goldBright.g}, ${PALETTE.goldBright.b}, 0.95)`;
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-2, -4);
                ctx.lineTo(0, 0);
                ctx.lineTo(-2, 4);
                ctx.closePath();
                ctx.fill();

                // fletching
                ctx.shadowBlur = 0;
                ctx.strokeStyle = `rgba(${PALETTE.rose.r}, ${PALETTE.rose.g}, ${PALETTE.rose.b}, 0.8)`;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(-14, 0);
                ctx.lineTo(-20, -4);
                ctx.moveTo(-14, 0);
                ctx.lineTo(-20, 4);
                ctx.stroke();

                ctx.restore();
            }
        }

        class HeartMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 30;
                this.vy = -(0.2 + Math.random() * 0.45);
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = 0.008 + Math.random() * 0.014;
                this.swayAmp = 14 + Math.random() * 26;
                this.sprite = heartSprites[Math.floor(Math.random() * heartSprites.length)];
                this.scale = 0.5 + Math.random() * 0.7;
                this.opacity = 0.3 + Math.random() * 0.45;
                this.pulse = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                this.swayPhase += this.swaySpeed;
                this.pulse += 0.03;
                if (this.y < -40) this.reset(false);
            }

            draw() {
                const x = this.x + Math.sin(this.swayPhase) * this.swayAmp;
                const beat = 1 + Math.sin(this.pulse) * 0.08;
                const s = this.scale * beat;
                const w = this.sprite.width * s;
                const h = this.sprite.height * s;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(this.sprite, x - w / 2, this.y - h / 2, w, h);
                ctx.restore();
            }
        }

        class RoseSpark {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(0.12 + Math.random() * 0.3);
                this.size = 0.7 + Math.random() * 1.6;
                this.twinkle = Math.random() * Math.PI * 2;
                this.gold = Math.random() < 0.5;
            }

            update() {
                this.y += this.vy;
                this.twinkle += 0.045;
                if (this.y < -8) this.reset(false);
            }

            draw() {
                const a = 0.16 + Math.sin(this.twinkle) * 0.13;
                const c = this.gold ? PALETTE.gold : PALETTE.blush;
                ctx.save();
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0.03, a)})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resizeCanvas();
        for (let i = 0; i < 3; i++) arrows.push(new Arrow());
        for (let i = 0; i < 26; i++) hearts.push(new HeartMote());
        for (let i = 0; i < 70; i++) sparks.push(new RoseSpark());

        window.addEventListener('resize', resizeCanvas);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            // warm blush radiating from the heart of the hero
            const blush = ctx.createRadialGradient(
                width * 0.5, height * 0.5, 0,
                width * 0.5, height * 0.5, Math.min(width, height) * 0.6
            );
            blush.addColorStop(0, 'rgba(214, 96, 122, 0.06)');
            blush.addColorStop(0.7, 'rgba(156, 44, 74, 0.03)');
            blush.addColorStop(1, 'transparent');
            ctx.fillStyle = blush;
            ctx.fillRect(0, 0, width, height);

            sparks.forEach(s => { s.update(); s.draw(); });
            hearts.forEach(h => { h.update(); h.draw(); });
            arrows.forEach(a => { a.update(); a.draw(); });

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

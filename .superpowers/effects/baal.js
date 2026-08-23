/**
 * BAAL — Storm God of the Canaanite Pantheon
 * Interactive Layer: Lightning Forks, Bull-Horn Pulses, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Bullstorm Canvas
    // ============================
    const canvas = document.getElementById('bullstorm-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let rain = [];
        let bolts = [];
        let clouds = [];
        let sparks = [];
        let hornBoost = 0;
        let running = true;
        let rafId = null;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class RainDrop {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : Math.random() * -100;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = Math.random() * 8 + 12;
                this.length = Math.random() * 15 + 8;
                this.opacity = Math.random() * 0.28 + 0.08;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y > height + 20) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#9AA8B8';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.vx, this.y + this.length);
                ctx.stroke();
                ctx.restore();
            }
        }

        class LightningBolt {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = Math.random() * 220 + 120;
                this.segments = [];
                this.opacity = 0;
                this.flashOpacity = 0;
            }

            trigger() {
                this.active = true;
                this.opacity = 1;
                this.flashOpacity = 0.14;
                this.segments = [];
                hornBoost = 1;
                let x = Math.random() * width;
                let y = 0;
                const targetY = Math.random() * height * 0.55 + height * 0.2;
                while (y < targetY) {
                    const nextX = x + (Math.random() - 0.5) * 70;
                    const nextY = y + Math.random() * 30 + 15;
                    this.segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
                    x = nextX;
                    y = nextY;

                    if (Math.random() < 0.28) {
                        let bx = x;
                        let by = y;
                        for (let i = 0; i < 4; i++) {
                            const bnx = bx + (Math.random() - 0.5) * 50;
                            const bny = by + Math.random() * 22 + 10;
                            this.segments.push({ x1: bx, y1: by, x2: bnx, y2: bny, branch: true });
                            bx = bnx;
                            by = bny;
                        }
                    }
                }
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.trigger();
                    return;
                }
                this.opacity -= 0.08;
                this.flashOpacity -= 0.02;
                if (this.opacity <= 0) {
                    this.active = false;
                    this.cooldown = Math.random() * 260 + 160;
                }
            }

            draw() {
                if (!this.active) return;

                if (this.flashOpacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = this.flashOpacity;
                    ctx.fillStyle = '#D8D0B8';
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                }

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.shadowBlur = 16;
                ctx.shadowColor = '#D8B858';
                this.segments.forEach(seg => {
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.strokeStyle = seg.branch ? '#E8D8A8' : '#F0EAD8';
                    ctx.lineWidth = seg.branch ? 1 : 2.5;
                    ctx.stroke();
                });
                ctx.restore();
            }
        }

        class StormCloud {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.3;
                this.vx = (Math.random() - 0.5) * 0.25;
                this.radius = Math.random() * 110 + 70;
                this.life = Math.random() * 600 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.life--;
                if (this.life <= 0 || this.x < -160 || this.x > width + 160) this.reset();
            }

            draw() {
                const opacity = (this.life / this.maxLife) * 0.06;
                ctx.save();
                ctx.globalAlpha = opacity;
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                g.addColorStop(0, 'hsla(215, 12%, 24%, 0.5)');
                g.addColorStop(0.5, 'hsla(215, 10%, 18%, 0.2)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Spark {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4 - 1;
                this.size = Math.random() * 2 + 0.5;
                this.life = Math.random() * 30 + 12;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.1;
                this.life--;
            }

            draw() {
                const opacity = (this.life / this.maxLife) * 0.7;
                if (opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = '#D8B858';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#D8B858';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawBullHorns(time) {
            const cx = width / 2;
            const baseY = height * 0.96;
            const hornLen = Math.min(width, height) * 0.40;
            const beat = Math.pow(0.5 + 0.5 * Math.sin(time * 0.0035), 8);
            const glow = 10 + beat * 26 + hornBoost * 42;
            const rim = 0.22 + beat * 0.38 + hornBoost * 0.35;

            for (let side = -1; side <= 1; side += 2) {
                ctx.save();
                ctx.translate(cx, baseY);
                ctx.scale(side, 1);
                ctx.beginPath();
                ctx.moveTo(-hornLen * 0.02, 0);
                ctx.bezierCurveTo(
                    hornLen * 0.30, -hornLen * 0.06,
                    hornLen * 0.72, -hornLen * 0.22,
                    hornLen, -hornLen * 0.92
                );
                ctx.bezierCurveTo(
                    hornLen * 0.88, -hornLen * 0.52,
                    hornLen * 0.60, -hornLen * 0.24,
                    hornLen * 0.28, hornLen * 0.02
                );
                ctx.closePath();
                ctx.shadowBlur = glow;
                ctx.shadowColor = 'rgba(205, 150, 70, 0.9)';
                ctx.fillStyle = 'rgba(22, 15, 10, 0.95)';
                ctx.fill();
                ctx.shadowBlur = glow * 0.6;
                ctx.strokeStyle = `rgba(205, 150, 70, ${Math.min(1, rim)})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        resizeCanvas();
        for (let i = 0; i < 110; i++) rain.push(new RainDrop());
        for (let i = 0; i < 3; i++) bolts.push(new LightningBolt());
        for (let i = 0; i < 6; i++) clouds.push(new StormCloud());

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            ctx.clearRect(0, 0, width, height);

            const skyGlow = ctx.createRadialGradient(
                width / 2, 0, 0,
                width / 2, height * 0.3, Math.min(width, height) * 0.5
            );
            skyGlow.addColorStop(0, 'hsla(215, 15%, 16%, 0.05)');
            skyGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = skyGlow;
            ctx.fillRect(0, 0, width, height);

            clouds.forEach(c => { c.update(); c.draw(); });
            rain.forEach(r => { r.update(); r.draw(); });
            bolts.forEach(b => { b.update(); b.draw(); });

            bolts.forEach(b => {
                if (b.active && b.opacity > 0.5) {
                    const seg = b.segments[b.segments.length - 1];
                    if (seg) {
                        for (let i = 0; i < 3; i++) sparks.push(new Spark(seg.x2, seg.y2));
                    }
                }
            });
            if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
            sparks = sparks.filter(s => s.life > 0);
            sparks.forEach(s => { s.update(); s.draw(); });

            hornBoost *= 0.94;
            drawBullHorns(time);

            if (running) rafId = requestAnimationFrame(animate);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(animate);
            }
        });

        rafId = requestAnimationFrame(animate);
        }
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
        revealElements.forEach(el => el.classList.add('revealed'));
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

    // ============================
    // Smooth Scroll for Anchor Links
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================
    // Mascot Parallax
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero') || document.querySelector('.hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();

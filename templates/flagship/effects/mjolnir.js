/**
 * MJǪLLNIR FLAGSHIP TEMPLE — HAMMERFALL CANVAS & INTERACTIONS
 * Lightning-charged hammerfall impacts + return-arc + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Hammerfall Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('hammerfall-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let sparks = [];
        let shockwaves = [];
        let arcs = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Spark {
            constructor(x, y, power) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
                const speed = (2 + Math.random() * 6) * power;
                this.x = x;
                this.y = y;
                this.vx = Math.cos(ang) * speed;
                this.vy = Math.sin(ang) * speed;
                this.size = 0.7 + Math.random() * 2;
                this.life = 30 + Math.random() * 40;
                this.maxLife = this.life;
                this.gold = Math.random() < 0.4;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.18;
                this.vx *= 0.99;
                this.life--;
            }

            draw() {
                const a = (this.life / this.maxLife) * 0.85;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.fillStyle = this.gold ? '#F4C95D' : '#DDE8FF';
                ctx.shadowBlur = 7;
                ctx.shadowColor = this.gold ? '#D4881F' : '#7FA8FF';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Shockwave {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.r = 8;
                this.maxR = Math.min(width, height) * 0.45;
                this.opacity = 0.8;
            }

            update() {
                this.r += (this.maxR - this.r) * 0.06 + 4;
                this.opacity *= 0.94;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#C8D8F8';
                ctx.lineWidth = 2.5;
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#8FB4FF';
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.r, this.r * 0.32, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        class SkyArc {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 200 + Math.random() * 400;
                this.segments = [];
                this.opacity = 0;
            }

            trigger() {
                this.active = true;
                this.opacity = 0.7;
                this.segments = [];
                let x = Math.random() * width;
                let y = 0;
                const targetY = height * (0.2 + Math.random() * 0.35);
                while (y < targetY) {
                    const nx = x + (Math.random() - 0.5) * 50;
                    const ny = y + 15 + Math.random() * 25;
                    this.segments.push({ x1: x, y1: y, x2: nx, y2: ny });
                    x = nx; y = ny;
                }
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.trigger();
                    return;
                }
                this.opacity -= 0.05;
                if (this.opacity <= 0) this.reset();
            }

            draw() {
                if (!this.active) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#BFD4FF';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#8FB4FF';
                this.segments.forEach(s => {
                    ctx.beginPath();
                    ctx.moveTo(s.x1, s.y1);
                    ctx.lineTo(s.x2, s.y2);
                    ctx.stroke();
                });
                ctx.restore();
            }
        }

        // The hammer itself: rest → fall → impact → golden return-arc
        class Hammer {
            constructor() {
                this.state = 'rest';
                this.timer = 90 + Math.random() * 120;
                this.x = width * 0.5;
                this.y = -60;
                this.targetX = width * 0.5;
                this.groundY = height * 0.86;
                this.rot = 0;
                this.flash = 0;
                this.trail = [];
                this.homeX = width * 0.82;
                this.homeY = height * 0.18;
            }

            strike() {
                this.state = 'fall';
                this.targetX = width * (0.2 + Math.random() * 0.6);
                this.x = this.targetX + (Math.random() - 0.5) * 60;
                this.y = -60;
                this.vy = 4;
                this.trail = [];
            }

            update() {
                if (this.state === 'rest') {
                    this.timer--;
                    if (this.timer <= 0) this.strike();
                } else if (this.state === 'fall') {
                    this.vy += 0.9;
                    this.y += this.vy;
                    this.x += (this.targetX - this.x) * 0.15;
                    this.rot += 0.25;
                    this.trail.push({ x: this.x, y: this.y, life: 18 });
                    if (this.y >= this.groundY) {
                        this.state = 'impact';
                        this.timer = 24;
                        this.flash = 1;
                        shockwaves.push(new Shockwave(this.x, this.groundY));
                        for (let i = 0; i < 40; i++) sparks.push(new Spark(this.x, this.groundY, 1.2));
                        if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
                    }
                } else if (this.state === 'impact') {
                    this.timer--;
                    this.flash *= 0.88;
                    this.rot *= 0.8;
                    if (this.timer <= 0) {
                        this.state = 'return';
                        this.t = 0;
                        this.sx = this.x;
                        this.sy = this.groundY;
                    }
                } else if (this.state === 'return') {
                    this.t += 0.022;
                    const t = Math.min(1, this.t);
                    const cx = (this.sx + this.homeX) / 2;
                    const cy = Math.min(this.sy, this.homeY) - height * 0.35;
                    this.x = (1 - t) * (1 - t) * this.sx + 2 * (1 - t) * t * cx + t * t * this.homeX;
                    this.y = (1 - t) * (1 - t) * this.sy + 2 * (1 - t) * t * cy + t * t * this.homeY;
                    this.rot += 0.3;
                    this.trail.push({ x: this.x, y: this.y, life: 22, gold: true });
                    if (this.t >= 1) {
                        this.state = 'rest';
                        this.timer = 140 + Math.random() * 160;
                        this.trail = [];
                    }
                }
                this.trail.forEach(p => p.life--);
                this.trail = this.trail.filter(p => p.life > 0);
            }

            draw() {
                this.trail.forEach(p => {
                    ctx.save();
                    ctx.globalAlpha = (p.life / 22) * 0.4;
                    ctx.fillStyle = p.gold ? '#F4C95D' : '#AFCBFF';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
                if (this.state === 'rest') return;

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);

                // Glow, head, handle, strap
                const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
                glow.addColorStop(0, 'rgba(200, 220, 255, 0.5)');
                glow.addColorStop(0.5, 'rgba(150, 180, 255, 0.2)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(0, 0, 34, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#D8DEEA';
                ctx.fillRect(-16, -10, 32, 20);
                ctx.strokeStyle = '#8A94AA';
                ctx.lineWidth = 1;
                ctx.strokeRect(-16, -10, 32, 20);
                ctx.fillStyle = '#9A7A4A';
                ctx.fillRect(-3, 10, 6, 22);
                ctx.strokeStyle = '#C8B858';
                ctx.beginPath();
                ctx.moveTo(0, 32);
                ctx.lineTo(5, 40);
                ctx.stroke();
                ctx.restore();

                if (this.flash > 0.02) {
                    ctx.save();
                    ctx.globalAlpha = this.flash * 0.35;
                    ctx.fillStyle = '#DCE8FF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                }
            }
        }

        resize();
        const hammer = new Hammer();
        for (let i = 0; i < 2; i++) arcs.push(new SkyArc());

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const skyGlow = ctx.createRadialGradient(
                width / 2, 0, 0, width / 2, height * 0.3, Math.min(width, height) * 0.6);
            skyGlow.addColorStop(0, 'hsla(220, 40%, 30%, 0.07)');
            skyGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = skyGlow;
            ctx.fillRect(0, 0, width, height);

            arcs.forEach(a => { a.update(); a.draw(); });

            hammer.update();
            hammer.draw();

            shockwaves = shockwaves.filter(s => s.opacity > 0.02);
            shockwaves.forEach(s => { s.update(); s.draw(); });

            sparks = sparks.filter(s => s.life > 0);
            sparks.forEach(s => { s.update(); s.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });
    } else if (canvas) {
        canvas.style.display = 'none';
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

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

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

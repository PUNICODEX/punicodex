/**
 * HOUYI FLAGSHIP TEMPLE — NINE SUNS CANVAS & INTERACTIONS
 * Nine suns arrayed in the sky; an arrow-streak fells them one by one
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Nine Suns Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('ninesuns-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let suns = [];
        let embers = [];
        let arrow = null;
        let shotCooldown = 140;
        let paused = false;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            layoutSuns();
        }

        function layoutSuns() {
            // Arc of nine suns across the upper sky
            suns.forEach((sun, i) => {
                const t = i / 8;
                sun.baseX = width * (0.10 + t * 0.80);
                sun.baseY = height * 0.30 - Math.sin(t * Math.PI) * height * 0.14;
                sun.radius = Math.min(width, height) * 0.045 + 16;
                if (!sun.fallen) {
                    sun.x = sun.baseX;
                    sun.y = sun.baseY;
                }
            });
        }

        class Sun {
            constructor(index) {
                this.index = index;
                this.baseX = 0;
                this.baseY = 0;
                this.radius = 30;
                this.x = 0;
                this.y = 0;
                this.state = 'burning'; // burning | hit | falling | rekindle
                this.glowPhase = Math.random() * Math.PI * 2;
                this.fallVy = 0;
                this.fade = 1;
                this.rays = 10;
            }

            hit() {
                this.state = 'hit';
                this.fallVy = 0.5;
                this.hitFlash = 1;
            }

            update() {
                this.glowPhase += 0.02;
                if (this.state === 'burning') {
                    this.x = this.baseX + Math.sin(this.glowPhase * 0.4) * 4;
                    this.y = this.baseY + Math.cos(this.glowPhase * 0.5) * 3;
                    this.fade = Math.min(1, this.fade + 0.02);
                } else if (this.state === 'hit') {
                    if (this.hitFlash > 0) {
                        this.hitFlash -= 0.03;
                    } else {
                        this.state = 'falling';
                    }
                } else if (this.state === 'falling') {
                    this.fallVy += 0.06;
                    this.y += this.fallVy;
                    this.fade = Math.max(0, this.fade - 0.012);
                    if (this.fade <= 0 || this.y > height + this.radius) {
                        this.state = 'rekindle';
                        this.rekindleDelay = 400 + Math.random() * 300;
                    }
                } else if (this.state === 'rekindle') {
                    this.rekindleDelay--;
                    if (this.rekindleDelay <= 0) {
                        this.state = 'burning';
                        this.x = this.baseX;
                        this.y = this.baseY;
                        this.fade = 0;
                    }
                }
            }

            draw() {
                if (this.state === 'rekindle' || this.fade <= 0) return;
                const alpha = this.fade;
                const r = this.radius;

                // Heat halo
                const halo = ctx.createRadialGradient(this.x, this.y, r * 0.3, this.x, this.y, r * 3.4);
                halo.addColorStop(0, `hsla(42, 100%, 62%, ${0.32 * alpha})`);
                halo.addColorStop(0.5, `hsla(24, 95%, 52%, ${0.12 * alpha})`);
                halo.addColorStop(1, 'transparent');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 3.4, 0, Math.PI * 2);
                ctx.fill();

                // Corona rays
                ctx.save();
                ctx.globalAlpha = 0.55 * alpha;
                ctx.strokeStyle = 'hsl(40, 100%, 60%)';
                ctx.lineWidth = 2;
                for (let i = 0; i < this.rays; i++) {
                    const a = this.glowPhase * 0.5 + (i / this.rays) * Math.PI * 2;
                    const flicker = 0.7 + Math.sin(this.glowPhase * 3 + i * 2.1) * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.cos(a) * r * 1.15, this.y + Math.sin(a) * r * 1.15);
                    ctx.lineTo(this.x + Math.cos(a) * r * (1.5 + flicker * 0.4), this.y + Math.sin(a) * r * (1.5 + flicker * 0.4));
                    ctx.stroke();
                }
                ctx.restore();

                // Core disc
                const core = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
                core.addColorStop(0, `hsla(52, 100%, 88%, ${alpha})`);
                core.addColorStop(0.6, `hsla(44, 100%, 64%, ${0.95 * alpha})`);
                core.addColorStop(1, `hsla(26, 100%, 52%, ${0.9 * alpha})`);
                ctx.fillStyle = core;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Hit flash
                if (this.state === 'hit' && this.hitFlash > 0) {
                    ctx.save();
                    ctx.globalAlpha = this.hitFlash * 0.7;
                    ctx.fillStyle = 'hsl(50, 100%, 92%)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, r * (2.2 - this.hitFlash), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        class Arrow {
            constructor(target) {
                this.target = target;
                this.sx = width * 0.06;
                this.sy = height * 0.92;
                this.tx = target.x;
                this.ty = target.y;
                this.progress = 0;
                this.speed = 0.045;
                this.done = false;
                this.trail = [];
            }

            update() {
                this.progress += this.speed;
                if (this.progress >= 1) {
                    this.progress = 1;
                    if (!this.done) {
                        this.done = true;
                        this.target.hit();
                        // Ember burst at the wound
                        for (let i = 0; i < 26; i++) {
                            embers.push(new EmberBurst(this.tx, this.ty));
                        }
                    }
                }
                const t = this.progress;
                // Slight arc to the flight path
                const arc = Math.sin(t * Math.PI) * -40;
                this.x = this.sx + (this.tx - this.sx) * t;
                this.y = this.sy + (this.ty - this.sy) * t + arc;
                this.trail.push({ x: this.x, y: this.y, a: 0.85 });
                if (this.trail.length > 18) this.trail.shift();
                this.trail.forEach(p => { p.a *= 0.88; });
            }

            draw() {
                // Comet trail
                this.trail.forEach((p, i) => {
                    if (p.a <= 0.02) return;
                    ctx.save();
                    ctx.globalAlpha = p.a;
                    ctx.fillStyle = i % 2 === 0 ? 'hsl(45, 100%, 78%)' : 'hsl(20, 95%, 60%)';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                if (this.done) return;

                // Arrowhead glow
                const dx = this.tx - this.sx;
                const dy = this.ty - this.sy;
                const ang = Math.atan2(dy, dx);
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(ang);
                ctx.strokeStyle = 'hsl(48, 100%, 86%)';
                ctx.lineWidth = 2.5;
                ctx.shadowBlur = 16;
                ctx.shadowColor = 'hsl(40, 100%, 62%)';
                ctx.beginPath();
                ctx.moveTo(-26, 0);
                ctx.lineTo(6, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(-2, -4);
                ctx.moveTo(6, 0);
                ctx.lineTo(-2, 4);
                ctx.stroke();
                ctx.restore();
            }
        }

        class EmberBurst {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                const a = Math.random() * Math.PI * 2;
                const v = Math.random() * 3.5 + 1;
                this.vx = Math.cos(a) * v;
                this.vy = Math.sin(a) * v;
                this.size = Math.random() * 2.5 + 0.8;
                this.life = Math.random() * 50 + 30;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.05;
                this.vx *= 0.985;
                this.life--;
            }

            draw() {
                const alpha = (this.life / this.maxLife) * 0.9;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `hsl(${20 + alpha * 30}, 100%, ${50 + alpha * 20}%)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'hsl(32, 100%, 58%)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function pickTarget() {
            const burning = suns.filter(s => s.state === 'burning');
            if (burning.length === 0) return null;
            return burning[Math.floor(Math.random() * burning.length)];
        }

        // Initialize
        for (let i = 0; i < 9; i++) suns.push(new Sun(i));
        resize();

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        function animate() {
            if (paused) return;
            ctx.clearRect(0, 0, width, height);

            // Scorched-sky wash, dimming as suns fall
            const burning = suns.filter(s => s.state === 'burning').length;
            const heat = burning / 9;
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, `hsla(28, 80%, ${14 + heat * 10}%, ${0.05 + heat * 0.06})`);
            bg.addColorStop(1, 'hsla(16, 70%, 10%, 0.08)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            suns.forEach(s => { s.update(); s.draw(); });

            // Loose the next arrow
            if (!arrow) {
                shotCooldown--;
                if (shotCooldown <= 0) {
                    const target = pickTarget();
                    if (target) {
                        arrow = new Arrow(target);
                        shotCooldown = 220 + Math.random() * 180;
                    }
                }
            } else {
                arrow.update();
                arrow.draw();
                if (arrow.done && arrow.trail.every(p => p.a <= 0.02)) arrow = null;
            }
            embers = embers.filter(e => e.life > 0);
            embers.forEach(e => { e.update(); e.draw(); });

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

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
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

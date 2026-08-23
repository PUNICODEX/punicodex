/**
 * ANU FLAGSHIP TEMPLE — ZENITH CANVAS & INTERACTIONS
 * Circumpolar star-dome wheeling about a throne-bright pole star,
 * declination rings, occasional meteors + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Zenith Star-Dome Canvas ──────────────────────────────────────────── */
    const canvas = document.getElementById('zenith-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let stars = [];
        let meteors = [];
        let starSprite = null;
        let frameCount = 0;
        let paused = false;
        let domeTilt = 0;
        const zenith = { xFrac: 0.5, yFrac: 0.2 };
        const pointer = { x: 0.5, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* Soft round star sprite: one prerendered glow, tinted by alpha only */
        function buildStarSprite() {
            starSprite = document.createElement('canvas');
            starSprite.width = 32;
            starSprite.height = 32;
            const g = starSprite.getContext('2d');
            const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 252, 240, 1)');
            grad.addColorStop(0.3, 'rgba(235, 240, 255, 0.55)');
            grad.addColorStop(1, 'rgba(235, 240, 255, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 32, 32);
        }

        class Star {
            constructor(layer) {
                this.layer = layer; // 0 far, 1 mid, 2 near
                this.radius = Math.pow(Math.random(), 0.6) * (0.55 + layer * 0.3) + 0.06;
                this.angle = Math.random() * Math.PI * 2;
                this.baseSize = (0.8 + Math.random() * 1.6) * (0.6 + layer * 0.5);
                this.twinkle = Math.random() * Math.PI * 2;
                this.twinkleSpeed = 0.01 + Math.random() * 0.03;
                this.baseAlpha = 0.3 + Math.random() * 0.45 + layer * 0.08;
                this.warm = Math.random() < 0.18; // a few gold-tinted royal stars
            }

            update(t) {
                // The whole dome wheels slowly about the zenith
                this.angle += 0.00025 + this.layer * 0.00008;
                this.twinkle += this.twinkleSpeed;
            }

            draw(maxRadius) {
                const zx = width * zenith.xFrac + domeTilt * width * 0.03;
                const zy = height * zenith.yFrac;
                const r = this.radius * maxRadius;
                const x = zx + Math.cos(this.angle) * r;
                const y = zy + Math.sin(this.angle) * r * 0.62; // squashed dome perspective
                if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;
                const tw = 0.6 + 0.4 * Math.sin(this.twinkle);
                ctx.save();
                ctx.globalAlpha = this.baseAlpha * tw;
                const s = this.baseSize * (this.warm ? 3.2 : 2.6);
                ctx.drawImage(starSprite, x - s / 2, y - s / 2, s, s);
                if (this.warm) {
                    ctx.globalAlpha = this.baseAlpha * tw * 0.5;
                    ctx.fillStyle = '#e8c86a';
                    ctx.beginPath();
                    ctx.arc(x, y, this.baseSize * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        class Meteor {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = 400 + Math.random() * 900;
                this.x = 0;
                this.y = 0;
                this.vx = 0;
                this.vy = 0;
                this.life = 0;
                this.maxLife = 1;
            }

            trigger() {
                this.active = true;
                this.x = width * (0.15 + Math.random() * 0.7);
                this.y = height * (0.05 + Math.random() * 0.25);
                const dir = Math.random() < 0.5 ? -1 : 1;
                const speed = 7 + Math.random() * 6;
                this.vx = dir * speed * 0.8;
                this.vy = speed * 0.5;
                this.maxLife = 30 + Math.random() * 25;
                this.life = this.maxLife;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.trigger();
                    return;
                }
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                if (this.life <= 0 || this.y > height) this.reset();
            }

            draw() {
                if (!this.active) return;
                const fade = this.life / this.maxLife;
                const tx = this.x - this.vx * 6;
                const ty = this.y - this.vy * 6;
                const grad = ctx.createLinearGradient(tx, ty, this.x, this.y);
                grad.addColorStop(0, 'rgba(200, 215, 255, 0)');
                grad.addColorStop(1, `rgba(240, 246, 255, ${0.7 * fade})`);
                ctx.save();
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        /* The throne-bright pole star: layered glow + diffraction cross + beam */
        function drawPoleStar(t) {
            const zx = width * zenith.xFrac + domeTilt * width * 0.03;
            const zy = height * zenith.yFrac;
            const pulse = 0.75 + 0.25 * Math.sin(t * 0.012);

            // Throne column: a faint royal beam falling from the pole star
            const beam = ctx.createLinearGradient(zx, zy, zx, height * 0.85);
            beam.addColorStop(0, `rgba(232, 200, 106, ${0.05 * pulse})`);
            beam.addColorStop(1, 'rgba(232, 200, 106, 0)');
            ctx.save();
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(zx - width * 0.012, zy);
            ctx.lineTo(zx + width * 0.012, zy);
            ctx.lineTo(zx + width * 0.05, height * 0.85);
            ctx.lineTo(zx - width * 0.05, height * 0.85);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Halo
            const haloR = 60 + pulse * 24;
            const halo = ctx.createRadialGradient(zx, zy, 0, zx, zy, haloR);
            halo.addColorStop(0, `rgba(255, 246, 214, ${0.55 * pulse})`);
            halo.addColorStop(0.3, `rgba(232, 200, 106, ${0.22 * pulse})`);
            halo.addColorStop(1, 'rgba(232, 200, 106, 0)');
            ctx.save();
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(zx, zy, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Diffraction cross
            ctx.strokeStyle = `rgba(255, 250, 226, ${0.5 * pulse})`;
            ctx.lineCap = 'round';
            ctx.lineWidth = 1.4;
            const arm = 26 + pulse * 10;
            ctx.beginPath();
            ctx.moveTo(zx - arm, zy);
            ctx.lineTo(zx + arm, zy);
            ctx.moveTo(zx, zy - arm * 1.3);
            ctx.lineTo(zx, zy + arm * 1.3);
            ctx.stroke();

            // Blazing core
            ctx.fillStyle = `rgba(255, 252, 238, ${0.9 * pulse})`;
            ctx.beginPath();
            ctx.arc(zx, zy, 3.2 + pulse * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* Faint declination rings: the ordered heaven of kingship */
        function drawDeclinationRings(t, maxRadius) {
            const zx = width * zenith.xFrac + domeTilt * width * 0.03;
            const zy = height * zenith.yFrac;
            ctx.save();
            for (let i = 1; i <= 4; i++) {
                const r = maxRadius * (0.2 + i * 0.2);
                const breathe = 0.5 + 0.5 * Math.sin(t * 0.002 + i * 1.7);
                ctx.strokeStyle = `rgba(170, 190, 235, ${0.03 + breathe * 0.02})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(zx, zy, r, r * 0.62, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        resize();
        buildStarSprite();
        for (let layer = 0; layer < 3; layer++) {
            const count = [110, 80, 40][layer];
            for (let i = 0; i < count; i++) stars.push(new Star(layer));
        }
        for (let i = 0; i < 2; i++) meteors.push(new Meteor());

        window.addEventListener('resize', resize);

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            window.addEventListener('mousemove', (e) => {
                pointer.x = e.clientX / window.innerWidth;
                pointer.active = true;
            }, { passive: true });
        }

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        function animate() {
            if (paused) return;
            frameCount++;
            const t = frameCount;
            ctx.clearRect(0, 0, width, height);

            const maxRadius = Math.max(width, height) * 0.75;

            // Zenith ambience: a cool royal glow crowning the dome
            const sky = ctx.createRadialGradient(
                width * zenith.xFrac, height * zenith.yFrac, 0,
                width * zenith.xFrac, height * zenith.yFrac, maxRadius * 0.8
            );
            sky.addColorStop(0, 'hsla(228, 55%, 30%, 0.10)');
            sky.addColorStop(0.5, 'hsla(232, 45%, 20%, 0.05)');
            sky.addColorStop(1, 'transparent');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Dome tilt eases toward the pointer (a gentle parallax of the heavens)
            const targetTilt = pointer.active ? (pointer.x - 0.5) : 0;
            domeTilt += (targetTilt - domeTilt) * 0.02;

            drawDeclinationRings(t, maxRadius);
            stars.forEach(s => { s.update(t); s.draw(maxRadius); });
            meteors.forEach(m => { m.update(); m.draw(); });
            drawPoleStar(t);

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
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

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
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

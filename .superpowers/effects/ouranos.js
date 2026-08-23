/**
 * OURANÓS — Sky
 * Slow starfield dome rotation with constellation lines
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Starfield Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let centerX, centerY;
        let stars = [];
        let constellations = [];
        let shootingStars = [];
        let running = true;
        let rafId = null;
        let time = 0;
        let domeRotation = 0;
        let pointerX = 0.5;
        let pointerY = 0.5;

        const PALETTE = {
            star: { r: 235, g: 240, b: 255 },
            starWarm: { r: 255, g: 230, b: 190 },
            line: { r: 150, g: 180, b: 230 },
            skyTop: 'rgba(6, 8, 24, 0.85)',
            skyBottom: 'rgba(16, 14, 40, 0.55)'
        };

        // A few invented constellation figures: index chains into the star list
        const CONSTELLATION_PATTERNS = 6;
        const CONSTELLATION_SIZE = [5, 6, 4, 7, 5, 6];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            centerX = width / 2;
            centerY = height * 0.55;
        }

        /* A fixed star on the rotating celestial dome */
        class DomeStar {
            constructor(angle, elevation, bright) {
                this.angle = angle;
                this.elevation = elevation; // 0 = horizon ring, 1 = zenith
                this.size = bright ? 1.2 + Math.random() * 1.6 : 0.4 + Math.random() * 0.9;
                this.baseOpacity = bright ? 0.6 + Math.random() * 0.4 : 0.25 + Math.random() * 0.45;
                this.twinklePhase = Math.random() * Math.PI * 2;
                this.twinkleSpeed = 0.01 + Math.random() * 0.04;
                this.warm = Math.random() < 0.25;
            }

            update() {
                this.twinklePhase += this.twinkleSpeed;
            }

            project(rotation) {
                // Stereographic-ish dome projection: elevation squashes toward horizon
                const a = this.angle + rotation;
                const r = (1 - this.elevation * 0.82) * Math.max(width, height) * 0.62;
                return {
                    x: centerX + Math.cos(a) * r,
                    y: centerY + Math.sin(a) * r * 0.62 - this.elevation * height * 0.1
                };
            }

            draw(rotation) {
                const p = this.project(rotation);
                if (p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) return;
                const twinkle = 0.7 + Math.sin(this.twinklePhase) * 0.3;
                const alpha = this.baseOpacity * twinkle;
                const c = this.warm ? PALETTE.starWarm : PALETTE.star;

                ctx.save();
                ctx.globalAlpha = alpha;
                if (this.size > 1.6) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                }
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* Bright stars linked by faint engraved lines */
        class Constellation {
            constructor(starList) {
                this.stars = starList;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.pulsePhase += 0.008;
            }

            draw(rotation) {
                const pulse = 0.55 + Math.sin(this.pulsePhase) * 0.2;
                ctx.save();
                ctx.strokeStyle = `rgba(${PALETTE.line.r}, ${PALETTE.line.g}, ${PALETTE.line.b}, ${0.28 * pulse})`;
                ctx.lineWidth = 0.8;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                let started = false;
                for (let i = 0; i < this.stars.length; i++) {
                    const p = this.stars[i].project(rotation);
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Node glow at each constellation star
                this.stars.forEach(star => {
                    const p = star.project(rotation);
                    ctx.globalAlpha = 0.5 * pulse;
                    ctx.fillStyle = `rgba(${PALETTE.star.r}, ${PALETTE.star.g}, ${PALETTE.star.b}, 1)`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, star.size + 0.6, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }
        }

        /* Occasional meteor streaking across the dome */
        class ShootingStar {
            constructor() {
                this.reset();
                this.cooldown = Math.random() * 900 + 300;
            }

            reset() {
                this.active = false;
                this.cooldown = Math.random() * 900 + 400;
                this.x = 0;
                this.y = 0;
                this.vx = 0;
                this.vy = 0;
                this.life = 0;
                this.maxLife = 40;
            }

            trigger() {
                this.active = true;
                this.x = Math.random() * width * 0.8;
                this.y = Math.random() * height * 0.35;
                const speed = 6 + Math.random() * 5;
                const angle = Math.PI * (0.15 + Math.random() * 0.2);
                this.vx = Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1);
                this.vy = Math.sin(angle) * speed;
                this.life = 0;
                this.maxLife = 30 + Math.random() * 25;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.trigger();
                    return;
                }
                this.x += this.vx;
                this.y += this.vy;
                this.life++;
                if (this.life > this.maxLife) this.reset();
            }

            draw() {
                if (!this.active) return;
                const fade = 1 - this.life / this.maxLife;
                ctx.save();
                ctx.globalAlpha = fade * 0.8;
                ctx.lineCap = 'round';
                const tailX = this.x - this.vx * 6;
                const tailY = this.y - this.vy * 6;
                const grad = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
                grad.addColorStop(0, `rgba(${PALETTE.star.r}, ${PALETTE.star.g}, ${PALETTE.star.b}, 0.9)`);
                grad.addColorStop(1, 'transparent');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                ctx.restore();
            }
        }

        resize();

        // Background field
        for (let i = 0; i < 260; i++) {
            stars.push(new DomeStar(Math.random() * Math.PI * 2, Math.random(), false));
        }

        // Constellations from brighter dedicated stars
        for (let c = 0; c < CONSTELLATION_PATTERNS; c++) {
            const group = [];
            const baseAngle = (c / CONSTELLATION_PATTERNS) * Math.PI * 2 + Math.random() * 0.4;
            const baseElevation = 0.35 + Math.random() * 0.5;
            let a = baseAngle;
            let e = baseElevation;
            for (let s = 0; s < CONSTELLATION_SIZE[c]; s++) {
                const star = new DomeStar(a, Math.max(0.05, Math.min(0.95, e)), true);
                stars.push(star);
                group.push(star);
                a += (Math.random() - 0.3) * 0.22;
                e += (Math.random() - 0.5) * 0.18;
            }
            constellations.push(new Constellation(group));
        }

        for (let i = 0; i < 2; i++) shootingStars.push(new ShootingStar());

        window.addEventListener('resize', resize);

        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouchDevice) {
            document.addEventListener('mousemove', (e) => {
                pointerX = e.clientX / window.innerWidth;
                pointerY = e.clientY / window.innerHeight;
            }, { passive: true });
        }

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running && rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });

        function animate() {
            if (!running) {
                rafId = null;
                return;
            }
            time++;
            // The dome turns imperceptibly slowly, as the sky does
            domeRotation += 0.00035;

            ctx.clearRect(0, 0, width, height);

            // Night-sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, PALETTE.skyTop);
            sky.addColorStop(1, PALETTE.skyBottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Faint band of the Milky Way across the dome
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-0.4);
            const milk = ctx.createLinearGradient(0, -height * 0.3, 0, height * 0.3);
            milk.addColorStop(0, 'transparent');
            milk.addColorStop(0.5, 'rgba(200, 210, 240, 0.05)');
            milk.addColorStop(1, 'transparent');
            ctx.fillStyle = milk;
            ctx.fillRect(-width, -height * 0.3, width * 2, height * 0.6);
            ctx.restore();

            stars.forEach(s => { s.update(); s.draw(domeRotation); });
            constellations.forEach(c => { c.update(); c.draw(domeRotation); });
            shootingStars.forEach(m => { m.update(); m.draw(); });

            // Pointer-driven zenith shimmer
            const gx = pointerX * width;
            const gy = pointerY * height * 0.6;
            const shimmer = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260);
            shimmer.addColorStop(0, 'rgba(180, 200, 255, 0.05)');
            shimmer.addColorStop(1, 'transparent');
            ctx.fillStyle = shimmer;
            ctx.beginPath();
            ctx.arc(gx, gy, 260, 0, Math.PI * 2);
            ctx.fill();

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);
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

/**
 * BA — The Soul, Manifestation of the Self
 * A human-headed bird gliding between worlds, trailing stardust.
 * Interactive Layer: Soulglide Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Soulglide Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('soulglide-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let stars = [];
            let trail = [];
            let wisps = [];
            let running = true;
            let bird = { x: 0, y: 0, px: 0, py: 0, angle: 0 };

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            class Star {
                constructor() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                    this.size = 0.4 + Math.random() * 1.4;
                    this.twinkle = Math.random() * Math.PI * 2;
                    this.speed = 0.4 + Math.random() * 1.2;
                }

                draw(t) {
                    const a = 0.15 + 0.35 * Math.abs(Math.sin(t * 0.001 * this.speed + this.twinkle));
                    ctx.save();
                    ctx.globalAlpha = a;
                    ctx.fillStyle = '#EAE4D4';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // The ba's flight path: a wide, slow lissajous across the hero
            function flightPath(t) {
                const cx = width * 0.5;
                const cy = height * 0.42;
                return {
                    x: cx + Math.sin(t * 0.00022) * width * 0.32,
                    y: cy + Math.sin(t * 0.00044 + 1.2) * height * 0.16
                        + Math.sin(t * 0.0011) * height * 0.03
                };
            }

            // Draw the bird: glowing body, paired flapping wing arcs, head hint
            function drawBird(t) {
                const flap = Math.sin(t * 0.006) * 0.9;      // wingbeat
                const glide = Math.sin(t * 0.0005) > 0.4;     // long glide phases
                const wingLift = glide ? 0.25 : flap;
                const size = Math.min(width, height) * 0.045;

                ctx.save();
                ctx.translate(bird.x, bird.y);
                ctx.rotate(bird.angle * 0.3);

                // Body glow
                const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.4);
                glow.addColorStop(0, 'rgba(255, 226, 160, 0.5)');
                glow.addColorStop(0.5, 'rgba(220, 180, 110, 0.15)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(-size * 2.4, -size * 2.4, size * 4.8, size * 4.8);

                // Wings — paired quadratic sweeps rising and falling
                [-1, 1].forEach(side => {
                    ctx.save();
                    ctx.scale(side, 1);
                    const span = size * (2.6 + wingLift * 0.4);
                    const liftY = -size * (0.6 + wingLift * 1.4);

                    const wingGrad = ctx.createLinearGradient(0, 0, span, liftY);
                    wingGrad.addColorStop(0, 'rgba(255, 232, 175, 0.85)');
                    wingGrad.addColorStop(0.7, 'rgba(230, 190, 120, 0.4)');
                    wingGrad.addColorStop(1, 'rgba(230, 190, 120, 0)');

                    ctx.strokeStyle = wingGrad;
                    ctx.lineCap = 'round';
                    // Layered feather arcs
                    for (let f = 0; f < 4; f++) {
                        const k = 1 - f * 0.18;
                        ctx.lineWidth = 3.2 - f * 0.6;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.quadraticCurveTo(
                            span * 0.45 * k,
                            liftY * k - size * 0.35,
                            span * k,
                            liftY * 0.55 * k + f * 3
                        );
                        ctx.stroke();
                    }
                    ctx.restore();
                });

                // Body
                const body = ctx.createLinearGradient(-size, 0, size * 1.4, 0);
                body.addColorStop(0, 'rgba(255, 240, 200, 0)');
                body.addColorStop(0.55, 'rgba(255, 236, 185, 0.95)');
                body.addColorStop(1, 'rgba(255, 214, 140, 0.9)');
                ctx.fillStyle = body;
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 1.35, size * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();

                // Human head — a small bright profile sphere ahead of the body
                ctx.fillStyle = 'rgba(255, 244, 214, 0.95)';
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(255, 230, 170, 0.9)';
                ctx.beginPath();
                ctx.arc(size * 1.5, -size * 0.28, size * 0.30, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            // Fading stardust trail point
            class TrailPoint {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                    this.life = 1;
                    this.size = 1 + Math.random() * 2.4;
                    this.drift = (Math.random() - 0.5) * 0.4;
                }

                update() {
                    this.life -= 0.008;
                    this.y += 0.15;
                    this.x += this.drift;
                    return this.life > 0;
                }

                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.life * 0.55;
                    ctx.fillStyle = '#FFDFA0';
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#FFCE7E';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Free wisps — stray soul-motes wandering the night sky
            class Wisp {
                constructor() {
                    this.reset();
                }

                reset() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                    this.vx = (Math.random() - 0.5) * 0.25;
                    this.vy = (Math.random() - 0.5) * 0.18;
                    this.size = 0.8 + Math.random() * 1.8;
                    this.phase = Math.random() * Math.PI * 2;
                }

                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    if (this.x < -10) this.x = width + 10;
                    if (this.x > width + 10) this.x = -10;
                    if (this.y < -10) this.y = height + 10;
                    if (this.y > height + 10) this.y = -10;
                }

                draw(t) {
                    const a = 0.10 + 0.14 * Math.abs(Math.sin(t * 0.0014 + this.phase));
                    ctx.save();
                    ctx.globalAlpha = a;
                    ctx.fillStyle = '#D8C8A8';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            resize();
            for (let i = 0; i < 140; i++) stars.push(new Star());
            for (let i = 0; i < 40; i++) wisps.push(new Wisp());

            window.addEventListener('resize', resize);

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                ctx.clearRect(0, 0, width, height);

                // Duat night-sky wash
                const sky = ctx.createLinearGradient(0, 0, 0, height);
                sky.addColorStop(0, 'rgba(18, 22, 48, 0.22)');
                sky.addColorStop(0.6, 'rgba(30, 30, 60, 0.10)');
                sky.addColorStop(1, 'transparent');
                ctx.fillStyle = sky;
                ctx.fillRect(0, 0, width, height);

                stars.forEach(s => s.draw(t));
                wisps.forEach(w => { w.update(); w.draw(t); });

                // Update the gliding bird
                bird.px = bird.x;
                bird.py = bird.y;
                const pos = flightPath(t);
                bird.x = pos.x;
                bird.y = pos.y;
                if (bird.px !== 0) {
                    bird.angle = Math.atan2(bird.y - bird.py, bird.x - bird.px);
                }

                // Shed trail points along the wingtips
                for (let i = 0; i < 2; i++) {
                    trail.push(new TrailPoint(
                        bird.x + (Math.random() - 0.5) * 14,
                        bird.y + (Math.random() - 0.5) * 10
                    ));
                }
                if (trail.length > 260) trail.splice(0, trail.length - 260);

                trail = trail.filter(p => {
                    p.draw();
                    return p.update();
                });

                drawBird(t);

                requestAnimationFrame(animate);
            }

            requestAnimationFrame(animate);
        }
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
            const hero = document.getElementById('hero');
            if (hero) {
                const scrollY = window.pageYOffset;
                if (scrollY < hero.offsetTop + hero.offsetHeight) {
                    mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
            }
        }, { passive: true });
    }

})();

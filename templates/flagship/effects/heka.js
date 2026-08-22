/**
 * HEKA — God of Magic & Medicine
 * Hieroglyph sparks orbiting the glow of the magician's staff.
 * Interactive Layer: Spellstaff Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Spellstaff Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('spellstaff-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let orbiters = [];
            let embers = [];
            let running = true;
            let glyphSprites = [];
            let pointerX = 0.5;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            // ── Offscreen glyph sprite atlas ──
            // Five simple hieroglyph-like sigils baked once, reused every frame.
            function buildGlyphSprites() {
                const makers = [
                    // Ankh
                    (c, s) => {
                        c.strokeStyle = '#FFDF9E';
                        c.lineWidth = 2.4;
                        c.beginPath();
                        c.ellipse(0, -s * 0.28, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
                        c.moveTo(0, 0);
                        c.lineTo(0, s * 0.5);
                        c.moveTo(-s * 0.26, s * 0.06);
                        c.lineTo(s * 0.26, s * 0.06);
                        c.stroke();
                    },
                    // Wedjat eye
                    (c, s) => {
                        c.strokeStyle = '#BFD8FF';
                        c.lineWidth = 2.2;
                        c.beginPath();
                        c.moveTo(-s * 0.45, 0);
                        c.quadraticCurveTo(0, -s * 0.45, s * 0.45, 0);
                        c.quadraticCurveTo(0, s * 0.32, -s * 0.45, 0);
                        c.moveTo(s * 0.1, s * 0.18);
                        c.quadraticCurveTo(s * 0.05, s * 0.5, -s * 0.15, s * 0.55);
                        c.stroke();
                        c.fillStyle = '#BFD8FF';
                        c.beginPath();
                        c.arc(0, -s * 0.05, s * 0.10, 0, Math.PI * 2);
                        c.fill();
                    },
                    // Star (sb3)
                    (c, s) => {
                        c.strokeStyle = '#FFE9BE';
                        c.lineWidth = 2;
                        c.beginPath();
                        for (let i = 0; i < 5; i++) {
                            const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
                            c.moveTo(0, 0);
                            c.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
                        }
                        c.stroke();
                    },
                    // Water ripple (n)
                    (c, s) => {
                        c.strokeStyle = '#9FD8E8';
                        c.lineWidth = 2.2;
                        c.beginPath();
                        c.moveTo(-s * 0.5, 0);
                        for (let i = 0; i < 4; i++) {
                            c.lineTo(-s * 0.5 + (i + 0.5) * s * 0.25, -s * 0.22);
                            c.lineTo(-s * 0.5 + (i + 1) * s * 0.25, 0);
                        }
                        c.stroke();
                    },
                    // Was-staff head (forked)
                    (c, s) => {
                        c.strokeStyle = '#E8C47E';
                        c.lineWidth = 2.4;
                        c.beginPath();
                        c.moveTo(0, s * 0.5);
                        c.lineTo(0, -s * 0.15);
                        c.lineTo(-s * 0.25, -s * 0.45);
                        c.moveTo(0, -s * 0.15);
                        c.lineTo(s * 0.25, -s * 0.45);
                        c.stroke();
                    }
                ];

                glyphSprites = makers.map(draw => {
                    const size = 48;
                    const off = document.createElement('canvas');
                    off.width = size;
                    off.height = size;
                    const c = off.getContext('2d');
                    c.translate(size / 2, size / 2);
                    c.lineCap = 'round';
                    c.lineJoin = 'round';
                    c.shadowBlur = 6;
                    c.shadowColor = 'rgba(255, 220, 150, 0.8)';
                    draw(c, size * 0.8);
                    return off;
                });
            }

            // ── Orbiting glyph spark ──
            class Orbiter {
                constructor(i) {
                    this.sprite = glyphSprites[i % glyphSprites.length];
                    this.radius = 70 + Math.random() * 150;
                    this.angle = Math.random() * Math.PI * 2;
                    this.speed = (0.002 + Math.random() * 0.004) * (Math.random() < 0.5 ? 1 : -1);
                    this.eccentricity = 0.55 + Math.random() * 0.35; // squashed orbit = depth
                    this.size = 10 + Math.random() * 14;
                    this.twinkle = Math.random() * Math.PI * 2;
                    this.opacity = 0.35 + Math.random() * 0.45;
                }

                update() {
                    this.angle += this.speed;
                }

                draw(t, cx, cy) {
                    const px = cx + Math.cos(this.angle) * this.radius;
                    const py = cy + Math.sin(this.angle) * this.radius * this.eccentricity
                        - Math.min(width, height) * 0.05;
                    const depth = 0.5 + 0.5 * Math.sin(this.angle); // front/back
                    const tw = 0.6 + 0.4 * Math.sin(t * 0.004 + this.twinkle);
                    const scale = this.size * (0.7 + depth * 0.5);

                    ctx.save();
                    ctx.globalAlpha = this.opacity * tw * (0.5 + depth * 0.5);
                    ctx.translate(px, py);
                    ctx.rotate(Math.sin(t * 0.001 + this.twinkle) * 0.4);
                    ctx.drawImage(this.sprite, -scale / 2, -scale / 2, scale, scale);
                    ctx.restore();
                }
            }

            // ── Rising embers of raw magic ──
            class Ember {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.x = width * 0.5 + (Math.random() - 0.5) * 60;
                    this.y = scatter ? Math.random() * height : height * 0.72;
                    this.vy = -(0.4 + Math.random() * 1.1);
                    this.vx = (Math.random() - 0.5) * 0.5;
                    this.size = 0.7 + Math.random() * 2;
                    this.life = 1;
                    this.decay = 0.004 + Math.random() * 0.008;
                    this.hue = Math.random() < 0.4 ? '158, 200, 255' : '255, 214, 140';
                }

                update() {
                    this.x += this.vx + (pointerX - 0.5) * 0.4;
                    this.y += this.vy;
                    this.life -= this.decay;
                    if (this.life <= 0 || this.y < -10) this.reset(false);
                }

                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.life * 0.6;
                    ctx.fillStyle = `rgba(${this.hue}, 1)`;
                    ctx.shadowBlur = 7;
                    ctx.shadowColor = `rgba(${this.hue}, 0.9)`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // ── The staff itself ──
            function drawStaff(t, cx, cy) {
                const topY = cy - Math.min(width, height) * 0.22;
                const botY = cy + Math.min(width, height) * 0.26;
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.0022);

                // Vertical aura
                const aura = ctx.createLinearGradient(cx, topY, cx, botY);
                aura.addColorStop(0, `rgba(160, 200, 255, ${0.05 + pulse * 0.05})`);
                aura.addColorStop(0.5, `rgba(255, 224, 160, ${0.12 + pulse * 0.08})`);
                aura.addColorStop(1, 'rgba(255, 214, 140, 0.04)');
                ctx.save();
                ctx.strokeStyle = aura;
                ctx.lineWidth = 46;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx, topY);
                ctx.lineTo(cx, botY);
                ctx.stroke();
                ctx.restore();

                // Core shaft
                ctx.save();
                ctx.strokeStyle = `rgba(255, 236, 190, ${0.55 + pulse * 0.3})`;
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 18 + pulse * 14;
                ctx.shadowColor = 'rgba(255, 220, 150, 0.9)';
                ctx.beginPath();
                ctx.moveTo(cx, topY);
                ctx.lineTo(cx, botY);
                ctx.stroke();
                ctx.restore();

                // Was-head prongs at the top
                ctx.save();
                ctx.strokeStyle = `rgba(200, 224, 255, ${0.6 + pulse * 0.3})`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 16;
                ctx.shadowColor = 'rgba(170, 210, 255, 0.9)';
                const fork = Math.min(width, height) * 0.05;
                ctx.beginPath();
                ctx.moveTo(cx, topY);
                ctx.lineTo(cx - fork * 0.7, topY - fork);
                ctx.moveTo(cx, topY);
                ctx.lineTo(cx + fork * 0.7, topY - fork);
                ctx.stroke();
                ctx.restore();

                // Crown orb flare
                const orb = ctx.createRadialGradient(cx, topY - fork, 0, cx, topY - fork, fork * 1.6);
                orb.addColorStop(0, `rgba(220, 238, 255, ${0.5 + pulse * 0.3})`);
                orb.addColorStop(1, 'transparent');
                ctx.fillStyle = orb;
                ctx.beginPath();
                ctx.arc(cx, topY - fork, fork * 1.6, 0, Math.PI * 2);
                ctx.fill();
            }

            buildGlyphSprites();
            resize();
            for (let i = 0; i < 26; i++) orbiters.push(new Orbiter(i));
            for (let i = 0; i < 70; i++) embers.push(new Ember());

            window.addEventListener('resize', resize);

            if (!window.matchMedia('(pointer: coarse)').matches) {
                window.addEventListener('mousemove', (e) => {
                    pointerX = e.clientX / width;
                }, { passive: true });
            }

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                ctx.clearRect(0, 0, width, height);

                const cx = width * 0.5;
                const cy = height * 0.44;

                // Temple-dusk ambience
                const dusk = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.65);
                dusk.addColorStop(0, 'rgba(40, 34, 70, 0.16)');
                dusk.addColorStop(0.6, 'rgba(24, 20, 44, 0.08)');
                dusk.addColorStop(1, 'transparent');
                ctx.fillStyle = dusk;
                ctx.fillRect(0, 0, width, height);

                drawStaff(t, cx, cy);

                embers.forEach(e => { e.update(); e.draw(); });
                orbiters.forEach(o => { o.update(); o.draw(t, cx, cy); });

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

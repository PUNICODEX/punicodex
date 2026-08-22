/**
 * MA — Truth, Measure, the Feather of Maat
 * A single feather holding perfect balance on the beam of truth.
 * Interactive Layer: Maatfeather Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Maatfeather Canvas ───────────────────────────────────────────────── */
    const canvas = document.getElementById('maatfeather-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let stars = [];
            let motes = [];
            let running = true;
            let balanceGlow = 0;
            let pointerX = 0.5;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            class Star {
                constructor() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height * 0.7;
                    this.size = 0.4 + Math.random() * 1.2;
                    this.phase = Math.random() * Math.PI * 2;
                    this.speed = 0.5 + Math.random() * 1.5;
                }

                draw(t) {
                    const a = 0.12 + 0.3 * Math.abs(Math.sin(t * 0.001 * this.speed + this.phase));
                    ctx.save();
                    ctx.globalAlpha = a;
                    ctx.fillStyle = '#EDE6D2';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            class Mote {
                constructor() {
                    this.reset();
                }

                reset() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                    this.vx = (Math.random() - 0.5) * 0.2;
                    this.vy = -0.1 - Math.random() * 0.25;
                    this.size = 0.6 + Math.random() * 1.6;
                    this.phase = Math.random() * Math.PI * 2;
                }

                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    if (this.y < -10 || this.x < -10 || this.x > width + 10) this.reset();
                }

                draw(t) {
                    const a = 0.10 + 0.18 * Math.abs(Math.sin(t * 0.0018 + this.phase));
                    ctx.save();
                    ctx.globalAlpha = a;
                    ctx.fillStyle = '#E8D6A8';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Stylised ostrich feather standing upright, rocking on its tip
            function drawFeather(cx, tipY, size, rock, t) {
                ctx.save();
                ctx.translate(cx, tipY);
                ctx.rotate(rock);

                const h = size;         // feather height
                const w = size * 0.30;  // max half-width

                // Back glow — the feather is luminous with truth
                const glow = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.9);
                glow.addColorStop(0, `rgba(240, 226, 190, ${0.16 + balanceGlow * 0.2})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(-h, -h * 1.5, h * 2, h * 2);

                // Barb body: two mirrored teardrop curves, widest at 40% up
                const body = ctx.createLinearGradient(0, -h, 0, 0);
                body.addColorStop(0, 'rgba(250, 244, 226, 0.95)');
                body.addColorStop(0.6, 'rgba(232, 214, 170, 0.85)');
                body.addColorStop(1, 'rgba(200, 176, 128, 0.8)');
                ctx.fillStyle = body;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(-w * 0.9, -h * 0.15, -w, -h * 0.45, 0, -h);
                ctx.bezierCurveTo(w, -h * 0.45, w * 0.9, -h * 0.15, 0, 0);
                ctx.fill();

                // Central shaft
                ctx.strokeStyle = 'rgba(190, 160, 105, 0.9)';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -h * 0.97);
                ctx.stroke();

                // Barb lines fanning from the shaft
                ctx.strokeStyle = 'rgba(200, 180, 135, 0.4)';
                ctx.lineWidth = 0.8;
                for (let i = 1; i <= 9; i++) {
                    const fy = -h * (i / 10);
                    const spread = Math.sin((i / 10) * Math.PI) * w * 0.85;
                    [-1, 1].forEach(side => {
                        ctx.beginPath();
                        ctx.moveTo(0, fy);
                        ctx.lineTo(side * spread, fy - h * 0.06);
                        ctx.stroke();
                    });
                }

                ctx.restore();
            }

            // The beam of the scales, hanging plumb line, and balance pulse
            function drawBeam(cx, beamY, rock, t) {
                const half = Math.min(width, height) * 0.34;

                ctx.save();
                ctx.translate(cx, beamY);
                ctx.rotate(rock * 0.35); // beam echoes the feather, damped

                // Beam
                const beamGrad = ctx.createLinearGradient(-half, 0, half, 0);
                beamGrad.addColorStop(0, 'rgba(190, 160, 105, 0.35)');
                beamGrad.addColorStop(0.5, `rgba(240, 214, 150, ${0.6 + balanceGlow * 0.3})`);
                beamGrad.addColorStop(1, 'rgba(190, 160, 105, 0.35)');
                ctx.strokeStyle = beamGrad;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-half, 0);
                ctx.lineTo(half, 0);
                ctx.stroke();

                // End finials
                [-1, 1].forEach(side => {
                    ctx.fillStyle = 'rgba(230, 200, 135, 0.7)';
                    ctx.beginPath();
                    ctx.arc(side * half, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();

                // Plumb line from beam centre — the measure against which truth hangs
                const plumbLen = Math.min(width, height) * 0.30;
                ctx.save();
                ctx.strokeStyle = 'rgba(220, 196, 140, 0.35)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(cx, beamY);
                ctx.lineTo(cx + Math.sin(t * 0.0008) * 4, beamY + plumbLen);
                ctx.stroke();
                ctx.fillStyle = 'rgba(235, 210, 150, 0.75)';
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(235, 210, 150, 0.8)';
                const bobX = cx + Math.sin(t * 0.0008) * 4;
                ctx.beginPath();
                ctx.moveTo(bobX, beamY + plumbLen + 10);
                ctx.lineTo(bobX - 5, beamY + plumbLen);
                ctx.lineTo(bobX + 5, beamY + plumbLen);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            resize();
            for (let i = 0; i < 120; i++) stars.push(new Star());
            for (let i = 0; i < 60; i++) motes.push(new Mote());

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
                const beamY = height * 0.62;

                // Cosmic-order ambience
                const amb = ctx.createRadialGradient(cx, beamY, 0, cx, beamY, Math.max(width, height) * 0.65);
                amb.addColorStop(0, 'rgba(46, 40, 60, 0.14)');
                amb.addColorStop(0.6, 'rgba(24, 22, 40, 0.07)');
                amb.addColorStop(1, 'transparent');
                ctx.fillStyle = amb;
                ctx.fillRect(0, 0, width, height);

                stars.forEach(s => s.draw(t));

                // The rocking feather: slow oscillation, nudged by the pointer,
                // periodically settling to perfect stillness — true balance
                const settle = 0.5 + 0.5 * Math.sin(t * 0.00012); // long settle cycle
                const rockAmp = 0.10 * (0.3 + 0.7 * (1 - settle));
                const rock = Math.sin(t * 0.0011) * rockAmp + (pointerX - 0.5) * 0.03;

                // Balance flares when the feather passes through upright
                if (Math.abs(rock) < 0.008) balanceGlow = Math.min(1, balanceGlow + 0.02);
                balanceGlow *= 0.985;

                const featherSize = Math.min(width, height) * 0.26;
                drawFeather(cx, beamY, featherSize, rock, t);
                drawBeam(cx, beamY, rock, t);

                // Halo flash at perfect balance
                if (balanceGlow > 0.02) {
                    const halo = ctx.createRadialGradient(cx, beamY - featherSize * 0.5, 0, cx, beamY - featherSize * 0.5, featherSize);
                    halo.addColorStop(0, `rgba(255, 244, 210, ${0.22 * balanceGlow})`);
                    halo.addColorStop(1, 'transparent');
                    ctx.fillStyle = halo;
                    ctx.fillRect(cx - featherSize, beamY - featherSize * 1.6, featherSize * 2, featherSize * 2);
                }

                motes.forEach(m => { m.update(); m.draw(t); });

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

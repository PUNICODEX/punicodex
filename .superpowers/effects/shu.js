/**
 * SHU — God of Air, Wind & Lions
 * Uplifting wind currents holding a radiant sun-disc aloft.
 * Interactive Layer: Updraft Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Updraft Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('updraft-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let windStreaks = [];
            let dustMotes = [];
            let ribbons = [];
            let frame = 0;
            let running = true;
            let pointerX = 0.5;
            let pointerEnergy = 0;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            // ── Sun disc held aloft ──
            function drawSunDisc(t) {
                const cx = width * 0.5;
                const cy = height * 0.26 + Math.sin(t * 0.0006) * height * 0.015;
                const r = Math.min(width, height) * 0.11;

                // Outer halo
                const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 4.2);
                halo.addColorStop(0, 'rgba(255, 214, 120, 0.28)');
                halo.addColorStop(0.4, 'rgba(240, 190, 90, 0.10)');
                halo.addColorStop(1, 'transparent');
                ctx.fillStyle = halo;
                ctx.fillRect(cx - r * 4.2, cy - r * 4.2, r * 8.4, r * 8.4);

                // Rotating rays
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(t * 0.00012);
                for (let i = 0; i < 24; i++) {
                    const a = (i / 24) * Math.PI * 2;
                    const len = r * (1.35 + 0.25 * Math.sin(t * 0.001 + i * 1.7));
                    ctx.save();
                    ctx.rotate(a);
                    const rayGrad = ctx.createLinearGradient(r * 0.9, 0, len, 0);
                    rayGrad.addColorStop(0, 'rgba(255, 220, 140, 0.35)');
                    rayGrad.addColorStop(1, 'transparent');
                    ctx.strokeStyle = rayGrad;
                    ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.1;
                    ctx.beginPath();
                    ctx.moveTo(r * 0.92, 0);
                    ctx.lineTo(len, 0);
                    ctx.stroke();
                    ctx.restore();
                }
                ctx.restore();

                // Disc body
                const disc = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
                disc.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
                disc.addColorStop(0.55, 'rgba(255, 206, 110, 0.85)');
                disc.addColorStop(1, 'rgba(214, 148, 48, 0.55)');
                ctx.fillStyle = disc;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();

                // Rim glow
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 232, 170, 0.7)';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 24;
                ctx.shadowColor = 'rgba(255, 210, 120, 0.9)';
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                return { x: cx, y: cy, r: r };
            }

            // ── Wind streaks rising past the disc ──
            class WindStreak {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.baseX = Math.random() * width;
                    this.y = scatter ? Math.random() * height : height + 30;
                    this.vy = -(1.2 + Math.random() * 2.4);
                    this.swayAmp = 18 + Math.random() * 46;
                    this.swayFreq = 0.6 + Math.random() * 1.4;
                    this.phase = Math.random() * Math.PI * 2;
                    this.len = 26 + Math.random() * 54;
                    this.opacity = 0.10 + Math.random() * 0.22;
                    this.hue = Math.random() < 0.3 ? '255, 226, 160' : '170, 214, 235';
                }

                update(t) {
                    this.y += this.vy * (1 + pointerEnergy * 1.6);
                    if (this.y < -this.len - 40) this.reset(false);
                    const sway = Math.sin(t * 0.001 * this.swayFreq + this.phase) * this.swayAmp;
                    const stir = (pointerX - 0.5) * 60 * pointerEnergy;
                    this.x = this.baseX + sway + stir;
                }

                draw() {
                    ctx.save();
                    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.len);
                    grad.addColorStop(0, `rgba(${this.hue}, 0)`);
                    grad.addColorStop(0.5, `rgba(${this.hue}, ${this.opacity})`);
                    grad.addColorStop(1, `rgba(${this.hue}, 0)`);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.4;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.quadraticCurveTo(
                        this.x + this.swayAmp * 0.18,
                        this.y + this.len * 0.5,
                        this.x,
                        this.y + this.len
                    );
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // ── Broad slow wind ribbons ──
            class Ribbon {
                constructor(i) {
                    this.offset = i * 0.9 + Math.random() * 0.4;
                    this.speed = 0.00016 + Math.random() * 0.0001;
                    this.amp = 40 + Math.random() * 60;
                    this.yBase = 0.45 + i * 0.14;
                    this.opacity = 0.05 + Math.random() * 0.05;
                }

                draw(t) {
                    const yy = height * this.yBase;
                    ctx.save();
                    ctx.strokeStyle = `rgba(190, 224, 244, ${this.opacity})`;
                    ctx.lineWidth = 22;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    for (let x = -40; x <= width + 40; x += 28) {
                        const y = yy
                            + Math.sin(x * 0.004 + t * this.speed * 6 + this.offset) * this.amp
                            + Math.sin(x * 0.011 - t * this.speed * 3) * this.amp * 0.3;
                        if (x === -40) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // ── Golden dust motes lifted by the updraft ──
            class DustMote {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.x = Math.random() * width;
                    this.y = scatter ? Math.random() * height : height + 10;
                    this.vy = -(0.25 + Math.random() * 0.7);
                    this.vx = (Math.random() - 0.5) * 0.3;
                    this.size = 0.6 + Math.random() * 1.8;
                    this.twinkle = Math.random() * Math.PI * 2;
                    this.opacity = 0.2 + Math.random() * 0.4;
                }

                update(t) {
                    this.y += this.vy;
                    this.x += this.vx + Math.sin(t * 0.0012 + this.twinkle) * 0.25;
                    if (this.y < -10) this.reset(false);
                }

                draw(t) {
                    const tw = 0.5 + 0.5 * Math.sin(t * 0.003 + this.twinkle);
                    ctx.save();
                    ctx.globalAlpha = this.opacity * tw;
                    ctx.fillStyle = '#FFD98A';
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#FFCE6E';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            resize();
            for (let i = 0; i < 130; i++) windStreaks.push(new WindStreak());
            for (let i = 0; i < 70; i++) dustMotes.push(new DustMote());
            for (let i = 0; i < 3; i++) ribbons.push(new Ribbon(i));

            window.addEventListener('resize', resize);

            if (!window.matchMedia('(pointer: coarse)').matches) {
                window.addEventListener('mousemove', (e) => {
                    pointerX = e.clientX / width;
                    pointerEnergy = Math.min(1, pointerEnergy + 0.08);
                }, { passive: true });
            }

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                frame++;
                ctx.clearRect(0, 0, width, height);

                pointerEnergy *= 0.97;

                // Sky breath gradient
                const sky = ctx.createLinearGradient(0, 0, 0, height);
                sky.addColorStop(0, 'rgba(56, 96, 138, 0.10)');
                sky.addColorStop(0.5, 'rgba(120, 168, 200, 0.05)');
                sky.addColorStop(1, 'transparent');
                ctx.fillStyle = sky;
                ctx.fillRect(0, 0, width, height);

                ribbons.forEach(r => r.draw(t));

                const disc = drawSunDisc(t);

                // Wind streaks — brighter inside the updraft column below the disc
                windStreaks.forEach(s => {
                    s.update(t);
                    const nearColumn = Math.abs(s.baseX - disc.x) < disc.r * 2.2 && s.y > disc.y;
                    if (nearColumn) ctx.globalAlpha = 1.35;
                    s.draw();
                    ctx.globalAlpha = 1;
                });

                dustMotes.forEach(m => { m.update(t); m.draw(t); });

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

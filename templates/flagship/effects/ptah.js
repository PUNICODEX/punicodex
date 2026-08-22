/**
 * PTAH — Lord of Craftsmen & Creation
 * Forge sparks gathering out of chaos and assembling into form.
 * Interactive Layer: Forge Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Forge Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('ptah-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let sparks = [];
            let embers = [];
            let targets = [];
            let running = true;
            // Cycle: assemble → hold → scatter → assemble …
            let phase = 'assemble';
            let phaseT = 0;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
                targets = buildDjedTargets();
            }

            // Target point cloud: a djed pillar — Ptah's emblem of stable form.
            // Vertical spine + three crossbars near the top, sampled as points.
            function buildDjedTargets() {
                const pts = [];
                const cx = width * 0.5;
                const top = height * 0.24;
                const bottom = height * 0.68;
                const spine = Math.min(width, height) * 0.016;
                const barW = Math.min(width, height) * 0.16;

                // Spine
                for (let y = top; y <= bottom; y += 7) {
                    pts.push({ x: cx - spine + (Math.random() * spine * 2), y: y });
                }
                // Three crossbars
                for (let b = 0; b < 3; b++) {
                    const by = top + b * Math.min(width, height) * 0.045;
                    const w = barW * (1 - b * 0.14);
                    for (let x = -w; x <= w; x += 7) {
                        pts.push({ x: cx + x, y: by + (Math.random() - 0.5) * 4 });
                    }
                }
                // Base foot
                for (let x = -barW * 0.5; x <= barW * 0.5; x += 7) {
                    pts.push({ x: cx + x, y: bottom + (Math.random() - 0.5) * 4 });
                }
                return pts;
            }

            class ForgeSpark {
                constructor(i) {
                    this.target = targets[i % targets.length] || { x: width / 2, y: height / 2 };
                    this.x = width * 0.5 + (Math.random() - 0.5) * width * 0.4;
                    this.y = height * 0.9 + Math.random() * height * 0.1;
                    this.vx = 0;
                    this.vy = 0;
                    this.size = 0.8 + Math.random() * 2.2;
                    this.settled = 0; // 0..1 how fully it has taken its place
                    this.hue = Math.random() < 0.5 ? '255, 196, 110' : '255, 226, 160';
                }

                update() {
                    if (phase === 'assemble' || phase === 'hold') {
                        // Seek the assigned point in the form
                        const dx = this.target.x - this.x;
                        const dy = this.target.y - this.y;
                        this.vx += dx * 0.012;
                        this.vy += dy * 0.012;
                        this.vx *= 0.86;
                        this.vy *= 0.86;
                        this.settled = Math.min(1, this.settled + 0.02);
                    } else {
                        // Scatter: flung back into the forge
                        this.vx += (Math.random() - 0.5) * 1.6;
                        this.vy += Math.random() * 1.2 + 0.4;
                        this.vx *= 0.98;
                        this.vy *= 0.98;
                        this.settled = Math.max(0, this.settled - 0.04);
                        if (this.y > height + 30) {
                            this.x = width * 0.5 + (Math.random() - 0.5) * width * 0.4;
                            this.y = height + 10;
                            this.vx = 0;
                            this.vy = -(2 + Math.random() * 4);
                        }
                    }
                    this.x += this.vx;
                    this.y += this.vy;
                }

                draw() {
                    const glow = phase === 'hold' ? 0.35 + this.settled * 0.5 : 0.55;
                    ctx.save();
                    ctx.globalAlpha = glow;
                    ctx.fillStyle = `rgba(${this.hue}, 1)`;
                    ctx.shadowBlur = 6 + this.settled * 8;
                    ctx.shadowColor = `rgba(${this.hue}, 0.9)`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * (0.8 + this.settled * 0.4), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Free embers rising off the forge floor, indifferent to the work
            class Ember {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.x = Math.random() * width;
                    this.y = scatter ? Math.random() * height : height + 8;
                    this.vy = -(0.5 + Math.random() * 1.4);
                    this.vx = (Math.random() - 0.5) * 0.6;
                    this.size = 0.6 + Math.random() * 1.8;
                    this.life = 1;
                    this.decay = 0.003 + Math.random() * 0.006;
                }

                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.life -= this.decay;
                    if (this.life <= 0 || this.y < -8) this.reset(false);
                }

                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.life * 0.5;
                    ctx.fillStyle = '#FF9E54';
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#FF8E44';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // When the form holds, trace its lines in light
            function drawFormTracery(strength) {
                if (strength <= 0.01 || targets.length === 0) return;
                ctx.save();
                ctx.globalAlpha = strength * 0.30;
                ctx.strokeStyle = '#FFE4AE';
                ctx.lineWidth = 1;
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(255, 220, 150, 0.8)';
                ctx.beginPath();
                // Connect near-neighbour targets cheaply: every 6th consecutive pair
                for (let i = 0; i + 6 < targets.length; i += 6) {
                    ctx.moveTo(targets[i].x, targets[i].y);
                    ctx.lineTo(targets[i + 6].x, targets[i + 6].y);
                }
                ctx.stroke();
                ctx.restore();
            }

            function drawForgeGlow(t) {
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.002);
                const gy = height * 0.92;
                const g = ctx.createRadialGradient(width * 0.5, gy, 0, width * 0.5, gy, width * 0.5);
                g.addColorStop(0, `rgba(255, 130, 50, ${0.16 + pulse * 0.08})`);
                g.addColorStop(0.5, 'rgba(200, 80, 30, 0.07)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.fillRect(0, gy - height * 0.4, width, height * 0.5);
            }

            resize();
            for (let i = 0; i < 220; i++) sparks.push(new ForgeSpark(i));
            for (let i = 0; i < 60; i++) embers.push(new Ember());

            window.addEventListener('resize', resize);

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                ctx.clearRect(0, 0, width, height);

                // Phase machine
                phaseT++;
                if (phase === 'assemble' && phaseT > 300) { phase = 'hold'; phaseT = 0; }
                else if (phase === 'hold' && phaseT > 220) { phase = 'scatter'; phaseT = 0; }
                else if (phase === 'scatter' && phaseT > 140) { phase = 'assemble'; phaseT = 0; }

                // Workshop night ambience
                const amb = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
                amb.addColorStop(0, 'rgba(52, 34, 26, 0.12)');
                amb.addColorStop(0.6, 'rgba(28, 22, 30, 0.06)');
                amb.addColorStop(1, 'transparent');
                ctx.fillStyle = amb;
                ctx.fillRect(0, 0, width, height);

                drawForgeGlow(t);

                const holdStrength = phase === 'hold' ? Math.min(1, phaseT / 60)
                    : phase === 'scatter' ? Math.max(0, 1 - phaseT / 40) : 0;
                drawFormTracery(holdStrength);

                embers.forEach(e => { e.update(); e.draw(); });
                sparks.forEach(s => { s.update(); s.draw(); });

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

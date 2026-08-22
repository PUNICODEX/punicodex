/**
 * KA — The Vital Essence
 * Twin raised arms of living energy, looping the breath of life.
 * Interactive Layer: Vitalloops Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Vitalloops Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('vitalloops-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let streams = [];
            let loopParticles = [];
            let pulses = [];
            let running = true;
            let lastPulse = 0;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            // Anchor geometry for the two raised arms
            function armAnchors() {
                const cx = width * 0.5;
                const baseY = height * 0.78;
                const gap = Math.min(width, height) * 0.16;
                return {
                    left: { x: cx - gap, baseY: baseY },
                    right: { x: cx + gap, baseY: baseY },
                    topY: height * 0.22
                };
            }

            // Parametric path of one arm: vertical rise, elbow bend outward at top
            function armPoint(side, t01, anchors) {
                const a = side === 'left' ? anchors.left : anchors.right;
                const dir = side === 'left' ? -1 : 1;
                const y = a.baseY - (a.baseY - anchors.topY) * t01;
                // Bend outward near the top like a raised forearm
                const bend = Math.pow(Math.max(0, t01 - 0.72) / 0.28, 2) * dir * Math.min(width, height) * 0.07;
                return { x: a.x + bend, y: y };
            }

            // ── Arm stream particle: rises along the arm path, glows, reborn ──
            class StreamParticle {
                constructor(side) {
                    this.side = side;
                    this.t = Math.random();
                    this.speed = 0.0018 + Math.random() * 0.0022;
                    this.jitter = (Math.random() - 0.5) * 8;
                    this.size = 0.8 + Math.random() * 2.2;
                    this.warm = Math.random() < 0.6;
                }

                update() {
                    this.t += this.speed;
                    if (this.t > 1) this.t = 0;
                }

                draw(anchors, time) {
                    const p = armPoint(this.side, this.t, anchors);
                    const wobble = Math.sin(time * 0.004 + this.t * 20) * 3;
                    const alpha = Math.sin(this.t * Math.PI) * 0.65;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.warm ? '#FFD88E' : '#9FD4F0';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = this.warm ? '#FFCE6E' : '#8EC8EE';
                    ctx.beginPath();
                    ctx.arc(p.x + this.jitter + wobble, p.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // ── Energy loop particle: traces a lemniscate between the arms ──
            class LoopParticle {
                constructor(i) {
                    this.theta = (i / 44) * Math.PI * 2;
                    this.speed = 0.0035 + Math.random() * 0.002;
                    this.size = 0.9 + Math.random() * 1.8;
                    this.hue = Math.random() < 0.5 ? '255, 216, 142' : '150, 210, 240';
                }

                update() {
                    this.theta += this.speed;
                }

                draw(anchors) {
                    // Lemniscate of Bernoulli centred between the arm tops
                    const cx = (anchors.left.x + anchors.right.x) / 2;
                    const cy = anchors.topY + Math.min(width, height) * 0.05;
                    const scale = Math.min(width, height) * 0.13;
                    const s = Math.sin(this.theta);
                    const c = Math.cos(this.theta);
                    const denom = 1 + s * s;
                    const x = cx + (scale * c) / denom;
                    const y = cy + (scale * s * c) / denom * 0.9;

                    ctx.save();
                    ctx.globalAlpha = 0.55;
                    ctx.fillStyle = `rgba(${this.hue}, 1)`;
                    ctx.shadowBlur = 7;
                    ctx.shadowColor = `rgba(${this.hue}, 0.9)`;
                    ctx.beginPath();
                    ctx.arc(x, y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // ── Travelling pulse: a bright wave racing up both arms ──
            class Pulse {
                constructor() {
                    this.t = 0;
                }

                update() {
                    this.t += 0.008;
                    return this.t <= 1;
                }

                draw(anchors) {
                    ['left', 'right'].forEach(side => {
                        const p = armPoint(side, this.t, anchors);
                        const fade = Math.sin(this.t * Math.PI);
                        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
                        g.addColorStop(0, `rgba(255, 240, 200, ${0.5 * fade})`);
                        g.addColorStop(1, 'transparent');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }

            // Faint continuous outline of the twin-arm glyph
            function drawArmGuides(anchors, t) {
                const shimmer = 0.10 + 0.04 * Math.sin(t * 0.0016);
                ctx.save();
                ctx.strokeStyle = `rgba(240, 210, 150, ${shimmer})`;
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ['left', 'right'].forEach(side => {
                    ctx.beginPath();
                    for (let i = 0; i <= 30; i++) {
                        const p = armPoint(side, i / 30, anchors);
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    }
                    ctx.stroke();
                });
                // Horizontal shoulder bar linking the arms
                ctx.beginPath();
                ctx.moveTo(anchors.left.x - Math.min(width, height) * 0.03, anchors.left.baseY);
                ctx.lineTo(anchors.right.x + Math.min(width, height) * 0.03, anchors.right.baseY);
                ctx.stroke();
                ctx.restore();
            }

            resize();
            for (let i = 0; i < 70; i++) {
                streams.push(new StreamParticle(i % 2 === 0 ? 'left' : 'right'));
            }
            for (let i = 0; i < 44; i++) loopParticles.push(new LoopParticle(i));

            window.addEventListener('resize', resize);

            document.addEventListener('visibilitychange', () => {
                running = !document.hidden;
                if (running) requestAnimationFrame(animate);
            });

            function animate(t) {
                if (!running) return;
                ctx.clearRect(0, 0, width, height);

                const anchors = armAnchors();

                // Life-breath ambience
                const cx = width * 0.5;
                const amb = ctx.createRadialGradient(cx, height * 0.5, 0, cx, height * 0.5, Math.max(width, height) * 0.6);
                amb.addColorStop(0, 'rgba(60, 48, 30, 0.12)');
                amb.addColorStop(0.6, 'rgba(30, 28, 44, 0.06)');
                amb.addColorStop(1, 'transparent');
                ctx.fillStyle = amb;
                ctx.fillRect(0, 0, width, height);

                drawArmGuides(anchors, t);

                // Launch a travelling pulse every ~2.6s
                if (t - lastPulse > 2600) {
                    lastPulse = t;
                    pulses.push(new Pulse());
                }
                pulses = pulses.filter(p => {
                    p.draw(anchors);
                    return p.update();
                });

                streams.forEach(s => { s.update(); s.draw(anchors, t); });
                loopParticles.forEach(l => { l.update(); l.draw(anchors); });

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

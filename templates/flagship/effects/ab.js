/**
 * AB — The Heart, Seat of Conscience
 * A pulsing heart weighed on the balance of judgement.
 * Interactive Layer: Heartscale Canvas, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Heartscale Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('heartscale-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let width, height;
            let motes = [];
            let pulseRings = [];
            let frame = 0;
            let running = true;
            let heartbeat = 0;       // 0..1 strength of current beat
            let lastBeat = 0;
            let pointerY = 0.5;

            function resize() {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }

            // Double-thump heartbeat rhythm (lub-dub), ~62 bpm
            function beatPulse(t) {
                if (t - lastBeat < 700) return;
                lastBeat = t;
                heartbeat = 1;
                const cx = width * 0.5;
                const cy = height * 0.42;
                pulseRings.push({ r: 20, opacity: 0.45, speed: 1.6, x: cx, y: cy });
                setTimeout(() => {
                    heartbeat = Math.max(heartbeat, 0.6);
                    pulseRings.push({ r: 16, opacity: 0.3, speed: 1.3, x: cx, y: cy });
                }, 180);
            }

            // Stylised heart path centred at origin, size s
            function heartPath(s) {
                ctx.beginPath();
                ctx.moveTo(0, s * 0.32);
                ctx.bezierCurveTo(-s * 0.62, -s * 0.28, -s * 0.34, -s * 0.78, 0, -s * 0.42);
                ctx.bezierCurveTo(s * 0.34, -s * 0.78, s * 0.62, -s * 0.28, 0, s * 0.32);
                ctx.closePath();
            }

            function drawHeart(cx, cy, t) {
                const base = Math.min(width, height) * 0.075;
                const s = base * (1 + heartbeat * 0.14);

                // Deep inner glow
                const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 3.2);
                glow.addColorStop(0, `rgba(198, 44, 68, ${0.30 + heartbeat * 0.25})`);
                glow.addColorStop(0.5, 'rgba(150, 30, 60, 0.10)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(cx - s * 3.2, cy - s * 3.2, s * 6.4, s * 6.4);

                // Heart body
                ctx.save();
                ctx.translate(cx, cy);
                const body = ctx.createLinearGradient(0, -s, 0, s);
                body.addColorStop(0, 'rgba(232, 96, 110, 0.92)');
                body.addColorStop(0.6, 'rgba(178, 40, 66, 0.92)');
                body.addColorStop(1, 'rgba(120, 20, 44, 0.92)');
                ctx.fillStyle = body;
                ctx.shadowBlur = 26 + heartbeat * 22;
                ctx.shadowColor = 'rgba(220, 70, 90, 0.85)';
                heartPath(s);
                ctx.fill();
                ctx.restore();

                // Gold rim — the heart is weighed, not condemned
                ctx.save();
                ctx.translate(cx, cy);
                ctx.strokeStyle = `rgba(232, 190, 110, ${0.5 + heartbeat * 0.3})`;
                ctx.lineWidth = 1.6;
                heartPath(s);
                ctx.stroke();
                ctx.restore();
            }

            function drawBalance(cx, cy, t) {
                const beamLen = Math.min(width, height) * 0.42;
                const tilt = Math.sin(t * 0.00045) * 0.035 + (pointerY - 0.5) * 0.02;

                // Central pillar
                ctx.save();
                ctx.strokeStyle = 'rgba(210, 180, 120, 0.35)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx, height * 0.92);
                ctx.lineTo(cx, cy + Math.min(width, height) * 0.10);
                ctx.stroke();

                // Pivot ornament
                ctx.fillStyle = 'rgba(232, 200, 130, 0.8)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(232, 200, 130, 0.8)';
                ctx.beginPath();
                ctx.arc(cx, cy + Math.min(width, height) * 0.10, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Beam
                const pivotY = cy + Math.min(width, height) * 0.10;
                const x1 = cx - Math.cos(tilt) * beamLen;
                const y1 = pivotY - Math.sin(tilt) * beamLen;
                const x2 = cx + Math.cos(tilt) * beamLen;
                const y2 = pivotY + Math.sin(tilt) * beamLen;

                ctx.save();
                ctx.strokeStyle = 'rgba(222, 192, 124, 0.55)';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(222, 192, 124, 0.5)';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.restore();

                // Left pan: the heart hangs here
                drawPan(x1, y1, cx, cy, tilt, true);
                // Right pan: the counterweight glow (the feather's place)
                drawPan(x2, y2, cx, cy, tilt, false);
            }

            function drawPan(px, py, cx, cy, tilt, holdsHeart) {
                const drop = Math.min(width, height) * 0.10;
                ctx.save();
                ctx.strokeStyle = 'rgba(210, 180, 120, 0.30)';
                ctx.lineWidth = 1.2;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + i * 12, py + drop);
                    ctx.stroke();
                }
                // Pan dish
                ctx.strokeStyle = 'rgba(222, 192, 124, 0.45)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(px, py + drop, 18, 0.15 * Math.PI, 0.85 * Math.PI);
                ctx.stroke();
                ctx.restore();

                if (!holdsHeart) {
                    // Soft white-gold counterweight shimmer on the empty pan
                    const g = ctx.createRadialGradient(px, py + drop - 6, 0, px, py + drop - 6, 26);
                    g.addColorStop(0, 'rgba(255, 246, 220, 0.35)');
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(px, py + drop - 6, 26, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            class Mote {
                constructor() {
                    this.reset(true);
                }

                reset(scatter) {
                    this.x = Math.random() * width;
                    this.y = scatter ? Math.random() * height : height + 8;
                    this.vy = -(0.15 + Math.random() * 0.4);
                    this.size = 0.5 + Math.random() * 1.6;
                    this.twinkle = Math.random() * Math.PI * 2;
                    this.warm = Math.random() < 0.5;
                }

                update() {
                    this.y += this.vy;
                    if (this.y < -8) this.reset(false);
                }

                draw(t) {
                    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.002 + this.twinkle));
                    ctx.save();
                    ctx.globalAlpha = 0.35 * tw;
                    ctx.fillStyle = this.warm ? '#E8BE6E' : '#E87E8E';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            resize();
            for (let i = 0; i < 80; i++) motes.push(new Mote());

            window.addEventListener('resize', resize);

            if (!window.matchMedia('(pointer: coarse)').matches) {
                window.addEventListener('mousemove', (e) => {
                    pointerY = e.clientY / height;
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

                beatPulse(t);
                heartbeat *= 0.94;

                const cx = width * 0.5;
                const cy = height * 0.42;

                // Judgement-hall ambience
                const hall = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
                hall.addColorStop(0, 'rgba(70, 26, 40, 0.14)');
                hall.addColorStop(0.6, 'rgba(30, 16, 30, 0.08)');
                hall.addColorStop(1, 'transparent');
                ctx.fillStyle = hall;
                ctx.fillRect(0, 0, width, height);

                drawBalance(cx, cy, t);
                drawHeart(cx, cy, t);

                // Expanding pulse rings from the heartbeat
                pulseRings = pulseRings.filter(ring => {
                    ring.r += ring.speed;
                    ring.opacity *= 0.975;
                    if (ring.opacity < 0.01) return false;
                    ctx.save();
                    ctx.strokeStyle = `rgba(226, 110, 120, ${ring.opacity})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    return true;
                });

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

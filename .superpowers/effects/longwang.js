/**
 * LONGWANG FLAGSHIP TEMPLE — DRAGON KING CANVAS & INTERACTIONS
 * Serpentine dragon currents gliding through rain, luminous pearl
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Dragon Currents Canvas ───────────────────────────────────────────── */
    const canvas = document.getElementById('dragonpearl-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let rain = [];
        let dragons = [];
        let droplets = [];
        let paused = false;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class RainDrop {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * -100;
                this.vx = -1.2 + (Math.random() - 0.5) * 0.4;
                this.vy = Math.random() * 7 + 9;
                this.length = Math.random() * 14 + 8;
                this.opacity = Math.random() * 0.25 + 0.08;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y > height + 20 || this.x < -20) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = 'hsl(205, 45%, 72%)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.vx * 1.4, this.y + this.length);
                ctx.stroke();
                ctx.restore();
            }
        }

        class DragonCurrent {
            constructor(index) {
                this.segments = 34;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = 0.55 + Math.random() * 0.35;
                this.baseY = height * (0.24 + index * 0.2);
                this.amplitude = 34 + Math.random() * 30;
                this.freq = 2.2 + Math.random() * 1.2;
                this.bodyWidth = 13 + Math.random() * 5;
                this.hue = 185 + index * 14; // teal → deep azure
                this.direction = index % 2 === 0 ? 1 : -1;
                this.offset = Math.random() * width;
                this.opacity = 0.5 + Math.random() * 0.2;
            }

            spinePoint(i, time) {
                const t = i / this.segments;
                const x = this.direction === 1
                    ? ((this.offset + t * (width + 300) + time * this.speed * 60) % (width + 300)) - 150
                    : width + 150 - ((this.offset + t * (width + 300) + time * this.speed * 60) % (width + 300));
                const y = this.baseY
                    + Math.sin(t * Math.PI * this.freq + this.phase + time * 1.4) * this.amplitude
                    + Math.sin(t * Math.PI * this.freq * 2.3 + time * 2.1) * this.amplitude * 0.25;
                return { x, y };
            }

            draw(time) {
                const pts = [];
                for (let i = 0; i <= this.segments; i++) {
                    pts.push(this.spinePoint(i, time));
                }

                // Watery aura along the body
                ctx.save();
                ctx.globalAlpha = 0.10 * this.opacity;
                ctx.strokeStyle = `hsl(${this.hue}, 70%, 60%)`;
                ctx.lineWidth = this.bodyWidth * 3.4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
                ctx.restore();

                // Tapered body
                for (let i = 1; i < pts.length; i++) {
                    const t = i / this.segments;
                    const taper = Math.sin(t * Math.PI) * 0.85 + 0.15;
                    ctx.save();
                    ctx.globalAlpha = this.opacity * (0.35 + taper * 0.5);
                    ctx.strokeStyle = `hsl(${this.hue}, 65%, ${45 + taper * 18}%)`;
                    ctx.lineWidth = this.bodyWidth * taper;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
                    ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.stroke();
                    ctx.restore();
                }

                // Dorsal shimmer scales
                for (let i = 2; i < pts.length - 2; i += 3) {
                    const p = pts[i];
                    const t = i / this.segments;
                    const taper = Math.sin(t * Math.PI);
                    ctx.save();
                    ctx.globalAlpha = this.opacity * 0.5 * taper;
                    ctx.fillStyle = `hsl(${this.hue + 20}, 80%, 78%)`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - this.bodyWidth * taper * 0.5, 1.6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Head: glow + whiskers at the leading end
                const head = this.direction === 1 ? pts[pts.length - 1] : pts[0];
                const neck = this.direction === 1 ? pts[pts.length - 3] : pts[2];
                const hAng = Math.atan2(head.y - neck.y, head.x - neck.x);
                ctx.save();
                const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, this.bodyWidth * 2.6);
                hg.addColorStop(0, `hsla(${this.hue + 10}, 85%, 72%, ${0.5 * this.opacity})`);
                hg.addColorStop(1, 'transparent');
                ctx.fillStyle = hg;
                ctx.beginPath();
                ctx.arc(head.x, head.y, this.bodyWidth * 2.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `hsla(${this.hue + 15}, 80%, 80%, ${0.6 * this.opacity})`;
                ctx.lineWidth = 1.2;
                for (const side of [-1, 1]) {
                    const wa = hAng + side * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(head.x, head.y);
                    ctx.quadraticCurveTo(
                        head.x + Math.cos(wa) * 22,
                        head.y + Math.sin(wa) * 22 + Math.sin(time * 3) * 4,
                        head.x + Math.cos(wa) * 42,
                        head.y + Math.sin(wa) * 42 + Math.sin(time * 3 + side) * 8
                    );
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        class Droplet {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 1.6;
                this.vy = -(Math.random() * 2 + 0.5);
                this.size = Math.random() * 1.8 + 0.6;
                this.life = Math.random() * 40 + 25;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.08;
                this.life--;
            }

            draw() {
                const alpha = (this.life / this.maxLife) * 0.6;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'hsl(195, 70%, 80%)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawPearl(time) {
            const px = width * 0.5;
            const py = height * 0.46;
            const r = Math.min(width, height) * 0.055 + 18;
            const pulse = 0.85 + Math.sin(time * 1.2) * 0.15;

            // Radiant aura
            const aura = ctx.createRadialGradient(px, py, r * 0.2, px, py, r * 5 * pulse);
            aura.addColorStop(0, `hsla(190, 90%, 80%, ${0.30 * pulse})`);
            aura.addColorStop(0.4, `hsla(200, 80%, 70%, ${0.10 * pulse})`);
            aura.addColorStop(1, 'transparent');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(px, py, r * 5 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Pearl body — iridescent
            const body = ctx.createRadialGradient(px - r * 0.35, py - r * 0.35, 0, px, py, r);
            body.addColorStop(0, 'hsl(180, 60%, 96%)');
            body.addColorStop(0.55, 'hsl(200, 55%, 82%)');
            body.addColorStop(1, 'hsl(215, 50%, 62%)');
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();

            // Travelling sheen
            const sheenX = px + Math.cos(time * 0.8) * r * 0.4;
            const sheenY = py + Math.sin(time * 0.8) * r * 0.4;
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'hsl(160, 80%, 92%)';
            ctx.beginPath();
            ctx.arc(sheenX - r * 0.2, sheenY - r * 0.2, r * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Rising droplets from the pearl
            if (Math.random() < 0.35) {
                droplets.push(new Droplet(px + (Math.random() - 0.5) * r * 2, py + r * 0.6));
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 110; i++) rain.push(new RainDrop());
        for (let i = 0; i < 3; i++) dragons.push(new DragonCurrent(i));

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        let time = 0;

        function animate() {
            if (paused) return;
            time += 0.016;
            ctx.clearRect(0, 0, width, height);

            // Storm-sea gradient wash
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, 'hsla(215, 55%, 10%, 0.07)');
            bg.addColorStop(1, 'hsla(190, 60%, 16%, 0.12)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            dragons.forEach(d => d.draw(time));
            drawPearl(time);
            rain.forEach(r => { r.update(); r.draw(); });

            droplets = droplets.filter(d => d.life > 0);
            droplets.forEach(d => { d.update(); d.draw(); });

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

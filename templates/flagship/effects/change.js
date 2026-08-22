/**
 * CHANG'E FLAGSHIP TEMPLE — MOON PALACE CANVAS & INTERACTIONS
 * Moonlit Guanghan Palace glow, jade rabbit silhouette, osmanthus drift
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Moon Palace Canvas ───────────────────────────────────────────────── */
    const canvas = document.getElementById('moonpalace-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        let petals = [];
        let clouds = [];
        let paused = false;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // Osmanthus blossom sprite atlas (drawn once, blitted many times)
        function makePetalSprite(size, fill, edge) {
            const sprite = document.createElement('canvas');
            sprite.width = size * 2;
            sprite.height = size * 2;
            const sctx = sprite.getContext('2d');
            sctx.translate(size, size);
            for (let i = 0; i < 4; i++) {
                sctx.save();
                sctx.rotate((i / 4) * Math.PI * 2);
                sctx.beginPath();
                sctx.ellipse(0, -size * 0.55, size * 0.32, size * 0.6, 0, 0, Math.PI * 2);
                sctx.fillStyle = fill;
                sctx.fill();
                sctx.strokeStyle = edge;
                sctx.lineWidth = 0.6;
                sctx.stroke();
                sctx.restore();
            }
            sctx.beginPath();
            sctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
            sctx.fillStyle = 'hsla(48, 100%, 70%, 0.95)';
            sctx.fill();
            return sprite;
        }

        const petalSprites = [
            makePetalSprite(9, 'hsla(45, 90%, 72%, 0.85)', 'hsla(40, 80%, 58%, 0.5)'),
            makePetalSprite(7, 'hsla(50, 85%, 78%, 0.8)', 'hsla(44, 75%, 62%, 0.45)'),
            makePetalSprite(6, 'hsla(38, 88%, 66%, 0.75)', 'hsla(34, 75%, 52%, 0.4)')
        ];

        class Star {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.7;
                this.size = Math.random() * 1.4 + 0.3;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = Math.random() * 0.02 + 0.008;
            }

            draw(time) {
                const twinkle = 0.35 + Math.sin(time * this.speed * 60 + this.phase) * 0.3;
                ctx.save();
                ctx.globalAlpha = Math.max(0.05, twinkle);
                ctx.fillStyle = 'hsl(220, 40%, 88%)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class OsmanthusPetal {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = -20 - Math.random() * 60;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = Math.random() * 0.7 + 0.3;
                this.rot = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.02;
                this.scale = Math.random() * 0.7 + 0.5;
                this.sprite = petalSprites[Math.floor(Math.random() * petalSprites.length)];
                this.swayPhase = Math.random() * Math.PI * 2;
                this.opacity = Math.random() * 0.5 + 0.35;
            }

            update(time) {
                this.x += this.vx + Math.sin(time * 0.8 + this.swayPhase) * 0.5;
                this.y += this.vy;
                this.rot += this.rotSpeed;
                if (this.y > height + 30) this.reset();
            }

            draw() {
                const s = this.sprite.width * this.scale * 0.5;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);
                ctx.drawImage(this.sprite, -s, -s, s * 2, s * 2);
                ctx.restore();
            }
        }

        class MoonCloud {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.45;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.radius = Math.random() * 140 + 80;
                this.opacity = Math.random() * 0.05 + 0.02;
            }

            update() {
                this.x += this.vx;
                if (this.x < -this.radius || this.x > width + this.radius) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, 'hsla(225, 45%, 78%, 0.5)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function moonPosition() {
            return { x: width * 0.68, y: height * 0.3, r: Math.min(width, height) * 0.14 };
        }

        function drawMoon(time) {
            const m = moonPosition();

            // Halo
            const halo = ctx.createRadialGradient(m.x, m.y, m.r * 0.4, m.x, m.y, m.r * 4.2);
            halo.addColorStop(0, 'hsla(48, 70%, 82%, 0.30)');
            halo.addColorStop(0.4, 'hsla(48, 55%, 74%, 0.10)');
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r * 4.2, 0, Math.PI * 2);
            ctx.fill();

            // Disc
            const disc = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 0, m.x, m.y, m.r);
            disc.addColorStop(0, 'hsl(48, 60%, 94%)');
            disc.addColorStop(0.75, 'hsl(46, 45%, 84%)');
            disc.addColorStop(1, 'hsl(44, 38%, 74%)');
            ctx.fillStyle = disc;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();

            // Maria shading
            ctx.save();
            ctx.globalAlpha = 0.10;
            ctx.fillStyle = 'hsl(220, 20%, 40%)';
            [[-0.25, -0.1, 0.32], [0.2, 0.25, 0.24], [0.05, -0.35, 0.18]].forEach(([dx, dy, dr]) => {
                ctx.beginPath();
                ctx.arc(m.x + dx * m.r, m.y + dy * m.r, dr * m.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Guanghan Palace silhouette on the moon (tiered roofs)
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = 'hsl(222, 30%, 32%)';
            const px = m.x - m.r * 0.32;
            const py = m.y + m.r * 0.42;
            const u = m.r * 0.09;
            ctx.beginPath();
            // base hall
            ctx.rect(px, py - u * 2.2, u * 6, u * 2.2);
            // lower roof
            ctx.moveTo(px - u * 0.9, py - u * 2.2);
            ctx.quadraticCurveTo(px + u * 3, py - u * 3.6, px + u * 6.9, py - u * 2.2);
            ctx.lineTo(px + u * 6, py - u * 2.2);
            ctx.lineTo(px, py - u * 2.2);
            // upper hall
            ctx.rect(px + u * 1.2, py - u * 4.1, u * 3.6, u * 1.1);
            // upper roof
            ctx.moveTo(px + u * 0.6, py - u * 4.1);
            ctx.quadraticCurveTo(px + u * 3, py - u * 5.3, px + u * 5.4, py - u * 4.1);
            ctx.closePath();
            ctx.fill();

            // Jade rabbit silhouette beside the palace
            const rx = m.x + m.r * 0.28;
            const ry = m.y + m.r * 0.40;
            const ru = m.r * 0.10;
            ctx.beginPath();
            // body
            ctx.ellipse(rx, ry - ru * 0.6, ru * 0.9, ru * 1.05, -0.15, 0, Math.PI * 2);
            // head
            ctx.ellipse(rx + ru * 0.1, ry - ru * 1.7, ru * 0.55, ru * 0.5, 0, 0, Math.PI * 2);
            // ears
            ctx.ellipse(rx - ru * 0.15, ry - ru * 2.6, ru * 0.16, ru * 0.75, -0.25, 0, Math.PI * 2);
            ctx.ellipse(rx + ru * 0.35, ry - ru * 2.55, ru * 0.16, ru * 0.7, 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Osmanthus tree glow drifting across the moon face
            const shimmer = 0.04 + Math.sin(time * 0.5) * 0.02;
            ctx.save();
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = 'hsl(46, 90%, 70%)';
            ctx.beginPath();
            ctx.arc(m.x - m.r * 0.1, m.y + m.r * 0.1, m.r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Initialize
        resize();
        for (let i = 0; i < 90; i++) stars.push(new Star());
        for (let i = 0; i < 70; i++) {
            const petal = new OsmanthusPetal();
            petal.y = Math.random() * height;
            petals.push(petal);
        }
        for (let i = 0; i < 5; i++) clouds.push(new MoonCloud());

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

            // Cool night gradient wash
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, 'hsla(230, 45%, 10%, 0.06)');
            bg.addColorStop(1, 'hsla(260, 40%, 14%, 0.10)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            stars.forEach(s => s.draw(time));
            clouds.forEach(c => { c.update(); c.draw(); });
            drawMoon(time);
            petals.forEach(p => { p.update(time); p.draw(); });

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

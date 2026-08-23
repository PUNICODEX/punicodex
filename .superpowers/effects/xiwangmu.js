/**
 * XIWANGMU FLAGSHIP TEMPLE — PEACH BLOSSOM CANVAS & INTERACTIONS
 * Peach-blossom petals adrift before the western glow of Kunlun
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Peach Blossom Canvas ─────────────────────────────────────────────── */
    const canvas = document.getElementById('peachbloom-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let petals = [];
        let motes = [];
        let paused = false;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            if (typeof buildPeachTree === 'function') buildPeachTree();
        }

        // Peach petal sprite atlas (drawn once, blitted many times)
        function makePetalSprite(size, fill, blush) {
            const sprite = document.createElement('canvas');
            sprite.width = size * 2;
            sprite.height = size * 2;
            const sctx = sprite.getContext('2d');
            sctx.translate(size, size);

            // Five-petal blossom
            for (let i = 0; i < 5; i++) {
                sctx.save();
                sctx.rotate((i / 5) * Math.PI * 2);
                const grad = sctx.createRadialGradient(0, 0, 0, 0, -size * 0.5, size * 0.75);
                grad.addColorStop(0, fill);
                grad.addColorStop(1, blush);
                sctx.beginPath();
                sctx.ellipse(0, -size * 0.48, size * 0.34, size * 0.55, 0, 0, Math.PI * 2);
                sctx.fillStyle = grad;
                sctx.fill();
                sctx.restore();
            }
            // Stamen cluster
            sctx.fillStyle = 'hsla(46, 95%, 68%, 0.9)';
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                sctx.beginPath();
                sctx.arc(Math.cos(a) * size * 0.12, Math.sin(a) * size * 0.12, size * 0.05, 0, Math.PI * 2);
                sctx.fill();
            }
            return sprite;
        }

        const petalSprites = [
            makePetalSprite(10, 'hsla(350, 85%, 82%, 0.9)', 'hsla(340, 75%, 66%, 0.85)'),
            makePetalSprite(8, 'hsla(355, 80%, 86%, 0.85)', 'hsla(345, 70%, 72%, 0.8)'),
            makePetalSprite(7, 'hsla(345, 88%, 76%, 0.85)', 'hsla(335, 78%, 60%, 0.8)')
        ];

        class Petal {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = -30 - Math.random() * 80;
                this.vx = (Math.random() - 0.5) * 0.6 - 0.25; // drift east, from the west
                this.vy = Math.random() * 0.8 + 0.35;
                this.rot = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.03;
                this.scale = Math.random() * 0.75 + 0.45;
                this.sprite = petalSprites[Math.floor(Math.random() * petalSprites.length)];
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.6 + 0.4;
                this.opacity = Math.random() * 0.45 + 0.4;
            }

            update(time) {
                this.x += this.vx + Math.sin(time * this.swaySpeed + this.swayPhase) * 0.7;
                this.y += this.vy;
                this.rot += this.rotSpeed;
                if (this.y > height + 40 || this.x < -60 || this.x > width + 60) this.reset();
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

        class LightMote {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.4;
                this.phase = Math.random() * Math.PI * 2;
                this.speed = Math.random() * 0.5 + 0.2;
                this.vy = -(Math.random() * 0.25 + 0.05);
            }

            update(time) {
                this.y += this.vy;
                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
            }

            draw(time) {
                const twinkle = 0.3 + Math.sin(time * this.speed * 2 + this.phase) * 0.25;
                ctx.save();
                ctx.globalAlpha = Math.max(0.04, twinkle);
                ctx.fillStyle = 'hsl(40, 85%, 78%)';
                ctx.shadowBlur = 6;
                ctx.shadowColor = 'hsl(40, 85%, 70%)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawWesternGlow(time) {
            // Kunlun sunset: a low radiant bloom on the western horizon
            const gx = width * 0.16;
            const gy = height * 0.58;
            const gr = Math.min(width, height) * 0.55;
            const pulse = 0.9 + Math.sin(time * 0.4) * 0.1;

            const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * pulse);
            glow.addColorStop(0, 'hsla(36, 95%, 68%, 0.22)');
            glow.addColorStop(0.35, 'hsla(24, 85%, 60%, 0.12)');
            glow.addColorStop(0.7, 'hsla(340, 60%, 50%, 0.05)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        }

        function drawKunlun() {
            // Layered mountain silhouettes rising out of the glow
            const base = height * 0.92;
            const ranges = [
                { h: 0.30, alpha: 0.10, hue: 'hsla(330, 35%, 22%, ', peaks: 5, off: 0 },
                { h: 0.22, alpha: 0.14, hue: 'hsla(320, 40%, 18%, ', peaks: 4, off: 0.4 },
                { h: 0.14, alpha: 0.20, hue: 'hsla(310, 45%, 14%, ', peaks: 6, off: 0.8 }
            ];

            ranges.forEach(range => {
                ctx.save();
                ctx.fillStyle = `${range.hue}${range.alpha})`;
                ctx.beginPath();
                ctx.moveTo(-20, base);
                for (let i = 0; i <= range.peaks; i++) {
                    const t = i / range.peaks;
                    const x = t * (width + 40) - 20;
                    const peakY = base - height * range.h * (0.5 + Math.abs(Math.sin((t + range.off) * 6.3)) * 0.5);
                    ctx.lineTo(x, peakY);
                    ctx.lineTo(x + (width + 40) / range.peaks / 2, base - height * range.h * 0.3);
                }
                ctx.lineTo(width + 20, base);
                ctx.lineTo(width + 20, height);
                ctx.lineTo(-20, height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }

        // Pre-built bough skeleton (rebuilt on resize so it never jitters)
        let tree = { branches: [], blossoms: [] };

        function buildPeachTree() {
            const rootX = width * 0.94;
            const rootY = height * 0.30;
            tree = { branches: [], blossoms: [] };

            function branch(x, y, angle, len, depth) {
                if (depth <= 0 || len < 8) {
                    if (Math.random() < 0.7) {
                        tree.blossoms.push({
                            x, y,
                            sprite: petalSprites[Math.floor(Math.random() * petalSprites.length)],
                            phase: Math.random() * Math.PI * 2,
                            scale: 0.45 + Math.random() * 0.25
                        });
                    }
                    return;
                }
                const ex = x + Math.cos(angle) * len;
                const ey = y + Math.sin(angle) * len;
                tree.branches.push({ x1: x, y1: y, x2: ex, y2: ey, w: depth * 1.8, depth });
                branch(ex, ey, angle - 0.35 - Math.random() * 0.05, len * 0.74, depth - 1);
                branch(ex, ey, angle + 0.30 + Math.random() * 0.05, len * 0.72, depth - 1);
            }

            branch(rootX, rootY, Math.PI * 0.94, height * 0.13, 5);
        }

        function drawPeachTree(time) {
            // Blossoming bough reaching in from the east
            ctx.save();
            ctx.strokeStyle = 'hsla(20, 40%, 26%, 0.55)';
            ctx.lineCap = 'round';

            tree.branches.forEach(b => {
                const sway = Math.sin(time * 0.7 + b.depth) * 2 * (b.x2 - b.x1 === 0 ? 0 : 1);
                ctx.lineWidth = b.w;
                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1);
                ctx.lineTo(b.x2 + sway * 0.3, b.y2);
                ctx.stroke();
            });

            tree.blossoms.forEach(bl => {
                const s = bl.sprite.width * bl.scale;
                ctx.save();
                ctx.globalAlpha = 0.75;
                ctx.translate(bl.x, bl.y);
                ctx.rotate(Math.sin(time + bl.phase) * 0.12);
                ctx.drawImage(bl.sprite, -s, -s, s * 2, s * 2);
                ctx.restore();
            });
            ctx.restore();
        }

        // Initialize
        resize();
        for (let i = 0; i < 90; i++) {
            const petal = new Petal();
            petal.y = Math.random() * height;
            petals.push(petal);
        }
        for (let i = 0; i < 50; i++) motes.push(new LightMote());

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

            // Dusk gradient wash
            const bg = ctx.createLinearGradient(0, 0, width, height);
            bg.addColorStop(0, 'hsla(280, 35%, 12%, 0.06)');
            bg.addColorStop(1, 'hsla(330, 45%, 16%, 0.10)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            drawWesternGlow(time);
            drawKunlun();
            motes.forEach(m => { m.update(time); m.draw(time); });
            drawPeachTree(time);
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

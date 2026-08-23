/**
 * PERKŪNAS FLAGSHIP TEMPLE — OAK-STORM CANVAS
 * Oak-splitting lightning + drifting rain veils — the Baltic thunderer
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Oak-Storm Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('oakstorm-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let bolts = [];
        let rain = [];
        let veils = [];
        let oakSprite = null;
        let frameCount = 0;
        let running = true;
        let flash = 0;

        const PALETTE = {
            bolt: { r: 240, g: 232, b: 200 },
            boltCore: { r: 255, g: 252, b: 240 },
            storm: { r: 74, g: 85, b: 104 },
            rain: { r: 168, g: 190, b: 210 },
            oak: { r: 20, g: 28, b: 22 },
            leaf: { r: 74, g: 110, b: 66 }
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildOak();
        }

        // ── Procedural oak silhouette ───────────────────────────────────────
        // Rendered once per resize into an offscreen sprite: a dark sacred
        // oak rooted at the right of the hero, waiting for the strike.
        function buildOak() {
            oakSprite = document.createElement('canvas');
            oakSprite.width = Math.max(2, Math.floor(width * 0.4));
            oakSprite.height = Math.max(2, Math.floor(height * 0.75));
            const octx = oakSprite.getContext('2d');
            const rootX = oakSprite.width * 0.5;
            const rootY = oakSprite.height;

            function branch(x, y, angle, length, thickness, depth) {
                if (depth <= 0 || length < 6) return;
                const endX = x + Math.cos(angle) * length;
                const endY = y + Math.sin(angle) * length;
                octx.strokeStyle = `rgba(${PALETTE.oak.r}, ${PALETTE.oak.g}, ${PALETTE.oak.b}, ${0.75 + depth * 0.03})`;
                octx.lineWidth = thickness;
                octx.lineCap = 'round';
                octx.beginPath();
                octx.moveTo(x, y);
                octx.lineTo(endX, endY);
                octx.stroke();

                // Leaf clusters at the outer twigs
                if (depth <= 2) {
                    octx.save();
                    octx.globalAlpha = 0.16;
                    octx.fillStyle = `rgb(${PALETTE.leaf.r}, ${PALETTE.leaf.g}, ${PALETTE.leaf.b})`;
                    octx.beginPath();
                    octx.arc(endX, endY, length * 0.5, 0, Math.PI * 2);
                    octx.fill();
                    octx.restore();
                }

                const splits = 2 + (Math.random() < 0.35 ? 1 : 0);
                for (let i = 0; i < splits; i++) {
                    const spread = (Math.random() - 0.5) * 1.1;
                    branch(
                        endX,
                        endY,
                        angle + spread,
                        length * (0.62 + Math.random() * 0.14),
                        thickness * 0.62,
                        depth - 1
                    );
                }
            }

            branch(rootX, rootY, -Math.PI / 2, oakSprite.height * 0.24, oakSprite.width * 0.045, 6);
        }

        // ── Lightning: strikes the oak's crown ──────────────────────────────
        class Bolt {
            constructor() {
                this.reset(true);
            }

            reset(stagger) {
                this.active = false;
                this.cooldown = stagger ? Math.random() * 400 + 150 : Math.random() * 320 + 220;
                this.segments = [];
                this.opacity = 0;
            }

            trigger() {
                this.active = true;
                this.opacity = 1;
                flash = 0.14 + Math.random() * 0.1;
                this.segments = [];

                // Aim at the oak crown (right side, upper half)
                let x = width * (0.72 + Math.random() * 0.16);
                let y = -10;
                const targetX = width * 0.8 + (Math.random() - 0.5) * width * 0.08;
                const targetY = height * (0.3 + Math.random() * 0.25);

                while (y < targetY) {
                    const pull = (targetX - x) * 0.12;
                    const nextX = x + (Math.random() - 0.5) * 55 + pull;
                    const nextY = y + Math.random() * 26 + 14;
                    this.segments.push({ x1: x, y1: y, x2: nextX, y2: nextY, branch: false });

                    if (Math.random() < 0.22) {
                        let bx = nextX;
                        let by = nextY;
                        const branchLen = 2 + Math.floor(Math.random() * 3);
                        for (let i = 0; i < branchLen; i++) {
                            const bnx = bx + (Math.random() - 0.5) * 46;
                            const bny = by + Math.random() * 18 + 8;
                            this.segments.push({ x1: bx, y1: by, x2: bnx, y2: bny, branch: true });
                            bx = bnx;
                            by = bny;
                        }
                    }

                    x = nextX;
                    y = nextY;
                }

                // Crown impact point — flares while the bolt lives
                this.impactX = x;
                this.impactY = y;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) this.trigger();
                    return;
                }
                this.opacity -= 0.07;
                if (this.opacity <= 0) {
                    this.reset(false);
                }
            }

            draw() {
                if (!this.active) return;
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.opacity);
                ctx.strokeStyle = `rgb(${PALETTE.bolt.r}, ${PALETTE.bolt.g}, ${PALETTE.bolt.b})`;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 18;
                ctx.shadowColor = `rgba(${PALETTE.bolt.r}, ${PALETTE.bolt.g}, ${PALETTE.bolt.b}, 0.9)`;
                this.segments.forEach(seg => {
                    ctx.lineWidth = seg.branch ? 1 : 3;
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.stroke();
                });
                // White-hot core on the main stroke
                ctx.shadowBlur = 0;
                ctx.strokeStyle = `rgba(${PALETTE.boltCore.r}, ${PALETTE.boltCore.g}, ${PALETTE.boltCore.b}, ${0.7 * this.opacity})`;
                this.segments.forEach(seg => {
                    if (seg.branch) return;
                    ctx.lineWidth = 1.1;
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.stroke();
                });
                // Crown impact flare where the strike splits the oak
                const glow = ctx.createRadialGradient(this.impactX, this.impactY, 0, this.impactX, this.impactY, 70);
                glow.addColorStop(0, `rgba(${PALETTE.boltCore.r}, ${PALETTE.boltCore.g}, ${PALETTE.boltCore.b}, ${0.5 * this.opacity})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(this.impactX, this.impactY, 70, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Fine rain streaks
        class RainDrop {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * (width + 200) - 100;
                this.y = scatter ? Math.random() * height : -20;
                this.vx = 1.6 + Math.random() * 0.8; // wind-swept, always the same way
                this.vy = Math.random() * 6 + 9;
                this.length = Math.random() * 14 + 8;
                this.opacity = Math.random() * 0.22 + 0.06;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y > height + 20) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = `rgb(${PALETTE.rain.r}, ${PALETTE.rain.g}, ${PALETTE.rain.b})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.vx * (this.length / this.vy), this.y + this.length);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Rain veils: broad translucent sheets drifting across the hero,
        // the storm's curtains between the strikes
        class RainVeil {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -width * 0.35;
                this.width = Math.random() * width * 0.18 + width * 0.1;
                this.vx = Math.random() * 0.5 + 0.25;
                this.opacity = Math.random() * 0.05 + 0.025;
                this.slant = 0.06 + Math.random() * 0.05;
            }

            update() {
                this.x += this.vx;
                if (this.x > width + this.width) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const grad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, `rgba(${PALETTE.rain.r}, ${PALETTE.rain.g}, ${PALETTE.rain.b}, 0.8)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(this.x, 0);
                ctx.lineTo(this.x + this.width, 0);
                ctx.lineTo(this.x + this.width + height * this.slant, height);
                ctx.lineTo(this.x + height * this.slant, height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        function initSystems() {
            bolts = [];
            rain = [];
            veils = [];
            for (let i = 0; i < 2; i++) bolts.push(new Bolt());
            const rainCount = Math.min(160, Math.floor(width / 8));
            for (let i = 0; i < rainCount; i++) rain.push(new RainDrop());
            for (let i = 0; i < 4; i++) veils.push(new RainVeil());
        }

        resize();
        initSystems();
        window.addEventListener('resize', () => {
            resize();
            initSystems();
        });        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Brooding storm-sky ambience
            const sky = ctx.createRadialGradient(width * 0.7, 0, 0, width * 0.7, height * 0.2, Math.max(width, height) * 0.7);
            sky.addColorStop(0, `rgba(${PALETTE.storm.r}, ${PALETTE.storm.g}, ${PALETTE.storm.b}, 0.14)`);
            sky.addColorStop(1, 'transparent');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // The sacred oak, right of the hero
            if (oakSprite) {
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.drawImage(oakSprite, width * 0.6, height - oakSprite.height + 10);
                ctx.restore();
            }

            // Rain veils behind the fine rain
            veils.forEach(v => { v.update(); v.draw(); });
            rain.forEach(r => { r.update(); r.draw(); });

            // Lightning and strike flash
            if (flash > 0) {
                ctx.fillStyle = `rgba(${PALETTE.boltCore.r}, ${PALETTE.boltCore.g}, ${PALETTE.boltCore.b}, ${flash})`;
                ctx.fillRect(0, 0, width, height);
                flash *= 0.82;
                if (flash < 0.005) flash = 0;
            }

            bolts.forEach(b => { b.update(); b.draw(); });

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

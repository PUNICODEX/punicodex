/**
 * BÚRI FLAGSHIP TEMPLE — THAW CANVAS
 * Ice crystals melting into divine light — the first god freed from the rime
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Thaw Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('thaw-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let crystals = [];
        let droplets = [];
        let motes = [];
        let frameCount = 0;
        let running = true;

        const PALETTE = {
            ice: { r: 168, g: 216, b: 240 },
            deepIce: { r: 58, g: 106, b: 138 },
            frost: { r: 224, g: 242, b: 252 },
            gold: { r: 240, g: 208, b: 138 }
        };

        const pointer = { x: -9999, y: -9999 };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function lerp(a, b, t) {
            return a + (b - a) * t;
        }

        // A rime crystal anchored to the base of the hero. Its melt level
        // breathes on a long cycle — as it melts it feeds the divine light.
        class Crystal {
            constructor(x, baseY, size) {
                this.x = x;
                this.baseY = baseY;
                this.size = size;
                this.phase = Math.random() * Math.PI * 2;
                this.facets = [];
                // Pre-compute facet geometry once; melt only scales it
                const sides = 5 + Math.floor(Math.random() * 2);
                for (let i = 0; i < sides; i++) {
                    const angle = -Math.PI / 2 + (i - (sides - 1) / 2) * (Math.PI / (sides + 1));
                    this.facets.push({
                        angle: angle,
                        length: size * (0.6 + Math.random() * 0.5),
                        lean: (Math.random() - 0.5) * 0.3
                    });
                }
            }

            meltLevel() {
                return 0.5 + Math.sin(frameCount * 0.006 + this.phase) * 0.5;
            }

            draw() {
                const melt = this.meltLevel();
                const solid = 1 - melt * 0.45; // crystals never vanish — they breathe

                // Under-glow: warm light seeping from beneath the melting ice
                if (melt > 0.5) {
                    ctx.save();
                    ctx.globalAlpha = (melt - 0.5) * 0.35;
                    const glow = ctx.createRadialGradient(this.x, this.baseY, 0, this.x, this.baseY, this.size * 2.2);
                    glow.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.5)`);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(this.x, this.baseY, this.size * 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Facets
                ctx.save();
                this.facets.forEach(f => {
                    const len = f.length * solid;
                    const tipX = this.x + Math.cos(f.angle + f.lean) * len;
                    const tipY = this.baseY + Math.sin(f.angle + f.lean) * len;

                    // Facet body
                    ctx.globalAlpha = 0.35 + solid * 0.25;
                    const grad = ctx.createLinearGradient(this.x, this.baseY, tipX, tipY);
                    grad.addColorStop(0, `rgba(${PALETTE.deepIce.r}, ${PALETTE.deepIce.g}, ${PALETTE.deepIce.b}, 0.6)`);
                    grad.addColorStop(0.7, `rgba(${PALETTE.ice.r}, ${PALETTE.ice.g}, ${PALETTE.ice.b}, 0.5)`);
                    grad.addColorStop(1, `rgba(${PALETTE.frost.r}, ${PALETTE.frost.g}, ${PALETTE.frost.b}, 0.8)`);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = this.size * 0.09;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.baseY);
                    ctx.lineTo(tipX, tipY);
                    ctx.stroke();

                    // Frost glint at the tip
                    ctx.globalAlpha = 0.5 * solid;
                    ctx.fillStyle = `rgb(${PALETTE.frost.r}, ${PALETTE.frost.g}, ${PALETTE.frost.b})`;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = `rgba(${PALETTE.frost.r}, ${PALETTE.frost.g}, ${PALETTE.frost.b}, 0.9)`;
                    ctx.beginPath();
                    ctx.arc(tipX, tipY, this.size * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });
                ctx.restore();
            }
        }

        // Meltwater droplets: fall a short way, then catch the light and rise
        class Droplet {
            constructor(crystal) {
                this.x = crystal.x + (Math.random() - 0.5) * crystal.size * 0.6;
                this.y = crystal.baseY - Math.random() * crystal.size * 0.4;
                this.vy = Math.random() * 0.5 + 0.3;
                this.size = Math.random() * 1.6 + 0.8;
                this.state = 'fall';
                this.opacity = 0.7;
            }

            update() {
                if (this.state === 'fall') {
                    this.y += this.vy;
                    if (this.y >= height - 2) {
                        this.state = 'rise';
                        this.vy = -(Math.random() * 0.5 + 0.25);
                    }
                } else {
                    this.y += this.vy;
                    this.opacity *= 0.985;
                }
                return this.opacity > 0.05 && this.y > -10;
            }

            draw() {
                const warm = this.state === 'rise';
                const c = warm ? PALETTE.gold : PALETTE.ice;
                ctx.save();
                ctx.globalAlpha = this.opacity * (warm ? 0.8 : 0.5);
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.shadowBlur = warm ? 8 : 4;
                ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Divine light motes: born cold near the crystals, warming to gold
        // as they rise into the upper hero — the ice becoming the god.
        class LightMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height - Math.random() * 60;
                this.vy = -(Math.random() * 0.45 + 0.15);
                this.vx = (Math.random() - 0.5) * 0.15;
                this.size = Math.random() * 1.8 + 0.5;
                this.opacity = Math.random() * 0.45 + 0.15;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                this.x += this.vx + Math.sin(frameCount * 0.012 + this.phase) * 0.08;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                // Warmth is a function of altitude: ice at the base, gold above
                const t = Math.max(0, Math.min(1, 1 - this.y / height));
                const r = Math.floor(lerp(PALETTE.ice.r, PALETTE.gold.r, t));
                const g = Math.floor(lerp(PALETTE.ice.g, PALETTE.gold.g, t));
                const b = Math.floor(lerp(PALETTE.ice.b, PALETTE.gold.b, t));
                const twinkle = 0.7 + Math.sin(frameCount * 0.05 + this.phase) * 0.3;

                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.shadowBlur = 7;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function buildCrystals() {
            crystals = [];
            const count = Math.min(9, Math.max(5, Math.floor(width / 220)));
            for (let i = 0; i < count; i++) {
                const x = width * (0.08 + (i / (count - 1)) * 0.84) + (Math.random() - 0.5) * 40;
                const baseY = height + 6;
                const size = Math.random() * 50 + 55;
                crystals.push(new Crystal(x, baseY, size));
            }
        }

        function initMotes() {
            motes = [];
            const count = Math.min(180, Math.floor(width / 7));
            for (let i = 0; i < count; i++) {
                motes.push(new LightMote());
            }
        }

        resize();
        buildCrystals();
        initMotes();
        window.addEventListener('resize', () => {
            resize();
            buildCrystals();
            initMotes();
        });

        // Warmth from the visitor's touch hastens the thaw locally
        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep rime ambience: cold below, a divine warmth above
            const rime = ctx.createLinearGradient(0, 0, 0, height);
            rime.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.04)`);
            rime.addColorStop(0.6, 'transparent');
            rime.addColorStop(1, `rgba(${PALETTE.deepIce.r}, ${PALETTE.deepIce.g}, ${PALETTE.deepIce.b}, 0.12)`);
            ctx.fillStyle = rime;
            ctx.fillRect(0, 0, width, height);

            // Central emergence glow: the freed god's light, slowly breathing
            const emerge = ctx.createRadialGradient(width / 2, height * 0.32, 0, width / 2, height * 0.32, Math.min(width, height) * 0.5);
            emerge.addColorStop(0, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.10 + Math.sin(frameCount * 0.014) * 0.04})`);
            emerge.addColorStop(1, 'transparent');
            ctx.fillStyle = emerge;
            ctx.fillRect(0, 0, width, height);

            // Crystals and their meltwater
            crystals.forEach(c => {
                c.draw();
                if (c.meltLevel() > 0.6 && Math.random() < 0.03 && droplets.length < 60) {
                    droplets.push(new Droplet(c));
                }
            });

            droplets = droplets.filter(d => {
                d.draw();
                return d.update();
            });

            motes.forEach(m => { m.update(); m.draw(); });

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

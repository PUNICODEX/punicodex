/**
 * AŠA FLAGSHIP TEMPLE — ORDERED FLAME LATTICE CANVAS
 * A lattice of flames that burns in ordered waves — fire that stays true
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Flame Lattice Canvas ─────────────────────────────────────────────── */
    const canvas = document.getElementById('flame-lattice-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let nodes = [];
        let embers = [];
        let frameCount = 0;
        let running = true;

        const PALETTE = {
            flame: { r: 232, g: 106, b: 43 },
            ember: { r: 165, g: 42, b: 26 },
            gold: { r: 240, g: 178, b: 62 },
            ivory: { r: 255, g: 240, b: 210 }
        };

        const pointer = { x: -9999, y: -9999 };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        // One flame in the lattice. Its intensity is a pure function of its
        // grid position and time — the fire moves in ordered waves, never chaos.
        class FlameNode {
            constructor(col, row, x, y) {
                this.col = col;
                this.row = row;
                this.x = x;
                this.y = y;
                this.baseSize = 5 + (row % 3) * 1.5;
                this.boost = 0;
            }

            intensity() {
                // Ordered traveling waves: a slow diagonal front plus a
                // gentle row-wise breathing. Deterministic — the truth of fire.
                const wave = Math.sin(frameCount * 0.02 - this.col * 0.45 - this.row * 0.3);
                const breath = Math.sin(frameCount * 0.008 + this.row * 0.8);
                return 0.45 + (wave * 0.5 + 0.5) * 0.4 + breath * 0.15 + this.boost;
            }

            update() {
                const dx = this.x - pointer.x;
                const dy = this.y - pointer.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140) {
                    this.boost = Math.min(0.6, this.boost + 0.05);
                } else {
                    this.boost *= 0.94;
                }
            }

            draw() {
                const t = Math.max(0.08, Math.min(1.15, this.intensity()));
                const size = this.baseSize * (0.7 + t * 0.6);
                const flick = Math.sin(frameCount * 0.11 + this.col * 1.7 + this.row) * size * 0.08;

                // Flame teardrop: base ember glow + gold body + ivory tip
                ctx.save();
                ctx.globalAlpha = 0.30 * t;
                const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 3);
                glow.addColorStop(0, `rgba(${PALETTE.flame.r}, ${PALETTE.flame.g}, ${PALETTE.flame.b}, 0.55)`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.globalAlpha = 0.55 * t;
                ctx.fillStyle = `rgb(${PALETTE.flame.r}, ${PALETTE.flame.g}, ${PALETTE.flame.b})`;
                ctx.beginPath();
                ctx.moveTo(this.x - size * 0.5, this.y);
                ctx.quadraticCurveTo(this.x - size * 0.45, this.y - size * 0.9, this.x + flick, this.y - size * 1.5);
                ctx.quadraticCurveTo(this.x + size * 0.45, this.y - size * 0.9, this.x + size * 0.5, this.y);
                ctx.closePath();
                ctx.fill();

                ctx.globalAlpha = 0.65 * t;
                ctx.fillStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.beginPath();
                ctx.moveTo(this.x - size * 0.28, this.y);
                ctx.quadraticCurveTo(this.x - size * 0.22, this.y - size * 0.55, this.x + flick * 0.6, this.y - size * 0.95);
                ctx.quadraticCurveTo(this.x + size * 0.22, this.y - size * 0.55, this.x + size * 0.28, this.y);
                ctx.closePath();
                ctx.fill();

                if (t > 0.75) {
                    ctx.globalAlpha = (t - 0.75) * 1.6;
                    ctx.fillStyle = `rgb(${PALETTE.ivory.r}, ${PALETTE.ivory.g}, ${PALETTE.ivory.b})`;
                    ctx.beginPath();
                    ctx.arc(this.x + flick * 0.4, this.y - size * 0.35, size * 0.14, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Embers rise in perfectly straight columns above their lattice node —
        // the flame stays true, so the embers never wander.
        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                const node = nodes.length ? nodes[Math.floor(Math.random() * nodes.length)] : null;
                this.x = node ? node.x : Math.random() * width;
                this.y = scatter ? Math.random() * height : (node ? node.y : height);
                this.vy = -(Math.random() * 0.7 + 0.3);
                this.size = Math.random() * 1.4 + 0.4;
                this.opacity = Math.random() * 0.5 + 0.2;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.y += this.vy;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const fade = Math.min(1, this.y / (height * 0.25));
                ctx.save();
                ctx.globalAlpha = this.opacity * fade * (0.7 + Math.sin(frameCount * 0.08 + this.phase) * 0.3);
                ctx.fillStyle = `rgb(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b})`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = `rgba(${PALETTE.flame.r}, ${PALETTE.flame.g}, ${PALETTE.flame.b}, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function buildLattice() {
            nodes = [];
            const spacing = Math.max(56, Math.floor(width / 24));
            const cols = Math.ceil(width / spacing) + 1;
            const rows = Math.ceil(height / spacing) + 1;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Offset alternate rows: a hexagonal order, not a square one
                    const x = c * spacing + (r % 2 === 0 ? 0 : spacing / 2);
                    const y = r * spacing;
                    nodes.push(new FlameNode(c, r, x, y));
                }
            }
        }

        function initEmbers() {
            embers = [];
            const count = Math.min(160, Math.floor(width / 9));
            for (let i = 0; i < count; i++) {
                embers.push(new Ember());
            }
        }

        resize();
        buildLattice();
        initEmbers();
        window.addEventListener('resize', () => {
            resize();
            buildLattice();
            initEmbers();
        });

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running) requestAnimationFrame(animate);
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Warm hearth-glow rising from the base of the hero
            const hearth = ctx.createLinearGradient(0, height, 0, height * 0.4);
            hearth.addColorStop(0, `rgba(${PALETTE.ember.r}, ${PALETTE.ember.g}, ${PALETTE.ember.b}, 0.10)`);
            hearth.addColorStop(1, 'transparent');
            ctx.fillStyle = hearth;
            ctx.fillRect(0, 0, width, height);

            nodes.forEach(n => { n.update(); n.draw(); });
            embers.forEach(e => { e.update(); e.draw(); });

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

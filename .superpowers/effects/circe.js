/**
 * KÍRKĒ — Sorceress of Aeaea, Mistress of Transformations
 * Shape-shifting orbs morphing between animal-silhouette outlines, potion motes
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Morph Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('morph-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let orbs = [];
        let motes = [];
        let running = true;
        let rafId = null;
        let frameCount = 0;

        const OUTLINE_STEPS = 48;
        const MORPH_FRAMES = 260;
        const HOLD_FRAMES = 160;

        // Animal-hint silhouettes as radial lobe signatures: each preset is a
        // set of { freq, amp, phase } lobes; r(theta) = base * (1 + sum lobes).
        // Impressionistic outlines — heavy low body (pig), wing tips (bird),
        // pointed ears (cat), tail-fin sweep (fish).
        const SHAPES = [
            {   // pig: broad heavy low body, snout bump
                lobes: [
                    { freq: 1, amp: 0.18, phase: Math.PI / 2 },
                    { freq: 2, amp: 0.10, phase: Math.PI / 2 },
                    { freq: 5, amp: 0.05, phase: 0 },
                ],
            },
            {   // bird: wing-tip lobes left and right
                lobes: [
                    { freq: 2, amp: 0.30, phase: 0 },
                    { freq: 3, amp: 0.10, phase: Math.PI },
                    { freq: 7, amp: 0.04, phase: Math.PI / 2 },
                ],
            },
            {   // cat: ear points up, narrow chin
                lobes: [
                    { freq: 2, amp: 0.22, phase: -Math.PI / 2 },
                    { freq: 4, amp: 0.12, phase: -Math.PI / 2 },
                    { freq: 6, amp: 0.05, phase: 0 },
                ],
            },
            {   // fish: lateral fins, forked tail
                lobes: [
                    { freq: 1, amp: 0.28, phase: 0 },
                    { freq: 3, amp: 0.14, phase: Math.PI },
                    { freq: 5, amp: 0.06, phase: Math.PI / 2 },
                ],
            },
        ];

        const PALETTE = [
            { r: 168, g: 120, b: 220 },  // potion violet
            { r: 90, g: 200, b: 160 },   // herb emerald
            { r: 230, g: 190, b: 110 },  // honey gold
        ];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function lerp(a, b, t) {
            return a + (b - a) * t;
        }

        class MorphOrb {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.35;
                this.vy = (Math.random() - 0.5) * 0.35;
                this.baseRadius = 26 + Math.random() * 44;
                this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                this.shapeIndex = Math.floor(Math.random() * SHAPES.length);
                this.nextShapeIndex = (this.shapeIndex + 1) % SHAPES.length;
                this.phase = 'hold';
                this.timer = Math.floor(Math.random() * HOLD_FRAMES);
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.004;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;
                this.pulsePhase += 0.012;

                const margin = this.baseRadius * 1.8;
                if (this.x < -margin) this.x = width + margin;
                if (this.x > width + margin) this.x = -margin;
                if (this.y < -margin) this.y = height + margin;
                if (this.y > height + margin) this.y = -margin;

                this.timer--;
                if (this.timer <= 0) {
                    if (this.phase === 'hold') {
                        this.phase = 'morph';
                        this.timer = MORPH_FRAMES;
                    } else {
                        this.phase = 'hold';
                        this.timer = HOLD_FRAMES;
                        this.shapeIndex = this.nextShapeIndex;
                        this.nextShapeIndex = (this.shapeIndex + 1 + Math.floor(Math.random() * (SHAPES.length - 1))) % SHAPES.length;
                    }
                }
            }

            morphT() {
                if (this.phase !== 'morph') return 0;
                const raw = 1 - this.timer / MORPH_FRAMES;
                // ease in-out so the transformation breathes rather than snaps
                return raw * raw * (3 - 2 * raw);
            }

            radiusAt(theta) {
                const t = this.morphT();
                const from = SHAPES[this.shapeIndex].lobes;
                const to = SHAPES[this.nextShapeIndex].lobes;
                let r = 1;
                for (let i = 0; i < 3; i++) {
                    const a = from[i];
                    const b = to[i];
                    const freq = lerp(a.freq, b.freq, t);
                    const amp = lerp(a.amp, b.amp, t);
                    const phase = lerp(a.phase, b.phase, t);
                    r += amp * Math.sin(freq * theta + phase);
                }
                const breathe = 1 + 0.03 * Math.sin(this.pulsePhase);
                return this.baseRadius * r * breathe;
            }

            draw() {
                const alpha = this.phase === 'morph' ? 0.34 : 0.2;
                const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);

                // Potion-glow body
                const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.baseRadius * 1.6);
                glow.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${0.10 + pulse * 0.04})`);
                glow.addColorStop(0.6, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${0.04})`);
                glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(0, 0, this.baseRadius * 1.6, 0, Math.PI * 2);
                ctx.fill();

                // Morphing silhouette outline
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
                ctx.lineWidth = this.phase === 'morph' ? 1.8 : 1.2;
                ctx.shadowBlur = this.phase === 'morph' ? 14 : 6;
                ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;
                ctx.beginPath();
                for (let i = 0; i <= OUTLINE_STEPS; i++) {
                    const theta = (i / OUTLINE_STEPS) * Math.PI * 2;
                    const r = this.radiusAt(theta);
                    const px = Math.cos(theta) * r;
                    const py = Math.sin(theta) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();

                ctx.restore();
            }
        }

        class PotionMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vy = -(0.15 + Math.random() * 0.4);
                this.vx = (Math.random() - 0.5) * 0.3;
                this.size = 0.6 + Math.random() * 1.6;
                this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                this.opacity = 0.1 + Math.random() * 0.25;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.02;
                if (this.y < -10) this.reset(false);
            }

            draw() {
                const twinkle = 0.5 + 0.5 * Math.sin(this.phase);
                ctx.save();
                ctx.globalAlpha = this.opacity * twinkle;
                ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 14; i++) orbs.push(new MorphOrb());
        for (let i = 0; i < 120; i++) motes.push(new PotionMote());

        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
            } else if (!running) {
                running = true;
                animate();
            }
        });

        function animate() {
            if (!running) return;
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Aeaean night-herb wash
            const wash = ctx.createRadialGradient(
                width * 0.5, height * 0.5, 0,
                width * 0.5, height * 0.5, Math.max(width, height) * 0.7
            );
            wash.addColorStop(0, 'rgba(46, 30, 68, 0.07)');
            wash.addColorStop(0.6, 'rgba(30, 44, 40, 0.04)');
            wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, width, height);

            orbs.forEach(o => { o.update(); o.draw(); });
            motes.forEach(m => { m.update(); m.draw(); });

            rafId = requestAnimationFrame(animate);
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

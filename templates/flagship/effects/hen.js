/**
 * HÉN — Unity, The One
 * All particles converging toward a single luminous point
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Singularity Canvas ───────────────────────────────────────────────── */
    const canvas = document.getElementById('singularity-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let oneX, oneY;
        let seekers = [];
        let rings = [];
        let sparks = [];
        let running = true;
        let rafId = null;
        let time = 0;

        const PALETTE = {
            one: { r: 255, g: 244, b: 214 },
            gold: { r: 226, g: 190, b: 100 },
            pale: { r: 210, g: 200, b: 235 },
            dusk: 'rgba(10, 8, 20, 0.75)'
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            oneX = width / 2;
            oneY = height / 2;
        }

        /* A mote of the many, travelling inward to become the One */
        class Seeker {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                const angle = Math.random() * Math.PI * 2;
                const maxR = Math.max(width, height) * 0.8;
                this.dist = scatter
                    ? maxR * (0.1 + Math.random() * 0.9)
                    : maxR * (0.65 + Math.random() * 0.35);
                this.angle = angle;
                this.speed = 0.25 + Math.random() * 0.6;
                this.spin = (Math.random() - 0.5) * 0.008;
                this.size = 0.6 + Math.random() * 1.8;
                this.hue = Math.random();
            }

            update() {
                // Infall accelerates as the mote nears unity
                const pull = this.speed * (1 + (1 - this.dist / (Math.max(width, height) * 0.8)) * 1.6);
                this.dist -= pull;
                this.angle += this.spin * (1 + 120 / Math.max(this.dist, 30));

                if (this.dist < 8) {
                    // Arrival: a small flash of union at the point
                    sparks.push(new UnionSpark(oneX, oneY));
                    this.reset(false);
                }
            }

            draw() {
                const x = oneX + Math.cos(this.angle) * this.dist;
                const y = oneY + Math.sin(this.angle) * this.dist * 0.8;
                const near = Math.max(0, 1 - this.dist / 220);
                const alpha = 0.12 + near * 0.55;

                const r = Math.round(PALETTE.pale.r + (PALETTE.one.r - PALETTE.pale.r) * near);
                const g = Math.round(PALETTE.pale.g + (PALETTE.one.g - PALETTE.pale.g) * near);
                const b = Math.round(PALETTE.pale.b + (PALETTE.one.b - PALETTE.pale.b) * near);

                ctx.save();
                ctx.globalAlpha = alpha;
                if (near > 0.5) {
                    ctx.shadowBlur = 8 * near;
                    ctx.shadowColor = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 0.7)`;
                }
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.beginPath();
                ctx.arc(x, y, this.size * (0.7 + near * 0.6), 0, Math.PI * 2);
                ctx.fill();

                // Faint trajectory line pointing home
                if (this.dist > 60) {
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = alpha * 0.25;
                    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.lineWidth = 0.5;
                    const tx = oneX + Math.cos(this.angle) * (this.dist - 26);
                    const ty = oneY + Math.sin(this.angle) * (this.dist - 26) * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        /* Concentric rings breathing inward, marking the path to unity */
        class UnityRing {
            constructor(offset) {
                this.offset = offset;
                this.progress = offset;
            }

            update() {
                this.progress += 0.0016;
                if (this.progress > 1) this.progress = 0;
            }

            draw() {
                const t = this.progress;
                const maxR = Math.max(width, height) * 0.55;
                const r = maxR * (1 - t);
                if (r < 12) return;
                const alpha = 0.1 * (1 - t) * t * 4;
                ctx.save();
                ctx.globalAlpha = Math.min(0.16, alpha);
                ctx.strokeStyle = `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, 1)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(oneX, oneY, r, r * 0.8, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        /* The tiny flash when a seeker is absorbed into the One */
        class UnionSpark {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.life = 0;
                this.maxLife = 22;
                this.angle = Math.random() * Math.PI * 2;
            }

            update() {
                this.life++;
            }

            draw() {
                const t = this.life / this.maxLife;
                const alpha = (1 - t) * 0.5;
                const r = 4 + t * 26;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = `rgba(${PALETTE.one.r}, ${PALETTE.one.g}, ${PALETTE.one.b}, 1)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            get alive() {
                return this.life < this.maxLife;
            }
        }

        resize();
        for (let i = 0; i < 220; i++) seekers.push(new Seeker());
        for (let i = 0; i < 5; i++) rings.push(new UnityRing(i / 5));

        window.addEventListener('resize', resize);

        document.addEventListener('visibilitychange', () => {
            running = !document.hidden;
            if (running && rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });

        function animate() {
            if (!running) {
                rafId = null;
                return;
            }
            time++;
            ctx.clearRect(0, 0, width, height);

            // Quiet dusk backdrop
            const bg = ctx.createRadialGradient(oneX, oneY, 0, oneX, oneY, Math.max(width, height) * 0.7);
            bg.addColorStop(0, 'rgba(24, 18, 40, 0.5)');
            bg.addColorStop(0.6, PALETTE.dusk);
            bg.addColorStop(1, 'rgba(6, 5, 14, 0.2)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            rings.forEach(r => { r.update(); r.draw(); });
            seekers.forEach(s => { s.update(); s.draw(); });

            sparks = sparks.filter(s => s.alive);
            sparks.forEach(s => { s.update(); s.draw(); });

            // The One itself — a breathing point of light
            const pulse = 0.5 + Math.sin(time * 0.025) * 0.5;
            const coreR = 6 + pulse * 4;
            const halo = ctx.createRadialGradient(oneX, oneY, 0, oneX, oneY, 140 + pulse * 40);
            halo.addColorStop(0, `rgba(${PALETTE.one.r}, ${PALETTE.one.g}, ${PALETTE.one.b}, ${0.5 + pulse * 0.2})`);
            halo.addColorStop(0.25, `rgba(${PALETTE.gold.r}, ${PALETTE.gold.g}, ${PALETTE.gold.b}, ${0.16 + pulse * 0.08})`);
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(oneX, oneY, 140 + pulse * 40, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(${PALETTE.one.r}, ${PALETTE.one.g}, ${PALETTE.one.b}, 0.9)`;
            ctx.fillStyle = `rgb(${PALETTE.one.r}, ${PALETTE.one.g}, ${PALETTE.one.b})`;
            ctx.beginPath();
            ctx.arc(oneX, oneY, coreR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);
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

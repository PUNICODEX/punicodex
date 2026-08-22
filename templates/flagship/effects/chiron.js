/**
 * CHEÍRŌN — The Wise Centaur, Teacher of Heroes
 * Constellation lines forming in the starfield, a teaching-pointer tracing between stars
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Stars Canvas ───────────────────────────────────────────────────── */
    const canvas = document.getElementById('stars-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        let constellation = null;
        let pointer = null;
        let running = true;
        let rafId = null;
        let frameCount = 0;

        const STAR_COUNT = 140;
        const GROUP_SIZE = 6;
        const FORM_FRAMES = 90;
        const HOLD_AFTER_FORM = 340;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildStarfield();
        }

        function buildStarfield() {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height * 0.85,
                    size: 0.4 + Math.random() * 1.4,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.006 + Math.random() * 0.014,
                    grouped: false,
                });
            }
        }

        // Pick a cluster of un-grouped stars to become the next constellation
        function formConstellation() {
            const seedX = width * 0.15 + Math.random() * width * 0.7;
            const seedY = height * 0.1 + Math.random() * height * 0.6;
            const pool = stars
                .slice()
                .sort((a, b) => {
                    const da = (a.x - seedX) ** 2 + (a.y - seedY) ** 2;
                    const db = (b.x - seedX) ** 2 + (b.y - seedY) ** 2;
                    return da - db;
                })
                .slice(0, GROUP_SIZE);

            // Chain nearest-neighbour so the linework reads as a figure
            const chain = [pool[0]];
            const rest = pool.slice(1);
            while (rest.length) {
                const last = chain[chain.length - 1];
                let best = 0;
                let bestDist = Infinity;
                for (let i = 0; i < rest.length; i++) {
                    const d = (rest[i].x - last.x) ** 2 + (rest[i].y - last.y) ** 2;
                    if (d < bestDist) {
                        bestDist = d;
                        best = i;
                    }
                }
                chain.push(rest.splice(best, 1)[0]);
            }

            constellation = {
                chain,
                age: 0,
                life: FORM_FRAMES + HOLD_AFTER_FORM + 90,
            };

            // The teaching pointer starts from the first star of the figure
            pointer = {
                fromIndex: 0,
                toIndex: 1,
                progress: 0,
                dwell: 0,
                circling: 0,
            };
        }

        function drawStars() {
            stars.forEach(s => {
                s.phase += s.speed;
                const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(s.phase));
                const inChain = constellation && constellation.chain.indexOf(s) !== -1;
                ctx.save();
                ctx.globalAlpha = (inChain ? 0.85 : 0.5) * twinkle;
                ctx.fillStyle = inChain ? '#F2E8C8' : '#D8DCE8';
                if (inChain) {
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#E8D8A8';
                }
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * (inChain ? 1.4 : 1), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        function drawConstellation() {
            if (!constellation) return;
            constellation.age++;

            const formT = Math.min(1, constellation.age / FORM_FRAMES);
            const fadeStart = constellation.life - 90;
            const fadeT = constellation.age > fadeStart
                ? Math.max(0, 1 - (constellation.age - fadeStart) / 90)
                : 1;
            const alpha = 0.35 * fadeT;

            // Segments draw in sequentially as the figure "is taught"
            const chain = constellation.chain;
            const totalSegments = chain.length - 1;
            const activeSegments = formT * totalSegments;

            ctx.save();
            ctx.strokeStyle = `rgba(226, 214, 170, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(226, 214, 170, 0.5)';

            for (let i = 0; i < totalSegments; i++) {
                if (i >= activeSegments) break;
                const partial = Math.min(1, activeSegments - i);
                const a = chain[i];
                const b = chain[i + 1];
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.x + (b.x - a.x) * partial, a.y + (b.y - a.y) * partial);
                ctx.stroke();
            }
            ctx.restore();

            if (constellation.age >= constellation.life) {
                formConstellation();
            }
        }

        function drawPointer() {
            if (!pointer || !constellation) return;
            const chain = constellation.chain;
            const from = chain[pointer.fromIndex];
            const to = chain[pointer.toIndex];
            if (!from || !to) return;

            ctx.save();

            if (pointer.circling > 0) {
                // Circle the current star: the lecturer ringing the point of interest
                pointer.circling--;
                const circleT = 1 - pointer.circling / 50;
                const r = 12 + Math.sin(circleT * Math.PI) * 4;
                ctx.strokeStyle = `rgba(255, 216, 140, ${0.5 * Math.sin(circleT * Math.PI)})`;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(to.x, to.y, r, 0, Math.PI * 2 * Math.min(1, circleT * 1.2));
                ctx.stroke();
                if (pointer.circling === 0) {
                    pointer.fromIndex = pointer.toIndex;
                    pointer.toIndex = (pointer.toIndex + 1) % chain.length;
                    pointer.progress = 0;
                }
            } else {
                // Sweep the pointer line toward the next star, leaving a fading trace
                pointer.progress += 0.02;
                const p = Math.min(1, pointer.progress);
                const eased = p * p * (3 - 2 * p);
                const tipX = from.x + (to.x - from.x) * eased;
                const tipY = from.y + (to.y - from.y) * eased;

                // Pointer shaft from a base offset below (the lecturer's hand)
                const baseX = tipX - 40;
                const baseY = tipY + 52;
                const shaftAlpha = 0.4 * (1 - p * 0.4);
                const shaft = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
                shaft.addColorStop(0, 'rgba(255, 216, 140, 0)');
                shaft.addColorStop(1, `rgba(255, 216, 140, ${shaftAlpha})`);
                ctx.strokeStyle = shaft;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                // Glowing pointer tip
                ctx.fillStyle = 'rgba(255, 228, 160, 0.85)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFD88C';
                ctx.beginPath();
                ctx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                if (pointer.progress >= 1) {
                    pointer.dwell++;
                    if (pointer.dwell > 40) {
                        pointer.dwell = 0;
                        if (Math.random() < 0.4) {
                            pointer.circling = 50;
                        } else {
                            pointer.fromIndex = pointer.toIndex;
                            pointer.toIndex = (pointer.toIndex + 1) % chain.length;
                            pointer.progress = 0;
                        }
                    }
                }
            }

            ctx.restore();
        }

        resize();
        formConstellation();

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

            // Deep teaching-hall night sky
            const sky = ctx.createRadialGradient(
                width * 0.5, height * 0.2, 0,
                width * 0.5, height * 0.4, Math.max(width, height) * 0.8
            );
            sky.addColorStop(0, 'rgba(30, 36, 66, 0.08)');
            sky.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            drawStars();
            drawConstellation();
            drawPointer();

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

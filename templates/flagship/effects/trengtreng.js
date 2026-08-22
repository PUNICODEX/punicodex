/**
 * TRENGTRENG FLAGSHIP TEMPLE — RIDGE CANVAS & INTERACTIONS
 * Earth-ridge formation waves heaving from the deep, a slow flood
 * that rises and recedes + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Ridge & Flood Canvas ─────────────────────────────────────────────── */
    const canvas = document.getElementById('ridge-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let ridges = [];
        let dust = [];
        let foamBeads = [];
        let frameCount = 0;
        let paused = false;
        let floodPhase = Math.random() * Math.PI * 2;
        let heave = 1;
        const pointer = { y: 0.5, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Peak {
            constructor(xFrac, widthFrac, heightFrac, phase, speed) {
                this.xFrac = xFrac;
                this.widthFrac = widthFrac;
                this.heightFrac = heightFrac;
                this.phase = phase;
                this.speed = speed;
            }

            height(t) {
                return this.heightFrac * height * (0.55 + 0.45 * Math.sin(t * this.speed + this.phase));
            }
        }

        class Ridge {
            constructor(layer, total) {
                this.depth = layer / (total - 1); // 0 back, 1 front
                this.baseYFrac = 0.58 + this.depth * 0.24;
                this.peaks = [];
                const count = 3 + layer * 2;
                for (let i = 0; i < count; i++) {
                    this.peaks.push(new Peak(
                        (i + 0.5 + (Math.random() - 0.5) * 0.6) / count,
                        0.10 + Math.random() * 0.12,
                        (0.06 + Math.random() * 0.13) * (0.7 + this.depth * 0.5),
                        Math.random() * Math.PI * 2,
                        0.0018 + Math.random() * 0.0022
                    ));
                }
            }

            yAt(x, t, boost) {
                let y = height * this.baseYFrac;
                const xFrac = x / width;
                for (let i = 0; i < this.peaks.length; i++) {
                    const p = this.peaks[i];
                    const d = (xFrac - p.xFrac) / p.widthFrac;
                    y -= p.height(t) * boost * Math.exp(-d * d);
                }
                return y;
            }

            draw(t, boost) {
                const top = height * (this.baseYFrac - 0.3);
                const grad = ctx.createLinearGradient(0, top, 0, height);
                if (this.depth < 0.5) {
                    grad.addColorStop(0, 'hsla(28, 35%, 26%, 0.30)');
                    grad.addColorStop(1, 'hsla(24, 30%, 14%, 0.45)');
                } else if (this.depth < 1) {
                    grad.addColorStop(0, 'hsla(30, 38%, 30%, 0.42)');
                    grad.addColorStop(1, 'hsla(26, 32%, 16%, 0.60)');
                } else {
                    grad.addColorStop(0, 'hsla(32, 42%, 34%, 0.55)');
                    grad.addColorStop(1, 'hsla(26, 34%, 15%, 0.75)');
                }
                ctx.save();
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-10, height + 10);
                for (let x = 0; x <= width; x += 12) {
                    ctx.lineTo(x, this.yAt(x, t, boost));
                }
                ctx.lineTo(width + 10, height + 10);
                ctx.closePath();
                ctx.fill();

                // Sun-warmed crest line on the front ridge
                if (this.depth === 1) {
                    ctx.strokeStyle = 'hsla(38, 60%, 55%, 0.16)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let x = 0; x <= width; x += 12) {
                        const y = this.yAt(x, t, boost);
                        if (x === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        class DustMote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? height * (0.5 + Math.random() * 0.5) : height + 6;
                this.vy = -(0.08 + Math.random() * 0.25);
                this.vx = (Math.random() - 0.5) * 0.15;
                this.size = 0.5 + Math.random() * 1.6;
                this.alpha = 0.06 + Math.random() * 0.16;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.y < height * 0.3) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#d8b98a';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class FoamBead {
            constructor(x, y, receding) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = receding ? 0.15 + Math.random() * 0.3 : -(0.05 + Math.random() * 0.2);
                this.size = 0.7 + Math.random() * 1.8;
                this.life = 40 + Math.random() * 50;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
            }

            draw() {
                if (this.life <= 0) return;
                ctx.save();
                ctx.globalAlpha = (this.life / this.maxLife) * 0.4;
                ctx.fillStyle = '#cfe2d8';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 3; i++) ridges.push(new Ridge(i, 3));
        for (let i = 0; i < 70; i++) dust.push(new DustMote());

        window.addEventListener('resize', resize);

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            window.addEventListener('mousemove', (e) => {
                pointer.y = e.clientY / window.innerHeight;
                pointer.active = true;
            }, { passive: true });
        }

        document.addEventListener('visibilitychange', () => {
            paused = document.hidden;
            if (!paused) requestAnimationFrame(animate);
        });

        function animate() {
            if (paused) return;
            frameCount++;
            const t = frameCount;
            ctx.clearRect(0, 0, width, height);

            // Heave eases toward the pointer: a raised hand lifts the land
            const targetHeave = pointer.active ? 1 + (0.5 - pointer.y) * 0.7 : 1;
            heave += (targetHeave - heave) * 0.015;

            // Ridges rise from the deep, back to front
            ridges.forEach(r => r.draw(t, heave));

            // The flood: a minutes-long cycle of rising and receding water
            floodPhase += 0.00045;
            const floodFrac = 0.74 + Math.sin(floodPhase) * 0.11;
            const receding = Math.cos(floodPhase) < 0;
            const waterY = height * floodFrac;

            const water = ctx.createLinearGradient(0, waterY - 20, 0, height);
            water.addColorStop(0, 'hsla(174, 30%, 42%, 0.16)');
            water.addColorStop(0.4, 'hsla(178, 32%, 30%, 0.22)');
            water.addColorStop(1, 'hsla(182, 30%, 20%, 0.30)');
            ctx.save();
            ctx.fillStyle = water;
            ctx.beginPath();
            ctx.moveTo(-10, height + 10);
            for (let x = 0; x <= width; x += 16) {
                const y = waterY + Math.sin(x * 0.012 + t * 0.02) * 4
                    + Math.sin(x * 0.03 - t * 0.013) * 2;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width + 10, height + 10);
            ctx.closePath();
            ctx.fill();

            // Waterline glint
            ctx.strokeStyle = `hsla(160, 40%, 70%, ${receding ? 0.10 : 0.16})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 16) {
                const y = waterY + Math.sin(x * 0.012 + t * 0.02) * 4
                    + Math.sin(x * 0.03 - t * 0.013) * 2;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.restore();

            // Foam beads along the waterline; sediment sinking as it recedes
            if (frameCount % 4 === 0 && foamBeads.length < 90) {
                foamBeads.push(new FoamBead(Math.random() * width, waterY, receding));
            }
            foamBeads = foamBeads.filter(b => b.life > 0);
            foamBeads.forEach(b => { b.update(); b.draw(); });

            dust.forEach(d => { d.update(); d.draw(); });

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
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
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
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

/**
 * MÁNI FLAGSHIP TEMPLE — MOONSHADOW CANVAS & INTERACTIONS
 * Lunar disc with phase-drift + Hati's wolf-shadow + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Moonshadow Canvas ────────────────────────────────────────────────── */
    const canvas = document.getElementById('moonshadow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let stars = [];
        let clouds = [];
        let craters = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            seedStars();
            seedCraters();
        }

        function moonParams() {
            const mx = width * 0.62;
            const my = height * 0.34;
            const mr = Math.min(width, height) * 0.2;
            return { mx, my, mr };
        }

        function seedStars() {
            stars = [];
            const count = Math.min(120, Math.floor(width * height / 12000));
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: 0.4 + Math.random() * 1.2,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.008 + Math.random() * 0.025
                });
            }
        }

        function seedCraters() {
            craters = [];
            const { mr } = moonParams();
            for (let i = 0; i < 14; i++) {
                const ang = Math.random() * Math.PI * 2;
                const dist = Math.random() * mr * 0.75;
                craters.push({
                    ox: Math.cos(ang) * dist,
                    oy: Math.sin(ang) * dist,
                    r: mr * (0.04 + Math.random() * 0.09),
                    shade: 0.05 + Math.random() * 0.08
                });
            }
        }

        class Cloud {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = scatter ? Math.random() * width : -220;
                this.y = Math.random() * height * 0.7;
                this.vx = 0.15 + Math.random() * 0.3;
                this.rx = 90 + Math.random() * 160;
                this.ry = 18 + Math.random() * 26;
                this.opacity = 0.04 + Math.random() * 0.06;
            }

            update() {
                this.x += this.vx;
                if (this.x - this.rx > width) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.rx);
                g.addColorStop(0, 'hsla(225, 25%, 70%, 0.8)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, this.rx, this.ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawMoon(t) {
            const { mx, my, mr } = moonParams();

            ctx.save();

            // Halo
            const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 2.6);
            halo.addColorStop(0, 'rgba(210, 225, 255, 0.22)');
            halo.addColorStop(0.5, 'rgba(180, 200, 240, 0.08)');
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(mx, my, mr * 2.6, 0, Math.PI * 2);
            ctx.fill();

            // Disc
            const disc = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
            disc.addColorStop(0, 'rgba(240, 246, 255, 0.95)');
            disc.addColorStop(0.7, 'rgba(205, 218, 240, 0.9)');
            disc.addColorStop(1, 'rgba(170, 188, 220, 0.85)');
            ctx.fillStyle = disc;
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.fill();

            // Craters, clipped to the disc
            ctx.save();
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.clip();
            craters.forEach(c => {
                ctx.fillStyle = `rgba(120, 140, 175, ${c.shade})`;
                ctx.beginPath();
                ctx.ellipse(mx + c.ox, my + c.oy, c.r, c.r * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Phase drift: slow terminator sweeping the disc
            const phase = Math.sin(t * 0.05); // -1..1 over ~2 minutes
            const termX = mx + phase * mr * 1.15;
            const shade = ctx.createRadialGradient(termX, my, mr * 0.2, termX, my, mr * 1.6);
            shade.addColorStop(0, 'rgba(8, 10, 22, 0.55)');
            shade.addColorStop(0.7, 'rgba(8, 10, 22, 0.25)');
            shade.addColorStop(1, 'transparent');
            ctx.fillStyle = shade;
            ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);

            // Hati's wolf-shadow encroaching from the disc's lower-left rim
            const cover = 0.22 + 0.14 * Math.sin(t * 0.11); // slow creep in and out
            const hx = mx - mr * 0.85;
            const hy = my + mr * 0.45;
            const hr = mr * (0.5 + cover);
            ctx.fillStyle = 'rgba(6, 8, 18, 0.72)';
            ctx.beginPath();
            // Skull dome
            ctx.arc(hx, hy, hr * 0.55, Math.PI * 0.9, Math.PI * 2.1);
            // Ear
            ctx.lineTo(hx - hr * 0.32, hy - hr * 0.72);
            ctx.lineTo(hx - hr * 0.1, hy - hr * 0.5);
            // Snout
            ctx.lineTo(hx + hr * 0.62, hy - hr * 0.18);
            ctx.lineTo(hx + hr * 0.4, hy + hr * 0.08);
            // Jaw + neck back into shadow
            ctx.lineTo(hx + hr * 0.1, hy + hr * 0.28);
            ctx.lineTo(hx - hr * 0.55, hy + hr * 0.4);
            ctx.closePath();
            ctx.fill();

            // Rim-light along the wolf silhouette edge
            ctx.strokeStyle = 'rgba(190, 210, 245, 0.18)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.restore();
            ctx.restore();
        }

        resize();
        for (let i = 0; i < 6; i++) clouds.push(new Cloud());

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            const t = frameCount * 0.016;
            ctx.clearRect(0, 0, width, height);

            // Deep-night gradient wash
            const night = ctx.createRadialGradient(
                width * 0.62, height * 0.3, 0, width * 0.62, height * 0.3, Math.min(width, height));
            night.addColorStop(0, 'hsla(228, 35%, 18%, 0.08)');
            night.addColorStop(1, 'transparent');
            ctx.fillStyle = night;
            ctx.fillRect(0, 0, width, height);

            // Stars (dimmed near the disc)
            const { mx, my, mr } = moonParams();
            ctx.save();
            stars.forEach(s => {
                s.phase += s.speed;
                const dx = s.x - mx;
                const dy = s.y - my;
                const nearMoon = Math.sqrt(dx * dx + dy * dy) < mr * 1.4;
                const tw = (0.3 + 0.5 * Math.abs(Math.sin(s.phase))) * (nearMoon ? 0.25 : 1);
                ctx.fillStyle = `rgba(225, 235, 255, ${tw * 0.6})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            drawMoon(t);

            clouds.forEach(c => { c.update(); c.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });
    } else if (canvas) {
        canvas.style.display = 'none';
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
                    mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
            }
        }, { passive: true });
    }

})();

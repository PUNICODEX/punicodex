/**
 * ŌKEANÓS FLAGSHIP TEMPLE — RING CANVAS & INTERACTIONS
 * The encircling world-river: concentric elliptical current bands,
 * a traveling sun-glint, drifting mist + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── World-River Ring Canvas ──────────────────────────────────────────── */
    const canvas = document.getElementById('ring-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let streaks = [];
        let motes = [];
        let glintSprite = null;
        let frameCount = 0;
        let paused = false;
        let speedBoost = 1;
        const ring = { cx: 0, cy: 0, rx: 0, ry: 0 };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            ring.cx = width * 0.5;
            ring.cy = height * 0.58;
            ring.rx = width * 0.46;
            ring.ry = height * 0.42;
        }

        /* Prerendered radial glow for the traveling sun-glint */
        function buildGlintSprite() {
            glintSprite = document.createElement('canvas');
            glintSprite.width = 96;
            glintSprite.height = 96;
            const g = glintSprite.getContext('2d');
            const grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
            grad.addColorStop(0, 'rgba(255, 250, 230, 0.95)');
            grad.addColorStop(0.25, 'rgba(214, 232, 245, 0.5)');
            grad.addColorStop(0.6, 'rgba(160, 200, 228, 0.15)');
            grad.addColorStop(1, 'rgba(160, 200, 228, 0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 96, 96);
        }

        /* Point on the river ellipse; bands sit at scaled radii and breathe */
        function ringPoint(angle, bandScale, t) {
            const wobble = 1 + Math.sin(angle * 3 + t * 0.004) * 0.012;
            return {
                x: ring.cx + Math.cos(angle) * ring.rx * bandScale * wobble,
                y: ring.cy + Math.sin(angle) * ring.ry * bandScale * wobble
            };
        }

        class FlowStreak {
            constructor() {
                this.reset();
            }

            reset() {
                this.band = Math.floor(Math.random() * 4); // 0 inner … 3 outer
                this.bandScale = 0.82 + this.band * 0.09 + (Math.random() - 0.5) * 0.03;
                this.angle = Math.random() * Math.PI * 2;
                // The world-river flows one way; outer bands run slightly slower
                this.speed = (0.0024 - this.band * 0.0003) * (0.85 + Math.random() * 0.3);
                this.len = 0.05 + Math.random() * 0.08;
                this.size = 1 + this.band * 0.5 + Math.random() * 1.2;
                this.alpha = 0.10 + Math.random() * 0.22;
                this.hue = 200 + Math.random() * 14;
            }

            update() {
                this.angle += this.speed * speedBoost;
                if (this.angle > Math.PI * 4) this.angle -= Math.PI * 2;
            }

            draw(t) {
                // Short tapered wake: 4 segments fading toward the tail
                const segments = 4;
                ctx.save();
                ctx.lineCap = 'round';
                for (let i = 0; i < segments; i++) {
                    const a1 = this.angle - this.len * (i / segments);
                    const a2 = this.angle - this.len * ((i + 1) / segments);
                    const p1 = ringPoint(a1, this.bandScale, t);
                    const p2 = ringPoint(a2, this.bandScale, t);
                    const fade = 1 - (i + 1) / segments;
                    ctx.strokeStyle = `hsla(${this.hue}, 55%, ${62 + fade * 14}%, ${this.alpha * fade})`;
                    ctx.lineWidth = this.size * (0.5 + fade * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        class MistMote {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.bandScale = 0.6 + Math.random() * 0.8;
                this.speed = (Math.random() - 0.5) * 0.001;
                this.radialDrift = (Math.random() - 0.5) * 0.0004;
                this.size = 0.6 + Math.random() * 2;
                this.alpha = 0.04 + Math.random() * 0.12;
            }

            update() {
                this.angle += this.speed * speedBoost;
                this.bandScale += this.radialDrift;
                if (this.bandScale < 0.55 || this.bandScale > 1.45) this.reset();
            }

            draw(t) {
                const p = ringPoint(this.angle, this.bandScale, t);
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#cfe4ee';
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        /* The sun-glint: a bright travelling highlight riding the current */
        function drawGlint(t, angle, scale, alpha) {
            const p = ringPoint(angle, 1.0, t);
            const s = 96 * scale;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(glintSprite, p.x - s / 2, p.y - s / 2, s, s);
            ctx.restore();
        }

        resize();
        buildGlintSprite();
        for (let i = 0; i < 200; i++) streaks.push(new FlowStreak());
        for (let i = 0; i < 70; i++) motes.push(new MistMote());

        window.addEventListener('resize', resize);

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            window.addEventListener('mousemove', () => {
                speedBoost = 2.1; // the river quickens under the visitor's hand
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

            // Speed boost decays back to the river's steady pace
            speedBoost += (1 - speedBoost) * 0.008;

            // Deep-sea ambience at the heart of the ring
            const heart = ctx.createRadialGradient(
                ring.cx, ring.cy, 0,
                ring.cx, ring.cy, Math.max(ring.rx, ring.ry) * 1.1
            );
            heart.addColorStop(0, 'hsla(206, 50%, 26%, 0.10)');
            heart.addColorStop(0.6, 'hsla(210, 45%, 20%, 0.05)');
            heart.addColorStop(1, 'transparent');
            ctx.fillStyle = heart;
            ctx.fillRect(0, 0, width, height);

            // Ghost bands: the full ellipse of each current, barely lit
            ctx.save();
            for (let b = 0; b < 4; b++) {
                const scale = 0.82 + b * 0.09;
                const breathe = 0.5 + 0.5 * Math.sin(t * 0.003 + b * 1.4);
                ctx.strokeStyle = `hsla(204, 50%, 55%, ${0.025 + breathe * 0.02})`;
                ctx.lineWidth = 8 + b * 4;
                ctx.beginPath();
                ctx.ellipse(ring.cx, ring.cy, ring.rx * scale, ring.ry * scale, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();

            motes.forEach(m => { m.update(); m.draw(t); });
            streaks.forEach(s => { s.update(); s.draw(t); });

            // Two glints ride the river: one bright, one a faint antipodal echo
            const glintAngle = t * 0.0024 * speedBoost;
            drawGlint(t, glintAngle % (Math.PI * 2), 1, 0.8);
            drawGlint(t, (glintAngle + Math.PI) % (Math.PI * 2), 0.55, 0.3);

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

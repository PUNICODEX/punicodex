/**
 * EA (ENKI) FLAGSHIP TEMPLE — DEEP CURRENT CANVAS & INTERACTIONS
 * Deep freshwater currents, cuneiform glyph bubbles, wisdom motes
 * + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Deep Current Canvas ──────────────────────────────────────────────── */
    const canvas = document.getElementById('current-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let currents = [];
        let motes = [];
        let glyphBubbles = [];
        let glyphSprites = [];
        let frameCount = 0;
        let paused = false;
        let bend = 0;
        const pointer = { x: 0.5, y: 0.5, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* Cuneiform wedge-glyph sprite atlas (8 variants, prerendered once) */
        function buildGlyphSprites() {
            for (let v = 0; v < 8; v++) {
                const sprite = document.createElement('canvas');
                sprite.width = 48;
                sprite.height = 48;
                const g = sprite.getContext('2d');
                g.translate(24, 24);
                const wedges = 2 + (v % 3);
                for (let i = 0; i < wedges; i++) {
                    const angle = (i / wedges) * Math.PI * 1.2 + v * 0.9;
                    const len = 10 + ((v * 7 + i * 5) % 12);
                    const wid = 3 + ((v + i) % 3);
                    g.save();
                    g.rotate(angle);
                    g.shadowBlur = 6;
                    g.shadowColor = 'rgba(212, 175, 55, 0.9)';
                    g.fillStyle = 'rgba(216, 184, 92, 0.95)';
                    g.beginPath();
                    g.moveTo(2, -wid);
                    g.lineTo(len, 0);
                    g.lineTo(2, wid);
                    g.closePath();
                    g.fill();
                    g.restore();
                }
                glyphSprites.push(sprite);
            }
        }

        class Current {
            constructor(index, total) {
                this.depth = index / (total - 1); // 0 near surface, 1 abyssal
                this.baseYFrac = 0.22 + this.depth * 0.66;
                this.amp = 18 + this.depth * 42;
                this.freq = 0.0022 - this.depth * 0.0008;
                this.speed = 0.008 + this.depth * 0.006;
                this.phase = Math.random() * Math.PI * 2;
                this.hueShift = this.depth * 14;
            }

            draw(t) {
                const baseY = height * this.baseYFrac;
                const alpha = 0.05 + (1 - this.depth) * 0.05;
                const grad = ctx.createLinearGradient(0, baseY - this.amp, 0, baseY + this.amp * 2.5);
                grad.addColorStop(0, `hsla(${186 + this.hueShift}, 70%, ${58 - this.depth * 18}%, 0)`);
                grad.addColorStop(0.5, `hsla(${186 + this.hueShift}, 72%, ${56 - this.depth * 18}%, ${alpha})`);
                grad.addColorStop(1, `hsla(${190 + this.hueShift}, 60%, ${40 - this.depth * 12}%, 0)`);
                ctx.save();
                ctx.strokeStyle = grad;
                ctx.lineWidth = 26 + this.depth * 60;
                ctx.lineCap = 'round';
                ctx.beginPath();
                for (let x = -60; x <= width + 60; x += 24) {
                    const y = baseY
                        + Math.sin(x * this.freq + this.phase + t * this.speed) * this.amp
                        + Math.sin(x * this.freq * 2.7 - t * this.speed * 0.6) * this.amp * 0.35
                        + bend * Math.sin((x / width) * Math.PI) * (1 - this.depth) * 30;
                    if (x === -60) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        class Mote {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 12;
                this.vy = -(0.12 + Math.random() * 0.4);
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.004 + Math.random() * 0.01;
                this.size = 0.6 + Math.random() * 1.8;
                this.alpha = 0.08 + Math.random() * 0.22;
            }

            update() {
                this.wobble += this.wobbleSpeed;
                this.x += Math.sin(this.wobble) * 0.3;
                this.y += this.vy;
                if (this.y < -12) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#9fe8ea';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class GlyphBubble {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 30;
                this.vy = -(0.15 + Math.random() * 0.35);
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = 0.006 + Math.random() * 0.012;
                this.radius = 10 + Math.random() * 16;
                this.sprite = glyphSprites[Math.floor(Math.random() * glyphSprites.length)];
                this.spin = (Math.random() - 0.5) * 0.01;
                this.angle = Math.random() * Math.PI * 2;
                this.alpha = 0;
                this.maxAlpha = 0.35 + Math.random() * 0.3;
            }

            update() {
                this.wobble += this.wobbleSpeed;
                this.angle += this.spin;
                this.x += Math.sin(this.wobble) * 0.5;
                this.y += this.vy;
                if (this.alpha < this.maxAlpha) this.alpha += 0.004;
                if (this.y < -40 || this.x < -60 || this.x > width + 60) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                const rim = ctx.createRadialGradient(
                    this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
                    this.x, this.y, this.radius
                );
                rim.addColorStop(0, 'rgba(160, 235, 238, 0.10)');
                rim.addColorStop(0.75, 'rgba(120, 210, 220, 0.05)');
                rim.addColorStop(1, 'rgba(160, 235, 238, 0.28)');
                ctx.fillStyle = rim;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                const s = this.radius * 1.2;
                ctx.drawImage(this.sprite, -s / 2, -s / 2, s, s);
                ctx.restore();
            }
        }

        resize();
        buildGlyphSprites();
        for (let i = 0; i < 5; i++) currents.push(new Current(i, 5));
        for (let i = 0; i < 110; i++) motes.push(new Mote());
        for (let i = 0; i < 34; i++) glyphBubbles.push(new GlyphBubble());

        window.addEventListener('resize', resize);

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            window.addEventListener('mousemove', (e) => {
                pointer.x = e.clientX / window.innerWidth;
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

            // Deep freshwater ambience: faint glow welling up from below
            const well = ctx.createRadialGradient(
                width * 0.5, height * 1.15, 0,
                width * 0.5, height * 1.15, Math.max(width, height) * 0.8
            );
            well.addColorStop(0, 'hsla(188, 70%, 30%, 0.10)');
            well.addColorStop(0.6, 'hsla(192, 60%, 22%, 0.04)');
            well.addColorStop(1, 'transparent');
            ctx.fillStyle = well;
            ctx.fillRect(0, 0, width, height);

            // Pointer bend easing: the currents lean gently toward the visitor
            const targetBend = pointer.active ? (0.5 - pointer.y) : 0;
            bend += (targetBend - bend) * 0.02;

            currents.forEach(c => c.draw(t));
            motes.forEach(m => { m.update(); m.draw(); });
            glyphBubbles.forEach(b => { b.update(); b.draw(); });

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

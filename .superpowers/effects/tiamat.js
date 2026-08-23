/**
 * TIĀMAT FLAGSHIP TEMPLE — COIL CANVAS & INTERACTIONS
 * Churning saltwater serpent coils, brine foam, a deep chaos pulse
 * + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Serpent Coil Canvas ──────────────────────────────────────────────── */
    const canvas = document.getElementById('coil-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!canvas || !ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let serpents = [];
        let foam = [];
        let spray = [];
        let frameCount = 0;
        let paused = false;
        let agitation = 1;
        const pointer = { y: 0.5, active: false };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Serpent {
            constructor(index, total) {
                this.depth = index / (total - 1); // 0 distant, 1 foreground
                this.baseYFrac = 0.28 + this.depth * 0.58;
                this.amp = 24 + this.depth * 58;
                this.waveK = 0.0035 - this.depth * 0.0012;
                this.speed = (0.006 + Math.random() * 0.009) * (Math.random() < 0.5 ? 1 : -1);
                this.thickness = 26 + this.depth * 58;
                this.phase = Math.random() * Math.PI * 2;
                this.hue = 205 + this.depth * 28; // abyssal indigo into brine teal
            }

            trace(baseY, amp, t, yOffset) {
                ctx.beginPath();
                for (let x = -80; x <= width + 80; x += 20) {
                    const y = baseY + yOffset
                        + Math.sin(x * this.waveK + this.phase + t * this.speed) * amp
                        + Math.sin(x * this.waveK * 2.3 - t * this.speed * 1.4) * amp * 0.4;
                    if (x === -80) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            }

            draw(t, churn) {
                const baseY = height * this.baseYFrac;
                const amp = this.amp * churn;
                const light = 30 + (1 - this.depth) * 22;
                ctx.save();
                ctx.lineCap = 'round';

                // Outer brine glow
                ctx.strokeStyle = `hsla(${this.hue}, 60%, ${light}%, 0.05)`;
                ctx.lineWidth = this.thickness * 2.2;
                this.trace(baseY, amp, t, 0);
                ctx.stroke();

                // Body core
                ctx.strokeStyle = `hsla(${this.hue}, 55%, ${light + 8}%, 0.13)`;
                ctx.lineWidth = this.thickness;
                this.trace(baseY, amp, t, 0);
                ctx.stroke();

                // Dorsal scale shimmer sliding along the coil
                ctx.strokeStyle = `hsla(${this.hue + 15}, 80%, 72%, 0.10)`;
                ctx.lineWidth = Math.max(2, this.thickness * 0.12);
                ctx.setLineDash([6, 26]);
                ctx.lineDashOffset = -t * 0.6 * Math.sign(this.speed);
                this.trace(baseY, amp, t, -this.thickness * 0.28);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.restore();
            }

            crestY(x, t, churn) {
                const baseY = height * this.baseYFrac;
                const amp = this.amp * churn;
                return baseY
                    + Math.sin(x * this.waveK + this.phase + t * this.speed) * amp
                    + Math.sin(x * this.waveK * 2.3 - t * this.speed * 1.4) * amp * 0.4
                    - this.thickness * 0.4;
            }
        }

        class FoamFleck {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.7;
                this.vy = -(0.1 + Math.random() * 0.45);
                this.jitter = Math.random() * Math.PI * 2;
                this.jitterSpeed = 0.02 + Math.random() * 0.03;
                this.size = 0.6 + Math.random() * 2.2;
                this.alpha = 0.08 + Math.random() * 0.24;
            }

            update() {
                this.jitter += this.jitterSpeed;
                this.x += this.vx + Math.sin(this.jitter) * 0.5;
                this.y += this.vy;
                if (this.y < -12 || this.x < -12 || this.x > width + 12) this.reset(false);
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#cfe8e4';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class SprayDrop {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 2.4;
                this.vy = -(1 + Math.random() * 2.2);
                this.size = 0.6 + Math.random() * 1.6;
                this.life = 20 + Math.random() * 26;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.09;
                this.life--;
            }

            draw() {
                if (this.life <= 0) return;
                ctx.save();
                ctx.globalAlpha = (this.life / this.maxLife) * 0.5;
                ctx.fillStyle = '#e4f2ee';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        resize();
        for (let i = 0; i < 6; i++) serpents.push(new Serpent(i, 6));
        for (let i = 0; i < 130; i++) foam.push(new FoamFleck());

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

            // Chaos pulse: a slow crimson heartbeat in the deep
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
            const deep = ctx.createRadialGradient(
                width * 0.5, height * 1.2, 0,
                width * 0.5, height * 1.2, Math.max(width, height) * 0.85
            );
            deep.addColorStop(0, `hsla(348, 55%, 24%, ${0.05 + pulse * 0.04})`);
            deep.addColorStop(0.55, `hsla(290, 40%, 18%, ${0.03 + pulse * 0.02})`);
            deep.addColorStop(1, 'transparent');
            ctx.fillStyle = deep;
            ctx.fillRect(0, 0, width, height);

            // Agitation eases toward the pointer: lower hand, wilder waters
            const targetChurn = pointer.active ? 0.85 + pointer.y * 0.55 : 1;
            agitation += (targetChurn - agitation) * 0.02;

            // Coils, back to front
            serpents.forEach(s => s.draw(t, agitation));

            // Spray thrown from the foreground coil crests
            if (frameCount % 3 === 0) {
                for (let i = 0; i < 2; i++) {
                    const s = serpents[serpents.length - 1 - i];
                    const x = Math.random() * width;
                    spray.push(new SprayDrop(x, s.crestY(x, t, agitation)));
                }
            }

            foam.forEach(f => { f.update(); f.draw(); });

            spray = spray.filter(d => d.life > 0);
            if (spray.length > 160) spray.splice(0, spray.length - 160);
            spray.forEach(d => { d.update(); d.draw(); });

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

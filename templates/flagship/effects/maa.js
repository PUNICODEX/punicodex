/**
 * Mꜣꜥ FLAGSHIP TEMPLE — SIGHT CANVAS & INTERACTIONS
 * Concentric rings, light beams, lens flares, iris patterns, crystalline dust
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Sight Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('sight-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let irisRings = [];
        let lightBeams = [];
        let lensFlares = [];
        let dustMotes = [];
        let irisPatterns = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class IrisRing {
            constructor() {
                this.reset();
            }

            reset() {
                this.radius = Math.random() * 80 + 40;
                this.maxRadius = Math.max(width, height) * 0.6;
                this.expansionSpeed = Math.random() * 0.8 + 0.3;
                this.opacity = Math.random() * 0.06 + 0.02;
                this.lineWidth = Math.random() * 1.5 + 0.5;
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.hue = Math.random() > 0.3 ? 210 : (Math.random() > 0.5 ? 200 : 220);
                this.active = true;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.radius += this.expansionSpeed;
                this.opacity -= 0.0002;

                if (this.opacity <= 0 || this.radius > this.maxRadius) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${this.hue}, 70%, 65%, 0.5)`;
                ctx.lineWidth = this.lineWidth;
                ctx.stroke();
                ctx.restore();
            }
        }

        class LightBeam {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.length = Math.random() * 400 + 200;
                this.width = Math.random() * 1 + 0.3;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.015;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0004;
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.hue = Math.random() > 0.4 ? 210 : 190;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height / 2;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const x1 = this.centerX + Math.cos(this.angle) * 60;
                const y1 = this.centerY + Math.sin(this.angle) * 60;
                const x2 = this.centerX + Math.cos(this.angle) * (60 + this.length);
                const y2 = this.centerY + Math.sin(this.angle) * (60 + this.length);

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, 0.5)`;
                ctx.lineWidth = this.width;
                ctx.stroke();
                ctx.restore();
            }
        }

        class LensFlare {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 3 + 1;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.life = Math.random() * 300 + 200;
                this.maxLife = this.life;
                this.hue = Math.random() > 0.5 ? 210 : (Math.random() > 0.5 ? 180 : 200);
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.3 + 0.15);

                if (this.life <= 0 || this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                // Main flare
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 80%, 75%)`;
                ctx.shadowBlur = 12;
                ctx.shadowColor = `hsla(${this.hue}, 80%, 70%, ${this.opacity * 0.5})`;
                ctx.fill();
                // Cross flare
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 3, this.y);
                ctx.lineTo(this.x + this.size * 3, this.y);
                ctx.moveTo(this.x, this.y - this.size * 3);
                ctx.lineTo(this.x, this.y + this.size * 3);
                ctx.strokeStyle = `hsla(${this.hue}, 70%, 70%, 0.3)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        class DustMote {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.2 + 0.05);
                this.size = Math.random() * 1.5 + 0.3;
                this.opacity = Math.random() * 0.25 + 0.05;
                this.hue = Math.random() > 0.6 ? 210 : (Math.random() > 0.5 ? 200 : 220);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.15 + 0.08);

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 60%, 75%)`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 70%, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class IrisPattern {
            constructor() {
                this.reset();
            }

            reset() {
                this.radius = Math.random() * 30 + 20;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.002;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.segments = Math.floor(Math.random() * 4 + 6);
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.rotation += this.rotationSpeed;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.centerX, this.centerY);
                ctx.rotate(this.rotation);

                for (let i = 0; i < this.segments; i++) {
                    const angle = (Math.PI * 2 / this.segments) * i;
                    const nextAngle = (Math.PI * 2 / this.segments) * (i + 1);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, this.radius, angle, nextAngle);
                    ctx.closePath();
                    ctx.fillStyle = `hsla(210, 60%, 60%, 0.15)`;
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 12; i++) {
            irisRings.push(new IrisRing());
        }
        for (let i = 0; i < 24; i++) {
            lightBeams.push(new LightBeam());
        }
        for (let i = 0; i < 20; i++) {
            lensFlares.push(new LensFlare());
        }
        for (let i = 0; i < 60; i++) {
            dustMotes.push(new DustMote());
        }
        for (let i = 0; i < 4; i++) {
            irisPatterns.push(new IrisPattern());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Central eye glow
            const eyeX = width / 2;
            const eyeY = height / 2;
            const eyeGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, Math.min(width, height) * 0.4);
            eyeGrad.addColorStop(0, 'hsla(210, 60%, 55%, 0.03)');
            eyeGrad.addColorStop(0.5, 'hsla(210, 50%, 45%, 0.01)');
            eyeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = eyeGrad;
            ctx.fillRect(0, 0, width, height);

            // Iris patterns (behind rings)
            irisPatterns.forEach(p => { p.update(); p.draw(); });

            // Concentric rings
            irisRings.forEach(r => { r.update(); r.draw(); });

            // Light beams
            lightBeams.forEach(b => { b.update(); b.draw(); });

            // Lens flares
            lensFlares.forEach(f => { f.update(); f.draw(); });

            // Dust motes
            dustMotes.forEach(d => { d.update(); d.draw(); });

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
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

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

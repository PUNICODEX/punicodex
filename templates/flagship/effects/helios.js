/**
 * HĒLIOS FLAGSHIP TEMPLE — SOLAR CANVAS & INTERACTIONS
 * Solar particle/flare animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Solar Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('solar-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let flares = [];
        let solarRays = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class SolarParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                const isLeft = Math.random() > 0.5;
                this.x = isLeft ? -20 : width + 20;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = isLeft ? (Math.random() * 0.5 + 0.2) : -(Math.random() * 0.5 + 0.2);
                this.vy = -(Math.random() * 0.3 + 0.1);
                this.size = Math.random() * 2.5 + 0.5;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.glow = Math.random() * 15 + 5;
                this.hue = Math.random() > 0.7 ? 30 : (Math.random() > 0.5 ? 45 : 55);
                this.life = Math.random() * 300 + 200;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.3 + 0.2);

                if (this.life <= 0 || this.y < -50 || this.x < -50 || this.x > width + 50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 100%, 65%)`;
                ctx.shadowBlur = this.glow;
                ctx.shadowColor = `hsla(${this.hue}, 100%, 60%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class SolarFlare {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.3;
                this.radius = Math.random() * 80 + 40;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.08 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.002 + 0.001;
                this.hue = Math.random() > 0.6 ? 35 : 45;
            }

            update() {
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
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0.8)`);
                gradient.addColorStop(0.4, `hsla(${this.hue}, 100%, 60%, 0.3)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class SolarRay {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.length = Math.random() * 200 + 100;
                this.width = Math.random() * 1.5 + 0.5;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.06 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0005;
                this.centerX = width / 2;
                this.centerY = height * 0.3;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height * 0.3;

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
                ctx.strokeStyle = 'hsla(45, 100%, 70%, 0.6)';
                ctx.lineWidth = this.width;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        const particleCount = Math.min(80, Math.floor((width * height) / 15000));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new SolarParticle());
        }
        for (let i = 0; i < 6; i++) {
            flares.push(new SolarFlare());
        }
        for (let i = 0; i < 12; i++) {
            solarRays.push(new SolarRay());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Draw central sun glow
            const sunX = width / 2;
            const sunY = height * 0.3;
            const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.min(width, height) * 0.4);
            sunGrad.addColorStop(0, 'hsla(45, 100%, 60%, 0.03)');
            sunGrad.addColorStop(0.5, 'hsla(40, 100%, 50%, 0.015)');
            sunGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGrad;
            ctx.fillRect(0, 0, width, height);

            // Solar rays
            solarRays.forEach(ray => { ray.update(); ray.draw(); });

            // Flares
            flares.forEach(flare => { flare.update(); flare.draw(); });

            // Particles
            particles.forEach(p => { p.update(); p.draw(); });

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
    const nav = document.getElementById('main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
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

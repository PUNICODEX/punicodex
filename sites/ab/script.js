/**
 * ꜣb FLAGSHIP TEMPLE — HEARTBEAT CANVAS & INTERACTIONS
 * Pulsing radial glows, warm ember particles, life currents, golden radiance
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Heartbeat Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('heart-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let pulseRings = [];
        let embers = [];
        let lifeCurrents = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class PulseRing {
            constructor() {
                this.reset();
            }

            reset() {
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.radius = 50 + Math.random() * 100;
                this.maxRadius = Math.min(width, height) * (0.3 + Math.random() * 0.4);
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.4 + 0.2;
                this.hue = Math.random() > 0.5 ? 5 : (Math.random() > 0.5 ? 15 : 25);
                this.width = Math.random() * 2 + 0.5;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height / 2;

                if (this.growing) {
                    this.radius += this.speed;
                    this.opacity += 0.0003;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                    if (this.radius >= this.maxRadius) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= 0.0004;
                    this.radius += this.speed * 0.3;
                    if (this.opacity <= 0 || this.radius >= this.maxRadius * 1.2) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${this.hue}, 70%, 55%, 0.5)`;
                ctx.lineWidth = this.width;
                ctx.stroke();
                ctx.restore();
            }
        }

        class Ember {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.4 + 0.15);
                this.size = Math.random() * 2.5 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.hue = Math.random() > 0.6 ? 10 : (Math.random() > 0.5 ? 20 : 35);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.02 + 0.01;
            }

            update() {
                this.wobble += this.wobbleSpeed;
                this.x += this.vx + Math.sin(this.wobble) * 0.2;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.25 + 0.15);

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 80%, 60%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${this.hue}, 80%, 50%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class LifeCurrent {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height + 50;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.3 + 0.1);
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.015 + 0.005;
                this.growing = true;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.width = Math.random() * 80 + 40;
                this.hue = Math.random() > 0.5 ? 25 : 35;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

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

                if (this.y < -100) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createLinearGradient(this.x - this.width/2, this.y, this.x + this.width/2, this.y);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.5, `hsla(${this.hue}, 60%, 50%, 0.3)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(this.x - this.width/2, this.y, this.width, 2);
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 8; i++) {
            pulseRings.push(new PulseRing());
        }
        for (let i = 0; i < 60; i++) {
            embers.push(new Ember());
        }
        for (let i = 0; i < 12; i++) {
            lifeCurrents.push(new LifeCurrent());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Central golden glow
            const centerX = width / 2;
            const centerY = height / 2;
            const glowRadius = Math.min(width, height) * 0.3;
            const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
            glowGrad.addColorStop(0, 'hsla(35, 60%, 45%, 0.03)');
            glowGrad.addColorStop(0.5, 'hsla(20, 50%, 40%, 0.01)');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, width, height);

            // Heartbeat pulse — subtle radial glow that pulses
            const heartbeat = 0.5 + 0.5 * Math.sin(frameCount * 0.03);
            const pulseGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius * 0.6);
            pulseGrad.addColorStop(0, `hsla(5, 60%, 50%, ${0.02 * heartbeat})`);
            pulseGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pulseGrad;
            ctx.fillRect(0, 0, width, height);

            // Pulse rings
            pulseRings.forEach(r => { r.update(); r.draw(); });

            // Life currents
            lifeCurrents.forEach(c => { c.update(); c.draw(); });

            // Embers
            embers.forEach(e => { e.update(); e.draw(); });

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
                    }, parseInt(delay));
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

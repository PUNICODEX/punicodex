/**
 * ŚIVA FLAGSHIP TEMPLE — COSMIC CANVAS & INTERACTIONS
 * Cosmic fire particles, Nataraja ring, ash embers, crescent moon glow
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Cosmic Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let fireParticles = [];
        let ashEmbers = [];
        let ringFlames = [];
        let stars = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class FireParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height + 10;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = -(Math.random() * 1.2 + 0.3);
                this.size = Math.random() * 3 + 0.5;
                this.opacity = Math.random() * 0.5 + 0.15;
                this.hue = Math.random() > 0.6 ? 15 : (Math.random() > 0.4 ? 25 : 35);
                this.life = Math.random() * 250 + 150;
                this.maxLife = this.life;
                this.flicker = Math.random() * 0.1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vx += (Math.random() - 0.5) * 0.02;
                this.life--;
                const lifeRatio = this.life / this.maxLife;
                this.opacity = lifeRatio * (Math.random() * 0.2 + 0.2);
                this.size *= 0.998;

                if (this.life <= 0 || this.y < -10) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const flickerSize = this.size * (1 + Math.sin(frameCount * this.flicker) * 0.2);
                ctx.beginPath();
                ctx.arc(this.x, this.y, flickerSize, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 80%, ${55 + (1 - this.life/this.maxLife) * 25}%)`;
                ctx.shadowBlur = 12;
                ctx.shadowColor = `hsla(${this.hue}, 80%, 50%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class AshEmber {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = -(Math.random() * 0.2 + 0.05);
                this.size = Math.random() * 1.5 + 0.3;
                this.opacity = Math.random() * 0.15 + 0.03;
                this.life = Math.random() * 600 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx + Math.sin(frameCount * 0.005 + this.y * 0.01) * 0.1;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.1 + 0.04);

                if (this.life <= 0 || this.y < -20) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#A89B8C';
                ctx.shadowBlur = 4;
                ctx.shadowColor = `rgba(212, 112, 30, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class RingFlame {
            constructor() {
                this.reset();
            }

            reset() {
                const angle = Math.random() * Math.PI * 2;
                this.centerX = width / 2;
                this.centerY = height * 0.25;
                this.radius = Math.min(width, height) * 0.18 + Math.random() * 60;
                this.angle = angle;
                this.size = Math.random() * 20 + 8;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0002;
                this.hue = Math.random() > 0.5 ? 18 : 28;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height * 0.25;

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
                const x = this.centerX + Math.cos(this.angle) * this.radius;
                const y = this.centerY + Math.sin(this.angle) * this.radius;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size);
                gradient.addColorStop(0, `hsla(${this.hue}, 80%, 60%, 0.5)`);
                gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 40%, 0.2)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Star {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.6;
                this.size = Math.random() * 1.2 + 0.2;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.twinkleSpeed = Math.random() * 0.02 + 0.005;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += this.twinkleSpeed;
                this.currentOpacity = this.opacity * (0.5 + 0.5 * Math.sin(this.phase));
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.currentOpacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#E8DCC4';
                ctx.shadowBlur = 6;
                ctx.shadowColor = `rgba(232, 220, 196, ${this.currentOpacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 30; i++) {
            fireParticles.push(new FireParticle());
        }
        for (let i = 0; i < 40; i++) {
            ashEmbers.push(new AshEmber());
        }
        for (let i = 0; i < 40; i++) {
            ringFlames.push(new RingFlame());
        }
        for (let i = 0; i < 100; i++) {
            stars.push(new Star());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep cosmic background glow
            const centerGrad = ctx.createRadialGradient(
                width / 2, height * 0.3, 0,
                width / 2, height * 0.3, Math.min(width, height) * 0.5
            );
            centerGrad.addColorStop(0, 'hsla(25, 50%, 15%, 0.04)');
            centerGrad.addColorStop(0.5, 'hsla(25, 40%, 10%, 0.015)');
            centerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGrad;
            ctx.fillRect(0, 0, width, height);

            // Stars
            stars.forEach(s => { s.update(); s.draw(); });

            // Ring flames (Nataraja's aureole)
            ringFlames.forEach(f => { f.update(); f.draw(); });

            // Fire particles
            fireParticles.forEach(p => { p.update(); p.draw(); });

            // Ash embers
            ashEmbers.forEach(a => { a.update(); a.draw(); });

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
                    const translateY = scrollY * 0.12;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

/**
 * KĒR FLAGSHIP TEMPLE — SHADOW CANVAS & INTERACTIONS
 * Shadow/ash particle animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Shadow Canvas ────────────────────────────────────────────────────── */
    const canvas = document.getElementById('shadow-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let ash = [];
        let specters = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class ShadowParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.4 + 0.1);
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.3 + 0.05;
                this.glow = Math.random() * 8 + 2;
                this.life = Math.random() * 400 + 200;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.2 + 0.1);

                if (this.life <= 0 || this.y < -50 || this.x < -50 || this.x > width + 50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#8B7A8B';
                ctx.shadowBlur = this.glow;
                ctx.shadowColor = `rgba(139, 122, 139, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class AshParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.sizeX = Math.random() * 3 + 1;
                this.sizeY = Math.random() * 1 + 0.5;
                this.angle = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.01;
                this.opacity = Math.random() * 0.15 + 0.03;
                this.life = Math.random() * 600 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.angle += this.rotSpeed;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.12;

                if (this.life <= 0 || this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.fillStyle = '#A090A0';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.sizeX, this.sizeY, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Specter {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5 + height * 0.3;
                this.radius = Math.random() * 60 + 30;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0008 + 0.0003;
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
                gradient.addColorStop(0, 'hsla(280, 20%, 50%, 0.4)');
                gradient.addColorStop(0.5, 'hsla(280, 15%, 40%, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        const particleCount = Math.min(60, Math.floor((width * height) / 18000));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new ShadowParticle());
        }
        for (let i = 0; i < 40; i++) {
            ash.push(new AshParticle());
        }
        for (let i = 0; i < 5; i++) {
            specters.push(new Specter());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Subtle central void
            const voidX = width / 2;
            const voidY = height * 0.4;
            const voidGrad = ctx.createRadialGradient(voidX, voidY, 0, voidX, voidY, Math.min(width, height) * 0.35);
            voidGrad.addColorStop(0, 'hsla(280, 15%, 15%, 0.02)');
            voidGrad.addColorStop(0.5, 'hsla(280, 10%, 10%, 0.01)');
            voidGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = voidGrad;
            ctx.fillRect(0, 0, width, height);

            // Specters
            specters.forEach(s => { s.update(); s.draw(); });

            // Particles
            particles.forEach(p => { p.update(); p.draw(); });

            // Ash
            ash.forEach(a => { a.update(); a.draw(); });

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

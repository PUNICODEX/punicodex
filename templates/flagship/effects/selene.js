/**
 * SELĒNĒ FLAGSHIP TEMPLE — LUNAR CANVAS & INTERACTIONS
 * Moon/stars particle animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Lunar Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('lunar-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        let shootingStars = [];
        let lunarParticles = [];
        let moonGlow = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Star {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : Math.random() * height * 0.7;
                this.size = Math.random() * 1.5 + 0.3;
                this.opacity = Math.random() * 0.6 + 0.2;
                this.twinkleSpeed = Math.random() * 0.02 + 0.005;
                this.twinklePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.twinklePhase += this.twinkleSpeed;
                const twinkle = Math.sin(this.twinklePhase) * 0.3 + 0.7;
                this.currentOpacity = this.opacity * twinkle;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.currentOpacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#E8E8F0';
                ctx.shadowBlur = this.size * 3;
                ctx.shadowColor = `rgba(232, 232, 240, ${this.currentOpacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class ShootingStar {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.3;
                this.length = Math.random() * 80 + 40;
                this.speed = Math.random() * 4 + 2;
                this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
                this.opacity = 0;
                this.active = false;
                this.cooldown = Math.random() * 300 + 200;
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) {
                        this.active = true;
                        this.opacity = 1;
                        this.x = Math.random() * width * 0.5;
                        this.y = Math.random() * height * 0.3;
                    }
                    return;
                }

                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.opacity -= 0.015;

                if (this.opacity <= 0 || this.x > width + 100 || this.y > height + 100) {
                    this.reset();
                }
            }

            draw() {
                if (!this.active || this.opacity <= 0) return;
                const x2 = this.x - Math.cos(this.angle) * this.length;
                const y2 = this.y - Math.sin(this.angle) * this.length;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                const grad = ctx.createLinearGradient(x2, y2, this.x, this.y);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(1, 'rgba(232, 232, 240, 0.8)');
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(this.x, this.y);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        class LunarParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.25 + 0.05);
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.05;
                this.glow = Math.random() * 10 + 3;
                this.life = Math.random() * 400 + 200;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.2 + 0.15);

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#C0C8E0';
                ctx.shadowBlur = this.glow;
                ctx.shadowColor = `rgba(192, 200, 224, ${this.opacity * 0.4})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class MoonGlow {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5;
                this.radius = Math.random() * 100 + 50;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.06 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0003;
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
                gradient.addColorStop(0, 'hsla(220, 30%, 70%, 0.5)');
                gradient.addColorStop(0.5, 'hsla(220, 20%, 50%, 0.2)');
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
        const starCount = Math.min(150, Math.floor((width * height) / 8000));
        for (let i = 0; i < starCount; i++) {
            stars.push(new Star());
        }
        for (let i = 0; i < 3; i++) {
            shootingStars.push(new ShootingStar());
        }
        for (let i = 0; i < 50; i++) {
            lunarParticles.push(new LunarParticle());
        }
        for (let i = 0; i < 4; i++) {
            moonGlow.push(new MoonGlow());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Subtle moon glow at center-top
            const moonX = width / 2;
            const moonY = height * 0.25;
            const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, Math.min(width, height) * 0.35);
            moonGrad.addColorStop(0, 'hsla(220, 20%, 40%, 0.03)');
            moonGrad.addColorStop(0.5, 'hsla(220, 15%, 30%, 0.015)');
            moonGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = moonGrad;
            ctx.fillRect(0, 0, width, height);

            // Moon glow orbs
            moonGlow.forEach(g => { g.update(); g.draw(); });

            // Stars
            stars.forEach(s => { s.update(); s.draw(); });

            // Shooting stars
            shootingStars.forEach(s => { s.update(); s.draw(); });

            // Lunar particles
            lunarParticles.forEach(p => { p.update(); p.draw(); });

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

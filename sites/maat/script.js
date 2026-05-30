/**
 * mꜣ FLAGSHIP TEMPLE — TRUTH CANVAS & INTERACTIONS
 * Symmetrical light rays, floating feather particles, balanced scales motion, serene turquoise glows
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Truth Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('truth-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let lightRays = [];
        let feathers = [];
        let dustMotes = [];
        let balanceBeams = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class LightRay {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.length = Math.random() * 250 + 100;
                this.width = Math.random() * 1.2 + 0.3;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0003;
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
                ctx.strokeStyle = 'hsla(175, 60%, 65%, 0.5)';
                ctx.lineWidth = this.width;
                ctx.stroke();
                ctx.restore();
            }
        }

        class FeatherParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -30;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = Math.random() * 0.4 + 0.15;
                this.size = Math.random() * 3 + 1.5;
                this.opacity = Math.random() * 0.25 + 0.08;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.02;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.02 + 0.01;
                this.hue = Math.random() > 0.5 ? 175 : (Math.random() > 0.5 ? 45 : 200);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.swayPhase += this.swaySpeed;
                this.x += this.vx + Math.sin(this.swayPhase) * 0.3;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.15 + 0.1);

                if (this.life <= 0 || this.y > height + 50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);

                // Draw feather shape
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 0.4, this.size * 1.2, 0, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 50%, 70%)`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `hsla(${this.hue}, 50%, 60%, ${this.opacity * 0.3})`;
                ctx.fill();

                // Feather shaft
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 1.2);
                ctx.lineTo(0, this.size * 1.2);
                ctx.strokeStyle = `hsla(${this.hue}, 40%, 55%, 0.6)`;
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
                this.y = randomY ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = -(Math.random() * 0.2 + 0.05);
                this.size = Math.random() * 1.5 + 0.5;
                this.opacity = Math.random() * 0.2 + 0.05;
                this.hue = Math.random() > 0.6 ? 175 : (Math.random() > 0.5 ? 45 : 200);
                this.life = Math.random() * 400 + 200;
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
                ctx.fillStyle = `hsl(${this.hue}, 40%, 75%)`;
                ctx.shadowBlur = 4;
                ctx.shadowColor = `hsla(${this.hue}, 40%, 60%, ${this.opacity * 0.2})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class BalanceBeam {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5 + height * 0.2;
                this.width = Math.random() * 60 + 40;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.tiltPhase = Math.random() * Math.PI * 2;
                this.tiltSpeed = Math.random() * 0.008 + 0.003;
            }

            update() {
                this.tiltPhase += this.tiltSpeed;

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
                const tilt = Math.sin(this.tiltPhase) * 0.08;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(tilt);

                // Beam
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(this.width / 2, 0);
                ctx.strokeStyle = 'hsla(175, 50%, 60%, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Center pivot
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, this.width * 0.3);
                ctx.strokeStyle = 'hsla(175, 40%, 55%, 0.3)';
                ctx.stroke();

                // Left pan line
                const leftTilt = Math.sin(this.tiltPhase + 0.5) * 8;
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, 0);
                ctx.lineTo(-this.width / 2, 12 + leftTilt);
                ctx.strokeStyle = 'hsla(45, 50%, 55%, 0.3)';
                ctx.stroke();

                // Right pan line
                const rightTilt = Math.sin(this.tiltPhase + 0.5 + Math.PI) * 8;
                ctx.beginPath();
                ctx.moveTo(this.width / 2, 0);
                ctx.lineTo(this.width / 2, 12 + rightTilt);
                ctx.strokeStyle = 'hsla(45, 50%, 55%, 0.3)';
                ctx.stroke();

                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 20; i++) {
            lightRays.push(new LightRay());
        }
        for (let i = 0; i < 35; i++) {
            feathers.push(new FeatherParticle());
        }
        for (let i = 0; i < 60; i++) {
            dustMotes.push(new DustMote());
        }
        for (let i = 0; i < 4; i++) {
            balanceBeams.push(new BalanceBeam());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Central truth glow
            const truthX = width / 2;
            const truthY = height * 0.3;
            const truthGrad = ctx.createRadialGradient(truthX, truthY, 0, truthX, truthY, Math.min(width, height) * 0.3);
            truthGrad.addColorStop(0, 'hsla(175, 60%, 55%, 0.03)');
            truthGrad.addColorStop(0.5, 'hsla(175, 50%, 45%, 0.01)');
            truthGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = truthGrad;
            ctx.fillRect(0, 0, width, height);

            // Light rays
            lightRays.forEach(r => { r.update(); r.draw(); });

            // Balance beams
            balanceBeams.forEach(b => { b.update(); b.draw(); });

            // Dust motes
            dustMotes.forEach(d => { d.update(); d.draw(); });

            // Feathers
            feathers.forEach(f => { f.update(); f.draw(); });

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

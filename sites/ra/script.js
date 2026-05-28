/**
 * Rꜥ FLAGSHIP TEMPLE — SOLAR CANVAS & INTERACTIONS
 * Solar rays, desert heat shimmer, sand particles, falcon silhouettes
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
        let solarRays = [];
        let sand = [];
        let heatShimmer = [];
        let falcons = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class SolarRay {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.length = Math.random() * 300 + 150;
                this.width = Math.random() * 1.5 + 0.5;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.05 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0003;
                this.centerX = width / 2;
                this.centerY = height * 0.25;
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
                const x1 = this.centerX + Math.cos(this.angle) * 80;
                const y1 = this.centerY + Math.sin(this.angle) * 80;
                const x2 = this.centerX + Math.cos(this.angle) * (80 + this.length);
                const y2 = this.centerY + Math.sin(this.angle) * (80 + this.length);

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = 'hsla(45, 80%, 60%, 0.6)';
                ctx.lineWidth = this.width;
                ctx.stroke();
                ctx.restore();
            }
        }

        class SandParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = -(Math.random() * 0.3 + 0.1);
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.3 + 0.05;
                this.hue = Math.random() > 0.6 ? 35 : (Math.random() > 0.5 ? 40 : 45);
                this.life = Math.random() * 400 + 200;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.2 + 0.1);

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 60%, 55%)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 50%, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class HeatShimmer {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5 + height * 0.3;
                this.radius = Math.random() * 80 + 40;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.02;
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
                gradient.addColorStop(0, 'hsla(30, 60%, 60%, 0.4)');
                gradient.addColorStop(0.5, 'hsla(30, 50%, 50%, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Falcon {
            constructor() {
                this.reset();
            }

            reset() {
                this.side = Math.random() > 0.5 ? 'left' : 'right';
                this.x = this.side === 'left' ? -30 : width + 30;
                this.y = Math.random() * height * 0.3 + 50;
                this.vx = this.side === 'left' ? (Math.random() * 0.6 + 0.2) : -(Math.random() * 0.6 + 0.2);
                this.vy = (Math.random() - 0.5) * 0.1;
                this.size = Math.random() * 2 + 1.5;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.2 + 0.08;
                this.growing = true;
                this.wingPhase = Math.random() * Math.PI * 2;
                this.wingSpeed = Math.random() * 0.06 + 0.03;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.wingPhase += this.wingSpeed;

                if (this.growing) {
                    this.opacity += 0.003;
                    if (this.opacity >= this.targetOpacity) this.growing = false;
                } else {
                    this.opacity -= 0.002;
                }

                if (this.opacity <= 0 || (this.side === 'left' && this.x > width + 50) || (this.side === 'right' && this.x < -50)) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                
                const wingOffset = Math.sin(this.wingPhase) * 3;
                ctx.fillStyle = '#2A2018';
                
                // Body
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 2.5, this.size * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                ctx.beginPath();
                ctx.moveTo(-this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(-this.size * 3, -this.size * 1.8 + wingOffset, -this.size * 4, -this.size * 0.3 + wingOffset);
                ctx.quadraticCurveTo(-this.size * 2, -this.size * 0.3, -this.size, 0);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(this.size * 3, -this.size * 1.8 - wingOffset, this.size * 4, -this.size * 0.3 - wingOffset);
                ctx.quadraticCurveTo(this.size * 2, -this.size * 0.3, this.size, 0);
                ctx.fill();
                
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 16; i++) {
            solarRays.push(new SolarRay());
        }
        for (let i = 0; i < 50; i++) {
            sand.push(new SandParticle());
        }
        for (let i = 0; i < 6; i++) {
            heatShimmer.push(new HeatShimmer());
        }
        for (let i = 0; i < 3; i++) {
            falcons.push(new Falcon());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Central sun glow
            const sunX = width / 2;
            const sunY = height * 0.25;
            const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.min(width, height) * 0.35);
            sunGrad.addColorStop(0, 'hsla(45, 80%, 50%, 0.04)');
            sunGrad.addColorStop(0.5, 'hsla(40, 70%, 40%, 0.015)');
            sunGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGrad;
            ctx.fillRect(0, 0, width, height);

            // Solar rays
            solarRays.forEach(r => { r.update(); r.draw(); });

            // Heat shimmer
            heatShimmer.forEach(h => { h.update(); h.draw(); });

            // Falcons
            falcons.forEach(f => { f.update(); f.draw(); });

            // Sand
            sand.forEach(s => { s.update(); s.draw(); });

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

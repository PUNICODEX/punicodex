/**
 * DELPHOÍ — The Oracle
 * Interactive Layer: Golden Light Rays, Dust Motes, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Canvas Golden Light System
    // ============================
    const canvas = document.getElementById('light-canvas');
    let ctx, width, height;
    let lightRays = [];
    let dustMotes = [];
    let glowPulses = [];
    let lastGlowTime = 0;

    if (canvas && !prefersReducedMotion) {
        ctx = canvas.getContext('2d');

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class LightRay {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = (Math.random() * 30 - 15) * (Math.PI / 180); // Diagonal, -15 to +15 degrees
                this.x = Math.random() * width;
                this.y = -100;
                this.width = 80 + Math.random() * 200;
                this.length = height * 1.5;
                this.speed = 0.05 + Math.random() * 0.1;
                this.opacity = 0.02 + Math.random() * 0.04;
                this.phase = Math.random() * Math.PI * 2;
                this.driftSpeed = 0.0005 + Math.random() * 0.001;
            }

            update() {
                this.phase += this.driftSpeed;
                this.opacity = 0.02 + Math.sin(this.phase) * 0.015;
                if (this.opacity < 0) this.opacity = 0.005;
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                const gradient = ctx.createLinearGradient(0, 0, 0, this.length);
                gradient.addColorStop(0, `rgba(212, 175, 55, 0)`);
                gradient.addColorStop(0.1, `rgba(212, 175, 55, ${this.opacity})`);
                gradient.addColorStop(0.5, `rgba(240, 216, 120, ${this.opacity * 0.6})`);
                gradient.addColorStop(0.9, `rgba(212, 175, 55, ${this.opacity * 0.3})`);
                gradient.addColorStop(1, `rgba(212, 175, 55, 0)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(-this.width / 2, 0, this.width, this.length);
                ctx.restore();
            }
        }

        class DustMote {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = -(Math.random() * 0.15 + 0.05);
                this.size = Math.random() * 1.5 + 0.5;
                this.baseOpacity = Math.random() * 0.3 + 0.1;
                this.opacity = this.baseOpacity;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.phase += 0.01;
                this.opacity = this.baseOpacity + Math.sin(this.phase) * 0.1;

                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
                if (this.x < -10) this.x = width + 10;
                if (this.x > width + 10) this.x = -10;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = '#f0d878';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class GlowPulse {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = 50 + Math.random() * 150;
                this.maxRadius = this.radius * 2;
                this.opacity = 0.08 + Math.random() * 0.06;
                this.life = 0;
                this.maxLife = 120 + Math.random() * 80;
                this.active = true;
            }

            update() {
                this.life++;
                const progress = this.life / this.maxLife;
                this.currentRadius = this.radius + (this.maxRadius - this.radius) * progress;
                this.currentOpacity = this.opacity * (1 - progress) * Math.sin(progress * Math.PI);

                if (this.life >= this.maxLife) {
                    this.active = false;
                }
            }

            draw() {
                if (!this.active) return;
                ctx.save();
                ctx.globalAlpha = this.currentOpacity;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.currentRadius
                );
                gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
                gradient.addColorStop(0.5, 'rgba(240, 216, 120, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        for (let i = 0; i < 8; i++) {
            lightRays.push(new LightRay());
        }
        for (let i = 0; i < 40; i++) {
            dustMotes.push(new DustMote());
        }

        function animateLight() {
            ctx.clearRect(0, 0, width, height);

            // Light rays
            lightRays.forEach(ray => {
                ray.update();
                ray.draw();
            });

            // Glow pulses
            const now = Date.now();
            if (now - lastGlowTime > 2000 + Math.random() * 3000) {
                glowPulses.push(new GlowPulse());
                lastGlowTime = now;
            }

            glowPulses = glowPulses.filter(p => p.active);
            glowPulses.forEach(p => {
                p.update();
                p.draw();
            });

            // Dust motes (drawn last, on top)
            dustMotes.forEach(mote => {
                mote.update();
                mote.draw();
            });

            requestAnimationFrame(animateLight);
        }

        animateLight();
    } else if (canvas) {
        canvas.style.display = 'none';
    }

    // ============================
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    // ============================
    // Navigation
    // ============================
    const nav = document.querySelector('.main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const scrollY = window.scrollY;
        
        if (scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        
        lastScrollY = scrollY;
    });

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                if (navLinks) {
                    navLinks.classList.remove('active');
                }
                if (navToggle) {
                    navToggle.classList.remove('active');
                }
            }
        });
    });

    // ============================
    // Parallax on Hero Mascot
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    
    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroHeight = document.querySelector('.hero').offsetHeight;
            
            if (scrollY < heroHeight) {
                const parallax = scrollY * 0.15;
                heroMascot.style.transform = `translateY(${parallax}px)`;
            }
        });
    }

    // ============================
    // Mouse Follow Glow (Desktop)
    // ============================
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    
    if (!isTouchDevice && !prefersReducedMotion) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            document.querySelectorAll('.name-card, .domain-card, .myth-content, .variation-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    card.style.transform = `translateY(-5px) perspective(1000px) rotateX(${-y * 0.3}deg) rotateY(${x * 0.3}deg)`;
                }
            });
        });
    }

})();

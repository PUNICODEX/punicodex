/**
 * TÁRTAROS — The Primordial Abyss
 * Interactive Layer: Falling depth particles, vortex, reveals, navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Abyss Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('abyss-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let depthParticles = [];
        let mistParticles = [];
        let vortexAngle = 0;
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class DepthParticle {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -20;
                this.baseSpeed = Math.random() * 1.5 + 0.5;
                this.speed = this.baseSpeed;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.02 + 0.005;
            }

            update() {
                // Perspective effect: larger/brighter at top, smaller/dimmer at bottom
                const progress = this.y / height;
                this.speed = this.baseSpeed * (1 + progress * 2);
                this.y += this.speed;
                this.wobble += this.wobbleSpeed;
                this.x += Math.sin(this.wobble) * 0.3;

                // Fade out near bottom
                if (this.y > height + 10) {
                    this.reset(false);
                }
            }

            draw() {
                const progress = Math.min(this.y / height, 1);
                const currentSize = this.size * (1 - progress * 0.6);
                const currentOpacity = this.opacity * (1 - progress * 0.7);

                if (currentSize <= 0 || currentOpacity <= 0) return;

                ctx.save();
                ctx.globalAlpha = currentOpacity;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, currentSize * 2
                );
                gradient.addColorStop(0, 'rgba(138, 122, 237, 0.8)');
                gradient.addColorStop(0.5, 'rgba(106, 90, 205, 0.3)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentSize * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class MistParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 50;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = -(Math.random() * 0.3 + 0.1);
                this.size = Math.random() * 60 + 30;
                this.opacity = Math.random() * 0.02 + 0.005;
                this.life = Math.random() * 800 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.015 + 0.005);

                if (this.life <= 0 || this.y < -100) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.size
                );
                gradient.addColorStop(0, 'hsla(250, 40%, 55%, 0.25)');
                gradient.addColorStop(0.5, 'hsla(250, 30%, 40%, 0.08)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 120; i++) {
            depthParticles.push(new DepthParticle());
        }
        for (let i = 0; i < 12; i++) {
            mistParticles.push(new MistParticle());
        }

        window.addEventListener('resize', resize);

        function drawVortex() {
            const cx = width / 2;
            const cy = height / 2;
            const maxRadius = Math.min(width, height) * 0.45;

            ctx.save();
            ctx.globalAlpha = 0.04;
            ctx.translate(cx, cy);
            ctx.rotate(vortexAngle);

            for (let r = 20; r < maxRadius; r += 15) {
                ctx.beginPath();
                const turns = 3;
                const points = 80;
                for (let i = 0; i <= points; i++) {
                    const t = i / points;
                    const angle = t * Math.PI * 2 * turns;
                    const radius = r + t * maxRadius * 0.3;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `rgba(106, 90, 205, ${0.15 - r / maxRadius * 0.12})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        }

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep radial background glow
            const centerGrad = ctx.createRadialGradient(
                width / 2, height * 0.45, 0,
                width / 2, height * 0.45, Math.min(width, height) * 0.55
            );
            centerGrad.addColorStop(0, 'hsla(250, 30%, 12%, 0.08)');
            centerGrad.addColorStop(0.5, 'hsla(250, 20%, 8%, 0.03)');
            centerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGrad;
            ctx.fillRect(0, 0, width, height);

            // Subtle vortex
            vortexAngle += 0.0008;
            drawVortex();

            // Depth particles (falling)
            depthParticles.forEach(p => {
                p.update();
                p.draw();
            });

            // Mist particles (rising)
            mistParticles.forEach(p => {
                p.update();
                p.draw();
            });

            // Occasional flash of distant "lightning" in the abyss
            if (Math.random() < 0.002) {
                ctx.save();
                ctx.globalAlpha = 0.03 + Math.random() * 0.04;
                ctx.fillStyle = 'rgba(106, 90, 205, 1)';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }

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
                const offset = 100;
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

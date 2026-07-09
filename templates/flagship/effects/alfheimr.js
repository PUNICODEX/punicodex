/**
 * ÁLFHEIMR FLAGSHIP TEMPLE — ELF CANVAS & INTERACTIONS
 * Golden light particles, blossom petals, lens flares — luminous and ethereal
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Elf Canvas ───────────────────────────────────────────────────────── */
    const canvas = document.getElementById('elf-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let fireflies = [];
        let petals = [];
        let lensFlares = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        /* Firefly — tiny golden light particle floating upward */
        class Firefly {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 10;
                this.baseY = this.y;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = -(Math.random() * 0.6 + 0.2);
                this.size = Math.random() * 2 + 0.5;
                this.baseAlpha = Math.random() * 0.6 + 0.3;
                this.alpha = this.baseAlpha;
                this.pulseSpeed = Math.random() * 0.03 + 0.01;
                this.pulsePhase = Math.random() * Math.PI * 2;
                this.color = this.pickColor();
            }

            pickColor() {
                const colors = [
                    { r: 255, g: 215, b: 0 },    // Gold
                    { r: 255, g: 228, b: 77 },   // Bright gold
                    { r: 255, g: 183, b: 77 },   // Amber
                    { r: 129, g: 212, b: 250 },  // Sky blue
                    { r: 124, g: 179, b: 66 },   // Spring green
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.pulsePhase += this.pulseSpeed;
                this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.15;
                if (this.alpha < 0) this.alpha = 0;
                if (this.alpha > 1) this.alpha = 1;

                this.x += this.vx + Math.sin(this.pulsePhase * 0.7) * 0.3;
                this.y += this.vy;

                // Wrap horizontally
                if (this.x < -10) this.x = width + 10;
                if (this.x > width + 10) this.x = -10;

                // Reset when off top
                if (this.y < -20) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;

                // Glow
                ctx.shadowBlur = 12;
                ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;

                // Core
                ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Bright center
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        /* Blossom Petal — drifting down and swirling */
        class Petal {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -20;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = Math.random() * 0.5 + 0.3;
                this.size = Math.random() * 6 + 4;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.03;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.02 + 0.01;
                this.swayAmp = Math.random() * 1.5 + 0.5;
                this.color = this.pickColor();
                this.opacity = Math.random() * 0.4 + 0.2;
            }

            pickColor() {
                const colors = [
                    { r: 248, g: 187, b: 208 },  // Blossom pink
                    { r: 255, g: 255, b: 255 },  // White
                    { r: 255, g: 215, b: 230 },  // Light pink
                    { r: 255, g: 241, b: 245 },  // Pale pink
                    { r: 232, g: 245, b: 233 },  // Crystal white-green
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.swayPhase += this.swaySpeed;
                this.x += this.vx + Math.sin(this.swayPhase) * this.swayAmp;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;

                // Wrap horizontally
                if (this.x < -20) this.x = width + 20;
                if (this.x > width + 20) this.x = -20;

                // Reset when off bottom
                if (this.y > height + 20) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);

                // Draw petal shape (oval)
                ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();

                // Subtle vein line
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.4)`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.5, 0);
                ctx.lineTo(this.size * 0.5, 0);
                ctx.stroke();

                ctx.restore();
            }
        }

        /* Lens Flare — soft light burst */
        class LensFlare {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.6;
                this.size = Math.random() * 80 + 40;
                this.maxLife = Math.random() * 400 + 300;
                this.life = this.maxLife;
                this.color = this.pickColor();
            }

            pickColor() {
                const colors = [
                    { r: 255, g: 215, b: 0 },    // Gold
                    { r: 255, g: 255, b: 220 },  // Warm white
                    { r: 248, g: 187, b: 208 },  // Pink
                    { r: 129, g: 212, b: 250 },  // Sky
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.life--;
                if (this.life <= 0) {
                    this.reset();
                }
            }

            draw() {
                const progress = this.life / this.maxLife;
                const fadeIn = Math.min(progress * 4, 1);
                const fadeOut = Math.min((1 - progress) * 4, 1);
                const alpha = Math.min(fadeIn, fadeOut) * 0.15;

                ctx.save();
                ctx.globalAlpha = alpha;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.size
                );
                gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`);
                gradient.addColorStop(0.4, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.15)`);
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
        for (let i = 0; i < 60; i++) {
            fireflies.push(new Firefly());
        }
        for (let i = 0; i < 25; i++) {
            petals.push(new Petal());
        }
        for (let i = 0; i < 4; i++) {
            lensFlares.push(new LensFlare());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep background glow — warm golden center
            const centerGrad = ctx.createRadialGradient(
                width / 2, height * 0.35, 0,
                width / 2, height * 0.35, Math.min(width, height) * 0.5
            );
            centerGrad.addColorStop(0, 'hsla(50, 60%, 15%, 0.08)');
            centerGrad.addColorStop(0.5, 'hsla(50, 40%, 10%, 0.03)');
            centerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGrad;
            ctx.fillRect(0, 0, width, height);

            // Lens flares (behind everything)
            lensFlares.forEach(lf => { lf.update(); lf.draw(); });

            // Petals
            petals.forEach(p => { p.update(); p.draw(); });

            // Fireflies
            fireflies.forEach(f => { f.update(); f.draw(); });

            // Occasional sparkle burst
            if (frameCount % 120 === 0) {
                const sx = Math.random() * width;
                const sy = Math.random() * height * 0.7;
                for (let i = 0; i < 5; i++) {
                    ctx.save();
                    ctx.globalAlpha = 0.3 + Math.random() * 0.3;
                    ctx.fillStyle = `rgba(255, 215, 0, ${Math.random() * 0.5 + 0.2})`;
                    ctx.beginPath();
                    ctx.arc(
                        sx + (Math.random() - 0.5) * 20,
                        sy + (Math.random() - 0.5) * 20,
                        Math.random() * 1.5 + 0.5,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                    ctx.restore();
                }
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

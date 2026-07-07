/**
 * HELHEIMR FLAGSHIP TEMPLE — MIST CANVAS & INTERACTIONS
 * Cold mist, fog particles, skeletal silhouettes, dark water ripples
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Mist Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('mist-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let mistLayers = [];
        let fogParticles = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class MistLayer {
            constructor(yOffset, speed, opacity) {
                this.yOffset = yOffset;
                this.speed = speed;
                this.opacity = opacity;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createLinearGradient(0, this.yOffset, 0, this.yOffset + 200);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.5, 'hsla(120, 10%, 35%, 0.08)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                
                ctx.beginPath();
                for (let x = 0; x <= width; x += 50) {
                    const y = this.yOffset + Math.sin(x * 0.003 + this.phase) * 30 + Math.sin(x * 0.007 + this.phase * 0.5) * 15;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        class FogParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.1 + 0.05);
                this.size = Math.random() * 80 + 40;
                this.opacity = Math.random() * 0.03 + 0.01;
                this.life = Math.random() * 600 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.02 + 0.01);

                if (this.life <= 0 || this.y < -100) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
                gradient.addColorStop(0, 'hsla(120, 10%, 50%, 0.3)');
                gradient.addColorStop(0.5, 'hsla(120, 10%, 40%, 0.1)');
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
        for (let i = 0; i < 4; i++) {
            mistLayers.push(new MistLayer(
                height * (0.3 + i * 0.15),
                0.0005 + i * 0.0002,
                0.04 + i * 0.02
            ));
        }
        for (let i = 0; i < 15; i++) {
            fogParticles.push(new FogParticle());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep background glow
            const centerGrad = ctx.createRadialGradient(
                width / 2, height * 0.4, 0,
                width / 2, height * 0.4, Math.min(width, height) * 0.5
            );
            centerGrad.addColorStop(0, 'hsla(120, 10%, 15%, 0.05)');
            centerGrad.addColorStop(0.5, 'hsla(120, 8%, 10%, 0.02)');
            centerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGrad;
            ctx.fillRect(0, 0, width, height);

            // Mist layers
            mistLayers.forEach(m => { m.update(); m.draw(); });

            // Fog particles
            fogParticles.forEach(f => { f.update(); f.draw(); });

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

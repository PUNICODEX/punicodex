/**
 * SPÁRTĒ — The Warrior City-State
 * Interactive Layer: Dust, Spear Glints, Heat Shimmer, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Spartan Environment
    // ============================
    const canvas = document.getElementById('sparte-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Dust Particles
    const dustColors = [
        'rgba(139, 0, 0, ',
        'rgba(205, 127, 50, ',
        'rgba(192, 192, 192, ',
        'rgba(90, 90, 90, ',
        'rgba(92, 58, 30, '
    ];
    const dustCount = 180;
    const dustParticles = [];

    class DustParticle {
        constructor() {
            this.reset(true);
        }
        reset(randomX = false) {
            this.x = randomX ? Math.random() * width : -10;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = Math.random() * 1.5 + 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.3 + 0.1;
            this.colorBase = dustColors[Math.floor(Math.random() * dustColors.length)];
            this.drift = Math.random() * Math.PI * 2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY + Math.sin(this.drift) * 0.1;
            this.drift += 0.02;
            if (this.x > width + 10) this.reset();
            if (this.y < -10 || this.y > height + 10) this.y = Math.random() * height;
        }
        draw(ctx) {
            ctx.fillStyle = this.colorBase + this.opacity + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < dustCount; i++) {
        dustParticles.push(new DustParticle());
    }

    // Spear Glints
    let glints = [];
    class SpearGlint {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height * 0.7 + height * 0.1;
            this.life = 0;
            this.maxLife = 8 + Math.random() * 12;
            this.size = Math.random() * 3 + 1;
            this.angle = Math.random() * Math.PI;
        }
        update() {
            this.life++;
            return this.life < this.maxLife;
        }
        draw(ctx) {
            const progress = this.life / this.maxLife;
            const opacity = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);
            const alpha = opacity * 0.8;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgba(240, 230, 210, ' + alpha + ')';
            ctx.lineWidth = 1;
            const len = this.size * 4;
            ctx.beginPath();
            ctx.moveTo(-len, 0);
            ctx.lineTo(len, 0);
            ctx.moveTo(0, -len * 0.6);
            ctx.lineTo(0, len * 0.6);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Heat Shimmer
    let shimmerTime = 0;

    function drawHeatShimmer() {
        shimmerTime += 0.01;
        const pulse = Math.sin(shimmerTime) * 0.5 + 0.5;
        const gradient = ctx.createRadialGradient(
            width * 0.5, height * 0.8, 0,
            width * 0.5, height * 0.8, height * 0.6
        );
        gradient.addColorStop(0, 'rgba(139, 0, 0, ' + (0.03 * pulse) + ')');
        gradient.addColorStop(0.5, 'rgba(205, 127, 50, ' + (0.02 * pulse) + ')');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        drawHeatShimmer();
        dustParticles.forEach(p => { p.update(); p.draw(ctx); });
        if (Math.random() < 0.03) { glints.push(new SpearGlint()); }
        glints = glints.filter(g => { g.draw(ctx); return g.update(); });
        requestAnimationFrame(animate);
    }

    animate();

    // ============================
    
    } else {
    }
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                setTimeout(() => { entry.target.classList.add('revealed'); }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealElements.forEach(el => revealObserver.observe(el));

    // ============================
    // Navigation
    // ============================
    const nav = document.getElementById('main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 100);
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // ============================
    // Prefers Reduced Motion
    // ============================
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach(el => el.classList.add('revealed'));
        // Canvas is visible by default
    }
})();

/**
 * ATHĒNAI — City of Athena
 * Interactive Layer: Mediterranean Light, Olive Leaves, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Mediterranean System
    // ============================
    const canvas = document.getElementById('mediterranean-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let particles = [];
    let leaves = [];
    let shimmer;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const lightColors = [
        { r: 212, g: 175, b: 55 },   // Gold
        { r: 240, g: 216, b: 120 },  // Gold bright
        { r: 255, g: 250, b: 240 },  // Warm white
        { r: 193, g: 127, b: 89 },   // Terracotta
    ];

    class LightParticle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + Math.random() * 50;
            this.size = 0.5 + Math.random() * 2;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = -0.2 - Math.random() * 0.5;
            this.opacity = 0.1 + Math.random() * 0.4;
            this.opacitySpeed = (Math.random() - 0.5) * 0.005;
            this.color = lightColors[Math.floor(Math.random() * lightColors.length)];
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.opacity += this.opacitySpeed;

            if (this.opacity > 0.5 || this.opacity < 0.05) {
                this.opacitySpeed *= -1;
            }

            if (this.y < -50 || this.x < -50 || this.x > width + 50) {
                this.reset();
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class OliveLeaf {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : -50 - Math.random() * 100;
            this.width = 6 + Math.random() * 8;
            this.height = 12 + Math.random() * 16;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.02;
            this.speedY = 0.3 + Math.random() * 0.6;
            this.swayOffset = Math.random() * Math.PI * 2;
            this.swaySpeed = 0.01 + Math.random() * 0.02;
            this.swayAmplitude = 0.2 + Math.random() * 0.4;
            this.opacity = 0.15 + Math.random() * 0.25;
            const greens = [
                { r: 85, g: 107, b: 47 },
                { r: 107, g: 142, b: 35 },
                { r: 45, g: 74, b: 34 },
            ];
            this.color = greens[Math.floor(Math.random() * greens.length)];
        }

        update() {
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            this.x += Math.sin(this.swayOffset) * this.swayAmplitude;
            this.swayOffset += this.swaySpeed;

            if (this.y > height + 50) {
                this.reset();
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Leaf vein
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(0, this.height / 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    class HeatShimmer {
        constructor() {
            this.x = width * 0.7;
            this.y = height * 0.3;
            this.radius = Math.max(width, height) * 0.5;
            this.opacity = 0.02;
            this.opacitySpeed = 0.0003;
            this.scale = 1;
            this.scaleSpeed = 0.0005;
        }

        update() {
            this.opacity += this.opacitySpeed;
            if (this.opacity > 0.04 || this.opacity < 0.01) {
                this.opacitySpeed *= -1;
            }
            this.scale += this.scaleSpeed;
            if (this.scale > 1.1 || this.scale < 0.9) {
                this.scaleSpeed *= -1;
            }
        }

        draw(ctx) {
            ctx.save();
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius * this.scale
            );
            gradient.addColorStop(0, `rgba(212, 175, 55, ${this.opacity})`);
            gradient.addColorStop(0.5, `rgba(240, 216, 120, ${this.opacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    // Initialize
    for (let i = 0; i < 60; i++) {
        particles.push(new LightParticle());
    }
    for (let i = 0; i < 12; i++) {
        leaves.push(new OliveLeaf());
    }
    shimmer = new HeatShimmer();

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Heat shimmer
        shimmer.update();
        shimmer.draw(ctx);

        // Light particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Olive leaves
        leaves.forEach(l => {
            l.update();
            l.draw(ctx);
        });

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

    // ============================
    // Navigation
    // ============================
    const nav = document.getElementById('main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

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
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // ============================
    // Parallax on Hero Mascot
    // ============================
    const heroMascot = document.querySelector('.mascot-img');

    window.addEventListener('scroll', () => {
        if (!heroMascot) return;
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero').offsetHeight;

        if (scrollY < heroHeight) {
            const parallax = scrollY * 0.15;
            heroMascot.style.transform = `translateY(${parallax}px)`;
        }
    });

    // ============================
    // Mouse Follow Glow (Desktop)
    // ============================
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            document.querySelectorAll('.name-card, .domain-card, .myth-content').forEach(card => {
                const rect = card.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    card.style.transform = `translateY(-5px) perspective(1000px) rotateX(${-y * 0.3}deg) rotateY(${x * 0.3}deg)`;
                }
            });
        });
    }

    // ============================
    // Prefers Reduced Motion
    // ============================
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach(el => el.classList.add('revealed'));
        if (canvas) canvas.style.display = 'none';
    }

})();

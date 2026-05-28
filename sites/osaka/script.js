/**
 * ŌSAKA — Merchant City
 * Interactive Layer: Night City Energy, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Night City System
    // ============================
    const canvas = document.getElementById('city-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let streaks = [];
    let particles = [];
    let sparkles = [];
    let lanterns = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initSparkles();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Horizontal light streaks — neon reflections on wet streets
    class Streak {
        constructor() {
            this.reset();
        }

        reset() {
            this.y = Math.random() * height;
            this.x = Math.random() < 0.5 ? -200 : width + 200;
            this.speed = (1.5 + Math.random() * 3) * (this.x < 0 ? 1 : -1);
            this.length = 100 + Math.random() * 300;
            this.thickness = 0.5 + Math.random() * 1.5;
            this.opacity = 0;
            this.maxOpacity = 0.15 + Math.random() * 0.25;
            this.life = 0;
            this.maxLife = 120 + Math.random() * 180;
            this.color = this.pickColor();
            this.fadeIn = 30 + Math.random() * 30;
            this.fadeOut = this.maxLife - (30 + Math.random() * 30);
        }

        pickColor() {
            const colors = [
                { r: 233, g: 30, b: 99 },   // Night Neon
                { r: 255, g: 213, b: 79 },  // Castle Gold
                { r: 255, g: 143, b: 0 },   // Street Lantern
                { r: 183, g: 28, b: 28 },   // Osaka Red
                { r: 21, g: 101, b: 192 },  // Dark Water
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.life++;
            this.x += this.speed;

            if (this.life < this.fadeIn) {
                this.opacity = (this.life / this.fadeIn) * this.maxOpacity;
            } else if (this.life > this.fadeOut) {
                this.opacity = ((this.maxLife - this.life) / (this.maxLife - this.fadeOut)) * this.maxOpacity;
            }

            if (this.life >= this.maxLife) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;

            const gradient = ctx.createLinearGradient(this.x, this.y, this.x + (this.speed > 0 ? this.length : -this.length), this.y);
            gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
            gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`);
            gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + (this.speed > 0 ? this.length : -this.length), this.y);
            ctx.stroke();

            ctx.restore();
        }
    }

    // Rising light particles — like lanterns or fireworks
    class Lantern {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + 20;
            this.speedY = 0.3 + Math.random() * 0.8;
            this.drift = (Math.random() - 0.5) * 0.3;
            this.radius = 1.5 + Math.random() * 3;
            this.opacity = 0;
            this.maxOpacity = 0.3 + Math.random() * 0.4;
            this.life = 0;
            this.maxLife = 300 + Math.random() * 400;
            this.color = this.pickColor();
            this.pulseOffset = Math.random() * Math.PI * 2;
        }

        pickColor() {
            const colors = [
                { r: 255, g: 143, b: 0 },   // Street Lantern
                { r: 255, g: 213, b: 79 },  // Castle Gold
                { r: 233, g: 30, b: 99 },   // Night Neon
                { r: 255, g: 100, b: 80 },  // Warm fire
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.life++;
            this.y -= this.speedY;
            this.x += this.drift + Math.sin(this.life * 0.01 + this.pulseOffset) * 0.2;

            const pulse = Math.sin(this.life * 0.03 + this.pulseOffset) * 0.15 + 0.85;

            if (this.life < 40) {
                this.opacity = (this.life / 40) * this.maxOpacity * pulse;
            } else if (this.life > this.maxLife - 60) {
                this.opacity = ((this.maxLife - this.life) / 60) * this.maxOpacity * pulse;
            } else {
                this.opacity = this.maxOpacity * pulse;
            }

            if (this.life >= this.maxLife || this.y < -20) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // City sparkles — distant lights
    class Sparkle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height * 0.7;
            this.radius = 0.5 + Math.random() * 1.2;
            this.baseOpacity = 0.1 + Math.random() * 0.3;
            this.twinkleSpeed = 0.005 + Math.random() * 0.02;
            this.phase = Math.random() * Math.PI * 2;
        }

        draw(ctx, time) {
            const opacity = this.baseOpacity + Math.sin(time * this.twinkleSpeed + this.phase) * this.baseOpacity * 0.5;
            if (opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = Math.max(0, opacity);
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function initSparkles() {
        sparkles = [];
        const count = Math.floor((width * height) / 12000);
        for (let i = 0; i < count; i++) {
            sparkles.push(new Sparkle());
        }
    }

    // Initialize entities
    for (let i = 0; i < 12; i++) {
        streaks.push(new Streak());
        streaks[i].life = Math.random() * streaks[i].maxLife;
    }

    for (let i = 0; i < 20; i++) {
        lanterns.push(new Lantern());
        lanterns[i].life = Math.random() * lanterns[i].maxLife;
        lanterns[i].y = height - Math.random() * height * 0.8;
    }

    initSparkles();

    function animateCity() {
        // Very dark urban background
        ctx.fillStyle = 'rgba(8, 8, 8, 0.25)';
        ctx.fillRect(0, 0, width, height);

        const time = Date.now();

        // Draw subtle grid lines — urban texture
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 213, 79, 0.015)';
        ctx.lineWidth = 0.5;
        const gridSize = 80;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw sparkles (city lights in distance)
        sparkles.forEach(s => s.draw(ctx, time));

        // Draw streaks (neon reflections on wet streets)
        streaks.forEach(streak => {
            streak.update();
            streak.draw(ctx);
        });

        // Draw lanterns (rising light particles)
        lanterns.forEach(lantern => {
            lantern.update();
            lantern.draw(ctx);
        });

        // Occasional burst sparkles at lantern positions
        if (Math.random() < 0.02) {
            const lantern = lanterns[Math.floor(Math.random() * lanterns.length)];
            for (let i = 0; i < 3; i++) {
                sparkles.push(new Sparkle());
                sparkles[sparkles.length - 1].x = lantern.x + (Math.random() - 0.5) * 40;
                sparkles[sparkles.length - 1].y = lantern.y + (Math.random() - 0.5) * 40;
                sparkles[sparkles.length - 1].baseOpacity = 0.4;
                sparkles[sparkles.length - 1].twinkleSpeed = 0.05;
            }
        }

        // Clean up excess sparkles
        if (sparkles.length > 200) {
            sparkles.splice(0, sparkles.length - 200);
        }

        requestAnimationFrame(animateCity);
    }

    animateCity();

    // ============================
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay) || 0;
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
            
            document.querySelectorAll('.name-card, .domain-card, .myth-content, .variation-card').forEach(card => {
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
        canvas.style.display = 'none';
    }

})();

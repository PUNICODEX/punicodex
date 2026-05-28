/**
 * CHÁOS — The First Void
 * Interactive Layer: Spiral Vortex, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Spiral Vortex System
    // ============================
    const canvas = document.getElementById('vortex-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let streaks = [];
    let centerX, centerY;
    let globalRotation = 0;
    const MAX_PARTICLES = 350;
    const MAX_STREAKS = 5;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        centerX = width / 2;
        centerY = height / 2;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(randomStart = false) {
            // Start at outer edge with random angle
            this.angle = Math.random() * Math.PI * 2;
            // Distance from center — start far out
            this.distance = randomStart ? Math.random() * Math.max(width, height) * 0.7 + 50 : Math.max(width, height) * 0.55 + Math.random() * 100;
            // Spiral inward speed
            this.speed = 0.3 + Math.random() * 1.2;
            // Angular velocity (counter-clockwise spiral)
            this.angularSpeed = (0.001 + Math.random() * 0.003) * (Math.random() < 0.5 ? 1 : -1);
            // Size varies with distance: larger outside, smaller inside
            this.baseSize = this.mapRange(this.distance, 0, Math.max(width, height) * 0.6, 0.5, 3.5);
            this.size = this.baseSize;
            // Color: golden outside, white/blue-white inside
            this.hue = this.distance > Math.max(width, height) * 0.3 ? 45 + Math.random() * 15 : 220 + Math.random() * 40;
            this.saturation = this.distance > Math.max(width, height) * 0.3 ? 90 : 20;
            this.lightness = this.distance > Math.max(width, height) * 0.3 ? 60 + Math.random() * 30 : 80 + Math.random() * 20;
            this.alpha = 0.3 + Math.random() * 0.7;
            this.pulse = Math.random() * Math.PI * 2;
            this.pulseSpeed = 0.02 + Math.random() * 0.04;
            this.trail = [];
            this.maxTrailLength = Math.floor(3 + Math.random() * 5);
        }

        mapRange(value, inMin, inMax, outMin, outMax) {
            return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
        }

        update() {
            // Store trail
            this.trail.push({ x: centerX + Math.cos(this.angle) * this.distance, y: centerY + Math.sin(this.angle) * this.distance });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // Spiral inward
            this.distance -= this.speed;
            // Rotate around center (counter-clockwise bias)
            this.angle += this.angularSpeed - 0.002;

            // Pulse size
            this.pulse += this.pulseSpeed;
            this.size = this.baseSize * (0.8 + Math.sin(this.pulse) * 0.2);

            // Update color based on new distance
            const maxDist = Math.max(width, height) * 0.6;
            this.baseSize = this.mapRange(this.distance, 0, maxDist, 0.3, 3);
            this.size = this.baseSize * (0.8 + Math.sin(this.pulse) * 0.2);

            // Fade as we approach center
            if (this.distance < 30) {
                this.alpha -= 0.03;
            }

            // Reset when too close or invisible
            if (this.distance < 5 || this.alpha <= 0) {
                this.reset();
            }
        }

        draw(ctx) {
            const x = centerX + Math.cos(this.angle) * this.distance;
            const y = centerY + Math.sin(this.angle) * this.distance;

            // Draw trail
            if (this.trail.length > 1) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.alpha * 0.15})`;
                ctx.lineWidth = this.size * 0.5;
                ctx.stroke();
                ctx.restore();
            }

            // Draw particle
            ctx.save();
            ctx.globalAlpha = this.alpha;

            // Glow
            ctx.shadowBlur = this.size * 4;
            ctx.shadowColor = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0.6)`;

            // Main dot
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Bright core for larger particles
            if (this.size > 1.5) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = `hsla(${this.hue}, ${this.saturation * 0.5}%, 95%, ${this.alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(x, y, this.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    class EnergyStreak {
        constructor() {
            this.reset();
        }

        reset() {
            this.angle = Math.random() * Math.PI * 2;
            this.startDistance = Math.max(width, height) * 0.3 + Math.random() * Math.max(width, height) * 0.25;
            this.distance = this.startDistance;
            this.length = 30 + Math.random() * 80;
            this.speed = 2 + Math.random() * 4;
            this.angularSpeed = -0.005 - Math.random() * 0.01; // Counter-clockwise
            this.width = 0.5 + Math.random() * 2;
            this.hue = Math.random() < 0.6 ? 45 + Math.random() * 20 : 200 + Math.random() * 60; // Gold or white/blue
            this.alpha = 0;
            this.maxAlpha = 0.6 + Math.random() * 0.4;
            this.state = 'fadeIn'; // fadeIn, active, fadeOut
            this.life = 0;
            this.maxLife = 40 + Math.random() * 60;
        }

        update() {
            this.life++;

            if (this.state === 'fadeIn') {
                this.alpha += 0.05;
                if (this.alpha >= this.maxAlpha) {
                    this.alpha = this.maxAlpha;
                    this.state = 'active';
                }
            } else if (this.state === 'active') {
                if (this.life > this.maxLife * 0.6) {
                    this.state = 'fadeOut';
                }
            } else if (this.state === 'fadeOut') {
                this.alpha -= 0.03;
                if (this.alpha <= 0) {
                    this.alpha = 0;
                    this.reset();
                    return;
                }
            }

            this.distance -= this.speed;
            this.angle += this.angularSpeed;

            if (this.distance < 20) {
                this.state = 'fadeOut';
            }
        }

        draw(ctx) {
            if (this.alpha <= 0) return;

            const x = centerX + Math.cos(this.angle) * this.distance;
            const y = centerY + Math.sin(this.angle) * this.distance;
            const x2 = centerX + Math.cos(this.angle + this.angularSpeed * 3) * (this.distance - this.length);
            const y2 = centerY + Math.sin(this.angle + this.angularSpeed * 3) * (this.distance - this.length);

            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.strokeStyle = `hsla(${this.hue}, 90%, 70%, ${this.alpha})`;
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsla(${this.hue}, 90%, 60%, 0.8)`;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Bright head
            ctx.fillStyle = `hsla(${this.hue}, 50%, 95%, ${this.alpha})`;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(x, y, this.width * 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Initialize particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
        particles.push(new Particle());
    }

    // Initialize streaks
    for (let i = 0; i < MAX_STREAKS; i++) {
        streaks.push(new EnergyStreak());
    }

    function drawBackground() {
        // Dark radial gradient background
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.8);
        gradient.addColorStop(0, '#0d0614');
        gradient.addColorStop(0.3, '#0a0a0f');
        gradient.addColorStop(0.7, '#07050a');
        gradient.addColorStop(1, '#030205');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Subtle spiral arms hint
        ctx.save();
        ctx.globalAlpha = 0.015;
        ctx.strokeStyle = '#4a1a6e';
        ctx.lineWidth = 1;
        for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            for (let t = 0; t < 200; t++) {
                const r = t * 2;
                const a = t * 0.05 + arm * (Math.PI * 2 / 3) + globalRotation;
                const px = centerX + Math.cos(a) * r;
                const py = centerY + Math.sin(a) * r;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    function animateVortex() {
        drawBackground();

        // Slowly rotate the whole system counter-clockwise
        globalRotation -= 0.0003;

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Update and draw streaks
        streaks.forEach(s => {
            s.update();
            s.draw(ctx);
        });

        // Occasional new streak spawn
        if (Math.random() < 0.01) {
            const inactive = streaks.find(s => s.alpha <= 0);
            if (inactive) inactive.reset();
        }

        // Central glow
        ctx.save();
        const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
        centerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
        centerGlow.addColorStop(0.5, 'rgba(74, 26, 110, 0.04)');
        centerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = centerGlow;
        ctx.fillRect(centerX - 80, centerY - 80, 160, 160);
        ctx.restore();

        requestAnimationFrame(animateVortex);
    }

    animateVortex();

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

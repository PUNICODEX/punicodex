/**
 * ÓLYMPOS — Home of the Gods
 * Interactive Layer: Clouds, Divine Light, Eagles, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Heaven System
    // ============================
    const canvas = document.getElementById('heaven-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let clouds = [];
    let lightRays = [];
    let particles = [];
    let eagles = [];
    let lightningBolts = [];
    let lastFlash = 0;
    let flashIntensity = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Cloud class
    class Cloud {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * (height * 0.6);
            this.speed = 0.15 + Math.random() * 0.35;
            this.scale = 0.5 + Math.random() * 1.5;
            this.opacity = 0.03 + Math.random() * 0.06;
            this.puffs = [];
            const puffCount = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < puffCount; i++) {
                this.puffs.push({
                    dx: (Math.random() - 0.5) * 80 * this.scale,
                    dy: (Math.random() - 0.5) * 30 * this.scale,
                    radius: (30 + Math.random() * 40) * this.scale
                });
            }
        }

        update() {
            this.x += this.speed;
            if (this.x - 150 * this.scale > width) {
                this.x = -150 * this.scale;
                this.y = Math.random() * (height * 0.6);
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = '#F0F8FF';
            for (const puff of this.puffs) {
                ctx.beginPath();
                ctx.arc(this.x + puff.dx, this.y + puff.dy, puff.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // Light Ray class
    class LightRay {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -50;
            this.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            this.width = 20 + Math.random() * 60;
            this.length = height * 0.6 + Math.random() * height * 0.4;
            this.opacity = 0;
            this.targetOpacity = 0.02 + Math.random() * 0.04;
            this.fadeSpeed = 0.0003 + Math.random() * 0.0005;
            this.phase = Math.random() * Math.PI * 2;
        }

        update() {
            this.phase += 0.005;
            this.opacity = this.targetOpacity * (0.5 + 0.5 * Math.sin(this.phase));
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            const grad = ctx.createLinearGradient(
                this.x, this.y,
                this.x + Math.cos(this.angle) * this.length,
                this.y + Math.sin(this.angle) * this.length
            );
            grad.addColorStop(0, 'rgba(212, 175, 55, 0.8)');
            grad.addColorStop(0.5, 'rgba(240, 248, 255, 0.3)');
            grad.addColorStop(1, 'rgba(240, 248, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(this.x - this.width * 0.5, this.y);
            ctx.lineTo(this.x + this.width * 0.5, this.y);
            ctx.lineTo(
                this.x + this.width * 1.5 + Math.cos(this.angle) * this.length,
                this.y + Math.sin(this.angle) * this.length
            );
            ctx.lineTo(
                this.x - this.width * 1.5 + Math.cos(this.angle) * this.length,
                this.y + Math.sin(this.angle) * this.length
            );
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = -0.2 - Math.random() * 0.4;
            this.size = 0.5 + Math.random() * 2;
            this.opacity = 0.1 + Math.random() * 0.3;
            this.fade = 0.001 + Math.random() * 0.003;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.opacity -= this.fade;
            if (this.opacity <= 0 || this.y < -10) {
                this.reset();
                this.y = height + 10;
                this.opacity = 0;
            }
            if (this.opacity < this.fade * 10) {
                this.opacity += this.fade * 2;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.opacity);
            ctx.fillStyle = Math.random() > 0.7 ? '#D4AF37' : '#F0F8FF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Eagle silhouette class
    class Eagle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = -100;
            this.y = 50 + Math.random() * (height * 0.4);
            this.speed = 1 + Math.random() * 1.5;
            this.wingSpan = 20 + Math.random() * 15;
            this.flapSpeed = 0.1 + Math.random() * 0.1;
            this.flapPhase = Math.random() * Math.PI * 2;
            this.opacity = 0.15 + Math.random() * 0.15;
        }

        update() {
            this.x += this.speed;
            this.flapPhase += this.flapSpeed;
            if (this.x > width + 100) {
                this.reset();
                this.x = -100;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.strokeStyle = '#0A0A0A';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const wingY = Math.sin(this.flapPhase) * 6;
            ctx.beginPath();
            // Left wing
            ctx.moveTo(this.x - this.wingSpan * 0.3, this.y);
            ctx.quadraticCurveTo(this.x - this.wingSpan, this.y - wingY - 5, this.x - this.wingSpan * 1.2, this.y + wingY);
            // Body
            ctx.lineTo(this.x, this.y + 3);
            // Right wing
            ctx.lineTo(this.x + this.wingSpan * 1.2, this.y + wingY);
            ctx.quadraticCurveTo(this.x + this.wingSpan, this.y - wingY - 5, this.x + this.wingSpan * 0.3, this.y);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
    }

    // Lightning Bolt class (occasional divine flash)
    class LightningBolt {
        constructor(startX, startY, endX, endY, thickness) {
            this.segments = [];
            this.thickness = thickness;
            this.opacity = 1;
            this.life = 0;
            this.maxLife = 6 + Math.random() * 8;
            this.build(startX, startY, endX, endY);
        }

        build(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const segmentCount = Math.floor(dist / 12);

            let cx = x1;
            let cy = y1;
            this.segments.push({ x: cx, y: cy });

            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                const px = x1 + dx * t;
                const py = y1 + dy * t;
                const jitter = (1 - t) * 30 * (Math.random() - 0.5);
                this.segments.push({ x: px + jitter, y: py + jitter });
            }

            this.segments.push({ x: x2, y: y2 });
        }

        update() {
            this.life++;
            this.opacity = Math.max(0, 1 - (this.life / this.maxLife));
            return this.opacity > 0;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 15 * this.opacity;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.9 * this.opacity})`;
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.lineWidth = this.thickness * 0.4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * this.opacity})`;
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // Initialize entities
    for (let i = 0; i < 12; i++) clouds.push(new Cloud());
    for (let i = 0; i < 6; i++) lightRays.push(new LightRay());
    for (let i = 0; i < 40; i++) particles.push(new Particle());
    for (let i = 0; i < 3; i++) eagles.push(new Eagle());

    function spawnLightning() {
        const now = Date.now();
        if (now - lastFlash < 300) return;
        if (Math.random() < 0.008) {
            lastFlash = now;
            flashIntensity = 0.08 + Math.random() * 0.12;
            const startX = Math.random() * width;
            const startY = -10;
            const endX = startX + (Math.random() - 0.5) * 250;
            const endY = height * 0.2 + Math.random() * height * 0.4;
            lightningBolts.push(new LightningBolt(startX, startY, endX, endY, 1.5 + Math.random() * 1.5));
        }
    }

    function animateHeaven() {
        ctx.clearRect(0, 0, width, height);

        // Subtle sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, 'rgba(10, 10, 20, 0)');
        skyGrad.addColorStop(1, 'rgba(10, 10, 20, 0.3)');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Flash effect
        if (flashIntensity > 0) {
            ctx.fillStyle = `rgba(212, 175, 55, ${flashIntensity})`;
            ctx.fillRect(0, 0, width, height);
            flashIntensity *= 0.88;
            if (flashIntensity < 0.001) flashIntensity = 0;
        }

        // Light rays
        lightRays.forEach(ray => {
            ray.update();
            ray.draw(ctx);
        });

        // Clouds
        clouds.forEach(cloud => {
            cloud.update();
            cloud.draw(ctx);
        });

        // Particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Eagles
        eagles.forEach(eagle => {
            eagle.update();
            eagle.draw(ctx);
        });

        // Lightning
        spawnLightning();
        lightningBolts = lightningBolts.filter(bolt => {
            bolt.draw(ctx);
            return bolt.update();
        });

        requestAnimationFrame(animateHeaven);
    }

    animateHeaven();

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
            
            document.querySelectorAll('.name-card, .domain-card, .myth-content, .olympian-card').forEach(card => {
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

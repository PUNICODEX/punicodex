/**
 * ZEÚS — King of the Gods
 * Interactive Layer: Lightning, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Lightning System
    // ============================
    const canvas = document.getElementById('lightning-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let lightningBolts = [];
    let lastFlash = 0;
    let flashIntensity = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class LightningBolt {
        constructor(startX, startY, endX, endY, thickness, branches) {
            this.segments = [];
            this.thickness = thickness;
            this.opacity = 1;
            this.life = 0;
            this.maxLife = 8 + Math.random() * 12;
            this.color = this.pickColor();
            this.build(startX, startY, endX, endY, branches);
        }

        pickColor() {
            const colors = [
                { r: 65, g: 105, b: 225 },   // Lightning Blue
                { r: 135, g: 206, b: 235 },  // Sky Blue
                { r: 212, g: 175, b: 55 },   // Gold
                { r: 245, g: 245, b: 245 },  // White
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        build(x1, y1, x2, y2, branches) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const segmentCount = Math.floor(dist / 15);

            let cx = x1;
            let cy = y1;
            this.segments.push({ x: cx, y: cy });

            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                const px = x1 + dx * t;
                const py = y1 + dy * t;
                const jitter = (1 - t) * 40 * (Math.random() - 0.5);
                const offset = (Math.random() - 0.5) * 30;
                this.segments.push({
                    x: px + jitter + offset,
                    y: py + jitter + offset
                });

                // Branch creation
                if (branches > 0 && Math.random() < 0.25) {
                    const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
                    const branchLen = dist * 0.3 * Math.random();
                    const bx = px + Math.cos(branchAngle) * branchLen;
                    const by = py + Math.sin(branchAngle) * branchLen;
                    const branch = new LightningBolt(px, py, bx, by, this.thickness * 0.5, 0);
                    branch.life = this.maxLife * 0.7;
                    lightningBolts.push(branch);
                }
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

            // Glow
            ctx.shadowBlur = 20 * this.opacity;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;

            // Main stroke
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${0.9 * this.opacity})`;
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
            ctx.stroke();

            // Bright core
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

    function spawnLightning() {
        const now = Date.now();
        if (now - lastFlash < 200) return;
        
        const chance = Math.random();
        if (chance < 0.03) {
            lastFlash = now;
            flashIntensity = 0.15 + Math.random() * 0.2;
            
            const startX = Math.random() * width;
            const startY = -10;
            const endX = startX + (Math.random() - 0.5) * 300;
            const endY = height * 0.3 + Math.random() * height * 0.5;
            
            lightningBolts.push(new LightningBolt(startX, startY, endX, endY, 2 + Math.random() * 2, 2));
        }
    }

    function animateLightning() {
        ctx.clearRect(0, 0, width, height);

        // Flash effect
        if (flashIntensity > 0) {
            ctx.fillStyle = `rgba(65, 105, 225, ${flashIntensity})`;
            ctx.fillRect(0, 0, width, height);
            flashIntensity *= 0.85;
            if (flashIntensity < 0.001) flashIntensity = 0;
        }

        // Ambient particles
        ctx.save();
        for (let i = 0; i < 3; i++) {
            const px = Math.random() * width;
            const py = Math.random() * height;
            const size = Math.random() * 2;
            ctx.fillStyle = `rgba(212, 175, 55, ${Math.random() * 0.15})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        spawnLightning();

        lightningBolts = lightningBolts.filter(bolt => {
            bolt.draw(ctx);
            return bolt.update();
        });

        requestAnimationFrame(animateLightning);
    }

    animateLightning();

    // ============================
    
    } else {
    }
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

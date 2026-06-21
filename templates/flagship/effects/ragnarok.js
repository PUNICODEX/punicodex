/**
 * RAGNARǪK — Doom of the Gods
 * Interactive Layer: Fire, Embers, Smoke, Spark Bursts, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Fire & Ember System
    // ============================
    const canvas = document.getElementById('fire-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    let embers = [];
    let smokes = [];
    let sparks = [];
    let glowIntensity = 0;
    let lastSparkBurst = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Ember {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 100;
            this.size = 1 + Math.random() * 2.5;
            this.speedY = 0.5 + Math.random() * 1.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.opacity = 0.4 + Math.random() * 0.6;
            this.maxOpacity = this.opacity;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 300;
            this.hue = 10 + Math.random() * 40; // orange to red range
            this.flickerSpeed = 0.02 + Math.random() * 0.05;
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX + Math.sin(this.life * 0.02) * 0.3;
            this.life++;
            this.opacity = this.maxOpacity * (1 - this.life / this.maxLife) * (0.7 + 0.3 * Math.sin(this.life * this.flickerSpeed));

            if (this.life >= this.maxLife || this.y < -10 || this.opacity <= 0) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = `hsl(${this.hue}, 100%, ${50 + Math.random() * 20}%)`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Smoke {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + Math.random() * 200;
            this.size = 20 + Math.random() * 60;
            this.speedY = 0.2 + Math.random() * 0.5;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.opacity = 0.02 + Math.random() * 0.04;
            this.life = 0;
            this.maxLife = 400 + Math.random() * 400;
            this.growth = 0.05 + Math.random() * 0.1;
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX + Math.sin(this.life * 0.01) * 0.2;
            this.size += this.growth;
            this.life++;
            this.opacity *= 0.998;

            if (this.life >= this.maxLife || this.y < -this.size || this.opacity <= 0.005) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, 'rgba(60, 60, 60, 0.5)');
            grad.addColorStop(1, 'rgba(40, 40, 40, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Spark {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed - 1;
            this.size = 0.5 + Math.random() * 1.5;
            this.opacity = 0.8 + Math.random() * 0.2;
            this.decay = 0.02 + Math.random() * 0.04;
            this.hue = 15 + Math.random() * 35;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.05; // gravity
            this.vx *= 0.98;
            this.opacity -= this.decay;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function spawnSparkBurst() {
        const now = Date.now();
        if (now - lastSparkBurst < 800) return;
        if (Math.random() > 0.04) return;

        lastSparkBurst = now;
        const burstX = Math.random() * width;
        const burstY = height - Math.random() * height * 0.4;
        const count = 8 + Math.floor(Math.random() * 16);

        for (let i = 0; i < count; i++) {
            sparks.push(new Spark(burstX, burstY));
        }
    }

    function drawBackgroundGlow() {
        // Subtle radial warm glow from below, as if the world is burning beneath
        const glowY = height * 0.85;
        const grad = ctx.createRadialGradient(width * 0.5, glowY, 0, width * 0.5, glowY, height * 0.7);
        grad.addColorStop(0, 'rgba(139, 0, 0, 0.12)');
        grad.addColorStop(0.3, 'rgba(255, 69, 0, 0.05)');
        grad.addColorStop(0.6, 'rgba(255, 140, 0, 0.02)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawGroundFire() {
        // Flickering fire line at the bottom
        const flicker = 0.6 + 0.4 * Math.sin(Date.now() * 0.003) + 0.2 * Math.sin(Date.now() * 0.007);
        const fireHeight = 40 + flicker * 30;
        const grad = ctx.createLinearGradient(0, height, 0, height - fireHeight);
        grad.addColorStop(0, `rgba(139, 0, 0, ${0.3 * flicker})`);
        grad.addColorStop(0.4, `rgba(255, 69, 0, ${0.15 * flicker})`);
        grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, height - fireHeight, width, fireHeight);
    }

    // Initialize particles
    for (let i = 0; i < 80; i++) {
        const ember = new Ember();
        ember.y = height - Math.random() * height;
        embers.push(ember);
    }
    for (let i = 0; i < 15; i++) {
        const smoke = new Smoke();
        smoke.y = height - Math.random() * height;
        smokes.push(smoke);
    }

    function animateFire() {
        ctx.clearRect(0, 0, width, height);

        // Very dark background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        drawBackgroundGlow();
        drawGroundFire();

        // Update and draw smokes
        smokes.forEach(smoke => {
            smoke.update();
            smoke.draw(ctx);
        });

        // Update and draw embers
        embers.forEach(ember => {
            ember.update();
            ember.draw(ctx);
        });

        // Spawn spark bursts
        spawnSparkBurst();

        // Update and draw sparks
        sparks = sparks.filter(spark => {
            spark.update();
            spark.draw(ctx);
            return spark.opacity > 0;
        });

        // Occasional larger flare
        glowIntensity *= 0.95;
        if (Math.random() < 0.005) {
            glowIntensity = 0.3 + Math.random() * 0.3;
        }
        if (glowIntensity > 0.01) {
            ctx.save();
            ctx.globalAlpha = glowIntensity * 0.3;
            ctx.fillStyle = '#ff4500';
            ctx.fillRect(0, height - 100, width, 100);
            ctx.restore();
        }

        requestAnimationFrame(animateFire);
    }

    animateFire();

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
        if (canvas) canvas.style.display = 'none';
    }

})();

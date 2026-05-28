/**
 * KŌBE — Port City, Hyōgo
 * Interactive Layer: Harbor Waves, Lantern Lights, Seagulls, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Harbor System
    // ============================
    const canvas = document.getElementById('harbor-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let waves = [];
    let lights = [];
    let seagulls = [];
    let time = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initWaves();
    }

    function initWaves() {
        waves = [];
        const count = 6;
        for (let i = 0; i < count; i++) {
            waves.push({
                yBase: height * 0.55 + (i * height * 0.08),
                amplitude: 4 + Math.random() * 6,
                frequency: 0.003 + Math.random() * 0.004,
                speed: 0.002 + Math.random() * 0.003,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.04 + Math.random() * 0.06,
                color: i % 2 === 0 ? '26,35,126' : '0,131,143'
            });
        }
    }

    class LightParticle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.baseY = height * 0.6 + Math.random() * (height * 0.35);
            this.radius = 1.5 + Math.random() * 2.5;
            this.speed = 0.01 + Math.random() * 0.02;
            this.phase = Math.random() * Math.PI * 2;
            this.drift = (Math.random() - 0.5) * 0.2;
            this.alpha = 0.3 + Math.random() * 0.4;
            this.warm = Math.random() > 0.5;
        }

        update() {
            this.phase += this.speed;
            this.x += this.drift;
            if (this.x < -20) this.x = width + 20;
            if (this.x > width + 20) this.x = -20;
        }

        draw(ctx) {
            const y = this.baseY + Math.sin(this.phase) * 3;
            const flicker = 0.8 + Math.sin(this.phase * 3) * 0.2;
            const color = this.warm ? '255,112,67' : '255,255,255';
            ctx.save();
            ctx.globalAlpha = this.alpha * flicker;
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${color}, 0.6)`;
            ctx.fillStyle = `rgba(${color}, ${this.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(this.x, y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Seagull {
        constructor() {
            this.reset(true);
        }

        reset(randomX) {
            this.x = randomX ? Math.random() * width : -10;
            this.y = Math.random() * (height * 0.35);
            this.speed = 0.3 + Math.random() * 0.6;
            this.size = 1 + Math.random() * 1.5;
            this.alpha = 0.4 + Math.random() * 0.4;
            this.phase = Math.random() * Math.PI * 2;
        }

        update() {
            this.x += this.speed;
            this.y += Math.sin(this.x * 0.01 + this.phase) * 0.15;
            if (this.x > width + 10) {
                this.reset(false);
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function initParticles() {
        lights = [];
        for (let i = 0; i < 20; i++) {
            lights.push(new LightParticle());
        }
        seagulls = [];
        for (let i = 0; i < 5; i++) {
            seagulls.push(new Seagull());
        }
    }

    function drawWaves() {
        waves.forEach(wave => {
            wave.phase += wave.speed;
            ctx.save();
            ctx.globalAlpha = wave.alpha;
            ctx.strokeStyle = `rgba(${wave.color}, ${wave.alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 2) {
                const y = wave.yBase + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.restore();
        });
    }

    function spawnSeagull() {
        if (Math.random() < 0.002 && seagulls.length < 8) {
            seagulls.push(new Seagull());
        }
    }

    function animateHarbor() {
        ctx.clearRect(0, 0, width, height);
        time += 1;

        // Subtle dark vignette
        const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.9);
        gradient.addColorStop(0, 'rgba(10,10,10,0)');
        gradient.addColorStop(1, 'rgba(10,10,10,0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        drawWaves();

        lights.forEach(light => {
            light.update();
            light.draw(ctx);
        });

        spawnSeagull();
        seagulls.forEach((gull, index) => {
            gull.update();
            gull.draw(ctx);
            if (gull.x < -20) {
                seagulls.splice(index, 1);
            }
        });

        requestAnimationFrame(animateHarbor);
    }

    resizeCanvas();
    initParticles();
    window.addEventListener('resize', resizeCanvas);
    animateHarbor();

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
        canvas.style.display = 'none';
    }

})();

/**
 * PÓNTOS — The Primordial Sea
 * Interactive Layer: Ocean Waves, Foam, Bioluminescence, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Ocean System
    // ============================
    const canvas = document.getElementById('ocean-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let waves = [];
    let foamParticles = [];
    let sparkles = [];
    let time = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initWaves();
    }

    class Wave {
        constructor(y, amplitude, frequency, speed, phase, color, lineWidth) {
            this.baseY = y;
            this.amplitude = amplitude;
            this.frequency = frequency;
            this.speed = speed;
            this.phase = phase;
            this.color = color;
            this.lineWidth = lineWidth;
        }

        draw(ctx, t) {
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = this.lineWidth;
            ctx.strokeStyle = this.color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const points = [];
            for (let x = 0; x <= width; x += 3) {
                const y = this.baseY +
                    Math.sin(x * this.frequency + t * this.speed + this.phase) * this.amplitude +
                    Math.sin(x * this.frequency * 0.5 + t * this.speed * 0.7 + this.phase * 1.3) * (this.amplitude * 0.3);
                points.push({ x, y });
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.restore();

            return points;
        }
    }

    class FoamParticle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.3) * 0.8;
            this.vy = -Math.random() * 0.6 - 0.2;
            this.life = 1;
            this.decay = 0.003 + Math.random() * 0.005;
            this.size = 1 + Math.random() * 2.5;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
            return this.life > 0;
        }

        draw(ctx) {
            if (this.life <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.life * 0.5;
            ctx.fillStyle = '#e0f7fa';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Sparkle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = 0.5 + Math.random() * 1.5;
            this.baseAlpha = 0.2 + Math.random() * 0.5;
            this.pulseSpeed = 0.02 + Math.random() * 0.04;
            this.phase = Math.random() * Math.PI * 2;
            this.life = 1;
            this.decay = 0.001 + Math.random() * 0.002;
        }

        update(t) {
            this.phase += this.pulseSpeed;
            this.life -= this.decay;
            if (this.life <= 0) {
                this.reset();
            }
        }

        draw(ctx, t) {
            const alpha = this.baseAlpha * (0.5 + 0.5 * Math.sin(this.phase)) * this.life;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#80deea';
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(0, 230, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function initWaves() {
        waves = [];
        const waveCount = 6;
        for (let i = 0; i < waveCount; i++) {
            const y = height * 0.4 + (i * height * 0.12);
            const amplitude = 8 + Math.random() * 20;
            const frequency = 0.003 + Math.random() * 0.004;
            const speed = 0.008 + Math.random() * 0.012;
            const phase = Math.random() * Math.PI * 2;
            const alpha = 0.06 + (i / waveCount) * 0.12;
            const lineWidth = 1 + i * 0.5;
            const color = i % 2 === 0
                ? `rgba(0, 131, 143, ${alpha})`
                : `rgba(13, 71, 161, ${alpha})`;
            waves.push(new Wave(y, amplitude, frequency, speed, phase, color, lineWidth));
        }
    }

    function initSparkles() {
        sparkles = [];
        const sparkleCount = Math.min(40, Math.floor((width * height) / 25000));
        for (let i = 0; i < sparkleCount; i++) {
            sparkles.push(new Sparkle());
        }
    }

    function spawnFoam(points) {
        for (let i = 0; i < points.length; i += 12) {
            const p = points[i];
            if (Math.random() < 0.15) {
                foamParticles.push(new FoamParticle(p.x, p.y));
            }
        }
    }

    function animateOcean() {
        ctx.clearRect(0, 0, width, height);

        // Deep sea gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 10, 20, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 21, 41, 0.15)');
        gradient.addColorStop(1, 'rgba(13, 71, 161, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        time += 1;

        // Draw waves and spawn foam at crests
        waves.forEach((wave, index) => {
            const points = wave.draw(ctx, time);
            // Spawn foam on the upper waves more frequently
            if (index >= 2 && index <= 4) {
                spawnFoam(points);
            }
        });

        // Update and draw foam particles
        foamParticles = foamParticles.filter(p => {
            p.draw(ctx);
            return p.update();
        });

        // Limit foam particles for performance
        if (foamParticles.length > 300) {
            foamParticles = foamParticles.slice(-200);
        }

        // Draw sparkles
        sparkles.forEach(s => {
            s.update(time);
            s.draw(ctx, time);
        });

        // Occasional deep-water light rays
        if (Math.random() < 0.02) {
            ctx.save();
            const rayX = Math.random() * width;
            const rayWidth = 20 + Math.random() * 60;
            const rayGradient = ctx.createLinearGradient(rayX, 0, rayX + (Math.random() - 0.5) * 100, height);
            rayGradient.addColorStop(0, 'rgba(0, 200, 255, 0.03)');
            rayGradient.addColorStop(0.5, 'rgba(0, 150, 200, 0.01)');
            rayGradient.addColorStop(1, 'rgba(0, 100, 150, 0)');
            ctx.fillStyle = rayGradient;
            ctx.fillRect(rayX - rayWidth / 2, 0, rayWidth, height);
            ctx.restore();
        }

        requestAnimationFrame(animateOcean);
    }

    resizeCanvas();
    initSparkles();
    window.addEventListener('resize', resizeCanvas);
    animateOcean();

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
    const nav = document.querySelector('.main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
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
    // Parallax on Hero Landscape
    // ============================
    const landscapeImg = document.querySelector('.landscape-img');

    window.addEventListener('scroll', () => {
        if (!landscapeImg) return;
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero').offsetHeight;

        if (scrollY < heroHeight) {
            const parallax = scrollY * 0.2;
            landscapeImg.style.transform = `translateY(${parallax}px) scale(1.05)`;
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

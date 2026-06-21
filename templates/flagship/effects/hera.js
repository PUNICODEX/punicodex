/**
 * ἭΡΑ — Queen of the Gods
 * Interactive Layer: Royal Aura, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Royal Aura System
    // ============================
    const canvas = document.getElementById('royal-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let particles = [];
    let flares = [];
    let peacockEyes = [];
    let centralGlow = { intensity: 0, target: 0.08 };

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + Math.random() * 50;
            this.size = Math.random() * 4 + 1;
            this.speedY = Math.random() * 1.2 + 0.4;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.6 + 0.2;
            this.type = Math.random() < 0.6 ? 'gold' : 'purple';
            this.pulse = Math.random() * Math.PI * 2;
        }

        update() {
            this.y -= this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.008 + this.pulse) * 0.3;
            this.pulse += 0.02;
            
            const fadeStart = height * 0.15;
            if (this.y < fadeStart) {
                this.opacity -= 0.008;
            }

            if (this.y < -20 || this.opacity <= 0) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            const color = this.type === 'gold' 
                ? `rgba(212, 175, 55, ${this.opacity})` 
                : `rgba(180, 80, 220, ${this.opacity * 0.7})`;
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner bright core
            ctx.fillStyle = this.type === 'gold' 
                ? `rgba(255, 240, 200, ${this.opacity * 0.8})`
                : `rgba(220, 180, 255, ${this.opacity * 0.6})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class CrownFlare {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height * 0.5 + height * 0.1;
            this.radius = 0;
            this.maxRadius = 100 + Math.random() * 150;
            this.opacity = 0;
            this.life = 0;
            this.maxLife = 100 + Math.random() * 60;
            this.rings = 2 + Math.floor(Math.random() * 2);
        }

        update() {
            this.life++;
            const progress = this.life / this.maxLife;
            
            if (progress < 0.15) {
                this.opacity = (progress / 0.15) * 0.25;
                this.radius = (progress / 0.15) * this.maxRadius * 0.3;
            } else if (progress < 0.4) {
                this.opacity = 0.25;
                this.radius = this.maxRadius * 0.3 + ((progress - 0.15) / 0.25) * this.maxRadius * 0.7;
            } else {
                this.opacity = 0.25 * (1 - (progress - 0.4) / 0.6);
                this.radius = this.maxRadius;
            }

            return this.opacity > 0.001;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            ctx.save();
            
            for (let i = 0; i < this.rings; i++) {
                const r = this.radius * (1 - i * 0.25);
                const alpha = this.opacity * (1 - i * 0.3);
                
                // Outer ring
                ctx.strokeStyle = `rgba(212, 175, 55, ${alpha * 0.4})`;
                ctx.lineWidth = 2 - i * 0.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.stroke();
                
                // Glow fill
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
                gradient.addColorStop(0, `rgba(128, 0, 128, ${alpha * 0.15})`);
                gradient.addColorStop(0.5, `rgba(212, 175, 55, ${alpha * 0.08})`);
                gradient.addColorStop(1, `rgba(128, 0, 128, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    class PeacockEye {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = 30 + Math.random() * 50;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 150;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.002;
        }

        update() {
            this.life++;
            this.rotation += this.rotationSpeed;
            return this.life < this.maxLife;
        }

        draw(ctx) {
            const progress = this.life / this.maxLife;
            let alpha;
            
            if (progress < 0.2) {
                alpha = progress / 0.2;
            } else if (progress > 0.7) {
                alpha = 1 - (progress - 0.7) / 0.3;
            } else {
                alpha = 1;
            }
            
            alpha *= 0.12;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = alpha;
            
            // Outer feather shape
            ctx.fillStyle = `rgba(128, 0, 128, ${alpha * 2})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 1.6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Middle ring
            ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 2.5})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner eye
            ctx.fillStyle = `rgba(51, 184, 100, ${alpha * 3})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.25, this.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupil
            ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 4})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Initialize systems
    for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
    }

    function spawnFlare() {
        if (Math.random() < 0.015 && flares.length < 5) {
            flares.push(new CrownFlare());
        }
    }

    function spawnPeacockEye() {
        if (Math.random() < 0.005 && peacockEyes.length < 4) {
            peacockEyes.push(new PeacockEye());
        }
    }

    function updateCentralGlow() {
        centralGlow.intensity += (centralGlow.target - centralGlow.intensity) * 0.02;
        if (Math.random() < 0.01) {
            centralGlow.target = 0.05 + Math.random() * 0.1;
        }
    }

    function animateRoyal() {
        ctx.clearRect(0, 0, width, height);

        // Central royal glow
        updateCentralGlow();
        const glowGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, Math.max(width, height) * 0.5);
        glowGrad.addColorStop(0, `rgba(128, 0, 128, ${centralGlow.intensity})`);
        glowGrad.addColorStop(0.5, `rgba(75, 0, 130, ${centralGlow.intensity * 0.5})`);
        glowGrad.addColorStop(1, 'rgba(10, 10, 10, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);

        // Peacock eyes (drawn behind particles)
        spawnPeacockEye();
        peacockEyes = peacockEyes.filter(eye => {
            eye.draw(ctx);
            return eye.update();
        });

        // Particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Flares
        spawnFlare();
        flares = flares.filter(flare => {
            flare.draw(ctx);
            return flare.update();
        });

        requestAnimationFrame(animateRoyal);
    }

    animateRoyal();

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
            const parallax = scrollY * 0.12;
            heroMascot.style.transform = `translateY(${parallax}px)`;
        }
    });

    // ============================
    // Prefers Reduced Motion
    // ============================
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach(el => el.classList.add('revealed'));
        if (canvas) canvas.style.display = 'none';
    }

})();

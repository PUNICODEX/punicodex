/**
 * ΠΟΣΕΙΔΩΝ — Lord of the Sea
 * Interactive Layer: Ocean Waves, Reveals, Navigation
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
    let particles = [];
    let surges = [];
    let beams = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Wave {
        constructor(index, total) {
            this.index = index;
            this.total = total;
            this.offset = Math.random() * Math.PI * 2;
            this.speed = 0.008 + (index * 0.003);
            this.amplitude = 20 + (index * 15);
            this.frequency = 0.003 + (index * 0.001);
            this.yBase = height * (0.75 + (index * 0.06));
            this.color = this.getColor();
        }

        getColor() {
            const colors = [
                'rgba(0, 73, 104, 0.4)',
                'rgba(0, 105, 148, 0.35)',
                'rgba(32, 178, 170, 0.25)',
                'rgba(135, 206, 235, 0.15)',
            ];
            return colors[this.index % colors.length];
        }

        update() {
            this.offset += this.speed;
            this.yBase = height * (0.75 + (this.index * 0.06));
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, height);
            
            for (let x = 0; x <= width; x += 3) {
                const y = this.yBase + Math.sin(x * this.frequency + this.offset) * this.amplitude
                    + Math.sin(x * this.frequency * 2.5 + this.offset * 1.3) * (this.amplitude * 0.3);
                ctx.lineTo(x, y);
            }
            
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fill();
        }
    }

    class FoamParticle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + Math.random() * 50;
            this.size = Math.random() * 3 + 0.5;
            this.speedY = -(Math.random() * 1.5 + 0.5);
            this.speedX = (Math.random() - 0.5) * 1;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 200;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.life * 0.02) * 0.5;
            this.life++;
            
            if (this.life > this.maxLife * 0.7) {
                this.opacity -= 0.005;
            }
            
            if (this.y < -10 || this.opacity <= 0) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(135, 206, 235, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class BioParticle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height * 0.7 + Math.random() * height * 0.3;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = -(Math.random() * 0.4 + 0.1);
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.6 + 0.2;
            this.pulse = Math.random() * Math.PI * 2;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.pulse += 0.03;
            this.opacity = 0.3 + Math.sin(this.pulse) * 0.2;
            
            if (this.y < height * 0.3) {
                this.reset();
            }
        }

        draw(ctx) {
            const color = Math.random() < 0.6 
                ? `rgba(32, 178, 170, ${this.opacity})`
                : `rgba(0, 200, 255, ${this.opacity * 0.7})`;
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class WaveSurge {
        constructor() {
            this.x = -200;
            this.y = height * 0.6;
            this.width = 300 + Math.random() * 400;
            this.height = 80 + Math.random() * 120;
            this.speed = 3 + Math.random() * 2;
            this.opacity = 0.15;
            this.life = 0;
        }

        update() {
            this.x += this.speed;
            this.life++;
            
            if (this.life < 30) {
                this.opacity = Math.min(0.25, this.life / 30 * 0.25);
            } else if (this.life > 150) {
                this.opacity -= 0.003;
            }
            
            return this.opacity > 0 && this.x < width + 200;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            
            const gradient = ctx.createLinearGradient(this.x, this.y - this.height, this.x, this.y);
            gradient.addColorStop(0, 'rgba(135, 206, 235, 0.6)');
            gradient.addColorStop(0.5, 'rgba(32, 178, 170, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 105, 148, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            
            for (let i = 0; i <= this.width; i += 5) {
                const waveY = Math.sin(i * 0.03 + this.life * 0.1) * 15;
                ctx.lineTo(this.x + i, this.y - this.height + waveY);
            }
            
            ctx.lineTo(this.x + this.width, this.y);
            ctx.closePath();
            ctx.fill();
            
            // Foam crest
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i <= this.width; i += 5) {
                const waveY = Math.sin(i * 0.03 + this.life * 0.1) * 15;
                if (i === 0) {
                    ctx.moveTo(this.x + i, this.y - this.height + waveY);
                } else {
                    ctx.lineTo(this.x + i, this.y - this.height + waveY);
                }
            }
            ctx.stroke();
            
            ctx.restore();
        }
    }

    class TridentBeam {
        constructor() {
            this.x = Math.random() * width;
            this.y = height;
            this.targetY = Math.random() * height * 0.5;
            this.width = 2 + Math.random() * 3;
            this.progress = 0;
            this.speed = 0.008 + Math.random() * 0.004;
            this.opacity = 0;
        }

        update() {
            this.progress += this.speed;
            
            if (this.progress < 0.2) {
                this.opacity = this.progress / 0.2 * 0.4;
            } else if (this.progress > 0.8) {
                this.opacity = 0.4 * (1 - (this.progress - 0.8) / 0.2);
            } else {
                this.opacity = 0.4;
            }
            
            return this.progress < 1;
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            
            const currentY = this.y - (this.y - this.targetY) * this.progress;
            
            ctx.save();
            ctx.globalAlpha = this.opacity;
            
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, currentY);
            gradient.addColorStop(0, 'rgba(32, 178, 170, 0)');
            gradient.addColorStop(0.3, 'rgba(32, 178, 170, 0.3)');
            gradient.addColorStop(1, 'rgba(135, 206, 235, 0.6)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.width;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(32, 178, 170, 0.5)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, currentY);
            ctx.stroke();
            
            // Tip glow
            ctx.fillStyle = 'rgba(200, 240, 255, 0.8)';
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(135, 206, 235, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, currentY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Initialize systems
    for (let i = 0; i < 4; i++) {
        waves.push(new Wave(i, 4));
    }

    for (let i = 0; i < 60; i++) {
        particles.push(new FoamParticle());
    }

    for (let i = 0; i < 40; i++) {
        particles.push(new BioParticle());
    }

    function spawnSurge() {
        if (Math.random() < 0.003 && surges.length < 2) {
            surges.push(new WaveSurge());
        }
    }

    function spawnBeam() {
        if (Math.random() < 0.008 && beams.length < 3) {
            beams.push(new TridentBeam());
        }
    }

    function animateOcean() {
        ctx.clearRect(0, 0, width, height);

        // Deep abyss gradient
        const abyssGrad = ctx.createLinearGradient(0, 0, 0, height);
        abyssGrad.addColorStop(0, 'rgba(3, 8, 16, 0.2)');
        abyssGrad.addColorStop(0.5, 'rgba(0, 40, 60, 0.1)');
        abyssGrad.addColorStop(1, 'rgba(0, 73, 104, 0.25)');
        ctx.fillStyle = abyssGrad;
        ctx.fillRect(0, 0, width, height);

        // Waves (back to front)
        waves.forEach(wave => {
            wave.update();
            wave.draw(ctx);
        });

        // Surges
        spawnSurge();
        surges = surges.filter(surge => {
            surge.draw(ctx);
            return surge.update();
        });

        // Particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Beams
        spawnBeam();
        beams = beams.filter(beam => {
            beam.draw(ctx);
            return beam.update();
        });

        requestAnimationFrame(animateOcean);
    }

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

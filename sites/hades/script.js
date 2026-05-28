/**
 * ᾍΔΗΣ — Lord of the Unseen
 * Interactive Layer: Shadow Tendrils, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Shadow System
    // ============================
    const canvas = document.getElementById('shadow-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let tendrils = [];
    let souls = [];
    let cerberusEyes = [];
    let helmFlashes = [];
    let underworldFire = [];
    let lastHelmFlash = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class ShadowTendril {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.baseY = height + 20;
            this.segments = [];
            this.segCount = 20 + Math.floor(Math.random() * 15);
            this.thickness = 4 + Math.random() * 8;
            this.speed = 0.3 + Math.random() * 0.5;
            this.waveOffset = Math.random() * Math.PI * 2;
            this.waveSpeed = 0.008 + Math.random() * 0.015;
            this.maxReach = height * (0.4 + Math.random() * 0.35);
            this.life = 0;
            this.maxLife = 500 + Math.random() * 400;
            this.hue = 260 + Math.random() * 30;
            
            for (let i = 0; i < this.segCount; i++) {
                this.segments.push({
                    x: this.x,
                    y: this.baseY - (i / this.segCount) * this.maxReach
                });
            }
        }

        update() {
            this.life++;
            this.waveOffset += this.waveSpeed;
            const progress = this.life / this.maxLife;
            
            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                const t = i / this.segments.length;
                
                // Upward movement with life
                seg.y = this.baseY - t * this.maxReach * Math.min(progress * 1.5, 1);
                
                // Writhing motion
                const wave = Math.sin(this.waveOffset + t * 4) * (30 * t);
                const secondaryWave = Math.cos(this.waveOffset * 1.3 + t * 6) * (15 * t);
                seg.x = this.x + wave + secondaryWave;
            }
            
            if (progress >= 1) {
                this.reset();
            }
        }

        draw(ctx) {
            const progress = this.life / this.maxLife;
            let alpha = 1;
            if (progress < 0.15) alpha = progress / 0.15;
            if (progress > 0.7) alpha = 1 - (progress - 0.7) / 0.3;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.25;
            ctx.strokeStyle = `hsla(${this.hue}, 50%, 20%, 1)`;
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 25;
            ctx.shadowColor = `hsla(${this.hue}, 60%, 15%, 0.5)`;
            
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            
            for (let i = 1; i < this.segments.length; i++) {
                const seg = this.segments[i];
                ctx.lineTo(seg.x, seg.y);
            }
            
            ctx.stroke();
            
            // Inner bright core
            ctx.globalAlpha = alpha * 0.08;
            ctx.strokeStyle = `hsla(${this.hue + 20}, 40%, 40%, 1)`;
            ctx.lineWidth = this.thickness * 0.3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsla(${this.hue + 20}, 50%, 35%, 0.6)`;
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
            ctx.stroke();
            
            ctx.restore();
        }
    }

    class SoulStream {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + 20;
            this.size = 2 + Math.random() * 4;
            this.speedY = -(Math.random() * 1.5 + 0.5);
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.opacity = Math.random() * 0.5 + 0.3;
            this.pulse = Math.random() * Math.PI * 2;
            this.trail = [];
            this.maxTrail = 8;
        }

        update() {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrail) this.trail.shift();
            
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.pulse) * 0.3;
            this.pulse += 0.03;
            this.opacity = 0.3 + Math.sin(this.pulse * 0.7) * 0.2;
            
            if (this.y < -30) {
                this.reset();
            }
        }

        draw(ctx) {
            // Trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const trailAlpha = (i / this.trail.length) * this.opacity * 0.3;
                ctx.save();
                ctx.globalAlpha = trailAlpha;
                ctx.fillStyle = 'rgba(180, 210, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.size * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Core
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = 'rgba(220, 235, 255, 0.9)';
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(150, 200, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class CerberusEye {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height * 0.3 + Math.random() * height * 0.5;
            this.size = 6 + Math.random() * 10;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 200;
            this.blinkRate = 0.05 + Math.random() * 0.05;
            this.open = 0;
        }

        update() {
            this.life++;
            this.open = Math.abs(Math.sin(this.life * this.blinkRate));
            return this.life < this.maxLife;
        }

        draw(ctx) {
            const progress = this.life / this.maxLife;
            let alpha = 1;
            if (progress < 0.1) alpha = progress / 0.1;
            if (progress > 0.8) alpha = 1 - (progress - 0.8) / 0.2;
            
            const eyeHeight = this.size * this.open;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            
            // Red glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(200, 30, 30, 0.8)';
            
            // Eye shape
            ctx.fillStyle = 'rgba(180, 20, 20, 0.9)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.size, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupil
            if (this.open > 0.3) {
                ctx.fillStyle = 'rgba(50, 0, 0, 1)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    class HelmFlash {
        constructor() {
            this.opacity = 0;
            this.direction = 1;
            this.speed = 0.015;
        }

        update() {
            this.opacity += this.speed * this.direction;
            if (this.opacity >= 0.4) {
                this.direction = -1;
            }
            if (this.opacity <= 0) {
                return false;
            }
            return true;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = 'rgba(5, 5, 10, 0.95)';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    class UnderworldFlame {
        constructor(x) {
            this.x = x;
            this.particles = [];
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: height + Math.random() * 30,
                    size: 3 + Math.random() * 6,
                    speedY: -(Math.random() * 2 + 1),
                    life: Math.random() * 100
                });
            }
        }

        update() {
            this.particles.forEach(p => {
                p.y += p.speedY;
                p.life++;
                p.x += (Math.random() - 0.5) * 0.5;
                
                if (p.y < height - 80 - Math.random() * 60 || p.life > 80) {
                    p.y = height + Math.random() * 20;
                    p.life = 0;
                    p.x = this.x + (Math.random() - 0.5) * 20;
                }
            });
        }

        draw(ctx) {
            this.particles.forEach(p => {
                const alpha = Math.max(0, 1 - p.life / 80) * 0.4;
                const redIntensity = Math.min(255, 100 + p.life * 2);
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgba(${redIntensity}, 20, 20, 0.8)`;
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(180, 30, 30, 0.5)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    }

    // Initialize systems
    for (let i = 0; i < 15; i++) {
        const t = new ShadowTendril();
        t.life = Math.random() * 300;
        tendrils.push(t);
    }

    for (let i = 0; i < 80; i++) {
        const s = new SoulStream();
        s.y = Math.random() * height;
        souls.push(s);
    }

    for (let i = 0; i < 6; i++) {
        underworldFire.push(new UnderworldFlame((width / 7) * (i + 1)));
    }

    function spawnCerberusEyes() {
        if (Math.random() < 0.004 && cerberusEyes.length < 5) {
            cerberusEyes.push(new CerberusEye());
        }
    }

    function spawnHelmFlash() {
        const now = Date.now();
        if (now - lastHelmFlash > 4000 && Math.random() < 0.01) {
            lastHelmFlash = now;
            helmFlashes.push(new HelmFlash());
        }
    }

    function animateShadow() {
        ctx.clearRect(0, 0, width, height);

        // Deep underworld base
        const underworldGrad = ctx.createLinearGradient(0, 0, 0, height);
        underworldGrad.addColorStop(0, 'rgba(8, 8, 12, 0.3)');
        underworldGrad.addColorStop(0.6, 'rgba(15, 10, 25, 0.2)');
        underworldGrad.addColorStop(1, 'rgba(35, 15, 30, 0.4)');
        ctx.fillStyle = underworldGrad;
        ctx.fillRect(0, 0, width, height);

        // Shadow tendrils
        tendrils.forEach(t => {
            t.update();
            t.draw(ctx);
        });

        // Underworld fire at bottom
        underworldFire.forEach(f => {
            f.update();
            f.draw(ctx);
        });

        // Soul streams
        souls.forEach(s => {
            s.update();
            s.draw(ctx);
        });

        // Cerberus eyes
        spawnCerberusEyes();
        cerberusEyes = cerberusEyes.filter(eye => {
            eye.draw(ctx);
            return eye.update();
        });

        // Helm of Darkness flash
        spawnHelmFlash();
        helmFlashes = helmFlashes.filter(flash => {
            flash.draw(ctx);
            return flash.update();
        });

        requestAnimationFrame(animateShadow);
    }

    animateShadow();

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
        canvas.style.display = 'none';
    }

})();

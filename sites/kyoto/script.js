/**
 * KYŌTO — Imperial Capital
 * Interactive Layer: Sakura Petals, Lantern Light, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Sakura & Lantern System
    // ============================
    const canvas = document.getElementById('sakura-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let petals = [];
    let lanterns = [];
    let paperTexture = null;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createPaperTexture();
    }

    function createPaperTexture() {
        // Create a subtle washi paper noise texture
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 256;
        textureCanvas.height = 256;
        const tCtx = textureCanvas.getContext('2d');
        const imageData = tCtx.createImageData(256, 256);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 12;
            data[i] = 250 + noise;     // R
            data[i + 1] = 243 + noise; // G
            data[i + 2] = 224 + noise; // B
            data[i + 3] = 8;           // A (very subtle)
        }
        tCtx.putImageData(imageData, 0, 0);
        paperTexture = textureCanvas;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Petal {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : -30;
            this.size = 3 + Math.random() * 6;
            this.speedY = 0.3 + Math.random() * 1.2;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.swayFreq = 0.005 + Math.random() * 0.01;
            this.swayAmp = 0.5 + Math.random() * 1.5;
            this.swayPhase = Math.random() * Math.PI * 2;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.02;
            this.opacity = 0.4 + Math.random() * 0.5;

            // Sakura colors: soft pink, white, hints of deeper pink
            const colorRoll = Math.random();
            if (colorRoll < 0.5) {
                // Soft pink
                this.r = 255;
                this.g = 200 + Math.random() * 40;
                this.b = 210 + Math.random() * 30;
            } else if (colorRoll < 0.8) {
                // White/pale
                this.r = 255;
                this.g = 240 + Math.random() * 15;
                this.b = 245 + Math.random() * 10;
            } else {
                // Deeper pink
                this.r = 248;
                this.g = 170 + Math.random() * 30;
                this.b = 180 + Math.random() * 20;
            }
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y * this.swayFreq + this.swayPhase) * this.swayAmp * 0.3;
            this.rotation += this.rotationSpeed;

            if (this.y > height + 30) {
                this.reset();
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            // Draw petal as a soft ellipse with a notch
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.bezierCurveTo(
                this.size * 0.6, -this.size * 0.6,
                this.size * 0.6, this.size * 0.6,
                0, this.size
            );
            ctx.bezierCurveTo(
                -this.size * 0.2, this.size * 0.3,
                -this.size * 0.2, -this.size * 0.3,
                0, -this.size
            );
            ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, 0.85)`;
            ctx.fill();

            // Subtle petal vein
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 0.7);
            ctx.lineTo(0, this.size * 0.5);
            ctx.strokeStyle = `rgba(${this.r - 20}, ${this.g - 30}, ${this.b - 20}, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.restore();
        }
    }

    class Lantern {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 20;
            this.size = 1.5 + Math.random() * 2.5;
            this.speedY = -(0.15 + Math.random() * 0.35);
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseFreq = 0.02 + Math.random() * 0.02;
            this.baseOpacity = 0.3 + Math.random() * 0.4;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.003) * 0.2;
            this.pulsePhase += this.pulseFreq;

            if (this.y < -20) {
                this.reset();
            }
        }

        draw(ctx) {
            const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase);
            const opacity = this.baseOpacity * pulse;

            ctx.save();
            ctx.globalAlpha = opacity;

            // Soft glow
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size * 8
            );
            gradient.addColorStop(0, `rgba(212, 175, 55, ${opacity})`);
            gradient.addColorStop(0.3, `rgba(240, 216, 120, ${opacity * 0.4})`);
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 8, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(255, 240, 200, ${opacity * 1.2})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Initialize particles
    function initParticles() {
        petals = [];
        lanterns = [];
        const petalCount = Math.min(80, Math.floor(width / 15));
        const lanternCount = Math.min(25, Math.floor(width / 50));

        for (let i = 0; i < petalCount; i++) {
            petals.push(new Petal());
        }
        for (let i = 0; i < lanternCount; i++) {
            lanterns.push(new Lantern());
        }
    }

    initParticles();
    window.addEventListener('resize', () => {
        initParticles();
    });

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        // Draw paper texture overlay
        if (paperTexture) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            const pattern = ctx.createPattern(paperTexture, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // Draw and update lanterns (behind petals)
        lanterns.forEach(lantern => {
            lantern.update();
            lantern.draw(ctx);
        });

        // Draw and update petals
        petals.forEach(petal => {
            petal.update();
            petal.draw(ctx);
        });

        requestAnimationFrame(animateCanvas);
    }

    animateCanvas();

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
    // Parallax on Hero Background
    // ============================
    const heroBg = document.querySelector('.hero-bg-img');

    window.addEventListener('scroll', () => {
        if (!heroBg) return;
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero').offsetHeight;

        if (scrollY < heroHeight) {
            const parallax = scrollY * 0.3;
            heroBg.style.transform = `translateY(${parallax}px) scale(1.1)`;
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

            document.querySelectorAll('.name-card, .domain-card, .history-content').forEach(card => {
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

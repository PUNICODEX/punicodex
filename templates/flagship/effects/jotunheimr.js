/**
 * JÖTUNHEIMR — Land of the Giants
 * Interactive Layer: Snow, Ice Crystals, Wind Gusts, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Snow & Ice System
    // ============================
    const canvas = document.getElementById('snow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let snowflakes = [];
    let iceCrystals = [];
    let wind = { x: 0, targetX: 0, gustTimer: 0, isGusting: false };

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Snowflake {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : -10;
            this.size = Math.random() * 3 + 0.5;
            // Larger flakes fall faster
            this.speedY = this.size * 0.8 + Math.random() * 1.2;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = Math.random() * 0.02 + 0.01;
        }

        update() {
            this.wobble += this.wobbleSpeed;
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.wobble) * 0.3 + wind.x;

            // Wrap horizontally
            if (this.x > width + 10) this.x = -10;
            if (this.x < -10) this.x = width + 10;

            // Reset when off bottom
            if (this.y > height + 10) {
                this.reset();
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = '#e3f2fd';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow for larger flakes
            if (this.size > 2) {
                ctx.globalAlpha = this.opacity * 0.3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    class IceCrystal {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 8 + 4;
            this.life = 0;
            this.maxLife = 20 + Math.random() * 30;
            this.opacity = 0;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        }

        update() {
            this.life++;
            this.rotation += this.rotationSpeed;

            // Fade in then out
            if (this.life < 10) {
                this.opacity = this.life / 10;
            } else if (this.life > this.maxLife - 10) {
                this.opacity = (this.maxLife - this.life) / 10;
            } else {
                this.opacity = 1;
            }

            if (this.life >= this.maxLife) {
                this.reset();
                // Delay next appearance
                this.life = -Math.random() * 200;
                this.opacity = 0;
            }
        }

        draw(ctx) {
            if (this.opacity <= 0) return;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity * 0.6;
            ctx.strokeStyle = '#a5d8ff';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(165, 216, 255, 0.8)';

            // Draw hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = Math.cos(angle) * this.size;
                const py = Math.sin(angle) * this.size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner lines
            ctx.globalAlpha = this.opacity * 0.3;
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * this.size * 0.7, Math.sin(angle) * this.size * 0.7);
                ctx.stroke();
            }

            // Bright center
            ctx.globalAlpha = this.opacity * 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Initialize snowflakes
    const snowflakeCount = Math.min(150, Math.floor(window.innerWidth / 8));
    for (let i = 0; i < snowflakeCount; i++) {
        snowflakes.push(new Snowflake());
    }

    // Initialize ice crystals
    const crystalCount = Math.min(8, Math.floor(window.innerWidth / 150));
    for (let i = 0; i < crystalCount; i++) {
        const crystal = new IceCrystal();
        crystal.life = -Math.random() * 300; // Stagger starts
        iceCrystals.push(crystal);
    }

    function updateWind() {
        wind.gustTimer++;

        // Start a gust randomly
        if (!wind.isGusting && Math.random() < 0.002) {
            wind.isGusting = true;
            wind.gustTimer = 0;
            wind.targetX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2 + 1);
        }

        // End gust after 60-180 frames
        if (wind.isGusting && wind.gustTimer > 60 + Math.random() * 120) {
            wind.isGusting = false;
            wind.targetX = 0;
        }

        // Smooth wind transition
        wind.x += (wind.targetX - wind.x) * 0.02;
    }

    function drawIceTexture(ctx) {
        // Subtle ice texture overlay
        ctx.save();
        ctx.globalAlpha = 0.015;
        ctx.fillStyle = '#1565c0';

        for (let i = 0; i < 5; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 100 + 50;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function animate() {
        // Very dark blue background
        ctx.fillStyle = '#070f1a';
        ctx.fillRect(0, 0, width, height);

        // Subtle ice texture
        drawIceTexture(ctx);

        updateWind();

        // Draw snowflakes
        snowflakes.forEach(flake => {
            flake.update();
            flake.draw(ctx);
        });

        // Draw ice crystals
        iceCrystals.forEach(crystal => {
            crystal.update();
            crystal.draw(ctx);
        });

        requestAnimationFrame(animate);
    }

    animate();

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

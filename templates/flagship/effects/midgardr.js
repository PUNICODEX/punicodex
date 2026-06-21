/**
 * MIÐGARÐR — Middle Enclosure
 * Interactive Layer: World Tree, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas World Tree System
    // ============================
    const canvas = document.getElementById('worldtree-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let energyLines = [];
    let leaves = [];
    let birds = [];
    let rainbowPhase = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class EnergyLine {
        constructor(fromTop) {
            this.fromTop = fromTop;
            this.x = Math.random() * width;
            this.maxLength = height * (0.25 + Math.random() * 0.25);
            this.currentLength = 0;
            this.growthSpeed = 0.5 + Math.random() * 1.5;
            this.thickness = 0.5 + Math.random() * 1.5;
            this.opacity = 0;
            this.maxOpacity = 0.15 + Math.random() * 0.2;
            this.phase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.002 + Math.random() * 0.003;
            this.wobbleAmount = 10 + Math.random() * 30;
            this.segments = [];
            this.active = true;
            this.fadeOut = false;
            this.life = 0;
            this.maxLife = 300 + Math.random() * 400;
            this.color = this.pickColor();
        }

        pickColor() {
            const colors = [
                { r: 129, g: 199, b: 132 },  // Green
                { r: 79, g: 195, b: 247 },   // Sky
                { r: 255, g: 213, b: 79 },   // Gold
                { r: 120, g: 144, b: 156 },  // Stone
                { r: 93, g: 64, b: 55 },     // Earth
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.life++;
            this.phase += this.wobbleSpeed;

            // Fade in
            if (!this.fadeOut && this.opacity < this.maxOpacity) {
                this.opacity += 0.005;
            }

            // Grow toward center
            if (this.currentLength < this.maxLength) {
                this.currentLength += this.growthSpeed;
            }

            // Fade out near end of life
            if (this.life > this.maxLife - 100) {
                this.fadeOut = true;
                this.opacity -= 0.005;
            }

            if (this.opacity <= 0 && this.fadeOut) {
                this.active = false;
            }

            // Build segments
            this.segments = [];
            const startY = this.fromTop ? 0 : height;
            const direction = this.fromTop ? 1 : -1;
            const steps = Math.floor(this.currentLength / 8);

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const y = startY + direction * this.currentLength * t;
                const wobble = Math.sin(this.phase + t * 3) * this.wobbleAmount * (1 - t * 0.5);
                this.segments.push({
                    x: this.x + wobble,
                    y: y
                });
            }
        }

        draw(ctx) {
            if (this.segments.length < 2) return;

            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.lineWidth = this.thickness;
            ctx.lineCap = 'round';
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;

            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.segments.length; i++) {
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
            }
            ctx.stroke();

            // Glow at tip
            const tip = this.segments[this.segments.length - 1];
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.4)`;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, this.thickness * 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    class Leaf {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -20;
            this.size = 2 + Math.random() * 4;
            this.speedY = 0.3 + Math.random() * 0.8;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.03;
            this.opacity = 0.3 + Math.random() * 0.4;
            this.color = this.pickColor();
            this.swayPhase = Math.random() * Math.PI * 2;
            this.swaySpeed = 0.01 + Math.random() * 0.02;
            this.active = true;
        }

        pickColor() {
            const colors = [
                { r: 129, g: 199, b: 132 },  // Green
                { r: 255, g: 213, b: 79 },   // Gold
                { r: 139, g: 195, b: 74 },   // Light green
                { r: 255, g: 167, b: 38 },   // Amber
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.swayPhase += this.swaySpeed;
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.swayPhase) * 0.5;
            this.rotation += this.rotationSpeed;

            if (this.y > height + 20) {
                this.active = false;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;

            // Simple leaf shape
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    class Bird {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = -30;
            this.y = height * (0.1 + Math.random() * 0.3);
            this.speedX = 1 + Math.random() * 2;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.wingPhase = Math.random() * Math.PI * 2;
            this.wingSpeed = 0.1 + Math.random() * 0.1;
            this.size = 2 + Math.random() * 2;
            this.opacity = 0.4 + Math.random() * 0.3;
            this.active = true;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY + Math.sin(this.wingPhase * 0.5) * 0.2;
            this.wingPhase += this.wingSpeed;

            if (this.x > width + 30) {
                this.active = false;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);

            const wingY = Math.sin(this.wingPhase) * this.size;

            ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';

            // Left wing
            ctx.beginPath();
            ctx.moveTo(-this.size, -wingY);
            ctx.quadraticCurveTo(-this.size * 0.5, -wingY * 0.5, 0, 0);
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(this.size, -wingY);
            ctx.quadraticCurveTo(this.size * 0.5, -wingY * 0.5, 0, 0);
            ctx.stroke();

            ctx.restore();
        }
    }

    function spawnEnergyLine() {
        if (energyLines.length < 25) {
            energyLines.push(new EnergyLine(Math.random() < 0.5));
        }
    }

    function spawnLeaf() {
        if (leaves.length < 15) {
            leaves.push(new Leaf());
        }
    }

    function spawnBird() {
        if (birds.length < 3 && Math.random() < 0.005) {
            birds.push(new Bird());
        }
    }

    function drawRainbow() {
        rainbowPhase += 0.002;
        const horizonY = height * 0.65;
        const rainbowOpacity = 0.04 + Math.sin(rainbowPhase) * 0.02;

        ctx.save();
        ctx.globalAlpha = rainbowOpacity;

        const colors = [
            '#ff5252',
            '#ffab40',
            '#ffd740',
            '#69f0ae',
            '#40c4ff',
            '#7c4dff',
            '#e040fb'
        ];

        const radius = Math.min(width, height) * 0.45;

        colors.forEach((color, i) => {
            ctx.beginPath();
            ctx.arc(width / 2, horizonY, radius - i * 4, Math.PI, 0);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        ctx.restore();
    }

    function drawAmbientGlow() {
        // Subtle green glow at center-bottom (tree roots)
        const rootGradient = ctx.createRadialGradient(
            width / 2, height, 0,
            width / 2, height, width * 0.4
        );
        rootGradient.addColorStop(0, 'rgba(129, 199, 132, 0.03)');
        rootGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = rootGradient;
        ctx.fillRect(0, 0, width, height);

        // Subtle sky glow at top
        const skyGradient = ctx.createRadialGradient(
            width / 2, 0, 0,
            width / 2, 0, width * 0.3
        );
        skyGradient.addColorStop(0, 'rgba(79, 195, 247, 0.02)');
        skyGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateWorldTree() {
        ctx.clearRect(0, 0, width, height);

        drawAmbientGlow();
        drawRainbow();

        // Spawn new elements
        if (Math.random() < 0.05) spawnEnergyLine();
        if (Math.random() < 0.03) spawnLeaf();
        spawnBird();

        // Update and draw energy lines
        energyLines = energyLines.filter(line => {
            line.update();
            line.draw(ctx);
            return line.active;
        });

        // Update and draw leaves
        leaves = leaves.filter(leaf => {
            leaf.update();
            leaf.draw(ctx);
            return leaf.active;
        });

        // Update and draw birds
        birds = birds.filter(bird => {
            bird.update();
            bird.draw(ctx);
            return bird.active;
        });

        requestAnimationFrame(animateWorldTree);
    }

    animateWorldTree();

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

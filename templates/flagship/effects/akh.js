/**
 * ꜣḫ FLAGSHIP TEMPLE — STARLIGHT CANVAS & INTERACTIONS
 * Star trails, rising luminous motes, cosmic dust, ethereal wisps
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Starlight Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('star-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        let starTrails = [];
        let luminousMotes = [];
        let cosmicDust = [];
        let nebulaWisps = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Star {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.3;
                this.baseOpacity = Math.random() * 0.6 + 0.2;
                this.opacity = this.baseOpacity;
                this.twinkleSpeed = Math.random() * 0.02 + 0.005;
                this.twinklePhase = Math.random() * Math.PI * 2;
                this.hue = Math.random() > 0.7 ? 270 : (Math.random() > 0.5 ? 260 : 280);
            }

            update() {
                this.twinklePhase += this.twinkleSpeed;
                this.opacity = this.baseOpacity + Math.sin(this.twinklePhase) * 0.15;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.opacity);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 40%, 85%)`;
                ctx.shadowBlur = this.size * 4;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 70%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class StarTrail {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.length = Math.random() * 40 + 15;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.15 + 0.05;
                this.growing = true;
                this.speed = Math.random() * 0.002 + 0.0005;
                this.hue = Math.random() > 0.5 ? 265 : 275;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < -50) this.x = width + 50;
                if (this.x > width + 50) this.x = -50;
                if (this.y < -50) this.y = height + 50;
                if (this.y > height + 50) this.y = -50;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const tailX = this.x - this.vx * this.length;
                const tailY = this.y - this.vy * this.length;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `hsla(${this.hue}, 50%, 75%, 0.6)`;
                ctx.lineWidth = 0.8;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
        }

        class LuminousMote {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.4 + 0.15);
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.hue = Math.random() > 0.6 ? 265 : (Math.random() > 0.4 ? 270 : 280);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.pulsePhase += 0.03;
                const pulse = 0.5 + Math.sin(this.pulsePhase) * 0.3;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.3 + 0.15) * pulse;

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 60%, 80%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 70%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class CosmicDust {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = -(Math.random() * 0.15 + 0.05);
                this.size = Math.random() * 1.2 + 0.3;
                this.opacity = Math.random() * 0.2 + 0.05;
                this.life = Math.random() * 600 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.15;

                if (this.life <= 0 || this.y < -20) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(260, 20%, 70%, 0.5)';
                ctx.fill();
                ctx.restore();
            }
        }

        class NebulaWisp {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 120 + 60;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0004 + 0.0001;
                this.hue = Math.random() > 0.5 ? 265 : 275;
                this.driftX = (Math.random() - 0.5) * 0.05;
                this.driftY = (Math.random() - 0.5) * 0.05;
            }

            update() {
                this.x += this.driftX;
                this.y += this.driftY;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, `hsla(${this.hue}, 40%, 60%, 0.3)`);
                gradient.addColorStop(0.5, `hsla(${this.hue}, 30%, 50%, 0.1)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 80; i++) {
            stars.push(new Star());
        }
        for (let i = 0; i < 20; i++) {
            starTrails.push(new StarTrail());
        }
        for (let i = 0; i < 40; i++) {
            luminousMotes.push(new LuminousMote());
        }
        for (let i = 0; i < 60; i++) {
            cosmicDust.push(new CosmicDust());
        }
        for (let i = 0; i < 8; i++) {
            nebulaWisps.push(new NebulaWisp());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep cosmic background glow
            const cosmicGrad = ctx.createRadialGradient(width * 0.5, height * 0.3, 0, width * 0.5, height * 0.3, Math.min(width, height) * 0.5);
            cosmicGrad.addColorStop(0, 'hsla(265, 30%, 15%, 0.03)');
            cosmicGrad.addColorStop(0.5, 'hsla(270, 20%, 10%, 0.01)');
            cosmicGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cosmicGrad;
            ctx.fillRect(0, 0, width, height);

            // Nebula wisps (draw first, behind everything)
            nebulaWisps.forEach(w => { w.update(); w.draw(); });

            // Stars
            stars.forEach(s => { s.update(); s.draw(); });

            // Star trails
            starTrails.forEach(t => { t.update(); t.draw(); });

            // Cosmic dust
            cosmicDust.forEach(d => { d.update(); d.draw(); });

            // Luminous motes (ascending souls)
            luminousMotes.forEach(m => { m.update(); m.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, parseInt(delay, 10));
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('visible'));
    }

    /* ── Nav Scroll Effect ────────────────────────────────────────────────── */
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            const hero = document.getElementById('hero');
            if (hero) {
                const heroBottom = hero.offsetTop + hero.offsetHeight;
                if (scrollY < heroBottom) {
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

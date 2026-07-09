/**
 * ÓÐINN FLAGSHIP TEMPLE — MIST CANVAS & INTERACTIONS
 * Raven/mist/snow particle animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Mist Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('mist-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let mist = [];
        let snow = [];
        let ravens = [];
        let runes = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class MistLayer {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.08;
                this.radius = Math.random() * 120 + 60;
                this.opacity = Math.random() * 0.04 + 0.01;
                this.life = Math.random() * 800 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.03;

                if (this.life <= 0 || this.x < -150 || this.x > width + 150 || this.y < -150 || this.y > height + 150) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, 'hsla(200, 15%, 50%, 0.4)');
                gradient.addColorStop(0.5, 'hsla(200, 10%, 40%, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class SnowFlake {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -10;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = Math.random() * 0.5 + 0.2;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.sway = Math.random() * 0.02;
                this.swayPhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.swayPhase += this.sway;
                this.x += this.vx + Math.sin(this.swayPhase) * 0.3;
                this.y += this.vy;

                if (this.y > height + 10 || this.x < -10 || this.x > width + 10) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#D0D8D8';
                ctx.shadowBlur = this.size * 2;
                ctx.shadowColor = `rgba(208, 216, 216, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class Raven {
            constructor() {
                this.reset();
            }

            reset() {
                this.side = Math.random() > 0.5 ? 'left' : 'right';
                this.x = this.side === 'left' ? -30 : width + 30;
                this.y = Math.random() * height * 0.4 + 50;
                this.vx = this.side === 'left' ? (Math.random() * 0.8 + 0.3) : -(Math.random() * 0.8 + 0.3);
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = Math.random() * 3 + 2;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.25 + 0.1;
                this.growing = true;
                this.wingPhase = Math.random() * Math.PI * 2;
                this.wingSpeed = Math.random() * 0.08 + 0.04;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.wingPhase += this.wingSpeed;

                if (this.growing) {
                    this.opacity += 0.005;
                    if (this.opacity >= this.targetOpacity) this.growing = false;
                } else {
                    this.opacity -= 0.003;
                }

                if (this.opacity <= 0 || (this.side === 'left' && this.x > width + 50) || (this.side === 'right' && this.x < -50)) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                
                // Simple raven silhouette (body + wings)
                const wingOffset = Math.sin(this.wingPhase) * 4;
                ctx.fillStyle = '#1A2028';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 2, this.size, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                ctx.beginPath();
                ctx.moveTo(-this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(-this.size * 3, -this.size * 2 + wingOffset, -this.size * 4, -this.size * 0.5 + wingOffset);
                ctx.quadraticCurveTo(-this.size * 2, -this.size * 0.5, -this.size, 0);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(this.size * 3, -this.size * 2 - wingOffset, this.size * 4, -this.size * 0.5 - wingOffset);
                ctx.quadraticCurveTo(this.size * 2, -this.size * 0.5, this.size, 0);
                ctx.fill();
                
                ctx.restore();
            }
        }

        class RuneSymbol {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.size = Math.random() * 20 + 12;
                this.rune = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛈ','ᛇ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'][Math.floor(Math.random() * 24)];
            }

            update() {
                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) this.growing = false;
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.font = `${this.size}px serif`;
                ctx.fillStyle = '#B8963A';
                ctx.fillText(this.rune, this.x, this.y);
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 8; i++) {
            mist.push(new MistLayer());
        }
        for (let i = 0; i < 60; i++) {
            snow.push(new SnowFlake());
        }
        for (let i = 0; i < 4; i++) {
            ravens.push(new Raven());
        }
        for (let i = 0; i < 6; i++) {
            runes.push(new RuneSymbol());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Subtle aurora-like glow at top
            const auroraGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
            auroraGrad.addColorStop(0, 'hsla(200, 20%, 15%, 0.04)');
            auroraGrad.addColorStop(0.5, 'hsla(180, 15%, 10%, 0.02)');
            auroraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auroraGrad;
            ctx.fillRect(0, 0, width, height);

            // Mist layers
            mist.forEach(m => { m.update(); m.draw(); });

            // Runes
            runes.forEach(r => { r.update(); r.draw(); });

            // Ravens
            ravens.forEach(r => { r.update(); r.draw(); });

            // Snow
            snow.forEach(s => { s.update(); s.draw(); });

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

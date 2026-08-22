/**
 * SIGURÐR FLAGSHIP TEMPLE — FORGE CANVAS & INTERACTIONS
 * Forge sparks + a sword reforged in gold light + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Forge Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('sigurd-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let rafId = null;

    if (ctx && !prefersReducedMotion) {
        let width, height;
        let sparks = [];
        let cinders = [];
        let heatLines = [];
        let frameCount = 0;

        // Forge cycle: glow builds → hammer strike → flash + spark burst
        let forgeGlow = 0.3;
        let strikeTimer = 160;
        let strikeFlash = 0;
        let bladeHeat = 0.5;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function anvil() {
            return { x: width * 0.5, y: height * 0.84 };
        }

        class Spark {
            constructor(x, y, power) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
                const speed = (2 + Math.random() * 7) * power;
                this.x = x;
                this.y = y;
                this.vx = Math.cos(ang) * speed;
                this.vy = Math.sin(ang) * speed;
                this.size = 0.6 + Math.random() * 1.8;
                this.life = 35 + Math.random() * 45;
                this.maxLife = this.life;
                this.hot = Math.random() < 0.35;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.16;
                this.vx *= 0.985;
                this.life--;
            }

            draw() {
                const t = this.life / this.maxLife;
                ctx.save();
                ctx.globalAlpha = t * 0.9;
                ctx.fillStyle = this.hot ? '#FFE9A8' : '#F0983C';
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.hot ? '#F4C95D' : '#D4681F';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * (0.5 + t * 0.5), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Cinder {
            constructor() {
                this.reset(true);
            }

            reset(scatter) {
                this.x = Math.random() * width;
                this.y = scatter ? Math.random() * height : height + 8;
                this.vx = (Math.random() - 0.5) * 0.25;
                this.vy = -(0.15 + Math.random() * 0.4);
                this.size = 0.5 + Math.random() * 1.4;
                this.flicker = Math.random() * Math.PI * 2;
                this.life = 400 + Math.random() * 400;
            }

            update() {
                this.x += this.vx + Math.sin((frameCount * 0.02) + this.flicker) * 0.12;
                this.y += this.vy;
                this.flicker += 0.06;
                this.life--;
                if (this.y < -8 || this.life <= 0) this.reset(false);
            }

            draw() {
                const a = (0.25 + Math.abs(Math.sin(this.flicker)) * 0.35)
                    * Math.min(1, this.life / 150);
                ctx.save();
                ctx.globalAlpha = a;
                ctx.fillStyle = '#E89040';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class HeatLine {
            constructor() {
                this.reset();
            }

            reset() {
                const a = anvil();
                this.x = a.x + (Math.random() - 0.5) * 90;
                this.y = a.y - 10;
                this.life = 90 + Math.random() * 60;
                this.maxLife = this.life;
                this.phase = Math.random() * Math.PI * 2;
            }

            update() {
                this.y -= 1.1;
                this.phase += 0.1;
                this.life--;
                if (this.life <= 0) this.reset();
            }

            draw() {
                const t = this.life / this.maxLife;
                ctx.save();
                ctx.globalAlpha = t * 0.12;
                ctx.strokeStyle = '#F4A85D';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                for (let i = 1; i <= 4; i++) {
                    ctx.lineTo(this.x + Math.sin(this.phase + i * 1.2) * 6, this.y - i * 12);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        function drawSword() {
            const a = anvil();
            const bx = a.x;
            const tipY = height * 0.18;
            const guardY = a.y - height * 0.06;
            const halfW = Math.min(16, width * 0.02);

            ctx.save();

            // Heat aura behind the blade
            const heat = 0.25 + bladeHeat * 0.5 + strikeFlash * 0.5;
            const aura = ctx.createRadialGradient(bx, (tipY + guardY) / 2, 0,
                bx, (tipY + guardY) / 2, height * 0.34);
            aura.addColorStop(0, `rgba(244, 201, 93, ${0.22 * heat})`);
            aura.addColorStop(0.6, `rgba(220, 130, 40, ${0.1 * heat})`);
            aura.addColorStop(1, 'transparent');
            ctx.fillStyle = aura;
            ctx.fillRect(0, 0, width, height);

            // Blade: glowing gold gradient
            const bladeGrad = ctx.createLinearGradient(bx - halfW, 0, bx + halfW, 0);
            const bright = 60 + bladeHeat * 25 + strikeFlash * 30;
            bladeGrad.addColorStop(0, `hsl(45, 80%, ${bright - 18}%)`);
            bladeGrad.addColorStop(0.5, `hsl(48, 95%, ${bright + 12}%)`);
            bladeGrad.addColorStop(1, `hsl(45, 80%, ${bright - 18}%)`);
            ctx.shadowBlur = 20 + strikeFlash * 40;
            ctx.shadowColor = 'rgba(244, 201, 93, 0.9)';
            ctx.fillStyle = bladeGrad;
            ctx.beginPath();
            ctx.moveTo(bx, tipY);                        // tip
            ctx.lineTo(bx + halfW * 0.55, tipY + 28);
            ctx.lineTo(bx + halfW, guardY);              // right edge
            ctx.lineTo(bx - halfW, guardY);              // left edge
            ctx.lineTo(bx - halfW * 0.55, tipY + 28);
            ctx.closePath();
            ctx.fill();

            // Fuller (center ridge line)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(50, 90%, 90%, ${0.35 + strikeFlash * 0.4})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(bx, tipY + 16);
            ctx.lineTo(bx, guardY - 8);
            ctx.stroke();

            // Crossguard
            ctx.fillStyle = 'hsl(40, 55%, 42%)';
            ctx.fillRect(bx - halfW * 2.2, guardY, halfW * 4.4, 8);
            // Grip + pommel
            ctx.fillStyle = 'hsl(28, 40%, 26%)';
            ctx.fillRect(bx - 5, guardY + 8, 10, 26);
            ctx.fillStyle = 'hsl(40, 60%, 48%)';
            ctx.beginPath();
            ctx.arc(bx, guardY + 40, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        function hammerStrike() {
            const a = anvil();
            strikeFlash = 1;
            bladeHeat = Math.min(1, bladeHeat + 0.25);
            for (let i = 0; i < 34; i++) sparks.push(new Spark(a.x, a.y - 20, 1.1));
            if (sparks.length > 170) sparks.splice(0, sparks.length - 170);
        }

        resize();
        for (let i = 0; i < 45; i++) cinders.push(new Cinder());
        for (let i = 0; i < 7; i++) heatLines.push(new HeatLine());

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            const a = anvil();

            // Forge bed glow
            forgeGlow = 0.25 + Math.sin(frameCount * 0.03) * 0.06 + strikeFlash * 0.3;
            const bed = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, width * 0.35);
            bed.addColorStop(0, `rgba(230, 120, 30, ${forgeGlow * 0.35})`);
            bed.addColorStop(0.5, `rgba(200, 80, 20, ${forgeGlow * 0.15})`);
            bed.addColorStop(1, 'transparent');
            ctx.fillStyle = bed;
            ctx.fillRect(0, 0, width, height);

            // Anvil silhouette
            ctx.save();
            ctx.fillStyle = 'rgba(14, 12, 18, 0.85)';
            ctx.fillRect(a.x - 70, a.y - 14, 140, 14);
            ctx.fillRect(a.x - 24, a.y, 48, height - a.y);
            ctx.restore();

            // Ambient spark trickle from the anvil
            if (Math.random() < 0.35 && sparks.length < 170) {
                sparks.push(new Spark(a.x + (Math.random() - 0.5) * 40, a.y - 12, 0.45));
            }

            // Strike cycle
            strikeTimer--;
            bladeHeat = Math.max(0.45, bladeHeat - 0.0015);
            strikeFlash *= 0.9;
            if (strikeTimer <= 0) {
                hammerStrike();
                strikeTimer = 150 + Math.random() * 130;
            }

            drawSword();

            if (strikeFlash > 0.03) {
                ctx.save();
                ctx.globalAlpha = strikeFlash * 0.22;
                ctx.fillStyle = '#FFE9B0';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }

            heatLines.forEach(h => { h.update(); h.draw(); });
            cinders.forEach(c => { c.update(); c.draw(); });

            sparks = sparks.filter(s => s.life > 0);
            sparks.forEach(s => { s.update(); s.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        rafId = requestAnimationFrame(animate);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (rafId === null) {
                rafId = requestAnimationFrame(animate);
            }
        });
    } else if (canvas) {
        canvas.style.display = 'none';
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

    window.addEventListener('scroll', () => {
        if (!nav) return;
        if (window.pageYOffset > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
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
                    mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
                }
            }
        }, { passive: true });
    }

})();

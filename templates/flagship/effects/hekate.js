(function() {
    'use strict';

    const canvas = document.getElementById('crossroads-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {

    let W, H, DPR;
    let time = 0;
    let torchX = 0.5;
    let torchY = 0.5;
    let targetTorchX = 0.5;
    let targetTorchY = 0.5;

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.width = window.innerWidth * DPR;
        H = canvas.height = window.innerHeight * DPR;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        initMist();
        initSparks();
        initKeys();
    }

    const mist = [];
    function initMist() {
        mist.length = 0;
        for (let i = 0; i < 60; i++) {
            mist.push({
                x: Math.random() * W, y: Math.random() * H,
                r: Math.random() * 80 + 40,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                alpha: Math.random() * 0.08 + 0.02,
                hue: Math.random() > 0.5 ? 240 : 270
            });
        }
    }

    const sparks = [];
    function initSparks() {
        sparks.length = 0;
        for (let i = 0; i < 40; i++) sparks.push(createSpark());
    }
    function createSpark() {
        return {
            x: torchX * W + (Math.random() - 0.5) * 40,
            y: torchY * H + Math.random() * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2.5 - 0.5,
            life: Math.random() * 120 + 60,
            maxLife: 180,
            size: Math.random() * 2 + 1,
            hue: 20
        };
    }

    const keys = [];
    function initKeys() {
        keys.length = 0;
        for (let i = 0; i < 10; i++) {
            keys.push({
                x: Math.random() * W, y: Math.random() * H * 0.7,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.01,
                driftX: (Math.random() - 0.5) * 0.4,
                driftY: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 15 + 12,
                alpha: Math.random() * 0.15 + 0.05,
                glow: Math.random() * 0.1 + 0.05
            });
        }
    }

    let moonPhase = 0;
    let moonTimer = 0;

    const ghosts = [];
    function spawnGhost() {
        if (ghosts.length > 2) return;
        const side = Math.random() > 0.5 ? -1 : 1;
        ghosts.push({
            x: side === -1 ? -50 : W + 50,
            y: H * 0.4 + Math.random() * H * 0.3,
            vx: side * (Math.random() * 0.3 + 0.1),
            alpha: 0,
            maxAlpha: Math.random() * 0.15 + 0.05,
            life: 0,
            maxLife: 400 + Math.random() * 200,
            width: 30 + Math.random() * 20,
            height: 60 + Math.random() * 30
        });
    }

    function drawTorch(tx, ty) {
        const flicker = Math.sin(time * 0.15 + tx) * 0.15 + Math.sin(time * 0.23 + ty) * 0.08;
        const flameH = 90 + flicker * 30;
        const flameW = 35 + flicker * 8;

        const outerGrad = ctx.createRadialGradient(tx, ty - flameH * 0.3, 0, tx, ty - flameH * 0.3, flameH * 2);
        outerGrad.addColorStop(0, `rgba(255, 107, 53, ${0.25 + flicker * 0.08})`);
        outerGrad.addColorStop(0.4, `rgba(255, 80, 30, ${0.12 + flicker * 0.04})`);
        outerGrad.addColorStop(1, 'rgba(255, 60, 20, 0)');
        ctx.fillStyle = outerGrad;
        ctx.fillRect(tx - flameH * 2, ty - flameH * 2.5, flameH * 4, flameH * 3);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const angle = (i / 20) * Math.PI;
            const r = flameW * 0.5 * Math.sin(angle) * (1 + flicker * 0.3);
            const fy = -flameH * Math.sin(angle * 0.5) * (1 + Math.sin(time * 0.3 + i) * 0.1);
            if (i === 0) ctx.moveTo(r, fy); else ctx.lineTo(r, fy);
        }
        for (let i = 20; i >= 0; i--) {
            const angle = (i / 20) * Math.PI;
            const r = -flameW * 0.5 * Math.sin(angle) * (1 + flicker * 0.3);
            const fy = -flameH * Math.sin(angle * 0.5) * (1 + Math.sin(time * 0.3 + i) * 0.1);
            ctx.lineTo(r, fy);
        }
        ctx.closePath();
        const flameGrad = ctx.createLinearGradient(0, 0, 0, -flameH);
        flameGrad.addColorStop(0, '#FF6B35');
        flameGrad.addColorStop(0.4, '#FF4500');
        flameGrad.addColorStop(0.7, '#CC3300');
        flameGrad.addColorStop(1, 'rgba(150, 30, 0, 0)');
        ctx.fillStyle = flameGrad;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#3A2A1A';
        ctx.fillRect(tx - 4, ty, 8, 40);
        ctx.fillStyle = '#5A4A3A';
        ctx.fillRect(tx - 3, ty + 5, 6, 30);
    }

    function drawKey(k) {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.angle);
        ctx.globalAlpha = k.alpha;
        const keyGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, k.size * 2);
        keyGlow.addColorStop(0, `rgba(255, 107, 53, ${k.glow})`);
        keyGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
        ctx.fillStyle = keyGlow;
        ctx.beginPath();
        ctx.arc(0, 0, k.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(192, 192, 192, ${k.alpha + 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-k.size * 0.3, 0, k.size * 0.25, 0, Math.PI * 2);
        ctx.moveTo(-k.size * 0.05, 0);
        ctx.lineTo(k.size * 0.6, 0);
        ctx.lineTo(k.size * 0.6, -k.size * 0.15);
        ctx.lineTo(k.size * 0.5, -k.size * 0.15);
        ctx.lineTo(k.size * 0.5, -k.size * 0.05);
        ctx.lineTo(k.size * 0.4, -k.size * 0.05);
        ctx.lineTo(k.size * 0.4, 0);
        ctx.stroke();
        ctx.restore();
    }

    function drawMoon(cx, cy, phase) {
        const r = 20;
        ctx.save();
        ctx.translate(cx, cy);
        const moonGlow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 3);
        moonGlow.addColorStop(0, 'rgba(192, 192, 192, 0.15)');
        moonGlow.addColorStop(1, 'rgba(192, 192, 192, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(220, 220, 230, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(15, 15, 46, 0.85)';
        ctx.beginPath();
        if (phase === 0) {
            ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
            ctx.ellipse(0, 0, r * 0.5, r, 0, Math.PI / 2, -Math.PI / 2, true);
        } else if (phase === 2) {
            ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
            ctx.ellipse(0, 0, r * 0.5, r, 0, -Math.PI / 2, Math.PI / 2, true);
        }
        ctx.fill();
        ctx.restore();
    }

    function drawGhost(g) {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.fillStyle = 'rgba(180, 180, 210, 0.3)';
        ctx.filter = 'blur(8px)';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y + g.height);
        ctx.lineTo(g.x - g.width * 0.3, g.y + g.height * 0.6);
        ctx.lineTo(g.x - g.width * 0.4, g.y + g.height * 0.3);
        ctx.quadraticCurveTo(g.x - g.width * 0.5, g.y, g.x, g.y - g.height * 0.2);
        ctx.quadraticCurveTo(g.x + g.width * 0.5, g.y, g.x + g.width * 0.4, g.y + g.height * 0.3);
        ctx.lineTo(g.x + g.width * 0.3, g.y + g.height * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCrossroads(cx, cy) {
        const roadLen = Math.max(W, H) * 0.35;
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - roadLen * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + roadLen * 0.7, cy + roadLen * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - roadLen * 0.7, cy + roadLen * 0.4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        const crossGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
        crossGlow.addColorStop(0, 'rgba(255, 107, 53, 0.15)');
        crossGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
        ctx.fillStyle = crossGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 120, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        torchX += (targetTorchX - torchX) * 0.25;
        torchY += (targetTorchY - torchY) * 0.25;

        const w = W / DPR;
        const h = H / DPR;
        ctx.clearRect(0, 0, w, h);

        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, h * 0.8);
        bgGrad.addColorStop(0, '#1A1A4E');
        bgGrad.addColorStop(0.5, '#12123A');
        bgGrad.addColorStop(1, '#0A0A20');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const torchCX = torchX * w;
        const torchCY = torchY * h;
        drawCrossroads(torchCX, torchCY);

        mist.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -p.r) p.x = w + p.r;
            if (p.x > w + p.r) p.x = -p.r;
            if (p.y < -p.r) p.y = h + p.r;
            if (p.y > h + p.r) p.y = -p.r;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            grad.addColorStop(0, `hsla(${p.hue}, 40%, 40%, ${p.alpha})`);
            grad.addColorStop(1, `hsla(${p.hue}, 40%, 30%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        drawTorch(torchCX, torchCY);

        sparks.forEach((s, i) => {
            s.x += s.vx + Math.sin(time * 0.1 + i) * 0.3;
            s.y += s.vy;
            s.vx *= 0.99;
            s.life--;
            if (s.life <= 0) {
                sparks[i] = createSpark();
                return;
            }
            const lifeRatio = s.life / s.maxLife;
            const alpha = lifeRatio * 0.9;
            ctx.fillStyle = `rgba(255, ${120 + lifeRatio * 100}, ${50 + lifeRatio * 50}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * lifeRatio, 0, Math.PI * 2);
            ctx.fill();
        });

        keys.forEach(k => {
            k.x += k.driftX;
            k.y += k.driftY;
            k.angle += k.rotSpeed;
            if (k.x < -50) k.x = w + 50;
            if (k.x > w + 50) k.x = -50;
            if (k.y < -50) k.y = h + 50;
            if (k.y > h * 0.8) k.y = -50;
            k.alpha = 0.05 + Math.sin(time * 0.02 + k.x) * 0.05;
            drawKey(k);
        });

        moonTimer++;
        if (moonTimer > 300) { moonTimer = 0; moonPhase = (moonPhase + 1) % 3; }
        drawMoon(w * 0.5, h * 0.12, moonPhase);

        if (Math.random() < 0.003) spawnGhost();
        ghosts.forEach((g, i) => {
            g.x += g.vx;
            g.life++;
            if (g.life < 60) g.alpha = (g.life / 60) * g.maxAlpha;
            else if (g.life > g.maxLife - 60) g.alpha = ((g.maxLife - g.life) / 60) * g.maxAlpha;
            else g.alpha = g.maxAlpha;
            drawGhost(g);
            if (g.life >= g.maxLife || g.x < -100 || g.x > w + 100) ghosts.splice(i, 1);
        });

        time++;
        requestAnimationFrame(draw);
    }

    resize();
    initSparks();
    initKeys();
    draw();
    window.addEventListener('resize', resize);

    
    } else {
    }
    const nav = document.getElementById('main-nav');
    function setTorchFromScroll() {
        const sy = window.scrollY || document.documentElement.scrollTop || 0;
        const sh = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
        const ch = window.innerHeight || document.documentElement.clientHeight || 1;
        const maxScroll = Math.max(sh - ch, 1);
        const p = Math.min(Math.max(sy, 0) / maxScroll, 1);
        targetTorchX = 0.5 - (p * 0.35); // 0.5 -> 0.15
        targetTorchY = 0.5 + (p * 0.25); // 0.5 -> 0.75
    }
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
        setTorchFromScroll();
    });
    setInterval(setTorchFromScroll, 50);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => entry.target.classList.add('visible'), delay);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => observer.observe(el));

    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => navLinks.classList.toggle('active'));
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('active'));
        });
    }

    const mascot = document.querySelector('.mascot-img');
    if (mascot) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 15;
            mascot.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
})();

// Pazuzu — Southwest wind & apotropaic sigil; dust motes, horned sigil, bronze glints
(function() {
    'use strict';
    const canvas = document.getElementById('pazuzu-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#a86f4b');
    const S = readColor('data-secondary', '#c9a85c');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const motes = [];
    const glints = [];
    let time = 0;

    function makeMote() {
        return {
            x: -20 - Math.random() * 80,
            y: Math.random() * height,
            vx: 1.2 + Math.random() * 2.2,
            vy: -0.3 + Math.random() * 0.6,
            size: 0.6 + Math.random() * 2.2,
            alpha: 0.08 + Math.random() * 0.28,
            driftPhase: Math.random() * Math.PI * 2
        };
    }

    function spawnGlint() {
        if (glints.length > 6) return;
        const r = Math.min(width, height) * (0.12 + Math.random() * 0.18);
        const a = Math.random() * Math.PI * 2;
        glints.push({
            x: width * 0.5 + Math.cos(a) * r,
            y: height * 0.42 + Math.sin(a) * r * 0.55,
            life: 30 + Math.random() * 40,
            maxLife: 30 + Math.random() * 40,
            size: 1 + Math.random() * 2
        });
    }

    function drawHornedSigil() {
        const cx = width * 0.5;
        const cy = height * 0.42;
        const u = Math.min(width, height) * 0.12;

        ctx.save();
        ctx.globalAlpha = 0.12 + 0.04 * Math.sin(time * 0.002);
        ctx.strokeStyle = 'rgb(' + P.r + ',' + P.g + ',' + P.b + ')';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Horns
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.5, cy - u * 0.2);
        ctx.lineTo(cx - u * 0.9, cy - u * 0.8);
        ctx.moveTo(cx + u * 0.5, cy - u * 0.2);
        ctx.lineTo(cx + u * 0.9, cy - u * 0.8);
        ctx.stroke();

        // Scowling face outline
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.55, cy - u * 0.25);
        ctx.quadraticCurveTo(cx - u * 0.6, cy + u * 0.35, cx - u * 0.25, cy + u * 0.6);
        ctx.quadraticCurveTo(cx, cy + u * 0.75, cx + u * 0.25, cy + u * 0.6);
        ctx.quadraticCurveTo(cx + u * 0.6, cy + u * 0.35, cx + u * 0.55, cy - u * 0.25);
        ctx.stroke();

        // Eyes and snarl
        ctx.beginPath();
        ctx.arc(cx - u * 0.22, cy + u * 0.05, u * 0.08, 0, Math.PI * 2);
        ctx.arc(cx + u * 0.22, cy + u * 0.05, u * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - u * 0.18, cy + u * 0.35);
        ctx.lineTo(cx, cy + u * 0.28);
        ctx.lineTo(cx + u * 0.18, cy + u * 0.35);
        ctx.stroke();

        ctx.restore();
    }

    while (motes.length < 140) motes.push(makeMote());

    function draw() {
        time++;

        // Dry desert-wind background
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#1c1410');
        g.addColorStop(0.55, '#241a14');
        g.addColorStop(1, '#0f0b08');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // Faint hot haze at the centre
        const haze = ctx.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, Math.max(width, height) * 0.5);
        haze.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)');
        haze.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, width, height);

        drawHornedSigil();

        // Dust motes carried on the southwest wind
        ctx.save();
        ctx.fillStyle = '#d4bfa8';
        for (const m of motes) {
            if (!reduced) {
                m.x += m.vx + Math.sin(time * 0.01 + m.driftPhase) * 0.4;
                m.y += m.vy + Math.cos(time * 0.008 + m.driftPhase) * 0.3;
            }
            if (m.x > width + 20 || m.y < -20 || m.y > height + 20) {
                Object.assign(m, makeMote());
            }
            ctx.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(time * 0.02 + m.driftPhase));
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Occasional bronze amulet glints
        if (!reduced && time % 90 === 0) spawnGlint();
        ctx.save();
        ctx.fillStyle = 'rgb(' + S.r + ',' + S.g + ',' + S.b + ')';
        for (let i = glints.length - 1; i >= 0; i--) {
            const gnt = glints[i];
            if (!reduced) gnt.life--;
            if (gnt.life <= 0) {
                glints.splice(i, 1);
                continue;
            }
            const a = gnt.life / gnt.maxLife;
            ctx.globalAlpha = a * 0.7;
            ctx.beginPath();
            ctx.arc(gnt.x, gnt.y, gnt.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

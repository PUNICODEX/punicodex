// Fjǫrgyn — earth mother; runic soil and bedrock
(function() {
    'use strict';
    const canvas = document.getElementById('fjorgyn-earthrunes-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fb) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
    }
    const P = readColor('data-primary', '#C9A227');
    const S = readColor('data-secondary', '#3A7A5C');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('');
    const glyphs = [];
    for (let i = 0; i < 18; i++) {
        glyphs.push({
            x: Math.random(),
            y: 0.55 + Math.random() * 0.4,
            rune: runes[i % runes.length],
            size: 14 + Math.random() * 22,
            phase: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.004
        });
    }

    let t = 0;
    function draw() {
        t += 0.005;
        ctx.clearRect(0, 0, width, height);
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, 'rgba(10,9,7,0.98)');
        bg.addColorStop(1, 'rgba(16,14,10,0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Soil strata.
        for (let i = 0; i < 7; i++) {
            const y = height * (0.35 + i * 0.1);
            ctx.fillStyle = 'rgba(28,24,18,' + (0.25 + 0.08 * Math.sin(t * 0.3 + i)) + ')';
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += 60) {
                ctx.lineTo(x, y + Math.sin(x * 0.006 + i) * 18);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.fill();
        }

        // Glowing fissures in the bedrock.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.25)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)';
        for (let i = 0; i < 5; i++) {
            const x = width * (0.15 + i * 0.18);
            ctx.beginPath();
            ctx.moveTo(x, height * 0.4);
            for (let y = height * 0.4; y <= height; y += 30) {
                ctx.lineTo(x + Math.sin(y * 0.02 + t + i) * 25, y);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Runic glyphs embedded in earth, pulsing.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        glyphs.forEach(g => {
            g.y += g.speed;
            if (g.y > 0.98) g.y = 0.52;
            const x = width * g.x;
            const y = height * g.y + Math.sin(t + g.phase) * 8;
            const alpha = 0.15 + 0.2 * Math.sin(t * 2 + g.phase);
            ctx.font = g.size + 'px serif';
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + alpha + ')';
            ctx.fillText(g.rune, x, y);
        });

        // Earth particles drifting upward.
        for (let i = 0; i < 30; i++) {
            const seed = i * 0.71;
            const x = ((seed * 437 + t * 0.02) % 1) * width;
            const y = height - ((seed * 631 + t * 15) % 1) * height * 0.6;
            const a = 0.15 + 0.25 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath();
            ctx.arc(x, y, 0.8 + (i % 3) * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

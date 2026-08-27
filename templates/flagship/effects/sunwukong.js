// Sun Wukong — Ruyi Jingu Bang spins; cloud-walk particles and celestial ribbons trail
(function() {
    'use strict';
    const canvas = document.getElementById('sunwukong-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#DC143C');
    const S = readColor('data-secondary', '#FFD700');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    let t = 0;
    function draw() {
        t += 0.015;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(16,10,12,0.98)');
        lg.addColorStop(1, 'rgba(30,16,18,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.45;
        // The golden staff spinning at impossible speed.
        const staffLen = Math.min(width, height) * 0.55;
        const angle = t * 2.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const grad = ctx.createLinearGradient(-staffLen / 2, 0, staffLen / 2, 0);
        grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)');
        grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.7)');
        grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)');
        ctx.strokeStyle = grad; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(-staffLen / 2, 0); ctx.lineTo(staffLen / 2, 0); ctx.stroke();
        ctx.restore();
        // Staff afterimage ring.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, staffLen * 0.5, 0, Math.PI * 2); ctx.stroke();
        // Celestial cloud-walk particles and ribbons.
        for (let i = 0; i < 40; i++) {
            const seed = i * 0.17;
            const x = ((seed * 997 + t * (0.08 + (i % 5) * 0.03)) % 1) * width;
            const y = height * 0.85 - ((seed * 733 + t * (0.06 + (i % 4) * 0.02)) % 1) * height;
            const a = 0.08 + 0.12 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        // Crimson celestial ribbons.
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.08 + 0.04 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 20) {
                const y = height * (0.2 + i * 0.18) + Math.sin(x * 0.008 + t * (1.2 + i * 0.3) + i) * 25;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

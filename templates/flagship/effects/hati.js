// Hati — The Moon-Chaser (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('moonchase-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8D4E8');
    const S = readColor('data-secondary', '#4A5A78');
    const GLYPHS = 'ᚼᛅᛏᛁ';
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
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,11,14,0.97)');
        lg.addColorStop(1, 'rgba(14,16,20,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const mx=width*0.68, my=height*0.32; for(let i=0;i<4;i++){ const r=20+i*10; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25-i*0.04)+0.06*Math.sin(t+i)+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(mx,my,r,0,Math.PI*2); ctx.stroke(); } const z=((t*0.05)%1); const wx=width*(0.1+z*0.6); const wy=my+Math.sin(z*Math.PI)*height*0.12; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.3+0.1*z)+")"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(wx,wy,12,Math.PI*0.9,Math.PI*1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(wx+16,wy-5,6,-0.4,0.5); ctx.stroke(); const cover=Math.max(0,Math.sin(t*0.21))*0.4; ctx.fillStyle="rgba(10,11,14,"+cover+")"; ctx.beginPath(); ctx.arc(mx+14,my,20,0,Math.PI*2); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();

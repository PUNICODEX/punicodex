// Heimdallr — The Gjallarhorn Watch (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gjallar-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8D9A0');
    const S = readColor('data-secondary', '#8FA3B8');
    const GLYPHS = 'ᚼᛖᛁᛗᛞᚨᛚᚱ';
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
        const cx=width/2, cy=height*0.5; for(let i=0;i<8;i++){ const z=((t*0.11+i/8)%1); const r=z*Math.min(width,height)*0.55; const a=(1-z)*0.18; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); } for(let i=0;i<3;i++){ const rr=20+i*14+4*Math.sin(t*2+i); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3-i*0.07)+0.1*Math.sin(t*2.2+i)+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(cx,cy,rr,-0.6,0.6); ctx.stroke(); }
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

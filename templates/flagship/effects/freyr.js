// Freyr — The Golden Field (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('goldenfield-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#7FA653');
    const GLYPHS = 'ᚠᚱᛅᚢᛦ';
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
        const rows=14; for(let r=0;r<rows;r++){ const y=height*0.35+ (height*0.62)*(r/rows); const sway=Math.sin(t*0.9+r*0.7)*18*(r/rows); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.05+0.1*(r/rows))+")"; ctx.lineWidth=1.4; ctx.beginPath(); for(let x=0;x<=width;x+=16){ const yy=y+Math.sin(x*0.012+t*1.2+r)*8*(r/rows+0.3)+sway*0.2; if(x===0)ctx.moveTo(x,yy); else ctx.lineTo(x,yy);} ctx.stroke(); }
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

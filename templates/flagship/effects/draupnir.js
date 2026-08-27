// Draupnir — The Eight Rings (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('ringdrip-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#8A7A3A');
    const GLYPHS = 'ᛏᚱᛅᚢᛒᚾᛁᛦ';
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
        const cx=width/2, cy=height*0.42; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.4)"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,26,0,Math.PI*2); ctx.stroke(); for(let i=0;i<8;i++){ const z=((t*0.09+i/8)%1); const a=(i/8)*Math.PI*2+t*0.1; const x=cx+Math.cos(a)*(60+z*60); const y=cy+Math.sin(a)*(40+z*50); const rr=10+z*16; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3-z*0.15)+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2); ctx.stroke(); }
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

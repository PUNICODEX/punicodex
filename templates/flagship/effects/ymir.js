// Ymir — The Mist of Ginnungagap (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('ginnunga-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C4D8');
    const S = readColor('data-secondary', '#5A7A94');
    const GLYPHS = 'ᚤᛗᛁᚱ';
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
        for(let i=0;i<24;i++){ const seed=i*0.618; const x=((seed*431+t*(0.02+(i%3)*0.008))%1)*width; const y=height*((seed*197%1)*0.5); const warm=i%2===0; const c=warm?{r:216,g:138,b:70}:P; const a=0.05+0.08*Math.abs(Math.sin(t+i)); ctx.fillStyle="rgba("+c.r+","+c.g+","+c.b+","+a+")"; ctx.beginPath(); ctx.arc(x,y,1.4+(i%3)*0.8,0,Math.PI*2); ctx.fill(); } for(let i=0;i<24;i++){ const seed=i*0.618; const x=((seed*431+t*(0.02+(i%3)*0.008))%1)*width; const y=height-height*((seed*197%1)*0.5); const a=0.05+0.08*Math.abs(Math.cos(t*0.9+i)); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.beginPath(); ctx.arc(x,y,1.4+(i%3)*0.8,0,Math.PI*2); ctx.fill(); }
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

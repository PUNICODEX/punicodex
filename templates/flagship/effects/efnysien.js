// Efnysien — The Night in the Stable (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('stablefire-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D86A3A');
    const S = readColor('data-secondary', '#6A4A3A');
    const GLYPHS = 'ᚓᚃᚅ';
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
        const sx=width*0.5, sy=height*0.7; for(let i=0;i<3;i++){ const h=height*(0.08+0.04*Math.sin(t*3.2+i)); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3-i*0.06)+")"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.bezierCurveTo(sx+6,sy-h*0.4,sx-4,sy-h*0.8,sx+3,sy-h); ctx.stroke(); } for(let i=0;i<14;i++){ const seed=i*0.618; const dir=seed>0.5?1:-1; const x=sx+dir*((seed*311%1)*width*0.4); const y=sy-((seed*197+t*(0.05+(i%3)*0.015))%1)*height*0.4; const spread=(x-sx)/width; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.1*Math.abs(spread)*2)+")"; ctx.beginPath(); ctx.arc(x,y,1.4+(i%3)*0.6,0,Math.PI*2); ctx.fill(); }
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

// Cei — The Steward's Fire (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('seneschalfire-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8A33D');
    const S = readColor('data-secondary', '#7A4A2E');
    const GLYPHS = 'ᚉᚐᚔ';
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
        for(let i=0;i<5;i++){ const seed=i*0.618; const x=width*(0.2+(seed*461%1)*0.6); const h=height*(0.12+0.05*Math.sin(t*2.6+i)); const lean=12*Math.sin(t*1.8+i); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.1*Math.abs(Math.sin(t*2+i)))+")"; ctx.lineWidth=3.4; ctx.beginPath(); ctx.moveTo(x,height*0.82); ctx.bezierCurveTo(x+lean*0.4,height*0.82-h*0.4,x+lean,height*0.82-h*0.8,x+lean*0.7,height*0.82-h); ctx.stroke(); } for(let i=0;i<8;i++){ const seed=i*0.618; const x=width*((seed*577+t*(0.03+(i%3)*0.01))%1); const y=height*0.7-((seed*197+t*0.04)%1)*height*0.3; ctx.fillStyle="rgba(255,220,150,"+(0.08+0.1*Math.abs(Math.sin(t*1.6+i)))+")"; ctx.beginPath(); ctx.arc(x,y,1.4,0,Math.PI*2); ctx.fill(); }
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

// Dagda — The Cauldron of Plenty (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('cauldron-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C9A86A');
    const S = readColor('data-secondary', '#7A6A4A');
    const GLYPHS = 'ᚇᚐᚌᚇᚐ';
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
        const cx=width/2, rimY=height*0.58; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.3)"; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(cx,rimY,width*0.16,height*0.05,0,0,Math.PI*2); ctx.stroke(); for(let i=0;i<12;i++){ const seed=i*0.618; const x=cx-width*0.12+((seed*311%1)*width*0.24); const y=rimY-((seed*197+t*0.06)%1)*height*0.3; const a=0.05+0.08*Math.abs(Math.sin(t*0.9+i)); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+a+")"; ctx.lineWidth=2+(i%3); ctx.beginPath(); ctx.arc(x,y,4+3*Math.sin(t+i),0,Math.PI*1.4); ctx.stroke(); } for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2+t*0.3; const x=cx+Math.cos(a)*width*0.16, y=rimY+Math.sin(a)*height*0.05; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+",0.4)"; ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
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

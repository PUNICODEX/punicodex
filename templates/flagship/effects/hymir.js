// Hymir — The Mile-Deep Cauldron (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('cauldronmile-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#6A8AA8');
    const S = readColor('data-secondary', '#3A5A78');
    const GLYPHS = 'ᚼᚤᛗᛁᚱ';
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
        const cx=width/2, rimY=height*0.56; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.4)"; ctx.lineWidth=2.4; ctx.beginPath(); ctx.ellipse(cx,rimY,width*0.2,height*0.06,0,0,Math.PI*2); ctx.stroke(); for(let i=0;i<10;i++){ const seed=i*0.618; const x=cx-width*0.15+(seed*311%1)*width*0.3; const y=rimY-((seed*197+t*(0.04+(i%3)*0.012))%1)*height*0.35; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.1+0.06*Math.sin(t+i))+")"; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(x,y,5+3*Math.sin(t+i),0,Math.PI*1.3); ctx.stroke(); } for(let i=0;i<6;i++){ const y=rimY+height*0.06+i*10; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.16-i*0.02)+0.03*Math.sin(t+i)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(cx-width*0.2,y); ctx.quadraticCurveTo(cx,y+6,cx+width*0.2,y); ctx.stroke(); }
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

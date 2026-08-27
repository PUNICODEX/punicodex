// Écne — The Nine Hazels of Wisdom (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('hazelnuts-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C88A');
    const S = readColor('data-secondary', '#5A7A5A');
    const GLYPHS = 'ᚓᚉᚅ';
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
        const wellY=height*0.72; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(width/2,wellY,width*0.18,height*0.05,0,0,Math.PI*2); ctx.stroke(); for(let i=0;i<9;i++){ const seed=i*0.618; const x=width*(0.2+(seed*461%1)*0.6); const y=((seed*197+t*(0.04+(i%3)*0.01))%1)*wellY; const a=0.15+0.15*Math.abs(Math.sin(t*0.9+i)); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.beginPath(); ctx.arc(x,y,2.4,0,Math.PI*2); ctx.fill(); for(let k=0;k<3;k++){ const z=((t*0.2+k/3)%1); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.14-z*0.08)+")"; ctx.beginPath(); ctx.arc(x,wellY,8+z*30,0,Math.PI*2); ctx.stroke(); } break; } for(let i=0;i<9;i++){ const x=width*(0.15+i*0.08); const sway=Math.sin(t*0.7+i)*6; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.2)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x,height*0.15); ctx.quadraticCurveTo(x+sway,height*0.3,x,height*0.42); ctx.stroke(); }
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

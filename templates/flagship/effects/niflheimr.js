// Niflheimr — The Mist of Hvergelmir (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('hvergelmir-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C4D8');
    const S = readColor('data-secondary', '#3A5A74');
    const GLYPHS = 'ᚾᛁᚠᛚᚼᛖᛁᛗᚱ';
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
        for(let i=0;i<22;i++){ const seed=i*0.618; const x=((seed*677+t*(3+(i%4)))%1)*width; const y=height*(0.35+(seed*227%1)*0.5)+Math.sin(t*0.4+i)*12; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.03+0.04*Math.abs(Math.sin(t*0.6+i)))+")"; ctx.beginPath(); ctx.ellipse(x,y,70+20*(i%3),10+4*(i%2),0,0,Math.PI*2); ctx.fill(); } const cx=width/2, wellY=height*0.6; for(let i=0;i<4;i++){ const z=((t*0.1+i/4)%1); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.22-z*0.1)+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(cx,wellY,12+z*40,0,Math.PI*2); ctx.stroke(); } for(let i=0;i<11;i++){ const a=(i/11)*Math.PI*2; const x=cx+Math.cos(a)*width*0.22, y=wellY+Math.sin(a)*height*0.08; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.12+0.05*Math.sin(t+i))+")"; ctx.beginPath(); ctx.moveTo(cx,wellY); ctx.lineTo(x,y); ctx.stroke(); }
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

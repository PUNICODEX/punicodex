// badb
(function() {
    'use strict';
    const canvas = document.getElementById('scaldcrow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8A96A8');
    const S = readColor('data-secondary', '#3A4250');
    const GLYPHS = 'ᚁᚐᚇᚁ';
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
        const cx=width/2, cy=height*0.4; for(let i=0;i<3;i++){ const a=t*0.5+i*(Math.PI*2/3); const x=cx+Math.cos(a)*width*0.16; const y=cy+Math.sin(a)*height*0.1; const flap=Math.sin(t*6+i*2)*0.5; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3-i*0.05)+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x-12,y+flap*6); ctx.quadraticCurveTo(x,y-8-flap*6,x+12,y+flap*6); ctx.stroke(); } for(let i=0;i<12;i++){ const seed=i*0.618; const x=((seed*677+t*(5+(i%3)))%1)*width; const y=height*0.7+Math.sin(seed*97+t*0.5)*16; ctx.fillStyle="rgba("+S.r+","+S.g+","+S.b+",0.06)"; ctx.beginPath(); ctx.ellipse(x,y,44,8,0,0,Math.PI*2); ctx.fill(); }
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

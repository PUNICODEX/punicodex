// Math — The Geas of Gwynedd (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gwyneddgeas-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8B8A8');
    const S = readColor('data-secondary', '#6A5A48');
    const GLYPHS = 'ᚋᚐᚈ';
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
        const cx=width/2, cy=height*0.45; for(let i=0;i<4;i++){ const a=-Math.PI/2+(i-1.5)*0.5; const len=height*(0.14+0.02*Math.sin(t*1.1+i)); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.07*Math.sin(t+i))+")"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(cx,cy+height*0.14); ctx.lineTo(cx+Math.cos(a)*len,cy+height*0.14+Math.sin(a)*len); ctx.stroke(); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+",0.5)"; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*len,cy+height*0.14+Math.sin(a)*len,2.6,0,Math.PI*2); ctx.fill(); } for(let i=0;i<5;i++){ const z=((t*0.06+i/5)%1); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.22-z*0.1)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(cx,cy,26+z*60,0,Math.PI*2); ctx.stroke(); }
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

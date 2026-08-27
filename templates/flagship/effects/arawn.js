// arawn
(function() {
    'use strict';
    const canvas = document.getElementById('glynhounds-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8E0D0');
    const S = readColor('data-secondary', '#C24A3E');
    const GLYPHS = 'ᚐᚏᚐ';
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
        const baseY=height*0.6; for(let i=0;i<3;i++){ const z=((t*0.12+i/3)%1); const x=width*(0.05+z*0.9); const y=baseY-Math.abs(Math.sin(z*Math.PI*4))*height*0.05; const a=0.2-z*0.06; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(x,y,14+z*8,Math.PI*0.9,Math.PI*1.7); ctx.stroke(); ctx.beginPath(); ctx.arc(x+20,y-6,8,-0.6,0.4); ctx.stroke(); ctx.fillStyle="rgba("+S.r+","+S.g+","+S.b+","+(a+0.15)+")"; ctx.beginPath(); ctx.arc(x+24,y-10,1.8,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x+14,y-12,1.8,0,Math.PI*2); ctx.fill(); }
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

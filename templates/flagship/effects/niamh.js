// Niamh — The Golden Hair (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('goldenhair-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8C86A');
    const S = readColor('data-secondary', '#8A6A2E');
    const GLYPHS = 'ᚅᚔᚐᚋ';
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
        const cx=width/2; for(let i=0;i<10;i++){ const x=cx-width*0.2+i*width*0.045; const sway=Math.sin(t*1.1+i*0.8)*10; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.14+0.08*Math.abs(Math.sin(t*0.9+i)))+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(x,height*0.2); ctx.bezierCurveTo(x+sway,height*0.35,x-sway,height*0.5,x+sway*0.6,height*0.62); ctx.stroke(); } const baseY=height*0.68; for(let i=0;i<3;i++){ const z=((t*0.1+i/3)%1); const x=width*(0.1+z*0.8); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.24-z*0.1)+")"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(x,baseY-Math.abs(Math.sin(z*Math.PI*3))*height*0.04,13+z*9,Math.PI*0.95,Math.PI*1.75); ctx.stroke(); ctx.beginPath(); ctx.arc(x+18,baseY-6,6,-0.4,0.5); ctx.stroke(); }
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

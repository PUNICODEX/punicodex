// Garmr — The Hound of Gnipahellir (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gnipahellir-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8A6A5A');
    const S = readColor('data-secondary', '#3A2E28');
    const GLYPHS = 'ᚴᛅᚱᛘᚱ';
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
        const gx=width/2, gy=height*0.45; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(gx-width*0.14,height); ctx.lineTo(gx-width*0.14,gy); ctx.quadraticCurveTo(gx,gy-height*0.12,gx+width*0.14,gy); ctx.lineTo(gx+width*0.14,height); ctx.stroke(); for(let i=0;i<2;i++){ const blink=Math.abs(Math.sin(t*0.31+i))<0.08?0.05:0.45; ctx.fillStyle="rgba(216,90,60,"+blink+")"; ctx.beginPath(); ctx.arc(gx-14+i*28,gy+height*0.12,3.4,0,Math.PI*2); ctx.fill(); } for(let i=0;i<3;i++){ const z=((t*0.06+i/3)%1); const x=gx-width*0.1+z*width*0.2; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25-z*0.12)+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(x,gy+height*0.12,10+z*30,Math.PI*0.8,Math.PI*1.9); ctx.stroke(); }
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

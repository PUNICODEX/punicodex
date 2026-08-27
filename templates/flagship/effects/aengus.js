// aengus
(function() {
    'use strict';
    const canvas = document.getElementById('dreamswan-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8E4F0');
    const S = readColor('data-secondary', '#8AA8C8');
    const GLYPHS = 'ᚐᚔᚅᚌ';
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
        const cx=width/2, lakeY=height*0.62; for(let i=0;i<4;i++){ const z=((t*0.07+i/4)%1); const x=width*(0.15+z*0.7); const y=lakeY-Math.sin(z*Math.PI*2)*height*0.05; const a=0.22-z*0.1; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(x,y,12+z*20,Math.PI*1.05,Math.PI*1.55); ctx.stroke(); ctx.beginPath(); ctx.arc(x+8+z*14,y-4,8+z*12,-0.5,0.5); ctx.stroke(); } for(let i=0;i<8;i++){ const y=lakeY+14+i*6; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.1-i*0.01)+0.03*Math.sin(t+i)+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(width*0.1,y); ctx.quadraticCurveTo(width*0.5,y+Math.sin(t+i)*4,width*0.9,y); ctx.stroke(); }
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

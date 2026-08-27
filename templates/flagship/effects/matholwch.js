// Matholwch — The King Across the Sea (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('irishsea-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#6A8AA8');
    const S = readColor('data-secondary', '#2E4A5E');
    const GLYPHS = 'ᚋᚐᚈᚆ';
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
        for(let i=0;i<4;i++){ const y=height*(0.4+i*0.12); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.16-i*0.02)+0.04*Math.sin(t*0.8+i)+")"; ctx.lineWidth=1.6; ctx.beginPath(); for(let x=0;x<=width;x+=16){ const yy=y+Math.sin(x*0.009+t+i)*10; if(x===0)ctx.moveTo(x,yy); else ctx.lineTo(x,yy);} ctx.stroke(); } const sx=width*0.3+Math.sin(t*0.3)*width*0.06; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.4)"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(sx,height*0.42); ctx.lineTo(sx,height*0.3); ctx.lineTo(sx+26,height*0.42); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx+13,height*0.42); ctx.lineTo(sx+13,height*0.5); ctx.stroke();
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

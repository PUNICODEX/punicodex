// balor
(function() {
    'use strict';
    const canvas = document.getElementById('evileye-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C85A4A');
    const S = readColor('data-secondary', '#6A3A34');
    const GLYPHS = 'ᚁᚐᚂᚑᚏ';
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
        const cx=width/2, cy=height*0.44; const lid=0.5+0.5*Math.sin(t*0.4); for(let i=0;i<4;i++){ const r=30+i*16; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.22-i*0.04)+0.06*lid+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(cx,cy,r*1.6,r*(0.4+lid*0.6),0,0,Math.PI*2); ctx.stroke(); } const gaze=ctx.createRadialGradient(cx,cy,0,cx,cy,26); gaze.addColorStop(0,"rgba(216,90,60,"+(0.3+0.4*lid)+")"); gaze.addColorStop(1,"rgba(216,90,60,0)"); ctx.fillStyle=gaze; ctx.beginPath(); ctx.arc(cx,cy,26,0,Math.PI*2); ctx.fill(); for(let i=0;i<6;i++){ const a=(i/6)*Math.PI*2+t*0.3; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.1*lid)+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*width*0.3,cy+Math.sin(a)*height*0.3); ctx.stroke(); }
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

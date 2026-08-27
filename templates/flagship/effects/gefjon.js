// Gefjun — The Ploughing of Zealand (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('zealandplough-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8AB86A');
    const S = readColor('data-secondary', '#4A7A3A');
    const GLYPHS = 'ᚴᛖᚠᛁᚢᚾ';
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
        for(let r=0;r<8;r++){ const y=height*(0.3+r*0.08); const drift=Math.sin(t*0.5+r)*14; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.06*(r/8))+0.03*Math.sin(t+r)+")"; ctx.lineWidth=1.6; ctx.beginPath(); for(let x=0;x<=width;x+=20){ const yy=y+Math.sin(x*0.008+t+r)*6+drift*0.2; if(x===0)ctx.moveTo(x,yy); else ctx.lineTo(x,yy);} ctx.stroke(); } for(let i=0;i<4;i++){ const z=((t*0.07+i/4)%1); const x=width*(0.15+z*0.7); const y=height*0.75; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.3-z*0.1)+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,10+z*8,Math.PI*0.9,Math.PI*1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x+16,y-4,6,-0.5,0.5); ctx.stroke(); }
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

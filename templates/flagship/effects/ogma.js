// Ogma — The First Letter (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('oghamline-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8A86A');
    const S = readColor('data-secondary', '#6A5A3A');
    const GLYPHS = 'ᚑᚌᚋᚐ';
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
        const midY=height*0.5; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.35)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(width*0.15,midY); ctx.lineTo(width*0.85,midY); ctx.stroke(); for(let i=0;i<14;i++){ const x=width*(0.17+i*0.048); const type=i%4; const pulse=0.5+0.5*Math.sin(t*0.9+i); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.18+0.2*pulse)+")"; ctx.lineWidth=2.4; ctx.beginPath(); if(type===0){ ctx.moveTo(x,midY-14); ctx.lineTo(x,midY+14); } else if(type===1){ ctx.moveTo(x,midY); ctx.lineTo(x+10,midY-14); } else if(type===2){ ctx.moveTo(x,midY-8); ctx.lineTo(x,midY+8); } else { ctx.moveTo(x,midY); ctx.lineTo(x-8,midY-12); ctx.moveTo(x,midY); ctx.lineTo(x+8,midY-12); } ctx.stroke(); }
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

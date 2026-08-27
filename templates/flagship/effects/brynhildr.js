// Brynhildr — The Wall of Vafrlogi (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('vafrlogi-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E2592A');
    const S = readColor('data-secondary', '#8FA3B8');
    const GLYPHS = 'ᛒᚱᚤᚾᚼᛁᛚᛏᚱ';
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
        const base=height*0.9; const ring=Math.min(width,height)*0.3; for(let i=0;i<24;i++){ const a=(i/24)*Math.PI*2; const x=width/2+Math.cos(a)*ring; const h=height*(0.1+0.05*Math.sin(t*3+i)); const lean=10*Math.sin(t*2+i); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.18+0.1*Math.abs(Math.sin(t*2+i)))+")"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,base); ctx.bezierCurveTo(x+lean*0.4,base-h*0.4,x+lean,base-h*0.8,x+lean*0.8,base-h); ctx.stroke(); } const shieldY=height*0.5; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.3)"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(width/2,shieldY,ring*0.5,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(width/2-ring*0.5,shieldY); ctx.lineTo(width/2+ring*0.5,shieldY); ctx.moveTo(width/2,shieldY-ring*0.5); ctx.lineTo(width/2,shieldY+ring*0.5); ctx.stroke();
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

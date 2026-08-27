// Gunnr — The Choosing of the Slain (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('warchoice-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#B8A8A0');
    const S = readColor('data-secondary', '#5A4A44');
    const GLYPHS = 'ᚴᚢᚾᚱ';
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
        for(let i=0;i<3;i++){ const z=((t*0.1+i/3)%1); const x=width*(0.1+z*0.8); const y=height*0.45-Math.sin(z*Math.PI)*height*0.06; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.22-z*0.1)+")"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(x,y,12+z*14,Math.PI*1.0,Math.PI*1.7); ctx.stroke(); ctx.beginPath(); ctx.arc(x+18,y-6,7,-0.4,0.5); ctx.stroke(); } for(let i=0;i<12;i++){ const seed=i*0.618; const x=width*((seed*461%1)); const y=height*0.62+((seed*227+t*0.03)%1)*height*0.2; const a=0.08+0.08*Math.abs(Math.sin(t*1.1+i)); ctx.fillStyle="rgba("+S.r+","+S.g+","+S.b+","+a+")"; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+3,y+8); ctx.lineTo(x-3,y+8); ctx.closePath(); ctx.fill(); }
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

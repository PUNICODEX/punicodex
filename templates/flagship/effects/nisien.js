// Nisien — The Gentle Twin (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('peacetwin-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C8A8');
    const S = readColor('data-secondary', '#4A6A4A');
    const GLYPHS = 'ᚅᚔᚅ';
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
        const cx=width/2, cy=height*0.5; for(let i=0;i<2;i++){ const a=t*0.5+i*Math.PI; const x=cx+Math.cos(a)*width*0.1, y=cy+Math.sin(a)*height*0.08; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.26+0.08*Math.sin(t+i))+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2); ctx.stroke(); } for(let i=0;i<6;i++){ const seed=i*0.618; const x=width*((seed*461%1)); const y=height*(0.3+(seed*227%1)*0.4); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.08+0.05*Math.sin(t+i))+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+10,y-8,x+20,y); ctx.stroke(); }
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

// Gwydion — The Flowers and the Forest (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('flowerwolf-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C88A');
    const S = readColor('data-secondary', '#6A8A5A');
    const GLYPHS = 'ᚌᚃᚔᚇ';
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
        for(let i=0;i<12;i++){ const seed=i*0.618; const cx2=width*((seed*461%1)); const cy2=height*(0.3+(seed*227%1)*0.4); const bloom=0.5+0.5*Math.sin(t*0.7+seed*40); for(let ptl=0;ptl<5;ptl++){ const a=(ptl/5)*Math.PI*2+t*0.2; const r=6+bloom*6; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.06+0.08*bloom)+")"; ctx.beginPath(); ctx.ellipse(cx2+Math.cos(a)*r,cy2+Math.sin(a)*r,4+bloom*2,2,a,0,Math.PI*2); ctx.fill(); } ctx.fillStyle="rgba(232,214,140,"+(0.2+0.3*bloom)+")"; ctx.beginPath(); ctx.arc(cx2,cy2,2,0,Math.PI*2); ctx.fill(); } for(let i=0;i<10;i++){ const seed=i*0.618; const x=((seed*577+t*(3+(i%3)))%1)*width; const y=height*(0.75+(seed*197%1)*0.2); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.12)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-height*0.06); ctx.stroke(); }
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

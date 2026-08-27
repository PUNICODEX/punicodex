// blodeuwedd
(function() {
    'use strict';
    const canvas = document.getElementById('flowerowl-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8B8D8');
    const S = readColor('data-secondary', '#5A4A6A');
    const GLYPHS = 'ᚁᚂᚑᚇ';
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
        for(let i=0;i<9;i++){ const seed=i*0.618; const x=width*((seed*461%1)); const y=height*(0.35+(seed*227%1)*0.3); const bloom=0.5+0.5*Math.sin(t*0.6+seed*40); for(let p=0;p<5;p++){ const a=(p/5)*Math.PI*2+t*0.15; const r=5+bloom*5; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.07+0.08*bloom)+")"; ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*r,y+Math.sin(a)*r,3.4+bloom*1.6,1.8,a,0,Math.PI*2); ctx.fill(); } } const fy=height*0.5+Math.sin(t*0.7)*20; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.25+0.1*Math.sin(t*5))+")"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(width*0.42,fy+Math.sin(t*5)*8); ctx.quadraticCurveTo(width*0.5,fy-14,width*0.58,fy+Math.sin(t*5+1)*8); ctx.stroke();
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

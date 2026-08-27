// Myrddin — The Caledonian Forest (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('caledonwood-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#7AA86A');
    const S = readColor('data-secondary', '#3A5A34');
    const GLYPHS = 'ᚋᚤᚏ';
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
        for(let i=0;i<12;i++){ const x=width*(0.06+i*0.08); const sway=Math.sin(t*0.6+i)*5; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.12+0.05*(i%3)*0.03)+0.03*Math.sin(t+i)+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,height); ctx.quadraticCurveTo(x+sway,height*0.5,x+sway*1.4,height*0.18); ctx.stroke(); for(let b=0;b<2;b++){ ctx.beginPath(); ctx.moveTo(x+sway*(b+1)*0.5,height*(0.45+b*0.15)); ctx.lineTo(x+sway*(b+1)*0.5+(b%2?12:-12),height*(0.4+b*0.15)); ctx.stroke(); } } for(let i=0;i<8;i++){ const seed=i*0.618; const x=width*((seed*461%1)); const y=height*(0.25+(seed*227%1)*0.5); ctx.fillStyle="rgba(216,190,120,"+(0.08+0.1*Math.abs(Math.sin(t*1.3+i)))+")"; ctx.beginPath(); ctx.arc(x,y,1.6,0,Math.PI*2); ctx.fill(); }
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

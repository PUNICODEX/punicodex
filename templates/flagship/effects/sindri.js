// Sindri — The Three Castings (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('threecastings-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8A33D');
    const S = readColor('data-secondary', '#6A7A8A');
    const GLYPHS = 'ᛋᛁᚾᛏᚱᛁ';
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
        const cx=width/2, fy=height*0.62; const heat=0.5+0.5*Math.sin(t*0.9); const rg=ctx.createRadialGradient(cx,fy,0,cx,fy,140); rg.addColorStop(0,"rgba("+P.r+","+P.g+","+P.b+","+(0.20+0.10*heat)+")"); rg.addColorStop(1,"rgba("+P.r+","+P.g+","+P.b+",0)"); ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(cx,fy,140,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.5)"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx-70,fy+34); ctx.lineTo(cx+70,fy+34); ctx.lineTo(cx+44,fy+14); ctx.lineTo(cx-44,fy+14); ctx.closePath(); ctx.stroke(); for(let c=0;c<3;c++){ const phase=((t*0.11+c/3)%1); const rr=26+phase*150; const beat=phase<0.12?1-phase/0.12:0; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+((1-phase)*0.16+beat*0.22)+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(cx,fy-8,rr,0,Math.PI*2); ctx.stroke(); } for(let i=0;i<30;i++){ const seed=i*0.618; const sx=cx-60+((seed*997)%1)*120; const rise=((seed*373+t*(0.05+(i%5)*0.012))%1); const sy=fy-10-rise*height*0.45; const drift=Math.sin(t*1.3+i)*10*rise; const fade=rise<0.85?(1-rise)*0.5:0; ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+fade+")"; ctx.beginPath(); ctx.arc(sx+drift,sy,1.1+(i%3)*0.5,0,Math.PI*2); ctx.fill(); } for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2+t*0.15; const ry=fy-8; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.12+0.05*Math.sin(t+i))+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*54,ry+Math.sin(a)*54*0.4); ctx.lineTo(cx+Math.cos(a)*66,ry+Math.sin(a)*66*0.4); ctx.stroke(); }
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
